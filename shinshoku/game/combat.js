// 戦闘の実行（だんのうらの操作・当たり判定・一閃と連鎖一閃・銃・ロックオン・異形の出来事・ボスの攻撃・相棒をつかむ）。
// Game（main.js）のメソッドとして組み込む（Object.assign(Game.prototype, combatMethods)）。
import * as THREE from 'three';
import { COMBAT, ITEMS, f2ms } from '../data/combat.js';
import { resolveCircle, rayBoxes, lineOfSight, insideAny, rayCylinder, raySphere } from '../world/collide.js';
import { turnTo } from '../actor/actors.js';
import { pickChainTarget, canChain } from '../combat/chain.js';
import { sideOf } from '../ai/tsugihagi.js';

const DT = 1 / 60;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export const combatMethods = {
  // ── だんのうら ──
  stepPlayer(I) {
    const P = this.player, F = P.fighter;
    if (I.lock) this.toggleLock();
    if (I.lockPrev || I.lockNext) this.switchLock(I.lockNext ? 1 : -1);
    if (I.tap) this.tapLock(I.tap);
    if (I.light) this.toggleFlashlight();
    const fw = this.cam.forward(), rt = { x: -fw.z, z: fw.x };
    const mx = fw.x * I.moveY + rt.x * I.moveX, mz = fw.z * I.moveY + rt.z * I.moveX;
    const mag = Math.min(1, Math.hypot(mx, mz)); if (mag > 1e-3) { const L = Math.hypot(mx, mz); P.moveDir = { x: mx / L, z: mz / L }; }
    this.curMoveMag = mag;
    if (this.touchAimAssist || this.input.device !== 'kbm') this.autoAimLock(I);
    if (I.cycleMelee) { const M = ['katana', 'pipe', 'matchlock'].filter(w => F.owned.includes(w)); if (M.length) I.wantWeapon = M[(M.indexOf(F.weapon) + 1) % M.length]; }
    const evs = F.tick({ attack: I.attack, heavy: I.heavy, dodge: I.dodge, parry: I.parry, swap: I.swap, aim: I.aim, reload: I.reload, wantWeapon: I.wantWeapon });
    this.handleFighter(evs);
    if (I.heal) this.useHeal();
    if (I.interact && this.nearSpot) this.useSpot(this.nearSpot);
    const st = F.st; let vx = 0, vz = 0;
    if (st.name === 'dodge') {
      const tot = st.white ? COMBAT.white.dash.total : 24, t = st.f / tot, k = t < 0.72 ? Math.cos(t / 0.72 * Math.PI / 2) : 0;
      const sp = (st.white ? COMBAT.white.dash.dist / (tot / 60 * 0.6) : COMBAT.dodge.dist / 0.28) * k * 0.9;
      vx = P.dodgeDir.x * sp; vz = P.dodgeDir.z * sp;
      P.yaw = turnTo(P.yaw, Math.atan2(P.dodgeDir.x, P.dodgeDir.z), 0.5);
    } else if (st.name === 'attack' && st.f < st.atk.startup + st.atk.active + 2 && st.atk.lunge) {
      const dur = st.atk.startup + st.atk.active + 2;
      const sp = st.atk.lunge / (dur * DT) * (this.lockTargetClose() ? 0.35 : 1);
      vx = Math.sin(P.yaw) * sp; vz = Math.cos(P.yaw) * sp;
    } else {
      const mul = F.moveMul();
      const run = I.run && !(F.aimHeld && F.weapon === 'handgun');
      const sp = (run ? COMBAT.move.run : COMBAT.move.walk) * mul * mag;
      vx = P.moveDir.x * sp * (mag > 1e-3 ? 1 : 0); vz = P.moveDir.z * sp * (mag > 1e-3 ? 1 : 0);
      if (F.aimHeld && F.weapon === 'handgun') P.yaw = turnTo(P.yaw, Math.atan2(fw.x, fw.z), 0.4);
      else if (this.lock && this.lock.hittable() && (st.name === 'free' || st.name === 'charge' || st.name === 'parry') && mag < 0.1) P.yaw = turnTo(P.yaw, Math.atan2(this.lock.pos.x - P.pos.x, this.lock.pos.z - P.pos.z), 0.2);
      else if (mag > 1e-3 && mul > 0) P.yaw = turnTo(P.yaw, Math.atan2(P.moveDir.x, P.moveDir.z), 0.25);
    }
    const before = { x: P.pos.x, z: P.pos.z };
    const zk = this.slowZoneK ? this.slowZoneK(P.pos) : 1;
    P.pos.x += vx * DT * zk; P.pos.z += vz * DT * zk;
    const BX = this.area.boxesUp && P.pos.y > this.area.upY ? this.area.boxesUp : this.boxes;   // P14：自宅の 2 階では 2 階の当たり
    resolveCircle(P.pos, P.r, BX);
    for (const e of this.enemies) {
      if (!e.brain.alive || !e.root.visible || ['home', 'rest', 'neutral', 'dormant', 'sleep', 'locked'].includes(e.brain.state)) continue;
      const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), min = P.r + e.r * 0.85;
      if (d < min && d > 1e-4 && st.name !== 'issen') { P.pos.x = e.pos.x + dx / d * min; P.pos.z = e.pos.z + dz / d * min; }
    }
    resolveCircle(P.pos, P.r, BX);
    if (insideAny(P.pos, BX, 0)) this.metrics.wallClips++;
    if (this.area.floorAt) { const fy = this.area.floorAt(P.pos.x, P.pos.z, P.pos.y); if (fy != null) P.pos.y = fy; }   // P14：階段・2 階の床の高さ
    const B = this.area.bounds; if (P.pos.x < B.minX || P.pos.x > B.maxX || P.pos.z < B.minZ || P.pos.z > B.maxZ) this.metrics.outOfBounds++;
    if (this.god) F.hp = F.hpMax;
    const moved = Math.hypot(P.pos.x - before.x, P.pos.z - before.z);
    P.speed = moved / DT;
    const foot = P.advance(moved, P.speed);
    if (foot && st.name !== 'dodge') this.sfx.step(this.area.surface(P.pos.x, P.pos.z), P.speed > 3.5);
    P.noise = P.speed > 3.5 ? 'run' : P.speed > 0.3 ? 'walk' : 'none';
  },
  lockTargetClose() { const t = this.lock || this.softTarget; return t && Math.hypot(t.pos.x - this.player.pos.x, t.pos.z - this.player.pos.z) < 1.4; },
  autoAimLock(I) {
    if (!(I.attack || I.aim)) return;
    if (this.lock && this.lock.hittable()) return;
    const t = this.nearestEnemy(8, true);
    if (t && this.input.device === 'touch') this.lock = t;
  },
  nearestEnemy(range = 4, needSight = false, cone = 360, from = this.player.pos, yaw = this.player.yaw) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const dx = e.pos.x - from.x, dz = e.pos.z - from.z, d = Math.hypot(dx, dz);
      if (d > range) continue;
      if (cone < 360) { const a = Math.abs(wrap(Math.atan2(dx, dz) - yaw)); if (a * 180 / Math.PI > cone / 2) continue; }
      if (needSight && !lineOfSight(from, e.pos, this.boxes)) continue;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },
  /** 画面上の敵の位置（ロックオン選び用） */
  screenOf(e) { const v = new THREE.Vector3(e.pos.x, e.h * 0.6, e.pos.z).project(this.camera); return v.z > 1 ? null : v; },
  toggleLock() {
    if (this.lock) { this.lock = null; return; }
    let best = null, bs = 1e9;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const d = Math.hypot(e.pos.x - this.player.pos.x, e.pos.z - this.player.pos.z); if (d > 18) continue;
      const v = this.screenOf(e); if (!v || Math.abs(v.x) > 1.1) continue;
      const s = Math.abs(v.x) * 8 + d; if (s < bs) { bs = s; best = e; }
    }
    this.lock = best;
  },
  /** ロックオンの相手を画面の左右の隣へ切り替える（dir：-1 左 / +1 右） */
  switchLock(dir) {
    if (!this.lock) return this.toggleLock();
    const cur = this.screenOf(this.lock); if (!cur) return;
    let best = null, bs = 1e9;
    for (const e of this.enemies) {
      if (e === this.lock || !e.hittable()) continue;
      const d = Math.hypot(e.pos.x - this.player.pos.x, e.pos.z - this.player.pos.z); if (d > 18) continue;
      const v = this.screenOf(e); if (!v) continue;
      const dx = (v.x - cur.x) * dir; if (dx <= 0.01) continue;
      const s = dx + Math.abs(v.y - cur.y) * 0.5; if (s < bs) { bs = s; best = e; }
    }
    if (best) { this.lock = best; this.metrics.lockSwitch = (this.metrics.lockSwitch || 0) + 1; this.sfx.play('ui'); }
  },
  /** タッチ：タップした所に近い敵へ */
  tapLock(tap) {
    let best = null, bd = 90;
    for (const e of this.enemies) { if (!e.hittable()) continue; const v = this.screenOf(e); if (!v) continue; const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight; const d = Math.hypot(x - tap.x, y - tap.y); if (d < bd) { bd = d; best = e; } }
    if (best) { this.lock = best; this.sfx.play('ui'); }
  },

  handleFighter(evs) {
    const P = this.player, F = P.fighter;
    for (const ev of evs) {
      this.metrics.events.push({ t: ev.t, frame: this.frame, f: ev.frame, kind: ev.kind, step: ev.step }); if (this.metrics.events.length > 400) this.metrics.events.shift();
      switch (ev.t) {
        case 'foxfire': case 'illusion': case 'noYoki': case 'revert': this.handleWhiteEvent(ev); break;
        case 'yodan': this.fireYodan(ev); break;
        case 'mchargeStart': this.sfx.play('yodan_charge'); this.pushAct('shot'); break;
        case 'mreloadStart': this.sfx.play('mreload'); break;
        case 'mreloadDone': this.metrics.mReloads = (this.metrics.mReloads || 0) + 1; break;
        case 'parryStart': this.pushAct('parry'); break;
        case 'attackStart': {
          this.pushAct(F.weapon === 'claw' ? (ev.blade ? 'blade' : 'claw') : ev.iai ? 'iai' : ev.heavy ? 'heavy' : F.weapon === 'pipe' || F.weapon === 'matchlock' ? 'pipe' : 'slash');
          const t = (this.lock && this.lock.hittable() && Math.hypot(this.lock.pos.x - P.pos.x, this.lock.pos.z - P.pos.z) < 5) ? this.lock : this.nearestEnemy(3.6, true, 220);
          this.softTarget = t;
          if (t) P.yaw = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z);
          else if (this.curMoveMag > 0.3) P.yaw = Math.atan2(P.moveDir.x, P.moveDir.z);
          this.swingHits = new Set(); this.trail.cut(); this.swingT = 0;
          this.sfx.play(F.weapon === 'claw' ? (ev.blade ? 'blade' : 'claw') : F.weapon === 'pipe' || F.weapon === 'matchlock' ? 'swing_pipe' : ev.heavy || ev.iai || ev.step === 2 ? 'swing_heavy' : 'swing');
          if (F.weapon === 'claw') { const hp = P.model.J[ev.step % 2 ? 'leftHand' : 'rightHand']; if (hp) { const v = new THREE.Vector3(); hp.getWorldPosition(v); for (let i = 0; i < 4; i++) this.fx.puff(v.x, v.y, v.z, (Math.random() - 0.5) * 0.5, 0.3, (Math.random() - 0.5) * 0.5, 0xa060ff, 0.4, 0.45); } }
          break;
        }
        case 'active': this.meleeHits(ev.atk, ev); break;
        case 'dodge': {
          const d = P.moveDir;
          P.dodgeDir = this.curMoveMag > 0.1 ? { x: d.x, z: d.z } : { x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) };
          this.pushAct(ev.white ? 'dash' : 'dodge');
          if (ev.white) { this.sfx.play('dash'); for (let i = 0; i < 10; i++) this.fx.puff(P.pos.x + (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 1.3, P.pos.z + (Math.random() - 0.5) * 0.4, 0, 0.2, 0, 0x8a50e0, 0.5, 0.5); }
          else { this.sfx.play('dodge'); this.fx.dust(P.pos); } break;
        }
        case 'just': {
          this.metrics.just++; this.sfx.play('just'); this.ui.toast('見切り', 'just', 0.9);
          if (!this.flags.first_just) { this.flags.first_just = true; this.bark('first_just'); }
          // 同時に攻めてきた近くの敵も「見切り」状態（青い縁）になる＝連鎖一閃の相手
          for (const o of this.enemies) if (o.brain.alive && o !== ev.src && o.brain.attacking && Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z) < 4) { o.brain.chainable = true; o.brain.atk = null; o.brain.staggerFor = 1.2; o.brain.go('stagger', [], 'seen'); }
          break;
        }
        case 'slow': this.slowT = Math.round(ev.frames); this.slowScale = ev.scale; this.ui.slow(true); this.sfx.setMuffle(0.6); break;
        case 'parry': {
          this.metrics.parry++; const e = ev.src; if (e && e.brain) { e.brain.parried(); e.brain.poise -= COMBAT.poise.parried; } this.sfx.play('parry'); this.ui.toast('弾き', 'parry', 0.8);
          const bp = P.bladePoints(); this.fx.sparks(bp ? bp[1] : P.pos.clone().setY(1.3), 18, 0xfff4d0); this.hitstop = COMBAT.hitstop.heavy; this.cam.shake(0.08, 0.15);
          break;
        }
        case 'guard': this.sfx.play('guard'); this.cam.shake(0.06, 0.12); break;
        case 'issen': this.startIssen(ev); break;
        case 'issenStrike': this.issenStrike(ev); break;
        case 'shot': this.fireShot(ev); break;
        case 'dry': this.sfx.play('dry'); this.ui.log('弾が無い'); break;
        case 'reloadStart': this.sfx.play('reload'); break;
        case 'swapStart': this.sfx.play('swap'); this.swapStartFrame = ev.frame; break;
        case 'swapDone': this.metrics.swaps.push({ to: ev.weapon, frames: ev.frames, ms: f2ms(ev.frames), measured: ev.frame - this.swapStartFrame }); break;
        case 'hurt': {
          this.metrics.hurt++; this.sfx.play('hurt'); this.cam.shake(ev.grab ? 0.22 : 0.14, 0.25); this.ui.flash('hurt');
          if (ev.src && ev.src.pos) { const a = Math.abs(wrap(Math.atan2(ev.src.pos.x - P.pos.x, ev.src.pos.z - P.pos.z) - P.yaw)); P.hurtDir = a > Math.PI / 2 ? 'back' : 'front'; P.looks.hit(P.pos.x - ev.src.pos.x, P.pos.z - ev.src.pos.z, P.yaw, 0.6); }
          if (F.hp < 30 && !this.flags.lowhp_bark) { this.flags.lowhp_bark = true; this.bark('low_hp'); }
          break;
        }
        case 'dead': this.onPlayerDead(); break;
        case 'iaiReady': this.sfx.play('issen_ready'); this.ui.toast('居合', 'iai', 0.6); break;
      }
    }
  },
  onPlayerDead() { if (this.deadPending) return; if (this.onDead4 && this.onDead4()) return; if (this.onDead5) this.onDead5(); if (this.onDead6) this.onDead6(); if (this.onDead7) this.onDead7(); if (this.boss && this.boss.kind === 'utsushimi' && this.boss.brain.alive) { this.ch3Losses = (this.ch3Losses || 0) + 1; this.metrics.ch3Losses = this.ch3Losses; } this.deadPending = true; setTimeout(() => { this.mode = 'dead'; this.input.exitLock(); this.ui.showDead(true); this.deadPending = false; }, this.isTest() ? 10 : 1400); },
  meleeHits(atk, ev) {
    const P = this.player, F = P.fighter;
    const pipe = F.weapon === 'pipe' || F.weapon === 'matchlock';
    if (F.weapon === 'matchlock') this.metrics.stockSwings = (this.metrics.stockSwings || 0) + (ev.first ? 1 : 0);
    for (const e of this.enemies) {
      if (!e.hittable() || this.swingHits.has(e)) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > atk.reach + e.r) continue;
      const a = Math.abs(wrap(Math.atan2(dx, dz) - P.yaw));
      if (a * 180 / Math.PI > atk.arc / 2 && d > e.r + 0.5) continue;
      this.swingHits.add(e);
      F.markSwingHit();
      const heavy = atk.stop === 'heavy';
      this.damageEnemy(e, Math.round(atk.dmg * F.comboMul()), 'slash', { poise: atk.poise || COMBAT.poise.slash, guardBreak: atk.guardBreak });
      F.registerHit(); F.gainYoki('hit');
      this.metrics.slashHits++; if (pipe) this.metrics.pipeHits = (this.metrics.pipeHits || 0) + 1;
      e.looks.hit(dx, dz, e.brain.yaw, heavy ? 1.2 : 0.7);
      this.hitstop = heavy ? COMBAT.hitstop.heavy : COMBAT.hitstop.light;
      this.cam.shake(heavy ? 0.12 : 0.06, 0.15);
      this.fx.sparks(new THREE.Vector3(e.pos.x - dx / d * e.r, 1.2, e.pos.z - dz / d * e.r), heavy ? 16 : 9, pipe ? 0xffd8a0 : 0xfff0c0);
      this.sfx.play(F.weapon === 'claw' ? 'claw_hit' : F.weapon === 'matchlock' ? 'stock' : pipe ? 'hit_pipe' : heavy ? 'hit_heavy' : 'hit');
      if (F.weapon === 'matchlock') this.metrics.stockHits = (this.metrics.stockHits || 0) + 1;
      if (F.weapon === 'claw') {                                         // 爪痕：3 本の紫の筋（concept_03 の斬撃の光を独自に簡単化）
        this.fx.sparks(new THREE.Vector3(e.pos.x - dx / d * e.r, 1.2, e.pos.z - dz / d * e.r), 10, 0xc890ff);
        const sx = -dz / d, sz = dx / d, dir = (atk.claw || 1) % 2 ? 1 : -1, h0 = e.h * 0.75;
        for (let k = -1; k <= 1; k++) { const o = k * 0.11; this.fx.streak(new THREE.Vector3(e.pos.x - dx / d * (e.r * 0.8) + sx * (0.45 * dir + o), h0 + 0.35 + o * 0.6, e.pos.z - dz / d * (e.r * 0.8) + sz * (0.45 * dir + o)), new THREE.Vector3(e.pos.x - dx / d * (e.r * 0.8) - sx * (0.45 * dir - o), h0 - 0.35 + o * 0.6, e.pos.z - dz / d * (e.r * 0.8) - sz * (0.45 * dir - o)), k ? 0xb070ff : 0xf4e8ff, 0.32, 0.035); }
      }
    }
  },
  damageEnemy(e, dmg, kind, opt = {}) {
    const evs = [];
    if (e.held && this.companion.brain.mode === 'grabbed' && this.companion.brain.grab && this.companion.brain.grab.id === e.id) this.freeCompanion(e, true);
    if (e.targetCompanion) e.targetCompanion = false;                    // 叩かれたら、だんのうらの方を向く（守り）
    // 序章の帰路：一撃で倒しきらない（弱ると帰っていく＝追い払う）
    if (e.brain.def.tutorial && !e.fleeing && e.brain.hp > e.brain.hpMax * 0.5 && e.brain.hp - dmg <= 0) dmg = e.brain.hp - 1;
    if (e.brain.def.whiteResist && this.player.fighter.white && !opt.side) dmg *= e.brain.def.whiteResist;   // 継接：縫い目が妖力を吸う（白い姿の傷は浅い・仮）
    if (e.kind === 'tsugihagi' && !opt.side) opt = Object.assign({ side: sideOf(e.pos, e.brain.yaw, this.player.pos) }, opt);   // 継接：叩いた側の部分へ
    const done = e.brain.hurt(dmg, kind, evs, opt);
    if (done) this.enemyEvents(e, evs);
    return done;
  },
  startIssen(ev) {
    const P = this.player, e = ev.target;
    this.metrics.issen[ev.kind] = (this.metrics.issen[ev.kind] || 0) + 1;
    P.issenInfo = COMBAT.issen[ev.kind];
    this.issenFrom = P.pos.clone();
    if (e && e.brain) {
      e.brain.interrupt();
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
      if (ev.kind === 'mikiri') {
        const p = { x: e.pos.x + dx / d * (e.r + 1.1), z: e.pos.z + dz / d * (e.r + 1.1) }; resolveCircle(p, P.r, this.boxes); P.pos.x = p.x; P.pos.z = p.z;
        P.yaw = Math.atan2(-dx, -dz);
      } else if (ev.kind === 'utsu' || ev.kind === 'hajiki' || ev.kind === 'chain') {
        const back = ev.kind === 'chain' ? -1 : 1;   // 連鎖：相手の向こう側へ抜ける
        const p = { x: e.pos.x - back * dx / d * (e.r + 0.9), z: e.pos.z - back * dz / d * (e.r + 0.9) }; resolveCircle(p, P.r, this.boxes); P.pos.x = p.x; P.pos.z = p.z;
        P.yaw = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
      } else P.yaw = Math.atan2(dx, dz);
    }
    const names = { mikiri: '見切り一閃', hajiki: '弾き一閃', iai: '抜刀一閃', utsu: '撃ち一閃', chain: `連鎖一閃 ${this.player.fighter.chainN + 1}` };
    this.ui.toast(names[ev.kind], 'issen', 1.4);
    this.ui.flash('issen'); this.sfx.play(ev.kind === 'chain' ? 'chain' : 'issen'); this.sfx.setMuffle(0.85);
    this.slowT = Math.max(this.slowT, COMBAT.issen[ev.kind].total + 10); this.slowScale = 0.2; this.ui.slow(true);
    this.cam.shake(0.05, 0.2);
  },
  issenStrike(ev) {
    const P = this.player, F = P.fighter, e = ev.target;
    const from = this.issenFrom || P.pos.clone();
    const a = new THREE.Vector3(from.x, 1.15, from.z), b = new THREE.Vector3(P.pos.x, 1.15, P.pos.z);
    if (e && e.pos) { const mid = new THREE.Vector3(e.pos.x, 1.2, e.pos.z); const dir = b.clone().sub(a); if (dir.length() < 0.5) { dir.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); a.copy(mid).addScaledVector(dir, -1.6); b.copy(mid).addScaledVector(dir, 1.6); } else { a.addScaledVector(dir.normalize(), -0.8); b.addScaledVector(dir, 0.8); } }
    this.fx.streak(a, b, 0xffffff, 0.6, 0.045);
    const hit = [];
    F.gainYoki('issen'); F.registerHit();
    if (e && e.hittable && e.hittable()) { this.damageEnemy(e, Math.round(ev.dmg * F.comboMul()), 'issen', { poise: COMBAT.poise.issen }); hit.push(e.id); e.looks.hit(e.pos.x - from.x, e.pos.z - from.z, e.brain.yaw, 1.6); this.fx.sparks(new THREE.Vector3(e.pos.x, 1.3, e.pos.z), 24, 0xffffff); }
    if (ev.kind === 'mikiri') for (const o of this.enemies) if (o !== e && o.hittable() && Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z) < 2.6) { this.damageEnemy(o, Math.round(ev.dmg / 2), 'issen', { poise: 30 }); hit.push(o.id); }
    this.hitstop = COMBAT.hitstop.issen; this.cam.shake(0.25, 0.3); this.ui.flash('strike'); this.sfx.play('hit_heavy');
    if (this.WP.achieve('first_issen')) this.ui.log('実績：はじめての一閃');
    this.flags.first_issen = true;
    // 連鎖一閃：近くに「見切り」状態（青い縁）の敵がいれば窓を開く
    if (canChain(F.chainN, F.C)) {
      const list = this.enemies.map(o => ({ id: o.id, x: o.pos.x, z: o.pos.z, alive: o.hittable(), chainable: o.brain.chainable, ref: o }));
      const next = pickChainTarget(P.pos, list, { exclude: [e && e.id], range: COMBAT.issen.chain.range });
      if (next) { F.openChain(next.ref); this.chainTarget = next.ref; this.ui.toast(`連鎖 → ${F.chainN + 1}`, 'just', 0.7); }
    }
    if (ev.kind === 'chain') this.metrics.chainMax = Math.max(this.metrics.chainMax || 0, F.chainN);
  },
  fireShot(ev) {
    const P = this.player, F = P.fighter; this.metrics.shots++;
    const muzzle = P.muzzleWorld();
    let o, d;
    if (ev.aimed && this.input.device === 'kbm') {
      this.syncCamera();
      o = this.camera.position.clone(); d = new THREE.Vector3(); this.camera.getWorldDirection(d);
    } else {
      const t = (this.lock && this.lock.hittable()) ? this.lock : this.nearestEnemy(COMBAT.handgun.range, true, ev.aimed ? 70 : COMBAT.handgun.hipCone * 2);
      o = new THREE.Vector3(P.pos.x, 1.35, P.pos.z);
      if (t) { P.yaw = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z); const wp = ev.aimed && this.touchAimAssist ? this.weakPos(t) : null; d = new THREE.Vector3(t.pos.x - o.x, (wp ? wp.y : 1.1) - o.y, t.pos.z - o.z).normalize(); if (wp) d.set(wp.x - o.x, wp.y - o.y, wp.z - o.z).normalize(); }
      else d = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    }
    const maxT = COMBAT.handgun.range;
    const wallT = rayBoxes(o, d, maxT, this.boxes);
    let hit = null, ht = wallT, weak = false;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const tb = rayCylinder(o, d, { x: e.pos.x, y: 0, z: e.pos.z }, e.r, e.h, ht);
      const wp = this.weakPos(e);
      const tw = wp ? raySphere(o, d, wp, e.kind === 'kiro' ? 0.17 : e.kind === 'shuuyou' ? 0.28 : 0.2, ht) : Infinity;
      if (tw < ht && tw <= tb + 0.3) { hit = e; ht = tw; weak = true; }
      else if (tb < ht) { hit = e; ht = tb; weak = false; }
    }
    const end = o.clone().addScaledVector(d, Math.min(ht, maxT));
    this.fx.flash(muzzle, 0xffd890, 0.12); this.fx.tracer(muzzle, end); this.sfx.play('shot'); this.cam.shake(0.05, 0.1);
    this.gunshot = { x: P.pos.x, z: P.pos.z }; this.gunshotT = 3; this.pushAct('shot');
    this.flashMuzzle = 0.06;
    if (hit) {
      this.metrics.shotHits++;
      const dmg = Math.round(ev.dmg * (weak ? COMBAT.handgun.weakMul : 1));
      this.damageEnemy(hit, dmg, 'shot', { poise: weak ? COMBAT.poise.weak : COMBAT.poise.shot }); this.fx.sparks(end, weak ? 14 : 6, weak ? 0xffd27a : 0xd0d0d0); F.registerHit(); F.gainYoki('hit');
      hit.looks.hit(d.x, d.z, hit.brain.yaw, weak ? 1 : 0.4);
      if (weak) { this.metrics.weakHits++; F.markWeakHit(hit); if (hit.brain.alive && hit.kind !== 'shuuyou') { hit.brain.atk = null; if (hit.brain.state !== 'stagger') { hit.brain.staggerFor = 0.6; hit.brain.go('stagger', [], 'weak'); } } this.ui.toast('怯み', 'weak', 0.6); }
    } else if (ht < maxT) this.fx.sparks(end, 4, 0xa0a0a0);
  },
  syncCamera() {
    const P = this.player, F = P.fighter;
    const sh = this.cam.shakeT; this.cam.shakeT = 0;
    this.cam.update(0, P.pos, { x: 0, y: 0 }, this.boxes, { aim: F.weapon === 'handgun' && F.aimHeld, lock: this.lock && this.lock.hittable() ? this.lock.pos : null, indoor: this.area.indoor(P.pos.x, P.pos.z) });
    this.cam.shakeT = sh; this.camera.updateMatrixWorld(true);
  },
  weakPos(e) { const w = e.model.weak; if (!w) return null; const v = new THREE.Vector3(); w.getWorldPosition(v); return v; },

  // ── 異形 ──
  stepEnemy(e, dt) {
    const b = e.brain, P = this.player;
    if (!e.root.visible && b.state !== 'home') return;
    if (b.state === 'dead') { this.dissolve(e, dt); return; }
    if (b.state === 'home') { this.enterHome(e, dt); return; }
    if (!e.fleeing && b.def.tutorial && b.alive && b.hp < b.hpMax * 0.5) { e.fleeing = true; e.fleeTo = { x: 1.0, z: -64 }; b.atk = null; e.mark = null; this.bark('kiro_flee', 2.4); }
    if (e.fleeing) { this.flee(e, dt); return; }
    if (e.confusedT > 0) e.confusedT -= dt;
    const dec = this.senseTarget ? this.senseTarget(e) : null;
    const tp = dec || (this.giantMode ? this.giant.pos : P.pos);
    const dist = Math.hypot(b.pos.x - tp.x, b.pos.z - tp.z);
    const los = dist < 30 ? lineOfSight(b.pos, tp, this.boxes) : false;
    const Z = this.heitenZone;
    const sense = { player: { x: tp.x, z: tp.z, noise: dec ? 'run' : P.noise, dead: this.giantMode ? this.giant.fighter.dead : P.fighter.dead }, los, dark: this.isDark(b.pos), gunshot: this.gunshot,
      steam: this.inSteam ? this.inSteam(b.pos) : false, protect: !!e.targetCompanion, chime: this.chimeNow > 0, shelter: this.area.giant ? (e.kind === 'nurikae' ? (e.feedTgt || (e.feedTgt = this.feedTarget6(e))) : e.kind === 'kuramono' ? (e.feedTgt || (e.feedTgt = this.feedTarget7(e))) : { x: -36, z: 30 }) : null, isolated: !!this.flags.isolate6,
      inShop: !!Z && P.pos.x > Z.minX && P.pos.x < Z.maxX && P.pos.z > Z.minZ && P.pos.z < Z.maxZ, light: this.flashlightOn,
      hist: this.actHist, nurse: !!this.flags.nurse_badge, lit: this.flashlightOn && this.inFlashCone(b.pos) };
    if (e.kind === 'mamori') sense.threats = this.enemies.filter(o => o.kind === 'mimic' && o.brain.alive && o.brain.revealed && o.root.visible).map(o => ({ id: o.id, x: o.pos.x, z: o.pos.z }));
    if (this.senseExtra7) { const x7 = this.senseExtra7(e); if (x7) Object.assign(sense, x7); }
    e.targetDecoy = !!dec;
    if (this.flashlightOn && b.def.senses) sense.dark = false;    // 懐中電灯：暗くても遠くから見える
    const out = e.step(dt, sense, this.boxes, this.giantMode ? null : P);
    if (e.kind === 'sakibure' || e.kind === 'nurikae' || e.kind === 'kuramono') { this.bossEvents4(e, out.events); return; }
    this.enemyEvents(e, out.events);
    // 突進の当たり（ボス）
    if (b.atk && b.atk.phase === 'active' && b.def.attacks[b.atk.name].dash && !b.atk.hitDone) {
      const d = Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z);
      if (d < e.r + P.r + 0.35) { b.atk.hitDone = true; this.resolveEnemyHit(e, b.def.attacks[b.atk.name], true); }
    }
  },
  isDark(p) { return !!this.darkness && this.darkness > 0.5 && !this.flashlightOn; },
  inFlashCone(p) { const P = this.player.pos; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d > 12 || d < 0.01) return false; const fw = this.cam.forward(); return (dx * fw.x + dz * fw.z) / d > 0.86; },
  /** 敵の攻撃が出た：当たるか（扇・円・突進） */
  resolveEnemyHit(e, A, forced, at) {
    const P = this.player, F = P.fighter, b = e.brain;
    if (e.targetCompanion && this.hitCompanion4) { const rc = this.hitCompanion4(e, A); if (rc) return rc; }
    if (e.targetDecoy && this.decoy) {                                    // 幻術の分身を攻めた：分身が消えて「幻・見切り」
      const dd = Math.hypot(this.decoy.x - b.pos.x, this.decoy.z - b.pos.z);
      if (dd <= (A.range || 2) + 1.0 || (A.aoe && at)) { this.decoyStruck(e); return 'decoy'; }
      return 'miss';
    }
    let inRange, nearMiss;
    if (forced) { inRange = true; nearMiss = true; }
    else if (A.aoe && at) { const d = Math.hypot(P.pos.x - at.x, P.pos.z - at.z); inRange = d <= A.aoe.r + P.r * 0.5; nearMiss = d <= A.aoe.r + 1.4; }
    else {
      const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z, d = Math.hypot(dx, dz);
      const a = Math.abs(wrap(Math.atan2(dx, dz) - b.yaw)) * 180 / Math.PI;
      inRange = d <= A.range + P.r && a <= A.arc / 2 + 10; nearMiss = d <= A.range + 1.4 && a <= A.arc / 2 + 50;
    }
    const r = F.incoming({ src: e, dmg: A.dmg, parryable: A.parryable, grab: !!A.grab, inRange, nearMiss });
    this.handleFighter(F.drain());
    e.lastAttackResult = r; this.metrics.enemyAttacks[e.id] = (this.metrics.enemyAttacks[e.id] || 0) + 1;
    return r;
  },
  enemyEvents(e, evs) {
    const P = this.player, b = e.brain;
    for (const ev of evs) {
      if (this.enemyEvents5 && this.enemyEvents5(e, ev)) continue;
      if (this.enemyEvents6 && this.enemyEvents6(e, ev)) continue;
      if (this.enemyEvents7 && this.enemyEvents7(e, ev)) continue;
      switch (ev.t) {
        case 'telegraph': {
          e.mark = ev.parryable ? 'parry' : 'red'; e.markT = ev.def.windup + 0.2;
          this.sfx.play(ev.parryable ? 'tel_parry' : 'tel_red', b.pos);
          if (e.kind === 'kiro') e.weakGlow = 0.85;
          if (ev.plan) { e.copyLabel = ev.plan.label; e.copyT = (ev.def.windup || 0.6) + 0.3; if (!ev.follow) this.sfx.play('copy', b.pos); if (!this.flags.copy_bark && ev.plan.seq && ev.plan.seq.length >= 2) { this.flags.copy_bark = true; this.bark('mimic_copy', 2.6); } if (e.model.mats && e.model.mats.outline) e.model.mats.outline.color.setHex(ev.plan.white ? 0xf0e8ff : e.outlineBase); }
          const A = ev.def;
          if (A.aoe && ev.at) this.fx.decal('circle', ev.at.x, ev.at.z, { r: A.aoe.r, dur: A.windup, hold: 0.25, color: 0xff3040 });
          else if (A.dash) this.fx.decal('line', b.pos.x, b.pos.z, { r: A.range, w: e.r * 2 + 0.6, yaw: b.yaw, dur: A.windup, hold: 0.4, color: 0xff3040 });
          else if (e.kind === 'shuuyou' && A.parryable) this.fx.decal('arc', b.pos.x, b.pos.z, { r: A.range, arc: A.arc, yaw: b.yaw, dur: A.windup, hold: 0.15, color: 0xfff0e0 });
          this.companionSeeTelegraph(e, ev.parryable ? 'parry' : 'red');
          break;
        }
        case 'attack': {
          const A = ev.def;
          if (A.dash) { this.sfx.play('tel_red', b.pos); break; }      // 突進：当たりは stepEnemy で
          this.resolveEnemyHit(e, A, false, ev.at);
          if (ev.name === 'shutter' || ev.name === 'slam') { this.sfx.play('slam', b.pos); this.cam.shake(0.18, 0.3); const p = ev.at || { x: b.pos.x + Math.sin(b.yaw) * 2, z: b.pos.z + Math.cos(b.yaw) * 2 }; this.fx.dust(p, 18); for (let i = 0; i < 6; i++) this.fx.puff(p.x + (Math.random() - 0.5) * 2, 0.2, p.z + (Math.random() - 0.5) * 2, 0, 0.4, 0, 0x8a8478, 1.0, 0.4); }
          if (ev.name === 'blanket') { this.sfx.play('swing_heavy', ev.at || b.pos); }
          if (ev.name === 'sweep') this.sfx.play('chairs', b.pos);
          if (ev.name === 'mwave') { this.sfx.play('wave', b.pos); this.cam.shake(0.2, 0.35); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; this.fx.puff(b.pos.x + Math.sin(a) * 1.2, 0.3, b.pos.z + Math.cos(a) * 1.2, Math.sin(a) * 3.5, 0.2, Math.cos(a) * 3.5, 0x2a1040, 0.8, 0.6); } }
          if (ev.name === 'mshot' && ev.at) { const h = new THREE.Vector3(b.pos.x, e.h * 0.7, b.pos.z); this.fx.streak(h, new THREE.Vector3(ev.at.x, 0.3, ev.at.z), 0x8a40ff, 0.35, 0.05); this.sfx.play('fire_hit', ev.at); }
          if (e.kind === 'kiro') e.weakGlow = 0;
          break;
        }
        case 'crash': this.sfx.play('crash', b.pos); this.cam.shake(0.22, 0.35); this.fx.dust(b.pos, 22); break;
        // 第3章
        case 'reveal': e.revealT = 0; this.sfx.play('mimic_reveal', b.pos); e.mark = 'red'; e.markT = 1.0; if (!this.flags.mimic_first) { this.flags.mimic_first = true; this.later(0.6, () => this.bark('mimic_first', 3)); } else this.bark('mimic_reveal', 2); this.metrics.mimicReveals = (this.metrics.mimicReveals || 0) + 1; break;
        case 'tenki': this.metrics.tenki = true; break;
        case 'voice': this.sfx.play('mimic_voice', b.pos); if (this.flags.memo) this.bark('utsushimi_voice_hint', 3); this.metrics.voices = (this.metrics.voices || 0) + 1; break;
        case 'voiceEnd': break;
        case 'protect': { const o = this.enemies.find(x => x.id === ev.id); if (o && o.hittable() && Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) < ev.range + o.r) { this.damageEnemy(o, ev.dmg, 'slash', { poise: 40 }); o.looks.hit(o.pos.x - b.pos.x, o.pos.z - b.pos.z, o.brain.yaw, 1.2); this.sfx.play('hit_heavy', o.pos); this.cam.shake(0.08, 0.2); this.metrics.mamoriHits = (this.metrics.mamoriHits || 0) + 1; } break; }
        case 'state': if (ev.to !== 'hostile') e.mark = null; if (ev.to === 'stagger' || ev.to === 'dead' || ev.to === 'down') { e.mark = null; e.weakGlow = 0; } break;
        case 'broken': this.sfx.play('broken', b.pos); this.ui.toast('崩し', 'parry', 0.8); this.metrics.broken = (this.metrics.broken || 0) + 1; break;
        case 'notice': this.sfx.play('notice', b.pos); e.justNoticed = 1.0; if (e.kind === 'kiro' && Math.random() < 0.5) { this.bark('kiro_notice', 2.2); this.sfx.play('kiro_voice', b.pos); } break;
        case 'knock': this.sfx.play('knock', b.pos); break;
        case 'resonate': { if (e.kind !== 'outou') break; let n = 0; for (const o of this.enemies) if (o !== e && o.kind === 'outou' && Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) < (b.def.resonance || { r: 7 }).r) { const ev2 = []; if (o.brain.state !== 'hostile' && o.brain.resonate(ev2, 0.3, P.pos)) n++; this.enemyEvents(o, ev2); } if (n) { this.metrics.resonance = (this.metrics.resonance || 0) + n; if (!this.flags.reso_bark) { this.flags.reso_bark = true; this.bark('outou_wake', 2.4); } this.sfx.play('outou_voice', b.pos); } break; }
        case 'say': if (e.kind === 'outou') { if (Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z) < 11) { this.bark(ev.key, 2.2); this.sfx.play('outou_voice', b.pos); } break; } if (ev.key === 'shuuyou_rollcall') { this.sfx.play('rollcall', b.pos); this.bark('shuuyou_rollcall', 1.6); } else if (e.kind === 'kanja') { if (Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z) < 9) { this.bark(ev.key, 2.4); this.sfx.play('kanja_voice', b.pos); } } else if (e.kind === 'mimic' || e.kind === 'utsushimi') { if (Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z) < 15) { this.bark(ev.key, 2.4); this.sfx.play('mimic_voice', b.pos); } } else if (e.kind === 'mamori') { this.bark(ev.key, 2.4); this.sfx.play('kanja_voice', b.pos); } else { this.bark(ev.key, 3); this.sfx.play('heiten_voice', b.pos); } break;
        case 'step': this.heitenStep(ev.id); break;
        case 'reset': this.heitenStep('reset'); break;
        case 'helped': this.bark('heiten_helped', 2); this.sfx.play('ui_ok'); break;
        case 'wrong': if (e.kind === 'shuuyou') { this.bark('shuuyou_wrong', 3); this.sfx.play('pa_cut', b.pos); this.metrics.wrongCalls = (this.metrics.wrongCalls || 0) + 1; } else { this.bark('heiten_wrong', 2); this.sfx.play('ui_ng'); } break;
        case 'misread': this.ui.log('……家族と思っているようだ'); break;
        case 'rescued': {
          this.sfx.play('rescue'); this.resolve(e, 'rescue');
          if (e.kind === 'heiten') { this.bark('heiten_rescued', 3.5); this.heitenSign.set('本日は\n閉店しました'); this.heitenStep('rest'); }
          else if (e.kind === 'shuuyou') this.onBossResolved('rescue');
          else if (e.kind === 'utsushimi') this.onBossResolved3('rescue');
          else if (e.kind === 'kanja') { this.metrics.kanjaRescued = (this.metrics.kanjaRescued || 0) + 1; }
          else if (e.kind === 'mamori') { /* 第3章の山場：storyTick3 が演出へ */ }
          else if (!this.flags.first_rescue) { this.flags.first_rescue = true; this.bark('first_rescue'); }
          break;
        }
        case 'neutralized': if (e.kind === 'kanja' || e.kind === 'outou') { this.resolve(e, 'neutralize'); if (e.kind === 'outou') this.sfx.play('steam', b.pos); break; } this.sfx.play('shutter'); this.resolve(e, 'neutralize'); this.onBossResolved('neutralize'); break;
        case 'die': {
          this.sfx.play('die', b.pos); this.fx.mist(new THREE.Vector3(b.pos.x, 0, b.pos.z), 70, e.h); this.resolve(e, 'kill'); e.fadeT = 0;
          if (this.lock === e) this.lock = null;
          if (e.kind === 'heiten') this.bark('heiten_killed', 3);
          else if (e.kind === 'shuuyou') this.onBossResolved('kill');
          else if (e.kind === 'utsushimi') this.onBossResolved3('kill');
          else if (!this.flags.first_kill) { this.flags.first_kill = true; this.bark('first_kill'); }
          break;
        }
        case 'calm': e.mark = null; break;
        // ボス
        case 'phase': this.onBossPhase(ev.n); break;
        case 'rollcall': this.metrics.rollcalls = (this.metrics.rollcalls || 0) + 1; this.sfx.play('pa_chime'); this.ui.toast('点呼', 'iai', 1.2); this.hint(this.flags.roster_done ? '点呼のあいだ、舞台の前のマイクで名前を呼べる' : '点呼……。名簿で名前が分かれば、呼べるかもしれない'); break;
        case 'rollcallEnd': case 'rollcallBroken': this.hint(null); break;
        case 'stuck': this.sfx.play('crash', b.pos); this.bark('shuuyou_stuck', 3); this.hint('今なら器具庫のシャッターを下ろせる（入口の右のスイッチ）'); break;
        case 'unstuck': this.hint(null); break;
      }
    }
  },
  heitenStep(id) {
    const L = this.areaLight(l => l.shop), sh = this.area.dyn.heitenShutter;
    if (id === 'lights' && L) L.off = true;
    if (id === 'shutter' && sh) { sh.target = sh.down; this.sfx.play('shutter', { x: 5, z: -40 }); }
    if (id === 'reset' && L) { L.off = false; if (sh) sh.target = sh.up; }
    if (id === 'rest' && L) { L.off = true; if (sh) sh.target = sh.down; }
    if (id === 'register') this.sfx.play('register', { x: 9.4, z: -42.4 });
  },
  resolve(e, how) {
    const k = e.kind; this.resol[k] = this.resol[k] || { rescue: 0, neutralize: 0, escape: 0, kill: 0 }; this.resol[k][how]++;
    this.enemyRes[e.id] = how;
    this.WP.bump(k, how === 'rescue' ? 'rescued' : 'killed');
    if (this.companion.brain.grab && this.companion.brain.grab.id === e.id) this.freeCompanion(e, false);
    this.autosaveReq = true;
    if (this.onEnemyResolvedStory) this.onEnemyResolvedStory(e, how);
  },
  allResolved() { return this.enemies.every(e => e.brain.resolution); },
  count(kind, how) { return (this.resol[kind] || {})[how] || 0; },
  heitenStatus() { const r = this.enemyRes.heiten_1; return r === 'rescue' ? '救った' : r === 'kill' ? '倒した' : 'まだ'; },
  bossStatus() { const r = this.enemyRes.shuuyou_1; return r === 'rescue' ? '救った' : r === 'kill' ? '倒した' : r === 'neutralize' ? '閉じ込めた' : 'まだ'; },
  dissolve(e, dt) {
    if (e.fadeT == null) e.fadeT = 0;
    e.fadeT += dt;
    const k = Math.min(1, e.fadeT / 1.8);
    e.setDissolve(k); e.y = -k * 0.15;
    if (Math.random() < 0.5 && k < 1) this.fx.mist(new THREE.Vector3(e.pos.x, 0, e.pos.z), 3, e.h * (1 - k * 0.6));
    if (k >= 1) e.root.visible = false;
  },
  enterHome(e, dt) {
    if (e.homeT == null) { e.homeT = 0; const d = this.area.dyn['door_' + e.brain.home]; if (d) d.closeAt = 2.0; }
    e.homeT += dt;
    if (e.homeT > 1.2) e.root.visible = false;
  },
  /** 序章の帰路：追い払う（体力が半分を切ると、暗がりへ帰っていく＝逃げる） */
  flee(e, dt) {
    const b = e.brain, t = e.fleeTo;
    const dx = t.x - b.pos.x, dz = t.z - b.pos.z, L = Math.hypot(dx, dz);
    if (L > 0.3) { const m = Math.min(L, 2.2 * dt); b.pos.x += dx / L * m; b.pos.z += dz / L * m; b.yaw = turnTo(b.yaw, Math.atan2(dx, dz), 0.1); e.speed = 2.2; e.phase += m * 3.4; }
    e.fleeT = (e.fleeT || 0) + dt;
    if (e.fleeT > 1.5) e.setDissolve(Math.min(1, (e.fleeT - 1.5) / 2.5));
    if (e.fleeT > 4.2 && e.root.visible) { e.root.visible = false; b.resolution = 'escape'; b.state = 'gone'; this.resolve(e, 'escape'); }
  },
  // ── 相棒をつかむ・助ける ──
  stepCompanionThreats() {
    const C = this.companion, cb = C.brain;
    if (!C.root.visible || !['follow', 'hide'].includes(cb.mode) || this.cut.active) return;
    for (const e of this.enemies) {
      if (e.kind === 'shuuyou' || !e.brain.alive || e.brain.state !== 'hostile' || e.brain.atk || e.held) continue;
      if ((e.grabCd || 0) > this.playSec) continue;
      const d = Math.hypot(e.pos.x - cb.pos.x, e.pos.z - cb.pos.z);
      const dp = Math.hypot(this.player.pos.x - cb.pos.x, this.player.pos.z - cb.pos.z);
      if (d < 1.1 && dp > 2.5 && cb.grabbedBy(e.id)) {
        e.held = true; e.brain.cool = 99; e.grabCd = this.playSec + 25;
        this.bark('companion_grabbed', 3); this.sfx.play('scream', cb.pos); this.metrics.companionGrabbed = (this.metrics.companionGrabbed || 0) + 1;
        break;
      }
    }
  },
  freeCompanion(e, byPlayer) {
    const cb = this.companion.brain;
    if (byPlayer) { if (cb.rescued()) { this.bark('companion_saved', 2.6); this.metrics.companionSaved = (this.metrics.companionSaved || 0) + 1; } }
    else if (cb.mode === 'grabbed') { cb.mode = 'follow'; cb.grab = null; }
    if (e) { e.held = false; e.brain.cool = 0.8; }
  },
  companionSeeTelegraph(e, kind) { e.tele = kind; e.teleT = 0.6; },
};
