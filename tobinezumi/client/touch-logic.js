// tobinezumi/client/touch-logic.js — タッチ操作の「考える部分」だけ（DOM なし。tests/tobinezumi-touch.test.mjs で確かめる）
// ・stickVector：仮想スティックの傾き → mx/my（-1/0/1 の 8 方向。サーバーの入力と同じ形）
// ・steerToward：タップした地点へ自動で跳ねていくときの 1 歩ぶんの向き
// ・pickTapTarget：タップした所にある物（採集物・巣穴・ほかのトビネズミ）
// ・Gestures：指の動き → タップ／ドラッグ（ツール操作）／2 本指のピンチ・パン
// ・touchLayout：画面の向きと大きさ → ゲーム画面の置き場所と内部解像度

const T8 = Math.tan(Math.PI / 8);   // 22.5° の境目（8 方向に分ける）

/** 傾き (dx,dy)（画面 px）を 8 方向の mx/my に。半径 radius に対して dead 未満は 0。 */
export function stickVector(dx, dy, radius, dead = 0.22) {
  const len = Math.hypot(dx, dy);
  const mag = radius > 0 ? Math.min(1, len / radius) : 0;
  if (mag < dead || len === 0) return { mx: 0, my: 0, mag, nx: 0, ny: 0 };
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const mx = ax > ay * T8 ? Math.sign(dx) : 0;
  const my = ay > ax * T8 ? Math.sign(dy) : 0;
  const k = Math.min(len, radius) / len;
  return { mx, my, mag, nx: dx * k, ny: dy * k };
}

/** (sx,sy) から (tx,ty) へ向かう 8 方向の入力。arrive 以内なら done。 */
export function steerToward(sx, sy, tx, ty, arrive = 4) {
  const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  if (d <= arrive) return { mx: 0, my: 0, done: true, dist: d };
  // 近いときは境目をゆるくして、行き過ぎ・ジグザグを防ぐ
  const slack = Math.min(3, d * 0.25);
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const mx = ax > Math.max(slack, ay * T8) ? Math.sign(dx) : 0;
  const my = ay > Math.max(slack, ax * T8) ? Math.sign(dy) : 0;
  if (!mx && !my) return { mx: Math.sign(dx), my: Math.sign(dy), done: false, dist: d };
  return { mx, my, done: false, dist: d };
}

/**
 * タップした地点 (x,y)（世界座標）にある物。近い順・種類の優先（採集物 > 巣穴 > トビネズミ）。
 * cands = { resources:[{id,x,y,pending}], entrances:[{x,y,...}], players:[{id,x,y}] }
 */
export function pickTapTarget(x, y, { resources = [], entrances = [], players = [] } = {}, { resR = 13, entR = 15, playerR = 13 } = {}) {
  let best = null, bd = 1e9;
  const consider = (kind, ref, px, py, r, bias) => {
    const d = Math.hypot(px - x, py - y);
    if (d <= r && d + bias < bd) { bd = d + bias; best = { kind, ref, x: px, y: py }; }
  };
  for (const r of resources) if (!r.pending) consider('res', r, r.x, r.y - 3, resR, 0);
  for (const e of entrances) consider('ent', e, e.x, e.y, entR, 2);
  for (const p of players) consider('player', p, p.x, p.y - 10, playerR, 4);   // 体は足元より上に描く
  return best;
}

/**
 * 指の動きの分類。down/move/up/tick は「起きたこと」の配列を返す。
 *  - 1 本指：動かさずに離す → tap。slop px 以上動かす・holdMs 以上押し続ける → start → drag… → end
 *  - 2 本指：pinch-start → pinch（scale・中心の移動）… → pinch-end。1 本指の操作が始まっていたら abort
 */
export class Gestures {
  constructor({ slop = 8, holdMs = 200 } = {}) {
    this.slop = slop; this.holdMs = holdMs;
    this.pts = new Map();     // id → {x,y,x0,y0,t0}
    this.mode = 'idle';       // idle | pending | drag | pinch | wait（指がぜんぶ離れるのを待つ）
    this.pinch0 = null;
  }
  get count() { return this.pts.size; }
  _pair() {
    const [a, b] = [...this.pts.values()];
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  }
  down(id, x, y, t) {
    const out = [];
    this.pts.set(id, { x, y, x0: x, y0: y, t0: t });
    if (this.pts.size === 1 && (this.mode === 'idle' || this.mode === 'wait')) { this.mode = 'pending'; this.first = id; }
    else if (this.pts.size === 2 && this.mode !== 'pinch') {
      if (this.mode === 'drag') out.push({ type: 'abort' });
      this.mode = 'pinch';
      const p = this._pair(); this.pinch0 = p;
      out.push({ type: 'pinch-start', cx: p.cx, cy: p.cy });
    }
    return out;
  }
  move(id, x, y, t) {
    const p = this.pts.get(id);
    if (!p) return [];
    p.x = x; p.y = y;
    if (this.mode === 'pending' && id === this.first && Math.hypot(x - p.x0, y - p.y0) >= this.slop) {
      this.mode = 'drag';
      return [{ type: 'start', x: p.x0, y: p.y0 }, { type: 'drag', x, y }];
    }
    if (this.mode === 'drag' && id === this.first) return [{ type: 'drag', x, y }];
    if (this.mode === 'pinch' && this.pts.size >= 2) {
      const q = this._pair(), p0 = this.pinch0;
      return [{ type: 'pinch', cx: q.cx, cy: q.cy, dx: q.cx - p0.cx, dy: q.cy - p0.cy, scale: q.d / p0.d, cx0: p0.cx, cy0: p0.cy }];
    }
    void t;
    return [];
  }
  up(id, x, y, t) {
    const p = this.pts.get(id);
    if (!p) return [];
    this.pts.delete(id);
    const out = [];
    if (this.mode === 'pending' && id === this.first) { out.push({ type: 'tap', x: p.x0, y: p.y0, ms: t - p.t0 }); this.mode = this.pts.size ? 'wait' : 'idle'; }
    else if (this.mode === 'drag' && id === this.first) { out.push({ type: 'end', x, y }); this.mode = this.pts.size ? 'wait' : 'idle'; }
    else if (this.mode === 'pinch') { if (this.pts.size < 2) { out.push({ type: 'pinch-end' }); this.mode = this.pts.size ? 'wait' : 'idle'; } }
    else if (!this.pts.size) this.mode = 'idle';
    return out;
  }
  /** 指が取り消された（電話の着信など）：始まっていた操作は取りやめ */
  cancel(id) {
    if (!this.pts.has(id)) return [];
    this.pts.delete(id);
    const out = [];
    if (this.mode === 'drag') out.push({ type: 'abort' });
    if (this.mode === 'pinch') out.push({ type: 'pinch-end' });
    this.mode = this.pts.size ? 'wait' : 'idle';
    return out;
  }
  /** 押したまま holdMs たったら、その場でツール操作を始める（長押しで掘りはじめる） */
  tick(t) {
    if (this.mode !== 'pending') return [];
    const p = this.pts.get(this.first);
    if (!p || t - p.t0 < this.holdMs) return [];
    this.mode = 'drag';
    return [{ type: 'start', x: p.x0, y: p.y0 }, ...(p.x !== p.x0 || p.y !== p.y0 ? [{ type: 'drag', x: p.x, y: p.y }] : [])];
  }
  reset() { this.pts.clear(); this.mode = 'idle'; this.pinch0 = null; }
}

/** ピンチの倍率 → 決まった段階のどれかに寄せる */
export function snapZoom(z, steps = [0.5, 0.75, 1, 1.5, 2, 3]) {
  let best = steps[0];
  for (const s of steps) if (Math.abs(Math.log(s / z)) < Math.abs(Math.log(best / z))) best = s;
  return best;
}

/**
 * 画面の配置。vw,vh は CSS px、safe = {t,r,b,l}（ノッチ）。touch でないときは従来どおり 480×270 の整数倍。
 * controls：タッチ操作のボタンを出す画面か（タイトルは出さない）。縦向きなら下に操作の帯を取る。
 * pref：'auto' | 'small'（内部の画素を多めに＝絵が小さい）| 'large'
 * 返り値：{ W, H, scale, left, top, width, height, portrait, controlsH }
 */
export function touchLayout(vw, vh, safe = { t: 0, r: 0, b: 0, l: 0 }, { controls = true, pref = 'auto', strip = 0 } = {}) {
  const aw0 = Math.max(1, vw - safe.l - safe.r), ah0 = Math.max(1, vh - safe.t - safe.b);
  const portrait = ah0 > aw0 * 1.05;
  const short = Math.min(aw0, ah0);
  const tablet = short >= 600;
  let controlsH = 0;
  // strip：操作の帯の高さ（中身に合わせて画面が決める）。無ければ画面の約 1/4
  if (portrait && controls) controlsH = Math.round(strip > 0 ? Math.min(strip, ah0 * 0.4) : Math.max(190, Math.min(tablet ? 300 : 330, ah0 * (tablet ? 0.27 : 0.36))));
  const aw = aw0, ah = Math.max(1, ah0 - controlsH);
  let [MW, MH] = portrait ? (tablet ? [400, 360] : [240, 300]) : (tablet ? [480, 270] : [416, 234]);
  const k = pref === 'small' ? 1.25 : pref === 'large' ? 0.8 : 1;
  MW *= k; MH *= k;
  let s = Math.min(aw / MW, ah / MH);
  if (s < 1) s = Math.min(aw / MW, ah / MH);   // とても小さい画面でも縮小で収める
  let W = Math.max(160, Math.min(720, Math.round(aw / s)));
  let H = Math.max(140, Math.min(560, Math.round(ah / s)));
  s = Math.min(aw / W, ah / H);
  const width = Math.round(W * s), height = Math.round(H * s);
  const left = Math.round(safe.l + (aw - width) / 2);
  const top = Math.round(safe.t + (portrait ? 0 : (ah - height) / 2));
  return { W, H, scale: s, left, top, width, height, portrait, controlsH, tablet };
}

/**
 * Ver.0.7：上の案内（地上のヘルプの 1 行）とトーストが重ならない置き方（DOM なし。px・同じ基準の座標）。
 * help = {left, right, top, height}（案内のふだんの位置）・toasts = {left, right, top, bottom}（トーストの箱。無ければ null）
 * 重なるなら、案内をトーストのすぐ下（gap あけて）へ下げる。下げると limit（下げてよい案内の下端）をこえるなら、トーストが出ている間は隠す。
 * 返り値 {top, hidden, moved}
 */
export function placeHelpLine(help, toasts, { limit = Infinity, gap = 4 } = {}) {
  if (!help) return null;
  const keep = { top: help.top, hidden: false, moved: false };
  if (!toasts || !(toasts.bottom > toasts.top)) return keep;
  const hb = help.top + help.height;
  const x = help.left < toasts.right && toasts.left < help.right;
  const y = help.top < toasts.bottom + gap && toasts.top < hb + gap;
  if (!x || !y) return keep;
  const top = Math.ceil(toasts.bottom + gap);
  if (top + help.height > limit) return { top: help.top, hidden: true, moved: false };
  return { top, hidden: false, moved: true };
}
/** 2 つの箱が重なるか（{left, right, top, bottom}） */
export const boxesOverlap = (a, b) => !!(a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);

/**
 * Ver.0.9：PC（マウスとキーボード）の画面。拡大率は整数のまま（ドットがくっきり）、内部解像度を窓に合わせて広げて
 * 黒い余白をなくす（480×270 より狭くはしない・広げすぎない：PC_MAX）。pref＝'auto' か '1'〜'4'（メニューの拡大率）。
 * 返り値 {W, H, scale}
 */
export const PC_MAX = { W: 720, H: 450 };
export function pcLayout(vw, vh, pref = 'auto') {
  const fit = Math.min(vw / 480, vh / 270);
  let s = fit < 1 ? fit : Math.max(1, Math.floor(fit));               // とても小さい窓だけは縮小
  if (pref !== 'auto' && +pref) s = Math.min(Math.max(1, +pref), Math.max(1, Math.floor(fit)) || 1);
  const W = Math.max(480, Math.min(PC_MAX.W, Math.floor(vw / s)));
  const H = Math.max(270, Math.min(PC_MAX.H, Math.floor(vh / s)));
  return { W, H, scale: s };
}
