// 007：Ver.0.6「くらしの深まり＋公開準備」
//  ・rank_weeks：豊かな巣の週ごとの区切り（shared/ranking.js）。週（'2026-W42'・日本時間の ISO 週）× 巣 で 1 行。
//    base＝その週に初めて見たときの豊かさ、score・rooms・decor・curios＝最後に数えたとき、final=1 で しめた週（place 順位・title 呼び名）。
//  ・individuals.species：前からある列（'jerboa'）。近縁種（'longear' ミミナガトビネズミ）の「なかま」（role 'friend'）を入れるので、
//    空・知らない値を 'jerboa' にそろえ、巣ごとの家族を引く索引に species を足す。
//  ・個体の status.pettedAt（なでた時刻・Ver.0.6）は JSON の中なので表の形は変えない。
export const name = 'life_deploy';

export function up(db) {
  db.exec(`
    CREATE TABLE rank_weeks (
      week        TEXT NOT NULL,
      nest_id     INTEGER NOT NULL,
      owner       INTEGER,
      name        TEXT NOT NULL DEFAULT '',
      region      TEXT NOT NULL DEFAULT 'plains',
      base        INTEGER NOT NULL DEFAULT 0,
      score       INTEGER NOT NULL DEFAULT 0,
      rooms       INTEGER NOT NULL DEFAULT 0,
      decor       INTEGER NOT NULL DEFAULT 0,
      curios      INTEGER NOT NULL DEFAULT 0,
      final       INTEGER NOT NULL DEFAULT 0,
      place       INTEGER,
      title       TEXT,
      updated_at  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (week, nest_id)
    );
    CREATE INDEX rank_weeks_final ON rank_weeks(week, final, place);
    UPDATE individuals SET species = 'jerboa' WHERE species IS NULL OR species NOT IN ('jerboa', 'longear');
    CREATE INDEX individuals_species ON individuals(species, role);
  `);
}
