// 『境界侵食』P18（利用者の指摘）：
//  1. 相棒と再会する場面で相棒が壁から出てくる → 裏路地の自販機のくぼみの口が南の壁でふさがれていた（くぼみに隠れた相棒が壁の中から出てきた）。
//     演出場面の役者（相棒・子ども）の置き場所と歩く道のりが壁・建物・家具の当たりに入らない（角ごとの点 path で回りこむ）。
//     ついてくる相棒は自宅の階段・2 階の床の高さと 2 階の当たりを使い、詰まったら通った跡の通れる所へ寄せる。
//  2. だんのうらの家のレイアウト：部屋の役割がはっきりした間取り（風除室・玄関・ホール・LDK・和室・トイレ・洗面所・浴室・階段・2 階の寝室・娘の部屋・仕事部屋・納戸）。
//     家具が重ならない・浮かない（audit_env の規則）・戸は閉まっていて近づくと開く・通り道が歩ける・窓は家の中と外で同じ所。
//  3. 結末の病室のベッド：布団から体がめり込む → 厚みのある掛け布団・腰の高さをモデルに合わせる。
//  4. めり込みの全体調査で見つけた所：異形の置き場所（槽のガラス・壁の線の上）・閉店の店の店員の手が棚に入る。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const { recordAreas } = await import('../tools/shinshoku/audit/record.mjs');
const { auditArea, applyAllow } = await import('../tools/shinshoku/audit/rules.mjs');
const { CUTSCENES } = await import('../shinshoku/story/cutscenes.js');
const { LEVEL } = await import('../shinshoku/data/level.js');
const { HOME_O, homeW } = await import('../shinshoku/data/town.js');
const { LAB } = await import('../shinshoku/data/ch4.js');
const { ADMIN } = await import('../shinshoku/data/ch6.js');
const { AREA_DATA } = await import('../shinshoku/data/areas.js');
const { KIROKU, EPILOGUE } = await import('../shinshoku/data/ch7.js');
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const AREAS = [...new Set(Object.values(CUTSCENES).map(c => c.area).filter(Boolean))];
const R = await recordAreas(AREAS.filter(a => a !== 'shotengai').concat(['shotengai']));
const inBox = (b, x, z, r, y0 = 0.25, y1 = 1.2) => b.minY < y1 && b.maxY > y0 && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r;
const hitAt = (boxes, x, z, r = 0.26) => boxes.find(b => inBox(b, x, z, r));

await t('裏路地：自販機のくぼみ（x 4.9〜7.1）の口は空いている・相棒の隠れ場所（6.0, −19.7）は壁の中ではない', () => {
  const B = R.alley.A.boxes;
  for (const x of [5.4, 6.0, 6.6]) assert.ok(!hitAt(B, x, -20.45, 0.05), 'くぼみの口がふさがれている x=' + x);
  assert.ok(!hitAt(B, 6.0, -19.7, 0.2), '相棒の隠れ場所');
  assert.ok(R.alley.A.hideSpots.every(h => !hitAt(B, h.x, h.z, 0.15)), '隠れ場所が壁の中');
});

await t('演出場面：相棒・子ども・だんのうらの置き場所と歩く道のり（to／path）が壁・建物・家具の当たりに入らない', () => {
  // 許す物：ソファに座る（cs00_tv）・306 の戸は開いている（cs03_line：動く戸）・屋上（cs07a_support：rootY で屋上の上）
  const ALLOW = [['cs00_tv', 'player'], ['cs03_line', 'companion'], ['cs03_line', 'child'], ['cs07a_support', 'companion']];
  const bad = [];
  for (const cs of Object.values(CUTSCENES)) {
    const A = R[cs.area] && R[cs.area].A; if (!A) continue;
    const pos = {};
    for (const a0 of (cs.actors || []).slice().sort((p, q) => p.t - q.t)) {
      if (!['companion', 'player', 'child'].includes(a0.id) || ALLOW.some(([c, w]) => c === cs.id && w === a0.id)) continue;
      if (a0.pos) { pos[a0.id] = a0.pos; if (hitAt(A.boxes, a0.pos[0], a0.pos[1])) bad.push(`${cs.id} ${a0.id} 置き場所 ${a0.pos}`); }
      for (const to of a0.path || (a0.to ? [a0.to] : [])) {
        const p = pos[a0.id]; if (!p) { pos[a0.id] = to; continue; }
        const k = Math.ceil(Math.hypot(to[0] - p[0], to[1] - p[1]) / 0.1);
        for (let i = 1; i <= k; i++) { const x = p[0] + (to[0] - p[0]) * i / k, z = p[1] + (to[1] - p[1]) * i / k; if (hitAt(A.boxes, x, z)) { bad.push(`${cs.id} ${a0.id} ${p}→${to} @${x.toFixed(2)},${z.toFixed(2)}`); break; } }
        pos[a0.id] = to;
      }
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(CUTSCENES.cs00_lightsout.actors.some(a => a.id === 'companion' && a.path && a.hideAtEnd), '序章：柵を回って脇道へ');
  assert.match(src('shinshoku/game/story.js'), /const pts = a\.path \? a\.path\.slice\(\) : a\.to \? \[a\.to\] : null;/);
});

await t('ついてくる相棒：自宅の階段・2 階の床の高さ（floorAt）と 2 階の当たり（boxesUp）・詰まったら通った跡の通れる所へ寄せる', () => {
  const m = src('shinshoku/main.js');
  assert.match(m, /const A = this\.area, BX = this\.companionBoxes\(\);\n\s+C\.step\(dt, out, BX\);/);
  assert.match(m, /A\.floorAt\(b\.pos\.x, b\.pos\.z, C\.rootY \|\| 0\)/);
  assert.match(m, /companionUnstick\(\) \{/);
  assert.match(m, /if \(C\.stuckT > 2\.2 \|\| insideAny\(b\.pos, BX, 0\.05\)\) this\.companionUnstick\(\);/);
  const A = R.shotengai.A, HF = LEVEL.homeFloor, [sx, sz] = homeW((HF.stair[0] + HF.stair[2]) / 2, (HF.stair[1] + HF.stair[3]) / 2);
  const y = A.floorAt(sx, sz, 0); assert.ok(y > 1 && y < 2.3, '階段の中ほどの床 ' + y);
  assert.equal(A.floorAt(...homeW(0, 12), 3.3), HF.y2); assert.equal(A.floorAt(...homeW(0, 12), 0), 0);
});

// ── 自宅 ──
const A = R.shotengai.A, [OX, OZ] = HOME_O;
const L = (x, z) => [x + OX, z + OZ];
const homeBoxes = A.boxes.filter(b => b.maxX > OX - 6.5 && b.minX < OX + 6.5 && b.maxZ > OZ + 4 && b.minZ < OZ + 16.5);
const closedDoors = (A.dyn.homeDoors || []).flatMap(d => [d.box, d.boxUp]).filter(Boolean).concat([A.dyn.homeDoor.box]);

await t('自宅：戸（風除室・玄関・居間・和室のふすま・トイレ・洗面所・浴室・2 階の 4 部屋）は閉まっている → 近づくと開く（当たりが消える）→ 離れると閉じる', () => {
  const D = A.dyn.homeDoors; assert.ok(D.length >= 10, '戸の数 ' + D.length);
  for (const id of ['windbreak', 'ldk', 'washitsu', 'toilet', 'washroom', 'bath', 'bedroom', 'daughter', 'work', 'nando']) assert.ok(D.find(d => d.id === id), id);
  for (const d of D) { assert.equal(d.open, false, d.id); assert.ok(d.box.maxY > 1.9 + d.box.minY, d.id + ' の当たり'); assert.equal(d.k, 0); }
  assert.ok(D.filter(d => d.floor === 1).every(d => d.boxUp && d.boxUp.maxY > 1.9), '2 階の戸の当たり（2 階の当たりの写し）');
  const P = { x: 0, z: 0, y: 0 }, game = { player: { pos: P }, companion: null, sfx: null };
  for (const d of D) {
    P.x = d.x; P.z = d.z + 0.9 * (d.z > OZ + 10 ? -1 : 1); P.y = d.floor ? LEVEL.homeFloor.y2 : 0;
    P.x = d.x + 0.6; P.z = d.z + 0.6;
    for (let i = 0; i < 30; i++) A.stepTick(1 / 60, game);
    assert.equal(d.open, true, d.id + ' が開かない'); assert.ok(d.box.maxY < 0 && d.k > 0.9, d.id);
    P.x = d.x + 6; P.z = d.z + 6; for (let i = 0; i < 40; i++) A.stepTick(1 / 60, game);
    assert.equal(d.open, false, d.id + ' が閉じない'); assert.ok(d.box.maxY > 0, d.id);
  }
  // 1 階の人は 2 階の戸を開けない
  const up = D.find(d => d.floor === 1); P.x = up.x + 0.5; P.z = up.z + 0.5; P.y = 0; for (let i = 0; i < 20; i++) A.stepTick(1 / 60, game); assert.equal(up.open, false);
  P.x = 999; for (let i = 0; i < 40; i++) A.stepTick(1 / 60, game);
});

await t('自宅：家具の当たりが重ならない（1 階・2 階）・家具は床に置く／壁に付く（浮かない・脚・めり込み：audit_env の error 0）', () => {
  const furn = homeBoxes.filter(b => (b.minY === 0 || Math.abs(b.minY - LEVEL.homeFloor.y2) < 0.01) && b.maxY - b.minY <= 2.25 && Math.min(b.maxX - b.minX, b.maxZ - b.minZ) > 0.2 && !closedDoors.includes(b));
  const bad = [];
  for (let i = 0; i < furn.length; i++) for (let j = i + 1; j < furn.length; j++) {
    const a = furn[i], b = furn[j]; if (Math.abs(a.minY - b.minY) > 0.01) continue;
    const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
    if (ox > 0.03 && oz > 0.03) bad.push([a, b].map(q => [q.minX - OX, q.maxX - OX, q.minZ - OZ, q.maxZ - OZ, q.minY].map(v => +v.toFixed(2)).join(',')).join(' × '));
  }
  assert.deepEqual(bad, []);
  assert.ok(furn.length >= 25, '家具の当たりの数 ' + furn.length);
  const iss = applyAllow(auditArea('shotengai', R.shotengai.pieces, A)).filter(i => i.sev === 'error' && i.pos && i.pos[0] > OX - 7.5 && i.pos[0] < OX + 7.5 && i.pos[2] > OZ + 3 && i.pos[2] < OZ + 17.5);
  assert.deepEqual(iss.map(i => `${i.cat} ${i.msg} @${i.pos}`), []);
});

// 歩ける所の升目（0.1m・半径 0.3）：戸は開けた（当たりを消した）状態で
function walkGrid(boxes, floorY, x0, z0, x1, z1) {
  const r = 0.3, h = 0.1, nx = Math.round((x1 - x0) / h), nz = Math.round((z1 - z0) / h), free = new Uint8Array(nx * nz);
  const use = boxes.filter(b => !closedDoors.includes(b) && b.maxY > floorY + 0.25 && b.minY < floorY + 1.6);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = x0 + (i + 0.5) * h, z = z0 + (k + 0.5) * h; free[i * nz + k] = use.some(b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) ? 0 : 1; }
  const at = (x, z) => { const i = Math.floor((x - x0) / h), k = Math.floor((z - z0) / h); return i >= 0 && k >= 0 && i < nx && k < nz ? i * nz + k : -1; };
  const reach = (from) => { const seen = new Uint8Array(nx * nz), q = [at(...from)]; seen[q[0]] = 1; while (q.length) { const c = q.pop(), i = Math.floor(c / nz), k = c % nz; for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = k + dk; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const j = a * nz + b; if (!seen[j] && free[j]) { seen[j] = 1; q.push(j); } } } return (x, z) => { const j = at(x, z); return j >= 0 && seen[j] === 1; }; };
  return { free: (x, z) => free[at(x, z)] === 1, reach };
}
await t('自宅：玄関から全部の部屋・調べる所へ歩いて届く（通り道は人が歩ける幅）・通しプレイのまっすぐの道（ホール → ソファ → 刀掛け）が塞がれていない', () => {
  const W = walkGrid(homeBoxes, 0, OX - 6, OZ + 4.4, OX + 6, OZ + 16);
  const go = W.reach(L(0, 4.9));
  for (const [name, x, z] of [['玄関', 0, 7.0], ['ホール', 0, 8.6], ['ソファ', -3.5, 13.6], ['ノートPC', -3.6, 12.9], ['カレンダー', -1.6, 14.9], ['テレビ', -3.5, 10.5], ['刀掛け', 5.2, 14.3], ['金庫', 5.4, 14.5], ['食卓', 0, 11.5], ['台所', 1.8, 14.6], ['和室', -3.2, 8.5], ['トイレ', 1.8, 7.6], ['洗面所', 3.4, 7.6], ['浴室', 5.1, 7.6], ['階段の口', 5.5, 9.2]])
    assert.ok(go(...L(x, z)), name + ' へ届かない');
  for (const [a, b] of [[[0, 9.6], [-3.4, 13.6]], [[-3.4, 13.6], [4.45, 13.9]], [[-0.2, 4.9], [-0.2, 5.95]], [[0, 6.3], [0, 9.6]]]) for (let k = 0; k <= 60; k++) { const x = a[0] + (b[0] - a[0]) * k / 60, z = a[1] + (b[1] - a[1]) * k / 60; assert.ok(W.free(...L(x, z)), `まっすぐの道 ${a}→${b} が ${x.toFixed(2)},${z.toFixed(2)} で塞がれている`); }
  const up = walkGrid(A.boxesUp.map(b => b), 0, OX - 6, OZ + 6, OX + 6, OZ + 16), go2 = up.reach(L(0, 14.6));
  for (const [name, x, z] of [['2 階の廊下の北', 0, 6.8], ['寝室', -2.9, 8.4], ['娘の部屋', -3.3, 14.4], ['仕事部屋', 3.1, 8.3], ['納戸', 2.8, 11.6], ['階段の上', 5.5, 14.4]]) assert.ok(go2(...L(x, z)), name + ' へ届かない');
});

await t('自宅：窓は家の中（win）と外の皮（town.js の homeExterior）が同じ data（homeWindows）・北陸の家（風除室・妻入りの切妻・雪止め・枠の内・高い基礎）', () => {
  assert.ok(LEVEL.homeWindows.length >= 12);
  for (const w of LEVEL.homeWindows) { assert.ok(['N', 'S', 'E', 'W'].includes(w.face)); const lim = w.face === 'N' || w.face === 'S' ? [-6, 6] : [6, 16]; assert.ok(w.u - w.w / 2 > lim[0] && w.u + w.w / 2 < lim[1], '窓が壁の外 ' + JSON.stringify(w)); }
  const tw = src('shinshoku/world/town.js'), lv = src('shinshoku/world/level.js');
  assert.match(tw, /for \(const hw of LEVEL\.homeWindows\)/); assert.match(lv, /for \(const w of LEVEL\.homeWindows\) win\(/);
  assert.match(tw, /roofGable\(G, 0, 0, G\.W, G\.D, 6\.1, 'kawara'/); assert.match(tw, /雪止め/); assert.match(tw, /枠の内/); assert.match(lv, /風除室/);
  // 風除室の前は門からの道（歩ける）
  const go = walkGrid(homeBoxes, 0, OX - 3, OZ + 2.5, OX + 3, OZ + 9).reach(L(0, 3.0)); assert.ok(go(...L(0, 7.0)), '門 → 風除室 → 玄関');
});

await t('結末の家の場面：娘の走る道（z −1.6 → 1.22）の上に物が無い・部屋は自宅の LDK と同じ造り（木の床・ガラスの入った戸・テレビの壁）', () => {
  const P = R.epilogue.pieces, x = EPILOGUE.home.x;
  const block = P.filter(p => p.max[1] > 0.2 && p.min[1] < 1.0 && p.min[0] < x + 0.3 && p.max[0] > x - 0.3 && p.min[2] < 1.4 && p.max[2] > -1.8 && Math.abs(p.max[0] - p.min[0]) < 6.9);
  assert.deepEqual(block.map(p => p.fn + '@' + p.at), []);
  assert.ok(P.some(p => p.tile === 'woodfloor' && p.min[0] < x - 3 && p.max[0] > x + 3), '木の床'); assert.ok(P.some(p => p.tile === 'granite'), 'テレビの壁');
});

await t('結末の病室のベッド：掛け布団は腰から足先まで（上 0.86m・マットレス 0.70m）・（相棒）の腰の高さはモデルに合わせる（bedRootY7）', () => {
  const P = R.epilogue.pieces, [bx, bz] = EPILOGUE.hospital.bed;
  const duvet = P.find(p => p.color === 0xbcd4e8 && p.max[1] > 0.84 && p.max[2] - p.min[2] > 1.0 && Math.abs((p.min[0] + p.max[0]) / 2 - bx) < 0.05);
  assert.ok(duvet, '厚い掛け布団'); assert.ok(duvet.min[2] <= bz - 0.04 && duvet.max[2] >= bz + 0.95 && duvet.min[1] <= 0.71, JSON.stringify(duvet.min) + JSON.stringify(duvet.max));
  const mat = P.find(p => p.color === 0xf4f4f8 && Math.abs(p.max[1] - 0.70) < 0.01); assert.ok(mat, 'マットレス');
  const ch7 = src('shinshoku/game/ch7.js'); assert.match(ch7, /C\.rootY = C\.anim === 'bed' \? this\.bedRootY7\(C\) : 0;/); assert.match(ch7, /return Math\.max\(0, Math\.min\(0\.5, 0\.80 - rel\)\);/);
});

await t('めり込みの調査で直した置き場所：応答体は槽のガラスの外・管理棟の写し身は壁の線の上でない・病院の写し身の手が壁に入らない・閉店の店の店員が棚から離れる・記録の間の相棒は壁の板に入らない', () => {
  for (const o of LAB.outou) assert.ok(Math.hypot(o.pos[0] - o.tank[0], o.pos[1] - o.tank[1]) >= 1.25 + 0.6, o.id);
  const ad = R.admin.A.boxes; for (const m of ADMIN.roam || []) assert.ok(!hitAt(ad, m.pos[0], m.pos[1], 0.45), m.id);
  const ho = R.hospital.A.boxes; for (const m of AREA_DATA.hospital.twist.mimics) assert.ok(!hitAt(ho, m.pos[0], m.pos[1] + 0.6, 0.1) && !hitAt(ho, m.pos[0], m.pos[1], 0.35), m.id);
  assert.ok(!hitAt(R.shotengai.A.boxes, LEVEL.heiten.start[0] + 0.3, LEVEL.heiten.start[1], 0.05), '店員の手');
  assert.ok(!hitAt(R.kiroku.A.boxes, KIROKU.companionAt[0], KIROKU.companionAt[1], 0.28), '記録の間の相棒');
  assert.ok(!hitAt(R.atrium.A.boxes, 7.6, 7.6, 0.3), '観測室の戸口');
});

console.log(`shinshoku-p18-home: ${n} 件 OK`);
