// 買い出しダッシュ　高難易度版：隠しボス「風邪菌」（minigames/runner/cold.js）
// ・予兆の後に攻撃（くしゃみ弾・分裂・体当たり）が出る・部屋の外に出ない・小さな菌は 4 匹まで・跳ねて寄ってくる
// ・攻撃で減って倒れる（弾が消え、小さな菌も倒れる）・体力が半分を切ると予兆が短くなる
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, Set };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/cold.js'), 'utf8'), ctx, { filename: 'cold.js' });
const RC = ctx.RunnerCold;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const room = { x0: 40, x1: 900, floor: 80 };

t('予兆の後に、くしゃみ弾・分裂・体当たりが出る・部屋の外に出ない・小さな菌は 4 匹まで', () => {
  const Z = RC.make(room), e = Z.spawn(600), p = { x: 200, y: 80 }; const seen = new Set(); let maxMini = 0, shotSeen = false, teleFirst = true;
  for (let i = 0; i < 3000; i++) {
    const nb = Z.shots.length; Z.step(e, p); Z.stepOthers(p); seen.add(e.state);
    if (Z.shots.length > nb) { shotSeen = true; if (!seen.has('sneeze_tele')) teleFirst = false; }
    maxMini = Math.max(maxMini, Z.minis.length);
    assert.ok(e.x >= room.x0 && e.x <= room.x1);
    for (const m of Z.minis) assert.ok(m.y >= room.floor - 0.01 && m.x >= room.x0 && m.x <= room.x1);
  }
  for (const s of ['sneeze_tele', 'split_tele', 'rush_tele', 'rush']) assert.ok(seen.has(s), s);
  assert.ok(shotSeen && teleFirst); assert.ok(maxMini >= 1 && maxMini <= RC.COLD.split.max, String(maxMini));
});

t('小さな菌：床を跳ねて自機の方へ寄る・攻撃で倒れて消える', () => {
  const Z = RC.make(room), e = Z.spawn(600), p = { x: 200, y: 80 };
  for (let i = 0; i < 400 && Z.minis.length === 0; i++) { Z.step(e, p); Z.stepOthers(p); }
  const m = Z.minis[0], x0 = m.x; for (let i = 0; i < 200; i++) Z.stepOthers(p);
  assert.ok(m.x < x0, '寄ってくる'); assert.ok(Z.hurtMini(m)); assert.ok(m.dead);
  for (let i = 0; i < 30; i++) Z.stepOthers(p); assert.ok(!Z.minis.includes(m));
});

t('攻撃で減り、0 で倒れる（弾が消え・小さな菌も倒れる）・体力が半分を切ると予兆が短くなる', () => {
  const tele = hp => { const Z = RC.make(room), e = Z.spawn(600); e.hp = hp; if (hp <= e.hpMax / 2) e.form = 2;   // 変身は済ませておく
 let f = 0, on = false; for (let i = 0; i < 600; i++) { Z.step(e, { x: 200, y: 80 }); if (Z.telegraph(e)) { on = true; f++; } else if (on) break; } return f; };
  assert.ok(tele(10) < tele(30));
  const Z = RC.make(room), e = Z.spawn(600), p = { x: 200, y: 80 };
  for (let i = 0; i < 600; i++) { Z.step(e, p); Z.stepOthers(p); }
  while (!e.dead) Z.hurt(e, 1);
  assert.equal(Z.shots.length, 0); assert.ok(Z.minis.every(m => m.dead));
});

const SPR = JSON.parse(readFileSync(join(ROOT, 'assets/runner/kazekin.json'), 'utf8')).frames;
t('霧（エアロ）：予兆の後に漂う霧が出て、しばらくで消える・ダメージで分裂する（6 ごとに 1 匹）', () => {
  const Z = RC.make(room), e = Z.spawn(600), p = { x: 200, y: 80 }; let mist = false, gone = false;
  for (let i = 0; i < 3000; i++) { Z.step(e, p); Z.stepOthers(p); if (Z.mists.length) { mist = true; assert.ok(Z.mistBox(Z.mists[0]).x1 > Z.mistBox(Z.mists[0]).x0 || Z.mists[0].f === 0); } else if (mist) gone = true; }
  assert.ok(mist && gone);
  const Z2 = RC.make(room), e2 = Z2.spawn(600); const n0 = Z2.minis.length; for (let i = 0; i < RC.COLD.form2.splitEvery; i++) Z2.hurt(e2, 1); assert.equal(Z2.minis.length, n0 + 1, '受けると分裂');
});
t('第 2 形態：体力が半分を切ると変身して大きくなる・広範囲の感染攻撃（全方向の菌弾）を使う・ドット絵のコマがある', () => {
  const Z = RC.make(room), e = Z.spawn(600), p = { x: 200, y: 80 }; const r0 = Z.radius(e); e.hp = 14; let ev = false, burst = 0; const keys = new Set();
  for (let i = 0; i < 4000; i++) { const nb = Z.shots.length; Z.step(e, p); Z.stepOthers(p); ev = ev || e.ev.includes('form2'); keys.add(Z.frame(e)); if (e.state === 'recover' && e.last === 'burst' && e.f === 0) burst = Math.max(burst, Z.shots.length - nb); for (const m of Z.minis) keys.add(Z.miniFrame(m)); for (const s of Z.shots) keys.add(Z.shotFrame(s)); }
  assert.ok(ev && e.form === 2 && Z.radius(e) > r0, '変身して大きくなる'); assert.ok(burst >= RC.COLD.form2.burstN * 2, `全方向 ${burst}`);
  for (const k of keys) assert.ok(SPR[k], 'コマが無い ' + k);
});

console.log(`runner-hard-cold: ${n} ok`);
