// 万象堂：手相の計算（banshodo/bansho-palm.js）の試験。手の形は座標で作る（右手・指が上・手のひらを見る向き）。
// ・3 点から手のひらの座標と左右の推定ができる（左手は鏡写し）。3 点がおかしければ断る
// ・なぞった線だけを鑑定し、なぞっていない線は「鑑定していません」と書く。「見当たらない」と決めた線だけ無いと読む
// ・線の長さ・形で読みが変わる。区切れは簡易な流年の年齢で出す。生命線の寿命の言い切りはしない
// ・左右の比べ・時期の比べ・しわの候補・総合鑑定への合流
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const B = require(join(ROOT, 'banshodo/bansho-core.js'));
const PM = require(join(ROOT, 'banshodo/bansho-palm.js'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

// 右手：小指の付け根 (0.3,0.35)・人差し指の付け根 (0.7,0.35)・手首 (0.5,0.9)。手のひらの座標 (u,v) → 写真の座標
const RLM = { wrist: [0.5, 0.9], index: [0.7, 0.35], pinky: [0.3, 0.35] };
const R = (u, v) => [0.3 + 0.4 * u, 0.9 - 0.55 * v];
const L = (u, v) => { const p = R(u, v); return [1 - p[0], p[1]]; };            // 左手＝鏡写し
const LLM = { wrist: [0.5, 0.9], index: [0.3, 0.35], pinky: [0.7, 0.35] };
const curve = (f, pts, a, b, k = 12) => Array.from({ length: k + 1 }, (_, i) => f(...pts(a + (b - a) * i / k)));
// 生命線：人差し指と親指の間 (1.02,0.8) から親指の付け根を回って手首 (0.95,0.02) へ。bulge が大きいほど中へ張り出す
const lifePts = (bulge) => (s) => [1.02 - bulge * Math.sin(Math.PI * s), 0.8 - 0.78 * s];
const hand = (f, lm, lines, side) => ({ side, dominant: 'R', w: 1000, h: 1000, landmarks: lm, lines });

t('3 点から手のひらの座標（手首＝(0.5,0)、指の付け根＝v 1）と左右の推定', () => {
  const F = PM.frame({ wrist: [500, 900], index: [700, 350], pinky: [300, 350] });
  assert.equal(F.guess, 'R');
  const w = F.toPalm([500, 900]), i = F.toPalm([700, 350]), p = F.toPalm([300, 350]);
  assert.ok(Math.abs(w[0] - 0.5) < 1e-9 && Math.abs(w[1]) < 1e-9);
  assert.ok(Math.abs(i[0] - 1) < 1e-9 && Math.abs(i[1] - 1) < 1e-9 && Math.abs(p[0]) < 1e-9);
  assert.equal(PM.frame({ wrist: [500, 900], index: [300, 350], pinky: [700, 350] }).guess, 'L');
  // 回した写真（指が右向き）でも同じ座標になる
  const G = PM.frame({ wrist: [100, 500], index: [650, 700], pinky: [650, 300] });
  const q = G.toPalm([650, 700]); assert.ok(Math.abs(q[0] - 1) < 1e-9 && Math.abs(q[1] - 1) < 1e-9);
  assert.equal(PM.frame({ wrist: [0, 0], index: [10, 10], pinky: [20, 20] }), null); // 一直線
});
t('なぞった線だけを鑑定する。なぞっていない線は書かず、「見当たらない」と決めた線だけ無いと読む', () => {
  const r = PM.analyze(hand(R, RLM, { life: { segs: [curve(R, lifePts(0.15), 0, 1)] }, fate: { absent: true } }, 'R'));
  assert.equal(r.ok, true);
  assert.ok(r.items.every(it => ['life', 'fate'].includes(it.line)));
  assert.ok(r.items.some(it => it.line === 'fate' && it.h.includes('見当たらない')));
  assert.ok(r.notes.some(s => s.includes('なぞっていない線') && s.includes('知能線') && !s.includes('運命線')));
  assert.ok(r.notes.some(s => s.includes('寿命を表すものではありません')));
  assert.equal(PM.analyze(hand(R, null, {}, 'R')).ok, false);
});
t('生命線：長さと張り出しで読みが変わる', () => {
  const big = PM.analyze(hand(R, RLM, { life: { segs: [curve(R, lifePts(0.4), 0, 1)] } }, 'R'));
  const small = PM.analyze(hand(R, RLM, { life: { segs: [curve(R, lifePts(0.05), 0, 0.5)] } }, 'R'));
  assert.ok(big.items.some(it => it.h.includes('張り出す')) && big.items.some(it => it.h.includes('長く')));
  assert.ok(small.items.some(it => it.h.includes('短め')) && small.items.some(it => it.h.includes('親指側に寄る')));
});
t('生命線の区切れは簡易な流年の年齢（0〜80 歳を長さで割り振る）で出す', () => {
  const a = curve(R, lifePts(0.2), 0, 0.5), b = curve(R, lifePts(0.2), 0.5, 1);
  const r = PM.analyze(hand(R, RLM, { life: { segs: [b, a] } }, 'R')); // 逆の順になぞっても直す
  assert.deepEqual(r.facts.lines.life.breaks, [40]);
});
t('知能線：下がる・まっすぐ、生命線から離れる・同じ起点', () => {
  const life = { segs: [curve(R, lifePts(0.2), 0, 1)] };
  const down = PM.analyze(hand(R, RLM, { life, head: { segs: [curve(R, s => [1.02 - 0.85 * s, 0.8 - 0.35 * s], 0, 1)] } }, 'R'));
  assert.ok(down.items.some(it => it.h.includes('手首の方へ下がる')) && down.items.some(it => it.h.includes('同じ所から')));
  const flat = PM.analyze(hand(R, RLM, { life, head: { segs: [curve(R, s => [0.85 - 0.7 * s, 0.68 - 0.02 * s], 0, 1)] } }, 'R'));
  assert.ok(flat.items.some(it => it.h.includes('まっすぐ')) && flat.items.some(it => it.h.includes('離れて')));
  assert.ok(flat.items.some(it => it.h.includes('小指側まで')));
});
t('感情線・運命線・太陽線・財運線・結婚線（本数）', () => {
  const r = PM.analyze(hand(R, RLM, {
    heart: { segs: [curve(R, s => [0.02 + 0.9 * s, 0.82 + 0.12 * s], 0, 1)] },
    fate: { segs: [curve(R, s => [0.5, 0.05 + 0.7 * s], 0, 1)] },
    sun: { segs: [curve(R, s => [0.35, 0.6 + 0.3 * s], 0, 1)] },
    money: { segs: [curve(R, s => [0.12, 0.55 + 0.25 * s], 0, 1)] },
    marriage: { segs: [curve(R, s => [-0.02 + 0.1 * s, 0.92], 0, 1, 3), curve(R, s => [-0.02 + 0.08 * s, 0.95], 0, 1, 3)] }
  }, 'R'));
  const h = r.items.map(it => it.h).join('|');
  for (const w of ['人差し指の下まで届く', '指の方へ上がる', '手首の近くから始まる', '長く伸びる', '太陽線：', '財運線：ある', '結婚線：2 本']) assert.ok(h.includes(w), w + ' が無い: ' + h);
  assert.ok(r.themes.every(th => B.texts.THEMES[th.tag] && th.src.startsWith('手相・')));
});
t('左手（鏡写し）でも、同じ形の線は同じ読みになる', () => {
  const lines = (f) => ({ life: { segs: [curve(f, lifePts(0.35), 0, 1)] }, head: { segs: [curve(f, s => [1.02 - 0.85 * s, 0.8 - 0.35 * s], 0, 1)] } });
  const r = PM.analyze(hand(R, RLM, lines(R), 'R')), l = PM.analyze(hand(L, LLM, lines(L), 'L'));
  assert.deepEqual(l.items.map(i => i.h), r.items.map(i => i.h));
  assert.equal(l.facts.guess, 'L'); assert.ok(l.title.includes('左手') && l.title.includes('生まれ持った'));
});
t('左右の比べと、時期の比べ', () => {
  const mk = (f, lm, side, b, hl) => PM.analyze(hand(f, lm, { life: { segs: [curve(f, lifePts(b), 0, hl)] } }, side));
  const cmp = PM.compareHands(mk(L, LLM, 'L', 0.05, 1), mk(R, RLM, 'R', 0.4, 1), 'R');
  assert.ok(cmp.some(c => c.h.includes('左右で違う') && c.t.includes('生まれ持った性質（左手）')));
  const time = PM.compareTime(mk(R, RLM, 'R', 0.2, 0.6), mk(R, RLM, 'R', 0.2, 1));
  assert.ok(time.some(c => c.h.includes('生命線：前より長く見える')));
});
t('しわの候補：明るい手のひらの暗い筋を拾い、平らな所は拾わない', () => {
  const w = 80, h = 60, g = new Uint8Array(w * h).fill(200);
  for (let x = 10; x < 70; x++) g[30 * w + x] = 120;           // 横の筋
  const m = PM.creaseMap(g, w, h);
  assert.ok(m[30 * w + 40] > 0); assert.equal(m[10 * w + 40], 0); assert.equal(m[50 * w + 5], 0);
  assert.ok(PM.creaseMap(new Uint8Array(w * h).fill(150), w, h).every(v => v === 0));
});
t('しわの候補は手のひらの中だけ。背景との境目（手の輪郭）は拾わない', () => {
  const w = 100, h = 120, g = new Uint8Array(w * h).fill(30);                  // 暗い背景
  for (let y = 40; y < 115; y++) for (let x = 25; x < 75; x++) g[y * w + x] = 200; // 明るい手のひら
  for (let x = 30; x < 70; x++) g[80 * w + x] = 130;                          // 手のひらの筋
  const mask = PM.palmMask(g, w, h, { wrist: [50, 112], index: [70, 42], pinky: [30, 42] });
  const m = PM.creaseMap(g, w, h); for (let i = 0; i < m.length; i++) if (!mask[i]) m[i] = 0;
  assert.ok(m[80 * w + 50] > 0, '筋');
  for (let y = 40; y < 115; y++) { assert.equal(m[y * w + 24], 0); assert.equal(m[y * w + 75], 0); } // 輪郭の外側・内側
});
t('総合鑑定に手相が合流する（出典つき）', () => {
  const r = B.run('palm', {}, { palm: hand(R, RLM, { life: { segs: [curve(R, lifePts(0.4), 0, 1)] }, head: { segs: [curve(R, s => [1.02 - 0.85 * s, 0.8 - 0.35 * s], 0, 1)] } }, 'R') });
  assert.equal(r.ok, true); assert.equal(r.group, 'palm');
  const p = { birth: { date: '1990-05-05' } };
  const s = B.integrate([r, B.run('numerology', p), B.run('shichu', p)]);
  assert.ok(s.methods.includes('手相'));
  for (const x of s.text) for (const src of x.src) assert.ok([r, B.run('numerology', p), B.run('shichu', p)].some(q => q.themes.some(th => th.src === src)));
  assert.equal(B.run('palm', {}, { palm: {} }).ok, false);
});
console.log(`banshodo-palm: ${n} 件 ok`);
