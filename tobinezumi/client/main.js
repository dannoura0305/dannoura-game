// tobinezumi/client/main.js — 起動・画面の切り替え・ゲームループ（固定 60Hz）・通信の通知の振り分け
import { Screen } from './gfx.js';
import { Input } from './input.js';
import { UI, el, esc, iconURL } from './ui.js';
import { Sprites } from './sprites.js';
import { chooseBackend, SETTINGS_KEY } from './net.js';
import { STEP_DT } from '../shared/move.js';
import { TitleScene } from './scene-title.js';
import { FieldScene } from './scene-field.js';
import { NestBuildScene } from './scene-nest-build.js';
import { NestWalkScene } from './scene-nest-walk.js';
import { TouchControls, detectTouch } from './touch.js';
import { lifeAlerts, normalizeLife } from '../shared/life.js';
import { itemName } from '../shared/items.js';
import { dayPhase, timeOfDay } from '../shared/daynight.js';
import { envAt, REST_NAME } from '../shared/season.js';
import { initSfx, setSfx, sfx } from './sfx.js';
import { familyPanel, namingDialog, farewellScene, lineagePanel } from './family-ui.js';
import { lookOf, traitMoveMods } from '../shared/genetics.js';
import { walkersOfFamily } from '../shared/household.js';
import { STAGE_NAME, ageLabel, STAGE } from '../shared/family.js';
import { worldMapPanel, collectionPanel, achievementsPanel, nestTourPanel, residentsPanel, discoveryCard, regionCard } from './world-ui.js';
import { CURIOS, ACH, unlockedDecor, isCurio } from '../shared/collect.js';
import { REGION } from '../shared/world.js';
import { FURNITURE } from '../shared/items.js';
import { seasonOf } from '../shared/season.js';
import { Ambient } from './ambient.js';
import { festNote } from '../shared/festival.js';

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
initSfx(game.settings.sound !== false);
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
// Ver.0.5：環境音（風・雨・川・虫・フクロウ・キツネ。WebAudio で合成）
game.ambient = new Ambient(game.settings.ambient != null ? game.settings.ambient : 0.5);
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
// ── 天気・季節（Ver.0.3）：いる場所の影響（表示用。正はサーバー／オフラインのバックエンド）。予測の移動にも使う（砂嵐で遅い）──
game.env = null; game._envT = 0;
game.updateEnv = function (force = false) {
  const now = performance.now();
  if (!force && now < game._envT) return game.env;
  game._envT = now + 250;
  const net = game.net, f = game.field;
  if (!net || !net.clock) return game.env;
  const place = game.scene === game.walk || game.scene === game.build ? 'nest' : 'field';
  const st = f && f.pred ? f.pred.state : { x: 0, y: 0 };
  const on = !f || !f.danger || f.danger.env !== false;
  game.env = envAt(net.clock, net.serverTime(), { map: f && f.map, x: st.x, y: st.y, place, entrances: f ? f.entrances : [], enabled: on });
  game.envSeasonProgress = seasonOf(net.clock, net.serverTime()).progress;
  return game.env;
};
/** 暮らしの数値が届いた：HUD を更新し、境目をまたいだら知らせる */
game.setLife = function (life, quiet = false, extra = null) {
  if (!life) return;
  if (extra) {
    game.ui.envLabels = extra.env || [];
    const rest = extra.rest ? REST_NAME[extra.rest] : null;
    if (rest && rest !== game.ui.restName) game.ui.toast(rest + '：ぐっすり休める（体調の戻りが早い）');
    game.ui.restName = rest;
    const lab = (extra.env || []).join('|');
    if (lab && lab !== game._envLab && !quiet) game.ui.toast(extra.env[0], 'bad');
    game._envLab = lab;
  }
  const prev = game.life;
  game.life = normalizeLife(life);
  game.ui.setLife(game.life);
  if (prev && !quiet) for (const t of lifeAlerts(prev, game.life)) game.ui.toast(t, /へとへと|ぺこぺこ|からから/.test(t) ? 'bad' : '');
  if (prev && prev.sleep && !game.life.sleep && game.walk && game.walk.sleeping) game.walk.wakeUp(false);
};
/** 種子を 1 つ食べる（持ち物から。from='pile' は巣の種の山＝倉庫から） */
game.eat = async function (from = 'inv', item = 'seed') {
  const r = await game.net.eat(from, item);
  if (!r.ok) { game.ui.toast(r.reason || '食べられない', 'bad'); return r; }
  if (r.inv) game.setInv(r.inv);
  if (r.storage && game.nest) game.nest.storage = r.storage;
  game.setLife(r.life, true);
  game.ui.toast(from === 'pile' ? '種の山から 種子を食べた（空腹 ' + Math.round(r.life.hunger) + '）' : (r.item === 'rare_seed' ? '珍しい種を食べた！ あまい（空腹 ' : '種子を食べた（空腹 ') + Math.round(r.life.hunger) + '・のこり ' + (r.left != null ? r.left : '?') + ' 個）');
  if (game.scene && game.scene.onEat) game.scene.onEat();
  return r;
};
game.openLife = function () {
  if (!game.life) return;
  const me = game.house && game.house.me;
  game.ui.ageHTML = me ? `<div class="tb-lifeage"><b>${esc(me.name)}</b>　${STAGE_NAME[me.stage]}・${ageLabel(me.ageMs)}<span class="tb-dim">（遊んでいる間だけ年をとる。世界の 1 日 = 24 分。寿命の目安 ${STAGE.LIFESPAN} 日）</span></div>` : '';
  game.ui.lifePanel(game.life, [{ label: '種子を 1 つ食べる', act: () => { game.ui.closeModal(); game.eat('inv'); } }, { label: '家族・家系図', act: () => { game.ui.closeModal(); game.openFamily(); } }]);
};

// ── いのちをつなぐ（Ver.0.4）：年齢・家族・野生の子・世代交代・家系図 ──
game.house = null; game.look = null; game.traitMove = null; game.myKids = [];
/** 家族の様子が届いた（joinField・family 通知・操作の返事） */
game.setFamily = function (fam, events = []) {
  if (!fam || !fam.me) return;
  game.house = fam;
  game.look = lookOf(fam.me.traits);
  game.traitMove = traitMoveMods(fam.me.traits);
  game.myKids = walkersOfFamily(fam);   // 若者 3 匹まで＋なかま 1 匹（Ver.0.7）
  if (game.field && game.field.me) game.field.me.look = game.look;
  for (const e of events) game._familyEvent(e);
  game.debug.family = { me: fam.me.name, stage: fam.me.stage, age: Math.round(fam.me.ageMs / 1000), kids: fam.members.filter(m => m.role === 'pup' || m.role === 'kin').length, mate: !!fam.members.find(m => m.role === 'mate'), pending: !!fam.pending };
};
game._familyEvent = function (e) {
  const ui = game.ui;
  if (e.type === 'born') {
    sfx('safe');
    ui.toast('巣で 赤ちゃんが ' + e.pups.length + ' 匹 生まれた！');
    game.pendingNames = e.pups;
    if (game.scene === game.walk && game.nest && game.nest.own && !ui.busy()) game.openNaming();
  } else if (e.type === 'stage') {
    if (e.stage === 'young') ui.toast(e.name + ' が 若者になった！（外へ連れて行ける・次の世代に選べる）');
    else if (e.stage === 'adult') ui.toast(e.name + ' が おとなになった');
  } else if (e.type === 'hungry') {
    const t = performance.now(); if (t - (game._hungryT || 0) > 20000) { game._hungryT = t; ui.toast(e.name + ' が おなかをすかせている（倉庫に種子を・巣で種子をあげる）', 'bad'); }
  } else if (e.type === 'me') {
    if (e.crossed === 'adult') ui.toast('おとなになった！ 野生のトビネズミと なかよくなれる（そっと近づいてじっと・種子をあげる）');
    else if (e.crossed === 'elder') ui.toast('年寄りになった。のんびり子や孫を見守ろう');
  } else if (e.type === 'lifespan') game.lifespanDialog();
  else if (e.type === 'wait') ui.toast('冬のあいだは巣ごもり。赤ちゃんは春に生まれる');
  else if (e.type === 'mate') ui.toast(e.name + ' が つれあいとして巣に住むことになった');
  else if (e.type === 'friend') ui.toast(e.name + ' が なかまとして巣に住むことになった');
};
game.openNaming = function () {
  const pups = game.pendingNames;
  if (!pups || !pups.length) return;
  game.pendingNames = null;
  namingDialog(game, pups, async list => {
    const r = await game.net.namePups(list);
    if (!r.ok) { game.ui.toast(r.reason || '名前をつけられなかった', 'bad'); return; }
    game.setFamily(r.family);
    game.ui.toast('名前をつけた：' + list.map(x => x.name).join('・'));
  });
};
game.openFamily = async function () {
  const net = game.net;
  const r = await net.family();
  if (!r.ok) { game.ui.toast(r.reason || '家族を見られない', 'bad'); return; }
  game.setFamily(r.family);
  familyPanel(game, r.family, {
    rename: async m => {
      const v = await game.ui.prompt('名前を変える', esc(m.name) + ' の新しい名前（' + 10 + ' 文字まで）', m.name);
      if (v == null || !v.trim()) { game.openFamily(); return; }
      const x = await net.namePups([{ id: m.id, name: v.trim() }]);
      if (!x.ok) game.ui.toast(x.reason || '変えられなかった', 'bad'); else game.setFamily(x.family);
      game.openFamily();
    },
    succeed: m => game.succeed(m),
    follow: async on => { const x = await net.kidsFollow(on); if (x.ok) { game.setFamily(x.family); game.ui.toast(on ? '若者を連れて行く（地上でついてくる）' : '若者は巣で待つ'); } },
    companion: async (m, on) => {   // Ver.0.7：なかまを地上へ（1 匹だけ）
      const x = await net.setCompanion(on ? m.id : null);
      if (!x.ok) { game.ui.toast(x.reason || 'できなかった', 'bad'); return; }
      game.setFamily(x.family);
      const sw = x.swapped != null ? (x.family.members.find(q => String(q.id) === String(x.swapped)) || {}).name : null;
      game.ui.toast(on ? m.name + ' を 地上へ連れて行く（後ろについてくる）' + (sw ? '。' + sw + ' は 巣で待つ' : '') : m.name + ' は 巣で待つ');
      game.debug.companion = on ? m.id : null;
      if (game.nest && game.nest.own && game.nest.tales) game.nest.tales.companion = on ? m.id : null;
      game.openFamily();
    },
    lineage: () => game.openLineage(),
    farewell: () => game.farewell(),
  });
};
game.openLineage = async function () {
  const r = await game.net.lineage();
  if (!r.ok) { game.ui.toast(r.reason || '家系図を見られない', 'bad'); return; }
  lineagePanel(game, r);
};
game.succeed = async function (m) {
  const ok = await game.ui.confirm('次の世代へ', `<b>${esc(m.name)}</b>（${STAGE_NAME[m.stage]}・${ageLabel(m.ageMs)}）が あとをつぎます。<br>巣・倉庫・持ち物・フレンドは そのまま。いまの子は ご先祖になって家系図に残ります。`, 'あとをつがせる', 'やめる');
  if (!ok) return;
  game._afterSuccession(await game.net.succeed(m.id));
};
game.farewell = async function () {
  const ok = await game.ui.confirm('旅立ち', '育った子がいないので、親せきの若者が 巣をまかされます。<br>巣・倉庫・持ち物・フレンドは そのまま。いまの子は ご先祖として家系図に残ります。', '旅立つ', 'やめる');
  if (!ok) return;
  game._afterSuccession(await game.net.farewell());
};
game._afterSuccession = function (r) {
  if (!r || !r.ok) { game.ui.toast((r && r.reason) || 'あとをつげなかった', 'bad'); return; }
  game.character = r.character;
  game.setFamily(r.family);
  if (r.life) game.setLife(r.life, true);
  if (r.inv) game.setInv(r.inv);
  if (game.field && game.field.me) { game.field.me.name = r.character.name; game.field.me.fur = r.character.fur; game.field.me.look = game.look; }
  if (game.scene === game.walk && game.walk._retitle) { if (game.nest && game.nest.own) game.nest.ownerName = r.character.name; game.walk._retitle(); }
  farewellScene(game, r.retired || [], r.family.me);
  game.debug.successions = (game.debug.successions || 0) + 1;
};
game.lifespanDialog = function () {
  if (game.ui.busy()) { setTimeout(() => game.lifespanDialog(), 3000); return; }
  const me = game.house && game.house.me;
  if (!me) return;
  const heirs = (game.house.heirs || []).length;
  game.ui.menu('そろそろ次の世代へ', `<div class="tb-body">${esc(me.name)} も ${ageLabel(me.ageMs)}。ずいぶん長く生きてきた。<br>${heirs ? '育った子が ' + heirs + ' 匹いる。「家族」から あとをつぐ子を選べる。' : '育った子はいない。「旅立ち」で親せきの若者に巣をまかせることもできる。'}<br><span class="tb-dim">このまま遊び続けてもだいじょうぶ（いなくなったりしない）。</span></div>`, [
    { label: '家族を見る（次の世代を選ぶ）', cls: 'primary', act: () => { game.ui.closeModal(); game.openFamily(); } },
    ...(heirs ? [] : [{ label: '旅立つ', act: () => { game.ui.closeModal(); game.farewell(); } }]),
    { label: 'まだ このまま', act: () => game.ui.closeModal() },
  ]);
};

// ── 広がり（Ver.0.5）：旅・図鑑・実績・共同巣 ──
game.collection = { owned: {}, achievements: {}, found: false };
game.setCollection = function (c) {
  if (!c) return;
  game.collection = { owned: { ...(c.owned || {}) }, achievements: { ...(c.achievements || {}) }, found: !!c.found, tev: { ...(c.tev || (game.collection && game.collection.tev) || {}) } };
  game.debug.collection = Object.keys(game.collection.owned).length; game.debug.achievements = Object.keys(game.collection.achievements).length;
};
/** 巣の操作の見た目の判定（置けるか）：図鑑にある品・実績で使える飾り。正はサーバー／オフラインのバックエンド */
game.nestCtx = () => ({ owned: new Set(Object.keys(game.collection.owned)), unlocks: new Set(unlockedDecor(Object.keys(game.collection.achievements))), isCurio });
/** 画面を暗くする（旅のあいだ）。white：不思議な穴（白く） */
game.fade = function (on, kind = null) {
  if (!game._fadeEl) { game._fadeEl = el('div', 'tb-fade'); document.getElementById('tb-app').appendChild(game._fadeEl); }
  game._fadeEl.classList.toggle('white', kind === 'white');
  game._fadeEl.classList.toggle('on', !!on);
};
/** 別の土地に着いた（旅・不思議な穴・開発用）：地上の画面を作りなおす */
game.arrive = function (world, why = 'travel', first = false) {
  if (!world) return;
  game.nest = null; game.nestPeers = [];
  game.field.init(world);
  game.setInv(world.you.inv);
  if (world.life) game.setLife(world.life, true);
  if (world.friends) game.setFriends(world.friends);
  if (world.family) game.setFamily(world.family);
  game.go(game.field, { pos: { x: world.you.x, y: world.you.y } });
  game.field._arrivedT = game.field.t;
  setTimeout(() => game.fade(false), 120);
  regionCard(game, world.region);
  if (why === 'gate' && world.region === 'toyama' && first) setTimeout(() => game.ui.note('穴をくぐると、冷たい空気と、水のにおい。<br>見たことのない白い山が、ずっと遠くまで続いている。<br><span class="tb-dim">（「来た穴」から いつでも谷へ戻れる）</span>'), 3000);
  game.debug.region = world.region; game.debug.travels = (game.debug.travels || 0) + 1;
};
game.openWorldMap = () => worldMapPanel(game);
game.openCollection = () => collectionPanel(game);
game.openAchievements = () => achievementsPanel(game);
game.openTour = () => nestTourPanel(game);
game.openRanking = game.openTour;   // 前の名前
game.openResidents = () => residentsPanel(game);
game.onResidents = info => { if (game.field) game.field.home = info.home ? { nestId: info.home.nestId, x: info.home.x, y: info.home.y, region: info.home.region, ownerName: info.home.ownerName } : null; };

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
    ping: f => {
      game.ui.closeModal();
      const r = (f.nest && f.nest.region) || 'plains';
      if (r !== (net.region || 'plains')) { game.ui.toast(f.name + 'の巣は「' + ((REGION[r] || {}).name || r) + '」にある（世界地図・N）'); return; }
      if (game.field) game.field.pingAt(f.nest.x, f.nest.y, f.name + 'の巣'); game.ui.toast(f.name + 'の巣は ミニマップで光っている所');
    },
  }, { offline: net.mode === 'offline' });
};
game.openNestSettings = function (nest) {
  const net = game.net;
  game.ui.nestSettings(nest, {
    residents: () => { game.ui.closeModal(); game.openResidents(); },
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
  game.ui.onEat = item => game.eat('inv', item || 'seed');
  game.relocateCooldownMs = (r.world.danger && r.world.danger.relocateCooldownMs) || 600000;
  if (r.world.collection) game.setCollection(r.world.collection);
  game.debug.region = r.world.region || 'plains';
  game.life = null;
  game.setLife(r.world.life);
  game.setFriends(r.world.friends || []);
  if (r.world.family) game.setFamily(r.world.family);
  game.field.init(r.world);
  game.go(game.field);
  if ((r.world.visitors && r.world.visitors.length) || (r.world.raids && r.world.raids.length)) setTimeout(() => { if (!game.ui.busy()) game.ui.visitorsPanel(r.world.visitors || [], r.world.raids || []); }, 600);
};
game.enterNest = function (nest, ent, invite = null) {
  game.nest = nest; game.nestPeers = [];
  game.walk = game.walk || new NestWalkScene(game);
  game.go(game.walk, { nest, from: 'field' });
  if (invite && invite.ok && invite.friend) { sfx('safe'); game.ui.toast(invite.name + ' が なかまとして 巣に住むことになった（ミミナガトビネズミ：種がちがうので 赤ちゃんはできない）'); }
  else if (invite && invite.ok) { sfx('safe'); game.ui.toast(invite.name + ' を 巣に むかえた！ つれあいになった（世界の半日ほどで 赤ちゃんが生まれる）'); }
  else if (invite) game.ui.toast(invite.name + ' は 入口で待っている：' + invite.reason, 'bad');
  else game.ui.toast(nest.own ? 'わが家に帰ってきた' : nest.ownerName + 'の巣におじゃました');
  if (nest.own && game.pendingNames) setTimeout(() => { if (!game.ui.busy()) game.openNaming(); }, 400);
  void ent;
};
game.toBuild = function (nest) { game.build = game.build || new NestBuildScene(game); game.go(game.build, { nest }); };
game.toWalk = function (nest) { game.walk = game.walk || new NestWalkScene(game); game.go(game.walk, { nest, from: 'build' }); };
game.backToField = function (pos) { game.nest = null; game.go(game.field, { pos }); };

game.openMenu = function () {
  const net = game.net, s = game.settings;
  const zooms = game.isTouch ? [['auto', '自動'], ['large', '大きめ'], ['small', '小さめ（広く見える）']] : [['auto', '自動'], ['1', '×1'], ['2', '×2'], ['3', '×3'], ['4', '×4']];
  const touchOpts = [['auto', '自動'], ['on', 'いつも出す'], ['off', '出さない（キーボード・マウス）']];
  const dangerOpts = [['normal', 'ふつう'], ['easy', 'やさしい（見つかりにくい・遅い・罰が軽い・巣は襲われない）'], ['off', '出ない']];
  const fsOK = document.fullscreenEnabled && document.documentElement.requestFullscreen;
  const fn = net.clock ? festNote(net.clock, net.serverTime()) : null;   // Ver.0.8：小さな暦（次の行事）
  game.debug.festNote = fn ? fn.text : null;
  const p = game.ui.menu('メニュー', `<div class="tb-menu-info">${net.mode === 'offline' ? 'オフライン（この端末に保存）' : 'オンライン'}　${game.character ? '「' + game.character.name + '」' : ''}</div>
    ${fn ? `<div class="tb-festnote${fn.now ? ' now' : ''}"><b>${esc(fn.text)}</b><span>${esc(fn.sub)}</span></div>` : ''}
    <label class="tb-field">${game.isTouch ? '表示の大きさ' : '拡大率'} <select class="zoom">${zooms.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    <label class="tb-field">タッチ操作のボタン <select class="touchui">${touchOpts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    ${net.mode === 'offline' ? `<label class="tb-field">捕食者（フクロウ・キツネ・ヘビ） <select class="danger">${dangerOpts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>` : ''}
    <label class="tb-field">効果音 <select class="sound"><option value="on">鳴らす</option><option value="off">鳴らさない</option></select></label>
    <label class="tb-field">環境音（風・雨・川・虫・鳴き声） <select class="ambient"><option value="0">鳴らさない</option><option value="0.25">小さく</option><option value="0.5">ふつう</option><option value="0.85">大きく</option></select></label>`, [
    { label: 'ゲームにもどる', act: () => game.ui.closeModal() },
    ...(game.field ? [{ label: '世界地図', act: () => { game.ui.closeModal(); game.openWorldMap(); } }, { label: '図鑑（収集品）', act: () => { game.ui.closeModal(); game.openCollection(); } },
      { label: '実績', act: () => { game.ui.closeModal(); game.openAchievements(); } }, { label: '巣めぐり（たずねられる巣）', act: () => { game.ui.closeModal(); game.openTour(); } },
      { label: 'フレンド', act: () => { game.ui.closeModal(); game.openFriends(); } }, { label: '共同巣', act: () => { game.ui.closeModal(); game.openResidents(); } }, { label: 'くらし（体調・空腹・水分・年齢）', act: () => { game.ui.closeModal(); game.openLife(); } },
      { label: '家族', act: () => { game.ui.closeModal(); game.openFamily(); } }, { label: '家系図', act: () => { game.ui.closeModal(); game.openLineage(); } }] : []),
    ...(game.scene && game.scene.helpHTML ? [{ label: 'ヘルプ（操作のしかた）', act: () => { const h = game.scene.helpHTML(); game.ui.closeModal(); game.ui.menu('ヘルプ', `<div class="tb-help-full">${h}</div>`, [{ label: 'とじる', act: () => game.ui.closeModal() }]); } }] : []),
    ...(fsOK && game.isTouch ? [{ label: document.fullscreenElement ? '全画面をやめる' : '全画面にする', act: () => { game.ui.closeModal(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } }] : []),
    { label: '保存してタイトルへ（ログアウト）', act: async () => { net.savePosition && net.savePosition(); await net.logout(); game.ui.closeModal(); game.field = null; game.walk = null; game.build = null; game.go(new TitleScene(game)); } },
    { label: '本編（だんのうら）に戻る', act: () => { net.savePosition && net.savePosition(); net.flush && net.flush(); location.href = 'index.html'; } },
  ]);
  const zs = p.querySelector('.zoom'); zs.value = zooms.some(z => z[0] === s.zoom) ? s.zoom : 'auto';
  zs.onchange = () => { s.zoom = zs.value; saveSettings(s); game.screen.setZoomPref(zs.value); };
  const ts = p.querySelector('.touchui'); ts.value = s.touchUI || 'auto';
  ts.onchange = () => { s.touchUI = ts.value; s.touchHidden = false; saveSettings(s); game.setTouch(detectTouch(ts.value)); };
  const ds = p.querySelector('.danger');
  if (ds) { ds.value = net.dangerMode || s.danger || 'normal'; ds.onchange = () => { s.danger = ds.value; saveSettings(s); net.setDanger(ds.value); if (game.field && game.field.danger) game.field.danger.predators = ds.value; game.ui.toast('捕食者：' + dangerOpts.find(o => o[0] === ds.value)[1]); }; }
  const ss = p.querySelector('.sound'); ss.value = s.sound === false ? 'off' : 'on';
  ss.onchange = () => { s.sound = ss.value === 'on'; saveSettings(s); setSfx(s.sound); };
  const as = p.querySelector('.ambient'); const av = s.ambient != null ? s.ambient : 0.5;
  as.value = ['0', '0.25', '0.5', '0.85'].reduce((a, b) => Math.abs(b - av) < Math.abs(a - av) ? b : a, '0.5');
  as.onchange = () => { s.ambient = Number(as.value); saveSettings(s); game.ambient.setVolume(s.ambient); };
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
  net.on('life', m => game.setLife(m.life, false, m));
  // Ver.0.3：つかまった・巣の襲撃・天気の切り替え（開発用）
  net.on('caught', m => {
    game.invulnUntil = m.until;
    if (m.inv) game.setInv(m.inv);
    game.setLife(m.life, true);
    if (game.field) game.field.onCaught(m);
    const lost = (m.drops || []).map(d => itemName(d.kind) + '×' + d.n).join('・');
    game.ui.toast(m.name + 'に つかまった！ 体調が減り、' + (lost ? lost + ' を落とした（拾いに戻れる）' : '何も落とさなかった'), 'bad');
    game.debug.caught = (game.debug.caught || 0) + 1;
  });
  net.on('raid', m => { game.ui.toast(m.kind === 'raid' ? 'キツネが あなたの巣の入口を掘り返した！ 倉庫の種子 −' + m.lost : 'キツネが巣を掘ろうとしたが、ふさいだ入口で守れた', m.kind === 'raid' ? 'bad' : ''); });
  net.on('clock', () => { game.updateEnv(true); if (game.field && game.field.ready) game.field._festT = 0; });
  net.on('fest', m => game.field && game.field.onFest(m));   // Ver.0.8：季節の行事の印
  net.on('friends', m => game.setFriends(m.list));
  // Ver.0.4
  net.on('family', m => game.setFamily(m.family, m.events || []));
  net.on('player_update', m => { if (game.field && game.field.updatePlayer) game.field.updatePlayer(m.player); });
  net.on('wild', m => { if (game.field && game.field.onWild) game.field.onWild(m); });
  net.on('visit', m => game.ui.toast(m.name + ' が あなたの巣を たずねてきた'));
  // Ver.0.5：図鑑・実績・共同巣
  net.on('collect', m => {
    game.collection.owned[m.cid] = m.at || Date.now();
    game.debug.collection = Object.keys(game.collection.owned).length;
    discoveryCard(game, m.cid);
  });
  net.on('achievement', m => {
    game.collection.achievements[m.id] = m.at || Date.now();
    game.debug.achievements = Object.keys(game.collection.achievements).length;
    const a = ACH[m.id];
    if (!a) return;
    sfx('safe');
    game.ui.toast('実績「' + a.name + '」' + (m.reward && FURNITURE[m.reward] ? '　ごほうび：' + FURNITURE[m.reward].name + '（巣の家具に）' : ''));
  });
  net.on('residents', m => { if (m.text) game.ui.toast(m.text); game.onResidents(m); });
  // Ver.0.6：オフラインの共同巣（NPC の住人が倉庫に種子を持ってきた）
  net.on('npc_gift', m => {
    if (game.nest && game.nest.id === m.nestId) { game.nest.storage = m.storage; if (game.scene === game.walk && game.walk.onStorage) game.walk.onStorage(m); }
    game.debug.npcGifts = (game.debug.npcGifts || 0) + 1;
  });
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
    if (game.scene === game.field) game.field._snapCam();
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
  if (game.field) game.updateEnv();
  if (game.field && game.ui.clockEl && (sc === game.field || sc === game.walk)) game.ui.setClock(game.tod(), game.env);
  if (game.isTouch) game.touch.setBusy(game.ui.busy());
  game.ambient.update(dt, game);
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
