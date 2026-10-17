// charkit/anim/clips/*.json（動きのデータの正本）→ charkit/anim/clips/index.js（ブラウザ・node が同じ値を同期で読む写し）。
// JSON を直したら：node tools/charkit/build_clips.mjs（tests/shinshoku-p13-motion.test.mjs が JSON と写しの一致を確かめる）
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = join(dirname(fileURLToPath(import.meta.url)), '../../charkit/anim/clips');
export function loadClipJson() {
  const clips = {}, order = [];
  for (const f of readdirSync(dir).filter(f => /^loco_.*\.json$/.test(f))) { const c = JSON.parse(readFileSync(join(dir, f), 'utf8')); clips[c.id] = c; }
  for (const c of Object.values(clips).sort((a, b) => a.speed.ref - b.speed.ref)) order.push(c.id);
  const pers = JSON.parse(readFileSync(join(dir, 'personality.json'), 'utf8')).characters;
  return { clips: Object.assign({ order }, clips), pers };
}
if (process.argv[1] && process.argv[1].endsWith('build_clips.mjs')) {
  const { clips, pers } = loadClipJson();
  const src = `// 自動で作る写し（正本は同じフォルダの *.json）：node tools/charkit/build_clips.mjs で作り直す。手で直さない。\n` +
    `export const CLIPS = ${JSON.stringify(clips)};\nexport const PERSONALITY = ${JSON.stringify(pers)};\n`;
  writeFileSync(join(dir, 'index.js'), src);
  console.log('clips', clips.order.join(', '), '·', Object.keys(pers).join(', '));
}
