// チェックポイント（フェーズ 4）：近づくと記録され、敵に捕まった時はここへ戻る。DOM なし（node で試験）。
// 定義：layout.gameplay.checkpoints（[{ id, at:[x,y,z], r, ja }]）。最初の 1 つ＝スタート（いつも記録済み）。
export class Checkpoints {
  constructor(list = []) { this.list = list; this.reset(); }
  reset() { this.reached = new Set(this.list.length ? [this.list[0].id] : []); this.last = this.list[0] || null; }
  /** (x,y,z) が近ければ記録 → 新しく記録したチェックポイントか null */
  check(x, y, z) {
    for (const c of this.list) {
      if (Math.hypot(x - c.at[0], z - c.at[2]) < (c.r || 3) && Math.abs(y - c.at[1]) < 2) {
        if (this.last !== c) { const fresh = !this.reached.has(c.id); this.reached.add(c.id); this.last = c; if (fresh) return c; }
        return null;
      }
    }
    return null;
  }
  /** 戻る所 [x,y,z] */
  respawnAt() { return this.last ? this.last.at.slice() : null; }
}
