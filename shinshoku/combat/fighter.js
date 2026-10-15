// だんのうら（紫の姿）の戦闘の状態機械。DOM・three.js なし（node でテストする）。
// 1 回の tick ＝ 60Hz の 1 フレーム。入力は「押した瞬間（press）」と「押している間（held）」で受け取る。
// 位置・当たり判定はゲーム側（shinshoku/actor/player.js）。ここは時間と状態と結果だけを持つ。
//
// tick(inp) の inp：
//   attack（押した）・heavy（押している：強攻撃／居合の構え）・dodge（押した）・parry（押した）・
//   swap（押した）・aim（押している）・reload（押した）
// incoming(atk)：敵の攻撃判定が出たフレームに呼ぶ。atk = { src, dmg, parryable, inRange, nearMiss }
// 戻り値の events は配列。ゲーム側が演出（ヒットストップ・スロー・音）と当たり判定に使う。
import { COMBAT } from '../data/combat.js';
import { windows, judgeDodge, judgeParry, issenOpen } from './timing.js';
import { swapFrames } from './switch.js';

export class Fighter {
  constructor(opt = {}) {
    this.C = opt.combat || COMBAT;
    this.setDifficulty(opt.difficulty || 'normal', opt);
    this.hpMax = opt.hpMax || this.C.hp.max;
    this.hp = opt.hp != null ? opt.hp : this.hpMax;
    this.weapon = opt.weapon || 'katana';
    this.owned = opt.owned ? opt.owned.slice() : ['katana', 'handgun'];          // 持っている武器（序章は鉄パイプだけ）
    this.lastMelee = this.weapon === 'handgun' ? (this.owned.includes('katana') ? 'katana' : 'pipe') : this.weapon;
    this.chain = null; this.chainN = 0;                                          // 連鎖一閃の窓 { src, at }
    this.mag = opt.mag != null ? opt.mag : this.C.handgun.mag;
    this.ammo = opt.ammo != null ? opt.ammo : 24;
    this.frame = 0;
    this.st = { name: 'free', f: 0 };
    this.press = { attack: -999, dodge: -999 };
    this.aimF = 0; this.fireCd = 0; this.lastFire = -999;
    this.invulnUntil = -1;
    this.mikiri = null; this.hajiki = null; this.utsu = null;   // 一閃の窓 { src, at }
    this.pending = null;                                         // パリィの「後 2f」待ちの被弾
    this.lastDodgeEnd = -999; this.dodgeChain = 0;
    this.log = [];                                                // 直近の出来事（テスト・記録用）
    // 白髪形態（COMBAT_SYSTEM_SPEC §4）：form と妖力（yoki）。紫の姿では妖力は溜まるだけ（yokiOn のとき）
    this.form = 'purple'; this.yoki = opt.yoki != null ? opt.yoki : 0; this.yokiOn = !!opt.yokiOn; this.prevWeapon = null;
    this.combo = { n: 0, last: -9999, max: 0 };                    // 連撃の数（画面の「Combo」）
    this.mLoaded = true;                                           // 火縄銃（白の妖弾）：込めてあるか（1 発ごとに込め直し）
  }
  setDifficulty(diff, opt = {}) {
    this.diff = diff; this.touch = !!opt.touch; this.assist = !!opt.assist;
    this.w = windows(diff, { touch: this.touch, assist: this.assist }, this.C);
  }
  /** 装備などで戦闘の数値を差し替える（combat/equip.js の combatWithEquip の結果） */
  setCombat(C) { this.C = C; this.setDifficulty(this.diff, { touch: this.touch, assist: this.assist }); }
  get melee() { return this.weapon === 'pipe' || this.weapon === 'katana' || this.weapon === 'claw' || this.weapon === 'matchlock'; }
  /** 弾ける（パリィの）武器か：火縄銃は弾けない（重い銃床） */
  get canParry() { return this.melee && this.weapon !== 'matchlock'; }
  get white() { return this.form === 'white'; }
  /** 近接の武器の値（刀・鉄パイプ・妖爪） */
  _mw() { if (this.weapon === 'claw') return { light: this.C.white.claw, heavy: this.C.white.blade }; if (this.weapon === 'matchlock') return this.C.matchlock; return this.C[this.weapon === 'pipe' ? 'pipe' : 'katana']; }
  // ── 白髪形態・妖力・連撃 ──
  /** 姿を変える（'white'|'purple'）。妖力が足りない・状態が悪いと false。許可（ルート・相棒の目）はゲーム側で見る */
  setForm(form, force) {
    if (form === this.form) return false;
    if (form === 'white') {
      if (!force && (this.yoki < this.C.white.gauge.min || !['free', 'attack', 'charge'].includes(this.st.name))) return false;
      this.prevWeapon = this.weapon === 'claw' ? this.prevWeapon : this.weapon; this.form = 'white'; this.weapon = 'claw'; this.lastMelee = 'claw';
    } else {
      this.form = 'purple'; const w = this.prevWeapon && this.owned.includes(this.prevWeapon) ? this.prevWeapon : (this.owned.find(x => x !== 'handgun') || this.owned[0] || 'none');
      this.weapon = w; this.lastMelee = w === 'handgun' ? (this.owned.includes('katana') ? 'katana' : 'pipe') : w;
    }
    if (this.st.name !== 'dead') this._go('free');
    this.mikiri = this.hajiki = this.utsu = this.chain = null; this.pending = null;
    return true;
  }
  /** 妖力を得る。kind：'hit'|'issen'|数値 */
  gainYoki(kind) {
    if (!this.yokiOn && !this.white) return 0;
    const G = this.C.white.gauge, n = typeof kind === 'number' ? kind : this.white ? (kind === 'issen' ? G.issen : G.hit) : (kind === 'issen' ? G.purpleIssen : G.purpleHit);
    const b = this.yoki; this.yoki = Math.max(0, Math.min(G.max, this.yoki + n)); return this.yoki - b;
  }
  spendYoki(n) { if (this.yoki < n) return false; this.yoki -= n; return true; }
  /** 当たった（連撃の数を数える） */
  registerHit() { const W = this.C.white.comboWindow; this.combo.n = this.frame - this.combo.last <= W ? this.combo.n + 1 : 1; this.combo.last = this.frame; this.combo.max = Math.max(this.combo.max, this.combo.n); return this.combo.n; }
  get comboN() { return this.frame - this.combo.last <= this.C.white.comboWindow ? this.combo.n : 0; }
  /** 連撃の倍率（白い姿だけ：10 連撃ごとに +0.1、最大 ×1.8） */
  comboMul() { return this.white ? 1 + Math.min(0.8, Math.floor(this.comboN / 10) * 0.1) : 1; }
  _dodgeC() { return this.white ? Object.assign({}, this.C.dodge, this.C.white.dash) : this.C.dodge; }
  /** 持ち替えの行き先：近接→銃、銃→最後に使った近接 */
  swapTarget() {
    if (this.weapon === 'handgun') return this.owned.includes(this.lastMelee) ? this.lastMelee : this.owned.find(w => w !== 'handgun') || null;
    return this.owned.includes('handgun') ? 'handgun' : (this.owned.find(w => w !== this.weapon && w !== 'handgun') || null);
  }
  give(w) { if (!this.owned.includes(w)) this.owned.push(w); }
  /** 連鎖一閃の窓を開く（一閃が当たった直後、次の相手が見つかった時にゲーム側が呼ぶ） */
  openChain(src) { this.chain = { src, at: this.frame }; }
  get name() { return this.st.name; }
  get aiming() { return this.weapon === 'handgun' && this.st.name === 'free' && this.aimHeld && this.aimF >= this.C.handgun.aimIn; }
  get dead() { return this.st.name === 'dead'; }
  isInvuln() { const D = this.st.white ? this.C.white.dash : this.w; return this.st.name === 'issen' || this.frame < this.invulnUntil || (this.st.name === 'dodge' && this.st.f >= D.iStart && this.st.f <= D.iEnd); }

  /** 移動の倍率（0 なら移動不可）。走る・歩くの区別はゲーム側 */
  moveMul() {
    const n = this.st.name;
    if (n === 'free') return this.aimHeld && this.weapon === 'handgun' ? this.C.move.aim / this.C.move.run : 1;
    if (n === 'swap') return 0.8;
    if (n === 'reload') return this.C.move.reload / this.C.move.run;
    if (n === 'hipfire') return 0.5;
    if (n === 'mcharge') return 0.35;
    if (n === 'mreload') return 0.5;
    return 0;
  }

  _go(name, extra) { this.st = Object.assign({ name, f: 0 }, extra || {}); }
  _ev(evs, e) { e.frame = this.frame; evs.push(e); this.log.push(e); if (this.log.length > 64) this.log.shift(); }
  _buffered(k) { return this.frame - this.press[k] <= this.C.buffer; }
  _consume(k) { this.press[k] = -999; }

  heal(n) { if (this.dead) return 0; const b = this.hp; this.hp = Math.min(this.hpMax, this.hp + n); return this.hp - b; }
  addAmmo(n) { this.ammo += n; }
  /** 弱点に当たった（撃ち一閃の窓） */
  markWeakHit(src) { this.utsu = { src, at: this.frame }; }
  /** 居合の空振り判定用：振りが当たったか */
  markSwingHit() { if (this.st.name === 'attack') this.st.hit = true; }

  tick(inp = {}) {
    const evs = [];
    const C = this.C, st = this.st;
    this.aimHeld = !!inp.aim;
    if (inp.attack) this.press.attack = this.frame;
    if (inp.dodge) this.press.dodge = this.frame;
    if (this.fireCd > 0) this.fireCd--;
    if (this.weapon === 'handgun' && inp.aim && (st.name === 'free')) this.aimF++; else if (!inp.aim) this.aimF = 0;

    if (this.dead) { this.frame++; return evs; }
    // 白い姿：妖力が減っていく。0 で静かに紫へ戻る（暴走しない）
    if (this.white) {
      this.yoki = Math.max(0, this.yoki - this.C.white.gauge.drain / 60);
      if (this.yoki <= 0) { this.setForm('purple'); this._ev(evs, { t: 'revert', why: 'empty' }); }
    } else if (this.yokiOn && this.yoki < this.C.white.gauge.max) this.yoki = Math.min(this.C.white.gauge.max, this.yoki + this.C.white.gauge.regen / 60);
    if (this.combo.n && this.frame - this.combo.last > this.C.white.comboWindow) { this.combo.n = 0; }

    // パリィの「後 2f」：被弾の保留
    if (this.pending) {
      const late = this.frame - this.pending.at;
      if (inp.parry && this.canParry && judgeParry(-late, this.w) === 'parry') {
        this._parrySuccess(evs, this.pending.atk.src); this.pending = null;
        this.frame++; return evs;
      }
      if (late >= this.w.parryAfter) { const a = this.pending.atk; this.pending = null; this._damage(evs, a, 1); if (this.dead) { this.frame++; return evs; } }
    }

    // 一閃（窓の間に攻撃）。どの状態からでも（硬直・被弾・一閃中を除く）
    if (this._buffered('attack') && !['issen', 'hurt', 'dead'].includes(this.st.name)) {
      const kind = this.mikiri && issenOpen('mikiri', this.frame - this.mikiri.at, this.w) ? 'mikiri'
        : this.hajiki && issenOpen('hajiki', this.frame - this.hajiki.at, this.w) ? 'hajiki'
        : this.utsu && issenOpen('utsu', this.frame - this.utsu.at, this.w) ? 'utsu'
        : this.chain && issenOpen('chain', this.frame - this.chain.at, this.w) ? 'chain' : null;
      if (kind) {
        const src = this[kind].src; this.mikiri = this.hajiki = this.utsu = this.chain = null; this._consume('attack');
        this.chainN = kind === 'chain' ? this.chainN + 1 : 0;
        this._startIssen(evs, kind, src);
        this.frame++; return evs;
      }
    }

    const s = this.st;
    s.f++;
    switch (s.name) {
      case 'free': this._free(evs, inp); break;
      case 'attack': this._attack(evs, inp); break;
      case 'charge': this._charge(evs, inp); break;
      case 'cast': if (s.f >= s.total) this._go('free'); break;
      case 'dodge': {
        if (s.f >= (s.white ? C.white.dash.total : C.dodge.total) + (s.lag || 0)) { this.lastDodgeEnd = this.frame; this._go('free'); this._free(evs, inp, true); }
        break;
      }
      case 'parry': {
        const total = this.w.parryBefore + C.parry.failLag;
        if (s.f === this.w.parryBefore + 1 && !s.ok) this._ev(evs, { t: 'parryFail' });
        if (s.f >= (s.ok ? 6 : total)) this._go('free');
        else if (s.ok && this._buffered('dodge')) { this._consume('dodge'); this._startDodge(evs, inp); }
        break;
      }
      case 'issen': {
        const d = C.issen[s.kind];
        if (s.f === d.strike) this._ev(evs, { t: 'issenStrike', kind: s.kind, dmg: d.dmg, target: s.target });
        if (s.f >= d.total) this._go('free');
        break;
      }
      case 'swap': {
        if (s.f >= s.total) {
          this.weapon = s.to; this._ev(evs, { t: 'swapDone', weapon: s.to, frames: s.total });
          this._go('free');
          if (s.then === 'fire') this._fire(evs, true, true);
        } else if (this._buffered('dodge')) { this._consume('dodge'); this._startDodge(evs, inp); }
        break;
      }
      case 'hipfire': {
        if (s.f >= C.handgun.hip) { this._fire(evs, false, false); this._go('free'); }
        break;
      }
      case 'reload': {
        if (s.f >= C.handgun.reload) {
          const n = Math.min(C.handgun.mag - this.mag, this.ammo); this.mag += n; this.ammo -= n;
          this._ev(evs, { t: 'reloadDone', mag: this.mag }); this._go('free');
        } else if (this._buffered('dodge')) { this._consume('dodge'); this._ev(evs, { t: 'reloadCancel' }); this._startDodge(evs, inp); }
        break;
      }
      case 'hurt': if (s.f >= C.hurt.stun) this._go('free'); break;
      // 火縄銃（白：妖弾）：溜め → 撃つ → 反動 → 込め直し（遅い）。溜め・込め直しは回避で取り消せる（込め直しはやり直し）
      case 'mcharge': {
        const Y = C.matchlock.yodan;
        if (this._buffered('dodge')) { this._consume('dodge'); this._ev(evs, { t: 'mcancel' }); return this._startDodge(evs, inp), this.frame++, evs; }
        if (s.f >= Y.charge) {
          if (!this.spendYoki(Y.cost)) { this._ev(evs, { t: 'noYoki', need: Y.cost }); this._go('free'); break; }
          this.mLoaded = false; this._ev(evs, { t: 'yodan', dmg: Y.dmg, range: Y.range, pierce: Y.pierce, width: Y.width, poise: Y.poise });
          this._go('mrecoil');
        }
        break;
      }
      case 'mrecoil': if (s.f >= C.matchlock.yodan.recoil) { this._go('mreload'); this._ev(evs, { t: 'mreloadStart' }); } break;
      case 'mreload': {
        if (this._buffered('dodge')) { this._consume('dodge'); this._ev(evs, { t: 'mreloadCancel' }); return this._startDodge(evs, inp), this.frame++, evs; }
        if (s.f >= C.matchlock.yodan.reload) { this.mLoaded = true; this._ev(evs, { t: 'mreloadDone' }); this._go('free'); }
        break;
      }
    }
    this.frame++;
    return evs;
  }

  _free(evs, inp, justEntered) {
    const C = this.C;
    if (this._buffered('dodge')) { this._consume('dodge'); return this._startDodge(evs, inp); }
    if (this.white) return this._freeWhite(evs, inp);
    if (inp.parry && this.canParry) return this._startParry(evs);
    if (inp.swap) { const to = this.swapTarget(); if (to) return this._startSwap(evs, to); }
    if (inp.wantWeapon && inp.wantWeapon !== this.weapon && this.owned.includes(inp.wantWeapon)) return this._startSwap(evs, inp.wantWeapon);
    if (inp.aim && this.melee && !justEntered && this.owned.includes('handgun')) return this._startSwap(evs, 'handgun');
    if (inp.reload && this.weapon === 'handgun') return this._startReload(evs);
    if (inp.heavy && this.melee) { this._go('charge'); this._ev(evs, { t: 'chargeStart' }); return; }
    if (this._buffered('attack')) {
      if (this.melee) { this._consume('attack'); return this._startAttack(evs, 0); }
      if (this.weapon !== 'handgun') { this._consume('attack'); return; }        // 素手（序章の最初）：何もしない
      if (this.aimHeld) {
        if (this.aimF >= C.handgun.aimIn && this.fireCd <= 0) { this._consume('attack'); this._fire(evs, true, false); }
      } else if (this.fireCd <= 0) { this._consume('attack'); this._go('hipfire'); }
    }
  }

  /** 白い姿の「何もしていない」時：妖爪・妖刀の溜め・猫火（構え＋撃つ）・幻術（弾く） */
  _freeWhite(evs, inp) {
    const W = this.C.white;
    if (inp.parry) return this._illusion(evs);
    // 持ち替え：妖爪 ⇄ 火縄銃（妖弾）。火縄銃を持っている時だけ
    if ((inp.swap || inp.wantWeapon === 'matchlock' || (inp.wantWeapon && this.weapon === 'matchlock')) && this.owned.includes('matchlock')) { const to = this.weapon === 'matchlock' ? 'claw' : 'matchlock'; if (inp.swap || inp.wantWeapon === to || (to === 'claw' && inp.wantWeapon)) return this._startSwap(evs, to, null, 12); }
    if (this.weapon === 'matchlock') {
      if (this._buffered('attack') || inp.heavy) { this._consume('attack'); return this._startYodan(evs); }
      return;
    }
    if (this.aimHeld && this._buffered('attack')) { this._consume('attack'); return this._foxfire(evs); }
    if (inp.heavy && !this.aimHeld) { this._go('charge'); this._ev(evs, { t: 'chargeStart' }); return; }
    if (this._buffered('attack') && !this.aimHeld) { this._consume('attack'); return this._startAttack(evs, 0); }
    void W;
  }
  /** 妖弾：込めてあれば溜めへ、込めていなければ込め直し */
  _startYodan(evs) {
    if (!this.mLoaded) { this._go('mreload'); this._ev(evs, { t: 'mreloadStart' }); return; }
    if (this.yoki < this.C.matchlock.yodan.cost) { this._ev(evs, { t: 'noYoki', need: this.C.matchlock.yodan.cost }); return; }
    this._go('mcharge'); this._ev(evs, { t: 'mchargeStart' });
  }
  _illusion(evs) {
    const I = this.C.white.illusion;
    if (!this.spendYoki(I.cost)) { this._ev(evs, { t: 'noYoki', need: I.cost }); return; }
    this._go('cast', { total: I.cast, what: 'illusion' }); this._ev(evs, { t: 'illusion', dur: I.dur });
  }
  _foxfire(evs) {
    const X = this.C.white.foxfire;
    if (this.fireCd > 0) return;
    if (!this.spendYoki(X.cost)) { this._ev(evs, { t: 'noYoki', need: X.cost }); return; }
    this.fireCd = X.cd; this._go('cast', { total: 10, what: 'foxfire' }); this._ev(evs, { t: 'foxfire', n: X.n, dmg: X.dmg });
  }
  _startAttack(evs, step, atk) {
    const a = atk || this._mw().light[step];
    this._go('attack', { step, atk: a, hit: false, next: false });
    this._ev(evs, { t: 'attackStart', step, atk: a });
  }
  _attack(evs, inp) {
    const s = this.st, a = s.atk, C = this.C;
    const actEnd = a.startup + a.active;
    if (s.f >= a.startup && s.f < actEnd) { this._ev(evs, { t: 'active', step: s.step, atk: a, first: !s.act, iai: !!s.iai }); s.act = true; }
    if (s.f === actEnd && s.iai && !s.hit) s.extra = C.issen.iai.miss - a.recovery;   // 居合の空振り＝30f の硬直
    const rf = s.f - actEnd;                                                      // 戻りの何フレーム目か
    if (rf >= 0) {
      if (this._buffered('attack') && s.step < this._mw().light.length - 1 && !s.heavy && this.press.attack > this.frame - s.f + 2) {
        this._consume('attack'); return this._startAttack(evs, s.step + 1);
      }
      if (this._buffered('dodge') && !s.iai) { this._consume('dodge'); return this._startDodge(evs, inp); }
      if (inp.parry && this.white) return this._illusion(evs);
      if (inp.parry && this.canParry && !s.iai) return this._startParry(evs);
      if (!this.white && (inp.swap || (inp.aim && !s.aimWas)) && !s.iai && this.owned.includes('handgun')) {
        const fr = swapFrames(this.weapon, 'handgun', { recoveryFrame: rf }, C);
        return this._startSwap(evs, 'handgun', inp.aim ? 'fire' : null, fr);
      }
    }
    s.aimWas = !!inp.aim;
    if (s.f >= actEnd + a.recovery + (s.extra || 0)) { this._go('free'); }
  }
  _charge(evs, inp) {
    const s = this.st, C = this.C;
    if (this._buffered('dodge')) { this._consume('dodge'); return this._startDodge(evs, inp); }
    const pipe = this.weapon !== 'katana';                                 // 居合は刀だけ（鉄パイプ・火縄銃は強攻撃）
    if (this.white) {                                                       // 妖刀：溜めて離すと刃の伸びる刀（妖力 5）
      if (!inp.heavy) {
        const B = C.white.blade;
        if (s.f >= 10 && this.spendYoki(B.cost)) { const a = Object.assign({}, B, { startup: 0 }); this._go('attack', { step: 8, atk: a, heavy: true, blade: true, hit: false }); this._ev(evs, { t: 'attackStart', step: 8, atk: a, heavy: true, blade: true }); }
        else this._startAttack(evs, 0);
      }
      return;
    }
    if (s.f === this.w.iaiHold && !pipe) this._ev(evs, { t: 'iaiReady' });
    if (!inp.heavy) {
      if (s.f >= this.w.iaiHold && !pipe) {
        const a = Object.assign({ startup: 0 }, C.katana.iaiSwing);
        this._go('attack', { step: 9, atk: a, heavy: true, iai: true, hit: false });
        this._ev(evs, { t: 'attackStart', step: 9, atk: a, iai: true });
      } else if (s.f >= this._mw().heavy.startup) {
        const a = Object.assign({}, this._mw().heavy, { startup: 0 });
        this._go('attack', { step: 8, atk: a, heavy: true, hit: false });
        this._ev(evs, { t: 'attackStart', step: 8, atk: a, heavy: true });
      } else this._startAttack(evs, 0);
    }
  }
  get iaiStance() { return !this.white && this.st.name === 'charge' && this.weapon === 'katana' && this.st.f >= this.w.iaiHold; }

  _startDodge(evs, inp) {
    const C = this.C;
    this.dodgeChain = (this.frame - this.lastDodgeEnd <= C.dodge.chainGap) ? this.dodgeChain + 1 : 1;
    const lag = this.dodgeChain > C.dodge.chainMax ? C.dodge.chainLag : 0;
    if (lag) this.dodgeChain = 0;
    this.pending = null;
    this._go('dodge', { lag, justDone: false, white: this.white });
    this._ev(evs, { t: 'dodge', chain: this.dodgeChain, lag, white: this.white });
  }
  _startParry(evs) { this._go('parry', { at: this.frame, ok: false }); this._ev(evs, { t: 'parryStart' }); }
  _parrySuccess(evs, src) {
    this.hajiki = { src, at: this.frame };
    this._go('parry', { at: this.frame, ok: true });
    this._ev(evs, { t: 'parry', src });
  }
  _startSwap(evs, to, then, frames) {
    if (to !== 'handgun') this.lastMelee = to; else if (this.melee) this.lastMelee = this.weapon;
    const fr = frames != null ? frames : swapFrames(this.weapon, to, { sinceFire: this.frame - this.lastFire }, this.C);
    this._go('swap', { to, total: fr, then: then || null, from: this.weapon });
    this._ev(evs, { t: 'swapStart', to, frames: fr });
  }
  _startReload(evs) {
    if (this.mag >= this.C.handgun.mag || this.ammo <= 0) return;
    this._go('reload'); this._ev(evs, { t: 'reloadStart' });
  }
  _fire(evs, aimed, quick) {
    if (this.mag <= 0) {
      this._ev(evs, { t: 'dry' });
      if (this.ammo > 0) this._startReload(evs);
      return;
    }
    this.mag--; this.fireCd = this.C.handgun.interval; this.lastFire = this.frame;
    this._ev(evs, { t: 'shot', aimed, quick: !!quick, dmg: this.C.handgun.dmg });
  }
  _startIssen(evs, kind, target) {
    if (this.white) { /* 白い姿：妖爪のまま（刀は一閃の間だけ見せる） */ } else if (this.owned.includes('katana')) this.weapon = 'katana'; else if (this.weapon === 'handgun') this.weapon = this.lastMelee;
    this.pending = null;
    this._go('issen', { kind, target });
    this._ev(evs, { t: 'issen', kind, target });
  }

  /** 敵の攻撃判定が出た瞬間に呼ぶ。結果の文字列を返し、出来事は次の tick の戻り値ではなく this.out に積む */
  incoming(atk) {
    const evs = this.out || (this.out = []);
    const s = this.st;
    if (this.dead) return 'dead';
    if (s.name === 'issen') return 'invuln';
    if (s.name === 'dodge') {
      const r = judgeDodge(s.f, this.w);
      if (r === 'just' && !s.justDone && (atk.inRange || atk.nearMiss)) {
        s.justDone = true;
        this.mikiri = { src: atk.src, at: this.frame };
        this._ev(evs, { t: 'just', src: atk.src });
        this._ev(evs, { t: 'slow', scale: this.C.justSlow.scale, frames: this.w.slowFrames });
        return 'just';
      }
      if (r !== 'hit') return 'evade';
    }
    if (s.name === 'dodge' && s.white) { const D = this.C.white.dash; if (s.f >= D.iStart && s.f <= D.iEnd) return 'evade'; }
    if (!atk.inRange) return 'miss';
    if (this.iaiStance) { this._startIssen(evs, 'iai', atk.src); return 'iai'; }
    if (this.frame < this.invulnUntil) return 'invuln';
    if (s.name === 'parry' && !s.ok) {
      const r = judgeParry(this.frame - s.at, this.w);
      if (r === 'parry' && atk.parryable) { this._parrySuccess(evs, atk.src); return 'parry'; }
      if (atk.parryable) { this._damage(evs, atk, this.C.parry.guardMul, true); return 'guard'; }
      this._damage(evs, atk, 1); return 'hit';
    }
    if (atk.parryable && this.canParry && this.w.parryAfter > 0 && ['free', 'attack', 'charge'].includes(s.name)) {
      this.pending = { atk, at: this.frame };
      return 'pending';
    }
    this._damage(evs, atk, 1); return 'hit';
  }
  /** incoming() で積んだ出来事を取り出す */
  drain() { const e = this.out || []; this.out = []; return e; }

  _damage(evs, atk, mul, guard) {
    const dmg = Math.max(1, Math.round(atk.dmg * mul * this.w.dmgMul));
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnUntil = this.frame + this.C.hurt.invuln; this.combo.n = 0;
    this._ev(evs, { t: guard ? 'guard' : 'hurt', dmg, src: atk.src, grab: !!atk.grab });
    if (this.hp <= 0) { this._go('dead'); this._ev(evs, { t: 'dead' }); }
    else if (!guard) this._go('hurt');
  }
}
