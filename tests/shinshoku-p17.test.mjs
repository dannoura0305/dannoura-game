// 『境界侵食』P17「全体的にさらにクオリティをあげて」の点検。
// ・乗り物と設備（路面電車・バス・信号・駅前の大屋根）を Blender の部品に（tools/blender/kit/pieces_transit.py）：目録・門・LOD・置く所の記録・前の箱は代わりの網だけ
// ・異形（帰路・閉店・収容者）の体を Blender で作り直した包み（tools/blender/enemy/build_enemy.py → shinshoku/assets/enemies/*.pack.json）：
//   コードの骨と同じ名前・重みの合計 1・差し替えた網の頂点の数＝包み・材質の種類・置く時の色（帰路のマフラー）・?epack=0 の予備
// ・カメラ：床と天井の間（自宅の 2 階・階段）・光線 5 本・天井の高さの表
// ・相棒の動きのクリップ（VRMA）・娘の VRM（結末の家の場面だけ）・VRM の武器はだんのうらだけ
// ・薬局と酒店の中を明るく・夜の読みやすさ（露出）
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const THREE = await import('three');
const { recordAreas } = await import('../tools/shinshoku/audit/record.mjs');
const EK = await import('../shinshoku/world/envkit.js');
const EP = await import('../shinshoku/actor/enemypack.js');
const { ThirdPersonCamera } = await import('../shinshoku/render/camera.js');
const { box } = await import('../shinshoku/world/collide.js');
const { GRADES } = await import('../shinshoku/data/envgrade.js');

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
const cat = J('wakaba-assets/catalog.json'), byId = new Map(cat.entries.map(e => [e.id, e]));
const TRANSIT = ['prop.town.tram', 'prop.town.tram_lite', 'prop.town.bus', 'prop.town.bus_lite', 'prop.town.signal_car', 'prop.town.signal_ped', 'bld.town.canopy_truss', 'bld.town.canopy_column'];
function glbJson(p) { const b = readFileSync(new URL(p, root)); return { size: b.length, j: JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) }; }

await t('乗り物と設備の部品（8）：目録にあり web・ue5 の門が pass・自作・作った道具・glb の節（v<k>_LOD<n>）・1MB 未満・AO', () => {
  for (const id of TRANSIT) {
    const e = byId.get(id); assert.ok(e, id + ' が目録に無い'); assert.equal(e.targets.web.result, 'pass', id); assert.equal(e.targets.ue5.result, 'pass', id);
    const m = J(`wakaba-assets/entries/${e.dir}/meta.json`);
    assert.equal(m.license.id, 'own'); assert.equal(m.source.type, 'self_made'); assert.ok(m.source.generator.endsWith('build_kit_transit.py'), id);
    const { size, j } = glbJson(`wakaba-assets/entries/${e.dir}/web/${id}.glb`); assert.ok(size < 1048576, id + ' ' + size);
    const names = j.nodes.filter(nd => nd.mesh != null).map(nd => nd.name);
    assert.ok(names.length && names.every(nm => /^(v\d+_)?LOD\d$/.test(nm)), id + ' ' + names);
    for (const me of j.meshes) for (const p of me.primitives) assert.ok('COLOR_0' in p.attributes, id + ' AO');
    if (/tram$|bus$/.test(id)) assert.ok(names.includes('v1_LOD0') && names.includes('v0_LOD1'), id + '：暗い窓／灯りの 2 種と LOD 2 段');
  }
  for (const id of TRANSIT) if (!/_lite$/.test(id)) assert.ok(EK.KIT_PIECES[id], id + ' を envkit が読む');
  const ek = read('shinshoku/world/envkit.js');
  assert.ok(/'prop\.town\.tram': 'prop\.town\.tram_lite'/.test(ek) && /'prop\.town\.bus': 'prop\.town\.bus_lite'/.test(ek), 'スマホの低い段でも電車とバスは箱にしない（軽い版）');
});

await t('町の組み立て：電車・バス・信号・大屋根の部品の id を記録し、前の箱の形は代わりの網（kitFallback）だけ', async () => {
  EK.envKitInit({ kit: true, shadows: false });                 // PC の段（部品を置く）
  const R = (await recordAreas(['shotengai'])).shotengai;
  const items = [...(R.A.kitItems || []), ...R.far.flatMap(f => f.kitItems || [])];
  const cnt = id => items.filter(it => it.id === id).length;
  assert.equal(cnt('prop.town.tram'), 2); assert.equal(cnt('prop.town.bus'), 2); assert.ok(cnt('prop.town.signal_car') >= 4 && cnt('prop.town.signal_ped') >= 8, '信号');
  assert.ok(cnt('bld.town.canopy_truss') >= 10 && cnt('bld.town.canopy_column') >= 5, '大屋根');
  assert.equal(items.find(it => it.id === 'prop.town.tram' && it.v === 1).z, -96, '灯りの電車（tram2）は v1');
  const src = read('shinshoku/world/town2.js');
  assert.ok(/KC\.put\('prop\.town\.tram', t\.lit \? 1 : 0/.test(src) && /KC\.put\('prop\.town\.bus', b\.lit \? 1 : 0/.test(src));
  assert.ok(/B\.fb\(KC\.put\('prop\.town\.signal_ped'/.test(src) && /KC\.put\('prop\.town\.signal_car'/.test(src));
  assert.ok(/KC\.put\('bld\.town\.canopy_truss'/.test(src) && /KC\.put\('bld\.town\.canopy_column'/.test(src));
  assert.ok(/kitT \? half - 0\.215 : half \+ 0\.02/.test(src), '行き先の電光は部品の前の面に（浮かない）');
});

await t('異形の包み（3 種 × PC／スマホ）：骨の名前はコードの骨と同じ・重みの合計 1・骨の番号の範囲・三角形の予算・材質の種類', () => {
  for (const kind of EP.ENEMY_PACK_KINDS) for (const low of [false, true]) {
    const f = `shinshoku/assets/enemies/${kind}${low ? '_low' : ''}.pack.json`; assert.ok(existsSync(new URL(f, root)), f);
    const pk = J(f), rig = J(`tools/blender/enemy/rigs/${kind}.json`);
    assert.equal(pk.spec, 'wakaba-enemypack/1'); assert.deepEqual(pk.bones, rig.bones.map(b => b.name), kind + ' の骨');
    assert.ok(pk.tris < (low ? 12000 : 20000) && pk.tris > 5000, `${f} ${pk.tris}`);
    for (const c of pk.classes) assert.ok(['cloth', 'skin', 'hair', 'metal', 'acc', 'glow'].includes(c), c);
    EP.setEnemyPack(kind, pk);
    for (const p of pk.parts) {
      const ab = b64 => Uint8Array.from(Buffer.from(b64, 'base64')).buffer, w = new Float32Array(ab(p.weights)), j = new Uint16Array(ab(p.joints));
      for (let i = 0; i < p.count; i += 7) { const s = w[i * 4] + w[i * 4 + 1] + w[i * 4 + 2] + w[i * 4 + 3]; assert.ok(Math.abs(s - 1) < 1e-3, `${kind}/${p.name} 重み ${s}`); for (let k = 0; k < 4; k++) assert.ok(j[i * 4 + k] < pk.bones.length); }
    }
  }
  assert.ok(existsSync(new URL('tools/blender/enemy/build_enemy.py', root)) && existsSync(new URL('tools/shinshoku/dump_enemy_rig.mjs', root)));
});

await t('コードの異形の網を差し替える：頂点の数＝包み・骨の番号はコードの骨へ・輪郭線も同じ網・帰路のマフラーは置く時の色・顔の札は残す', async () => {
  for (const kind of EP.ENEMY_PACK_KINDS) EP.setEnemyPack(kind, J(`shinshoku/assets/enemies/${kind}.pack.json`));
  const M = await import('../shinshoku/actor/models.js');
  const red = M.buildKiro(0xd04848), blue = M.buildKiro(0x3a6ad0);
  for (const [m, kind] of [[red, 'kiro'], [M.buildHeiten(), 'heiten'], [M.buildShuuyou(), 'shuuyou']]) {
    assert.equal(m.packed, kind);
    const pk = EP.enemyPackOf(kind), nv = pk.parts.reduce((s, p) => s + p.count, 0), g = m.mesh.geometry;
    assert.equal(g.attributes.position.count, nv); assert.equal(m.outline.geometry, g);
    for (const a of ['mcls', 'rp', 'normal', 'color', 'uv', 'skinIndex', 'skinWeight', 'oth']) assert.ok(g.attributes[a], kind + ' ' + a);
    const si = g.attributes.skinIndex.array; let mx = 0; for (const v of si) mx = Math.max(mx, v); assert.ok(mx < m.skeleton.bones.length);
    if (m.faceMesh) assert.ok(m.faceMesh.visible !== false, kind + '：顔の札・名札は残す');
    assert.ok(m.weak && m.eyeGlow && m.eyeGlow.length >= 2, kind + '：弱点と光る目はコードのまま');
  }
  // マフラーの色が違う（tint の部品だけ）
  const pk = EP.enemyPackOf('kiro'); let o = 0; const sc = pk.parts.find(p => p.tint); for (const p of pk.parts) { if (p === sc) break; o += p.count; }
  const cr = red.mesh.geometry.attributes.color.array, cb = blue.mesh.geometry.attributes.color.array; const i = (o + 3) * 3;
  assert.ok(cr[i] > cr[i + 2] && cb[i + 2] > cb[i], 'マフラー＝家の戸の灯りの色');
  // 包みが無い時（?epack=0・読めない）はコードの形
  for (const kind of EP.ENEMY_PACK_KINDS) EP.setEnemyPack(kind, null);
  const c = M.buildKiro(0xd04848); assert.ok(!c.packed && c.mesh.geometry.attributes.position.count > 1000);
  assert.ok(/setTimeout\(\(\) => preloadEnemyPacks\(/.test(read('shinshoku/main.js')) && /refreshEnemyPacks\(\) \{/.test(read('shinshoku/main.js')), '起動の後で読む・今いる異形も差し替える');
  assert.ok(/epack=0/.test(read('shinshoku/actor/enemypack.js')));
});

await t('カメラ：床と天井の間を滑らせる（自宅の 1 階の天井・2 階・階段の口）・光線 5 本・屋内の区画の天井の表', () => {
  const cam = new THREE.PerspectiveCamera(62, 1.6, 0.08, 120), C = new ThirdPersonCamera(cam);
  const boxes = [box(0, -6, 20, 0.3, 4)];                          // 後ろの壁（z −6）
  // 見上げる（pitch 0.85）：天井 3.0 の下に止まる
  C.pitch = 0.85; C.yaw = Math.PI;
  for (let i = 0; i < 30; i++) C.update(1 / 30, { x: 0, y: 0, z: 0 }, { x: 0, y: 0 }, boxes, { range: () => [0.3, 2.94] });
  assert.ok(cam.position.y <= 2.95 && cam.position.y > 1.5, '天井の下 ' + cam.position.y);
  // 見下ろす向きの逆（pitch −0.55）：地面の下へもぐらない
  C.pitch = -0.55; for (let i = 0; i < 30; i++) C.update(1 / 30, { x: 0, y: 0, z: 0 }, { x: 0, y: 0 }, [], { range: () => [0.3, Infinity] });
  assert.ok(cam.position.y >= 0.29, '地面の上 ' + cam.position.y);
  // 壁：壁の手前に止まる（真ん中と上下左右の光線）
  C.pitch = 0.1; C.yaw = 0; for (let i = 0; i < 30; i++) C.update(1 / 30, { x: 0, y: 0, z: 0 }, { x: 0, y: 0 }, [box(0, 2.2, 6, 0.3, 4)], { range: () => [0.3, Infinity] });
  assert.ok(cam.position.z < 2.05, '壁の手前 ' + cam.position.z);
  const lv = read('shinshoku/world/level.js'), mn = read('shinshoku/main.js');
  assert.ok(/A\.camRange = \(x, z, py\) =>/.test(lv) && /3\.22 - 0\.28/.test(lv) && /6\.0 - 0\.28/.test(lv), '自宅の床と天井');
  assert.ok(/const CAM_CEIL = \{ hospital: 3\.6/.test(mn) && /range: this\.camRangeFn\(A, P\)/.test(mn));
});

await t('相棒の動きのクリップ（VRMA：歩き方の性格 companion）・娘の VRM（結末の家だけ）・VRM の武器はだんのうらだけ', () => {
  const man = J('shinshoku/assets/characters/manifest.json').characters;
  assert.equal(man.companion.anim, '../anim/companion/clips.json');
  const set = J('shinshoku/assets/anim/companion/clips.json');
  for (const id of ['loco.walk', 'loco.jog', 'loco.run', 'idle']) { assert.ok(set.clips[id], id); assert.ok(existsSync(new URL('shinshoku/assets/anim/companion/' + set.clips[id].file, root))); }
  assert.ok(!Object.keys(set.clips).some(k => /katana|cmb_/.test(k)), '相棒は戦わない');
  assert.ok(/性格 companion/.test(JSON.stringify(set)));
  assert.ok(/this\.clipAnim = model\.clipAnim \|\| null; this\.clipRes = null; this\.prevYaw = null;/.test(read('shinshoku/actor/actors.js')), 'CompanionActor がクリップを使う');
  assert.equal(man.daughter.file, 'daughter.vrm'); assert.equal(man.daughter.fileLow, 'daughter_low.vrm'); assert.equal(man.daughter.kind, 'daughter');
  for (const f of ['daughter.vrm', 'daughter_low.vrm', 'daughter.meta.json']) assert.ok(existsSync(new URL('shinshoku/assets/characters/' + f, root)), f);
  const meta = J('shinshoku/assets/characters/daughter.meta.json'); assert.ok(meta.files || meta.sha256 || meta.tris || meta.info, 'meta');
  const ch7 = read('shinshoku/game/ch7.js'); assert.ok(/'daughter7', dv \|\| buildDaughter\(\)/.test(ch7), '結末の家（epilogue）だけ');
  assert.equal((read('shinshoku/main.js').match(/daughterVrm/g) || []).length >= 1, true);
  assert.ok(/entry\.kind === 'dannoura' \|\| entry\.kind === 'white'\) model\.weapons = attachRigidWeapons/.test(read('shinshoku/actor/vrm.js')));
  assert.ok(/daughter: dict|'daughter': dict/.test(read('tools/blender/char/chars.py')) && /def hair_pigtails/.test(read('tools/blender/char/styles.py')) && /def outfit_daughter/.test(read('tools/blender/char/outfits.py')));
});

await t('薬局と酒店の中が表から読める（灯り・明るい壁・ガラスの内側の台）・夜の露出', () => {
  const lv = read('shinshoku/world/level.js');
  assert.ok(/const bright = kind === 'drug' \|\| kind === 'sake';/.test(lv) && /intensity: bright \? 6\.5 : 3/.test(lv));
  assert.ok(/ガラスの内側の低い台/.test(lv) && /ガラスの内側の低い棚/.test(lv));
  assert.ok(GRADES.alley.expo >= 0.95 && GRADES.plaza.expo >= 0.95 && GRADES.residential.expo >= 0.9);
});

console.log(`shinshoku-p17: ${n} 件 OK`);
