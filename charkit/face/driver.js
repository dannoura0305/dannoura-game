// 顔を動かす係（瞬き・表情・文字からの口・視線）。docs/wakaba-charkit/12 フェーズ 7・13 §1.3。
// モデルの違い（コードで組んだ顔の絵／VRM の表情）は「つなぎ（adapter）」で吸収する：
//   adapter = { setBlink(k 0..1), setVisemes({aa,ih,ou,ee,oh}), setGaze(x,y -1..1), setExpr(name) }
// 表情の名前は本作の名前（smile・angry・sad・surprised・calm・serious・neutral）。VRM の名前への対応は EXPR_TO_VRM。
import { timeline, weightsAt } from './lipsync.js';

export const EXPR_TO_VRM = { neutral: 'neutral', smile: 'happy', angry: 'angry', sad: 'sad', surprised: 'surprised', calm: 'relaxed', serious: 'neutral', talk: 'neutral' };

/** 決まった種から作る乱数（試験で同じ結果） */
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class FaceDriver {
  /** opt：{ blinkPerMin（既定 16）, blinkMs（既定 130）, gain, offsetMs, seed, gazeShiftPerMin } */
  constructor(adapter, opt = {}) {
    this.ad = adapter || {}; this.opt = opt; this.rand = rng(opt.seed || 7);
    this.t = 0; this.nextBlink = 1.2 + this.rand() * 2; this.blinkT = -1; this.double = false;
    this.tl = null; this.tlT = 0; this.gaze = { x: 0, y: 0, tx: 0, ty: 0 }; this.saccT = 2;
    this.visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    this.blinks = 0; this.expr = null; this.closedEyes = false;
  }
  /** 字幕の文字を話す（dur：字幕の表示時間 秒） */
  say(text, dur) { this.tl = timeline(text, dur, { offset: (this.opt.offsetMs || 0) / 1000 }); this.tlT = 0; }
  stop() { this.tl = null; }
  get talking() { return !!this.tl && this.tlT <= this.tl.end + 0.15; }
  setExpr(name) { if (this.expr === name) return; this.expr = name; this.closedEyes = name === 'smile_closed'; if (this.ad.setExpr) this.ad.setExpr(name); }
  /** 視線（-1〜1：左右・上下）。目の動きは素早く（サッカード）、少し揺らぐ */
  lookAt(x, y) { this.gaze.tx = Math.max(-1, Math.min(1, x)); this.gaze.ty = Math.max(-1, Math.min(1, y)); }
  update(dt) {
    this.t += dt;
    // 瞬き：1 分あたりの回数 ± ばらつき。たまに 2 回続ける
    const per = 60 / (this.opt.blinkPerMin || 16), dur = (this.opt.blinkMs || 130) / 1000;
    let k = 0;
    if (this.blinkT < 0 && this.t >= this.nextBlink) { this.blinkT = 0; this.blinks++; }
    if (this.blinkT >= 0) {
      this.blinkT += dt; const x = this.blinkT / dur;
      k = x < 0.45 ? x / 0.45 : x < 0.6 ? 1 : Math.max(0, 1 - (x - 0.6) / 0.4);
      if (x >= 1) { this.blinkT = -1; k = 0; if (!this.double && this.rand() < 0.15) { this.double = true; this.nextBlink = this.t + 0.12; } else { this.double = false; this.nextBlink = this.t + per * (0.55 + this.rand() * 0.9); } }
    }
    if (this.ad.setBlink) this.ad.setBlink(k);
    // 口
    let w = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    if (this.tl) { this.tlT += dt; w = weightsAt(this.tl, this.tlT, { gain: this.opt.gain ?? 0.9 }); if (this.tlT > this.tl.end + 0.3) this.tl = null; }
    this.visemes = w;
    if (this.ad.setVisemes) this.ad.setVisemes(w);
    // 視線：目標へ素早く。止まっている時は小さく揺らす（gazeShiftPerMin）
    this.saccT -= dt;
    let jx = 0, jy = 0;
    if (this.saccT <= 0) { this.saccT = 60 / (this.opt.gazeShiftPerMin || 20) * (0.5 + this.rand()); this.jit = [(this.rand() - 0.5) * 0.25, (this.rand() - 0.5) * 0.12]; }
    if (this.jit) { jx = this.jit[0]; jy = this.jit[1]; }
    const g = this.gaze, s = Math.min(1, dt * 18);
    g.x += (g.tx + jx - g.x) * s; g.y += (g.ty + jy - g.y) * s;
    if (this.ad.setGaze) this.ad.setGaze(g.x, g.y);
  }
}

/** コードで組んだ顔（charkit/shader/toon2.js の顔の材質・目の骨）のつなぎ */
export function codeFaceAdapter(model) {
  const u = model.mats && model.mats.face && model.mats.face.userData.u;
  const slots = model.mouthSlots || { closed: 0, aa: 1, ih: 2, ou: 3, ee: 4, oh: 5 };
  return {
    setBlink(k) { if (model.eyes) for (const e of model.eyes) e.scale.y = Math.max(0.08, 1 - k * 0.92); },
    setVisemes(w) {
      if (!u || !u.uMouth) return;
      let best = null, bw = 0, sec = null, sw = 0;
      for (const [n, x] of Object.entries(w)) { if (x > bw) { sec = best; sw = bw; best = n; bw = x; } else if (x > sw) { sec = n; sw = x; } }
      if (!best || bw < 0.05) { u.uMouth.value.set(model.talkingMouth ? slots.closed : -1, -1, 0); return; }
      // 閉じた口と一番の母音を重みで混ぜる（2 番目は小さい時だけ）
      if (bw < 0.55) u.uMouth.value.set(slots.closed, slots[best], Math.min(1, bw / 0.55));
      else u.uMouth.value.set(slots[best], sec && sw > 0.3 ? slots[sec] : -1, sec && sw > 0.3 ? sw / (bw + sw) : 0);
    },
    setGaze(x, y) { if (u && u.uGaze) u.uGaze.value.set(x, -y); },        // y＋＝上（絵の v は上が＋、虹彩は off の向きに動く）
    setExpr(name) { if (model.setExpr) model.setExpr(name); },
  };
}

/** VRM（three-vrm）のつなぎ */
export function vrmFaceAdapter(vrm) {
  const em = vrm && vrm.expressionManager;
  let last = null;
  return {
    setBlink(k) { if (em) em.setValue('blink', k); },
    setVisemes(w) { if (em) for (const [n, x] of Object.entries(w)) em.setValue(n, x); },
    // VRM の lookAt：yaw・pitch（度）を入れると vrm.update で骨（bone 型）か表情（expression 型）に当たる
    setGaze(x, y) { const L = vrm && vrm.lookAt; if (!L) return; if ('yaw' in L) { L.yaw = x * 20; L.pitch = y * 12; } else if (L.applier && L.applier.applyYawPitch) L.applier.applyYawPitch(x * 20, y * 12); },
    setExpr(name) { if (!em) return; if (last) em.setValue(last, 0); const v = EXPR_TO_VRM[name] || 'neutral'; if (v !== 'neutral') em.setValue(v, 1); last = v !== 'neutral' ? v : null; },
  };
}
