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
/** 原文の台詞（fixed:true）を集める（テスト用） */
export function fixedLines(all) { const o = []; for (const cs of Object.values(all)) for (const l of cs.lines || []) if (l.fixed) o.push({ id: cs.id, who: l.who, text: l.text }); return o; }

/** 再生する人（ゲームにつなぐ）。host = { setCam(pos,look,fov), subtitle(who,text|null), letterbox(on), event(name,arg), actor(step), sound(name), done(cs) } */
export class CutscenePlayer {
  constructor(host) { this.host = host; this.cs = null; this.t = 0; this.hold = 0; }
  get active() { return !!this.cs; }
  play(cs, onDone) {
    this.cs = cs; this.t = 0; this.prevT = -1e-6; this.dur = duration(cs); this.onDone = onDone; this.hold = 0; this.lastLine = null;
    this.host.letterbox(cs.letterbox !== false, cs);
    for (const a of (cs.actors || []).filter(a => a.t <= 0)) this.host.actor(a, true);
    this._apply(0);
  }
  _apply(t) {
    const cs = this.cs;
    const cam = camAt(cs.cam, t); if (cam) this.host.setCam(cam.pos, cam.look, cam.fov);
    for (const e of eventsBetween(cs.events, this.prevT, t)) this.host.event(e.do, e.arg, e);
    for (const a of eventsBetween(cs.actors, Math.max(0, this.prevT), t)) this.host.actor(a, !!this.skipping);
    for (const s of eventsBetween(cs.sounds, this.prevT, t)) this.host.sound(s.s, s);
    const L = lineAt(cs.lines, t);
    if (L !== this.lastLine) { this.lastLine = L; this.host.subtitle(L ? L.who : null, L ? L.text : null, L); }
    this.prevT = t;
  }
  /** dt：実時間。input：{ skipHeld:bool, advance:bool } */
  update(dt, input = {}) {
    if (!this.cs) return;
    if (input.skipHeld && this.cs.skippable !== false) { this.hold += dt; if (this.hold >= 1.0) return this.skip(); } else this.hold = 0;
    if (input.advance && this.lastLine) {                         // 台詞を早送り：次の台詞の時刻まで飛ぶ
      const nx = (this.cs.lines || []).find(l => l.t > this.t + 0.05);
      if (nx) this.t = Math.max(this.t, nx.t - 0.01);
    }
    this.t += dt;
    if (this.t >= this.dur) { this._apply(this.dur); return this.finish(); }
    this._apply(this.t);
  }
  skip() { if (!this.cs) return; this.skipping = true; this.t = this.dur; this._apply(this.dur); this.skipping = false; this.skipped = true; this.finish(); }
  finish() {
    const cs = this.cs; this.cs = null; this.host.subtitle(null, null); this.host.letterbox(false, cs);
    this.host.done(cs); if (this.onDone) this.onDone(cs);
  }
}
