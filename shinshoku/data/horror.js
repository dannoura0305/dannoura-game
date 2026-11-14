// 境界侵食 Q-horror（じわじわ型の演出）：区画ごとの暗さ・不規則なちらつき・倒れ方・首の「止める→急に傾ける」・
// 届いた動きの順番の乱し・足の滑らない位相の速さ・止まって動く近づき方・遠くに立つ影の場所・手持ちの揺れ。
// DOM・three.js なし（node で試験：tests/shinshoku-horror.test.mjs）。数値は【仮】。
// 戦いの数値（予兆の時間・当たり・ダメージ）はここに無い（変えない）。

/** 文字列 → 32bit の種 */
export function hash32(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
/** 種 → 0..1 の乱数の列（mulberry32） */
export function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** (種, 番号) → 0..1（同じ物は同じ値） */
export function hashU(seed, i) { let h = (seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0; h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// ───────────── 1・6・8：区画ごとの暗さ（空と周りの明かり・月・補助光・異形の縁の光と陰・画面の周辺減光と粒） ─────────────
// hemi・amb・moon：three.js の光の強さ（そのまま入れる）。key・keyDist：プレイヤーに付いて回る補助光。
// rim：異形の縁の光の倍率（懐中電灯の円錐の中では 1 に戻す）。shade：陰の明るさ（uShadeFill）の倍率。luma：明るさの下限（uMinLuma）の倍率。fog：異形の霧の効き（1＝背景と同じ）。
// vig：画面の周辺減光の強さ（0..1）。grain：粒の不透明度。
const P = (hemi, amb, moon, key, keyDist, rim, shade, luma, fog, vig, grain) => ({ hemi, amb, moon, key, keyDist, rim, shade, luma, fog, vig, grain });
export const HORROR_LIGHT = {
  arcade_out: P(0.55, 0.24, 0.35, 0.6, 2.8, 0.25, 0.7, 0.5, 0.9, 0.5, 0.023),       // 発生後（と序章の消灯の後）のアーケード
  alley: P(0.5, 0.22, 0.35, 0.6, 2.8, 0.2, 0.65, 0.45, 0.95, 0.55, 0.023),
  plaza: P(0.7, 0.3, 0.6, 0.9, 3.2, 0.4, 0.8, 0.7, 0.85, 0.45, 0.018),
  shelter: P(0.75, 0.32, 0.4, 0.9, 3.2, 0.45, 0.85, 0.75, 0.85, 0.45, 0.016),
  hospital_lobby: P(0.45, 0.22, 0.2, 0.6, 2.8, 0.25, 0.7, 0.5, 0.95, 0.55, 0.023),
  hospital_ward: P(0.32, 0.14, 0.12, 0.5, 2.5, 0.15, 0.6, 0.4, 1.0, 0.65, 0.027),
  tunnel: P(0.34, 0.15, 0.1, 0.5, 2.5, 0.15, 0.6, 0.4, 1.0, 0.65, 0.027),
  office: P(0.55, 0.25, 0.25, 0.7, 3.0, 0.35, 0.75, 0.6, 0.9, 0.5, 0.02),
  lab: P(0.5, 0.24, 0.2, 0.7, 3.0, 0.35, 0.75, 0.6, 0.9, 0.5, 0.02),
  oldwing: P(0.36, 0.16, 0.12, 0.5, 2.5, 0.15, 0.6, 0.4, 1.0, 0.65, 0.027),
  atrium: P(0.5, 0.22, 0.25, 0.6, 2.8, 0.3, 0.7, 0.5, 0.95, 0.55, 0.023),
  admin: P(0.42, 0.2, 0.18, 0.6, 2.8, 0.2, 0.65, 0.45, 1.0, 0.6, 0.025),
  kiroku: P(0.38, 0.17, 0.12, 0.5, 2.5, 0.15, 0.6, 0.4, 1.0, 0.65, 0.027),
};
/** 暗くしない時（町のふだん・巨大な姿の区画・結末）の値 */
export const LIGHT_NORMAL = P(null, null, null, 1.4, 4, 1, 1, 1, null, 0.3, 0);
/** この仕組みで空と周りの明かりを動かす区画（巨大な姿・結末の区画は今のまま：ch7 が自分で明かりを変える） */
export const HORROR_AREAS = ['shotengai', 'alley', 'plaza', 'shelter', 'hospital', 'tunnel', 'office', 'lab', 'oldwing', 'atrium', 'admin', 'kiroku'];
/**
 * 区画・場所・段 → 暗さの組の名前（null＝暗くしない）。
 * shotengai はアーケード（|x|<4.8・-72.5<z<-4）だけ、発生後か消灯の後（outbreak）に暗くする。病院は受付（z>8）と病棟で分ける。
 */
export function horrorKey(areaId, x = 0, z = 0, outbreak = false) {
  if (areaId === 'shotengai') return outbreak && z < -4 && z > -72.5 && Math.abs(x) < 4.8 ? 'arcade_out' : null;
  if (areaId === 'hospital') return z > 19.8 ? null : z > 8 ? 'hospital_lobby' : 'hospital_ward';
  return HORROR_LIGHT[areaId] ? areaId : null;
}
export function horrorLightAt(areaId, x, z, outbreak) { const k = horrorKey(areaId, x, z, outbreak); return k ? HORROR_LIGHT[k] : null; }
/** 消灯（darkness 0..1）で空と周りの明かりに掛ける倍率 */
export const darkMul = d => 1 - 0.5 * Math.min(1, Math.max(0, d || 0));

// ───────────── 2：不規則なちらつき（明かりごとの状態の機械） ─────────────
/**
 * ふだん点いている時間 onMin〜onMax 秒 → 0.05〜0.12 秒の消灯を 1〜3 回（間は 0.04〜0.15 秒点く）。10% の確率で 1.5〜3 秒消えたまま。
 * step(dt) → 明るさの倍率（0 か 1）。消えた瞬間は edge が true（音のきっかけ：takeEdge() で 1 回だけ読める）。
 */
export class Flicker {
  constructor(seed, opt = {}) {
    this.r = rng(seed); this.onMin = opt.onMin ?? 4; this.onMax = opt.onMax ?? 15; this.deadP = opt.deadP ?? 0.1;
    this.mode = 'on'; this.k = 1; this.n = 0; this.edge = false;
    this.t = this.r() * this.onMax;                                 // 始まりもずらす（同じ時に点いた明かりが揃わない）
  }
  step(dt) { this.t -= dt; let g = 0; while (this.t <= 0 && g++ < 16) this._next(); return this.k; }
  takeEdge() { const e = this.edge; this.edge = false; return e; }
  _on() { this.mode = 'on'; this.k = 1; this.t += this.onMin + this.r() * (this.onMax - this.onMin); }
  _off() { this.mode = 'off'; this.k = 0; this.t += 0.05 + this.r() * 0.07; this.edge = true; }
  _next() {
    const r = this.r;
    if (this.mode === 'on') { if (r() < this.deadP) { this.mode = 'dead'; this.k = 0; this.t += 1.5 + r() * 1.5; this.edge = true; } else { this.n = 1 + Math.floor(r() * 3); this._off(); } }
    else if (this.mode === 'off') { this.n--; if (this.n > 0) { this.mode = 'gap'; this.k = 1; this.t += 0.04 + r() * 0.11; } else this._on(); }
    else if (this.mode === 'gap') this._off();
    else this._on();
  }
}

// ───────────── 12：首の「止める → 急に傾ける」・届いた動きの順番 ─────────────
// 区切り b(i) = i·P + u(i)·J（P＝平均の長さ、J＝ゆらぎ）→ 区切りの間の長さは P−J〜P+J（例：2〜4 秒）
function segOf(t, seed, P, J) {
  let i = Math.floor(t / P); const b = k => k * P + hashU(seed, k) * J;
  while (i > -1e6 && b(i) > t) i--; while (b(i + 1) <= t) i++;
  return { i, start: b(i), end: b(i + 1) };
}
/**
 * 首の傾き（ラジアン）：holdMin〜holdMax 秒（既定 2〜4）止めたまま → snap 秒（0.12）で次の角度（±amp、既定 10 度）へ → 止める。
 * 種（異形ごと）で区切りがずれる＝揃わない。
 */
export function twitch(t, seed, amp = 0.175, holdMin = 2, holdMax = 4, snap = 0.12) {
  const P = (holdMin + holdMax) / 2, J = (holdMax - holdMin) / 2, s = segOf(t, seed, P, J);
  const ang = i => { const u = hashU(seed ^ 0x51ED, i); return (u < 0.5 ? -1 : 1) * amp * (0.55 + 0.45 * ((u * 2) % 1)); };
  const a0 = ang(s.i - 1), a1 = ang(s.i), k = Math.min(1, (t - s.start) / snap);
  return a0 + (a1 - a0) * (k * k * (3 - 2 * k));
}
/**
 * 届いた動きの順番（待人の 3 つ・応答体の 2 つ など）：区切りごとに前と違う動きを選び（種で乱す）、長さは min〜max 秒。
 * 戻り値 { idx, lt }：lt は区切りの始めからの秒から hold 秒を引いた物（始めの hold 秒は最初の形で止まる）。
 */
export function clipSchedule(t, seed, n, min = 3, max = 7, hold = 0.4) {
  const P = (min + max) / 2, J = (max - min) / 2, s = segOf(Math.max(0, t), seed, P, J);
  // n 個ずつの組ごとに並べ替え（種で選ぶ）。組の境で同じ物が続く時は、組の始めの 2 つを入れ替える
  const perm = b => { const a = []; for (let i = 0; i < n; i++) a.push(i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(hashU(seed ^ 0xC11D, b * 16 + i) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const permFixed = b => { const a = perm(b); if (n > 1 && a[0] === perm(b - 1)[n - 1]) [a[0], a[1]] = [a[1], a[0]]; return a; };
  const blk = Math.floor(s.i / n), idx = n > 1 ? permFixed(blk)[s.i - blk * n] : 0;
  return { idx, lt: Math.max(0, Math.max(0, t) - s.start - hold), dur: s.end - s.start };
}

// ───────────── 3：倒れ方（ひざが抜ける → 前へ崩れて片手をつく → 間 → 指が 1 回動く） ─────────────
const KN = { hipsY: -0.3, leftUpperLeg: [-0.55, 0, 0.08], rightUpperLeg: [-0.45, 0, -0.08], leftLowerLeg: [1.05, 0, 0], rightLowerLeg: [0.95, 0, 0], spine: [0.3, 0, 0.05], neck: [0.25, 0, 0], head: [0.25, 0, 0.1],
  leftUpperArm: [-0.2, 0, 0.25], rightUpperArm: [-0.35, 0, -0.2], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0] };
const DOWN = { hipsY: -0.74, leftUpperLeg: [-1.35, 0, 0.12], rightUpperLeg: [-1.25, 0, -0.12], leftLowerLeg: [2.05, 0, 0], rightLowerLeg: [1.95, 0, 0], leftFoot: [0.35, 0, 0], rightFoot: [0.35, 0, 0],
  spine: [0.95, 0, 0.08], chest: [0.25, 0, 0], neck: [0.3, 0, 0], head: [0.4, 0, 0.25],
  rightUpperArm: [-1.25, 0, -0.15], rightLowerArm: [-0.15, 0, 0], rightHand: [0.6, 0, 0], leftUpperArm: [-0.25, 0, 0.35], leftLowerArm: [-0.5, 0, 0] };
// 帰路：戸の方へ手を伸ばしたまま崩れる
const DOWN_KIRO = Object.assign({}, DOWN, { spine: [0.8, 0, 0], rightUpperArm: [-1.65, 0, -0.05], rightLowerArm: [-0.05, 0, 0], rightHand: [0.15, 0, 0], head: [-0.1, 0, 0.3] });
export const COLLAPSE = { knee: 0.25, down: 0.7, still: 1.0, finger: 1.3, mistDelay: 0.9 };
const mixP = (A, B, k) => { const o = {}; for (const n of new Set([...Object.keys(A), ...Object.keys(B)])) { if (n === 'hipsY') { o.hipsY = (A.hipsY || 0) + ((B.hipsY || 0) - (A.hipsY || 0)) * k; continue; } const a = A[n] || [0, 0, 0], b = B[n] || [0, 0, 0]; o[n] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; } return o; };
const sm = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** 倒れ方の姿勢（t：倒れてからの秒）。{ pose, rate } */
export function collapsePose(t, kind = '') {
  const D = kind === 'kiro' ? DOWN_KIRO : DOWN;
  let p;
  if (t < COLLAPSE.knee) p = mixP({}, KN, sm(t / COLLAPSE.knee));
  else p = mixP(KN, D, sm((t - COLLAPSE.knee) / (COLLAPSE.down - COLLAPSE.knee)));
  const f = t - COLLAPSE.finger;                                      // 指が 1 回だけ動く（手首を 0.25 秒で曲げて戻す）
  if (f > 0 && f < 0.25) { const h = p.rightHand || [0, 0, 0]; p.rightHand = [h[0] - Math.sin(f / 0.25 * Math.PI) * 0.45, h[1], h[2]]; }
  return { pose: p, rate: t < COLLAPSE.down ? 0.45 : 0.3 };
}
/** 倒れ方を使う異形（Poser の人型で、死ぬと立ったまま霧になっていた物） */
export const COLLAPSE_KINDS = ['kiro', 'heiten', 'kanja', 'mimic', 'machibito', 'outou', 'shuusha', 'touchoku'];

// ───────────── 4：足の滑らない位相の速さ ─────────────
/**
 * 姿勢の関数 poseAt(ph) の左脚（太もも・すね）の角度から、立脚の間（cos(ph)≤0）の「足が腰に対して後ろへ動く量」を測り、
 * 体の進みと釣り合う位相の速さ（ラジアン/m）を返す。L1・L2：太もも・すねの長さ（m）。測れない時は null。
 */
export function calibratePhaseRate(poseAt, L1 = 0.42, L2 = 0.42, N = 96) {
  const foot = ph => { const p = poseAt(ph); const u = (p.leftUpperLeg || [0])[0], k = (p.leftLowerLeg || [0])[0]; return -(L1 * Math.sin(u) + L2 * Math.sin(u + k)); };
  let sum = 0, n = 0; const h = 2 * Math.PI / N;
  for (let i = 0; i < N; i++) { const ph = i * h; if (Math.cos(ph) > 0) continue; sum += (foot(ph + h / 2) - foot(ph - h / 2)) / h; n++; }
  if (!n) return null; const m = sum / n; if (!(m < -1e-3)) return null;
  const r = -1 / m; return r > 0.5 && r < 30 ? r : null;
}
/** 立脚の間の足の滑り（m/s の平均の大きさ）：試験と撮影の表（slide） */
export function stanceSlide(poseAt, speed, rate, L1 = 0.42, L2 = 0.42, secs = 6, dt = 1 / 120) {
  let x = 0, ph = 0, prev = null, tot = 0, n = 0;
  for (let i = 0; i * dt < secs; i++) {
    x += speed * dt; ph += speed * dt * rate; const p = poseAt(ph, i * dt);
    const u = (p.leftUpperLeg || [0])[0], k = (p.leftLowerLeg || [0])[0], fx = x - (L1 * Math.sin(u) + L2 * Math.sin(u + k));
    if (prev != null && Math.cos(ph) <= 0) { tot += Math.abs(fx - prev) / dt; n++; } prev = fx;
  }
  return n ? tot / n : 0;
}

// ───────────── 13：止まって動く近づき方 ─────────────
/** st：{ mode, t }。cfg：{ go, stop }（秒）。戻り値：いま動いてよいか */
export function stopGo(st, dt, cfg, rnd = Math.random) {
  if (!st.mode) { st.mode = 'go'; st.t = cfg.go * (0.7 + rnd() * 0.6); }
  st.t -= dt;
  if (st.t <= 0) { if (st.mode === 'go') { st.mode = 'stop'; st.t = cfg.stop * (0.7 + rnd() * 0.6); } else { st.mode = 'go'; st.t = cfg.go * (0.7 + rnd() * 0.6); } }
  return st.mode === 'go';
}
/** 止まって動く異形（間合いの外だけ） */
export const APPROACH = { kiro: { go: 1.2, stop: 0.4 }, kanja: { go: 1.2, stop: 0.5 }, machibito: { go: 1.4, stop: 0.5 }, shuusha: { go: 1.2, stop: 0.45 } };

// ───────────── 11：遠くに立っているだけの影 ─────────────
// 区画ごとの立ち位置（廊下の奥）。kind：その区画の異形の網（使い回す種類）。
export const STALKER_SPOTS = {
  hospital: { kind: 'kanja', spots: [[0.6, -22.2], [0, -18.5], [-0.4, 0.5]] },
  tunnel: { kind: 'mimic', spots: [[0, -16], [0.4, -36.5], [0, -9]] },
  oldwing: { kind: 'shuusha', spots: [[0, -16.5], [0, -8], [0.3, 3]] },
};
export const STALKER = { minD: 15, maxD: 20, seeTime: 2, cooldown: 90, perVisit: 2, life: 14 };

// ───────────── 16：手持ちの揺れ（なめらかな雑音） ─────────────
/** -1..1 くらいの、なめらかにゆれる値（周波数の比が割り切れない sin を 3 本重ねる） */
export function smoothNoise(t, seed = 0) { const a = (seed % 97) * 0.37; return 0.55 * Math.sin(t * 0.83 + a) + 0.3 * Math.sin(t * 2.17 + a * 1.7 + 1.1) + 0.15 * Math.sin(t * 5.03 + a * 2.3 + 2.3); }
