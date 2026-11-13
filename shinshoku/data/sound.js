// 音の素材の対応表（無料素材サイトの音：効果音ラボ・魔王魂）。2026-11-13
// 規約の要点・出典・取得の状態は docs/shinshoku/AUDIO_CREDITS.md。
// ・素材の変換済みファイルは shinshoku/assets/sound/ に置き、実際に置いた物の表を data/sound_files.js（tools/sound/prepare.mjs が作る）に持つ。
//   表に無い（＝置いていない）素材は読まない。読めない・まだ読んでいない音は core/audio.js の合成音で鳴る（フォールバック）。
// ・起動時には何も読まない。遊びが始まって起動の後読み（bootMs.lateAt）が過ぎてから、区画に入った時にその区画の環境音・BGM を、
//   続いて効果音を少しずつ読む（core/soundbank.js）。
// ・怖さの方向は「じわじわ型」：環境音の層・間・遠くの気配（PRESENCE）で不安を作り、驚かし（mimic_reveal 等）は要所だけ。
//   BGM は常には鳴らさない（BGM_AREAS：探索は一度流したら長く休む・家と結末と序章のふだんの町は鳴らさない）。
// 純粋なデータと関数だけ（node でテストする：tests/shinshoku-audio.test.mjs）。

/** 素材サイト。credit＝規約が求める（または勧める）表記。required＝表記が必須か */
export const SOURCES = {
  sel: { name: '効果音ラボ', url: 'https://soundeffect-lab.info/', terms: 'https://soundeffect-lab.info/agreement/', credit: '効果音：効果音ラボ', required: false },
  maou: { name: '魔王魂', url: 'https://maou.audio/', terms: 'https://maou.audio/rule/', credit: '音楽：魔王魂', creditSe: '効果音：魔王魂', required: true },
};

const sel = (path, title, kind, o = {}) => Object.assign({ src: 'sel', path, page: '/sound/' + path.split('/')[0] + '/', title, kind }, o);
const maou = (path, title, kind, o = {}) => Object.assign({ src: 'maou', path, page: o.page || '/', title, kind }, o);

/**
 * 使う素材（選んだ物）。キー＝出力ファイルの名前（assets/sound/<kind>/<キー>.mp3）。
 * kind：step（足音：一続きの録音から 1 歩ずつ切り出す）・amb（環境音：つなぎ目なしで繰り返す）・se（効果音）・bgm（曲）
 * 魔王魂の曲は規約（二次配布の時はファイル名に maoudamashii を含める）に合わせ、キーを maoudamashii_… にする。
 */
export const MATERIALS = {
  // ── 足音（効果音ラボ「生活」）：地面の種類ごと・歩きと走り
  step_asphalt: sel('various/mp3/walk-asphalt1.mp3', 'アスファルトの上を歩く1', 'step'),
  step_asphalt_run: sel('various/mp3/dash-asphalt1.mp3', 'アスファルトの上を走る1', 'step'),
  step_wet: sel('various/mp3/walk-wet1.mp3', '雨で濡れた道路を歩く', 'step'),
  step_wet_run: sel('various/mp3/dash-wet1.mp3', '雨で濡れた道路を走る', 'step'),
  step_tile: sel('various/mp3/walk-leather-shoes1.mp3', '革靴で歩く', 'step'),
  step_tile_run: sel('various/mp3/dash-leather-shoes1.mp3', '革靴で走る', 'step'),
  step_wood: sel('various/mp3/walk-school1.mp3', '学校の廊下を歩く', 'step'),
  step_wood_run: sel('various/mp3/dash-school1.mp3', '学校の廊下を走る', 'step'),
  step_gym: sel('various/mp3/walk-gymnasium1.mp3', '体育館で歩く', 'step'),
  step_gym_run: sel('various/mp3/dash-gymnasium1.mp3', '体育館で走る', 'step'),
  // ── 環境音の層（効果音ラボ「環境音」「機械」）
  amb_rain: sel('environment/mp3/rain2.mp3', '雨が降る2（街の小雨）', 'amb'),
  amb_wind: sel('environment/mp3/wind3.mp3', '風が吹く3（不気味な音を立てる）', 'amb'),
  amb_wind_open: sel('environment/mp3/wind1.mp3', '風が吹く1', 'amb'),
  amb_vent: sel('machine/mp3/airconditioning1.mp3', 'エアコン', 'amb', { page: '/sound/machine/' }),
  amb_machine: sel('environment/mp3/industrialzone1.mp3', '工業地帯', 'amb'),
  amb_sewer: sel('environment/mp3/sewer1.mp3', '下水道', 'amb'),
  amb_room: sel('environment/mp3/class-room-quiet1.mp3', 'シーンと静まり返る教室', 'amb'),
  amb_town: sel('environment/mp3/quiet-residential-area1.mp3', '閑静な住宅街1', 'amb'),
  amb_morning: sel('environment/mp3/sparrow-morning1.mp3', 'スズメが鳴く朝', 'amb'),
  amb_dusk: sel('environment/mp3/evening-crow1.mp3', 'カラスが鳴く夕方', 'amb'),
  amb_night: sel('environment/mp3/summer-night-country1.mp3', '夏の田舎の夜', 'amb'),
  // ── 気配（遠くで、時々。位置を持たせて小さく・こもらせる）
  p_creak: sel('various/mp3/door-old-open1.mp3', '古びたドアを開ける', 'se'),
  p_knock: sel('various/mp3/door-wood-knock1.mp3', '木のドアをノック1', 'se'),
  p_iron_knock: sel('various/mp3/door-iron-knock1.mp3', '鉄のドアをノック1', 'se'),
  p_window: sel('various/mp3/wind-knock1.mp3', '窓をノック1', 'se'),
  p_metal: sel('various/mp3/iron-stick1.mp3', '鉄の棒を落とす', 'se'),
  p_breath: sel('battle/mp3/zombie-breath1.mp3', 'ゾンビの息遣い', 'se'),
  p_drip: sel('various/mp3/water-drop-potapota1.mp3', '水滴がポタポタ', 'se'),
  p_drag: maou('se/maou_se_sound07.mp3', '何かを引きづる音（sound07）', 'se', { page: '/category/se/' }),
  // ── 戦い（効果音ラボ「戦闘」）
  se_katana_swing1: sel('battle/mp3/katana-gesture1.mp3', '刀の素振り1', 'se'),
  se_katana_swing2: sel('battle/mp3/katana-gesture2.mp3', '刀の素振り2', 'se'),
  se_sword_swing: sel('battle/mp3/sword-gesture1.mp3', '剣の素振り1', 'se'),
  se_heavy_swing: sel('battle/mp3/kick-real-swing1.mp3', 'キックの素振り1', 'se'),
  se_claw_swing: sel('battle/mp3/punch-real-swing3.mp3', 'パンチの素振り3', 'se'),
  se_katana_slash1: sel('battle/mp3/katana-slash1.mp3', '刀で斬る1', 'se'),
  se_katana_slash2: sel('battle/mp3/katana-slash2.mp3', '刀で斬る2', 'se'),
  se_katana_slash3: sel('battle/mp3/katana-slash3.mp3', '刀で斬る3', 'se'),
  se_katana_slash4: sel('battle/mp3/katana-slash4.mp3', '刀で斬る4', 'se'),
  se_katana_slash5: sel('battle/mp3/katana-slash5.mp3', '刀で斬る5', 'se'),
  se_iainuki: sel('battle/mp3/iainuki1.mp3', '居合抜き1', 'se'),
  se_knife_slash: sel('battle/mp3/knife-slash-1.mp3', 'ナイフで切る', 'se'),
  se_blow1: sel('battle/mp3/blow1.mp3', '打撃1', 'se'),
  se_blow2: sel('battle/mp3/blow2.mp3', '打撃2', 'se'),
  se_blow6: sel('battle/mp3/blow6.mp3', '打撃6', 'se'),
  se_katana_clash1: sel('battle/mp3/katana-clash1.mp3', '刀で打ち合う1', 'se'),
  se_katana_clash2: sel('battle/mp3/katana-clash2.mp3', '刀で打ち合う2', 'se'),
  se_katana_hold: sel('battle/mp3/katana-hold1.mp3', '刀を構える', 'se'),
  se_growl: sel('battle/mp3/lion-cry3.mp3', 'ライオンの鳴き声3（唸り声）', 'se', { page: '/sound/animal/' }),
  se_handgun: sel('battle/mp3/handgun-firing1.mp3', '拳銃を撃つ', 'se'),
  se_handgun_empty: sel('battle/mp3/handgun-out-bullets1.mp3', '拳銃の弾切れ', 'se'),
  se_handgun_ready: sel('battle/mp3/handgun-ready1.mp3', '拳銃をチャッと構える', 'se'),
  se_cloth: sel('battle/mp3/rubbing-clothes-kick1.mp3', 'キックの衣擦れ1', 'se'),
  se_down: sel('battle/mp3/real-down1.mp3', '倒れる', 'se'),
  se_large_slash: sel('battle/mp3/large-sword-slash1.mp3', '大剣で斬る', 'se'),
  // ── 異形の声・予兆（ゾンビの声・唸り・不協和音。驚かしの音は要所だけで使う）
  se_zombie1: sel('battle/mp3/zombie-voice1.mp3', 'ゾンビの声1', 'se'),
  se_zombie2: sel('battle/mp3/zombie-voice2.mp3', 'ゾンビの声2', 'se'),
  se_zombie3: sel('battle/mp3/zombie-voice3.mp3', 'ゾンビの声3', 'se'),
  se_ghost: maou('se/maou_se_voice_monster03.mp3', '幽霊的な（voice_monster03）', 'se', { page: '/category/se/' }),
  se_dragon: sel('battle/mp3/dragon-cry1.mp3', 'ドラゴンの鳴き声1', 'se'),
  se_monster_step: sel('battle/mp3/monster-footstep1.mp3', '怪獣の足音', 'se'),
  se_tremor: sel('battle/mp3/earth-tremor1.mp3', '地響き', 'se'),
  se_quake: sel('battle/mp3/magic-quake1.mp3', '地震魔法1', 'se'),
  se_tentacle: sel('battle/mp3/tentacle1.mp3', 'うごめく触手', 'se'),
  se_electron: sel('battle/mp3/magic-electron1.mp3', '雷魔法1', 'se'),
  se_approach: sel('anime/mp3/approaching-fear1.mp3', '迫り来る恐怖', 'se'),
  se_dissonance: sel('anime/mp3/dissonance1.mp3', '恐怖の不協和音', 'se'),
  se_heart: sel('anime/mp3/heart1.mp3', '心臓の鼓動1', 'se'),
  // ── 扉・物音・機械（効果音ラボ「生活」「機械」「演出」）
  se_door_old: sel('various/mp3/door-old-open1.mp3', '古びたドアを開ける', 'se'),
  se_door_open: sel('various/mp3/door-open3.mp3', 'ドアを開ける3', 'se'),
  se_knock_wood: sel('various/mp3/door-wood-knock1.mp3', '木のドアをノック1', 'se'),
  se_iron_door_close: sel('various/mp3/iron-door-close1.mp3', '鉄の扉を閉める', 'se'),
  se_glass: sel('various/mp3/glass-break2.mp3', 'ガラスが割れる2', 'se'),
  se_collapse_little: sel('battle/mp3/building-collapse-little2.mp3', '建物が少し崩れる2', 'se'),
  se_wall_break: sel('battle/mp3/wall-destruction1.mp3', 'パンチで壁を破壊', 'se'),
  se_gas: sel('various/mp3/gas1.mp3', 'ガスが噴き出す', 'se'),
  se_evaporate: sel('various/mp3/water-evaporation1.mp3', '水がジューッと蒸発', 'se'),
  se_iron_plate: sel('various/mp3/iron-plate1.mp3', '鉄板を叩く1', 'se'),
  se_switch: sel('various/mp3/electricity-switch1.mp3', '電気のスイッチを入れる', 'se'),
  se_spark: sel('various/mp3/electricity1.mp3', '電気バチバチ', 'se'),
  se_drop: sel('various/mp3/water-drop1.mp3', '水滴1', 'se'),
  se_alert: sel('anime/mp3/emergency-alert1.mp3', '警報が鳴る', 'se'),
  se_black_phone: sel('machine/mp3/phone-black-ringtone1.mp3', '黒電話のベルが鳴る', 'se'),
  se_phone_cut: sel('machine/mp3/phone-cut2.mp3', '電話が切れる2', 'se'),
  se_pa_start: sel('anime/mp3/broadcasting-start1.mp3', '放送開始チャイム', 'se'),
  se_radio_noise: sel('machine/mp3/snow-noise1.mp3', 'トランシーバーのノイズ', 'se'),
  // ── BGM（魔王魂）。どれも不穏・静かな物を選び、探索は小さく・時々だけ
  maoudamashii_cyber19: maou('bgm/maou_bgm_cyber19.mp3', 'サイバー19（廃墟を探索しているかのような）', 'bgm', { page: '/bgm_cyber19/' }),
  maoudamashii_fantasy09: maou('bgm/maou_bgm_fantasy09.mp3', 'ファンタジー09（現代的でややホラーな探索）', 'bgm', { page: '/bgm_fantasy09/' }),
  maoudamashii_piano22: maou('bgm/maou_bgm_piano22.mp3', 'ピアノ22（暗いピアノ）', 'bgm', { page: '/bgm_piano22/' }),
  maoudamashii_cyber45: maou('bgm/maou_bgm_cyber45.mp3', 'サイバー45（主張が低い）', 'bgm', { page: '/bgm_cyber45/' }),
  maoudamashii_cyber34: maou('bgm/maou_bgm_cyber34.mp3', 'サイバー34（地下探索）', 'bgm', { page: '/bgm_cyber34/' }),
  maoudamashii_neorock67: maou('bgm/maou_bgm_neorock67.mp3', 'ネオロック67（不気味なゆったり）', 'bgm', { page: '/bgm_neorock67/' }),
  maoudamashii_orchestra21: maou('bgm/maou_bgm_orchestra21.mp3', 'オーケストラ21（緊迫感）', 'bgm', { page: '/bgm_orchestra21/' }),
  maoudamashii_orchestra12: maou('bgm/maou_bgm_orchestra12.mp3', 'オーケストラ12（ボス・通常戦）', 'bgm', { page: '/bgm_orchestra12/' }),
  maoudamashii_orchestra17: maou('bgm/maou_bgm_orchestra17.mp3', 'オーケストラ17（怪物映画風）', 'bgm', { page: '/bgm_orchestra17/' }),
  maoudamashii_orchestra26: maou('bgm/maou_bgm_orchestra26.mp3', 'オーケストラ26（戦いが終わった後の静かな朝日）', 'bgm', { page: '/bgm_orchestra26/' }),
};

/** 出力ファイル（assets/sound/ からの相対） */
export const fileOf = id => { const m = MATERIALS[id]; return m ? m.kind + '/' + id + '.mp3' : null; };
/** 素材の元の URL（記録用。ダウンロードは素材サイトの各ページから人の手で） */
export const sourceUrl = id => { const m = MATERIALS[id]; return m ? SOURCES[m.src].url + (m.src === 'sel' ? 'sound/' : 'sound/') + m.path : null; };

/**
 * 効果音：音の名前（core/audio.js の Sfx.play の名前）→ 素材。m＝候補（ランダムに 1 つ）、g＝音量、r＝再生速度の幅。
 * ここに無い名前（UI の音・一閃の準備・相棒の悲鳴・変身 等）は合成音のまま。
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
  phone_ring: { m: ['se_black_phone'], g: 0.45 },
  pa_chime: { m: ['se_pa_start'], g: 0.45, r: [0.94, 0.94] },   // 少し低く（館内放送の名残）
  pa_cut: { m: ['se_phone_cut'], g: 0.5 },
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
};
/** 気配の名前（合成音のフォールバックもある：core/audio.js） */
export const PRESENCE_NAMES = ['p_creak', 'p_knock', 'p_iron_knock', 'p_window', 'p_metal', 'p_breath', 'p_drip', 'p_drag', 'p_steps'];

/** 足音：地面の種類 → 歩き・走りの素材（1 歩ずつの切り出しは sound_files.js の slices） */
export const STEPS = {
  asphalt: { walk: 'step_asphalt', run: 'step_asphalt_run', g: 0.5 },
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
  ruin: 'maoudamashii_cyber19',
  alley: 'maoudamashii_fantasy09',
  piano: 'maoudamashii_piano22',
  low: 'maoudamashii_cyber45',
  under: 'maoudamashii_cyber34',
  oldwing: 'maoudamashii_neorock67',
  battle: 'maoudamashii_orchestra21',
  boss: 'maoudamashii_orchestra12',
  giant: 'maoudamashii_orchestra17',
  ending: 'maoudamashii_orchestra26',
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

/** 使っている素材サイト（ファイルの表から）。files のキー＝ファイル名、値の src＝素材の id */
export function usedSources(files) {
  const s = new Set();
  for (const v of Object.values(files || {})) { const m = MATERIALS[v.id]; if (m) s.add(m.src); }
  return [...s].sort();
}
/** タイトルの注記の文（使っている物だけ。無ければ ''） */
export function audioCreditText(files) {
  const u = usedSources(files); if (!u.length) return '';
  const hasMaouSe = Object.values(files).some(v => MATERIALS[v.id] && MATERIALS[v.id].src === 'maou' && MATERIALS[v.id].kind !== 'bgm');
  const hasMaouBgm = Object.values(files).some(v => MATERIALS[v.id] && MATERIALS[v.id].src === 'maou' && MATERIALS[v.id].kind === 'bgm');
  const parts = [];
  if (hasMaouBgm) parts.push(SOURCES.maou.credit);
  if (u.includes('sel')) parts.push(SOURCES.sel.credit);
  if (hasMaouSe) parts.push(SOURCES.maou.creditSe);
  return parts.join('・');
}
/** スタッフロールの行に音の素材の表記を足す（「使わせてもらったもの」の前）。使っていなければそのまま */
export function withAudioCredits(lines, files) {
  const t = audioCreditText(files); if (!t) return lines;
  const add = [['s', '音楽・効果音（無料素材）'], ...t.split('・').map(x => ['p', x]), ['p', usedSources(files).map(k => SOURCES[k].url).join('　')]];
  const i = lines.findIndex(l => l[0] === 's' && l[1] === '使わせてもらったもの');
  return i < 0 ? lines.concat(add) : lines.slice(0, i).concat(add, lines.slice(i));
}
