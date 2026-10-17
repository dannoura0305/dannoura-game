// 敵の試作（フェーズ 4・試験マップ専用の名前のない「異形」。境界侵食の人物・敵とは別物）。DOM・three.js なし（node で試験）。
// 状態：patrol（巡回：地図仕様の道の点を順に）→ investigate（物音・灯りを調べに行く）→ chase（見つけた：格子の A* で追う）
//       → search（見失った：最後に見た所のまわりを探す）→ patrol。捕まえたら caught の出来事（画面が暗くなりチェックポイントへ戻すのは main.js）。
// 知覚：視界（扇形・距離・遮る物＝World.sightBlocked）・灯り（懐中電灯がついていると遠くから見える／光を当てると気づく）・音（走る・歩く・戸）。
// 動き：プレイヤーと同じ操作（Controller：当たり・坂・段差）。閉じた戸は前で止まって開ける（時間がかかる＝足止めになる）。
// 乱数は種つき（同じ入力の並びなら同じ動き＝試験で確かめる）。
import { Controller } from '../runtime/controller.js';
import { findPath, nearestCell, cellPos } from '../nav/grid.js';
import { rng, hashStr } from '../core/rng.js';

export const ENEMY_DEFAULTS = {
  speed: { patrol: 1.25, investigate: 1.9, chase: 4.1, search: 1.6 },   // m/s（プレイヤーは歩き 2.4・走り 5.2：走れば逃げられる）
  sight: { range: 17, fov: 110, lightRange: 26, near: 2.2, dark: 0.75 },   // m・度。near＝気配（真後ろでも気づく）・dark＝灯りを消した時の見える距離の倍率（夕暮れ）
  hear: { walk: 4.5, run: 13, door: 10 },                                  // m
  catchR: 0.95, loseT: 3.5, searchT: 14, repath: 0.35, openTime: 1.4, alertRate: 1.6,
};

const D2R = Math.PI / 180;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

export class Enemy {
  /** def：layout.gameplay.enemies[i]（id・spawn [x,y,z]・route [[x,y,z]…]・speed・sight・hear）。ctx：{ world, grid, doors } */
  constructor(def, { world, grid, doors = null }, seed = 'enemy') {
    this.def = def; this.world = world; this.G = grid; this.doors = doors;
    this.cfg = { speed: Object.assign({}, ENEMY_DEFAULTS.speed, def.speed), sight: Object.assign({}, ENEMY_DEFAULTS.sight, def.sight), hear: Object.assign({}, ENEMY_DEFAULTS.hear, def.hear) };
    for (const k of ['catchR', 'loseT', 'searchT', 'repath', 'openTime', 'alertRate']) this.cfg[k] = def[k] ?? ENEMY_DEFAULTS[k];
    this.seed = hashStr(seed + ':' + def.id); this.reset();
  }
  reset(at = null) {
    const p = at || this.def.spawn;
    this.ctl = new Controller(this.world, p, { radius: 0.32, walk: this.cfg.speed.patrol, run: this.cfg.speed.chase });
    this.rand = rng(this.seed); this.state = 'patrol'; this.wp = this._nearestWp(); this.path = []; this.pi = 0; this.repathT = 0;
    this.yaw = 0; this.alert = 0; this.lastSeen = null; this.lostT = 0; this.searchT = 0; this.searchPts = []; this.waitT = 0; this.goal = null;
    this.openT = 0; this.openDoor = null; this.stunT = 0; this.sees = false; this.t = 0; this.stuckT = 0; this.lastPos = [p[0], p[2]];
    this.yaw = Math.atan2((this.def.route[this.wp] || p)[0] - p[0], (this.def.route[this.wp] || p)[2] - p[2]) || 0;
  }
  get pos() { return [this.ctl.x, this.ctl.y, this.ctl.z]; }
  _nearestWp() { let b = 0, bd = Infinity; (this.def.route || []).forEach((w, i) => { const d = Math.hypot(w[0] - this.ctl.x, w[2] - this.ctl.z); if (d < bd) { bd = d; b = i; } }); return b; }
  /** 捕まえた後など：しばらく何もしない（n 秒）＋遠い巡回の点へ戻す */
  stun(sec, farFrom = null) {
    if (farFrom && this.def.route && this.def.route.length) {
      let b = 0, bd = -1; this.def.route.forEach((w, i) => { const d = Math.hypot(w[0] - farFrom[0], w[2] - farFrom[2]); if (d > bd) { bd = d; b = i; } });
      this.reset(this.def.route[b]); this.wp = (b + 1) % this.def.route.length;
    }
    this.stunT = sec; this.state = 'patrol'; this.alert = 0;
  }
  _setGoal(p) { this.goal = p; this.repathT = 0; }
  _plan() {
    const G = this.G, s = nearestCell(G, this.ctl.x, this.ctl.z, 2.0, this.ctl.y), t = nearestCell(G, this.goal[0], this.goal[2], 2.5, this.goal[1]);
    if (s < 0 || t < 0) { this.path = [this.goal]; this.pi = 0; return; }
    const r = findPath(G, s, t, { maxExpand: this.state === 'chase' ? 40000 : 25000 });
    // 升目の並びを間引く（3 升目ごと）＋最後は目標そのもの
    const pts = []; for (let i = 0; i < r.cells.length; i += 3) pts.push(cellPos(G, r.cells[i]));
    if (r.cells.length) pts.push(cellPos(G, r.cells[r.cells.length - 1]));
    if (!r.partial) pts.push(this.goal);
    this.path = pts; this.pi = 0; this.partial = r.partial;
  }
  /** 見えるか（扇形・距離・遮り）。戻り値：0..1 の見え方（近い・灯りほど大きい） */
  _see(pl) {
    const S = this.cfg.sight, dx = pl.x - this.ctl.x, dz = pl.z - this.ctl.z, d = Math.hypot(dx, dz);
    if (Math.abs(pl.y - this.ctl.y) > 4) return 0;
    if (d < S.near) return 1;
    const range = pl.light ? S.lightRange : S.range * (S.dark ?? 0.75) * (pl.inside ? 0.8 : 1);
    if (d > range) return 0;
    if (Math.abs(angDiff(Math.atan2(dx, dz), this.yaw)) > S.fov * D2R / 2) return 0;
    if (this.world.sightBlocked([this.ctl.x, this.ctl.y + 1.7, this.ctl.z], [pl.x, pl.y + 1.3, pl.z])) return 0;
    return Math.max(0.15, 1 - d / range);
  }
  /** 懐中電灯の光が当たっているか（プレイヤーの向き pl.yaw の ±14°・14m） */
  _litBy(pl) {
    if (!pl.light) return false;
    const dx = this.ctl.x - pl.x, dz = this.ctl.z - pl.z, d = Math.hypot(dx, dz);
    if (d > 14 || Math.abs(angDiff(Math.atan2(dx, dz), pl.yaw)) > 14 * D2R) return false;
    return !this.world.sightBlocked([pl.x, pl.y + 1.4, pl.z], [this.ctl.x, this.ctl.y + 1.5, this.ctl.z]);
  }
  /**
   * dt 秒すすめる。pl＝{ x,y,z, yaw, light, running, moving, inside }。noises＝[{ x,y,z, r, kind }]（この間に出た音）
   * 戻り値：出来事 [{ type: 'spotted'|'lost'|'heard'|'caught'|'door'|'search'|'patrol', ... }]
   */
  update(dt, pl, noises = []) {
    const ev = [], C = this.cfg; this.t += dt;
    if (this.stunT > 0) { this.stunT -= dt; this.sees = false; return ev; }
    // ── 知覚
    const seen = pl ? this._see(pl) : 0, lit = pl ? this._litBy(pl) : false;
    this.sees = seen > 0;
    if (seen > 0) this.alert = Math.min(1.5, this.alert + dt * C.alertRate * (0.35 + seen) * (this.state === 'chase' ? 3 : 1));
    else this.alert = Math.max(0, this.alert - dt * 0.25);
    if (lit && this.state !== 'chase') { this.state = 'investigate'; this._setGoal([pl.x, pl.y, pl.z]); ev.push({ type: 'heard', kind: 'light' }); }
    if (seen > 0 && this.alert >= 1) {
      if (this.state !== 'chase') { ev.push({ type: 'spotted' }); this.repathT = 0; this.waitT = 0; this.openT = 0; this.openDoor = null; }
      this.state = 'chase'; this.lastSeen = [pl.x, pl.y, pl.z]; this.lostT = 0;
    }
    if (this.state !== 'chase') for (const n of noises) {
      const d = Math.hypot(n.x - this.ctl.x, n.z - this.ctl.z);
      if (d <= n.r) { this.state = 'investigate'; this._setGoal([n.x, n.y, n.z]); this.alert = Math.max(this.alert, 0.45); ev.push({ type: 'heard', kind: n.kind }); break; }
    }
    // ── 状態ごとの目標
    let speed = C.speed.patrol, run = false;
    if (this.state === 'chase') {
      speed = C.speed.chase; run = true;
      if (seen > 0) { this.lastSeen = [pl.x, pl.y, pl.z]; this.lostT = 0; } else this.lostT += dt;
      const tgt = seen > 0 ? [pl.x, pl.y, pl.z] : this.lastSeen;
      this.repathT -= dt; if (this.repathT <= 0 || !this.goal) { this.goal = tgt; this._plan(); this.repathT = C.repath; }
      if (pl && Math.hypot(pl.x - this.ctl.x, pl.z - this.ctl.z) < C.catchR && Math.abs(pl.y - this.ctl.y) < 1.3) { ev.push({ type: 'caught' }); return ev; }
      const atLast = Math.hypot(this.lastSeen[0] - this.ctl.x, this.lastSeen[2] - this.ctl.z) < 1.2;
      if (this.lostT > C.loseT && (atLast || this.lostT > C.loseT * 2.5)) { this.state = 'search'; this.searchT = C.searchT; this.searchPts = this._searchPoints(this.lastSeen); this._setGoal(this.searchPts.shift()); ev.push({ type: 'lost' }); }
    } else if (this.state === 'investigate') {
      speed = C.speed.investigate;
      if (this.repathT <= 0 && this.goal) { this._plan(); this.repathT = 99; }
      if (this.goal && Math.hypot(this.goal[0] - this.ctl.x, this.goal[2] - this.ctl.z) < 1.3) { this.state = 'search'; this.searchT = C.searchT * 0.6; this.searchPts = this._searchPoints(this.goal); this._setGoal(this.searchPts.shift()); ev.push({ type: 'search' }); }
    } else if (this.state === 'search') {
      speed = C.speed.search; this.searchT -= dt;
      if (this.repathT <= 0 && this.goal) { this._plan(); this.repathT = 99; }
      if (this.waitT > 0) { this.waitT -= dt; this.yaw += dt * 1.6 * (Math.sin(this.t * 0.7) > 0 ? 1 : -1); speed = 0; }
      else if (!this.goal || Math.hypot(this.goal[0] - this.ctl.x, this.goal[2] - this.ctl.z) < 1.0) { this.waitT = 1.2 + this.rand() * 1.5; this._setGoal(this.searchPts.shift() || null); }
      if (this.searchT <= 0 || (!this.goal && this.waitT <= 0)) { this.state = 'patrol'; this.wp = this._nearestWp(); this.goal = null; ev.push({ type: 'patrol' }); }
    }
    if (this.state === 'patrol') {
      const R = this.def.route || [];
      if (R.length) {
        const w = R[this.wp];
        if (!this.goal || this.goal !== w) this._setGoal(w);
        if (this.repathT <= 0) { this._plan(); this.repathT = 99; }
        if (Math.hypot(w[0] - this.ctl.x, w[2] - this.ctl.z) < 1.2) { this.wp = (this.wp + 1) % R.length; this.waitT = 0.8 + this.rand() * 1.6; this._setGoal(R[this.wp]); }
        if (this.waitT > 0) { this.waitT -= dt; speed = 0; }
      } else speed = 0;
    }
    // ── 何かが見えている（まだ見つけていない）：立ち止まってそちらを向く（じっと見る）
    if (seen > 0 && this.state !== 'chase' && pl) {
      const da = angDiff(Math.atan2(pl.x - this.ctl.x, pl.z - this.ctl.z), this.yaw); this.yaw += Math.max(-dt * 3, Math.min(dt * 3, da)); speed = 0; this.staring = true;
    } else this.staring = false;
    // ── 戸（閉じた戸の前で止まって開ける）
    if (this.openT > 0) {
      this.openT -= dt; speed = 0;
      if (this.openT <= 0 && this.openDoor) { const r = this.doors.setTarget(this.openDoor.id, 1, 'enemy'); ev.push({ type: 'door', id: this.openDoor.id, ok: r.ok }); this.openDoor = null; }
    }
    // ── 動く（道の点を順に。look m 先へ）
    if (speed > 0 && this.path.length) {
      while (this.pi < this.path.length - 1 && Math.hypot(this.path[this.pi][0] - this.ctl.x, this.path[this.pi][2] - this.ctl.z) < 0.6) this.pi++;
      const p = this.path[this.pi], dx = p[0] - this.ctl.x, dz = p[2] - this.ctl.z, L = Math.hypot(dx, dz);
      if (L > 0.05) {
        if (this.doors && this.openT <= 0) {
          const look = [this.ctl.x + dx / L * Math.min(L, 1.1), this.ctl.z + dz / L * Math.min(L, 1.1)], d = this.doors.closedOnSegment([this.ctl.x, this.ctl.z], look);
          if (d && !d.locked) { this.openDoor = d; this.openT = C.openTime * (d.kind === 'hinged' ? 0.8 : 1); ev.push({ type: 'door', id: d.id, start: true }); }
        }
        if (this.openT <= 0) {
          const want = Math.atan2(dx, dz), da = angDiff(want, this.yaw); this.yaw += Math.max(-dt * 5, Math.min(dt * 5, da));
          this.ctl.walk = speed; this.ctl.run = speed; this.ctl.update(dt, [dx / L, dz / L], run);
        }
      }
      // 引っかかり：1.5 秒ほぼ動かない → 道を作り直す
      const mv = Math.hypot(this.ctl.x - this.lastPos[0], this.ctl.z - this.lastPos[1]); this.lastPos = [this.ctl.x, this.ctl.z];
      this.stuckT = mv < speed * dt * 0.2 && this.openT <= 0 ? this.stuckT + dt : 0;
      if (this.stuckT > 1.5) { this.stuckT = 0; this.repathT = 0; if (this.state === 'patrol') this.wp = (this.wp + 1) % Math.max(1, (this.def.route || []).length); }
    } else this.ctl.update(dt, [0, 0], false);
    return ev;
  }
  /** 探す点：p のまわり 3〜8m の歩ける所を 4 つ（種つきの乱数） */
  _searchPoints(p) {
    const out = [], G = this.G;
    for (let k = 0; k < 16 && out.length < 4; k++) {
      const a = this.rand() * Math.PI * 2, r = 3 + this.rand() * 5, x = p[0] + Math.sin(a) * r, z = p[2] + Math.cos(a) * r;
      const c = nearestCell(G, x, z, 1.5); if (c >= 0) out.push(cellPos(G, c));
    }
    return out;
  }
  /** 状態の指紋（試験） */
  digest() { return `${this.state}:${this.ctl.x.toFixed(3)},${this.ctl.z.toFixed(3)}:${this.yaw.toFixed(3)}:${this.alert.toFixed(3)}`; }
}

/** プレイヤーの足音（走る＝大きい）。dt 秒ごとに呼ぶ → 音の出来事か null（0.45 秒ごと） */
export function footstepNoise(state, pl, dt, hear = ENEMY_DEFAULTS.hear) {
  state.t = (state.t || 0) - dt;
  if (!pl.moving || state.t > 0) return null;
  state.t = pl.running ? 0.32 : 0.5;
  return { x: pl.x, y: pl.y, z: pl.z, r: pl.running ? hear.run : hear.walk, kind: pl.running ? 'run' : 'walk' };
}
