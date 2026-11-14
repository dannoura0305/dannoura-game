// 『境界侵食』第3章：子どもは置いた所に描かれる（前は位置を入れる行が注釈の中に入っていて、体が原点＝病院の廊下の真ん中に座ったままだった）
import assert from 'node:assert/strict';
await import('../tools/shinshoku/audit/node_env.mjs');
const THREE = await import('three');
const { ch3Methods } = await import('../shinshoku/game/ch3.js');
const g = Object.assign(Object.create(ch3Methods), { scene: new THREE.Scene(), cut: { active: false }, settings: { outline: false }, area: {}, companion: { root: { visible: false }, brain: {} }, boxes: [] });
g.makeChild();
g.placeChild(9.25, -17.2, -Math.PI / 2, 'sit', 0.46);
g.stepChild(1 / 60); g.animateChild(1 / 60);
const p = g.child.root.position;
assert.ok(Math.abs(p.x - 9.25) < 1e-6 && Math.abs(p.z + 17.2) < 1e-6 && Math.abs(p.y - 0.46) < 1e-6, `子どもの体の位置 ${p.x},${p.y},${p.z}`);
assert.ok(Math.abs(g.child.root.rotation.y + Math.PI / 2) < 1e-6, '子どもの向き');
console.log('  ✓ 子どもは置いた所（306 のベッドの上）に描かれる');
console.log('shinshoku-child-place: 1 ok');
