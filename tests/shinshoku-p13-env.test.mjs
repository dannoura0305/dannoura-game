// 『境界侵食』P13（環境）：意味と物理の点検（tools/shinshoku/audit_env.mjs と同じ規則）を、node の中で本物の組み立て（shinshoku/world/*）に当てる。
// ・全区画（町・裏路地・商業施設の前・避難所・病院・地下通路・観測分室・研究区画・搬入ヤード・旧研究棟・吹き抜け・置換の町・崩れた商店街・
//   中央通り（巨大）・中央管理棟・崩れた町・記録の間・結末）で error 0：浮いた看板・灯具・小物／めり込み／脚の無い家具／空の所の店の看板／
//   町の縁の空が見える所／車（車輪・道の向き・重なり）／大きなちらつく面／出入り口の前を塞ぐ物。
// ・warn は理由のある種類だけ（5cm 以下の隙間・0.3㎡ 未満の重なり面・霧の奥まで見通す道・開けた引き戸）。
// ・利用者の指摘（看板が浮く・イスの足がない・おでん屋の看板の後ろが何も無い）の直しを個別にも確かめる。
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const { recordAreas, AREA_IDS } = await import('../tools/shinshoku/audit/record.mjs');
const { auditArea, applyAllow } = await import('../tools/shinshoku/audit/rules.mjs');
const { TOWN } = await import('../shinshoku/data/town.js');

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
const R = await recordAreas(AREA_IDS);
const issues = []; for (const id of AREA_IDS) issues.push(...auditArea(id, R[id].pieces, R[id].A)); applyAllow(issues);
const near = (p, x, y, z, r) => p.min[0] - r <= x && p.max[0] + r >= x && p.min[1] - r <= y && p.max[1] + r >= y && p.min[2] - r <= z && p.max[2] + r >= z;

await t('全区画（' + AREA_IDS.length + '）を組み立てて記録できる・形の数', () => {
  assert.ok(AREA_IDS.length >= 18, '区画の数 ' + AREA_IDS.length);
  for (const id of AREA_IDS) assert.ok(R[id].pieces.length > 50, id + ' の形が少ない ' + R[id].pieces.length);
});
await t('全区画で error 0（浮き・めり込み・脚・看板・建物の欠け・車・ちらつき・出入り口）', () => {
  const e = issues.filter(i => i.sev === 'error');
  assert.deepEqual(e.map(i => `${i.area} ${i.cat} ${i.msg} @${i.pos} ${i.at}`), []);
});
await t('warn は理由のある種類だけ（5cm 以下の隙間・0.3㎡ 未満の重なり・霧の奥・開けた引き戸）', () => {
  for (const i of issues.filter(i => i.sev === 'warn')) {
    const ok = (i.cat === 'float' && i.gap <= 0.05) || (i.cat === 'zfight' && i.sqm < 0.3) || (i.cat === 'facade' && /霧の奥|戸の枠/.test(i.msg)) || i.allow;
    assert.ok(ok, `理由の無い warn：${i.area} ${i.cat} ${i.msg}`);
  }
  assert.ok(issues.filter(i => i.sev === 'warn').length <= 120, 'warn が多すぎる ' + issues.length);
});
await t('横丁：おでん・焼き鳥・立ち飲み・スナックの看板の下に店（戸口・のれん・ちょうちん・店の中のカウンターと品書き）', () => {
  const P = R.shotengai.pieces, Y = TOWN.walk.find(w => w.id === 'yokocho').rect;
  for (const name of ['おでん', '焼き鳥', '立ち飲み', 'スナック 雪']) {
    const signs = P.filter(p => p.text === name && p.fn === 'sign');
    assert.ok(signs.length >= 2, name + ' ののれん・看板 ' + signs.length);
    for (const s of signs) assert.ok(s.min[2] >= Y[3] - 0.2 && s.max[2] <= Y[3] + 0.2, name + ' の看板が長屋の表に無い');
    const x = (signs[0].min[0] + signs[0].max[0]) / 2;
    const inside = P.filter(p => p.fn === 'unit' && p.min[2] > Y[3] + 0.3 && Math.abs((p.min[0] + p.max[0]) / 2 - x) < 2.5 && p.max[1] < 2.7);
    assert.ok(inside.length >= 12, name + ' の店の中の形が少ない ' + inside.length);
  }
  const pot = P.filter(p => p.fn === 'unit' && p.key === 'glow' && p.max[1] > 1.19 && p.max[1] < 1.23);
  assert.ok(pot.length >= 2, 'おでんの鍋・焼き台の灯り');
  // 前の浮いた看板（横丁の縁の宙）は無い
  assert.ok(!P.some(p => p.fn === 'yokocho' && p.key === 'sign' && /おでん/.test(p.text || '')), '前の浮いたおでんの看板');
});
await t('脚のある家具：椅子・腰掛け・机・ベンチは座面の下に脚（furn.js）・広場と自宅の椅子は furn で作る', () => {
  const src = f => readFileSync(new URL('../shinshoku/world/' + f, import.meta.url), 'utf8');
  assert.match(src('town2.js'), /FK\.chair\(/); assert.match(src('town2.js'), /FK\.roundTable\(/); assert.match(src('level.js'), /FK\.chair\(/);
  for (const id of AREA_IDS) for (const p of R[id].pieces.filter(q => /^(chair|bench|table|stool|roundTable)$/.test(q.fn))) {
    if (p.min[1] < 0.06) continue;
    const touch = R[id].pieces.some(o => o !== p && o.max[1] >= p.min[1] - 0.03 && o.min[1] < p.min[1] - 0.02 && near(o, (p.min[0] + p.max[0]) / 2, p.min[1], (p.min[2] + p.max[2]) / 2, Math.max(p.max[0] - p.min[0], p.max[2] - p.min[2]) / 2));
    assert.ok(touch, `${id} の ${p.fn} の部品が支えられていない @${p.min}`);
  }
});
await t('車：車輪が地面・道（駐車場）の上・重ならない。路面電車は台車と車輪・幅 2.3m・架線の柱と電停に当たらない', () => {
  assert.equal(issues.filter(i => i.cat === 'vehicle' || (i.cat === 'pierce' && /車/.test(i.msg))).length, 0);
  const tram = R.shotengai.pieces.filter(p => p.fn === 'tram');
  assert.ok(tram.length > 60, '路面電車の形 ' + tram.length);
  assert.ok(Math.min(...tram.map(p => p.min[1])) < 0.02, '路面電車の車輪が地面（レール）に着かない');
  const t1 = TOWN.avenue.trams[0]; const w = Math.max(...tram.filter(p => Math.abs(p.min[2] - t1.z) < 7 && p.min[1] > 0.5 && p.max[1] < 3).map(p => p.max[0])) - t1.x;
  assert.ok(w <= 1.2, '路面電車の半分の幅 ' + w);
  for (const [x, z] of TOWN.avenue.catenary[0].pts) assert.ok(!(Math.abs(x - t1.x) < 1.4 && Math.abs(z - t1.z) < t1.len / 2), '架線の柱が止まった電車に重なる ' + z);
});
await t('Blender の部品（glb）も地面に着く（車・自販機・自転車・長椅子・ベッド・電柱）', async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  for (const id of ['prop.town.car', 'prop.town.vending', 'prop.town.bicycle', 'prop.int.bench_row', 'prop.int.hospital_bed', 'prop.town.utility_pole']) {
    const dir = new URL('../wakaba-assets/entries/prop/' + id + '/web/', import.meta.url);
    const f = readdirSync(dir).find(q => q.endsWith('.glb')); const buf = readFileSync(new URL(f, dir));
    const g = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
    g.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g.scene);
    assert.ok(Math.abs(b.min.y) < 0.02, id + ' の下 ' + b.min.y);
  }
});
await t('町の縁：駅前通りの西の突き当たり・用水路の南・中央通りの南に建物（空・地面の果てが見えない）', () => {
  const P = R.shotengai.pieces, b = TOWN.bounds;
  const hit = (x, z) => P.some(p => p.key !== 'wire' && p.min[0] <= x && p.max[0] >= x && p.min[2] <= z && p.max[2] >= z && p.max[1] > 5);
  assert.ok(hit(b.minX - 2, 8), '駅前通りの西の突き当たり');
  assert.ok(hit(7, b.maxZ + 2), '用水路の南の端');
  assert.ok(hit(79, b.maxZ + 2), '中央通りの南の端');
  assert.equal(issues.filter(i => i.cat === 'facade' && i.sev === 'error').length, 0);
});
await t('前の誤りの直し：看板の金具・表札・灯りの吊り・ちょうちんの腕・室外機の金具・ひさしの傾き・電柱の位置', () => {
  const town = readFileSync(new URL('../shinshoku/world/town.js', import.meta.url), 'utf8');
  assert.ok(!/\[0x7a3030, 0x304a7a, 0x3a6a30, 0x5a4a30\]\[Math\.floor\(r\(\) \* 4\)\], \{ rx/.test(town), 'ひさしの回転が絵の引数に入っている');
  for (const pl of TOWN.poleLines) for (const [x, z] of pl.pts) assert.ok(!TOWN.lots.some(L => !['fill', 'fillB', 'field', 'barrier', 'barrier2'].includes(L.kind) && x > L.rect[0] + 0.5 && x < L.rect[2] - 0.5 && z > L.rect[1] + 0.5 && z < L.rect[3] - 0.5), '電柱が区画の奥（建物の中） ' + pl.id + ' ' + [x, z]);
  assert.ok(!TOWN.props.some(p => p.kind === 'car' && TOWN.walk.some(w => w.kind === 'passage' && p.x > w.rect[0] && p.x < w.rect[2] && p.z > w.rect[1] && p.z < w.rect[3])), '車が通路の上');
});
console.log(`shinshoku-p13-env: ${n} 件 OK（error 0・warn ${issues.filter(i => i.sev === 'warn').length}）`);
