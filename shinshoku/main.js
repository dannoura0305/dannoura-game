// 『境界侵食』（仮題）フェーズ3：序章〜第2章（避難所）の試作。
// シミュレーションは 60Hz 固定（入力・判定・AI・演出場面の時間）。描画は可変。window.__sh は自動プレイ・検証用。
// 区画（商店街＋自宅・裏路地・商業施設の前・避難所）は 1 つずつ読み込む（描画の負担を区画ぶんに抑える）。
import * as THREE from 'three';
import { LEVEL } from './data/level.js';
import { AREA_DATA } from './data/areas.js';
import { ENEMIES } from './data/enemies.js';
import { COMBAT, ITEMS } from './data/combat.js';
import { EQUIP } from './data/equip.js';
import { BUILDERS } from './world/areas.js';
import { Builder } from './world/level.js';
import { buildDannoura, buildCompanion, buildKiro, buildHeiten, buildShuuyou, buildCivilian } from './actor/models.js';
import { Player, EnemyActor, CompanionActor, CivilianActor } from './actor/actors.js';
import { loadManifest, loadCharacter, prepareClone, cloneCharacter } from './actor/vrm.js';
import { Kiro } from './ai/kiro.js';
import { Heiten } from './ai/heiten.js';
import { Shuuyou } from './ai/shuuyou.js';
import { CompanionBrain } from './ai/companion.js';
import { ThirdPersonCamera } from './render/camera.js';
import { preloadEnemyPacks, applyEnemyPack, ENEMY_PACK_KINDS } from './actor/enemypack.js';
import { Fx, Rain } from './render/fx.js';
import { Halos, WetStreaks } from './render/halo.js';
import { SwordTrail } from './render/trail.js';
import { PRESETS, autoPreset, applyPreset } from './render/quality.js';
import { setOutlinesVisible, canvasTex, JP_FONT, toon } from './render/toon.js';
import { Input } from './core/input.js';
import { Sfx } from './core/audio.js';
import { UI } from './ui/ui.js';
import { setupTouch } from './ui/touch.js';
import { SaveStore, makeSlot } from './save/save.js';
import { createWP } from './link/progress.js';
import { newRouteState } from './story/route.js';
import { CutscenePlayer } from './story/cutscene.js';
import { stepDef, streetState, atLeast, weaponsAt, STEPS, TARGETS } from './story/chapters.js';
import { AREA_GRAPH } from './data/areas.js';
import { bossName } from './story/puzzles.js';
import { combatWithEquip, toggleEquip } from './combat/equip.js';
import { combatMethods } from './game/combat.js';
import { storyMethods } from './game/story.js';
import { ch3Methods } from './game/ch3.js';
import { ch4Methods } from './game/ch4.js';
import { ch5Methods } from './game/ch5.js';
import { ch6Methods } from './game/ch6.js';
import { ch7Methods } from './game/ch7.js';
import { CHAPTER_SELECT, GALLERY, selectableChapters, galleryUnlocked } from './data/ch7.js';
import './world/areas8.js';
import './world/areas7.js';
import './world/areas5.js';
import './world/areas6.js';
import './world/areas4.js';
import { carryBranchLog } from './story/route.js';
import './world/areas3.js';
import { buildDannouraWhite } from './actor/models3.js';
import { setDetail } from './actor/skin.js';
import { normalizeRoute } from './story/route.js';
import { TOWN, TOWN_LAYOUT, HOME_O as TOWN_HOME, inHome, migrateTownPos, navNext } from './data/town.js';
// P12（環境の写実化）：町と屋内の PBR の材質・色の調整・雨の跳ね・ブルーム（PC の高い段）・Blender の部品
import { envInit, envLoad, envApplyGrade, envTick, ENV, U as ENV_U } from './render/envmat.js';
import { gradeAt } from './data/envgrade.js';
import { RainSplash } from './render/envfx.js';
import { GroundReflection } from './render/envrefl.js';
import { Post } from '../mapkit/render/post.js';
import { envKitInit, envKitLoad, envKitApply, envKitUpdate, KIT } from './world/envkit.js';
// P16：植物（木・低木・生垣・鉢・雑草・岩・瓦礫）は試験マップと同じ部品と描き方（mapkit の AssetBank・KitSet・GroundCover・wind を読み込んで使う）
import { vegInit, vegLoad, vegApply, vegUpdate, vegNight, vegStats, VEG } from './world/vegkit.js';

const DT = 1 / 60;
/** 場所の移動の暗転で出す小さな助言（操作・遊び方。物語の内容は書かない） */
const LOAD_TIPS = [
  '赤い「危」は弾けない。避ける（ジャスト回避）と見切り一閃につながる',
  '白い「！」は弾ける。弾いた直後の攻撃が弾き一閃',
  '帰路は倒さなくてもよい。戸の鍵を開けると家に帰っていく',
  '地図は一時停止メニューの「地図」。黄色の点線が自宅から商店街までの道',
  '暗い所では懐中電灯（L／十字キー下／灯）',
  '自動セーブは場所の移動と決着のあと。手動のセーブは自宅のノートPC',
  '（相棒）は近くの物陰に隠れる。離れすぎないように',
  '回復は H／十字キー上／回。缶コーヒーでも少し戻る',
];
const Q = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || Q.get('touch') === '1';
const AUTO_PRESET = autoPreset({ touch: isTouch, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory });

const DEFAULT_SETTINGS = () => Object.assign(applyPreset({ preset: 'auto' }, AUTO_PRESET), { preset: 'auto', difficulty: 'normal', assist: false, sens: 1, invertY: false, volume: 0.7, touchUI: isTouch, subSize: 'm', teleCB: false, rampageInput: 'both', shake: 1, keys: {} });

/** 区画の明かり（定義）と使い回しの点光源 */
const POOL_MAX = 8;

class Game {
  async init() {
    const S0 = new SaveStore(localStorage);
    this.store = S0; this.WP = createWP(localStorage);
    this.settings = Object.assign(DEFAULT_SETTINGS(), S0.readSettings() || {});
    this.autoPresetKey = AUTO_PRESET;
    if (Q.get('touch') === '1') this.settings.touchUI = true;
    if (Q.get('quality')) Object.assign(this.settings, applyPreset(this.settings, Q.get('quality')));
    if (Q.get('res')) this.settings.resScale = +Q.get('res');
    this.touch = isTouch; this.EQUIP = EQUIP;
    const P0 = this.presetVals();
    setDetail(P0 === PRESETS.low ? 0.72 : 1);
    Builder.edgesOff = !(this.settings.outline && this.settings.edges !== false);   // 辺の線を使わない段では作らない（区画の読み込みを速く）                       // スマホ（低）はキャラクターの分割を減らす
    // 描画
    const canvas = document.getElementById('sh-canvas');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: P0.antialias, powerPreference: 'high-performance' });
    r.setClearColor(0x0c0a16);
    r.shadowMap.type = THREE.PCFShadowMap; r.shadowMap.enabled = !!this.settings.shadows;     // 影の有無はシェーダーの種類を変えるので先に決める（先に作るシェーダーを無駄にしない）
    { const t0 = performance.now(); envInit(r, Object.assign({}, P0, Q.get('pbr') === '0' ? { pbr: false } : {}, Q.get('ibl') ? { ibl: Q.get('ibl') === '1' } : {})); envKitInit(P0); if (Q.get('kit') === '0') KIT.on = false; vegInit(this.presetKey(), P0, { shadows: !!this.settings.shadows, on: Q.get('veg') !== '0' }); vegNight(); this.envMs = Math.round(performance.now() - t0); }        // P12：PBR の材質（段で決める・区画を組み立てる前に）
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x100c1c, 0.045);
    this.scene.background = new THREE.Color(0x0c0a16);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 120);
    this.cam = new ThirdPersonCamera(this.camera);
    this.hemi = new THREE.HemisphereLight(0x5a5a9a, 0x1a1420, 1.1); this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0x2a2440, 0.6); this.scene.add(this.amb);
    const moon = this.moon = new THREE.DirectionalLight(0x9aa8e0, 0.9);
    moon.shadow.mapSize.set(P0.shadowSize, P0.shadowSize);
    Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 }); moon.shadow.bias = -0.0015;
    this.scene.add(moon); this.scene.add(moon.target);
    this.keyLight = new THREE.PointLight(0xc8b8ff, 1.4, 4, 1.5); this.scene.add(this.keyLight);
    // 懐中電灯
    this.flash = new THREE.SpotLight(0xfff2d8, 0, 18, 0.42, 0.45, 1.4); this.flash.castShadow = false; this.scene.add(this.flash); this.scene.add(this.flash.target);
    this.flashlightOn = false;
    // 使い回しの点光源（区画の明かりのうち近い物に割り当てる。数を変えない＝シェーダーを作り直さない）
    this.pool = []; this.poolN = Math.min(POOL_MAX, P0.lights);
    for (let i = 0; i < this.poolN; i++) { const p = new THREE.PointLight(0xffffff, 0, 10, 1.6); this.scene.add(p); this.pool.push({ light: p, def: null }); }
    this.fx = new Fx(this.scene); this.rain = new Rain(this.scene, Math.max(200, P0.rainN || 400));
    this.halos = new Halos(720); this.scene.add(this.halos.mesh);
    this.wet = new WetStreaks(160); this.scene.add(this.wet.mesh);
    if (P0.splash) { this.splash = new RainSplash(P0.rainN > 1000 ? 260 : 180); this.scene.add(this.splash.mesh); }
    if (P0.refl) this.refl = new GroundReflection(P0.refl);
    if (P0.post) { this.post = new Post(r, { post: P0.post }); this.post.mBright.uniforms.uThresh.value = 0.72; this.post.mComp.uniforms.uBloom.value = 0.5; this.post.mComp.uniforms.uVig.value = 0.3; }
    this.trail = new SwordTrail(36); this.scene.add(this.trail.mesh);
    this.flashHalo = -1;
    // 状態
    this.items = {}; this.flags = {}; this.picked = new Set(); this.opened = new Set(); this.resol = {}; this.enemyRes = {}; this.route = newRouteState();
    this.story = { step: 'pro_meet', boss: null }; this.puz = { roster: { done: {}, miss: 0 } };
    this.ownedEquip = []; this.equipped = [];
    this.metrics = { swaps: [], issen: { mikiri: 0, hajiki: 0, iai: 0, utsu: 0, chain: 0 }, just: 0, parry: 0, shots: 0, shotHits: 0, weakHits: 0, slashHits: 0, wallClips: 0, outOfBounds: 0, hurt: 0, enemyAttacks: {}, events: [], steps: [], cutscenes: [], puzzles: {}, areas: [] };
    this.enemies = []; this.civilians = []; this.pickupsList = []; this.areas = {}; this.timers = []; this.cineMoves = [];
    // 役者
    this.player = new Player(buildDannoura(), { difficulty: this.settings.difficulty, touch: isTouch, assist: this.settings.assist, ammo: 0, owned: [], weapon: 'none' });
    this.scene.add(this.player.root);
    this.purpleModel = this.player.model; this.whiteModel = this.makeWhiteModel();     // 白髪形態（化けを解いた姿）は先に作っておき、網を差し替える
    this.fires = []; this.actHist = []; this.decoy = null; this.ch3Losses = 0;
    this.makeChild();
    this.companion = new CompanionActor(buildCompanion(), new CompanionBrain({ x: -2.5, z: -33.8, mode: 'wait' }));
    this.scene.add(this.companion.root);
    this.heitenSign = this.makeSignStand();
    // 入力・画面
    this.sfx = new Sfx(); this.sfx.setVolume(this.settings.volume);
    this.input = new Input(canvas, { sens: this.settings.sens, keys: this.settings.keys });
    this.input.wantLock = () => this.mode === 'play' && !this.cut.active;
    this.input.onUnlock = () => { if (this.mode === 'play' && !this.noPauseOnUnlock && !this.cut.active) this.pause(); };
    this.ui = new UI(document.getElementById('sh-ui'), this);
    this.touchUI = setupTouch(document.getElementById('sh-ui'), this.input, this);
    this.applySetting('touchUI', this.settings.touchUI, true);
    this.applySetting('subSize', this.settings.subSize, true);
    this.applySetting('teleCB', !!this.settings.teleCB, true);
    this.cam.shakeMul = this.settings.shake ?? 1;
    this.cut = new CutscenePlayer(this.cutHost());
    this.moon.castShadow = !!this.settings.shadows;
    this.precompile();                 // 役者・光の輪などのシェーダーを GPU で先に作り始める（待たない：区画の組み立てと重ねる）
    this.events = await fetch(new URL('./data/events.json', import.meta.url)).then(r => r.json()).catch(() => ({ events: {}, barks: {}, texts: {}, speakers: {} }));
    this.manifest = await loadManifest();
    // P17：Blender で作り直した異形の体（起動の後で読む・読めたら今いる異形も差し替える。読めない時・?epack=0 はコードの形）
    setTimeout(() => preloadEnemyPacks(this.presetVals() === PRESETS.low ? 'low' : 'high').then(n => { this.enemyPacks = n; this.refreshEnemyPacks(); }, () => 0), 2000);
    this.loadCharacterModels();
    // 状態
    this.frame = 0; this.playSec = 0; this.mode = 'title'; this.hitstop = 0; this.slowT = 0; this.slowScale = 1; this.worldScale = 1;
    this.lock = null; this.dialog = null; this.pendingIn = null; this.autosaveReq = false; this.gunshot = null; this.gunshotT = 0; this.darkness = 0;
    this.applyEquip();
    { const t0 = performance.now(); this.loadArea('shotengai', 'arcade'); this.bootMs = { area: Math.round(performance.now() - t0) }; }
    this.precompile();                 // 区画のシェーダー
    this.applyQuality();
    addEventListener('resize', () => this.resize()); this.resize();
    this.perfOn = Q.get('perf') === '1'; this.perfAcc = { t: 0, n: 0, steps: 0 };
    this.tuneOn = Q.get('tune') === '1'; if (this.tuneOn) this.buildTune();
    this.last = performance.now(); this.acc = 0;
    this.renderer.setAnimationLoop(() => this.frameLoop());
    this.exposeAPI();
    this.title();
    this.bootMs.init = Math.round(performance.now());
  }
  /** シェーダーを先に作る（KHR_parallel_shader_compile：GPU の側で並べて作る。終わりを待たない） */
  precompile() {
    const r = this.renderer; if (!r.compile || Q.get('precompile') === '0') return;
    // 並べて作れる時は compileAsync（待たない）。無い時も compile は GPU へ頼むだけ（確かめるのは最初に描く時）＝区画の組み立てと重なる
    try { const t0 = performance.now(); if (r.extensions.has('KHR_parallel_shader_compile')) r.compileAsync(this.scene, this.camera).catch(() => {}); else r.compile(this.scene, this.camera); (this.bootMsPre || (this.bootMsPre = [])).push(Math.round(performance.now() - t0)); } catch (e) { console.warn('precompile', e); }
  }
  makeWhiteModel() { const m = buildDannouraWhite(); return m; }
  presetVals() { const k = this.settings.preset === 'auto' ? this.autoPresetKey : this.settings.preset; return PRESETS[k] || PRESETS[this.autoPresetKey] || PRESETS.high; }
  presetKey() { const P = this.presetVals(); return Object.keys(PRESETS).find(k => PRESETS[k] === P) || 'high'; }
  async loadCharacterModels() {
    const man = this.manifest; this.portraits = {}; if (!man || !man.characters) return;
    // ?vrm=0：VRM を読まず、コードで組んだ予備のキャラクターで動かす（比べる用）
    if (Q.get('vrm') === '0') { this.vrmLoaded = []; this.vrmSkipped = true; return; }
    // ?vrm=test：配管の試験用の VRM（コードで組んだだんのうらを書き出した物）と VRMA のクリップを使う（manifest の testEntries。本番の絵ではない）
    const m = Object.assign({}, man.characters, Q.get('vrm') && man.testEntries && man.testEntries[Q.get('vrm')] ? man.testEntries[Q.get('vrm')] : {});
    const lopt = { quality: this.presetVals() === PRESETS.low ? 'low' : 'high' };
    for (const [k, v] of Object.entries(m)) if (v && v.portrait) this.portraits[k] = new URL('./assets/characters/' + v.portrait, import.meta.url).href;
    if (m.dannoura && m.dannoura.file) { const v = await loadCharacter(m.dannoura, lopt); if (v) { const wasPurple = this.player.model === this.purpleModel; this.purpleModel = v; if (wasPurple) this.player.setModel(v); this.vrmLoaded = (this.vrmLoaded || []).concat('dannoura'); this.vrmStats = Object.assign({ who: 'dannoura', test: !!v.test }, v.stats || {}); } }
    if (m.companion && m.companion.file) { const v = await loadCharacter(m.companion, lopt); if (v) { this.companion.setModel(v); this.vrmLoaded = (this.vrmLoaded || []).concat('companion'); } }
    // 白い姿（化けを解いた姿）：起動を軽くするため少し後で読む（白い姿は第3章から）。読めたら網の差し替え先を VRM に（今が白い姿ならすぐ差し替え）。
    // 読み終わる前に化けを解いた時は、コードで組んだ白い姿のまま（後で差し替わる）。予備の分身（ch3 の幻術）はコードの白い姿のまま
    if (m.dannoura_white && m.dannoura_white.file) {
      const loadWhite = async () => { const v = await loadCharacter(m.dannoura_white, lopt); if (v) { const wasWhite = this.player.model === this.whiteModel; this.whiteModel = v; if (wasWhite) this.player.setModel(v); this.vrmLoaded = (this.vrmLoaded || []).concat('dannoura_white'); } };
      this.whiteVrmReady = new Promise(res => setTimeout(() => loadWhite().then(res, res), this.player.fighter.white ? 0 : 2500));
    }
    // P17：娘（結末の家の場面だけ）：Blender で作った VRM（tools/blender/char の daughter）。起動を軽くするため後で読む。読めない時・読み終わる前はコードで組んだ娘
    if (m.daughter && m.daughter.file) this.daughterVrmReady = new Promise(res => setTimeout(() => loadCharacter(m.daughter, lopt).then(v => { if (v) { this.daughterVrm = v; this.vrmLoaded = (this.vrmLoaded || []).concat('daughter'); } res(v); }, () => res(null)), 6000));
    // 異形（glTF 推奨）：読めたら次に区画を読み込む時から差し替え
    this.extModels = {};
    for (const k of ['kiro', 'heiten', 'shuuyou']) if (m[k] && m[k].file) { const v = await loadCharacter(m[k]); if (v) { await prepareClone(); this.extModels[k] = v; this.vrmLoaded = (this.vrmLoaded || []).concat(k); } }
    if (Object.keys(this.extModels).length && this.area) this.spawnEnemies(this.area.id);
    if (this.portraits.dannoura) this.ui.setPortrait(this.portraits.dannoura);
  }
  makeSignStand() {
    const hp = LEVEL.heiten.help.sign;
    const draw = text => (g, w, h) => { g.fillStyle = '#f6f0e0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d4a2c'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = text === '営業中' ? '#1d6a3c' : '#8a1a1a'; g.font = `bold ${text.length > 4 ? 46 : 70}px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 60)); };
    const tex = canvasTex(256, 256, draw('営業中'));
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.6), [toon(0x2a2a2a), new THREE.MeshBasicMaterial({ map: tex }), toon(0x2a2a2a), toon(0x2a2a2a), toon(0x2a2a2a), toon(0x2a2a2a)]);
    board.position.y = 0.75; board.rotation.z = 0.12; g.add(board);
    g.position.set(hp[0], 0, hp[1]);
    return { g, tex, set: text => { const c = tex.userData.canvas; draw(text)(c.getContext('2d'), c.width, c.height); tex.needsUpdate = true; } };
  }

  /** 区画の後回しの部分（町の遠い所：駅前・中央通りなど）を組み立てて足す。見た目・光・光の筋だけ（当たり判定は最初から全部ある） */
  buildPending(A, n = 1) {
    while (A.pending && A.pending.length && n-- > 0) {
      const t0 = performance.now(), job = A.pending.shift(), r = job();
      if (!r) continue;
      if (r.root) A.root.add(r.root);
      const live = this.area === A, base = A.halos.length;
      for (const sg of r.signals || []) { sg.heads = sg.heads.map(i => i + base); A.dyn.signals && A.dyn.signals.push(sg); }
      if (r.spots) A.spots.push(...r.spots); if (r.hideSpots) A.hideSpots.push(...r.hideSpots);
      for (const h of r.halos || []) { A.halos.push(h); if (live) h.idx = this.halos.add(h.p, h.size, h.color, h.k); }
      for (const w of r.wet || []) { A.wet.push(w); if (live) w.idx = this.wet.add(w.p, w.size, w.color, w.k); }
      for (const l of r.lights || []) A.lights.push(Object.assign({ base: l.intensity }, l));
      if (r.after) r.after(this);
      if (ENV.pbr && r.root) r.root.traverse(o => { if (o.name === 'town_pools') o.material.color.setScalar(0.5); });
      if (r.kitItems && r.kitItems.length) { (A.kitItems || (A.kitItems = [])).push(...r.kitItems); envKitApply(A); }
      if ((r.vegItems && r.vegItems.length) || (r.vegCover && r.vegCover.length)) { (A.vegItems || (A.vegItems = [])).push(...(r.vegItems || [])); (A.vegCover || (A.vegCover = [])).push(...(r.vegCover || [])); if (live) vegApply(A, this); }   // P16
      if (r.root) r.root.traverse(o => { if (o.userData.isEdgeLines) o.visible = this.settings.outline && this.settings.edges !== false; });
      A.mapImg = null;                                              // ミニマップの下絵は作り直す
      (this.bootMs || (this.bootMs = {})).pending = (this.bootMs.pending || 0) + Math.round(performance.now() - t0);
    }
  }

  // ── 区画 ──
  loadArea(id, spawn) {
    if (this.area) {
      this.scene.remove(this.area.root);
      for (const e of this.enemies) this.scene.remove(e.root);
      for (const c of this.civilians) this.scene.remove(c.root);
      if (this.pickMesh) { this.scene.remove(this.pickMesh); this.pickMesh = null; }
      if (this.area.id === 'shotengai') this.scene.remove(this.heitenSign.g);
    }
    const A = this.areas[id] || (this.areas[id] = BUILDERS[id]());
    this.area = A; this.boxes = A.boxes; this.scene.add(A.root);
    if (this.giantMode && !A.giant) this.exitGiant();
    this.camera.far = A.far || 120; this.camera.updateProjectionMatrix();
    { const sc = this.moon.shadow.camera, k = A.giant ? 46 : 14; if (sc.right !== k) { Object.assign(sc, { left: -k, right: k, top: k, bottom: -k, far: A.giant ? 140 : 50 }); sc.updateProjectionMatrix(); } }
    this.hold = null; this.trapStartAt = null; this.trapDone = false;
    this.metrics.areas.push(id);
    const fog = A.fog || { color: 0x100c1c, density: 0.045 };
    this.scene.fog.color.setHex(fog.color); this.scene.fog.density = fog.density; this.scene.background.setHex(fog.color);
    this.halos.uniforms.uFog.value = fog.density; this.wet.uniforms.uFog.value = fog.density;
    { const LT = A.light || { hemi: 1.1, amb: 0.6 }; this.hemi.intensity = LT.hemi; this.amb.intensity = LT.amb; }   // 区画ごとの空と周りの明かり（P12：背景の材質の側だけ envmat の uAmbK で弱める＝人物の明るさは前のまま）   // 区画ごとの空と周りの明かり（病院は弱く：白く飛ばない）
    this.halos.clear(); for (const h of A.halos) h.idx = this.halos.add(h.p, h.size, h.color, h.k);
    this.flashHalo = this.halos.add([0, -50, 0], 0.4, 0xfff0d0, 0);
    this.wet.clear(); for (const w of A.wet) w.idx = this.wet.add(w.p, w.size, w.color, w.k);
    for (const p of this.pool) p.def = null;
    this.heitenZone = id === 'shotengai' ? LEVEL.heiten.zone : null;
    if (id === 'shotengai') this.scene.add(this.heitenSign.g);
    this.fx.clearDecals(); this.lock = null; this.darkness = 0;
    // 戸の状態
    for (const [k, d] of Object.entries(A.dyn)) if (k.startsWith('door_') && d.pivot) { d.open = this.opened.has(k.slice(5)); d.pivot.rotation.y = d.open ? -1.45 * (d.face || 1) : 0; d.closeAt = null; if (d.open) this.halos.setColor(d.halo, 0xffe0a0); }
    if (id === 'shelter') { if (this.flags.gym_key && atLeast(this.story.step, 'ch2_gym')) this.openGymDoor(); const sh = A.dyn.storageShutter; sh.target = this.enemyRes.shuuyou_1 === 'neutralize' ? sh.down : sh.up; sh.mesh.position.y = sh.target; for (const l of A.lights) { l.off = false; if (l.emergency) l.intensity = 0; } }
    if (id === 'shotengai') { A.dyn.rackKatana.visible = !this.player.fighter.owned.includes('katana'); this.applyStreetState(false); }
    if (id === 'hospital') {
      const D = A.dyn.door306; if (D && this.flags.door306 && !D.open) { D.open = true; const i = A.boxes.indexOf(D.box); if (i >= 0) A.boxes.splice(i, 1); D.mesh.position.z = -16.7; D.mesh.rotation.y = 1.4; this.halos.setColor(D.halo, 0x60ff90); }
      for (const l of A.lights) l.off = false; this.applyWardLights();
    }
    if (id === 'tunnel') {
      const R = A.dyn.refugeShutter, closed = ['ch3_boss', 'ch3_boss2'].includes(this.story.step);
      R.target = closed ? R.down : R.up; R.mesh.position.y = R.target; const i = A.boxes.indexOf(R.box); if (closed && i < 0) A.boxes.push(R.box); if (!closed && i >= 0) A.boxes.splice(i, 1);
    }
    A.root.traverse(o => { if (o.userData.shafts || o.userData.stains) o.material.uniforms.uFog.value = fog.density; });
    this.twistSpawned = false; this.mamori = null; this.tenkiOpen = false; this.fires.length = 0; this.decoy = null; if (this.decoyModel) this.decoyModel.root.visible = false;
    this.spawnEnemies(id);
    this.buildPickups(id);
    // だんのうら・相棒の置き場所
    const sp = (A.spawns[spawn] || A.spawns[Object.keys(A.spawns)[0]]);
    if (spawn) this.placePlayer([sp[0], 0, sp[1]], sp[2]);
    this.placeCompanion();
    this.placeChildForArea(id);
    this.exitArmed = false; this.wasInHome = null;
    this.sfx.setAmbience(A.amb || (id === 'shotengai' ? (streetState(this.story.step) === 'normal' && !this.flags.lights_out ? 'street_normal' : 'street') : 'street'));
    this.rain.mesh.visible = !!A.rain && this.settings.rain;
    envKitApply(A);                                                   // P12：Blender の部品（読めていれば）
    vegApply(A, this);                                                // P16：植物の部品（読めていれば・まだの物だけ）
    if (ENV.pbr && !A.poolsDim) { A.poolsDim = true; A.root.traverse(o => { if (o.name === 'town_pools') o.material.color.setScalar(0.5); }); }   // PBR の段は点光源が地面を照らすので、足し合わせの光のたまりは弱く
  }
  changeArea(to, spawn) {
    this.ui.fade(true, { title: (AREA_GRAPH[to] || {}).name || '', tip: LOAD_TIPS[(this.tipN = ((this.tipN ?? Math.floor(Math.random() * LOAD_TIPS.length)) + 1)) % LOAD_TIPS.length] }); this.sfx.play('door');
    const comp = this.companion.brain.mode === 'follow' || this.companion.brain.mode === 'hide';
    this.loadArea(to, spawn);
    if (comp && this.companion.root.visible) { this.companion.brain.setMode('follow'); this.companion.brain.teleportBehind(this.player.pos, this.player.yaw); this.companion.root.visible = true; this.placeChildForArea(to); }
    this.autosaveReq = true;
    setTimeout(() => this.ui.fade(false), this.isTest() ? 50 : 420);
    this.onAreaEnterStory(to);
  }
  placeCompanion() {
    const C = this.companion, b = C.brain, s = this.story.step, id = this.area.id;
    C.root.visible = false; C.anim = null;
    if (this.placeCompanion7(id)) return;
    if (this.placeCompanion6(id)) return;
    if (this.placeCompanion5(id)) return;
    if (this.placeCompanion4(id)) return;
    if (id === 'shotengai' && s === 'pro_meet') { C.root.visible = true; b.setMode('wait'); b.pos = { x: -2.5, z: -33.8 }; b.yaw = 0.6; return; }
    if (id === 'tunnel' && ['ch3_boss', 'ch3_boss2'].includes(s)) { b.setMode('scripted'); b.pos = { x: 11.2, z: -28.8 }; return; }   // 詰所に隠れている
    if (this.flags.reunited) { C.root.visible = true; if (b.mode === 'wait' || b.mode === 'scripted') b.setMode('follow'); b.teleportBehind(this.player.pos, this.player.yaw); return; }
    if (id === 'alley' && atLeast(s, 'ch1_street')) { C.root.visible = true; b.setMode('scripted'); b.pos = { x: 6.0, z: -19.7 }; b.yaw = Math.PI; C.anim = 'hide'; }
  }
  areaLight(fn) { return this.area.lights.find(fn); }
  /** 商店街の明かり・人・敵の状態（序章のふだん／消灯後／発生後） */
  applyStreetState(respawn) {
    if (this.area.id !== 'shotengai') return;
    const A = this.area, st = streetState(this.story.step), out = this.flags.lights_out;
    for (const l of A.lights) {
      if (l.town) { l.off = false; continue; }                  // 町（住宅地・駅前通り）の街灯は消えない（停電はアーケードだけ）
      if (st === 'normal' && !out) { l.off = false; l.flicker = false; }
      else if (st === 'normal' && out) { l.off = !(l.home || l.pos[2] === -56 || l.vending && false); l.flicker = l.pos[2] === -56; }
      else { l.off = false; l.flicker = !!LEVEL.lights.find(x => x.pos === l.pos && x.flicker); if (l.vending) l.off = false; }
    }
    for (const h of A.halos) {
      if (h.strip) h.off = st === 'normal' ? !!out : !h.onOutbreak;
      if (h.shopFront) h.off = !(st === 'normal' && !out);
      if (h.lantern) { h.off = st === 'normal' ? !!out : !h.alt; h.flicker = st !== 'normal'; }
      if (h.neon) { h.off = st === 'normal' && out; }
    }
    if (A.dyn.lampMat) A.dyn.lampMat.color.setScalar(st === 'normal' && !out ? 1 : st === 'normal' ? 0.12 : 0.55);
    this.sfx.setAmbience(st === 'normal' && !out ? 'street_normal' : 'street');
    if (respawn) this.spawnEnemies('shotengai');
  }

  // ── 敵・人 ──
  spawnEnemies(id) {
    for (const e of this.enemies) this.scene.remove(e.root);
    for (const c of this.civilians) this.scene.remove(c.root);
    this.enemies = []; this.civilians = []; this.boss = null; this.heiten = null;
    const ext = k => (this.extModels && this.extModels[k] ? cloneCharacter(this.extModels[k]) : null);
    const add = (brain, model) => { const x = ext(brain.kind); if (x) { x.bodyR = model.bodyR; x.height = model.height; model = x; } const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    const s = this.story.step;
    const mkKiro = (k, i, doors) => {
      const brain = new Kiro({ id: k.id, path: k.path.map(([x, z]) => ({ x, z })), home: k.door, startIdx: k.start, seed: 11 + i * 7, def: k.def });
      const door = doors && doors[k.door];
      return add(brain, buildKiro(k.color || (door && door.color) || 0xd04848));
    };
    if (id === 'shotengai') {
      if (streetState(s) === 'normal') {
        if (!this.enemyRes.kiro_t && atLeast(s, 'pro_meet')) {
          const def = Object.assign({}, ENEMIES.kiro, { hp: 44, tutorial: true });
          const e = mkKiro({ id: 'kiro_t', door: null, path: [[0.9, -45.5], [0.6, -50], [1.0, -55]], start: 0, color: 0x8a8aa0, def }, 0);
          e.root.visible = !!this.flags.lights_out;
          if (atLeast(s, 'pro_fight')) { e.brain.hostileBy = 'tutorial'; e.brain.go('hostile', []); e.brain.lastSeen = { x: this.player.pos.x, z: this.player.pos.z }; e.brain.lastSeenT = 0; }
        }
        if (!this.flags.lights_out) {
          const C = [[2.5, -20, 0, [[2.5, -14], [2.5, -26]]], [-2.6, -44.5, 1.2, null], [3.1, -37.5, -1.6, null], [-2.4, -12, 0.2, [[-2.4, -6], [-2.4, -18]]]];
          C.forEach(([x, z, yaw, path], i) => { const c = new CivilianActor(buildCivilian(i + 2), x, z, yaw, path); this.civilians.push(c); this.scene.add(c.root); });
        }
        return;
      }
      LEVEL.kiro.forEach((k, i) => { const r = this.enemyRes[k.id]; if (r) return; mkKiro(k, i, LEVEL.doors); });
      const H = LEVEL.heiten, r = this.enemyRes[H.id];
      if (r !== 'kill') {
        const st = {}; for (const [k, v] of Object.entries(H.stations)) st[k] = { x: v[0], z: v[1] };
        st.shutter.face = { x: -10, z: -40 }; st.bow.face = { x: -10, z: -40 }; st.register.face = { x: 9.6, z: -45 }; st.lights.face = { x: 12, z: -35.5 };
        const hb = new Heiten({ id: H.id, stations: st, pos: { x: H.start[0], z: H.start[1] }, center: { x: H.center[0], z: H.center[1] }, leash: H.leash, seed: 5 });
        this.heiten = add(hb, buildHeiten());
        if (r === 'rescue') { hb.resolution = 'rescue'; hb.state = 'rest'; this.heitenSign.set('本日は\n閉店しました'); this.heitenStep('rest'); } else { this.heitenSign.set('営業中'); this.heitenStep('reset'); }
      }
      return;
    }
    if (id === 'alley' || id === 'plaza') {
      AREA_DATA[id].kiro.forEach((k, i) => { if (this.enemyRes[k.id]) return; mkKiro(k, i + 20, AREA_DATA[id].doors); });
      return;
    }
    if (this.spawnCh3(id, add)) return;
    if (this.spawnCh7(id, add)) return;
    if (this.spawnCh6(id, add)) return;
    if (this.spawnCh5(id, add)) return;
    if (this.spawnCh4(id, add)) return;
    if (id === 'shelter') {
      const B = AREA_DATA.shelter.boss, r = this.enemyRes[B.id];
      if (r === 'kill' || r === 'neutralize' || atLeast(s, 'ch3_hosp')) return;
      const b = new Shuuyou({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, yaw: 0, trueName: bossName(), storage: B.storage, arena: B.arena, seed: 9 });
      this.boss = add(b, buildShuuyou());
      if (r === 'rescue') { b.resolution = 'rescue'; b.state = 'rest'; }
    }
  }
  buildPickups(id) {
    const list = (id === 'shotengai' ? LEVEL.pickups : (AREA_DATA[id] || {}).pickups || []).filter(p => !this.picked.has(p.id));
    // 序章の鉄パイプ（自販機の横）
    this.pipeSpot = null;
    if (id === 'shotengai' && !this.player.fighter.owned.includes('pipe')) {
      const sp = { id: 'pipe', kind: 'pickupSpot', give: 'weapon:pipe', x: -2.6, z: -30.2, r: 1.3, label: '鉄パイプを拾う' };
      this.pipeSpot = sp;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.92, 8), toon(0x8a8580)); m.rotation.z = Math.PI / 2; m.rotation.y = 0.4; m.position.set(-2.8, 0.03, -30.0); this.scene.add(m); sp.mesh = m;
      this.pipeMesh = m; sp.halo = this.halos.add([-2.8, 0.15, -30.0], 0.7, 0xfff0c0, 0.35);
    } else if (this.pipeMesh) { this.scene.remove(this.pipeMesh); this.pipeMesh = null; }
    this.pickupsList = list;
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(0.28, 0.16, 0.2); geo.translate(0, 0.1, 0);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff }), list.length);
    const M = new THREE.Matrix4();
    list.forEach((p, i) => { M.makeRotationY(i * 1.3); M.setPosition(p.pos[0], 0, p.pos[1]); m.setMatrixAt(i, M); m.setColorAt(i, new THREE.Color(ITEMS[p.item].ammo ? 0xc8a040 : p.item === 'coffee' ? 0x8a5a3a : 0xe05060)); p.halo = this.halos.add([p.pos[0], 0.2, p.pos[1]], 0.7, 0xfff0c0, 0.4); p.inst = i; });
    m.name = 'pickups'; this.scene.add(m); this.pickMesh = m;
  }
  placePlayer(pos, yaw) {
    this.player.pos.set(pos[0], 0, pos[2] != null ? pos[2] : pos[1]); this.player.yaw = yaw;
    this.cam.yaw = yaw + Math.PI; this.cam.curDist = 1.2;
  }

  // ── タイトル ──
  title() {
    if (!this.portraitMade) this.portraitDue = 3;      // 顔の絵（HUD）は最初のこまを描いた後に作る（起動を速く：シェーダーの準備と GPU の読み戻しを起動の後ろへ）
    const el = document.getElementById('sh-title');
    const has = !!this.store.load('auto');
    const own = (this.WP.read().games || {}).shinshoku || {}, clear = this.store.load('clear');
    const ends = Object.assign({}, own.endings || {}); if (clear && clear.endings) for (const k of Object.keys(clear.endings)) ends[k] = ends[k] || clear.endings[k];
    const cleared = Object.keys(ends).some(k => ends[k]);
    this.titleInfo = { has, cleared, own: Object.assign({}, own, { endings: ends }), clear };
    el.querySelector('[data-a="cont"]').hidden = !has;
    el.querySelector('[data-a="gallery"]').hidden = !cleared;
    el.querySelector('.tt-panel').hidden = true;
    el.hidden = false; document.getElementById('sh-boot').hidden = true;
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      this.sfx.init(); this.sfx.play('ui');
      const a = b.dataset.a;
      if (a === 'new') { if (cleared && clear && clear.carry) { this.titlePanel('new'); return; } this.newGame(this.jumpStepFromQuery()); }
      else if (a === 'cont') this.loadSlot('auto');
      else if (a === 'chapters' || a === 'gallery') this.titlePanel(a);
      else if (a === 'settings') this.ui.openMenu('settings');
      else if (a === 'back') { location.href = 'index.html'; }
      else if (a === 'close') { el.querySelector('.tt-panel').hidden = true; el.classList.remove('tt-open'); }
      else if (a === 'fresh') this.newGame(null);
      else if (a === 'ngplus') this.newGamePlus();
      else if (b.dataset.ch) this.chapterSelect(b.dataset.ch);
      else if (b.dataset.g) this.galleryPlay(b.dataset.g);
    };
    if (Q.get('autostart') === '1') this.newGame(Q.get('step') || this.jumpStepFromQuery());
    if (Q.get('continue') === '1' && has) this.loadSlot('auto');
  }
  /** タイトルの小さな表：章選択・記録（ギャラリー）・はじめから（引き継ぎの選択） */
  titlePanel(kind) {
    const el = document.getElementById('sh-title'), P = el.querySelector('.tt-panel'), T = this.titleInfo || {};
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    let html = '';
    if (kind === 'chapters') {
      const ok = selectableChapters(T.own);
      html = `<h3>章選択</h3>${T.cleared ? '' : '<div class="tt-lock">結末を見ると、すべての章を選べます（今は記録のある章だけ）。</div>'}`
        + CHAPTER_SELECT.map(c => `<div class="tt-row"><button data-ch="${c.id}" ${ok.includes(c.id) ? '' : 'disabled'}>${esc(c.title)}</button>${c.route ? `<span class="tt-lock">${c.route === 'reveal' ? '妖力解放' : '正体秘匿'}</span>` : ''}</div>`).join('')
        + '<div class="tt-sec">分岐の後の章は、そのルートで始まります（記録に「章選択」と残る）。</div>';
    }
    if (kind === 'gallery') {
      const got = galleryUnlocked(T.own.endings || {});
      html = '<h3>記録（ギャラリー）</h3>' + GALLERY.map(g => `<div class="tt-row"><button data-g="${g.id}" ${got.includes(g.id) ? '' : 'disabled'}>${esc(g.title)}</button>${got.includes(g.id) ? '' : '<span class="tt-lock">まだ見ていない</span>'}</div>`).join('')
        + `<div class="tt-sec">見た結末：${Object.keys(T.own.endings || {}).filter(k => T.own.endings[k]).length} / 2（本作の記録だけ。本編の結末とは別）</div>`;
    }
    if (kind === 'new') html = '<h3>はじめから</h3><div class="tt-row"><button data-a="fresh">はじめから</button></div><div class="tt-row"><button data-a="ngplus">引き継いで はじめから（仮）</button></div><div class="tt-sec">引き継ぎ：装備・回復の道具・弾。武器と姿は物語で手に入れ直します。</div>';
    P.innerHTML = html + '<div class="tt-row"><button data-a="close">閉じる</button></div>'; P.hidden = false; el.classList.add('tt-open');
    this.metrics.titlePanel = kind;
  }
  /** 章選択（クリア後）：その章の初めから。分岐の後の章はそのルートで（branchLog の via は chapter_select） */
  chapterSelect(id) {
    const c = CHAPTER_SELECT.find(q => q.id === id); if (!c) return;
    this.jumpVia = 'chapter_select'; this.flags.chapterSelect = id; this.metrics.chapterSelect = id;
    this.newGame(c.step);
  }
  galleryPlay(id) {
    this.galleryMode = true; this.metrics.gallery = id;
    if (id === 'g_end_reveal') this.newGame('end_a');
    else if (id === 'g_end_secret') this.newGame('end_b');
    else if (id === 'g_both_routes') this.playBoth7();
  }
  newGamePlus() {
    const clear = this.store.load('clear'); if (!clear) { this.newGame(null); return; }
    const n = (clear.ngPlus || 0) + 1; this.store.write('clear', Object.assign({}, clear, { ngPlus: n }));
    this.carryPending = { carry: clear.carry, n };
    this.newGame(null);
  }
  /** 章の飛び先（?ch=3｜?ch=4、?ch=4&route=reveal|secret は分岐の後から） */
  jumpStepFromQuery() {
    const ch = Q.get('ch'), rt = Q.get('route');
    if (ch === '3') return 'ch3_lobby';
    if (ch === '4') return rt === 'reveal' ? 'ch4_r_fight' : rt === 'secret' ? 'ch4_s_trial' : 'ch4_office';
    if (ch === '5') return rt === 'secret' ? 'ch5_s_enter' : 'ch5_r_enter';
    if (ch === '7') { const at = Q.get('at'); return rt === 'secret' ? (at === 'boss' ? 'ch7b_boss' : 'ch7b_enter') : (at === 'boss' ? 'ch7a_boss' : 'ch7a_edge'); }
    if (Q.get('ending') === 'A' || Q.get('ending') === 'B') return Q.get('ending') === 'A' ? 'end_a' : 'end_b';
    if (ch === '6') { const at = Q.get('at'); if (rt === 'secret') return { rounds: 'ch6_s_rounds', boss: 'ch6_s_boss', control: 'ch6_s_control' }[at] || 'ch6_s_enter'; return { ruins: 'ch6a_threads', avenue: 'ch6a_avenue', boss: 'ch6a_boss' }[at] || 'ch6a_rampage'; }
    return null;
  }
  /** はじめから。step（試験用）でその段から始められる */
  newGame(step) {
    document.getElementById('sh-title').hidden = true;
    this.startedAt = performance.now();
    this.mode = 'play';
    if (step && STEPS.find(s => s.id === step)) this.jumpToStep(step);
    else { this.refreshObjective(); if (!this.isTest()) this.input.requestLock(); }
    if (this.carryPending) { const c = this.carryPending; this.carryPending = null; this.applyCarry7(c.carry, c.n); }
    if (!step && Q.get('skipintro') !== '1') this.playEvent('ev_intro', () => { this.flags.intro_done = true; });
    else this.flags.intro_done = true;
  }
  /** 試験・ショートカット：段の初期状態へ */
  jumpToStep(step) {
    const F = this.player.fighter;
    this.story.step = step;
    for (const w of weaponsAt(step)) F.give(w);
    if (F.owned.length && !F.owned.includes(F.weapon)) { F.weapon = F.owned.includes('katana') ? 'katana' : F.owned[0]; F.lastMelee = F.weapon; }
    if (atLeast(step, 'pro_pipe')) this.flags.lights_out = true; else delete this.flags.lights_out;
    if (!atLeast(step, 'ch1_alley')) { delete this.flags.reunited; if (step !== 'pro_meet') this.companion.brain.setMode('scripted'); }
    if (atLeast(step, 'pro_home')) this.enemyRes.kiro_t = 'escape';
    if (atLeast(step, 'ch1_alley')) { this.flags.reunited = true; this.companion.brain.setMode('follow'); }
    if (atLeast(step, 'ch2_shelter')) this.flags.plaza_broadcast = true;
    if (atLeast(step, 'ch2_key')) { this.flags.roster_done = true; this.flags.seen_roster = this.flags.seen_cards = true; }
    if (atLeast(step, 'ch2_gym')) this.flags.gym_key = true;
    // 第3章（試験・ショートカット）
    if (atLeast(step, 'ch3_hosp')) { this.flags.ch3_started = true; this.enemyRes.shuuyou_1 = this.enemyRes.shuuyou_1 || 'rescue'; this.story.boss = this.story.boss || 'rescue'; }
    if (atLeast(step, 'ch3_ward')) { this.flags.records_done = this.flags.seen_board = this.flags.seen_charts = true; this.flags.key306 = true; this.puz.records = { done: true, picked: '306', miss: 0 }; }
    if (atLeast(step, 'ch3_guard')) this.flags.door306 = true;
    if (atLeast(step, 'ch3_down')) { this.flags.child_saved = this.flags.truth_seen = true; this.enemyRes.mamori = this.enemyRes.mamori || 'rescue'; }
    if (atLeast(step, 'ch3_boss2')) { const st = Q.get('stance') === 'secret' ? 'secret' : 'reveal'; this.route = Object.assign(normalizeRoute(this.route), {}); if (!this.route.stance) { this.route.stance = st; if (st === 'reveal') this.route.forms.whiteUnlocked = true; this.route.branchLog.push({ seq: this.route.branchLog.length + 1, kind: 'stance', decision: st, chapter: 'ch03', step: 'ch3_tenki', via: 'debug', locksRoute: false }); } this.player.fighter.yokiOn = st === 'reveal'; this.player.fighter.yoki = 60; }
    if (atLeast(step, 'ch3_end')) this.flags.tunnel_clear = true;
    const j7 = this.jump7(step);
    if (j7) { this.loadArea(j7.area, j7.spawn); this.afterLoad4(); this.afterLoad5(true); this.afterLoad6(true); this.afterLoad7(true); this.refreshObjective(); return; }
    const j6 = this.jump6(step);
    if (j6) { this.loadArea(j6.area, j6.spawn); this.afterLoad4(); this.afterLoad5(true); this.afterLoad6(true); this.refreshObjective(); return; }
    const j5 = this.jump5(step);
    if (j5) { this.loadArea(j5.area, j5.spawn); this.afterLoad4(); this.afterLoad5(true); this.refreshObjective(); return; }
    const j4 = this.jump4(step);
    if (j4) { this.loadArea(j4.area, j4.spawn); this.afterLoad4(); if (step === 'ch4_r_fight' && !this.player.fighter.white) this.setWhite(true, 'scripted'); this.refreshObjective(); return; }
    const area = stepDef(step).area;
    const spawn = { shotengai: atLeast(step, 'pro_tv') ? 'home_in' : 'arcade', alley: 'from_street', plaza: 'from_alley', shelter: atLeast(step, 'ch2_gym') ? 'gym_in' : 'from_plaza', hospital: step === 'ch3_ward' ? 'ward' : atLeast(step, 'ch3_guard') ? 'room306' : 'lobby', tunnel: atLeast(step, 'ch3_boss') ? 'arena' : 'from_hospital' }[area];
    if (step === 'ch3_hosp') { this.loadArea('shelter', 'from_tunnel'); this.placePlayer([-4.6, 0, 17.6], Math.PI / 2); this.refreshObjective(); return; }
    this.loadArea(area, spawn);
    this.refreshObjective();
  }
  isTest() { return Q.get('autostart') === '1' || Q.get('test') === '1'; }

  // ── ループ ──
  frameLoop() {
    const now = performance.now(); let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.25) dt = 0.25;
    this.acc += dt; let n = 0;
    while (this.acc >= DT && n < 6) { if (!this.simHold) this.step(); this.acc -= DT; n++; }
    if (n >= 6) this.acc = 0;
    this.render(dt, n);
    if (this.bootMs && !this.bootMs.frame1) this.bootMs.frame1 = Math.round(performance.now());
    else if (this.bootMs && (this.bootMs.frames || (this.bootMs.frames = [])).length < 6) this.bootMs.frames.push(Math.round(performance.now()));
    if (this.portraitDue != null && --this.portraitDue <= 0) { this.portraitDue = null; setTimeout(() => { const t0 = performance.now(); try { this.makePortrait(); this.bootMs.portrait = [Math.round(t0), Math.round(performance.now() - t0)]; } catch (e) { console.warn('portrait', e); } }, 3500); }
    // 遠い所の組み立て：起動の直後（GPU がシェーダーを作っている間）は待ち、少し後か、近づいた時に
    // P12：PBR の地図帳と部品は起動の後（最初のこまの 1.2 秒後）に読む＝起動を遅くしない
    if (this.bootMs && this.bootMs.frame1 && !this.envLoadAsked && performance.now() - this.bootMs.frame1 > 1200) { this.envLoadAsked = true; const t0 = performance.now(); envLoad().then(ok => { this.bootMs.envAtlas = ok ? [Math.round(t0), Math.round(performance.now() - t0)] : 'none'; }); envKitLoad(this).then(n => { this.bootMs.kit = n; }); const t1 = performance.now(); vegLoad(this).then(n => { this.bootMs.veg = [Math.round(t1), Math.round(performance.now() - t1), n]; }); }
    if (this.area && this.area.pending && this.area.pending.length && this.bootMs && this.bootMs.frame1 && !this.cut.active) { const P = this.player.pos, near = P.x > 48 || P.z < -60; if (near || performance.now() - this.bootMs.frame1 > 2500) this.buildPending(this.area, 1); }
  }
  step() {
    const inp = this.input.sample();
    if (this.mode === 'title') return;
    // 遅らせた出来事（演出の明かりの順番など）：シミュレーションの時間で
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= DT; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    if (this.cut.active) {
      this.cut.update(DT, { skipHeld: inp.skipHeld, advance: inp.interact || inp.attack });
      this.ui.skipProgress(this.cut.hold || 0);
      this.stepCineMoves(DT);
      if (this.child && this.child.cineTo) this.stepChildCine(DT);
      for (const e of this.enemies) if (e.brain.state === 'rise' || e.brain.state === 'dormant') { /* 起き上がり：姿勢だけ */ }
      this.frame++; return;
    }
    if (this.mode === 'puzzle') return;
    if (this.mode === 'dialog') { if (inp.interact || inp.attack || inp.dodge) this.dialogNext(); return; }
    if (this.mode !== 'play') { if (inp.pause && this.mode === 'pause') this.resume(); return; }
    if (inp.pause) { this.pause(); return; }
    if (inp.map && !this.giantMode) { this.pause(); this.ui.openMenu('map'); return; }
    this.frame++; this.playSec += DT;
    if (this.hitstop > 0) { this.hitstop--; this.pendingIn = mergeIn(this.pendingIn, inp); return; }
    const I = this.pendingIn ? mergeIn(this.pendingIn, inp) : inp; this.pendingIn = null;
    if (this.pendingWant) { I.wantWeapon = this.pendingWant; this.pendingWant = null; }
    if (this.slowT > 0) { this.slowT--; this.worldScale = this.slowScale; if (this.slowT === 0) { this.ui.slow(false); this.sfx.setMuffle(0); } } else this.worldScale = 1;
    if (this.gunshotT > 0) this.gunshotT--; else this.gunshot = null;
    if (this.giantMode) { if (this.rampage && !this.rampage.calm) this.stepRampage5(I); else if (this.protect) this.stepProtect5(I); else this.stepGiant(I); }
    else { this.stepPlayer(I); this.stepWhite(I); }
    const wdt = DT * this.worldScale;
    for (const e of this.enemies) { this.stepEnemy(e, wdt); if (e.justNoticed > 0) e.justNoticed -= DT; if (e.teleT > 0) { e.teleT -= DT; if (e.teleT <= 0) e.tele = null; } }
    this.stepCompanion(wdt);
    this.stepChild(wdt);
    this.stepCompanionThreats();
    this.stepWorld(I);
    this.storyTick();
  }
  stepCompanion(dt) {
    const C = this.companion, b = C.brain, P = this.player;
    if (!C.root.visible) return;
    if (b.mode === 'follow' || b.mode === 'hide') b.crumb(P.pos);
    const sense = {
      player: { x: P.pos.x, z: P.pos.z, yaw: P.yaw, speed: P.speed, dead: P.fighter.dead },
      enemies: this.enemies.filter(e => e.brain.alive && e.root.visible).map(e => ({ id: e.id, x: e.pos.x, z: e.pos.z, hostile: ['hostile', 'assess', 'stagger', 'down', 'rollcall'].includes(e.brain.state), attacking: !!e.brain.attacking, tele: e.tele || null, justNoticed: e.justNoticed > 0 })),
      hideSpots: this.area.hideSpots,
    };
    const out = b.update(dt, sense);
    C.step(dt, out, this.boxes);
    for (const ev of out.events) {
      if (ev.t === 'warn') { this.bark(ev.key, 2.2); this.sfx.play('notify'); this.metrics.warnings = (this.metrics.warnings || 0) + 1; }
      if (ev.t === 'hide' && !this.flags.hide_bark) { this.flags.hide_bark = true; this.bark('companion_hide', 2.4); }
      if (ev.t === 'escaped') { const e = this.enemies.find(x => x.held); if (e) { e.held = false; e.brain.cool = 0.5; } this.bark('companion_escaped', 2.6); }
    }
  }

  // ── 世界（拾う・調べる・出入り・自動セーブ・緊張） ──
  stepWorld(I) {
    const P = this.player;
    for (const p of this.pickupsList) {
      if (this.picked.has(p.id)) continue;
      if (Math.hypot(P.pos.x - p.pos[0], P.pos.z - p.pos[1]) < 0.9) this.pickup(p);
    }
    let best = null, bd = 1e9, nearExit = false;
    let spots = this.pipeSpot && !this.picked.has('pipe') ? this.area.spots.concat([this.pipeSpot]) : this.area.spots;
    // 第3章：その場の「声をかける」（看護の人と取り違えた患者）・「本物の声を聞かせる」（呼び声の間の写し身）
    const extra = [];
    for (const e of this.enemies) {
      if (e.kind === 'kanja' && e.brain.state === 'nurse') extra.push({ id: 'callout_' + e.id, kind: 'callout', ref: e, x: e.pos.x, z: e.pos.z, r: 2.6, label: '声をかける（巡回の時間ですよ）' });
      if (e.kind === 'utsushimi' && e.brain.state === 'voice' && this.flags.memo) extra.push({ id: 'memo', kind: 'memo', ref: e, x: P.pos.x, z: P.pos.z, r: 99, label: '本物の声を聞かせる（子ども用の携帯の留守電）' });
    }
    if (this.extraSpots5) extra.push(...this.extraSpots5());
    if (this.extraSpots6) extra.push(...this.extraSpots6());
    if (extra.length) spots = spots.concat(extra);
    for (const s of spots) {
      const d = Math.hypot(P.pos.x - s.x, P.pos.z - s.z);
      if (s.kind === 'exit' && s.auto && d < s.r + 0.4) nearExit = true;
      if (d > s.r) continue;
      if (s.floor != null && (s.floor === 1) !== (P.pos.y > 1.65)) continue;                       // P14：自宅の 1 階・2 階の調べる所
      if (s.kind === 'door' && this.opened.has(s.door)) continue;
      if (s.kind === 'help' && (!this.heiten || this.heiten.brain.resolved || !this.heiten.brain.alive || streetState(this.story.step) === 'normal')) continue;
      if (s.kind === 'shutter' && !(this.boss && this.boss.brain.state === 'stuck')) continue;
      if (s.kind === 'pickupSpot' && this.picked.has(s.id)) continue;
      if (s.kind === 'rack' && this.player.fighter.owned.includes('katana')) continue;
      if (s.low && d > s.r * 0.6) continue;
      if (d < bd) { bd = d; best = s; }
    }
    if (!nearExit) this.exitArmed = true;
    this.nearSpot = best;
    if (best && best.kind === 'exit' && best.auto && this.exitArmed && !this.cut.active) { this.exitArmed = false; this.useExit(best); }
    if (this.area.id === 'shotengai') {
      const inH = inHome(P.pos.x, P.pos.z);
      if (this.wasInHome != null && inH !== this.wasInHome) this.autosaveReq = true;
      this.wasInHome = inH;
    }
    if (this.autosaveReq && this.calm()) { this.autosaveReq = false; this.saveSlot('auto', true); }
    // 緊張：近い敵対の敵ほど
    let k = 0; for (const e of this.enemies) { if (!e.brain.alive || !e.root.visible) continue; const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); const h = ['hostile', 'assess', 'rollcall', 'stuck'].includes(e.brain.state) ? 1 : 0.25; k = Math.max(k, h * Math.max(0, 1 - d / 14)); }
    this.sfx.setTension(k);
  }
  calm() { return !this.cut.active && this.mode === 'play' && !this.player.fighter.dead && !['attack', 'issen', 'dodge', 'hurt', 'parry'].includes(this.player.fighter.st.name) && !this.enemies.some(e => e.brain.alive && ['hostile', 'assess', 'stagger', 'search', 'rollcall', 'down', 'stuck'].includes(e.brain.state)); }
  pickup(p) {
    this.picked.add(p.id);
    if (this.pickMesh) { const M = new THREE.Matrix4().makeScale(0, 0, 0); this.pickMesh.setMatrixAt(p.inst, M); this.pickMesh.instanceMatrix.needsUpdate = true; }
    this.halos.setK(p.halo, 0);
    const it = ITEMS[p.item];
    if (it.ammo) this.player.fighter.addAmmo(it.ammo); else this.items[p.item] = (this.items[p.item] || 0) + 1;
    this.ui.log(`${it.name} を拾った`); this.sfx.play('pickup');
  }
  useHeal() {
    const F = this.player.fighter; if (F.hp >= F.hpMax || F.dead) return;
    for (const id of ['medkit_s', 'coffee', 'medkit_l']) if (this.items[id] > 0) { this.items[id]--; F.heal(ITEMS[id].heal); this.sfx.play('heal'); this.ui.log(`${ITEMS[id].name} を使った`); return; }
    this.ui.log('回復の道具が無い');
  }
  toggleFlashlight() { this.flashlightOn = !this.flashlightOn; this.sfx.play('light_on'); this.ui.light(this.flashlightOn); this.metrics.flashlight = (this.metrics.flashlight || 0) + 1; }
  toggleEquip(id) { this.equipped = toggleEquip(this.equipped, id); this.applyEquip(); this.sfx.play('equip'); }
  applyEquip() { this.player.fighter.setCombat(combatWithEquip(COMBAT, this.equipped)); }
  sayText(text) { this.playLines([{ who: 'sys', text }]); }
  bark(key, dur = 3) { const b = (this.events.barks || {})[key]; if (!b) return; const sp = this.events.speakers[b.who] || {}; this.ui.bark(sp.name, b.text, sp.color, dur); }
  playEvent(id, done) { const lines = (this.events.events || {})[id]; if (!lines) { if (done) done(); return; } this.playLines(lines, done, id); }
  playLines(lines, done, id) { this.dialog = { lines, i: 0, done, id, prevMode: this.mode }; this.mode = 'dialog'; this.showLine(); }
  showLine() { const d = this.dialog, L = d.lines[d.i]; const sp = (this.events.speakers || {})[L.who] || {}; this.ui.showLine(sp, L.text, L.who); if (this.cineSpeak) this.cineSpeak(L.who, L.text, Math.min(6, 0.4 + [...String(L.text || '')].length * 0.12)); }
  dialogNext() {
    const d = this.dialog; if (!d) return; this.sfx.play('ui');
    d.i++;
    if (d.i >= d.lines.length) { this.dialog = null; this.ui.hideDialog(); this.mode = 'play'; if (d.done) d.done(); if (this.afterDialog) { const f = this.afterDialog; this.afterDialog = null; f(); } return; }
    this.showLine();
  }
  pause() { if (this.mode !== 'play' || this.cut.active) return; this.mode = 'pause'; this.input.exitLock(); this.ui.openMenu('top'); }
  resume() { this.ui.closeMenu(); this.ui.closeSafe(); this.mode = 'play'; if (!this.isTest() && !isTouch) this.input.requestLock(); }
  retry() {
    this.ui.showDead(false);
    // 写し身の戦いで倒れた：転機の前の枠から（構えを選び直せる。3 回負けると「手助けあり」も出る）
    if (['ch3_boss', 'ch3_boss2'].includes(this.story.step) && this.store.load('tenki') && this.story.step === 'ch3_boss2') { this.loadSlot('tenki'); return; }
    if (this.store.load('auto')) this.loadSlot('auto'); else location.reload();
  }

  // ── セーブ ──
  snapshot() {
    const P = this.player, F = P.fighter;
    const items = Object.entries(this.items).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n }));
    const slot = makeSlot({
      playSec: this.playSec, area: this.area.id, pos: [+P.pos.x.toFixed(3), 0, +P.pos.z.toFixed(3)], yaw: +P.yaw.toFixed(3), difficulty: this.settings.difficulty,
      story: Object.assign({}, JSON.parse(JSON.stringify(this.route)), { chapter: stepDef(this.story.step).ch, step: this.story.step, flags: Object.assign({}, this.flags), resolutions: JSON.parse(JSON.stringify(this.resol)), trust: { companion: this.companion.brain.trust }, boss: this.story.boss, boss3: this.story.boss3 || null, boss5: this.story.boss5 || null, puzzles: { roster: this.puz.roster, records: this.puz.records || null }, companion: { mode: this.companion.brain.mode === 'grabbed' ? 'follow' : this.companion.brain.mode } }),
      player: { hp: F.hp, hpMax: F.hpMax, yoki: Math.round(F.yoki), form: 'purple', weapons: { pipe: F.owned.includes('pipe') ? { lv: 1 } : null, katana: F.owned.includes('katana') ? { lv: 1 } : null, handgun: F.owned.includes('handgun') ? { lv: 1, mag: F.mag } : null, matchlock: F.owned.includes('matchlock') ? { lv: 1 } : null }, owned: F.owned.slice(), ammo: { handgun: F.ammo }, equipped: F.weapon, items, equip: { owned: this.ownedEquip.slice(), on: this.equipped.slice() } },
      world: { areas: { [this.area.id]: { visited: true } }, enemies: Object.assign({}, this.enemyRes), picked: [...this.picked], opened: [...this.opened] },
    });
    slot.place.state = this.area.id === 'shotengai' ? streetState(this.story.step) : 'outbreak';
    if (this.area.id === 'shotengai') slot.place.layout = TOWN_LAYOUT;     // 町の配置の版（古いセーブの位置を移す目印）
    return slot;
  }
  saveSlot(k, auto) {
    if (this.galleryMode) return true;                                   // ギャラリーの見直しではセーブしない（今の続きを上書きしない）
    const ok = this.store.write(k, this.snapshot());
    if (ok) { if (auto) this.ui.log('自動セーブしました'); else this.ui.toast('セーブしました', '', 1); } else this.ui.log('セーブできませんでした（' + this.store.lastError + '）');
    if (k !== 'auto') this.WP.write('shinshoku', { chaptersCleared: [] });
    return ok;
  }
  loadSlot(k) {
    const s = this.store.load(k); if (!s) return false;
    document.getElementById('sh-title').hidden = true; this.ui.closeMenu(); this.ui.showDead(false); this.ui.hideDialog(); this.ui.closePuzzle(); this.dialog = null;
    if (this.cut.active) this.cut.cs = null; this.ui.letterbox(false); this.ui.subtitle(null); this.cineCam = null; this.timers.length = 0; this.ui.boss(null); this.hint(null);
    const st = s.story || {};
    if (this.giantMode) this.exitGiant();
    const prevRoute = this.route;
    this.flags = Object.assign({}, st.flags || {}); this.resol = JSON.parse(JSON.stringify(st.resolutions || {}));
    this.route = normalizeRoute({ route: st.route, routeLock: st.routeLock, stance: st.stance ?? null, reveal: st.reveal, forms: st.forms, branchLog: st.branchLog || [], yokaiLog: st.yokaiLog || [], docs: st.docs || [] });
    this.loadedBranch = k === 'branch'; if (this.loadedBranch) { this.route = carryBranchLog(prevRoute, this.route); this.flags.branch_pending = true; this.trialLosses = 0; delete this.flags.trial_assist; delete this.flags.branch_secret_trial; }
    this.loadedTenki = k === 'tenki'; this.twistSpawned = false; this.shelter4 = null;
    if (this.player.fighter.white) { this.player.fighter.setForm('purple'); this.player.setModel(this.purpleModel); this.ui.form(false); }
    const W = s.world || {};
    // フェーズ2 の古い形：world.areas.shotengai.{picked,opened}・world.enemies.shotengai
    const oldA = (W.areas || {}).shotengai || {};
    this.picked = new Set(W.picked || oldA.picked || []); this.opened = new Set(W.opened || oldA.opened || []);
    this.enemyRes = {};
    const EN = W.enemies || {};
    if (EN.shotengai && typeof EN.shotengai === 'object') { for (const [id, r] of Object.entries(EN.shotengai)) this.enemyRes[id] = r === 'rescued' ? 'rescue' : r === 'dead' ? 'kill' : r; }
    else Object.assign(this.enemyRes, EN);
    this.story = { step: st.step || 'ch1_street', boss: st.boss || null, boss3: st.boss3 || null, boss5: st.boss5 || null };
    if (!st.step) { this.flags.lights_out = true; }
    this.puz = Object.assign({ roster: { done: {}, miss: 0 } }, st.puzzles || {});
    const P = this.player, F = P.fighter, pl = s.player || {};
    F.owned = pl.owned ? pl.owned.slice() : (st.step ? weaponsAt(this.story.step) : ['katana', 'handgun']);
    F.hp = pl.hp ?? 100; F.hpMax = pl.hpMax || 100; F.mag = ((pl.weapons || {}).handgun || {}).mag ?? 12; F.ammo = (pl.ammo || {}).handgun ?? 0; F.weapon = F.owned.includes(pl.equipped) ? pl.equipped : (F.owned.find(w => w !== 'handgun') || F.owned[0] || 'none');
    F.lastMelee = F.weapon === 'handgun' ? (F.owned.includes('katana') ? 'katana' : 'pipe') : F.weapon;
    F.st = { name: 'free', f: 0 }; F.invulnUntil = -1; F.mikiri = F.hajiki = F.utsu = F.chain = null; F.pending = null;
    this.items = {}; for (const it of pl.items || []) this.items[it.id] = it.n;
    this.ownedEquip = ((pl.equip || {}).owned || []).slice(); this.equipped = ((pl.equip || {}).on || []).slice(); this.applyEquip();
    F.yoki = pl.yoki || 0; F.yokiOn = this.route.route === 'reveal' || (!!(this.route.forms && this.route.forms.whiteUnlocked) && this.route.stance !== 'secret' && this.route.route !== 'secret' && !this.ch4Secret()); F.combo = { n: 0, last: -9999, max: 0 }; F.mLoaded = true;
    this.companion.brain.trust = (st.trust || {}).companion ?? 50;
    this.companion.brain.setMode((st.companion || {}).mode || (this.flags.reunited ? 'follow' : 'wait'));
    this.playSec = s.playSec || 0; this.settings.difficulty = s.difficulty || this.settings.difficulty; F.setDifficulty(this.settings.difficulty, { touch: isTouch, assist: this.settings.assist });
    const area = (s.place && s.place.area && BUILDERS[s.place.area]) ? s.place.area : 'shotengai';
    this.loadArea(area, null);
    this.tenkiOpen = !!(this.flags.tenki_pending && this.story.step === 'ch3_boss');    // 転機の前の枠：選択だけを開く（演出は繰り返さない）
    { // 町の配置が変わる前（town1）のセーブ：自宅の中→同じ家具の前、家の前の路地→アーケード前の広場
      let pos = s.place.pos;
      if (area === 'shotengai' && s.place.layout !== TOWN_LAYOUT) { const m = migrateTownPos(pos, s.place.layout); pos = m.pos; this.metrics.migrated = m.moved || 'none'; }
      this.placePlayer(pos, s.place.yaw);
    }
    this.placeCompanion();
    this.lock = null; this.slowT = 0; this.hitstop = 0; this.ui.slow(false); this.sfx.setMuffle(0);
    this.mode = 'play'; this.loadedFrom = k; this.exitArmed = false;
    this.refreshObjective();
    if (this.tenkiOpen) this.later(0.3, () => this.openTenkiChoice());
    this.afterLoad4(); this.afterLoad5(false); this.afterLoad6(false); this.afterLoad7(false);
    if (!this.isTest()) this.input.requestLock();
    this.ui.toast('ロードしました', '', 1);
    return true;
  }

  // ── 設定・画質 ──
  applySetting(k, v, silent) {
    this.settings[k] = v;
    if (k === 'preset') { if (v !== 'custom') Object.assign(this.settings, applyPreset(this.settings, v === 'auto' ? this.autoPresetKey : v), { preset: v }); this.applyQuality(); }
    if (['resScale', 'shadows', 'outline', 'rain', 'halos', 'wet', 'edges'].includes(k)) { this.settings.preset = 'custom'; this.applyQuality(); }
    if (k === 'difficulty' || k === 'assist') this.player.fighter.setDifficulty(this.settings.difficulty, { touch: isTouch, assist: this.settings.assist });
    if (k === 'sens') this.input.sens = v;
    if (k === 'invertY') this.cam.invertY = v;
    if (k === 'volume') this.sfx.setVolume(v);
    if (k === 'rain') this.sfx.setRain(v);
    if (k === 'touchUI' && this.touchUI) { this.touchUI.show(v); document.getElementById('sh-ui').classList.toggle('touch', !!v); }
    if (k === 'shake') { this.settings.shake = +v; this.cam.shakeMul = +v; }
    if (k === 'teleCB') document.getElementById('sh-ui').classList.toggle('cb', !!v);
    if (k === 'subSize') { const r = document.getElementById('sh-ui'); r.classList.remove('sub-s', 'sub-m', 'sub-l'); r.classList.add('sub-' + v); }
    if (!silent) this.store.writeSettings(this.settings);
  }
  /** キーの割り当てを変える：action に code を。code を使っていた別の操作には、action の前のキーを渡す（入れ替え） */
  rebindKey(action, code) {
    const cur = Object.assign({}, this.settings.keys || {}), map = this.input.keymap, other = map[code], prev = this.input.codesOf(action);
    cur[action] = [code];
    if (other && other !== action) { const rest = this.input.codesOf(other).filter(c => c !== code); cur[other] = rest.length ? rest : prev.slice(0, 1); }
    this.settings.keys = cur; this.input.setKeys(cur); this.store.writeSettings(this.settings);
    this.metrics.rebinds = (this.metrics.rebinds || 0) + 1;
  }
  resetKeys() { this.settings.keys = {}; this.input.setKeys({}); this.store.writeSettings(this.settings); }
  applyQuality() {
    const S = this.settings, r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * S.resScale);
    if (r.shadowMap.enabled !== S.shadows) { r.shadowMap.enabled = S.shadows; this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); } }); for (const A of Object.values(this.areas)) if (A.root.parent !== this.scene) A.root.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
    this.moon.castShadow = S.shadows;
    this.scene.traverse(o => { if (o.userData.isEdgeLines) o.visible = S.outline && S.edges !== false; });
    for (const A of Object.values(this.areas)) A.root.traverse(o => { if (o.userData.isEdgeLines) o.visible = S.outline && S.edges !== false; });
    this.halos.mesh.visible = S.halos !== false; this.wet.mesh.visible = S.wet !== false;
    if (this.rain && this.area) this.rain.mesh.visible = S.rain && !!this.area.rain;
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.post) this.post.setSize(w, h);
    if (this.refl) this.refl.setSize(w, h, this.renderer.getPixelRatio());
    const rot = document.getElementById('sh-rotate'); if (rot) rot.hidden = !(this.settings.touchUI && h > w);
  }

  // ── 描画 ──
  render(dt, steps) {
    const P = this.player, F = P.fighter, A = this.area, S = this.settings, PV = this.presetVals();
    const playing = this.mode === 'play' || this.cut.active || !!this.closeup;   // 撮影用の寄りは止めたまま体だけ動かす
    const wdt = dt * (this.mode === 'play' && !this.cut.active ? this.worldScale : 1) * (this.hitstop > 0 ? 0.05 : 1) * (playing ? 1 : 0);
    const pdt = playing ? (this.hitstop > 0 ? dt * 0.05 : dt) : (this.mode === 'title' ? dt : 0);
    const look = this.input.consumeLook();
    if (this.cineCam) {
      const c = this.cineCam; this.camera.position.set(...c.pos); this.camera.lookAt(...c.look); if (Math.abs(this.camera.fov - c.fov) > 0.01) { this.camera.fov = c.fov; this.camera.updateProjectionMatrix(); }
    } else {
      const lk = this.mode === 'play' ? look : { x: 0, y: 0 };
      // ロック中にマウス・右スティックを素早く振る＝相手を切り替える
      if (this.lock && this.mode === 'play' && Math.abs(lk.x) > 0.11) { this.switchLock(lk.x < 0 ? 1 : -1); lk.x = 0; }
      if (this.giantMode) { const G = this.giant; this.cam.update(dt, { x: G.pos.x, y: (G.y || 0) * 0.5, z: G.pos.z }, lk, this.boxes, { lock: this.lock && this.lock.hittable() ? this.lock.pos : null, scale: 5.6 * G.scale / 8 + 0.4, range: () => [0.6, Infinity] }); }
      else this.cam.update(dt, P.pos, lk, this.boxes, { aim: ((F.weapon === 'handgun' && F.aimHeld) || (F.weapon === 'matchlock' && F.white && (F.aimHeld || F.st.name === 'mcharge'))) && !['swap', 'reload'].includes(F.st.name), lock: this.lock && this.lock.hittable() ? this.lock.pos : null, indoor: A.indoor(P.pos.x, P.pos.z), range: this.camRangeFn(A, P) });
    }
    if (this.lock && !this.lock.hittable()) this.lock = null;
    const glassesPose = this.cinePlayerAnim === 'glasses' ? { pose: { spine: [0.05, 0, 0], head: [0.12, 0, 0], rightUpperArm: [-1.6, 0.3, -0.35], rightLowerArm: [-2.35, 0, 0], rightHand: [0.2, 0, 0.6], leftUpperArm: [0.05, 0, 0.12], leftLowerArm: [-0.2, 0, 0] }, rate: 0.25 } : null;
    const sitPose = glassesPose || this.cinePose7() || (this.cinePlayerAnim === 'sit' ? { pose: { hipsY: -0.42, leftUpperLeg: [-1.5, 0, 0.05], rightUpperLeg: [-1.5, 0, -0.05], leftLowerLeg: [1.5, 0, 0], rightLowerLeg: [1.5, 0, 0], spine: [-0.1, 0, 0], leftUpperArm: [0.1, 0, 0.2], rightUpperArm: [0.1, 0, -0.2], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0], head: [0.05, 0, 0] }, rate: 0.2 } : null);
    if (this.cut.active && !this.cineMoves.some(m => m.tgt.kind === 'player')) P.speed = 0;
    P.animate(pdt, { aimPitch: this.cam.pitch * 0.8, override: sitPose, look: this.lock && this.lock.hittable && this.lock.hittable() ? this.lock : null });
    const cp = this.camera.position;
    for (const e of this.enemies) {
      const dc = Math.hypot(e.pos.x - cp.x, e.pos.z - cp.z), far = !e.big && dc > PV.enemyFar; e.model.root.visible = !far;
      const hull = S.outline && (dc < PV.outlineDist || e.brain.chainable || e.kind === 'shuuyou'); if (e.hullOn !== hull && e.model.outline) { e.hullOn = hull; e.model.outline.visible = hull; }
      if (e.root.visible && !far) e.animate(Math.max(wdt, 0));
      if (e.markT > 0) e.markT -= wdt; if (e.markT <= 0) e.mark = null; if (e.copyT > 0) e.copyT -= wdt;
      if (e.alt && e.revealT != null && e.revealT < 1) { e.revealT = Math.min(1, e.revealT + wdt / 0.9); e.setReveal(e.revealT); } else if (e.alt && e.brain.revealed && e.altK < 1) e.setReveal(1);
    }
    this.companion.animate(pdt);
    this.animateChild(pdt);
    this.renderWhite(pdt);
    this.renderGiant(pdt); this.renderBoss4(pdt); this.renderBoss5(pdt); this.renderTown5(pdt); this.renderBoss6(pdt); this.renderBoss7(pdt);
    if (this.companion.model.outline) this.companion.model.outline.visible = S.outline;
    if (P.model.outline) P.model.outline.visible = S.outline;
    for (const c of this.civilians) { c.animate(pdt); if (c.vanish) { c.vt = (c.vt || 0) + dt; const u = c.model.mats.body.userData.u; for (const m of [c.model.mats.body, c.model.mats.face, c.model.mats.outline]) if (m && m.userData.u) m.userData.u.uDissolve.value = Math.min(1, c.vt / 1.5); if (c.vt > 1.6) c.root.visible = false; void u; } }
    // 戸・シャッター
    for (const [id, d] of Object.entries(A.dyn)) {
      if (!id.startsWith('door_') || !d.pivot) continue;
      if (d.closeAt != null) { d.closeAt -= wdt; if (d.closeAt <= 0) { d.open = false; d.closeAt = null; this.halos.setColor(d.halo, 0x88ff99); } }
      const want = d.open ? -1.45 * (d.face || 1) : 0; d.pivot.rotation.y += (want - d.pivot.rotation.y) * Math.min(1, dt * 4);
    }
    for (const sh of [A.dyn.heitenShutter, A.dyn.storageShutter, A.dyn.refugeShutter, A.dyn.bulkhead, A.dyn.gate]) if (sh && sh.target != null) sh.mesh.position.y += (sh.target - sh.mesh.position.y) * Math.min(1, (wdt + 0.0001) * 1.6);
    if (A.dyn.tv && this.frame % 3 === 0 && A.dyn.tv.kind === 'static') A.dyn.tv.draw('static');
    this.updateLights(dt);
    if (A.tick) A.tick(dt, this);
    if (A.fogAt) { const want = A.fogAt(P.pos.x, P.pos.z), f = this.scene.fog; if (Math.abs(f.density - want) > 1e-5) { f.density += (want - f.density) * Math.min(1, dt * 1.5); this.halos.uniforms.uFog.value = f.density; this.wet.uniforms.uFog.value = f.density; }
      // 霧で見えない所は描かない：見える距離（霧が 99% を越える所）までカメラの奥を縮める（升目の網が減る＝描画呼び出しが減る）
      if (A.fogFar && !this.cineCam) { const far = Math.min(A.far || 120, A.fogFar / Math.max(f.density, 1e-4)) * (this.presetVals().farMul || 1); if (Math.abs(this.camera.far - far) > 1.5) { this.camera.far = far; this.camera.updateProjectionMatrix(); } }
      else if (A.fogFar && this.camera.far !== (A.far || 120)) { this.camera.far = A.far || 120; this.camera.updateProjectionMatrix(); } }
    // 光源とプレイヤーの近く
    this.keyLight.position.set(P.pos.x + Math.sin(this.cam.yaw) * 1.6, (P.pos.y || 0) + 1.9, P.pos.z + Math.cos(this.cam.yaw) * 1.6);
    this.keyLight.intensity = this.darkness ? 0.6 : 1.4;
    this.moon.position.set(P.pos.x - 6, 14, P.pos.z + 8); this.moon.target.position.set(P.pos.x, 0, P.pos.z);
    this.moon.intensity = A.id === 'shelter' ? (this.darkness ? 0.25 : 0.45) : 0.9;
    // 懐中電灯：胸から、カメラの向きへ
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd);
    this.flash.intensity = this.flashlightOn ? 26 : 0;
    this.flash.position.set(P.pos.x + Math.sin(P.yaw) * 0.25, (P.pos.y || 0) + 1.3, P.pos.z + Math.cos(P.yaw) * 0.25);
    this.flash.target.position.copy(this.flash.position).addScaledVector(fwd, 6);
    if (this.flashHalo >= 0) { this.halos.setPos(this.flashHalo, this.flash.position.x, this.flash.position.y, this.flash.position.z); this.halos.setK(this.flashHalo, this.flashlightOn ? 0.35 : 0); }
    if (S.rain && A.rain) { const roofed = A.rainRoof(P.pos.x, P.pos.z); this.rain.mesh.visible = !roofed; if (!roofed) this.rain.update(dt, P.pos.x, P.pos.z, false); } else this.rain.mesh.visible = false;
    // 刀の軌跡：振りの判定中と一閃
    const swinging = (F.st.name === 'attack' && F.st.f >= F.st.atk.startup - 2 && F.st.f <= F.st.atk.startup + F.st.atk.active + 3) || (F.st.name === 'issen' && F.st.f >= (P.issenInfo ? P.issenInfo.strike : 6) - 3 && F.st.f <= (P.issenInfo ? P.issenInfo.strike : 6) + 4);
    if (swinging && pdt > 0) { const bp = F.weapon === 'claw' && !F.st.blade ? this.clawPoints() : P.bladePoints(); if (bp) this.trail.push(bp[0], bp[1], F.weapon === 'claw' ? 0xc070ff : F.st.name === 'issen' || F.st.iai ? 0xffffff : F.weapon === 'pipe' ? 0xffd8a8 : 0xd8c8ff); }
    this.trail.update(pdt);
    this.fx.update(Math.max(wdt, 0.0001) + (this.mode === 'play' && this.worldScale < 1 ? dt * 0.3 : 0));
    this.wet.update(this.camera); this.halos.flush(); this.wet.flush();
    this.sfx.setListener(cp.x, cp.z, Math.atan2(-fwd.x, -fwd.z)); this.sfx.update(dt);
    // 画面の部品
    this.ui.tick(dt);
    if (this.mode === 'play' || this.mode === 'dialog' || this.closeup) { if (this.giantMode) this.hudGiant(); else this.ui.hud(P); }
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(this.camera); if (v.z > 1) return null; return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; };
    this.ui.lockAt(this.lock && !this.cut.active ? proj(this.lock.pos.x, this.lock.h * 0.6, this.lock.pos.z) : null);
    const issenOpen = F.mikiri && (F.frame - F.mikiri.at) <= F.w.mikiri || F.hajiki && (F.frame - F.hajiki.at) <= F.w.hajiki || F.utsu && (F.frame - F.utsu.at) <= F.w.utsu || F.chain && (F.frame - F.chain.at) <= F.w.chain;
    for (const e of this.enemies) {
      const tgt = issenOpen && ((F.mikiri && F.mikiri.src === e) || (F.hajiki && F.hajiki.src === e) || (F.utsu && F.utsu.src === e) || (F.chain && F.chain.src === e));
      const kind = this.cut.active ? null : tgt ? 'issen' : e.root.visible && e.brain.alive ? e.mark : null;
      this.ui.mark(e.id, kind ? proj(e.pos.x, e.h + 0.35, e.pos.z) : null, kind, kind && e.copyLabel && e.copyT > 0 ? e.copyLabel : null);
      // 光る目（紫）
      if (e.eyeHalos == null) e.eyeHalos = (e.model.eyeGlow || []).map(() => this.halos.add([0, -50, 0], e.kind === 'shuuyou' ? 0.35 : 0.2, 0xb070ff, 0));
      if (e.alt && e.altK < 0.5 && e.eyeHalos.length) { this.mimicTell(e); continue; }
      if (e.eyeHalos.length) { const on = e.brain.alive && e.root.visible && e.model.root.visible && !['home', 'rest', 'neutral', 'dormant', 'gone', 'sleep'].includes(e.brain.state); const v = new THREE.Vector3(); e.model.eyeGlow.forEach((o, i) => { o.getWorldPosition(v); this.halos.setPos(e.eyeHalos[i], v.x, v.y, v.z); this.halos.setK(e.eyeHalos[i], on ? (e.brain.state === 'hostile' || e.brain.state === 'rollcall' ? 1.4 : 0.8) * (0.85 + Math.sin(this.playSec * 3 + i) * 0.15) : 0); }); }
      // 弱点の光（帰路の頭・閉店のレジ・収容者のスピーカー）
      if (e.weakHalo == null && e.model.weak) e.weakHalo = this.halos.add([0, -50, 0], e.kind === 'shuuyou' ? 1.2 : 0.55, e.model.weakColor || 0xffd27a, 0);
      if (e.weakHalo != null && e.weakHalo >= 0 && e.model.weak) { const w = this.weakPos(e); this.halos.setPos(e.weakHalo, w.x, w.y, w.z); const k = !e.brain.alive || !e.root.visible ? 0 : e.kind === 'kiro' ? e.weakGlow || 0 : e.kind === 'shuuyou' ? (e.brain.state === 'dormant' ? 0 : 0.35 + (e.brain.state === 'rollcall' ? 0.5 + Math.sin(this.playSec * 9) * 0.3 : 0)) : 0.45; this.halos.setK(e.weakHalo, k); }
    }
    if (this.touchUI) { this.touchUI.setUse(!!this.nearSpot || this.cut.active || !!this.protect); this.touchUI.setIssen(issenOpen); this.touchUI.setForm(F.yokiOn || F.white, F.white); }
    const dev = this.input.device;
    if ((this.mapTick = (this.mapTick || 0) + 1) % 2 === 0 && (this.mode === 'play' || this.mode === 'dialog')) this.drawMinimap();
    if (!this.giantMode) this.ui.hints(dev, { gun: F.weapon === 'handgun', melee: F.melee, match: F.weapon === 'matchlock', white: F.white });
    this.ui.prompt(this.mode === 'play' && !this.cut.active && this.nearSpot && !(this.nearSpot.kind === 'exit' && this.nearSpot.auto) ? this.nearSpot.label : null, dev === 'pad' ? 'B' : dev === 'touch' ? '調' : 'E');
    const C = this.companion; this.ui.companion(C.root.visible && !this.cut.active && C.brain.mode !== 'scripted' ? C.brain.mode : null, '（相棒）');
    if (this.boss && this.boss.kind === 'utsushimi') { const b = this.boss.brain; if (b.alive && !['dormant', 'rest'].includes(b.state) && !this.cut.active) this.ui.boss('写し身（仮）', b.hp / b.hpMax, b.state === 'voice' ? (this.flags.memo ? '呼び声 ―― 今なら本物の声を聞かせられる' : '呼び声 ―― 動きが止まっている（よく効く）') : b.state === 'tenki' ? '……' : b.phase ? '写す・影の波' : '写す', b.state === 'voice'); }
    else if (this.boss && this.boss.kind === 'shuuyou' && this.boss.brain.alive && !['dormant', 'rest', 'neutral', 'rise'].includes(this.boss.brain.state) && !this.cut.active) { const b = this.boss.brain; this.ui.boss('収容者（仮）', b.hp / b.hpMax, b.state === 'rollcall' ? '点呼中 ―― 今なら名前を呼べる' : b.state === 'stuck' ? '器具庫に挟まっている' : b.state === 'down' ? '崩れている（青い縁）' : ['', '照明が落ちた', '必死'][b.phase] || '', b.state === 'rollcall' || b.state === 'stuck'); }
    if (F.weapon === 'handgun' && F.aimHeld && dev === 'kbm') {
      const o = this.camera.position, d = new THREE.Vector3(); this.camera.getWorldDirection(d);
      P.aimWeak = this.enemies.some(e => { const wp = e.hittable() && this.weakPos(e); return wp && raySphereHit(o, d, wp, e.kind === 'shuuyou' ? 0.28 : 0.2); });
      for (const e of this.enemies) if (e.kind === 'kiro' && !e.mark) e.weakGlow = 0.35;
    } else { P.aimWeak = false; for (const e of this.enemies) if (e.kind === 'kiro' && !e.mark) e.weakGlow = 0; }
    // P12：色の調整（区画・場所）・水たまりの波紋の時間・雨の跳ね
    envTick(dt); envApplyGrade(gradeAt(A.id, P.pos.x, P.pos.z, inHome), dt); envKitUpdate(A, this.camera); vegUpdate(A, this.camera, dt, this.moon);
    if (this.splash) { const on = S.rain && A.rain && !this.cut.active; this.splash.mesh.visible = !!on; if (on) this.splash.update(dt, P.pos.x, P.pos.z, A.rainRoof, this.scene.fog.density); }
    if (this.refl && this.presetVals().refl && !this.split7) { const pk = A.pending ? A.pending.length : 0; if (!A.poolsMesh || A.poolsPk !== pk) { A.poolsPk = pk; A.poolsMesh = []; A.root.traverse(o => { if (o.name === 'town_pools') A.poolsMesh.push(o); }); } this.refl.render(this.renderer, this.scene, this.camera, [this.rain.mesh, this.splash && this.splash.mesh, this.wet.mesh, this.trail.mesh, ...A.poolsMesh]); }
    else if (this.refl) ENV_U.uReflOn.value = 0;
    if (this.split7) this.renderSplit7(); else if (this.post && this.presetVals().post) this.post.render(this.scene, this.camera); else this.renderer.render(this.scene, this.camera);
    if (this.perfOn) this.perfTick(dt, steps);
  }
  /** 使い回しの点光源を近い明かりへ。ちらつき・消灯。光のにじみ・映り込みも明かりに合わせる */
  updateLights(dt) {
    const A = this.area, P = this.player.pos, t = performance.now() / 1000;
    this.lightT = (this.lightT || 0) - dt;
    if (this.lightT <= 0) {
      this.lightT = 0.25;
      const cand = A.lights.filter(l => !l.off || l.flicker).map(l => ({ l, d: Math.hypot(l.pos[0] - P.x, l.pos[2] - P.z) - (l.intensity || l.base) * 0.4 })).sort((a, b) => a.d - b.d).slice(0, this.pool.length).map(x => x.l);
      for (const p of this.pool) if (p.def && !cand.includes(p.def)) p.def = null;
      for (const l of cand) if (!this.pool.some(p => p.def === l)) { const p = this.pool.find(q => !q.def); if (p) { p.def = l; p.light.position.set(...l.pos); p.light.color.setHex(l.color); p.light.distance = l.dist; p.light.intensity = 0; } }
    }
    for (const l of A.lights) {
      let k = l.off ? 0 : 1;
      if (l.flicker && !l.off) { const n = Math.sin(t * 13.7 + l.pos[2]) * Math.sin(t * 7.3); if (n > 0.86) k = 0.15; }
      if (l.flickerT > 0) { l.flickerT -= dt; k *= Math.random() < 0.5 ? 0.1 : 1; }
      l.cur = (l.intensity ?? l.base) * k;
    }
    for (const p of this.pool) { const want = p.def ? p.def.cur : 0; p.light.intensity += (want - p.light.intensity) * Math.min(1, dt * 20); }
    for (const h of A.halos) if (h.idx >= 0) {
      let k = h.off ? 0 : h.k;
      if (h.light) k = h.light.off ? 0 : h.k * Math.min(1.2, (h.light.cur || 0) / Math.max(0.01, h.light.base || 1));
      if (h.flicker) k *= 0.75 + Math.sin(t * 9 + h.p[0] + h.p[2]) * 0.25;
      if (h.hazard) k *= Math.sin(t * 5.5) > 0 ? 1 : 0.08;
      this.halos.setK(h.idx, k);
    }
    for (const w of A.wet) if (w.idx >= 0 && w.light) { const L = A.lights.find(l => l.id === w.light); this.wet.setK(w.idx, L && !L.off ? w.k : 0); }
  }
  perfTick(dt, steps) {
    const a = this.perfAcc; a.t += dt; a.n++; a.steps += steps;
    if (a.t >= 0.5) {
      const i = this.renderer.info, pr = this.renderer.getPixelRatio();
      this.ui.perf(`fps ${(a.n / a.t).toFixed(1)}  ${(a.t / a.n * 1000).toFixed(1)}ms  sim ${(a.steps / a.t).toFixed(0)}Hz\ndraw ${i.render.calls}  tri ${(i.render.triangles / 1000).toFixed(1)}k  geo ${i.memory.geometries}  tex ${i.memory.textures}\n${innerWidth}×${innerHeight} ×${pr.toFixed(2)}  ${this.settings.preset}(${this.autoPresetKey})  影${this.settings.shadows ? 'あり' : 'なし'} 光${this.poolN}  ${this.area.id}`);
      this.lastPerf = { fps: a.n / a.t, ms: a.t / a.n * 1000, calls: i.render.calls, tris: i.render.triangles, pr, area: this.area.id };
      a.t = 0; a.n = 0; a.steps = 0;
    }
  }
  buildTune() {
    const d = document.createElement('div'); d.id = 'sh-tune';
    const W = COMBAT.difficulty.normal;
    const rows = [['ジャスト回避', W, 'just'], ['パリィ（前）', W, 'parryBefore'], ['パリィ（後）', W, 'parryAfter'], ['見切り一閃の窓', COMBAT.issen.mikiri, 'window'], ['弾き一閃の窓', COMBAT.issen.hajiki, 'window'], ['連鎖一閃の窓', COMBAT.issen.chain, 'window'], ['居合の長押し', COMBAT.issen.iai, 'hold'], ['スロー（f）', COMBAT.justSlow, 'frames']];
    d.innerHTML = '<b>?tune=1（ふつうの値・f）</b>' + rows.map(([n, o, k], i) => `<label>${n}<input type="number" data-i="${i}" value="${o[k]}" min="0" max="120"></label>`).join('');
    d.oninput = e => { const i = +e.target.dataset.i; const [, o, k] = rows[i]; o[k] = +e.target.value; this.applyEquip(); };
    document.body.appendChild(d);
  }

  /** HUD の顔：manifest の portrait があればそれ、無ければ今のモデルの顔を小さく描いて使う */
  makePortrait(force) {
    this.portraitMade = true;
    if (!force && this.portraits && this.portraits.dannoura) { this.ui.setPortrait(this.portraits.dannoura); return; }
    const P = this.player, N = 128;
    P.animate(0.016); P.root.updateMatrixWorld(true);
    const head = new THREE.Vector3(); P.model.J.head.getWorldPosition(head); head.y += 0.1;
    const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 10), a = P.yaw + 0.35;
    cam.position.set(head.x + Math.sin(a) * 0.62, head.y + 0.03, head.z + Math.cos(a) * 0.62); cam.lookAt(head.x, head.y - 0.02, head.z);
    const hidden = []; for (const o of this.scene.children) if (o !== P.root && o.visible && !o.isLight) { hidden.push(o); o.visible = false; }
    const bg = this.scene.background.getHex(), fd = this.scene.fog.density; this.scene.background.setHex(0x4a3070); this.scene.fog.density = 0;
    const M = this.moon, mp = M.position.clone(), mt = M.target.position.clone(), mi = M.intensity, mc = M.color.getHex();
    M.position.copy(cam.position).add(new THREE.Vector3(0.4, 0.6, 0)); M.target.position.copy(head); M.intensity = 2.4; M.color.setHex(0xfff4ec); M.target.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(N, N); this.renderer.setRenderTarget(rt); this.renderer.render(this.scene, cam); this.renderer.setRenderTarget(null);
    M.position.copy(mp); M.target.position.copy(mt); M.intensity = mi; M.color.setHex(mc);
    for (const o of hidden) o.visible = true; this.scene.background.setHex(bg); this.scene.fog.density = fd;
    const px = new Uint8Array(N * N * 4);
    const done = () => { rt.dispose(); const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); const im = g.createImageData(N, N);
      for (let y = 0; y < N; y++) im.data.set(px.subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4);
      g.putImageData(im, 0, 0); if (force || !(this.portraits && this.portraits.dannoura)) this.ui.setPortrait(c.toDataURL()); };
    // 読み戻しは待たない（GPU の仕事が終わってから受け取る）。古い環境は同期の読み戻し
    if (this.renderer.readRenderTargetPixelsAsync) this.renderer.readRenderTargetPixelsAsync(rt, 0, 0, N, N, px).then(done, () => { this.renderer.readRenderTargetPixels(rt, 0, 0, N, N, px); done(); });
    else { this.renderer.readRenderTargetPixels(rt, 0, 0, N, N, px); done(); }
  }
  /** ミニマップの下絵（区画ごとに 1 回）：歩ける所を明るく、壁・建物を暗く */
  mapImage(A) {
    if (A.mapImg) return A.mapImg;
    const ppm = 6, b = A.bounds, pad = 6, minX = b.minX - pad, minZ = b.minZ - pad, W = Math.ceil((b.maxX - b.minX + pad * 2) * ppm), H = Math.ceil((b.maxZ - b.minZ + pad * 2) * ppm);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = 'rgba(10,6,18,1)'; g.fillRect(0, 0, W, H);
    if (A.mapWalk) {   // 町：歩ける所（道・歩道・広場）だけを明るく。道の種類で色を変える（家の区画は暗いまま）
      g.fillStyle = 'rgba(40,30,58,1)'; g.fillRect((b.minX - minX) * ppm, (b.minZ - minZ) * ppm, (b.maxX - b.minX) * ppm, (b.maxZ - b.minZ) * ppm);
      for (const w of A.mapWalk) { const [x0, z0, x1, z1] = w.rect; g.fillStyle = w.c; g.fillRect((x0 - minX) * ppm, (z0 - minZ) * ppm, (x1 - x0) * ppm, (z1 - z0) * ppm); }
    } else { g.fillStyle = 'rgba(120,100,160,.55)'; g.fillRect((b.minX - minX) * ppm, (b.minZ - minZ) * ppm, (b.maxX - b.minX) * ppm, (b.maxZ - b.minZ) * ppm); }
    for (const x of A.boxes) { if (x.maxY < 0.9 || x.minY > 2) continue; g.fillStyle = x.maxY < 1.6 ? 'rgba(60,46,86,1)' : 'rgba(24,16,38,1)'; g.fillRect((x.minX - minX) * ppm, (x.minZ - minZ) * ppm, (x.maxX - x.minX) * ppm, (x.maxZ - x.minZ) * ppm); }
    for (const s of A.spots) if (s.kind === 'exit') { g.fillStyle = '#60e0a0'; g.fillRect((s.x - minX) * ppm - 5, (s.z - minZ) * ppm - 5, 10, 10); }
    A.mapImg = { img: c, minX, minZ, ppm };
    return A.mapImg;
  }
  /** 目標の場所（ほかの区画なら、そこへ向かう出口） */
  objectiveTarget() {
    const t = TARGETS[this.story.step]; if (!t) return null;
    if (typeof t === 'string') { const e = this.enemies.find(x => x.id === t.slice(6)); return e && e.brain.alive && e.root.visible ? { x: e.pos.x, z: e.pos.z } : null; }
    const [area, x, z] = t;
    if (area === this.area.id) { if (area === 'shotengai') { const P = this.player.pos, n = navNext(P.x, P.z, x, z); return { x: n[0], z: n[1], final: { x, z } }; } return { x, z }; }
    const prev = { [this.area.id]: null }, q = [this.area.id];
    while (q.length) { const a = q.shift(); if (a === area) break; for (const n of AREA_GRAPH[a].exits) if (!(n in prev)) { prev[n] = a; q.push(n); } }
    if (!(area in prev)) return null;
    let hop = area; while (prev[hop] !== this.area.id && prev[hop] != null) hop = prev[hop];
    const ex = this.area.spots.find(s => s.kind === 'exit' && s.to === hop);
    return ex ? { x: ex.x, z: ex.z } : null;
  }
  drawMinimap() {
    const A = this.area, P = this.player.pos, M = this.mapImage(A), tgt = this.objectiveTarget();
    const dots = [];
    for (const e of this.enemies) if (e.brain.alive && e.root.visible && !['home', 'rest', 'neutral', 'gone'].includes(e.brain.state) && Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < 30) dots.push({ x: e.pos.x, z: e.pos.z, c: ['hostile', 'assess', 'rollcall', 'stuck', 'stagger', 'down'].includes(e.brain.state) ? '#ff4060' : '#a070ff', r: e.kind === 'shuuyou' ? 9 : 5 });
    if (this.companion.root.visible) dots.push({ x: this.companion.brain.pos.x, z: this.companion.brain.pos.z, c: '#ffd7a8', r: 5 });
    for (const p of this.pickupsList) if (!this.picked.has(p.id)) dots.push({ x: p.pos[0], z: p.pos[1], c: '#e8c060', r: 3 });
    const fin = tgt && tgt.final ? tgt.final : tgt;
    this.ui.minimap({ img: M.img, minX: M.minX, minZ: M.minZ, ppm: M.ppm, px: P.x, pz: P.z, yaw: this.cam.yaw, dots, target: tgt, dist: fin ? Math.hypot(fin.x - P.x, fin.z - P.z) : null, k: this.touch ? 6 : 6.5 });
  }

  // ── 自動プレイ・検証用 ──
  exposeAPI() {
    const g = this;
    window.SHINSHOKU_HOOKS = window.SHINSHOKU_HOOKS || {};
    window.__sh = {
      game: g, THREE,
      state() {
        const P = g.player, F = P.fighter;
        return {
          mode: g.mode, frame: g.frame, worldScale: g.worldScale, hitstop: g.hitstop, area: g.area.id, step: g.story.step, cut: g.cut.active ? g.cut.cs.id : null,
          player: { x: P.pos.x, z: P.pos.z, yaw: P.yaw, hp: F.hp, weapon: F.weapon, owned: F.owned.slice(), mag: F.mag, ammo: F.ammo, st: F.st.name, f: F.st.f, items: Object.assign({}, g.items), chainN: F.chainN },
          enemies: g.enemies.map(e => ({ id: e.id, kind: e.kind, state: e.brain.state, hp: e.brain.hp, resolution: e.brain.resolution, x: e.pos.x, z: e.pos.z, visible: e.root.visible, atk: e.brain.atk && e.brain.atk.name, chainable: e.brain.chainable, poise: e.brain.poise })),
          companion: { mode: g.companion.brain.mode, x: g.companion.brain.pos.x, z: g.companion.brain.pos.z, visible: g.companion.root.visible, trust: g.companion.brain.trust },
          metrics: JSON.parse(JSON.stringify(Object.assign({}, g.metrics, { events: g.metrics.events.slice(-40) }))),
          nearSpot: g.nearSpot && g.nearSpot.id, flags: Object.assign({}, g.flags), opened: [...g.opened], vrm: g.vrmLoaded || [], vrmStats: g.vrmStats || null, charAnim: g.player.clipRes ? g.player.clipRes.key : null, lock: g.lock && g.lock.id, equip: g.equipped.slice(), enemyRes: Object.assign({}, g.enemyRes),
          form: F.form, yoki: Math.round(F.yoki), combo: F.comboN, comboMax: F.combo.max, stance: g.route.stance, route: g.route.route, branchLog: g.route.branchLog.slice(-6), companionKnows: !!(g.route.reveal && g.route.reveal.companionKnows), whiteUnlocked: !!(g.route.forms && g.route.forms.whiteUnlocked),
          child: g.child ? { visible: g.child.root.visible, mode: g.child.mode, x: g.child.pos.x, z: g.child.pos.z } : null, routeLock: g.route.routeLock, giantMode: !!g.giantMode, mLoaded: F.mLoaded, fstate: F.st.name, fires: g.fires.length, decoy: !!g.decoy, actHist: (g.actHist || []).slice(-6), boss: g.boss ? { id: g.boss.id, state: g.boss.brain.state, hp: g.boss.brain.hp, hpMax: g.boss.brain.hpMax, phase: g.boss.brain.phase } : null,
        };
      },
      input: { script: list => g.input.runScript(list), press: (a, f = 0) => g.input.runScript([{ f, press: [a] }]), hold: (a, n) => g.input.runScript([{ f: 0, hold: { [a]: n } }]), move: (x, y, n) => g.input.runScript([{ f: 0, move: [x, y, n] }]) },
      debug: {
        veg() { return vegStats(g.area); },                         // P16：区画の植物の部品の数・読めたか
        teleport(x, z, yaw, y = 0) { g.player.pos.set(x, y, z); if (yaw != null) { g.player.yaw = yaw; g.cam.yaw = yaw + Math.PI; } g.player.prevYaw = null; const sp = g.player.model && g.player.model.springs; if (sp && sp.reset) { g.player.root.position.copy(g.player.pos); g.player.root.rotation.y = g.player.yaw; g.player.root.updateMatrixWorld(true); sp.reset(); } },   // P17：揺れ物（髪）も置き直す（瞬間移動で横へ跳ねない）
        home(x, z) { return [x + TOWN_HOME[0], z + TOWN_HOME[1]]; }, town() { return { route: TOWN.route.map(p => p.slice()), routes: JSON.parse(JSON.stringify(TOWN.routes)), nodes: TOWN.nav.nodes, version: TOWN.version, pending: !!(g.areas.shotengai && g.areas.shotengai.pending && g.areas.shotengai.pending.length) }; }, buildPending() { const A = g.areas.shotengai; if (A) g.buildPending(A, 9); return !(A && A.pending && A.pending.length); },
        camYaw(y) { g.cam.yaw = y; }, camPitch(p) { g.cam.pitch = p; },
        faceTo(x, z) { const P = g.player; P.yaw = Math.atan2(x - P.pos.x, z - P.pos.z); g.cam.yaw = P.yaw + Math.PI; },
        forceAttack(id, name) {
          const e = g.enemies.find(x => x.id === id); if (!e) return -1; const b = e.brain;
          if (b.state !== 'hostile') { b.state = 'hostile'; b.t = 0; b.lastSeen = { x: g.player.pos.x, z: g.player.pos.z }; b.lastSeenT = b.total; }
          b.yaw = Math.atan2(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z);
          const A = b.def.attacks[name];
          if (b.startAttack) { const ev = []; b.startAttack(name, ev, { x: g.player.pos.x, z: g.player.pos.z }); g.enemyEvents(e, ev); }
          else { b.atk = { name, phase: 'windup', t: 0 }; g.enemyEvents(e, [{ t: 'telegraph', name, def: A, parryable: A.parryable }]); }
          let t = 0, n = 0; while (t < A.windup) { t += DT; n++; } return n;
        },
        placeEnemy(id, x, z) { const e = g.enemies.find(q => q.id === id); e.brain.pos.x = x; e.brain.pos.z = z; },
        hold(on) { g.simHold = !!on; },
        god(on) { g.god = !!on; },
        resetEnemy(id) { const e = g.enemies.find(q => q.id === id); const b = e.brain; b.hp = b.hpMax; b.resolution = null; b.atk = null; b.cool = 0; b.hostileBy = null; b.chainable = false; b.poise = b.poiseMax; b.go(e.kind === 'shuuyou' ? 'hostile' : 'loop', []); b.sub = 'walk'; e.root.visible = true; e.setDissolve(0); e.y = 0; e.fadeT = null; e.mark = null; e.fleeing = false; e.fleeT = 0; delete g.enemyRes[id]; return true; },
        freezeEnemies(on) { g.frozen = on; for (const e of g.enemies) e.brain.cool = on ? 999 : 0; },
        skipDialog() { while (g.dialog) g.dialogNext(); },
        skipCutscene() { if (g.cut.active) g.cut.skip(); g.ui.letterbox(false); g.cineCam = null; while (g.timers.length) { const t = g.timers.shift(); t.fn(); } },
        heal() { g.player.fighter.hp = g.player.fighter.hpMax; },
        giveAmmo(n) { g.player.fighter.addAmmo(n); },
        give(w) { g.player.fighter.give(w); },
        fastSim(n) { for (let i = 0; i < n; i++) g.step(); return g.frame; },
        use(id) { const s = g.area.spots.find(x => x.id === id) || (g.pipeSpot && g.pipeSpot.id === id ? g.pipeSpot : null); if (s) g.useSpot(s); return !!s; },
        area(id, spawn) { g.changeArea(id, spawn); return g.area.id; },
        step(id) { g.setStep(id); return g.story.step; },
        jump(id) { g.jumpToStep(id); return g.story.step; },
        quality(o) { for (const [k, v] of Object.entries(o)) g.applySetting(k, v, true); },
        perf() { return g.lastPerf || null; },
        renderInfo() { const i = g.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; },
        view(name, opt) { return g.viewMode(name, opt); },
        white(on) { if (on) { g.player.fighter.yoki = Math.max(g.player.fighter.yoki, 80); return g.setWhite(true, 'scripted'); } return g.setWhite(false, 'manual'); },
        yoki(n) { g.player.fighter.yoki = n; g.player.fighter.yokiOn = true; },
        stance(id, assist) { g.chooseStance(id, assist); return g.route.stance; },
        tryWhite() { g.toggleWhite(); return g.player.fighter.form; },
        closeMenu() { g.ui.closePuzzle(); g.ui.closeMenu(); g.mode = 'play'; },
        ch4: g.debug4(), ch5: g.debug5(), ch6: g.debug6(), ch7: g.debug7(),
        roster(group, name) { const ns = (window.__shPZ || {}).pickRoster ? null : null; void ns; return g.puz.roster; },
      },
      save: k => g.saveSlot(k), load: k => g.loadSlot(k), store: g.store, wp: g.WP,
    };
  }
  /** P17：包みが読めた時、今いる異形（コードの形）の網を差し替える */
  refreshEnemyPacks() { for (const e of this.enemies || []) { const m = e.model; if (m && !m.packed && ENEMY_PACK_KINDS.includes(m.kind)) applyEnemyPack(m, m.kind, { tint: m.packTint }); } }
  /** P17：カメラの床と天井（camera.js の range）。区画の camRange（自宅の 2 階・階段）か、屋内の天井の高さ（CAM_CEIL）。外は地面の上だけ */
  camRangeFn(A, P) {
    if (A.camRange) return (x, z) => A.camRange(x, z, P.pos.y);
    const top = CAM_CEIL[A.id] != null ? CAM_CEIL[A.id] - 0.28 : Infinity;
    return () => [0.3, top];
  }
  /** 撮影用：キャラクターの寄り（相手：player|companion|boss） */
  viewMode(name, opt = {}) {
    if (name === 'normal') { this.closeup = false; this.cineCam = null; this.ui.letterbox(false); this.mode = 'play'; return true; }
    if (name === 'closeup') {
      const who = opt.who || 'player';
      const gh = who === 'giantHead' && this.giant ? (() => { const v = new THREE.Vector3(); this.giant.root.updateMatrixWorld(true); this.giant.model.G.gHead.getWorldPosition(v); return v; })() : null;
      const t = gh ? { x: gh.x, z: gh.z, yaw: this.giant.yaw, h: gh.y } : who === 'giant' && this.giant ? { x: this.giant.pos.x, z: this.giant.pos.z, yaw: this.giant.yaw, h: 8.2 } : who === 'player' ? { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw, h: 1.5 } : who === 'companion' ? { x: this.companion.brain.pos.x, z: this.companion.brain.pos.z, yaw: this.companion.brain.yaw, h: 1.45 } : { x: this.boss.pos.x, z: this.boss.pos.z, yaw: this.boss.brain.yaw, h: 1.8 };
      const d = opt.dist || 1.2, side = opt.side || 0.35, hy = opt.y != null ? opt.y : t.h;
      const a = t.yaw + side;
      this.cineCam = { pos: [t.x + Math.sin(a) * d, hy + (opt.up || 0.02), t.z + Math.cos(a) * d], look: [t.x, hy - (opt.down || 0.05), t.z], fov: opt.fov || 38 };
      this.mode = 'pause'; this.closeup = true; this.ui.closeMenu(); return true;
    }
    return false;
  }
}
Object.assign(Game.prototype, combatMethods, storyMethods, ch3Methods, ch4Methods, ch5Methods, ch6Methods, ch7Methods);

function raySphereHit(o, d, c, r) { const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z; const B = ox * d.x + oy * d.y + oz * d.z, Cc = ox * ox + oy * oy + oz * oz - r * r; const disc = B * B - Cc; return disc >= 0 && -B - Math.sqrt(disc) > 0; }
function mergeIn(a, b) {
  if (!a) return b; const o = Object.assign({}, b);
  for (const k of ['attack', 'dodge', 'parry', 'swap', 'reload', 'interact', 'lock', 'heal', 'light', 'lockPrev', 'lockNext']) o[k] = a[k] || b[k];
  if (a.wantWeapon && !b.wantWeapon) o.wantWeapon = a.wantWeapon;
  return o;
}

/** P17：屋内の区画の天井の高さ（m・world/areas*.js の H）。カメラが天井を抜けて外から見下ろさない */
const CAM_CEIL = { hospital: 3.6, tunnel: 3.4, office: 3.2, oldwing: 3.4, admin: 4.2, kiroku: 6.0, lab: 7.2, atrium: 9.0 };

const game = new Game();
game.init().catch(e => { console.error(e); const b = document.getElementById('sh-boot'); if (b) b.textContent = '起動できませんでした：' + e.message; });
