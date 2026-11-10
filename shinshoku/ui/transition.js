// 場面の継ぎ目の演出（遷移）。前の画を写し取って（凍らせて）画面に重ね、種類ごとに消していく。
//  cut      ：そのまま切り替える（何もしない）
//  dissolve ：前の画がゆっくり溶けて、次の画が透けて出る
//  seep     ：境界のにじみ＝紫に光る縁のまだらで、前の画が食われるように消える（本作の「境界」の色）
//  black    ：黒へゆっくり落ちて、少し置いて明ける（時間の経過・場所の移動）
//  white    ：白く飛んで明ける（変身・強い光）
//  area     ：区画の移動（黒へ落ちる → 読み込み → 場所の名前を出して間を置く → ゆっくり明ける）
// 長さ・間は演出データから { kind, dur?, hold? } で上書きできる（story/cutscene.js：intro・outro・カメラの鍵の tr）。
// 純粋関数（transPlan・transAt）は node でテストする。描く方（TransitionFX）は画面（DOM）が要る。

/** 種類ごとの既定の長さ（秒）。out：前の画が消えるまで／hold：覆ったまま／in：次の画が出るまで */
export const TRANS = {
  cut: { out: 0, hold: 0, in: 0 },
  dissolve: { out: 0, hold: 0, in: 0.8 },
  seep: { out: 0, hold: 0, in: 1.3 },
  black: { out: 0.6, hold: 0.35, in: 0.9 },
  white: { out: 0.22, hold: 0.12, in: 1.0 },
  area: { out: 0.6, hold: 0.55, in: 1.1 },
};
export const TRANS_KINDS = Object.keys(TRANS);

/** 遷移の計画：{ kind, out, hold, in, total, color }。opt = { dur（全体の長さ。比で割り振る）, hold（覆う間を足す・延ばす）, out, in } */
export function transPlan(kind, opt = {}) {
  const k = TRANS[kind] ? kind : 'dissolve', B = TRANS[k];
  let out = B.out, hold = B.hold, inn = B.in;
  if (opt.dur != null && k !== 'cut') { const s = opt.dur / Math.max(1e-6, out + hold + inn); out *= s; hold *= s; inn *= s; }
  if (opt.out != null) out = opt.out; if (opt.in != null) inn = opt.in; if (opt.hold != null) hold = Math.max(hold, opt.hold);
  const color = k === 'white' ? [246, 242, 255] : [0, 0, 0];
  return { kind: k, out, hold, in: inn, total: out + hold + inn, color };
}

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

/**
 * 時刻 t（秒）の重ね方。
 *  snap：前の画の不透明度（0..1）、seep：まだらの進み（0..1。seep の時だけ）、veil：黒／白の幕の不透明度、
 *  phase：'out'|'hold'|'in'|'done'、covering：画面が前の画か幕で覆われている（この間は演出の時計を止める）
 */
export function transAt(plan, t) {
  const p = plan; if (!p || p.kind === 'cut' || t >= p.total) return { snap: 0, veil: 0, seep: 1, phase: 'done', covering: false };
  if (p.kind === 'dissolve') { const k = smooth(t / Math.max(1e-6, p.in)); return { snap: 1 - k, veil: 0, seep: 0, phase: 'in', covering: false }; }
  if (p.kind === 'seep') { const k = clamp01(t / Math.max(1e-6, p.in)); return { snap: 1, veil: 0, seep: k, phase: 'in', covering: false }; }
  // 幕（黒・白・区画）
  if (t < p.out) { const k = smooth(t / p.out); return { snap: 1, veil: k, seep: 0, phase: 'out', covering: true }; }
  if (t < p.out + p.hold) return { snap: 0, veil: 1, seep: 0, phase: 'hold', covering: true };
  const k = smooth((t - p.out - p.hold) / Math.max(1e-6, p.in));
  return { snap: 0, veil: 1 - k, seep: 0, phase: 'in', covering: false };
}

/** 画面に重ねる係（#sh-ui の中のキャンバス 1 枚）。game の毎こまの描画の後で tick(dt) を呼ぶ */
export class TransitionFX {
  constructor(root) {
    const c = this.el = document.createElement('canvas'); c.className = 'sh-trans'; root.appendChild(c);
    this.g = c.getContext('2d'); this.snap = document.createElement('canvas'); this.sg = this.snap.getContext('2d');
    this.mask = document.createElement('canvas'); this.mask.width = 128; this.mask.height = 72; this.mg = this.mask.getContext('2d');
    this.glow = document.createElement('canvas'); this.glow.width = 128; this.glow.height = 72; this.gg = this.glow.getContext('2d');
    this.mi = this.mg.createImageData(128, 72); this.gi = this.gg.createImageData(128, 72);
    this.noise = makeNoise(128, 72, 7);
    this.plan = null; this.t = 0; this.label = null; this.holdExtra = 0;
  }
  get active() { return !!this.plan; }
  /** 覆っている間（前の画か幕）。演出の時計・遊びを止める */
  covering() { return !!this.plan && transAt(this.plan, this.t).covering; }
  phase() { return this.plan ? transAt(this.plan, this.t).phase : 'done'; }
  size() {
    const w = Math.max(2, Math.min(960, Math.round(innerWidth))), h = Math.max(2, Math.round(w * innerHeight / Math.max(1, innerWidth)));
    for (const c of [this.el, this.snap]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return [w, h];
  }
  /** 遷移を始める。src：前の画（WebGL のキャンバス：同じ処理の中で描き直した物）。label：{ title, tip }（区画の移動の時の場所の名前） */
  start(plan, src, label) {
    const [w, h] = this.size();
    // 遷移の途中で次の遷移：今見えている重ねごと写す（前の画が急に戻らない）
    const keep = this.plan && this.el.style.opacity !== '0';
    if (keep) { this.sg.clearRect(0, 0, w, h); try { if (src) this.sg.drawImage(src, 0, 0, w, h); } catch (e) { /* 読めない時は今の重ねだけ */ } this.sg.drawImage(this.el, 0, 0, w, h); }
    else { this.sg.fillStyle = '#000'; this.sg.fillRect(0, 0, w, h); try { if (src) this.sg.drawImage(src, 0, 0, w, h); } catch (e) { /* 写せない時は黒から */ } }
    this.plan = plan; this.t = 0; this.label = label || null; this.holdExtra = 0; this.el.style.opacity = '1';
    this.draw();
  }
  /** 覆っている間を延ばす（章の札を黒の上に出す・読み込みを待つ） */
  extendHold(sec) {
    const p = this.plan; if (!p) return false;
    const a = transAt(p, this.t); if (a.phase === 'in' || a.phase === 'done') return false;
    const want = this.t + sec - p.out; if (want > p.hold) { p.total += want - p.hold; p.hold = want; }
    return true;
  }
  /** 毎こま */
  tick(dt) { if (!this.plan) return; this.t += dt; if (this.t >= this.plan.total) { this.stop(); return; } this.draw(); }
  stop() { this.plan = null; this.label = null; this.el.style.opacity = '0'; }
  draw() {
    const p = this.plan, a = transAt(p, this.t), g = this.g, [w, h] = [this.el.width, this.el.height];
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
    if (p.kind === 'seep') { this.drawSeep(a.seep, w, h); return; }
    if (a.snap > 0) { g.globalAlpha = a.snap; g.drawImage(this.snap, 0, 0, w, h); g.globalAlpha = 1; }
    if (a.veil > 0) {
      const [r, gg, b] = p.color; g.fillStyle = `rgba(${r},${gg},${b},${a.veil.toFixed(3)})`; g.fillRect(0, 0, w, h);
      // 黒の時は、幕の縁に紫が少しだけにじむ（境界の色）
      if (p.kind !== 'white' && a.veil > 0.05 && a.veil < 0.98) { const rg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.hypot(w, h) * 0.6); rg.addColorStop(0, 'rgba(60,20,110,0)'); rg.addColorStop(1, `rgba(70,30,130,${(0.35 * Math.sin(a.veil * Math.PI)).toFixed(3)})`); g.fillStyle = rg; g.fillRect(0, 0, w, h); }
    }
    if (this.label && p.kind === 'area') this.drawLabel(a, w, h);
  }
  drawLabel(a, w, h) {
    const p = this.plan, g = this.g, t = this.t;
    const k = t < p.out ? smooth((t - p.out * 0.6) / (p.out * 0.4)) : a.phase === 'hold' ? 1 : 1 - smooth((t - p.out - p.hold) / Math.max(1e-6, p.in * 0.45));
    if (k <= 0) return;
    const fam = getComputedStyle(this.el).fontFamily || 'sans-serif', s = Math.max(14, Math.min(22, w / 40));
    g.globalAlpha = k; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(s * 1.15)}px ${fam}`; g.fillStyle = '#e8dcff'; g.shadowColor = '#6a3ab0'; g.shadowBlur = 14;
    g.fillText(spaced(this.label.title || ''), w / 2, h / 2 - s * 0.6); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(200,170,255,.45)'; g.lineWidth = 1; const lw = Math.min(w * 0.3, 220) * k; g.beginPath(); g.moveTo(w / 2 - lw / 2, h / 2 + s * 0.35); g.lineTo(w / 2 + lw / 2, h / 2 + s * 0.35); g.stroke();
    if (this.label.tip) { g.font = `${Math.round(s * 0.68)}px ${fam}`; g.fillStyle = '#b8a8d8'; g.fillText(this.label.tip, w / 2, h / 2 + s * 1.3, w * 0.86); }
    g.globalAlpha = 1;
  }
  /** 境界のにじみ：まだらのしきいを進め、前の画をその形で抜く。抜ける縁は紫に光る */
  drawSeep(k, w, h) {
    const g = this.g, N = this.noise, M = this.mi.data, G = this.gi.data, e = k * 1.24 - 0.12;
    for (let i = 0, j = 0; i < N.length; i++, j += 4) {
      const d = N[i] - e, al = clamp01(d * 9 + 0.5), edge = Math.exp(-d * d * 700) * (k < 0.98 ? 1 : 0);
      M[j] = M[j + 1] = M[j + 2] = 255; M[j + 3] = al * 255;
      G[j] = 176; G[j + 1] = 112; G[j + 2] = 255; G[j + 3] = edge * 150;
    }
    this.mg.putImageData(this.mi, 0, 0); this.gg.putImageData(this.gi, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(this.snap, 0, 0, w, h);
    g.fillStyle = `rgba(70,30,130,${(0.22 * Math.sin(clamp01(k * 1.4) * Math.PI)).toFixed(3)})`; g.fillRect(0, 0, w, h);   // 食われる側が少し紫に沈む
    g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mask, 0, 0, w, h);
    g.globalCompositeOperation = 'lighter'; g.drawImage(this.glow, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
}
const spaced = s => [...s].join(' ');
/** 滑らかなまだら（値のノイズを 3 段重ねる・0..1） */
export function makeNoise(w, h, seed = 1) {
  let a = seed * 9301 + 49297; const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const out = new Float32Array(w * h);
  for (const [cell, amp] of [[18, 0.55], [8, 0.3], [3, 0.15]]) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, grid = Array.from({ length: gw * gh }, rnd);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), sx = smooth(fx - x0), sy = smooth(fy - y0);
      const v00 = grid[y0 * gw + x0], v10 = grid[y0 * gw + x0 + 1], v01 = grid[(y0 + 1) * gw + x0], v11 = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] += amp * ((v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy);
    }
  }
  // 真ん中から先に抜ける偏り（次の画の真ん中＝被写体が先に見え、前の画は縁に残って消える）
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) / Math.SQRT2; out[y * w + x] = out[y * w + x] * 0.7 + r * 0.3; }
  // 順位で 0..1 に並べ直す（値がそろって分かれる＝抜ける面積が時間にまっすぐ比例する。前は真ん中の値に固まり、途中で一気に抜けた）
  const idx = Array.from(out.keys()).sort((a, b) => out[a] - out[b]), eq = new Float32Array(out.length);
  idx.forEach((k, r) => { eq[k] = r / (out.length - 1); });
  return eq;
}
