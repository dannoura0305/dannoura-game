// 模倣する影（模倣者・ミミック）と、第3章のボス「写し身」【仮】。DOM・three.js なし（node でテスト）。ENEMY_AI_SPEC §2.7。
// ・化ける：見舞い客・（相棒）の姿で立ち、声で呼ぶ（disguise）。近づく・叩く・時間 → 0.9 秒かけて崩れて影になる（reveal：予兆）。
// ・写す：だんのうらの直前の動き（行動の履歴）から次の攻めを決める（mimicPlan）。決めた攻めは頭の上に「写：斬斬斬」と出す（公平の予兆）。
// ・見分け方（公平）：化けている間も足元の影が無い・瞬きしない・懐中電灯で目が光る（見た目はゲーム側）。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

/** 行動の種類 → 写し方の分類 */
export const ACT_CAT = { slash: 'melee', heavy: 'melee', claw: 'melee', blade: 'melee', iai: 'melee', pipe: 'melee', dodge: 'dodge', dash: 'dodge', shot: 'shot', foxfire: 'shot', parry: 'guard', illusion: 'guard' };
export const ACT_LABEL = { slash: '斬', heavy: '強', claw: '爪', blade: '刃', iai: '居', pipe: '打', dodge: '避', dash: '瞬', shot: '撃', foxfire: '火', parry: '弾', illusion: '幻' };
const CAT_ATK = { melee: 'mslash', dodge: 'mlunge', shot: 'mshot', guard: 'mgrab' };

/**
 * 写す攻めを決める（純粋関数）。hist：行動の履歴（新しいものが後ろ）、n：見る数。
 * 戻り値 { name, hits, cat, seq:[直近の行動], label:'写：斬斬斬', white }
 *  - いちばん多い分類（同数なら最後の行動の分類）。melee → 連撃（最後に続いた近接の数・最大 3）／dodge → 突き（赤）／shot → 影の弾（赤）／guard → つかみ（赤）
 *  - 白い姿の動き（爪・瞬・火・幻）を写したときは white:true（見た目を白くする・連撃は 1 つ多い）
 */
export function mimicPlan(hist = [], n = 4) {
  const h = hist.filter(a => ACT_CAT[a]).slice(-n);
  if (!h.length) return { name: 'mslash', hits: 1, cat: 'melee', seq: [], label: '写：—', white: false };
  const cnt = { melee: 0, dodge: 0, shot: 0, guard: 0 };
  for (const a of h) cnt[ACT_CAT[a]]++;
  const lastCat = ACT_CAT[h[h.length - 1]];
  let cat = lastCat, best = cnt[lastCat];
  for (const k of ['melee', 'dodge', 'shot', 'guard']) if (cnt[k] > best) { best = cnt[k]; cat = k; }
  const white = h.some(a => a === 'claw' || a === 'dash' || a === 'foxfire' || a === 'illusion');
  let hits = 1;
  if (cat === 'melee') { hits = 0; for (let i = h.length - 1; i >= 0 && ACT_CAT[h[i]] === 'melee'; i--) hits++; hits = Math.max(1, Math.min(white ? 4 : 3, hits)); }
  return { name: CAT_ATK[cat], hits, cat, seq: h.slice(), label: '写：' + h.map(a => ACT_LABEL[a]).join(''), white };
}

export class Mimic extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.mimic, Object.assign({ kind: opt.kind || 'mimic' }, opt));
    this.disguise = opt.disguise || null;                   // 'civilian' | 'companion' | null
    this.home = opt.home || { x: this.pos.x, z: this.pos.z };
    this.lure = opt.lure || null;                           // 呼び声の台詞の鍵
    this.state = this.disguise ? 'disguise' : opt.dormant ? 'dormant' : 'hostile';
    if (this.state === 'hostile') { this.hostileBy = 'spawn'; }
    this.plan = null; this.revealed = !this.disguise;
  }
  immune() { return this.state === 'reveal' || this.state === 'dormant'; }
  /** 化けを見破られた・叩かれた・近づかれた → 崩れて影になる（予兆） */
  startReveal(evs, why) {
    if (this.state !== 'disguise') return false;
    this.go('reveal', evs, why); evs.push({ t: 'reveal', why, disguise: this.disguise }); return true;
  }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (this.state === 'disguise') { this.startReveal(evs, 'hit'); return 0; }
    return super.hurt(dmg, kind, evs, opt);
  }
  /** 次の攻めを決めて予兆を出す */
  startAttack(sense, evs) {
    const plan = mimicPlan(sense.hist || []);
    this.plan = plan;
    const A = this.def.attacks[plan.name];
    this.atk = { name: plan.name, phase: 'windup', t: 0, hits: plan.hits, hitN: 0, hitDone: false };
    const p = sense.player;
    if (A.ranged && p) this.atk.at = { x: p.x, z: p.z };
    if (A.aoe && !A.ranged) this.atk.at = { x: this.pos.x, z: this.pos.z };
    evs.push({ t: 'telegraph', name: plan.name, def: A, parryable: A.parryable, at: this.atk.at || null, plan });
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'dormant': case 'dead': case 'rest': break;
      case 'disguise': {
        if (!p || p.dead) break;
        const d = dist2(this.pos, p);
        if (d < 12) out.face = { x: p.x, z: p.z };
        if (this.lure && d < 14 && Math.floor(this.t / 3.4) !== Math.floor((this.t - dt) / 3.4)) evs.push({ t: 'say', key: this.lure });
        if (d < this.def.revealDist || this.hostileBy) this.startReveal(evs, this.hostileBy ? 'hit' : 'near');
        break;
      }
      case 'reveal': if (p) out.face = { x: p.x, z: p.z }; if (this.t >= this.def.revealT) { this.revealed = true; this.lastSeen = p ? { x: p.x, z: p.z } : null; this.lastSeenT = this.total; this.cool = 0.2; this.go('hostile', evs, 'revealed'); evs.push({ t: 'hostile' }); } break;
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
      case 'hostile': this.fight(dt, sense, out); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    if (!p || p.dead) return;
    const d = dist2(this.pos, p);
    this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total;
    if (this.def.leash && dist2(this.pos, this.home) > this.def.leash && d > 6) { out.move = { x: this.home.x, z: this.home.z, speed: this.def.speed.walk }; out.face = { x: this.home.x, z: this.home.z }; return; }
    const plan = mimicPlan(sense.hist || []), A = this.def.attacks[plan.name];
    const reach = A.dash ? A.range * 0.9 : A.ranged ? A.range : A.range * 0.85;
    out.face = { x: p.x, z: p.z }; out.faceRate = 2.4;
    if (this.cool <= 0 && d <= reach && (!A.dash || d > 2.5)) { this.startAttack(sense, evs); return; }
    if (this.cool <= 0 && A.dash && d <= 2.5) { this.startAttack(Object.assign({}, sense, { hist: ['slash'] }), evs); return; }
    if (d > (A.ranged ? 6 : 1.6)) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry };
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') {
      const w = a.hitN > 0 && A.next ? A.next : A.windup;
      if (p && (!A.dash || a.t < w * 0.75)) { out.face = { x: p.x, z: p.z }; out.faceRate = A.dash ? 2.4 : 3.0; }
      if (A.ranged && a.at && p && a.t < w * 0.5) { a.at.x = p.x; a.at.z = p.z; }
      if (a.t >= w) {
        a.phase = 'active'; a.t = 0; a.hitDone = false;
        if (A.dash) a.dir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
        if (A.aoe && !A.ranged) a.at = { x: this.pos.x + Math.sin(this.yaw) * (A.aoe.ahead || 0), z: this.pos.z + Math.cos(this.yaw) * (A.aoe.ahead || 0) };
        evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null, hitN: a.hitN });
      }
    } else if (a.phase === 'active') {
      if (A.dash && a.dir) { out.move = { x: this.pos.x + a.dir.x * 3, z: this.pos.z + a.dir.z * 3, speed: this.def.speedDash || 9 }; out.face = { x: this.pos.x + a.dir.x, z: this.pos.z + a.dir.z }; out.faceRate = 20; out.dash = true; }
      if (a.t >= A.active || (A.dash && a.blocked)) {
        a.hitN++;
        if (a.hitN < (a.hits || 1) && !A.dash && !A.ranged) { a.phase = 'windup'; a.t = 0; evs.push({ t: 'telegraph', name: a.name, def: Object.assign({}, A, { windup: A.next || A.windup }), parryable: A.parryable, follow: true, plan: this.plan }); }
        else if (A.volley && a.hitN < A.volley) { a.phase = 'windup'; a.t = A.windup * 0.55; if (p) a.at = { x: p.x, z: p.z }; evs.push({ t: 'telegraph', name: a.name, def: Object.assign({}, A, { windup: A.windup * 0.45 }), parryable: false, at: a.at, follow: true, plan: this.plan }); }
        else { a.phase = 'recover'; a.t = 0; if (A.dash) evs.push({ t: 'crash' }); }
      }
    } else if (a.t >= A.recover) { this.atk = null; this.cool = this.cooldown() * (0.85 + this.rand() * 0.4); }
  }
  cooldown() { return this.def.cooldown; }
}

/**
 * 写し身（ボス）。段階：0（写す）→ 体力 60% で「転機」（tenki：無敵で止まる。ゲームが構えを選んで resume を呼ぶ）→ 1（写す＋影の波＋呼び声）。
 * 呼び声（voice）：16 秒ごとに 5 秒、止まって子どもの母の声を真似る。この間は 1.5 倍のダメージ。本当の声（留守電）を聞かせると救える。
 */
export class Utsushimi extends Mimic {
  constructor(opt = {}) {
    super(Object.assign({ def: ENEMIES.utsushimi, kind: 'utsushimi', dormant: true }, opt));
    this.phase = 0; this.vT = 0; this.vN = 0; this.atkN = 0; this.assisted = false; this.slowK = 1; this.stance = null;
  }
  immune() { return ['dormant', 'tenki', 'rest'].includes(this.state); }
  wake(evs = []) { if (this.state === 'dormant') { this.go('hostile', evs, 'wake'); this.cool = 1.4; this.hostileBy = 'boss'; } }
  cooldown() { return this.def.phases[this.phase].cooldown * this.slowK; }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (this.state === 'voice') { dmg = Math.round(dmg * this.def.voice.dmgMul); }
    if (this.phase === 0 && this.alive && !this.immune()) {
      const floor = Math.ceil(this.hpMax * this.def.tenkiAt);
      if (this.hp - dmg <= floor) {                         // 転機：ここで止まる（倒しきれない）
        const r = this.hp - floor; this.hp = floor; this.atk = null; this.chainable = false;
        evs.push({ t: 'hurt', dmg: r, kind });
        this.go('tenki', evs, 'hp'); evs.push({ t: 'tenki' });
        return r;
      }
    }
    if (this.state === 'voice') {                           // 呼び声は叩かれても続く（止まっているだけ）
      this.hp = Math.max(0, this.hp - dmg); evs.push({ t: 'hurt', dmg, kind }); this.hostileBy = 'attacked';
      if (this.hp <= 0) { this.resolution = 'kill'; this.go('dead', evs, 'hp0'); evs.push({ t: 'die' }); }
      return dmg;
    }
    return super.hurt(dmg, kind, evs, opt);
  }
  /** 転機のあと（ゲームが構えを選んだ）：stance 'reveal'|'secret'。assist：手助け（体力を削る・動きを遅く） */
  resume(stance, evs = [], assist = false) {
    if (this.state !== 'tenki') return false;
    this.stance = stance; this.phase = 1; this.vT = 0; this.patIdx = 0;
    if (assist) this.applyAssist();
    this.go('hostile', evs, 'resume'); this.cool = 1.6; return true;
  }
  applyAssist() { if (this.assisted) return; this.assisted = true; this.hp = Math.max(1, Math.round(this.hp - this.hpMax * this.def.assist.hpCut)); this.slowK = this.def.assist.slow; }
  /** 本当の声を聞かせる（呼び声の間だけ）＝救う */
  playMemo(evs = []) {
    if (this.state !== 'voice') return 'closed';
    this.resolution = 'rescue'; this.atk = null; this.go('rest', evs, 'memo'); evs.push({ t: 'rescued' }); return 'rescued';
  }
  update(dt, sense) {
    if (this.state === 'voice') {
      const out = { move: null, face: null, events: [] }; this.t += dt; this.total += dt;
      if (sense.player) { out.face = { x: sense.player.x, z: sense.player.z }; out.faceRate = 0.8; }
      if (Math.floor(this.t / 1.7) !== Math.floor((this.t - dt) / 1.7)) out.events.push({ t: 'say', key: 'utsushimi_voice' });
      if (this.t >= this.def.voice.dur) { this.go('hostile', out.events, 'voiceEnd'); out.events.push({ t: 'voiceEnd' }); this.cool = 0.6; }
      return out;
    }
    if (this.state === 'tenki') { const out = { move: null, face: null, events: [] }; this.t += dt; this.total += dt; return out; }
    const out = super.update(dt, sense);
    if (this.phase === 1 && this.state === 'hostile' && !this.atk) {
      this.vT += dt;
      const V = this.def.voice;
      if (this.vT >= (this.vN === 0 ? V.first : V.every)) { this.vT = 0; this.vN++; this.go('voice', out.events, 'time'); out.events.push({ t: 'voice', n: this.vN }); }
    }
    return out;
  }
  startAttack(sense, evs) {
    this.atkN++;
    const P = this.def.phases[this.phase];
    if (P.every && this.atkN % P.every === 0) {                         // 第 2 段階：3 回に 1 回は影の波（円・赤）
      const A = this.def.attacks.mwave;
      this.plan = { name: 'mwave', hits: 1, cat: 'wave', seq: [], label: '影の波', white: false };
      this.atk = { name: 'mwave', phase: 'windup', t: 0, hits: 1, hitN: 0, at: { x: this.pos.x, z: this.pos.z } };
      evs.push({ t: 'telegraph', name: 'mwave', def: A, parryable: false, at: this.atk.at, plan: this.plan });
      return;
    }
    super.startAttack(sense, evs);
  }
}
