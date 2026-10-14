// 『境界侵食』（仮題）フェーズ1〜2：3D 操作の土台＋紫の姿の戦闘の遊べる切片。
// シミュレーションは 60Hz 固定（入力・判定・AI）。描画は可変。window.__sh は自動プレイ・検証用。
import * as THREE from 'three';
import { LEVEL } from './data/level.js';
import { ENEMIES } from './data/enemies.js';
import { COMBAT, ITEMS, f2ms } from './data/combat.js';
import { SAFE } from './data/safe.js';
import { buildLevel } from './world/level.js';
import { resolveCircle, rayBoxes, lineOfSight, insideAny, rayCylinder, raySphere } from './world/collide.js';
import { buildDannoura, buildCompanion, buildKiro, buildHeiten } from './actor/models.js';
import { Player, EnemyActor, Companion, turnTo } from './actor/actors.js';
import { loadManifest, loadVRM } from './actor/vrm.js';
import { Kiro } from './ai/kiro.js';
import { Heiten } from './ai/heiten.js';
import { ThirdPersonCamera } from './render/camera.js';
import { Fx, Rain } from './render/fx.js';
import { setOutlinesVisible, canvasTex, JP_FONT, toon } from './render/toon.js';
import { Input } from './core/input.js';
import { Sfx } from './core/audio.js';
import { UI } from './ui/ui.js';
import { setupTouch } from './ui/touch.js';
import { SaveStore, makeSlot } from './save/save.js';
import { createWP } from './link/progress.js';
import { newRouteState } from './story/route.js';

const DT = 1 / 60;
const Q = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || Q.get('touch') === '1';

const DEFAULT_SETTINGS = () => ({
  resScale: isTouch ? 0.7 : 1, shadows: !isTouch, outline: true, rain: !isTouch, difficulty: 'normal', assist: false,
  sens: 1, invertY: false, volume: 0.7, touchUI: isTouch,
});

class Game {
  async init() {
    const S0 = new SaveStore(localStorage);
    this.store = S0; this.WP = createWP(localStorage);
    this.settings = Object.assign(DEFAULT_SETTINGS(), S0.readSettings() || {});
    if (Q.get('touch') === '1') this.settings.touchUI = true;
    if (Q.get('res')) this.settings.resScale = +Q.get('res');
    // 描画
    const canvas = document.getElementById('sh-canvas');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
    r.setClearColor(0x0c0a16);
    r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x100c1c, 0.045);
    this.scene.background = new THREE.Color(0x0c0a16);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 120);
    this.cam = new ThirdPersonCamera(this.camera);
    const hemi = new THREE.HemisphereLight(0x5a5a9a, 0x1a1420, 1.1); this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0x2a2440, 0.6));
    const moon = this.moon = new THREE.DirectionalLight(0x9aa8e0, 0.9);
    moon.shadow.mapSize.set(isTouch ? 512 : 1024, isTouch ? 512 : 1024);
    Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 }); moon.shadow.bias = -0.0015;
    this.scene.add(moon); this.scene.add(moon.target);
    // キャラクターを少し浮かせる補助の光（アニメ調の見やすさ）
    this.keyLight = new THREE.PointLight(0xc8b8ff, 1.6, 4, 1.5); this.scene.add(this.keyLight);
    this.level = buildLevel(this.scene);
    this.boxes = this.level.boxes;
    this.fx = new Fx(this.scene); this.rain = new Rain(this.scene, isTouch ? 400 : 900);
    // 金庫の扉・閉店の立て看板（動く物）
    this.heitenSign = this.makeSignStand();
    // 役者
    this.player = new Player(buildDannoura(), { difficulty: this.settings.difficulty, touch: isTouch, assist: this.settings.assist, ammo: 24 });
    this.scene.add(this.player.root);
    this.companion = new Companion(buildCompanion());
    const cs = LEVEL.homeSpots.companion; this.companion.root.position.set(cs[0], 0, cs[1]); this.companion.root.rotation.y = Math.PI * 0.9;
    this.scene.add(this.companion.root);
    this.level.spots.push({ id: 'companion', kind: 'talk', x: cs[0], z: cs[1] - 0.8, r: 1.5, label: '話す（相棒）' });
    this.items = {};
    this.flags = {}; this.picked = new Set(); this.opened = new Set(); this.resol = {}; this.route = newRouteState();
    this.metrics = { swaps: [], issen: { mikiri: 0, hajiki: 0, iai: 0, utsu: 0 }, just: 0, parry: 0, shots: 0, shotHits: 0, weakHits: 0, slashHits: 0, wallClips: 0, outOfBounds: 0, hurt: 0, enemyAttacks: {}, events: [] };
    this.spawnEnemies();
    this.buildPickups();
    // 入力・画面
    this.sfx = new Sfx(); this.sfx.setVolume(this.settings.volume);
    this.input = new Input(canvas, { sens: this.settings.sens });
    this.input.wantLock = () => this.mode === 'play';
    this.input.onUnlock = () => { if (this.mode === 'play' && !this.noPauseOnUnlock) this.pause(); };
    this.ui = new UI(document.getElementById('sh-ui'), this);
    this.touchUI = setupTouch(document.getElementById('sh-ui'), this.input, this);
    this.applySetting('touchUI', this.settings.touchUI, true);
    this.events = await fetch(new URL('./data/events.json', import.meta.url)).then(r => r.json()).catch(() => ({ events: {}, barks: {}, texts: {}, speakers: {} }));
    // VRM（manifest に書かれていれば）
    this.manifest = await loadManifest();
    this.loadCharacterModels();
    // 状態
    this.frame = 0; this.playSec = 0; this.mode = 'title'; this.hitstop = 0; this.slowT = 0; this.slowScale = 1; this.worldScale = 1;
    this.lock = null; this.dialog = null; this.pendingIn = null; this.autosaveReq = false; this.gunshot = null; this.gunshotT = 0;
    this.placePlayer(LEVEL.start.pos, LEVEL.start.yaw);
    this.applyQuality();
    addEventListener('resize', () => this.resize()); this.resize();
    this.perfOn = Q.get('perf') === '1'; this.perfAcc = { t: 0, n: 0, steps: 0 };
    this.tuneOn = Q.get('tune') === '1'; if (this.tuneOn) this.buildTune();
    this.last = performance.now(); this.acc = 0;
    this.renderer.setAnimationLoop(() => this.frameLoop());
    this.exposeAPI();
    this.title();
  }
  async loadCharacterModels() {
    const m = this.manifest && this.manifest.characters; if (!m) return;
    if (m.dannoura && m.dannoura.file) { const v = await loadVRM(m.dannoura); if (v) { this.player.setModel(v); this.vrmLoaded = (this.vrmLoaded || []).concat('dannoura'); } }
    if (m.companion && m.companion.file) { const v = await loadVRM(m.companion); if (v) { this.companion.setModel(v); this.vrmLoaded = (this.vrmLoaded || []).concat('companion'); } }
  }
  makeSignStand() {
    const hp = LEVEL.heiten.help.sign;
    const draw = text => (g, w, h) => { g.fillStyle = '#f6f0e0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d4a2c'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = text === '営業中' ? '#1d6a3c' : '#8a1a1a'; g.font = `bold ${text.length > 4 ? 46 : 70}px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 60)); };
    const tex = canvasTex(256, 256, draw('営業中'));
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.6), [toon(0x2a2a2a), new THREE.MeshBasicMaterial({ map: tex }), toon(0x2a2a2a), toon(0x2a2a2a), toon(0x2a2a2a), toon(0x2a2a2a)]);
    board.position.y = 0.75; board.rotation.z = 0.12; g.add(board);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), toon(0x2a2a2a)); leg.position.y = 0.02; g.add(leg);
    g.position.set(hp[0], 0, hp[1]); this.scene.add(g);
    return { g, tex, set: text => { const c = tex.userData.canvas; draw(text)(c.getContext('2d'), c.width, c.height); tex.needsUpdate = true; } };
  }
  spawnEnemies() {
    if (this.enemies) for (const e of this.enemies) this.scene.remove(e.root);
    this.enemies = [];
    LEVEL.kiro.forEach((k, i) => {
      const door = LEVEL.doors[k.door];
      const brain = new Kiro({ id: k.id, path: k.path.map(([x, z]) => ({ x, z })), home: k.door, startIdx: k.start, seed: 11 + i * 7 });
      const model = buildKiro(door.color);
      const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root);
    });
    const H = LEVEL.heiten;
    const st = {}; for (const [k, v] of Object.entries(H.stations)) st[k] = { x: v[0], z: v[1] };
    st.shutter.face = { x: -10, z: -40 }; st.bow.face = { x: -10, z: -40 }; st.register.face = { x: 9.6, z: -45 }; st.lights.face = { x: 12, z: -35.5 };
    const hb = new Heiten({ id: H.id, stations: st, pos: { x: H.start[0], z: H.start[1] }, center: { x: H.center[0], z: H.center[1] }, leash: H.leash, seed: 5 });
    const he = new EnemyActor(hb, buildHeiten()); this.enemies.push(he); this.scene.add(he.root); this.heiten = he;
  }
  buildPickups() {
    if (this.pickMeshes) for (const m of this.pickMeshes.values()) this.scene.remove(m);
    this.pickMeshes = new Map();
    for (const p of LEVEL.pickups) {
      const g = new THREE.Group();
      const color = p.item === 'ammo_box' ? 0xc8a040 : 0xe05060;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), toon(color)); m.position.y = 0.12; g.add(m);
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 20), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
      g.position.set(p.pos[0], 0, p.pos[1]); this.scene.add(g); this.pickMeshes.set(p.id, g);
    }
  }
  placePlayer(pos, yaw) {
    this.player.pos.set(pos[0], 0, pos[2] != null ? pos[2] : pos[1]); this.player.yaw = yaw;
    this.cam.yaw = yaw + Math.PI; this.cam.curDist = 1.0;
  }

  // ── タイトル（最初の操作で音とポインタロックを有効にする） ──
  title() {
    const el = document.getElementById('sh-title');
    const has = !!this.store.load('auto');
    el.querySelector('[data-a="cont"]').hidden = !has;
    el.hidden = false; document.getElementById('sh-boot').hidden = true;
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      this.sfx.init();
      if (b.dataset.a === 'new') this.newGame(); else if (b.dataset.a === 'cont') this.loadSlot('auto');
      else if (b.dataset.a === 'back') { location.href = 'index.html'; }
    };
    if (Q.get('autostart') === '1') this.newGame();
    if (Q.get('continue') === '1' && has) this.loadSlot('auto');
  }
  newGame() {
    document.getElementById('sh-title').hidden = true;
    this.startedAt = performance.now();
    this.mode = 'play';
    if (!this.isTest()) this.input.requestLock();
    if (Q.get('skipintro') !== '1') this.playEvent('ev_intro', () => { this.flags.intro_done = true; });
    else this.flags.intro_done = true;
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
  }
  step() {
    const inp = this.input.sample();
    if (this.mode === 'title') return;
    if (this.mode === 'dialog') { if (inp.interact || inp.attack || inp.dodge) this.dialogNext(); return; }
    if (this.mode !== 'play') { if (inp.pause && this.mode === 'pause') this.resume(); return; }
    if (inp.pause) { this.pause(); return; }
    this.frame++; this.playSec += DT;
    if (this.hitstop > 0) {                                      // ヒットストップ：押した入力は次へ持ち越す
      this.hitstop--;
      this.pendingIn = mergeIn(this.pendingIn, inp);
      return;
    }
    const I = this.pendingIn ? mergeIn(this.pendingIn, inp) : inp; this.pendingIn = null;
    if (this.slowT > 0) { this.slowT--; this.worldScale = this.slowScale; if (this.slowT === 0) { this.ui.slow(false); this.sfx.setMuffle(0); } } else this.worldScale = 1;
    if (this.gunshotT > 0) this.gunshotT--; else this.gunshot = null;
    this.stepPlayer(I);
    const wdt = DT * this.worldScale;
    for (const e of this.enemies) this.stepEnemy(e, wdt);
    this.stepWorld(I);
  }

  // ── プレイヤー ──
  stepPlayer(I) {
    const P = this.player, F = P.fighter;
    if (I.wantWeapon) this.pendingWeapon = { w: I.wantWeapon, until: this.frame + 20 };   // 1・2 キーは少しの間おぼえておく
    const pw = this.pendingWeapon;
    if (pw) { if (pw.w === F.weapon || this.frame > pw.until) this.pendingWeapon = null; else if (F.st.name === 'free' || F.st.name === 'reload') { I.swap = true; this.pendingWeapon = null; } }
    if (I.lock) this.toggleLock();
    // 移動の向き（カメラ基準）
    const fw = this.cam.forward(), rt = { x: -fw.z, z: fw.x };
    let mx = fw.x * I.moveY + rt.x * I.moveX, mz = fw.z * I.moveY + rt.z * I.moveX;
    const mag = Math.min(1, Math.hypot(mx, mz)); if (mag > 1e-3) { const L = Math.hypot(mx, mz); P.moveDir = { x: mx / L, z: mz / L }; }
    this.curMoveMag = mag;
    if (this.touchAimAssist || this.input.device !== 'kbm') this.autoAimLock(I);
    const prevSt = F.st.name;
    const evs = F.tick({ attack: I.attack, heavy: I.heavy, dodge: I.dodge, parry: I.parry, swap: I.swap, aim: I.aim, reload: I.reload });
    this.handleFighter(evs);
    // 回復
    if (I.heal) this.useHeal();
    if (I.interact && this.nearSpot) this.useSpot(this.nearSpot);
    // 移動
    const st = F.st; let vx = 0, vz = 0;
    if (st.name === 'dodge') {
      const t = st.f / 24, k = t < 0.7 ? Math.cos(t / 0.7 * Math.PI / 2) : 0;
      const sp = COMBAT.dodge.dist / 0.28 * k * 0.9;
      vx = P.dodgeDir.x * sp; vz = P.dodgeDir.z * sp;
      P.yaw = turnTo(P.yaw, Math.atan2(P.dodgeDir.x, P.dodgeDir.z), 0.5);
    } else if (st.name === 'attack' && st.f < st.atk.startup + st.atk.active + 2 && st.atk.lunge) {
      const dur = st.atk.startup + st.atk.active + 2;
      const sp = st.atk.lunge / (dur * DT) * (this.lockTargetClose() ? 0.35 : 1);
      vx = Math.sin(P.yaw) * sp; vz = Math.cos(P.yaw) * sp;
    } else {
      const mul = F.moveMul();
      const run = I.run && !(F.aimHeld && F.weapon === 'handgun');
      const sp = (run ? COMBAT.move.run : COMBAT.move.walk) * mul * mag;
      vx = P.moveDir.x * sp * (mag > 1e-3 ? 1 : 0); vz = P.moveDir.z * sp * (mag > 1e-3 ? 1 : 0);
      if (F.aimHeld && F.weapon === 'handgun') P.yaw = turnTo(P.yaw, Math.atan2(fw.x, fw.z), 0.4);
      else if (this.lock && this.lock.hittable() && (st.name === 'free' || st.name === 'charge' || st.name === 'parry') && mag < 0.1) P.yaw = turnTo(P.yaw, Math.atan2(this.lock.pos.x - P.pos.x, this.lock.pos.z - P.pos.z), 0.2);
      else if (mag > 1e-3 && mul > 0) P.yaw = turnTo(P.yaw, Math.atan2(P.moveDir.x, P.moveDir.z), 0.25);
    }
    const before = { x: P.pos.x, z: P.pos.z };
    P.pos.x += vx * DT; P.pos.z += vz * DT;
    resolveCircle(P.pos, P.r, this.boxes);
    for (const e of this.enemies) {
      if (!e.brain.alive || !e.root.visible || e.brain.state === 'home') continue;
      const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), min = P.r + e.r * 0.85;
      if (d < min && d > 1e-4 && st.name !== 'issen') { P.pos.x = e.pos.x + dx / d * min; P.pos.z = e.pos.z + dz / d * min; }
    }
    resolveCircle(P.pos, P.r, this.boxes);
    if (insideAny(P.pos, this.boxes, 0)) this.metrics.wallClips++;
    if (P.pos.x < -17.5 || P.pos.x > 17.5 || P.pos.z < -73 || P.pos.z > 16.5) this.metrics.outOfBounds++;
    if (this.god) F.hp = F.hpMax;
    const moved = Math.hypot(P.pos.x - before.x, P.pos.z - before.z);
    P.speed = moved / DT; P.phase += moved * 3.1;
    P.noise = P.speed > 3.5 ? 'run' : P.speed > 0.3 ? 'walk' : 'none';
    if (prevSt !== 'dodge' && st.name === 'dodge') { /* 回避の向き：入力が無ければ後ろへ */ }
  }
  lockTargetClose() { const t = this.lock || this.softTarget; return t && Math.hypot(t.pos.x - this.player.pos.x, t.pos.z - this.player.pos.z) < 1.4; }
  autoAimLock(I) {
    // タッチ・パッド：攻撃・構えの時に一番近い敵へ自動で向く
    if (!(I.attack || I.aim)) return;
    const t = this.nearestEnemy(8, true);
    if (t && this.input.device === 'touch') this.lock = t;
  }
  nearestEnemy(range = 4, needSight = false, cone = 360, from = this.player.pos, yaw = this.player.yaw) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const dx = e.pos.x - from.x, dz = e.pos.z - from.z, d = Math.hypot(dx, dz);
      if (d > range) continue;
      if (cone < 360) { let a = Math.atan2(dx, dz) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (Math.abs(a) * 180 / Math.PI > cone / 2) continue; }
      if (needSight && !lineOfSight(from, e.pos, this.boxes)) continue;
      const score = d; if (score < bd) { bd = score; best = e; }
    }
    return best;
  }
  toggleLock() {
    if (this.lock) { this.lock = null; return; }
    // 画面の中央に近い・近い敵
    let best = null, bs = 1e9;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const v = new THREE.Vector3(e.pos.x, 1.2, e.pos.z); const d = v.distanceTo(this.player.pos); if (d > 16) continue;
      v.project(this.camera); if (v.z > 1 || Math.abs(v.x) > 1.1) continue;
      const s = Math.abs(v.x) * 8 + d; if (s < bs) { bs = s; best = e; }
    }
    this.lock = best;
  }

  handleFighter(evs) {
    const P = this.player, F = P.fighter;
    for (const ev of evs) {
      this.metrics.events.push({ t: ev.t, frame: this.frame, f: ev.frame, kind: ev.kind, step: ev.step }); if (this.metrics.events.length > 400) this.metrics.events.shift();
      switch (ev.t) {
        case 'attackStart': {
          const t = (this.lock && this.lock.hittable() && Math.hypot(this.lock.pos.x - P.pos.x, this.lock.pos.z - P.pos.z) < 5) ? this.lock : this.nearestEnemy(3.6, true, 220);
          this.softTarget = t;
          if (t) P.yaw = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z);
          else if (this.curMoveMag > 0.3) P.yaw = Math.atan2(P.moveDir.x, P.moveDir.z);
          this.swingHits = new Set(); P.trailPts = [];
          this.sfx.play(ev.heavy || ev.iai || ev.step === 2 ? 'swing_heavy' : 'swing');
          break;
        }
        case 'active': this.meleeHits(ev.atk, ev); break;
        case 'dodge': {
          const d = P.moveDir;
          P.dodgeDir = this.curMoveMag > 0.1 ? { x: d.x, z: d.z } : { x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) };
          this.sfx.play('dodge'); this.fx.dust(P.pos); break;
        }
        case 'just': {
          this.metrics.just++; this.sfx.play('just'); this.ui.toast('見切り', 'just', 0.9);
          if (!this.flags.first_just) { this.flags.first_just = true; this.bark('first_just'); }
          break;
        }
        case 'slow': this.slowT = Math.round(ev.frames); this.slowScale = ev.scale; this.ui.slow(true); this.sfx.setMuffle(0.6); break;
        case 'parry': {
          this.metrics.parry++; const e = ev.src; if (e && e.brain) e.brain.parried(); this.sfx.play('parry'); this.ui.toast('弾き', 'parry', 0.8);
          const bp = P.bladePoints(); this.fx.sparks(bp ? bp[1] : P.pos.clone().setY(1.3), 18, 0xfff4d0); this.hitstop = COMBAT.hitstop.heavy; this.cam.shake(0.08, 0.15);
          break;
        }
        case 'parryFail': break;
        case 'guard': this.sfx.play('guard'); this.cam.shake(0.06, 0.12); break;
        case 'issen': this.startIssen(ev); break;
        case 'issenStrike': this.issenStrike(ev); break;
        case 'shot': this.fireShot(ev); break;
        case 'dry': this.sfx.play('dry'); this.ui.log('弾が無い'); break;
        case 'reloadStart': this.sfx.play('reload'); break;
        case 'reloadDone': break;
        case 'swapStart': this.sfx.play('swap'); this.swapStartFrame = ev.frame; break;
        case 'swapDone': this.metrics.swaps.push({ to: ev.weapon, frames: ev.frames, ms: f2ms(ev.frames), measured: ev.frame - this.swapStartFrame }); break;
        case 'hurt': {
          this.metrics.hurt++; this.sfx.play('hurt'); this.cam.shake(ev.grab ? 0.22 : 0.14, 0.25); this.ui.flash('hurt');
          if (F.hp < 30 && !this.flags.lowhp_bark) { this.flags.lowhp_bark = true; this.bark('low_hp'); }
          break;
        }
        case 'dead': setTimeout(() => { this.mode = 'dead'; this.input.exitLock(); this.ui.showDead(true); }, 1400); break;
        case 'iaiReady': this.sfx.play('issen_ready'); this.ui.toast('居合', 'iai', 0.6); break;
      }
    }
  }
  meleeHits(atk, ev) {
    const P = this.player, F = P.fighter;
    const bp = P.bladePoints(); if (bp) P.trailPts.push(bp);
    if (P.trailPts.length >= 2) { this.fx.trail(P.trailPts.slice(-2), F.st.iai ? 0xffffff : 0xd8c8ff, 0.14); }
    for (const e of this.enemies) {
      if (!e.hittable() || this.swingHits.has(e)) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > atk.reach + e.r) continue;
      let a = Math.atan2(dx, dz) - P.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) * 180 / Math.PI > atk.arc / 2 && d > e.r + 0.5) continue;
      this.swingHits.add(e);
      F.markSwingHit();
      const heavy = atk.stop === 'heavy';
      this.damageEnemy(e, atk.dmg, 'slash');
      this.metrics.slashHits++;
      this.hitstop = heavy ? COMBAT.hitstop.heavy : COMBAT.hitstop.light;
      this.cam.shake(heavy ? 0.12 : 0.06, 0.15);
      this.fx.sparks(new THREE.Vector3(e.pos.x - dx / d * e.r, 1.2, e.pos.z - dz / d * e.r), heavy ? 16 : 9);
      this.sfx.play(heavy ? 'hit_heavy' : 'hit');
    }
  }
  damageEnemy(e, dmg, kind) {
    const evs = [];
    const done = e.brain.hurt(dmg, kind, evs);
    if (done) this.enemyEvents(e, evs);
    return done;
  }
  startIssen(ev) {
    const P = this.player, e = ev.target;
    this.metrics.issen[ev.kind]++;
    P.issenInfo = COMBAT.issen[ev.kind];
    this.issenFrom = P.pos.clone();
    if (e && e.brain) {
      e.brain.interrupt();
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
      if (ev.kind === 'mikiri') {                                 // 背後へ抜ける
        const tx = e.pos.x + dx / d * (e.r + 1.1), tz = e.pos.z + dz / d * (e.r + 1.1);
        const p = { x: tx, z: tz }; resolveCircle(p, P.r, this.boxes); P.pos.x = p.x; P.pos.z = p.z;
        P.yaw = Math.atan2(-dx, -dz);
      } else if (ev.kind === 'utsu' || ev.kind === 'hajiki') {
        const tx = e.pos.x - dx / d * (e.r + 0.9), tz = e.pos.z - dz / d * (e.r + 0.9);
        const p = { x: tx, z: tz }; resolveCircle(p, P.r, this.boxes); P.pos.x = p.x; P.pos.z = p.z;
        P.yaw = Math.atan2(dx, dz);
      } else P.yaw = Math.atan2(dx, dz);
    }
    const names = { mikiri: '見切り一閃', hajiki: '弾き一閃', iai: '抜刀一閃', utsu: '撃ち一閃' };
    this.ui.toast(names[ev.kind], 'issen', 1.4);
    this.ui.flash('issen'); this.sfx.play('issen'); this.sfx.setMuffle(0.85);
    this.slowT = Math.max(this.slowT, COMBAT.issen[ev.kind].total + 10); this.slowScale = 0.2; this.ui.slow(true);
    this.cam.shake(0.05, 0.2);
  }
  issenStrike(ev) {
    const P = this.player, e = ev.target;
    const from = this.issenFrom || P.pos.clone();
    const a = new THREE.Vector3(from.x, 1.15, from.z), b = new THREE.Vector3(P.pos.x, 1.15, P.pos.z);
    if (e && e.pos) { const mid = new THREE.Vector3(e.pos.x, 1.2, e.pos.z); const dir = b.clone().sub(a); if (dir.length() < 0.5) { dir.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); a.copy(mid).addScaledVector(dir, -1.6); b.copy(mid).addScaledVector(dir, 1.6); } else { a.addScaledVector(dir.normalize(), -0.8); b.addScaledVector(dir, 0.8); } }
    this.fx.streak(a, b, 0xffffff, 0.6, 0.045);
    if (e && e.hittable && e.hittable()) { this.damageEnemy(e, ev.dmg, 'issen'); this.fx.sparks(new THREE.Vector3(e.pos.x, 1.3, e.pos.z), 24, 0xffffff); }
    if (ev.kind === 'mikiri') for (const o of this.enemies) if (o !== e && o.hittable() && Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z) < 2.2) this.damageEnemy(o, Math.round(ev.dmg / 2), 'issen');
    this.hitstop = COMBAT.hitstop.issen; this.cam.shake(0.25, 0.3); this.ui.flash('strike'); this.sfx.play('hit_heavy');
    if (this.WP.achieve('first_issen')) this.ui.log('実績：はじめての一閃');
    this.flags.first_issen = true;
  }
  fireShot(ev) {
    const P = this.player, F = P.fighter; this.metrics.shots++;
    const muzzle = P.muzzleWorld();
    let o, d;
    if (ev.aimed && this.input.device === 'kbm') {
      this.syncCamera();
      o = this.camera.position.clone(); d = new THREE.Vector3(); this.camera.getWorldDirection(d);
    } else {
      // 構えずに撃つ・タッチ・パッド：近い敵へ自動で（弱点ではなく体）
      const t = (this.lock && this.lock.hittable()) ? this.lock : this.nearestEnemy(COMBAT.handgun.range, true, ev.aimed ? 70 : COMBAT.handgun.hipCone * 2);
      o = new THREE.Vector3(P.pos.x, 1.35, P.pos.z);
      if (t) { P.yaw = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z); d = new THREE.Vector3(t.pos.x - o.x, (ev.aimed && this.touchAimAssist ? t.model.weakY || 1.2 : 1.1) - o.y, t.pos.z - o.z).normalize(); }
      else d = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    }
    const maxT = COMBAT.handgun.range;
    const wallT = rayBoxes(o, d, maxT, this.boxes);
    let hit = null, ht = wallT, weak = false;
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const c = { x: e.pos.x, y: 0, z: e.pos.z };
      const tb = rayCylinder(o, d, c, e.r, e.h, ht);
      const wp = this.weakPos(e);
      const tw = wp ? raySphere(o, d, wp, e.kind === 'kiro' ? 0.17 : 0.2, ht) : Infinity;
      if (tw < ht && tw <= tb + 0.3) { hit = e; ht = tw; weak = true; }
      else if (tb < ht) { hit = e; ht = tb; weak = false; }
    }
    const end = o.clone().addScaledVector(d, Math.min(ht, maxT));
    this.fx.flash(muzzle, 0xffd890, 0.12); this.fx.tracer(muzzle, end); this.sfx.play('shot'); this.cam.shake(0.05, 0.1);
    this.gunshot = { x: P.pos.x, z: P.pos.z }; this.gunshotT = 3;
    if (hit) {
      this.metrics.shotHits++;
      const dmg = Math.round(ev.dmg * (weak ? COMBAT.handgun.weakMul : 1));
      this.damageEnemy(hit, dmg, 'shot'); this.fx.sparks(end, weak ? 14 : 6, weak ? 0xffd27a : 0xd0d0d0);
      if (weak) { this.metrics.weakHits++; F.markWeakHit(hit); hit.brain.atk = null; if (hit.brain.alive && hit.brain.state !== 'stagger') { hit.brain.staggerFor = 0.6; hit.brain.go('stagger', [], 'weak'); } this.ui.toast('怯み', 'weak', 0.6); }
    } else if (ht < maxT) this.fx.sparks(end, 4, 0xa0a0a0);
  }
  /** 描画を待たずにカメラの位置・向きを今の状態に合わせる（照準の判定用） */
  syncCamera() {
    const P = this.player, F = P.fighter;
    const sh = this.cam.shakeT; this.cam.shakeT = 0;
    this.cam.update(0, P.pos, { x: 0, y: 0 }, this.boxes, { aim: F.weapon === 'handgun' && F.aimHeld, lock: this.lock && this.lock.hittable() ? this.lock.pos : null, indoor: P.pos.z > LEVEL.home.minZ - 0.5 });
    this.cam.shakeT = sh; this.camera.updateMatrixWorld(true);
  }
  weakPos(e) {
    const w = e.model.weak; if (!w) return null; const v = new THREE.Vector3(); w.getWorldPosition(v); return v;
  }

  // ── 異形 ──
  stepEnemy(e, dt) {
    const b = e.brain, P = this.player;
    if (!e.root.visible && b.state !== 'home') return;
    if (b.state === 'dead') { this.dissolve(e, dt); return; }
    if (b.state === 'home') { this.enterHome(e, dt); return; }
    const dist = Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z);
    const los = dist < 30 ? lineOfSight(b.pos, P.pos, this.boxes) : false;
    const Z = LEVEL.heiten.zone;
    const sense = { player: { x: P.pos.x, z: P.pos.z, noise: P.noise, dead: P.fighter.dead }, los, dark: false, gunshot: this.gunshot,
      inShop: P.pos.x > Z.minX && P.pos.x < Z.maxX && P.pos.z > Z.minZ && P.pos.z < Z.maxZ };
    const out = e.step(dt, sense, this.boxes, P);
    this.enemyEvents(e, out.events);
  }
  enemyEvents(e, evs) {
    const P = this.player, F = P.fighter, b = e.brain;
    for (const ev of evs) {
      switch (ev.t) {
        case 'telegraph': {
          e.mark = ev.parryable ? 'parry' : 'red'; e.markT = ev.def.windup + 0.2;
          this.sfx.play(ev.parryable ? 'tel_parry' : 'tel_red');
          if (e.kind === 'kiro') e.weakGlow = 0.85;
          break;
        }
        case 'attack': {
          const A = ev.def;
          const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z, d = Math.hypot(dx, dz);
          let a = Math.atan2(dx, dz) - b.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; a = Math.abs(a) * 180 / Math.PI;
          const inRange = d <= A.range + P.r && a <= A.arc / 2 + 10;
          const nearMiss = d <= A.range + 1.4 && a <= A.arc / 2 + 50;
          const r = F.incoming({ src: e, dmg: A.dmg, parryable: A.parryable, grab: !!A.grab, inRange, nearMiss });
          this.handleFighter(F.drain());
          if (ev.name === 'shutter') { this.sfx.play('slam'); this.cam.shake(0.18, 0.3); this.fx.dust({ x: b.pos.x + Math.sin(b.yaw) * 2, z: b.pos.z + Math.cos(b.yaw) * 2 }, 14); }
          e.lastAttackResult = r; this.metrics.enemyAttacks[e.id] = (this.metrics.enemyAttacks[e.id] || 0) + 1;
          if (e.kind === 'kiro') e.weakGlow = 0;
          break;
        }
        case 'state': if (ev.to !== 'hostile') e.mark = null; if (ev.to === 'stagger' || ev.to === 'dead') { e.mark = null; e.weakGlow = 0; } break;
        case 'notice': this.sfx.play('notice'); if (e.kind === 'kiro' && Math.random() < 0.5) this.bark('kiro_notice', 2.2); break;
        case 'hostile': break;
        case 'knock': { const d = Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z); if (d < 16) this.sfx.play('knock'); break; }
        case 'say': this.bark(ev.key, 3); this.sfx.play('heiten_voice'); break;
        case 'step': this.heitenStep(ev.id); break;
        case 'reset': this.heitenStep('reset'); break;
        case 'helped': this.bark('heiten_helped', 2); this.sfx.play('ui_ok'); break;
        case 'wrong': this.bark('heiten_wrong', 2); this.sfx.play('ui_ng'); break;
        case 'misread': this.ui.log('……家族と思っているようだ'); break;
        case 'rescued': {
          this.sfx.play('rescue'); this.resolve(e, 'rescue');
          if (e.kind === 'heiten') { this.bark('heiten_rescued', 3.5); this.heitenSign.set('本日は\n閉店しました'); this.heitenStep('rest'); }
          else if (!this.flags.first_rescue) { this.flags.first_rescue = true; this.bark('first_rescue'); }
          break;
        }
        case 'die': {
          this.sfx.play('die'); this.fx.mist(new THREE.Vector3(b.pos.x, 0, b.pos.z), 60, e.h); this.resolve(e, 'kill'); e.fadeT = 0;
          if (this.lock === e) this.lock = null;
          if (e.kind === 'heiten') this.bark('heiten_killed', 3);
          else if (!this.flags.first_kill) { this.flags.first_kill = true; this.bark('first_kill'); }
          break;
        }
        case 'calm': e.mark = null; break;
      }
    }
  }
  heitenStep(id) {
    const L = this.level.lights.find(l => l.shop), sh = this.level.dyn.heitenShutter;
    if (id === 'lights' && L) L.off = true;
    if (id === 'shutter' && sh) { sh.target = sh.down; this.sfx.play('shutter'); }
    if (id === 'reset' && L) { L.off = false; if (sh) sh.target = sh.up; }
    if (id === 'rest' && L) { L.off = true; if (sh) sh.target = sh.down; }
  }
  resolve(e, how) {
    const k = e.kind; this.resol[k] = this.resol[k] || { rescue: 0, neutralize: 0, escape: 0, kill: 0 }; this.resol[k][how]++;
    this.WP.bump(k, how === 'rescue' ? 'rescued' : 'killed');
    if (this.allResolved() && !this.flags.all_resolved) { this.flags.all_resolved = true; setTimeout(() => this.bark('all_resolved', 4), 2500); }
    this.autosaveReq = true;
  }
  allResolved() { return this.enemies.every(e => e.brain.resolution === 'rescue' || e.brain.resolution === 'kill'); }
  count(kind, how) { return (this.resol[kind] || {})[how] || 0; }
  heitenStatus() { const r = this.heiten.brain.resolution; return r === 'rescue' ? '救った' : r === 'kill' ? '倒した' : 'まだ'; }
  dissolve(e, dt) {
    if (e.fadeT == null) e.fadeT = 0;
    e.fadeT += dt;
    const k = Math.max(0, 1 - e.fadeT / 1.6);
    e.y = -(1 - k) * 0.6; e.root.scale.set(1 + (1 - k) * 0.15, k * 0.9 + 0.1, 1 + (1 - k) * 0.15);
    if (Math.random() < 0.4) this.fx.mist(new THREE.Vector3(e.pos.x, 0, e.pos.z), 2, e.h * k);
    if (k <= 0) e.root.visible = false;
  }
  enterHome(e, dt) {
    if (e.homeT == null) { e.homeT = 0; const d = this.level.dyn['door_' + e.brain.home]; if (d) d.closeAt = 2.0; }
    e.homeT += dt;
    if (e.homeT > 1.2) e.root.visible = false;
  }

  // ── 世界（調べる・拾う・自動セーブ） ──
  stepWorld(I) {
    const P = this.player;
    // 拾う
    for (const p of LEVEL.pickups) {
      if (this.picked.has(p.id)) continue;
      if (Math.hypot(P.pos.x - p.pos[0], P.pos.z - p.pos[1]) < 0.9) this.pickup(p);
    }
    // 調べられる物
    let best = null, bd = 1e9;
    for (const s of this.level.spots) {
      const d = Math.hypot(P.pos.x - s.x, P.pos.z - s.z);
      if (d > s.r) continue;
      if (s.kind === 'door' && this.opened.has(s.door)) continue;
      if (s.kind === 'help' && (this.heiten.brain.resolved || !this.heiten.brain.alive)) continue;
      if (s.low && d > s.r * 0.6) continue;
      if (d < bd) { bd = d; best = s; }
    }
    this.nearSpot = best;
    // 家の出入り：自動セーブ
    const inHome = P.pos.z > LEVEL.home.minZ;
    if (this.wasInHome != null && inHome !== this.wasInHome) this.autosaveReq = true;
    this.wasInHome = inHome;
    if (this.autosaveReq && this.calm()) { this.autosaveReq = false; this.saveSlot('auto', true); }
  }
  calm() { return !this.player.fighter.dead && !['attack', 'issen', 'dodge', 'hurt', 'parry'].includes(this.player.fighter.st.name) && !this.enemies.some(e => e.brain.alive && ['hostile', 'assess', 'stagger', 'search'].includes(e.brain.state)); }
  pickup(p) {
    this.picked.add(p.id); const m = this.pickMeshes.get(p.id); if (m) m.visible = false;
    const it = ITEMS[p.item];
    if (it.ammo) this.player.fighter.addAmmo(it.ammo); else this.items[p.item] = (this.items[p.item] || 0) + 1;
    this.ui.log(`${it.name} を拾った`); this.sfx.play('pickup');
  }
  useHeal() {
    const F = this.player.fighter; if (F.hp >= F.hpMax || F.dead) return;
    for (const id of ['medkit_s', 'coffee', 'medkit_l']) if (this.items[id] > 0) { this.items[id]--; F.heal(ITEMS[id].heal); this.sfx.play('heal'); this.ui.log(`${ITEMS[id].name} を使った`); return; }
    this.ui.log('回復の道具が無い');
  }
  useSpot(s) {
    const T = this.events.texts || {};
    switch (s.kind) {
      case 'door': {
        const d = this.level.dyn['door_' + s.door]; if (!d) break;
        this.opened.add(s.door); d.open = true; d.openT = 0; this.sfx.play('door');
        d.lamp.material.color.set(0xffe0a0); d.glow.material.color.set(0xffd090);
        const k = this.enemies.find(e => e.kind === 'kiro' && e.brain.home === s.door);
        if (k && k.brain.alive) { const ev = []; k.brain.openDoor(ev); this.enemyEvents(k, ev); }
        this.bark('door_opened', 2.4);
        break;
      }
      case 'vending': if (!this.picked.has('vending')) { this.picked.add('vending'); this.items.coffee = (this.items.coffee || 0) + 1; this.sayText(T.vending); this.sfx.play('pickup'); } else this.sayText(T.vending_empty); break;
      case 'read': this.sayText((T[s.text] || '').replace('{code}', SAFE.code.split('').join(' ')) || s.sign || '……'); break;
      case 'help': { const ev = []; const r = this.heiten.brain.help(s.help, ev); this.enemyEvents(this.heiten, ev); if (s.help === 'lights' && r !== 'wrong') this.heitenStep('lights'); if (s.help === 'sign' && r === 'done') this.heitenSign.set('本日は\n閉店しました'); if (r === 'ignored') this.ui.log('……今は手伝えない'); break; }
      case 'safe': if (this.flags.safe_opened) this.sayText(T.safe_opened); else this.openSafe(); break;
      case 'save': this.autosaveReq = true; this.mode = 'pause'; this.input.exitLock(); this.ui.openSave(); break;
      case 'talk': {
        const id = this.allResolved() ? 'ev_companion_after' : !this.flags.hint1 ? 'ev_companion_hint' : !this.flags.hint2 ? 'ev_companion_heiten' : 'ev_companion_idle';
        if (id === 'ev_companion_hint') this.flags.hint1 = true; if (id === 'ev_companion_heiten') this.flags.hint2 = true;
        this.companion.talking = true; this.playEvent(id, () => { this.companion.talking = false; });
        break;
      }
    }
  }
  sayText(text) { this.playLines([{ who: 'sys', text }]); }
  bark(key, dur = 3) { const b = (this.events.barks || {})[key]; if (!b) return; const sp = this.events.speakers[b.who] || {}; this.ui.bark(sp.name, b.text, sp.color, dur); }
  // ── 会話（データ駆動） ──
  playEvent(id, done) { const lines = (this.events.events || {})[id]; if (!lines) { if (done) done(); return; } this.playLines(lines, done, id); }
  playLines(lines, done, id) {
    this.dialog = { lines, i: 0, done, id, prevMode: this.mode }; this.mode = 'dialog';
    this.showLine();
  }
  showLine() { const d = this.dialog, L = d.lines[d.i]; const sp = (this.events.speakers || {})[L.who] || {}; this.ui.showLine(sp, L.text); }
  dialogNext() {
    const d = this.dialog; if (!d) return; this.sfx.play('ui');
    d.i++;
    if (d.i >= d.lines.length) { this.dialog = null; this.ui.hideDialog(); this.mode = 'play'; if (d.done) d.done(); return; }
    this.showLine();
  }
  openSafe() {
    this.mode = 'pause'; this.input.exitLock();
    this.ui.openSafe(SAFE.digits, code => {
      if (code !== SAFE.code) return false;
      this.flags.safe_opened = true; this.ui.closeSafe(); this.sfx.play('ui_ok');
      for (const c of SAFE.contents) { const it = ITEMS[c.id]; if (it.ammo) this.player.fighter.addAmmo(it.ammo * c.n); else this.items[c.id] = (this.items[c.id] || 0) + c.n; }
      this.mode = 'play'; this.playEvent('ev_safe_open'); this.autosaveReq = true;
      return true;
    }, () => { this.ui.closeSafe(); this.resume(); });
  }
  pause() { if (this.mode !== 'play') return; this.mode = 'pause'; this.input.exitLock(); this.ui.openMenu('top'); }
  resume() { this.ui.closeMenu(); this.ui.closeSafe(); this.mode = 'play'; if (!this.isTest() && !isTouch) this.input.requestLock(); }
  retry() { this.ui.showDead(false); if (this.store.load('auto')) this.loadSlot('auto'); else location.reload(); }

  // ── セーブ ──
  snapshot() {
    const P = this.player, F = P.fighter;
    const enemies = {}; for (const e of this.enemies) { const r = e.brain.resolution; if (r === 'rescue') enemies[e.id] = 'rescued'; else if (r === 'kill') enemies[e.id] = 'dead'; }
    const items = Object.entries(this.items).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n }));
    return makeSlot({
      playSec: this.playSec, area: 'shotengai', pos: [+P.pos.x.toFixed(3), 0, +P.pos.z.toFixed(3)], yaw: +P.yaw.toFixed(3), difficulty: this.settings.difficulty,
      story: Object.assign({}, this.route, { chapter: 'slice', step: this.allResolved() ? 'resolved' : 'free', flags: Object.assign({}, this.flags), resolutions: JSON.parse(JSON.stringify(this.resol)), trust: { companion: 50 } }),
      player: { hp: F.hp, hpMax: F.hpMax, weapons: { pipe: null, katana: { lv: 1 }, handgun: { lv: 1, mag: F.mag }, matchlock: null }, ammo: { handgun: F.ammo }, equipped: F.weapon, items },
      world: { areas: { shotengai: { visited: true, state: 'outbreak', opened: [...this.opened], picked: [...this.picked] } }, enemies: { shotengai: enemies } },
    });
  }
  saveSlot(k, auto) {
    const ok = this.store.write(k, this.snapshot());
    if (ok) { if (auto) this.ui.log('自動セーブしました'); else this.ui.toast('セーブしました', '', 1); } else this.ui.log('セーブできませんでした（' + this.store.lastError + '）');
    if (k !== 'auto') this.WP.write('shinshoku', { chaptersCleared: [] });
    return ok;
  }
  loadSlot(k) {
    const s = this.store.load(k); if (!s) return false;
    document.getElementById('sh-title').hidden = true; this.ui.closeMenu(); this.ui.showDead(false); this.ui.hideDialog(); this.dialog = null;
    this.spawnEnemies(); this.buildPickups();
    this.flags = Object.assign({}, s.story.flags || {}); this.resol = JSON.parse(JSON.stringify(s.story.resolutions || {}));
    this.route = { route: s.story.route, routeLock: s.story.routeLock, reveal: s.story.reveal, forms: s.story.forms, branchLog: s.story.branchLog || [] };
    const W = (s.world.areas || {}).shotengai || {}; this.picked = new Set(W.picked || []); this.opened = new Set(W.opened || []);
    for (const id of this.picked) { const m = this.pickMeshes.get(id); if (m) m.visible = false; }
    for (const [id, d] of Object.entries(this.level.dyn)) if (id.startsWith('door_') && d.pivot) { d.open = this.opened.has(id.slice(5)); d.pivot.rotation.y = d.open ? -1.45 * (LEVEL.doors[id.slice(5)].face) : 0; d.closeAt = null; }
    const EN = (s.world.enemies || {}).shotengai || {};
    for (const e of this.enemies) {
      const r = EN[e.id];
      if (r === 'rescued') { e.brain.resolution = 'rescue'; e.brain.state = e.kind === 'heiten' ? 'rest' : 'home'; if (e.kind === 'kiro') { e.root.visible = false; e.homeT = 9; } }
      else if (r === 'dead') { e.brain.resolution = 'kill'; e.brain.state = 'dead'; e.brain.hp = 0; e.root.visible = false; e.fadeT = 9; }
      else if (e.kind === 'kiro' && this.opened.has(e.brain.home)) { e.brain.openDoor([]); }
    }
    if (this.heiten.brain.resolution === 'rescue') { this.heitenSign.set('本日は\n閉店しました'); this.heitenStep('rest'); } else { this.heitenSign.set('営業中'); this.heitenStep('reset'); }
    const P = this.player, F = P.fighter, pl = s.player;
    F.hp = pl.hp; F.hpMax = pl.hpMax || 100; F.mag = (pl.weapons.handgun || {}).mag ?? 12; F.ammo = (pl.ammo || {}).handgun ?? 0; F.weapon = pl.equipped || 'katana';
    F.st = { name: 'free', f: 0 }; F.invulnUntil = -1; F.mikiri = F.hajiki = F.utsu = null; F.pending = null;
    this.items = {}; for (const it of pl.items || []) this.items[it.id] = it.n;
    this.placePlayer(s.place.pos, s.place.yaw);
    this.playSec = s.playSec || 0; this.settings.difficulty = s.difficulty || this.settings.difficulty; F.setDifficulty(this.settings.difficulty, { touch: isTouch, assist: this.settings.assist });
    this.lock = null; this.slowT = 0; this.hitstop = 0; this.ui.slow(false); this.sfx.setMuffle(0);
    this.mode = 'play'; this.loadedFrom = k;
    if (!this.isTest()) this.input.requestLock();
    this.ui.toast('ロードしました', '', 1);
    return true;
  }

  // ── 設定・画質 ──
  applySetting(k, v, silent) {
    this.settings[k] = v;
    if (k === 'difficulty' || k === 'assist') this.player.fighter.setDifficulty(this.settings.difficulty, { touch: isTouch, assist: this.settings.assist });
    if (k === 'sens') this.input.sens = v;
    if (k === 'invertY') this.cam.invertY = v;
    if (k === 'volume') this.sfx.setVolume(v);
    if (k === 'rain') this.sfx.setRain(v);
    if (k === 'touchUI' && this.touchUI) this.touchUI.show(v);
    if (['resScale', 'shadows', 'outline', 'rain'].includes(k)) this.applyQuality();
    if (!silent) this.store.writeSettings(this.settings);
  }
  applyQuality() {
    const S = this.settings, r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * S.resScale);
    if (r.shadowMap.enabled !== S.shadows) { r.shadowMap.enabled = S.shadows; this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); } }); }
    this.moon.castShadow = S.shadows;
    setOutlinesVisible(this.scene, S.outline); for (const e of this.enemies || []) e.hullOn = null;
    this.rain.mesh.visible = S.rain;
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const rot = document.getElementById('sh-rotate'); if (rot) rot.hidden = !(this.settings.touchUI && h > w);
  }

  // ── 描画 ──
  render(dt, steps) {
    const P = this.player, F = P.fighter;
    const wdt = dt * (this.mode === 'play' ? this.worldScale : 0) * (this.hitstop > 0 ? 0.05 : 1);
    const pdt = this.mode === 'play' ? (this.hitstop > 0 ? dt * 0.05 : dt) : 0;
    const look = this.mode === 'play' ? this.input.consumeLook() : (this.input.consumeLook(), { x: 0, y: 0 });
    const indoor = P.pos.z > LEVEL.home.minZ - 0.5;
    this.cam.update(dt, P.pos, look, this.boxes, { aim: F.weapon === 'handgun' && F.aimHeld && !['swap', 'reload'].includes(F.st.name), lock: this.lock && this.lock.hittable() ? this.lock.pos : null, indoor });
    if (this.lock && !this.lock.hittable()) this.lock = null;
    P.animate(pdt || (this.mode === 'title' ? dt : 0), { aimPitch: this.cam.pitch * 0.8 });
    const cp = this.camera.position;
    for (const e of this.enemies) {
      const dc = Math.hypot(e.pos.x - cp.x, e.pos.z - cp.z), far = dc > 34; e.model.root.visible = !far;
      const hull = this.settings.outline && dc < (isTouch ? 9 : 14); if (e.hullOn !== hull) { e.hullOn = hull; setOutlinesVisible(e.model.root, hull); }
      if (e.root.visible && !far) e.animate(Math.max(wdt, 0));
    }
    this.companion.root.visible = Math.hypot(this.companion.root.position.x - cp.x, this.companion.root.position.z - cp.z) < 30;
    this.companion.animate(dt);
    // 戸の開閉・閉店のシャッター・灯りのちらつき
    for (const [id, d] of Object.entries(this.level.dyn)) {
      if (!id.startsWith('door_') || !d.pivot) continue;
      const face = LEVEL.doors[id.slice(5)].face;
      if (d.closeAt != null) { d.closeAt -= wdt; if (d.closeAt <= 0) { d.open = false; d.closeAt = null; d.lamp.material.color.set(0x88ff99); } }
      const want = d.open ? -1.45 * face : 0; d.pivot.rotation.y += (want - d.pivot.rotation.y) * Math.min(1, dt * 4);
    }
    const sh = this.level.dyn.heitenShutter; if (sh && sh.target != null) sh.mesh.position.y += (sh.target - sh.mesh.position.y) * Math.min(1, wdt * 0.8);
    const t = performance.now() / 1000;
    for (const l of this.level.lights) {
      let k = l.off ? 0.05 : 1;
      if (l.flicker && !l.off) { const n = Math.sin(t * 13.7 + l.pos[2]) * Math.sin(t * 7.3) ; if (n > 0.86) k = 0.15; }
      l.light.intensity += (l.base * k - l.light.intensity) * Math.min(1, dt * 20);
    }
    // 影の光源はプレイヤーの近く
    this.keyLight.position.set(P.pos.x + Math.sin(this.cam.yaw) * 1.6, 1.9, P.pos.z + Math.cos(this.cam.yaw) * 1.6);
    this.moon.position.set(P.pos.x - 6, 14, P.pos.z + 8); this.moon.target.position.set(P.pos.x, 0, P.pos.z);
    if (this.settings.rain) { this.rain.mesh.visible = !indoor; this.rain.update(dt, P.pos.x, P.pos.z, P.pos.z < -4); }
    this.fx.update(Math.max(wdt, 0.0001) + (this.mode === 'play' && this.worldScale < 1 ? dt * 0.3 : 0));
    // 拾える物の回転
    for (const m of this.pickMeshes.values()) if (m.visible) m.children[0].rotation.y += dt * 1.5;
    // 画面の部品
    this.ui.tick(dt);
    if (this.mode === 'play' || this.mode === 'dialog') this.ui.hud(P);
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(this.camera); if (v.z > 1) return null; return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; };
    this.ui.lockAt(this.lock ? proj(this.lock.pos.x, this.lock.h * 0.6, this.lock.pos.z) : null);
    const issenOpen = F.mikiri && (F.frame - F.mikiri.at) <= F.w.mikiri || F.hajiki && (F.frame - F.hajiki.at) <= F.w.hajiki || F.utsu && (F.frame - F.utsu.at) <= F.w.utsu;
    for (const e of this.enemies) {
      if (e.markT > 0) e.markT -= wdt; if (e.markT <= 0) e.mark = null;
      const tgt = issenOpen && ((F.mikiri && F.mikiri.src === e) || (F.hajiki && F.hajiki.src === e) || (F.utsu && F.utsu.src === e));
      const kind = tgt ? 'issen' : e.root.visible && e.brain.alive ? e.mark : null;
      this.ui.mark(e.id, kind ? proj(e.pos.x, e.h + 0.35, e.pos.z) : null, kind);
    }
    if (this.touchUI) { this.touchUI.setUse(!!this.nearSpot); this.touchUI.setIssen(issenOpen); }
    const dev = this.input.device;
    this.ui.prompt(this.mode === 'play' && this.nearSpot ? this.nearSpot.label : null, dev === 'pad' ? 'B' : dev === 'touch' ? '調' : 'E');
    // 照準：弱点に重なっているか
    if (F.weapon === 'handgun' && F.aimHeld && dev === 'kbm') {
      const o = this.camera.position, d = new THREE.Vector3(); this.camera.getWorldDirection(d);
      P.aimWeak = this.enemies.some(e => { const wp = e.hittable() && this.weakPos(e); return wp && raySphere(o, d, wp, 0.2, 40) < 40; });
      for (const e of this.enemies) if (e.kind === 'kiro' && !e.mark) e.weakGlow = 0.35;
    } else { P.aimWeak = false; for (const e of this.enemies) if (e.kind === 'kiro' && !e.mark) e.weakGlow = 0; }
    this.renderer.render(this.scene, this.camera);
    if (this.perfOn) this.perfTick(dt, steps);
  }
  perfTick(dt, steps) {
    const a = this.perfAcc; a.t += dt; a.n++; a.steps += steps;
    if (a.t >= 0.5) {
      const i = this.renderer.info, pr = this.renderer.getPixelRatio();
      this.ui.perf(`fps ${(a.n / a.t).toFixed(1)}  ${(a.t / a.n * 1000).toFixed(1)}ms  sim ${(a.steps / a.t).toFixed(0)}Hz\ndraw ${i.render.calls}  tri ${(i.render.triangles / 1000).toFixed(1)}k  geo ${i.memory.geometries}  tex ${i.memory.textures}\n${innerWidth}×${innerHeight} ×${pr.toFixed(2)}  影${this.settings.shadows ? 'あり' : 'なし'} 輪郭${this.settings.outline ? 'あり' : 'なし'}`);
      this.lastPerf = { fps: a.n / a.t, ms: a.t / a.n * 1000, calls: i.render.calls, tris: i.render.triangles, pr };
      a.t = 0; a.n = 0; a.steps = 0;
    }
  }
  buildTune() {
    const d = document.createElement('div'); d.id = 'sh-tune';
    const W = COMBAT.difficulty.normal;
    const rows = [['ジャスト回避', W, 'just'], ['パリィ（前）', W, 'parryBefore'], ['パリィ（後）', W, 'parryAfter'], ['見切り一閃の窓', COMBAT.issen.mikiri, 'window'], ['弾き一閃の窓', COMBAT.issen.hajiki, 'window'], ['居合の長押し', COMBAT.issen.iai, 'hold'], ['スロー（f）', COMBAT.justSlow, 'frames']];
    d.innerHTML = '<b>?tune=1（ふつうの値・f）</b>' + rows.map(([n, o, k], i) => `<label>${n}<input type="number" data-i="${i}" value="${o[k]}" min="0" max="120"></label>`).join('');
    d.oninput = e => { const i = +e.target.dataset.i; const [, o, k] = rows[i]; o[k] = +e.target.value; this.player.fighter.setDifficulty(this.settings.difficulty, { touch: isTouch, assist: this.settings.assist }); };
    document.body.appendChild(d);
  }

  // ── 自動プレイ・検証用 ──
  exposeAPI() {
    const g = this;
    window.__sh = {
      game: g, THREE,
      state() {
        const P = g.player, F = P.fighter;
        return {
          mode: g.mode, frame: g.frame, worldScale: g.worldScale, hitstop: g.hitstop,
          player: { x: P.pos.x, z: P.pos.z, yaw: P.yaw, hp: F.hp, weapon: F.weapon, mag: F.mag, ammo: F.ammo, st: F.st.name, f: F.st.f, items: Object.assign({}, g.items) },
          enemies: g.enemies.map(e => ({ id: e.id, kind: e.kind, state: e.brain.state, hp: e.brain.hp, resolution: e.brain.resolution, x: e.pos.x, z: e.pos.z, visible: e.root.visible, atk: e.brain.atk && e.brain.atk.name })),
          metrics: JSON.parse(JSON.stringify(Object.assign({}, g.metrics, { events: g.metrics.events.slice(-40) }))),
          nearSpot: g.nearSpot && g.nearSpot.id, flags: Object.assign({}, g.flags), opened: [...g.opened], vrm: g.vrmLoaded || [], lock: g.lock && g.lock.id,
        };
      },
      input: { script: list => g.input.runScript(list), press: (a, f = 0) => g.input.runScript([{ f, press: [a] }]), hold: (a, n) => g.input.runScript([{ f: 0, hold: { [a]: n } }]), move: (x, y, n) => g.input.runScript([{ f: 0, move: [x, y, n] }]) },
      debug: {
        teleport(x, z, yaw) { g.player.pos.set(x, 0, z); if (yaw != null) { g.player.yaw = yaw; g.cam.yaw = yaw + Math.PI; } },
        camYaw(y) { g.cam.yaw = y; }, camPitch(p) { g.cam.pitch = p; },
        faceTo(x, z) { const P = g.player; P.yaw = Math.atan2(x - P.pos.x, z - P.pos.z); g.cam.yaw = P.yaw + Math.PI; },
        /** 敵に今すぐ攻撃の予兆を始めさせる（入力列の検証用）。予兆の長さ（ステップ数）を返す */
        forceAttack(id, name) {
          const e = g.enemies.find(x => x.id === id); if (!e) return -1; const b = e.brain;
          if (b.state !== 'hostile') { b.go('hostile', []); b.lastSeen = { x: g.player.pos.x, z: g.player.pos.z }; b.lastSeenT = b.total; }
          b.atk = { name, phase: 'windup', t: 0 }; b.yaw = Math.atan2(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z);
          const A = b.def.attacks[name]; g.enemyEvents(e, [{ t: 'telegraph', name, def: A, parryable: A.parryable }]);
          let t = 0, n = 0; while (t < A.windup) { t += DT; n++; } return n;   // 攻撃判定が出るステップ（浮動小数の足し算もゲームと同じ）
        },
        placeEnemy(id, x, z) { const e = g.enemies.find(q => q.id === id); e.brain.pos.x = x; e.brain.pos.z = z; },
        hold(on) { g.simHold = !!on; },
        god(on) { g.god = !!on; },
        resetEnemy(id) { const e = g.enemies.find(q => q.id === id); const b = e.brain; b.hp = b.hpMax; b.resolution = null; b.atk = null; b.cool = 0; b.hostileBy = null; b.go('loop', []); b.sub = 'walk'; e.root.visible = true; e.root.scale.set(1, 1, 1); e.y = 0; e.fadeT = null; e.mark = null; return true; },
        freezeEnemies(on) { g.frozen = on; for (const e of g.enemies) e.brain.cool = on ? 999 : 0; },
        skipDialog() { while (g.dialog) g.dialogNext(); },
        heal() { g.player.fighter.hp = g.player.fighter.hpMax; },
        giveAmmo(n) { g.player.fighter.addAmmo(n); },
        /** 描画せずにシミュレーションだけ n ステップ進める */
        fastSim(n) { for (let i = 0; i < n; i++) g.step(); return g.frame; },
        use(id) { const s = g.level.spots.find(x => x.id === id); if (s) g.useSpot(s); return !!s; },
        quality(o) { for (const [k, v] of Object.entries(o)) g.applySetting(k, v, true); },
        perf() { return g.lastPerf || null; },
        renderInfo() { const i = g.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; },
        view(name) { return g.viewMode(name); },
      },
      save: k => g.saveSlot(k), load: k => g.loadSlot(k), store: g.store, wp: g.WP,
    };
  }
  viewMode(name) {
    // 撮影用：キャラクターの寄り
    if (name === 'char') { this.mode = 'pause'; this.ui.closeMenu(); const P = this.player; this.cam.yaw = P.yaw; this.cam.pitch = 0.05; this.cam.dist = 1.6; return true; }
    if (name === 'normal') { this.cam.dist = 4; this.mode = 'play'; return true; }
    return false;
  }
}

function mergeIn(a, b) {
  if (!a) return b; const o = Object.assign({}, b);
  for (const k of ['attack', 'dodge', 'parry', 'swap', 'reload', 'interact', 'lock', 'heal']) o[k] = a[k] || b[k];
  if (a.wantWeapon && !b.wantWeapon) o.wantWeapon = a.wantWeapon;
  return o;
}

const game = new Game();
game.init().catch(e => { console.error(e); const b = document.getElementById('sh-boot'); if (b) b.textContent = '起動できませんでした：' + e.message; });
