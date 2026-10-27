// 境界侵食 P17：コードで組んだ異形（帰路・閉店・収容者）の骨の休みの姿勢と、前の網（参考：大きさ・弱点・目の位置）を JSON に書く。
// Blender の作り直し（tools/blender/enemy/build_enemy.py）はこの骨に合わせて形を作り、皮の重みを付ける（ゲームの動き＝actor/anim.js はそのまま使える）。
//   node tools/shinshoku/dump_enemy_rig.mjs [出力フォルダ＝tools/blender/enemy/rigs]
import './audit/node_env.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const THREE = await import('three');
const M = await import('../../shinshoku/actor/models.js');
const out = new URL('../blender/enemy/rigs/', import.meta.url).pathname;
const dir = process.argv[2] || out; mkdirSync(dir, { recursive: true });
const v3 = o => { const p = new THREE.Vector3(); o.getWorldPosition(p); return [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)]; };
for (const [kind, fn] of [['kiro', () => M.buildKiro(0xd04848)], ['heiten', M.buildHeiten], ['shuuyou', M.buildShuuyou]]) {
  const m = fn(); m.root.updateMatrixWorld(true);
  const bones = m.skeleton.bones.map(b => ({ name: b.name, parent: m.skeleton.bones.indexOf(b.parent), pos: v3(b) }));
  const g = m.mesh.geometry, P = g.attributes.position, C = g.attributes.color, cls = g.attributes.mcls;
  const bb = new THREE.Box3().setFromBufferAttribute(P);
  // 参考の点群（間引き）：位置・色・材質の種類の名前
  const pts = []; const step = Math.max(1, Math.floor(P.count / 6000));
  for (let i = 0; i < P.count; i += step) pts.push([+P.getX(i).toFixed(4), +P.getY(i).toFixed(4), +P.getZ(i).toFixed(4), +C.getX(i).toFixed(3), +C.getY(i).toFixed(3), +C.getZ(i).toFixed(3), cls ? m.table.names[cls.getX(i)] : 'cloth']);
  const rec = { kind, note: 'コードの異形の骨（休みの姿勢・世界の位置・Y 上 +Z 前）。shinshoku/actor/models.js の build*', height: m.height, bodyR: m.bodyR, tris: m.tris, bbox: [bb.min.toArray(), bb.max.toArray()],
    weak: v3(m.weak), weakBone: m.weak.parent && m.weak.parent.name, eyes: (m.eyeGlow || []).map(v3), classes: m.table.names, bones, ref: pts };
  writeFileSync(dir + kind + '.json', JSON.stringify(rec));
  console.log(kind, 'bones', bones.length, 'tris', m.tris, 'h', (bb.max.y - bb.min.y).toFixed(2), 'classes', m.table.names.join(','));
}
