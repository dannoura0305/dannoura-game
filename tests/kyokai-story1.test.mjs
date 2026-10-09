// 『境界事象』前半（プロローグ〜第六章・任意調査）のテスト：node tests/kyokai-story1.test.mjs
// ・章ファイルを node:vm にスタブの K と一緒に読み込む（エンジン不要）
// ・探索は「解放されている場所 × 世界 × 調べ物 × 行動」を総当たりして、各章を最初から最後まで流す
// ・K.gain の id はすべて EVIDENCE にある／推理の正解に必要な証拠は、その推理より前に手に入っている
// ・場面 id・演出コマンド・話者の接頭辞が契約どおり／ch00.js 冒頭に書いたフラグがどこかで立つ
// ・任意調査（side.js）がすべて解決できる
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
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

const CH = ['ch00', 'ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06'];
const MY = CH.map(c => `kyokai/story/${c}.js`).concat(['kyokai/story/side.js']);
const SCENES = new Set('center_office center_server center_lab center_basement shotengai school shrine tunnel mountain_road station_ruin station_live residential riverbank old_lab empty_town bureau stream_room factory_glimpse collapse core town_map board_bg'.split(' '));
const FX = new Set('glitch noise blackout shake flash mainui whiteout scan'.split(' '));
const SE = new Set('whistle whistle_far static clock wire steps voice beep shutter rec tap gain note switch error scan heart chime stream'.split(' '));
const AMB = new Set('clock wire whistle_far radio steps voices rain station factory room off'.split(' '));
const ACTS = new Set(['look', 'photo', 'record', 'scan', 'talk']);
const NOTE_CATS = new Set(['person', 'place', 'term', 'case', 'hypo', 'diff', 'creature', 'b30', '444']);
const CHASE_OK = new Set(['run', 'hide', 'repel']);

function load() {
  const reg = {};
  const ctx = { console, JSON, Math, Object, Array, String, Number, isFinite, Promise, Set, Map };
  ctx.window = ctx;
  ctx.KY = { EVIDENCE: {}, AREAS: {} };
  ctx.KY_STORY = { register: (id, fn) => { reg[id] = fn; } };
  vm.createContext(ctx);
  vm.runInContext(read('kyokai/data/evidence.js'), ctx, { filename: 'evidence.js' });
  for (const f of MY) vm.runInContext(read(f), ctx, { filename: f });
  return { ctx, reg, KY: ctx.KY };
}

function makeK(env, full) {
  const { KY } = env;
  const S = { flags: {}, evidence: [], stability: 100, name: '朝霧', world: 'A', baseWorld: 'A', sync: 0, items: { battery: 0, light: 0, med: 0, stab: 0 }, equip: [], unlocked: [] };
  const log = { problems: [], deduce: [], spots: 0, chases: 0, gainAt: {}, notes: {}, setFlags: new Set(), explores: 0, actions: 0 };
  let cur = 'ch00';
  const choiceN = {};
  const K = {
    get state() { return S; }, get name() { return S.name; }, get world() { return S.world; },
    setName(n) { S.name = n; },
    flag(n, v) { log.setFlags.add(n); if (arguments.length >= 2) { S.flags[n] = v; return v; } if (S.flags[n] === undefined) S.flags[n] = true; return S.flags[n]; },
    get: n => S.flags[n], has: n => !!S.flags[n], unflag: n => { delete S.flags[n]; },
    inc(n, d) { log.setFlags.add(n); S.flags[n] = (typeof S.flags[n] === 'number' ? S.flags[n] : 0) + (d == null ? 1 : d); return S.flags[n]; },
    gain(id) { if (!KY.EVIDENCE[id]) log.problems.push(`${cur}: 未定義の証拠 ${id}`); if (S.evidence.includes(id)) return false; S.evidence.push(id); log.gainAt[id] = cur; return true; },
    got: id => S.evidence.includes(id),
    note(cat, id, o) { if (!NOTE_CATS.has(cat)) log.problems.push(`${cur}: 手帳の分類が不正 ${cat}`); log.notes[cat + '/' + id] = o; },
    title: async () => {}, input: async (q, d) => d,
    async say(lines) {
      for (const raw of [].concat(lines || [])) {
        const s = String(raw);
        if (s[0] === '#') {
          const a = s.slice(1).trim().split(/\s+/);
          if (a[0] === 'scene' && !SCENES.has(a[1])) log.problems.push(`${cur}: 未知の場面 ${s}`);
          if (a[0] === 'scene' && a[2] && !/^[ABC]$/.test(a[2])) log.problems.push(`${cur}: 世界の指定が不正 ${s}`);
          if (a[0] === 'fx' && !FX.has(a[1])) log.problems.push(`${cur}: 未知のfx ${s}`);
          if (a[0] === 'se' && !SE.has(a[1])) log.problems.push(`${cur}: 未知のse ${s}`);
          if (a[0] === 'amb' && !AMB.has(a[1])) log.problems.push(`${cur}: 未知のamb ${s}`);
          if (a[0] === 'world') { S.world = a[1]; S.baseWorld = a[1]; }
          if (!['scene', 'fx', 'se', 'amb', 'wait', 'face', 'mainui', 'world', 'stage'].includes(a[0])) log.problems.push(`${cur}: 未知の演出 ${s}`);
          continue;
        }
        if (!/^[npymgksdctx]:/.test(s)) log.problems.push(`${cur}: 話者の接頭辞が無い行 ${s}`);
        if (/^[cx]:/.test(s) && s.indexOf('|') < 0) log.problems.push(`${cur}: 名前|本文 の形でない行 ${s}`);
        if (/女性|彼女/.test(s) && /配信|画面の/.test(s)) log.problems.push(`${cur}: 配信の人物を女性と書いている？ ${s}`);
      }
    },
    async choice(q, opts) {
      const n = choiceN[q] = (choiceN[q] || 0) + 1;
      const o = opts[(n - 1) % opts.length];
      return o.v !== undefined ? o.v : (n - 1) % opts.length;
    },
    async step(id, fn) { return fn(); },
    equip(id) { if (!S.equip.includes(id)) S.equip.push(id); },
    item(id, n) { if (n == null) return S.items[id] | 0; S.items[id] = Math.max(0, (S.items[id] | 0) + n); return S.items[id]; },
    sync(n) { S.sync = n; return n; },
    stab(n) { S.stability = Math.max(0, Math.min(100, S.stability + n)); return S.stability; },
    setWorld(w) { S.world = w; S.baseWorld = w; return w; },
    unlock(id) { if (!KY.AREAS[id]) log.problems.push(`${cur}: 未定義の場所 ${id}`); if (!S.unlocked.includes(id)) S.unlocked.push(id); },
    lockArea() {}, scene() {}, fx: async () => {}, se() {}, amb() {}, mainUI: async () => {}, wait: async () => {},
    async deduce(def) {
      const ans = def.options.find(o => o.id === def.answer);
      if (!ans) { log.problems.push(`${cur}: 推理 ${def.id} の正解が選択肢にない`); return true; }
      for (const o of def.options) for (const id of (o.need || []).concat(o.refute || [])) if (!KY.EVIDENCE[id]) log.problems.push(`${cur}: 推理 ${def.id} の証拠 ${id} が未定義`);
      const missing = (ans.need || []).filter(id => !S.evidence.includes(id));
      if (missing.length) log.problems.push(`${cur}: 推理 ${def.id} の時点で未入手の証拠 ${missing.join(',')}`);
      if ((ans.need || []).length < (def.link || 2)) log.problems.push(`${cur}: 推理 ${def.id} の need が link より少ない`);
      for (const o of def.options) if (o.id !== def.answer && !(def.hint && def.hint[o.id])) log.problems.push(`${cur}: 推理 ${def.id} の誤答 ${o.id} に研究員のヒントがない`);
      log.deduce.push(def.id);
      return true;
    },
    async spot(def) { log.spots++; if (!SCENES.has(def.a) || !SCENES.has(def.b)) log.problems.push(`${cur}: 違和感探しの場面が不正`); for (const p of def.spots) if (!(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)) log.problems.push(`${cur}: 違和感の座標が範囲外`); return def.spots.length; },
    // バトル（kyokai/battle.js）：前口上・後口上の行も検査に通す
    async battle(id, o) { log.battles = (log.battles || 0) + 1; if (o && o.intro) await K.say(o.intro); if (o && o.outro) await K.say(o.outro); return { result: 'win' }; },
    async chase(def) {
      log.chases++;
      if (!Array.isArray(def.rounds) || !def.rounds.length) log.problems.push(`${cur}: chase ${def.id} に rounds がない`);
      for (const r of def.rounds || []) for (const a of [].concat(r.ok)) if (!CHASE_OK.has(a)) log.problems.push(`${cur}: chase ${def.id} の ok が不正 ${a}`);
      return true;
    },
    async explore(opts) {
      log.explores++;
      const goal = () => !!opts.goal(K);
      const areaIds = opts.areas || Object.keys(KY.AREAS);
      for (const id of areaIds) { if (!KY.AREAS[id]) log.problems.push(`${cur}: explore の場所 ${id} が未定義`); else if (!S.unlocked.includes(id)) S.unlocked.push(id); }
      for (let pass = 0; pass < 40 && (full && pass === 0 || !goal()); pass++) {
        for (const id of areaIds) {
          const a = KY.AREAS[id]; if (!a) continue;
          if (a.cond && !a.cond(K)) continue;
          const base = S.baseWorld;
          const ws = Object.keys(a.worlds).filter(w => w === base || S.sync >= 2);
          for (const w of ws) {
            S.world = w;
            const lookOnly = w !== base && S.sync < 3;
            const spots = (a.worlds[w].spots || []).filter(sp => !sp.cond || sp.cond(K));
            for (const sp of spots) {
              for (const act of sp.acts || ['look']) {
                if (lookOnly && act !== 'look' && act !== 'photo') continue;
                const h = sp.on && sp.on[act];
                if (!h) continue;
                if (sp.cond && !sp.cond(K)) break;
                log.actions++;
                await h(K, sp);
                if (sp.ev && sp.ev[act]) K.gain(sp.ev[act]);
                if (!(full && pass === 0) && goal()) { S.world = S.baseWorld; return true; }
              }
            }
          }
          S.world = S.baseWorld;
        }
      }
      if (!goal()) log.problems.push(`${cur}: explore の目的に届かない（${opts.hint}）`);
      return true;
    },
    setCur(c) { cur = c; },
  };
  return { K, S, log };
}

async function playAll(full) {
  const env = load();
  const { K, S, log } = makeK(env, full);
  for (const c of CH) { K.setCur(c); await env.reg[c](K); }
  // 任意調査：すべての町の場所を総当たりで解決する
  K.setCur('side');
  const sides = ['vending', 'dog', 'house', 'paper', 'twins', 'ema'];
  await K.explore({ goal: K => sides.every(id => K.has('side_' + id + '_done')), hint: '任意調査をすべて解決', areas: Object.keys(env.KY.AREAS).filter(id => !/old_lab|empty_town/.test(id)) });
  return { env, K, S, log };
}

const run = await playAll(false);
const { env, S, log } = run;
const full = await playAll(true);
const KY = env.KY;

console.log('境界事象 前半（プロローグ〜第六章・任意調査）');

await test('章ファイルとして ch00〜ch06 が登録される', () => {
  for (const c of CH) assert.equal(typeof env.reg[c], 'function', c + ' が未登録');
});

await test('通しプレイで問題が出ない（証拠・場面・演出・推理・探索）', () => {
  assert.deepEqual(log.problems, []);
});

await test('すべての章を最後まで流せた（ch0_done〜ch6_done）', () => {
  for (let i = 0; i <= 6; i++) assert.ok(S.flags['ch' + i + '_done'], 'ch' + i + '_done が立っていない');
});

await test('任意調査が6件すべて解決でき、side_solved が数えられる', () => {
  assert.equal(S.flags.side_solved, 6);
});

await test('ソース中の K.gain(\'…\') の id はすべて EVIDENCE にある', () => {
  for (const f of MY) {
    const src = read(f);
    for (const m of src.matchAll(/\.gain\('([a-z0-9_]+)'\)/g)) assert.ok(KY.EVIDENCE[m[1]], `${f}: ${m[1]}`);
    for (const m of src.matchAll(/(?:need|refute): \[([^\]]*)\]/g)) for (const id of m[1].match(/[a-z0-9_]+/g) || []) assert.ok(KY.EVIDENCE[id], `${f}: deduce の ${id}`);
  }
});

await test('寄り道を全部する通しプレイでも問題が出ず、前半の証拠がすべて手に入る', () => {
  assert.deepEqual(full.log.problems, []);
  const mine = Object.keys(KY.EVIDENCE).filter(id => /^(p_|c[0-6]_|sd_)/.test(id));
  assert.deepEqual(mine.filter(id => !full.S.evidence.includes(id)), []);
  assert.equal(full.S.flags.traces_found, 4);
  // 最短の通しプレイで取り逃してよいのは、寄り道の証拠だけ
  const optional = new Set(['p_tes_road', 'p_tes_house', 'p_tes_furniture', 'p_tes_child', 'c1_town_map', 'c1_shrine_record', 'c1_tes_matsui', 'c6_trace_book', 'c6_trace_mic', 'c6_trace_tools', 'c6_trace_drawing']);
  assert.deepEqual(mine.filter(id => !S.evidence.includes(id) && !optional.has(id)), []);
});

await test('推理の正解に必要な証拠は、同じ章かそれ以前の章で手に入る', () => {
  const order = CH.concat(['side']);
  for (const f of MY) {
    const src = read(f);
    const chOf = f.match(/(ch0\d|side)/)[1];
    for (const m of src.matchAll(/need: \[([^\]]*)\]\s*\}/g)) {
      // 正解の need だけでなく、全選択肢の need も「その章までに手に入るもの」であること
      for (const id of m[1].match(/[a-z0-9_]+/g) || []) {
        const at = log.gainAt[id];
        assert.ok(at, `${f}: ${id} が手に入らない`);
        assert.ok(order.indexOf(at) <= order.indexOf(chOf), `${f}: ${id} は ${at} で手に入る（推理は ${chOf}）`);
      }
    }
  }
});

await test('各章に推理が1つ以上、第二章と第六章に違和感探し・パズル、追跡が1つ以上ある', () => {
  for (const c of CH) assert.match(read(`kyokai/story/${c}.js`), /K\.deduce\(/, c + ' に推理がない');
  assert.match(read('kyokai/story/ch02.js'), /K\.spot\(/);
  assert.ok(log.spots >= 1);
  assert.ok(log.chases >= 2, '追跡が少ない');
  assert.ok(S.flags.basement_open, '三世界パズル（地下）が解けていない');
});

await test('場所の定義：場面 id は契約の一覧、座標は 0..1、行動は5種のどれか、同じ id の調べ物が重複しない', () => {
  for (const [id, a] of Object.entries(KY.AREAS)) {
    assert.ok(a.name && a.map && a.danger && a.worlds, id);
    for (const [w, W] of Object.entries(a.worlds)) {
      assert.ok(/^[ABC]$/.test(w), id + ' の世界 ' + w);
      assert.ok(SCENES.has(W.scene), `${id}/${w} の場面 ${W.scene}`);
      assert.ok(a.danger[w] >= 0 && a.danger[w] <= 5, `${id}/${w} の危険度`);
      const seen = new Set();
      for (const sp of W.spots) {
        assert.ok(!seen.has(sp.id), `${id}/${w} の調べ物 ${sp.id} が重複`); seen.add(sp.id);
        for (const k of ['x', 'y', 'w', 'h']) assert.ok(sp[k] >= 0 && sp[k] <= 1, `${id}/${w}/${sp.id}.${k}`);
        assert.ok(sp.x + sp.w <= 1.001 && sp.y + sp.h <= 1.001, `${id}/${w}/${sp.id} がはみ出す`);
        for (const act of sp.acts || []) assert.ok(ACTS.has(act), `${id}/${w}/${sp.id} の行動 ${act}`);
        for (const act of Object.keys(sp.on || {})) assert.ok((sp.acts || []).includes(act), `${id}/${w}/${sp.id}: on.${act} が acts にない`);
      }
    }
  }
});

await test('危険度：町はA=0〜1、駅は2〜3、山道・トンネルは2〜4、C世界は3以上', () => {
  for (const id of ['center_office', 'shotengai', 'residential', 'school', 'shrine', 'riverbank']) assert.ok(KY.AREAS[id].danger.A <= 1, id);
  assert.ok(KY.AREAS.station.danger.A >= 2 && KY.AREAS.station.danger.B <= 3);
  for (const id of ['mountain_road', 'tunnel']) { const d = KY.AREAS[id].danger; assert.ok(d.A >= 2 && d.C <= 4, id); }
  for (const [id, a] of Object.entries(KY.AREAS)) if (a.worlds.C && id !== 'center_office' && id !== 'center_server' && id !== 'center_lab') assert.ok(a.danger.C >= 3, id + ' のC');
});

await test('ch00.js 冒頭に書いたフラグは、どこかで立つ', () => {
  const head = read('kyokai/story/ch00.js').split('══ */')[0];
  const names = new Set();
  for (const m of head.matchAll(/^\s{5}([a-z][a-z0-9_ /|]*?)\s{2,}/gm)) for (const n of m[1].split(/[ /|]+/)) if (/^[a-z][a-z0-9_]+$/.test(n)) names.add(n);
  for (const m of head.matchAll(/(?:^|\s)([a-z]+_[a-z0-9_]+)(?=\s|\/|$)/gm)) names.add(m[1]);
  const dyn = n => n.includes('<') || /^(ch\d|side_|trace_\*)/.test(n);
  const all = MY.map(read).join('\n');
  const notSet = [...names].filter(n => !dyn(n) && !log.setFlags.has(n) && !new RegExp(`['"]${n}['"]|'${n.replace(/_[a-z]+$/, '_')}' \\+`).test(all));
  assert.deepEqual(notSet, []);
  for (const n of ['saw_ad_name', 'user444_log', 'nagi_met', 'paper_viewer1', 'shiro_met', 'glimpse_factory', 'glimpse_stream', 'nagi_stream', 'kujo_name', 'self_seen', 'basement_open']) assert.ok(S.flags[n], n);
  assert.ok((S.flags.traces_found | 0) >= 2 && (S.flags.traces_found | 0) <= 4);
});

await test('本編の手がかり：444（2:44:44・USER_444・後ろ・固定視聴者1）が手帳に「？」で残る', () => {
  for (const k of ['444/time_244444', '444/user444', '444/back', '444/viewer1']) {
    assert.ok(log.notes[k], k);
    assert.equal(log.notes[k].solved, false, k + ' は未解決のまま');
  }
  assert.match(read('kyokai/story/ch00.js'), /p:……444？/);
  assert.match(read('kyokai/story/ch00.js'), /p:偶然だと思います。/);
  assert.match(read('kyokai/story/ch02.js'), /配信を開始しました。/);
  assert.match(read('kyokai/story/ch02.js'), /後ろ。/);
  assert.match(read('kyokai/story/ch03.js'), /この人、見たことある/);
  assert.match(read('kyokai/story/ch03.js'), /テレビ。', 'g:でもテレビじゃない/);
  assert.match(read('kyokai/story/ch03.js'), /子供の声もする/);
  assert.match(read('kyokai/story/ch04.js'), /固定視聴者：1/);
  assert.match(read('kyokai/story/ch05.js'), /今日も生き延びたな/);
});

await test('装備と同期：境界測定端末・高感度録音機・異常波スキャナー、同期は Lv3 まで', () => {
  for (const e of ['phone', 'flashlight', 'magnet', 'boundary_meter', 'hq_recorder', 'wave_scanner']) assert.ok(S.equip.includes(e), e);
  assert.equal(S.sync, 3);
});

await test('主人公の性別を示す語を地の文・台詞に使っていない', () => {
  for (const f of MY) {
    const src = read(f);
    for (const m of src.matchAll(/'p:([^']*)'/g)) assert.doesNotMatch(m[1], /(俺|僕|あたし|わたし(?!たち)|ぼく|おれ)(?![a-zA-Z])/, `${f}: 主人公の一人称 ${m[1]}`);
    assert.doesNotMatch(src, /(彼女|彼)は、?(私|新人)/);
  }
});

console.log(`\n${pass} passed, ${fail} failed（通しプレイの行動 ${log.actions} 回・探索 ${log.explores} 回・推理 ${log.deduce.length} 件）`);
process.exit(fail ? 1 : 0);
