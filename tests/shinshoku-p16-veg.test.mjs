// 『境界侵食』P16「木などのモデリングは試験マップと同じ作り方に」の点検。
// ・部品と材質：試験マップ（山の廃村）と同じ道具（tools/blender/kit/build_kit.py＋pieces_veg.py・tools/mapkit/matgen/matgen.py＋defs_veg.py）で作り、
//   素材ライブラリ（wakaba-assets）にあり、目録の web の門を通る（自作・商用可）。節の名前（LOD0・LOD1・IMP）・材質の名前（mat.*）・Meshopt の写し。
// ・境界侵食の区画が部品の id（veg.tree.* など）を記録する（街路樹・庭・公園・社・用水路・駅前・アーケード・病院・裏路地・広場・研究区画・崩れた町）。
// ・手続きの木・植え込みの形は「代わりの網」（B.fb(…, 'veg')）だけ＝部品が読めない時の予備。当たり判定（幹）・歩く道は変えない。
// ・段ごとの LOD の選び方（mapkit/render/kit.js の KitSet をそのまま使う）：PC は近くで LOD0・スマホは木を遠景の板だけ・低木は LOD1。
// ・共有の部品を読み込んで使う（写していない）。mapkit の既定の動き（AssetBank・KitSet・GroundCover）は変えていない。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const THREE = await import('three');
const { recordAreas, AREA_IDS } = await import('../tools/shinshoku/audit/record.mjs');
const V = await import('../shinshoku/world/vegkit.js');
const { KitSet } = await import('../mapkit/render/kit.js');
const { AssetBank } = await import('../mapkit/render/assets.js');
const { GroundCover } = await import('../mapkit/render/foliage.js');
const { TOWN, townSolids } = await import('../shinshoku/data/town.js');
const { PRESETS } = await import('../shinshoku/render/quality.js');

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
const cat = J('wakaba-assets/catalog.json'), byId = new Map(cat.entries.map(e => [e.id, e]));
const NEW_KITS = ['veg.tree.keyaki', 'veg.tree.ichou', 'veg.tree.sakura', 'veg.tree.matsu', 'veg.shrub.tsutsuji', 'veg.hedge', 'veg.weed', 'veg.pot', 'veg.planter', 'veg.houseplant', 'rock.rubble'];
const NEW_MATS = ['mat.foliage.keyaki', 'mat.foliage.ichou', 'mat.foliage.sakura', 'mat.foliage.matsu', 'mat.foliage.tsutsuji', 'mat.foliage.hedge', 'mat.foliage.houseplant', 'mat.foliage.weed', 'mat.bark.sakura', 'mat.bark.matsu', 'mat.ceramic.terracotta'];
function glbJson(p) { const b = readFileSync(new URL(p, root)); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()); }

await t('部品（11）と材質（11）：素材ライブラリにあり web・ue5 の門が pass・自作（own・商用可・verifiedBy は空）・作った道具が tools/ にある', () => {
  for (const id of [...NEW_KITS, ...NEW_MATS]) {
    const e = byId.get(id); assert.ok(e, id + ' が目録に無い');
    assert.equal(e.targets.web.result, 'pass', id); assert.equal(e.targets.ue5.result, 'pass', id);
    const m = J(`wakaba-assets/entries/${e.dir}/meta.json`);
    assert.equal(m.license.id, 'own'); assert.equal(m.license.commercial, 'yes'); assert.equal(m.source.type, 'self_made'); assert.equal(m.license.verifiedBy, '');
    assert.ok(/tools\/(blender\/kit\/build_kit_veg|mapkit\/matgen\/matgen_veg)\.py$/.test(m.source.generator), id + ' ' + m.source.generator);
    assert.ok(existsSync(new URL(m.source.generator, root)));
  }
  // 試験マップと同じ作り方：部品の表と材質の表は別のファイル（pieces.py・defs.py は変えずに足した）
  assert.ok(/from pieces import _foliage_normals/.test(read('tools/blender/kit/pieces_veg.py')) && /build_kit\.main\(\)/.test(read('tools/blender/kit/build_kit_veg.py')));
  assert.ok(/from defs import _card, _finish_card/.test(read('tools/mapkit/matgen/defs_veg.py')) && /matgen\.main\(\)/.test(read('tools/mapkit/matgen/matgen_veg.py')));
  for (const id of NEW_MATS) { const M = byId.get(id).material; for (const k of ['albedo', 'normal', 'orh']) assert.ok(M.maps[k]['256'], `${id} ${k} 256`); }
  for (const id of NEW_MATS.filter(x => x.startsWith('mat.foliage'))) assert.ok(byId.get(id).material.alpha && byId.get(id).material.card, id + ' は透過のカード');
});

await t('部品の glb：節の名前（木＝LOD0・LOD1・IMP／種類＝v<k>_LOD<n>）・材質の名前は目録の mat.*（遠景の板は imp.*）・頂点の AO と接線・Meshopt の写し（.mo.glb）がある', () => {
  for (const id of NEW_KITS) {
    const e = byId.get(id), raw = e.web.find(w => w.file === `web/${id}.glb`); assert.ok(raw, id);
    const g = glbJson(`wakaba-assets/entries/${e.dir}/${raw.file}`);
    const names = g.nodes.filter(nd => nd.mesh != null || nd.children).map(nd => nd.name);
    if (id.startsWith('veg.tree')) { for (const nm of ['LOD0', 'LOD1', 'IMP']) assert.ok(names.includes(nm), `${id} ${nm}`); assert.equal(e.kit.impostor, true); }
    else assert.ok(names.every(nm => /^(v\d+_)?LOD\d$/.test(nm)), id + ' ' + names.join(','));
    for (const mt of g.materials) { const nm = mt.name.replace(/\.\d+$/, ''); assert.ok(byId.has(nm) || nm === 'imp.' + id, `${id} の材質 ${nm}`); }
    const imp = new Set(g.nodes.filter(nd => nd.name === 'IMP').map(nd => nd.mesh));
    g.meshes.forEach((me, mi) => { if (imp.has(mi)) return; for (const pr of me.primitives) { assert.ok(pr.attributes.COLOR_0 != null, id + ' AO'); assert.ok(pr.attributes.TANGENT != null, id + ' 接線'); } });
    if (id !== 'veg.weed') assert.ok(e.web.some(w => w.file.endsWith('.mo.glb')), id + ' の Meshopt の写し');
  }
  assert.equal(byId.get('veg.tree.matsu').kit.cardDup, 0, '松は葉のカードの写しをしない（目録の kit.cardDup）');
  const T = byId.get('veg.tree.keyaki').kit.nodes; assert.ok(T.LOD0 > T.LOD1 * 3 && T.IMP <= 8, JSON.stringify(T));
});

const R = await recordAreas(AREA_IDS);
const items = id => (R[id].A.vegItems || []).concat(...R[id].far.map(r => r.vegItems || []));
const cover = id => (R[id].A.vegCover || []).concat(...R[id].far.map(r => r.vegCover || []));

await t('境界侵食の区画が部品の id を記録する：町（庭・生垣・公園・社・用水路・田・駅前・中央通りの街路樹・広場）・裏路地・広場・病院・観測分室・旧研究棟・崩れた町', () => {
  const town = items('shotengai'), ids = new Set(town.map(i => i.id));
  for (const id of ['veg.tree.keyaki', 'veg.tree.ichou', 'veg.tree.sakura', 'veg.tree.matsu', 'veg.tree.sugi', 'veg.tree.broadleaf', 'veg.shrub.tsutsuji', 'veg.hedge', 'veg.planter', 'veg.pot', 'veg.houseplant', 'rock.boulder']) assert.ok(ids.has(id), '町に ' + id + ' が無い');
  for (const it of [...AREA_IDS.flatMap(items)]) assert.ok(V.VEG_IDS.includes(it.id) && byId.has(it.id), it.id + ' は素材ライブラリに無い');
  const near = (x, z, r = 1.2) => it => Math.hypot(it.x - x, it.z - z) < r;
  for (const [x, z] of TOWN.park.trees) assert.ok(town.some(i => i.id.startsWith('veg.tree') && near(x, z, 0.1)(i)), `公園の木 ${x},${z}`);
  assert.ok(town.filter(i => i.id === 'veg.tree.ichou').length >= 8, '中央通りのイチョウ並木');
  assert.ok(town.some(i => i.id === 'veg.tree.sugi' && near(-5.5, 39.6, 0.1)(i)) && town.some(i => i.id === 'veg.tree.keyaki' && near(-5.6, 44.4, 0.1)(i)), '社の木');
  assert.ok(town.filter(i => i.id === 'veg.hedge').length >= 30, '生垣の区画 ' + town.filter(i => i.id === 'veg.hedge').length);
  assert.ok(town.some(i => i.id === 'veg.planter' && near(36.6, 43.6, 0.1)(i)), '自宅の前の植え込みの箱');
  assert.ok(town.some(i => i.id === 'veg.tree.matsu' && near(46.4, 58.8, 0.1)(i)), '自宅の裏の庭の松');
  const cv = cover('shotengai'); assert.ok(cv.filter(c => c.kind === 'weed').length > 100 && cv.filter(c => c.kind === 'grass').length > 50, '雑草・草の株');
  assert.ok(cv.some(c => Math.abs(c.x - (TOWN.channel.x0 - 0.18)) < 0.3), '用水路の縁の雑草');
  for (const [area, want] of Object.entries({ alley: ['veg.pot', 'rock.boulder'], plaza: ['veg.hedge', 'veg.shrub.tsutsuji'], hospital: ['veg.houseplant', 'veg.planter', 'veg.tree.keyaki'], office: ['veg.houseplant'], oldwing: ['rock.boulder'], abyss: ['rock.rubble'] })) {
    const s = new Set(items(area).map(i => i.id)); for (const id of want) assert.ok(s.has(id), `${area} に ${id} が無い`);
  }
  assert.ok(items('oldwing').every(i => i.g === 'pitEdge'), '穴の縁の石は穴の縁の Group の下（見える／見えないが一緒）');
  assert.ok(cover('ruins').length > 50, '崩れた商店街の雑草');
  for (const id of ['town', 'yard', 'avenue', 'abyss']) assert.ok(R[id].A.dyn.debris, id + ' の瓦礫（rock.rubble に差し替える所）');
});

await t('手続きの木・植え込みは代わりの網だけ（B.fb(…, \'veg\')）：tree／雪囲い／植え込みの 20 面体はすべて fb・当たり判定（幹・植え込み）は前と同じ', () => {
  const FOL = new Set([0x8aa080, 0x9ab08a, 0xa0c090, 0x3a6a4a, 0x3a5a3a, 0x2a4a2a, 0x3a6a3a, 0x4a7a4a, 0x2e5a3a, 0x3a6a42, 0xc8b060]);
  let checked = 0;
  for (const id of AREA_IDS) for (const p of R[id].pieces) {
    if (p.src !== 'b') continue;
    const fol = (p.geo === 'IcosahedronGeometry' && FOL.has(p.color)) || p.fn === 'tree' || (p.tile === 'hedge');
    if (!fol) continue; checked++;
    assert.ok(p.fb, `手続きの植物が代わりの網でない：${id} ${p.fn} ${p.at} ${p.geo} ${p.color.toString(16)}`);
  }
  assert.ok(checked > 40, '調べた手続きの植物の形 ' + checked);
  const src = read('shinshoku/world/town.js'), body = src.slice(src.indexOf('function tree(x, z'), src.indexOf('function shrubAt('));
  assert.ok(/vegTree\(sp, x, z/.test(body) && /B\.fb\(true, \(\) => \{[\s\S]*\}, 'veg'\)/.test(body), 'tree() は部品を記録して手続きの形は代わりの網');
  // 当たり判定：公園の木・街路樹の幹は箱（公園は前と同じ大きさ）
  const S = townSolids(TOWN);
  for (const [x, z] of TOWN.park.trees) assert.ok(S.some(b => Math.abs((b.minX + b.maxX) / 2 - x) < 0.01 && Math.abs((b.minZ + b.maxZ) / 2 - z) < 0.01 && Math.abs(b.maxX - b.minX - 0.6) < 0.01), '公園の木の幹 ' + x);
  for (const p of TOWN.props.filter(q => q.kind === 'streettree')) assert.ok(S.some(b => Math.abs((b.minX + b.maxX) / 2 - p.x) < 0.01 && Math.abs((b.minZ + b.maxZ) / 2 - p.z) < 0.01), '街路樹の幹 ' + p.z);
  // 植物の網は区画の当たり判定に入らない（部品は見た目だけ）
  assert.ok(!/boxes\.push|solid\(/.test(read('shinshoku/world/vegkit.js')));
});

await t('段ごとの LOD（mapkit/render/kit.js の KitSet をそのまま）：高＝近くは LOD0・遠くは遠景の板／スマホ＝木は遠景の板だけ・低木は LOD1・種類 1・色だけ・株なし', async () => {
  const fake = { byId: new Map(), kit: async id => {
    const mk = () => [{ geometry: new THREE.BoxGeometry(1, 1, 1), material: new THREE.MeshBasicMaterial() }];
    return id.startsWith('veg.tree') ? { id, nodes: { LOD0: mk(), LOD1: mk(), IMP: mk() }, lodDist: [26, 65] } : { id, nodes: { v0_LOD0: mk(), v0_LOD1: mk(), v1_LOD0: mk(), v1_LOD1: mk() }, lodDist: [18] };
  } };
  const cam = new THREE.PerspectiveCamera(62, 1.6, 0.1, 400); cam.position.set(0, 1.6, 0); cam.lookAt(0, 1.6, -10); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const item = (z, v = 0) => ({ matrix: new THREE.Matrix4().makeTranslation(0, 0, z), variant: v, x: 0, y: 2, z, r: 2 });
  const levelOf = (ks, id) => { const s = ks.sets.find(q => q.id === id); const out = []; for (const V2 of Object.values(s.vars)) V2.levels.forEach((ms, li) => { if (ms.some(m => m.visible && m.count)) out.push(li); }); return out; };
  const run = async key => {
    const P = V.vegPreset(key, PRESETS[key]), ks = new KitSet(new THREE.Group(), fake, P);
    ks.add('veg.tree.keyaki', [item(-8)], { lodMin: P.treeImpostorOnly ? 99 : undefined }); ks.add('veg.tree.ichou', [item(-150)], { lodMin: P.treeImpostorOnly ? 99 : undefined, cull: 300 }); ks.add('veg.shrub.tsutsuji', [item(-5, P.oneVariant ? 0 : 1)], {});
    await ks.build(); ks.update(cam, true); return ks;
  };
  const hi = await run('high'), lo = await run('low');
  assert.deepEqual(levelOf(hi, 'veg.tree.keyaki'), [0], '高：近い木は LOD0'); assert.deepEqual(levelOf(hi, 'veg.tree.ichou'), [2], '高：遠い木は遠景の板');
  assert.deepEqual(levelOf(lo, 'veg.tree.keyaki'), [2], 'スマホ：近い木も遠景の板だけ'); assert.deepEqual(levelOf(lo, 'veg.shrub.tsutsuji'), [1], 'スマホ：低木は LOD1');
  assert.deepEqual(levelOf(hi, 'veg.shrub.tsutsuji'), [0]);
  const L = V.VEG_PRESETS.low, H = V.VEG_PRESETS.high;
  assert.ok(L.treeImpostorOnly && L.lodMin === 1 && L.albedoOnly && L.oneVariant && !L.wind && L.cover === 0 && L.texMax <= 256);
  assert.ok(H.wind && H.foliageTrans && H.cardDup === 1 && H.cover === 1 && H.texMax === 512 && V.VEG_PRESETS.mid.cardDup === 0);
  for (const k of Object.keys(PRESETS)) assert.ok(V.VEG_PRESETS[k], '段 ' + k);
});

await t('置き方の道具：生垣は 1m 前後の区画に分ける・株の線と四角は同じ入力で同じ結果・木の高さは部品の高さの倍率', () => {
  V.vegTake(); V.vegHedge(0, 0, 7.6, 0, 0.6, 1.3); const h = V.vegTake().items;
  assert.equal(h.length, 8); assert.ok(h.every(i => i.id === 'veg.hedge' && Math.abs(i.s[0] - 0.95 * 1.01) < 0.01 && i.s[1] === 1.3 && Math.abs(i.s[2] - 1.2) < 1e-9));
  V.vegCoverLine('weed', 0, 0, 10, 0, 0.8); V.vegCoverRect('grass', [0, 0, 4, 4], 1); const a = V.vegTake().cover;
  V.vegCoverLine('weed', 0, 0, 10, 0, 0.8); V.vegCoverRect('grass', [0, 0, 4, 4], 1); const b = V.vegTake().cover;
  assert.deepEqual(a, b); assert.equal(a.filter(c => c.kind === 'grass').length, 16);
  V.vegTree('sakura', 1, 2, 7.35); const tr = V.vegTake().items[0]; assert.equal(tr.id, 'veg.tree.sakura'); assert.ok(Math.abs(tr.s[1] - 1) < 1e-9);
});

await t('共有の部品を読み込んで使う（写さない）：vegkit は mapkit の AssetBank・KitSet・GroundCover・wind を import・作品の側の手直しは adapt だけ。mapkit の既定の動きは前のまま', () => {
  const vk = read('shinshoku/world/vegkit.js');
  for (const m of ['mapkit/render/assets.js', 'mapkit/render/kit.js', 'mapkit/render/foliage.js', 'mapkit/render/wind.js']) assert.ok(vk.includes("'../../" + m + "'"), m);
  for (const f of readdirSync(new URL('shinshoku/', root), { recursive: true }).filter(f => f.endsWith('.js'))) {
    const s = read('shinshoku/' + f); assert.ok(!/class (AssetBank|KitSet|GroundCover)\b|function (assignLods|lodIndex|patchWind|moreCards)\b/.test(s), 'shinshoku/' + f + ' に mapkit の写し');
  }
  // mapkit の既定：adapt なし＝同じ材質・lib＝ページからの相対・cardDup は段の値（目録に無い時）・KitSet の lodMin は段の値・GroundCover の部品は草とシダ
  const bank = new AssetBank({ capabilities: { getMaxAnisotropy: () => 8 } }, { texMax: 512 });
  const m0 = new THREE.MeshStandardMaterial(); assert.equal(bank.adapt(m0), m0); assert.equal(bank.lib, 'wakaba-assets/');
  assert.ok(/build\(bank, ids = \['veg\.grass', 'veg\.fern'\]\)/.test(read('mapkit/render/foliage.js')) && typeof GroundCover.fromPoints === 'function');
  assert.ok(/s\.opt\.lodMin \?\? this\.P\.lodMin \?\? 0/.test(read('mapkit/render/kit.js')));
  assert.ok(/e\.kit\.cardDup \?\? this\.P\.cardDup \?\? 1/.test(read('mapkit/render/assets.js')));
});

await t('main.js：起動の後で読む（envKitLoad と同じ時）・区画を読んだ時と後回しの部分で置く・毎フレームの更新は vegUpdate だけ・?veg=0 で切れる。sw.js の版を上げた', () => {
  const m = read('shinshoku/main.js');
  assert.ok(/vegLoad\(this\)/.test(m) && /vegApply\(A, this\)/.test(m) && /vegUpdate\(A, this\.camera, dt, this\.moon\)/.test(m) && /Q\.get\('veg'\) !== '0'/.test(m));
  const sw = read('sw.js'), ver = /const VERSION = '([^']+)'/.exec(sw)[1];
  assert.ok(ver >= '2026-11-01.1', 'sw.js の版 ' + ver);
});

console.log(`shinshoku-p16-veg: ${n} ok`);
