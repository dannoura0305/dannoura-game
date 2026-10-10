// tobinezumi/client/main.js — 起動・画面の切り替え・ゲームループ（固定 60Hz）・通信の通知の振り分け
import { Screen } from './gfx.js';
import { Input } from './input.js';
import { UI, el, iconURL } from './ui.js';
import { Sprites } from './sprites.js';
import { chooseBackend, SETTINGS_KEY } from './net.js';
import { STEP_DT } from '../shared/move.js';
import { TitleScene } from './scene-title.js';
import { FieldScene } from './scene-field.js';
import { NestBuildScene } from './scene-nest-build.js';
import { NestWalkScene } from './scene-nest-walk.js';

const stage = document.getElementById('tb-stage');
const game = {
  screen: new Screen(stage, document.getElementById('tb-game'), document.getElementById('tb-ui')),
  input: new Input(stage),
  hud: document.getElementById('tb-hud'),
  ui: null, net: null, scene: null, character: null, account: null,
  debug: {},
  iconURL,
};
game.ui = new UI(game.hud);
game.input.blocked = () => game.ui.chatOpen;

function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } }
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
game.settings = loadSettings();
if (game.settings.zoom) game.screen.setZoomPref(game.settings.zoom);

game.go = function (scene, params = {}) {
  if (game.scene && game.scene.leave) game.scene.leave();
  game.ui.closeModal();
  game.input.clear();
  game.scene = scene;
  scene.enter(params);
  game.debug.scene = scene.constructor.name;
};

// ── 持ち物（いまの持ち物は地上の画面が持つ）──
game.inv = () => (game.field && game.field.inv) || [];
game.setInv = inv => { if (game.field) game.field.inv = inv; game.ui.setInventory(inv); };
game.moveSlot = async (a, b) => { const r = await game.net.moveSlot(a, b); if (r.ok) game.setInv(r.inv); };

// ── 流れ ──
game.startGame = async function () {
  const h = await game.net.hello();
  game.account = h.account; game.character = h.character;
  const r = await game.net.joinField();
  if (!r.ok) { game.ui.toast(r.reason || '入れなかった', 'bad'); return; }
  game.field = game.field || new FieldScene(game);
  game.field.init(r.world);
  game.ui.mountHotbarOnce(text => game.net.chat(text));
  game.go(game.field);
};
game.enterNest = function (nest) {
  game.nest = nest;
  game.walk = game.walk || new NestWalkScene(game);
  game.go(game.walk, { nest, from: 'field' });
  game.ui.toast(nest.own ? 'わが家に帰ってきた' : nest.ownerName + 'の巣におじゃました');
};
game.toBuild = function (nest) { game.build = game.build || new NestBuildScene(game); game.go(game.build, { nest }); };
game.toWalk = function (nest) { game.walk = game.walk || new NestWalkScene(game); game.go(game.walk, { nest, from: 'build' }); };
game.backToField = function (pos) { game.nest = null; game.go(game.field, { pos }); };

game.openMenu = function () {
  const net = game.net, s = game.settings;
  const zooms = ['auto', '1', '2', '3', '4'];
  const p = game.ui.menu('メニュー', `<div class="tb-menu-info">${net.mode === 'offline' ? 'オフライン（この端末に保存）' : 'オンライン'}　${game.character ? '「' + game.character.name + '」' : ''}</div>
    <label class="tb-field">拡大率 <select class="zoom">${zooms.map(z => `<option value="${z}">${z === 'auto' ? '自動' : '×' + z}</option>`).join('')}</select></label>`, [
    { label: 'ゲームにもどる', act: () => game.ui.closeModal() },
    { label: '保存してタイトルへ（ログアウト）', act: async () => { net.savePosition && net.savePosition(); await net.logout(); game.ui.closeModal(); game.field = null; game.walk = null; game.build = null; game.go(new TitleScene(game)); } },
    { label: '本編（だんのうら）に戻る', act: () => { net.savePosition && net.savePosition(); net.flush && net.flush(); location.href = 'index.html'; } },
  ]);
  const zs = p.querySelector('.zoom'); zs.value = s.zoom || 'auto';
  zs.onchange = () => { s.zoom = zs.value; saveSettings(s); game.screen.setZoomPref(zs.value); };
};

// ── 通信の通知 ──
function wire(net) {
  net.on('snapshot', m => game.field && game.field.onSnapshot(m));
  net.on('res_gone', m => game.field && game.field.onResGone(m));
  net.on('res_spawn', m => game.field && game.field.onResSpawn(m));
  net.on('entrance', m => game.field && game.field.onEntrance(m));
  net.on('player_join', m => { if (game.field) { game.field.addPlayer(m.player); game.ui.toast(m.player.name + ' が やってきた'); } });
  net.on('player_leave', m => { if (game.field) { const p = game.field.players.get(m.id); game.field.players.delete(m.id); if (p) game.ui.toast(p.name + ' が 帰っていった'); } });
  net.on('chat', m => {
    const me = game.account && m.from === game.account.id;
    game.ui.chatLine(m.name, m.text, me);
    if (game.field) game.field.onChat(m);
    if (me) game.myBubble = { text: m.text, until: performance.now() + 5000 };
  });
  net.on('nest_update', m => {
    if (game.nest && game.nest.id === m.nestId) { game.nest.data = m.data; game.nest.rev = m.rev; if (game.scene === game.walk) game.walk.updateNest(game.nest); }
  });
  net.on('toast', m => game.ui.toast(m.text));
  net.on('status', m => game.ui.setOffline(m.state === 'reconnecting'));
  net.on('rejoin', w => { if (game.field) { game.field.init(w); } });
  net.on('kick', m => { game.ui.toast(m.reason || '切断された', 'bad'); });
}

// ── ループ ──
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt;
  const sc = game.scene;
  let n = 0;
  while (acc >= STEP_DT && n < 6) {
    if (sc && sc.fixed) sc.fixed(STEP_DT);
    if (game.net) game.net.tick(STEP_DT);
    acc -= STEP_DT; n++;
  }
  if (n === 6) acc = 0;
  if (sc) { sc.update(dt); sc.draw(); }
  game.input.endFrame();
  requestAnimationFrame(frame);
}

async function boot() {
  const bootEl = document.getElementById('tb-boot');
  try {
    await Promise.race([document.fonts ? Promise.all([document.fonts.load("16px 'DotGothic16'"), document.fonts.load("16px 'DotGothic16 Local'")]) : null, new Promise(r => setTimeout(r, 1500))]);
  } catch (e) {}
  await Sprites.init('tobinezumi/assets/');
  game.net = await chooseBackend();
  wire(game.net);
  game.debug.mode = game.net.mode;
  game.debug.assets = Sprites.loaded;
  if (bootEl) bootEl.remove();
  game.go(new TitleScene(game));
  addEventListener('pagehide', () => { try { game.net.savePosition && game.net.savePosition(); game.net.flush && game.net.flush(); } catch (e) {} });
  addEventListener('visibilitychange', () => { if (document.hidden) { try { game.net.savePosition && game.net.savePosition(); } catch (e) {} } });
  requestAnimationFrame(frame);
}
window.__tobi = game;   // 動作確認用（Playwright）
boot().catch(e => { console.error(e); const b = document.getElementById('tb-boot'); if (b) b.textContent = '起動できませんでした：' + e.message; });
void el;
