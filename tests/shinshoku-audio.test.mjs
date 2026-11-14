// 『境界侵食』音の素材（CC0：OpenGameArt.org・Kenney）の対応表・読み込み・BGM・表記。2026-11-13（2026-11-14 CC0 の素材に切り替え）
// 対応表：音の名前は実在する（合成音のフォールバックがある）・素材はすべて CC0 を確かめたページから・置いたファイルは表と一致し大きさの上限内。
// 読み込み：起動時には読まない（遊びが始まり起動の後読みを過ぎてから）。BGM：常には鳴らさない・戦い／ボス／演出／声の扱い。表記：使った物だけ出る。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import {
  SOURCES, PACKS, LICENSE, MATERIALS, SE_MAP, STEPS, AMB_MIX, AMB_SYNTH_ROLE, PRESENCE, PRESENCE_NAMES, BGM_TRACKS, BGM_AREAS, BGM_LEVEL,
  fileOf, sourceUrl, authorOf, bgmPlan, areaLoadList, seLoadList, usedSources, usedAuthors, audioCreditText, withAudioCredits, presencePos,
} from '../shinshoku/data/sound.js';
import { SOUND_FILES } from '../shinshoku/data/sound_files.js';
import { CREDITS } from '../shinshoku/data/ch7.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const R = p => new URL('../' + p, import.meta.url);
const read = p => readFileSync(R(p), 'utf8');
const audio = read('shinshoku/core/audio.js'), main = read('shinshoku/main.js'), bank = read('shinshoku/core/soundbank.js'), bgm = read('shinshoku/core/bgm.js');
const code = ['shinshoku/main.js', ...readdirSync(R('shinshoku/game')).map(f => 'shinshoku/game/' + f), ...readdirSync(R('shinshoku/story')).map(f => 'shinshoku/story/' + f)].filter(f => f.endsWith('.js')).map(read).join('\n');
const synthNames = new Set([...audio.matchAll(/case '([a-z0-9_]+)':/g)].map(m => m[1]));

t('効果音の対応：名前はすべて合成音にもある（素材が無い・読めない時のフォールバック）', () => {
  for (const name of Object.keys(SE_MAP)) assert.ok(synthNames.has(name), '合成音の無い名前: ' + name);
  for (const name of PRESENCE_NAMES) assert.ok(synthNames.has(name), '気配の合成音が無い: ' + name);
});
t('効果音の対応：気配以外の名前はゲームのどこかで鳴らしている（使われない対応は無い）', () => {
  for (const name of Object.keys(SE_MAP)) {
    if (name.startsWith('p_')) continue;
    assert.ok(new RegExp(`'${name}'`).test(code), '鳴らしていない名前: ' + name);
  }
});
t('合成音は消していない（今までの名前がすべて残る）', () => {
  for (const name of ['swing', 'hit', 'parry', 'tel_parry', 'tel_red', 'issen', 'door', 'knock', 'heartbeat', 'kiro_voice', 'mimic_reveal', 'giant_roar', 'pa_voice', 'ui', 'ui_ok', 'ending7', 'prop_break']) assert.ok(synthNames.has(name), name);
  assert.match(audio, /buildBeds\(\)/); assert.match(audio, /siren\(\)/); assert.match(audio, /setTension\(k\)/);
});
t('素材：対応で使う物はすべて MATERIALS にあり、MATERIALS に使われない物は無い', () => {
  const used = new Set();
  for (const e of Object.values(SE_MAP)) for (const id of e.m) { assert.ok(MATERIALS[id], id); used.add(id); }
  for (const s of Object.values(STEPS)) for (const id of [s.walk, s.run]) { assert.equal(MATERIALS[id].kind, 'step', id); used.add(id); }
  for (const mix of Object.values(AMB_MIX)) for (const id of Object.keys(mix)) { assert.equal(MATERIALS[id].kind, 'amb', id); used.add(id); }
  for (const id of Object.values(BGM_TRACKS)) { assert.equal(MATERIALS[id].kind, 'bgm', id); used.add(id); }
  for (const id of Object.keys(MATERIALS)) assert.ok(used.has(id), '使われない素材: ' + id);
  for (const id of Object.keys(AMB_SYNTH_ROLE)) assert.ok(MATERIALS[id], id);
});
t('素材：出典はすべて CC0 を確かめたページ（OpenGameArt.org・Kenney）。作者・ダウンロードの記録あり。ほかのライセンス・サイトは使わない', () => {
  assert.deepEqual(Object.keys(SOURCES).sort(), ['kenney', 'oga']);
  assert.equal(LICENSE.id, 'CC0'); assert.match(LICENSE.url, /publicdomain\/zero\/1\.0/);
  for (const [k, P] of Object.entries(PACKS)) {
    assert.equal(P.license, 'CC0', k); assert.ok(SOURCES[P.site], k); assert.ok(P.author && P.title, k);
    if (P.site === 'oga') { assert.match(P.page, /^https:\/\/opengameart\.org\/content\/[a-zA-Z0-9%-]+$/, k); assert.match(P.dl, /^https:\/\/opengameart\.org\/sites\/default\/files\/\S+$/, k); }
    else { assert.match(P.page, /^https:\/\/kenney\.nl\/assets\/[a-z-]+$/, k); assert.equal(P.author, 'Kenney'); }
  }
  for (const [id, m] of Object.entries(MATERIALS)) {
    assert.ok(PACKS[m.pack], id); assert.ok(m.title && m.files.length, id);
    assert.equal(sourceUrl(id), PACKS[m.pack].page); assert.equal(authorOf(id), PACKS[m.pack].author);
  }
  const used = new Set(Object.values(MATERIALS).map(m => m.pack)); for (const k of Object.keys(PACKS)) assert.ok(used.has(k), '使わないページ: ' + k);
  assert.doesNotMatch(JSON.stringify({ PACKS, MATERIALS }), /CC-BY|OGA-BY|GPL|soundeffect-lab|maou\.audio|dova|otologic/i);
});
t('素材：ファイル名は素材のキーだけ（元のサイトの名前に依らない）', () => {
  for (const id of Object.keys(MATERIALS)) assert.match(fileOf(id), /^(se|step|amb|bgm)\/[a-z0-9_]+\.mp3$/, id);
  for (const id of Object.values(BGM_TRACKS)) assert.match(id, /^bgm_/);
});
t('予兆の区別を残す：弾ける＝高い金属（速めに）／弾けない＝低い唸り（遅めに）', () => {
  const p = SE_MAP.tel_parry, r = SE_MAP.tel_red;
  assert.match(MATERIALS[p.m[0]].title, /刀/); assert.ok(p.r[0] >= 1, '弾ける予兆は高く');
  assert.match(MATERIALS[r.m[0]].title, /唸り/); assert.ok(r.r[1] < 1, '弾けない予兆は低く');
});
t('驚かしは要所だけ：不協和音・迫り来る恐怖は 1 つの名前ずつ（模倣する影の正体・ボスの起き上がり）', () => {
  const scare = Object.entries(SE_MAP).filter(([, e]) => e.m.some(id => /dissonance|approach/.test(id))).map(([k]) => k).sort();
  assert.deepEqual(scare, ['boss_rise', 'mimic_reveal']);
  assert.ok(!Object.values(MATERIALS).some(m => /悲鳴|scream|human_|female|male|cough|laugh|voice/i.test(m.files.join(' ') + m.title)), '人の声素材（悲鳴・台詞）は使わない');
});
t('置いたファイルの表：表と実物が一致・出典あり・大きさの上限内（効果音 120KB・足音 150KB・環境音 400KB・曲 1.6MB・合計 16MB）', () => {
  const dir = R('shinshoku/assets/sound/'); let total = 0;
  const lim = { se: 120e3, step: 150e3, amb: 400e3, bgm: 1.6e6 };
  for (const [rel, e] of Object.entries(SOUND_FILES)) {
    assert.ok(MATERIALS[e.id], rel); assert.equal(fileOf(e.id), rel);
    const f = new URL(rel, dir); assert.ok(existsSync(f), '無いファイル: ' + rel);
    const sz = statSync(f).size; assert.equal(sz, e.bytes, '大きさが表と違う: ' + rel); assert.ok(sz <= lim[MATERIALS[e.id].kind], '大きすぎる: ' + rel + ' ' + sz);
    if (MATERIALS[e.id].kind === 'step') assert.ok(e.slices && e.slices.length >= 2, '足音の切り出しが無い: ' + rel);
    total += sz;
  }
  assert.ok(total <= 16 * 1048576, '合計 ' + total);
  if (existsSync(dir)) for (const kd of readdirSync(dir)) for (const f of readdirSync(new URL(kd + '/', dir))) assert.ok(SOUND_FILES[kd + '/' + f], '表に無いファイル（読まれない）: ' + kd + '/' + f);
});
t('記録：docs/shinshoku/AUDIO_CREDITS.md に素材すべての出典（確かめたページ）・作者・CC0', () => {
  const doc = read('docs/shinshoku/AUDIO_CREDITS.md');
  for (const id of Object.keys(MATERIALS)) { assert.ok(doc.includes('| ' + id + ' |'), id); assert.ok(doc.includes(sourceUrl(id)), id); assert.ok(doc.includes(authorOf(id)), id); }
  for (const P of Object.values(PACKS)) if (P.dl) assert.ok(doc.includes(P.dl), P.dl);
  for (const s of ['CC0', 'OpenGameArt.org', 'Kenney', 'ホラー', '人の声', '効果音ラボ', '魔王魂']) assert.ok(doc.includes(s), s);
});
t('置いた音の大きさ・長さが揃っている（効果音は短く・環境音と曲は平均の大きさを揃える）', () => {
  const lim = { se: [-32, -14, 8], step: [-31, -18, 12], amb: [-32, -28.5, 41], bgm: [-23.5, -20.5, 211] };
  for (const [rel, e] of Object.entries(SOUND_FILES)) {
    const [lo, hi, maxDur] = lim[MATERIALS[e.id].kind];
    assert.ok(e.lu >= lo && e.lu <= hi, '大きさが外れ: ' + rel + ' ' + e.lu); assert.ok(e.pk <= 0.5, '割れ: ' + rel + ' ' + e.pk); assert.ok(e.dur <= maxDur, '長い: ' + rel + ' ' + e.dur);
  }
});
t('表記：使った物だけ出る（無ければスタッフロールもタイトルもそのまま）・CC0 でも作者名を載せる', () => {
  assert.equal(audioCreditText({}), ''); assert.equal(withAudioCredits(CREDITS.lines, {}), CREDITS.lines);
  const fake = { 'bgm/bgm_emptycity.mp3': { id: 'bgm_emptycity' }, 'se/se_heart.mp3': { id: 'se_heart' }, 'se/se_blow1.mp3': { id: 'se_blow1' } };
  assert.deepEqual(usedSources(fake), ['kenney', 'oga']);
  assert.deepEqual(usedAuthors(fake), { bgm: ['yd'], se: ['Kenney', 'bart'] });
  assert.match(audioCreditText(fake), /OpenGameArt\.org/); assert.match(audioCreditText(fake), /Kenney/); assert.match(audioCreditText(fake), /CC0/);
  const L = withAudioCredits(CREDITS.lines, fake), i = L.findIndex(l => l[1] === '音楽・効果音（CC0 の素材）'), j = L.findIndex(l => l[1] === '使わせてもらったもの');
  assert.ok(i > 0 && j > i, '「使わせてもらったもの」の前に入る'); assert.ok(L.some(l => /opengameart\.org/.test(l[1]) && /kenney\.nl/.test(l[1])), 'サイトの URL');
  assert.ok(L.some(l => l[1] === 'yd') && L.some(l => l[1] === 'Kenney・bart'), '作者名');
  // 今置いている物の作者がすべてスタッフロールに出る（行は長すぎない）
  const now = withAudioCredits(CREDITS.lines, SOUND_FILES), text = now.map(l => l[1]).join('\n');
  for (const e of Object.values(SOUND_FILES)) assert.ok(text.includes(authorOf(e.id)), authorOf(e.id));
  assert.ok(now.length - CREDITS.lines.length <= 16, '音の段は 16 行まで');
  assert.match(read('shinshoku.html'), /VOICEVOX:ずんだもん（設定で切れます）<span id="tt-audio-credit" hidden><\/span>/);
  assert.match(main, /audioCreditText\(SOUND_FILES\)/);
  assert.match(read('shinshoku/game/ch7.js'), /withAudioCredits\(CREDITS\.lines, SOUND_FILES\)/);
});
t('読み込み：起動時には読まない（open されるまで頼まれた物を覚えるだけ・open は遊びが始まり起動の後読みを過ぎてから）', () => {
  assert.match(bank, /_pump\(\) \{\s*if \(!this\.opened\) return;/);
  assert.equal((bank.match(/fetch\(/g) || []).length, 1, 'fetch は _pump の 1 か所だけ');
  assert.match(main, /if \(!this\.sound\.opened && this\.mode !== 'title' && this\.bootMs && this\.bootMs\.lateAt\) this\.sound\.open\(\);/);
  assert.equal((main.match(/sound\.open\(\)/g) || []).length, 1);
  assert.doesNotMatch(audio, /fetch\(/); assert.doesNotMatch(bgm, /fetch\(/);
  assert.doesNotMatch(read('sw.js'), /assets\/sound/, 'sw.js はこの作業では触らない（音の素材を先読みに入れない）');
});
t('読み込み：区画に入った時はその区画の環境音・気配・曲だけ（置いてある物だけ）。効果音・足音は別に少しずつ', () => {
  assert.deepEqual(areaLoadList('alley', ['alley'], {}), []);
  const all = Object.fromEntries(Object.keys(MATERIALS).map(id => [fileOf(id), { id }]));
  const a = areaLoadList('alley', ['alley'], all);
  for (const id of Object.keys(AMB_MIX.alley)) assert.ok(a.includes(id), id);
  assert.ok(a.includes(BGM_TRACKS.alley)); assert.ok(!a.includes(BGM_TRACKS.battle)); assert.ok(!a.some(id => MATERIALS[id].kind === 'step'));
  assert.ok(areaLoadList('epilogue', ['epi_day'], all).includes(BGM_TRACKS.ending));
  assert.ok(areaLoadList('yard', ['yard'], all).includes(BGM_TRACKS.giant));
  const se = seLoadList(all); assert.ok(se.includes('step_wet') && se.includes('se_katana_hold')); assert.ok(!se.some(id => MATERIALS[id].kind === 'bgm' || MATERIALS[id].kind === 'amb'));
  assert.deepEqual(seLoadList({}), []);
});
t('BGM：区画すべてに設定があり、家・記録の間・結末・序章のふだんの町は探索の曲を鳴らさない', () => {
  for (const id of Object.keys(AREA_GRAPH)) assert.ok(BGM_AREAS[id], id);
  for (const A of Object.values(BGM_AREAS)) { for (const r of ['explore', 'boss', 'credits', 'normal']) if (A[r]) assert.ok(BGM_TRACKS[A[r]], r); if (A.explore) { assert.ok(A.wait >= 10); assert.ok(A.rest[0] >= 60, '休みを長く'); } }
  const base = { cut: false, cur: null, explorePhase: 'play', voice: false };
  assert.equal(bgmPlan({ ...base, area: 'shotengai', normal: true }).track, null);
  assert.equal(bgmPlan({ ...base, area: 'shotengai', normal: false }).track, 'ruin');
  assert.equal(bgmPlan({ ...base, area: 'kiroku' }).track, null);
  assert.equal(bgmPlan({ ...base, area: 'epilogue' }).track, null);
  assert.equal(bgmPlan({ ...base, area: 'alley', explorePhase: 'wait' }).track, null, '入ってすぐは鳴らさない');
  assert.equal(bgmPlan({ ...base, area: 'alley', explorePhase: 'rest' }).track, null, '一度流したら休む');
});
t('BGM：戦い・ボス・演出・声・スタッフロール', () => {
  const base = { area: 'hospital', cut: false, cur: null, explorePhase: 'play', voice: false };
  assert.equal(bgmPlan({ ...base, battle: true }).role, 'battle');
  assert.equal(bgmPlan({ ...base, boss: true, battle: true }).track, 'boss');
  assert.equal(bgmPlan({ ...base, area: 'yard', boss: true }).track, 'giant');
  assert.equal(bgmPlan({ ...base, cut: true, cur: 'battle', battle: true }).track, null, '戦いが演出に入ったら引く');
  assert.equal(bgmPlan({ ...base, cut: true, cur: null }).track, null, '演出中に新しく始めない');
  const ex = bgmPlan({ ...base }), exCut = bgmPlan({ ...base, cut: true, cur: 'explore' }), exVoice = bgmPlan({ ...base, cut: true, cur: 'explore', voice: true });
  assert.ok(ex.level > exCut.level && exCut.level > exVoice.level, '演出・声で下げる');
  assert.ok(ex.level < bgmPlan({ ...base, battle: true }).level, '探索は戦いより小さい');
  assert.equal(bgmPlan({ ...base, credits: true }).track, 'ending');
  assert.ok(BGM_LEVEL.explore <= 0.5);
});
t('BGM：出口は全体の音量の後ろ（dip・silence・muffle が掛かる）・声の出口とは別・設定の BGM 音量（既定 50%）', () => {
  assert.match(bgm, /this\.out\.connect\(s\.master\)/);
  assert.doesNotMatch(bgm, /voiceBus/);
  assert.match(main, /bgmVol: 0\.5/); assert.match(main, /if \(k === 'bgmVol'\) this\.music\.setVolume\(v\);/);
  assert.match(read('shinshoku/ui/ui.js'), /data-s="bgmVol"/);
});
t('気配：聞き手の後ろ寄り 9〜22m・家／結末／ふだんの町／巨大戦の区画では鳴らさない・戦いと演出の間も鳴らさない', () => {
  for (let i = 0; i < 200; i++) {
    const L = { x: 3, z: -4, yaw: Math.random() * 6.28 }, p = presencePos(L, Math.random(), Math.random());
    const d = Math.hypot(p.x - L.x, p.z - L.z); assert.ok(d >= 8.99 && d <= 22.01, d);
    const fwd = { x: -Math.sin(L.yaw), z: -Math.cos(L.yaw) }; assert.ok(((p.x - L.x) * fwd.x + (p.z - L.z) * fwd.z) / d < 0.36, '前の方に出た');
  }
  for (const k of ['home', 'street_normal', 'epi_day', 'epi_dusk', 'epi_home', 'yard', 'abyss']) assert.ok(!PRESENCE[k], k);
  for (const P of Object.values(PRESENCE)) { assert.ok(P.every[0] >= 20, '連発しない'); for (const nm of P.pool) assert.ok(PRESENCE_NAMES.includes(nm), nm); }
  assert.match(audio, /if \(PR && !this\.quiet && this\.tension < 0\.15\)/);
  assert.match(main, /this\.sfx\.quiet = !!this\.cut\.active;/);
});
t('距離と左右の振り（今の仕組み）は残す：素材の音も位置のある時は _spatial の出口へ', () => {
  assert.match(audio, /_spatial\(pos, ref = 3, max = 40\)/);
  assert.match(audio, /gn\.connect\(this\.out \|\| this\.master\)/);
  assert.match(audio, /const m = this\.bank && this\.bank\.se\(name\);/);
});

t('繰り返す音（環境音・曲）：端の無音を外し、終わりに頭を溶かして継ぎ目で切れない・環境音と繰り返す曲は区間を付けて鳴らす', async () => {});
{
  const { edgeTrim, loopFade } = await import('../shinshoku/core/soundbank.js');
  const fake = (arr, sr = 1000) => { const d = Float32Array.from(arr); return { sampleRate: sr, numberOfChannels: 1, duration: arr.length / sr, getChannelData: () => d }; };
  const sig = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 3) * 0.3 + 0.01);
  assert.deepEqual(edgeTrim(fake(sig)), [0, 1], '無音が無ければそのまま');
  const L = edgeTrim(fake([...Array(30).fill(0), ...sig, ...Array(20).fill(0)]));
  assert.equal(L[0], 0.03); assert.equal(L[1], 1.03);
  assert.ok(edgeTrim(fake([...Array(400).fill(0), ...sig]))[0] <= 0.08, '削るのは各端 0.08 秒まで');
  { // 継ぎ目を溶かす：頭と終わりがずれた信号でも、区間の終わり → 区間の始めが続く
    const sr = 1000, x = Array.from({ length: 2000 }, (_, i) => Math.sin(i * 0.05)), B = fake(x.slice(0, 1937), sr), R = loopFade(B, [0, 1.937]);
    const d = B.getChannelData(0), s0 = Math.round(R[0] * sr), e1 = Math.round(R[1] * sr) - 1;
    assert.equal(R[0], 0.08); assert.ok(Math.abs(d[e1] - d[s0 - 1]) < 1e-6, '終わり＝始めの 1 つ前'); assert.ok(Math.abs(d[s0] - d[e1]) < 0.06, '継ぎ目の段差が小さい ' + Math.abs(d[s0] - d[e1]));
  }
  assert.match(audio, /src\.loop = true; this\.bank\.setLoop\(src, id\);/);
  assert.match(bgm, /if \(src\.loop\) this\.bank\.setLoop\(src, id\);/);
  for (const [id, m] of Object.entries(MATERIALS)) if (m.kind === 'bgm') assert.equal(!!m.loop, ['battle', 'boss', 'giant', 'ending'].some(r => BGM_TRACKS[r] === id), '繰り返す曲の印: ' + id);
}
console.log(`shinshoku-audio: ${n} tests passed`);
