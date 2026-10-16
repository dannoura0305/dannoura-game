// 町の配置（フェーズ9）：だんのうらの住む町（名前は未定・境界事象の町とは別の町：DECISIONS Q4）。区画 shotengai の「自宅のまわり〜駅前通り〜アーケード」を
// データで持ち、world/town.js がここから道・塀・家・電柱・街灯などを組み立てる（後から配置を直しやすい）。DOM・three.js なし（node でテスト）。
// 座標：x＝東（＋）、z＝南（＋）。北（−z）がアーケードの奥（駅の方）。単位 m。アーケード（x −4.5〜4.5・z −72〜−4）は data/level.js のまま。
// 歩いて：自宅の玄関 → 門 → 自宅の前の道（西へ）→ 用水路沿いの道（北へ）→ 駅前通りの交差点（信号・横断歩道）→ 北の歩道（西へ）→ アーケード前の広場 → アーケード。
// 曲がり角 4 つ・約 95m（ゲームの都合で縮めた約 2〜3 分の道のり）。名前・表札・店名はすべて【仮】。
import { box } from '../world/collide.js';

export const TOWN_LAYOUT = 'town2';                 // セーブの place.layout（古いセーブは town1 扱い→位置を移す）
export const HOME_O = [42, 40];                     // 自宅（data/level.js の home：x −6〜6・z 6〜16）を置く所＝ローカル座標に足す
export const homeW = (x, z) => [x + HOME_O[0], z + HOME_O[1]];
export const homeL = (x, z) => [x - HOME_O[0], z - HOME_O[1]];
/** 家の中か（ローカルの home の箱：x −6〜6・z 6〜16） */
export const inHome = (x, z, pad = 0) => { const [lx, lz] = homeL(x, z); return lx > -6 - pad && lx < 6 + pad && lz > 6 - pad && lz < 16 + pad; };

export const TOWN = {
  version: TOWN_LAYOUT, provisional: true,
  bounds: { minX: -46, maxX: 64, minZ: -73, maxZ: 66 },
  // 歩ける所（地面の材質）。kind：forecourt（アーケード前の広場）・sidewalk（歩道）・main（2 車線の道）・lane（4〜6m の生活道路・歩道なし）など
  walk: [
    { id: 'forecourt', kind: 'forecourt', rect: [-6, -4, 6, 1], surf: 'paving', name: 'アーケード前の広場' },
    { id: 'walkN', kind: 'sidewalk', rect: [-44, 1, 60, 4.5], surf: 'interlock', name: '駅前通りの歩道（北）' },
    { id: 'main', kind: 'main', rect: [-44, 4.5, 60, 11.5], surf: 'asphalt', name: '駅前通り（仮）' },
    { id: 'walkS', kind: 'sidewalk', rect: [-44, 11.5, 60, 14], surf: 'interlock', name: '駅前通りの歩道（南）' },
    { id: 'laneB', kind: 'lane', rect: [7.6, 14, 13, 38], surf: 'lane', name: '用水路沿いの道' },
    { id: 'laneA', kind: 'lane', rect: [0, 38, 62, 43], surf: 'lane', name: '自宅の前の道' },
    { id: 'shrine', kind: 'nook', rect: [-6, 38, 0, 45], surf: 'gravel', name: '祠のある角' },
    { id: 'konbiniLot', kind: 'parking', rect: [13, 14, 32, 20], surf: 'asphalt2', name: 'コンビニの駐車場' },
    { id: 'park', kind: 'park', rect: [-12, 14, 6.2, 30], surf: 'gravel', name: '児童公園' },
    { id: 'bridge', kind: 'bridge', rect: [6.2, 22, 7.6, 24.5], surf: 'concrete', name: '公園への小さな橋' },
    { id: 'homeYard', kind: 'yard', rect: [36, 43, 48, 46], surf: 'concrete', name: '自宅の前庭' },
    { id: 'carport', kind: 'yard', rect: [30.5, 43, 36, 52], surf: 'concrete', name: '自宅のカーポート' },
  ],
  // 用水路（低い柵＝当たり判定。橋・暗渠の所は渡れる）
  channel: { x0: 6.2, x1: 7.6, z0: 14, z1: 66, gaps: [[22, 24.5], [38, 43]], depth: 0.9 },
  // 区画（家・店）。face：表の向き（N/S/E/W）。kind：house・shop・bldg・apartment・konbini・parking・fill など。
  lots: [
    // 駅前通りの北側（表は南）
    { id: 'n1', kind: 'apartment', rect: [-44, -16, -33, 1], face: 'S', floors: 3, wall: 'tilewall', tint: 0xb8a8a0, sign: 'メゾン駅前（仮）' },
    { id: 'n2', kind: 'shop', rect: [-33, -16, -22, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xd8d0c0, sign: '不動産 さくら（仮）', shutter: true },
    { id: 'n3', kind: 'shop', rect: [-22, -16, -10.6, 1], face: 'S', floors: 2, wall: 'siding2', tint: 0xb8c0c8, sign: 'クリーニング取次', shutter: true },
    { id: 'cw', kind: 'shop', rect: [-10.6, -4, -6, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xc8b8a8, sign: 'たばこ', side: 'E', shutter: true },
    { id: 'ce', kind: 'shop', rect: [6, -4, 10.6, 1], face: 'S', floors: 2, wall: 'tilewall', tint: 0xc0a090, sign: 'たい焼き', side: 'W', shutter: true },
    { id: 'n4', kind: 'bldg', rect: [10.6, -16, 20, 1], face: 'S', floors: 3, wall: 'tilewall', tint: 0x9a8a88, sign: '居酒屋 まねき', sign2: '英会話・2F', litSign: true },
    { id: 'n5', kind: 'parking', rect: [20, -10, 31, 1], face: 'S', sign: 'P　24時間' },
    { id: 'n6', kind: 'bldg', rect: [31, -16, 44, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xd0d4d8, sign: '信用金庫（仮）', shutter: true, office: true },
    { id: 'n7', kind: 'shop', rect: [44, -16, 60, 1], face: 'S', floors: 2, wall: 'wood', tint: 0xb09080, sign: '金物 いしだ', shutter: true },
    // 駅前通りの南側（表は北）
    { id: 's1', kind: 'house', rect: [-44, 14, -28, 30], face: 'N', wall: 'siding', tint: 0xd8cfc0, roof: 'kawara', name: '大島', fenceKind: 'block' },
    { id: 's2', kind: 'shop', rect: [-28, 14, -12, 30], face: 'N', floors: 2, wall: 'mortar', tint: 0xc8c0b0, sign: '理容 ひかり', shutter: true, barber: true },
    { id: 'konbini', kind: 'konbini', rect: [13, 20, 32, 27], face: 'N', sign: 'コンビニ（仮）　24h' },
    { id: 's3', kind: 'apartment', rect: [32, 14, 46, 27], face: 'N', floors: 2, wall: 'siding2', tint: 0xd8dcd0, sign: 'コーポ みずほ（仮）', open: true },
    { id: 's4', kind: 'house', rect: [46, 14, 60, 27], face: 'N', wall: 'siding', tint: 0xc8d0d8, roof: 'kawara2', name: '杉本', fenceKind: 'hedge' },
    // 自宅の前の道の北側（表は南）
    { id: 'a1', kind: 'house', rect: [13, 27, 24, 38], face: 'S', wall: 'siding', tint: 0xe0d8c8, roof: 'kawara', name: '上田', fenceKind: 'block', side: 'W' },
    { id: 'a2', kind: 'house', rect: [24, 27, 36, 38], face: 'S', wall: 'wood', tint: 0xc0a080, roof: 'kawara2', name: '森川', fenceKind: 'hedge' },
    { id: 'a3', kind: 'house', rect: [36, 27, 48, 38], face: 'S', wall: 'siding2', tint: 0xd0d8e0, roof: 'galv', name: '高橋', fenceKind: 'fence' },
    { id: 'a4', kind: 'house', rect: [48, 27, 62, 38], face: 'S', wall: 'mortar', tint: 0xd8ccb8, roof: 'kawara', name: '中村', fenceKind: 'block' },
    // 自宅の前の道の南側（表は北）
    { id: 'b1', kind: 'house', rect: [7.6, 43, 20, 66], face: 'N', wall: 'siding2', tint: 0xc8ccc0, roof: 'kawara', name: '佐藤', fenceKind: 'block' },
    { id: 'b2', kind: 'house', rect: [20, 43, 30.5, 66], face: 'N', wall: 'siding', tint: 0xe8dcc8, roof: 'galv', name: '吉岡', fenceKind: 'fence' },
    { id: 'home', kind: 'home', rect: [30.5, 43, 50, 66], face: 'N' },
    { id: 'b3', kind: 'house', rect: [50, 43, 62, 66], face: 'N', wall: 'mortar', tint: 0xe0d0c0, roof: 'kawara2', name: '岡本', fenceKind: 'hedge' },
    // 用水路の西（表は東か北）
    { id: 'w1', kind: 'house', rect: [-12, 30, 6.2, 38], face: 'E', wall: 'siding', tint: 0xd0c8d8, roof: 'kawara', name: '石井', fenceKind: 'fence', shallow: true },
    { id: 'w3', kind: 'house', rect: [-6, 45, 6.2, 66], face: 'N', wall: 'wood', tint: 0xb89a7a, roof: 'kawara', name: '西村', fenceKind: 'block' },
    // 見えるだけの奥（当たり判定の埋め）
    { id: 'f_w1', kind: 'fill', rect: [-44, 30, -12, 38] }, { id: 'f_w2', kind: 'fill', rect: [-44, 38, -6, 45] }, { id: 'f_w4', kind: 'fill', rect: [-44, 45, -6, 66] },
    { id: 'f_c2', kind: 'fill', rect: [0, 43, 6.2, 45] }, { id: 'f_e', kind: 'field', rect: [60, 14, 64, 27] }, { id: 'f_e2', kind: 'field', rect: [62, 27, 64, 66] },
    { id: 'f_endW', kind: 'barrier', rect: [-46, 1, -44, 14] }, { id: 'f_endE', kind: 'barrier', rect: [60, 1, 64, 14] },
  ],
  // 自宅の区画の中の当たり判定（家の壁は level.js の buildHome。ここは塀・物置・裏庭）
  homeLot: {
    gate: [40.6, 43.4],                   // 門（ブロック塀の切れ目）x の範囲（z=43）
    solids: [[48, 43, 50, 66, 1.8], [30.5, 52, 36, 66, 2.4], [36, 56, 48, 66, 1.8], [30.5, 43, 30.8, 52, 1.8]],
  },
  // 交差点・信号・横断歩道
  crossings: [
    { id: 'x_main', x0: 8.6, x1: 12.4, z0: 4.5, z1: 11.5, signal: true },        // 用水路沿いの道の正面（信号つき）
    { id: 'x_fore', x0: -2.2, x1: 2.2, z0: 4.5, z1: 11.5, signal: false },       // アーケード前（信号なし・押しボタン無し）
  ],
  // 電柱（l：街灯つき）。電線は順につなぐ（line ごと）
  poleLines: [
    { id: 'pl_main', pts: [[-40, 4.15], [-28, 4.15], [-17.5, 4.15], [16, 4.15], [28, 4.15], [40, 4.15], [54, 4.15]], lamp: 'tall' },
    { id: 'pl_mainS', pts: [[-36, 11.85], [-20, 11.85], [-8, 11.85], [24, 11.85], [38, 11.85], [52, 11.85]], lamp: 'tall' },
    { id: 'pl_laneB', pts: [[13.3, 16.5], [13.3, 26.5], [13.3, 36.5]], lamp: 'small' },
    { id: 'pl_laneA', pts: [[14.5, 37.75], [26, 37.75], [37.5, 37.75], [49, 37.75], [60.5, 37.75]], lamp: 'small' },
    { id: 'pl_west', pts: [[2, 37.7], [-5, 45.3]], lamp: 'small' },
  ],
  deadLamps: ['pl_laneA:3'],        // 切れた街灯（ちらつかずに消えている）
  flickerLamps: ['pl_laneB:1', 'pl_main:4'],
  // 小物（kind ごとに world/town.js が形を作る）
  props: [
    { kind: 'mirror', x: 7.9, z: 37.6, ry: Math.PI * 0.25 }, { kind: 'mirror', x: 13.2, z: 14.4, ry: -Math.PI * 0.75 }, { kind: 'mirror', x: 0.3, z: 37.7, ry: Math.PI * 0.75 },
    { kind: 'vending', x: 29.4, z: 19.4, ry: Math.PI, color: 0xd03a3a }, { kind: 'vending', x: 30.5, z: 19.4, ry: Math.PI, color: 0x2a6ad0 },
    { kind: 'vending', x: 23.2, z: 38.5, ry: 0, color: 0xe8e8e8 },
    { kind: 'garbage', x: 16.8, z: 38.65, ry: 0 },
    { kind: 'busstop', x: -15, z: 2.0, name: '駅前通り　バス停（仮）' },
    { kind: 'bikes', x: -5.4, z: -1.5, n: 5, ry: Math.PI / 2 }, { kind: 'bikes', x: 5.4, z: -1.5, n: 4, ry: -Math.PI / 2 },
    { kind: 'car', x: 33.2, z: 47.6, ry: 0, color: 0x9a3a4a, kei: true },        // 自宅のカーポート
    { kind: 'car', x: 19.55, z: 17.4, ry: Math.PI, color: 0xe8e8ec },          // コンビニ（前向きに止めた車）
    { kind: 'car', x: 27.65, z: 17.4, ry: 0, color: 0x2a3a5a },
    { kind: 'car', x: 25.5, z: -4.5, ry: 0, color: 0x6a6a72 },                   // コインパーキング
    { kind: 'car', x: -30, z: 9.6, ry: -Math.PI / 2, color: 0xc8c8c8, abandoned: true },   // 乗り捨てられた車（道の上）
    { kind: 'bike', x: 47.2, z: 44.2, ry: 0.3 }, { kind: 'bike', x: 21.5, z: 42.7, ry: 1.4 },
    { kind: 'cone', x: -42, z: 6 }, { kind: 'cone', x: -42, z: 9 }, { kind: 'cone', x: 58, z: 6 }, { kind: 'cone', x: 58, z: 9 },
    { kind: 'sign', x: 13.4, z: 15.2, text: '通学路', color: 0x2a6ad0 }, { kind: 'sign', x: 13.15, z: 36.6, text: '止まれ', color: 0xc02a2a, tri: true },
    { kind: 'sign', x: 7.8, z: 15.0, text: '止まれ', color: 0xc02a2a, tri: true },
    { kind: 'planter', x: 36.6, z: 43.6 }, { kind: 'planter', x: 47.3, z: 43.6 },
    { kind: 'board', x: 19.4, z: 37.95, text: '回覧：ゴミは朝 8 時までに' },
    { kind: 'snowpole', x: 12.8, z: 30 }, { kind: 'snowpole', x: 12.8, z: 22 },          // 雪国の町らしさ（矢羽根）：場所は決めない
  ],
  // 公園の中
  park: { swing: [-8, 20], slide: [-2, 24.5], sand: [-7.5, 26.5], bench: [[0.5, 17.5], [-10.5, 18]], toilet: [-10, 27.5], trees: [[-11, 15.5], [4.8, 15.6], [4.8, 28.6], [-11, 28.8], [-4.5, 29]], lamp: [-3, 21], entry: [-5, -2] },
  // 祠（小さな鳥居・石灯籠）
  shrine: { torii: [-3, 41.2], hokora: [-5.0, 41.0], lanterns: [[-4.6, 39.0], [-4.6, 43.8]] },
  // 道の上の印（止まれ・横断歩道・停止線・マンホール・水たまり・落ち葉）
  marks: [
    { kind: 'tomare', x: 10.5, z: 16.6, ry: 0 }, { kind: 'stopline', x: 10.5, z: 15.0, w: 4.6, ry: 0 }, { kind: 'tomare', x: 10.5, z: 34.6, ry: 0 }, { kind: 'stopline', x: 10.5, z: 37.0, w: 4.6, ry: 0 },
    { kind: 'manhole', x: 10.4, z: 24 }, { kind: 'manhole', x: 31, z: 40.6 }, { kind: 'manhole', x: -20, z: 8 }, { kind: 'manhole', x: 24, z: 6.2 },
    { kind: 'puddle', x: 11.2, z: 29.5, s: 2.4 }, { kind: 'puddle', x: 38.5, z: 41.6, s: 2.0 }, { kind: 'puddle', x: 3, z: 9.6, s: 3.0 }, { kind: 'puddle', x: -18, z: 5.6, s: 2.6 }, { kind: 'puddle', x: 20, z: 40, s: 1.6 }, { kind: 'puddle', x: 45, z: 7.5, s: 2.8 },
    { kind: 'leaves', x: -2, z: 20, s: 3 }, { kind: 'leaves', x: 12, z: 35, s: 2 }, { kind: 'leaves', x: -3.5, z: 40, s: 2.4 },
  ],
  // 道案内（ミニマップの目印・テストの道のり）：交差点の点と、つながり
  nav: {
    nodes: {
      arcade: [0, -6], gate: [0, -3], fore: [0, 2.6], xN: [10.5, 2.8], xS: [10.5, 12.8], j2: [10.5, 16], j1: [10.5, 40.5],
      homeGate: [42, 40.5], homeYard: [42, 44.6], homeDoor: [42, 46.6], lb: [10.5, 23.2], park: [3.0, 23.2], shrine: [-3, 40.5], konbini: [22.6, 15.2], east: [58, 2.8], west: [-42, 2.8],
    },
    edges: [['arcade', 'gate'], ['gate', 'fore'], ['fore', 'xN'], ['xN', 'xS'], ['xS', 'j2'], ['j2', 'lb'], ['lb', 'j1'], ['j1', 'homeGate'], ['homeGate', 'homeYard'], ['homeYard', 'homeDoor'],
      ['lb', 'park'], ['j1', 'shrine'], ['xS', 'konbini'], ['xN', 'east'], ['fore', 'west']],
  },
  // 自宅 → アーケードの道のり（通しプレイで実際に歩く。角ごとの点）
  route: [[42, 47.2], [42, 44.6], [42, 40.5], [10.5, 40.5], [10.5, 12.8], [10.5, 2.8], [0, 2.8], [0, -6]],
};

/** 当たり判定の箱（world/town.js と同じ物）。アーケードの中は data/level.js（level.js が作る） */
export function townSolids(T = TOWN) {
  const out = [];
  const R = (x0, z0, x1, z1, h = 7, y0 = 0) => out.push(box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, y0));
  for (const L of T.lots) {
    const [x0, z0, x1, z1] = L.rect;
    if (L.kind === 'home') continue;
    if (L.kind === 'parking') { R(x0, z0, x1, z1, 1.2); continue; }
    if (L.kind === 'barrier') { R(x0, z0, x1, z1, 1.4); continue; }
    if (L.kind === 'field') { R(x0, z0, x1, z1, 1.4); continue; }
    if (L.kind === 'house') { R(x0, z0, x1, z1, 1.8); const f = houseFoot(L); R(f[0], f[1], f[2], f[3], 7.5); continue; }
    R(x0, z0, x1, z1, L.kind === 'fill' ? 3 : 7.5);
  }
  // 自宅の区画：前の塀（門・カーポートの口を空ける）・横と裏
  const H = T.homeLot;
  R(36, 42.85, H.gate[0], 43.15, 1.4); R(H.gate[1], 42.85, 48, 43.15, 1.4);
  for (const s of H.solids) R(s[0], s[1], s[2], s[3], s[4]);
  // 用水路の柵（橋・暗渠を除く）
  const C = T.channel; let z = C.z0;
  for (const [a, b] of C.gaps.concat([[C.z1, C.z1]])) { if (a > z) R(C.x0, z, C.x1, a, 1.1); z = b; }
  // 公園の柵（入口を空ける）・中の物
  const P = T.park; R(-12, 13.85, -6, 14.15, 1.0); R(-1, 13.85, 6.2, 14.15, 1.0);
  R(P.toilet[0] - 1.6, P.toilet[1] - 1.4, P.toilet[0] + 1.6, P.toilet[1] + 1.4, 3);
  R(P.swing[0] - 1.6, P.swing[1] - 0.3, P.swing[0] + 1.6, P.swing[1] + 0.3, 2.2);
  R(P.slide[0] - 0.5, P.slide[1] - 1.6, P.slide[0] + 0.5, P.slide[1] + 1.6, 2.0);
  for (const [x, zz] of P.trees) R(x - 0.3, zz - 0.3, x + 0.3, zz + 0.3, 4);
  // 祠・鳥居の柱・石灯籠
  const S = T.shrine; R(S.hokora[0] - 0.7, S.hokora[1] - 0.7, S.hokora[0] + 0.7, S.hokora[1] + 0.7, 1.6);
  for (const dz of [-1.1, 1.1]) R(S.torii[0] - 0.15, S.torii[1] + dz - 0.15, S.torii[0] + 0.15, S.torii[1] + dz + 0.15, 2.8);
  for (const [x, zz] of S.lanterns) R(x - 0.25, zz - 0.25, x + 0.25, zz + 0.25, 1.5);
  // 電柱・小物
  for (const pl of T.poleLines) for (const [x, zz] of pl.pts) R(x - 0.17, zz - 0.17, x + 0.17, zz + 0.17, 9);
  for (const p of T.props) {
    if (p.kind === 'vending') R(p.x - 0.45, p.z - 0.45, p.x + 0.45, p.z + 0.45, 1.9);
    if (p.kind === 'garbage') R(p.x - 1.1, p.z - 0.6, p.x + 1.1, p.z + 0.6, 1.1);
    if (p.kind === 'car') { const along = Math.abs(Math.sin(p.ry)) > 0.5; const w = along ? 3.6 : 1.6, d = along ? 1.6 : 3.6; R(p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2, 1.5); }
    if (p.kind === 'busstop') R(p.x - 1.6, p.z - 0.55, p.x + 1.6, p.z - 0.25, 2.4);
    if (p.kind === 'planter') R(p.x - 0.35, p.z - 0.35, p.x + 0.35, p.z + 0.35, 0.8);
  }
  // ガードレール（南の歩道の縁：横断歩道・角を空ける）
  for (const [a, b] of guardSpans(T)) R(a, 11.4, b, 11.6, 0.9);
  return out;
}
/** 家の建物の足もと（区画の中・表から下がる） */
export function houseFoot(L) {
  const [x0, z0, x1, z1] = L.rect, f = L.face, set = 3.2, side = 1.2, back = L.shallow ? 0.8 : 2.4;
  const w = x1 - x0, d = z1 - z0, maxD = Math.min(10, (f === 'N' || f === 'S' ? d : w) - set - back);
  if (f === 'N') return [x0 + side, z0 + set, x1 - side, z0 + set + maxD];
  if (f === 'S') return [x0 + side, z1 - set - maxD, x1 - side, z1 - set];
  if (f === 'E') return [x1 - set - maxD, z0 + side, x1 - set, z1 - side];
  return [x0 + set, z0 + side, x0 + set + maxD, z1 - side];
}
/** ガードレールの区間（南の歩道の縁・x の範囲）。横断歩道・角・コンビニの出入り口・公園の入口を空ける */
export function guardSpans(T = TOWN) {
  const gaps = [[7, 14.5], [-2.8, 2.8], [14.5, 32], [-6.5, -0.5]]; void T;
  const out = []; let x = -43;
  for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > x) out.push([x, a]); x = Math.max(x, b); }
  if (x < 59) out.push([x, 59]);
  return out;
}
/** 街灯の一覧（電柱から）：{ id, x, z, h, kind, dead, flicker } */
export function townLamps(T = TOWN) {
  const out = [];
  for (const pl of T.poleLines) pl.pts.forEach(([x, z], i) => {
    const id = pl.id + ':' + i;
    out.push({ id, x, z, kind: pl.lamp, h: pl.lamp === 'tall' ? 6.2 : 4.6, dead: T.deadLamps.includes(id), flicker: T.flickerLamps.includes(id) });
  });
  return out;
}

/** 道案内：最短の点の列（nav の点の名前）。from・to は名前 */
export function navPath(from, to, T = TOWN) {
  const N = T.nav.nodes, adj = {}; for (const k of Object.keys(N)) adj[k] = [];
  for (const [a, b] of T.nav.edges) { const d = Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]); adj[a].push([b, d]); adj[b].push([a, d]); }
  const dist = { [from]: 0 }, prev = {}, q = new Set(Object.keys(N));
  while (q.size) {
    let u = null; for (const k of q) if (dist[k] != null && (u == null || dist[k] < dist[u])) u = k;
    if (u == null) break; q.delete(u); if (u === to) break;
    for (const [v, d] of adj[u]) if (dist[u] + d < (dist[v] ?? Infinity)) { dist[v] = dist[u] + d; prev[v] = u; }
  }
  if (dist[to] == null) return null;
  const path = [to]; while (path[0] !== from) path.unshift(prev[path[0]]);
  return path;
}
/** 点の列の曲がり角の数（向きが 30° 以上変わる所） */
export function countTurns(pts) {
  let n = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d; if (d > Math.PI / 6) n++;
  }
  return n;
}
/** いちばん近い道案内の点 */
export function nearestNode(x, z, T = TOWN) { let best = null, bd = Infinity; for (const [k, [nx, nz]] of Object.entries(T.nav.nodes)) { const d = Math.hypot(nx - x, nz - z); if (d < bd) { bd = d; best = k; } } return best; }
/** 次に向かう点（目標の場所まで道なりに）。目標が近い・見通せる時は目標そのもの */
export function navNext(x, z, tx, tz, T = TOWN) {
  if (Math.hypot(tx - x, tz - z) < 6) return [tx, tz];
  const a = nearestNode(x, z, T), b = nearestNode(tx, tz, T); if (!a || !b || a === b) return [tx, tz];
  const p = navPath(a, b, T); if (!p) return [tx, tz];
  const N = T.nav.nodes;
  // 最初の点に十分近い（または通り過ぎた）なら次の点
  let i = 0; while (i < p.length - 1 && Math.hypot(N[p[i]][0] - x, N[p[i]][1] - z) < 3.5) i++;
  if (i === 0 && p.length > 1) { const A = N[p[0]], Bn = N[p[1]]; const dAB = Math.hypot(Bn[0] - A[0], Bn[1] - A[1]), dPB = Math.hypot(Bn[0] - x, Bn[1] - z); if (dPB < dAB) i = 1; }
  return N[p[i]].slice();
}

/**
 * 古いセーブ（town1：自宅がアーケードの南の正面・z 6〜16）の位置を今の町へ移す。
 * 家の中 → 同じ家具の前（ローカル座標のまま自宅へ）／家の前の路地（z −4〜6）→ アーケード前の広場／アーケードの中 → そのまま。
 */
export function migrateTownPos(pos) {
  const x = pos[0], z = pos[2] != null ? pos[2] : pos[1];
  if (z > 6 - 0.4 && Math.abs(x) < 6.4 && z < 16.6) { const [wx, wz] = homeW(Math.max(-5.5, Math.min(5.5, x)), Math.max(6.6, Math.min(15.6, z))); return { pos: [wx, 0, wz], moved: 'home' }; }
  if (z > -4.2) return { pos: [0, 0, -2], moved: 'forecourt' };
  return { pos: [x, 0, z], moved: null };
}

// 町全体の見取り図（区画の配置・地図の画面と docs/shinshoku/TOWN_MAP.md）。単位 m・おおよそ。ゲームの区画は 1 つずつ別に読み込む（つなぎは出入り口）。
export const MACRO = {
  note: '町の名前は未定（境界事象の町とは別）。北陸の地方都市くらいの広さ（駅から歩いて 15〜20 分の範囲）。名前・店名はすべて仮。',
  // rect：おおよその範囲（m）。label：地図の文字の位置（重ならないように手で置く）
  districts: [
    { id: 'station', name: '駅（私鉄・仮）', rect: [-90, -420, 90, -398], kind: 'rail', label: [-80, -432] },
    { id: 'shotengai', name: 'あけぼの通り商店街', rect: [-11, -72, 11, -4], kind: 'arcade', area: 'shotengai', label: [-150, -40] },
    { id: 'alley', name: '裏路地', rect: [-40, -110, 0, -72], kind: 'alley', area: 'alley', label: [-120, -100] },
    { id: 'plaza', name: '商業施設の前（ことぶきSC・仮）', rect: [20, -175, 110, -110], kind: 'mall', area: 'plaza', label: [-110, -165] },
    { id: 'shelter', name: '市民体育館（避難所）', rect: [150, -175, 230, -105], kind: 'gym', area: 'shelter', label: [150, -186] },
    { id: 'tunnel', name: '地下通路', rect: [228, -110, 262, -66], kind: 'under', area: 'tunnel', label: [270, -100] },
    { id: 'hospital', name: '中央病院（仮）', rect: [250, -60, 340, 20], kind: 'hospital', area: 'hospital', label: [250, 36] },
    { id: 'office', name: '観測分室（仮）', rect: [250, -215, 300, -175], kind: 'office', area: 'office', label: [310, -200] },
    { id: 'lab', name: '研究施設（地下研究区画・旧研究棟・観測棟）', rect: [270, -370, 400, -255], kind: 'lab', area: 'lab', label: [150, -380] },
    { id: 'admin', name: '中央管理棟', rect: [410, -350, 450, -300], kind: 'admin', area: 'admin', label: [380, -290] },
    { id: 'residential', name: '住宅地', rect: [-44, 14, 62, 66], kind: 'res', area: 'shotengai', label: [70, 50] },
    { id: 'konbini', name: 'コンビニ', rect: [13, 14, 32, 27], kind: 'shop', area: 'shotengai', label: [70, 24] },
    { id: 'home', name: 'だんのうらの家', rect: [30, 43, 50, 66], kind: 'home', area: 'shotengai', label: [70, 76] },
  ],
  roads: [
    { name: '駅前通り', pts: [[-250, 8], [460, 8]], w: 7 },
    { name: '中央通り（バス通り）', pts: [[130, 8], [130, -420]], w: 9 },
    { name: '病院通り', pts: [[130, -40], [340, -40]], w: 6 },
    { name: '研究施設への道', pts: [[130, -195], [330, -195], [330, -255]], w: 6 },
    { name: '線路', pts: [[-250, -405], [460, -405]], w: 3, rail: true },
    { name: '用水路', pts: [[6.9, 14], [6.9, 160]], w: 2, water: true },
    { name: '川', pts: [[-250, 175], [460, 135]], w: 18, water: true },
  ],
  bus: [[-60, 8], [130, 8], [130, -40], [130, -140], [130, -195], [130, -400]],
};
