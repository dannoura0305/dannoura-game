// 音の素材の対応表（CC0＝パブリックドメインの素材：OpenGameArt.org・Kenney）。2026-11-14
// 出典・作者・ライセンスを確かめたページ・取得の記録は docs/shinshoku/AUDIO_CREDITS.md。
// （2026-11-13 の候補だった効果音ラボ・魔王魂は、作業環境から素材を取得できなかったため使わない：同じ文書の「経緯」）
// ・素材の変換済みファイルは shinshoku/assets/sound/ に置き、実際に置いた物の表を data/sound_files.js（tools/sound/prepare.mjs が作る）に持つ。
//   表に無い（＝置いていない）素材は読まない。読めない・まだ読んでいない音は core/audio.js の合成音で鳴る（フォールバック）。
// ・起動時には何も読まない。遊びが始まって起動の後読み（bootMs.lateAt）が過ぎてから、区画に入った時にその区画の環境音・BGM を、
//   続いて効果音を少しずつ読む（core/soundbank.js）。
// ・怖さの方向は「じわじわ型」：環境音の層・間・遠くの気配（PRESENCE）で不安を作り、驚かし（mimic_reveal 等）は要所だけ。
//   BGM は常には鳴らさない（BGM_AREAS：探索は一度流したら長く休む・家と結末と序章のふだんの町は鳴らさない）。
// 純粋なデータと関数だけ（node でテストする：tests/shinshoku-audio.test.mjs）。

/** 素材サイト（どちらも CC0 の素材だけを使う。表記は不要だが、作者名をスタッフロールに載せる） */
export const SOURCES = {
  oga: { name: 'OpenGameArt.org', url: 'https://opengameart.org/' },
  kenney: { name: 'Kenney', url: 'https://kenney.nl/' },
};
/** 使うライセンス（これ以外は使わない） */
export const LICENSE = { id: 'CC0', name: 'CC0 1.0（パブリックドメイン）', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };

const oga = (slug, title, author, dl) => ({ site: 'oga', page: 'https://opengameart.org/content/' + slug, title, author, license: 'CC0', dl: 'https://opengameart.org/sites/default/files/' + dl });
const ken = (slug, title) => ({ site: 'kenney', page: 'https://kenney.nl/assets/' + slug, title, author: 'Kenney', license: 'CC0', dl: null });
/**
 * 素材のページ（パック）。キー＝ダウンロードした物を置くフォルダの名前（tools/sound/prepare.mjs の入力 <フォルダ>/<キー>/…）。
 * page＝ライセンス（CC0）・作者を確かめたページ（2026-11-14）・dl＝そのページのダウンロードの URL（Kenney はページのボタンから）。
 */
export const PACKS = {
  kenney_impact: ken('impact-sounds', 'Impact Sounds'),
  kenney_rpg: ken('rpg-audio', 'RPG Audio'),
  kenney_scifi: ken('sci-fi-sounds', 'Sci-fi Sounds'),
  rd_100sfx2: oga('100-cc0-sfx-2', '100 CC0 SFX #2', 'rubberduck', 'sfx_100_v2.zip'),
  rd_metalwood: oga('100-cc0-metal-and-wood-sfx', '100 CC0 metal and wood SFX', 'rubberduck', '100-CC0-wood-metal-SFX.zip'),
  rd_creature2: oga('80-cc0-creture-sfx-2', '80 CC0 creture SFX #2', 'rubberduck', '80-CC0-creature-sfx-2.zip'),
  rd_breaking: oga('75-cc0-breaking-falling-hit-sfx', '75 CC0 breaking / falling / hit sfx', 'rubberduck', 'sfx_breaking_and_falling.zip'),
  rd_loops: oga('30-cc0-sfx-loops', '30 CC0 SFX loops', 'rubberduck', 'sfx_loops.zip'),
  sn_sword: oga('20-sword-sound-effects-attacks-and-clashes', '20 Sword Sound Effects (Attacks and Clashes)', 'StarNinjas', 'sword_-_starninjas_1.zip'),
  sn_clash: oga('20-sword-sound-effects-attacks-and-clashes', '20 Sword Sound Effects (Attacks and Clashes)', 'StarNinjas', 'sword_clash_-_starninjas_0.zip'),
  sn_monster: oga('16-monster-growls', '16 Monster Growls', 'StarNinjas', 'monster_-_starninjas.zip'),
  ad_swish: oga('swishes-sound-pack', 'Swishes Sound Pack', 'artisticdude', 'swishes.zip'),
  ad_undead: oga('undead-moans', 'Undead Moans', 'AntumDeluge', 'undead-moans.zip'),
  ad_scrapes: oga('scrapes', 'Scrapes', 'AntumDeluge', 'scrapes.zip'),
  da_zmoans: oga('zombie-moans', 'Zombie moans', 'Darsycho', 'darsycho__zombie-moans_0.ogg'),
  kurt_pistol: oga('gunshots', 'Gunshots', 'kurt', '22%20Pistol.wav'),
  zs_reload: oga('handgun-reload-sound-effect', 'Handgun Reload Sound Effect', 'zer0_sol', 'reload.wav'),
  bart_heart: oga('heartbeat-sounds', 'Heartbeat sounds', 'bart', 'heartbeat_slow_0.wav'),
  bart_steam: oga('steam-release-sounds', 'Steam release sounds', 'bart', 'steam_hisses.zip'),
  tz_roar: oga('cc0-deep-monster-roar', 'CC0 Deep Monster Roar', 'trazzz123', 'monster_roar.wav'),
  mu_rumble: oga('low-rumbling', 'Low Rumbling', 'Musheran', 'low-rumbling-176033.mp3'),
  mk_shake: oga('earthquake-and-open-sesame', 'Earthquake and Open sesame', 'mieki256', 'shake.flac'),
  qb_ghostbreath: oga('ghost-breath', 'Ghost breath', 'qubodup', 'ghostbreath.flac'),
  tw_horror: oga('horror-sfx', 'Horror SFX', 'TinyWorlds', 'horror_sfx.zip'),
  ps_horrorhit: oga('horror-hit-soundpack-1', 'Horror Hit Soundpack 1', 'psychhead_', 'horror_hit_soundpack_1.zip'),
  tb_glass: oga('glass-break', 'Glass Break', 'Till Behrend', 'glass_breaking.wav'),
  tg_buzz: oga('electric-buzz', 'Electric Buzz', 'themightyglider', 'buzz_0.ogg'),
  ck_breaker: oga('sfx-circuit-breaker', 'SFX - Circuit breaker', 'CleytonKauffman', 'Circuit%20Breaker.zip'),
  ez_alarm: oga('alarm-1', 'Alarm', 'EZduzziteh', 'alarm_2.ogg'),
  pwl_bell: oga('bell-dingschimes', 'Bell dings/chimes', 'PWL', 'bell_ding2.wav'),
  kr_radio: oga('radio-noise-1', 'Radio Noise 1', 'Kresiek The Furry', 'radio_noise_loop.wav'),
  kr_rain: oga('amb-rain-loop-1', 'AMB Rain Loop 1', 'Kresiek The Furry', 'amb_rain_loop_1.ogg'),
  kr_outside: oga('amb-outside-1', 'AMB Outside 1', 'Kresiek The Furry', 'amb_outdoor1_loop.ogg'),
  sw_windy: oga('windy-ambient-noise', 'windy ambient noise', 'Some Weirdo', 'windy_ambiance_0.ogg'),
  ig_wind: oga('wind', 'Wind', 'IgnasD', 'wind.zip'),
  ig_crows: oga('crows-singing', 'Crows singing', 'IgnasD', 'Crows.ogg'),
  in_drip: oga('dripping-water-loop', 'Dripping water loop', 'Independent.nu', 'atmosbasement.mp3_.flac'),
  is_birds: oga('ambient-bird-sounds', 'Ambient Bird Sounds', 'isaiah658', 'birds-isaiah658_0.ogg'),
  wf_crickets: oga('crickets-ambient-noise-loopable', 'Crickets Ambient Noise - loopable', 'Wolfgang_', 'crickets_1.mp3'),
  // 曲
  m_emptycity: oga('emptycity-background-music', 'EmptyCity: Background Music', 'yd', 'EmptyCity.ogg'),
  m_corridors: oga('narrow-corridors', 'Narrow Corridors', 'TinyWorlds', 'narrow_corridors_short.ogg'),
  m_hauntpiano: oga('haunting-piano', 'Haunting piano', 'Emma_MA', 'haunting%20piano_0.mp3'),
  m_lost: oga('lost-in-a-bad-place-horror-ambience-loop', 'Lost in a bad place (horror ambience loop)', 'congusbongus', 'lost_2.ogg'),
  m_humidity: oga('deep-humidity', 'Deep Humidity', 'TinyWorlds', 'deep-humidity.ogg'),
  m_horroratmo: oga('horror-atmosphere', 'Horror Atmosphere', 'SubspaceAudio（Juhani Junkala）', 'Juhani%20Junkala%20-%20Post%20Apocalyptic%20Wastelands%20%5BLoop%20Ready%5D.ogg'),
  m_tension: oga('tension-and-distress', 'tension and distress', 'allen yatsura', 'aflicao.wav'),
  m_evilapproach: oga('evil-approach', 'Evil Approach', 'nene', 'Evil%20Approach.wav'),
  m_bossbattle: oga('boss-battle-music', 'Boss Battle Music', 'SubspaceAudio（Juhani Junkala）', 'Juhani%20Junkala%20-%20Epic%20Boss%20Battle%20%5BSeamlessly%20Looping%5D.wav'),
  m_firstlight: oga('first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track', 'First Light Particles', 'Yoiyami', 'first_light_particles_0.wav'),
};

/** 素材 1 つ：pack のファイル files（複数なら gap 秒の間をあけて 1 本につなぐ）・cut＝[始め, 長さ]（秒）・fx＝足す加工（ffmpeg のフィルタ）・loop＝曲をつなぎ目なしで繰り返す形にする */
const M = (pack, files, title, kind, o = {}) => Object.assign({ pack, files: [].concat(files), title, kind }, o);
const kSteps = (name, n = 5) => Array.from({ length: n }, (_, i) => `Audio/${name}_00${i}.ogg`);
const rpgSteps = [0, 2, 4, 6, 8, 1, 3, 5].map(i => `Audio/footstep0${i}.ogg`);
const GYM = 'aecho=0.8:0.6:70|150:0.35|0.18';            // 体育館の響き（足音に足す）

/**
 * 使う素材（選んだ物）。キー＝出力ファイルの名前（assets/sound/<kind>/<キー>.mp3）。
 * kind：step（足音：1 歩ずつ並べた 1 本から 1 歩ずつ切り出す）・amb（環境音：つなぎ目なしで繰り返す）・se（効果音）・bgm（曲）
 * 人の声（悲鳴・台詞）は使わない。異形の声は、人が口で作った唸り・うめきの録音を低く・遅くして使う（AUDIO_CREDITS.md）。
 */
export const MATERIALS = {
  // ── 足音（地面の種類ごと・歩きと走り。1 歩ずつの録音を並べて 1 本にする）
  step_asphalt: M('kenney_impact', kSteps('footstep_concrete'), 'コンクリートの足音（5 歩）', 'step', { gap: 0.5 }),
  step_asphalt_run: M('kenney_impact', kSteps('footstep_concrete'), 'コンクリートの足音（走り）', 'step', { gap: 0.32 }),
  step_wet: M('rd_100sfx2', ['sfx100v2_footstep_wet_01.ogg', 'sfx100v2_footstep_wet_02.ogg', 'sfx100v2_footstep_wet_03.ogg'], '濡れた地面の足音', 'step', { gap: 0.5 }),
  step_wet_run: M('rd_100sfx2', ['sfx100v2_footstep_wet_01.ogg', 'sfx100v2_footstep_wet_02.ogg', 'sfx100v2_footstep_wet_03.ogg'], '濡れた地面の足音（走り）', 'step', { gap: 0.32 }),
  step_tile: M('kenney_rpg', rpgSteps, '硬い床の足音（靴）', 'step', { gap: 0.45 }),
  step_tile_run: M('kenney_rpg', rpgSteps, '硬い床の足音（走り）', 'step', { gap: 0.3 }),
  step_wood: M('rd_100sfx2', ['sfx100v2_footstep_wood_01.ogg', 'sfx100v2_footstep_wood_02.ogg', 'sfx100v2_footstep_wood_03.ogg', 'sfx100v2_footstep_wood_04.ogg'], '木の床の足音', 'step', { gap: 0.5 }),
  step_wood_run: M('kenney_impact', kSteps('footstep_wood'), '木の床の足音（走り）', 'step', { gap: 0.3 }),
  step_gym: M('kenney_impact', kSteps('footstep_wood'), '体育館の床の足音（響きを足す）', 'step', { gap: 0.55, fx: GYM }),
  step_gym_run: M('kenney_impact', kSteps('footstep_wood'), '体育館の床の足音（走り・響きを足す）', 'step', { gap: 0.36, fx: GYM }),
  // ── 環境音の層
  amb_rain: M('kr_rain', 'amb_rain_loop_1.ogg', '雨（つなぎ目なしの録音）', 'amb'),
  amb_wind: M('sw_windy', 'windy_ambiance_0.ogg', '不気味な風（音程のない響きを含む）', 'amb', { cut: [20, 44] }),
  amb_wind_open: M('ig_wind', ['wind/Wind.ogg', 'wind/Wind2.ogg'], '吹きさらしの風', 'amb', { gap: 0 }),
  amb_vent: M('rd_100sfx2', 'sfx100v2_loop_machine_01.ogg', '換気の低いうなり（機械の繰り返し）', 'amb', { seamless: true, fx: 'lowpass=f=1800' }),
  amb_machine: M('rd_100sfx2', 'sfx100v2_loop_machine_02.ogg', '機械室の機械（機械の繰り返し）', 'amb', { seamless: true }),
  amb_sewer: M('in_drip', 'atmosbasement.mp3_.flac', '地下の水滴（地下室の響き）', 'amb'),
  amb_room: M('rd_loops', 'ambient_01.ogg', '静かな部屋の空気（低い環境の繰り返し）', 'amb', { seamless: true }),
  amb_town: M('kr_outside', 'amb_outdoor1_loop.ogg', '夕方の屋外（静かな町）', 'amb'),
  amb_morning: M('is_birds', 'birds-isaiah658_0.ogg', '朝の鳥', 'amb'),
  amb_dusk: M('ig_crows', 'Crows.ogg', '夕方のカラス', 'amb'),
  amb_night: M('wf_crickets', 'crickets_1.mp3', '夜の虫', 'amb', { seamless: true }),
  // ── 気配（遠くで、時々。位置を持たせて小さく・こもらせる）
  p_creak: M('kenney_rpg', 'Audio/creak1.ogg', '木のきしみ', 'se'),
  p_knock: M('kenney_impact', ['Audio/impactWood_light_000.ogg', 'Audio/impactWood_light_002.ogg', 'Audio/impactWood_light_001.ogg'], '木を叩く音（3 回）', 'se', { gap: 0.22 }),
  p_iron_knock: M('kenney_impact', ['Audio/impactMetal_heavy_000.ogg', 'Audio/impactMetal_heavy_002.ogg'], '鉄の扉を叩く音（2 回）', 'se', { gap: 0.55 }),
  p_window: M('kenney_impact', ['Audio/impactGlass_light_000.ogg', 'Audio/impactGlass_light_001.ogg'], '窓を叩く音', 'se', { gap: 0.3 }),
  p_metal: M('rd_metalwood', 'metal_falling_01.ogg', '鉄の物が落ちる音', 'se'),
  p_breath: M('qb_ghostbreath', 'ghostbreath.flac', '遅くした息遣い（幽霊の息）', 'se'),
  p_drip: M('in_drip', 'atmosbasement.mp3_.flac', '水滴', 'se', { cut: [8.3, 1.0] }),
  p_drag: M('ad_scrapes', 'scrape-1.ogg', '何かを引きずる音', 'se'),
  p_steps: M('kenney_impact', ['Audio/footstep_wood_000.ogg', 'Audio/footstep_wood_002.ogg', 'Audio/footstep_wood_001.ogg', 'Audio/footstep_wood_003.ogg'], '誰かの足音（4 歩）', 'se', { gap: 0.5 }),
  // ── 戦い
  se_katana_swing1: M('ad_swish', 'swishes/swish-1.wav', '素振りの風切り1', 'se'),
  se_katana_swing2: M('ad_swish', 'swishes/swish-2.wav', '素振りの風切り2', 'se'),
  se_sword_swing: M('ad_swish', 'swishes/swish-10.wav', '重い素振り', 'se'),
  se_heavy_swing: M('ad_swish', 'swishes/swish-13.wav', '鉄パイプの素振り', 'se'),
  se_claw_swing: M('ad_swish', 'swishes/swish-5.wav', '爪の振り', 'se'),
  se_katana_slash1: M('sn_sword', 'sword - StarNinjas/sword.1.ogg', '刃で斬る1', 'se'),
  se_katana_slash2: M('sn_sword', 'sword - StarNinjas/sword.2.ogg', '刃で斬る2（強）', 'se'),
  se_katana_slash3: M('sn_sword', 'sword - StarNinjas/sword.3.ogg', '刃で斬る3', 'se'),
  se_katana_slash4: M('sn_sword', 'sword - StarNinjas/sword.4.ogg', '刃で斬る4', 'se'),
  se_katana_slash5: M('sn_sword', 'sword - StarNinjas/sword.5.ogg', '刃で斬る5', 'se'),
  se_iainuki: M('kenney_rpg', ['Audio/drawKnife2.ogg', 'Audio/knifeSlice2.ogg'], '刃を抜いて斬る（居合）', 'se', { gap: 0.05 }),
  se_knife_slash: M('kenney_rpg', 'Audio/knifeSlice.ogg', '刃物で切る', 'se'),
  se_blow1: M('kenney_impact', 'Audio/impactPunch_heavy_000.ogg', '打撃1', 'se'),
  se_blow2: M('kenney_impact', 'Audio/impactPunch_medium_000.ogg', '打撃2', 'se'),
  se_blow6: M('kenney_impact', 'Audio/impactPunch_heavy_002.ogg', '打撃3（銃床）', 'se'),
  se_katana_clash1: M('sn_clash', 'sword_clash.1.ogg', '刃の打ち合い1', 'se'),
  se_katana_clash2: M('sn_clash', 'sword_clash.2.ogg', '刃の打ち合い2', 'se'),
  se_katana_hold: M('kenney_rpg', 'Audio/metalClick.ogg', '刀を構える「チャキッ」（金属のカチッ）', 'se'),
  se_growl: M('sn_monster', 'monster.2.ogg', '怪物の唸り声', 'se'),
  se_handgun: M('kurt_pistol', '22%20Pistol.wav', '拳銃（.22）を撃つ', 'se'),
  se_handgun_empty: M('kenney_rpg', 'Audio/metalLatch.ogg', '弾切れの空撃ち（金属のカチッ）', 'se'),
  se_handgun_ready: M('zs_reload', 'reload.wav', '拳銃の装填', 'se'),
  se_cloth: M('kenney_rpg', 'Audio/cloth1.ogg', '衣擦れ', 'se'),
  se_down: M('kenney_impact', 'Audio/impactSoft_heavy_000.ogg', '倒れる（鈍い音）', 'se'),
  se_large_slash: M('sn_sword', 'sword - StarNinjas/sword.8.ogg', '大きく斬る', 'se'),
  // ── 異形の声・予兆（驚かしの音は要所だけで使う）
  se_zombie1: M('da_zmoans', 'darsycho__zombie-moans_0.ogg', 'ゾンビのうめき1', 'se', { cut: [0.2, 3.0] }),
  se_zombie2: M('ad_undead', 'undead-2.ogg', 'ゾンビのうめき2（小さい）', 'se'),
  se_zombie3: M('ad_undead', 'undead-4.ogg', 'ゾンビのうめき3', 'se'),
  se_ghost: M('rd_creature2', 'weird_06.ogg', '幽霊的な声（加工された生き物の声）', 'se'),
  se_dragon: M('tz_roar', 'monster_roar.wav', '巨大な怪物の咆哮', 'se'),
  se_monster_step: M('rd_creature2', 'stomp_01.ogg', '巨大な足音', 'se'),
  se_tremor: M('mu_rumble', 'low-rumbling-176033.mp3', '地響き', 'se', { cut: [0, 4.5] }),
  se_quake: M('mk_shake', 'shake.flac', '揺れ・崩れ', 'se'),
  se_tentacle: M('rd_creature2', 'slime_01.ogg', 'うごめく音（粘る）', 'se'),
  se_electron: M('kenney_scifi', 'Audio/forceField_001.ogg', '電気の唸り', 'se'),
  se_approach: M('tw_horror', 'horror_effect1.wav', '迫り来る恐怖（持ち上がる不穏な音）', 'se', { cut: [0, 7] }),
  se_dissonance: M('ps_horrorhit', 'Horror Hit Soundpack 1/Sound/Pitches/Mid/Mid 1.wav', '恐怖の不協和音（ホラーの一撃）', 'se', { cut: [0, 4] }),
  se_heart: M('bart_heart', 'heartbeat_slow_0.wav', '心臓の鼓動', 'se'),
  // ── 扉・物音・機械
  se_door_old: M('kenney_rpg', 'Audio/doorOpen_2.ogg', '古いドアを開ける', 'se'),
  se_door_open: M('kenney_rpg', 'Audio/doorOpen_1.ogg', 'ドアを開ける', 'se'),
  se_knock_wood: M('kenney_impact', ['Audio/impactWood_medium_000.ogg', 'Audio/impactWood_medium_001.ogg', 'Audio/impactWood_medium_002.ogg'], '木のドアをノック', 'se', { gap: 0.2 }),
  se_iron_door_close: M('rd_metalwood', 'metal_slam_01.ogg', '鉄の扉を閉める', 'se'),
  se_glass: M('tb_glass', 'glass_breaking.wav', 'ガラスが割れる', 'se'),
  se_collapse_little: M('rd_breaking', 'bfh1_breaking_01.ogg', '少し崩れる', 'se'),
  se_wall_break: M('rd_metalwood', 'wood_breaking_01.ogg', '物が壊れる（木が割れる）', 'se'),
  se_gas: M('bart_steam', 'steam hisses - Marker #1.wav', 'ガスが噴き出す', 'se'),
  se_evaporate: M('bart_steam', 'steam hisses - Marker #3.wav', '蒸気がジューッ', 'se'),
  se_iron_plate: M('kenney_impact', 'Audio/impactPlate_heavy_000.ogg', '鉄板を叩く', 'se'),
  se_switch: M('ck_breaker', 'switch on.wav', 'ブレーカーを入れる', 'se'),
  se_spark: M('tg_buzz', 'buzz_0.ogg', '電気のバチバチ', 'se'),
  se_drop: M('in_drip', 'atmosbasement.mp3_.flac', '水滴（点滴の台）', 'se', { cut: [19.1, 0.9] }),
  se_alert: M('ez_alarm', 'alarm_2.ogg', '警報', 'se'),
  se_pa_start: M('pwl_bell', 'bell_ding2.wav', '放送のチャイム（鐘の一打）', 'se'),
  se_pa_cut: M('ck_breaker', 'switch off.wav', '放送が切れる（スイッチ）', 'se'),
  se_radio_noise: M('kr_radio', 'radio_noise_loop.wav', '無線のノイズ', 'se', { cut: [3, 1.2] }),
  // ── BGM。どれも不穏・静かな物を選び、探索は小さく・時々だけ。戦い・ボス・巨大戦・スタッフロールの曲はつなぎ目なしで繰り返す
  bgm_emptycity: M('m_emptycity', 'EmptyCity.ogg', '荒れた町の探索（EmptyCity）', 'bgm'),
  bgm_corridors: M('m_corridors', 'narrow_corridors_short.ogg', '狭い通路（Narrow Corridors）', 'bgm'),
  bgm_hauntpiano: M('m_hauntpiano', 'haunting%20piano_0.mp3', '暗いピアノ（Haunting piano）', 'bgm'),
  bgm_lost: M('m_lost', 'lost_2.ogg', '低い弦の持続（Lost in a bad place）', 'bgm'),
  bgm_humidity: M('m_humidity', 'deep-humidity.ogg', '地下の探索（Deep Humidity）', 'bgm'),
  bgm_horroratmo: M('m_horroratmo', 'Juhani%20Junkala%20-%20Post%20Apocalyptic%20Wastelands%20%5BLoop%20Ready%5D.ogg', '旧棟の気配（Horror Atmosphere）', 'bgm'),
  bgm_tension: M('m_tension', 'aflicao.wav', '戦い（tension and distress）', 'bgm', { loop: true }),
  bgm_evilapproach: M('m_evilapproach', 'Evil%20Approach.wav', 'ボス戦（Evil Approach）', 'bgm', { loop: true }),
  bgm_bossbattle: M('m_bossbattle', 'Juhani%20Junkala%20-%20Epic%20Boss%20Battle%20%5BSeamlessly%20Looping%5D.wav', '巨大戦（Boss Battle Music）', 'bgm', { loop: true, seamless: true }),
  bgm_firstlight: M('m_firstlight', 'first_light_particles_0.wav', '終わりの朝（First Light Particles）', 'bgm', { loop: true }),
};

/** 出力ファイル（assets/sound/ からの相対） */
export const fileOf = id => { const m = MATERIALS[id]; return m ? m.kind + '/' + id + '.mp3' : null; };
/** 素材の出典（ライセンスと作者を確かめたページの URL） */
export const sourceUrl = id => { const m = MATERIALS[id]; return m ? PACKS[m.pack].page : null; };
/** 素材の作者 */
export const authorOf = id => { const m = MATERIALS[id]; return m ? PACKS[m.pack].author : null; };

/**
 * 効果音：音の名前（core/audio.js の Sfx.play の名前）→ 素材。m＝候補（ランダムに 1 つ）、g＝音量、r＝再生速度の幅。
 * ここに無い名前（UI の音・一閃の準備・相棒の悲鳴・変身・電話のベル 等）は合成音のまま。
 * 予兆の区別は残す：弾ける攻撃（tel_parry）＝高い金属の「チャキッ」／弾けない攻撃（tel_red）＝低い唸り。
 */
export const SE_MAP = {
  swing: { m: ['se_katana_swing1', 'se_katana_swing2'], g: 0.55, r: [0.95, 1.08] },
  swing_heavy: { m: ['se_sword_swing'], g: 0.6, r: [0.9, 1.0] },
  swing_pipe: { m: ['se_heavy_swing'], g: 0.6, r: [0.9, 1.0] },
  hit: { m: ['se_katana_slash1', 'se_katana_slash3'], g: 0.6, r: [0.95, 1.06] },
  hit_heavy: { m: ['se_katana_slash2'], g: 0.7, r: [0.92, 1.0] },
  hit_pipe: { m: ['se_blow2'], g: 0.7, r: [0.9, 1.05] },
  claw: { m: ['se_claw_swing'], g: 0.5, r: [1.0, 1.15] },
  claw_hit: { m: ['se_knife_slash'], g: 0.6, r: [0.95, 1.1] },
  blade: { m: ['se_katana_slash4'], g: 0.6 },
  issen: { m: ['se_iainuki'], g: 0.8 },
  chain: { m: ['se_katana_slash5'], g: 0.7 },
  parry: { m: ['se_katana_clash1'], g: 0.7 },
  guard: { m: ['se_katana_clash2'], g: 0.55 },
  tel_parry: { m: ['se_katana_hold'], g: 0.7, r: [1.1, 1.15] },
  tel_red: { m: ['se_growl'], g: 0.75, r: [0.72, 0.8] },
  shot: { m: ['se_handgun'], g: 0.75 },
  dry: { m: ['se_handgun_empty'], g: 0.5 },
  reload: { m: ['se_handgun_ready'], g: 0.5 },
  yodan: { m: ['se_handgun'], g: 0.9, r: [0.68, 0.72] },
  stock: { m: ['se_blow6'], g: 0.6 },
  dodge: { m: ['se_cloth'], g: 0.4, r: [0.95, 1.1] },
  hurt: { m: ['se_blow1'], g: 0.6, r: [0.9, 1.0] },
  die: { m: ['se_down'], g: 0.6, r: [0.85, 0.9] },
  door: { m: ['se_door_old', 'se_door_open'], g: 0.45 },
  knock: { m: ['se_knock_wood'], g: 0.6 },
  slam: { m: ['se_iron_door_close'], g: 0.7 },
  glass_break: { m: ['se_glass'], g: 0.6 },
  crash: { m: ['se_collapse_little'], g: 0.7 },
  prop_break: { m: ['se_wall_break'], g: 0.6 },
  rumble: { m: ['se_tremor'], g: 0.7 },
  wave: { m: ['se_quake'], g: 0.6 },
  land: { m: ['se_quake'], g: 0.7, r: [0.75, 0.8] },
  giant_step: { m: ['se_monster_step'], g: 0.7, r: [0.85, 1.0] },
  giant_claw: { m: ['se_large_slash'], g: 0.6, r: [0.8, 0.9] },
  giant_roar: { m: ['se_dragon'], g: 0.6, r: [0.72, 0.78] },
  boss_roar: { m: ['se_dragon'], g: 0.6, r: [0.52, 0.58] },
  heartbeat: { m: ['se_heart'], g: 0.6, r: [0.9, 0.95] },
  rampage_pulse: { m: ['se_heart'], g: 0.5, r: [0.75, 0.8] },
  boss_rise: { m: ['se_approach'], g: 0.6 },
  mimic_reveal: { m: ['se_dissonance'], g: 0.6 },              // 驚かし（要所）：模倣する影の正体が出る時だけ
  kiro_voice: { m: ['se_zombie2'], g: 0.35, r: [0.9, 1.0] },     // 帰路：帰ろうとしている人。荒くしない（小さく・遠く）
  heiten_voice: { m: ['se_zombie1'], g: 0.45, r: [0.88, 0.95] },
  kanja_voice: { m: ['se_zombie3'], g: 0.35, r: [0.8, 0.88] },
  mimic_voice: { m: ['se_ghost'], g: 0.45, r: [0.95, 1.05] },
  outou_voice: { m: ['se_ghost'], g: 0.4, r: [0.78, 0.84] },
  shuusha_voice: { m: ['se_zombie3'], g: 0.4, r: [0.9, 0.98] },
  tsugi_voice: { m: ['se_zombie1'], g: 0.55, r: [0.66, 0.72] },
  relay_regrow: { m: ['se_tentacle'], g: 0.5 },
  beam: { m: ['se_electron'], g: 0.5, r: [0.8, 0.9] },
  fire_hit: { m: ['se_evaporate'], g: 0.5 },
  steam: { m: ['se_gas'], g: 0.5 },
  water_hammer: { m: ['se_iron_plate'], g: 0.7, r: [0.8, 0.9] },
  breaker: { m: ['se_switch'], g: 0.6, r: [0.8, 0.85] },
  flicker: { m: ['se_spark'], g: 0.25, r: [1.0, 1.2] },
  alarm: { m: ['se_alert'], g: 0.4 },
  pa_chime: { m: ['se_pa_start'], g: 0.45, r: [0.94, 0.94] },   // 少し低く（館内放送の名残）
  pa_cut: { m: ['se_pa_cut'], g: 0.5 },
  tv_blip: { m: ['se_radio_noise'], g: 0.3 },
  drip_stand: { m: ['se_drop'], g: 0.35 },
  // 気配（Sfx.update が遠くで時々鳴らす）
  p_creak: { m: ['p_creak'], g: 0.5, r: [0.8, 0.95] },
  p_knock: { m: ['p_knock'], g: 0.5, r: [0.85, 0.95] },
  p_iron_knock: { m: ['p_iron_knock'], g: 0.5, r: [0.8, 0.9] },
  p_window: { m: ['p_window'], g: 0.45 },
  p_metal: { m: ['p_metal'], g: 0.45, r: [0.8, 0.95] },
  p_breath: { m: ['p_breath'], g: 0.35, r: [0.85, 0.95] },
  p_drip: { m: ['p_drip'], g: 0.45 },
  p_drag: { m: ['p_drag'], g: 0.5, r: [0.8, 0.9] },
  p_steps: { m: ['p_steps'], g: 0.45, r: [0.9, 1.0] },
};
/** 気配の名前（合成音のフォールバックもある：core/audio.js） */
export const PRESENCE_NAMES = ['p_creak', 'p_knock', 'p_iron_knock', 'p_window', 'p_metal', 'p_breath', 'p_drip', 'p_drag', 'p_steps'];

/** 足音：地面の種類 → 歩き・走りの素材（1 歩ずつの切り出しは sound_files.js の slices） */
export const STEPS = {
  asphalt: { walk: 'step_asphalt', run: 'step_asphalt_run', g: 0.75 },   // 素材の 1 歩が短く鋭いので、ほかの地面と同じに聞こえるよう少し上げる（AUDIO_CREDITS.md の大きさの表）
  wet: { walk: 'step_wet', run: 'step_wet_run', g: 0.5 },
  tile: { walk: 'step_tile', run: 'step_tile_run', g: 0.45 },
  wood: { walk: 'step_wood', run: 'step_wood_run', g: 0.5 },
  gym: { walk: 'step_gym', run: 'step_gym_run', g: 0.5 },
};

/** 環境音の層（区画の ambience の種類 → 素材の層と大きさ）。合成の層（うなり・雨・風・換気）は残し、素材がある時は同じ役の合成を弱める */
export const AMB_MIX = {
  street_normal: { amb_town: 0.7, amb_rain: 0.25 },
  street: { amb_rain: 1, amb_wind: 0.35 },
  home: { amb_room: 0.8, amb_rain: 0.35 },
  alley: { amb_rain: 1.1, amb_wind: 0.55 },
  plaza: { amb_rain: 1, amb_wind: 0.8 },
  gym: { amb_room: 1, amb_vent: 0.45, amb_rain: 0.2 },
  hospital: { amb_room: 0.8, amb_vent: 0.7 },
  tunnel: { amb_sewer: 1, amb_vent: 0.35 },
  office: { amb_room: 0.8, amb_vent: 0.5, amb_rain: 0.25 },
  lab: { amb_vent: 1, amb_machine: 0.3 },
  yard: { amb_wind_open: 1 },
  oldwing: { amb_room: 0.6, amb_vent: 0.6, amb_wind: 0.35 },
  oldwing_dark: { amb_wind: 0.7, amb_room: 0.5 },
  atrium: { amb_wind: 0.8, amb_vent: 0.4 },
  ruins: { amb_wind: 1 },
  admin: { amb_room: 0.7, amb_vent: 0.8 },
  admin_machine: { amb_machine: 1, amb_vent: 0.7 },
  abyss: { amb_wind_open: 1.2, amb_wind: 0.5 },
  kiroku: { amb_room: 1 },
  epi_day: { amb_morning: 0.8 },
  epi_dusk: { amb_dusk: 0.8 },
  epi_home: { amb_night: 0.7 },
};
/** 素材の層がある時に弱める合成の層（同じ役） */
export const AMB_SYNTH_ROLE = { amb_rain: 'rain', amb_wind: 'wind', amb_wind_open: 'wind', amb_vent: 'vent', amb_machine: 'vent', amb_sewer: 'vent' };
/** 素材の層の基準の大きさ（ラウドネスを揃えた後の掛け算） */
export const AMB_GAIN = 0.32;

/**
 * 気配（遠い物音）：区画の種類 → 候補。間隔は秒の幅。戦い中・演出中・家・結末・序章のふだんの町では鳴らさない。
 * 位置は聞き手の後ろ寄りに 9〜22m（左右に振れ、遠いほどこもる）。
 */
export const PRESENCE = {
  street: { pool: ['p_creak', 'p_metal', 'p_window', 'p_drag'], every: [30, 70] },
  alley: { pool: ['p_knock', 'p_metal', 'p_window', 'p_drip'], every: [28, 60] },
  plaza: { pool: ['p_metal', 'p_drag', 'p_window'], every: [35, 75] },
  gym: { pool: ['p_creak', 'p_steps', 'p_metal'], every: [30, 65] },
  hospital: { pool: ['p_creak', 'p_iron_knock', 'p_breath', 'p_drag', 'p_steps'], every: [25, 55] },
  tunnel: { pool: ['p_drip', 'p_metal', 'p_breath'], every: [22, 50] },
  office: { pool: ['p_knock', 'p_creak', 'p_steps'], every: [35, 70] },
  lab: { pool: ['p_iron_knock', 'p_metal', 'p_drag'], every: [30, 60] },
  oldwing: { pool: ['p_breath', 'p_drag', 'p_iron_knock', 'p_creak'], every: [24, 50] },
  oldwing_dark: { pool: ['p_breath', 'p_drag', 'p_steps'], every: [20, 45] },
  atrium: { pool: ['p_metal', 'p_creak'], every: [35, 70] },
  ruins: { pool: ['p_window', 'p_metal', 'p_creak'], every: [30, 65] },
  admin: { pool: ['p_iron_knock', 'p_steps', 'p_creak'], every: [30, 60] },
  admin_machine: { pool: ['p_iron_knock', 'p_metal'], every: [30, 60] },
  kiroku: { pool: ['p_steps', 'p_breath'], every: [40, 80] },
};
/** 気配の置き場所（純粋関数）：聞き手 L {x,z,yaw}・乱数 r1,r2 → 位置。後ろ寄り（yaw はカメラの後ろ向き＝forward の逆） */
export function presencePos(L, r1, r2) {
  const back = L.yaw;                                    // カメラの yaw は後ろ向き（forward = -sin,-cos：core/audio.js の _spatial と同じ取り方）＝ (sin, cos) が後ろ
  const a = back + (r1 - 0.5) * 2.4, d = 9 + r2 * 13;   // 後ろ ±69°・9〜22m
  return { x: L.x + Math.sin(a) * d, z: L.z + Math.cos(a) * d, d };
}

/** 曲：役 → 素材 */
export const BGM_TRACKS = {
  ruin: 'bgm_emptycity',
  alley: 'bgm_corridors',
  piano: 'bgm_hauntpiano',
  low: 'bgm_lost',
  under: 'bgm_humidity',
  oldwing: 'bgm_horroratmo',
  battle: 'bgm_tension',
  boss: 'bgm_evilapproach',
  giant: 'bgm_bossbattle',
  ending: 'bgm_firstlight',
};
/** 曲の大きさ（役ごと。設定の BGM 音量と全体の音量が掛かる）。探索はかなり小さく */
export const BGM_LEVEL = { explore: 0.42, battle: 0.7, boss: 0.8, ending: 0.75 };
/**
 * 区画ごとの曲。explore＝探索の曲（null＝鳴らさない）・boss＝その区画のボス戦の曲（無ければ boss）。
 * wait＝区画に入ってから探索の曲を始めるまでの秒・rest＝一度流した後の休み（秒の幅）。無音（環境音だけ）の時間の方を長くする。
 */
export const BGM_AREAS = {
  shotengai: { explore: 'ruin', normal: null, wait: 20, rest: [90, 150] },   // 序章のふだんの町（normal）は鳴らさない
  alley: { explore: 'alley', wait: 15, rest: [80, 140] },
  plaza: { explore: 'alley', wait: 25, rest: [90, 150] },
  shelter: { explore: 'piano', wait: 20, rest: [90, 160] },
  hospital: { explore: 'low', wait: 30, rest: [100, 170] },
  tunnel: { explore: 'under', wait: 15, rest: [80, 140] },
  office: { explore: 'piano', wait: 25, rest: [100, 170] },
  lab: { explore: 'under', wait: 20, rest: [90, 150] },
  yard: { explore: null, boss: 'giant' },
  oldwing: { explore: 'oldwing', wait: 25, rest: [100, 170] },
  atrium: { explore: 'low', wait: 30, rest: [100, 170] },
  town: { explore: null, boss: 'giant' },
  ruins: { explore: 'ruin', wait: 20, rest: [90, 150] },
  avenue: { explore: null, boss: 'giant' },
  admin: { explore: 'low', wait: 30, rest: [110, 180] },
  abyss: { explore: null, boss: 'giant' },
  kiroku: { explore: null },                                                  // 記録の間：無音（環境音だけ）
  epilogue: { explore: null, credits: 'ending' },                            // 結末の場面：曲は流さない（スタッフロールだけ）
};

/**
 * 今鳴らすべき曲（純粋関数）。s = {
 *   area, normal（序章のふだんの町）, credits（スタッフロール中）, boss（ボス戦の最中）, battle（敵対の異形が近い：ヒステリシスは呼ぶ側）,
 *   cut（演出中）, cur（今の役 'explore'|'battle'|'boss'|'ending'|null）, explorePhase（'play'|'wait'|'rest'）, voice（台詞の声が鳴っている）
 * } → { role, track（BGM_TRACKS のキー）|null, level（0〜1） }
 */
export function bgmPlan(s) {
  const A = BGM_AREAS[s.area] || {};
  const duck = (s.voice ? 0.55 : 1) * (s.cut ? 0.6 : 1);
  if (s.credits) return { role: 'ending', track: 'ending', level: BGM_LEVEL.ending };
  if (s.boss) return { role: 'boss', track: A.boss || 'boss', level: BGM_LEVEL.boss * (s.voice ? 0.6 : 1) };
  if (s.battle && !s.cut) return { role: 'battle', track: 'battle', level: BGM_LEVEL.battle };
  if (s.cut && (s.cur === 'battle')) return { role: 'none', track: null, level: 0 };          // 戦いが演出に入ったら曲は引く（間を作る）
  const ex = s.normal && 'normal' in A ? A.normal : A.explore;
  if (!ex) return { role: 'none', track: null, level: 0 };
  if (s.cut && s.cur !== 'explore') return { role: 'none', track: null, level: 0 };           // 演出中に新しく始めない
  if (!s.cut && s.explorePhase !== 'play') return { role: 'none', track: null, level: 0 };
  return { role: 'explore', track: ex, level: BGM_LEVEL.explore * duck };
}

/** 区画に入った時に読む物（純粋関数）：その区画の環境音の層・気配・探索とボスの曲。ファイルの表（files）に有る物だけ */
export function areaLoadList(area, ambKinds, files) {
  const want = new Set();
  for (const k of ambKinds) { for (const id of Object.keys(AMB_MIX[k] || {})) want.add(id); for (const p of ((PRESENCE[k] || {}).pool || [])) for (const id of ((SE_MAP[p] || {}).m || [])) want.add(id); }
  const A = BGM_AREAS[area] || {};
  for (const role of [A.explore, A.normal, A.boss, A.credits]) if (role && BGM_TRACKS[role]) want.add(BGM_TRACKS[role]);
  return [...want].filter(id => files && files[fileOf(id)]);
}
/** 効果音と足音（区画によらない・小さい）の読む物。ファイルの表に有る物だけ */
export function seLoadList(files) {
  const want = new Set();
  for (const s of Object.values(STEPS)) { want.add(s.walk); want.add(s.run); }
  for (const e of Object.values(SE_MAP)) for (const id of e.m) want.add(id);
  return [...want].filter(id => files && files[fileOf(id)]);
}

/** 使っている素材サイト（ファイルの表から）。files の値の id＝素材のキー */
export function usedSources(files) {
  const s = new Set();
  for (const v of Object.values(files || {})) { const m = MATERIALS[v.id]; if (m) s.add(PACKS[m.pack].site); }
  return [...s].sort();
}
/** 使っている素材の作者（曲・効果音に分けて、名前の順）。Kenney は効果音の先頭 */
export function usedAuthors(files) {
  const bgm = new Set(), se = new Set();
  for (const v of Object.values(files || {})) { const m = MATERIALS[v.id]; if (!m) continue; (m.kind === 'bgm' ? bgm : se).add(PACKS[m.pack].author); }
  const sort = a => [...a].sort((x, y) => (x === 'Kenney' ? -1 : y === 'Kenney' ? 1 : x.localeCompare(y, 'en', { sensitivity: 'base' })));
  return { bgm: sort(bgm), se: sort(se) };
}
/** タイトルの注記の文（使っている物だけ。無ければ ''） */
export function audioCreditText(files) {
  const u = usedSources(files); if (!u.length) return '';
  return '音の素材：' + u.map(k => SOURCES[k].name).join('・') + ' の作者のみなさん（CC0）';
}
/** 名前を長すぎない行に分ける（スタッフロール用） */
function packLines(names, per = 5) { const out = []; for (let i = 0; i < names.length; i += per) out.push(names.slice(i, i + per).join('・')); return out; }
/** スタッフロールの行に音の素材の表記を足す（「使わせてもらったもの」の前）。使っていなければそのまま。CC0 でも作者名を載せる */
export function withAudioCredits(lines, files) {
  const u = usedSources(files); if (!u.length) return lines;
  const A = usedAuthors(files), add = [['s', '音楽・効果音（CC0 の素材）']];
  if (A.bgm.length) { add.push(['p', '音楽']); for (const l of packLines(A.bgm)) add.push(['p', l]); }
  if (A.se.length) { add.push(['p', '効果音・環境音']); for (const l of packLines(A.se)) add.push(['p', l]); }
  add.push(['p', u.map(k => SOURCES[k].name + '　' + SOURCES[k].url).join('　')]);
  const i = lines.findIndex(l => l[0] === 's' && l[1] === '使わせてもらったもの');
  return i < 0 ? lines.concat(add) : lines.slice(0, i).concat(add, lines.slice(i));
}
