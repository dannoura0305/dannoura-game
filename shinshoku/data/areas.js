// 区画のデータ（LEVEL_DESIGN_SPEC §1・§2）。形は world/areas.js・world/level.js が作り、ここは敵・拾う物・つながりを持つ。
// 名前・人名・番号はすべて【仮】。商店街（shotengai）は data/level.js。
// つながり：shotengai（自宅を含む）─[空き店舗の奥]─ alley ─ plaza（商業施設の前）─ shelter（避難所：市民体育館）
export const AREA_GRAPH = {
  shotengai: { name: 'あけぼの通り商店街（仮）', exits: ['alley'] },
  alley: { name: '裏路地', exits: ['shotengai', 'plaza'] },
  plaza: { name: '商業施設の前（仮：ことぶきショッピングセンター）', exits: ['alley', 'shelter'] },
  shelter: { name: '避難所（市民体育館）', exits: ['plaza'] },
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
