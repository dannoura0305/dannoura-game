/* ══════════════════════════════════════════════════════════════════════
   境界事象  歩いて回る月代町（kyokai/overworld.js・global KY_WORLD）
   読み込み順：engine.js → systems.js → battle.js → data/maps.js → overworld.js → …（kyokai.html）

   ■ やること
   ・探索（K.explore）の「地図」と「場所」の画面を、上から見た 16×16 マスの歩ける地図に置き換える。
     KY.UI.exMap / exArea / exClose だけを差し替えるので、探索ループ（systems.js）と章スクリプトはそのまま。
     町（フィールド）を歩いて建物・道の入口に入る ＝ 地図でその場所を選んだのと同じ。
     場所の中の調べ物（spot）は、地図の上の家具・人・小物になる。正面に立って A（Z/Enter）で行動メニュー
     （調べる／撮影／録音／スキャン／聞き込み）→ systems.js の _doAction がそのまま動く（証拠・フラグ・推理・追跡も同じ）。
   ・画面は 10×9 マス（ゲームボーイの 160×144）。4 色は観測層・場面ごと（KY_ART.gb.PAL）。
   ・操作：矢印/WASD 移動（Shift で走る）、Z/Enter/Space＝A（調べる・話す）、X＝B（メニュー）、Esc＝本体のメニュー。
     スマホは画面下の十字キーと A/B。地図をタップすると、そのマスまで歩く（物ならその前まで歩いて調べる）。
   ・調べる・撮影のあいだは、その場所の一枚絵を額縁つきで大写しにする（会話中・話しかけは地図のまま）。
     章が #scene で別の場面を出したときも同じ額縁で見せる。
   ・境界ノイズのマス（B/C で危険度>0）を踏むと KY_BATTLE.encounter → 戦闘（シロと出会う前・戦闘直後は出ない）。
   ・位置は場所ごとに S.ow.pos[場所] / S.ow.field に保存（kyokai_save_v1 に入る）。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY, MP = root.KY_MAPS;
  if (!KY || !KY._G || !MP) { if (root.console) console.error('[KY] overworld.js：engine.js / systems.js / data/maps.js が先に必要です'); return; }
  const G = KY._G, S = () => KY.state;
  const API = root.KY_WORLD = { maps: MP, active: () => !!(OW && OW.active) };
  let OW = null;
  if (!KY.HAS_DOM) return;

  const TS = 16, VW = 10, VH = 9, CW = TS * VW, CH = TS * VH;
  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DIRV = MP.DIRS;
  const OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
  const $ = (t, c, x) => KY._el(t, c, x);
  const FIELD_DANGER = { A: 0, B: 1, C: 3 };
  const CENTER = ['center_office', 'center_server', 'center_lab', 'center_basement'];
  const PERSON = new Set(['player', 'yuu', 'mido', 'nagi', 'kujo', 'saeki', 'shopkeeper', 'oldwoman', 'oldwoman2', 'youth', 'woman', 'woman2', 'janitor', 'priest',
    'fisher', 'fisher2', 'staff', 'staff2', 'passenger', 'child', 'oldman', 'researcher']);

  OW = {
    active: false, mode: null, mapId: null, world: 'A', m: null, p: { x: 0, y: 0, dir: 'd', mv: null, step: 0 }, objs: [], amb: [],
    done: null, busy: false, opts: null, list: null, pendingWarp: null, arriveFrom: null, lastArea: null, keys: [], pad: null, path: null, pathThen: null,
    turnUntil: 0, cool: 0, cut: false, acting: null, flick: null, trans: null, stat: null, statKey: '', raf: 0, last: 0, steps: 0, follower: null, near: '', bumpT: 0,
    logged: {},
  };
  API._ow = OW;

  /* ═════════════════════════ 色 ═════════════════════════ */
  function palKeyFor(mapId, world) {
    if (mapId === 'town') return KY.palOf('town_map', world);
    const a = KY.getArea && KY.getArea(mapId);
    const sc = a && a.worlds && a.worlds[world] && a.worlds[world].scene;
    return KY.palOf(sc || mapId, world);
  }
  function palColors(k) {
    try { const P = root.KY_ART && KY_ART.gb && KY_ART.gb.PAL; if (P && P[k]) return P[k]; } catch (e) {}
    return ({ A: ['#0f380f', '#306230', '#8bac0f', '#cadc9f'], B: ['#2a1a0c', '#6e4a26', '#c09058', '#f2e2bc'], C: ['#0c1219', '#384a5c', '#8a9cac', '#dfe7ec'],
      S: ['#1b0f2e', '#4e3478', '#a688d4', '#ece2fa'], X: ['#04201e', '#17605a', '#5fc4b4', '#e2fbf4'] })[k] || ['#0f380f', '#306230', '#8bac0f', '#cadc9f'];
  }

  /* ═════════════════════════ マスの絵（16×16・4 階調） ═════════════════════════ */
  const hash = MP.hash2;
  function circle(F, cx, cy, r, s) { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); F(cx - w, cy + dy, w * 2 + 1, 1, s); } }
  function ringC(F, cx, cy, r, s, fill) { circle(F, cx, cy, r, s); circle(F, cx, cy, r - 1, fill); }
  // 地面
  const GROUND = {
    '.': (F, h) => { F(0, 0, 16, 16, 3); F(0, 15, 16, 1, 2); F(15, 0, 1, 16, 2); if (h % 5 === 0) F(5 + h % 5, 6, 1, 1, 2); },
    ',': (F, h) => { F(0, 0, 16, 16, 3); const n = 2 + h % 2; for (let i = 0; i < n; i++) { const x = (h >> (i * 4)) % 12 + 1, y = (h >> (i * 4 + 2)) % 11 + 2; F(x, y, 1, 1, 2); F(x + 2, y, 1, 1, 2); F(x + 1, y + 1, 1, 1, 2); } if (h % 7 === 0) F((h >> 9) % 13 + 1, (h >> 11) % 13 + 1, 1, 1, 1); },
    ':': (F, h) => { F(0, 0, 16, 16, 3); F((h % 11) + 2, (h >> 4) % 11 + 2, 2, 1, 2); F((h >> 8) % 12 + 2, (h >> 12) % 12 + 2, 1, 1, 2); if (h % 3 === 0) F((h >> 6) % 12 + 2, (h >> 10) % 9 + 4, 1, 1, 1); },
    '-': (F, h, c) => { F(0, 0, 16, 16, 3); F(0, 7, 16, 1, 2); F(0, 15, 16, 1, 2); F(7, 0, 1, 7, 2); F(15, 8, 1, 7, 2); if (c.world === 'B' && h % 4 === 0) F(2, 2, 3, 3, 2); },
    '=': (F, h) => { F(0, 0, 16, 16, 2); for (let i = 0; i < 4; i++) F((h >> (i * 3)) % 15, (h >> (i * 3 + 5)) % 15, 1, 1, 1); },
    'U': (F, h) => { F(0, 0, 16, 16, 1); F((h % 13) + 1, (h >> 5) % 13 + 1, 1, 1, 0); F((h >> 3) % 13 + 1, (h >> 9) % 13 + 1, 2, 1, 0); },
  };
  function groundOf(ch, c) {
    if (GROUND[ch]) return ch;
    const g = c.m.ground || '.';
    return GROUND[g] ? g : '.';
  }
  function drawGround(F, ch, c) {
    let g = groundOf(ch, c);
    if (c.m.def && c.m.def.mixed) g = ['.', ',', ':', '-', '='][c.h % 5];
    GROUND[g](F, c.h, c);
    if (c.world === 'C' && c.h % 9 === 0) { F(3 + c.h % 6, 5 + (c.h >> 3) % 6, 5, 1, 1); F(7 + c.h % 6, 6 + (c.h >> 3) % 6, 1, 3, 1); }
  }
  function wallBg(F, c) {
    if (c.m.def && c.m.def.indoor) { F(0, 0, 16, 16, 1); F(0, 0, 16, 1, 2); F(0, 13, 16, 3, 0); }
    else drawExtWall(F, c, true);
  }
  function drawExtWall(F, c, plain) {
    F(0, 0, 16, 16, 3);
    if (c.world === 'B') { for (let x = 3; x < 16; x += 4) F(x, 0, 1, 15, 2); }
    else { for (let y = 3; y < 16; y += 4) F(0, y, 16, 1, 2); }
    F(0, 15, 16, 1, 0);
    if (!plain && c.tx % 2 === 1) { F(4, 3, 8, 7, 0); F(5, 4, 6, 5, c.world === 'B' ? 2 : 1); F(8, 4, 1, 5, 0); }
    if (c.world === 'C' && c.h % 4 === 0) { F(2 + c.h % 9, 2, 1, 6, 0); F(3 + c.h % 9, 7, 1, 4, 0); }
  }
  const T = {};
  T['#'] = (F, c) => {
    const below = c.at(0, 1);
    if (MP.walkable(below) && c.ty < c.m.h - 1) { F(0, 0, 16, 16, 1); F(0, 0, 16, 1, 2); F(0, 13, 16, 3, 0); if (c.world === 'C' && c.h % 3 === 0) { F(4 + c.h % 7, 2, 1, 6, 0); F(5 + c.h % 7, 8, 1, 4, 0); } }
    else { F(0, 0, 16, 16, 0); if (c.h % 3 === 0) F(c.h % 14 + 1, (c.h >> 4) % 14 + 1, 2, 1, 1); }
  };
  T.w = (F, c) => { wallBg(F, c); F(2, 2, 12, 9, 0); F(3, 3, 10, 7, c.world === 'B' ? 3 : 2); F(7, 3, 1, 7, 0); F(3, 6, 10, 1, 0); if (c.world === 'C') { F(4, 4, 3, 1, 0); F(10, 7, 2, 2, 0); } };
  T.j = (F, c) => { wallBg(F, c); const white = c.world === 'A' && (c.m.id === 'center_office' || c.m.id === 'bureau'); F(1, 2, 14, 10, 0); F(2, 3, 12, 8, white ? 3 : 1); F(3, 5, 6, 1, white ? 1 : 3); F(3, 7, 8, 1, white ? 1 : 3); if ((c.h & 1) && !white) F(10, 4, 2, 2, 3); F(1, 12, 14, 1, 2); };
  T.c = (F, c) => {
    wallBg(F, c);
    if (c.world === 'B') { F(5, 1, 6, 12, 0); circle(F, 8, 5, 2, 3); F(7, 8, 2, 4, 2); F(8, 4, 1, 2, 0); return; }
    ringC(F, 8, 6, 5, 0, 3); F(8, 3, 1, 4, 0); F(8, 6, 3, 1, 0);
    if (c.world === 'C') { F(5, 4, 1, 1, 0); F(10, 8, 2, 1, 0); }
  };
  T.I = (F, c) => { wallBg(F, c); F(1, 3, 6, 7, 0); F(2, 4, 4, 5, 3); F(3, 5, 2, 2, 1); F(9, 3, 6, 7, 0); F(10, 4, 4, 5, 3); F(11, 5, 2, 2, 1); };
  T.a = (F, c) => { wallBg(F, c); F(3, 2, 10, 11, 0); F(4, 3, 8, 9, 3); F(5, 5, 6, 1, 1); F(5, 8, 5, 1, 1); if (c.world === 'C' && c.h % 2) F(9, 10, 3, 2, 1); };
  T.M = (F, c) => {
    wallBg(F, c); const L = c.at(-1, 0) === 'M', R = c.at(1, 0) === 'M';
    F(L ? 0 : 1, 1, 16 - (L ? 0 : 1) - (R ? 0 : 1), 11, 0); F(L ? 0 : 2, 2, 16 - (L ? 0 : 2) - (R ? 0 : 2), 9, c.world === 'C' ? 0 : 1);
    if (c.world !== 'C') { F(3, 7 - (c.h % 3), 3, 1, 3); F(7, 5 + (c.h % 3), 4, 1, 2); F(12, 6, 2, 1, 3); }
  };
  T.e = (F, c) => { wallBg(F, c); F(2, 2, 12, 11, 0); F(3, 3, 10, 9, 2); F(5, 5, 2, 4, 0); F(9, 5, 2, 4, 0); F(5, 5, 2, 1, 3); };
  T.D = (F, c) => {
    const above = c.at(0, -1);
    if (!MP.walkable(above) || c.ty === 0) { if (c.m.def && c.m.def.indoor) { F(0, 0, 16, 16, 1); F(0, 13, 16, 3, 0); } else drawExtWall(F, c, true); F(2, 1, 12, 15, 0); F(2, 1, 12, 1, 2); if (c.world === 'B') F(4, 4, 8, 3, 1); }
    else { drawGround(F, '.', c); F(1, 4, 14, 9, 1); for (let y = 5; y < 12; y += 2) F(2, y, 12, 1, 2); }
  };
  T.o = (F, c) => { F(0, 0, 16, 16, 3); for (let i = 0; i < 4; i++) { F(0, i * 4, 16, 1, 1); F(0, i * 4 + 1, 16, 1, 2); } F(0, 0, 1, 16, 0); F(15, 0, 1, 16, 0); };
  T.B = (F, c) => { F(0, 0, 16, 16, 2); for (let y = 2; y < 16; y += 4) F(0, y, 16, 1, 1); F(0, 0, 1, 16, 0); F(15, 0, 1, 16, 0); };
  T.O = (F, c) => { F(0, 0, 16, 16, 3); F(0, 0, 16, 2, 0); for (let x = 0; x < 16; x += 4) F(x, 4, 2, 2, 2); F(0, 15, 16, 1, 2); };
  T.z = (F, c) => { drawGround(F, c.m.ground === 'U' ? 'U' : '=', c); for (let y = 1; y < 16; y += 5) F(1, y, 14, 2, 1); F(3, 0, 1, 16, 0); F(12, 0, 1, 16, 0); };
  T.n = (F, c) => drawGround(F, c.m.ground, c);
  T.Z = (F, c) => drawGround(F, c.m.ground, c);
  T.F = (F, c) => {
    drawGround(F, '.', c);
    if (c.m.id === 'bureau') { F(2, 0, 12, 16, 0); F(3, 1, 5, 14, 2); F(8, 1, 5, 14, 2); F(6, 7, 1, 2, 0); F(9, 7, 1, 2, 0); return; }
    if (c.world === 'B') { F(3, 6, 10, 9, 0); F(4, 7, 8, 7, 1); F(5, 9, 6, 3, 2); F(7, 0, 2, 6, 0); return; }
    F(4, 4, 8, 11, 0); F(5, 5, 6, 9, 3); F(5, 0, 6, 5, 0); F(6, 1, 4, 3, 2); F(6, 9, 2, 1, 1);
  };
  T.d = (F, c) => {
    drawGround(F, '.', c); const L = c.at(-1, 0) === 'd' || c.at(-1, 0) === 'm', R = c.at(1, 0) === 'd' || c.at(1, 0) === 'm';
    F(0, 2, 16, 13, 0); F(L ? 0 : 1, 3, 16 - (L ? 0 : 1) - (R ? 0 : 1), 7, 2); F(L ? 0 : 1, 10, 16 - (L ? 0 : 1) - (R ? 0 : 1), 4, 1);
    if (c.h % 3 === 0) F(3 + c.h % 6, 4, 4, 3, 3);
  };
  T.m = (F, c) => { T.d(F, c); F(4, 0, 8, 7, 0); F(5, 1, 6, 4, c.world === 'C' ? 0 : c.world === 'B' ? 2 : 3); F(7, 7, 2, 2, 0); if (c.world === 'B') F(6, 2, 3, 1, 1); };
  T.k = (F, c) => { drawGround(F, c.m.ground === ',' ? ',' : '.', c); F(1, 0, 14, 16, 0); F(2, 1, 12, 14, 1); F(2, 5, 12, 1, 0); F(2, 10, 12, 1, 0); for (let i = 0; i < 5; i++) { F(3 + i * 2, 1 + (i % 2), 1, 4 - (i % 2), (i + c.h) % 2 ? 3 : 2); F(3 + i * 2, 6 + ((i + 1) % 2), 1, 4 - ((i + 1) % 2), (i + c.h) % 3 ? 2 : 3); } };
  T.K = (F, c) => { drawGround(F, '.', c); F(1, 0, 14, 16, 0); F(2, 1, 12, 14, 1); for (let y = 3; y < 15; y += 3) F(3, y, 10, 1, 0); F(11, 2, 1, 1, 2); F(11, 8, 1, 1, 2); if (c.world === 'B') { ringC(F, 8, 7, 3, 0, 2); } };
  T.g = (F, c) => { drawGround(F, '.', c); ringC(F, 8, 8, 7, 0, 2); circle(F, 8, 8, 4, c.world === 'B' ? 3 : 1); circle(F, 8, 8, 2, c.world === 'C' ? 0 : 3); };
  T.p = (F, c) => { drawGround(F, c.m.ground, c); circle(F, 8, 6, 5, 0); circle(F, 8, 6, 4, 1); F(6, 4, 2, 2, 2); F(5, 10, 6, 5, 0); F(6, 11, 4, 3, 2); };
  T.b = (F, c) => { drawGround(F, c.m.ground, c); F(1, 3, 14, 3, 0); F(2, 4, 12, 1, 1); F(1, 7, 14, 4, 0); F(2, 8, 12, 2, 2); F(2, 11, 2, 4, 0); F(12, 11, 2, 4, 0); };
  T.s = (F, c) => { drawGround(F, c.m.ground, c); F(7, 9, 2, 7, 0); F(1, 2, 14, 8, 0); F(2, 3, 12, 6, 3); F(3, 5, 8, 1, 1); F(3, 7, 6, 1, 1); if (c.world === 'C') F(10, 3, 3, 2, 1); };
  T.v = (F, c) => {
    drawGround(F, c.m.ground, c);
    if (c.world === 'B') { F(4, 3, 8, 13, 0); F(5, 4, 6, 11, 1); F(5, 1, 6, 3, 0); F(6, 2, 4, 1, 1); F(6, 6, 4, 1, 0); return; }
    if (c.world === 'A' && c.m.id === 'residential') { F(2, 11, 12, 4, 0); F(3, 12, 10, 2, 2); return; }   // A は台の跡だけ
    F(2, 0, 12, 16, 0); F(3, 1, 10, 14, 3); F(4, 2, 8, 6, c.world === 'C' ? 0 : 1); F(4, 9, 8, 1, 2); F(5, 12, 6, 2, 0);
  };
  T.L = (F, c) => { drawGround(F, c.m.ground, c); F(7, 4, 2, 12, 0); if (c.world === 'B') { F(5, 0, 6, 5, 0); F(6, 1, 4, 3, 2); } else { F(3, 0, 10, 4, 0); F(4, 1, 8, 2, c.world === 'C' ? 1 : 3); } };
  T.P = (F, c) => { drawGround(F, c.m.ground, c); F(7, 0, 2, 16, 0); F(2, 2, 12, 2, 0); F(3, 1, 1, 1, 3); F(12, 1, 1, 1, 3); F(0, 6, 16, 1, 1); };
  T.E = (F, c) => { drawGround(F, c.m.ground, c); F(3, 3, 1, 13, 0); F(12, 3, 1, 13, 0); for (let y = 4; y < 16; y += 4) { F(4, y, 8, 1, 0); F(5 + (y % 8 ? 0 : 4), y + 1, 3, 1, 1); } F(5, 0, 6, 3, 0); F(6, 1, 4, 1, 3); };
  T.T = (F, c) => {
    drawGround(F, c.m.ground === 'U' ? ':' : (c.m.ground === '.' ? ',' : c.m.ground), c);
    if (c.world === 'C') { F(7, 4, 2, 12, 0); F(3, 5, 4, 1, 0); F(9, 3, 4, 1, 0); F(4, 2, 1, 3, 0); F(12, 1, 1, 3, 0); return; }
    F(7, 11, 2, 5, 0); circle(F, 8, 7, 7, 0); circle(F, 8, 7, 6, 1); F(4, 3, 2, 2, 2); F(9, 5, 2, 1, 2); F(6, 8, 1, 1, 2); F(11, 9, 1, 1, 0);
  };
  T.t = (F, c) => { drawGround(F, c.m.ground === 'U' ? ':' : c.m.ground, c); circle(F, 8, 9, 6, 0); circle(F, 8, 9, 5, 1); F(5, 6, 2, 1, 2); F(9, 9, 2, 1, 2); };
  T['~'] = (F, c) => { F(0, 0, 16, 16, 1); F((c.h % 8), 4, 5, 1, 2); F((c.h >> 3) % 8 + 6, 10, 4, 1, 2); };
  T.f = (F, c) => { drawGround(F, c.m.ground === '=' ? ',' : c.m.ground, c); F(0, 5, 16, 2, 0); F(0, 10, 16, 2, 0); F(1, 3, 2, 12, 0); F(13, 3, 2, 12, 0); F(1, 6, 14, 0, 0); };
  T.x = (F, c) => { drawGround(F, c.m.ground, c); F(2, 8, 7, 6, 0); F(3, 9, 5, 4, 1); F(8, 4, 6, 6, 0); F(9, 5, 4, 4, 2); F(5, 3, 3, 3, 0); F(6, 4, 1, 1, 2); };
  T.X = (F, c) => {
    F(0, 0, 16, 16, 2); const N = (dx, dy) => c.at(dx, dy) === 'X';
    if (!N(0, -1)) F(0, 0, 16, 1, 0); if (!N(0, 1)) F(0, 15, 16, 1, 0); if (!N(-1, 0)) F(0, 0, 1, 16, 0); if (!N(1, 0)) F(15, 0, 1, 16, 0);
    F(3 + c.h % 6, 3, 4, 1, 3); F(9, 9 + c.h % 3, 1, 4, 1); F(2, 11, 3, 1, 1); F(10 + c.h % 3, 5, 3, 1, 1);
  };
  T.h = (F, c) => { F(0, 0, 16, 16, c.world === 'B' ? 0 : 1); for (let y = 3; y < 16; y += 4) { F(0, y, 16, 1, c.world === 'B' ? 1 : 0); F(((y >> 2) % 2) * 8 + 3, y - 3, 1, 3, c.world === 'B' ? 1 : 0); } if (c.at(0, 1) !== 'h') F(0, 13, 16, 3, 0); if (c.world === 'C' && c.h % 5 === 0) F(4, 4, 6, 4, 2); };
  T.W = (F, c) => drawExtWall(F, c, false);
  T.H = (F, c) => { drawExtWall(F, c, true); F(4, 3, 8, 13, 0); F(5, 4, 6, 12, c.world === 'B' ? 2 : 1); F(9, 10, 1, 1, 3); };
  T.S = (F, c) => {
    drawExtWall(F, c, true);
    for (let x = 0; x < 16; x += 4) F(x, 0, 2, 4, 0), F(x + 2, 0, 2, 4, 2);
    if ((c.tx + c.h) % 3 === 0 && c.world !== 'C') { F(1, 5, 14, 10, 0); F(2, 6, 12, 8, 1); F(4, 8, 3, 3, 3); F(9, 9, 3, 2, 2); }
    else { F(1, 5, 14, 11, 0); F(2, 6, 12, 9, 2); for (let y = 7; y < 15; y += 2) F(2, y, 12, 1, 1); if (c.world === 'C') { F(4, 9, 4, 4, 0); F(10, 6, 2, 3, 0); } }
  };
  T.Y = (F, c) => { drawGround(F, c.m.ground, c); const s = c.world === 'B' ? 1 : 0; F(6, 2, 4, 14, s); F(0, 0, 16, 3, 0); F(0, 5, 16, 2, s); };
  T.Q = (F, c) => {
    F(0, 0, 16, 16, 0); for (let y = 2; y < 16; y += 4) F(0, y, 16, 1, 1);
    if (MP.walkable(c.at(0, 1))) { F(0, 6, 16, 10, 2); F(0, 6, 16, 1, 0); F(1, 7, 2, 9, 0); F(13, 7, 2, 9, 0); if (c.tx % 2) F(5, 9, 6, 7, 0); F(0, 15, 16, 1, 1); }
  };
  T.q = (F, c) => { drawGround(F, c.m.ground, c); F(5, 11, 6, 4, 1); F(4, 4, 8, 7, 0); F(5, 5, 6, 5, 2); F(6, 6, 4, 2, c.world === 'B' ? 3 : 0); F(3, 2, 10, 2, 0); F(7, 0, 2, 2, 0); };
  T.G = (F, c) => { drawGround(F, c.m.ground, c); F(3, 11, 10, 4, 0); F(4, 12, 8, 2, 1); F(5, 4, 6, 7, 0); F(6, 5, 4, 5, 2); F(6, 1, 4, 4, 0); F(7, 2, 2, 2, 2); if (c.world === 'B' && c.m.id === 'shrine') { F(5, 0, 1, 2, 0); F(10, 0, 1, 2, 0); F(6, 7, 4, 2, 1); } };
  T.C = (F, c) => { drawGround(F, c.m.ground, c); F(2, 4, 12, 11, 0); F(3, 5, 10, 9, 2); F(3, 9, 10, 1, 1); F(7, 5, 1, 9, 1); };
  T.R = (F, c) => {
    F(0, 0, 16, 16, 2); F((c.h % 13) + 1, (c.h >> 4) % 13 + 1, 1, 1, 1);
    const horiz = c.at(-1, 0) === 'R' || c.at(1, 0) === 'R' || c.at(-1, 0) === '[' || c.at(1, 0) === '[';
    if (horiz) { for (let x = 1; x < 16; x += 5) F(x, 2, 2, 12, 1); F(0, 4, 16, 1, 0); F(0, 11, 16, 1, 0); }
    else { for (let y = 1; y < 16; y += 5) F(2, y, 12, 2, 1); F(4, 0, 1, 16, 0); F(11, 0, 1, 16, 0); }
  };
  T['['] = (F, c) => { T.R(F, c); const L = c.at(-1, 0) === '[', R = c.at(1, 0) === '['; F(0, 1, 16, 13, 0); F(L ? 0 : 1, 2, 16 - (L ? 0 : 1) - (R ? 0 : 1), 11, 3); F(2, 4, 5, 4, 1); F(9, 4, 5, 4, 1); F(0, 10, 16, 2, 2); if (!R) F(15, 1, 1, 13, 0); };
  T.V = (F, c) => { F(0, 0, 16, 16, 0); if (c.h % 11 === 0) F(c.h % 14 + 1, (c.h >> 5) % 14 + 1, 1, 1, 1); };
  T.J = (F, c) => {
    if (c.m.id === 'collapse') { drawGround(F, c.m.ground, c); F(2, 0, 12, 16, 0); F(3, 1, 10, 15, 3); F(7, 1, 2, 15, 2); return; }
    wallBg(F, c); F(1, 0, 14, 16, 0);
    if (KY.has('basement_open')) { F(2, 1, 12, 15, 0); F(2, 1, 1, 15, 1); return; }
    F(2, 1, 12, 15, 1); F(2, 4, 12, 1, 2); F(2, 9, 12, 1, 2); F(11, 7, 2, 2, 3);
  };
  T.i = (F, c) => { drawGround(F, c.m.ground, c); F(4, 0, 8, 16, 0); F(5, 0, 6, 16, 2); F(5, 3, 6, 1, 1); if (c.world === 'B') { F(6, 5, 4, 6, 3); F(6, 6, 4, 1, 1); } };
  T.u = (F, c) => { drawGround(F, c.m.ground, c); F(7, 6, 2, 10, 0); ringC(F, 8, 4, 4, 0, 3); F(6, 4, 4, 1, 1); };
  T.l = (F, c) => { drawGround(F, c.m.ground, c); F(7, 8, 2, 8, 0); ringC(F, 8, 5, 5, 0, 3); F(8, 2, 1, 3, 0); F(8, 5, 2, 1, 0); };
  T.y = (F, c) => { drawGround(F, c.m.ground, c); for (let i = 0; i < 7; i++) { F(8 - i, 2 + i, i * 2 + 1, 1, 0); } for (let i = 0; i < 6; i++) F(8 - i, 9 + i, (6 - i) * 2 - 1 > 0 ? (6 - i) * 2 - 1 : 1, 1, 0); for (let i = 1; i < 6; i++) F(9 - i, 3 + i, i * 2 - 1, 1, i % 2 ? 2 : 3); };

  function renderStatic(m, world, palK) {
    const cv = document.createElement('canvas'); cv.width = m.w * TS; cv.height = m.h * TS;
    const ctx = cv.getContext('2d'), col = palColors(palK);
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      const ch = m.g[ty][tx], ox = tx * TS, oy = ty * TS;
      const F = (x, y, w, h, s) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = col[s]; ctx.fillRect(ox + x, oy + y, w, h); };
      const c = { m, world, tx, ty, h: hash(tx, ty, 3), at: (dx, dy) => MP.at(m, tx + dx, ty + dy) };
      try { if (T[ch]) T[ch](F, c); else drawGround(F, ch, c); } catch (e) { F(0, 0, 16, 16, 2); }
    }
    return cv;
  }

  /* ═════════════════════════ 人物・生き物・小物の絵 ═════════════════════════ */
  const P_DOWN = ['................', '....00000000....', '...0hhhhhhhh0...', '..0hhhhhhhhhh0..', '..0hhhhhhhhhh0..', '..0hssssssssh0..', '..0hs0ssss0sh0..', '...0ssssssss0...',
    '....0cc33cc0....', '...0ccc33xcc0...', '..0sccccccccs0..', '...0cccccccc0...', '...0cccccccc0...', '....0cc00cc0....', '....0ll00ll0....', '....000..000....'];
  const P_UP = ['................', '....00000000....', '...0hhhhhhhh0...', '..0hhhhhhhhhh0..', '..0hhhhhhhhhh0..', '..0hhhhhhhhhh0..', '..0hhhhhhhhhh0..', '...0hhhhhhhh0...',
    '....0cccccc0....', '...0cccccccc0...', '..0sccccccccs0..', '...0cccccccc0...', '...0cccccccc0...', '....0cc00cc0....', '....0ll00ll0....', '....000..000....'];
  const P_LEFT = ['................', '.....0000000....', '....0hhhhhhh0...', '...0hhhhhhhhh0..', '...0hhhhhhhhh0..', '...0sshhhhhhh0..', '...0s0shhhhhh0..', '....0sssshhh0...',
    '.....0cccc0.....', '....0ccccccc0...', '....0csccccc0...', '....0ccccccc0...', '....0ccccccc0...', '.....0cc0cc0....', '.....0ll0ll0....', '.....000.000....'];
  const STEP_V = { 14: '....0ll0.000....', 15: '....000.........' };
  const STEP_L = { 13: '....0cc0..0cc0..', 14: '....0ll0..0ll0..', 15: '....000...000...' };
  const HAIR = {
    long: { d: { 6: '.0hhs0ssss0shh0.', 7: '.0h0ssssssss0h0.', 8: '.0h00cc33cc00h0.', 9: '.0h0ccc33xcc0h0.' }, u: { 8: '....0hhhhhh0....', 9: '...0hhhhhhhh0...' }, l: { 8: '.....0cchh0.....', 9: '....0ccccchh0...' } },
    cap: { d: { 2: '...0kkkkkkkk0...', 3: '..0kkkkkkkkkk0..', 4: '.00000000000000.' }, u: { 2: '...0kkkkkkkk0...', 3: '..0kkkkkkkkkk0..', 4: '..0kkkkkkkkkk0..' }, l: { 2: '....0kkkkkkk0...', 3: '...0kkkkkkkkk0..', 4: '.000000000000...' } },
    bald: { d: { 2: '...0ssssssss0...', 3: '..0ssssssssss0..', 4: '..0hssssssssh0..' }, u: { 2: '...0ssssssss0...', 3: '..0ssssssssss0..', 4: '..0ssssssssss0..' }, l: { 2: '....0sssssss0...', 3: '...0ssssssssh0..', 4: '...0sssssshhh0..' } },
    bun: { d: { 0: '......0hh0......' }, u: { 0: '......0hh0......' }, l: { 0: '........0hh0....' } },
  };
  const PEOPLE = {
    player: { h: 1, c: 3, l: 1, x: 1 },
    yuu: { h: 0, c: 1, l: 0, x: 1 }, mido: { h: 2, c: 1, l: 1, x: 3 }, nagi: { hair: 'long', h: 0, c: 3, l: 3, x: 2 }, kujo: { h: 0, c: 0, l: 0, x: 1 },
    saeki: { hair: 'bun', h: 1, c: 2, l: 1, x: 2 }, shopkeeper: { hair: 'cap', h: 0, k: 3, c: 2, l: 1, x: 1 }, oldwoman: { hair: 'bun', h: 2, c: 1, l: 1, x: 2 },
    oldwoman2: { hair: 'bun', h: 3, c: 2, l: 1, x: 1 }, youth: { hair: 'cap', h: 0, k: 0, c: 0, l: 1, x: 3 }, woman: { hair: 'long', h: 1, c: 2, l: 1, x: 2 },
    woman2: { hair: 'long', h: 0, c: 1, l: 2, x: 3 }, janitor: { hair: 'cap', h: 1, k: 1, c: 2, l: 1, x: 1 }, priest: { h: 0, c: 3, l: 1, x: 1 },
    fisher: { hair: 'cap', h: 2, k: 2, c: 1, l: 1, x: 2 }, fisher2: { hair: 'cap', h: 0, k: 1, c: 2, l: 0, x: 3 }, staff: { hair: 'cap', h: 0, k: 0, c: 1, l: 1, x: 3 },
    staff2: { hair: 'cap', h: 0, k: 0, c: 1, l: 0, x: 2 }, passenger: { h: 1, c: 1, l: 0, x: 2 }, child: { hair: 'cap', h: 0, k: 2, c: 3, l: 1, x: 1 },
    oldman: { hair: 'bald', h: 2, c: 2, l: 1, x: 1 }, researcher: { h: 1, c: 3, l: 1, x: 2 },
  };
  const CREATURES = {
    shiro: ['................', '................', '................', '....0......0....', '...030....030...', '...0330000330...', '..033333333330..', '..033033330330..',
      '..033333333330..', '..033332233330..', '...0333333330...', '...0333333330...', '....03300330....', '.....00..00.....', '................', '................'],
    dog: ['................', '................', '................', '................', '................', '..00............', '.0110.......0...', '.01110000000110.',
      '.01011111111110.', '.01111111111110.', '..000111111110..', '....0111111110..', '....010...010...', '....00....00....', '................', '................'],
    dog2: ['................', '................', '................', '................', '................', '..00............', '.0330.......0...', '.03330000000330.',
      '.03031133113330.', '.03333311333330.', '..000333333330..', '....0331133330..', '....030...030...', '....00....00....', '................', '................'],
    cat: ['................', '................', '................', '................', '................', '.....0...0......', '.....00000......', '....0303030.....',
      '....0000000.....', '.....00000......', '....0000000.....', '....00000000....', '....00000000.0..', '.....0000000.0..', '......0..0.00...', '................'],
    paper: ['................', '................', '................', '................', '................', '................', '................', '................',
      '..000000000.....', '..033333330.....', '..031111300000..', '..033333303330..', '..031113303130..', '..000000003330..', '.........00000..', '................'],
    mark: ['................', '................', '................', '................', '................', '................', '.......0........', '......030.......',
      '.....03330......', '....0333330.....', '.....03330......', '......030.......', '.......0........', '.....1.....1....', '...1...1.1...1..', '................'],
    phone: ['................', '................', '...0000000000...', '...0222222220...', '...0200000020...', '...0222222220...', '...0000000000...', '....02222220....',
      '....02100120....', '....02222220....', '....02222220....', '.....000000.....', '.......00.......', '.......00.......', '.....000000.....', '................'],
    q: ['................', '.000000000000...', '.033333333330...', '.033300003330...', '.033033330330...', '.033333303330...', '.033333033330...', '.033330333330...',
      '.033330333330...', '.033333333330...', '.033330333330...', '.033333333330...', '.000000000000...', '......00........', '......00........', '................'],
  };
  const SPR = new Map();
  function personRows(id, dir, frame) {
    const P = PEOPLE[id] || PEOPLE.passenger;
    const base = dir === 'u' ? P_UP : dir === 'd' ? P_DOWN : P_LEFT;
    const rows = base.slice();
    const hv = P.hair && HAIR[P.hair] && HAIR[P.hair][dir === 'r' ? 'l' : dir];
    if (hv) Object.keys(hv).forEach(k => { rows[+k] = hv[k]; });
    if (frame) { const st = (dir === 'u' || dir === 'd') ? STEP_V : STEP_L; Object.keys(st).forEach(k => { rows[+k] = st[k]; }); }
    return rows;
  }
  function spriteCanvas(id, dir, frame, palK) {
    const key = id + '|' + dir + '|' + frame + '|' + palK;
    if (SPR.has(key)) return SPR.get(key);
    const col = palColors(palK);
    let rows, flip = false;
    if (CREATURES[id]) { rows = CREATURES[id]; flip = dir === 'r' && id !== 'q' && id !== 'paper' && id !== 'phone' && id !== 'mark'; }
    else {
      const P = PEOPLE[id] || PEOPLE.passenger;
      rows = personRows(id, dir, frame === 2 ? 1 : frame);
      flip = dir === 'r' || ((dir === 'u' || dir === 'd') && frame === 2);
      const map = { h: P.h, s: 3, c: P.c, l: P.l, x: P.x, k: P.k == null ? P.h : P.k, '0': 0, '1': 1, '2': 2, '3': 3 };
      rows = rows.map(r => r.replace(/[hsclxk]/g, ch => String(map[ch])));
    }
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
    const ctx = cv.getContext('2d');
    rows.forEach((r, y) => { const s = String(r).padEnd(16, '.').slice(0, 16); for (let x = 0; x < 16; x++) { const ch = s[flip ? 15 - x : x]; if (ch >= '0' && ch <= '3') { ctx.fillStyle = col[+ch]; ctx.fillRect(x, y, 1, 1); } } });
    SPR.set(key, cv);
    if (SPR.size > 900) SPR.clear();
    return cv;
  }
  API.SPRITES = Object.keys(PEOPLE).concat(Object.keys(CREATURES));
  API._sprite = spriteCanvas;
  API._renderMap = (id, world, palK) => renderStatic(MP.compile(id, world), world, palK || palKeyFor(id, world));

  /* ═════════════════════════ DOM ═════════════════════════ */
  const D = KY._D, OWD = {};
  function ensureDom() {
    if (OWD.cv || !D.stageWrap) return !!OWD.cv;
    const cv = OWD.cv = $('canvas', 'ow-cv'); cv.width = CW; cv.height = CH; cv.setAttribute('aria-label', '月代町の地図（タップでそのマスまで歩く）');
    D.stageWrap.insertBefore(cv, D.stageWrap.firstChild);
    OWD.ctx = cv.getContext('2d'); OWD.ctx.imageSmoothingEnabled = false;
    OWD.frame = $('div', 'ow-cutframe'); OWD.hl = $('div', 'ow-hl'); OWD.frame.appendChild(OWD.hl);
    OWD.name = $('div', 'ow-name');
    D.stageWrap.appendChild(OWD.frame); D.stageWrap.appendChild(OWD.name);
    cv.addEventListener('pointerdown', onTap);
    document.addEventListener('keyup', e => { const k = keyDir(e.key); if (k) OW.keys = OW.keys.filter(x => x !== k); if (e.key === 'Shift') OW.run = false; });
    root.addEventListener('blur', () => { OW.keys = []; OW.pad = null; OW.run = false; });
    return true;
  }
  function setLayout(on) {
    if (!D.app) return;
    D.app.classList.toggle('ow-on', !!on);
    D.stageWrap.classList.toggle('ow', !!on);
    if (!on) { D.stageWrap.classList.remove('cut'); OWD.hl && (OWD.hl.hidden = true); }
    try { root.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  /* ═════════════════════════ 地図の用意 ═════════════════════════ */
  function sceneOf(id, w) { if (id === 'town') return 'town_map'; const a = KY.getArea(id); return (a && a.worlds[w] && a.worlds[w].scene) || id; }
  function dangerHere() { return OW.mapId === 'town' ? (FIELD_DANGER[OW.world] || 0) : KY.dangerOf(OW.mapId, OW.world); }
  function noiseOn() { return (OW.world === 'B' || OW.world === 'C') && dangerHere() > 0; }
  function so() { const s = S(); if (!s.ow || typeof s.ow !== 'object') s.ow = {}; if (!s.ow.pos || typeof s.ow.pos !== 'object') s.ow.pos = {}; return s.ow; }
  function freeTile(x, y) {
    const m = OW.m; if (!m || MP.solidAt(m, x, y)) return false;
    if (OW.objs.some(o => o.sprite && o.x === x && o.y === y)) return false;
    if (OW.amb.some(a => a.x === x && a.y === y)) return false;
    return true;
  }
  function nudge(x, y) {
    if (freeTile(x, y) && !MP.warpAt(OW.m, x, y)) return [x, y];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      if (freeTile(x + dx, y + dy) && !MP.warpAt(OW.m, x + dx, y + dy)) return [x + dx, y + dy];
    }
    return [x, y];
  }
  function setMap(id, world, pos) {
    const changedWorld = OW.mapId === id && OW.world !== world;
    const prevStat = OW.stat;
    OW.mapId = id; OW.world = world; OW.m = MP.compile(id, world);
    if (id === 'town') OW.m = withExtraEntrances(OW.m);
    OW.palK = palKeyFor(id, world);
    OW.statKey = '';
    buildStatic();
    if (changedWorld && prevStat && !KY.reduced()) OW.flick = { prev: prevStat, t0: now(), until: now() + 360 };
    if (pos) { OW.p.x = pos[0]; OW.p.y = pos[1]; if (pos[2]) OW.p.dir = pos[2]; }
    OW.p.mv = null; OW.path = null; OW.pathThen = null;
    buildAmbient();
    OW.follower = null;
  }
  // 町に入口の無い場所（後から足した場所など）は、広場の「？」の立て札から入れるようにする
  const EXTRA_SLOTS = [[24, 27], [22, 27], [26, 27], [23, 28], [25, 28], [27, 26], [21, 31]];
  function withExtraEntrances(m) {
    const known = new Set(Object.keys(MP.ENTRANCES).map(k => MP.ENTRANCE_ALIAS[k] || k));
    const extra = (OW.list || []).filter(id => !known.has(id) && !/^center_/.test(id));
    if (!extra.length) return m;
    const warps = m.warps.slice();
    extra.forEach((id, i) => { const sl = EXTRA_SLOTS[i % EXTRA_SLOTS.length]; if (!MP.solidAt(m, sl[0], sl[1])) warps.push({ x: sl[0], y: sl[1], to: id, extra: true }); });
    return Object.assign({}, m, { warps });
  }
  function buildStatic() {
    const key = OW.mapId + '/' + OW.world + '/' + OW.palK + '/' + (KY.has('basement_open') ? 1 : 0);
    if (key === OW.statKey && OW.stat) return;
    OW.statKey = key; OW.stat = renderStatic(OW.m, OW.world, OW.palK);
  }
  function buildAmbient() {
    const L = (MP.AMBIENT[OW.mapId] && MP.AMBIENT[OW.mapId][OW.world]) || [];
    OW.amb = L.map(([x, y, sprite, text]) => ({ x, y, hx: x, hy: y, sprite, dir: 'd', text, mv: null, next: now() + 1500 + Math.random() * 3000 }));
  }
  // 調べ物 → 地図の上の物（同じマスの調べ物はまとめる）
  function buildObjects() {
    const id = OW.mapId, w = OW.world, m = OW.m, s = S();
    const spots = KY.spotsOf(id, w);
    const byTile = new Map(), out = [];
    const seenOf = sp => Object.keys(s.seen).some(k => k.indexOf(id + '/' + w + '/' + sp.id + '/') === 0);
    const reach = MP.bfs(m, m.spawn[0], m.spawn[1], null);
    for (const sp of spots) {
      const e = MP.spotEntry(id, sp.id);
      let x, y, sprite = null, dir = 'd', unmapped = false;
      if (e !== undefined) {
        const p = MP.parseSpot(e); const at = p.at || m.anchors[p.anchor];
        if (at) { x = at[0]; y = at[1]; sprite = p.sprite; dir = p.dir; }
      }
      if (x == null) {
        unmapped = true;
        const key = id + '/' + sp.id;
        if (!OW.logged[key]) { OW.logged[key] = 1; console.info('[KY_WORLD] 地図に置き場所のない調べ物（「？」で置く）：', id, sp.id, sp.label || ''); }
        const pr = (m.def && m.def.proj) || [1, 1, m.w - 2, m.h - 2];
        const cx = (sp.x || 0) + (sp.w || 0) / 2, cy = (sp.y || 0) + (sp.h || 0) / 2;
        let tx = Math.round(pr[0] + cx * (pr[2] - pr[0])), ty = Math.round(pr[1] + cy * (pr[3] - pr[1]));
        let best = null, bd = 1e9;
        for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) {
          if (!reach.has(xx + ',' + yy) || MP.warpAt(m, xx, yy) || byTile.has(xx + ',' + yy)) continue;
          if (xx === OW.p.x && yy === OW.p.y) continue;
          const d = Math.abs(xx - tx) + Math.abs(yy - ty); if (d < bd) { bd = d; best = [xx, yy]; }
        }
        if (!best) continue;
        [x, y] = best; sprite = 'q';
      }
      if (!sprite && MP.walkable(MP.at(m, x, y))) sprite = 'mark';
      const k = x + ',' + y;
      let o = byTile.get(k);
      if (!o) { o = { x, y, sprite, dir, spots: [], unmapped, seen: true, live: false }; byTile.set(k, o); out.push(o); }
      else if (sprite && (!o.sprite || o.sprite === 'mark' || o.sprite === 'q') && PERSON.has(sprite)) { o.sprite = sprite; o.dir = dir; }
      o.spots.push(sp);
      if (!seenOf(sp)) o.seen = false;
      if (sp.on) o.live = true;
    }
    // 位置が同じ人物は前の向きを保つ
    out.forEach(o => { const old = OW.objs.find(p => p.x === o.x && p.y === o.y && p.sprite === o.sprite); if (old) o.dir = old.dir; o.person = PERSON.has(o.sprite); });
    OW.objs = out;
    // シロがその場にいるときは、ついて来るシロは出さない
    OW.shiroHere = out.some(o => o.sprite === 'shiro');
  }
  function objAt(x, y) { return OW.objs.find(o => o.x === x && o.y === y) || null; }
  function ambAt(x, y) { return OW.amb.find(a => a.x === x && a.y === y) || null; }

  /* ═════════════════════════ 探索の画面（systems.js の UI を差し替え） ═════════════════════════ */
  const ORIG = { exMap: KY.UI.exMap, exArea: KY.UI.exArea, exClose: KY.UI.exClose };
  function activate() {
    if (!ensureDom()) return false;
    if (!OW.active) { OW.active = true; setLayout(true); OW.last = 0; if (!OW.raf) OW.raf = requestAnimationFrame(frame); try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {} }
    return true;
  }
  function deactivate() {
    OW.active = false; OW.done = null; OW.busy = false; OW.cut = false; OW.acting = null; OW.path = null; OW.pathThen = null; OW.trans = null; OW.keys = []; OW.pad = null;
    setLayout(false);
    if (OWD.name) OWD.name.classList.remove('on');
  }
  function showName(text) {
    if (!OWD.name) return;
    OWD.name.textContent = text; OWD.name.classList.remove('on'); void OWD.name.offsetWidth; OWD.name.classList.add('on');
    clearTimeout(OWD.nameT); OWD.nameT = setTimeout(() => OWD.name.classList.remove('on'), 1800);
  }
  function cutOff() {
    OW.cut = false; if (D.stageWrap) D.stageWrap.classList.remove('cut'); if (OWD.hl) OWD.hl.hidden = true;
  }
  function cutOn(rect) {
    OW.cut = true; D.stageWrap.classList.add('cut');
    if (rect && OWD.hl) { const pad = 0.015; OWD.hl.hidden = false; OWD.hl.style.left = clamp(rect.x - pad, 0, 1) * 100 + '%'; OWD.hl.style.top = clamp(rect.y - pad, 0, 1) * 100 + '%'; OWD.hl.style.width = clamp(rect.w + pad * 2, 0.03, 1) * 100 + '%'; OWD.hl.style.height = clamp(rect.h + pad * 2, 0.03, 1) * 100 + '%'; }
    else if (OWD.hl) OWD.hl.hidden = true;
  }
  function availList() { return OW.mode === 'field' ? (OW.list || []) : KY.exploreAreas(OW.opts || {}); }
  function exMap(opts, list) {
    if (!ensureDom()) return ORIG.exMap(opts, list);
    return KY._pend(done => {
      OW.opts = opts; OW.list = list; OW.mode = 'field';
      cutOff();
      if (OW.pendingWarp && list.indexOf(OW.pendingWarp) >= 0) { const id = OW.pendingWarp; OW.pendingWarp = null; done(id); return; }
      OW.pendingWarp = null;
      const s = S(), w = s.baseWorld || 'A';
      KY._hudExtra.loc = '月代町'; KY._hud();
      KY.stageOpts({}); KY.scene('town_map', w); KY._ambLayer([]);
      let pos = null;
      const m = MP.compile('town', w);
      if (OW.lastArea) {
        const ek = Object.keys(MP.ENTRANCES).find(k => (MP.ENTRANCE_ALIAS[k] || k) === OW.lastArea) || (/^center_/.test(OW.lastArea) ? '@center' : null);
        if (ek) { const [ex, ey] = MP.ENTRANCES[ek]; pos = MP.entryFor(m, { x: ex, y: ey }); }
      }
      const sv = so().field;
      if (!pos && Array.isArray(sv) && !MP.solidAt(m, sv[0], sv[1]) && !MP.warpAt(m, sv[0], sv[1])) pos = sv;
      if (!pos) pos = m.spawn;
      const entering = OW.mapId !== 'town' || OW.world !== w;
      OW.objs = []; setMap('town', w, null);
      OW.p.x = pos[0]; OW.p.y = pos[1]; OW.p.dir = pos[2] || 'd';
      OW.lastArea = null;
      OW.done = done; OW.busy = false; OW.acting = null;
      activate();
      if (entering) showName('月代町' + (w !== 'A' ? '（' + KY.WORLD_LABEL[w] + '）' : ''));
      savePos();
      renderPanel();
    });
  }
  function exArea(id, opts) {
    if (!ensureDom()) return ORIG.exArea(id, opts);
    return KY._pend(done => {
      OW.opts = opts; OW.mode = 'area';
      cutOff();
      const w = S().world;
      const entering = OW.mapId !== id;
      let pos = null;
      if (entering) {
        const m = MP.compile(id, w);
        if (OW.arriveFrom) pos = MP.arrival(m, OW.arriveFrom);
        else { const sv = so().pos[id]; if (Array.isArray(sv) && !MP.solidAt(m, sv[0], sv[1]) && !MP.warpAt(m, sv[0], sv[1])) pos = sv; }
        if (!pos) pos = m.spawn;
        OW.arriveFrom = null;
        OW.objs = [];
        setMap(id, w, pos);
        showName(KY.areaName(id) + (w !== 'A' ? '（' + KY.WORLD_LABEL[w] + '）' : ''));
      } else if (OW.world !== w) {
        setMap(id, w, [OW.p.x, OW.p.y, OW.p.dir]);
      } else buildStatic();
      buildObjects();
      if (entering || OW.world !== w) { const [nx, ny] = nudge(OW.p.x, OW.p.y); OW.p.x = nx; OW.p.y = ny; }
      else if (!freeTile(OW.p.x, OW.p.y)) { const [nx, ny] = nudge(OW.p.x, OW.p.y); OW.p.x = nx; OW.p.y = ny; }
      OW.done = done; OW.busy = false; OW.acting = null;
      activate();
      savePos();
      renderPanel();
    });
  }
  function exClose() {
    try { ORIG.exClose(); } catch (e) {}
    if (OW.active) deactivate();
    OW.mapId = null; OW.objs = [];
  }
  Object.assign(KY.UI, { exMap, exArea, exClose });
  KY._reset.push(() => { if (OW.active) deactivate(); OW.mapId = null; OW.objs = []; OW.pendingWarp = null; OW.arriveFrom = null; OW.lastArea = null; });

  // #scene で別の場面が出たら、額縁の大写しで見せる
  const origScene = KY.scene;
  KY.scene = function (id, world) {
    const r = origScene.apply(this, arguments);
    try {
      if (OW.active && OW.acting && OW.mode === 'area') {
        const w = world || S().world;
        if (id && (id !== sceneOf(OW.mapId, OW.world) || w !== OW.world)) cutOn(null);
      }
    } catch (e) {}
    return r;
  };

  function emit(it) {
    const d = OW.done; if (!d) return;
    OW.done = null; OW.busy = true; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    if (D.ex) D.ex.hidden = true;
    d(it);
  }
  function savePos() {
    const o = so(), v = [OW.p.x, OW.p.y, OW.p.dir];
    if (OW.mapId === 'town') o.field = v; else if (OW.mapId) o.pos[OW.mapId] = v;
  }

  /* ═════════════════════════ 下のパネル ═════════════════════════ */
  function navBtn(label, fn, cls) { const b = KY._button('', fn, 'nav-btn ' + (cls || '')); b.append(KY._icon(cls && cls.indexOf('switch') >= 0 ? 'switch' : cls && cls.indexOf('menu') >= 0 ? 'item' : 'map'), $('span', '', label)); return b; }
  function renderPanel() {
    if (!D.ex || !OW.done) return;
    const s = S(), opts = OW.opts || {}, field = OW.mode === 'field';
    KY._hideDlg && KY._hideDlg();
    D.ex.hidden = false; D.ex.innerHTML = ''; D.ex.dataset.mode = field ? 'owmap' : 'owarea';
    KY._hudExtra.loc = field ? '月代町' : KY.areaName(OW.mapId); KY._hud();
    const top = $('div', 'ex-top');
    if (field) top.append($('span', 'ex-tag', '月代町'));
    else {
      const w = s.world, d = KY.dangerOf(OW.mapId, w);
      top.append($('span', 'ex-tag', KY.areaName(OW.mapId)));
      if (s.sync >= 2 || w !== 'A') { const wc = $('span', 'ex-world', KY.WORLD_LABEL[w]); wc.dataset.w = w; top.appendChild(wc); }
      const dz = $('span', 'ex-danger', '危険度 ' + d + '｜' + KY.DANGER_TXT[d]); dz.dataset.d = d; top.appendChild(dz);
      const ws = KY.worldsOf(OW.mapId);
      if (s.sync >= 1 && ws.length > 1) { const other = ws.filter(x => x !== w).some(x => KY.spotsOf(OW.mapId, x).some(sp => sp.on)); if (other) top.appendChild($('span', 'ex-sense', s.sync >= 2 ? '境界反応あり' : 'シロが耳を立てている')); }
      if (s.world !== s.baseWorld) top.appendChild($('span', 'ex-sense warn', (s.sync >= 3 ? '切替中' : '観測のみ') + '（あと' + (G.switchLeft | 0) + '回）'));
    }
    const hn = KY.hintText(opts);
    top.appendChild($('span', 'ex-goal', hn ? '目的：' + hn : field ? '行きたい場所の入口まで歩く' : ''));
    OWD.near = $('div', 'ow-near', '');
    const pad = $('div', 'ow-pad');
    const dp = $('div', 'ow-dpad'); dp.setAttribute('aria-label', '十字キー');
    [['u', '▲', '上'], ['l', '◀', '左'], ['r', '▶', '右'], ['d', '▼', '下']].forEach(([d, g, l]) => { const b = $('button', 'ow-d ow-d-' + d, g); b.type = 'button'; b.dataset.d = d; b.setAttribute('aria-label', l); dp.appendChild(b); });
    dp.appendChild($('i', 'ow-dc'));
    bindPad(dp);
    const ab = $('div', 'ow-ab');
    const bA = $('button', 'ow-btn ow-a', 'A'); bA.type = 'button'; bA.setAttribute('aria-label', 'A：調べる・話す');
    const bB = $('button', 'ow-btn ow-b', 'B'); bB.type = 'button'; bB.setAttribute('aria-label', 'B：メニュー');
    bA.addEventListener('click', e => { e.preventDefault(); pressA(); });
    bB.addEventListener('click', e => { e.preventDefault(); openMenu(); });
    ab.append(bB, bA);
    pad.append(dp, ab);
    const nav = $('div', 'ex-nav');
    if (KY.exReady(opts)) nav.appendChild(navBtn('調査を終える', () => doFinish(), 'finish primary'));
    if (!field && s.sync >= 2 && KY.worldsOf(OW.mapId).length > 1) nav.appendChild(navBtn('境界観測', () => openSwitch(), 'switch'));
    if (!(OW.m && OW.m.def && OW.m.def.noExit)) nav.appendChild(navBtn('町の地図', () => openTravel(), 'travel'));
    nav.appendChild(navBtn('メニュー', () => openMenu(), 'menu'));
    const keys = $('div', 'ow-keys', '矢印/WASD：歩く（Shift で走る）　Z・Enter：調べる／話す　X：メニュー　画面タップ：そこまで歩く');
    D.ex.append(top, OWD.near, keys, pad, nav);
    OW.near = null; updateNear(true);
  }
  function bindPad(dp) {
    const set = d => { OW.pad = d; dp.querySelectorAll('.ow-d').forEach(b => b.classList.toggle('on', b.dataset.d === d)); };
    const pick = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const b = el && el.closest && el.closest('.ow-d'); return b ? b.dataset.d : null; };
    dp.addEventListener('pointerdown', e => { e.preventDefault(); try { dp.setPointerCapture(e.pointerId); } catch (er) {} OW.path = null; set(pick(e)); });
    dp.addEventListener('pointermove', e => { if (OW.pad != null || e.buttons) { const d = pick(e); if (d) set(d); } });
    const up = () => set(null);
    dp.addEventListener('pointerup', up); dp.addEventListener('pointercancel', up); dp.addEventListener('lostpointercapture', up);
    dp.addEventListener('click', e => e.preventDefault());
  }
  function facing() { const [dx, dy] = DIRV[OW.p.dir]; return [OW.p.x + dx, OW.p.y + dy]; }
  function targetAhead() {
    const [fx, fy] = facing();
    let o = objAt(fx, fy) || ambAt(fx, fy);
    if (!o && 'dSm'.indexOf(MP.at(OW.m, fx, fy)) >= 0) { const [dx, dy] = DIRV[OW.p.dir]; const o2 = objAt(fx + dx, fy + dy) || ambAt(fx + dx, fy + dy); if (o2 && (o2.person || o2.text)) o = o2; }
    return o;
  }
  function updateNear(force) {
    if (!OWD.near || !OW.done) return;
    let t = '';
    if (!OW.p.mv) {
      const o = targetAhead();
      if (o && o.spots) t = 'Ａ：' + o.spots.map(sp => sp.label || sp.id).join('／');
      else if (o && o.text) t = 'Ａ：話しかける';
      else if (OW.mode === 'field') { const [fx, fy] = facing(); const wp = MP.warpAt(OW.m, fx, fy); if (wp) t = '▶ ' + fieldLabel(wp); }
    }
    if (t !== OW.near || force) { OW.near = t; OWD.near.textContent = t || ' '; OWD.near.classList.toggle('on', !!t); }
  }
  function fieldLabel(wp) {
    const id = resolveEntrance(wp);
    if (wp.to === '@center') return MP.FIELD_LABELS['@center'];
    return KY.AREAS[wp.to] ? KY.areaName(wp.to) : (MP.FIELD_LABELS[wp.to] || wp.to) + (id ? '' : '');
  }

  /* ═════════════════════════ メニュー（B / X） ═════════════════════════ */
  function gbList(title, sub, items, cls) {
    const h = KY._openOv('ov-choice ow-menu ' + (cls || ''), { label: title });
    const box = $('div', 'ky-win choice-box');
    box.appendChild($('div', 'choice-q', title));
    if (sub) box.appendChild($('div', 'choice-s', sub));
    const btns = [];
    items.forEach(it => {
      if (it.head) { box.appendChild($('div', 'ow-mhead', it.head)); return; }
      const b = KY._button('', () => { h.close(); it.fn(); }, 'choice-btn ' + (it.cls || ''));
      b.appendChild($('span', 'choice-t', it.t)); if (it.s) b.appendChild($('span', 'choice-s', it.s));
      if (it.off) { b.classList.add('off'); b.title = it.off; }
      if (it.disabled) b.disabled = true;
      box.appendChild(b); btns.push(b);
    });
    const close = KY._button('とじる', () => h.close(), 'ghost ow-close');
    box.appendChild(close); btns.push(close);
    h.el.appendChild(box);
    h.esc = () => h.close();
    h.key = e => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 's' || k === 'w') {
        e.preventDefault(); const list = btns.filter(b => !b.disabled); let i = list.indexOf(document.activeElement);
        i = (k === 'ArrowDown' || k === 's') ? (i + 1) % list.length : (i - 1 + list.length) % list.length; list[i].focus(); return true;
      }
      if (k === 'x' || k === 'X' || k === 'Backspace') { e.preventDefault(); h.close(); return true; }
      if (k === 'z' || k === 'Z') { e.preventDefault(); const b = document.activeElement; if (b && b.tagName === 'BUTTON' && box.contains(b)) b.click(); return true; }
      return false;
    };
    KY._focusFirst(box);
    return h;
  }
  function openMenu() {
    if (!OW.done) return;
    const s = S(), field = OW.mode === 'field', items = [];
    if (KY.exReady(OW.opts)) items.push({ t: '調査を終える', s: '次へ進む', fn: doFinish, cls: 'finish' });
    if (!field && s.sync >= 2 && KY.worldsOf(OW.mapId).length > 1) items.push({ t: '境界観測', s: 'ほかの層を見る（シロ同期 Lv' + s.sync + '）', fn: openSwitch });
    if (!field) items.push({ t: 'あたりを調べる', s: 'この場所全体を調べる・撮る・録る', fn: () => openActs({ spots: [null], x: OW.p.x, y: OW.p.y }) });
    items.push({ t: '持ち物', s: '医療用品・境界安定剤を使う', fn: openItems });
    items.push({ t: '観測ボード', fn: () => KY.openMenu('board') });
    items.push({ t: '調査手帳', fn: () => KY.openMenu('notebook') });
    if (!(OW.m && OW.m.def && OW.m.def.noExit)) items.push({ t: '町の地図', s: '行ける場所へすぐ移動する', fn: openTravel });
    items.push({ t: 'メニュー', s: 'セーブ・設定・ログ', fn: () => KY.openMenu() });
    gbList('メニュー', field ? '月代町' : KY.areaName(OW.mapId), items);
  }
  function doFinish() {
    if (!OW.done || !KY.exReady(OW.opts)) return;
    if (OW.mode === 'field') { const d = OW.done; OW.done = null; OW.busy = true; D.ex.hidden = true; KY.stageOpts({}); d(KY.EX_FINISH); }
    else emit({ nav: 'finish' });
  }
  function openSwitch() {
    if (!OW.done || OW.mode !== 'area') return;
    const s = S(), ws = KY.worldsOf(OW.mapId).filter(w => w !== s.world);
    const items = ws.map(w => ({ t: KY.WORLD_LABEL[w] + (w === s.baseWorld ? '（元の層へ戻る）' : ''), s: (KY.hasEquip('portable_observer') ? '危険度 ' + KY.dangerOf(OW.mapId, w) + '｜' + KY.DANGER_TXT[KY.dangerOf(OW.mapId, w)] + '・' : '') + (KY.hasEquip('shiro_link') ? '' : '切替で安定度が少し減る'), cls: 'sw-btn', fn: () => emit({ nav: 'switch', to: w }) }));
    gbList('境界観測：どの層を見る？', 'シロ同期 Lv' + s.sync + '｜' + KY.SYNC_TXT[s.sync], items, 'ow-switch');
  }
  function openItems() {
    const s = S(), field = OW.mode === 'field';
    if (field) { KY.openMenu('items'); return; }
    const items = ['med', 'stab'].map(id => ({ t: KY.itemName(id) + ' ×' + (s.items[id] | 0), s: KY.ITEMS[id].desc, disabled: (s.items[id] | 0) <= 0 || s.stability >= 100, fn: () => emit({ nav: 'item', id }) }));
    items.push({ head: KY.itemName('battery') + ' ' + (s.items.battery | 0) + '／' + KY.ITEMS.battery.max + '　' + KY.itemName('light') + ' ' + (s.items.light | 0) + '／' + KY.ITEMS.light.max });
    gbList('持ち物｜存在安定度 ' + Math.round(s.stability), '', items, 'ow-items');
  }
  function openTravel() {
    if (!OW.done) return;
    const s = S(), list = availList(), bm = KY.hasEquip('boundary_meter');
    const items = list.filter(id => id !== OW.mapId).map(id => {
      const sub = []; if (s.areas.visited.indexOf(id) < 0) sub.push('未調査'); if (bm) sub.push('危険度 ' + KY.dangerOf(id, s.baseWorld));
      const okW = KY.worldsOf(id).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
      return { t: KY.areaName(id), s: okW ? sub.join('・') : 'この層では到達できない', disabled: !okW, cls: 'area-btn', fn: () => travelTo(id) };
    });
    if (!items.length) items.push({ head: 'ほかに行ける場所はない。' });
    gbList('町の地図', '行き先を選ぶ（歩かずに移動する）', items, 'ow-travel');
  }
  function travelTo(id) {
    if (!OW.done) return;
    OW.arriveFrom = 'town';
    if (OW.mode === 'field') { const d = OW.done; OW.done = null; OW.busy = true; D.ex.hidden = true; d(id); }
    else { OW.pendingWarp = id; OW.lastArea = OW.mapId; emit({ nav: 'map' }); }
  }

  /* ── 行動メニュー（正面の物に A） ── */
  function openActs(o) {
    if (!OW.done) return;
    const s = S(), area = OW.mapId;
    const spots = o.spots;
    // 「聞き込み」だけの人は、すぐ話す
    if (spots.length === 1 && spots[0] && (spots[0].acts || ['look']).length === 1 && (spots[0].acts || ['look'])[0] === 'talk') return act(o, spots[0], 'talk');
    const h = KY._openOv('ov-choice ow-act', { label: '行動' });
    const box = $('div', 'ky-win choice-box ow-actbox');
    const btns = [];
    spots.forEach(sp => {
      box.appendChild($('div', 'choice-q', sp ? (sp.label || sp.id) : KY.areaName(area) + '（場所全体）'));
      const row = $('div', 'ow-acts');
      KY.ACTS.forEach(A => {
        const st = KY.actState(area, sp, A.id);
        if (!st.ok && st.hide) return;
        const b = KY._button('', () => { h.close(); act(o, sp, A.id); }, 'act-btn');
        b.append(KY._icon(A.icon), $('span', 'act-l', A.label));
        if (!st.ok) { b.classList.add('off'); b.title = st.reason; }
        b.dataset.act = A.id; if (sp) b.dataset.spot = sp.id;
        row.appendChild(b); btns.push(b);
      });
      box.appendChild(row);
    });
    const close = KY._button('やめる', () => h.close(), 'ghost ow-close'); box.appendChild(close); btns.push(close);
    h.el.appendChild(box); h.esc = () => h.close();
    h.key = e => {
      const k = e.key;
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) { e.preventDefault(); let i = btns.indexOf(document.activeElement); i = (k === 'ArrowDown' || k === 'ArrowRight') ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length; btns[i].focus(); return true; }
      if (k === 'x' || k === 'X') { e.preventDefault(); h.close(); return true; }
      if (k === 'z' || k === 'Z') { e.preventDefault(); const b = document.activeElement; if (b && box.contains(b)) b.click(); return true; }
      const n = +k; if (n >= 1 && n <= 5) { const A = KY.ACTS[n - 1]; const b = btns.find(x => x.dataset.act === A.id); if (b) { e.preventDefault(); b.click(); return true; } }
      return false;
    };
    KY._focusFirst(box);
  }
  function act(o, sp, a) {
    if (!OW.done) return;
    // 人物はこちらを向く
    if (o && o.sprite && o.x != null) { const dx = OW.p.x - o.x, dy = OW.p.y - o.y; if (Math.abs(dx) + Math.abs(dy) <= 2 && (o.person || o.sprite === 'dog' || o.sprite === 'dog2' || o.sprite === 'cat')) o.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); }
    OW.acting = { spot: sp ? sp.id : null, act: a };
    const extra = sp && MP.CUT_OPTS[sp.id];
    const big = sp && (a === 'photo' || ((a === 'look' || a === 'scan') && !(o && o.person)) || extra);
    if (big || !sp && a === 'photo') {
      if (extra) KY.stageOpts(Object.assign({}, KY.figOpts(OW.mapId, S().world), extra));
      cutOn(sp && !extra ? { x: sp.x || 0, y: sp.y || 0, w: sp.w || 0, h: sp.h || 0 } : null);
    }
    KY.se('beep');
    emit({ act: a, spot: sp ? sp.id : null });
  }

  /* ═════════════════════════ 入力 ═════════════════════════ */
  function keyDir(k) { return ({ ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' })[k] || null; }
  KY._keyhook.unshift(e => {
    if (!OW.active || !OW.done) return false;
    const d = keyDir(e.key);
    if (d) { e.preventDefault(); if (OW.keys.indexOf(d) < 0) OW.keys.push(d); OW.path = null; if (e.shiftKey) OW.run = true; return true; }
    if (e.key === 'Shift') { OW.run = true; return true; }
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) pressA(); return true; }
    if (e.key === 'x' || e.key === 'X') { e.preventDefault(); if (!e.repeat) openMenu(); return true; }
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) { e.preventDefault(); openTravel(); return true; }
    if ((e.key === 'b' || e.key === 'B') && !e.repeat && OW.mode === 'area') { e.preventDefault(); openSwitch(); return true; }
    return false;
  });
  function heldDir() { return OW.pad || OW.keys[OW.keys.length - 1] || null; }
  function pressA() {
    if (!OW.done || OW.busy || OW.p.mv || KY._OV.length) return;
    const o = targetAhead();
    if (!o) return;
    if (o.spots) return openActs(o);
    if (o.text) return talkAmb(o);
  }
  async function talkAmb(a) {
    const dx = OW.p.x - a.x, dy = OW.p.y - a.y; a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    OW.busy = true; D.ex.hidden = true;
    try { await KY.say(['x:' + a.text]); } catch (e) { if (e === KY.ABORT) return; }
    OW.busy = false;
    if (OW.done) renderPanel();
  }
  async function message(lines) {
    OW.busy = true; if (D.ex) D.ex.hidden = true;
    try { await KY.say(lines.map(l => 'n:' + l)); } catch (e) { if (e === KY.ABORT) return; }
    OW.busy = false;
    if (OW.done) renderPanel();
  }
  function onTap(e) {
    if (!OW.active || !OW.done || OW.busy || KY._OV.length || OW.cut) return;
    e.preventDefault();
    const r = OWD.cv.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * CW + OW.camX, py = (e.clientY - r.top) / r.height * CH + OW.camY;
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    goTo(tx, ty, true);
  }
  // そのマスへ歩く（物・人なら正面まで歩いて A）
  function goTo(tx, ty, interact) {
    const m = OW.m; if (!m) return false;
    if (tx === OW.p.x && ty === OW.p.y) return false;
    const o = objAt(tx, ty) || ambAt(tx, ty);
    const blocked = blockSet();
    const wp = MP.warpAt(m, tx, ty);
    if (!o && !MP.solidAt(m, tx, ty)) {
      const p = MP.path(m, OW.p.x, OW.p.y, (x, y) => x === tx && y === ty, blocked);
      if (!p) return false;
      OW.path = p; OW.pathThen = wp ? null : null; return true;
    }
    // 正面に立てるマスへ
    const goal = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1 && !MP.warpAt(m, x, y);
    goal.allowStart = true;
    const p = MP.path(m, OW.p.x, OW.p.y, goal, blocked);
    if (!p) return false;
    // 最後のマスから見て、物の方向
    let x = OW.p.x, y = OW.p.y; p.forEach(d => { x += DIRV[d][0]; y += DIRV[d][1]; });
    const face = tx > x ? 'r' : tx < x ? 'l' : ty > y ? 'd' : 'u';
    OW.path = p; OW.pathThen = { face, interact: !!interact && !!(o || 'wjcIaMe'.indexOf(MP.at(m, tx, ty)) >= 0 || true) };
    return true;
  }
  function blockSet() {
    const b = new Set();
    OW.objs.forEach(o => { if (o.sprite) b.add(o.x + ',' + o.y); });
    OW.amb.forEach(a => b.add(a.x + ',' + a.y));
    return b;
  }

  /* ═════════════════════════ 動き ═════════════════════════ */
  const STEP_MS = 150, RUN_MS = 85, PATH_MS = 115;
  function canEnter(x, y) {
    if (MP.solidAt(OW.m, x, y)) return false;
    if (OW.objs.some(o => o.sprite && o.x === x && o.y === y)) return false;
    if (OW.amb.some(a => (a.x === x && a.y === y) || (a.mv && a.mv.tx === x && a.mv.ty === y))) return false;
    return true;
  }
  function update(ts) {
    const p = OW.p;
    if (p.mv) {
      const t = (ts - p.mv.t0) / p.mv.dur;
      if (t >= 1) { p.x = p.mv.tx; p.y = p.mv.ty; p.mv = null; arrive(ts); }
    }
    if (!p.mv && OW.done && !OW.busy && !KY._OV.length && !OW.trans) {
      let d = null, fromPath = false;
      if (OW.path && OW.path.length) { d = OW.path[0]; fromPath = true; }
      else d = heldDir();
      if (d) {
        if (!fromPath && p.dir !== d && !OW.walking) { p.dir = d; OW.turnUntil = ts + 90; OW.walking = true; }
        else if (fromPath || ts >= OW.turnUntil) {
          p.dir = d;
          const [dx, dy] = DIRV[d], nx = p.x + dx, ny = p.y + dy;
          if (canEnter(nx, ny)) {
            if (fromPath) OW.path.shift();
            p.mv = { fx: p.x, fy: p.y, tx: nx, ty: ny, t0: ts, dur: fromPath ? PATH_MS : OW.run ? RUN_MS : STEP_MS };
            p.step = (p.step + 1) % 4;
            OW.walking = true;
            if (OW.follower) { OW.follower.fx = OW.follower.x; OW.follower.fy = OW.follower.y; OW.follower.tx = p.x; OW.follower.ty = p.y; OW.follower.t0 = ts; OW.follower.dur = p.mv.dur; }
          } else {
            if (fromPath) { OW.path = null; OW.pathThen = null; }
            if (ts - OW.bumpT > 400) { OW.bumpT = ts; }
          }
        }
      } else OW.walking = false;
      if (!d && !p.mv && OW.pathThen && (!OW.path || !OW.path.length)) {
        const th = OW.pathThen; OW.pathThen = null; OW.path = null;
        if (th.face) p.dir = th.face;
        if (th.interact) { OW.pendingA = true; setTimeout(() => { OW.pendingA = false; pressA(); }, 60); }
      }
    }
    // ついて来るシロ
    const wantF = KY.has('shiro_met') && !OW.shiroHere && OW.mode;
    if (wantF && !OW.follower) { const [bx, by] = behind(); OW.follower = { x: bx, y: by, fx: bx, fy: by, tx: bx, ty: by, t0: 0, dur: 1 }; }
    if (!wantF) OW.follower = null;
    if (OW.follower) { const f = OW.follower; if (f.t0 && ts - f.t0 >= f.dur) { f.x = f.tx; f.y = f.ty; f.t0 = 0; } }
    // 町の人：ときどき向きを変える・少し歩く
    for (const a of OW.amb) {
      if (a.mv) { if (ts - a.mv.t0 >= a.mv.dur) { a.x = a.mv.tx; a.y = a.mv.ty; a.mv = null; } continue; }
      if (ts < a.next || OW.busy) continue;
      a.next = ts + 1800 + Math.random() * 3200;
      const ds = ['u', 'd', 'l', 'r'], d = ds[(Math.random() * 4) | 0]; a.dir = d;
      const near = Math.abs(a.x - p.x) + Math.abs(a.y - p.y) <= 2;
      const [dx, dy] = DIRV[d], nx = a.x + dx, ny = a.y + dy;
      if (!near && Math.random() < 0.5 && Math.abs(nx - a.hx) + Math.abs(ny - a.hy) <= 1 && !MP.warpAt(OW.m, nx, ny) && !MP.solidAt(OW.m, nx, ny) && !OW.objs.some(o => Math.abs(o.x - nx) + Math.abs(o.y - ny) <= 1) && !(nx === p.x && ny === p.y) && !(p.mv && p.mv.tx === nx && p.mv.ty === ny))
        a.mv = { tx: nx, ty: ny, fx: a.x, fy: a.y, t0: ts, dur: 260 };
    }
    for (const o of OW.objs) {
      if (!o.person || OW.busy) continue;
      if (!o.idleT) o.idleT = ts + 2500 + Math.random() * 4000;
      if (ts > o.idleT) { o.idleT = ts + 2500 + Math.random() * 4000; if (Math.abs(o.x - p.x) + Math.abs(o.y - p.y) > 2) { o.dir = Math.random() < 0.6 ? (o.home || (o.home = o.dir)) : ['u', 'd', 'l', 'r'][(Math.random() * 4) | 0]; } }
    }
    updateNear();
  }
  function behind() { const [dx, dy] = DIRV[OW.p.dir]; const bx = OW.p.x - dx, by = OW.p.y - dy; return MP.solidAt(OW.m, bx, by) ? [OW.p.x, OW.p.y] : [bx, by]; }
  function arrive(ts) {
    const p = OW.p;
    savePos();
    OW.steps++;
    if (OW.steps % 12 === 0) KY.autosaveSoon();
    const wp = MP.warpAt(OW.m, p.x, p.y);
    if (wp) { onWarp(wp, ts); return; }
    if (OW.cool > 0) { OW.cool--; return; }
    if (MP.at(OW.m, p.x, p.y) === 'n' && noiseOn() && !OW.busy && OW.done) maybeBattle();
  }
  function stepBack() {
    const p = OW.p, [dx, dy] = DIRV[p.dir];
    const bx = p.x - dx, by = p.y - dy;
    if (!MP.solidAt(OW.m, bx, by)) { p.x = bx; p.y = by; }
    p.dir = OPP[p.dir]; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    savePos();
  }
  function resolveEntrance(wp) {
    const list = availList();
    if (wp.to === '@center') return CENTER.find(id => list.indexOf(id) >= 0) || null;
    return list.indexOf(wp.to) >= 0 ? wp.to : null;
  }
  function onWarp(wp) {
    const s = S();
    if (OW.mode === 'field') {
      const id = resolveEntrance(wp);
      if (wp.rift && !id) return;   // 裂け目は、行ける時だけ開いている
      if (!id) {
        const target = wp.to === '@center' ? CENTER.find(c => KY.AREAS[c]) : wp.to;
        const open = target && KY.areaOpen(target);
        stepBack();
        message([open ? '……今は、ほかに調べることがある。' : 'ここには、まだ用がない。']);
        return;
      }
      const okW = KY.worldsOf(id).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
      if (!okW) { stepBack(); message(['この層からは、そこへ行けないようだ。']); return; }
      OW.arriveFrom = 'town';
      const d = OW.done; if (!d) return;
      OW.done = null; OW.busy = true; D.ex.hidden = true; KY.se('steps');
      d(id);
      return;
    }
    // 場所の中
    if (wp.to === 'town') {
      if (OW.m.def && OW.m.def.noExit) { stepBack(); message(['戻る道は、もう無い。']); return; }
      OW.lastArea = OW.mapId; KY.se('steps');
      emit({ nav: 'map' });
      return;
    }
    const list = availList();
    if (list.indexOf(wp.to) < 0 && /^center_/.test(wp.to) && /^center_/.test(OW.mapId)) {
      // 分室の中で、通り道の部屋が今回の調べ物に入っていないときは、そのまま建物の外（町）へ出る
      OW.lastArea = OW.mapId; KY.se('steps'); emit({ nav: 'map' }); return;
    }
    if (list.indexOf(wp.to) < 0) {
      stepBack();
      const open = KY.areaOpen(wp.to);
      message([open ? '……今は、そちらに用はない。' : (KY.AREAS[wp.to] ? '扉は閉ざされている。' : 'その先へは行けない。')]);
      return;
    }
    const okW = KY.worldsOf(wp.to).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
    if (!okW) { stepBack(); message(['この層からは、その先へ行けないようだ。']); return; }
    OW.pendingWarp = wp.to; OW.arriveFrom = OW.mapId; OW.lastArea = OW.mapId; KY.se('steps');
    emit({ nav: 'map' });
  }

  /* ═════════════════════════ 境界ノイズ → 戦闘 ═════════════════════════ */
  async function maybeBattle() {
    const B = root.KY_BATTLE;
    if (!B || typeof B.encounter !== 'function' || typeof B.start !== 'function') return;
    if (!KY.has('shiro_met') || OW.cut || KY._OV.length || G.adv) return;
    const ctx = { area: OW.mapId === 'town' ? 'town' : OW.mapId, world: OW.world, danger: dangerHere(), chapter: S().chapter };
    let id = null;
    try { id = B.encounter(ctx); } catch (e) { console.error('[KY_WORLD] encounter', e); return; }
    if (!id) return;
    API.encounters = (API.encounters | 0) + 1;
    await startBattle(id, ctx);
  }
  async function startBattle(id, ctx) {
    OW.busy = true; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    if (D.ex) D.ex.hidden = true;
    KY.se('static');
    const gen = G.gen;
    await transition('out');
    if (gen !== G.gen) return;
    let r = null;
    try { r = await root.KY_BATTLE.start(id, { area: ctx.area, world: ctx.world, danger: ctx.danger, from: 'overworld' }); }
    catch (e) { if (e === KY.ABORT) return; console.error('[KY_WORLD] battle', e); }
    if (gen !== G.gen) return;
    OW.cool = 3;                      // 戦闘直後の数歩は出ない（直後のマスでは決して出ない）
    OW.lastBattle = { id, result: r && r.result };
    API.lastBattle = OW.lastBattle;
    await transition('in');
    OW.busy = false;
    if (G.slipNow && OW.done) { emit(null); return; }   // 研究所へ押し戻し（探索ループが処理する）
    if (OW.done) renderPanel();
  }
  function transition(kind) {
    return new Promise(res => {
      const dur = KY.reduced() ? 200 : kind === 'out' ? 900 : 380;
      OW.trans = { kind, t0: now(), dur, res };
    });
  }

  /* ═════════════════════════ 描く ═════════════════════════ */
  function frame(ts) {
    if (!OW.active) { OW.raf = 0; return; }
    OW.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    try { update(ts); draw(ts); } catch (e) { if (!OW.drawErr) { OW.drawErr = 1; console.error('[KY_WORLD] draw', e); } }
  }
  function lerpPos(o, ts) {
    if (o.mv) { const t = clamp((ts - o.mv.t0) / o.mv.dur, 0, 1); return [(o.mv.fx + (o.mv.tx - o.mv.fx) * t) * TS, (o.mv.fy + (o.mv.ty - o.mv.fy) * t) * TS, t]; }
    return [o.x * TS, o.y * TS, 0];
  }
  function draw(ts) {
    const ctx = OWD.ctx, m = OW.m; if (!m || !OW.stat) return;
    buildStatic();
    const col = palColors(OW.palK);
    const [ppx, ppy, pt] = lerpPos(OW.p, ts);
    const mw = m.w * TS, mh = m.h * TS;
    let camX = mw <= CW ? -Math.floor((CW - mw) / 2) : clamp(Math.round(ppx + 8 - CW / 2), 0, mw - CW);
    let camY = mh <= CH ? -Math.floor((CH - mh) / 2) : clamp(Math.round(ppy + 8 - CH / 2), 0, mh - CH);
    OW.camX = camX; OW.camY = camY;
    ctx.fillStyle = col[0]; ctx.fillRect(0, 0, CW, CH);
    let stat = OW.stat;
    if (OW.flick) { if (ts > OW.flick.until) OW.flick = null; else if (((ts - OW.flick.t0) / 60 | 0) % 2 === 0) stat = OW.flick.prev; }
    ctx.drawImage(stat, -camX, -camY);
    // 動くマス
    const x0 = Math.max(0, Math.floor(camX / TS)), y0 = Math.max(0, Math.floor(camY / TS)), x1 = Math.min(m.w - 1, Math.floor((camX + CW) / TS)), y1 = Math.min(m.h - 1, Math.floor((camY + CH) / TS));
    const nOn = noiseOn(), list = OW.mode === 'field' ? (OW.list || []) : null, fr = (ts / 120) | 0;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = m.g[ty][tx], ox = tx * TS - camX, oy = ty * TS - camY;
      if (ch === '~') { const sh = ((ts / 400) | 0) % 4; ctx.fillStyle = col[2]; ctx.fillRect(ox + ((hash(tx, ty, 1) + sh * 2) % 10), oy + 4 + (sh % 2), 4, 1); ctx.fillRect(ox + ((hash(tx, ty, 2) + 16 - sh * 2) % 10) + 2, oy + 11, 3, 1); }
      else if (ch === 'n' && nOn) {
        const hs = hash(tx, ty, fr);
        for (let i = 0; i < 14; i++) { const v = hash(i, hs, 5); ctx.fillStyle = col[v % 3 === 0 ? 0 : v % 3 === 1 ? 1 : 3]; ctx.fillRect(ox + (v >> 3) % 15, oy + (v >> 7) % 15, 2, 1); }
        if (fr % 5 === 0) { ctx.fillStyle = col[1]; ctx.fillRect(ox, oy + (hs % 14), 16, 1); }
      }
      else if (ch === 'Z') {
        const wp = MP.warpAt(m, tx, ty); const on = wp && list && resolveEntrance(wp);
        if (on) { const ph = ((ts / 150) | 0) % 4; ctx.fillStyle = col[0]; ctx.fillRect(ox + 5, oy + 1, 6, 14); ctx.fillStyle = col[ph % 2 ? 2 : 3]; ctx.fillRect(ox + 6, oy + 2 + ph, 4, 10 - ph); ctx.fillStyle = col[1]; ctx.fillRect(ox + 3 - (ph % 2), oy + 6, 1, 4); ctx.fillRect(ox + 12 + (ph % 2), oy + 4, 1, 5); }
      }
      else if (ch === 'K' && (hash(tx, ty, fr >> 2) & 3) === 0) { ctx.fillStyle = col[3]; ctx.fillRect(ox + 11, oy + 2 + (hash(tx, ty, 9) % 10), 1, 1); }
      if (OW.mode === 'field') { const wx = MP.warpAt(m, tx, ty); if (wx && wx.extra) { const q = spriteCanvas('q', 'd', 0, OW.palK); ctx.drawImage(q, ox, oy - 2); } }
      // 町の入口の目印（行ける場所だけ）
      if (OW.mode === 'field' && ch !== 'Z') { const wp = MP.warpAt(m, tx, ty); if (wp && resolveEntrance(wp) && ((ts / 400) | 0) % 2 === 0) { ctx.fillStyle = col[0]; ctx.fillRect(ox + 6, oy - 4, 4, 3); ctx.fillStyle = col[3]; ctx.fillRect(ox + 7, oy - 3, 2, 1); } }
    }
    // 人物・物（下にいるものほど手前）
    const ents = [];
    for (const o of OW.objs) if (o.sprite) ents.push({ y: o.y * TS, x: o.x * TS, spr: o.sprite, dir: o.dir || 'd', frame: 0, o });
    for (const a of OW.amb) { const [ax, ay, at] = lerpPos(a, ts); ents.push({ y: ay, x: ax, spr: a.sprite, dir: a.dir, frame: a.mv ? (at < 0.5 ? 1 : 0) : 0 }); }
    if (OW.follower) { const f = OW.follower; let fx = f.x * TS, fy = f.y * TS; if (f.t0) { const t = clamp((ts - f.t0) / f.dur, 0, 1); fx = (f.fx + (f.tx - f.fx) * t) * TS; fy = (f.fy + (f.ty - f.fy) * t) * TS; } const fd = f.tx > f.fx ? 'r' : f.tx < f.fx ? 'l' : 'd'; ents.push({ y: fy, x: fx, spr: 'shiro', dir: fd, frame: 0, bob: ((ts / 300) | 0) % 2 }); }
    const pf = OW.p.mv ? (pt < 0.5 ? (OW.p.step % 2 ? 1 : 2) : 0) : 0;
    ents.push({ y: ppy, x: ppx, spr: 'player', dir: OW.p.dir, frame: pf, me: true });
    ents.sort((a, b) => a.y - b.y || (a.me ? 1 : -1));
    for (const e of ents) {
      const cv = spriteCanvas(e.spr, e.dir, e.frame, OW.palK);
      const lift = PERSON.has(e.spr) ? 4 : 0;
      ctx.drawImage(cv, Math.round(e.x - camX), Math.round(e.y - camY - lift - (e.frame ? 1 : 0) - (e.bob || 0)));
    }
    // まだ調べていない物のきらめき
    const blink = ((ts / 260) | 0) % 3;
    for (const o of OW.objs) {
      if (o.seen || !o.live) continue;
      const ox = o.x * TS - camX, oy = o.y * TS - camY - (o.person ? 9 : 2);
      if (ox < -16 || oy < -16 || ox > CW || oy > CH) continue;
      if (blink === 2) continue;
      ctx.fillStyle = col[0]; ctx.fillRect(ox + 10, oy - 1, 5, 5); ctx.fillStyle = col[3]; ctx.fillRect(ox + 12, oy, 1, 3); ctx.fillRect(ox + 11, oy + 1, 3, 1);
      if (blink === 1) { ctx.fillStyle = col[2]; ctx.fillRect(ox + 12, oy + 1, 1, 1); }
    }
    // 安定度が低いと、ときどき横にずれる
    const st = S().stability;
    if (st < 30 && !KY.reduced() && Math.random() < (30 - st) / 300) { const y = (Math.random() * CH) | 0, hh = 3 + (Math.random() * 10 | 0); try { ctx.drawImage(OWD.cv, 0, y, CW, hh, ((Math.random() - 0.5) * 12) | 0, y, CW, hh); } catch (e) {} }
    // 大写しの間は、地図を網点で暗くする
    if (OW.cut) { ctx.fillStyle = col[0]; for (let y = 0; y < CH; y += 2) for (let x = (y >> 1) % 2; x < CW; x += 2) ctx.fillRect(x, y, 1, 1); }
    // 戦闘の入り・明け
    if (OW.trans) {
      const tr = OW.trans, t = clamp((now() - tr.t0) / tr.dur, 0, 1);
      if (tr.kind === 'out') {
        if (t < 0.4) { if (((t * 10) | 0) % 2 === 0) { ctx.fillStyle = col[3]; ctx.fillRect(0, 0, CW, CH); } }
        else spiral(ctx, col, (t - 0.4) / 0.6);
      } else spiral(ctx, col, 1 - t);
      if (t >= 1) { OW.trans = null; tr.res(); }
    }
  }
  // 外側からうず巻きに黒く埋める（8×8 のブロック）
  const SPIRAL = (() => { const W = CW / 8, H = CH / 8, out = []; let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1; while (x0 <= x1 && y0 <= y1) { for (let x = x0; x <= x1; x++) out.push([x, y0]); for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]); if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]); if (x0 < x1) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]); x0++; y0++; x1--; y1--; } return out; })();
  function spiral(ctx, col, t) { const n = Math.floor(SPIRAL.length * clamp(t, 0, 1)); ctx.fillStyle = col[0]; for (let i = 0; i < n; i++) ctx.fillRect(SPIRAL[i][0] * 8, SPIRAL[i][1] * 8, 8, 8); }

  /* ═════════════════════════ 自動プレイ・テスト用（画面タップと同じ動き） ═════════════════════════ */
  API.state = () => ({ active: OW.active, mode: OW.mode, map: OW.mapId, world: OW.world, x: OW.p.x, y: OW.p.y, dir: OW.p.dir, moving: !!OW.p.mv, busy: OW.busy, ready: !!OW.done && !OW.busy && !OW.p.mv && !(OW.path && OW.path.length) && !OW.pathThen && !OW.pendingA && !OW.trans && !KY._OV.length, cut: OW.cut, steps: OW.steps, pal: OW.palK });
  API.objects = () => OW.objs.map(o => ({ x: o.x, y: o.y, sprite: o.sprite, person: !!o.person, seen: o.seen, unmapped: !!o.unmapped, spots: o.spots.map(sp => ({ id: sp.id, label: sp.label, acts: (sp.acts || ['look']).slice() })) }));
  API.entrances = () => OW.mode !== 'field' ? [] : OW.m.warps.map(w => ({ to: w.to, x: w.x, y: w.y, go: resolveEntrance(w), rift: !!w.rift }));
  API.exits = () => OW.mode !== 'area' ? [] : OW.m.warps.map(w => ({ to: w.to, x: w.x, y: w.y }));
  API.goTo = (x, y, interact) => goTo(x, y, interact !== false);
  API.walkToSpot = id => { const o = OW.objs.find(v => v.spots.some(sp => sp.id === id)); return o ? goTo(o.x, o.y, true) : false; };
  API.walkToArea = id => {
    if (OW.mode !== 'field') return false;
    const w = OW.m.warps.find(v => resolveEntrance(v) === id); if (!w) return false;
    const p = MP.path(OW.m, OW.p.x, OW.p.y, (x, y) => x === w.x && y === w.y, blockSet());
    if (!p) return false; OW.path = p; OW.pathThen = null; return true;
  };
  API.walkToExit = to => {
    if (OW.mode !== 'area') return false;
    const ws = OW.m.warps.filter(v => v.to === (to || 'town')); if (!ws.length) return false;
    const p = MP.path(OW.m, OW.p.x, OW.p.y, (x, y) => ws.some(v => v.x === x && v.y === y), blockSet());
    if (!p) return false; OW.path = p; OW.pathThen = null; return true;
  };
  API.available = () => availList().slice();
  API.pressA = pressA;
  API.openMenu = openMenu;
  API.startBattle = (id, ctx) => startBattle(id, Object.assign({ area: OW.mapId, world: OW.world, danger: dangerHere() }, ctx || {}));
  API.noiseTiles = () => { const out = []; if (!OW.m) return out; OW.m.g.forEach((r, y) => r.forEach((c, x) => { if (c === 'n') out.push([x, y]); })); return out; };
  API.noiseOn = () => !!(OW.m && noiseOn());
})(typeof window !== 'undefined' ? window : globalThis);
