// 区画のデータ（LEVEL_DESIGN_SPEC §1・§2）。形は world/areas.js・world/level.js が作り、ここは敵・拾う物・つながりを持つ。
// 名前・人名・番号はすべて【仮】。商店街（shotengai）は data/level.js。
// つながり：shotengai（自宅を含む）─[空き店舗の奥]─ alley ─ plaza（商業施設の前）─ shelter（避難所：市民体育館）
export const AREA_GRAPH = {
  shotengai: { name: 'あけぼの通り商店街（仮）', exits: ['alley'] },
  alley: { name: '裏路地', exits: ['shotengai', 'plaza'] },
  plaza: { name: '商業施設の前（仮：ことぶきショッピングセンター）', exits: ['alley', 'shelter'] },
  shelter: { name: '避難所（市民体育館）', exits: ['plaza', 'hospital', 'tunnel', 'office'] },
  hospital: { name: '病院（仮：あけぼの台中央病院）', exits: ['shelter', 'tunnel'] },
  tunnel: { name: '地下通路（病院の地下 → 避難所）', exits: ['hospital', 'shelter'] },
  // 第4章【仮】：観測分室（境界事象と同じ組織の別の分室・地上）→ 地下研究区画 → 搬入ヤード（reveal の巨大戦だけ）
  office: { name: '観測分室（仮：第二分室）', exits: ['shelter', 'lab'] },
  lab: { name: '地下研究区画（仮：第二研究区画）', exits: ['office', 'yard', 'oldwing'] },
  yard: { name: '研究施設の搬入ヤード（巨大猫又の戦場）', exits: ['lab', 'oldwing'], routeOnly: 'reveal' },
  // 第5章【仮】：旧研究棟（収容棟）。reveal は搬入ヤードの崩れた壁から、secret は地下研究区画の連絡通路から入る → 観測棟の吹き抜け（継接）
  oldwing: { name: '旧研究棟（収容棟）', exits: ['lab', 'yard', 'atrium'] },
  atrium: { name: '観測棟の吹き抜け', exits: ['oldwing', 'town'] },
  // 第6章A の冒頭：巨大用の町（reveal だけ。secret は町を壊さない）
  town: { name: '置き換えの始まった町（巨大用の区画）', exits: ['atrium'], routeOnly: 'reveal' },
};

export const AREA_DATA = {
  alley: {
    kiro: [
      // 喫茶「灯」の店主（相棒の知り合い）。道を開けると素通りする（倒さずに抜けられる最初の例）
      { id: 'kiro_a1', door: 'a1', name: '坂口', color: 0x8ad0c0, path: [[0, -2], [0, -12], [0.2, -21.5], [7, -22], [14.5, -22]], start: 0, home: [14.5, -22], provisional: true },
    ],
    doors: { a1: { name: '坂口', x: 15.2, z: -22, face: -1, color: 0x8ad0c0, front: [14.5, -22], alongX: true } },
    pickups: [
      { id: 'al_ammo_1', item: 'ammo_small', pos: [-1.0, -18.5] },
      { id: 'al_med_1', item: 'medkit_s', pos: [10.5, -23.4] },
    ],
  },
  plaza: {
    kiro: [
      { id: 'kiro_p1', door: 'p1', name: '（バス停の人）', color: 0xc0a0e0, path: [[-6, 7], [-1, 3.5], [6, 3.5], [8, -3], [2, -5], [-5, -2]], start: 0, loop: true, provisional: true },
      { id: 'kiro_p2', door: 'p2', name: '（帰りの人）', color: 0xe0c070, path: [[12, 6], [6, 8], [-2, 9], [-9, 6]], start: 2, provisional: true },
    ],
    doors: {},
    pickups: [
      { id: 'pl_ammo_1', item: 'ammo_box', pos: [-7.5, 10.2] },
      { id: 'pl_med_1', item: 'medkit_s', pos: [12.4, -10.5] },
      { id: 'pl_coffee', item: 'coffee', pos: [-12.2, -9.6] },
    ],
  },
  shelter: {
    pickups: [
      { id: 'sh_ammo_1', item: 'ammo_box', pos: [-4.8, 17.6] },
      { id: 'sh_med_1', item: 'medkit_l', pos: [4.6, 12.0] },
      { id: 'sh_ammo_2', item: 'ammo_small', pos: [-12.5, -11.5] },
      { id: 'sh_med_2', item: 'medkit_s', pos: [12.5, 7.5] },
    ],
    boss: { id: 'shuuyou_1', pos: [0, -5], storage: { minX: 14.3, maxX: 19.5, minZ: -9.2, maxZ: 0.8 }, arena: { minX: -13.6, maxX: 13.6, minZ: -14.5, maxZ: 9.5 } },
  },
  // 第3章【仮】病院：受付（待合）→ 廊下 → ナースステーション（カルテ）・処置室（任意）→ 病棟（301〜306）→ 奥の階段（地下 1 階）
  hospital: {
    kanja: [
      { id: 'kanja_1', path: [[6.5, 15.2], [4.0, 12.6], [1.6, 11.6]], bed: [6.5, 15.2] },
      { id: 'kanja_2', path: [[-1.2, -10.6], [-1.2, -3.0], [-1.0, 3.4]], bed: [-5.5, -11] },
      { id: 'kanja_3', path: [[1.2, -5.0], [1.2, -12.0], [1.0, -19.0]], bed: [5.5, -5] },
      { id: 'kanja_4', path: [[-6.0, -4.6], [-3.2, -4.6]], bed: [-6.0, -4.6] },
    ],
    mimics: [{ id: 'mimic_h1', pos: [-6.2, 13.9], yaw: 0.3, disguise: 'civilian', lure: 'mimic_lure_visitor' }],
    twist: { mamori: { id: 'mamori', pos: [6.6, -16.8], child: [9.0, -17.2] }, mimics: [{ id: 'mimic_t1', pos: [8.3, -14.9] }, { id: 'mimic_t2', pos: [8.3, -20.0] }, { id: 'mimic_t3', pos: [3.0, -19.6] }] },
    pickups: [
      { id: 'ho_ammo_1', item: 'ammo_small', pos: [-7.6, 4.6] },
      { id: 'ho_med_1', item: 'medkit_s', pos: [-8.6, 17.4] },
      { id: 'ho_med_2', item: 'medkit_l', pos: [7.8, 4.8] },
      { id: 'ho_coffee', item: 'coffee', pos: [2.8, 10.2] },
      { id: 'ho_ammo_2', item: 'ammo_box', pos: [-7.8, -17.6] },
    ],
  },
  // 地下通路：階段の下 → 細い通路（くぼみ・配管）→ 分かれ道の広場（写し身）・詰所（防火シャッター）→ 北の階段（避難所のロビーへ）
  tunnel: {
    mimics: [
      { id: 'mimic_u1', pos: [0.4, -15.0], yaw: 0, disguise: 'companion', lure: 'mimic_lure_companion' },
      { id: 'mimic_u2', pos: [-3.6, -8.0], yaw: Math.PI / 2, dormant: true },
    ],
    boss: { id: 'utsushimi', pos: [0, -35] },
    refuge: { x: 10.5, z: -29, door: [8.0, -29] },
    pickups: [
      { id: 'tu_ammo_1', item: 'ammo_small', pos: [2.0, -6.2] },
      { id: 'tu_med_1', item: 'medkit_s', pos: [1.8, -19.6] },
      { id: 'tu_med_2', item: 'medkit_l', pos: [-7.0, -24.0] },
      { id: 'tu_ammo_2', item: 'ammo_box', pos: [7.0, -40.5] },
    ],
  },
};

// 病院の「記録のない患者」【必須の調べ物・仮】：病室の札（6 枚）とカルテ棚（6 冊）を照らし合わせ、カルテの無い患者を選ぶ。
// 306 の棚にあるカルテは「退院済み」の別人（大庭 フク）＝ 306 の札の人（小野寺 ケイ）には記録が無い。答え → 306 の鍵（鍵箱）。
// 東 ミヨのカルテと本人の記憶が食い違う（「転んでない」）＝置き換えの最初の証拠（SCENARIO_FLOW 第2章の病院の要素をここで）。名前はすべて【仮】。
export const HOSP = {
  provisional: true,
  plates: [['301', '東 ミヨ'], ['302', '西川 ゲン'], ['303', '北原 サト'], ['304', '南 タケル'], ['305', '日向 ユウ（小児・7）'], ['306', '小野寺 ケイ']],
  charts: [
    { name: '東 ミヨ', room: '301', note: '右大腿骨 骨折（10/12 自宅で転倒）。※本人「転んでない。昨日も歩いて買い物に行った」' },
    { name: '西川 ゲン', room: '302', note: '肺炎。10/10 入院' },
    { name: '北原 サト', room: '303', note: '術後の経過観察' },
    { name: '南 タケル', room: '304', note: '検査入院（10/14〜）' },
    { name: '日向 ユウ', room: '305', note: '小児科・発熱。母親は面会の予定（10/14 夜）' },
    { name: '大庭 フク', room: '306', note: '10/11 退院（306 は空床）' },
  ],
  answerRoom: '306',
};


// 避難者名簿（42 人・6 班×7 人）。受付票が無い人（未着）は各班に 1 人。名前はすべて【仮】・実在の人物とは関係ない。
// 未着のうち 5 人は商店街の帰路の表札と同じ名字（A〜E 班）。F 班の未着（42 番）が避難所の収容者（名札「No.4?」）。
export const ROSTER = {
  provisional: true,
  groups: ['A', 'B', 'C', 'D', 'E', 'F'],
  people: [
    ['青木 ハル', 'A'], ['井上 タケシ', 'A'], ['笹木 ミツオ', 'A', 'missing'], ['内田 リョウ', 'A'], ['大野 サチ', 'A'], ['加藤 ユウジ', 'A'], ['北村 ナオ', 'A'],
    ['工藤 マサエ', 'B'], ['小松 ジン', 'B'], ['坂本 チエ', 'B'], ['松尾 ヨシコ', 'B', 'missing'], ['柴田 コウ', 'B'], ['杉山 アヤ', 'B'], ['関 ミノル', 'B'],
    ['高田 フミ', 'C'], ['川原 イサム', 'C', 'missing'], ['田中 ユキ', 'C'], ['千葉 ケン', 'C'], ['土屋 ハナ', 'C'], ['中川 シゲル', 'C'], ['西田 ミホ', 'C'],
    ['野口 トオル', 'D'], ['橋本 カズ', 'D'], ['野中 キヨ', 'D', 'missing'], ['平野 マコト', 'D'], ['福田 エミ', 'D'], ['星野 ダイ', 'D'], ['前田 ルミ', 'D'],
    ['松本 ヒロ', 'E'], ['三浦 セツ', 'E'], ['村上 ショウ', 'E'], ['森 カオル', 'E'], ['石田 ゲンゾウ', 'E', 'missing'], ['山口 アキ', 'E'], ['吉田 ノボル', 'E'],
    ['渡辺 ミチ', 'F'], ['和田 ソウ', 'F'], ['今井 ユリ', 'F'], ['岡田 ツトム', 'F'], ['小川 ナツ', 'F'], ['片山 ジュン', 'F'], ['久住 トキ', 'F', 'missing', 'shuuyou'],
  ],
};
