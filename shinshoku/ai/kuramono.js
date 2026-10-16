// 境界を喰らうもの（終章A のボス・巨大な最終形態・仮名）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の kuramono。
// 研究者が境界応答を集めすぎて膨れた姿。戦い方の骨組みは境界の先触れ（ai/sakibure.js）と同じ（薙ぎ・光線・雨・線の攻め、段階、咆哮で止まる、崩れると核が開く）。
// 違い：「喰らう」（feed）の先は避難の灯（sense.shelter＝ゲームが選ぶ今の灯）。淵の上からほとんど動かない。
// 体力 0 は「倒す」ではない：淵の目が砕け、中の研究者を巨大猫又が引き上げる（resolution='rescue'＝守る。壊さない）。
import { Sakibure } from './sakibure.js';
import { ENEMIES } from '../data/enemies.js';

export class Kuramono extends Sakibure {
  constructor(opt = {}) {
    super(Object.assign({ def: ENEMIES.kuramono, kind: 'kuramono', keep: 34, leash: 10 }, opt));
    if (opt.assist) this.hp = this.hpMax = Math.round(this.def.hp * 0.75);
  }
  hurt(dmg, kind, evs = [], opt = {}) {
    const r = super.hurt(dmg, kind, evs, opt);
    if (this.state === 'dead') this.resolution = 'rescue';            // 淵の目が砕ける＝中の人を引き上げる（倒さない）
    return r;
  }
}
