// 『境界侵食』P13：環境の意味と物理の点検（浮いた看板・脚の無い椅子・空の店の看板・車のめり込み・ちらつく面・塞がれた戸口…）。
// node の中で区画の組み立て（shinshoku/world/*）を本物のまま動かし、作った形を 1 つずつ記録して規則に当てる（tools/shinshoku/audit/）。
// --shots で Playwright を使い、問題ごとに見やすいカメラ（歩ける側から・間に物が無い所）を選んで画面を撮る。
// 使い方：
//   node tools/shinshoku/audit_env.mjs [--out DIR] [--areas shotengai,alley,...] [--shots] [--max N] [--base http://localhost:8796] [--tag before]
//   node tools/shinshoku/audit_env.mjs --out DIR --recam DIR/issues_before.json --tag after --base ...   （同じカメラで撮り直す＝前後の比べ）
// 出力：DIR/report.md（区画ごと・カテゴリごとの数と一覧）・DIR/issues.json・DIR/shots/<tag>_<n>.png
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
await import('./audit/node_env.mjs');
const { recordAreas, AREA_IDS } = await import('./audit/record.mjs');
const { auditArea, applyAllow, CATS } = await import('./audit/rules.mjs');

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = arg('--out', 'shinshoku_audit'), TAG = arg('--tag', 'now'), MAX = +arg('--max', 6), BASE = arg('--base', 'http://localhost:8796').replace(/\/$/, '');
const AREAS = arg('--areas', '') ? arg('--areas').split(',') : AREA_IDS;
const NAMES = { shotengai: '町（住宅地・用水路・交差点・中央通り・駅前・アーケード・ガラスの広場・横丁）', alley: '裏路地', plaza: '商業施設の前', shelter: '体育館（避難所）', hospital: '病院', tunnel: '地下通路', office: '観測分室', lab: '地下研究区画', yard: '搬入ヤード', oldwing: '旧研究棟', atrium: '吹き抜け', town: '置換の町（第6章A）', ruins: '崩れた商店街（第6章A）', avenue: '中央通り（巨大・第6章A）', admin: '中央管理棟（第6章B）', abyss: '崩れた町（終章A）', kiroku: '記録の間（終章B）', epilogue: '結末' };
mkdirSync(join(OUT, 'shots'), { recursive: true });

let issues, R = null;
if (args.includes('--recam')) issues = JSON.parse(readFileSync(arg('--recam'), 'utf8'));
else {
  R = await recordAreas(AREAS);
  issues = [];
  for (const id of AREAS) issues.push(...auditArea(id, R[id].pieces, R[id].A));
  applyAllow(issues);
  // カメラ（撮る物だけ）
  pickShots(issues);
}
if (!args.includes('--recam')) {
  writeFileSync(join(OUT, 'issues.json'), JSON.stringify(issues));
  writeFileSync(join(OUT, 'report.md'), report(issues));
  const sum = summary(issues);
  console.log('区画\t' + CATS.join('\t'));
  for (const [a, c] of Object.entries(sum)) console.log(a + '\t' + CATS.map(k => `${c[k]?.error || 0}/${c[k]?.warn || 0}`).join('\t'));
  const E = issues.filter(i => i.sev === 'error').length, W = issues.filter(i => i.sev === 'warn').length;
  console.log(`error ${E}・warn ${W}`);
}
if (args.includes('--shots') || args.includes('--recam')) await shots(issues.filter(i => i.cam));

function summary(list) { const s = {}; for (const i of list) { const a = s[i.area] || (s[i.area] = {}); const c = a[i.cat] || (a[i.cat] = { error: 0, warn: 0 }); c[i.sev]++; } return s; }
function report(list) {
  const s = summary(list), L = [];
  L.push('# 境界侵食 環境の点検（audit_env）', '', `区画 ${AREAS.length}・error ${list.filter(i => i.sev === 'error').length}・warn ${list.filter(i => i.sev === 'warn').length}（数は error/warn）`, '');
  L.push('| 区画 | ' + CATS.join(' | ') + ' |', '|' + '---|'.repeat(CATS.length + 1));
  for (const a of AREAS) { const c = s[a] || {}; L.push(`| ${a}（${NAMES[a] || ''}） | ` + CATS.map(k => `${c[k]?.error || 0}/${c[k]?.warn || 0}`).join(' | ') + ' |'); }
  L.push('', 'カテゴリ：float 浮いた物・pierce めり込み・furniture 脚の無い家具・signage 店の看板と店の表・facade 建物の欠け／戸の枠・vehicle 車・zfight 重なる面・block 出入り口の前', '');
  for (const a of AREAS) {
    const li = list.filter(i => i.area === a); if (!li.length) continue;
    L.push(`## ${a}（${NAMES[a] || ''}）`, '');
    for (const i of li.slice(0, 400)) L.push(`- [${i.sev}] ${i.cat}：${i.msg}${i.text ? '「' + i.text + '」' : ''} @ (${(i.pos || []).join(', ')}) — ${i.at || ''}${i.allow ? '（許す理由：' + i.allow + '）' : ''}${i.shot ? ` ![](shots/${i.shot})` : ''}`);
    if (li.length > 400) L.push(`- …ほか ${li.length - 400} 件`);
    L.push('');
  }
  return L.join('\n');
}

/** 撮る問題を選び、カメラを決める（区画・カテゴリごとに最大 MAX・error を先に） */
function pickShots(list) {
  const per = new Map();
  const order = list.slice().sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'error' ? -1 : 1));
  let n = 0;
  for (const i of order) {
    const k = i.area + i.cat; const c = per.get(k) || 0; if (c >= MAX || !i.pos) continue;
    const cam = camFor(i); if (!cam) continue;
    per.set(k, c + 1); i.cam = cam; i.shot = `${TAG}_${String(n++).padStart(3, '0')}.png`;
  }
}
function camFor(i) {
  const pieces = R[i.area].pieces.filter(p => p.src !== 'wire');
  const t = i.pos.slice(), size = i.box ? Math.max(0.6, ...[0, 1, 2].map(k => i.box[1][k] - i.box[0][k])) : 1;
  if (i.cat === 'facade' && i.dir) { return { pos: [t[0] - i.dir[0] * 2.5, Math.max(1.6, t[1]), t[2] - i.dir[1] * 2.5], look: [t[0] + i.dir[0] * 10, t[1], t[2] + i.dir[1] * 10], fov: 60 }; }
  const dist = Math.min(14, Math.max(3.2, size * 1.6));
  const inside = (x, y, z) => pieces.some(p => x > p.min[0] && x < p.max[0] && y > p.min[1] && y < p.max[1] && z > p.min[2] && z < p.max[2]);
  const blocked = (a, b) => { for (const p of pieces) { if (p.max[1] < 0.05) continue; const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; let t0 = 0, t1 = 0.92; const d = [dx, dy, dz]; let ok = true; for (let k = 0; k < 3; k++) { if (Math.abs(d[k]) < 1e-9) { if (a[k] < p.min[k] || a[k] > p.max[k]) { ok = false; break; } continue; } let ta = (p.min[k] - a[k]) / d[k], tb = (p.max[k] - a[k]) / d[k]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } } if (ok) return true; } return false; };
  const yaws = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k * Math.PI / 4); if (i.dir) yaws.unshift(Math.atan2(i.dir[0], i.dir[1]));
  for (const dd of [dist, dist * 0.7, dist * 1.4]) for (const a of yaws) for (const hy of [Math.min(3, Math.max(1.5, t[1] + 0.3)), t[1] + 1.5]) {
    const c = [t[0] + Math.sin(a) * dd, hy, t[2] + Math.cos(a) * dd];
    if (inside(...c)) continue;
    if (blocked(c, t)) continue;
    return { pos: c.map(v => Math.round(v * 100) / 100), look: t, fov: 50 };
  }
  return { pos: [t[0] + 3, t[1] + 2, t[2] + 3], look: t, fov: 55, blocked: true };
}

async function shots(list) {
  const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 800, height: 500 } });
  const T = +process.env.SH_TIMEOUT || 120000; page.setDefaultTimeout(T);
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/shinshoku.html?autostart=1`);
  await page.waitForFunction(() => window.__sh && ['play', 'dialog'].includes(window.__sh.state().mode), null, { timeout: T, polling: 100 });
  await page.evaluate(() => { __sh.debug.skipDialog(); __sh.debug.skipCutscene(); __sh.debug.freezeEnemies(true); });
  await page.waitForTimeout(3000);
  let cur = 'shotengai';
  for (const i of list) {
    if (i.area !== cur) { await page.evaluate(id => { __sh.debug.closeMenu(); __sh.debug.area(id); }, i.area); cur = i.area; await page.waitForTimeout(2500); await page.evaluate(() => { __sh.debug.skipDialog(); __sh.debug.skipCutscene(); }); }
    const setCam = c => {
      const g = __sh.game; try { __sh.debug.skipDialog(); __sh.debug.skipCutscene(); } catch (e) {}
      g.player.pos.set(c.look[0], -50, c.look[2]); g.player.root.visible = false; if (g.companion) g.companion.root.visible = false; for (const e of g.enemies || []) e.root.visible = false; if (g.child) g.child.root.visible = false;
      g.cineCam = { pos: c.pos, look: c.look, fov: c.fov || 50 }; g.mode = 'pause';
      const ui = document.getElementById('sh-ui'); if (ui) ui.style.display = 'none';
    };
    await page.evaluate(setCam, i.cam);
    await page.waitForTimeout(1200);
    await page.evaluate(setCam, i.cam);
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(OUT, 'shots', i.shot) });
  }
  if (errs.length) console.log('page errors:', errs.slice(0, 5));
  await b.close();
  console.log(`撮影 ${list.length} 枚 → ${join(OUT, 'shots')}`);
}
