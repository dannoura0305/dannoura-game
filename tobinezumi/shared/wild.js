// tobinezumi/shared/wild.js — 野生のトビネズミ（Ver.0.4「いのちをつなぐ」）。サーバーが動かす（オフラインも同じ AI）。DOM なし・決定的。
//
// ・地上にいる子のまわりに、ときどき野生のトビネズミが現れる（世界の 1 時間＝実時間 1 分に 1 回ほど。春 2・夏 1・秋 1 匹まで／1 人あたり、冬は出ない。昼は少なめ）。
//   それぞれ自分の遺伝子（shared/genetics.js の wildGenes：地域で毛色の出やすさが違う）を持ち、見た目も少しずつ違う。
// ・なかよくなる（信頼 0〜100。子ごと・相手ごと）：
//     そばで（44px 以内）じっとしている → +8/秒（0.4 秒じっとしてから）
//     そばで跳ね回る（30px 以内）→ −12/秒・少し逃げる／近くで大ジャンプ（60px 以内）→ −25・逃げる
//     種子をあげる（30px 以内・1.2 秒あける）→ +25
//     はなれる（150px より遠い）→ −1.5/秒
//   100 になると「なかよし」：その子のうしろをついてくる（世界の 6 時間）。いっしょに自分の巣へ入ると、つれあいとして迎えられる
//   （条件は shared/family.js の breedBlock。サーバー／オフラインのバックエンドが確かめる）。
//   おとなで体調がよい子（courtBlock が null）だけ信頼が増える。ほかの子にはじっと見つめるだけ。
// ・世界の 8 時間（実時間 8 分）たつか、だれからも 520px はなれて 25 秒で立ち去る（ついてきている子は除く）。
import { stepField, makeFieldState, boxFree, STEP_DT } from './move.js';
import { mulberry32 } from './rng.js';
import { HOUR_MS } from './daynight.js';
import { regionAt, TILE } from './regions.js';
import { wildGenes, expressTraits, lookOf, expressFur, FUR_LIST } from './genetics.js';
import { WILD_NAMES } from './family.js';

export const WILD = {
  MAX: { spring: 2, summer: 1, autumn: 1, winter: 0 }, CAP: 8, DAY_MUL: 0.5,
  SPAWN_GAP_WMS: 60 * 1000, SPAWN_MIN: 100, SPAWN_MAX: 200,
  LIFE_WMS: 8 * HOUR_MS, FOLLOW_WMS: 6 * HOUR_MS, FAR: 520, FAR_T: 25,
  NEAR: 44, STILL: 0.4, STILL_GAIN: 8, HOP_NEAR: 30, HOP_LOSS: 12, JUMP_NEAR: 60, JUMP_LOSS: 25, DECAY_R: 150, DECAY: 1.5,
  OFFER: 25, OFFER_GAP_MS: 1200, OFFER_RANGE: 30, FULL: 100, FOLLOW_GAP: 16, INVITE_R: 90,
};
export const WILD_DT = 1 / 20;
// Ver.0.6：近縁種。すなの海（dunes）の夜に、出てくる子のうち LONGEAR.RATE がミミナガトビネズミ。なかよくなれる（信頼の増え方は少しゆっくり）が、
// つれあいにはならない（種の壁：shared/family.js の speciesBlock）。巣へ迎えると「なかま」として住む。
export const LONGEAR = { RATE: 0.3, REGION: 'dunes', GAIN: 0.75, NAMES: ['ミミ', 'ナガ', 'サバク', 'ルナ', 'シロ', 'ホシ', 'ソヨ'] };

export class WildWorld {
  constructor({ map, seed = 1 }) {
    this.map = map;
    this.rng = mulberry32(seed >>> 0);
    this.npcs = [];
    this.n = 0;
    this.wt = 0;                 // 世界の経過（ms）
    this.spawnT = WILD.SPAWN_GAP_WMS * 0.25;
  }
  _rand(a, b) { return a + this.rng() * (b - a); }

  /** 1 刻み。ctx = {season, period, scale, players:[{id, x, y, z, jump, moving, still, eligible}]} → 出来事の配列 */
  step(ctx, dt = WILD_DT) {
    const ev = [];
    const scale = ctx.scale || 1;
    this.wt += dt * 1000 * scale;
    const players = [...(ctx.players || [])].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
    const byId = new Map(players.map(p => [p.id, p]));
    this.period = ctx.period;
    // 出てくる
    this.spawnT -= dt * 1000 * scale;
    if (this.spawnT <= 0) {
      this.spawnT = WILD.SPAWN_GAP_WMS * this._rand(0.7, 1.3);
      const per = (WILD.MAX[ctx.season] ?? 0) * (ctx.period === 'day' ? WILD.DAY_MUL : 1);
      if (per > 0 && players.length && this.npcs.length < WILD.CAP) {
        const p = players[Math.floor(this.rng() * players.length) % players.length];
        const near = this.npcs.filter(n => Math.hypot(n.st.x - p.x, n.st.y - p.y) < 400).length;
        if (near < Math.max(1, Math.round(per))) { const n = this._spawnNear(p); if (n) ev.push({ type: 'spawn', id: n.id }); }
      }
    }
    // 動く
    for (const n of this.npcs) this._think(n, players, byId, dt, scale, ev);
    // 立ち去る
    const keep = [];
    for (const n of this.npcs) {
      const following = n.follow != null && this.wt < n.followUntil;
      if (n.follow != null && !following) { ev.push({ type: 'lost', id: n.id, by: n.follow }); n.follow = null; n.trust[n.lastFollow] = Math.min(n.trust[n.lastFollow] || 0, 70); }
      let near = false;
      for (const p of players) if (Math.hypot(p.x - n.st.x, p.y - n.st.y) < WILD.FAR) { near = true; break; }
      n.farT = near ? 0 : n.farT + dt;
      const old = this.wt - n.born > WILD.LIFE_WMS;
      if (n.follow == null && (n.farT > WILD.FAR_T || old || ctx.season === 'winter')) { ev.push({ type: 'gone', id: n.id }); continue; }
      keep.push(n);
    }
    this.npcs = keep;
    return ev;
  }

  _spawnNear(p) {
    for (let k = 0; k < 14; k++) {
      const a = this.rng() * Math.PI * 2, d = this._rand(WILD.SPAWN_MIN, WILD.SPAWN_MAX);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (x < 2 * TILE || y < 2 * TILE || x > this.map.pxW - 2 * TILE || y > this.map.pxH - 2 * TILE) continue;
      if (!boxFree(this.map, x, y)) continue;
      return this.spawn(x, y);
    }
    return null;
  }
  /** 出す（開発用・テストからも）。species を決めなければ、すなの海の夜は LONGEAR.RATE でミミナガトビネズミ */
  spawn(x, y, genes = null, species = null) {
    const region = regionAt(this.map, x, y).id;
    let sp = species;
    if (!sp) sp = this.map.region === LONGEAR.REGION && this.period === 'night' && this.rng() < LONGEAR.RATE ? 'longear' : 'jerboa';
    const g = genes || wildGenes(this.rng, sp === 'longear' ? 'desert' : region);
    if (sp === 'longear' && !genes) { g.col = [g.col[0] === 'rufous' ? 'cream' : g.col[0], 'cream']; g.ear = g.ear.map(v => Math.max(0, v)); g.fur = expressFur(g.col); }
    const traits = expressTraits(g);
    const id = 'j' + (++this.n);
    const names = sp === 'longear' ? LONGEAR.NAMES : WILD_NAMES;
    const n = {
      id, species: sp, name: names[Math.floor(this.rng() * names.length) % names.length], genes: g, traits, look: lookOf(traits, { ps: this.n % 97, sp }),
      st: makeFieldState(x, y), home: { x, y }, brain: { t: 0, mx: 0, my: 0 }, born: this.wt, farT: 0,
      trust: {}, seen: {}, follow: null, followUntil: 0, lastFollow: null, flee: 0, fleeFrom: null, mood: 'idle', offerT: {},
    };
    this.npcs.push(n);
    return n;
  }
  get(id) { return this.npcs.find(n => n.id === id) || null; }
  /** 巣へ迎えた・テストで消す */
  take(id) { const n = this.get(id); if (n) this.npcs = this.npcs.filter(x => x !== n); return n; }
  /** その子についてきている野生の子 */
  followerOf(pid) { return this.npcs.find(n => n.follow === pid && this.wt < n.followUntil) || null; }

  _think(n, players, byId, dt, scale, ev) {
    const st = n.st;
    let mx = 0, my = 0, jump = false, hop = 1;
    if (n.follow != null && this.wt < n.followUntil) {
      const p = byId.get(n.follow);
      n.mood = 'follow';
      if (p) {
        const dx = p.x - st.x, dy = p.y - st.y, d = Math.hypot(dx, dy);
        if (d > WILD.FOLLOW_GAP + 4) { mx = Math.abs(dx) > 4 ? Math.sign(dx) : 0; my = Math.abs(dy) > 4 ? Math.sign(dy) : 0; hop = 1.15; }
        if (d > 90 && st.cd <= 0) jump = true;
        if (d > 360) { n.st = makeFieldState(p.x - 10, p.y + 6); return; }   // 見失いそう：追いつく
      }
    } else {
      // いちばん近い子
      let best = null, bd = 1e9;
      for (const p of players) { const d = Math.hypot(p.x - st.x, p.y - st.y); if (d < bd) { bd = d; best = p; } }
      for (const p of players) {
        const d = Math.hypot(p.x - st.x, p.y - st.y);
        const seen = n.seen[p.id] || (n.seen[p.id] = { jump: false });
        const t0 = n.trust[p.id] || 0;
        let t = t0;
        if (p.jump && !seen.jump && d < WILD.JUMP_NEAR) { t -= WILD.JUMP_LOSS; n.flee = 1.4; n.fleeFrom = p; ev.push({ type: 'startle', id: n.id, by: p.id }); }
        else if (p.moving && !p.jump && d < WILD.HOP_NEAR) { t -= WILD.HOP_LOSS * dt; if (n.flee <= 0) { n.flee = 0.7; n.fleeFrom = p; } }
        else if (d < WILD.NEAR && p.still >= WILD.STILL && this._elig(n, p)) t += WILD.STILL_GAIN * dt * (n.species === 'longear' ? LONGEAR.GAIN : 1);
        else if (d > WILD.DECAY_R) t -= WILD.DECAY * dt;
        seen.jump = !!p.jump;
        t = Math.max(0, Math.min(WILD.FULL, t));
        n.trust[p.id] = t;
        if (t >= WILD.FULL && t0 < WILD.FULL && this._elig(n, p)) this._befriend(n, p.id, ev);
        else if (t < WILD.FULL && t0 >= WILD.FULL) { /* 下がった */ }
      }
      if (n.follow != null) return;
      if (n.flee > 0 && n.fleeFrom) {
        n.flee -= dt; n.mood = 'flee';
        const dx = st.x - n.fleeFrom.x, dy = st.y - n.fleeFrom.y;
        mx = Math.abs(dx) > 2 ? Math.sign(dx) : (this.rng() < 0.5 ? -1 : 1); my = Math.abs(dy) > 2 ? Math.sign(dy) : 0; hop = 1.1;
      } else if (best && bd < 70) {
        // 気になる：そちらを向いて止まる（信頼が高いと少し寄ってくる）
        n.mood = 'curious';
        const tr = n.trust[best.id] || 0;
        if (tr > 40 && bd > 22 && best.still > WILD.STILL) { mx = Math.sign(best.x - st.x); my = Math.abs(best.y - st.y) > 6 ? Math.sign(best.y - st.y) : 0; hop = 0.6; }
        else {
          const want = Math.abs(best.x - st.x) > Math.abs(best.y - st.y) ? (best.x < st.x ? 'left' : 'right') : best.y < st.y ? 'up' : 'down';
          if (st.dir !== want && !st.jump && st.anim === 'idle') { n.st = { ...st, dir: want, fx: want === 'left' ? -1 : want === 'right' ? 1 : 0, fy: want === 'up' ? -1 : want === 'down' ? 1 : 0 }; }
        }
      } else {
        n.mood = 'wander';
        const b = n.brain;
        b.t -= dt;
        if (b.t <= 0) {
          if (this.rng() < 0.45) { b.mx = 0; b.my = 0; b.t = this._rand(0.8, 2.6); }
          else {
            const hx = n.home.x - st.x, hy = n.home.y - st.y, far = Math.hypot(hx, hy) > 5 * TILE;
            b.mx = far ? Math.sign(Math.round(hx / 30)) : Math.floor(this.rng() * 3) - 1;
            b.my = far ? Math.sign(Math.round(hy / 30)) : Math.floor(this.rng() * 3) - 1;
            b.t = this._rand(0.4, 1.4);
          }
        }
        mx = b.mx; my = b.my;
      }
    }
    const steps = Math.max(1, Math.round(dt / STEP_DT));
    let s = n.st;
    for (let i = 0; i < steps; i++) s = stepField(s, { mx, my, jump: jump && i === 0 }, STEP_DT, this.map, hop !== 1 ? { hop } : null);
    n.st = s;
    void scale;
  }
  /** なかよくなれる相手か：同じ種は eligible（courtBlock）、ほかの種は friendOk（なかまの条件。無ければ eligible） */
  _elig(n, p) { return n.species === 'longear' ? (p.friendOk != null ? !!p.friendOk : !!p.eligible) : !!p.eligible; }
  _befriend(n, pid, ev) {
    if (this.npcs.some(o => o !== n && o.follow === pid && this.wt < o.followUntil)) return;   // 1 匹だけ
    n.follow = pid; n.lastFollow = pid; n.followUntil = this.wt + WILD.FOLLOW_WMS; n.flee = 0;
    ev.push({ type: 'befriend', id: n.id, by: pid, name: n.name });
  }

  /** 種子をあげる（30px 以内・1.2 秒あける）。eligible でなければ受け取るだけ（信頼は増えない） */
  offer(id, p, nowMs) {
    const n = this.get(id);
    if (!n) return { ok: false, reason: 'もう どこかへ行ってしまった' };
    if (n.follow === p.id) return { ok: false, reason: 'もう なかよし（いっしょに巣へ帰ろう）' };
    if (Math.hypot(n.st.x - p.x, n.st.y - p.y) > WILD.OFFER_RANGE) return { ok: false, reason: 'もう少し近くへ（そっと）' };
    const last = n.offerT[p.id];
    if (last != null && nowMs - last < WILD.OFFER_GAP_MS) return { ok: false, reason: 'もぐもぐ食べている…（少し待って）' };
    n.offerT[p.id] = nowMs;
    const t0 = n.trust[p.id] || 0;
    const t = Math.min(WILD.FULL, t0 + (this._elig(n, p) ? WILD.OFFER * (n.species === 'longear' ? LONGEAR.GAIN : 1) : 0));
    n.trust[p.id] = t;
    n.flee = 0;
    const ev = [];
    if (t >= WILD.FULL && t0 < WILD.FULL) this._befriend(n, p.id, ev);
    return { ok: true, trust: Math.round(t), befriended: n.follow === p.id, name: n.name };
  }
  /** スナップショット（見た目つき） */
  snapshot() {
    return this.npcs.map(n => ({ id: n.id, name: n.name, x: Math.round(n.st.x * 10) / 10, y: Math.round(n.st.y * 10) / 10, z: Math.round(n.st.z * 10) / 10, dir: n.st.dir, anim: n.st.anim,
      jump: n.st.jump ? { t: n.st.jump.t, dur: n.st.jump.dur, x0: n.st.jump.x0, y0: n.st.jump.y0, x1: n.st.jump.x1, y1: n.st.jump.y1 } : null, look: n.look, fol: n.follow, mood: n.mood, ...(n.species && n.species !== 'jerboa' ? { sp: n.species } : {}) }));
  }
  /** その子から見た信頼（0 より大きいものだけ） */
  trustOf(pid) {
    const o = {};
    for (const n of this.npcs) { const t = n.trust[pid] || 0; if (t > 0.5) o[n.id] = Math.round(t); }
    return o;
  }
}

/** 開発用：毛色などを決めた野生の子（{fur, pied, ear, leg, tail, size}：形質は −1〜1 をそろえる） */
export function devWildGenes(W, m) {
  if (!m.fur && m.pied == null && m.ear == null && m.leg == null && m.tail == null && m.size == null) return null;
  const g = wildGenes(W.rng, 'steppe');
  if (FUR_LIST.includes(m.fur)) g.col = [m.fur, m.fur];
  if (m.pied) g.pied = [1, 1];
  for (const k of ['ear', 'leg', 'tail', 'size']) if (m[k] != null) g[k] = new Array(8).fill(Math.max(-1, Math.min(1, Math.round(Number(m[k]) || 0))));
  g.fur = expressFur(g.col);
  return g;
}

