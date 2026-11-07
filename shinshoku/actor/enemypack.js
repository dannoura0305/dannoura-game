// 境界侵食 P17・P18：Blender で作り直した異形の体（tools/blender/enemy/build_enemy.py・designs_p18.py → shinshoku/assets/enemies/<kind>.pack.json）。
// コードの異形（actor/models*.js の buildKiro・buildHeiten・buildShuuyou・buildOutou・buildTsugihagi・buildNurikae・buildTouchoku：SkinBody）の網（本体と輪郭線）だけを差し替える。
// 炎・垂れる光（glowMesh）・顔の札（faceMesh）・光る目・弱点・揺れの骨はコードのまま。
// 骨・動き（actor/anim.js）・弱点・光る目・顔の札（faceMesh：「閉店」の札・名札・帰路の顔のにじみ）・材質（トゥーン・崩れる霧）はコードのまま。
// 読むのは起動の後に 1 回（preloadEnemyPacks：起動の読み込みを増やさない）。読み終わったら今いる異形の網も差し替える（main の refreshEnemyPacks）。読めない時・URL に ?epack=0 の時はコードの形のまま（落ちない）。
// P19：利用者が Codex（PC の Blender）で作った異形のモデル 9 体（閉店・収容者（避難所／旧研究棟）・模倣する影・応答体・待人・継接・境界の先触れ・巨大猫又）を
// tools/blender/enemy/convert_codex.py で軽くした包み（wakaba-enemypack/2：shinshoku/assets/enemies/codex/）。v2 は量子化（位置 int16・法線 int8・色 sRGB uint8・骨と重み uint8）で
// 「休みの骨の位置」（rest）を持つ：差し替える時にコードの骨をその位置へ動かし（骨の逆行列も）、コードの光・顔の網も骨の動いた分だけずらす。目・弱点・核（anchors）は届いたモデルの位置へ。
// 写し身（utsushimi）は差し替えない（作りかけ）。前の姿へ戻す：?epack=p18（P17・P18 の Blender の包み・無い種類はコードの形）／?epack=0（全部コードの形）。
import * as THREE from 'three';

const BASE = new URL('../assets/enemies/', import.meta.url);
// P18：応答体（outou）・継接（tsugihagi）・塗替（nurikae）・当直（touchoku）を足した（tools/blender/enemy/designs_p18.py）。
// 序章〜第2章の 3 種（EARLY）は起動の 2 秒後にまとめて読む。第4章からの 4 種（LAZY）はその異形が置かれた時に読む（requestEnemyPacks：
// main の lazyEnemyPacks が 1 秒ごとに見る）＝起動の読み込みも、序盤の通信も増やさない。
// P19：模倣する影（mimic・第3章）・待人（machibito）・収容者（旧研究棟 shuusha）・境界の先触れ（sakibure）・巨大猫又（nekomata＝だんのうらの巨大な姿）も LAZY。
export const ENEMY_PACK_EARLY = ['kiro', 'heiten', 'shuuyou'];
export const ENEMY_PACK_LAZY = ['outou', 'tsugihagi', 'nurikae', 'touchoku', 'mimic', 'machibito', 'shuusha', 'sakibure', 'nekomata'];
// 2026-11-07：帰路の個体差（設定画の右の 4 体：ジャンパーは kiro・ほかはコート／カーディガン／老女）。骨と動きは帰路と同じ。その帰路が置かれた時に読む
// 重面（omoomote）と個体差も、置かれた時に読む（2026-11-07：体だけ。AI と置き場所はまだ）
export const ENEMY_PACK_VARIANTS = ['kiro_coat', 'kiro_cardigan', 'kiro_obaa', 'omoomote', 'omoomote_skirt', 'omoomote_stout', 'seiyou'];
export const ENEMY_PACK_KINDS = [...ENEMY_PACK_EARLY, ...ENEMY_PACK_LAZY, ...ENEMY_PACK_VARIANTS];
/** P19：Codex のモデルから作った包み（assets/enemies/codex/）を使う種類 */
export const ENEMY_PACK_CODEX = ['heiten', 'shuuyou', 'shuusha', 'mimic', 'outou', 'machibito', 'tsugihagi', 'sakibure', 'nekomata'];
/** P17・P18 の包み（assets/enemies/ 直下）がある種類（帰路と個体差は 2026-11-07 の「怪異強化案」） */
const OLD_PACKS = ['kiro', 'heiten', 'shuuyou', 'outou', 'tsugihagi', 'nurikae', 'touchoku', ...ENEMY_PACK_VARIANTS];
const PACKS = {};
const ASKED = {};
let OFF = false, OLD = false;
try { OFF = typeof location !== 'undefined' && /[?&]epack=0\b/.test(location.search); OLD = typeof location !== 'undefined' && /[?&]epack=p18\b/.test(location.search); } catch (e) { /* node */ }
export const enemyPacksOff = () => OFF;
/** 包みの場所（相対）：Codex の包みは codex/、前の包みは直下。読む物が無い時は null */
export function enemyPackPath(k, low, old = OLD) {
  const cx = !old && ENEMY_PACK_CODEX.includes(k);
  if (!cx && !OLD_PACKS.includes(k)) return null;
  return (cx ? 'codex/' : '') + k + (low ? '_low' : '') + '.pack.json';
}

async function loadOne(k, low) {
  try {
    const path = enemyPackPath(k, low); if (!path) return 0;
    const r = await fetch(new URL(path, BASE));
    if (!r.ok) return 0;
    const j = await r.json(); if (j.spec !== 'wakaba-enemypack/1' && j.spec !== 'wakaba-enemypack/2') return 0;
    PACKS[k] = decode(j); return 1;
  } catch (e) { console.warn('[shinshoku] 異形の体を読めません（コードの形で続けます）', k, e); return 0; }
}
/** 起動の後に読む（quality 'low' はスマホの軽い版 *_low.pack.json）。kinds の既定は序盤の 3 種。戻り値：読めた種類の数 */
export async function preloadEnemyPacks(quality = 'high', kinds = ENEMY_PACK_EARLY) {
  if (OFF) return 0;
  const res = await Promise.all(kinds.filter(k => !ASKED[k]).map(k => (ASKED[k] = loadOne(k, quality === 'low'))));
  return res.reduce((a, b) => a + b, 0);
}
/** まだ頼んでいない種類だけを読む（1 種類につき 1 回だけ）。戻り値：新しく読めた数（頼む物が無い時は null） */
export function requestEnemyPacks(kinds, quality = 'high') {
  if (OFF) return null;
  const want = [...new Set(kinds)].filter(k => ENEMY_PACK_KINDS.includes(k) && !ASKED[k]);
  return want.length ? preloadEnemyPacks(quality, want) : null;
}
/** node の試験用：JSON を直に入れる */
export function setEnemyPack(kind, json) { PACKS[kind] = json ? decode(json) : null; }
export const enemyPackOf = kind => (OFF ? null : PACKS[kind] || null);
/** 材質の種類（包みを読む前に組んだコードの異形にも入れておく＝後で網だけ差し替えられる） */
const PACK_CLASSES = { kiro: ['cloth', 'skin', 'hair', 'acc', 'metal'], kiro_coat: ['cloth', 'skin', 'hair', 'acc'], kiro_cardigan: ['cloth', 'skin', 'hair', 'acc'], kiro_obaa: ['cloth', 'skin', 'hair', 'acc'], omoomote: ['cloth', 'skin', 'hair', 'acc'], omoomote_skirt: ['cloth', 'skin', 'hair', 'acc'], omoomote_stout: ['cloth', 'skin', 'hair', 'acc'], seiyou: ['cloth', 'skin', 'metal', 'acc', 'glow'], heiten: ['cloth', 'skin', 'hair', 'metal', 'acc', 'glow'], shuuyou: ['cloth', 'skin', 'metal', 'acc', 'glow'],
  outou: ['cloth', 'skin', 'metal', 'acc', 'glow'], tsugihagi: ['cloth', 'skin', 'metal', 'acc', 'glow'], nurikae: ['cloth', 'metal', 'acc', 'glow'], touchoku: ['cloth', 'skin', 'metal', 'acc', 'glow'],
  mimic: ['cloth', 'skin', 'acc', 'glow'], machibito: ['cloth', 'skin', 'metal', 'acc'], shuusha: ['cloth', 'skin', 'acc'], sakibure: ['cloth', 'acc', 'glow'], nekomata: ['fur', 'skin', 'acc', 'glow'] };
export function enemyPackClasses(kind) { const p = enemyPackOf(kind); return OFF ? [] : [...new Set([...(PACK_CLASSES[kind] || []), ...(p ? p.classes : [])])]; }

const f32 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const u16 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2); };
const u32 = s => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return new Uint32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const bytes = s => (typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')));
const s2l = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const S2L = new Float32Array(256).map((_, i) => s2l(i / 255));
function decode(j) {
  if (j.spec === 'wakaba-enemypack/2') return decode2(j);
  return { kind: j.kind, bones: j.bones, classes: j.classes || [], tris: j.tris, hideFace: !!j.hideFace,
    parts: j.parts.map(p => ({ name: p.name, mat: p.mat, oth: p.oth, tint: !!p.tint, count: p.count, P: f32(p.position), N: f32(p.normal), C: f32(p.color), J: u16(p.joints), W: f32(p.weights), I: p.indexType === 'u32' ? u32(p.index) : u16(p.index) })) };
}
/** v2（量子化）→ v1 と同じ形の配列（P・N・C は Float32、J は Uint16）＋ 休みの骨の位置・目や弱点の位置・隠すコードの網 */
function decode2(j) {
  const lo = j.q.min, sp = [0, 1, 2].map(i => (j.q.max[i] - lo[i]) / 65535);
  const parts = j.parts.map(p => {
    const n = p.count, qb = bytes(p.position), q = new Int16Array(qb.buffer, qb.byteOffset, n * 3), nb = bytes(p.normal), nq = new Int8Array(nb.buffer, nb.byteOffset, n * 3);
    const cb = bytes(p.color), jb = bytes(p.joints), wb = bytes(p.weights), ib = bytes(p.index);
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), J = new Uint16Array(n * 4), W = new Float32Array(n * 4);
    for (let i = 0; i < n * 3; i++) { const a = i % 3; P[i] = lo[a] + (q[i] + 32768) * sp[a]; N[i] = nq[i] / 127; C[i] = S2L[cb[i]]; }
    for (let i = 0; i < n * 4; i++) { J[i] = jb[i]; W[i] = wb[i] / 255; }
    const I = p.indexType === 'u32' ? new Uint32Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength)) : new Uint16Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength));
    return { name: p.name, mat: p.mat, oth: p.oth, tint: false, count: n, P, N, C, J, W, I };
  });
  return { kind: j.kind, v: 2, bones: j.bones, classes: j.classes || [], tris: j.tris, rest: j.rest || null, anchors: j.anchors || null, hide: j.hide || [], clips: j.clips || null, parts };
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
  m.tris = ni / 3 + (m.faceMesh && !pk.hideFace ? m.faceMesh.geometry.index.count / 3 : 0);
  m.packed = kind;
  if (pk.rest) rebind(m, pk);
  // 包みの hideFace（v1）：顔を網に彫った意匠（帰路 2026-11-07）。v2 は hide に 'face'
  if ((opt.hideFace || pk.hideFace || (pk.hide || []).includes('face')) && m.faceMesh) { m.faceMesh.visible = false; m.tris = ni / 3; }
  if ((pk.hide || []).includes('glow') && m.glowMesh) m.glowMesh.visible = false;
  if (pk.anchors) { m.packAnchors = pk.anchors; placePackAnchors(m); }
  if (pk.clips) m.packClips = pk.clips;
  return true;
}

const _m4 = new THREE.Matrix4(), _v = new THREE.Vector3();
/**
 * P19（v2）：コードの骨を包みの休みの位置（rest：骨の名前 → 位置）へ動かす。rest に無い骨は親からのずれをそのままに付いていく。
 * 骨の逆行列（bind）も直す。体の網はもう新しい位置で作ってある。コードの光（glowMesh）・顔（faceMesh）の網は、重みの骨が動いた分だけずらす。
 * 骨の回転（動き）はそのまま（休みの回転は無い＝SkinBody の骨は位置だけ）。腰（hips）の高さが変わった時は m.packShift（Poser の hipsBase を足す）。
 */
function rebind(m, pk) {
  const sk = m.skeleton, bones = sk.bones, n = bones.length, idx = new Map(bones.map((b, i) => [b, i]));
  const old = bones.map((b, i) => new THREE.Vector3().setFromMatrixPosition(_m4.copy(sk.boneInverses[i]).invert()));
  const neu = new Array(n);
  const solve = i => {
    if (neu[i]) return neu[i];
    const b = bones[i], r = pk.rest[b.name], pi = idx.get(b.parent);
    if (r) neu[i] = new THREE.Vector3(r[0], r[1], r[2]);
    else if (pi != null) neu[i] = solve(pi).clone().add(old[i]).sub(old[pi]);
    else neu[i] = old[i].clone();
    return neu[i];
  };
  for (let i = 0; i < n; i++) solve(i);
  const d = neu.map((v, i) => v.clone().sub(old[i]));
  for (let i = 0; i < n; i++) {
    const b = bones[i], pi = idx.get(b.parent);
    b.position.add(pi != null ? _v.copy(d[i]).sub(d[pi]) : d[i]);     // 今の動きのずれ（腰の上下など）は残す
    sk.boneInverses[i].multiply(_m4.makeTranslation(old[i].x - neu[i].x, old[i].y - neu[i].y, old[i].z - neu[i].z));
  }
  for (const mesh of [m.faceMesh, m.glowMesh]) {
    const g = mesh && mesh.geometry; if (!g || !g.attributes.skinIndex) continue;
    const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, RP = g.attributes.rp;
    for (let v = 0; v < P.count; v++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) { const w = SW.getComponent(v, k); if (!w) continue; const dd = d[SI.getComponent(v, k)]; if (!dd) continue; x += dd.x * w; y += dd.y * w; z += dd.z * w; }
      P.setXYZ(v, P.getX(v) + x, P.getY(v) + y, P.getZ(v) + z); if (RP) RP.setXYZ(v, RP.getX(v) + x, RP.getY(v) + y, RP.getZ(v) + z);
    }
    P.needsUpdate = true; if (RP) RP.needsUpdate = true; g.computeBoundingSphere(); if (g.boundingSphere) g.boundingSphere.radius += 0.6;
  }
  const hi = bones.findIndex(b => b.name === 'hips');
  m.packShift = hi >= 0 ? d[hi].clone() : new THREE.Vector3();
  m.packRest = Object.fromEntries(bones.map((b, i) => [b.name, neu[i]]));
  if (m.bodyY != null && m.packRest.gBody) m.bodyY = m.packRest.gBody.y;      // 巨大猫又の胴の高さ（anim5 の GiantAnimator）
  if (m.packRest.tHip) m.tHipY = m.packRest.tHip.y;                             // 継接の腰の高さ（anim5 の TsugiAnimator）
}

/**
 * P19：目（eyeGlow・eyes）・弱点（weak）・核（core）を包みの位置（anchors：{ bone, p:[[x,y,z],…] }）へ。まだ作っていない物（組み立ての途中）は後で
 * （builder の最後に placePackAnchors(m) を呼ぶ）。数が違う時は順に繰り返す。戻り値：m
 */
export function placePackAnchors(m) {
  const A = m && m.packAnchors; if (!A || !m.skeleton) return m;
  const byName = {}; for (const b of m.skeleton.bones) byName[b.name] = b;
  for (const [key, a] of Object.entries(A)) {
    const objs = Array.isArray(m[key]) ? m[key] : m[key] && m[key].isObject3D ? [m[key]] : null;
    if (!objs || !objs.length || !a.p || !a.p.length) continue;
    objs.forEach((o, i) => {
      const bone = byName[a.bone] || o.parent; if (!bone || !bone.isBone) return;
      const rest = m.packRest && m.packRest[bone.name]; if (!rest) return;
      const p = a.p[i % a.p.length];
      if (o.parent !== bone) bone.add(o);
      o.position.set(p[0] - rest.x, p[1] - rest.y, p[2] - rest.z);
    });
  }
  return m;
}

// ───────────────────────── P19：届いたモデルの動き（glb の idle・ジェスチャー）
// convert_codex.py が glb の動きをコードの骨の局所の回転（腕と脚を下ろした休みからの Euler YXZ・1 秒 10 こま）へ写した物（pack.clips）。
// ゲームの手続きの動き（anim*.js の姿勢）の上に、決めた状態の時だけ一部の骨を置き換える（withPackClips）。当たり・予兆の時間・戦闘の数値は変えない。
export const CLIP_UPPER = ['spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'];
/** 動き name の t 秒の姿勢（{ 骨: [x,y,z] }）。無い時は null。loop：繰り返す（でなければ最後で止まる） */
export function packClipPose(m, name, t, bones = null, loop = true) {
  const c = m && m.packClips && m.packClips[name]; if (!c || !c.r.length) return null;
  const n = c.r.length, f = Math.max(0, t) * c.fps, span = n - 1;
  let u = loop ? f % span : Math.min(f, span); const i = Math.floor(u), k = u - i, a = c.r[i], b = c.r[Math.min(span, i + 1)];
  const o = {};
  c.bones.forEach((bn, j) => { if (bones && !bones.includes(bn)) return; o[bn] = [a[j * 3] + (b[j * 3] - a[j * 3]) * k, a[j * 3 + 1] + (b[j * 3 + 1] - a[j * 3 + 1]) * k, a[j * 3 + 2] + (b[j * 3 + 2] - a[j * 3 + 2]) * k]; });
  return o;
}
/**
 * 姿勢の関数を包む：rules［{ when(ctx), clip（名前 or ctx→名前）, t(ctx)（秒・既定 ctx.t）, bones（既定 CLIP_UPPER）, loop }］の最初に合う物の動きで骨を置き換える。
 * 包み（Codex のモデル）が当たっていない時（コードの形・前の包み）は元の姿勢のまま。
 */
export function withPackClips(fn, model, rules) {
  return ctx => {
    const res = fn(ctx);
    if (!model || !model.packClips) return res;
    for (const r of rules) {
      if (!r.when(ctx)) continue;
      const name = typeof r.clip === 'function' ? r.clip(ctx) : r.clip;
      const p = packClipPose(model, name, r.t ? r.t(ctx) : (ctx.t || 0), r.bones || CLIP_UPPER, r.loop !== false);
      if (p) return { pose: Object.assign({}, res.pose, p), rate: r.rate ?? res.rate };
      break;
    }
    return res;
  };
}
/** 種類ごとの決まり（どの状態でどの動きを使うか）。ゲームの置く所（main・ch3〜ch6）が e.poseFn を包む時に使う */
const still = c => !(c.speed > 0.05) && !c.atk;
export const PACK_CLIP_RULES = {
  heiten: [{ when: c => c.state === 'loop' && c.atStation && c.step === 'shutter', clip: 'closing_gesture', t: c => Math.min(c.stepT || 0, 3.9), loop: false },
    { when: c => (c.state === 'loop' || c.state === 'calm') && still(c) && !c.atStation, clip: 'idle', bones: ['spine', 'chest', 'neck', 'head'] }],
  shuuyou: [{ when: c => c.state === 'hostile' && c.atk && c.atk.name === 'charge' && c.atk.phase === 'windup', clip: 'charge_ready', t: c => Math.min(1.9, (c.atk.t / ((c.atkDef && c.atkDef.windup) || 1)) * 1.9), loop: false },
    { when: c => c.state === 'hostile' && c.atk && c.atk.name === 'grab' && c.atk.phase === 'windup', clip: 'reach_pull', t: c => Math.min(1.9, (c.atk.t / ((c.atkDef && c.atkDef.windup) || 1)) * 1.9), loop: false },
    { when: c => c.state === 'rollcall' && still(c), clip: 'idle', bones: ['spine', 'chest', 'neck', 'head'] }],
  shuusha: [{ when: c => (c.state === 'loop' || c.state === 'bell') && still(c), clip: 'idle', bones: ['spine', 'chest', 'neck', 'head', 'leftUpperArm', 'rightUpperArm'] }],
  mimic: [{ when: c => c.state === 'voice', clip: 'head_tilt', bones: ['neck', 'head'] }, { when: c => c.state === 'loop' && still(c), clip: 'idle', bones: ['spine', 'chest', 'neck', 'head'] }],
  outou: [{ when: c => c.sub === 'answer' && still(c), clip: 'respond' }, { when: c => c.state === 'loop' && still(c), clip: c => (Math.floor((c.t || 0) / 8) % 2 ? 'acknowledge' : 'standby'), bones: ['spine', 'chest', 'neck', 'head'] }],
  machibito: [{ when: c => c.state === 'loop' && still(c), clip: c => ['check_watch', 'look_around', 'wait'][Math.floor((c.t || 0) / 4) % 3] }, { when: c => c.state === 'sad' && still(c), clip: 'wait', bones: ['neck', 'head'] }],
};
/** e.poseFn を種類の決まりで包む（決まりの無い種類はそのまま） */
export const packPoseFn = (kind, fn, model) => (PACK_CLIP_RULES[kind] ? withPackClips(fn, model, PACK_CLIP_RULES[kind]) : fn);
