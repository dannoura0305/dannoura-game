// node の試験で three.js（vendor/three-esm・版固定）を読むための解決の手助け（shinshoku.html の importmap と同じ対応）。
// 使い方：import { register } from 'node:module'; register('./helpers/three-node-hooks.mjs', import.meta.url);
const VENDOR = new URL('../../vendor/three-esm/', import.meta.url);
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: new URL('three-0.185.1/three.module.min.js', VENDOR).href, shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: new URL('three-0.185.1/addons/' + spec.slice('three/addons/'.length), VENDOR).href, shortCircuit: true };
  if (spec === '@pixiv/three-vrm') return { url: new URL('three-vrm-3.5.5/three-vrm.module.min.js', VENDOR).href, shortCircuit: true };
  return next(spec, ctx);
}
