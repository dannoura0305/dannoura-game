// 008：Ver.0.8「季節のたのしみ」— 季節の行事の印（花・灯り・供えた種・すわった所）。
//  ・fest_marks：1 回の行事（occ ＝ 世界の季節の通し番号）に 1 アカウント 1 つ（UNIQUE で二重にならない）。
//    field_id：どの土地か・kind：plant / gaze / offer / lantern・fest：hana / hoshi / tsuki / akari・x, y：置いた所・v：見た目の違い・name：置いた子の名前（その時の）。
//    印はその季節のあいだだけ見える（サーバーは起動のときに 2 回より前の行を消す）。数を比べる・順位をつける ための列は無い（GAME_DESIGN.md §8）。
//  ・はじめて参加したときの図鑑の品（押し花・星の砂つぶ・月見の種・小さな灯り）は前からの account_collectibles（目録は起動のたびに同期）。
export const name = 'festival';

export function up(db) {
  db.exec(`
    CREATE TABLE fest_marks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id    TEXT NOT NULL DEFAULT 'plains',
      occ         INTEGER NOT NULL,
      fest        TEXT NOT NULL,
      kind        TEXT NOT NULL,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name        TEXT NOT NULL DEFAULT '',
      x           REAL NOT NULL,
      y           REAL NOT NULL,
      v           INTEGER NOT NULL DEFAULT 0,
      at          INTEGER NOT NULL,
      UNIQUE (account_id, occ)
    );
    CREATE INDEX fest_marks_field ON fest_marks(field_id, occ);
  `);
}
