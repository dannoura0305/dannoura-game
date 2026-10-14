// 004：Ver.0.3「危険と土地」— 土地の区画・巣の入口のふさぎ・引っ越し・襲撃の記録・落とし物。
//  ・lands.plot：入口のある区画（shared/lands.js の 'L<列>-<行>'）。lands.info に区画の性能（食料・危険・地質・景観・気候・希少資源）。
//    既にある巣の土地にも、入口の場所から区画と性能を入れる。
//  ・nests.plugged（入口を小石でふさいでいる）・relocated_at（最後に引っ越した時刻）・raided_at（最後にキツネに掘られた時刻）。
//  ・nest_events：巣の出来事（キツネの襲撃 'raid'、ふさいだ入口で守れた 'blocked'）。seen=0 は留守中 → 次のログインで一覧に。
//  ・world_resources.qty（落とし物は 1 つの山に何個も）・expires_at（落とし物・水たまりが消える時刻）。
import { buildFieldMap } from '../../shared/regions.js';
import { landAt, landOut } from '../../shared/lands.js';

export const name = 'danger_land';

export function up(db) {
  db.exec(`
    ALTER TABLE lands ADD COLUMN plot TEXT;
    ALTER TABLE nests ADD COLUMN plugged INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE nests ADD COLUMN relocated_at INTEGER;
    ALTER TABLE nests ADD COLUMN raided_at INTEGER;
    CREATE TABLE nest_events (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nest_id  INTEGER NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
      kind     TEXT NOT NULL,
      data     TEXT NOT NULL DEFAULT '{}',
      at       INTEGER NOT NULL,
      seen     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX nest_events_nest ON nest_events(nest_id, seen, at);
    ALTER TABLE world_resources ADD COLUMN qty INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE world_resources ADD COLUMN expires_at INTEGER;
    CREATE INDEX lands_plot ON lands(plot);
  `);
  const map = buildFieldMap();
  const rows = db.prepare('SELECT id, x, y FROM lands').all();
  const upd = db.prepare('UPDATE lands SET plot = ?, info = ? WHERE id = ?');
  for (const r of rows) {
    if (r.x == null || r.y == null) continue;
    const L = landOut(landAt(map, r.x, r.y));
    upd.run(L.id, JSON.stringify(L), r.id);
  }
}
