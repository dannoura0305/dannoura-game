// mapkit.html の本体：地図（maps/<id>/）を読んで、灰色の箱の場面を歩く（開発・試験用の入口。本編のタイトルからはつながない）。
//   mapkit.html?map=haison[&preset=ultra|high|mid|low][&perf=1][&view=first][&touch=1]
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
import { Input } from '../../shinshoku/core/input.js';

const Q = new URLSearchParams(location.search), MAP = (Q.get('map') || 'haison').replace(/[^a-z0-9_]/g, ''), $ = s => document.querySelector(s);
const boot = $('#mk-boot'), say = t => { boot.textContent = t; };
const isTouch = Q.get('touch') === '1' || (matchMedia && matchMedia('(pointer: coarse)').matches);
const presetKey = MAP_PRESETS[Q.get('preset')] ? Q.get('preset') : autoPreset({ touch: isTouch, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory });
const P = MAP_PRESETS[presetKey];

async function load() {
  const base = `maps/${MAP}/`, j = p => fetch(base + p).then(r => { if (!r.ok) throw new Error(`${base + p} が読めません（${r.status}）。node tools/mapkit/build_map.mjs maps/${MAP} で作ってください`); return r.json(); });
  say('地図を読み込み中……');
  const [spec, layout, png] = await Promise.all([j('map.spec.json'), j('build/layout.json'), fetch(base + 'build/' + 'terrain.png').then(r => { if (!r.ok) throw new Error('terrain.png が読めません'); return r.arrayBuffer(); })]);
  const hf = await heightfieldFromPNG(new Uint8Array(png), { size: layout.size, minY: layout.terrain.minY, maxY: layout.terrain.maxY });
  say('歩ける所を計算中……');
  await new Promise(r => setTimeout(r, 0));
  const world = new World(layout, hf), grid = buildWalkGrid(world);
  return { spec, layout, hf, world, grid };
}

function run({ spec, layout, hf, world, grid }) {
  const canvas = $('#mk-canvas'), S = buildScene({ layout, hf, spec, P, canvas });
  const ctl = new Controller(world, layout.start), nav = new Navigator(grid, layout); nav.setGoal(0);
  const input = new Input(canvas, {}); input.wantLock = () => !isTouch;
  let yaw = Math.atan2(nav.goal.at[0] - ctl.x, nav.goal.at[2] - ctl.z), pitch = 0.28, first = Q.get('view') === 'first', light = true, auto = false, runToggle = false;
  const touch = isTouch ? setupTouch(document.body, input, { view: () => { first = !first; }, light: () => { light = !light; }, next: () => nav.next(), run: () => { runToggle = !runToggle; } }) : null;
  addEventListener('keydown', e => { if (e.code === 'KeyV') first = !first; if (e.code === 'KeyN') nav.next(); });
  // HUD
  const hud = { goal: $('#mk-goal'), dist: $('#mk-dist'), list: $('#mk-list'), arrow: $('#mk-arrow'), perf: $('#mk-perf'), msg: $('#mk-msg'), where: $('#mk-where') };
  $('#mk-preset').innerHTML = Object.entries(MAP_PRESETS).map(([k, v]) => `<option value="${k}" ${k === presetKey ? 'selected' : ''}>${v.label}</option>`).join('');
  $('#mk-preset').onchange = e => { Q.set('preset', e.target.value); location.search = Q.toString(); };
  const listHTML = () => nav.goals.map((g, i) => `<li class="${nav.reached.has(g.id) ? 'done' : ''}${i === nav.idx && !nav.done ? ' cur' : ''}">${nav.reached.has(g.id) ? '✔' : i === nav.idx ? '▶' : '・'} ${nav.label(g)}</li>`).join('');
  let msgT = 0; const toast = t => { hud.msg.textContent = t; hud.msg.classList.add('on'); msgT = 3; };
  const resize = () => { S.renderer.setSize(innerWidth, innerHeight, false); S.camera.aspect = innerWidth / innerHeight; S.camera.updateProjectionMatrix(); };
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
  // 1 ステップ（60Hz）
  let routePts = [], routeT = 0, sim = 0;
  const step = () => {
    const s = input.sample(), dt = 1 / 60; sim++;
    let dir = [0, 0], runNow = s.run || runToggle || (touch && touch.runOn());
    if (auto && !nav.done) { dir = nav.steer(ctl.x, ctl.y, ctl.z); yaw = Math.atan2(dir[0], dir[1]); runNow = true; }
    else if (s.moveX || s.moveY) { const fx = Math.sin(yaw), fz = Math.cos(yaw); dir = [fx * s.moveY - fz * s.moveX, fz * s.moveY + fx * s.moveX]; }   // 右＝前×上＝(−cos, sin)
    if (s.light) light = !light;
    ctl.update(dt, dir, runNow);
    const g = nav.check(ctl.x, ctl.y, ctl.z);
    if (g) { toast(`着いた：${nav.label(g)}`); hud.list.innerHTML = listHTML(); if (nav.done) toast('全ての目的地に着きました'); }
  };
  // 描画のフレーム
  let last = performance.now(), acc = 0, fpsN = 0, fpsT = 0, fps = 0, info = { calls: 0, triangles: 0 };
  const frame = (now, simOnly = false) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    const lk = input.consumeLook(); yaw -= lk.x; pitch = Math.max(-0.9, Math.min(1.2, pitch + lk.y));
    let n = 0; while (acc >= 1 / 60 && n < 6) { step(); acc -= 1 / 60; n++; } if (n === 6) acc = 0;
    render(dt);
  };
  const render = (dt = 0) => {
    S.player.position.set(ctl.x, ctl.y, ctl.z); S.player.rotation.y = ctl.yaw; S.flash.visible = light; S.hand.position.copy(S.player.position); S.hand.rotation.y = yaw;
    S.flash.target.position.set(0, 0.8 - Math.sin(pitch) * 4, 6);
    routeT -= dt; if (routeT <= 0) { routePts = nav.route(ctl.x, ctl.y, ctl.z, 120).pts; routeT = 0.25; updateGuides(S, layout, nav, routePts); }
    S.sunL.position.set(ctl.x - 90, 30, ctl.z - 25); S.sunL.target.position.set(ctl.x, ctl.y, ctl.z);
    S.scene.userData.sky.position.set(ctl.x, 0, ctl.z);
    placeCamera(); S.renderer.render(S.scene, S.camera); info = { calls: S.renderer.info.render.calls, triangles: S.renderer.info.render.triangles };
    // HUD
    const r = nav.route(ctl.x, ctl.y, ctl.z, 12), tgt = r.pts.length > 4 ? r.pts[Math.min(r.pts.length - 1, 6)] : nav.goal && nav.goal.at;
    if (tgt && !nav.done) { const a = Math.atan2(tgt[0] - ctl.x, tgt[2] - ctl.z), rel = yaw - a; hud.arrow.style.transform = `rotate(${rel}rad)`; hud.arrow.style.opacity = 1; } else hud.arrow.style.opacity = 0;
    hud.goal.textContent = nav.done ? '全ての目的地に着きました' : `目的地：${nav.label(nav.goal)}`;
    hud.dist.textContent = nav.done || r.dist == null ? '' : `あと 約 ${Math.round(r.dist)}m`;
    const inB = ctl.building && layout.buildings.find(b => b.id === ctl.building && b.enterable); hud.where.textContent = inB ? `${inB.id} の中` : '';
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) hud.msg.classList.remove('on'); }
    fpsN++; fpsT += dt; if (fpsT > 0.5) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    if (Q.get('perf') === '1') hud.perf.textContent = `fps ${fps.toFixed(1)}  draw ${info.calls}  tri ${(info.triangles / 1000).toFixed(1)}k  ${presetKey}  ${innerWidth}×${innerHeight}`;
  };
  hud.list.innerHTML = listHTML();
  boot.hidden = true; $('#mk-hud').hidden = false;
  const loop = now => { frame(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  // 自動試験の窓口（tools/mapkit/play_map.mjs）
  window.__mk = {
    ready: true, preset: presetKey, layout,
    state: () => ({ pos: [ctl.x, ctl.y, ctl.z], yaw, goal: nav.goal && nav.goal.id, label: nav.label(nav.goal), reached: [...nav.reached], done: nav.done, building: ctl.building, moved: ctl.moved, sim, fps, drawCalls: info.calls, tris: info.triangles, stuck: ctl.blockedT }),
    auto(on = true) { auto = on; }, first(on) { first = on; }, fog(on) { S.setFog(on); },
    fastSim(n) { for (let i = 0; i < n; i++) { step(); if (auto && nav.done) break; } return sim; },
    walkTo(goalId, maxSteps = 60 * 240) { const i = nav.goals.findIndex(g => g.id === goalId); if (i >= 0) nav.setGoal(i); auto = true; let k = 0; while (k < maxSteps && !nav.reached.has(goalId) && ctl.blockedT < 4) { step(); k++; } auto = false; return { ok: nav.reached.has(goalId), steps: k, pos: [ctl.x, ctl.y, ctl.z], stuck: ctl.blockedT }; },
    render() { routeT = 0; render(0); return { drawCalls: info.calls, tris: info.triangles }; },
    pose(p) { camPose = p; }, hud(on) { $('#mk-hud').style.visibility = on ? '' : 'hidden'; }, look(y, p) { yaw = y; pitch = p; camPose = null; },
    ground: (x, z) => world.surfaceY(x, z),
    forestSpot() { let best = null, bn = -1; const T = layout.objects.filter(o => o.cls === 'tree'); for (const t of T) { const n = T.filter(u => Math.hypot(u.at[0] - t.at[0], u.at[2] - t.at[2]) < 14).length; if (n > bn) { bn = n; best = t; } } return { at: best.at, n: bn }; },
    teleport(x, z) { ctl.x = x; ctl.z = z; ctl.y = world.surfaceY(x, z); },
    info: () => ({ calls: info.calls, triangles: info.triangles, geometries: S.renderer.info.memory.geometries, textures: S.renderer.info.memory.textures }),
  };
}

load().then(run).catch(e => { console.error(e); say('読み込みに失敗しました：' + e.message); });
