// 006：Ver.0.5「広がり」— 土地（地図）ごとの部屋・収集品と図鑑・実績・共同巣・富山。
//  ・lands.field_id / world_resources.field_id：どの土地（地図）か（'plains' はじまりの原・'rocks' いわばの高台・'dunes' すなの海・
//    'canyon' みずおとの谷・'toyama' 富山）。前からの行はすべて 'plains'。（region_id は前からどおり地図の中の地域名：oasis / steppe …）
//  ・characters.region：最後にいた土地（再接続・ログインで同じ土地へ）。
//  ・regions：4 つの土地の行を足し、富山（hidden=1）に説明を入れる。
//  ・collectibles：収集品の目録（shared/collect.js の CURIOS）。account_collectibles(account_id, collectible_id) の主キーで 1 種類 1 回。
//  ・achievements：実績（account_id, key）の主キーで 1 回だけ。
//  ・共同巣：nest_access の role に 'resident'（住人）・'invite'（誘い中）を使う（表の形は変えない）。
//  ・account_flags：'toyama'（たどり着いた）・'seasons' / 'regions' / 'visited'（実績の進み具合）。
import { CURIOS } from '../../shared/collect.js';
import { REGION } from '../../shared/world.js';

export const name = 'regions_collect';

export function up(db) {
  db.exec(`
    ALTER TABLE lands ADD COLUMN field_id TEXT NOT NULL DEFAULT 'plains';
    ALTER TABLE world_resources ADD COLUMN field_id TEXT NOT NULL DEFAULT 'plains';
    ALTER TABLE characters ADD COLUMN region TEXT NOT NULL DEFAULT 'plains';
    CREATE INDEX world_resources_field ON world_resources(field_id, respawn_at);
    CREATE INDEX lands_field_plot ON lands(field_id, plot);
    CREATE TABLE achievements (
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      key         TEXT NOT NULL,
      got_at      INTEGER NOT NULL,
      data        TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (account_id, key)
    );
    CREATE INDEX nest_access_account ON nest_access(account_id, role);
  `);
  const reg = db.prepare('INSERT OR IGNORE INTO regions (id, name, kind, hidden, data) VALUES (?, ?, ?, ?, ?)');
  for (const id of ['plains', 'rocks', 'dunes', 'canyon']) reg.run(id, REGION[id].name, 'field', 0, JSON.stringify({ field: true, desc: REGION[id].desc }));
  db.prepare("UPDATE regions SET data = ? WHERE id = 'toyama'").run(JSON.stringify({ field: true, desc: REGION.toyama.desc, note: 'たどり着く理由は決めていない（ほのめかすだけ）' }));
  syncCollectibles(db);
}

/** 目録を表へ（起動のたびにも呼ぶ：あとから足した収集品も入る） */
export function syncCollectibles(db) {
  const ins = db.prepare('INSERT INTO collectibles (id, kind, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, data = excluded.data');
  for (const c of Object.values(CURIOS)) ins.run(c.id, c.kind, JSON.stringify({ name: c.name, region: c.region }));
}
