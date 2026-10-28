// 境界侵食 P17・P18：コードで組んだ異形の骨の休みの姿勢と、前の網（参考：大きさ・弱点・目の位置・顔の札の位置）を JSON に書く。
// Blender の作り直し（tools/blender/enemy/build_enemy.py）はこの骨に合わせて形を作り、皮の重みを付ける（ゲームの動き＝actor/anim*.js はそのまま使える）。
//   node tools/shinshoku/dump_enemy_rig.mjs [出力フォルダ＝tools/blender/enemy/rigs] [--only kind]
// P18：応答体（outou）・継接（tsugihagi）・塗替（nurikae）・当直（touchoku）を足した。弱点の無い異形（塗替）は weak を null に。
import './audit/node_env.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const THREE = await import('three');
const M = await import('../../shinshoku/actor/models.js');
const M4 = await import('../../shinshoku/actor/models4.js');
const M5 = await import('../../shinshoku/actor/models5.js');
const M6 = await import('../../shinshoku/actor/models6.js');
const out = new URL('../blender/enemy/rigs/', import.meta.url).pathname;
const args = process.argv.slice(2);
const oi = args.indexOf('--only'); const only = oi >= 0 ? args.splice(oi, 2)[1] : null;
const dir = args[0] || out; mkdirSync(dir, { recursive: true });
const v3 = o => { const p = new THREE.Vector3(); o.getWorldPosition(p); return [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)]; };
const BUILDERS = [['kiro', () => M.buildKiro(0xd04848)], ['heiten', M.buildHeiten], ['shuuyou', M.buildShuuyou],
  ['outou', () => M4.buildOutou(1)], ['tsugihagi', M5.buildTsugihagi], ['nurikae', M6.buildNurikae], ['touchoku', M6.buildTouchoku]];
const pointsOf = (m, g, step, named) => {
  const P = g.attributes.position, C = g.attributes.color, cls = g.attributes.mcls, pts = [];
  for (let i = 0; i < P.count; i += step) pts.push([+P.getX(i).toFixed(4), +P.getY(i).toFixed(4), +P.getZ(i).toFixed(4), +C.getX(i).toFixed(3), +C.getY(i).toFixed(3), +C.getZ(i).toFixed(3), named && cls ? m.table.names[cls.getX(i)] : named]);
  return pts;
};
for (const [kind, fn] of BUILDERS) {
  if (only && only !== kind) continue;
  const m = fn(); m.root.updateMatrixWorld(true);
  const bones = m.skeleton.bones.map(b => ({ name: b.name, parent: m.skeleton.bones.indexOf(b.parent), pos: v3(b) }));
  const g = m.mesh.geometry, P = g.attributes.position;
  const bb = new THREE.Box3().setFromBufferAttribute(P);
  // 参考の点群（間引き）：位置・色・材質の種類の名前。顔の札（faceMesh）・光（glowMesh）の点も（新しい形をその後ろへ合わせる）
  const pts = pointsOf(m, g, Math.max(1, Math.floor(P.count / 6000)), true);
  const face = m.faceMesh ? pointsOf(m, m.faceMesh.geometry, 1, 'face') : [];
  const glow = m.glowMesh ? pointsOf(m, m.glowMesh.geometry, Math.max(1, Math.floor(m.glowMesh.geometry.attributes.position.count / 1500)), 'glow') : [];
  const eyes = (m.eyeGlow || m.eyes || []).map(v3);
  const rec = { kind, note: 'コードの異形の骨（休みの姿勢・世界の位置・Y 上 +Z 前）。shinshoku/actor/models*.js の build*', height: m.height, bodyR: m.bodyR, tris: m.tris, bbox: [bb.min.toArray(), bb.max.toArray()],
    weak: m.weak ? v3(m.weak) : null, weakBone: m.weak && m.weak.parent ? m.weak.parent.name : null, eyes, classes: m.table.names, bones, ref: pts, face, glow };
  writeFileSync(dir + kind + '.json', JSON.stringify(rec));
  console.log(kind, 'bones', bones.length, 'tris', m.tris, 'h', (bb.max.y - bb.min.y).toFixed(2), 'classes', m.table.names.join(','), 'face', face.length, 'glow', glow.length);
}
