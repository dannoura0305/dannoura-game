#!/usr/bin/env node
// 利用者が自分の PC（VRoid Studio＋Blender）で作った VRM 1.0 を、ゲーム（境界侵食）用に軽くする。docs/shinshoku/ASSET_IMPORT.md §6。
//   node tools/charkit/vroid_game.mjs --src <PC から持ち込んだ characters のフォルダ> [--python <Pillow の入った python>]
//        [--chars dannoura,dannoura_white,daughter,companion] [--out shinshoku/assets/characters] [--work <途中の物の置き場>] [--no-meta]
// 元：ブランチ models-from-pc の incoming/hq3d/characters/（リポジトリの main には入れない）。<src>/<フォルダ>/model/<名前>.vrm を読む。
// 出る物：<out>/<ゲームの名前>.vrm（PC）・<ゲームの名前>_low.vrm（スマホ）・<ゲームの名前>.meta.json、wakaba-assets/entries/character/char.<名前>/meta.json
//
// 何をするか（形・骨・表情・揺れ物・材質の値は変えない）：
//  ・テクスチャ：縮めて WebP（EXT_texture_webp）に。法線の地図はさらに小さく。サムネイル（VRM の meta）は小さな JPEG（VRM の決まりで PNG／JPEG）
//  ・表情（モーフ）の差分：0 の頂点を省いた「疎な」accessor（glTF の sparse・損失なし）
//  ・骨の重み：float → 16 bit の正規化（合計が 1 になるよう丸める・誤差 1/65535）
//  ・テクスチャの縮小の見え方：sampler をミップマップ付きに（遠くでちらつかない）
//  ・VRM の meta：2026-11-07 利用者の承認で「改変：可（allowModification）・商用：法人可（corporation）・利用者：作者のみ・再配布：不可・クレジット：必要」に書き換える。
//    ほかの拡張（VRMC_vrm の humanoid・expressions・lookAt・firstPerson、VRMC_springBone、VRMC_materials_mtoon、KHR_*）はそのまま。書き出した後に元と突き合わせて確かめる
// 要るもの：node 22、Pillow（WebP 付き）の python（--python か環境変数 PIL_PYTHON。既定は python3）。gltf-transform は使わない（未知の拡張を落とさないため自前で読み書き）。
// 同じ元・同じ Pillow なら同じファイルになる。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);

/** ゲームの名前 → 持ち込んだフォルダの中の VRM・体の情報 */
export const SOURCES = {
  dannoura: { src: 'dannoura/model/dannoura.vrm', name: 'だんのうら（Dannoura）', sex: 'male', height: 1.64, kind: 'dannoura' },
  dannoura_white: { src: 'dannoura_white/model/dannoura_white.vrm', name: 'だんのうら・白い姿（Dannoura, true form）', sex: 'male', height: 1.64, kind: 'white' },
  daughter: { src: 'musume/model/musume.vrm', name: '娘（Daughter・4 歳）', sex: 'female', height: 1.0, kind: 'daughter' },
  companion: { src: 'akari/model/akari.vrm', name: '相棒（瀬名 灯里）', sex: 'female', height: 1.58, kind: 'companion' },
};
/** 段（PC・スマホ）ごとのテクスチャの上限と画質 */
export const LODS = {
  pc: { suffix: '', colorMax: 1024, normalMax: 512, q: 88, thumbMax: 256 },
  low: { suffix: '_low', colorMax: 512, normalMax: 256, q: 82, thumbMax: 128 },
};
/** 利用条件（2026-11-07 利用者の承認）。ここに無い meta の欄は元のまま */
export const META_APPROVED = { avatarPermission: 'onlyAuthor', commercialUsage: 'corporation', modification: 'allowModification', allowRedistribution: false, creditNotation: 'required' };
export const META_APPROVED_NOTE = '2026-11-07 利用者の承認：ゲーム用に軽くした VRM の利用条件を「作者のみ・法人可・改変可・再配布不可・クレジット必要」に書き換え（PC から届いた元の VRM は変えない）';

const sha = b => createHash('sha256').update(b).digest('hex');
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

export function readGLB(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546C67 || dv.getUint32(4, true) !== 2) throw new Error('GLB 2.0 ではない');
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + jl)));
  const o2 = 20 + jl, bl = dv.getUint32(o2, true);
  return { json, bin: u8.subarray(o2 + 8, o2 + 8 + bl) };
}
export function writeGLB(json, bin) {
  const enc = new TextEncoder().encode(JSON.stringify(json));
  const jl = (enc.length + 3) & ~3, bl = (bin.length + 3) & ~3;
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.fill(0x20, 20, 20 + jl); out.set(enc, 20);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bin, 28 + jl);
  return out;
}
/** accessor の中身（疎でない・詰めた配列）を読む */
function readAccessor(json, bin, i) {
  const a = json.accessors[i], T = CT[a.componentType], n = NC[a.type];
  const out = new T(a.count * n);
  if (a.bufferView != null) {
    const bv = json.bufferViews[a.bufferView], es = T.BYTES_PER_ELEMENT, stride = bv.byteStride || es * n;
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const get = { 1: (o) => T === Int8Array ? dv.getInt8(o) : dv.getUint8(o), 2: (o) => T === Int16Array ? dv.getInt16(o, true) : dv.getUint16(o, true), 4: (o) => T === Float32Array ? dv.getFloat32(o, true) : dv.getUint32(o, true) }[es];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = get(base + k * stride + c * es);
  }
  if (a.sparse) throw new Error('元に sparse がある（想定外）');
  return out;
}

class BinWriter {
  constructor() { this.parts = []; this.len = 0; this.views = []; }
  /** 4 byte 揃えで足し、bufferView の番号を返す */
  view(u8, target) {
    const pad = (4 - (this.len & 3)) & 3; if (pad) { this.parts.push(new Uint8Array(pad)); this.len += pad; }
    const v = { buffer: 0, byteOffset: this.len, byteLength: u8.byteLength }; if (target) v.target = target;
    this.parts.push(new Uint8Array(u8.buffer, u8.byteOffset, u8.byteLength)); this.len += u8.byteLength;
    this.views.push(v); return this.views.length - 1;
  }
  concat() { const o = new Uint8Array(this.len); let p = 0; for (const x of this.parts) { o.set(x, p); p += x.byteLength; } return o; }
}
/** 一つの bufferView に続けて詰める（疎な accessor の indices・values 用。byteOffset で指す） */
class Packer {
  constructor() { this.parts = []; this.len = 0; }
  add(u8) { const pad = (4 - (this.len & 3)) & 3; if (pad) { this.parts.push(new Uint8Array(pad)); this.len += pad; } const off = this.len; this.parts.push(new Uint8Array(u8.buffer, u8.byteOffset, u8.byteLength)); this.len += u8.byteLength; return off; }
  concat() { const o = new Uint8Array(this.len); let p = 0; for (const x of this.parts) { o.set(x, p); p += x.byteLength; } return o; }
}

/** 骨の重み（float VEC4）→ 16 bit の正規化（4 つの合計が 65535 ちょうど） */
function quantizeWeights(f) {
  const o = new Uint16Array(f.length);
  for (let i = 0; i < f.length; i += 4) {
    const s = f[i] + f[i + 1] + f[i + 2] + f[i + 3] || 1;
    let tot = 0, big = 0;
    for (let c = 0; c < 4; c++) { o[i + c] = Math.round(f[i + c] / s * 65535); tot += o[i + c]; if (o[i + c] > o[i + big]) big = c; }
    o[i + big] += 65535 - tot;
  }
  return o;
}

/** 画像の役目：normal（法線の地図）・thumb（VRM のサムネイル）・color（ほか） */
function imageRoles(json) {
  const role = json.images.map(() => 'color');
  const texImg = t => { const d = json.textures[t]; return d.source != null ? d.source : null; };
  for (const m of json.materials || []) if (m.normalTexture) { const s = texImg(m.normalTexture.index); if (s != null) role[s] = 'normal'; }
  const th = json.extensions && json.extensions.VRMC_vrm && json.extensions.VRMC_vrm.meta && json.extensions.VRMC_vrm.meta.thumbnailImage;
  if (th != null) role[th] = 'thumb';
  return role;
}

/**
 * 1 つの VRM を 1 つの段に。opt：{ lod（LODS の値）, python, work（途中の画像の置き場） }
 * 戻り値：{ glb: Uint8Array, info }
 */
export function convertVRM(u8, opt) {
  const L = opt.lod;
  const { json: src, bin } = readGLB(u8);
  const json = JSON.parse(JSON.stringify(src));
  const W = new BinWriter(), SI = new Packer(), SV = new Packer();
  const sparseRefs = [];
  // ── accessor（頂点・添字・逆行列・モーフの差分）
  const targetAcc = new Set(), weightAcc = new Set();
  for (const me of json.meshes) for (const p of me.primitives) {
    for (const t of p.targets || []) for (const i of Object.values(t)) targetAcc.add(i);
    if (p.attributes.WEIGHTS_0 != null) weightAcc.add(p.attributes.WEIGHTS_0);
  }
  const indexAcc = new Set(json.meshes.flatMap(me => me.primitives.map(p => p.indices).filter(x => x != null)));
  let sparseN = 0, denseN = 0;
  json.accessors = src.accessors.map((a, i) => {
    const data = readAccessor(src, bin, i), n = NC[a.type];
    const out = Object.assign({}, a); delete out.byteOffset; delete out.bufferView;
    if (targetAcc.has(i) && a.componentType === 5126) {
      const idx = [];
      for (let k = 0; k < a.count; k++) { let z = true; for (let c = 0; c < n; c++) if (data[k * n + c] !== 0) { z = false; break; } if (!z) idx.push(k); }
      if (idx.length * (n * 4 + (a.count < 65536 ? 2 : 4)) < a.count * n * 4 * 0.9) {
        const I = a.count < 65536 ? new Uint16Array(idx) : new Uint32Array(idx), V = new Float32Array(idx.length * n);
        idx.forEach((k, j) => { for (let c = 0; c < n; c++) V[j * n + c] = data[k * n + c]; });
        if (idx.length) { out.sparse = { count: idx.length, indices: { bufferView: -1, byteOffset: SI.add(new Uint8Array(I.buffer)), componentType: a.count < 65536 ? 5123 : 5125 }, values: { bufferView: -2, byteOffset: SV.add(new Uint8Array(V.buffer)) } }; sparseRefs.push(out); }
        // 差分が全部 0 の時は bufferView も sparse も無し（glTF の決まりで 0 の並び）
        sparseN++;
        return out;
      }
    }
    if (weightAcc.has(i) && a.componentType === 5126) {
      const q = quantizeWeights(data); out.componentType = 5123; out.normalized = true; delete out.min; delete out.max;
      out.bufferView = W.view(new Uint8Array(q.buffer), 34962); denseN++; return out;
    }
    out.bufferView = W.view(new Uint8Array(data.buffer), indexAcc.has(i) ? 34963 : (a.type === 'MAT4' ? undefined : 34962)); denseN++;
    return out;
  });
  // ── 画像
  const roles = imageRoles(src);
  const work = opt.work; mkdirSync(work, { recursive: true });
  const jobs = src.images.map((im, i) => {
    const bv = src.bufferViews[im.bufferView], raw = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const ext = im.mimeType === 'image/jpeg' ? 'jpg' : 'png', inp = join(work, `in_${i}.${ext}`); writeFileSync(inp, raw);
    const r = roles[i];
    if (r === 'thumb') return { in: inp, out: join(work, `out_${i}.jpg`), max: L.thumbMax, fmt: 'jpeg', quality: 85 };
    return { in: inp, out: join(work, `out_${i}.webp`), max: r === 'normal' ? L.normalMax : L.colorMax, fmt: 'webp', quality: r === 'normal' ? 90 : L.q };
  });
  writeFileSync(join(work, 'jobs.json'), JSON.stringify(jobs));
  const py = spawnSync(opt.python, ['-I', join(ROOT, 'tools/charkit/vroid_tex.py'), join(work, 'jobs.json')], { encoding: 'utf8' });
  if (py.status !== 0) throw new Error('テクスチャの処理に失敗：' + py.stderr);
  const done = JSON.parse(py.stdout.trim().split('\n').pop());
  let imageBytes = 0;
  json.images = src.images.map((im, i) => {
    const b = new Uint8Array(readFileSync(jobs[i].out)); imageBytes += b.length;
    const o = { name: im.name, mimeType: jobs[i].fmt === 'jpeg' ? 'image/jpeg' : 'image/webp', bufferView: W.view(b) };
    return o;
  });
  // テクスチャ：WebP の画像を EXT_texture_webp で指す（予備の PNG は持たない＝extensionsRequired）
  json.textures = src.textures.map(t => { const o = Object.assign({}, t); const s = o.source; delete o.source; o.extensions = Object.assign({}, o.extensions, { EXT_texture_webp: { source: s } }); return o; });
  json.samplers = (src.samplers || []).map(s => Object.assign({}, s, { minFilter: s.minFilter === 9729 ? 9987 : s.minFilter }));
  // 疎な accessor の bufferView（2 つにまとめる）
  if (sparseRefs.length) {
    const vi = W.view(SI.concat()), vv = W.view(SV.concat());
    for (const a of sparseRefs) { a.sparse.indices.bufferView = vi; a.sparse.values.bufferView = vv; }
  }
  json.bufferViews = W.views;
  const newBin = W.concat();
  json.buffers = [{ byteLength: newBin.byteLength }];
  json.extensionsUsed = [...new Set([...(src.extensionsUsed || []), 'EXT_texture_webp'])];
  json.extensionsRequired = [...new Set([...(src.extensionsRequired || []), 'EXT_texture_webp'])];
  // VRM の利用条件（2026-11-07 利用者の承認）
  const meta = json.extensions.VRMC_vrm.meta;
  Object.assign(meta, META_APPROVED);
  json.asset = Object.assign({}, src.asset, { extras: Object.assign({}, src.asset.extras, { gameBuild: 'tools/charkit/vroid_game.mjs（テクスチャの縮小・WebP、モーフの差分の疎化、重みの 16 bit 化）', metaChange: META_APPROVED_NOTE }) });
  const glb = writeGLB(json, newBin);
  check(src, readGLB(glb).json);
  let tris = 0; for (const me of json.meshes) for (const p of me.primitives) tris += json.accessors[p.indices].count / 3;
  return { glb, info: { tris, materials: json.materials.length, images: json.images.length, imageBytes, sparse: sparseN, dense: denseN, textures: done.map(d => `${d.w}x${d.h}`) } };
}

/** 書き出した物が元の VRM の拡張をすべて保っているか（meta の承認した欄・テクスチャの指し方だけが違う） */
export function check(a, b) {
  const eq = (x, y, what) => { if (JSON.stringify(x) !== JSON.stringify(y)) throw new Error('拡張が変わった：' + what); };
  const va = JSON.parse(JSON.stringify(a.extensions.VRMC_vrm)), vb = JSON.parse(JSON.stringify(b.extensions.VRMC_vrm));
  for (const k of Object.keys(META_APPROVED)) { if (vb.meta[k] !== META_APPROVED[k]) throw new Error('meta ' + k); delete va.meta[k]; delete vb.meta[k]; }
  eq(va, vb, 'VRMC_vrm（meta の承認した欄のほか）');
  eq(a.extensions.VRMC_springBone, b.extensions.VRMC_springBone, 'VRMC_springBone');
  eq(Object.keys(a.extensions).sort(), Object.keys(b.extensions).sort(), '最上位の拡張');
  eq(a.materials, b.materials, 'materials（MToon・KHR_materials_*）');
  eq(a.nodes, b.nodes, 'nodes（骨）'); eq(a.skins.map(s => s.joints), b.skins.map(s => s.joints), 'skins');
  eq(a.meshes, b.meshes, 'meshes（モーフの名前・primitive）');
  eq(a.scenes, b.scenes, 'scenes');
  for (const x of a.extensionsUsed || []) if (!b.extensionsUsed.includes(x)) throw new Error('extensionsUsed から落ちた：' + x);
  if (a.accessors.length !== b.accessors.length) throw new Error('accessor の数');
  a.accessors.forEach((x, i) => { const y = b.accessors[i]; if (x.count !== y.count || x.type !== y.type) throw new Error('accessor ' + i); });
  if (a.images.length !== b.images.length || a.textures.length !== b.textures.length) throw new Error('画像・テクスチャの数');
  a.textures.forEach((t, i) => { if (b.textures[i].extensions.EXT_texture_webp.source !== t.source) throw new Error('テクスチャ ' + i); });
  return true;
}

/** 揺れ物・表情・骨の数（meta.json の info） */
export function vrmInfo(json) {
  const v = json.extensions.VRMC_vrm, sb = json.extensions.VRMC_springBone || { springs: [], colliders: [] };
  return {
    bones: json.skins.reduce((s, k) => s + k.joints.length, 0), humanBones: Object.keys(v.humanoid.humanBones).length,
    expressions: Object.keys(v.expressions.preset || {}).length + Object.keys(v.expressions.custom || {}).length,
    morphTargets: Math.max(...json.meshes.map(m => (m.primitives[0].targets || []).length)),
    springs: sb.springs.length, springJoints: sb.springs.reduce((s, x) => s + x.joints.length, 0), colliders: sb.colliders.length,
    meshes: json.meshes.map(m => m.name),
  };
}

// ───────── 実行 ─────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const SRC = arg('src'); if (!SRC) { console.error('--src <持ち込んだ characters のフォルダ> が要る'); process.exit(2); }
  const OUT = resolve(ROOT, arg('out', 'shinshoku/assets/characters'));
  const WORK = resolve(arg('work', join(tmpdir(), 'vroid_game')));
  const PY = arg('python', process.env.PIL_PYTHON || 'python3');
  const CH = arg('chars', Object.keys(SOURCES).join(',')).split(',');
  for (const c of CH) {
    const S = SOURCES[c]; if (!S) throw new Error('知らない名前 ' + c);
    const f = join(SRC, S.src); if (!existsSync(f)) throw new Error('元が無い ' + f);
    const u8 = new Uint8Array(readFileSync(f)), srcSha = sha(u8), srcJson = readGLB(u8).json;
    const files = [];
    for (const [lod, L] of Object.entries(LODS)) {
      const { glb, info } = convertVRM(u8, { lod: L, python: PY, work: join(WORK, c + '_' + lod) });
      const name = c + L.suffix + '.vrm';
      writeFileSync(join(OUT, name), glb);
      files.push({ file: name, lod, bytes: glb.length, sha256: sha(glb), tris: info.tris, materials: info.materials, images: info.images, imageBytes: info.imageBytes, maxTexture: lod === 'pc' ? L.colorMax : L.colorMax });
      console.log(`  → ${name} ${(glb.length / 1048576).toFixed(2)}MB（画像 ${(info.imageBytes / 1048576).toFixed(2)}MB・疎なモーフ ${info.sparse}）tri ${info.tris}`);
    }
    if (has('no-meta')) continue;
    const m0 = srcJson.extensions.VRMC_vrm.meta;
    const lic = {
      id: 'VRM-1.0', commercial: 'yes', redistributeRaw: 'no', engines: ['any'],
      attribution: 'キャラクターモデル：WAKABA Project（VRoid Studio で作成）', verifiedBy: '', textUrl: 'https://vrm.dev/licenses/1.0/',
      note: 'VRM Public License 1.0（作者 WAKABA Project＝利用者本人）、VRoid Studio 標準パーツ＋自作。' + META_APPROVED_NOTE + '。元の VRM の条件は ' + `${m0.avatarPermission}・${m0.commercialUsage}・改変 ${m0.modification}・再配布 ${m0.allowRedistribution ? '可' : '不可'}`,
    };
    const meta = {
      id: 'char.' + c, name: S.name, provisional: false, test: false,
      note: '利用者が自分の PC で VRoid Studio＋Blender で作った VRM 1.0（2026-11-07 持ち込み・ブランチ models-from-pc の incoming/hq3d/characters/' + S.src + '）を tools/charkit/vroid_game.mjs でゲーム用に軽くした物。前の Blender 製は ' + c + '_bl.vrm（?vrmset=bl）',
      license: lic, author: 'WAKABA Project（利用者本人）',
      source: { type: 'self_made', tool: 'VRoid Studio 2.3.0＋Blender 5.x（VRM Add-on 4.10.3）', generator: 'tools/charkit/vroid_game.mjs', original: 'origin/models-from-pc:incoming/hq3d/characters/' + S.src, originalSha256: srcSha, originalBytes: u8.length,
        vrmMeta: { commercialUsage: META_APPROVED.commercialUsage, avatarPermission: META_APPROVED.avatarPermission, modification: META_APPROVED.modification, allowRedistribution: false, creditNotation: 'required' },
        vrmMetaOriginal: { commercialUsage: m0.commercialUsage, avatarPermission: m0.avatarPermission, modification: m0.modification, allowRedistribution: m0.allowRedistribution, creditNotation: m0.creditNotation },
        vrmMetaChange: META_APPROVED_NOTE },
      body: { height: S.height, sex: S.sex },
      info: vrmInfo(srcJson),
      files,
    };
    writeFileSync(join(OUT, c + '.meta.json'), JSON.stringify(meta, null, 1) + '\n');
    console.log(`✓ ${c}`);
  }
}
