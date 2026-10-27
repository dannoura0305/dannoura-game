// 境界侵食 P17：Blender で作り直した異形の体（tools/blender/enemy/build_enemy.py → shinshoku/assets/enemies/<kind>.pack.json）。
// コードの異形（actor/models.js の buildKiro・buildHeiten・buildShuuyou：SkinBody）の網（本体と輪郭線）だけを差し替える。
// 骨・動き（actor/anim.js）・弱点・光る目・顔の札（faceMesh：「閉店」の札・名札・帰路の顔のにじみ）・材質（トゥーン・崩れる霧）はコードのまま。
// 読むのは起動の後に 1 回（preloadEnemyPacks：起動の読み込みを増やさない）。読み終わったら今いる異形の網も差し替える（main の refreshEnemyPacks）。読めない時・URL に ?epack=0 の時はコードの形のまま（落ちない）。
import * as THREE from 'three';

const BASE = new URL('../assets/enemies/', import.meta.url);
export const ENEMY_PACK_KINDS = ['kiro', 'heiten', 'shuuyou'];
const PACKS = {};
let OFF = false;
try { OFF = typeof location !== 'undefined' && /[?&]epack=0\b/.test(location.search); } catch (e) { /* node */ }

/** 起動の時に読む（quality 'low' はスマホの軽い版 *_low.pack.json）。戻り値：読めた種類の数 */
export async function preloadEnemyPacks(quality = 'high') {
  if (OFF) return 0;
  const low = quality === 'low';
  const res = await Promise.all(ENEMY_PACK_KINDS.map(async k => {
    try {
      const r = await fetch(new URL(k + (low ? '_low' : '') + '.pack.json', BASE));
      if (!r.ok) return 0;
      const j = await r.json(); if (j.spec !== 'wakaba-enemypack/1') return 0;
      PACKS[k] = decode(j); return 1;
    } catch (e) { console.warn('[shinshoku] 異形の体を読めません（コードの形で続けます）', k, e); return 0; }
  }));
  return res.reduce((a, b) => a + b, 0);
}
/** node の試験用：JSON を直に入れる */
export function setEnemyPack(kind, json) { PACKS[kind] = json ? decode(json) : null; }
export const enemyPackOf = kind => (OFF ? null : PACKS[kind] || null);
/** 材質の種類（包みを読む前に組んだコードの異形にも入れておく＝後で網だけ差し替えられる） */
const PACK_CLASSES = { kiro: ['cloth', 'skin', 'hair', 'acc'], heiten: ['cloth', 'skin', 'hair', 'metal', 'acc', 'glow'], shuuyou: ['cloth', 'metal', 'acc', 'glow'] };
export function enemyPackClasses(kind) { const p = enemyPackOf(kind); return OFF ? [] : [...new Set([...(PACK_CLASSES[kind] || []), ...(p ? p.classes : [])])]; }

const f32 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const u16 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2); };
const u32 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Uint32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
function decode(j) {
  return { kind: j.kind, bones: j.bones, classes: j.classes || [], tris: j.tris,
    parts: j.parts.map(p => ({ name: p.name, mat: p.mat, oth: p.oth, tint: !!p.tint, count: p.count, P: f32(p.position), N: f32(p.normal), C: f32(p.color), J: u16(p.joints), W: f32(p.weights), I: p.indexType === 'u32' ? u32(p.index) : u16(p.index) })) };
}

/**
 * コードの異形の網へ差し替える。m：sb.build() の戻り値。opt：{ tint（マフラーなど tint の部品の色：hex） }
 * 戻り値：差し替えたら true
 */
export function applyEnemyPack(m, kind, opt = {}) {
  const pk = enemyPackOf(kind); if (!pk || !m || !m.mesh || !m.skeleton) return false;
  const bi = {}; m.skeleton.bones.forEach((b, i) => { bi[b.name] = i; });
  const map = pk.bones.map(n => bi[n] ?? 0);
  let n = 0, ni = 0; for (const p of pk.parts) { n += p.count; ni += p.I.length; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), cls = new Float32Array(n), oth = new Float32Array(n);
  const idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const tint = opt.tint != null ? new THREE.Color(opt.tint) : null;
  let o = 0, oi = 0;
  for (const p of pk.parts) {
    pos.set(p.P, o * 3); nrm.set(p.N, o * 3);
    if (p.tint && tint) { for (let i = 0; i < p.count; i++) { const r = p.C[i * 3], g = p.C[i * 3 + 1], b = p.C[i * 3 + 2]; if (r > 1.2) { col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = 0.92; continue; } col[(o + i) * 3] = tint.r * r; col[(o + i) * 3 + 1] = tint.g * g; col[(o + i) * 3 + 2] = tint.b * b; } }
    else for (let i = 0; i < p.count * 3; i++) col[o * 3 + i] = Math.min(1, p.C[i]);
    for (let i = 0; i < p.count * 4; i++) { si[o * 4 + i] = map[p.J[i]]; sw[o * 4 + i] = p.W[i]; }
    const ci = m.table ? m.table.index(p.mat) : 0;
    cls.fill(ci, o, o + p.count); oth.fill(p.oth, o, o + p.count);
    for (let i = 0; i < p.I.length; i++) idx[oi + i] = p.I[i] + o;
    o += p.count; oi += p.I.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('mcls', new THREE.BufferAttribute(cls, 1)); g.setAttribute('rp', new THREE.Float32BufferAttribute(pos.slice(), 3));
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setAttribute('oth', new THREE.BufferAttribute(oth, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere(); g.boundingSphere.radius += 0.6;
  const old = m.mesh.geometry;
  m.mesh.geometry = g; if (m.outline) m.outline.geometry = g;
  old.dispose();
  m.tris = ni / 3 + (m.faceMesh ? m.faceMesh.geometry.index.count / 3 : 0);
  m.packed = kind;
  if (opt.hideFace && m.faceMesh) m.faceMesh.visible = false;
  return true;
}
