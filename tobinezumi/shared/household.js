// tobinezumi/shared/household.js — ひとつの家（操作個体＋巣の家族＋お産の予定）。オフラインのバックエンドとサーバーで同じ規則を使う。DOM なし。
//
//   const h = new Household(json)            … 保存の形 = h.toJSON()
//   h.tick(dtWorldMs, {seeds, season, newId, now})   → {used（自動で食べた倉庫の種子）, events}
//   h.invite(npc, ctx) / h.mateAgain(ctx)     … 赤ちゃんを授かる（条件は shared/family.js の breedBlock）
//   h.feed(id) / h.rename(id, name) / h.succeed(heirId, now) / h.farewell(ctx)
// events：{type:'me', crossed:'adult'|'elder'|'lifespan'} / {type:'stage', id, name, stage} / {type:'hungry', id, name} /
//         {type:'born', pups:[Ind], mother, father} / {type:'wait'}（冬なので春まで待つ）
import { DAY_MS } from './daynight.js';
import {
  BREED, ROLES_IN_NEST, FOLLOW_MAX, stageOf, stepAge, stepFamily, breedBlock, makeLitter, makeInd, feedOne, needsFood, successionPlan, farewellBlock,
  relativeInd, litterSeed, indOut, isGrown, heirsOf, STAGE, ageDays, speciesBlock, speciesOf, FRIEND_MAX, FAMILY_MAX, SPECIES,
} from './family.js';
import { petBlock, PET } from './family-life.js';
import { seedOf, lookOf } from './genetics.js';
void PET;

export const COMPANION_MAX = 1;   // Ver.0.7：地上へ連れて行ける なかま（同時に 1 匹）
/** 地上についてくる子の送る形（若者は小さく・なかまは comp:1 と種の見た目） */
export function walkerOut(m) {
  if (m.role === 'friend') return { id: m.id, name: m.name, comp: 1, sp: m.species || 'longear', look: lookOf(m.traits, { ps: m.id % 97, sp: m.species || 'longear' }) };
  return { id: m.id, name: m.name, look: lookOf(m.traits, { young: 1, ps: m.id % 97 }) };
}
/** 家族の送る形（out()）から、地上についてくる子（クライアントで同じ計算）。若者 3 匹まで → なかま 1 匹 */
export function walkersOfFamily(fam) {
  if (!fam || !Array.isArray(fam.members)) return [];
  const young = fam.follow ? fam.members.filter(m => (m.role === 'pup' || m.role === 'kin') && (m.stage || stageOf(m.ageMs)) === 'young').slice(0, FOLLOW_MAX) : [];
  const comp = fam.companion != null ? fam.members.find(m => m.role === 'friend' && String(m.id) === String(fam.companion)) : null;
  return [...young, ...(comp ? [comp] : [])].map(walkerOut);
}

export class Household {
  constructor(raw = {}) {
    this.me = raw.me || null;
    this.members = Array.isArray(raw.members) ? raw.members : [];
    this.pending = raw.pending || null;
    this.litters = raw.litters | 0;
    this.lastBirthMs = raw.lastBirthMs ?? null;
    this.follow = raw.follow !== false;
    this.promptDay = raw.promptDay ?? null;
    this.nestKey = raw.nestKey ?? 'nest';
    this.companion = raw.companion ?? null;   // Ver.0.7：地上へ連れて行く なかま（role friend の id・1 匹まで）
  }
  toJSON() { return { me: this.me, members: this.members, pending: this.pending, litters: this.litters, lastBirthMs: this.lastBirthMs, follow: this.follow, promptDay: this.promptDay, nestKey: this.nestKey, companion: this.companion }; }

  get mate() { return this.members.find(m => m.role === 'mate') || null; }
  /** ほかの種のなかま（Ver.0.6） */
  friends() { return this.members.filter(m => m.role === 'friend'); }
  kids() { return this.members.filter(m => m.role === 'pup' || m.role === 'kin'); }
  smallKids() { return this.kids().filter(m => !isGrown(m.ageMs)).length; }
  heirs() { return this.me ? heirsOf(this.me, this.members) : []; }
  /** 地上へ連れて行く若者（若者の子・きょうだい、3 匹まで） */
  followers() { return this.follow ? this.kids().filter(m => stageOf(m.ageMs) === 'young').slice(0, FOLLOW_MAX) : []; }
  /** Ver.0.7：地上へ連れて行く なかま（いなければ null） */
  companionMember() { if (this.companion == null) return null; const m = this.find(this.companion); return m && m.role === 'friend' ? m : null; }
  /** 地上で後ろについてくる子（若者 3 匹まで → なかま 1 匹の順。足あとをこの順にたどる） */
  walkers() { const c = this.companionMember(); return c ? [...this.followers(), c] : this.followers(); }
  /** Ver.0.7：なかまを地上へ連れて行く（id）・巣で待つ（null）。連れて行けるのは 1 匹だけ（別の子を選ぶと入れかわる） */
  setCompanion(id) {
    if (id == null || id === false) { this.companion = null; return { ok: true, companion: null }; }
    const m = this.find(id);
    if (!m || m.role !== 'friend') return { ok: false, reason: 'なかま（ほかの種の子）だけ 連れて行ける' };
    const swapped = this.companion != null && String(this.companion) !== String(m.id) ? this.companionMember() : null;
    this.companion = m.id;
    return { ok: true, companion: m.id, swapped: swapped ? swapped.id : null };
  }
  find(id) { return this.members.find(m => String(m.id) === String(id)) || null; }

  /** 時間を進める（親が地上か巣の中にいる間だけ） */
  tick(dtMs, { seeds = 0, season = 'spring', newId = null, now = 0 } = {}) {
    const events = [];
    if (!this.me || !(dtMs > 0)) return { used: 0, events };
    const a = stepAge(this.me.ageMs, dtMs);
    this.me = { ...this.me, ageMs: a.ageMs };
    if (a.crossed) events.push({ type: 'me', crossed: a.crossed });
    const r = stepFamily(this.members, dtMs, { seeds });
    this.members = r.members;
    events.push(...r.events);
    if (this.pending && this.me.ageMs >= this.pending.dueAgeMs && newId) {
      if (season === 'winter') { if (!this.pending.waitNote) { this.pending = { ...this.pending, waitNote: true }; events.push({ type: 'wait' }); } }
      else { const b = this.birth(season, newId, now); if (b) events.push(b); }
    }
    return { used: r.used, events };
  }
  /** お産（いまの季節で子の数が決まる） */
  birth(season, newId, now = 0) {
    const p = this.pending;
    const mate = this.members.find(m => String(m.id) === String(p.mateId)) || (p.mateGenes ? makeInd({ id: p.mateId, name: p.mateName || '？', sex: this.me.sex === 'f' ? 'm' : 'f', genes: p.mateGenes, role: 'left', ageMs: 5 * DAY_MS }) : null);
    if (!mate) { this.pending = null; return null; }
    const mother = this.me.sex === 'f' ? this.me : mate, father = this.me.sex === 'f' ? mate : this.me;
    const seed = litterSeed(mother.id, father.id, p.nth, this.nestKey);
    const taken = [this.me.name, ...this.members.map(m => m.name)];
    const pups = makeLitter({ mother, father, seed, season, nextId: newId, takenNames: taken, bornAt: now });
    this.members.push(...pups);
    this.pending = null;
    this.litters = p.nth;
    this.lastBirthMs = this.me.ageMs;
    return { type: 'born', pups, mother: mother.id, father: father.id, seed, season };
  }

  _block(ctx) {
    return breedBlock({ ageMs: this.me.ageMs, life: ctx.life, season: ctx.season, nestData: ctx.nestData, seeds: ctx.seeds, pending: !!this.pending,
      lastBirthMs: this.lastBirthMs, kids: this.smallKids(), familyCount: this.members.length });
  }
  /** なかよしの野生の子を巣へ迎える：つれあいになり、お産の予定ができる。npc = {name, genes}。ctx = {life, season, nestData, seeds, newId, now} */
  invite(npc, ctx) {
    if (npc.species && npc.species !== speciesOf(this.me)) return this.inviteFriend(npc, ctx);
    const why = this._block(ctx);
    if (why) return { ok: false, reason: why };
    const old = this.mate;
    const left = [];
    if (old) { this.members = this.members.filter(m => m !== old); left.push({ ...old, role: 'left', retiredAt: ctx.now || 0 }); }
    const age = (4.5 + ((seedOf(npc.name, ctx.now || 0) % 100) / 100) * 6) * DAY_MS;
    const mate = makeInd({ id: ctx.newId(), name: npc.name, sex: this.me.sex === 'f' ? 'm' : 'f', generation: 1, genes: npc.genes, role: 'mate', ageMs: age, fed: 100, named: true, bornAt: ctx.now || 0 });
    mate.wild = true;
    this.members.push(mate);
    this._conceive(mate, ctx);
    return { ok: true, mate, left };
  }
  /**
   * Ver.0.6：ほかの種（ミミナガトビネズミなど）のなかよしを巣へ迎える。つれあいにはならない（種の壁）＝お産の予定は できない。
   * 条件：巣がある・寝床の部屋・なかまは FRIEND_MAX まで・家族 FAMILY_MAX 未満
   */
  inviteFriend(npc, ctx) {
    if (!ctx.nestData) return { ok: false, reason: 'まず巣を掘ろう' };
    if (!ctx.nestData.rooms || !ctx.nestData.rooms.some(r => r.kind === 'bed')) return { ok: false, reason: '巣に寝床の部屋が要る（ビルドで部屋を「寝床」に）' };
    if (this.friends().length >= FRIEND_MAX) return { ok: false, reason: 'なかまは ' + FRIEND_MAX + ' 匹まで' };
    if (this.members.length >= FAMILY_MAX) return { ok: false, reason: '巣がにぎやかすぎる' };
    const sp = SPECIES[npc.species] ? npc.species : 'longear';
    const age = (5 + ((seedOf(npc.name, ctx.now || 0) % 100) / 100) * 6) * DAY_MS;
    const f = makeInd({ id: ctx.newId(), name: npc.name, sex: (seedOf(npc.name, 'sex') % 2) ? 'f' : 'm', generation: 1, genes: npc.genes, role: 'friend', ageMs: age, fed: 100, named: true, bornAt: ctx.now || 0, species: sp });
    f.wild = true;
    this.members.push(f);
    return { ok: true, friend: true, mate: f, left: [], note: speciesBlock(this.me, f) };
  }
  /** Ver.0.6：家族をなでる（毛づくろいしてあげる）。返り値 {ok, member, cond}（体調 +PET.COND は呼ぶ側が life に足す） */
  pet(id, now = 0) {
    const m = this.find(id);
    if (!m || !ROLES_IN_NEST.has(m.role)) return { ok: false, reason: 'その子は 巣にいない' };
    const why = petBlock(m, now);
    if (why) return { ok: false, reason: why, cooldown: true };
    const n = { ...m, pettedAt: now };
    this.members = this.members.map(x => (x === m ? n : x));
    return { ok: true, member: n, cond: PET.COND };
  }
  /** つれあいと もう一度（巣の中で） */
  mateAgain(ctx) {
    const mate = this.mate;
    if (!mate) return { ok: false, reason: 'つれあいがいない（野生の子と なかよくなろう）' };
    const sb = speciesBlock(this.me, mate);
    if (sb) return { ok: false, reason: sb };
    const why = this._block(ctx);
    if (why) return { ok: false, reason: why };
    this._conceive(mate, ctx);
    return { ok: true, mate };
  }
  _conceive(mate, ctx) {
    this.pending = { mateId: mate.id, mateName: mate.name, mateGenes: mate.genes, nth: this.litters + 1, dueAgeMs: this.me.ageMs + BREED.GESTATION_DAYS * DAY_MS, conceivedAt: ctx.now || 0 };
  }
  /** あと何 ms（遊んだ世界の時間）で生まれるか */
  dueIn() { return this.pending ? Math.max(0, this.pending.dueAgeMs - this.me.ageMs) : null; }

  feed(id) {
    const m = this.find(id);
    if (!m || !ROLES_IN_NEST.has(m.role)) return { ok: false, reason: 'その子は 巣にいない' };
    if (!needsFood(m)) return { ok: false, reason: m.role === 'mate' ? 'つれあいは 自分で食べている' : 'もう おとな（自分で食べられる）' };
    if ((m.fed ?? 0) >= 99) return { ok: false, reason: 'おなかいっぱい' };
    const n = feedOne(m);
    this.members = this.members.map(x => (x === m ? n : x));
    return { ok: true, member: n };
  }
  rename(id, name) {
    const m = this.find(id);
    if (!m || (m.role !== 'pup' && m.role !== 'kin')) return { ok: false, reason: 'その子は 巣にいない' };
    const n = { ...m, name, named: true };
    this.members = this.members.map(x => (x === m ? n : x));
    return { ok: true, member: n };
  }
  /** 世代交代：返り値 {ok, heir, retired:[Ind], left:[Ind]}（retired・left は家系図へ） */
  succeed(heirId, now = 0) {
    const plan = successionPlan(this.me, this.members, this.members.find(m => String(m.id) === String(heirId))?.id ?? heirId);
    if (!plan.ok) return plan;
    const retired = [], left = [];
    const ids = s => new Set(s.map(String));
    const R = ids(plan.retire), L = ids(plan.leave);
    retired.push({ ...this.me, role: 'ancestor', retiredAt: now });
    const rest = [];
    for (const m of this.members) {
      if (m.id === plan.heir.id) continue;
      if (R.has(String(m.id))) retired.push({ ...m, role: 'ancestor', retiredAt: now });
      else if (L.has(String(m.id))) left.push({ ...m, role: 'left', retiredAt: now });
      else rest.push({ ...m, role: m.role === 'friend' ? 'friend' : 'kin' });
    }
    this.me = { ...plan.heir, role: 'player', named: true };
    this.members = rest;
    this.pending = null; this.litters = 0; this.lastBirthMs = null; this.promptDay = null;
    return { ok: true, heir: this.me, retired, left };
  }
  /** 旅立ち（子がいない年寄り）：親せきの子があとをつぐ。ctx = {newId, now, seed, name} */
  farewell(ctx) {
    const why = farewellBlock(this.me, this.members);
    if (why) return { ok: false, reason: why };
    const heir = relativeInd({ id: ctx.newId(), current: this.me, seed: ctx.seed ?? seedOf('farewell', this.me.id, ctx.now || 0), bornAt: ctx.now || 0, name: ctx.name });
    const retired = [{ ...this.me, role: 'ancestor', retiredAt: ctx.now || 0 }], left = [];
    const rest = [];
    for (const m of this.members) {
      if (m.role === 'mate') retired.push({ ...m, role: 'ancestor', retiredAt: ctx.now || 0 });
      else if (m.role === 'friend') rest.push(m);
      else if (isGrown(m.ageMs) && stageOf(m.ageMs) !== 'young') left.push({ ...m, role: 'left', retiredAt: ctx.now || 0 });
      else rest.push({ ...m, role: 'kin' });
    }
    this.me = heir; this.members = rest; this.pending = null; this.litters = 0; this.lastBirthMs = null; this.promptDay = null;
    return { ok: true, heir, retired, left };
  }
  /** 寿命の目安をすぎた：世界の 1 日に 1 回「そろそろ次の世代へ」 */
  wantsPrompt() {
    if (!this.me) return false;
    const d = ageDays(this.me.ageMs);
    if (d < STAGE.LIFESPAN) return false;
    const day = Math.floor(d);
    if (this.promptDay === day) return false;
    this.promptDay = day;
    return true;
  }
  /** 送る形（本人へ） */
  out() {
    return {
      me: this.me ? indOut(this.me) : null,
      members: this.members.map(m => indOut(m)),
      pending: this.pending ? { mateId: this.pending.mateId, dueIn: this.dueIn(), wait: !!this.pending.waitNote } : null,
      litters: this.litters, follow: this.follow, companion: this.companionMember() ? this.companion : null, heirs: this.heirs().map(m => m.id),
      cooldown: this.lastBirthMs != null ? Math.max(0, BREED.COOLDOWN_DAYS * DAY_MS - (this.me.ageMs - this.lastBirthMs)) : 0,
    };
  }
  /** 巣を訪ねた子に見せる形（巣にいる家族だけ） */
  publicOut() { return this.members.map(m => indOut(m)); }
}
