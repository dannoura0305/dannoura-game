// 塗替（ぬりかえ・第6章A のボス・仮名）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の nurikae。
// 戦い方の骨組みは境界の先触れ（ai/sakibure.js）と同じ（薙ぎ・光線・雨・線の攻め、段階、咆哮で止まる、崩れると核が開く）。
// 違い：「塗り替え」（feed）の先は人の残る棟（sense.shelter＝ゲームが選ぶ今の棟）。少しずつ寄ってくる距離が近い（町の通りを歩く）。
import { Sakibure } from './sakibure.js';
import { ENEMIES } from '../data/enemies.js';

export class Nurikae extends Sakibure {
  constructor(opt = {}) {
    super(Object.assign({ def: ENEMIES.nurikae, kind: 'nurikae', keep: 26, leash: 22 }, opt));
  }
}
