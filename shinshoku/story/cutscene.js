// 演出場面の再生（CUTSCENE_SPEC §1）。場面は story/cutscenes.js のデータ（カメラの鍵・台詞・人物・出来事・音）。
// その場の 3D で描く（動画なし）。字幕は必ず出す。長押し 1 秒で飛ばせる（飛ばしても出来事・状態は同じに書かれる）。
// 純粋関数（camAt・lineAt・eventsBetween）は node でテストする。
const easeIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** カメラの鍵 [{t, pos, look, fov, ease}] の時刻 t の値 */
export function camAt(keys, t) {
  if (!keys || !keys.length) return null;
  if (t <= keys[0].t) return { pos: keys[0].pos, look: keys[0].look, fov: keys[0].fov ?? 50 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      if (b.cut) return { pos: a.pos, look: a.look, fov: a.fov ?? 50 };
      const k0 = (t - a.t) / Math.max(1e-6, b.t - a.t), k = b.ease === 'linear' ? k0 : easeIO(k0);
      return { pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: (a.fov ?? 50) + ((b.fov ?? 50) - (a.fov ?? 50)) * k };
    }
  }
  const L = keys[keys.length - 1]; return { pos: L.pos, look: L.look, fov: L.fov ?? 50 };
}
/** 時刻 t に出ている台詞（無ければ null） */
export function lineAt(lines, t) {
  let cur = null;
  for (const l of lines || []) if (t >= l.t && t < l.t + (l.dur ?? 2.6)) cur = l;
  return cur;
}
/** (t0, t1] の出来事 */
export function eventsBetween(list, t0, t1) { return (list || []).filter(e => e.t > t0 && e.t <= t1); }
/** 場面の長さ（最後の鍵・台詞・出来事のうち遅い方） */
export function duration(cs) {
  let d = cs.dur || 0;
  for (const k of cs.cam || []) d = Math.max(d, k.t);
  for (const l of cs.lines || []) d = Math.max(d, l.t + (l.dur ?? 2.6));
  for (const e of (cs.events || []).concat(cs.actors || [])) d = Math.max(d, e.t);
  return d;
}
/**
 * 場面の継ぎ目（遷移・ui/transition.js）。演出データで種類と長さを指定する：
 *  cs.intro  = { kind, dur?, hold? }：始まり（遊び→演出）。既定は 'dissolve'
 *  cs.outro  = { kind, dur?, hold? }：終わり（演出→遊び・次の演出）。既定は 'dissolve'
 *  カメラの鍵 { cut:true, tr:'dissolve'|'seep'|'black'|'white', trDur? }：場面の中の切り替え。tr の無い cut はそのまま切る
 * 'black'・'white' の覆っている間（out＋hold）は、演出の時計を止める（被写体が黒の裏で先に進まない）
 */
export const INTRO_DEFAULT = { kind: 'dissolve', dur: 0.8 }, OUTRO_DEFAULT = { kind: 'dissolve', dur: 0.9 };
export function introOf(cs) { return cs.intro === false ? null : Object.assign({}, INTRO_DEFAULT, cs.intro || {}); }
export function outroOf(cs, skipped) { if (cs.outro === false) return null; const o = Object.assign({}, OUTRO_DEFAULT, cs.outro || {}); return skipped ? { kind: 'dissolve', dur: 0.5 } : o; }
/** 場面の中の切り替えの遷移 [{ t, kind, dur }] */
export function cutTransitions(cs) { return (cs.cam || []).filter(k => k.cut && k.tr && k.tr !== 'cut').map(k => ({ t: k.t, kind: k.tr, dur: k.trDur })); }
/**
 * 動く被写体に合わせるカメラ（カメラの鍵の shot）。戦いの後など、人物の立ち位置が毎回ちがう場面でも「誰が・何をしているか」を映す。
 *  spec = { shot, on, from?, side?, dist?, h?, fov?, yaw? }
 *   'close'：on の顔の寄り（from の方から。無ければ on の向いている前から）
 *   'ots'  ：from の肩越しに on（話し相手）を映す
 *   'two'  ：on と from の二人を横から（成立ショット・間）
 *   'wide' ：on を中心に引き・高め（場所が分かる絵）
 *   'low'  ：on を下から見上げる（大きな相手・立ちはだかる）
 *   'back' ：on の後ろ姿の肩越しに、on が見ている先（from）
 *  ctx = { at(id) → { x, z, h（頭の高さ）, yaw } | null, clear(p, q) → 間に壁が無いか }
 *  壁に当たる時は、被写体のまわりを少しずつ回り、少しずつ寄せて、見通せる位置を探す（prev：前に選んだ候補を先に試す＝揺れない）
 */
export const SHOT_KINDS = ['close', 'ots', 'two', 'wide', 'low', 'back'];
const ANG = [0, 0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.35, -1.35, 1.9, -1.9, Math.PI];
export function shotCam(spec, ctx, prev = -1) {
  const A = ctx.at(spec.on); if (!A) return null;
  const B = spec.from ? ctx.at(spec.from) : null, side = spec.side || 1, k = spec.shot || 'close';
  const head = P => [P.x, P.h - 0.06, P.z];
  let base, look, subj, dist, y, fov, center;
  if (k === 'two' && B && Math.hypot(A.x - B.x, A.z - B.z) > (spec.maxSep || 6.5)) return shotCam(Object.assign({}, spec, { shot: 'back', dist: 2.2, h: A.h + 0.25 }), ctx, prev);   // 離れすぎ：肩越しに相手
  if (k === 'two' && B) {
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, sep = Math.hypot(A.x - B.x, A.z - B.z);
    base = Math.atan2(B.z - A.z, -(B.x - A.x)) * 1 + (side < 0 ? Math.PI : 0);   // 二人を結ぶ線に直角
    center = [mx, mz]; dist = spec.dist || Math.max(2.4, sep * 1.1 + 1.3); y = spec.h ?? 1.55; look = [mx, Math.min(A.h, B.h) - 0.25, mz]; subj = [head(A), head(B)]; fov = spec.fov || 42;
  } else if (k === 'ots' && B) {
    const dx = A.x - B.x, dz = A.z - B.z, L = Math.hypot(dx, dz) || 1;
    base = Math.atan2(-dx / L, -dz / L) - side * 0.42; center = [B.x, B.z]; dist = spec.dist || 1.05; y = spec.h ?? B.h + 0.08; look = head(A); subj = [head(A)]; fov = spec.fov || 40;
  } else if (k === 'back') {
    const tx = B ? B.x : A.x + Math.sin(A.yaw) * 4, tz = B ? B.z : A.z + Math.cos(A.yaw) * 4, dx = tx - A.x, dz = tz - A.z, L = Math.hypot(dx, dz) || 1;
    base = Math.atan2(-dx / L, -dz / L) - side * 0.35; center = [A.x, A.z]; dist = spec.dist || 1.4; y = spec.h ?? A.h + 0.15; look = [tx, B ? B.h - 0.2 : A.h - 0.1, tz]; subj = [head(A)]; fov = spec.fov || 44;
  } else {
    const face = B ? Math.atan2(B.x - A.x, B.z - A.z) : (spec.yaw ?? A.yaw);
    base = face + (k === 'close' ? side * 0.35 : 0); center = [A.x, A.z];
    if (k === 'wide') { dist = spec.dist || 6.5; y = spec.h ?? 3.0; look = [A.x, Math.max(0.9, A.h - 0.6), A.z]; fov = spec.fov || 48; }
    else if (k === 'low') { dist = spec.dist || 2.6; y = spec.h ?? 0.45; look = [A.x, A.h + 0.1, A.z]; fov = spec.fov || 46; }
    else { dist = spec.dist || 1.55; y = spec.h ?? A.h - 0.02; look = head(A); fov = spec.fov || 34; }
    subj = [head(A)];
  }
  const cand = (ci) => {
    const a = base + ANG[ci % ANG.length], sc = [1, 0.78, 0.58][Math.floor(ci / ANG.length)] || 0.5, d = dist * sc;
    return { pos: [center[0] + Math.sin(a) * d, y, center[1] + Math.cos(a) * d], look, fov };
  };
  // 画面の中（帯の内側）に入っているか：見ている向きと被写体への向きの角度（縦の画角の 0.62 倍まで）
  const inFrame = (c, q) => { const ax = c.look[0] - c.pos[0], ay = c.look[1] - c.pos[1], az = c.look[2] - c.pos[2], bx = q[0] - c.pos[0], by = q[1] - c.pos[1], bz = q[2] - c.pos[2]; const cs = (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz) || 1); return Math.acos(Math.max(-1, Math.min(1, cs))) < (c.fov * Math.PI / 180) * 0.62; };
  const ok = c => subj.every(q => ctx.clear(c.pos, q) && inFrame(c, q)) && ctx.clear([center[0], Math.max(0.6, Math.min(y, 1.4)), center[1]], c.pos);
  const N = ANG.length * 3;
  if (prev >= 0 && prev < N) { const c = cand(prev); if (ok(c)) return Object.assign(c, { ci: prev }); }
  for (let ci = 0; ci < N; ci++) { const c = cand(ci); if (ok(c)) return Object.assign(c, { ci }); }
  return Object.assign(cand(0), { ci: 0 });
}
/**
 * 声に合わせて場面の時間を延ばす（core/voice.js・tools/voice/）。lens[i] = 行 i の声の長さ（秒・0 は声なし）。
 *  ・声が次の行（最後の行は場面の終わり）までに収まる行は、字幕の dur を「声の長さ＋pad」まで延ばすだけ
 *  ・収まらない行は、次の行の少し前（at）に「間」を差し込む：at より後のカメラの鍵・行・出来事・人物・音をまとめて後ろへずらす
 *    （カメラは間の分だけゆっくり動く／切り替えの前の画で待つ。出来事と台詞の並びは変わらない）
 *  ・延ばす合計は元の長さの maxRatio（既定 30%）まで。超える分は延ばさない（声は次の行が出た時に止まる）
 * 返り値 { cs（元を変えない写し）, added（延ばした秒）, inserts }
 */
export function voiceWarp(cs, lens, opt = {}) {
  const pad = opt.pad ?? 0.3, D0 = duration(cs), budget = D0 * (opt.maxRatio ?? 0.3), lines = cs.lines || [];
  const order = lines.map((l, i) => i).sort((a, b) => lines[a].t - lines[b].t), inserts = []; let used = 0;
  order.forEach((i, k) => {
    const V = (lens && lens[i]) || 0; if (!V) return;
    const L = lines[i]; let nx = null; for (let j = k + 1; j < order.length; j++) if (lines[order[j]].t > L.t + 1e-6) { nx = lines[order[j]].t; break; }
    const end = nx ?? D0, add = Math.min(V + pad - (end - L.t), budget - used);
    if (add > 0.01) { inserts.push({ at: Math.max(L.t + 0.05, end - 0.12), add: +add.toFixed(3) }); used += add; }
  });
  if (!lens || !lens.some(v => v > 0)) return { cs, added: 0, inserts };
  const map = t => { let o = t; for (const s of inserts) if (t >= s.at) o += s.add; return +o.toFixed(4); };
  const mv = arr => (arr ? arr.map(o => Object.assign({}, o, { t: map(o.t) })) : arr);
  const out = Object.assign({}, cs, {
    cam: mv(cs.cam), events: mv(cs.events), actors: mv(cs.actors), sounds: mv(cs.sounds),
    lines: lines.map((l, i) => {
      const V = (lens && lens[i]) || 0; if (!V) return Object.assign({}, l, { t: map(l.t) });
      const lastT = lines[order[order.length - 1]].t, room = l.t >= lastT - 1e-6 ? map(D0) - map(l.t) : Infinity;   // 最後の行は場面の終わりを越えない（延ばす上限を守る）
      return Object.assign({}, l, { t: map(l.t), dur: Math.max(l.dur ?? 2.6, +Math.min(V + pad, room).toFixed(3)) });
    }),
  });
  if (cs.dur) out.dur = map(cs.dur);
  return { cs: out, added: +used.toFixed(3), inserts };
}
/** 原文の台詞（fixed:true）を集める（テスト用） */
export function fixedLines(all) { const o = []; for (const cs of Object.values(all)) for (const l of cs.lines || []) if (l.fixed) o.push({ id: cs.id, who: l.who, text: l.text }); return o; }

/** 再生する人（ゲームにつなぐ）。host = { setCam(pos,look,fov), subtitle(who,text|null), letterbox(on), event(name,arg), actor(step), sound(name), done(cs) } */
export class CutscenePlayer {
  constructor(host) { this.host = host; this.cs = null; this.t = 0; this.hold = 0; }
  get active() { return !!this.cs; }
  play(cs, onDone) {
    const lens = this.host.voiceLens ? this.host.voiceLens(cs) : null;   // 声の長さ（対応表が読めていない・声が切の時は null＝今のまま）
    if (lens) cs = voiceWarp(cs, lens).cs;
    this.keys = (cs.cam || []).map(k => (k.shot ? Object.assign({}, k, { pos: null, look: null, fovFixed: k.fov }) : k)); this.hasShot = this.keys.some(k => k.shot);
    this.cs = cs; this.t = 0; this.prevT = -1e-6; this.skipped = false; this.dur = duration(cs); this.onDone = onDone; this.hold = 0; this.lastLine = null;
    const it = introOf(cs); if (it && this.host.transition) this.host.transition(it.kind, it, 'intro');
    this.host.letterbox(cs.letterbox !== false, cs);
    for (const a of (cs.actors || []).filter(a => a.t <= 0)) this.host.actor(a, true);
    this._apply(0);
  }
  /** shot の鍵：その鍵へ向かう間とそこに留まる間は、毎こま被写体に合わせて置き直す（host.shot が無い時は前の鍵のまま） */
  _keys(t) {
    const K = this.keys; if (!this.hasShot) return K;
    for (let i = 0; i < K.length; i++) {
      const k = K[i]; if (!k.shot) continue;
      const from = i > 0 ? K[i - 1].t : -1, until = i < K.length - 1 ? K[i + 1].t : Infinity;
      if (k.pos && !(t >= from - 1e-6 && t <= until + 1e-6)) continue;
      const r = this.host.shot ? this.host.shot(k.shot, k.ci ?? -1) : null;
      if (r) { k.pos = r.pos; k.look = r.look; k.fov = k.fovFixed ?? r.fov; k.ci = r.ci; }
      else if (!k.pos) { const p = K[i - 1] || K[i + 1] || { pos: [0, 1.6, 0], look: [0, 1.4, -1] }; k.pos = p.pos; k.look = p.look; }
    }
    return K;
  }
  _apply(t) {
    const cs = this.cs;
    if (!this.skipping && this.host.transition) for (const k of cs.cam || []) if (k.cut && k.tr && k.tr !== 'cut' && k.t > this.prevT && k.t <= t) this.host.transition(k.tr, { dur: k.trDur }, 'cut');
    const cam = camAt(this._keys(t), t); if (cam) this.host.setCam(cam.pos, cam.look, cam.fov);
    for (const e of eventsBetween(cs.events, this.prevT, t)) this.host.event(e.do, e.arg, e);
    for (const a of eventsBetween(cs.actors, Math.max(0, this.prevT), t)) this.host.actor(a, !!this.skipping);
    for (const s of eventsBetween(cs.sounds, this.prevT, t)) this.host.sound(s.s, s);
    const L = lineAt(cs.lines, t);
    if (L !== this.lastLine) { this.lastLine = L; this.host.subtitle(L ? L.who : null, L ? L.text : null, L); }
    this.prevT = t;
  }
  /** dt：実時間。input：{ skipHeld:bool, advance:bool, freeze:bool（画面が暗転・写しで覆われている間：時計を進めない） } */
  update(dt, input = {}) {
    if (!this.cs) return;
    if (input.skipHeld && this.cs.skippable !== false) { this.hold += dt; if (this.hold >= 1.0) return this.skip(); } else this.hold = 0;
    if (input.advance && this.lastLine) {                         // 台詞を早送り：次の台詞の時刻まで飛ぶ
      const nx = (this.cs.lines || []).find(l => l.t > this.t + 0.05);
      if (nx) this.t = Math.max(this.t, nx.t - 0.01);
    }
    if (!input.freeze) this.t += dt;
    if (this.t >= this.dur) { this._apply(this.dur); return this.finish(); }
    this._apply(this.t);
  }
  skip() { if (!this.cs) return; this.skipping = true; this.t = this.dur; this._apply(this.dur); this.skipping = false; this.skipped = true; this.finish(); }
  finish() {
    const cs = this.cs; this.cs = null;
    const ot = outroOf(cs, this.skipped); if (ot && this.host.transition) this.host.transition(ot.kind, ot, 'outro');
    this.host.subtitle(null, null); this.host.letterbox(false, cs);
    this.host.done(cs); if (this.onDone) this.onDone(cs);
  }
}
