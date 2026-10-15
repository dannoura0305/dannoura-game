// 『境界侵食』フェーズ3：序章〜第2章の流れ・区画のつながり・調べ物の仕掛け・演出場面・画質の段・骨の対応・歩きの位相
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEPS, TARGETS, CHAPTERS, atLeast, streetState, weaponsAt, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH, AREA_DATA, ROSTER } from '../shinshoku/data/areas.js';
import * as PZ from '../shinshoku/story/puzzles.js';
import { SAFE, codeFromClue } from '../shinshoku/data/safe.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { camAt, lineAt, eventsBetween, duration, fixedLines, CutscenePlayer } from '../shinshoku/story/cutscene.js';
import { autoPreset, applyPreset, PRESETS } from '../shinshoku/render/quality.js';
import { matchBones, JOINT_NAMES } from '../shinshoku/actor/bones.js';
import { phaseRate, footfall, strideAmp, locomotion } from '../shinshoku/actor/anim.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));

t('段：序章→第1章→第2章→第3章の順。章の名前・目標の文がある', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.ch))], ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5a', 'ch6a', 'ch5b']);   // フェーズ6：分岐の後の章（第5章A・第6章A の冒頭・第5章B）
  for (const s of STEPS) { assert.ok(CHAPTERS[s.ch]); assert.ok(s.obj.length > 3); assert.ok(AREA_GRAPH[s.area], s.id); }
  assert.equal(atLeast('ch1_street', 'ch1_katana'), true); assert.equal(atLeast('pro_meet', 'ch1_katana'), false);
  assert.equal(streetState('pro_tv'), 'normal'); assert.equal(streetState('ch1_katana'), 'outbreak');
  assert.deepEqual(weaponsAt('pro_meet'), []); assert.deepEqual(weaponsAt('pro_fight'), ['pipe']); assert.ok(weaponsAt('ch2_boss').includes('katana'));
  assert.equal(weaponsAt('ch2_boss').includes('handgun'), false, '拳銃は金庫（任意）');
});
t('区画のつながり：どの段の区画にも商店街から行ける・戻れる', () => {
  const r = reachable(AREA_GRAPH, 'shotengai');
  for (const s of STEPS) assert.ok(r.has(s.area), s.id);
  for (const a of Object.keys(AREA_GRAPH)) assert.ok(reachable(AREA_GRAPH, a).has('shotengai'), a);
});
t('目標の印：段ごとに場所か敵（ミニマップ）', () => {
  for (const s of STEPS) { const T = TARGETS[s.id]; assert.ok(s.id in TARGETS, s.id); if (Array.isArray(T)) assert.ok(AREA_GRAPH[T[0]]); else if (T) assert.match(T, /^enemy:/); }
});
t('名簿の食い違い【必須】：42 人・6 班×7 人・未着は各班 1 人（計 6）・受付票 36 枚', () => {
  const P = PZ.rosterPeople(); assert.equal(P.length, 42); assert.equal(ROSTER.provisional, true);
  for (const g of ROSTER.groups) { assert.equal(P.filter(p => p.group === g).length, 7); assert.equal(P.filter(p => p.group === g && p.missing).length, 1); assert.equal(PZ.cardsOf(g).length, 6); }
  assert.equal(PZ.missingCount(), 6); assert.equal(PZ.drawerAnswer(), 6);
  for (const g of ROSTER.groups) for (const c of PZ.cardsOf(g)) assert.equal(PZ.checkPick(g, c), false);
  let st = { done: {}, miss: 0 }; st = PZ.pickRoster(st, 'A', '青木 ハル'); assert.equal(st.miss, 1);
  for (const p of PZ.missingPeople()) st = PZ.pickRoster(st, p.group, p.name);
  assert.equal(st.complete, true);
});
t('収容者の名前：F 班の未着（42 番）。名札の切れ端「No.4?」とも合う。マイクの候補は照合後 6 人', () => {
  const b = PZ.rosterPeople().find(p => p.name === PZ.bossName()); assert.equal(b.group, 'F'); assert.equal(b.missing, true);
  assert.ok(PZ.tornTagCandidates(4).includes(PZ.bossNo())); assert.deepEqual(PZ.tornTagCandidates(4), [40, 41, 42]);
  assert.equal(PZ.micOptions(true).length, 6); assert.ok(PZ.micOptions(true).includes(PZ.bossName())); assert.equal(PZ.micOptions(false).length, 42);
  // 未着の 5 人は商店街の帰路の表札と同じ名字
  const doors = ['笹木', '松尾', '川原', '野中', '石田'];
  for (const d of doors) assert.ok(PZ.missingPeople().some(p => p.name.startsWith(d)), d);
});
t('名前は他作品の人物と重ねない（九条・シン・佐伯・御堂・如月）', () => {
  const all = PZ.rosterPeople().map(p => p.name).join(' ') + JSON.stringify(AREA_DATA) + JSON.stringify(events);
  for (const ng of ['九条', '佐伯', '御堂', '如月', 'シン ']) assert.equal(all.includes(ng), false, ng);
});
t('防犯映像【任意】：あり得ない記録は 1 台だけ。その時刻の数字が金庫の番号（手掛かりはどれでも同じ番号）', () => {
  const C = PZ.cctvCams(); assert.equal(C.filter(c => !c.ok).length, 1); assert.equal(PZ.checkCctv(PZ.cctvAnswer()), true); assert.equal(PZ.checkCctv('cam1'), false);
  const bad = C.find(c => !c.ok); assert.ok(bad.stamp.includes(SAFE.code.slice(0, 2) + ':' + SAFE.code.slice(2, 4)));
  for (const c of SAFE.clues) assert.equal(codeFromClue(c), SAFE.code);
  assert.equal(PZ.cctvCams('7391').find(c => !c.ok).stamp.includes('73:91'), true);
});
t('演出場面：カメラの補間・切り替え・字幕・出来事の区間・長さ', () => {
  const K = [{ t: 0, pos: [0, 0, 0], look: [0, 0, -1], fov: 40 }, { t: 2, pos: [2, 0, 0], look: [0, 0, -1], fov: 60 }, { t: 3, pos: [9, 9, 9], look: [0, 0, 0], fov: 30, cut: true }];
  assert.deepEqual(camAt(K, 1).pos, [1, 0, 0]); assert.equal(camAt(K, 1).fov, 50); assert.deepEqual(camAt(K, 2.5).pos, [2, 0, 0]); assert.deepEqual(camAt(K, 5).pos, [9, 9, 9]);
  const L = [{ t: 1, text: 'a', dur: 1 }, { t: 3, text: 'b' }]; assert.equal(lineAt(L, 0.5), null); assert.equal(lineAt(L, 1.5).text, 'a'); assert.equal(lineAt(L, 2.5), null);
  assert.equal(eventsBetween([{ t: 1 }, { t: 2 }], 0, 1).length, 1); assert.equal(duration({ cam: K, lines: L }), 3 + 2.6);
});
t('演出場面のデータ：区画・段・話し手が正しい。原文（fixed）の台詞は第3章のだんのうらと第4章の相棒の 2 つだけ', () => {
  const stepIds = new Set(STEPS.map(s => s.id));
  for (const cs of Object.values(CUTSCENES)) {
    assert.ok(AREA_GRAPH[cs.area], cs.id); assert.ok(duration(cs) > 3);
    for (const e of cs.events || []) if (e.do === 'setStep') assert.ok(stepIds.has(e.arg), e.arg);
    for (const l of cs.lines || []) assert.ok(events.speakers[l.who], l.who);
  }
  const F = fixedLines(CUTSCENES); assert.equal(F.length, 2); assert.equal(F[0].who, 'dan'); assert.equal(F[0].id, 'cs03_line'); assert.equal(F[1].who, 'companion'); assert.equal(F[1].id, 'cs04_line');
  const texts = JSON.stringify(CUTSCENES) + JSON.stringify(events);
  assert.equal(texts.split('見た目だけで決めつけちゃ駄目').length - 1, 2, '原文は第3章のだんのうら 1 回と、第4章で相棒が返す 1 回だけ（3 回目は無い）');
});
t('演出場面の再生：飛ばしても出来事は 1 回ずつ全部起きる・字幕と黒い帯は消える', () => {
  const log = []; const host = { setCam() {}, subtitle: (w, x) => log.push(['sub', x]), letterbox: on => log.push(['lb', on]), event: (d, a) => log.push(['ev', d, a]), actor() {}, sound() {}, done: () => log.push(['done']) };
  const P = new CutscenePlayer(host); P.play(CUTSCENES.cs01_broadcast);
  for (let i = 0; i < 30; i++) P.update(1 / 60, {});
  for (let i = 0; i < 70; i++) P.update(1 / 60, { skipHeld: true });
  assert.equal(P.active, false);
  const evs = log.filter(x => x[0] === 'ev'); assert.equal(evs.length, CUTSCENES.cs01_broadcast.events.length);
  assert.deepEqual(log[log.length - 1], ['done']); assert.ok(log.some(x => x[0] === 'lb' && x[1] === false)); assert.ok(log.some(x => x[0] === 'sub' && x[1] == null));
});
t('台詞のデータ：話し手・吠え声・調べた時の文がそろう（台詞は仮）', () => {
  for (const ev of Object.values(events.events)) for (const l of ev) assert.ok(events.speakers[l.who], l.who);
  for (const b of Object.values(events.barks)) assert.ok(events.speakers[b.who], b.who);
  for (const k of ['roster', 'cards', 'torn_tag', 'gym_locked', 'safe_prologue', 'rack_take', 'car']) assert.ok(events.texts[k], k);
  assert.equal(events.speakers.companion.provisional, true);
});
t('画質の段：スマホの小さい横画面は「低」・PC は「高」・段の値を流し込む', () => {
  assert.equal(autoPreset({ touch: true, w: 844, h: 390 }), 'low'); assert.equal(autoPreset({ touch: true, w: 1180, h: 820 }), 'mid'); assert.equal(autoPreset({ touch: false, w: 1920, h: 1080, cores: 8 }), 'high');
  const s = applyPreset({ volume: 0.5 }, 'low'); assert.equal(s.shadows, false); assert.equal(s.volume, 0.5); assert.equal(s.preset, 'low');
  assert.ok(PRESETS.low.lights <= 4 && PRESETS.low.resScale < 0.7);
});
t('骨の対応（glTF）：Mixamo・Blender 風の名前・表での上書き', () => {
  const mix = ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2', 'mixamorig:Neck', 'mixamorig:Head', 'mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand', 'mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand', 'mixamorig:LeftUpLeg', 'mixamorig:LeftLeg', 'mixamorig:LeftFoot', 'mixamorig:RightUpLeg', 'mixamorig:RightLeg', 'mixamorig:RightFoot'];
  const m = matchBones(mix); assert.equal(Object.keys(m).length, JOINT_NAMES.length); assert.equal(m.chest, 'mixamorig:Spine2'); assert.equal(m.leftLowerArm, 'mixamorig:LeftForeArm');
  const bl = matchBones(['pelvis', 'spine.001', 'spine.003', 'neck', 'head', 'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R', 'hand.R', 'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R']);
  assert.equal(bl.leftUpperArm, 'upper_arm.L'); assert.equal(bl.rightLowerLeg, 'shin.R'); assert.equal(bl.hips, 'pelvis');
  assert.equal(matchBones(['Root', 'MyHip'], { hips: 'MyHip' }).hips, 'MyHip');
});
t('歩き：足が滑らない位相（速いほど 1m あたりの位相は少ない）・足音は左右交互', () => {
  assert.ok(phaseRate(2.2) > phaseRate(5)); assert.ok(strideAmp(5) > strideAmp(2.2));
  const steps = []; let ph = 0; for (let i = 0; i < 400; i++) { const nx = ph + 0.05; const f = footfall(ph, nx); if (f) steps.push(f); ph = nx; }
  assert.ok(steps.length > 4); for (let i = 1; i < steps.length; i++) assert.notEqual(steps[i], steps[i - 1]);
  const p = locomotion(Math.PI / 2, 2.2); assert.ok(p.leftUpperLeg[0] < 0, '左足が前');
});
console.log(`shinshoku-p3-story: ${n} ok`);
