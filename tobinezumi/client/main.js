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
import { TouchControls, detectTouch } from './touch.js';
import { lifeAlerts, normalizeLife } from '../shared/life.js';
import { dayPhase, timeOfDay } from '../shared/daynight.js';

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
game.screen.onResize(() => requestAnimationFrame(() => game.ui.layoutTop()));
game.input.blocked = () => game.ui.chatOpen;

function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } }
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
game.settings = loadSettings();
game.saveSettings = () => saveSettings(game.settings);
if (game.settings.zoom) game.screen.setZoomPref(game.settings.zoom);

// ── タッチ（スマホ・タブレット）──
game.touch = new TouchControls(game, document.getElementById('tb-app'));
/** タッチ用の画面にするか切り替える（設定・端末・最初の指の操作で決まる） */
game.setTouch = function (on) {
  on = !!on;
  game.isTouch = on;
  game.ui.touch = on;
  document.documentElement.classList.toggle('tb-touch', on);
  game.screen.setTouch(on);
  game.touch.hidden = !!game.settings.touchHidden;
  game.touch.setEnabled(on);
  if (game.scene && game.scene.onTouchChange) game.scene.onTouchChange(on);
};
game.setTouch(detectTouch(game.settings.touchUI || 'auto'));
// 自動のとき：タッチパネル付きの PC でも、指で触ったらタッチ用に切り替える
game.input.onPointer = e => { if (e.pointerType === 'touch' && !game.isTouch && (game.settings.touchUI || 'auto') === 'auto') game.setTouch(true); };
addEventListener('pointerdown', e => game.input.onPointer(e), { capture: true, passive: true });

// ページのスクロール・拡大・引っぱって更新・長押しメニューを止める（入力欄は除く）
const isField = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || !e.target.closest || !e.target.closest('.tb-scroll, .tb-panel, .tb-tools')) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (!isField(e.target)) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());   // iOS のピンチ拡大
document.addEventListener('dblclick', e => { if (!isField(e.target)) e.preventDefault(); });
// 画面キーボード：見えている範囲の高さを CSS へ（入力欄が隠れないようにパネルを上へ寄せる）
{
  const vv = globalThis.visualViewport, root = document.documentElement;
  const kb = () => {
    const h = vv ? Math.max(0, innerHeight - (vv.offsetTop + vv.height)) : 0;
    root.style.setProperty('--kb', Math.round(h) + 'px');
    root.classList.toggle('tb-kb', game.isTouch && h > 80 && isField(document.activeElement));
  };
  if (vv) { vv.addEventListener('resize', kb); vv.addEventListener('scroll', kb); }
  document.addEventListener('focusin', e => { kb(); if (game.isTouch && isField(e.target)) setTimeout(() => { try { e.target.scrollIntoView({ block: 'nearest' }); } catch (err) {} kb(); }, 300); });
  document.addEventListener('focusout', () => setTimeout(kb, 50));
}

game.go = function (scene, params = {}) {
  if (game.scene && game.scene.leave) game.scene.leave();
  game.ui.closeModal();
  game.input.clear();
  game.scene = scene;
  game.touch.setLayout(scene.touchLayout || null);
  scene.enter(params);
  game.debug.scene = scene.constructor.name;
};

// ── 持ち物（いまの持ち物は地上の画面が持つ）──
game.inv = () => (game.field && game.field.inv) || [];
game.setInv = inv => { if (game.field) game.field.inv = inv; game.ui.setInventory(inv); };
game.moveSlot = async (a, b) => { const r = await game.net.moveSlot(a, b); if (r.ok) game.setInv(r.inv); };

// ── 昼夜・暮らし（Ver.0.2）──
/** 世界の時刻（0..1、0 = 真夜中）と見た目（shared/daynight.js） */
game.phase = () => game.net ? dayPhase(game.net.clock, game.net.serverTime()) : 0.5;
game.tod = () => timeOfDay(game.phase());
game.life = null;
/** 暮らしの数値が届いた：HUD を更新し、境目をまたいだら知らせる */
game.setLife = function (life, quiet = false) {
  if (!life) return;
  const prev = game.life;
  game.life = normalizeLife(life);
  game.ui.setLife(game.life);
  if (prev && !quiet) for (const t of lifeAlerts(prev, game.life)) game.ui.toast(t, /へとへと|ぺこぺこ|からから/.test(t) ? 'bad' : '');
  if (prev && prev.sleep && !game.life.sleep && game.walk && game.walk.sleeping) game.walk.wakeUp(false);
};
/** 種子を 1 つ食べる（持ち物から。from='pile' は巣の種の山＝倉庫から） */
game.eat = async function (from = 'inv') {
  const r = await game.net.eat(from);
  if (!r.ok) { game.ui.toast(r.reason || '食べられない', 'bad'); return r; }
  if (r.inv) game.setInv(r.inv);
  if (r.storage && game.nest) game.nest.storage = r.storage;
  game.setLife(r.life, true);
  game.ui.toast(from === 'pile' ? '種の山から 種子を食べた（空腹 ' + Math.round(r.life.hunger) + '）' : '種子を食べた（空腹 ' + Math.round(r.life.hunger) + '・のこり ' + (r.left != null ? r.left : '?') + ' 個）');
  if (game.scene && game.scene.onEat) game.scene.onEat();
  return r;
};
game.openLife = function () {
  if (!game.life) return;
  game.ui.lifePanel(game.life, [{ label: '種子を 1 つ食べる', act: () => { game.ui.closeModal(); game.eat('inv'); } }]);
};

// ── フレンド・巣の設定（Ver.0.2）──
game.friends = [];
game.setFriends = function (list) {
  game.friends = list || [];
  if (game.ui.updateFriends) game.ui.updateFriends(game.friends);
  if (game.field && game.field.onFriends) game.field.onFriends(game.friends);
};
game.openFriends = async function () {
  const net = game.net;
  const r = await net.friends();
  if (r.ok) game.setFriends(r.list);
  game.ui.friendsPanel(game.friends, {
    request: async name => { const x = await net.friendRequest(name); if (!x.ok) { game.ui.toast(x.reason || 'できなかった', 'bad'); return; } game.setFriends(x.list); game.ui.toast(x.state === 'friend' ? name + ' と フレンドになった' : name + ' に フレンド申請を送った'); },
    accept: async id => { const x = await net.friendAccept(id); if (!x.ok) { game.ui.toast(x.reason || 'できなかった', 'bad'); return; } game.setFriends(x.list); game.ui.toast('フレンドになった'); },
    remove: async id => { const x = await net.friendRemove(id); if (!x.ok) { game.ui.toast(x.reason || 'できなかった', 'bad'); return; } game.setFriends(x.list); },
    ping: f => { game.ui.closeModal(); if (game.field) game.field.pingAt(f.nest.x, f.nest.y, f.name + 'の巣'); game.ui.toast(f.name + 'の巣は ミニマップで光っている所'); },
  }, { offline: net.mode === 'offline' });
};
game.openNestSettings = function (nest) {
  const net = game.net;
  game.ui.nestSettings(nest, {
    policy: async (v, list) => {
      const r = await net.setVisitPolicy(v, list);
      if (!r.ok) { game.ui.toast(r.reason || '変えられなかった', 'bad'); return false; }
      nest.policy = v; if (list) nest.list = r.list || list;
      const msg = { public: '巣を公開した（だれでも訪ねてこられる）', private: '巣を非公開にした', list: '許可リストの子だけ入れるようにした', friends: 'フレンドだけ入れるようにした' }[v];
      game.ui.toast(msg + (r.unknown && r.unknown.length ? '（見つからない名前：' + r.unknown.join('、') + '）' : ''));
      return true;
    },
    builders: async list => {
      const r = await net.setBuilders(list);
      if (!r.ok) { game.ui.toast(r.reason || '変えられなかった', 'bad'); return false; }
      nest.builders = r.list;
      game.ui.toast('共同作業者：' + (r.list.length ? r.list.join('、') : 'なし') + (r.unknown && r.unknown.length ? '（見つからない名前：' + r.unknown.join('、') + '）' : ''));
      return true;
    },
    visitors: async () => { const r = await net.visitors(); return r.ok ? r.list : []; },
  }, { online: net.mode === 'online' });
};

// ── 流れ ──
game.startGame = async function () {
  const h = await game.net.hello();
  game.account = h.account; game.character = h.character;
  const r = await game.net.joinField();
  if (!r.ok) { game.ui.toast(r.reason || '入れなかった', 'bad'); return; }
  game.field = game.field || new FieldScene(game);
  game.ui.mountHotbarOnce(text => game.net.chat(text));
  game.ui.mountLife(() => game.openLife());
  game.ui.onHotbar = () => game.ui.toggleInventory((a, b) => game.moveSlot(a, b));
  game.ui.onEat = () => game.eat('inv');
  game.life = null;
  game.setLife(r.world.life);
  game.setFriends(r.world.friends || []);
  game.field.init(r.world);
  game.go(game.field);
  if (r.world.visitors && r.world.visitors.length) setTimeout(() => { if (!game.ui.busy()) game.ui.visitorsPanel(r.world.visitors); }, 600);
};
game.enterNest = function (nest) {
  game.nest = nest; game.nestPeers = [];
  game.walk = game.walk || new NestWalkScene(game);
  game.go(game.walk, { nest, from: 'field' });
  game.ui.toast(nest.own ? 'わが家に帰ってきた' : nest.ownerName + 'の巣におじゃました');
};
game.toBuild = function (nest) { game.build = game.build || new NestBuildScene(game); game.go(game.build, { nest }); };
game.toWalk = function (nest) { game.walk = game.walk || new NestWalkScene(game); game.go(game.walk, { nest, from: 'build' }); };
game.backToField = function (pos) { game.nest = null; game.go(game.field, { pos }); };

game.openMenu = function () {
  const net = game.net, s = game.settings;
  const zooms = game.isTouch ? [['auto', '自動'], ['large', '大きめ'], ['small', '小さめ（広く見える）']] : [['auto', '自動'], ['1', '×1'], ['2', '×2'], ['3', '×3'], ['4', '×4']];
  const touchOpts = [['auto', '自動'], ['on', 'いつも出す'], ['off', '出さない（キーボード・マウス）']];
  const fsOK = document.fullscreenEnabled && document.documentElement.requestFullscreen;
  const p = game.ui.menu('メニュー', `<div class="tb-menu-info">${net.mode === 'offline' ? 'オフライン（この端末に保存）' : 'オンライン'}　${game.character ? '「' + game.character.name + '」' : ''}</div>
    <label class="tb-field">${game.isTouch ? '表示の大きさ' : '拡大率'} <select class="zoom">${zooms.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    <label class="tb-field">タッチ操作のボタン <select class="touchui">${touchOpts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>`, [
    { label: 'ゲームにもどる', act: () => game.ui.closeModal() },
    ...(game.field ? [{ label: 'フレンド', act: () => { game.ui.closeModal(); game.openFriends(); } }, { label: 'くらし（体調・空腹・水分）', act: () => { game.ui.closeModal(); game.openLife(); } }] : []),
    ...(game.scene && game.scene.helpHTML ? [{ label: 'ヘルプ（操作のしかた）', act: () => { const h = game.scene.helpHTML(); game.ui.closeModal(); game.ui.menu('ヘルプ', `<div class="tb-help-full">${h}</div>`, [{ label: 'とじる', act: () => game.ui.closeModal() }]); } }] : []),
    ...(fsOK && game.isTouch ? [{ label: document.fullscreenElement ? '全画面をやめる' : '全画面にする', act: () => { game.ui.closeModal(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } }] : []),
    { label: '保存してタイトルへ（ログアウト）', act: async () => { net.savePosition && net.savePosition(); await net.logout(); game.ui.closeModal(); game.field = null; game.walk = null; game.build = null; game.go(new TitleScene(game)); } },
    { label: '本編（だんのうら）に戻る', act: () => { net.savePosition && net.savePosition(); net.flush && net.flush(); location.href = 'index.html'; } },
  ]);
  const zs = p.querySelector('.zoom'); zs.value = zooms.some(z => z[0] === s.zoom) ? s.zoom : 'auto';
  zs.onchange = () => { s.zoom = zs.value; saveSettings(s); game.screen.setZoomPref(zs.value); };
  const ts = p.querySelector('.touchui'); ts.value = s.touchUI || 'auto';
  ts.onchange = () => { s.touchUI = ts.value; s.touchHidden = false; saveSettings(s); game.setTouch(detectTouch(ts.value)); };
};

// ── 通信の通知 ──
function wire(net) {
  net.on('snapshot', m => game.field && game.field.onSnapshot(m));
  net.on('res_gone', m => game.field && game.field.onResGone(m));
  net.on('res_spawn', m => game.field && game.field.onResSpawn(m));
  net.on('entrance', m => game.field && game.field.onEntrance(m));
  net.on('player_join', m => { if (game.field && game.field.ready) { game.field.addPlayer(m.player); if (m.why !== 'nest') game.ui.toast(m.player.name + ' が やってきた'); } });
  net.on('player_leave', m => { if (game.field && game.field.players) { const p = game.field.players.get(m.id); game.field.players.delete(m.id); if (p && m.why !== 'nest') game.ui.toast(p.name + ' が 帰っていった'); } });
  net.on('chat', m => {
    const me = game.account && m.from === game.account.id;
    game.ui.chatLine(m.name, m.text, me);
    if (game.field) game.field.onChat(m);
    if (me) game.myBubble = { text: m.text, until: performance.now() + 5000 };
  });
  net.on('nest_update', m => {
    if (game.nest && game.nest.id === m.nestId && m.rev > (game.nest.rev || 0)) {
      game.nest.data = m.data; game.nest.rev = m.rev;
      if (game.scene === game.walk) game.walk.updateNest(game.nest);
      else if (game.scene === game.build) game.build.onRemoteUpdate(game.nest);
    }
  });
  // 巣の中にいるほかのトビネズミ（オンライン）
  net.on('nest_peers', m => {
    if (!game.nest || game.nest.id !== m.nestId) return;
    const me = game.account && game.account.id;
    game.nestPeers = (m.peers || []).filter(p => p.id !== me);
  });
  net.on('toast', m => game.ui.toast(m.text));
  // Ver.0.2
  net.on('life', m => game.setLife(m.life));
  net.on('friends', m => game.setFriends(m.list));
  net.on('visit', m => game.ui.toast(m.name + ' が あなたの巣を たずねてきた'));
  net.on('nest_role', m => {
    if (!game.nest || game.nest.id !== m.nestId) return;
    game.nest.canEdit = !!m.canEdit; game.nest.role = m.role;
    if (game.scene === game.build) game.build.onRoleChange && game.build.onRoleChange(game.nest);
    else if (game.scene === game.walk) game.walk.onRoleChange && game.walk.onRoleChange(game.nest);
  });
  net.on('status', m => { game.ui.setOffline(m.state === 'reconnecting'); game.debug.net = m.state; });
  // 再接続できた：地上なら同じ位置（60 秒をすぎたら巣の入口）から、巣の中なら巣の中から続ける
  net.on('rejoin', w => {
    if (!game.field || game.scene instanceof TitleScene) return;
    game.field.init(w);
    game.setInv(w.you.inv);
    if (w.life) game.setLife(w.life, true);
    if (w.friends) game.setFriends(w.friends);
    if (game.scene !== game.field) { game.nest = null; game.nestPeers = []; game.go(game.field); }
  });
  net.on('rejoin_nest', nest => {
    if (!game.nest || game.nest.id !== nest.id) return;
    game.nest.data = nest.data; game.nest.rev = nest.rev; game.nest.storage = nest.storage;
    if (game.scene === game.walk) game.walk.updateNest(game.nest);
    else if (game.scene === game.build) game.build.onRemoteUpdate(game.nest);
  });
  const toTitle = text => { game.ui.setOffline(false); game.ui.toast(text, 'bad'); game.field = null; game.walk = null; game.build = null; game.nest = null; game.go(new TitleScene(game)); };
  net.on('session_lost', () => toTitle('ログインの期限が切れた。もう一度ログインしてね'));
  net.on('kick', m => toTitle(m.reason || '切断された'));
}

// ── ループ ──
let last = performance.now(), acc = 0, paused = false;
function frame(now) {
  if (paused) return;
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
  if (game.field && game.ui.clockEl && (sc === game.field || sc === game.walk)) game.ui.setClock(game.tod());
  if (game.isTouch) game.touch.setBusy(game.ui.busy());
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
  // 裏に回ったら止める（電池の節約）。もどったら時計を合わせなおして再開。押しっぱなしの指は離したことにする
  addEventListener('visibilitychange', () => {
    if (document.hidden) {
      try { game.net.savePosition && game.net.savePosition(); } catch (e) {}
      paused = true; game.input.releaseAll(); game.input.clear();
    } else if (paused) { paused = false; last = performance.now(); acc = 0; requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);
}
window.__tobi = game;   // 動作確認用（Playwright）
boot().catch(e => { console.error(e); const b = document.getElementById('tb-boot'); if (b) b.textContent = '起動できませんでした：' + e.message; });
void el;
