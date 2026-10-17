// 歩く人の操作（地形に沿う・当たり・坂の上限・段差）。DOM・three.js なし（node で試験できる）。
// 検査の格子（mapkit/nav/grid.js）と同じ World（mapkit/core/world.js）を使う：格子で「届く」と出た所は、この操作でも歩いて行ける。
// 見えない壁（boundary: invisible_wall_on_cliff）：床の上でない所で、傾き wallDeg（40°）を超える所へは入らない＝崖から落ちない・崖を登れない。
// 格子の坂の上限（35°）より少しゆるくして、格子の道を操作が必ず通れるようにしている。
import { RULES } from '../pcg/rules.js';

export class Controller {
  constructor(world, start, opt = {}) {
    this.world = world; this.r = opt.radius ?? RULES.walk.radius; this.step = opt.step ?? RULES.walk.step;
    this.wallDeg = opt.wallDeg ?? 40; this.walk = opt.walk ?? 2.4; this.run = opt.run ?? 5.2;
    this.x = start[0]; this.z = start[2]; this.y = world.surfaceY(this.x, this.z); this.vy = 0; this.yaw = opt.yaw ?? 0;
    this.moved = 0; this.blockedT = 0; this.onFloor = null;
  }
  /** 入れるか：床の上なら坂は見ない。段差は step まで */
  canStand(x, z, fromY) {
    const W = this.world, m = 0.75; if (x < m || z < m || x > W.W - m || z > W.D - m) return null;
    const f = W.floorAt(x, z), g = W.hf.at(x, z), y = f && f.top > g ? f.top : g;
    if (y - fromY > this.step) return null;
    if (!(f && f.top >= g - 0.05) && W.hf.slopeDeg(x, z) > this.wallDeg) return null;
    return y;
  }
  _try(nx, nz) {
    const pos = { x: nx, z: nz }; this.world.pushOut(pos, this.r, this.y);
    const y = this.canStand(pos.x, pos.z, this.y);
    if (y == null || this.world.blocked(pos.x, pos.z, Math.max(y, this.y), this.r * 0.9)) return false;
    this.moved += Math.hypot(pos.x - this.x, pos.z - this.z); this.x = pos.x; this.z = pos.z; return true;
  }
  /** dt 秒すすめる。dir＝世界の向き [dx, dz]（長さ 0〜1）、run＝走る */
  update(dt, dir = [0, 0], run = false) {
    const L = Math.hypot(dir[0], dir[1]), sp = (run ? this.run : this.walk) * Math.min(1, L);
    if (L > 0.05) {
      this.yaw = Math.atan2(dir[0], dir[1]);
      const dist = sp * dt, n = Math.max(1, Math.ceil(dist / 0.2)), sx = dir[0] / L * dist / n, sz = dir[1] / L * dist / n;
      let blocked = false;
      for (let i = 0; i < n; i++) if (!this._try(this.x + sx, this.z + sz)) { blocked = true; if (!this._try(this.x + sx, this.z) && !this._try(this.x, this.z + sz)) break; }
      this.blockedT = blocked ? this.blockedT + dt : 0;
    }
    // 上下：地面・床に合わせる（下りの段は吸いつき、大きく下なら落ちる）
    const W = this.world, f = W.floorAt(this.x, this.z), g = W.hf.at(this.x, this.z), ty = f && f.top > g ? f.top : g;
    this.onFloor = f && f.top >= g - 0.05 ? f : null;
    if (ty >= this.y - 0.45) { this.y = ty; this.vy = 0; }
    else { this.vy -= 9.8 * dt; this.y = Math.max(ty, this.y + this.vy * dt); if (this.y === ty) this.vy = 0; }
    return this;
  }
  get pos() { return [this.x, this.y, this.z]; }
  /** 建物の中か（床の持ち主） */
  get building() { return this.onFloor && this.onFloor.building || null; }
}
