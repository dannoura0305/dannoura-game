// 相棒（仮 ID companion）の同行の AI。DOM・three.js なし（node でテスト）。
// ・ついてくる：だんのうらの通った跡（足跡の点）をたどり、2m ほど後ろを歩く（角で引っかからない）。
// ・隠れる：敵がこちらに気づいて近いと、敵から離れた隠れ場所（区画の hideSpots）へ行ってしゃがむ。静かになると戻る。
// ・声で知らせる：見えていない向き（背中側）の敵の予兆、赤い予兆（つかみ）、新しく気づいた敵。
// ・守られる：敵につかまれることがある。だんのうらが敵を叩くと離れる（信頼が上がる）。放っておくと自分で逃げる（信頼が下がる）。
export const CFG = { follow: 2.1, walk: 2.4, run: 5.0, crumb: 0.45, crumbs: 80, hideNear: 8.5, calm: 12, calmT: 2.0, warnCd: 4.5, grabFree: 8 };

export class CompanionBrain {
  constructor(opt = {}) {
    this.pos = { x: opt.x || 0, z: opt.z || 0 }; this.yaw = opt.yaw || 0;
    this.mode = opt.mode || 'wait';        // 'wait'（その場）| 'follow' | 'hide' | 'grabbed' | 'scripted'
    this.trail = []; this.hide = null; this.calmT = 0; this.warnCd = 0; this.grab = null; this.trust = opt.trust ?? 50;
    this.seen = new Set();
  }
  setMode(m) { this.mode = m; if (m !== 'hide') this.hide = null; }
  /** だんのうらの位置を足跡に積む（毎ステップ） */
  crumb(p) {
    const L = this.trail[this.trail.length - 1];
    if (!L || Math.hypot(L.x - p.x, L.z - p.z) >= CFG.crumb) { this.trail.push({ x: p.x, z: p.z }); if (this.trail.length > CFG.crumbs) this.trail.shift(); }
  }
  teleportBehind(p, yaw) { this.pos = { x: p.x - Math.sin(yaw) * 1.6, z: p.z - Math.cos(yaw) * 1.6 }; this.trail = [{ x: p.x, z: p.z }]; }
  grabbedBy(id) { if (this.mode === 'grabbed') return false; this.prevMode = this.mode === 'hide' ? 'follow' : this.mode; this.mode = 'grabbed'; this.grab = { id, t: 0 }; return true; }
  /** だんのうらが助けた（つかんでいる敵を叩いた） */
  rescued() { if (this.mode !== 'grabbed') return false; this.mode = this.prevMode || 'follow'; this.grab = null; this.trust = Math.min(100, this.trust + 5); return true; }
  /**
   * sense = { player:{x,z,yaw,speed,dead}, enemies:[{id,x,z,hostile,attacking,tele:'parry'|'red'|null,justNoticed}], hideSpots:[{x,z}], dt }
   * 戻り値 { move:{x,z,speed}|null, face:{x,z}|null, events:[{t:'warn',key}|{t:'freed'}...], pose }
   */
  update(dt, sense) {
    const out = { move: null, face: null, events: [], pose: this.mode };
    const P = sense.player, E = sense.enemies || [];
    if (this.warnCd > 0) this.warnCd -= dt;
    if (this.mode === 'grabbed') {
      this.grab.t += dt; out.pose = 'grabbed';
      if (this.grab.t >= CFG.grabFree) { this.mode = 'follow'; this.grab = null; this.trust = Math.max(0, this.trust - 5); out.events.push({ t: 'escaped' }); }
      return out;
    }
    if (this.mode === 'wait' || this.mode === 'scripted') return out;
    // 声で知らせる（隠れていても声は出す）
    if (P && !P.dead && this.warnCd <= 0) {
      for (const e of E) {
        if (!e.hostile && !e.justNoticed) continue;
        const ang = Math.atan2(e.x - P.x, e.z - P.z) - P.yaw; const a = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
        const d = Math.hypot(e.x - P.x, e.z - P.z);
        if (e.tele === 'red' && d < 6) { out.events.push({ t: 'warn', key: 'warn_red', id: e.id }); this.warnCd = CFG.warnCd; break; }
        if (e.tele && a > 1.9 && d < 6) { out.events.push({ t: 'warn', key: 'warn_behind', id: e.id }); this.warnCd = CFG.warnCd; break; }
        if (e.justNoticed && !this.seen.has(e.id) && d < 14) { this.seen.add(e.id); out.events.push({ t: 'warn', key: 'warn_notice', id: e.id }); this.warnCd = CFG.warnCd; break; }
      }
    }
    // 危ない敵が近いか
    let threat = null, td = Infinity;
    for (const e of E) { if (!e.hostile) continue; const d = Math.min(Math.hypot(e.x - this.pos.x, e.z - this.pos.z), P ? Math.hypot(e.x - P.x, e.z - P.z) + 2 : Infinity); if (d < td) { td = d; threat = e; } }
    if (threat && td < CFG.hideNear) { this.calmT = 0; if (this.mode !== 'hide') { this.mode = 'hide'; this.hide = this.pickHide(sense, E); out.events.push({ t: 'hide' }); } }
    if (this.mode === 'hide') {
      if (!threat || td > CFG.calm) { this.calmT += dt; if (this.calmT > CFG.calmT) { this.mode = 'follow'; this.hide = null; out.events.push({ t: 'unhide' }); } }
      const h = this.hide;
      if (h) {
        const d = Math.hypot(h.x - this.pos.x, h.z - this.pos.z);
        if (d > 0.35) { out.move = { x: h.x, z: h.z, speed: CFG.run }; out.face = { x: h.x, z: h.z }; out.pose = 'follow'; }
        else { out.pose = 'hide'; if (threat) out.face = { x: threat.x, z: threat.z }; }
      } else out.pose = 'cower';
      return out;
    }
    // ついてくる：足跡をたどる
    if (P) {
      const dP = Math.hypot(P.x - this.pos.x, P.z - this.pos.z);
      // 足跡のうち、自分に見える最も新しい点（だんのうらから follow m 以上離れた点）
      let tgt = null;
      for (let i = this.trail.length - 1; i >= 0; i--) { const c = this.trail[i]; if (Math.hypot(c.x - P.x, c.z - P.z) >= CFG.follow) { tgt = c; break; } }
      if (!tgt && dP > CFG.follow + 0.6) tgt = this.trail[0] || P;
      // 自分より後ろの足跡は捨てる
      while (this.trail.length > 1 && Math.hypot(this.trail[0].x - this.pos.x, this.trail[0].z - this.pos.z) < 0.5) this.trail.shift();
      if (tgt && dP > CFG.follow) {
        const next = this.trail.length ? this.trail[0] : tgt;
        const goal = Math.hypot(next.x - this.pos.x, next.z - this.pos.z) > 0.3 ? next : tgt;
        const sp = dP > 6 ? CFG.run : dP > 3.5 ? (CFG.walk + CFG.run) / 2 : CFG.walk;
        out.move = { x: goal.x, z: goal.z, speed: sp }; out.face = { x: goal.x, z: goal.z };
      } else if (dP < 1.2) {                                     // 近すぎる：少し下がる
        const ax = this.pos.x - P.x, az = this.pos.z - P.z, L = Math.hypot(ax, az) || 1;
        out.move = { x: this.pos.x + ax / L, z: this.pos.z + az / L, speed: 1.2 };
      } else out.face = { x: P.x, z: P.z };
      out.pose = 'follow';
    }
    return out;
  }
  /** 隠れ場所：敵からいちばん遠く、自分から近すぎず遠すぎない所 */
  pickHide(sense, E) {
    const spots = sense.hideSpots || [];
    let best = null, bs = -Infinity;
    for (const h of spots) {
      const dMe = Math.hypot(h.x - this.pos.x, h.z - this.pos.z); if (dMe > 18) continue;
      let dE = Infinity; for (const e of E) if (e.hostile) dE = Math.min(dE, Math.hypot(h.x - e.x, h.z - e.z));
      const s = Math.min(dE, 12) * 1.0 - dMe * 0.35;
      if (s > bs) { bs = s; best = h; }
    }
    if (best) return { x: best.x, z: best.z };
    // 隠れ場所が無い：敵の反対へ 4m
    let cx = 0, cz = 0, n = 0; for (const e of E) if (e.hostile) { cx += e.x; cz += e.z; n++; }
    if (!n) return null;
    cx /= n; cz /= n; const ax = this.pos.x - cx, az = this.pos.z - cz, L = Math.hypot(ax, az) || 1;
    return { x: this.pos.x + ax / L * 4, z: this.pos.z + az / L * 4 };
  }
}
