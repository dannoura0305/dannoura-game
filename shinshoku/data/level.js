// 切片の区画：発生後（outbreak）の商店街＋だんのうらの自宅（LEVEL_DESIGN_SPEC §1・§5）。灰色の箱＋簡単な色。
// 座標：x＝通りの横（左が −）、z＝通りの奥（奥ほど −）、y＝上。単位 m。
// 町の名前・通りの名前は未決定（Q4）。看板の「あけぼの通り」は【仮】の表示名。
export const LEVEL = {
  id: 'shotengai', state: 'outbreak', provisional: true,
  streetName: 'あけぼの通り商店街', streetNameProvisional: true,
  street: { minX: -4.5, maxX: 4.5, minZ: -72, maxZ: 6 },
  start: { pos: [0, 0, 11.5], yaw: Math.PI },
  // 自宅：玄関（z 6〜9）と居間（z 9〜16）
  home: { minX: -6, maxX: 6, minZ: 6, maxZ: 16, door: { x: 0, w: 1.4 } },
  // 店（左：x −4.5〜−10、右：x 4.5〜10）。shutter：閉じたシャッター、sign：看板、awn：ひさしの色
  shops: [
    { side: -1, z0: -4, z1: -10, sign: 'たばこ・雑貨', awn: 0x7a3030, note: 'しばらく休業します' },
    { side: -1, z0: -10, z1: -16, sign: '理容 ささき', awn: 0x304a7a, door: 'k1' },
    { side: -1, z0: -16, z1: -22, sign: '青果 まるやま', awn: 0x3a6a30 },
    { side: -1, z0: -22, z1: -28, sign: 'クリーニング', awn: 0x3a5a7a, note: 'お預かり品の受け取りは…' },
    { side: -1, z0: -31, z1: -37, sign: '喫茶 灯', awn: 0x6a4a30, vending: true },
    { side: -1, z0: -37, z1: -43, sign: '本と文具', awn: 0x5a3a6a },
    { side: -1, z0: -43, z1: -49, sign: '精肉 たけだ', awn: 0x7a2a2a },
    { side: -1, z0: -49, z1: -55, sign: '銭湯 ゆのか', awn: 0x2a5a6a },
    { side: -1, z0: -55, z1: -61, sign: '和菓子', awn: 0x6a3a50, door: 'k4' },
    { side: -1, z0: -61, z1: -72, sign: '空き店舗', awn: 0x3a3a3a, note: 'テナント募集' },
    { side: 1, z0: -4, z1: -10, sign: '薬局', awn: 0x2a6a4a },
    { side: 1, z0: -10, z1: -16, sign: '文具 ふでや', awn: 0x6a5a2a, board: true },
    { side: 1, z0: -16, z1: -22, sign: '時計・めがね', awn: 0x4a4a6a, door: 'k2', clock: true },
    { side: 1, z0: -22, z1: -28, sign: '花屋', awn: 0x7a4a6a },
    { side: 1, z0: -28, z1: -35, sign: '電器', awn: 0x3a4a5a },
    { side: 1, z0: -35, z1: -45, sign: '食品スーパー ことぶき', awn: 0x2f8f5a, open: true },
    { side: 1, z0: -45, z1: -52, sign: '酒店', awn: 0x5a3a2a },
    { side: 1, z0: -55, z1: -61, sign: '写真館', awn: 0x4a3a5a },
    { side: 1, z0: -61, z1: -72, sign: '靴', awn: 0x3a3a4a, note: '閉店セール' },
  ],
  // 脇道（行き止まり）
  alleys: [
    { side: -1, z0: -28, z1: -31, len: 12, door: 'k3' },
    { side: 1, z0: -52, z1: -55, len: 12, door: 'k5' },
  ],
  // 帰路の家の戸（表札・灯りの色＝その帰路のマフラーの色）。front：戸の前（道の側）
  doors: {
    k1: { name: '笹木', x: -4.5, z: -13, face: 1, color: 0xd04848, front: [-3.8, -13] },
    k2: { name: '松尾', x: 4.5, z: -19, face: -1, color: 0xe0c040, front: [3.8, -19] },
    k3: { name: '川原', x: -16, z: -29.5, face: 1, color: 0x50b060, front: [-15.2, -29.5], alongX: true },
    k4: { name: '野中', x: -4.5, z: -58, face: 1, color: 0x4a7ae0, front: [-3.8, -58] },
    k5: { name: '石田', x: 16, z: -53.5, face: -1, color: 0xe08a3a, front: [15.2, -53.5], alongX: true },
  },
  // 帰路の帰り道（最後の点＝家の戸の前）
  kiro: [
    { id: 'kiro_1', door: 'k1', path: [[1.6, -33], [1.2, -25], [-1.0, -17], [-3.8, -13]], start: 0 },
    { id: 'kiro_2', door: 'k2', path: [[-1.8, -47], [-1.2, -36], [1.8, -26], [3.8, -19]], start: 1 },
    { id: 'kiro_3', door: 'k3', path: [[0.5, -18], [-1.5, -29.5], [-9, -29.5], [-15.2, -29.5]], start: 0 },
    { id: 'kiro_4', door: 'k4', path: [[2.2, -45], [1.4, -52], [-3.8, -58]], start: 0 },
    { id: 'kiro_5', door: 'k5', path: [[-1.2, -66], [1.5, -53.5], [9, -53.5], [15.2, -53.5]], start: 1 },
  ],
  // 閉店の店（右側・z −35〜−45）
  heiten: {
    id: 'heiten_1', start: [8.2, -40], center: [7.6, -40], leash: 9,
    zone: { minX: 4.5, maxX: 11, minZ: -45, maxZ: -35 },
    stations: { lights: [10.0, -36.1], register: [9.4, -42.4], shutter: [5.4, -40], bow: [3.9, -40] },
    help: { lights: [10.85, -35.6], register: [9.6, -43.5], sign: [4.0, -36.2] },
  },
  // 拾える物
  pickups: [
    { id: 'it_ammo_01', item: 'ammo_box', pos: [-3.6, -23.5] },
    { id: 'it_ammo_02', item: 'ammo_box', pos: [3.7, -48.5] },
    { id: 'it_ammo_03', item: 'ammo_box', pos: [12.5, -54.5] },
    { id: 'it_med_01', item: 'medkit_s', pos: [-12, -30.6] },
    { id: 'it_med_02', item: 'medkit_s', pos: [-3.6, -64] },
  ],
  // 街灯（点光源の位置。数は性能のため少なく）
  lights: [
    { pos: [0, 2.5, 4.5], color: 0xffc890, intensity: 7, dist: 9 },
    { pos: [0, 5.2, -12], color: 0xbfd8ff, intensity: 14, dist: 15, flicker: true },
    { pos: [0, 5.2, -27], color: 0xbfd8ff, intensity: 11, dist: 15 },
    { pos: [8, 2.9, -40], color: 0xe6fff0, intensity: 5, dist: 9, shop: true },
    { pos: [-3.3, 1.6, -33.5], color: 0x9fd0ff, intensity: 4, dist: 6, vending: true },
    { pos: [0, 5.2, -56], color: 0xbfd8ff, intensity: 10, dist: 15, flicker: true },
  ],
  homeLight: { pos: [0, 2.5, 12], color: 0xffd2a0, intensity: 5, dist: 11 },
  // 調べられる物（自宅）
  homeSpots: {
    safe: [4.9, 14.9], laptop: [-3.8, 13.4], calendar: [-1.6, 15.8], companion: [-1.4, 7.6],
  },
  // 背景の「歪み」：看板の文字が一瞬だけ違う
  glitchSigns: [{ from: '本日は閉店しました', to: '本日は帰宅しました' }],
};
