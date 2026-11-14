// トビネズミの音（2026-11-14 見直し）：素材の表・出典（CC0 だけ）・置いたファイル・大きさ・選曲の決まり・環境音の層・後読み・合成音のフォールバック。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import {
  LICENSE, SOURCES, PACKS, MATERIALS, SE_MAP, AMB_LAYERS, SFX_TARGET, VARY, BGM_PLAN, BGM_LEVEL,
  fileOf, sourceUrl, authorOf, ambMix, bgmPick, loadListFor, seLoadList, usedAuthors, audioCreditText,
} from '../tobinezumi/client/sound-data.js';
import { SOUND_FILES } from '../tobinezumi/client/sound-files.js';
import { SYNTH_LU } from '../tobinezumi/client/sfx-levels.js';
import { SFX_NAMES, synthGain, fileGain } from '../tobinezumi/client/sfx.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const R = p => new URL('../' + p, import.meta.url);
const read = p => readFileSync(R(p), 'utf8');
console.log('tobinezumi-audio');

t('出典：すべて OpenGameArt.org の CC0 だけのページ。作者・ページ・ダウンロードの記録あり。ほかのライセンスは使わない', () => {
  assert.deepEqual(Object.keys(SOURCES), ['oga']);
  assert.equal(LICENSE.id, 'CC0'); assert.match(LICENSE.url, /publicdomain\/zero\/1\.0/);
  for (const [k, P] of Object.entries(PACKS)) {
    assert.equal(P.license, 'CC0', k); assert.ok(P.author && P.title, k);
    assert.match(P.page, /^https:\/\/opengameart\.org\/content\/[a-z0-9-]+$/, k);
    for (const d of P.dl) assert.match(d, /^https:\/\/opengameart\.org\/sites\/default\/files\/\S+$/, k);
  }
  assert.doesNotMatch(JSON.stringify(PACKS), /CC-BY|OGA-BY|GPL/i);
  const used = new Set(Object.values(MATERIALS).map(m => m.pack));
  for (const k of Object.keys(PACKS)) assert.ok(used.has(k), '使わないページ: ' + k);
});
t('素材：表の物はすべてパックがあり、ファイル名は素材のキーだけ', () => {
  for (const [id, m] of Object.entries(MATERIALS)) {
    assert.ok(PACKS[m.pack], id); assert.ok(['se', 'amb', 'bgm'].includes(m.kind), id);
    assert.match(fileOf(id), /^(se|amb|bgm)\/[a-z0-9_]+\.mp3$/, id);
    assert.equal(sourceUrl(id), PACKS[m.pack].page); assert.equal(authorOf(id), PACKS[m.pack].author);
  }
});
t('置いたファイル：表と一致・すべて実在・大きさの記録どおり・合計は 6MB 以下', () => {
  const dir = R('tobinezumi/assets/sound/');
  const onDisk = readdirSync(dir, { recursive: true }).filter(f => String(f).endsWith('.mp3')).map(f => String(f).replace(/\\/g, '/')).sort();
  assert.deepEqual(onDisk, Object.keys(SOUND_FILES).sort());
  let total = 0;
  for (const [f, e] of Object.entries(SOUND_FILES)) {
    assert.equal(fileOf(e.id), f); assert.ok(MATERIALS[e.id], f);
    const p = R('tobinezumi/assets/sound/' + f); assert.ok(existsSync(p), f); assert.equal(statSync(p).size, e.bytes, f);
    total += e.bytes;
  }
  assert.ok(total <= 6 * 1048576, '合計 ' + total);
});
t('大きさ：曲は平均 -22、環境音は平均 -30（±1）。効果音は頭打ちしていない', () => {
  for (const e of Object.values(SOUND_FILES)) {
    const k = MATERIALS[e.id].kind;
    if (k === 'bgm') assert.ok(Math.abs(e.lu + 22) <= 1, e.id + ' ' + e.lu);
    if (k === 'amb') assert.ok(Math.abs(e.lu + 30) <= 1, e.id + ' ' + e.lu);
    assert.ok(e.pk <= -1, e.id + ' の最大値 ' + e.pk);
  }
});
t('効果音：合成音は消していない（今までの名前がすべて残る）・素材のある名前も合成音がある（フォールバック）', () => {
  for (const name of ['pick', 'rare', 'eat', 'drink', 'dig', 'jump', 'land', 'open', 'place', 'remove', 'burrow', 'out', 'pet', 'birth', 'travel', 'alert', 'owl', 'fox', 'hiss', 'caught', 'safe', 'fest', 'plug', 'dive', 'star', 'train'])
    assert.ok(SFX_NAMES.includes(name), name);
  for (const name of Object.keys(SE_MAP)) assert.ok(SFX_NAMES.includes(name), name);
  for (const e of Object.values(SE_MAP)) for (const id of e.m) assert.equal(MATERIALS[id].kind, 'se', id);
});
t('効果音の大きさ：すべての音に目標があり、合成音は測った値から目標に合う（倍率の上限内）・素材も目標に合わせる', () => {
  for (const name of SFX_NAMES) {
    assert.ok(SFX_TARGET[name] != null, '目標が無い: ' + name);
    assert.ok(SYNTH_LU[name] != null, '測っていない: ' + name);
    const after = SYNTH_LU[name] + 20 * Math.log10(synthGain(name));
    assert.ok(Math.abs(after - SFX_TARGET[name]) <= 1.5, `${name}: ${after.toFixed(1)} → 目標 ${SFX_TARGET[name]}`);
  }
  // 目標の幅：ふだんの音は小さく、知らせ・危険は少し大きく。それでも差は 12dB 以内（疲れない）
  const v = Object.values(SFX_TARGET); assert.ok(Math.max(...v) - Math.min(...v) <= 12);
  assert.ok(SFX_TARGET.pick < SFX_TARGET.rare && SFX_TARGET.land < SFX_TARGET.alert && SFX_TARGET.open <= SFX_TARGET.pick);
  for (const [name, e] of Object.entries(SE_MAP)) for (const id of e.m) {
    const info = SOUND_FILES[fileOf(id)]; if (!info) continue;
    const g = fileGain(name, info), after = info.lu + 20 * Math.log10(g);
    assert.ok(after <= SFX_TARGET[name] + 0.01, `${id}: ${after.toFixed(1)}`);
    assert.ok(info.pk + 20 * Math.log10(g) <= -1 + 1e-9, id + ' 頭打ち');
  }
  for (const [k, v] of Object.entries(VARY)) { assert.ok(SFX_NAMES.includes(k), k); assert.ok(v > 0 && v <= 0.08, k); }
});
t('合成音の音色：四角波・のこぎり波を使わない（柔らかい音に）', () => {
  const src = read('tobinezumi/client/sfx.js');
  assert.doesNotMatch(src, /'square'|'sawtooth'/);
  assert.doesNotMatch(read('tobinezumi/client/ambient.js'), /'sawtooth'|'square'/);
});
t('合成の虫の声：大きさ 0 なら鳴らない（揺らしを大きさの段に直接足さない。前は 4200Hz がいつも鳴り続けていた）', () => {
  const src = read('tobinezumi/client/ambient.js');
  assert.doesNotMatch(src, /amg\.connect\(ig\.gain\)/);
  assert.match(src, /amg\.connect\(trem\.gain\); o\.connect\(trem\); trem\.connect\(ig\)/);
});
t('選曲：タイトル・巣・土地・時間帯・季節・天気・行事で変わる。富山と砂嵐は流さない', () => {
  assert.equal(bgmPick({ scene: 'title' }), 'bgm_home');
  assert.equal(bgmPick({ scene: 'nest', region: 'toyama' }), 'bgm_nest');
  assert.equal(bgmPick({ scene: 'other' }), null);
  assert.equal(bgmPick({ scene: 'field', region: 'toyama', period: 'day' }), null);
  assert.equal(bgmPick({ scene: 'field', region: 'toyama', period: 'night', fest: { phase: 'during', id: 'tsuki' } }), null);
  assert.equal(bgmPick({ scene: 'field', weather: 'sandstorm', region: 'dunes' }), null);
  assert.equal(bgmPick({ scene: 'field', region: 'dunes', period: 'day', season: 'summer' }), 'bgm_sand');
  assert.equal(bgmPick({ scene: 'field', region: 'canyon', period: 'day' }), 'bgm_canyon');
  assert.equal(bgmPick({ scene: 'field', region: 'rocks', period: 'day' }), 'bgm_days');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'night' }), 'bgm_night');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'day', weather: 'rain' }), 'bgm_night');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'day', season: 'winter' }), 'bgm_snow');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'dawn' }), 'bgm_meadow');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'day', fest: { phase: 'during', id: 'hana' } }), 'bgm_fest');
  assert.equal(bgmPick({ scene: 'field', region: 'plains', period: 'night', fest: { phase: 'during', id: 'hoshi' } }), 'bgm_night');
  assert.notEqual(bgmPick({ scene: 'field', n: 0 }), bgmPick({ scene: 'field', n: 1 }));   // はじまりの原の昼は交互
  // 出てくる曲はすべて表にあり、置いてある
  const all = new Set();
  for (const scene of ['title', 'field', 'nest']) for (const region of ['plains', 'rocks', 'dunes', 'canyon', 'toyama']) for (const period of ['dawn', 'day', 'dusk', 'night'])
    for (const season of ['spring', 'summer', 'autumn', 'winter']) for (const weather of ['clear', 'rain', 'snow', 'sandstorm']) for (const n of [0, 1]) {
      const id = bgmPick({ scene, region, period, season, weather, n }); if (id) all.add(id);
    }
  for (const id of all) { assert.equal(MATERIALS[id].kind, 'bgm', id); assert.ok(SOUND_FILES[fileOf(id)], id); }
  for (const [id, m] of Object.entries(MATERIALS)) if (m.kind === 'bgm' && id !== 'bgm_fest') assert.ok(all.has(id), '使われない曲: ' + id);
});
t('曲の流し方：野原では休みをはさむ・狙われている間は下げる・ふだんの大きさは控えめ', () => {
  assert.ok(BGM_PLAN.rest[0] >= 60 && BGM_PLAN.rest[1] > BGM_PLAN.rest[0]);
  assert.ok(BGM_PLAN.maxPlay <= 180);
  assert.ok(BGM_PLAN.duck > 0 && BGM_PLAN.duck < 0.5);
  assert.ok(BGM_LEVEL <= 0.6);
  const mu = read('tobinezumi/client/music.js');
  assert.match(mu, /c\.threat \? BGM_PLAN\.duck/);
});
t('環境音：土地・昼夜・季節・天気で空気が変わる（鳥は明け方、虫は夏の夜、砂嵐は風、巣の中は小さく）', () => {
  const day = ambMix({ region: 'plains', period: 'day', season: 'spring' }), dawn = ambMix({ region: 'plains', period: 'dawn', season: 'spring' });
  const night = ambMix({ region: 'plains', period: 'night', season: 'summer' }), winterNight = ambMix({ region: 'plains', period: 'night', season: 'winter' });
  assert.ok(dawn.birds > day.birds && day.birds > 0); assert.equal(night.birds, 0);
  assert.ok(night.insects > 0.9 && winterNight.insects === 0 && day.insects === 0);
  assert.ok(ambMix({ region: 'dunes', period: 'day' }).birds < day.birds);
  assert.ok(ambMix({ region: 'dunes' }).wind > ambMix({ region: 'plains' }).wind && ambMix({ region: 'toyama' }).wind < ambMix({ region: 'plains' }).wind);
  const storm = ambMix({ region: 'dunes', weather: 'sandstorm', k: 1 }); assert.ok(storm.wind >= 0.7 && storm.windTone > 450 && storm.birds < 0.1);
  assert.ok(ambMix({ weather: 'rain', k: 1 }).rain > 0.3 && ambMix({}).rain === 0);
  assert.ok(ambMix({ period: 'night', season: 'summer', weather: 'rain' }).insects === 0);
  const nest = ambMix({ region: 'plains', period: 'night', season: 'summer', inNest: true }); assert.ok(nest.insects < night.insects && nest.wind < night.wind);
  assert.ok(ambMix({ season: 'winter' }).windTone < ambMix({ season: 'summer' }).windTone);
  for (const role of Object.values(AMB_LAYERS)) assert.ok(role in day, role);
  for (const id of Object.keys(AMB_LAYERS)) assert.equal(MATERIALS[id].kind, 'amb', id);
});
t('後読み：起動時には読まない（最初の操作のあと少し待ってから open）・場面に要る物だけ・効果音は野原か巣に入ってから', () => {
  const main = read('tobinezumi/client/main.js'), bank = read('tobinezumi/client/soundbank.js');
  assert.match(main, /setTimeout\(\(\) => game\.sound\.open\(\), 1500\)/);
  assert.match(main, /addEventListener\('pointerdown', arm/);
  assert.doesNotMatch(main.split('async function boot')[1], /sound\.(open|want|enter)/);
  assert.match(bank, /if \(!this\.opened\) return;/);
  assert.deepEqual(loadListFor({ scene: 'title' }), ['bgm_home']);
  const l = loadListFor({ scene: 'field', region: 'plains', period: 'night', season: 'summer', weather: 'clear' }, SOUND_FILES);
  assert.ok(l.includes('bgm_night') && l.includes('amb_crickets') && !l.includes('amb_birds') && !l.includes('amb_rain'));
  assert.ok(seLoadList(SOUND_FILES).length >= 6);
  // sw.js の先読み（shell）には入れていない
  assert.doesNotMatch(read('sw.js'), /assets\/sound/);
  assert.doesNotMatch(read('tobinezumi.html'), /assets\/sound|\.mp3/);
});
t('設定：効果音（ふつう／小さく／鳴らさない）・環境音・音楽の大きさに従う', () => {
  const main = read('tobinezumi/client/main.js');
  assert.match(main, /class="sound"><option value="on">ふつう<\/option><option value="low">小さく<\/option><option value="off">鳴らさない/);
  assert.match(main, /class="music"><option value="0">鳴らさない/);
  assert.match(main, /game\.music\.setVolume\(s\.music\)/);
  assert.match(main, /setSfx\(s\.sound, SFX_VOL\[s\.sfxVol\]\)/);
  for (const f of ['sfx.js', 'ambient.js', 'music.js']) assert.match(read('tobinezumi/client/' + f), /setBusVolume\(/);
});
t('表記：作者の一覧（置いた物だけ）をメニューに出す。富山・本編の名前は音の表記に出さない', () => {
  const a = usedAuthors(SOUND_FILES); assert.ok(a.length >= 5 && a.includes('SubspaceAudio（Juhani Junkala）'));
  const txt = audioCreditText(SOUND_FILES); assert.match(txt, /OpenGameArt\.org・CC0/);
  assert.equal(audioCreditText({}), '');
  assert.match(read('tobinezumi/client/main.js'), /tb-audio-credit/);
  const all = read('tobinezumi/client/sound-data.js') + read('tobinezumi/client/music.js') + read('tobinezumi/client/ambient.js');
  assert.doesNotMatch(all, /だんのうら|壇ノ浦|立山|黒部|ほたるいか|ホタルイカ|チンドン/);
  const credits = read('tobinezumi/docs/AUDIO_CREDITS.md');
  for (const [k, P] of Object.entries(PACKS)) { assert.ok(credits.includes(P.page), k + ' のページが記録に無い'); assert.ok(credits.includes(P.author), k + ' の作者'); }
});

// ── 曲の流し方を、作り物の AudioContext と時計で動かして確かめる ──
{
  let now = 0;   // 秒
  const param = v => ({ value: v, setValueAtTime() {}, linearRampToValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime(x) { this.value = x; }, setTargetAtTime(x) { this.value = x; }, cancelScheduledValues() {} });
  const node = o => Object.assign({ connect() {}, disconnect() {} }, o);
  class FakeCtx {
    constructor() { this.state = 'running'; this.destination = node({}); this.sampleRate = 44100; }
    get currentTime() { return now; }
    createGain() { return node({ gain: param(1) }); }
    createDynamicsCompressor() { return node({ threshold: param(0), knee: param(0), ratio: param(1), attack: param(0), release: param(0) }); }
    createBufferSource() { const s = node({ playbackRate: param(1), loop: false, start(t) { s.started = t; }, stop(t) { s.stopped = t; } }); FakeCtx.srcs.push(s); return s; }
    resume() { return Promise.resolve(); }
  }
  FakeCtx.srcs = [];
  globalThis.AudioContext = FakeCtx;
  const realNow = performance.now.bind(performance);
  performance.now = () => now * 1000;
  const core = await import('../tobinezumi/client/audio-core.js');
  core.unlockAudio();
  const { Music } = await import('../tobinezumi/client/music.js');
  const asked = [];
  const bank = { loaded: new Set(), has(id) { return this.loaded.has(id); }, want(ids) { asked.push(...ids); }, buf(id) { return { duration: id === 'bgm_meadow' ? 150 : 64 }; }, setLoop() {} };
  const mu = new Music(0.5); mu.setBank(bank);
  const run = (sec, c) => { for (let i = 0; i < sec * 10; i++) { now += 0.1; mu.update(0.1, c); } };
  const day = { scene: 'field', region: 'plains', period: 'day', season: 'spring', weather: 'clear', threat: false };
  t('曲（動かして）：野原に入ってすぐは鳴らさず、読めていなければ頼んで待つ', () => {
    run(5, day); assert.equal(mu.cur, null);
    run(12, day); assert.ok(asked.includes('bgm_days'), asked.join()); assert.equal(mu.cur, null);
  });
  t('曲（動かして）：読めたら流し、2 分ほどで終えて休む（ずっと鳴り続けない）', () => {
    bank.loaded.add('bgm_days'); bank.loaded.add('bgm_meadow'); bank.loaded.add('bgm_nest'); bank.loaded.add('bgm_home'); bank.loaded.add('bgm_night');
    run(2, day); assert.equal(mu.cur && mu.cur.id, 'bgm_days');
    run(130, day); assert.equal(mu.cur, null, '終わっていない'); assert.equal(mu.debug.state, 'rest');
    run(50, day); assert.equal(mu.cur, null, '休みが短い');
    run(130, day); assert.equal(mu.cur && mu.cur.id, 'bgm_meadow');   // 次は交互
  });
  t('曲（動かして）：狙われている間は下げ、終われば戻す', () => {
    run(1, { ...day, threat: true }); assert.equal(mu.cur.duck.gain.value, BGM_PLAN.duck);
    run(1, day); assert.equal(mu.cur.duck.gain.value, 1);
  });
  t('曲（動かして）：富山に入るとフェードで止め、巣に入ると子守歌、タイトルは続けて流す', () => {
    run(1, { ...day, region: 'toyama' }); assert.equal(mu.cur, null);
    run(60, { ...day, region: 'toyama' }); assert.equal(mu.cur, null, '富山で流れた');
    run(8, { ...day, scene: 'nest' }); assert.equal(mu.cur && mu.cur.id, 'bgm_nest');
    run(3, { scene: 'title' }); run(3, { scene: 'title' }); assert.equal(mu.cur && mu.cur.id, 'bgm_home'); assert.equal(mu.cur.until, Infinity);
    run(1, { scene: 'other' }); assert.equal(mu.cur, null);
  });
  t('曲（動かして）：設定で「鳴らさない」なら流さない', () => {
    mu.setVolume(0); run(200, { ...day, period: 'night' }); assert.equal(mu.cur, null);
    assert.equal(core.busVolume('music'), 0);
    mu.setVolume(0.5); assert.ok(Math.abs(core.busVolume('music') - 2 * 0.5 * BGM_LEVEL) < 1e-9);
  });
  performance.now = realNow; delete globalThis.AudioContext;
}
console.log(`tobinezumi-audio: ${n} 件 OK`);
