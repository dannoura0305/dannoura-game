'use strict';
// ══════════════════════════════════════════════════════════════════
//  人型でない 3D モデル（ドラゴンの .glb）を、本物のブラウザの描画器（Cast Engine）で確かめる
//
//   使い方:  node hq3d/tools/creature_check.js <モデル.glb> [画像の出力先] [キャラID=rune]
//   Cast Engine の tests/model3d_check.js（VRM 用）と同じしくみ。VRM の表情・揺れものの代わりに、
//   顎・頭・首の骨、まばたきのモーフ、待機の動き（idle）、口・まばたき・首で絵が変わることを見る。
//   最後に本物のステージ（ルーンは 3 人のシーン）で、出る・喋ると口が開くを確かめる。
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = 'C:/wakaba/wakaba-system/cast-engine';
const MODEL = path.resolve(process.argv[2] || '');
const SHOTS = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'wce-model-shots'));
const CHAR = process.argv[4] || 'rune';
if (!process.argv[2] || !fs.existsSync(MODEL)) { console.log('使い方: node tests/model3d_check.js <モデル> [出力先] [キャラID]'); process.exitCode = 2; return; }
fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wce-3dc-'));

let pass = 0, failN = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✔ ' + name + (detail ? '  … ' + detail : '')); }
  else { failN++; console.log('  ✘ ' + name + (detail ? '  … ' + detail : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
async function api(port, method, p, body) {
  const res = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

class Page {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.wait = new Map(); this.errors = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.wait.has(m.id)) { this.wait.get(m.id)(m); this.wait.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') this.errors.push(String(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text).slice(0, 300));
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') this.errors.push(m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
    });
  }
  send(method, params) { const id = ++this.id; return new Promise((res) => { this.wait.set(id, res); this.ws.send(JSON.stringify({ id, method, params: params || {} })); }); }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text);
    return r.result.result.value;
  }
  async goto(url) { await this.send('Page.navigate', { url }); await sleep(1200); }
  async until(expr, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await this.eval(expr)) return true; await sleep(200); }
    return false;
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.result.data, 'base64'));
  }
}

function saveDataUrl(name, url) {
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
}

async function main() {
  const exe = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
  if (!exe) { console.log('Chrome / Edge が見つかりません。**確かめていません**'); process.exitCode = 2; return; }
  const dir = path.join(TMP, 'storage', 'models3d', CHAR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.basename(MODEL);
  fs.copyFileSync(MODEL, path.join(dir, file));

  const port = await freePort(), busPort = await freePort();
  const server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT, stdio: 'ignore',
    env: Object.assign({}, process.env, { WCE_PORT: String(port), WCE_BUS_PORT: String(busPort), WCE_DB_PATH: path.join(TMP, 'wce.db'), WCE_STORAGE_ROOT: path.join(TMP, 'storage'), WCE_ISOLATED: '1' }),
  });
  const profileDir = path.join(TMP, 'chrome');
  let chrome = null;
  try {
    for (let i = 0; i < 60; i++) { try { if ((await api(port, 'GET', '/health')).status === 200) break; } catch { /* まだ */ } await sleep(250); }

    chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run', '--enable-unsafe-swiftshader',
      '--window-size=1280,720', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
    const portFile = path.join(profileDir, 'DevToolsActivePort');
    for (let i = 0; i < 80 && !fs.existsSync(portFile); i++) await sleep(250);
    const debugPort = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const page = new Page(ws);
    await page.send('Page.enable'); await page.send('Runtime.enable');

    console.log(`\nモデル: ${file}（${(fs.statSync(MODEL).size / 1048576).toFixed(1)} MB）`);
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/model3d-test?dir=${encodeURIComponent(CHAR)}`);
    const ok = await page.until('!!window.__rig', 120000);
    check('描画器で読み込める', ok, `${((Date.now() - t0) / 1000).toFixed(1)} 秒 ${page.errors.join(' / ')}`);
    if (!ok) return;

    const r = await page.eval(`(async () => {
      const r = window.__rig, sleep = (ms) => new Promise((s) => setTimeout(s, ms));
      const grab = () => { r.render(); return r.canvas.toDataURL('image/png'); };
      const out = { images: {} };
      out.info = { format: r.format, bones: Object.keys(r.bones || {}), morphs: (r.morphs || []).map((m) => Object.keys(m.morphTargetDictionary)),
                   idle: !!r.mixer, size: r.sizeInfo };
      await sleep(600);
      out.images.idle = grab();
      r.applyMouth('a', 1); await sleep(700); out.images.mouth_a = grab();
      r.applyMouth('o', 1); await sleep(700); out.images.mouth_o = grab();
      r.applyMouth('x', 0); await sleep(700); out.images.mouth_closed = grab();
      out.moods = {};
      for (const m of ['calm', 'gentle_smile', 'thinking', 'serious', 'quiet_sorrow', 'guarding_eyes', 'awkward']) {
        r.setExpression(m); await sleep(900); out.moods[m] = grab();
      }
      r.setExpression(null); await sleep(700);
      const t0 = performance.now(); const shots = [];
      for (let i = 0; i < 3; i++) { await sleep(900); shots.push(grab()); }
      out.idleMoves = new Set(shots).size;
      const root = r.root;
      for (const [name, rad] of [['back', Math.PI], ['side', Math.PI / 2], ['q', Math.PI / 5]]) { root.rotation.y = rad; await sleep(500); out.images[name] = grab(); }
      root.rotation.y = 0; await sleep(300);
      // 顔の寄り（表情ごと・正面と斜め）。正射影のカメラの枠を頭の骨のまわりへ縮める
      const hb = (r.bones || {}).head;
      if (hb && r.camera && r.camera.isOrthographicCamera) {
        const cam = r.camera, keep = { l: cam.left, r: cam.right, t: cam.top, b: cam.bottom, p: cam.position.clone() };
        const V3 = hb.getWorldPosition(cam.position.clone()).constructor;
        const H = (r.sizeInfo && r.sizeInfo.h) || 2;
        const half = H * ${Number(process.env.FACE_HALF || 0.09)};
        out.faces = {};
        const shoot = async (key) => {
          r.root.updateMatrixWorld(true);
          const p = hb.getWorldPosition(new V3());
          p.z += 0; cam.position.set(p.x, p.y + half * 0.15, keep.p.z); cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
          cam.updateProjectionMatrix(); cam.lookAt(p.x, p.y + half * 0.15, p.z);
          out.faces[key] = grab();
          const on = []; for (const o of (r.morphs || []).slice(0, 1)) { const d = o.morphTargetDictionary, w = o.morphTargetInfluences; for (const n in d) if (w[d[n]] > 0.01) on.push(n + '=' + w[d[n]].toFixed(2)); }
          (out.faceMorphs = out.faceMorphs || {})[key] = on.join(' ');
        };
        r.setExpression(null); await sleep(500);
        for (const [view, rad] of [['front', 0], ['q', Math.PI / 4], ['side', Math.PI / 2]]) {
          root.rotation.y = rad; await sleep(300);
          const names = (r.morphs || []).some((o) => o.morphTargetDictionary.joy !== undefined)
            ? [null, 'calm', 'smile', 'joy', 'shy', 'thinking', 'curious', 'surprised', 'confused', 'determined', 'angry', 'sad', 'relief']
            : [null, 'calm', 'gentle_smile', 'thinking', 'serious', 'quiet_sorrow', 'guarding_eyes', 'awkward'];
          for (const m of names) {
            if (view !== 'front' && m && !['gentle_smile', 'quiet_sorrow', 'smile', 'joy', 'angry', 'sad'].includes(m)) continue;
            r.setExpression(null); r.moodTarget = m ? { [m]: 1 } : {}; await sleep(700); await shoot(view + '_' + (m || 'neutral'));  // モーフを名前どおりに
          }
          r.applyMouth('a', 1); await sleep(600); await shoot(view + '_mouth_a'); r.applyMouth('x', 0);
        }
        r.setExpression(null); root.rotation.y = 0;
        cam.left = keep.l; cam.right = keep.r; cam.top = keep.t; cam.bottom = keep.b; cam.position.copy(keep.p); cam.updateProjectionMatrix();
        await sleep(300);
      }
      return out;
    })()`);
    for (const k of Object.keys(r.images)) saveDataUrl(k, r.images[k]);
    for (const k of Object.keys(r.faces || {})) saveDataUrl('face_' + k, r.faces[k]);
    for (const k of Object.keys(r.faceMorphs || {})) console.log('  顔のモーフ', k, ':', r.faceMorphs[k]);
    console.log('  骨:', r.info.bones.join(','), '/ モーフ:', JSON.stringify([...new Set(r.info.morphs.flat())]), '/ 待機の動き:', r.info.idle, '/ 大きさ:', JSON.stringify(r.info.size));
    check('人型でない .glb として読まれる', r.info.format === 'glb', r.info.format);
    check('顎・頭・首の骨が見つかる', ['jaw', 'head', 'neck'].every((k) => r.info.bones.includes(k)), r.info.bones.join(','));
    check('まばたきのモーフがある', r.info.morphs.some((m) => m.includes('blink')));
    check('待機の動き（idle）がある', r.info.idle);
    check('口を開けると絵が変わる', r.images.mouth_a !== r.images.idle && r.images.mouth_a !== r.images.mouth_closed);
    check('じっとしていても動いている（待機の動き）', r.idleMoves >= 2, `${r.idleMoves} 通り`);
    const moodMorphs = ['calm', 'gentle_smile', 'thinking', 'serious', 'quiet_sorrow', 'guarding_eyes', 'awkward'].filter((m) => r.info.morphs.some((x) => x.includes(m)));
    check('設定画の表情 7 種のモーフがある', moodMorphs.length === 7, moodMorphs.join(','));
    for (const k of Object.keys(r.moods)) saveDataUrl('mood_' + k, r.moods[k]);
    check('表情ごとに絵が変わる', new Set(Object.values(r.moods)).size === 7, `${new Set(Object.values(r.moods)).size} 通り`);
    await page.shot('testpage');

    // まばたきと首は確認画面のボタンで（画面の毎コマ処理が優先するため）
    await page.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent === 'まばたき').click()`);
    await sleep(700);
    saveDataUrl('blink', await page.eval(`(window.__rig.render(), window.__rig.canvas.toDataURL('image/png'))`));
    const blinkVal = await page.eval(`Math.max(0, ...window.__rig.morphs.map((m) => m.morphTargetDictionary.blink !== undefined ? m.morphTargetInfluences[m.morphTargetDictionary.blink] : 0))`);
    check('まばたきが効く', blinkVal > 0.9, String(blinkVal));
    await page.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent === 'まばたき').click()`);
    for (const [label, name] of [['右', 'head_right'], ['上', 'head_up']]) {
      await page.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent === '${label}').click()`);
      await sleep(900);
      saveDataUrl(name, await page.eval(`(window.__rig.render(), window.__rig.canvas.toDataURL('image/png'))`));
    }
    await page.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent === '正面').click()`);

    // 本物のステージ
    if (CHAR === 'wakaba' || CHAR === 'dannoura' || CHAR === 'rune') {
      console.log('\n本物のステージ');
      const cur = await api(port, 'GET', `/api/cast/characters/${CHAR}/profile`);
      const p = cur.json.data.profile;
      p.rig = Object.assign({}, p.rig, { kind: 'model3d', skeleton: 'dragon', model: { root: 'models', dir: CHAR, file } });
      const saved = await api(port, 'POST', `/api/cast/characters/${CHAR}/profile`, p);
      check('プロフィールを 3D に切り替えられる', saved.status === 200, JSON.stringify(saved.json.error));
      // talk はわかばだけ。だんのうらは 2 人、ルーンは 3 人のシーンで見る
      const scene = CHAR === 'wakaba' ? 'talk' : (CHAR === 'dannoura' ? 'duo' : 'trio');
      await api(port, 'POST', '/api/cast/sessions', { kind: 'rehearsal', sceneKey: scene });
      await api(port, 'POST', `/api/cast/scenes/${scene}/activate`, {});
      await page.goto(`http://127.0.0.1:${port}/stage/${scene}`);
      const loaded = await page.until(`(() => { const a = window.wceState().actors['${CHAR}']; return !!(a && a.model3d); })()`, 120000);
      check('ステージに 3D で出る', loaded, page.errors.slice(-3).join(' / '));
      if (loaded) {
        const fps = await page.eval(`new Promise((res) => { let n = 0; const t0 = performance.now(); (function f(){ n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); })(); })`);
        console.log(`    描画: ${fps.toFixed(1)} fps（GPU なしのソフト描画。実機の性能ではない）`);
        await page.shot('stage_idle');
        await page.eval(`(() => {
          window.__rec = { max: {aa:0,ih:0,ou:0,ee:0,oh:0} };
          (function f(){
            const w = window.wceState().actors['${CHAR}'];
            if (w && w.model3d && w.model3d.mouth) for (const k in window.__rec.max) window.__rec.max[k] = Math.max(window.__rec.max[k], w.model3d.mouth[k] || 0);
            window.__recId = requestAnimationFrame(f);
          })();
        })()`);
        const say = await api(port, 'POST', '/api/cast/command', { command: {
          v: 1, speaker: CHAR, text: 'あいうえお、あいうえお、おはようございます。', emotion: 'joy', durationSec: 6,
          origin: { kind: 'human', status: 'success', method: 'HUMAN' },
        } });
        check('発話がステージへ届く', say.status === 200 && say.json.data.played === true);
        await sleep(1500);
        await page.shot('stage_speaking');
        await page.until(`!window.wceState().actors['${CHAR}'].speaking`, 12000);
        const rec = await page.eval('(cancelAnimationFrame(window.__recId), window.__rec)');
        console.log('    口の最大値:', JSON.stringify(rec.max));
        check('発話中に口が開く', Object.values(rec.max).some((v) => v > 0.3), JSON.stringify(rec.max));
      }
    }
    ws.close();
  } finally {
    if (chrome) chrome.kill();
    server.kill();
    await sleep(800);
    try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* 一時フォルダ */ }
  }
  console.log(`\n  合格 ${pass} / 不合格 ${failN}`);
  console.log('  画像: ' + SHOTS);
  process.exitCode = failN ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
