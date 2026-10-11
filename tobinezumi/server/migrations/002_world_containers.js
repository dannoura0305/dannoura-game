// 002：将来のための器（地域・収集品・物語イベント・アカウントのフラグ）。Ver.0.1 では中身を使わない。
// regions.hidden=1 は隠し地域（富山など）。MVP_SPEC §2
export const name = 'world_containers';

export function up(db) {
  db.exec(`
    CREATE TABLE regions (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      kind    TEXT NOT NULL,
      hidden  INTEGER NOT NULL DEFAULT 0,
      data    TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE collectibles (
      id    TEXT PRIMARY KEY,
      kind  TEXT NOT NULL,
      data  TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE account_collectibles (
      account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      collectible_id TEXT NOT NULL REFERENCES collectibles(id),
      got_at         INTEGER NOT NULL,
      data           TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (account_id, collectible_id)
    );
    CREATE TABLE events (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      key   TEXT NOT NULL UNIQUE,
      data  TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE account_flags (
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      key         TEXT NOT NULL,
      value       TEXT,
      PRIMARY KEY (account_id, key)
    );
  `);
  const ins = db.prepare('INSERT INTO regions (id, name, kind, hidden) VALUES (?, ?, ?, ?)');
  ins.run('oasis', 'オアシスのほとり', 'oasis', 0);
  ins.run('hill', 'いわかげの丘', 'rocks', 0);
  ins.run('steppe', 'かれくさの原', 'steppe', 0);
  ins.run('desert', 'ゆうやけ砂漠', 'desert', 0);
  ins.run('toyama', '富山', 'secret', 1);
}
