// tobinezumi/server/db.js — SQLite（node:sqlite・組み込み）。1 プロセス・1 ファイル（data/game.db）。
//
//   const db = await openDb('data/game.db');   … 起動時に migrations/ の未適用分を番号順に当て、巣データを最新版へ移行
//   db.tx(() => { … })                        … まとめて書く（失敗したら全部取り消し）
//
// 読み書きはすべて同期（DatabaseSync）。サーバーは 1 プロセスなので、同期の 1 関数の中は他の要求に割り込まれない
// → 「採集の先着 1 人」は 1 回のトランザクションで「資源を消す＋持ち物を増やす」を同時に行うだけで守られる。
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrateNest, NEST_SCHEMA } from '../shared/nest-rules.js';
import { normalizeInventory, INV_SLOTS, STORAGE_SLOTS } from '../shared/items.js';
import { makeLife } from '../shared/life.js';
import { normalizeGenes, expressTraits } from '../shared/genetics.js';
import { syncCollectibles } from './migrations/006_regions_collect.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(HERE, 'migrations');

/** migrations/NNN_name.js の一覧（番号順） */
export async function loadMigrations(dir = MIGRATIONS_DIR) {
  const files = readdirSync(dir).filter(f => /^\d{3}_.+\.js$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const m = await import(pathToFileURL(join(dir, f)).href);
    out.push({ version: parseInt(f.slice(0, 3), 10), name: m.name || f, up: m.up, file: f });
  }
  return out;
}

const J = v => JSON.stringify(v == null ? {} : v);
const P = (s, d = {}) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };

export class Store {
  constructor(file, { log = () => {} } = {}) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.file = file;
    this.log = log;
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
    this._depth = 0;
    this._st = new Map();
  }
  q(sql) { let s = this._st.get(sql); if (!s) { s = this.db.prepare(sql); this._st.set(sql, s); } return s; }
  tx(fn) {
    if (this._depth > 0) return fn();
    this.db.exec('BEGIN IMMEDIATE');
    this._depth++;
    try { const r = fn(); this._depth--; this.db.exec('COMMIT'); return r; }
    catch (e) { this._depth--; try { this.db.exec('ROLLBACK'); } catch (e2) {} throw e; }
  }
  close() { try { this.db.close(); } catch (e) {} }

  // ───────── マイグレーション ─────────
  schemaVersion() {
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)');
    const r = this.db.prepare('SELECT MAX(version) v FROM schema_migrations').get();
    return (r && r.v) || 0;
  }
  async migrate({ upTo = Infinity, dir } = {}) {
    const cur = this.schemaVersion();
    const list = (await loadMigrations(dir)).filter(m => m.version > cur && m.version <= upTo);
    for (const m of list) {
      this.tx(() => {
        m.up(this.db);
        this.db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(m.version, m.name, Date.now());
      });
      this.log(`[db] migration ${m.file} を適用`);
    }
    return list.map(m => m.version);
  }
  /** 巣データ（JSON 列）の版を最新へ（schema_version < NEST_SCHEMA のものだけ）。壊れていたら触らずに記録 */
  migrateNestData() {
    const rows = this.db.prepare('SELECT id, schema_version, data FROM nests WHERE schema_version < ?').all(NEST_SCHEMA);
    let n = 0;
    for (const r of rows) {
      try {
        const d = migrateNest(P(r.data, null));
        this.q('UPDATE nests SET data = ?, schema_version = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(d), d.v, Date.now(), r.id);
        n++;
      } catch (e) { this.log(`[db] 巣 ${r.id} を移行できない: ${e.message}`); }
    }
    if (n) this.log(`[db] 巣データ ${n} 件を v${NEST_SCHEMA} へ移行`);
    return n;
  }

  // ───────── meta ─────────
  getMeta(k, d = null) { const r = this.q('SELECT value FROM meta WHERE key = ?').get(k); return r ? r.value : d; }
  setMeta(k, v) { this.q('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, String(v)); }

  // ───────── アカウント・セッション ─────────
  createAccount(username, passHash, now = Date.now()) {
    return Number(this.q('INSERT INTO accounts (username, pass_hash, created_at) VALUES (?, ?, ?)').run(username, passHash, now).lastInsertRowid);
  }
  accountByName(username) { return this.q('SELECT * FROM accounts WHERE username = ?').get(username) || null; }
  account(id) { return this.q('SELECT * FROM accounts WHERE id = ?').get(id) || null; }
  touchLogin(id, now = Date.now()) { this.q('UPDATE accounts SET last_login = ? WHERE id = ?').run(now, id); }
  createSession(tokenHash, accountId, expiresAt, now = Date.now()) {
    this.q('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, accountId, now, expiresAt);
  }
  session(tokenHash) { return this.q('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash) || null; }
  deleteSession(tokenHash) { this.q('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); }
  purgeSessions(now = Date.now()) { return this.q('DELETE FROM sessions WHERE expires_at < ?').run(now).changes; }

  // ───────── 個体・キャラクター ─────────
  /** ind（Ver.0.4・shared/family.js の founderInd）：性・遺伝子・年齢。無ければ毛色だけの 1 代目 */
  createCharacter(accountId, { name, fur, x, y, inv, ind: I = null }, now = Date.now()) {
    return this.tx(() => {
      const genes = normalizeGenes(I ? I.genes : { fur }, fur);
      const st = { life: makeLife(), ageMs: I ? I.ageMs : 0, fed: 100, named: true, bornAt: now };
      const ind = Number(this.q('INSERT INTO individuals (species, name, sex, born_at, generation, genes, traits, status, account_id, role) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)')
        .run('jerboa', name, I ? I.sex : null, now, J(genes), J(expressTraits(genes)), J(st), accountId, 'player').lastInsertRowid);
      this.q('UPDATE characters SET active = 0 WHERE account_id = ?').run(accountId);
      const id = Number(this.q('INSERT INTO characters (account_id, individual_id, name, fur, active, created_at, pos_x, pos_y, dir, place, exit_kind, saved_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)')
        .run(accountId, ind, name, fur, now, x, y, 'down', 'field', 'new', now).lastInsertRowid);
      this.setInventory('char', id, inv, INV_SLOTS);
      return id;
    });
  }
  /** いま操作している個体（無ければ null） */
  activeCharacter(accountId) {
    const c = this.q('SELECT c.*, i.species, i.sex, i.generation, i.father_id, i.mother_id, i.genes, i.traits, i.status, i.born_at FROM characters c JOIN individuals i ON i.id = c.individual_id WHERE c.account_id = ? AND c.active = 1 ORDER BY c.id DESC LIMIT 1').get(accountId);
    if (!c) return null;
    return {
      id: c.id, accountId: c.account_id, name: c.name, fur: c.fur, createdAt: c.created_at,
      individual: { id: c.individual_id, species: c.species, sex: c.sex, generation: c.generation, father_id: c.father_id, mother_id: c.mother_id, genes: P(c.genes), traits: P(c.traits), status: P(c.status), born_at: c.born_at },
      pos: { x: c.pos_x, y: c.pos_y, dir: c.dir, place: c.place, exit: c.exit_kind, savedAt: c.saved_at, region: c.region || 'plains' },
    };
  }
  /** region（Ver.0.5）：いた土地。渡さなければ変えない */
  savePosition(charId, { x, y, dir, place, exit, region }, now = Date.now()) {
    this.q('UPDATE characters SET pos_x = ?, pos_y = ?, dir = ?, place = ?, exit_kind = ?, saved_at = ?, region = COALESCE(?, region) WHERE id = ?')
      .run(Math.round(x * 10) / 10, Math.round(y * 10) / 10, dir || 'down', place || 'field', exit || 'live', now, region || null, charId);
  }
  /** 暮らしの数値（individuals.status.life）だけを書き換える */
  setLife(individualId, life) {
    this.q("UPDATE individuals SET status = json_set(CASE WHEN json_valid(status) THEN status ELSE '{}' END, '$.life', json(?)) WHERE id = ?").run(JSON.stringify(life), individualId);
  }
  /** アカウントのいまのキャラ（名前・毛色だけ） */
  charBrief(accountId) { return this.q('SELECT name, fur FROM characters WHERE account_id = ? AND active = 1 ORDER BY id DESC LIMIT 1').get(accountId) || null; }
  /** 名前（キャラ名）→ アカウント id（同じ名前は全員） */
  accountsByCharName(name) { return this.q('SELECT DISTINCT account_id FROM characters WHERE name = ? AND active = 1').all(name).map(r => r.account_id); }

  // ───────── 家族（Ver.0.4）─────────
  /** individuals の行 → 個体の記録（shared/family.js の形） */
  _ind(r) {
    if (!r) return null;
    const st = P(r.status);
    const genes = normalizeGenes(P(r.genes), 'sand');
    const o = { id: r.id, name: r.name, sex: r.sex === 'm' || r.sex === 'f' ? r.sex : (r.id % 2 ? 'f' : 'm'), generation: r.generation || 1, father_id: r.father_id ?? null, mother_id: r.mother_id ?? null,
      genes, traits: expressTraits(genes), role: r.role || 'player', ageMs: Number(st.ageMs) || 0, fed: st.fed ?? 100, named: st.named !== false, bornAt: st.bornAt || r.born_at || 0 };
    if (st.retiredAt) o.retiredAt = st.retiredAt;
    if (st.wild) o.wild = true;
    if (st.kinOf) o.kinOf = st.kinOf;
    if (st.pettedAt) o.pettedAt = st.pettedAt;
    if (r.species && r.species !== 'jerboa') o.species = r.species;   // Ver.0.6：近縁種（なかま）
    return o;
  }
  individual(id) { return this._ind(this.q('SELECT * FROM individuals WHERE id = ?').get(id)); }
  individualStatus(id) { const r = this.q('SELECT status FROM individuals WHERE id = ?').get(id); return r ? P(r.status) : {}; }
  /** id だけ先に取る（お産・つれあい）。中身は saveInd で書く */
  allocIndividual(accountId, now = Date.now()) {
    return Number(this.q("INSERT INTO individuals (species, name, born_at, generation, genes, traits, status, account_id, role) VALUES ('jerboa', '', ?, 1, '{}', '{}', '{}', ?, 'pending')").run(now, accountId).lastInsertRowid);
  }
  /** 個体を書く（status の life・house はそのまま残す） */
  saveInd(m, { accountId = null, nestId = null } = {}) {
    const st = this.individualStatus(m.id);
    st.ageMs = Math.round(m.ageMs || 0); st.fed = Math.round((m.fed ?? 100) * 100) / 100; st.named = !!m.named; st.bornAt = m.bornAt || st.bornAt || 0;
    if (m.retiredAt) st.retiredAt = m.retiredAt;
    if (m.wild) st.wild = true;
    if (m.kinOf) st.kinOf = m.kinOf;
    if (m.pettedAt) st.pettedAt = m.pettedAt;
    const inNest = m.role === 'pup' || m.role === 'kin' || m.role === 'mate' || m.role === 'friend';
    this.q('UPDATE individuals SET name = ?, sex = ?, generation = ?, father_id = ?, mother_id = ?, genes = ?, traits = ?, status = ?, role = ?, nest_id = ?, account_id = COALESCE(?, account_id), species = ? WHERE id = ?')
      .run(m.name, m.sex, m.generation || 1, m.father_id ?? null, m.mother_id ?? null, J(m.genes), J(m.traits || expressTraits(m.genes)), J(st), m.role, inNest ? nestId : null, accountId, m.species || 'jerboa', m.id);
  }
  /** 年齢・おなかだけ（30 秒ごと） */
  saveIndAge(m) {
    this.q("UPDATE individuals SET status = json_set(json_set(CASE WHEN json_valid(status) THEN status ELSE '{}' END, '$.ageMs', ?), '$.fed', ?) WHERE id = ?").run(Math.round(m.ageMs || 0), Math.round((m.fed ?? 100) * 100) / 100, m.id);
  }
  setHouseFlags(indId, flags) {
    this.q("UPDATE individuals SET status = json_set(CASE WHEN json_valid(status) THEN status ELSE '{}' END, '$.house', json(?)) WHERE id = ?").run(JSON.stringify(flags || {}), indId);
  }
  /** 家（shared/household.js の形）：操作個体＋巣の家族＋もうすぐ生まれるお産 */
  household(accountId) {
    const c = this.activeCharacter(accountId);
    if (!c) return null;
    const me = this.individual(c.individual.id);
    if (!me) return null;
    me.role = 'player';
    const flags = (c.individual.status && c.individual.status.house) || {};
    const members = this.q("SELECT * FROM individuals WHERE account_id = ? AND role IN ('pup', 'kin', 'mate', 'friend') ORDER BY id").all(accountId).map(r => this._ind(r));
    const L = this.q('SELECT * FROM litters WHERE account_id = ? AND born_at IS NULL ORDER BY id DESC LIMIT 1').get(accountId);
    let pending = null;
    if (L) {
      const mateId = L.mother_id === me.id ? L.father_id : L.mother_id;
      const mate = members.find(m => m.id === mateId) || this.individual(mateId);
      pending = { litterId: L.id, mateId, mateName: mate ? mate.name : '？', mateGenes: mate ? mate.genes : null, nth: L.nth, dueAgeMs: L.due_play, conceivedAt: L.conceived_at };
    }
    return { me, members, pending, litters: flags.litters | 0, lastBirthMs: flags.lastBirthMs ?? null, follow: flags.follow !== false, promptDay: flags.promptDay ?? null, nestKey: 'acct' + accountId };
  }
  /** お産の予定を書く（つれあいを迎えた・もう一度） */
  addLitter({ accountId, nestId, motherId, fatherId, nth, conceivedAt, duePlay }) {
    return Number(this.q('INSERT INTO litters (account_id, nest_id, mother_id, father_id, nth, conceived_at, due_play) VALUES (?, ?, ?, ?, ?, ?, ?)').run(accountId, nestId, motherId, fatherId, nth, conceivedAt, duePlay).lastInsertRowid);
  }
  litterBorn(id, { bornAt, size, season, seed }) { this.q('UPDATE litters SET born_at = ?, size = ?, season = ?, seed = ? WHERE id = ?').run(bornAt, size, season, seed, id); }
  dropPendingLitters(accountId) { this.q('DELETE FROM litters WHERE account_id = ? AND born_at IS NULL').run(accountId); }
  litterRows(accountId) { return this.q('SELECT * FROM litters WHERE account_id = ? ORDER BY id').all(accountId); }
  /** 巣にいる家族（所有者がオフラインのとき訪問者に見せる） */
  nestFamily(nestId) { return this.q("SELECT * FROM individuals WHERE nest_id = ? AND role IN ('pup', 'kin', 'mate', 'friend') ORDER BY id").all(nestId).map(r => this._ind(r)); }
  /** 家系図：その家の個体すべて（'pending' を除く） */
  lineage(accountId) { return this.q("SELECT * FROM individuals WHERE account_id = ? AND role NOT IN ('pending', 'friend') ORDER BY generation, id").all(accountId).map(r => this._ind(r)); }
  /** 世代交代：古いキャラクターを休ませて、あとをつぐ子のキャラクターを作る（持ち物を写す）。位置は前の子の場所 */
  switchCharacter(accountId, heir, now = Date.now()) {
    return this.tx(() => {
      const old = this.q('SELECT * FROM characters WHERE account_id = ? AND active = 1 ORDER BY id DESC LIMIT 1').get(accountId);
      this.q('UPDATE characters SET active = 0 WHERE account_id = ?').run(accountId);
      const id = Number(this.q('INSERT INTO characters (account_id, individual_id, name, fur, active, created_at, pos_x, pos_y, dir, place, exit_kind, saved_at, region) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(accountId, heir.id, heir.name, heir.traits.fur, now, old ? old.pos_x : null, old ? old.pos_y : null, old ? old.dir : 'down', old ? old.place : 'field', 'live', now, old && old.region ? old.region : 'plains').lastInsertRowid);
      if (old) this.setInventory('char', id, this.inventory('char', old.id, INV_SLOTS), INV_SLOTS);
      this.q("UPDATE individuals SET status = json_set(CASE WHEN json_valid(status) THEN status ELSE '{}' END, '$.life', json(?)) WHERE id = ?").run(JSON.stringify(makeLife()), heir.id);
      return id;
    });
  }

  // ───────── 持ち物（枠の並びごと）─────────
  inventory(kind, ownerId, slots) {
    const inv = new Array(slots).fill(null);
    for (const r of this.q('SELECT slot, item_id, qty FROM inventories WHERE owner_kind = ? AND owner_id = ?').all(kind, ownerId)) {
      if (r.slot >= 0 && r.slot < slots) inv[r.slot] = { id: r.item_id, n: r.qty };
    }
    return normalizeInventory(inv, slots);
  }
  setInventory(kind, ownerId, inv, slots) {
    const norm = normalizeInventory(inv, slots);
    this.tx(() => {
      this.q('DELETE FROM inventories WHERE owner_kind = ? AND owner_id = ?').run(kind, ownerId);
      const ins = this.q('INSERT INTO inventories (owner_kind, owner_id, slot, item_id, qty) VALUES (?, ?, ?, ?, ?)');
      norm.forEach((s, i) => { if (s) ins.run(kind, ownerId, i, s.id, s.n); });
    });
  }
  charInventory(charId) { return this.inventory('char', charId, INV_SLOTS); }
  setCharInventory(charId, inv) { this.setInventory('char', charId, inv, INV_SLOTS); }
  nestStorage(nestId) { return this.inventory('nest', nestId, STORAGE_SLOTS); }
  setNestStorage(nestId, inv) { this.setInventory('nest', nestId, inv, STORAGE_SLOTS); }

  // ───────── 巣・土地 ─────────
  /** 巣を作る：土地（入口の場所・区画・性能）を足して、巣がその土地を指す。land = {plot, info}（shared/lands.js の landOut） */
  createNest(ownerId, { data, x, y, regionId = null, land = null, field = 'plains' }, now = Date.now()) {
    return this.tx(() => {
      const lid = Number(this.q('INSERT INTO lands (region_id, x, y, info, plot, field_id) VALUES (?, ?, ?, ?, ?, ?)').run(regionId, x, y, J(land || {}), land ? land.id : null, field || 'plains').lastInsertRowid);
      const id = Number(this.q('INSERT INTO nests (owner_account_id, land_id, schema_version, rev, data, visit_policy, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?)')
        .run(ownerId, lid, data.v, JSON.stringify(data), 'private', now, now).lastInsertRowid);
      return id;
    });
  }
  /** 引っ越し：新しい土地を足して巣をそちらへ付け替える（巣の中身・倉庫・訪問設定はそのまま）。入口のふさぎは外れる */
  relocateNest(nestId, { x, y, regionId = null, land = null, field = 'plains' }, now = Date.now()) {
    return this.tx(() => {
      const lid = Number(this.q('INSERT INTO lands (region_id, x, y, info, plot, field_id) VALUES (?, ?, ?, ?, ?, ?)').run(regionId, x, y, J(land || {}), land ? land.id : null, field || 'plains').lastInsertRowid);
      this.q('UPDATE nests SET land_id = ?, plugged = 0, relocated_at = ?, updated_at = ? WHERE id = ?').run(lid, now, now, nestId);
      return lid;
    });
  }
  setPlugged(nestId, on) { this.q('UPDATE nests SET plugged = ?, updated_at = ? WHERE id = ?').run(on ? 1 : 0, Date.now(), nestId); }
  setRaided(nestId, at) { this.q('UPDATE nests SET raided_at = ? WHERE id = ?').run(at, nestId); }
  _nestRow(r) {
    if (!r) return null;
    return { id: r.id, owner: r.owner_account_id, landId: r.land_id, schemaVersion: r.schema_version, rev: r.rev, data: P(r.data, null), policy: r.visit_policy, x: r.x, y: r.y, ownerName: r.owner_name || '', ownerFur: r.owner_fur || null,
      plugged: !!r.plugged, relocatedAt: r.relocated_at || 0, raidedAt: r.raided_at || 0, plot: r.plot || null, land: P(r.land_info, null), field: r.field_id || 'plains', updatedAt: r.updated_at || 0 };
  }
  static NEST_SQL = 'SELECT n.*, l.x, l.y, l.plot, l.field_id, l.info land_info, (SELECT name FROM characters c WHERE c.account_id = n.owner_account_id AND c.active = 1 ORDER BY c.id DESC LIMIT 1) owner_name, (SELECT fur FROM characters c WHERE c.account_id = n.owner_account_id AND c.active = 1 ORDER BY c.id DESC LIMIT 1) owner_fur FROM nests n LEFT JOIN lands l ON l.id = n.land_id';
  nest(id) { return this._nestRow(this.q(Store.NEST_SQL + ' WHERE n.id = ?').get(id)); }
  nestByOwner(accountId) { return this._nestRow(this.q(Store.NEST_SQL + ' WHERE n.owner_account_id = ?').get(accountId)); }
  allNests() { return this.q(Store.NEST_SQL).all().map(r => this._nestRow(r)); }
  /** 区画にある巣の数（土地を調べたときの「近所の巣」） */
  nestsInPlot(plot, field = 'plains') { const r = this.q('SELECT COUNT(*) n FROM nests n JOIN lands l ON l.id = n.land_id WHERE l.plot = ? AND l.field_id = ?').get(plot, field); return r ? r.n : 0; }
  /** rev が一致したときだけ書く（変わった行の数を返す：0 なら古い rev） */
  updateNestData(id, oldRev, data, now = Date.now()) {
    return this.q('UPDATE nests SET data = ?, rev = rev + 1, schema_version = ?, updated_at = ? WHERE id = ? AND rev = ?').run(JSON.stringify(data), data.v, now, id, oldRev).changes;
  }
  // ───────── 巣の出来事（Ver.0.3：キツネの襲撃）─────────
  addNestEvent(nestId, kind, data, at, seen) { this.q('INSERT INTO nest_events (nest_id, kind, data, at, seen) VALUES (?, ?, ?, ?, ?)').run(nestId, kind, J(data), at, seen ? 1 : 0); }
  unseenNestEvents(nestId, limit = 20) { return this.q('SELECT kind, data, at FROM nest_events WHERE nest_id = ? AND seen = 0 ORDER BY at DESC LIMIT ?').all(nestId, limit).map(r => ({ kind: r.kind, ...P(r.data), at: r.at })); }
  markNestEventsSeen(nestId) { this.q('UPDATE nest_events SET seen = 1 WHERE nest_id = ? AND seen = 0').run(nestId); }
  recentNestEvents(nestId, limit = 20) { return this.q('SELECT kind, data, at FROM nest_events WHERE nest_id = ? ORDER BY at DESC LIMIT ?').all(nestId, limit).map(r => ({ kind: r.kind, ...P(r.data), at: r.at })); }
  setVisitPolicy(id, policy) { this.q('UPDATE nests SET visit_policy = ?, updated_at = ? WHERE id = ?').run(policy, Date.now(), id); }
  setNestAccess(nestId, entries, role = 'visitor') {
    this.tx(() => {
      this.q('DELETE FROM nest_access WHERE nest_id = ? AND role = ?').run(nestId, role);
      const ins = this.q('INSERT OR IGNORE INTO nest_access (nest_id, account_id, role, name) VALUES (?, ?, ?, ?)');
      for (const e of entries) ins.run(nestId, e.accountId, role, e.name || null);
    });
  }
  nestAccess(nestId) { return this.q('SELECT account_id, role, name FROM nest_access WHERE nest_id = ?').all(nestId).map(r => ({ accountId: r.account_id, role: r.role, name: r.name })); }
  hasNestAccess(nestId, accountId, role = 'visitor') { return !!this.q('SELECT 1 FROM nest_access WHERE nest_id = ? AND account_id = ? AND role = ?').get(nestId, accountId, role); }
  // ───────── 共同巣（Ver.0.5）：nest_access の role 'resident'（住人）・'invite'（誘い中）─────────
  addNestAccess(nestId, accountId, role, name = null) { this.q('INSERT OR IGNORE INTO nest_access (nest_id, account_id, role, name) VALUES (?, ?, ?, ?)').run(nestId, accountId, role, name); }
  removeNestAccess(nestId, accountId, role) { return this.q('DELETE FROM nest_access WHERE nest_id = ? AND account_id = ? AND role = ?').run(nestId, accountId, role).changes; }
  /** その子が住人になっている巣（1 つだけ） */
  residentNestOf(accountId) { const r = this.q("SELECT nest_id FROM nest_access WHERE account_id = ? AND role = 'resident' LIMIT 1").get(accountId); return r ? r.nest_id : null; }
  invitesFor(accountId) { return this.q("SELECT nest_id FROM nest_access WHERE account_id = ? AND role = 'invite'").all(accountId).map(r => r.nest_id); }
  nestMembers(nestId, role) { return this.q('SELECT account_id FROM nest_access WHERE nest_id = ? AND role = ?').all(nestId, role).map(r => r.account_id); }

  // ───────── 収集品・実績・印（Ver.0.5）─────────
  /** 図鑑：{収集品 id: 手に入れた時刻} */
  collection(accountId) { const o = {}; for (const r of this.q('SELECT collectible_id, got_at FROM account_collectibles WHERE account_id = ?').all(accountId)) o[r.collectible_id] = r.got_at; return o; }
  hasCollectible(accountId, cid) { return !!this.q('SELECT 1 FROM account_collectibles WHERE account_id = ? AND collectible_id = ?').get(accountId, cid); }
  /** 図鑑に入れる。もう持っていれば 0（主キーで二重に入らない） */
  addCollectible(accountId, cid, at, data = {}) { return this.q('INSERT OR IGNORE INTO account_collectibles (account_id, collectible_id, got_at, data) VALUES (?, ?, ?, ?)').run(accountId, cid, at, J(data)).changes; }
  achievements(accountId) { const o = {}; for (const r of this.q('SELECT key, got_at FROM achievements WHERE account_id = ?').all(accountId)) o[r.key] = r.got_at; return o; }
  addAchievement(accountId, key, at) { return this.q('INSERT OR IGNORE INTO achievements (account_id, key, got_at) VALUES (?, ?, ?)').run(accountId, key, at).changes; }
  flag(accountId, key, d = null) { const r = this.q('SELECT value FROM account_flags WHERE account_id = ? AND key = ?').get(accountId, key); return r ? r.value : d; }
  setFlag(accountId, key, value) { this.q('INSERT INTO account_flags (account_id, key, value) VALUES (?, ?, ?) ON CONFLICT(account_id, key) DO UPDATE SET value = excluded.value').run(accountId, key, value == null ? null : String(value)); }

  // ───────── フレンド（Ver.0.2）─────────
  /** a と b の行（向きは問わない）：{a, b, state} か null */
  friendRow(x, y) { return this.q('SELECT a, b, state FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)').get(x, y, y, x) || null; }
  friendRequest(a, b, now = Date.now()) { this.q("INSERT INTO friends (a, b, state, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)").run(a, b, now, now); }
  friendAccept(a, b, now = Date.now()) { return this.q("UPDATE friends SET state = 'friend', updated_at = ? WHERE a = ? AND b = ? AND state = 'pending'").run(now, a, b).changes; }
  friendDelete(x, y) { return this.q('DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)').run(x, y, y, x).changes; }
  isFriend(x, y) { const r = this.friendRow(x, y); return !!r && r.state === 'friend'; }
  /** 自分に関わる行：{other, state:'friend'|'outgoing'|'incoming', at} */
  friendsOf(acct) {
    return this.q('SELECT a, b, state, updated_at FROM friends WHERE a = ? OR b = ? ORDER BY updated_at DESC').all(acct, acct).map(r => ({
      other: r.a === acct ? r.b : r.a, state: r.state === 'friend' ? 'friend' : r.a === acct ? 'outgoing' : 'incoming', at: r.updated_at,
    }));
  }
  friendIds(acct) { return this.friendsOf(acct).filter(f => f.state === 'friend').map(f => f.other); }

  // ───────── 訪問の記録（Ver.0.2）─────────
  addVisit(nestId, visitorId, name, at, seen) { this.q('INSERT INTO nest_visits (nest_id, visitor_id, visitor_name, at, seen) VALUES (?, ?, ?, ?, ?)').run(nestId, visitorId, name, at, seen ? 1 : 0); }
  lastVisit(nestId, visitorId) { const r = this.q('SELECT at FROM nest_visits WHERE nest_id = ? AND visitor_id = ? ORDER BY at DESC LIMIT 1').get(nestId, visitorId); return r ? r.at : 0; }
  unseenVisits(nestId, limit = 20) { return this.q('SELECT visitor_name name, at FROM nest_visits WHERE nest_id = ? AND seen = 0 ORDER BY at DESC LIMIT ?').all(nestId, limit).map(r => ({ name: r.name, at: r.at })); }
  markVisitsSeen(nestId) { this.q('UPDATE nest_visits SET seen = 1 WHERE nest_id = ? AND seen = 0').run(nestId); }
  recentVisits(nestId, limit = 20) { return this.q('SELECT visitor_name name, at FROM nest_visits WHERE nest_id = ? ORDER BY at DESC LIMIT ?').all(nestId, limit).map(r => ({ name: r.name, at: r.at })); }
  /** 古い記録を消す（巣ごとに新しい 200 件だけ残す） */
  trimVisits(nestId, keep = 200) { this.q('DELETE FROM nest_visits WHERE nest_id = ? AND id NOT IN (SELECT id FROM nest_visits WHERE nest_id = ? ORDER BY at DESC LIMIT ?)').run(nestId, nestId, keep); }

  // ───────── 採集物 ─────────
  /** field（Ver.0.5）：どの土地の採集物か。収集品（kind 'curio'）は region_id に収集品の id を入れておく */
  resources(field = 'plains') { return this.q('SELECT id, kind, x, y, qty, expires_at, region_id FROM world_resources WHERE respawn_at IS NULL AND field_id = ?').all(field).map(r => ({ id: r.id, kind: r.kind, x: r.x, y: r.y, ...(r.qty > 1 ? { n: r.qty } : {}), ...(r.expires_at ? { exp: r.expires_at } : {}), ...(r.kind === 'curio' ? { cid: r.region_id } : {}) })); }
  respawnQueue(field = 'plains') { return this.q('SELECT id, kind, respawn_at FROM world_resources WHERE respawn_at IS NOT NULL AND field_id = ? ORDER BY respawn_at').all(field).map(r => ({ id: r.id, kind: r.kind, at: r.respawn_at })); }
  /** r = {id, kind, x, y, n?（落とし物の数）, exp?（消える時刻）, cid?（収集品）} */
  insertResource(r, regionId = null, field = 'plains') { this.q('INSERT INTO world_resources (id, region_id, kind, x, y, respawn_at, qty, expires_at, field_id) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)').run(r.id, r.cid || regionId, r.kind, r.x, r.y, r.n > 1 ? r.n : 1, r.exp || null, field || 'plains'); }
  /** 地上から消す（あったときだけ 1） */
  takeResource(id) { return this.q('DELETE FROM world_resources WHERE id = ? AND respawn_at IS NULL').run(id).changes; }
  queueRespawn(id, kind, at, field = 'plains') { this.q('INSERT INTO world_resources (id, kind, x, y, respawn_at, field_id) VALUES (?, ?, NULL, NULL, ?, ?)').run(id, kind, at, field || 'plains'); }
  dropRespawn(id) { this.q('DELETE FROM world_resources WHERE id = ? AND respawn_at IS NOT NULL').run(id); }
  delayRespawn(id, at) { this.q('UPDATE world_resources SET respawn_at = ? WHERE id = ?').run(at, id); }

  /** VACUUM INTO（動いている間でも一貫したコピーが取れる） */
  vacuumInto(path) { this.db.exec(`VACUUM INTO '${String(path).replace(/'/g, "''")}'`); }
}

/** 開いて、マイグレーションと巣データの移行まで済ませる */
export async function openDb(file, opts = {}) {
  const s = new Store(file, opts);
  await s.migrate(opts);
  if (s.schemaVersion() >= 1) s.migrateNestData();
  if (s.schemaVersion() >= 6) syncCollectibles(s.db);
  return s;
}
