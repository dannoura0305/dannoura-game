// 005：Ver.0.4「いのちをつなぐ」— 年齢・遺伝・家族・お産・世代交代。
//  ・individuals.account_id（どの家＝アカウントの個体か）・role（'player' 操作中 / 'pup' 自分の子 / 'kin' きょうだい・親せき / 'mate' つれあい /
//    'ancestor' ご先祖 / 'left' 巣立った / 'pending' id だけ取った）・nest_id（巣にいる家族）。
//    status に ageMs（遊んだ世界の時間）・fed（子のおなか）・named・retiredAt・wild（野生から来た）・kinOf（旅立ちのあとをついだ親せき）・
//    house（家ごとの {follow, lastBirthMs, litters, promptDay}：操作中の個体だけ）。
//  ・litters：お産の記録（born_at が NULL のあいだは「もうすぐ生まれる」）。due_play は母か父（操作中の子）の ageMs で、その年齢になったら生まれる。
//  ・今いる個体：その家の操作個体（role 'player'）にして、選んだ毛色を 2 つ持つ遺伝子・性・おとな（4 日）の年齢を入れる（Ver.0.3 までの子は 1 代目）。
import { founderGenes, expressTraits, normalizeGenes, seedOf } from '../../shared/genetics.js';
import { DAY_MS } from '../../shared/daynight.js';
import { STAGE } from '../../shared/family.js';

export const name = 'family';

export function up(db) {
  db.exec(`
    ALTER TABLE individuals ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE;
    ALTER TABLE individuals ADD COLUMN role TEXT NOT NULL DEFAULT 'player';
    ALTER TABLE individuals ADD COLUMN nest_id INTEGER;
    CREATE INDEX individuals_account ON individuals(account_id, role);
    CREATE INDEX individuals_nest ON individuals(nest_id, role);
    CREATE TABLE litters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      nest_id       INTEGER,
      mother_id     INTEGER REFERENCES individuals(id),
      father_id     INTEGER REFERENCES individuals(id),
      nth           INTEGER NOT NULL DEFAULT 1,
      seed          INTEGER,
      season        TEXT,
      conceived_at  INTEGER NOT NULL,
      due_play      REAL NOT NULL,
      born_at       INTEGER,
      size          INTEGER
    );
    CREATE INDEX litters_account ON litters(account_id, born_at);
  `);
  const rows = db.prepare('SELECT i.id, i.name, i.sex, i.genes, i.status, i.born_at, c.account_id, c.fur FROM individuals i JOIN characters c ON c.individual_id = i.id').all();
  const upd = db.prepare('UPDATE individuals SET account_id = ?, role = ?, sex = ?, genes = ?, traits = ?, status = ? WHERE id = ?');
  for (const r of rows) {
    let st = {};
    try { st = JSON.parse(r.status || '{}') || {}; } catch (e) { st = {}; }
    const g = normalizeGenes({ ...founderGenes(r.fur, seedOf(r.name, r.born_at)) }, r.fur);
    st.ageMs = st.ageMs ?? STAGE.YOUNG_END * DAY_MS;
    st.fed = 100; st.named = true;
    const sex = r.sex === 'm' || r.sex === 'f' ? r.sex : (r.id % 2 ? 'f' : 'm');
    upd.run(r.account_id, 'player', sex, JSON.stringify(g), JSON.stringify(expressTraits(g)), JSON.stringify(st), r.id);
  }
  // 古い（交代した）キャラクターの個体があればご先祖に
  db.exec(`UPDATE individuals SET role = 'ancestor' WHERE id IN (SELECT individual_id FROM characters WHERE active = 0)`);
}
