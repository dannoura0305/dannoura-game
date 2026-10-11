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
  createCharacter(accountId, { name, fur, x, y, inv }, now = Date.now()) {
    return this.tx(() => {
      const ind = Number(this.q('INSERT INTO individuals (species, name, sex, born_at, generation, genes, traits, status) VALUES (?, ?, ?, ?, 1, ?, ?, ?)')
        .run('jerboa', name, null, now, J({ fur }), J({}), J({})).lastInsertRowid);
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
      pos: { x: c.pos_x, y: c.pos_y, dir: c.dir, place: c.place, exit: c.exit_kind, savedAt: c.saved_at },
    };
  }
  savePosition(charId, { x, y, dir, place, exit }, now = Date.now()) {
    this.q('UPDATE characters SET pos_x = ?, pos_y = ?, dir = ?, place = ?, exit_kind = ?, saved_at = ? WHERE id = ?')
      .run(Math.round(x * 10) / 10, Math.round(y * 10) / 10, dir || 'down', place || 'field', exit || 'live', now, charId);
  }
  /** 名前（キャラ名）→ アカウント id（同じ名前は全員） */
  accountsByCharName(name) { return this.q('SELECT DISTINCT account_id FROM characters WHERE name = ? AND active = 1').all(name).map(r => r.account_id); }

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
  createNest(ownerId, { data, x, y, regionId = null }, now = Date.now()) {
    return this.tx(() => {
      const land = Number(this.q('INSERT INTO lands (region_id, x, y, info) VALUES (?, ?, ?, ?)').run(regionId, x, y, '{}').lastInsertRowid);
      const id = Number(this.q('INSERT INTO nests (owner_account_id, land_id, schema_version, rev, data, visit_policy, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?)')
        .run(ownerId, land, data.v, JSON.stringify(data), 'private', now, now).lastInsertRowid);
      return id;
    });
  }
  _nestRow(r) {
    if (!r) return null;
    return { id: r.id, owner: r.owner_account_id, landId: r.land_id, schemaVersion: r.schema_version, rev: r.rev, data: P(r.data, null), policy: r.visit_policy, x: r.x, y: r.y, ownerName: r.owner_name || '', ownerFur: r.owner_fur || null };
  }
  static NEST_SQL = 'SELECT n.*, l.x, l.y, (SELECT name FROM characters c WHERE c.account_id = n.owner_account_id AND c.active = 1 ORDER BY c.id DESC LIMIT 1) owner_name, (SELECT fur FROM characters c WHERE c.account_id = n.owner_account_id AND c.active = 1 ORDER BY c.id DESC LIMIT 1) owner_fur FROM nests n LEFT JOIN lands l ON l.id = n.land_id';
  nest(id) { return this._nestRow(this.q(Store.NEST_SQL + ' WHERE n.id = ?').get(id)); }
  nestByOwner(accountId) { return this._nestRow(this.q(Store.NEST_SQL + ' WHERE n.owner_account_id = ?').get(accountId)); }
  allNests() { return this.q(Store.NEST_SQL).all().map(r => this._nestRow(r)); }
  /** rev が一致したときだけ書く（変わった行の数を返す：0 なら古い rev） */
  updateNestData(id, oldRev, data, now = Date.now()) {
    return this.q('UPDATE nests SET data = ?, rev = rev + 1, schema_version = ?, updated_at = ? WHERE id = ? AND rev = ?').run(JSON.stringify(data), data.v, now, id, oldRev).changes;
  }
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

  // ───────── 採集物 ─────────
  resources() { return this.q('SELECT id, kind, x, y FROM world_resources WHERE respawn_at IS NULL').all().map(r => ({ id: r.id, kind: r.kind, x: r.x, y: r.y })); }
  respawnQueue() { return this.q('SELECT id, kind, respawn_at FROM world_resources WHERE respawn_at IS NOT NULL ORDER BY respawn_at').all().map(r => ({ id: r.id, kind: r.kind, at: r.respawn_at })); }
  insertResource(r, regionId = null) { this.q('INSERT INTO world_resources (id, region_id, kind, x, y, respawn_at) VALUES (?, ?, ?, ?, ?, NULL)').run(r.id, regionId, r.kind, r.x, r.y); }
  /** 地上から消す（あったときだけ 1） */
  takeResource(id) { return this.q('DELETE FROM world_resources WHERE id = ? AND respawn_at IS NULL').run(id).changes; }
  queueRespawn(id, kind, at) { this.q('INSERT INTO world_resources (id, kind, x, y, respawn_at) VALUES (?, ?, NULL, NULL, ?)').run(id, kind, at); }
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
  return s;
}
