// 刀の鞘（見た目だけ）。DOM・three.js なし（node でテストする）。2026-11-09 利用者の依頼「剣を鞘に入れずに持っているのは不自然」。
//  ・普段（移動・待機・会話）は刀を左腰の鞘に納める。手には何も持たない
//  ・攻撃（溜め・弾く・一閃を含む）の入力で抜く。抜く動きは最初の一振りの「出だし」（startup）の間に手が腰の柄から振りへ移るだけ。
//    戦闘の状態機械（combat/fighter.js）には触らない：攻撃のこま数・当たり・無敵・ジャストの受付は同じ
//  ・戦闘の動き（攻撃・溜め・回避・弾く・被弾・一閃）が SHEATH.idleS 秒なければ納める（短い納める動き SHEATH.sheatheF こま）。
//    ロックオン中・敵が近い間（alert）は抜いたまま
//  ・刀以外（鉄パイプ・拳銃・火縄銃・白い姿の妖爪）を手にしている間は、刀は鞘の中（今までどおり）
// 1 回の tick ＝ 60Hz の 1 こま。Fighter.tick の後に呼ぶ（game/combat.js stepPlayer）。
export const SHEATH = { idleS: 3.5, sheatheF: 24, returnF: 14, drawMinF: 4, chargeDrawF: 8 };

const FIGHT = ['attack', 'charge', 'issen', 'parry', 'dodge', 'hurt', 'cast'];
const DRAW = ['attack', 'charge', 'parry', 'issen'];
const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export class Sheath {
  constructor() { this.reset(); }
  reset() {
    this.drawn = false;     // 刀を手に持っている（納める動きの間も true）
    this.idle = 0;          // 戦闘の動きが無い秒
    this.sheathT = -1;      // 納める動きのこま（-1：していない）
    this.returnT = -1;      // 納めた後、手が柄から離れて戻るこま
    this.drawSt = null;     // 抜く動きを組み込んだ攻撃・溜めの状態（Fighter.st の物そのもの）
    this.prevName = null;
  }
  /** 刀を手にしているはずの武器か（紫の姿で刀） */
  static katanaIn(F) { return F.weapon === 'katana' && !F.white; }
  /** すぐに納める（会話・演出の始まり）。動きなし */
  sheatheNow() { this.drawn = false; this.sheathT = -1; this.returnT = -1; this.drawSt = null; this.idle = 0; }
  /** F：Fighter。o.alert：ロックオン中・敵が近い（抜いたままにする） */
  tick(F, o = {}) {
    const n = F.st.name, prev = this.prevName; this.prevName = n;
    if (!Sheath.katanaIn(F)) { this.sheatheNow(); return; }
    if (!this.drawn) {
      if (this.returnT >= 0 && ++this.returnT >= SHEATH.returnF) this.returnT = -1;
      // 拳銃などから刀へ持ち替えた（持ち替えの見た目で手に来る）→ 抜いたまま
      if (DRAW.includes(n) || prev === 'swap') {
        this.drawn = true; this.idle = 0; this.returnT = -1;
        this.drawSt = n === 'attack' || n === 'charge' ? F.st : null;
      }
      return;
    }
    if (this.drawSt && F.st !== this.drawSt) this.drawSt = null;
    const fight = FIGHT.includes(n);
    if (fight || o.alert) { this.idle = 0; if (fight) this.sheathT = -1; }
    else if (this.sheathT < 0) { this.idle += 1 / 60; if (this.idle >= SHEATH.idleS) this.sheathT = 0; }
    if (this.sheathT >= 0 && ++this.sheathT >= SHEATH.sheatheF) { this.drawn = false; this.sheathT = -1; this.returnT = 0; this.idle = 0; }
  }
  /** 刀を手に見せるか（そうでなければ鞘の中＝柄が腰に見える） */
  inHand(F) { return Sheath.katanaIn(F) && this.drawn; }
  /** 納めている（刀を持つ姿勢・握る指・腕の手続きの構えを使わない） */
  sheathed(F) { return Sheath.katanaIn(F) && !this.drawn; }
  /**
   * 右手を腰の柄へ寄せる重み（0..1）と、その時の刀の在り処。見た目の IK（actor/actors.js）が使う。
   *  draw：抜く（最初の一振りの出だし：1 → 0）。sheathe：納める（0 → 1）。return：納めた後に手が戻る（1 → 0）
   */
  hand(F) {
    if (this.sheathT >= 0) return { w: ease(this.sheathT / (SHEATH.sheatheF * 0.75)), mode: 'sheathe' };
    if (this.returnT >= 0) return { w: 1 - ease(this.returnT / SHEATH.returnF), mode: 'return' };
    if (this.drawSt && F.st === this.drawSt) {
      const D = F.st.name === 'charge' ? SHEATH.chargeDrawF : Math.max(SHEATH.drawMinF, (F.st.atk && F.st.atk.startup) || 0);
      return { w: 1 - ease(F.st.f / D), mode: 'draw' };
    }
    return { w: 0, mode: null };
  }
}
