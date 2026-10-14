// 007：Ver.0.6「くらしの深まり＋公開準備」
//  ・individuals.species：前からある列（'jerboa'）。近縁種（'longear' ミミナガトビネズミ）の「なかま」（role 'friend'）を入れるので、
//    空・知らない値を 'jerboa' にそろえ、種ごと・役割ごとに引く索引を足す。
//  ・個体の status.pettedAt（なでた時刻）は JSON の中なので表の形は変えない。
//  ・巣めぐり（Ver.0.6：順位をつけない巣の紹介）のために、巣の更新の時刻で引く索引を足す（nests.updated_at は 001 からある）。
//  （順位・点数・週ごとの記録は持たない：このゲームは競い合わない。GAME_DESIGN.md「競わない」）
export const name = 'life_deploy';

export function up(db) {
  db.exec(`
    UPDATE individuals SET species = 'jerboa' WHERE species IS NULL OR species NOT IN ('jerboa', 'longear');
    CREATE INDEX individuals_species ON individuals(species, role);
    CREATE INDEX nests_updated ON nests(updated_at);
  `);
}
