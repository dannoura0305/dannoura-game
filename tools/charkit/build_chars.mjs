// リポジトリの中でキャラクターの VRM 1.0 を作る（Blender の bpy → 包み → VRM）。docs/shinshoku/VROID_GUIDE.md §0・ASSET_IMPORT.md §5。
//   node tools/charkit/build_chars.mjs [--chars dannoura,dannoura_white,companion] [--lods pc,low] [--blender <blender の実行ファイル>] [--python <bpy の入った python>]
//                                     [--build build/chars] [--out shinshoku/assets/characters] [--jobs 3] [--skip-blender]（包みから VRM だけ作り直す）
// Blender：既定は「blender」（--background --python tools/blender/char/build_char.py -- …）。bpy のモジュールの python があれば --python（環境変数 BPY_PYTHON）。
// 出る物：<out>/<名前>.vrm（PC）・<名前>_low.vrm（スマホ）・<名前>.meta.json（sha256・三角形・材質・表情・揺れ物・体の寸法・出典・利用条件）。
// 途中の物（*.pack.json・PNG）は --build（Git に入れない）。
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packToVRM } from './vrm_from_pack.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);
const CHARS = arg('chars', 'dannoura,dannoura_white,companion').split(',');
const LODS = arg('lods', 'pc,low').split(',');
const BUILD = resolve(ROOT, arg('build', 'build/chars'));
const OUT = resolve(ROOT, arg('out', 'shinshoku/assets/characters'));
const PY = arg('python', process.env.BPY_PYTHON || null);
const BLENDER = arg('blender', process.env.BLENDER || 'blender');
const JOBS = +arg('jobs', 3);
const SCRIPT = join(ROOT, 'tools/blender/char/build_char.py');
const sha = b => createHash('sha256').update(b).digest('hex');

function run(c, lod) {
  const a = ['--char', c, '--out', BUILD, '--lod', lod];
  const [cmd, args] = PY ? [PY, [SCRIPT, ...a]] : [BLENDER, ['--background', '--python', SCRIPT, '--', ...a]];
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', d => { log += d; });
    p.stderr.on('data', d => { log += d; });
    p.on('close', code => {
      const last = log.trim().split('\n').filter(l => l.startsWith('{"char"')).pop();
      if (code !== 0 || !last) { console.error(log.split('\n').slice(-25).join('\n')); rej(new Error(`${c}/${lod}：Blender の組み立てに失敗（${code}）`)); return; }
      console.log(`  ✓ ${c}/${lod} ${last}`);
      res(JSON.parse(last));
    });
  });
}

mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });
if (!has('skip-blender')) {
  const jobs = [];
  for (const c of CHARS) for (const l of LODS) jobs.push([c, l]);
  console.log(`Blender で ${jobs.length} 件（同時 ${JOBS}）…`);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, async () => { while (i < jobs.length) { const [c, l] = jobs[i++]; await run(c, l); } }));
}
for (const c of CHARS) {
  const files = [];
  let info = null, pack0 = null;
  for (const l of LODS) {
    const name = l === 'pc' ? c : c + '_low';
    const pf = join(BUILD, name + '.pack.json');
    if (!existsSync(pf)) { console.warn('包みが無い：', pf); continue; }
    const pack = JSON.parse(readFileSync(pf, 'utf8'));
    const { vrm, info: vi } = packToVRM(pack, f => new Uint8Array(readFileSync(join(BUILD, f))));
    writeFileSync(join(OUT, name + '.vrm'), vrm);
    files.push({ file: name + '.vrm', lod: l, bytes: vrm.length, sha256: sha(vrm), tris: vi.tris, materials: vi.materials, images: vi.images, imageBytes: vi.imageBytes });
    if (l === 'pc') { info = vi; pack0 = pack; }
    console.log(`  → ${name}.vrm ${(vrm.length / 1048576).toFixed(2)}MB tri ${vi.tris}`);
  }
  if (!pack0) continue;
  const meta = {
    id: 'char.' + c, name: pack0.meta.name, provisional: false, test: false,
    note: 'リポジトリの中で Blender（bpy）で作った VRM 1.0（tools/blender/char/build_char.py → tools/charkit/build_chars.mjs）。VRoid Studio などで作った本番のモデルに差し替えられる（docs/shinshoku/VROID_GUIDE.md）',
    license: { id: 'project', commercial: 'yes', redistributeRaw: 'yes', attribution: '', verifiedBy: '' },
    author: 'project',
    source: { type: 'self_made', tool: 'blender 5.2（bpy）', generator: 'tools/blender/char/build_char.py', vrmMeta: { commercialUsage: pack0.meta.commercialUsage, avatarPermission: pack0.meta.avatarPermission } },
    body: pack0.info.body,
    info: { bones: info.bones, humanBones: info.human, expressions: info.expressions, springs: info.springs, springJoints: info.springJoints, colliders: info.colliders, parts: pack0.info.parts },
    files,
  };
  writeFileSync(join(OUT, c + '.meta.json'), JSON.stringify(meta, null, 1) + '\n');
  // 素材ライブラリ（wakaba-assets/entries/character/char.<名前>/meta.json）：権利の門と目録（tools/mapkit/catalog.mjs）のため。実物はゲームの場所（storage.runtime）
  if (!has('no-library')) {
    const pc = files.find(f => f.lod === 'pc'), lo = files.find(f => f.lod === 'low');
    const lib = {
      id: 'char.' + c, version: 1, name: { ja: pack0.meta.name.replace(/（.*$/, ''), en: (pack0.meta.name.match(/（(.*)）/) || [])[1] || c },
      category: 'character', tags: ['キャラクター', 'VRM', '手続き', '自作', 'Blender'],
      source: { type: 'self_made', author: 'わかば（リポジトリの手続きの生成：Claude Code が書いたスクリプト）', generator: 'tools/blender/char/build_char.py', url: '' },
      license: { id: 'own', commercial: 'yes', redistributeRaw: 'yes', engines: ['any'], attribution: '', verifiedBy: '', textUrl: 'docs/shinshoku/VROID_GUIDE.md' },
      tech: { formats: ['vrm'], tris: pc ? pc.tris : 0, lods: files.map(f => f.tris), texRes: 2048, sizeM: [0.9, +(pack0.info.body.height || 1.64).toFixed(2), 0.6] },
      use: ['キャラクター（境界侵食）'], usedBy: [{ project: 'shinshoku', since: '2026-10-18' }], status: 'draft',
      storage: { original: 'tools/blender/char（スクリプトが原本）', runtime: 'shinshoku/assets/characters/' + c + '.vrm', sha256: pc ? pc.sha256 : '' },
    };
    if (lo) lib.storage.runtimeLow = undefined;
    const ldir = join(ROOT, 'wakaba-assets/entries/character', 'char.' + c);
    mkdirSync(ldir, { recursive: true });
    writeFileSync(join(ldir, 'meta.json'), JSON.stringify(lib, null, 1) + '\n');
  }
}
console.log('できた：' + CHARS.join('・'));
