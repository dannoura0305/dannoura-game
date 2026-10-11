// 001：最初の形（アカウント・個体・持ち物・土地・巣・採集物）。ARCHITECTURE.md §5
// 「アカウント」と「操作個体（individuals）」を分け、巣は土地（lands）を参照するだけ（引っ越し＝land_id の付け替え）。
export const name = 'init';

export function up(db) {
  db.exec(`
    CREATE TABLE accounts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pass_hash   TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      last_login  INTEGER
    );
    -- セッション：token そのものは保存せず SHA-256 だけ（DB が漏れても乗っ取れない）
    CREATE TABLE sessions (
      token_hash  TEXT PRIMARY KEY,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL
    );
    CREATE INDEX sessions_account ON sessions(account_id);

    -- 個体（家系・遺伝・体調の器。Ver.0.1 は genes.fur だけ使う）
    CREATE TABLE individuals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      species     TEXT NOT NULL DEFAULT 'jerboa',
      name        TEXT NOT NULL,
      sex         TEXT,
      born_at     INTEGER NOT NULL,
      generation  INTEGER NOT NULL DEFAULT 1,
      father_id   INTEGER REFERENCES individuals(id),
      mother_id   INTEGER REFERENCES individuals(id),
      genes       TEXT NOT NULL DEFAULT '{}',
      traits      TEXT NOT NULL DEFAULT '{}',
      status      TEXT NOT NULL DEFAULT '{}'
    );
    -- いま操作している個体（active=1 が 1 アカウント 1 つ。世代交代＝切り替え）
    CREATE TABLE characters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      individual_id INTEGER NOT NULL REFERENCES individuals(id),
      name          TEXT NOT NULL,
      fur           TEXT NOT NULL,
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL,
      pos_x         REAL,
      pos_y         REAL,
      dir           TEXT NOT NULL DEFAULT 'down',
      place         TEXT NOT NULL DEFAULT 'field',
      exit_kind     TEXT NOT NULL DEFAULT 'new',      -- new / live / logout / disconnect / shutdown
      saved_at      INTEGER
    );
    CREATE INDEX characters_account ON characters(account_id, active);
    CREATE INDEX characters_name ON characters(name);

    -- 持ち物：owner_kind = 'char'（個体の手持ち 8 枠）/ 'nest'（巣の倉庫 24 枠）。枠の並びも保存
    CREATE TABLE inventories (
      owner_kind  TEXT NOT NULL,
      owner_id    INTEGER NOT NULL,
      slot        INTEGER NOT NULL,
      item_id     TEXT NOT NULL,
      qty         INTEGER NOT NULL CHECK (qty > 0),
      PRIMARY KEY (owner_kind, owner_id, slot)
    );

    -- 土地（巣穴の入口の場所。info は食料・危険・地質…の器）
    CREATE TABLE lands (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      region_id   TEXT,
      x           REAL NOT NULL,
      y           REAL NOT NULL,
      info        TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE nests (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      land_id          INTEGER REFERENCES lands(id),
      schema_version   INTEGER NOT NULL,
      rev              INTEGER NOT NULL DEFAULT 1,
      data             TEXT NOT NULL,
      visit_policy     TEXT NOT NULL DEFAULT 'private',
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX nests_owner ON nests(owner_account_id);
    -- 訪問の許可（role = visitor。Ver.0.2 から builder）
    CREATE TABLE nest_access (
      nest_id     INTEGER NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      role        TEXT NOT NULL DEFAULT 'visitor',
      name        TEXT,
      PRIMARY KEY (nest_id, account_id)
    );

    -- 採集物（サーバー管理）。respawn_at が NULL＝地上にある。taken_kind は再出現待ちの行
    CREATE TABLE world_resources (
      id          TEXT PRIMARY KEY,
      region_id   TEXT,
      kind        TEXT NOT NULL,
      x           REAL,
      y           REAL,
      respawn_at  INTEGER
    );
    CREATE INDEX world_resources_respawn ON world_resources(respawn_at);

    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  `);
}
