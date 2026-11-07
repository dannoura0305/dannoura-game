'use strict';
// ══════════════════════════════════════════════════════════════════
//  揺れの確認: 本物のブラウザの描画器（Cast Engine）で、揺れもの（髪・尻尾・鎖）を実際に動かして撮る
//
//   使い方:  node hq3d/tools/sway_check.js <モデルのファイル> [画像の出力先] [キャラID]
//   Cast Engine の tests/model3d_check.js と同じしくみ（一時フォルダ・一時 DB のサーバー・ヘッドレス Chrome）。
//   体を左右に揺らす・その場で歩く（正面と斜め）・体を回す の 4 種類を 4 枚ずつ撮る。良し悪しは人が見る。
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = 'C:/wakaba/wakaba-system/cast-engine';
const MODEL = path.resolve(process.argv[2] || '');
const SHOTS = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'wce-model-shots'));
const CHAR = process.argv[4] || 'wakaba';
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
      const r = window.__rig, v = r.vrm, sleep = (ms) => new Promise((s) => setTimeout(s, ms));
      const grab = () => { r.render(); return r.canvas.toDataURL('image/png'); };
      const H = (n) => v.humanoid.getNormalizedBoneNode(n);
      const out = {};
      const hips = H('hips'), base = hips.position.clone();
      const L = { lu: H('leftUpperLeg'), ll: H('leftLowerLeg'), ru: H('rightUpperLeg'), rl: H('rightLowerLeg'),
                  la: H('leftUpperArm'), ra: H('rightUpperArm'), sp: H('spine') };
      let mode = 'none', t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 1000;
        if (mode === 'sway') { hips.position.x = base.x + 0.07 * Math.sin(2 * Math.PI * t / 0.9); }
        if (mode === 'walk') {
          const p = 2 * Math.PI * t / 1.0, s = Math.sin(p);
          L.lu.rotation.x = -0.45 * s; L.ru.rotation.x = 0.45 * s;
          L.ll.rotation.x = 0.5 * Math.max(0, -s) + 0.1; L.rl.rotation.x = 0.5 * Math.max(0, s) + 0.1;
          L.la.rotation.z = -1.2; L.ra.rotation.z = 1.2; L.la.rotation.x = 0.3 * s; L.ra.rotation.x = -0.3 * s;
          L.sp.rotation.y = 0.12 * s;
          hips.position.y = base.y + 0.02 * Math.abs(Math.cos(p));
          v.scene.position.z = -0.6 * t % 1.2;
        }
        if (mode === 'turn') { v.scene.rotation.y = 1.2 * Math.sin(2 * Math.PI * t / 1.4); }
        window.__swayId = requestAnimationFrame(tick);
      };
      tick();
      const run = async (m, prefix, times, rotY) => {
        mode = m; t0 = performance.now(); v.scene.rotation.y = rotY || 0;
        for (const [i, ms] of times.entries()) { await sleep(ms); out[prefix + i] = grab(); }
      };
      await run('sway', 'sway_', [600, 220, 220, 220]);
      mode = 'none'; hips.position.copy(base); await sleep(800);
      await run('walk', 'walk_', [900, 250, 250, 250]);
      await run('walk', 'walkq_', [500, 250, 250, 250], 0.7);
      mode = 'none'; v.scene.position.z = 0; await sleep(300);
      await run('turn', 'turn_', [350, 350, 350, 350]);
      cancelAnimationFrame(window.__swayId);
      return out;
    })()`);
    for (const k of Object.keys(r)) saveDataUrl(k, r[k]);
    check('揺れの絵を撮れた', Object.keys(r).length === 16, String(Object.keys(r).length));
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
