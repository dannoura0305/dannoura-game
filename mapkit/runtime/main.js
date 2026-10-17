// mapkit.html の本体：地図（maps/<id>/）を読んで歩く（開発・試験用の入口。本編のタイトルからはつながない）。
// フェーズ 3：写実寄りの描画（素材ライブラリの材質・部品。無ければフェーズ 2 の灰色の箱）。読み込みの進み具合を出す。
// フェーズ 4：ゲームとして探索できる：戸・門の開け閉め（E／タッチの「開」）・敵（異形）の巡回と追跡・チェックポイント・一時停止の画面・WebAudio の音。
//   mapkit.html?map=haison[&preset=ultra|high|mid|low][&perf=1][&view=first][&touch=1][&enemy=0|1][&audio=0|1][&sun=<度>]
// 読む物：maps/<id>/map.spec.json・build/layout.json・build/terrain.png（tools/mapkit/build_map.mjs が作る）。
import * as THREE from 'three';
import { heightfieldFromPNG } from '../terrain/heightmap.js';
import { World } from '../core/world.js';
import { buildWalkGrid } from '../nav/grid.js';
import { pointInObb } from '../core/geom.js';
import { MAP_PRESETS, autoPreset } from '../render/quality.js';
import { Controller } from './controller.js';
import { Navigator } from './nav.js';
import { buildScene, updateGuides } from './scene.js';
import { setupTouch } from './touch.js';
import { MapAudio } from './audio.js';
import { DoorSet, DOOR_KINDS, applyOpenPose } from '../game/doors.js';
import { Enemy, footstepNoise, ENEMY_DEFAULTS } from '../game/enemy.js';
import { Checkpoints } from '../game/checkpoints.js';
import { surfaceIndex, surfaceAt } from '../game/surface.js';
import { Input } from '../../shinshoku/core/input.js';

const Q = new URLSearchParams(location.search), MAP = (Q.get('map') || 'haison').replace(/[^a-z0-9_]/g, ''), $ = s => document.querySelector(s);
const boot = $('#mk-boot'), say = t => { boot.textContent = t; };
const isTouch = Q.get('touch') === '1' || (matchMedia && matchMedia('(pointer: coarse)').matches);
const presetKey = MAP_PRESETS[Q.get('preset')] ? Q.get('preset') : autoPreset({ touch: isTouch, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory });
const P = Object.assign({}, MAP_PRESETS[presetKey]);
// 調べる用の上書き（開発）：&post=0・&shadows=0・&msaa=0・&grass=0・&sun=<度>・&macro=0・&shafts=0・&cards=0
if (Q.get('post') === '0') P.post = null;
if (Q.get('shadows') === '0') P.shadows = false;
if (Q.get('msaa') === '0') P.antialias = false;
if (Q.get('grass') === '0') P.grass = 0;
if (Q.get('sun') && isFinite(+Q.get('sun'))) P.sunDeg = Math.max(2, Math.min(60, +Q.get('sun')));
if (Q.get('macro') === '0') P.macro = false;
if (Q.get('shafts') === '0') P.shafts = false;
if (Q.get('cards') === '0') { P.cardDup = 0; P.foliageTrans = false; }
if (Q.get('fill') === '0') P.interiorFill = false;
if (Q.get('tex') === 'ktx2') P.ktx2 = true;          // KTX2（Basis）のテクスチャを使う（あれば）。既定は WebP（docs/wakaba-mapkit/11 §6）
if (Q.get('mesh') === 'raw') P.meshopt = false;      // Meshopt で縮めた glb（.mo.glb）を使わない
const ENEMY_ON = Q.get('enemy') !== '0';

async function load() {
  const base = `maps/${MAP}/`, j = p => fetch(base + p).then(r => { if (!r.ok) throw new Error(`${base + p} が読めません（${r.status}）。node tools/mapkit/build_map.mjs maps/${MAP} で作ってください`); return r.json(); });
  say('地図を読み込み中……');
  const [spec, layout, png] = await Promise.all([j('map.spec.json'), j('build/layout.json'), fetch(base + 'build/' + 'terrain.png').then(r => { if (!r.ok) throw new Error('terrain.png が読めません'); return r.arrayBuffer(); })]);
  const hf = await heightfieldFromPNG(new Uint8Array(png), { size: layout.size, minY: layout.terrain.minY, maxY: layout.terrain.maxY });
  say('歩ける所を計算中……');
  await new Promise(r => setTimeout(r, 0));
  const GP = layout.gameplay || { doors: [], checkpoints: [], enemies: [] };
  // 歩ける格子は「全部の戸が開いた形」で作る（検査 validate.js と同じ）。そのあと戸の今の状態（閉じた戸）を当たりに入れる
  const world = new World(layout, hf); applyOpenPose(world, GP.doors);
  const grid = buildWalkGrid(world);
  return { spec, layout, hf, world, grid, GP };
}

async function run({ spec, layout, hf, world, grid, GP }) {
  const canvas = $('#mk-canvas');
  const doors = new DoorSet(GP.doors, world);
  const S = await buildScene({ layout, hf, spec, P, canvas, doors, enemy: ENEMY_ON && GP.enemies.length > 0, onProgress: (d, n, msg) => say(msg || `素材を読み込み中…… ${d}/${n}`) });
  const ctl = new Controller(world, layout.start), nav = new Navigator(grid, layout); nav.setGoal(0);
  const enemy = ENEMY_ON && GP.enemies.length ? new Enemy(GP.enemies[0], { world, grid, doors }, layout.seed) : null;
  const cps = new Checkpoints(GP.checkpoints), surf = surfaceIndex(layout);
  const audio = new MapAudio({ enabled: Q.get('audio') !== '0' });
  const input = new Input(canvas, {}); input.wantLock = () => !isTouch && !paused;
  let yaw = Math.atan2(nav.goal.at[0] - ctl.x, nav.goal.at[2] - ctl.z), pitch = 0.28, first = Q.get('view') === 'first', light = true, auto = false, runToggle = false;
  let paused = false, catchT = 0, caughtN = 0, spottedN = 0, stepAcc = 0, wantInteract = false;
  const fade = $('#mk-fade'), prompt = $('#mk-prompt');
  const touch = isTouch ? setupTouch(document.body, input, { view: () => { first = !first; }, light: () => { light = !light; }, next: () => nav.next(), run: () => { runToggle = !runToggle; }, use: () => { wantInteract = true; }, pause: () => setPaused(!paused) }) : null;
  addEventListener('keydown', e => { if (e.code === 'KeyV') first = !first; if (e.code === 'KeyN') nav.next(); if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && !document.pointerLockElement) setPaused(!paused); });
  // 音は最初の操作の後に（ブラウザの決まり）
  const startAudio = () => { audio.start(); removeEventListener('pointerdown', startAudio); removeEventListener('keydown', startAudio); removeEventListener('touchstart', startAudio); };
  addEventListener('pointerdown', startAudio); addEventListener('keydown', startAudio); addEventListener('touchstart', startAudio);
  // HUD
  const hud = { goal: $('#mk-goal'), dist: $('#mk-dist'), list: $('#mk-list'), arrow: $('#mk-arrow'), perf: $('#mk-perf'), msg: $('#mk-msg'), where: $('#mk-where'), threat: $('#mk-threat') };
  const presetOpts = Object.entries(MAP_PRESETS).map(([k, v]) => `<option value="${k}" ${k === presetKey ? 'selected' : ''}>${v.label}</option>`).join('');
  $('#mk-preset').innerHTML = presetOpts; $('#mk-pause-preset').innerHTML = presetOpts;
  const reloadWith = (k, v) => { Q.set(k, v); location.search = Q.toString(); };
  $('#mk-preset').onchange = e => reloadWith('preset', e.target.value);
  $('#mk-pause-preset').onchange = e => reloadWith('preset', e.target.value);
  $('#mk-pause-sun').value = Q.get('sun') || ''; $('#mk-pause-sun').onchange = e => { if (e.target.value) reloadWith('sun', e.target.value); else { Q.delete('sun'); location.search = Q.toString(); } };
  $('#mk-pause-enemy').checked = ENEMY_ON; $('#mk-pause-enemy').onchange = e => reloadWith('enemy', e.target.checked ? '1' : '0');
  $('#mk-pause-audio').checked = Q.get('audio') !== '0'; $('#mk-pause-audio').onchange = e => { audio.setEnabled(e.target.checked); if (e.target.checked) audio.start(); };
  $('#mk-resume').onclick = () => setPaused(false);
  $('#mk-respawn').onclick = () => { setPaused(false); respawn(false); };
  $('#mk-restart').onclick = () => { setPaused(false); restart(); };
  function setPaused(on) {
    paused = on; $('#mk-pause').hidden = !on;
    if (on && document.pointerLockElement) document.exitPointerLock();
    if (!on) { last = performance.now(); acc = 0; }
  }
  input.onUnlock = () => { if (!paused && !window.__mk_noPauseOnUnlock) setPaused(true); };
  const listHTML = () => nav.goals.map((g, i) => `<li class="${nav.reached.has(g.id) ? 'done' : ''}${i === nav.idx && !nav.done ? ' cur' : ''}">${nav.reached.has(g.id) ? '✔' : i === nav.idx ? '▶' : '・'} ${nav.label(g)}</li>`).join('');
  let msgT = 0; const toast = (t, sec = 3) => { hud.msg.textContent = t; hud.msg.classList.add('on'); msgT = sec; };
  const resize = () => S.setSize(innerWidth, innerHeight);
  addEventListener('resize', resize); resize();
  // カメラ（三人称は当たりの手前で止める・家の中は天井の下）
  const insideSolid = (x, y, z) => {
    if (y < hf.at(x, z) + 0.25) return true;
    for (const c of world._near(world.cBins, world.colliders, x, z, 0.3)) if (y > c.minY - 0.1 && y < c.maxY + 0.1 && (c.kind === 'cyl' ? Math.hypot(x - c.x, z - c.z) < c.r + 0.2 : pointInObb(x, z, c.obb, 0.2))) return true;
    return false;
  };
  let camPose = null;
  const placeCamera = () => {
    if (camPose) { S.camera.position.set(...camPose.pos); S.camera.lookAt(...camPose.look); return; }
    const head = new THREE.Vector3(ctl.x, ctl.y + 1.55, ctl.z), f = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    S.player.visible = !first;
    if (first) { S.camera.position.copy(head); S.camera.lookAt(head.clone().add(f)); return; }
    const inB = ctl.building ? layout.buildings.find(b => b.id === ctl.building) : null, maxD = inB ? 2.4 : 4.6;
    let d = 0.4; while (d < maxD) { const p = head.clone().addScaledVector(f, -(d + 0.25)); if (insideSolid(p.x, p.y, p.z)) break; d += 0.25; }
    const cp = head.clone().addScaledVector(f, -d); if (inB && inB.rooms.length) cp.y = Math.min(cp.y, inB.rooms[0].ceilY - 0.25);
    S.camera.position.copy(cp); S.camera.lookAt(head.clone().addScaledVector(f, 2));
  };
  // 今いる部屋（家の中の明かり）
  const roomAt = (x, z) => { const b = ctl.building && layout.buildings.find(q => q.id === ctl.building); if (!b) return null; let best = null, bd = Infinity; for (const r of b.rooms) { const d = Math.hypot(r.center[0] - x, r.center[2] - z); if (d < bd) { bd = d; best = r; } } return best; };
  // ── 戸（近くの戸を開け閉め）
  const bodies = () => [{ x: ctl.x, z: ctl.z, r: ctl.r }, ...(enemy ? [{ x: enemy.ctl.x, z: enemy.ctl.z, r: 0.32 }] : [])];
  const noises = [];
  const interact = () => {
    const n = doors.near(ctl.x, ctl.y, ctl.z, 1.7); if (!n) return null;
    const r = doors.toggle(n.door.id, 'player', bodies());
    if (!r.ok) toast(r.reason === 'blocked' ? '挟まるので閉められない' : r.reason === 'locked' ? '開かない' : '……');
    return Object.assign({ id: n.door.id }, r);
  };
  // ── 捕まった → 暗くなってチェックポイントへ
  const respawn = (caught = true) => {
    const at = cps.respawnAt() || layout.start;
    ctl.x = at[0]; ctl.z = at[2]; ctl.y = world.surfaceY(at[0], at[2]); ctl.vy = 0; ctl.blockedT = 0;
    if (enemy) enemy.stun(caught ? 5 : 2, [ctl.x, ctl.y, ctl.z]);
    routeT = 0; if (caught) toast(`${cps.last ? cps.last.ja : 'スタート'}から やり直し`);
  };
  const restart = () => {
    nav.reached.clear(); nav.setGoal(0); nav.fieldFor = -1; nav._field(); cps.reset(); doors.reset();
    ctl.x = layout.start[0]; ctl.z = layout.start[2]; ctl.y = world.surfaceY(ctl.x, ctl.z); if (enemy) enemy.reset();
    hud.list.innerHTML = listHTML(); routeT = 0; toast('最初から');
  };
  // 1 ステップ（60Hz）
  let routePts = [], routeT = 0, sim = 0;
  const step = () => {
    const s = input.sample(), dt = 1 / 60; sim++;
    // 一時停止は keydown（上）・ポインタの固定が外れた時（onUnlock）・タッチの「‖」で切り替える（描画が遅い時もすぐ効くように step を待たない）
    if (paused) return;
    if (catchT > 0) {   // 捕まった演出（1.6 秒：暗くなる → 戻す → 明るくなる）
      catchT -= dt; if (catchT <= 0.8 && catchT + dt > 0.8) respawn(true);
      fade.style.opacity = catchT > 0.8 ? String(Math.min(1, (1.6 - catchT) / 0.5)) : String(Math.max(0, catchT / 0.8));
      ctl.update(dt, [0, 0], false); return;
    }
    let dir = [0, 0], runNow = s.run || runToggle || (touch && touch.runOn());
    if (flee) { dir = flee.steer(ctl.x, ctl.y, ctl.z); yaw = Math.atan2(dir[0], dir[1]); runNow = true; }
    else if (auto && !nav.done) {
      dir = nav.steer(ctl.x, ctl.y, ctl.z); yaw = Math.atan2(dir[0], dir[1]); runNow = autoRun;
      // 自動で歩く時：前の閉じた戸は開ける（開くまで待つ）
      const d = doors.closedOnSegment([ctl.x, ctl.z], [ctl.x + dir[0] * 1.3, ctl.z + dir[1] * 1.3]);
      if (d) { if (d.target === 0) { doors.setTarget(d.id, 1, 'player', bodies()); autoOpened.push(d.id); } dir = [0, 0]; }
    } else if (s.moveX || s.moveY) { const fx = Math.sin(yaw), fz = Math.cos(yaw); dir = [fx * s.moveY - fz * s.moveX, fz * s.moveY + fx * s.moveX]; }   // 右＝前×上＝(−cos, sin)
    if (s.light) light = !light;
    if (s.interact || wantInteract) { wantInteract = false; interact(); }
    const x0 = ctl.x, z0 = ctl.z;
    ctl.update(dt, dir, runNow);
    const mv = Math.hypot(ctl.x - x0, ctl.z - z0), moving = mv > 0.004;
    // 戸
    for (const e of doors.update(dt, bodies())) if (e.type === 'start') { audio.door(e.kind, e.target === 1); noises.push({ x: e.at[0], y: e.at[1], z: e.at[2], r: (enemy ? enemy.cfg.hear.door : ENEMY_DEFAULTS.hear.door) * (DOOR_KINDS[e.kind].noise / 10), kind: 'door', by: e.by }); }
    // 足音（音・敵の耳）
    stepAcc += mv; if (stepAcc > (runNow ? 0.95 : 0.72)) { stepAcc = 0; audio.step(surfaceAt(world, surf, ctl.x, ctl.z), runNow); }
    const pl = { x: ctl.x, y: ctl.y, z: ctl.z, yaw, light, running: runNow && moving, moving, inside: !!ctl.building };
    const fn = footstepNoise(stepState, pl, dt, enemy ? enemy.cfg.hear : ENEMY_DEFAULTS.hear); if (fn) noises.push(fn);
    // 敵
    if (enemy) {
      const ev = enemy.update(dt, pl, noises.filter(n => n.by !== 'enemy'));
      for (const e of ev) {
        if (e.type === 'spotted') { spottedN++; toast('見つかった！ 走って逃げろ（Shift）', 2.5); audio.sting(); }
        if (e.type === 'lost') toast('見失ったようだ……', 2);
        if (e.type === 'caught') { caughtN++; catchT = 1.6; audio.caught(); }
      }
    }
    noises.length = 0;
    const g = nav.check(ctl.x, ctl.y, ctl.z);
    if (g) { toast(`着いた：${nav.label(g)}`); hud.list.innerHTML = listHTML(); if (nav.done) toast('全ての目的地に着きました'); }
    const cp = cps.check(ctl.x, ctl.y, ctl.z); if (cp) toast(`チェックポイント：${cp.ja}`, 2);
  };
  const stepState = {}, autoOpened = []; let autoRun = true, flee = null;
  // 描画のフレーム
  let last = performance.now(), acc = 0, fpsN = 0, fpsT = 0, fps = 0, info = { calls: 0, triangles: 0 };
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    const lk = input.consumeLook(); if (!paused) { yaw -= lk.x; pitch = Math.max(-0.9, Math.min(1.2, pitch + lk.y)); }
    let n = 0; while (acc >= 1 / 60 && n < 6) { step(); acc -= 1 / 60; n++; } if (n === 6) acc = 0;
    render(paused ? 0 : dt);
  };
  const render = (dt = 0) => {
    S.player.position.set(ctl.x, ctl.y, ctl.z); S.player.rotation.y = ctl.yaw; S.flash.visible = light; S.hand.position.copy(S.player.position); S.hand.rotation.y = yaw;
    S.flash.target.position.set(0, 0.8 - Math.sin(pitch) * 4, 6);
    routeT -= dt; if (routeT <= 0) { routePts = nav.route(ctl.x, ctl.y, ctl.z, 120).pts; routeT = 0.25; updateGuides(S, layout, nav, routePts); }
    S.sunFollow(ctl.x, ctl.y, ctl.z);
    S.setInterior(roomAt(ctl.x, ctl.z), dt);
    if (S.enemyMesh && enemy) S.enemyMesh.update(dt, enemy);
    placeCamera(); info = S.draw(dt);
    // HUD
    const r = nav.route(ctl.x, ctl.y, ctl.z, 12), tgt = r.pts.length > 4 ? r.pts[Math.min(r.pts.length - 1, 6)] : nav.goal && nav.goal.at;
    if (tgt && !nav.done) { const a = Math.atan2(tgt[0] - ctl.x, tgt[2] - ctl.z), rel = yaw - a; hud.arrow.style.transform = `rotate(${rel}rad)`; hud.arrow.style.opacity = 1; } else hud.arrow.style.opacity = 0;
    hud.goal.textContent = nav.done ? '全ての目的地に着きました' : `目的地：${nav.label(nav.goal)}`;
    hud.dist.textContent = nav.done || r.dist == null ? '' : `あと 約 ${Math.round(r.dist)}m`;
    const inB = ctl.building && layout.buildings.find(b => b.id === ctl.building && b.enterable); hud.where.textContent = inB ? `${inB.id} の中` : '';
    const nd = !paused && catchT <= 0 ? doors.near(ctl.x, ctl.y, ctl.z, 1.7) : null;
    prompt.hidden = !nd; if (nd) prompt.textContent = `${isTouch ? '「開」' : 'E'}：${DOOR_KINDS[nd.door.kind].ja}を${nd.door.target > 0.5 ? '閉める' : '開ける'}`;
    if (touch) touch.setUse(!!nd);
    const ed = enemy ? Math.hypot(enemy.ctl.x - ctl.x, enemy.ctl.z - ctl.z) : null;
    hud.threat.className = enemy && enemy.state === 'chase' ? 'chase' : enemy && (enemy.state === 'investigate' || enemy.state === 'search') && ed < 30 ? 'warn' : '';
    audio.update(dt, { inside: !!ctl.building, enemyDist: ed, chase: enemy && enemy.state === 'chase', paused });
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) hud.msg.classList.remove('on'); }
    fpsN++; fpsT += dt; if (fpsT > 0.5) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    if (Q.get('perf') === '1') hud.perf.textContent = `fps ${fps.toFixed(1)}  draw ${info.calls}  tri ${(info.triangles / 1000).toFixed(1)}k  tex ${S.texMB()}MB  ${presetKey}  ${innerWidth}×${innerHeight}${enemy ? '  敵 ' + enemy.state : ''}`;
  };
  hud.list.innerHTML = listHTML();
  boot.hidden = true; $('#mk-hud').hidden = false;
  const bootMs = Math.round(performance.now());
  const loop = now => { frame(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  // 自動試験の窓口（tools/mapkit/play_map.mjs）
  window.__mk = {
    ready: true, preset: presetKey, layout, _S: S, enemyOn: !!enemy,
    state: () => ({ pos: [ctl.x, ctl.y, ctl.z], yaw, goal: nav.goal && nav.goal.id, label: nav.label(nav.goal), reached: [...nav.reached], done: nav.done, building: ctl.building, moved: ctl.moved, sim, fps, drawCalls: info.calls, tris: info.triangles, stuck: ctl.blockedT, paused, caught: caughtN, spotted: spottedN, checkpoint: cps.last && cps.last.id, catching: catchT > 0, enemy: enemy ? { state: enemy.state, pos: enemy.pos, alert: enemy.alert, sees: enemy.sees } : null, doors: doors.list.map(d => ({ id: d.id, open: d.open, target: d.target })), prompt: prompt.hidden ? null : prompt.textContent }),
    auto(on = true) { auto = on; }, first(on) { first = on; }, fog(on) { S.setFog(on); },
    fastSim(n) { for (let i = 0; i < n; i++) { step(); if (auto && nav.done) break; } return sim; },
    walkTo(goalId, maxSteps = 60 * 240, opt = {}) {
      const i = nav.goals.findIndex(g => g.id === goalId); if (i >= 0) nav.setGoal(i); auto = true; autoRun = opt.run !== false; autoOpened.length = 0; let k = 0, evaded = 0;
      const evade = opt.evade !== false && !!enemy, lightWas = light; if (evade) light = false; ctl.blockedT = 0;   // 敵がいる時の自動の歩き：灯りを消し、追われたら離れる（試験用の「人」）
      while (k < maxSteps && !nav.reached.has(goalId) && ctl.blockedT < 4 && !(opt.stopOnCaught && catchT > 0)) {
        if (evade && catchT <= 0 && enemy.state === 'chase') {
          // 逃げる先：チェックポイント・目的地・スタートのうち、敵と反対の側で敵から一番遠い所（どれも格子で届く所）
          const ax = ctl.x - enemy.ctl.x, az = ctl.z - enemy.ctl.z, cands = [...GP.checkpoints.map(c => c.at), ...layout.goals.map(g => g.at), layout.start];
          let best = layout.start, bs = -Infinity;
          for (const c of cands) { const dx = c[0] - ctl.x, dz = c[2] - ctl.z, d = Math.hypot(dx, dz); if (d < 6) continue; const away = (dx * ax + dz * az) / (d * (Math.hypot(ax, az) || 1)); const sc = Math.hypot(c[0] - enemy.ctl.x, c[2] - enemy.ctl.z) + away * 25 - d * 0.2; if (sc > bs) { bs = sc; best = c; } }
          flee = new Navigator(grid, { goals: [{ id: 'flee', at: best }], buildings: layout.buildings }); flee.setGoal(0); auto = false; evaded++; ctl.blockedT = 0;
          for (let j = 0; j < 60 * 10 && enemy.state === 'chase' && catchT <= 0 && ctl.blockedT < 1.5; j++) { step(); k++; if (Math.hypot(ctl.x - best[0], ctl.z - best[2]) < 2) break; }
          flee = null; auto = true; ctl.blockedT = 0;
          // 隠れて待つ：敵が巡回に戻るか 25m より遠くなるまで（最大 25 秒）
          for (let j = 0; j < 60 * 25 && catchT <= 0 && enemy.state !== 'chase' && !(enemy.state === 'patrol' || Math.hypot(enemy.ctl.x - ctl.x, enemy.ctl.z - ctl.z) > 25); j++) { const a = auto; auto = false; step(); auto = a; k++; }
        }
        step(); k++;
      }
      auto = false; autoRun = true; light = lightWas; return { ok: nav.reached.has(goalId), steps: k, pos: [ctl.x, ctl.y, ctl.z], stuck: ctl.blockedT, opened: autoOpened.slice(), caught: caughtN, evaded };
    },
    /** 手で歩く（向き [dx,dz]・n ステップ・走る） */
    move(dx, dz, n = 60, runIt = false) { const L = Math.hypot(dx, dz) || 1; yaw = Math.atan2(dx, dz); const x0 = ctl.x, z0 = ctl.z; for (let i = 0; i < n; i++) { input.held.add('up'); if (runIt) input.held.add('run'); step(); } input.held.delete('up'); input.held.delete('run'); void L; return { moved: Math.hypot(ctl.x - x0, ctl.z - z0), pos: [ctl.x, ctl.y, ctl.z], building: ctl.building }; },
    /** 走って (x,z) へ（格子の道・試験：追われて逃げる）。n ステップ */
    fleeTo(x, z, n = 600) {
      flee = new Navigator(grid, { goals: [{ id: 'flee', at: [x, world.surfaceY(x, z), z] }], buildings: layout.buildings }); flee.setGoal(0);
      const log = []; for (let i = 0; i < n; i++) { step(); if (i % 30 === 0 && enemy) log.push([enemy.state, Math.round(Math.hypot(enemy.ctl.x - ctl.x, enemy.ctl.z - ctl.z) * 10) / 10]); if (Math.hypot(ctl.x - x, ctl.z - z) < 1.5) break; }
      flee = null; return { pos: [ctl.x, ctl.y, ctl.z], log, caught: caughtN };
    },
    interact() { const r = interact(); for (let i = 0; i < 50; i++) step(); return r; },
    door(id, open) { const r = doors.setTarget(id, open ? 1 : 0, 'script', bodies()); for (let i = 0; i < 50; i++) step(); return r; },
    nearDoor: () => { const n = doors.near(ctl.x, ctl.y, ctl.z, 1.7); return n && { id: n.door.id, dist: n.dist }; },
    pause(on) { setPaused(on); return paused; }, pausedUI: () => !$('#mk-pause').hidden,
    respawn: () => respawn(true), restart, checkpoints: () => ({ last: cps.last && cps.last.id, reached: [...cps.reached] }),
    /** 敵を (x,z) に置いて、プレイヤーの方を向かせる（試験） */
    enemyAt(x, z, faceP = true) { if (!enemy) return null; enemy.reset([x, world.surfaceY(x, z), z]); if (faceP) enemy.yaw = Math.atan2(ctl.x - x, ctl.z - z); return enemy.digest(); },
    enemyState: () => enemy && { state: enemy.state, pos: enemy.pos, alert: enemy.alert, dist: Math.hypot(enemy.ctl.x - ctl.x, enemy.ctl.z - ctl.z) },
    audio: () => audio.stats(), startAudio: () => { audio.start(); return audio.stats(); },
    render() { routeT = 0; render(0); return { drawCalls: info.calls, tris: info.triangles, sceneCalls: info.sceneCalls }; },
    pose(p) { camPose = p; }, hud(on) { $('#mk-hud').style.visibility = on ? '' : 'hidden'; }, look(y, p) { yaw = y; pitch = p; camPose = null; },
    light(on) { light = on; },
    ground: (x, z) => world.surfaceY(x, z),
    forestSpot() { let best = null, bn = -1; const T = layout.objects.filter(o => o.cls === 'tree'); for (const t of T) { const n = T.filter(u => Math.hypot(u.at[0] - t.at[0], u.at[2] - t.at[2]) < 14).length; if (n > bn) { bn = n; best = t; } } return { at: best.at, n: bn }; },
    teleport(x, z) { ctl.x = x; ctl.z = z; ctl.y = world.surfaceY(x, z); },
    info: () => ({ calls: info.calls, sceneCalls: info.sceneCalls, triangles: info.triangles, geometries: S.renderer.info.memory.geometries, textures: S.renderer.info.memory.textures, texMB: S.texMB(), bootMs, timing: S.timing, programs: S.renderer.info.programs ? S.renderer.info.programs.length : null, assets: { textures: S.bank.stats.textures, glbBytes: S.bank.stats.glbBytes, kits: S.bank.stats.kits, failed: S.bank.stats.failed, ktx2: S.bank.stats.ktx2 || 0, meshopt: S.bank.stats.meshopt || 0 }, grass: S.cover.count || null, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }),
    time(t) { S.draw(t); },
  };
}

load().then(run).catch(e => { console.error(e); say('読み込みに失敗しました：' + e.message); });
