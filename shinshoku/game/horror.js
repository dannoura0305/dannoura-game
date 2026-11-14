// 境界侵食 Q-horror（じわじわ型の演出）：ゲームにつなぐ側。数値と純粋な関数は data/horror.js。
//  1 区画ごとの空と周りの明かり・月・補助光（horrorLights）／2 ちらつきの音のきっかけ（onLightFlickerOff）／5 暗い病棟（ch3.js applyWardLights）／
//  6 異形の縁の光・陰・霧の効き（horrorEnemyLook）／8 画面の周辺減光・粒・気配の縁（horrorScreen）／9 探索中は HUD を引っ込める（horrorHud）／
//  10 序章の帰路は背を向けて立つ → 首から振り向く（introHoldStep）／11 遠くに立っているだけの影（stalkerTick）／
//  16 手持ちの揺れ（horrorCamOpt）／17 演出の役者がゆっくり振り向く（cineTurnTick）／18 体育館の天井灯（horrorStepChanged）。
// 音は鳴らす名前（きっかけ）だけ：this.sfx.play(name) と sfx.dip / sfx.silence。名前の一覧は CUES。
import * as THREE from 'three';
import { HORROR_AREAS, horrorLightAt, darkMul, STALKER_SPOTS, STALKER, smoothNoise, hash32 } from '../data/horror.js';
import { streetState, atLeast, chapterNo } from '../story/chapters.js';
import { lineOfSight, insideAny } from '../world/collide.js';
import { EnemyActor, turnTo } from '../actor/actors.js';
import { buildKanja, buildMimicShadow } from '../actor/models3.js';
import { buildShuusha } from '../actor/models5.js';
import { kanjaPose, mimicPose } from '../actor/anim.js';
import { shuushaPose } from '../actor/anim5.js';
import { applyEnemyPack } from '../actor/enemypack.js';

/** 音のきっかけの名前（audio.js に無い名前は鳴らない：音の担当が作る） */
export const CUES = { flicker: 'flicker_buzz', stalkerSeen: 'stalker_seen', stalkerGone: 'stalker_gone', kiroTurn: 'notice' };
const NORMAL_MOON = (A, dark) => (A.id === 'shelter' ? (dark ? 0.25 : 0.45) : 0.9);
const STALKER_BUILD = { kanja: () => buildKanja(7), mimic: () => buildMimicShadow({ seed: 9 }), shuusha: () => buildShuusha(9, 'S-09') };
const STALKER_POSE = { kanja: kanjaPose, mimic: mimicPose, shuusha: shuushaPose };
let grainURL = null;
function grainImage() {
  if (grainURL || typeof document === 'undefined') return grainURL;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const d = g.createImageData(64, 64);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); grainURL = c.toDataURL('image/png');
  } catch (e) { grainURL = null; }
  return grainURL;
}

export const horrorMethods = {
  /** 今の場所の暗さの組（null＝暗くしない） */
  horrorProfile() {
    const A = this.area, P = this.player.pos;
    if (!HORROR_AREAS.includes(A.id)) return null;
    const out = A.id === 'shotengai' && (streetState(this.story.step) !== 'normal' || !!this.flags.lights_out);
    return horrorLightAt(A.id, P.x, P.z, out);
  },
  /** 1：空と周りの明かり・月・補助光（毎こま。区画を読んだ直後は一気に合わせる） */
  horrorLights(dt) {
    const A = this.area, H = this.horrorH = this.horrorProfile(), base = this.lightBase || { hemi: 1.1, amb: 0.6 };
    const snap = this.hzSnapArea !== A; this.hzSnapArea = A;
    const k = snap ? 1 : Math.min(1, dt * 1.25);                      // 約 0.8 秒で寄る
    if (HORROR_AREAS.includes(A.id)) {
      const dm = darkMul(this.darkness);
      const th = (H ? Math.min(H.hemi, base.hemi) : base.hemi) * dm, ta = (H ? Math.min(H.amb, base.amb) : base.amb) * dm;
      this.hemi.intensity += (th - this.hemi.intensity) * k; this.amb.intensity += (ta - this.amb.intensity) * k;
    }
    const m0 = NORMAL_MOON(A, this.darkness), tm = H ? Math.min(m0, H.moon) : m0;
    this.moon.intensity += (tm - this.moon.intensity) * k;
    const tk = Math.min(H ? H.key : 1.4, this.darkness ? 0.6 : 99), td = H ? H.keyDist : 4;
    this.keyLight.intensity += (tk - this.keyLight.intensity) * k; this.keyLight.distance += (td - this.keyLight.distance) * k;
  },
  /** 2：ちらつきの明かりが消えた瞬間（プレイヤーの近く 12m・0.6 秒に 1 回まで）：音のきっかけ */
  onLightFlickerOff(l) {
    const P = this.player.pos; if (Math.hypot(l.pos[0] - P.x, l.pos[2] - P.z) > 12) return;
    const now = this.playSec || 0; if (now - (this.flickCueAt || -9) < 0.6) return; this.flickCueAt = now;
    this.sfx.play(CUES.flicker, { x: l.pos[0], z: l.pos[2] }); this.metrics.flickerCues = (this.metrics.flickerCues || 0) + 1;
  },
  /** 毎こま（描画の側）：段・区画が変わった時の明かり、異形の見え方、画面、HUD、影、演出の振り向き */
  horrorFrame(dt) {
    const A = this.area, s = this.story.step;
    if (this.hzStep !== s || this.hzArea !== A) { const prev = this.hzStep, prevA = this.hzArea; this.hzStep = s; this.hzArea = A; this.horrorStepChanged(prev, s, prevA !== A); }
    this.horrorEnemyLook(dt);
    this.horrorScreen(dt);
    this.horrorHud(dt);
    this.stalkerTick(dt);
    this.cineTurnTick(dt);
  },
  /** 段・区画が変わった：5 病棟の明かり・18 体育館の天井灯・10 序章の帰路・11 影の準備 */
  horrorStepChanged(prev, s, areaChanged) {
    const A = this.area;
    if (A.id === 'hospital' && this.applyWardLights) this.applyWardLights();
    if (A.id === 'shelter') {
      const gym = A.lights.filter(l => l.gym);
      if (s === 'ch2_gym') { for (const l of gym) { l.off = l.id !== 'ceil2'; if (l.id === 'ceil2') l.flicker = true; } this.hzGymDim = true; }
      else if (this.hzGymDim) { for (const l of gym) l.off = false; this.hzGymDim = false; }
    }
    if (areaChanged) this.stalkerPrepare();
  },

  // ── 6：異形の縁の光・陰・霧（区画の暗さ。懐中電灯の円錐の中は縁の光を戻す） ──
  horrorEnemyLook(dt) {
    const H = this.horrorH, k = Math.min(1, dt * 4), P = this.player.pos;
    const list = this.stalker && this.stalker.e ? this.enemies.concat([this.stalker.e]) : this.enemies;
    for (const e of list) {
      const M = e.model && e.model.mats; if (!M || !M.body || !M.body.userData.u) continue;
      const lit = H && this.flashlightOn && Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < 16 && this.inFlashCone16(e.pos);
      for (const m of [M.body, M.face]) {
        const u = m && m.userData.u; if (!u || !u.uRim) continue;
        if (!u._hz) u._hz = { rim: u.uRim.value, shade: u.uShadeFill ? u.uShadeFill.value : null, luma: u.uMinLuma ? u.uMinLuma.value : null, fog: u.uFogK ? u.uFogK.value : null };
        const B = u._hz;
        const wr = B.rim * (H ? (lit ? 1 : H.rim) : 1); u.uRim.value += (wr - u.uRim.value) * k;
        if (B.shade != null) { const w = B.shade * (H ? (lit ? Math.max(H.shade, 0.9) : H.shade) : 1); u.uShadeFill.value += (w - u.uShadeFill.value) * k; }
        if (B.luma != null) { const w = B.luma * (H ? H.luma : 1); u.uMinLuma.value += (w - u.uMinLuma.value) * k; }
        if (B.fog != null) { const w = H ? Math.max(B.fog, H.fog) : B.fog; u.uFogK.value += (w - u.uFogK.value) * k; }
      }
    }
  },
  /** 懐中電灯の円錐（16m まで：影・縁の光用。戦いの inFlashCone は 12m のまま） */
  inFlashCone16(p) { const P = this.player.pos; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d > 16 || d < 0.01) return false; const fw = this.cam.forward(); return (dx * fw.x + dz * fw.z) / d > 0.88; },

  // ── 8：画面の周辺減光・粒・気配の縁（DOM の重ね：描画呼び出し 0） ──
  horrorScreen(dt) {
    if ((this.hzScrN = (this.hzScrN || 0) + 1) % 4) return;
    const root = this.ui && this.ui.root; if (!root || !root.style) return;
    const H = this.horrorH, d = Math.min(1, this.darkness || 0);
    const vig = Math.min(0.75, (H ? H.vig : 0.3) + d * 0.15), grain = H ? H.grain : 0;
    let dread = 0; const P = this.player.pos;
    if (this.mode === 'play' && !this.cut.active) for (const e of this.enemies) { if (!e.brain.alive || !e.root.visible || !['assess', 'hostile'].includes(e.brain.state)) continue; const dd = Math.hypot(e.pos.x - P.x, e.pos.z - P.z); if (dd < 6) dread = Math.max(dread, 1 - dd / 6); }
    this.hzDread = (this.hzDread || 0) + (dread - (this.hzDread || 0)) * Math.min(1, dt * 4 * 4);
    // 変数は重ねの要素にだけ置く（UI 全体の再計算をしない）・小数 2 桁で変わった時だけ
    const E = this.hzEls || (this.hzEls = root.querySelector ? { v: root.querySelector('.sh-vignette'), g: root.querySelector('.sh-grain'), d: root.querySelector('.sh-dread') } : {});
    const set = (el, k, v) => { if (!el) return; const t = v.toFixed(2); if (el.style.getPropertyValue(k) !== t) el.style.setProperty(k, t); };
    set(E.v, '--vig', vig); set(E.g, '--grain', grain); set(E.d, '--dread', this.hzDread * 0.1 * (H ? 1 : 0.6));
    if (grain > 0 && !this.hzGrainSet) { const u = grainImage(); if (u && E.g) { E.g.style.backgroundImage = `url(${u})`; this.hzGrainSet = true; } }
    if (E.g) { const on = grain > 0; if (E.g.classList.contains('on') !== on) E.g.classList.toggle('on', on); }   // 粒が要らない区画では動かさない
    this.metrics.screenFx = { vig: +vig.toFixed(2), grain, dread: +this.hzDread.toFixed(2) };
  },

  // ── 9：探索中は HUD を引っ込める（4 秒なにも起きない → 操作の一覧・地図・持ち物などを隠す。中身はそのまま：試験の読み取りは壊さない） ──
  horrorHud(dt) {
    const root = this.ui && this.ui.root; if (!root || !root.classList) return;
    const on = this.settings.hudAuto !== false && this.mode === 'play' && !this.cut.active;
    let calm = on;
    if (calm) {
      const P = this.player, F = P.fighter;
      if (this.lock || this.boss || F.st.name !== 'free' || F.hp < F.hpMax * 0.5 || this.nearSpot) calm = false;
      else for (const e of this.enemies) { if (!e.brain.alive || !e.root.visible) continue; const st = e.brain.state; if (!['assess', 'hostile', 'stagger', 'rollcall'].includes(st)) continue; if (Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 14) { calm = false; break; } }
    }
    this.hudCalmT = calm ? (this.hudCalmT || 0) + dt : 0;
    const quiet = on && this.hudCalmT > 4, nohints = this.settings.hudAuto !== false && chapterNo(this.story.step) >= 2;
    if (root.classList.contains('quiet') !== quiet) root.classList.toggle('quiet', quiet);
    if (root.classList.contains('nohints') !== nohints) root.classList.toggle('nohints', nohints);
    const sub = this.settings.teleShow === 'subtle'; if (root.classList.contains('telesubtle') !== sub) root.classList.toggle('telesubtle', sub);   // 14：予兆の表示「控えめ」
    this.metrics.hudQuiet = quiet;
  },

  // ── 10：序章の帰路（pro_fight）：明かりの下に背を向けて立つ → 8m で首だけ振り向く（0.6 秒）→ 間（0.5 秒）→ 体が向く ──
  startIntroHold() {
    const e = this.enemies.find(x => x.id === 'kiro_t'); if (!e || !e.brain.alive) return;
    const b = e.brain, P = this.player.pos;
    b.pos.x = 1.0; b.pos.z = -54.6;                                   // flickerKiroLight の明かり（z=-56）の下
    b.yaw = Math.atan2(P.x - b.pos.x, P.z - b.pos.z) + Math.PI;        // 背を向ける
    e.introHold = { ph: 'wait', t: 0, hp: b.hp }; e.headTurn = 0; e.mark = null;
    this.metrics.introHold = 'wait';
  },
  /** true の間は頭脳を進めない（その場で立つ・振り向く）。攻撃された・近すぎる時はすぐ戦いへ */
  introHoldStep(e, dt) {
    const H = e.introHold, b = e.brain, P = this.player.pos;
    const d = Math.hypot(P.x - b.pos.x, P.z - b.pos.z), want = Math.atan2(P.x - b.pos.x, P.z - b.pos.z);
    let rel = want - b.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
    const release = () => { e.introHold = null; e.headTurn = 0; b.lastSeen = { x: P.x, z: P.z }; b.lastSeenT = b.total; if (b.state !== 'hostile') b.go('hostile', []); this.metrics.introHold = 'done'; };
    if (b.hp < H.hp || d < 2.5 || this.player.fighter.dead) { b.yaw = want; release(); return false; }
    H.t += dt; e.speed = 0;
    if (H.ph === 'wait') { if (d < 8) { H.ph = 'head'; H.t = 0; this.sfx.play(CUES.kiroTurn, b.pos); this.metrics.introHold = 'head'; } }
    else if (H.ph === 'head') { const k = Math.min(1, H.t / 0.6); e.headTurn = Math.max(-1.3, Math.min(1.3, rel)) * (k * k * (3 - 2 * k)); if (H.t >= 0.6) { H.ph = 'pause'; H.t = 0; } }
    else if (H.ph === 'pause') { e.headTurn = Math.max(-1.3, Math.min(1.3, rel)); if (H.t >= 0.5) { H.ph = 'body'; H.t = 0; } }
    else { b.yaw = turnTo(b.yaw, want, dt * 5); let r2 = want - b.yaw; while (r2 > Math.PI) r2 -= 2 * Math.PI; while (r2 < -Math.PI) r2 += 2 * Math.PI; e.headTurn = Math.max(-1.3, Math.min(1.3, r2)); if (Math.abs(r2) < 0.08 || H.t > 0.8) release(); }
    return true;
  },

  // ── 11：遠くに立っているだけの影 ──
  stalkerPrepare() {
    const S = this.stalker;
    if (S && S.e) { S.e.root.visible = false; if (S.e.root.parent) S.e.root.parent.remove(S.e.root); }
    this.stalker = null;
    const cfg = STALKER_SPOTS[this.area.id]; if (!cfg) return;
    this.stalker = { cfg, e: null, cool: 25, count: 0, lazy: true };   // 網は初めて出す時に作る（区画の読み込みを重くしない）
  },
  stalkerBuild(S) {
    const kind = S.cfg.kind, m = STALKER_BUILD[kind](); m.kind = m.kind || kind;
    if (applyEnemyPack(m, kind)) { /* 届いた体（読めていれば） */ }
    const brain = { id: 'stalker', kind, pos: { x: 0, z: 0 }, yaw: 0, state: 'loop', t: 0, alive: true, atk: null, def: { attacks: {} } };
    const e = new EnemyActor(brain, m); e.poseFn = STALKER_POSE[kind]; e.stalker = true;
    const d = m.packShift; if (d && e.poser) { e.poser.hipsBase += d.y; e.poser.hipsBaseX += d.x; e.poser.hipsBaseZ += d.z; }
    e.root.visible = false; this.scene.add(e.root);
    e.eyeIdx = (m.eyeGlow || []).map(() => this.halos.add([0, -50, 0], 0.2, 0xb070ff, 0));
    S.e = e; S.lazy = false;
  },
  stalkerTick(dt) {
    const S = this.stalker; if (!S) return;
    const P = this.player.pos, fw = this.cam.forward();
    const busy = this.mode !== 'play' || this.cut.active || this.boss || ['ch3_guard', 'ch3_boss', 'ch3_boss2'].includes(this.story.step) || this.enemies.some(e => e.brain.alive && e.root.visible && ['hostile', 'assess'].includes(e.brain.state) && Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < 15);
    const e = S.e;
    if (!e || !e.root.visible) {
      if (busy || S.count >= STALKER.perVisit || this.settings.stalker === false) return;
      S.cool -= dt; if (S.cool > 0) return;
      S.cool = 3;                                                      // 次に探すまで
      const cand = S.cfg.spots.map(([x, z]) => ({ x, z, d: Math.hypot(x - P.x, z - P.z) })).filter(q => q.d >= STALKER.minD && q.d <= STALKER.maxD);
      for (const q of cand) {
        const dot = ((q.x - P.x) * fw.x + (q.z - P.z) * fw.z) / q.d;
        if (dot > 0.3) continue;                                       // 今は見ていない所に立たせる（振り向くといる）
        if (insideAny(q, this.boxes, 0.3) || !lineOfSight(P, q, this.boxes)) continue;
        if (S.lazy) this.stalkerBuild(S);
        const E = S.e; E.brain.pos.x = q.x; E.brain.pos.z = q.z; E.brain.yaw = Math.atan2(P.x - q.x, P.z - q.z); E.root.visible = true; E.time = 0;
        S.t = 0; S.seenT = 0; S.seen = false; this.metrics.stalker = (this.metrics.stalker || 0) + 1; return;
      }
      return;
    }
    S.t += dt; e.brain.t += dt;
    const q = e.brain.pos, d = Math.hypot(q.x - P.x, q.z - P.z), dot = ((q.x - P.x) * fw.x + (q.z - P.z) * fw.z) / Math.max(0.01, d);
    const inView = dot > 0.9 && lineOfSight(P, q, this.boxes);
    if (inView) { S.seenT += dt; if (!S.seen) { S.seen = true; this.sfx.play(CUES.stalkerSeen); if (this.sfx.dip) this.sfx.dip(0.55, 0.8, 1.4, 0.4); this.metrics.stalkerSeen = (this.metrics.stalkerSeen || 0) + 1; } }
    const lit = this.flashlightOn && dot > 0.88 && d < 22;
    e.brain.yaw = turnTo(e.brain.yaw, Math.atan2(P.x - q.x, P.z - q.z), dt * 0.6);
    if (busy || S.seenT > STALKER.seeTime || lit || S.t > STALKER.life || d < 8) {
      // 消える：いちばん近い明かりを 0.35 秒ちらつかせ、その間に
      let best = null, bd = 1e9; for (const l of this.area.lights) { const ld = Math.hypot(l.pos[0] - q.x, l.pos[2] - q.z); if (ld < bd) { bd = ld; best = l; } }
      if (best && bd < 14) best.flickerT = 0.35;
      e.root.visible = false; S.count++; S.cool = STALKER.cooldown; this.sfx.play(CUES.stalkerGone);
      for (const i of e.eyeIdx || []) this.halos.setK(i, 0);
      return;
    }
    e.animate(dt);
    const v = new THREE.Vector3(); (e.model.eyeGlow || []).forEach((o, i) => { o.getWorldPosition(v); this.halos.setPos(e.eyeIdx[i], v.x, v.y, v.z); this.halos.setK(e.eyeIdx[i], 0.9); });
  },

  // ── 16：手持ちの揺れ（ホラーの区画）・異形が見定めている時は視野を少し狭める ──
  horrorCamOpt() {
    const H = this.horrorH; if (!H) return { sway: 0, fovKick: 0 };
    const P = this.player.pos; let pinch = 0;
    for (const e of this.enemies) { if (!e.brain.alive || e.brain.state !== 'assess' || !e.root.visible) continue; if (Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < 9) { pinch = 1; break; } }
    this.hzPinch = (this.hzPinch || 0) + (pinch - (this.hzPinch || 0)) * 0.03;   // 約 1 秒で寄る（毎こま）
    return { sway: 0.012, fovKick: -2.5 * this.hzPinch };
  },
  /** 演出の手持ちの揺れ（cs.hand：ラジアン）。pos・look を少しずらす */
  cineHand(pos, look) {
    const cs = this.cut && this.cut.cs, h = cs && cs.hand; if (!h) return [pos, look];
    const t = this.cut.t, d = Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) || 1;
    return [pos, [look[0] + smoothNoise(t, 3) * h * d, look[1] + smoothNoise(t * 0.9, 11) * h * d * 0.7, look[2] + smoothNoise(t * 1.1, 23) * h * d]];
  },

  // ── 17：演出の役者がゆっくり振り向く（cineActor の turn） ──
  cineTurn(tgt, yaw, secs) { (this.cineTurns || (this.cineTurns = [])).push({ tgt, yaw, rate: Math.PI / Math.max(0.2, secs) }); },
  cineTurnTick(dt) {
    const L = this.cineTurns; if (!L || !L.length) return;
    for (let i = L.length - 1; i >= 0; i--) {
      const m = L[i], b = m.tgt.kind === 'player' ? this.player : m.tgt.kind === 'companion' ? this.companion.brain : m.tgt.e && m.tgt.e.brain;
      if (!b) { L.splice(i, 1); continue; }
      b.yaw = turnTo(b.yaw, m.yaw, m.rate * dt);
      let r = m.yaw - b.yaw; while (r > Math.PI) r -= 2 * Math.PI; while (r < -Math.PI) r += 2 * Math.PI;
      if (Math.abs(r) < 0.01 || !this.cut.active) { b.yaw = m.yaw; L.splice(i, 1); }
    }
  },
};
export { hash32 };
