// 『境界事象』後半（第七章〜最終章・エンディング）と本編連動（KY_LINK・DAY 31）のテスト：node tests/kyokai-story2.test.mjs
// ・証拠 id がすべて定義されている／推理の正解に必要な証拠は、その推理より前に手に入る
// ・スタブの K で ch07〜ch14 を最後まで流し、END A / B / C / TRUE それぞれに到達できる
// ・KY_LINK：本編データ無し・旧単一セーブ・3スロット・エンディング記録・壊れたデータ・書き込みしない
// ・DAY 31 の表示条件（kyokai_true_end==='1' かつ 本編エンディング1つ以上）と本編タイトルへの組み込み
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}

const MY = ['ch07', 'ch08', 'ch09', 'ch10', 'ch11', 'ch12', 'ch13', 'ch14'].map(c => `kyokai/story/${c}.js`).concat(['kyokai/story/endings.js']);
const SCENES = new Set('center_office center_server center_lab center_basement shotengai school shrine tunnel mountain_road station_ruin station_live residential riverbank old_lab empty_town bureau stream_room factory_glimpse collapse core town_map board_bg'.split(' '));
const FX = new Set('glitch noise blackout shake flash mainui whiteout scan'.split(' '));
const SE = new Set('whistle whistle_far static clock wire steps voice beep shutter rec tap gain note switch error scan heart chime stream'.split(' '));
const AMB = new Set('clock wire whistle_far radio steps voices rain station factory room off'.split(' '));

function fakeLS(init) {
  const m = new Map(Object.entries(init || {})); const writes = [];
  return { writes, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(k); m.set(k, String(v)); }, removeItem: k => { writes.push(k); m.delete(k); } };
}
function loadLink(ls) {
  const ctx = { console, JSON, Math, Object, Array, String, Number, isFinite };
  ctx.window = ctx; ctx.localStorage = ls; vm.createContext(ctx);
  vm.runInContext(read('kyokai/link.js'), ctx);
  return ctx.KY_LINK;
}

// 後半の章をスタブ環境に読み込む
function loadStory(ls) {
  const reg = {};
  const ctx = { console, JSON, Math, Object, Array, String, Number, isFinite, Promise, Set, Map };
  ctx.window = ctx; ctx.localStorage = ls || fakeLS();
  ctx.KY = { EVIDENCE: {}, AREAS: {} };
  ctx.KY_STORY = { register: (id, fn) => { reg[id] = fn; } };
  vm.createContext(ctx);
  vm.runInContext(read('kyokai/link.js'), ctx);
  vm.runInContext(read('kyokai/data/evidence.js'), ctx);
  for (const f of MY) vm.runInContext(read(f), ctx, { filename: f });
  return { ctx, reg, KY: ctx.KY };
}

// スタブ K：探索は場所を総当たり、推理は「正解に必要な証拠をもう持っているか」を確かめて正解扱い
function makeK(env, opt) {
  const { KY } = env;
  const S = { flags: {}, evidence: [], stability: 100, name: '朝霧', world: 'A' };
  const log = { deduce: [], problems: [], endings: [], mainUI: 0, lastPattern: null, chapterOfGain: {} };
  let curCh = 7;
  const END = { end: true };
  const K = {
    get state() { return S; }, get name() { return S.name; }, get world() { return S.world; },
    flag(n, v) { if (arguments.length >= 2) { S.flags[n] = v; return v; } if (S.flags[n] === undefined) S.flags[n] = true; return S.flags[n]; },
    get: n => S.flags[n], has: n => !!S.flags[n],
    inc(n, d) { S.flags[n] = (typeof S.flags[n] === 'number' ? S.flags[n] : 0) + (d == null ? 1 : d); return S.flags[n]; },
    gain(id) { if (!KY.EVIDENCE[id]) log.problems.push('未定義の証拠 ' + id); if (S.evidence.includes(id)) return false; S.evidence.push(id); log.chapterOfGain[id] = curCh; return true; },
    got: id => S.evidence.includes(id),
    note() {}, title: async () => {}, input: async (q, d) => d,
    async say(lines) {
      for (const raw of [].concat(lines || [])) {
        const s = String(raw);
        if (s[0] === '#') {
          const a = s.slice(1).trim().split(/\s+/);
          if (a[0] === 'scene' && !SCENES.has(a[1])) log.problems.push('未知の場面 ' + s);
          if (a[0] === 'fx' && !FX.has(a[1])) log.problems.push('未知のfx ' + s);
          if (a[0] === 'se' && !SE.has(a[1])) log.problems.push('未知のse ' + s);
          if (a[0] === 'amb' && !AMB.has(a[1])) log.problems.push('未知のamb ' + s);
          if (!['scene', 'fx', 'se', 'amb', 'wait', 'face', 'mainui', 'world'].includes(a[0])) log.problems.push('未知の演出 ' + s);
          continue;
        }
        if (!/^[npymgksdctx]:/.test(s)) log.problems.push('話者の接頭辞が無い行 ' + s);
        if (/^t:.*→/.test(s)) log.lastPattern = s.slice(2).split(' → ');
      }
    },
    async choice(q, opts) {
      const vals = opts.map(o => o.v);
      let m;
      if ((m = /経過 \+(\d+)日/.exec(q))) return +m[1] + 1;
      if (/どの世界へ返す/.test(q)) {
        const ans = /昭和九十五年|月代鉄道/.test(q) ? 'B' : /常盤時計|2:17 通信障害/.test(q) ? 'A' : 'C';
        return ans;
      }
      if ((m = /拍 (\d+)／/.exec(q))) { const N = { '汽笛': 'whistle', '時計': 'clock', '電線': 'wire' }; return N[log.lastPattern[+m[1] - 1]]; }
      if (/九条について/.test(q)) return opt.kujo || 'undecided';
      if (q === 'どうする？') return opt.final || 'return';
      if (/帰り道をどう確かめる/.test(q)) return opt.anchor || 'shiro';
      return vals[0] !== undefined ? vals[0] : 0;
    },
    async step(id, fn) { return fn(); },
    async explore(def) {
      const tried = new Set();
      for (let pass = 0; pass < 40; pass++) {
        if (!opt.thorough && def.goal(K)) return;
        let progressed = false;
        for (const aid of def.areas || Object.keys(KY.AREAS)) {
          const a = KY.AREAS[aid]; if (!a) continue;
          if (a.cond && !a.cond(K)) continue;
          for (const w of Object.keys(a.worlds || {})) {
            for (const sp of a.worlds[w].spots || []) {
              if (sp.cond && !sp.cond(K)) continue;
              for (const act of sp.acts || []) {
                const key = aid + '/' + w + '/' + sp.id + '/' + act + '/' + S.evidence.length + '/' + Object.keys(S.flags).length;
                if (tried.has(key) || !sp.on || !sp.on[act]) continue;
                tried.add(key); progressed = true;
                await sp.on[act](K);
                if (!opt.thorough && def.goal(K)) return;
              }
            }
          }
        }
        if (!progressed) break;
      }
      if (!def.goal(K)) throw new Error('探索が終わらない: ' + def.hint);
    },
    async deduce(def) {
      const ans = def.options.find(o => o.id === def.answer);
      if (!ans) log.problems.push('推理 ' + def.id + ' の正解が選択肢に無い');
      for (const o of def.options) for (const id of (o.need || []).concat(o.refute || [])) if (!KY.EVIDENCE[id]) log.problems.push('推理 ' + def.id + ' の証拠が未定義 ' + id);
      const missing = (ans.need || []).filter(id => !S.evidence.includes(id) && !/^(c\d|p_|sd_)/.test(id));
      if (missing.length) log.problems.push('推理 ' + def.id + ' の必要証拠が手元に無い ' + missing.join(','));
      if ((ans.need || []).length !== (def.link || 2)) log.problems.push('推理 ' + def.id + ' の need 数と link 数が違う');
      log.deduce.push({ id: def.id, ch: curCh, need: ans.need });
      return true;
    },
    async chase() { return true; }, async spot() { return true; },
    async mainUI() { log.mainUI++; }, async fx() {}, se() {}, amb() {}, scene() {},
    setWorld(w) { S.world = w; }, unlock() {}, lockArea() {}, item() { return 1; }, equip() {}, sync() {}, carry() { return true; },
    stab(n) { S.stability = Math.max(0, Math.min(100, S.stability + n)); },
    async ending(id) { log.endings.push(id); throw END; },
    async run(id) { return env.reg[id](K); },
  };
  // 前半の到達を模す（前半の証拠は持っている扱い）
  Object.keys(KY.EVIDENCE).filter(id => (KY.EVIDENCE[id].ch | 0) < 7).forEach(id => S.evidence.push(id));
  ['ch0', 'ch6_done', 'nagi_met', 'shiro_met', 'nagi_promise'].forEach(f => (S.flags[f] = true));
  if (opt.preset) opt.preset(S);
  return { K, S, log, END, setCh: n => (curCh = n) };
}
async function playthrough(ls, opt) {
  const env = loadStory(ls);
  const r = makeK(env, opt || {});
  for (let n = 7; n <= 14; n++) {
    r.setCh(n);
    try { await env.reg['ch' + String(n).padStart(2, '0')](r.K); }
    catch (e) { if (e !== r.END) throw e; }
  }
  return Object.assign(r, { env });
}
const MAIN_CLEARED = () => fakeLS({ dannoura_endings: JSON.stringify({ engineer: { firstDay: 30, firstAt: '2026-10-01T00:00:00Z', count: 1 } }),
  dannoura_save_slot1: JSON.stringify({ version: 1, savedAt: '2026-10-01T00:00:00Z', gs: { day: 30, streamCount: 12, certKnow: 80, jobRep: 70, mental: 60, fatigue: 30, followers: 400, anomalyCount: 3, childStress: 20, endingReached: 'engineer', skills: { focus: 2 } } }) });

await test('構文：後半の章・link・day31 が node --check 相当で読める', () => {
  for (const f of MY.concat(['kyokai/link.js', 'main/day31.js'])) new vm.Script(read(f), { filename: f });
});

await test('証拠：後半で使う証拠 id がすべて定義され、ch が 7〜14', () => {
  const { KY } = loadStory();
  const src = MY.map(read).join('\n');
  const ids = new Set([...src.matchAll(/K\.gain\('([^']+)'\)/g)].map(m => m[1]));
  assert.ok(ids.size >= 30, '後半の証拠が少なすぎる: ' + ids.size);
  for (const id of ids) {
    assert.ok(KY.EVIDENCE[id], '未定義: ' + id);
    const e = KY.EVIDENCE[id];
    assert.ok(e.title && e.desc && e.type, id + ' の項目');
    assert.ok(e.ch >= 7 && e.ch <= 14, id + ' の ch');
  }
});

await test('推理：前半の証拠を使う場合、その証拠は前半の章で手に入る', () => {
  const { KY } = loadStory();
  const src = MY.map(read).join('\n');
  const used = new Set([...src.matchAll(/'((?:c\d|p_|sd_)[a-z0-9_]+)'/g)].map(m => m[1]));
  for (const id of used) {
    const e = KY.EVIDENCE[id]; assert.ok(e, '前半の証拠が未定義: ' + id);
    const f = /^sd_/.test(id) ? 'kyokai/story/side.js' : `kyokai/story/ch${String(e.ch).padStart(2, '0')}.js`;
    if (!existsSync(join(ROOT, f))) continue;       // 前半の章がまだ無い環境では定義の有無だけ
    assert.ok(read(f).includes("'" + id + "'"), f + ' で ' + id + ' を得る場所が見つからない');
  }
});

await test('通しプレイ（本編データ無し）：END A・推理8件以上・本編UI侵食は2〜3回・問題なし', async () => {
  const r = await playthrough(fakeLS(), { thorough: true });
  assert.deepEqual(r.log.problems, []);
  assert.deepEqual(r.log.endings, ['A'], '本編データが無いなら TRUE にならない');
  assert.ok(r.log.deduce.length >= 8, '推理の数 ' + r.log.deduce.length);
  assert.ok(r.log.mainUI >= 2 && r.log.mainUI <= 3, '本編UI侵食の回数 ' + r.log.mainUI);
  for (const f of ['d7_future', 'b30_read', 'd9_day30', 'd10_futures', 'd11_reverse', 'd12_444', 'back_seen', 'core_done']) assert.ok(r.S.flags[f], f);
  assert.ok(r.S.flags.n444 >= 5, '444 の痕跡 ' + r.S.flags.n444);
  // 推理に必要な証拠は、その章までに手に入っている
  for (const d of r.log.deduce) for (const id of d.need) if (r.log.chapterOfGain[id]) assert.ok(r.log.chapterOfGain[id] <= d.ch, d.id + ' の ' + id);
});

await test('END TRUE：主要な謎を解き、本編のエンディングを見ている', async () => {
  const r = await playthrough(MAIN_CLEARED(), { thorough: true });
  assert.deepEqual(r.log.problems, []);
  assert.deepEqual(r.log.endings, ['TRUE']);
  assert.ok(r.env.KY.part2.mysteries(r.K) >= 4);
  assert.ok(Array.isArray(r.env.KY.POSTCREDIT) && r.env.KY.POSTCREDIT.some(s => /USER_444\|次はどの世界を見る？/.test(s)) && r.env.KY.POSTCREDIT.some(s => /UNKNOWN\|まだ30日目が終わってない。/.test(s)));
});

await test('END A：本編クリア済みでも、寄り道せず謎を解き残すと帰還', async () => {
  const r = await playthrough(MAIN_CLEARED(), { thorough: false });
  assert.deepEqual(r.log.problems, []);
  assert.ok(r.env.KY.part2.mysteries(r.K) < 4, '最短では謎が4つ未満');
  assert.deepEqual(r.log.endings, ['A']);
});

await test('END B：帰り道を「ユウの声」で選ぶ／安定度が低い／何度もずれた', async () => {
  let r = await playthrough(MAIN_CLEARED(), { thorough: true, anchor: 'voice' });
  assert.deepEqual(r.log.endings, ['B']);
  r = await playthrough(fakeLS(), { thorough: false, anchor: 'id', preset: S => { S.flags.slipped = 3; } });
  assert.deepEqual(r.log.endings, ['B']);
  // 職員証で確かめても、安定度40未満なら所属が対策局に見えていて B
  const env = loadStory(fakeLS()); const k = makeK(env, {});
  k.S.flags.anchor = 'id'; k.S.stability = 35; assert.equal(env.KY.part2.decideEnding(k.K), 'B');
  k.S.stability = 80; assert.equal(env.KY.part2.decideEnding(k.K), 'A');
});

await test('END C：境界に残る（ほかの条件より優先）', async () => {
  const r = await playthrough(MAIN_CLEARED(), { thorough: true, final: 'stay', kujo: 'understand' });
  assert.deepEqual(r.log.endings, ['C']);
});

await test('§32：九条への態度（止めるべき／理解できる／まだ判断できない）がフラグに残る', async () => {
  for (const v of ['stop', 'understand', 'undecided']) {
    const r = await playthrough(fakeLS(), { kujo: v });
    assert.equal(r.S.flags.kujo_view, v);
  }
});

await test('B-30：本編データで記録の差分が変わる（無ければ謎の男性）', () => {
  const env0 = loadStory(fakeLS()); const k0 = makeK(env0, {});
  const t0 = env0.KY.part2.b30Lines(k0.K);
  assert.ok(t0.rec.some(s => /設備関連業務/.test(s)) && t0.img.some(s => /名前も知らない/.test(s)));
  const env1 = loadStory(MAIN_CLEARED()); const k1 = makeK(env1, {});
  const t1 = env1.KY.part2.b30Lines(k1.K).img.join('\n');
  assert.match(t1, /参考書/); assert.match(t1, /資格証/); assert.doesNotMatch(t1, /名前も知らない/);
  const env2 = loadStory(fakeLS({ dannoura_endings: JSON.stringify({ collapse: { count: 1 } }) })); const k2 = makeK(env2, {});
  assert.match(env2.KY.part2.b30Lines(k2.K).img.join('\n'), /本人がいない/);
});

await test('KY_LINK：本編データ無し', () => {
  const ls = fakeLS(); const L = loadLink(ls);
  assert.equal(L.hasMain(), false); assert.equal(L.cleared(), false); assert.equal(L.best(), null);
  assert.deepEqual([...L.endings()], []);
  const b = L.b30(); assert.equal(b.any, false); assert.equal(b.ending, null); assert.equal(b.variant, null);
  assert.equal(ls.writes.length, 0);
});

await test('KY_LINK：旧単一セーブ（dannoura_save_v1）・gs の無い古い形式', () => {
  let L = loadLink(fakeLS({ dannoura_save_v1: JSON.stringify({ version: 1, savedAt: '2025-01-01T00:00:00Z', gs: { day: 12, streamCount: 3, certKnow: 20, mental: 25, fatigue: 80, skills: {} } }) }));
  assert.equal(L.hasMain(), true); assert.equal(L.cleared(), false);
  assert.equal(L.best().day, 12); assert.equal(L.b30().unwell, true); assert.equal(L.b30().study, false);
  L = loadLink(fakeLS({ dannoura_save_v1: JSON.stringify({ day: 5, streamCount: 9, followers: 20 }) }));
  assert.equal(L.best().day, 5); assert.equal(L.b30().stream, true);
});

await test('KY_LINK：3スロットからいちばん新しいセーブ・エンディング記録', () => {
  const ls = fakeLS({
    dannoura_save_slot1: JSON.stringify({ version: 1, savedAt: '2026-01-01T00:00:00Z', gs: { day: 3, certKnow: 90 } }),
    dannoura_save_slot2: JSON.stringify({ version: 1, savedAt: '2026-03-01T00:00:00Z', gs: { day: 30, streamCount: 20, followers: 900, endingReached: 'king', skills: { chatSkill: 3 } } }),
    dannoura_save_slot3: '{壊れたJSON',
    dannoura_endings: JSON.stringify({ king: { firstDay: 30, firstAt: '2026-03-01', count: 2 }, collapse: { firstDay: 18, firstAt: '2026-02-01', count: 1 }, bogus: { count: 1 } }),
  });
  const L = loadLink(ls);
  assert.equal(L.best().day, 30); assert.equal(L.best().endingReached, 'king');
  assert.deepEqual([...L.endings()].sort(), ['collapse', 'king']);
  assert.equal(L.cleared(), true);
  const b = L.b30(); assert.equal(b.ending, 'king'); assert.equal(b.variant, 'stream'); assert.equal(b.stream, true); assert.equal(b.good, true);
  assert.equal(ls.writes.length, 0, '本編のキーに書き込まない');
});

await test('KY_LINK：エンディングだけ・配列形式・壊れた記録・ストレージ例外', () => {
  let L = loadLink(fakeLS({ dannoura_endings: JSON.stringify(['flame', 'x']) }));
  assert.deepEqual([...L.endings()], ['flame']); assert.equal(L.b30().bad, true); assert.equal(L.b30().variant, 'collapse');
  L = loadLink(fakeLS({ dannoura_endings: 'null' })); assert.deepEqual([...L.endings()], []);
  L = loadLink({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.equal(L.hasMain(), false); assert.equal(L.best(), null);
  L = loadLink(null); assert.equal(L.cleared(), false);
});

await test('DAY 31：kyokai_true_end==="1" かつ本編エンディング1つ以上のときだけ', () => {
  const ctx = { console, JSON, Object, Array }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('main/day31.js'), ctx);
  const V = ls => ctx.DAY31.visible(ls);
  assert.equal(V(fakeLS()), false);
  assert.equal(V(fakeLS({ kyokai_true_end: '1' })), false);
  assert.equal(V(fakeLS({ dannoura_endings: JSON.stringify({ normal: { count: 1 } }) })), false);
  assert.equal(V(fakeLS({ kyokai_true_end: '1', dannoura_endings: JSON.stringify({ normal: { count: 1 } }) })), true);
  assert.equal(V(fakeLS({ kyokai_true_end: '1', dannoura_endings: '{}' })), false);
  assert.equal(V(fakeLS({ kyokai_true_end: '1', dannoura_endings: '{壊れ' })), false);
  assert.equal(V(fakeLS({ kyokai_true_end: 'true', dannoura_endings: JSON.stringify({ king: {} }) })), false);
  assert.equal(V({ getItem() { throw new Error('x'); } }), false);
  // 本編のセーブには書き込まない（day31.js に setItem が無い）
  assert.doesNotMatch(read('main/day31.js'), /setItem|removeItem/);
});

await test('本編タイトル：「おまけ：境界事象」（常に表示）と DAY 31（初期は非表示）・読み込み順・sw.js', () => {
  const html = read('index.html');
  const ky = /<button[^>]*id="btn-kyokai"[^>]*>/.exec(html); assert.ok(ky, 'btn-kyokai');
  assert.doesNotMatch(ky[0], /display:\s*none/); assert.match(ky[0], /openKyokai\(\)/);
  const d = /<button[^>]*id="btn-day31"[^>]*>/.exec(html); assert.ok(d); assert.match(d[0], /display:none/);
  assert.ok(html.indexOf('main/presentation.js') < html.indexOf('main/day31.js'));
  assert.match(read('main/day31.js'), /kyokai\.html/);
  assert.match(read('main/presentation.js'), /btn-kyokai/);
  assert.match(read('sw.js'), /'main\/day31\.js'/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
