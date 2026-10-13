// 003：Ver.0.2「暮らし」— フレンド・訪問の記録・共同作業者（builder）。
//  ・friends(a, b)：a が b に申請した。state = 'pending'（返事待ち）/ 'friend'。1 組 1 行（逆向きの行は作らない）。
//  ・nest_visits：だれかが巣に入った記録（所有者が留守なら seen=0 → 次のログインで一覧に出して seen=1）。
//  ・nest_access の主キーを (nest_id, account_id, role) にする（同じ人が visitor と builder の両方になれるように）。
//  ・individuals.status に life（空腹・水分・体調）が無ければ初期値を入れる（shared/life.js の LIFE.START）。
export const name = 'life_social';

export function up(db) {
  db.exec(`
    CREATE TABLE friends (
      a           INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      b           INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      state       TEXT NOT NULL DEFAULT 'pending',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      PRIMARY KEY (a, b)
    );
    CREATE INDEX friends_b ON friends(b);

    CREATE TABLE nest_visits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nest_id     INTEGER NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
      visitor_id  INTEGER NOT NULL,
      visitor_name TEXT NOT NULL,
      at          INTEGER NOT NULL,
      seen        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX nest_visits_nest ON nest_visits(nest_id, seen, at);

    CREATE TABLE nest_access_new (
      nest_id     INTEGER NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      role        TEXT NOT NULL DEFAULT 'visitor',
      name        TEXT,
      PRIMARY KEY (nest_id, account_id, role)
    );
    INSERT INTO nest_access_new (nest_id, account_id, role, name) SELECT nest_id, account_id, role, name FROM nest_access;
    DROP TABLE nest_access;
    ALTER TABLE nest_access_new RENAME TO nest_access;
  `);
  db.prepare(`UPDATE individuals SET status = json_set(CASE WHEN json_valid(status) THEN status ELSE '{}' END, '$.life', json(?))
              WHERE json_valid(status) = 0 OR json_extract(status, '$.life') IS NULL`)
    .run(JSON.stringify({ hunger: 80, thirst: 80, cond: 100, sleep: false }));
}
