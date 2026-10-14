// tobinezumi/shared/predators.js — 捕食者（フクロウ・キツネ・ヘビ）の AI。ブラウザ（オフライン）とサーバーで同じもの。DOM なし。
//
// ・決まった刻み PRED_DT（1/20 秒）で world.step(ctx) を呼ぶ。乱数は world と各捕食者が持つ種（rs）だけを使うので、
//   同じ種・同じ ctx の列なら必ず同じ結果（tests/tobinezumi-danger.test.mjs で確かめる）。
// ・ctx = { map, period, weather, vis, pred:{owl,fox,snake}（天気・季節の出やすさ）, players:[PlayerView], entrances:[RaidView], tuning }
//     PlayerView = {id, x, y, z, moving, hidden, shelter, safe, invuln}   … playerView() で作る（ホストが持つ確定位置から）
//     RaidView   = {owner, nestId, x, y, plugged, raidable, danger}       … キツネが掘りに行ける巣（留守・冷却ずみ）
// ・返り値は出来事の配列：{type:'alert'|'catch'|'miss'|'giveup'|'raid', id, kind, target?, x?, y?, owner?, nestId?, blocked?}
//   「つかまった」の判定（catch）はホスト（サーバー／オフライン）がこの返り値で行う。ホストは罰（体調・落とし物・安全な所へ）を当てる。
//
// 見つかる・逃げる：
//   ・見つかる：距離（跳ねている＝音がする と遠くからでも、じっとしていると近くまで来ないと気づかれない）、見通し（岩・木のかげは見えない。
//     フクロウは上から見る）、砂嵐・雨の見通し、草むらでじっとしている（hidden）と ほぼ見つからない。気づくまでに少し時間がかかる（notice）。
//   ・気づかれたら「！」（alert / stalk / rattle）。ここで逃げれば間に合う。
//   ・逃げ方：大ジャンプ（キツネより速い・フクロウの影から一気に出る・ヘビの届く所から出る）、ジグザグ（キツネは急に曲がれない）、
//     巣穴の入口に飛び込む（入れる巣：自分・公開・フレンド。入口のそば 12px は「隠れ家」で手を出せない）、草むらでじっとする、安全地帯へ。
//   ・キツネは低木・小石の山・岩を越えられない（回り道）。フクロウは空から。ヘビは動かない（短く飛びかかるだけ）。
import { TILE, T, tileAt, isBlocking } from './regions.js';
import { boxFree } from './move.js';
import { buildLands, inSafeZone, safeZones, PLOT_W, PLOT_H } from './lands.js';

export const PRED_DT = 1 / 20;
export const PRED = {
  owl: {
    id: 'owl', name: 'フクロウ', periods: { night: 1, dusk: 0.6 },
    see: 110, seeStill: 36, seeHidden: 0, notice: 2.2, circleR: 64, alt: 46, fly: 70,
    stalkT: 1.5, track: 46, dive: 0.35, catchR: 12, rise: 1.2, cd: 3,
  },
  fox: {
    id: 'fox', name: 'キツネ', periods: { night: 1, dusk: 1, dawn: 0.5 },
    see: 96, seeStill: 30, seeHidden: 12, notice: 2.6, roam: 38, chase: 100, turn: 3.0, alertT: 0.7, chaseT: 6, catchR: 9, losT: 1.5, cd: 4,
    digT: 3, raidChance: 0.25,
  },
  snake: {
    id: 'snake', name: 'ヘビ', periods: { day: 1, dawn: 0.5, dusk: 0.5 },
    see: 46, seeStill: 20, seeHidden: 10, notice: 5, rattleT: 0.6, lunge: 44, lungeT: 0.25, catchR: 10, recover: 1.4, cd: 2.5, leash: 30,
  },
};
export const PRED_KINDS = ['owl', 'fox', 'snake'];
// 1 人あたりの数の目安（時間帯ごと）。人数 3 人ごとに +1、種類ごとに 4 まで
export const DENSITY = {
  night: { owl: 1, fox: 1, snake: 0 },
  dusk: { owl: 1, fox: 1, snake: 1 },
  dawn: { owl: 0, fox: 1, snake: 1 },
  day: { owl: 0, fox: 0, snake: 2 },
};
export const TUNING = {
  normal: { enabled: true, detect: 1, speed: 1, density: 1, raids: true, easy: false },
  easy: { enabled: true, detect: 0.6, speed: 0.85, density: 0.5, raids: false, easy: true },
  off: { enabled: false, detect: 0, speed: 0, density: 0, raids: false, easy: true },
};
export const SPAWN_EVERY = 3;          // 秒（世界の時間ではなく刻みの時間）
export const SPAWN_MIN = 220, SPAWN_MAX = 380, FAR = 640, FAR_T = 20;
export const SHELTER_R = 12;           // 入れる巣穴の入口のそば（捕食者は手を出せない）
export const INVULN_MS = 8000;         // つかまったあと、しばらく狙われない
export const RAID_FRACTION = 0.1, RAID_CAP = 5, RAID_COOLDOWN_MS = 24 * 60 * 1000;

// ───────── 小さな乱数（状態は数値 1 つ）─────────
function rnd(o) {
  o.rs = (o.rs + 0x6D2B79F5) >>> 0;
  let t = o.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const r1 = v => Math.round(v * 10) / 10;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ───────── プレイヤーの見え方 ─────────
/** 草むら（隠れられる所）か：草地・草の房の上、または低木のすぐそば */
export function inGrass(map, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor((y - 1) / TILE);
  const t = tileAt(map, tx, ty);
  if (t === T.TUFT || t === T.GRASS) return true;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (tileAt(map, tx + dx, ty + dy) !== T.SHRUB) continue;
    const cx = Math.max((tx + dx) * TILE, Math.min(x, (tx + dx) * TILE + TILE)), cy = Math.max((ty + dy) * TILE, Math.min(y, (ty + dy) * TILE + TILE));
    if (Math.hypot(cx - x, cy - y) <= 8) return true;
  }
  return false;
}
/** じっとしている時間を進める（ホストが毎刻み呼ぶ） */
export function stillTime(prev, st, dt) { return st && st.anim === 'idle' && !st.jump ? (prev || 0) + dt : 0; }
export const HIDE_AFTER = 0.5;   // 草むらでこれだけ じっとしていると隠れたことになる
/**
 * ホストの確定状態（stepField の state）から、捕食者に渡す見え方を作る。
 * shelters：その子が飛び込める巣穴の入口 [{x,y}]、still：じっとしている秒数、invuln：無敵中か
 */
export function playerView(id, st, map, { still = 0, shelters = [], invuln = false } = {}) {
  const moving = !!st.jump || st.anim === 'hop' || st.anim === 'jump';
  const hidden = !moving && still >= HIDE_AFTER && inGrass(map, st.x, st.y);
  let shelter = false;
  for (const e of shelters) if (Math.hypot(e.x - st.x, e.y - st.y) <= SHELTER_R) { shelter = true; break; }
  return { id, x: st.x, y: st.y, z: st.z || 0, moving, hidden, shelter, safe: !!inSafeZone(map, st.x, st.y), invuln: !!invuln };
}

/** 見通し（岩・木で切れる）。8px ごとに調べる */
export function losClear(map, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    const t = tileAt(map, Math.floor(x / TILE), Math.floor((y - 2) / TILE));
    if (t === T.ROCK || t === T.TREE || t === T.CLIFF || t === T.HOUSE || t === T.SAKURA || t === T.MOUNT) return false;
  }
  return true;
}

/** 巣の倉庫の種子がいくつ取られるか（1 割・最大 5・最低 1） */
export function raidLoss(seedCount) {
  if (!(seedCount > 0)) return 0;
  return Math.max(1, Math.min(RAID_CAP, Math.round(seedCount * RAID_FRACTION)));
}

// ───────── 出現場所（地図ごとに 1 回）─────────
const spotCache = new WeakMap();
export function spawnSpots(map) {
  if (spotCache.has(map)) return spotCache.get(map);
  const lands = buildLands(map);
  const out = { fox: [], owl: [], snake: [] };
  for (const L of lands.values()) {
    if (L.danger < 1) continue;
    for (let ty = L.cy * PLOT_H + 1; ty < (L.cy + 1) * PLOT_H - 1; ty += 2) for (let tx = L.cx * PLOT_W + 1; tx < (L.cx + 1) * PLOT_W - 1; tx += 2) {
      const x = tx * TILE + 8, y = ty * TILE + 12;
      if (isBlocking(map, tx, ty) || inSafeZone(map, x, y, 3 * TILE)) continue;
      if (L.danger >= 2 && boxFree(map, x, y)) out.fox.push({ x, y, w: L.danger });
      out.owl.push({ x, y, w: L.danger });
    }
    // ヘビ：岩・小石の山・草の房のそば（暑い所・岩場）
    if (L.danger >= 2 && L.region !== 'oasis') for (let ty = L.cy * PLOT_H; ty < (L.cy + 1) * PLOT_H; ty++) for (let tx = L.cx * PLOT_W; tx < (L.cx + 1) * PLOT_W; tx++) {
      const t = tileAt(map, tx, ty);
      if (isBlocking(map, tx, ty)) continue;
      let near = t === T.TUFT;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = tileAt(map, tx + dx, ty + dy); if (u === T.STONES || u === T.ROCK) near = true; }
      const x = tx * TILE + 8, y = ty * TILE + 10;
      if (near && boxFree(map, x, y) && !inSafeZone(map, x, y, 4 * TILE)) out.snake.push({ x, y, w: L.danger });
    }
  }
  spotCache.set(map, out);
  return out;
}

// ───────── 捕食者の世界 ─────────
export class PredatorWorld {
  constructor({ map, seed = 1, nextId = 1 } = {}) {
    this.map = map; this.rs = seed >>> 0; this.preds = []; this.nextId = nextId; this.t = 0; this.spawnT = 1;
  }
  /** 開発・テスト用：kind をこの場所に出す（ホストが devSpawn から呼ぶ） */
  spawn(kind, x, y, extra = {}) {
    const D = PRED[kind];
    if (!D) return null;
    const p = { id: 'p' + (this.nextId++), kind, x, y, z: kind === 'owl' ? D.alt : 0, dir: 'left', state: kind === 'owl' ? 'circle' : kind === 'snake' ? 'lurk' : 'roam',
      t: 0, home: { x, y }, rs: (Math.floor(rnd(this) * 4294967296) ^ (this.nextId * 2654435761)) >>> 0, target: null, notice: {}, cd: 0, misses: 0,
      hx: rnd(this) < 0.5 ? -1 : 1, hy: 0, ang: rnd(this) * Math.PI * 2, wanderT: 0, losT: 0, farT: 0, sx: 0, sy: 0, sr: 0, lx: 0, ly: 0, raid: null, ...extra };
    if (kind === 'fox') { const a = rnd(p) * Math.PI * 2; p.hx = Math.cos(a); p.hy = Math.sin(a); }
    this.preds.push(p);
    return p;
  }
  /** 送信用（スナップショット） */
  snapshot() {
    return this.preds.map(p => ({ id: p.id, kind: p.kind, x: r1(p.x), y: r1(p.y), z: r1(p.z), dir: p.dir, state: p.state, t: r1(p.t), target: p.target,
      ...(p.kind === 'owl' && (p.state === 'stalk' || p.state === 'dive') ? { sx: r1(p.sx), sy: r1(p.sy), sr: r1(p.sr) } : {}) }));
  }
  /** 1 刻み進める（dt = PRED_DT） */
  step(ctx, dt = PRED_DT) {
    const ev = [];
    const tune = ctx.tuning || TUNING.normal;
    this.t += dt;
    if (!tune.enabled) { if (this.preds.length) { for (const p of this.preds) ev.push({ type: 'gone', id: p.id, kind: p.kind }); this.preds = []; } return ev; }
    const players = ctx.players || [];
    for (const p of this.preds) {
      p.t += dt;
      if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
      // だれからも遠い・時間帯が終わった → 立ち去る
      const near = players.some(pl => dist(pl, p) < FAR);
      p.farT = near ? 0 : p.farT + dt;
      const act = activity(p.kind, ctx);
      if (p.state !== 'leave' && ((p.farT > FAR_T) || (act <= 0 && !busy(p)))) this._set(p, 'leave');
      STEP[p.kind](this, p, ctx, dt, ev, tune);
    }
    this.preds = this.preds.filter(p => !(p.state === 'leave' && p.t > 2.5) || (ev.push({ type: 'gone', id: p.id, kind: p.kind }), false));
    // 出現
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = SPAWN_EVERY; this._maybeSpawn(ctx, tune, ev); }
    return ev;
  }
  _set(p, state) { p.state = state; p.t = 0; }
  _maybeSpawn(ctx, tune, ev) {
    const field = (ctx.players || []).filter(pl => !pl.safe);
    if (!field.length || !(tune.density > 0)) return;
    const per = DENSITY[ctx.period] || DENSITY.day;
    const k = 1 + Math.floor(((ctx.players || []).length - 1) / 3);
    for (const kind of PRED_KINDS) {
      const want = Math.min(4, Math.floor(per[kind] * k * tune.density * activity(kind, ctx) + 0.5));
      const have = this.preds.filter(p => p.kind === kind && p.state !== 'leave').length;
      if (have >= want) continue;
      const pl = field[Math.floor(rnd(this) * field.length)];
      const spots = spawnSpots(this.map)[kind].filter(s => { const d = dist(s, pl); return d >= SPAWN_MIN && d <= SPAWN_MAX; });
      if (!spots.length) continue;
      // 危険の高い所ほど出やすい
      let tot = 0; for (const s of spots) tot += s.w;
      let r = rnd(this) * tot, pick = spots[0];
      for (const s of spots) { r -= s.w; if (r <= 0) { pick = s; break; } }
      // ほかの子に近すぎる所には出さない
      if ((ctx.players || []).some(o => dist(o, pick) < SPAWN_MIN * 0.8)) continue;
      const p = this.spawn(kind, pick.x, pick.y);
      ev.push({ type: 'spawn', id: p.id, kind });
      return;   // 1 回に 1 匹
    }
  }
}

function activity(kind, ctx) {
  const per = PRED[kind].periods[ctx.period] || 0;
  const w = ctx.pred ? (ctx.pred[kind] ?? 1) : 1;
  return per * w;
}
function busy(p) { return ['chase', 'alert', 'stalk', 'dive', 'rattle', 'lunge', 'dig'].includes(p.state); }

/** 気づけるか（距離・音・見通し・草むら・見通しの悪い天気） */
function detectable(p, pl, ctx, tune) {
  if (pl.invuln || pl.shelter || pl.safe) return false;
  const D = PRED[p.kind], vis = (ctx.vis ?? 1) * tune.detect;
  const r = (pl.hidden ? D.seeHidden : pl.moving ? D.see : D.seeStill) * vis;
  if (!(r > 0)) return false;
  if (dist(p, pl) > r) return false;
  if (p.kind !== 'owl' && !losClear(ctx.map, p.x, p.y, pl.x, pl.y)) return false;
  return true;
}
/** 少しずつ気づく（notice が 1 になったらその子に決める） */
function noticeStep(p, ctx, dt, tune) {
  if (p.cd > 0) return null;
  const D = PRED[p.kind];
  let best = null, bd = 1e9;
  for (const pl of ctx.players || []) {
    const ok = detectable(p, pl, ctx, tune);
    const n = p.notice[pl.id] || 0;
    const nn = ok ? n + D.notice * dt * (pl.moving ? 1 : 0.6) : Math.max(0, n - dt * 1.5);
    if (nn > 0) p.notice[pl.id] = nn; else delete p.notice[pl.id];
    if (nn >= 1) { const d = dist(p, pl); if (d < bd) { bd = d; best = pl; } }
  }
  if (best) p.notice = {};
  return best;
}
const findPl = (ctx, id) => (ctx.players || []).find(pl => pl.id === id) || null;
/** つかまえられるか（無敵・隠れ家・安全地帯・高く跳んでいる はだめ） */
function catchable(pl) { return pl && !pl.invuln && !pl.shelter && !pl.safe && (pl.z || 0) < 7; }
function faceTo(p, x) { if (Math.abs(x - p.x) > 0.5) p.dir = x < p.x ? 'left' : 'right'; }

/** 地上の移動（キツネ）：通れない・安全地帯には入らない。動けたら true */
function groundMove(map, p, vx, vy, dt) {
  const nx = p.x + vx * dt, ny = p.y + vy * dt;
  let moved = false;
  if (boxFree(map, nx, p.y) && !inSafeZone(map, nx, p.y)) { p.x = nx; moved = true; }
  if (boxFree(map, p.x, ny) && !inSafeZone(map, p.x, ny)) { p.y = ny; moved = true; }
  faceTo(p, p.x + vx);
  return moved;
}

const STEP = {
  // ───── キツネ：地上を歩き回り、見つけたら「！」→ 追いかける（速いが急に曲がれない）
  fox(W, p, ctx, dt, ev, tune) {
    const D = PRED.fox, map = ctx.map;
    if (p.state === 'leave') {
      let fx = 0, fy = 0;
      for (const pl of ctx.players || []) { const d = Math.max(1, dist(pl, p)); fx += (p.x - pl.x) / d; fy += (p.y - pl.y) / d; }
      const l = Math.hypot(fx, fy) || 1;
      groundMove(map, p, fx / l * D.roam * 1.6, fy / l * D.roam * 1.6, dt);
      return;
    }
    if (p.state === 'roam' || p.state === 'toNest') {
      if (p.state === 'roam') {
        p.wanderT -= dt;
        if (p.wanderT <= 0) {
          p.wanderT = 1.5 + rnd(p) * 1.5;
          const a = rnd(p) * Math.PI * 2;
          const back = dist(p, p.home) > 140;
          p.hx = back ? (p.home.x - p.x) / dist(p, p.home) : Math.cos(a); p.hy = back ? (p.home.y - p.y) / dist(p, p.home) : Math.sin(a);
          // 夜、留守の巣を掘りに行く
          if (tune.raids && ctx.period === 'night' && ctx.entrances && ctx.entrances.length && !p.raidDone) {
            const cands = ctx.entrances.filter(e => e.raidable && dist(e, p) < 220);
            if (cands.length) {
              const e = cands[Math.floor(rnd(p) * cands.length)];
              if (rnd(p) < D.raidChance * (1 + (e.danger || 0)) / 3) { p.raid = { owner: e.owner, nestId: e.nestId, x: e.x, y: e.y, plugged: !!e.plugged }; W._set(p, 'toNest'); }
            }
          }
        }
        if (rnd(p) < 0.25) { const l = Math.hypot(p.hx, p.hy) || 1; if (!groundMove(map, p, p.hx / l * D.roam, p.hy / l * D.roam, dt)) p.wanderT = 0; }
        else groundMove(map, p, p.hx * D.roam * 0.4, p.hy * D.roam * 0.4, dt);
      } else {
        const d = Math.max(0.01, dist(p, p.raid));
        if (d < 8) { W._set(p, 'dig'); faceTo(p, p.raid.x); }
        else if (!groundMove(map, p, (p.raid.x - p.x) / d * D.roam * 1.2, (p.raid.y - p.y) / d * D.roam * 1.2, dt) || p.t > 12) { p.raid = null; W._set(p, 'roam'); }
      }
      const pl = noticeStep(p, ctx, dt, tune);
      if (pl) { p.target = pl.id; p.raid = null; W._set(p, 'alert'); faceTo(p, pl.x); ev.push({ type: 'alert', id: p.id, kind: 'fox', target: pl.id }); }
      return;
    }
    if (p.state === 'dig') {
      const pl = noticeStep(p, ctx, dt, tune);
      if (pl) { p.target = pl.id; p.raid = null; W._set(p, 'alert'); faceTo(p, pl.x); ev.push({ type: 'alert', id: p.id, kind: 'fox', target: pl.id }); return; }
      if (p.t >= D.digT) {
        const e = (ctx.entrances || []).find(x => x.owner === p.raid.owner);
        const blocked = e ? !!e.plugged : !!p.raid.plugged;
        ev.push({ type: 'raid', id: p.id, kind: 'fox', owner: p.raid.owner, nestId: p.raid.nestId, blocked, x: p.raid.x, y: p.raid.y });
        p.raid = null; p.raidDone = true; p.cd = D.cd; W._set(p, 'roam');
      }
      return;
    }
    const pl = findPl(ctx, p.target);
    if (p.state === 'alert') {
      if (pl) faceTo(p, pl.x);
      if (!pl || pl.shelter || pl.safe || pl.invuln) { give(W, p, ev); return; }
      if (p.t >= D.alertT) { W._set(p, 'chase'); p.ang = Math.atan2(pl.y - p.y, pl.x - p.x); p.losT = 0; }
      return;
    }
    if (p.state === 'chase') {
      if (!pl || pl.shelter || pl.safe || pl.invuln || p.t > D.chaseT || (pl.hidden && dist(p, pl) > 18)) { give(W, p, ev); return; }
      p.losT = losClear(map, p.x, p.y, pl.x, pl.y) ? 0 : p.losT + dt;
      if (p.losT > D.losT) { give(W, p, ev); return; }
      // 向きをゆっくり変える（ジグザグに弱い）
      const want = Math.atan2(pl.y - p.y, pl.x - p.x);
      let da = want - p.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const mt = D.turn * dt;
      p.ang += Math.max(-mt, Math.min(mt, da));
      const sp = D.chase * tune.speed;
      if (!groundMove(map, p, Math.cos(p.ang) * sp, Math.sin(p.ang) * sp, dt)) {
        // ぶつかった：低木や岩をよけて少し向きを変える
        p.ang += (rnd(p) < 0.5 ? -1 : 1) * 0.9;
      }
      if (dist(p, pl) < D.catchR && catchable(pl)) {
        ev.push({ type: 'catch', id: p.id, kind: 'fox', target: pl.id, x: pl.x, y: pl.y });
        p.target = null; W._set(p, 'leave');
      }
      return;
    }
    if (p.state === 'lost') {
      if (p.t > 1.2) { W._set(p, 'roam'); p.cd = D.cd; }
      return;
    }
    W._set(p, 'roam');
  },

  // ───── フクロウ：夜空を回り、見つけたら真上へ → 影が大きくなる（予告）→ 急降下。影から出れば外れる
  owl(W, p, ctx, dt, ev, tune) {
    const D = PRED.owl;
    if (p.state === 'leave') { p.z = Math.min(90, p.z + 40 * dt); p.x += (p.dir === 'left' ? -1 : 1) * D.fly * dt; return; }
    if (p.state === 'circle') {
      p.ang += D.fly / D.circleR * dt;
      const tx = p.home.x + Math.cos(p.ang) * D.circleR, ty = p.home.y + Math.sin(p.ang) * D.circleR * 0.6;
      faceTo(p, tx); p.x = tx; p.y = ty;
      p.z += (D.alt - p.z) * Math.min(1, dt * 2);
      const pl = noticeStep(p, ctx, dt, tune);
      if (pl) { p.target = pl.id; W._set(p, 'stalk'); p.sx = pl.x; p.sy = pl.y; p.sr = 3; ev.push({ type: 'alert', id: p.id, kind: 'owl', target: pl.id }); }
      return;
    }
    const pl = findPl(ctx, p.target);
    if (p.state === 'stalk') {
      if (!pl || pl.shelter || pl.safe || pl.invuln || pl.hidden) { p.target = null; W._set(p, 'rise'); ev.push({ type: 'giveup', id: p.id, kind: 'owl' }); return; }
      // 影はゆっくり（track）ついてくる。速く跳ねれば影から出られる
      const d = Math.max(0.01, Math.hypot(pl.x - p.sx, pl.y - p.sy)), mv = Math.min(d, D.track * tune.speed * dt);
      p.sx += (pl.x - p.sx) / d * mv; p.sy += (pl.y - p.sy) / d * mv;
      const od = Math.max(0.01, Math.hypot(p.sx - p.x, p.sy - p.y)), om = Math.min(od, 90 * dt);
      faceTo(p, p.sx); p.x += (p.sx - p.x) / od * om; p.y += (p.sy - p.y) / od * om;
      const stalkT = D.stalkT / Math.max(0.5, tune.speed);
      p.sr = 3 + 8 * Math.min(1, p.t / stalkT);
      if (Math.hypot(pl.x - p.sx, pl.y - p.sy) > 80) { p.target = null; W._set(p, 'rise'); p.misses++; ev.push({ type: 'giveup', id: p.id, kind: 'owl' }); return; }
      if (p.t >= stalkT) { W._set(p, 'dive'); p.lx = p.x; p.ly = p.y; ev.push({ type: 'dive', id: p.id, kind: 'owl', target: pl.id, x: p.sx, y: p.sy }); }
      return;
    }
    if (p.state === 'dive') {
      // 降りている間も影は少しだけついてくる（その場にとどまると つかまる。跳ねて離れれば外れる）
      if (pl) { const d = Math.max(0.01, Math.hypot(pl.x - p.sx, pl.y - p.sy)), mv = Math.min(d, D.track * tune.speed * dt); p.sx += (pl.x - p.sx) / d * mv; p.sy += (pl.y - p.sy) / d * mv; }
      const k = Math.min(1, p.t / D.dive);
      p.x = p.lx + (p.sx - p.lx) * k; p.y = p.ly + (p.sy - p.ly) * k; p.z = D.alt * (1 - k);
      if (k >= 1) {
        if (pl && catchable(pl) && Math.hypot(pl.x - p.sx, pl.y - p.sy) < D.catchR) {
          ev.push({ type: 'catch', id: p.id, kind: 'owl', target: pl.id, x: pl.x, y: pl.y });
          p.target = null; W._set(p, 'leave');
        } else { ev.push({ type: 'miss', id: p.id, kind: 'owl', target: p.target }); p.misses++; p.target = null; W._set(p, 'rise'); }
      }
      return;
    }
    if (p.state === 'rise') {
      p.z = Math.min(D.alt, p.z + D.alt / D.rise * dt);
      if (p.t >= D.rise) { if (p.misses >= 2) W._set(p, 'leave'); else { p.home = { x: p.x, y: p.y }; p.ang = 0; p.cd = D.cd; W._set(p, 'circle'); } }
      return;
    }
    W._set(p, 'circle');
  },

  // ───── ヘビ：岩や草のかげで待ち伏せ。近くで動くと「シャーッ」（！）→ 短く飛びかかる
  snake(W, p, ctx, dt, ev, tune) {
    const D = PRED.snake;
    if (p.state === 'leave') return;
    if (p.state === 'lurk') {
      const pl = noticeStep(p, ctx, dt, tune);
      if (pl) { p.target = pl.id; W._set(p, 'rattle'); faceTo(p, pl.x); ev.push({ type: 'alert', id: p.id, kind: 'snake', target: pl.id }); }
      return;
    }
    const pl = findPl(ctx, p.target);
    if (p.state === 'rattle') {
      if (pl) faceTo(p, pl.x);
      if (!pl || pl.shelter || pl.safe || pl.invuln) { give(W, p, ev, 'recover'); return; }
      if (p.t >= D.rattleT / Math.max(0.5, tune.speed)) {
        const d = Math.max(0.01, dist(p, pl));
        if (d > D.lunge + 14) { give(W, p, ev, 'recover'); return; }      // もう届かない（逃げられた）
        p.lx = p.x; p.ly = p.y; p.sx = p.x + (pl.x - p.x) / d * Math.min(D.lunge, d + 6); p.sy = p.y + (pl.y - p.y) / d * Math.min(D.lunge, d + 6);
        W._set(p, 'lunge');
      }
      return;
    }
    if (p.state === 'lunge') {
      const k = Math.min(1, p.t / D.lungeT);
      const nx = p.lx + (p.sx - p.lx) * k, ny = p.ly + (p.sy - p.ly) * k;
      if (boxFree(ctx.map, nx, ny)) { p.x = nx; p.y = ny; }
      if (pl && catchable(pl) && dist(p, pl) < D.catchR) {
        ev.push({ type: 'catch', id: p.id, kind: 'snake', target: pl.id, x: pl.x, y: pl.y });
        p.target = null; W._set(p, 'recover'); p.cd = D.cd * 2;
        return;
      }
      if (k >= 1) { ev.push({ type: 'miss', id: p.id, kind: 'snake', target: p.target }); p.target = null; W._set(p, 'recover'); p.cd = D.cd; }
      return;
    }
    if (p.state === 'recover') {
      const d = dist(p, p.home);
      if (d > 0.5) { const m = Math.min(d, 30 * dt); p.x += (p.home.x - p.x) / d * m; p.y += (p.home.y - p.y) / d * m; }
      if (p.t >= D.recover && d <= 0.5) { W._set(p, 'lurk'); if (!p.cd) p.cd = D.cd; }
      return;
    }
    W._set(p, 'lurk');
  },
};
function give(W, p, ev, next = 'lost') {
  ev.push({ type: 'giveup', id: p.id, kind: p.kind, target: p.target });
  p.target = null; W._set(p, next);
  if (next !== 'lost') p.cd = PRED[p.kind].cd;
}

/** 捕食者に見つかっているか（クライアントの「！」と画面の端の赤） */
export const ALERT_STATES = new Set(['alert', 'chase', 'stalk', 'dive', 'rattle', 'lunge']);
export function threatTo(preds, id) {
  let best = null;
  for (const p of preds || []) if (p.target === id && ALERT_STATES.has(p.state)) { if (!best || p.state === 'dive' || p.state === 'lunge') best = p; }
  return best;
}

// ───────── つかまったとき（ホストが当てる）─────────
/**
 * 持ち物の一部を落とす：種類ごとに 1/3（切り上げ）、合計 12 まで、多い種類から。inv は書き換える。
 * 返り値 [{id, n}]（落とした物）。easy なら 1/5
 */
export function dropItems(inv, easy = false) {
  const totals = new Map();
  for (const s of inv) if (s) totals.set(s.id, (totals.get(s.id) || 0) + s.n);
  const order = [...totals.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const out = [];
  let left = easy ? 6 : 12;
  for (const [id, n] of order) {
    if (left <= 0) break;
    const k = Math.min(left, Math.ceil(n / (easy ? 5 : 3)));
    if (k <= 0) continue;
    let r = k;
    for (let i = inv.length - 1; i >= 0 && r > 0; i--) { const s = inv[i]; if (s && s.id === id) { const m = Math.min(r, s.n); s.n -= m; r -= m; if (s.n <= 0) inv[i] = null; } }
    out.push({ id, n: k }); left -= k;
  }
  return out;
}
/** 落とし物を置く場所（つかまった所のまわり。通れる所） */
export function dropSpots(map, x, y, n) {
  const out = [];
  for (let i = 0; i < 24 && out.length < n; i++) {
    const a = i * 2.39996, r = 10 + (i % 3) * 6;
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r * 0.8);
    if (boxFree(map, px, py) && !out.some(o => Math.hypot(o.x - px, o.y - py) < 9)) out.push({ x: px, y: py });
  }
  while (out.length < n) out.push({ x: Math.round(x), y: Math.round(y) });
  return out;
}
/** 安全な所（つかまったあと戻される）：自分の巣の入口の下 → 無ければ出発点 */
export function safePoint(map, ownEntrance) {
  if (ownEntrance && (!ownEntrance.region || !map.region || ownEntrance.region === map.region)) return { x: ownEntrance.x, y: ownEntrance.y + 12 };
  return { x: map.spawn.x, y: map.spawn.y };
}
export const DROP_TTL_MS = 10 * 60 * 1000;   // 落とし物は 10 分で消える
void safeZones;
