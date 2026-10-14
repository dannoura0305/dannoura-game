// 『境界侵食』セーブ（SAVE_DATA_SPEC）・共通進行 wakaba_progress_v1・読み取り専用アダプタ・ルートの骨組み・金庫・当たり判定
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SaveStore, migrate, makeSlot, SAVE_KEY } from '../shinshoku/save/save.js';
import { createWP, WP_KEY } from '../shinshoku/link/progress.js';
import { newRouteState, choose, canUseWhite, logKey } from '../shinshoku/story/route.js';
import { SAFE, codeFromClue } from '../shinshoku/data/safe.js';
import { box, resolveCircle, rayBoxes, lineOfSight, insideAny } from '../shinshoku/world/collide.js';

let n = 0; const t = (name, fn) => { fn(); n++; };
function LS(init = {}) { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), keys: () => [...m.keys()], _m: m }; }

t('移行：空・正常・壊れた・新しい版', () => {
  assert.equal(migrate(null).status, 'empty');
  const fx = readFileSync(new URL('./fixtures/shinshoku_save_v1.json', import.meta.url), 'utf8');
  const r = migrate(fx); assert.equal(r.status, 'ok'); assert.equal(r.save.slots.auto.player.hp, 82);
  assert.equal(r.save.slots.auto.futureField, 'keep', '知らない項目は残す');
  assert.equal(migrate('{oops').status, 'broken');
  assert.equal(migrate(JSON.stringify({ ver: 99, slots: {} })).status, 'newer');
});
t('壊れた JSON は退避してから新しく始める', () => {
  const ls = LS({ [SAVE_KEY]: '{broken' });
  const S = new SaveStore(ls); const r = S.read();
  assert.equal(r.status, 'broken');
  assert.ok(ls.keys().some(k => k.startsWith(SAVE_KEY + '.broken.')));
  assert.equal(ls.getItem(SAVE_KEY), '{broken', '元の文字列は黙って消さない');
});
t('書く→読む（位置・体力・弾・敵の決着）。branch 枠は上書き不可', () => {
  const ls = LS(); const S = new SaveStore(ls);
  const slot = makeSlot({ pos: [1.5, 0, -20], yaw: 1, player: { hp: 64, ammo: { handgun: 7 } }, world: { enemies: { shotengai: { kiro_1: 'rescued', kiro_2: 'dead' } } } });
  assert.ok(S.write('auto', slot));
  const b = S.load('auto');
  assert.deepEqual(b.place.pos, [1.5, 0, -20]); assert.equal(b.player.hp, 64); assert.equal(b.player.ammo.handgun, 7);
  assert.equal(b.world.enemies.shotengai.kiro_1, 'rescued');
  assert.ok(S.write('branch', slot)); assert.equal(S.write('branch', slot), false);
  assert.deepEqual(ls.keys().sort(), [SAVE_KEY]);
});
t('新しい版のセーブには書かない', () => {
  const ls = LS({ [SAVE_KEY]: JSON.stringify({ ver: 5, slots: {} }) });
  assert.equal(new SaveStore(ls).write('slot1', makeSlot({})), false);
});
const OTHERS = {
  dannoura_endings: JSON.stringify({ father: { count: 1 }, normal: { count: 2 }, bogus: {} }),
  dannoura_save_slot1: JSON.stringify({ story: { flags: { white_seen: true } } }),
  kyokai_endings: JSON.stringify(['A', 'TRUE']), kyokai_true_end: '1',
  kyokai_save_v1: JSON.stringify({ flags: { b30_read: true, secret_x: true } }),
  tobi_save_v1: JSON.stringify({ toyama: true, collection: { charm: 1, dragons_card: 2, rock: 3 } }),
};
t('wakaba_progress_v1：自分の欄だけ書く。他作品の欄は読み取り専用', () => {
  const ls = LS(OTHERS); const before = JSON.stringify([...ls._m].filter(([k]) => k !== WP_KEY));
  const WP = createWP(ls);
  assert.ok(WP.write('shinshoku', { achievements: { first_issen: 'x' } }));
  assert.throws(() => WP.write('main', { endings: [] }));
  assert.throws(() => WP.write('kyokai', {}));
  WP.bump('kiro', 'rescued'); WP.bump('kiro', 'rescued'); WP.bump('kiro', 'killed');
  const r = WP.read();
  assert.deepEqual(r.games.main.endings, ['father', 'normal']); assert.equal(r.games.main.whiteSeen, true); assert.ok(r.games.main.readonly);
  assert.deepEqual(r.games.kyokai.endings, ['A', 'TRUE']); assert.equal(r.games.kyokai.trueEnd, true); assert.deepEqual(r.games.kyokai.flags, { b30_read: true });
  assert.deepEqual(r.games.tobi.crossover, ['dragons_card', 'charm']); assert.equal(r.games.tobi.toyama, true);
  assert.equal(r.games.shinshoku.bestiary.kiro.rescued, 2); assert.equal(r.games.shinshoku.bestiary.kiro.killed, 1);
  const stored = JSON.parse(ls.getItem(WP_KEY));
  assert.deepEqual(Object.keys(stored.games), ['shinshoku'], '他作品の欄は保存しない');
  assert.equal(JSON.stringify([...ls._m].filter(([k]) => k !== WP_KEY)), before, '他作品のキーは変わらない');
});
t('アダプタ：キーが無い・壊れていても例外なし', () => {
  const WP = createWP(LS({ dannoura_endings: '{x', kyokai_endings: '"str"', tobi_save_v1: 'null', kyokai_save_v1: '[]' }));
  const r = WP.read();
  assert.deepEqual(r.games.main.endings, []); assert.deepEqual(r.games.kyokai.endings, []); assert.equal(r.games.tobi.offline, false);
  const thrower = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.doesNotThrow(() => createWP(thrower).read());
});
t('本編の結末 ID が game.js の ENDING_LIST と一致', () => {
  const src = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  const ids = [...src.slice(src.indexOf('const ENDING_LIST'), src.indexOf('];', src.indexOf('const ENDING_LIST'))).matchAll(/type:'(\w+)'/g)].map(m => m[1]);
  const all = {}; ids.forEach(i => { all[i] = 1; });
  assert.deepEqual(createWP(LS({ dannoura_endings: JSON.stringify(all) })).read().games.main.endings, ids);
});
t('ルート：同じ入力 → 同じ記録・一度決まると変わらない・secret は白い姿なし', () => {
  const a = choose(newRouteState(), 'secret', { at: 1, tries: 3, assisted: true });
  const b = choose(newRouteState(), 'secret', { at: 2, tries: 3, assisted: true });
  assert.equal(logKey(a), logKey(b));
  assert.equal(a.route, 'secret'); assert.equal(canUseWhite(a, 6), false);
  const c = choose(a, 'reveal', {}); assert.equal(c.route, 'secret'); assert.ok(c.branchLog[1].ignored);
  const r = choose(newRouteState(), 'reveal', {}); assert.equal(canUseWhite(r, 5), true); assert.equal(canUseWhite(r, 4), false);
  assert.equal(canUseWhite(newRouteState(), 9), false, '切片（route=null）では白い姿なし');
});
t('金庫：番号は仮（provisional）・手掛かりから同じ番号', () => {
  assert.equal(SAFE.provisional, true);
  for (const c of SAFE.clues) assert.equal(codeFromClue(c), SAFE.code);
  assert.equal(codeFromClue(SAFE.clues[0], '7391'), '7391');
});
t('当たり判定：円の押し出し・光線・視線', () => {
  const boxes = [box(0, 0, 2, 2, 3)];
  const p = { x: 1.2, z: 0 }; assert.ok(resolveCircle(p, 0.4, boxes)); assert.ok(Math.abs(p.x - 1.4) < 1e-6);
  const q = { x: 0.1, z: 0.05 }; resolveCircle(q, 0.3, boxes); assert.ok(!insideAny(q, boxes));
  assert.ok(Math.abs(rayBoxes({ x: -5, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 20, boxes) - 4) < 1e-6);
  assert.equal(rayBoxes({ x: -5, y: 5, z: 0 }, { x: 1, y: 0, z: 0 }, 20, boxes), 20);
  assert.equal(lineOfSight({ x: -3, z: 0 }, { x: 3, z: 0 }, boxes), false);
  assert.equal(lineOfSight({ x: -3, z: 2 }, { x: 3, z: 2 }, boxes), true);
  const low = [box(5, 5, 2, 2, 0.2)]; const r = { x: 5, z: 5 }; assert.equal(resolveCircle(r, 0.3, low), false, '足元の低い物は通れる');
});
console.log(`shinshoku-save: ${n} ok`);
