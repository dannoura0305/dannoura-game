// 境界侵食 P13：node で町・区画の組み立て（shinshoku/world/*）を動かすための import の解決（ブラウザの importmap と同じ）。
const V = new URL('../../../vendor/three-esm/', import.meta.url).href;
const MAP = { 'three': V + 'three-0.185.1/three.module.min.js', '@pixiv/three-vrm': V + 'three-vrm-3.5.5/three-vrm.module.min.js' };
export async function resolve(spec, ctx, next) {
  if (MAP[spec]) return { url: MAP[spec], shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: V + 'three-0.185.1/addons/' + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}
