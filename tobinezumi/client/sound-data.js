// tobinezumi/client/sound-data.js — 音の素材（CC0）の表と、場面ごとに何を鳴らすかの決まり（2026-11-14）。
// ブラウザでも node（テスト・変換の道具）でも読める、副作用の無いデータと純粋な関数だけ。
// ・素材はすべて OpenGameArt.org の、ライセンスの欄が CC0 だけのページから（1 件ずつ確かめた。docs/AUDIO_CREDITS.md）。
// ・置いてある物の表は sound-files.js（tools/sound_prepare.mjs が作る）。表に無い・読めない物は合成音（sfx.js・ambient.js）で鳴る。
// ・起動時には読まない：遊びが始まってから（最初の操作の後、少し待って）場面に要る物だけを 1 つずつ読む（soundbank.js）。

export const LICENSE = { id: 'CC0', name: 'CC0 1.0 Universal（パブリックドメイン）', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
export const SOURCES = { oga: { name: 'OpenGameArt.org', url: 'https://opengameart.org/' } };

const oga = (slug, title, author, dl) => ({ site: 'oga', license: 'CC0', page: 'https://opengameart.org/content/' + slug, title, author, dl: [].concat(dl).map(f => 'https://opengameart.org/sites/default/files/' + f) });
/** 素材のページ（パック）。キー＝変換の道具が読むフォルダ名 */
export const PACKS = {
  m_jrpg4: oga('jrpg-pack-4-calm', 'JRPG Pack 4 Calm', 'SubspaceAudio（Juhani Junkala）', 'JRPG%20Music%20Pack%20%234%20%5BCalm%5D%20by%20Juhani%20Junkala_0.zip'),
  m_meadow: oga('meadow-thoughts', 'Meadow Thoughts', 'Écrivain', 'Meadow%20Thoughts.ogg'),
  m_forest: oga('forest-whisper-theme', 'Forest Whisper Theme', 'CleytonKauffman', 'forest_whisper_theme.zip'),
  m_snow: oga('snow-theme', 'Snow Theme', 'CleytonKauffman', 'snow_theme_1.zip'),
  m_lullaby: oga('happy-lullaby-song17', 'Happy Lullaby (song17)', 'cynicmusic', 'song17.mp3'),
  a_birds: oga('ambient-bird-sounds', 'Ambient Bird Sounds', 'isaiah658', 'birds-isaiah658_0.ogg'),
  a_crickets: oga('crickets-ambient-noise-loopable', 'Crickets Ambient Noise - loopable', 'Wolfgang_', 'crickets_1.mp3'),
  a_park: oga('park-ambiences', 'Park ambiences', 'Thimras', 'park_ambience_river.wav'),
  a_wind: oga('wind', 'Wind', 'IgnasD', 'wind.zip'),
  a_rain: oga('rain-loopable', 'Rain (loopable)', 'Ylmir', 'Rain%20OGG.zip'),
  s_shovel: oga('shovel-sound', 'Shovel Sound', 'themightyglider', 'shovel_0.ogg'),
  s_pops: oga('3-pop-sounds', '3 Pop Sounds', 'wubitog', '3pops.zip'),
  s_100sfx: oga('100-cc0-sfx', '100 CC0 SFX', 'rubberduck', '100-CC0-SFX_0.zip'),
  s_100sfx2: oga('100-cc0-sfx-2', '100 CC0 SFX #2', 'rubberduck', 'sfx_100_v2.zip'),
  s_bell: oga('bell-dingschimes', 'Bell dings/chimes', 'PWL', ['bell_ding1.wav', 'bell_ding3.wav']),
  s_sandsteps: oga('water-splash-and-sand-footsteps', 'Water Splash and sand footsteps', 'Peludo', 'sand_footsteps_0.mp3'),
};

/** 素材 1 つ：pack のファイル files（複数なら gap 秒の間で 1 本に・gap 0 は 1 秒重ねてつなぐ）・cut＝[始め, 長さ]（秒）・fx＝足す加工（ffmpeg）・
 *  seamless＝元からつなぎ目なしで繰り返せる（そのまま）・loop＝曲を繰り返して使う */
const M = (pack, files, title, kind, o = {}) => Object.assign({ pack, files: [].concat(files), title, kind }, o);
export const MATERIALS = {
  // 曲（平均 -22 LUFS・モノラル 48kbps）
  bgm_home: M('m_jrpg4', 'x/Calm1 - A Place I Call Home.ogg', 'A Place I Call Home（タイトル）', 'bgm', { loop: true, seamless: true }),
  bgm_days: M('m_jrpg4', 'x/Calm3 - Peaceful Days.ogg', 'Peaceful Days（昼の原・岩場）', 'bgm', { loop: true, seamless: true }),
  bgm_sand: M('m_jrpg4', 'x/Calm4 - Sand Castles.ogg', 'Sand Castles（砂丘の昼）', 'bgm', { loop: true, seamless: true }),
  bgm_fest: M('m_jrpg4', 'x/Calm5 - Summer Memories.ogg', 'Summer Memories（行事の間）', 'bgm', { loop: true, seamless: true }),
  bgm_night: M('m_jrpg4', 'x/Calm6 - Innocence.ogg', 'Innocence（夜・雨）', 'bgm', { loop: true, seamless: true }),
  bgm_meadow: M('m_meadow', 'Meadow Thoughts.ogg', 'Meadow Thoughts（ハープ独奏：朝夕・はじまりの原）', 'bgm'),
  bgm_canyon: M('m_forest', 'x/Forest Whisper Theme/Forest Whisper.ogg', 'Forest Whisper（渓谷）', 'bgm', { loop: true, seamless: true }),
  bgm_snow: M('m_snow', 'x/Snow Theme/BGM_Snow_Theme_Slowed_Loop.ogg', 'Through the Snow（ゆっくり版：冬）', 'bgm', { loop: true, seamless: true }),
  bgm_nest: M('m_lullaby', 'song17.mp3', 'Happy Lullaby（巣の中）', 'bgm', { loop: true, seamless: true }),
  // 環境音（平均 -30 LUFS・32kHz 48kbps・つなぎ目なし）
  amb_birds: M('a_birds', 'birds-isaiah658_0.ogg', '昼の小鳥', 'amb'),
  amb_crickets: M('a_crickets', 'crickets_1.mp3', '夜の虫', 'amb', { seamless: true }),
  amb_river: M('a_park', 'park_ambience_river.wav', '小さな川（せせらぎ・遠くの鳥と蛙）', 'amb', { cut: [60, 42] }),
  amb_wind: M('a_wind', ['x/wind/Wind.ogg', 'x/wind/Wind2.ogg'], '吹きわたる風', 'amb', { gap: 0 }),
  amb_rain: M('a_rain', 'x/3.ogg', '雨', 'amb'),
  // 効果音（一瞬の大きさ -16 LUFS。鳴らす時に SE_MAP の g で下げる）
  se_dig: M('s_shovel', 'shovel_0.ogg', '土をすくう', 'se'),
  se_pop1: M('s_pops', 'x/3pops/pop1.ogg', 'ぽっ 1', 'se'),
  se_pop2: M('s_pops', 'x/3pops/pop2.ogg', 'ぽっ 2', 'se'),
  se_pop3: M('s_pops', 'x/3pops/pop3.ogg', 'ぽっ 3', 'se'),
  se_plop1: M('s_100sfx', 'x/plop_01.ogg', '水のぽちゃ 1', 'se'),
  se_plop2: M('s_100sfx', 'x/plop_02.ogg', '水のぽちゃ 2', 'se'),
  se_stone1: M('s_100sfx2', 'x/sfx100v2_stones_01.ogg', '小石を置く 1', 'se'),
  se_stone2: M('s_100sfx2', 'x/sfx100v2_stones_02.ogg', '小石を置く 2', 'se'),
  se_bell1: M('s_bell', 'bell_ding1.wav', '小さな鈴 1', 'se'),
  se_bell3: M('s_bell', 'bell_ding3.wav', '小さな鈴 2', 'se'),
  se_sand1: M('s_sandsteps', 'sand_footsteps_0.mp3', '砂に降りる 1', 'se', { cut: [2.62, 0.48] }),
  se_sand2: M('s_sandsteps', 'sand_footsteps_0.mp3', '砂に降りる 2', 'se', { cut: [3.21, 0.52] }),
};
export const fileOf = id => (MATERIALS[id] ? `${MATERIALS[id].kind}/${id}.mp3` : null);
export const sourceUrl = id => PACKS[MATERIALS[id].pack].page;
export const authorOf = id => PACKS[MATERIALS[id].pack].author;

/** 効果音の名前 → 素材（あれば 1 つを選んで鳴らす）。r＝速さ（音の高さ）の幅。大きさは SFX_TARGET に合わせる（g があれば さらに掛ける）。
 *  ここに無い名前・素材が読めていない時は sfx.js の合成音。 */
export const SE_MAP = {
  dig: { m: ['se_dig'], r: [0.92, 1.08] },
  pick: { m: ['se_pop1', 'se_pop2', 'se_pop3'], r: [1.05, 1.25] },
  drink: { m: ['se_plop1', 'se_plop2'], r: [1.0, 1.2] },
  place: { m: ['se_stone1', 'se_stone2'], r: [0.95, 1.1] },
  fest: { m: ['se_bell1', 'se_bell3'], r: [1, 1] },
  land: { m: ['se_sand1', 'se_sand2'], r: [1.1, 1.35] },
};

/**
 * 効果音の大きさの目標（LUFS：400ms の窓の最大。設定「ふつう」で）。合成音も素材も、測った値からこの大きさに合わせる。
 * ・ふだんよく鳴る音（拾う・着地・跳ぶ・画面）は小さく、知らせ（めずらしい物・行事・生まれた）は少し大きく。
 * ・危険の予告は知らせと同じくらい（はっきり分かる）。つかまった音も同じくらいで、大きな音で驚かせない。
 */
export const SFX_TARGET = {
  pick: -27, land: -31, jump: -30, open: -33, eat: -27, drink: -27, place: -27, remove: -28, dig: -25, plug: -25,
  burrow: -26, out: -27, travel: -25, pet: -26, safe: -24, rare: -23, fest: -23, birth: -22, star: -33, train: -30,
  alert: -22, owl: -24, fox: -25, hiss: -26, dive: -24, caught: -23,
};
/** 毎回少し高さを変える幅（よく鳴る音ほど。繰り返しで耳が疲れない） */
export const VARY = { pick: 0.06, land: 0.08, jump: 0.05, eat: 0.06, drink: 0.05, dig: 0.05, place: 0.05, remove: 0.05, open: 0.02, pet: 0.03, hiss: 0.04, fox: 0.04 };

/** 環境音の層（素材）と、同じ役の合成音の層（ambient.js）。素材が鳴る時は合成の層を弱める */
export const AMB_LAYERS = { amb_birds: 'birds', amb_crickets: 'insects', amb_river: 'river', amb_wind: 'wind', amb_rain: 'rain' };

const SEASON_BIRDS = { spring: 1, summer: 0.85, autumn: 0.5, winter: 0.12 };
const SEASON_BUGS = { spring: 0.35, summer: 1, autumn: 0.75, winter: 0 };
/**
 * 環境音の層の大きさ（0〜1 くらい）。ctx = { region, period, season, weather, k（天気の強さ 0..1）, inNest, river（水までの近さ 0..1） }
 * 返り値：{ wind, rain, river, birds, insects, windTone（風のこもり Hz）}。素材と合成のどちらでもこの値を使う（ambient.js が層ごとに掛ける）。
 */
export function ambMix(c) {
  const { region = 'plains', period = 'day', season = 'spring', weather = 'clear', k = 1, inNest = false, river = 0 } = c;
  const night = period === 'night', day = period === 'day', dawn = period === 'dawn', dusk = period === 'dusk';
  let wind = 0.12 + ({ rocks: 0.12, dunes: 0.16, toyama: -0.05 }[region] || 0);   // 富山は静か（もとは +0.04 で、はじまりの原より風が強かった）
  if (weather === 'sandstorm') wind = 0.55 * k + 0.2; else if (weather === 'snow') wind += 0.06;
  const rain = weather === 'rain' ? 0.32 * k : 0;
  // 鳥：朝がいちばん（明け方のさえずり）・昼・夕方は少し。砂丘と砂嵐・雨は少ない。冬は静か
  let birds = (dawn ? 1 : day ? 0.6 : dusk ? 0.3 : 0) * (SEASON_BIRDS[season] ?? 0.6);
  birds *= { dunes: 0.25, rocks: 0.7, canyon: 0.9, toyama: 0.7 }[region] ?? 1;
  if (weather === 'rain' || weather === 'sandstorm') birds *= 0.15; else if (weather === 'snow') birds *= 0.3;
  // 虫：夜（夏がいちばん）・夕方は少し。雨・砂嵐の夜は鳴かない。富山は静か
  let insects = (night ? 1 : dusk ? 0.35 : 0) * (SEASON_BUGS[season] ?? 0.5);
  insects *= { dunes: 0.4, toyama: 0.5 }[region] ?? 1;
  if (weather === 'rain' || weather === 'sandstorm' || weather === 'snow') insects = 0;
  const out = { wind, rain, river, birds, insects, windTone: weather === 'sandstorm' ? 900 : season === 'winter' ? 380 : 450 };
  if (inNest) { out.wind *= 0.5; out.rain *= 0.8; out.river *= 0.3; out.birds *= 0.15; out.insects *= 0.25; }
  return out;
}

/** 曲：場面 → 曲の候補（並べた物から順に、または交互に）。null は「曲を流さない」 */
export const BGM_LEVEL = 0.55;   // 曲のふだんの大きさ（設定「ふつう」のとき。環境音・効果音の下に敷く）
/**
 * 今の場面で流す曲（素材のキー）。c = { scene: 'title'|'field'|'nest'|'other', region, period, season, weather, fest（{phase, id}）, n（何曲目か） }
 * ・富山は曲を流さない（静けさと遠くの音だけ。土地をはっきりさせない）。砂嵐の間も流さない（風の音を聞く）。
 * ・行事の間は行事の曲（星見の夜は夜の曲）。夜と雨は静かな曲、冬は雪の曲、朝夕はハープ。昼は土地ごと。
 */
export function bgmPick(c) {
  const { scene, region = 'plains', period = 'day', season = 'spring', weather = 'clear', fest = null, n = 0 } = c || {};
  if (scene === 'title') return 'bgm_home';
  if (scene === 'nest') return 'bgm_nest';
  if (scene !== 'field') return null;
  if (region === 'toyama' || weather === 'sandstorm') return null;
  if (fest && fest.phase === 'during') return fest.id === 'hoshi' ? 'bgm_night' : 'bgm_fest';
  if (period === 'night' || weather === 'rain') return 'bgm_night';
  if (season === 'winter' || weather === 'snow') return 'bgm_snow';
  if (period === 'dawn' || period === 'dusk') return 'bgm_meadow';
  if (region === 'dunes') return 'bgm_sand';
  if (region === 'canyon') return 'bgm_canyon';
  if (region === 'rocks') return 'bgm_days';
  return n % 2 ? 'bgm_meadow' : 'bgm_days';
}
/** 流し方：場面に入ってから最初の曲までの待ち・1 回に流す長さの上限・休み（秒）。タイトルと巣は短めに待つ */
export const BGM_PLAN = {
  firstWait: { title: [1.5, 1.5], field: [6, 14], nest: [3, 6] },
  maxPlay: 150,          // 短い繰り返しの曲は、ここまで繰り返して終わる（長い曲はそのまま 1 回）
  rest: [70, 160],       // 1 曲の後は休む（長く遊んでも疲れない）。巣とタイトルは休まず続ける
  restIn: { title: 0, nest: 8 },
  fade: 3,               // 終わり・場面が変わった時のフェード（秒）
  duck: 0.3,             // 捕食者に狙われている間は曲をここまで下げる（緊張は効果音と間で伝える）
};

/** 場面に入った時に読む物（その場面の曲・環境音を先に） */
export function loadListFor(c, files = null) {
  const ids = [];
  const b = bgmPick(c); if (b) ids.push(b);
  if (c && (c.scene === 'field' || c.scene === 'nest')) {
    const m = ambMix({ ...c, inNest: c.scene === 'nest', river: (c.region === 'canyon' || c.region === 'toyama') ? 0.5 : 0 });
    for (const [id, role] of Object.entries(AMB_LAYERS)) if (m[role] > 0.01) ids.push(id);
  }
  return files ? ids.filter(id => files[fileOf(id)]) : ids;
}
/** 効果音の素材（ふだんの動作で鳴る物から） */
export function seLoadList(files = null) {
  const ids = [...new Set(Object.values(SE_MAP).flatMap(e => e.m))];
  return files ? ids.filter(id => files[fileOf(id)]) : ids;
}

/** 使った素材の作者（置いてある物だけ）。表示用 */
export function usedAuthors(files) {
  const set = new Set();
  for (const id of Object.keys(MATERIALS)) if (!files || files[fileOf(id)]) set.add(authorOf(id));
  return [...set].sort((a, b) => a.localeCompare(b));
}
/** クレジットの文（メニューに出す）。素材が 1 つも無ければ空 */
export function audioCreditText(files) {
  const a = usedAuthors(files);
  if (!a.length || (files && !Object.keys(files).length)) return '';
  return '音楽・環境音・効果音の一部：' + a.join('、') + '（OpenGameArt.org・CC0）。ほかの音は WebAudio で合成。';
}
