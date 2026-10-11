// tobinezumi/shared/move.js — 移動ルール（地上の見下ろし／巣の横断面）。ブラウザとサーバーで同じものを使う。DOM なし。
//
// どちらも「決まった刻み dt（STEP_DT）で step(state, input, dt, 地形) → 新しい state」。state は書き換えない。
// 同じ入力列を同じ順に当てれば、クライアントとサーバーで同じ結果になる（クライアント予測の土台）。
//
// 地上：
//   ・方向キーを押している間は連続小跳躍（約 0.18 秒ごとに 1 跳ね）。z は見た目の高さ（当たり判定は足元）
//   ・Space で向いている方向へ大ジャンプ（最大 4 タイル、0.5 秒、クールダウン 1.2 秒）。
//     低木・小石の山は越えられる／岩・水・木・地図の外は越えられない。着地点が塞がっていれば手前に縮める
// 巣（横断面）：
//   ・← → で歩く（小さく跳ねる）、Space でジャンプ、縦の通路は ↑↓ で登り降り、坂は ← → だけで上り下り
//   ・入口の縦穴を上まで登ると exit=true（地上へ出る）
import { TILE, isBlocking, isHigh } from './regions.js';

export const STEP_DT = 1 / 60;

// ───────── 地上 ─────────
export const FIELD = {
  HOP_SPEED: 74, HOP_PERIOD: 0.18, HOP_H: 4,
  JUMP_DIST: 4 * TILE, JUMP_DUR: 0.5, JUMP_H: 20, JUMP_CD: 1.2,
  BW: 4, BH: 5,   // 足元の当たり判定（左右 ±4、上へ 5）
};

export function makeFieldState(x, y) {
  return { x, y, z: 0, fx: 0, fy: 1, dir: 'down', anim: 'idle', hop: 0, cd: 0, jump: null, seq: 0 };
}

/** 足元の箱が通れるか */
export function boxFree(map, x, y) {
  const x0 = Math.floor((x - FIELD.BW) / TILE), x1 = Math.floor((x + FIELD.BW - 0.01) / TILE);
  const y0 = Math.floor((y - FIELD.BH) / TILE), y1 = Math.floor((y - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isBlocking(map, tx, ty)) return false;
  return true;
}
function boxHigh(map, x, y) {
  const x0 = Math.floor((x - FIELD.BW) / TILE), x1 = Math.floor((x + FIELD.BW - 0.01) / TILE);
  const y0 = Math.floor((y - FIELD.BH) / TILE), y1 = Math.floor((y - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isHigh(map, tx, ty)) return true;
  return false;
}

/** 大ジャンプの着地点（遠い方から探す）。高い障害物を通る線は不可、着地点はふさがっていないこと */
export function jumpLanding(map, x, y, fx, fy) {
  for (let d = FIELD.JUMP_DIST; d >= 0; d -= 2) {
    let ok = true;
    for (let s = 0; s <= d; s += 4) if (boxHigh(map, x + fx * s, y + fy * s)) { ok = false; break; }
    if (!ok) continue;
    const tx = x + fx * d, ty = y + fy * d;
    if (boxFree(map, tx, ty)) return { x: tx, y: ty, d };
  }
  return { x, y, d: 0 };
}

function dirName(fx, fy) {
  if (fx < 0) return 'left';
  if (fx > 0) return 'right';
  return fy < 0 ? 'up' : 'down';
}

/**
 * 地上の 1 歩。input = {mx, my, jump}（mx,my は -1/0/1）
 */
export function stepField(st, input, dt, map) {
  const s = { ...st };
  s.cd = Math.max(0, s.cd - dt);
  const mx = Math.sign(input.mx || 0), my = Math.sign(input.my || 0);
  if (s.jump) {   // 大ジャンプ中は入力を受けない
    const j = s.jump = { ...s.jump, t: s.jump.t + dt };
    const k = Math.min(1, j.t / j.dur);
    s.x = j.x0 + (j.x1 - j.x0) * k; s.y = j.y0 + (j.y1 - j.y0) * k;
    s.z = 4 * FIELD.JUMP_H * k * (1 - k);
    s.anim = 'jump';
    if (k >= 1) { s.jump = null; s.z = 0; s.anim = 'idle'; s.hop = 0; }
    return s;
  }
  if (mx || my) {
    const len = Math.hypot(mx, my);
    s.fx = mx / len; s.fy = my / len;
    s.dir = dirName(mx, my);
  }
  if (input.jump && s.cd <= 0) {
    const land = jumpLanding(map, s.x, s.y, s.fx, s.fy);
    s.jump = { t: 0, dur: FIELD.JUMP_DUR, x0: s.x, y0: s.y, x1: land.x, y1: land.y };
    s.cd = FIELD.JUMP_CD;
    s.anim = 'jump'; s.z = 0;
    return s;
  }
  if (mx || my) {
    const len = Math.hypot(mx, my);
    const vx = mx / len * FIELD.HOP_SPEED * dt, vy = my / len * FIELD.HOP_SPEED * dt;
    if (boxFree(map, s.x + vx, s.y)) s.x += vx;
    if (boxFree(map, s.x, s.y + vy)) s.y += vy;
    s.hop += dt / FIELD.HOP_PERIOD;
    s.anim = 'hop';
  } else if (s.hop % 1 > 0.001) {
    // 手を離しても今の 1 跳ねは最後まで（その場で着地）
    const next = s.hop + dt / FIELD.HOP_PERIOD;
    s.hop = Math.floor(next) > Math.floor(s.hop) ? Math.floor(next) : next;
    s.anim = s.hop % 1 > 0.001 ? 'hop' : 'idle';
  } else { s.anim = 'idle'; s.hop = 0; }
  s.z = Math.sin((s.hop % 1) * Math.PI) * FIELD.HOP_H;
  return s;
}

// ───────── 巣（横断面）─────────
export const SIDE = { WALK: 62, CLIMB: 50, GRAV: 720, JUMP: 255, MAXFALL: 420, STEP: 6, HEAD: 12, BW: 4, HOP_PERIOD: 0.22 };

export function makeSideState(x, y, climbing = false) {
  return { x, y, vy: 0, onGround: !climbing, climbing, facing: 1, anim: climbing ? 'climb' : 'idle', hop: 0, exit: false };
}

/**
 * 巣の中の 1 歩。q は nest-rules.js の nestQuery(data)。input = {mx, my, jump}
 * 足元 y は「立っている床のいちばん上の固いピクセル」の y（solid(x, y) が床、solid(x, y-1) は空き）
 */
export function stepSide(st, input, dt, q) {
  const s = { ...st, exit: false };
  const C = q.cell;
  const mx = Math.sign(input.mx || 0), my = Math.sign(input.my || 0);
  const solid = (x, y) => q.solid(x, y);
  const cellX = x => Math.floor(x / C);
  const climbAt = (x, y) => q.climbable(cellX(x), Math.floor((y - 1) / C)) || q.climbable(cellX(x), Math.floor((y - SIDE.HEAD) / C));
  const platformAt = (x, y) => !s.climbing && y % C === 0 && q.climbable(cellX(x), y / C);
  const grounded = () => solid(s.x, Math.floor(s.y)) || (my <= 0 && platformAt(s.x, Math.floor(s.y)));
  if (mx) s.facing = mx;

  // 登り始め
  if (!s.climbing) {
    if (my < 0 && climbAt(s.x, s.y)) s.climbing = true;
    else if (my > 0 && s.onGround && q.climbable(cellX(s.x), Math.floor((s.y + 1) / C))) { s.climbing = true; s.y += 1; }
    else if (my < 0 && s.onGround && s.vy >= 0) {
      // 頭の上（3 マス以内）に縦通路があれば、跳びついてつかまる
      const cx = cellX(s.x), cy = Math.floor((s.y - 1) / C);
      for (let k = 1; k <= 3; k++) {
        if (q.climbable(cx, cy - k)) { s.vy = -SIDE.JUMP; s.onGround = false; break; }
        if (!q.open(cx, cy - k)) break;
      }
    }
  }

  if (s.climbing) {
    s.vy = 0; s.onGround = false;
    const cx = cellX(s.x) * C + C / 2;
    s.x += Math.max(-60 * dt, Math.min(60 * dt, cx - s.x));
    let ny = s.y + my * SIDE.CLIMB * dt;
    const ent = q.entrance;
    if (my < 0) {
      if (cellX(s.x) === ent.x && ny <= (q.surfaceY + 1) * C - 4) { s.exit = true; ny = (q.surfaceY + 1) * C - 4; }
      else if (solid(s.x, ny - SIDE.HEAD)) ny = s.y;
    } else if (my > 0) {
      if (solid(s.x, Math.floor(ny))) { ny = Math.floor(ny / C) * C; while (solid(s.x, ny - 1) && ny > 0) ny--; s.climbing = false; s.onGround = true; }
    }
    s.y = ny;
    // 横へ降りる
    if (s.climbing && mx) {
      const floorY = (Math.floor((s.y - 1) / C) + 1) * C;
      const side = s.x + mx * (C / 2 + 2);
      if (Math.abs(s.y - floorY) <= 5 && !solid(side, floorY - 1) && !solid(side, floorY - SIDE.HEAD + 2)) {
        s.y = floorY; s.climbing = false; s.onGround = true;
      }
    }
    if (s.climbing && !climbAt(s.x, s.y)) s.climbing = false;
    if (s.climbing && input.jump && mx) { s.climbing = false; s.vy = -SIDE.JUMP * 0.6; }
    if (s.climbing) { s.anim = my ? 'climb' : 'climb_idle'; if (my) s.hop += dt / SIDE.HOP_PERIOD; return s; }
  }

  // 横移動（1px ずつ。段差・坂は STEP まで登る）
  const wasGround = s.onGround;
  if (mx) {
    let dist = SIDE.WALK * dt;
    while (dist > 0) {
      const stepLen = Math.min(1, dist); dist -= stepLen;
      const nx = s.x + mx * stepLen;
      const px = nx + mx * SIDE.BW;   // 体の前の端
      const fy = Math.floor(s.y);
      if (solid(nx, fy - 1) || solid(px, fy - 8)) {
        let up = 0;
        if (wasGround && !solid(px, fy - 8)) for (let k = 1; k <= SIDE.STEP; k++) if (!solid(nx, fy - 1 - k)) { up = k; break; }
        if (up && !solid(nx, fy - up - SIDE.HEAD)) { s.y -= up; s.x = nx; }
        else break;
      } else if (solid(nx, fy - SIDE.HEAD) || solid(px, fy - SIDE.HEAD)) break;
      else s.x = nx;
    }
    if (wasGround && s.vy >= 0 && !grounded()) {   // 下り坂に吸いつく
      const fy = Math.floor(s.y);
      for (let k = 1; k <= SIDE.STEP; k++) {
        if (solid(s.x, fy + k) || platformAt(s.x, fy + k)) { s.y = fy + k; break; }
      }
    }
  }

  // ジャンプ
  s.onGround = grounded();
  if (input.jump && s.onGround) { s.vy = -SIDE.JUMP; s.onGround = false; }

  // 縦移動
  if (!s.onGround || s.vy < 0) {
    s.vy = Math.min(SIDE.MAXFALL, s.vy + SIDE.GRAV * dt);
    const dy = s.vy * dt;
    if (dy < 0) {
      const ny = s.y + dy;
      if (solid(s.x, Math.floor(ny - SIDE.HEAD))) s.vy = 0;
      else s.y = ny;
    } else if (dy > 0) {
      const n = Math.ceil(dy);
      for (let i = 1; i <= n; i++) {
        const ny = s.y + dy / n;
        const b = Math.floor(ny / C) * C;
        if (solid(s.x, Math.floor(ny))) { s.y = Math.floor(ny); s.vy = 0; s.onGround = true; break; }
        if (my <= 0 && b > s.y && b <= ny && q.climbable(cellX(s.x), b / C)) { s.y = b; s.vy = 0; s.onGround = true; break; }
        s.y = ny;
      }
    }
  }
  // 床にめり込んでいたら押し上げる
  for (let k = 0; k < 8 && solid(s.x, Math.floor(s.y) - 1); k++) s.y = Math.floor(s.y) - 1;

  if (!s.onGround) s.anim = 'jump';
  else if (mx) { s.anim = 'walk'; s.hop += dt / SIDE.HOP_PERIOD; }
  else { s.anim = 'idle'; s.hop = 0; }
  return s;
}
