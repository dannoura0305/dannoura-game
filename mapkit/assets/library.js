// 共有素材ライブラリ（方式 C：ブラウザ版と UE5 版が 1 つの置き場を使う）の 1 素材＝1 フォルダの検査と、目録（catalog.json）の 1 行を作る。
// 純粋関数（ファイルの読み書きは tools/mapkit/catalog.mjs）。docs/wakaba-mapkit/10 §2。
//
// wakaba-assets/entries/<category>/<id>/
//   meta.json          素材メタデータ v1.1（必須・ライセンス門の対象）
//   sources.json       原本の指し先（wakaba-asset-sources/1：場所＋sha256。重い物は Git に入れない）
//   web/               ブラウザ版の書き出し（.glb・.ktx2・.png など）。公開の Web の門が pass の物だけ置ける
//   ue5/import.json    UE5 の取り込みの設定（wakaba-ue5-import/1：/Game の場所・Nanite・当たり）
//   source/            原本の実物（.blend・.fbx・.usd）。.gitignore 済み（各自の PC・NAS から置く）
import { validate, formatErrors } from '../core/schema.js';
import { IDS } from '../core/schemas.js';
import { evaluateTargets } from './gate.js';

export const LIB_RULES = {
  NO_META: 'meta.json が無い（1 素材＝1 フォルダ。meta.json が正本）',
  BAD_JSON: 'JSON として読めない',
  META_SCHEMA: 'meta.json がスキーマ（素材メタデータ v1.1）に合わない',
  FOLDER_ID: 'フォルダの名前（<id>）と meta.json の id が違う',
  FOLDER_CATEGORY: 'フォルダの分類（<category>）と meta.json の category が違う',
  DUP_ID: '同じ id の素材が 2 つある',
  SOURCES_SCHEMA: 'sources.json がスキーマ（wakaba-asset-sources/1）に合わない',
  SOURCES_ID: 'sources.json の id が meta.json と違う',
  SOURCE_HASH: 'source/ の実物の sha256 が sources.json と合わない',
  UE5_SCHEMA: 'ue5/import.json がスキーマ（wakaba-ue5-import/1）に合わない',
  UE5_ID: 'ue5/import.json の id が meta.json と違う',
  WEB_BLOCKED: 'web/ に書き出しがあるが、公開の Web の門が block：公開のリポジトリ・Pages に置けない（消すか、PC 版だけにする）',
  WEB_FORMAT: 'web/ のファイルの形式が Web の設定（targets[web].settings）に無い',
  WEB_TOO_BIG: 'web/ のファイルが大きすぎる（targets[web].settings.maxFileMB）',
  WEB_TEX_SIZE: 'web/ のテクスチャの辺が上限（targets[web].settings.textures.maxSize）を超える',
  WEB_BAD_FILE: 'web/ のファイルの中身が形式と合わない（glb の印・PNG の印など）',
  GENERATOR_MISSING: 'source.generator（作った道具）がリポジトリに無い：手続きの素材は作り直せる道具が要る',
  WEB_MISSING: 'meta.json の material.maps／kit に書いた web/ のファイルが無い',
};

const EXT = f => (f.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();

/** 画像・glb の頭だけを読む：{ kind, width?, height?, ok } */
export function sniff(name, bytes) {
  const b = bytes, ext = EXT(name), u32le = o => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0, u32be = o => (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0;
  if (ext === 'glb') return { kind: 'glb', ok: b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'glTF' && u32le(4) === 2 };
  if (ext === 'png') { const ok = b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71; return { kind: 'texture', ok, width: ok ? u32be(16) : 0, height: ok ? u32be(20) : 0 }; }
  if (ext === 'ktx2') { const ok = b.length >= 28 && b[1] === 0x4b && b[2] === 0x54 && b[3] === 0x58 && b[5] === 0x32; return { kind: 'texture', ok, width: ok ? u32le(20) : 0, height: ok ? u32le(24) : 0 }; }
  if (ext === 'jpg' || ext === 'jpeg') return { kind: 'texture', ok: b[0] === 0xff && b[1] === 0xd8 };
  if (ext === 'webp') return { kind: 'texture', ok: String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP' };
  if (ext === 'gltf' || ext === 'bin') return { kind: ext, ok: true };
  return { kind: 'other', ok: true };
}

/**
 * 1 素材のフォルダを検査して目録の 1 行を作る。
 * pkg：{ dir（ライブラリの根からの 'rock/rock.x'）, meta, sources?, ue5?, web: [{ name, bytes: Uint8Array }], sourceFiles?: { 'source/x.fbx': sha256 } , parseErrors: [{file,msg}] }
 * 戻り値：{ entry（catalog.json の 1 行）| null, errors: [{code,msg,file}], warnings }
 */
export function checkPackage(pkg, { config, projectId = 'shinshoku', registry }) {
  const errors = [], warnings = [];
  const E = (code, file, extra) => errors.push({ code, file, msg: LIB_RULES[code] + (extra ? `（${extra}）` : '') });
  for (const p of pkg.parseErrors || []) E('BAD_JSON', p.file, p.msg);
  const m = pkg.meta;
  if (!m) { if (!pkg.parseErrors || !pkg.parseErrors.some(p => /meta\.json$/.test(p.file))) E('NO_META', pkg.dir); return { entry: null, errors, warnings }; }
  const mv = validate(IDS.asset, m, { registry });
  if (!mv.valid) E('META_SCHEMA', 'meta.json', formatErrors(mv.errors).slice(0, 3).join('／'));
  const [cat, id] = pkg.dir.split('/').slice(-2);
  if (id !== m.id) E('FOLDER_ID', pkg.dir, `${id} ≠ ${m.id}`);
  if (cat !== m.category) E('FOLDER_CATEGORY', pkg.dir, `${cat} ≠ ${m.category}`);

  // 原本の指し先
  let sources = [];
  if (pkg.sources) {
    const sv = validate(IDS.assetSources, pkg.sources, { registry });
    if (!sv.valid) E('SOURCES_SCHEMA', 'sources.json', formatErrors(sv.errors).slice(0, 3).join('／'));
    else {
      if (pkg.sources.id !== m.id) E('SOURCES_ID', 'sources.json', pkg.sources.id);
      sources = pkg.sources.files.map(f => ({ role: f.role, path: f.path, storage: f.storage, sha256: f.sha256, bytes: f.bytes ?? null }));
      for (const f of pkg.sources.files) {
        const have = pkg.sourceFiles && pkg.sourceFiles[f.path];
        if (have && have !== f.sha256) E('SOURCE_HASH', f.path, `${have.slice(0, 12)}… ≠ ${f.sha256.slice(0, 12)}…`);
      }
    }
  } else warnings.push({ code: 'NO_SOURCES', file: 'sources.json', msg: 'sources.json が無い：原本の場所と sha256 を書くと、別の PC・NAS から作り直せる' });

  // 配信先ごとの門
  const gate = evaluateTargets(m, config, projectId, { schemaErrors: mv.errors });
  const targets = Object.fromEntries(Object.entries(gate).map(([t, r]) => [t, { result: r.result, reasons: r.reasons.map(x => x.code) }]));

  // web/：公開の Web の門が pass の時だけ置ける
  const webT = ((((config || {}).projects || {})[projectId] || {}).targets || []).find(t => t.public) || null;
  const ws = (webT && webT.settings) || {}, tex = ws.textures || {};
  const webFiles = [];
  for (const f of pkg.web || []) {
    const s = sniff(f.name, f.bytes), ext = EXT(f.name);
    webFiles.push({ file: `web/${f.name}`, bytes: f.bytes.length, ...(s.width ? { width: s.width, height: s.height } : {}) });
    if (!s.ok) E('WEB_BAD_FILE', `web/${f.name}`);
    const allowed = [...(ws.formats || []), ...(tex.formats || []), 'gltf', 'bin'];
    if (ws.formats && !allowed.includes(ext)) E('WEB_FORMAT', `web/${f.name}`, `.${ext}：${allowed.join('・')}`);
    if (ws.maxFileMB && f.bytes.length > ws.maxFileMB * 1048576) E('WEB_TOO_BIG', `web/${f.name}`, `${(f.bytes.length / 1048576).toFixed(1)}MB > ${ws.maxFileMB}MB`);
    if (tex.maxSize && s.width && Math.max(s.width, s.height) > tex.maxSize) E('WEB_TEX_SIZE', `web/${f.name}`, `${s.width}×${s.height} > ${tex.maxSize}`);
  }
  if (webFiles.length && webT && gate[webT.id] && gate[webT.id].result !== 'pass') E('WEB_BLOCKED', 'web/', gate[webT.id].reasons.map(x => x.code).join(','));

  // ue5/import.json
  let ue5 = null;
  if (pkg.ue5) {
    const uv = validate(IDS.ue5Import, pkg.ue5, { registry });
    if (!uv.valid) E('UE5_SCHEMA', 'ue5/import.json', formatErrors(uv.errors).slice(0, 3).join('／'));
    else {
      if (pkg.ue5.id !== m.id) E('UE5_ID', 'ue5/import.json', pkg.ue5.id);
      ue5 = { assetType: pkg.ue5.assetType, gamePath: pkg.ue5.gamePath, pivot: pkg.ue5.pivot || (m.tech && m.tech.pivot) || 'bottom_center', source: pkg.ue5.source };
      if (gate.ue5 && gate.ue5.result !== 'pass') warnings.push({ code: 'UE5_BLOCKED', file: 'ue5/import.json', msg: `UE5 の門が block（${gate.ue5.reasons.map(x => x.code).join(',')}）：PC 版の地図に使わない` });
      if (!sources.some(s => s.path === pkg.ue5.source.file)) warnings.push({ code: 'UE5_SOURCE', file: 'ue5/import.json', msg: `source.file「${pkg.ue5.source.file}」が sources.json に無い` });
    }
  }

  if (m.source && m.source.generator && pkg.generatorExists === false) E('GENERATOR_MISSING', 'meta.json', m.source.generator);
  const webNames = new Set((pkg.web || []).map(f => f.name));
  if (m.material && m.material.maps) for (const [k, bySize] of Object.entries(m.material.maps)) for (const f of Object.values(bySize)) if (!webNames.has(f)) E('WEB_MISSING', `web/${f}`, k);
  if (m.kit && !webNames.has(`${m.id}.glb`)) E('WEB_MISSING', `web/${m.id}.glb`, 'kit');
  for (const t of Object.values(gate)) for (const w of t.warnings || []) if (!warnings.some(x => x.code === w.code)) warnings.push({ code: w.code, file: 'meta.json', msg: w.msg });
  const entry = {
    id: m.id, version: m.version, category: m.category, name: m.name, status: m.status, tags: m.tags || [],
    dir: pkg.dir, license: { id: (m.license || {}).id || null, attribution: (m.license || {}).attribution || '' },
    tech: { pivot: (m.tech || {}).pivot || null, sizeM: (m.tech || {}).sizeM || null, tris: (m.tech || {}).tris ?? null },
    targets, sources, web: webFiles, ue5,
    ...(m.material ? { material: m.material } : {}),            // ブラウザ版の描画が使う（材質の tileM・大きさ・ファイル）
    ...(m.kit ? { kit: { nodes: m.kit.nodes, variants: m.kit.variants, lodDist: m.kit.lodDist, impostor: m.kit.impostor, materials: m.kit.materials, ...(m.kit.cardDup != null ? { cardDup: m.kit.cardDup } : {}) } } : {}),   // cardDup：葉のカードの写しの数（境界侵食 P16：松は 0）
  };
  return { entry, errors, warnings };
}

/** 目録（catalog.json）の形。entries は id の順（同じ中身なら同じバイト列＝差分が読みやすい） */
export function makeCatalog(entries, { config, projectId = 'shinshoku' } = {}) {
  const p = ((config || {}).projects || {})[projectId] || {};
  return {
    catalog: 'wakaba-assets/1',
    _note: 'わかばの素材の目録（生成物：node tools/mapkit/catalog.mjs で作る。手で書かない）。正本は entries/<category>/<id>/meta.json。targets は配信先ごとのライセンス門の結果（web＝公開のブラウザ版・ue5＝高性能 PC 版）。docs/wakaba-mapkit/10 §2。',
    project: projectId, targets: (p.targets || []).map(t => t.id),
    entries: entries.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  };
}

/** 目録から「layout の kind（＝素材の id）→ UE5 の /Game の場所」の表（UE の取り込みの差し替え用。ue5 の門が pass の物だけ） */
export function ue5AssetMap(catalog) {
  const out = {};
  for (const e of catalog.entries || []) if (e.ue5 && e.targets && e.targets.ue5 && e.targets.ue5.result === 'pass') out[e.id] = { path: e.ue5.gamePath, pivot: e.ue5.pivot };
  return out;
}
