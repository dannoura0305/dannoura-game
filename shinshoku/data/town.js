// 町の配置（フェーズ9）：だんのうらの住む町（名前は未定・境界事象の町とは別の町：DECISIONS Q4）。区画 shotengai の「自宅のまわり〜駅前通り〜アーケード」を
// データで持ち、world/town.js がここから道・塀・家・電柱・街灯などを組み立てる（後から配置を直しやすい）。DOM・three.js なし（node でテスト）。
// 座標：x＝東（＋）、z＝南（＋）。北（−z）がアーケードの奥（駅の方）。単位 m。アーケード（x −4.5〜4.5・z −72〜−4）は data/level.js のまま。
// 歩いて：自宅の玄関 → 門 → 自宅の前の道（西へ）→ 用水路沿いの道（北へ）→ 駅前通りの交差点（信号・横断歩道）→ 北の歩道（西へ）→ アーケード前の広場 → アーケード。
// 曲がり角 4 つ・約 95m（ゲームの都合で縮めた約 2〜3 分の道のり）。名前・表札・店名はすべて【仮】。
// フェーズ10（利用者の回答：「北陸らしさは総曲輪を参考」「駅やバス通りも歩ける場所に」）：駅前通りの東の端を、路面電車とバスの走る
// 中央通り（電車通り・バス通り）へつなぎ、北の端に駅前（駅舎・駅前広場・電停・バスターミナル・タクシーのりば・駐輪場・時計）を置いた。
// アーケードの東には、ガラスの屋根の広場（総曲輪の雰囲気を参考にした独自の意匠・名前は仮）と、広場から中央通りへ抜ける横丁。
// 自宅の前の道の東の端も中央通りへつながる。町の名前・実在の地名・店名・意匠は使わない（雰囲気だけ）。
import { box } from '../world/collide.js';
import { seeded } from '../../mapkit/core/rng.js';

export const TOWN_LAYOUT = 'town3';                 // セーブの place.layout（layout 無し＝town1・town2 は読む時に位置を確かめて移す）
export const HOME_O = [42, 40];                     // 自宅（data/level.js の home：x −6〜6・z 6〜16）を置く所＝ローカル座標に足す
export const homeW = (x, z) => [x + HOME_O[0], z + HOME_O[1]];
export const homeL = (x, z) => [x - HOME_O[0], z - HOME_O[1]];
/** 家の中か（ローカルの home の箱：x −6〜6・z 6〜16） */
export const inHome = (x, z, pad = 0) => { const [lx, lz] = homeL(x, z); return lx > -6 - pad && lx < 6 + pad && lz > 6 - pad && lz < 16 + pad; };

export const TOWN = {
  version: TOWN_LAYOUT, provisional: true,
  bounds: { minX: -46, maxX: 118, minZ: -128, maxZ: 66 },
  // 歩ける所（地面の材質）。kind：forecourt（アーケード前の広場）・sidewalk（歩道）・main（2 車線の道）・lane（4〜6m の生活道路・歩道なし）など
  walk: [
    { id: 'forecourt', kind: 'forecourt', rect: [-6, -4, 6, 1], surf: 'paving', name: 'アーケード前の広場' },
    { id: 'walkN', kind: 'sidewalk', rect: [-44, 1, 66, 4.5], surf: 'interlock', name: '駅前通りの歩道（北）' },
    { id: 'main', kind: 'main', rect: [-44, 4.5, 70, 11.5], surf: 'asphalt', name: '駅前通り（仮）' },
    { id: 'walkS', kind: 'sidewalk', rect: [-44, 11.5, 66, 14], surf: 'interlock', name: '駅前通りの歩道（南）' },
    { id: 'laneB', kind: 'lane', rect: [7.6, 14, 13, 38], surf: 'lane', name: '用水路沿いの道' },
    { id: 'laneA', kind: 'lane', rect: [0, 38, 66, 43], surf: 'lane', name: '自宅の前の道' },
    { id: 'shrine', kind: 'nook', rect: [-6, 38, 0, 45], surf: 'gravel', name: '祠のある角' },
    { id: 'konbiniLot', kind: 'parking', rect: [13, 14, 32, 20], surf: 'asphalt2', name: 'コンビニの駐車場' },
    { id: 'park', kind: 'park', rect: [-12, 14, 6.2, 30], surf: 'gravel', name: '児童公園' },
    { id: 'bridge', kind: 'bridge', rect: [6.2, 22, 7.6, 24.5], surf: 'concrete', name: '公園への小さな橋' },
    { id: 'bridge2', kind: 'bridge', rect: [6.2, 34.7, 7.6, 36.3], surf: 'concrete', name: '石井さんの家の前の小さな橋' },
    { id: 'homeYard', kind: 'yard', rect: [36, 43, 48, 46], surf: 'concrete', name: '自宅の前庭' },
    { id: 'carport', kind: 'yard', rect: [30.5, 43, 36, 52], surf: 'concrete', name: '自宅のカーポート' },
    // フェーズ10：ガラスの屋根の広場・通り抜け・横丁・中央通り（電車通り・バス通り）・駅前広場
    { id: 'passage', kind: 'passage', rect: [4.5, -28, 10.6, -22], surf: 'arcade_floor', name: 'アーケードから広場への通り抜け', roof: true },
    { id: 'gplaza', kind: 'plaza', rect: [10.6, -34, 36, -6.5], surf: 'granite', name: 'ガラス屋根の広場（仮）', roof: true },
    { id: 'gpass', kind: 'passage', rect: [20, -6.5, 26, 1], surf: 'granite', name: '広場への入口（駅前通りから）', roof: true },
    { id: 'yokocho', kind: 'lane', rect: [36, -24, 66, -19.5], surf: 'paving', name: '横丁（広場 → 中央通り）' },
    { id: 'aveW', kind: 'sidewalk', rect: [66, -78, 70, 4.5], surf: 'interlock', name: '中央通りの歩道（西）' },
    { id: 'aveWs', kind: 'sidewalk', rect: [66, 11.5, 70, 46], surf: 'interlock', name: '中央通りの歩道（西・南）' },
    { id: 'avenue', kind: 'avenue', rect: [70, -78, 88, 46], surf: 'asphalt', name: '中央通り（電車通り・バス通り）' },
    { id: 'aveE', kind: 'sidewalk', rect: [88, -78, 92, 46], surf: 'interlock', name: '中央通りの歩道（東）' },
    { id: 'station', kind: 'plaza', rect: [40, -112, 116, -78], surf: 'paving', name: '駅前広場' },
  ],
  // 用水路（低い柵＝当たり判定。橋・暗渠の所は渡れる）
  channel: { x0: 6.2, x1: 7.6, z0: 14, z1: 66, gaps: [[22, 24.5], [34.7, 36.3], [38, 43]], depth: 0.9 },   // フェーズ11：[34.7, 36.3]＝石井さんの家の前の小さな橋
  // 区画（家・店）。face：表の向き（N/S/E/W）。kind：house・shop・bldg・apartment・konbini・parking・fill など。
  lots: [
    // 駅前通りの北側（表は南）
    { id: 'n1', kind: 'apartment', rect: [-44, -16, -33, 1], face: 'S', floors: 3, wall: 'tilewall', tint: 0xb8a8a0, sign: 'メゾン駅前（仮）' },
    { id: 'n2', kind: 'shop', rect: [-33, -16, -22, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xd8d0c0, sign: '不動産 さくら（仮）', shutter: true },
    { id: 'n3', kind: 'shop', rect: [-22, -16, -10.6, 1], face: 'S', floors: 2, wall: 'siding2', tint: 0xb8c0c8, sign: 'クリーニング取次', shutter: true },
    { id: 'cw', kind: 'shop', rect: [-10.6, -4, -6, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xc8b8a8, sign: 'たばこ', side: 'E', shutter: true },
    { id: 'ce', kind: 'shop', rect: [6, -4, 10.6, 1], face: 'S', floors: 2, wall: 'tilewall', tint: 0xc0a090, sign: 'たい焼き', side: 'W', shutter: true },
    { id: 'n4', kind: 'bldg', rect: [10.6, -6.5, 20, 1], face: 'S', floors: 3, wall: 'tilewall', tint: 0x9a8a88, sign: '居酒屋 まねき', sign2: '英会話・2F', litSign: true },
    { id: 'n5', kind: 'shop', rect: [26, -6.5, 31, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xc8b8a0, sign: '喫茶 ふたば（仮）', litSign: true },
    { id: 'n6', kind: 'bldg', rect: [31, -6.5, 44, 1], face: 'S', floors: 2, wall: 'mortar', tint: 0xd0d4d8, sign: '信用金庫（仮）', shutter: true, office: true },
    { id: 'n6b', kind: 'shop', rect: [36, -19.5, 44, -6.5], face: 'N', floors: 3, wall: 'tilewall', tint: 0xb0a8a0, sign: '画廊 しらゆき（仮）', shutter: true },
    { id: 'n7', kind: 'shop', rect: [44, -19.5, 60, 1], face: 'S', floors: 2, wall: 'wood', tint: 0xb09080, sign: '金物 いしだ', shutter: true },
    { id: 'n8', kind: 'machiya', rect: [60, -19.5, 66, 1], face: 'E', sign: 'そば処 ゆきみ（仮）', noren: 0x2a3a6a, lit: true },
    // フェーズ10：ガラスの屋根の広場のまわり・横丁・中央通りの西側（表は東）
    { id: 'd1', kind: 'dept', rect: [11.4, -45, 36, -34], face: 'S', floors: 5, sign: 'まちなかビル（仮）', tint: 0xa8b0b8, doorsU: [2.4, 22.0] },   // フェーズ11：自動ドアは舞台の両脇
    { id: 'w4', kind: 'shop', rect: [36, -34, 50, -24], face: 'S', floors: 2, wall: 'wood', tint: 0xa88a70, sign: '居酒屋 ゆきあかり（仮）', litSign: true, lanterns: true },
    { id: 'w5', kind: 'fillB', rect: [36, -78, 50, -34] }, { id: 'f_dt', kind: 'fillB', rect: [17, -78, 36, -45] },
    { id: 'w1', kind: 'machiya', rect: [50, -40, 66, -24], face: 'E', sign: '和菓子 つきしろ（仮）', noren: 0x6a2a3a, lit: false },
    { id: 'w2', kind: 'tower', rect: [50, -60, 66, -40], face: 'E', floors: 6, sign: 'ホテル　北の灯（仮）', tint: 0xb8b4ac, litTop: true },
    { id: 'w3', kind: 'tower', rect: [50, -78, 66, -60], face: 'E', floors: 4, sign: '眼鏡・時計 ときわ（仮）', tint: 0xc8c0b0, oldStyle: true },
    // 中央通りの東側（表は西）
    { id: 'e1', kind: 'apartment', rect: [92, 22, 118, 46], face: 'W', floors: 5, wall: 'tilewall', tint: 0xb0a49a, sign: 'サンハイツ中央（仮）' },
    { id: 'e2', kind: 'tower', rect: [92, 4, 118, 22], face: 'W', floors: 7, sign: 'ビジネスホテル（仮）', tint: 0xa8acb4, litTop: true },
    { id: 'e3', kind: 'machiya', rect: [92, -14, 118, 4], face: 'W', sign: '呉服 あさぎ（仮）', noren: 0x3a2a5a, lit: true },
    { id: 'e4', kind: 'tower', rect: [92, -30, 118, -14], face: 'W', floors: 5, sign: '銀行（仮）', tint: 0xc0c4c8, office: true },
    { id: 'e5', kind: 'machiya', rect: [92, -50, 118, -30], face: 'W', sign: '茶舗 みどり（仮）', noren: 0x2a5a3a, lit: false },
    { id: 'e6', kind: 'dept', rect: [92, -78, 118, -50], face: 'W', floors: 7, sign: '百貨店 はなぶさ（仮）', tint: 0xb4aca4 },
    // 駅前（駅舎・広場の端）
    { id: 'stationB', kind: 'station', rect: [44, -128, 116, -112], face: 'S' },
    { id: 'f_sw', kind: 'fillB', rect: [36, -128, 44, -78] }, { id: 'f_se', kind: 'fillB', rect: [116, -128, 118, -78] },
    // 駅前通りの南側（表は北）
    { id: 's1', kind: 'house', rect: [-44, 14, -28, 30], face: 'N', wall: 'siding', tint: 0xd8cfc0, roof: 'kawara', name: '大島', fenceKind: 'block' },
    { id: 's2', kind: 'shop', rect: [-28, 14, -12, 30], face: 'N', floors: 2, wall: 'mortar', tint: 0xc8c0b0, sign: '理容 ひかり', shutter: true, barber: true },
    { id: 'konbini', kind: 'konbini', rect: [13, 20, 32, 27], face: 'N', sign: 'コンビニ（仮）　24h' },
    { id: 's3', kind: 'apartment', rect: [32, 14, 46, 27], face: 'N', floors: 2, wall: 'siding2', tint: 0xd8dcd0, sign: 'コーポ みずほ（仮）', open: true },
    { id: 's4', kind: 'house', rect: [46, 14, 60, 27], face: 'N', wall: 'siding', tint: 0xc8d0d8, roof: 'kawara2', name: '杉本', fenceKind: 'hedge' },
    { id: 's5', kind: 'shop', rect: [60, 14, 66, 27], face: 'E', floors: 2, wall: 'siding2', tint: 0xd0d4c8, sign: '整骨院（仮）', shutter: true },
    // 自宅の前の道の北側（表は南）
    { id: 'a1', kind: 'house', rect: [13, 27, 24, 38], face: 'S', wall: 'siding', tint: 0xe0d8c8, roof: 'kawara', name: '上田', fenceKind: 'block', side: 'W', door: 'R' },   // フェーズ11：門の前はごみ置き場を避ける
    { id: 'a2', kind: 'house', rect: [24, 27, 36, 38], face: 'S', wall: 'wood', tint: 0xc0a080, roof: 'kawara2', name: '森川', fenceKind: 'hedge' },
    { id: 'a3', kind: 'house', rect: [36, 27, 48, 38], face: 'S', wall: 'siding2', tint: 0xd0d8e0, roof: 'galv', name: '高橋', fenceKind: 'fence' },
    { id: 'a4', kind: 'house', rect: [48, 27, 62, 38], face: 'S', wall: 'mortar', tint: 0xd8ccb8, roof: 'kawara', name: '中村', fenceKind: 'block' },
    // 自宅の前の道の南側（表は北）
    { id: 'b1', kind: 'house', rect: [7.6, 43, 20, 66], face: 'N', wall: 'siding2', tint: 0xc8ccc0, roof: 'kawara', name: '佐藤', fenceKind: 'block' },
    { id: 'b2', kind: 'house', rect: [20, 43, 30.5, 66], face: 'N', wall: 'siding', tint: 0xe8dcc8, roof: 'galv', name: '吉岡', fenceKind: 'fence' },
    { id: 'home', kind: 'home', rect: [30.5, 43, 50, 66], face: 'N' },
    { id: 'b3', kind: 'house', rect: [50, 43, 62, 66], face: 'N', wall: 'mortar', tint: 0xe0d0c0, roof: 'kawara2', name: '岡本', fenceKind: 'hedge' },
    // 用水路の西（表は東か北）
    { id: 'cw1', kind: 'house', rect: [-12, 30, 6.2, 38], face: 'E', wall: 'siding', tint: 0xd0c8d8, roof: 'kawara', name: '石井', fenceKind: 'fence', shallow: true, door: 'R' },   // フェーズ11：玄関は用水路の小さな橋（自宅の橋）から
    { id: 'cw3', kind: 'house', rect: [-6, 45, 6.2, 66], face: 'N', wall: 'wood', tint: 0xb89a7a, roof: 'kawara', name: '西村', fenceKind: 'block', door: 'L' },   // フェーズ11：玄関は祠のある角の側（東は物置の塀）
    // 見えるだけの奥（当たり判定の埋め）
    { id: 'f_w1', kind: 'fill', rect: [-44, 30, -12, 38] }, { id: 'f_w2', kind: 'fill', rect: [-44, 38, -6, 45] }, { id: 'f_w4', kind: 'fill', rect: [-44, 45, -6, 66] },
    { id: 'f_c2', kind: 'fill', rect: [0, 43, 6.2, 45] }, { id: 'f_e2', kind: 'fill', rect: [62, 27, 66, 38] }, { id: 'f_e3', kind: 'fill', rect: [62, 43, 66, 66] },
    { id: 'f_endW', kind: 'barrier', rect: [-46, 1, -44, 14] },
    { id: 'f_aveS', kind: 'barrier2', rect: [66, 46, 92, 48] }, { id: 'f_aveS2', kind: 'field', rect: [66, 48, 118, 66] }, { id: 'f_aveS3', kind: 'fill', rect: [92, 46, 118, 48] },
  ],
  // 自宅の区画の中の当たり判定（家の壁は level.js の buildHome。ここは塀・物置・裏庭）
  homeLot: {
    gate: [40.6, 43.4],                   // 門（ブロック塀の切れ目）x の範囲（z=43）
    solids: [[48, 43, 50, 66, 1.8], [30.5, 52, 36, 66, 2.4], [36, 56, 48, 66, 1.8], [30.5, 43, 30.8, 52, 1.8]],
  },
  // P14：横丁の飲み屋の長屋（南の側・表は北＝横丁）。front：店の前の物（bench＝縁台・taru＝樽の机：当たり判定は townSolids）
  yokochoUnits: [
    { name: '焼き鳥（仮）', kind: 'yakitori', x0: 44, front: [] },
    { name: 'おでん（仮）', kind: 'oden', x0: 48, front: ['bench'] },
    { name: '立ち飲み（仮）', kind: 'tachinomi', x0: 52, front: ['taru'] },
    { name: 'スナック 雪（仮）', kind: 'snack', x0: 56, front: [] },
  ],
  // 交差点・信号・横断歩道
  crossings: [
    { id: 'x_main', x0: 8.6, x1: 12.4, z0: 4.5, z1: 11.5, signal: true },        // 用水路沿いの道の正面（信号つき）
    { id: 'x_fore', x0: -2.2, x1: 2.2, z0: 4.5, z1: 11.5, signal: false },       // アーケード前（信号なし・押しボタン無し）
    // フェーズ10：中央通りの交差点（駅前通りが突き当たる）・電停の前の横断歩道。along：歩く向き（z＝南北に渡る・x＝東西に渡る）
    { id: 'x_aveW', x0: 66.2, x1: 69.8, z0: 4.5, z1: 11.5, signal: true, phase: 0 },
    { id: 'x_aveN', x0: 70, x1: 88, z0: -2.8, z1: 0.6, signal: true, along: 'x', phase: 1 },
    { id: 'x_aveS', x0: 70, x1: 88, z0: 14.4, z1: 17.8, signal: true, along: 'x', phase: 1 },
    { id: 'x_tram', x0: 70, x1: 88, z0: -29.8, z1: -26.6, signal: true, along: 'x', phase: 1 },
  ],
  // 電柱（l：街灯つき）。電線は順につなぐ（line ごと）
  poleLines: [
    { id: 'pl_main', pts: [[-40, 4.15], [-28, 4.15], [-17.5, 4.15], [16, 4.15], [28, 4.15], [40, 4.15], [54, 4.15], [64.2, 4.15]], lamp: 'tall' },
    { id: 'pl_mainS', pts: [[-36, 11.85], [-20, 11.85], [-8, 11.85], [24, 11.85], [38, 11.85], [52, 11.85], [64.2, 11.85]], lamp: 'tall' },
    { id: 'pl_yoko', pts: [[40, -19.85], [52, -19.85], [63, -19.85]], lamp: 'small' },
    { id: 'pl_laneB', pts: [[12.8, 16.5], [12.8, 26.5], [12.8, 36.5]], lamp: 'small' },   // P13：道の端（前は x 13.3＝コンビニの壁にめり込んでいた）
    { id: 'pl_laneA', pts: [[14.5, 37.75], [26, 37.75], [37.5, 37.75], [49, 37.75], [60.5, 37.75], [65.6, 37.75]], lamp: 'small' },
    { id: 'pl_west', pts: [[2, 37.7], [-5, 45.3]], lamp: 'small' },
  ],
  deadLamps: ['pl_laneA:3', 'ave_W:3'],        // 切れた街灯（ちらつかずに消えている）
  flickerLamps: ['pl_laneB:1', 'pl_main:4', 'ave_E:2', 'st:3'],
  // フェーズ10：中央通り・駅前の街灯（電線のない高い灯：l＝腕の向き）
  streetLights: [
    { id: 'ave_W', pts: [[66.5, 32], [66.5, 8.0], [66.5, -10], [66.5, -34], [66.5, -52], [66.5, -72]], dir: [1, 0] },
    { id: 'ave_E', pts: [[91.5, 38.4], [91.5, 10], [91.5, -10], [91.5, -34], [91.5, -56], [91.5, -74]], dir: [-1, 0] },
    { id: 'st', pts: [[46, -82], [58, -106], [90, -82], [102, -108], [112, -82], [46, -100]], dir: [0, 0] },
  ],
  // 小物（kind ごとに world/town.js が形を作る）
  props: [
    { kind: 'mirror', x: 7.9, z: 37.6, ry: Math.PI * 0.25 }, { kind: 'mirror', x: 13.2, z: 14.4, ry: -Math.PI * 0.75 }, { kind: 'mirror', x: 0.3, z: 37.7, ry: Math.PI * 0.75 },
    { kind: 'vending', x: 16.4, z: 19.4, ry: Math.PI, color: 0xd03a3a }, { kind: 'vending', x: 17.5, z: 19.4, ry: Math.PI, color: 0x2a6ad0 },   // フェーズ11：自動ドアの前から西へ
    { kind: 'vending', x: 23.2, z: 38.5, ry: 0, color: 0xe8e8e8 },
    { kind: 'garbage', x: 16.8, z: 38.65, ry: 0 },
    { kind: 'busstop', x: -15, z: 2.0, name: '駅前通り　バス停（仮）' },
    { kind: 'bikes', x: -5.4, z: -1.5, n: 5, ry: Math.PI / 2 }, { kind: 'bikes', x: 5.4, z: -1.5, n: 4, ry: -Math.PI / 2 },
    { kind: 'car', x: 33.2, z: 47.6, ry: 0, color: 0x9a3a4a, kei: true },        // 自宅のカーポート
    { kind: 'car', x: 19.55, z: 17.4, ry: Math.PI, color: 0xe8e8ec, type: 'minivan' },          // コンビニ（前向きに止めた車）
    { kind: 'car', x: 27.65, z: 17.4, ry: 0, color: 0x2a3a5a },
    { kind: 'car', x: 24.95, z: 17.4, ry: 0, color: 0x8a2a2a, type: 'hatch' },                  // コンビニの駐車場（P13：前は広場の入口の通路で店の壁にめり込んでいた）
    { kind: 'car', x: -30, z: 9.6, ry: -Math.PI / 2, color: 0xc8c8c8, abandoned: true },   // 乗り捨てられた車（道の上）
    { kind: 'bike', x: 47.2, z: 44.2, ry: 0.3 }, { kind: 'bike', x: 21.5, z: 42.7, ry: 1.4 },
    { kind: 'cone', x: -42, z: 6 }, { kind: 'cone', x: -42, z: 9 },
    { kind: 'sign', x: 13.4, z: 15.2, text: '通学路', color: 0x2a6ad0 }, { kind: 'sign', x: 13.15, z: 36.6, text: '止まれ', color: 0xc02a2a, tri: true },
    { kind: 'sign', x: 7.8, z: 15.0, text: '止まれ', color: 0xc02a2a, tri: true },
    { kind: 'planter', x: 36.6, z: 43.6 }, { kind: 'planter', x: 47.3, z: 43.6 },
    { kind: 'board', x: 19.4, z: 37.95, text: '回覧：ゴミは朝 8 時までに' },
    { kind: 'snowpole', x: 12.8, z: 30 }, { kind: 'snowpole', x: 12.8, z: 22 },          // 雪国の町らしさ（矢羽根）：場所は決めない
    // フェーズ10：中央通り（バス停・矢羽根・雪囲いの植え込み）
    { kind: 'busstop2', x: 66.9, z: -58, ry: Math.PI / 2, name: 'バス停　中央通り（仮）', solid: [66.25, -59.6, 67.45, -56.4] },
    { kind: 'busstop2', x: 91.1, z: 28, ry: -Math.PI / 2, name: 'バス停　中央通り南（仮）', solid: [90.55, 26.4, 91.75, 29.6] },
    ...[38, 22, -4, -16, -40, -46, -66].map(z => ({ kind: 'snowpole', x: 69.8, z })), ...[38, 20, -6, -20, -44, -64].map(z => ({ kind: 'snowpole', x: 88.2, z })),
    ...[30, 20, -14, -40, -64].map(z => ({ kind: 'yukigakoi', x: 69.25, z })), ...[16, -4, -22, -44, -62].map(z => ({ kind: 'yukigakoi', x: 88.75, z })),
    // P16：中央通りの街路樹（イチョウ並木：雪囲い・街灯・電柱・矢羽根・横断歩道の間。幹の当たりは townSolids）
    ...[41, -32, -52, -71].map(z => ({ kind: 'streettree', sp: 'ichou', h: 9.5, x: 69.25, z })), ...[40, -13, -53, -71].map(z => ({ kind: 'streettree', sp: 'ichou', h: 9.5, x: 88.75, z })),
    { kind: 'sign', x: 69.7, z: 18.6, text: '電車通り', color: 0x2a6ad0 }, { kind: 'sign', x: 69.7, z: -76.5, text: '駅前', color: 0x2a6ad0 },
    { kind: 'vending', x: 65.55, z: -15.0, ry: Math.PI / 2, color: 0x2a6ad0 },
    { kind: 'car', x: 72.2, z: 24, ry: Math.PI, color: 0xe8e8e4, hazard: true, type: 'truck' },
    { kind: 'car', x: 86.0, z: -12, ry: 0, color: 0x3a3a48, type: 'hatch' },
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
      // フェーズ10：通り抜け・広場・横丁・中央通り・駅前
      arcMid: [0, -25], passage: [7.5, -25], gpW: [12.5, -23], gpC: [23, -21.75], gpS: [23, -4], n23: [23, 2.8], ysW: [37, -21.75],
      aveXN: [68, 2.8], aveXS: [68, 12.8], aveS1: [68, 40.5], laneE: [62, 40.5], aveSide: [68, -21.75], aveTram: [68, -28.2], aveBus: [68, -50], aveN: [68, -80],
      xtW: [75.5, -28.2], xtE: [82.5, -28.2], tpW: [75.5, -38], tpE: [82.5, -38], aveETram: [90, -28.2], aveEN: [90, -80], aveEXN: [90, -1.2],
      stSW: [85, -80], stFront: [85, -106], stDoor: [79, -108], stIsl: [76.8, -81], stIslN: [76.8, -98.6], stTram: [68, -98.6], stBus: [97, -97], stTaxi: [51.5, -90], stClock: [60, -82.5],
    },
    edges: [['arcade', 'gate'], ['gate', 'fore'], ['fore', 'xN'], ['xN', 'xS'], ['xS', 'j2'], ['j2', 'lb'], ['lb', 'j1'], ['j1', 'homeGate'], ['homeGate', 'homeYard'], ['homeYard', 'homeDoor'],
      ['lb', 'park'], ['j1', 'shrine'], ['xS', 'konbini'], ['xN', 'n23'], ['n23', 'east'], ['fore', 'west'],
      ['arcade', 'arcMid'], ['arcMid', 'passage'], ['passage', 'gpW'], ['gpW', 'gpC'], ['gpC', 'gpS'], ['gpS', 'n23'], ['gpC', 'ysW'], ['ysW', 'aveSide'],
      ['east', 'aveXN'], ['aveXN', 'aveXS'], ['aveXS', 'aveS1'], ['aveS1', 'laneE'], ['laneE', 'homeGate'], ['aveXN', 'aveSide'], ['aveSide', 'aveTram'], ['aveTram', 'aveBus'], ['aveBus', 'aveN'],
      ['aveTram', 'xtW'], ['xtW', 'tpW'], ['xtW', 'xtE'], ['xtE', 'tpE'], ['xtE', 'aveETram'], ['aveETram', 'aveEXN'], ['aveXN', 'aveEXN'], ['aveETram', 'aveEN'],
      ['aveN', 'stClock'], ['aveN', 'stIsl'], ['stIsl', 'stSW'], ['aveEN', 'stSW'], ['stSW', 'stFront'], ['stFront', 'stDoor'], ['stIsl', 'stIslN'], ['stIslN', 'stTram'], ['stFront', 'stBus'], ['stClock', 'stTaxi']],
  },
  // 自宅 → アーケードの道のり（通しプレイで実際に歩く。角ごとの点）
  route: [[42, 47.2], [42, 44.6], [42, 40.5], [10.5, 40.5], [10.5, 12.8], [10.5, 2.8], [0, 2.8], [0, -6]],
  // フェーズ10：歩いて行ける道のり（通しプレイ・試験）。自宅 → 駅（家の前の道を東 → 中央通りを北 → 駅前広場 → 駅舎の前）／駅 → 商店街（中央通り → 横丁 → 広場 → 通り抜け → アーケード）
  routes: {
    home_station: [[42, 47.2], [42, 44.6], [42, 40.5], [68, 40.5], [68, 12.8], [68, 2.8], [68, -80], [85, -80], [85, -106], [79, -108]],
    station_arcade: [[79, -108], [85, -106], [85, -80], [68, -80], [68, -21.75], [37, -21.75], [23, -21.75], [12.5, -23.5], [7.5, -25], [0, -25], [0, -30]],
  },
  // ── フェーズ10：中央通り（電車通り・バス通り）・駅前の細かい配置 ──
  avenue: {
    x0: 70, x1: 88, z0: -78, z1: 46, lanes: [73.5, 84.5],     // 車線の境（破線）
    // 路面電車の線路（2 本の線路の中心。軌間 1.067m）。南の端（z 46）から北へ、駅前広場で輪になる（反時計回り：T2 で入り T1 で出る）
    tracks: [
      { id: 'T2', pts: [[80.25, 46], [80.25, -96], [56, -96], [56, -84], [77.75, -84], [77.75, 46]], r: 4.5 },
    ],
    gauge: 1.067,
    // 電停（中央通りの真ん中・線路の両側の島）：高さ 0.24m（歩いて上がれる）。rail：車道側の手すり
    stops: [
      { id: 'tsW', rect: [74.6, -46, 76.5, -30], name: '電停　商店街前（仮）', rail: 'W', shelter: [-42, -34] },
      { id: 'tsE', rect: [81.5, -46, 83.4, -30], name: '電停　商店街前（仮）', rail: 'E', shelter: [-42, -34] },
      { id: 'tsSt', rect: [58, -100.2, 78, -97.6], name: '電停　駅前（仮）', rail: null, station: true },
    ],
    // 架線の柱（線路の間・輪のまわり）。電線は柱の順に張る
    catenary: [
      { pts: [[79, 40], [79, 16], [79, -8], [79, -32], [79, -56], [79, -76]], arms: [77.75, 80.25] },
      { pts: [[82.6, -88], [82.6, -98.8], [66, -98.8]], loop: true },
    ],
    // 消雪の水の出口（道の中央・さびの跡）：x の列 × z の範囲
    nozzles: [{ x: 75.0, z0: -76, z1: 44, step: 3 }, { x: 83.0, z0: -76, z1: 44, step: 3 }, { z: 8, x0: -40, x1: 68, step: 3.2 }],
    // 停まった路面電車（独自の意匠：2 両つなぎ・白に青緑の帯）と バス・タクシー
    trams: [
      { id: 'tram1', x: 77.75, z: -40, ry: 0, len: 14.4, dest: '回送', hazard: true },   // P13：架線の柱（z −32）に重ならない所へ（前は −38）
      { id: 'tram2', x: 67, z: -96, ry: Math.PI / 2, len: 14.4, dest: '駅前', lit: true },
    ],
    buses: [
      { id: 'bus1', x: 101, z: -96, ry: 0, dest: '回送', lit: true },
      { id: 'bus2', x: 72.0, z: -64, ry: Math.PI, dest: '中央通り経由　駅前', lit: false },
    ],
  },
  station: {
    rect: [44, -128, 116, -112], front: -112, atrium: [70, 88],
    canopy: [50, -112, 110, -98.4, 9.2],                     // 大屋根（x0, z0, x1, z1, 高さ）
    clock: [62, -80],
    bikes: { rect: [40.6, -86, 54, -80.6] },                // 駐輪場（屋根つき）
    taxi: { lane: [42.5, -110, 54, -86], stand: [53, -102], cars: [[45, -108, 0], [45, -102.5, 0], [45, -97, 0], [45, -91.5, 0]] },
    bus: { islands: [[96, -106, 98, -84], [104, -106, 106, -84]], bays: ['1', '2', '3', '4'], shelter: true },
    walkway: { x0: 92.4, x1: 94.6, z0: -98.4, z1: -80 },      // 屋根つきの歩道（大屋根 → 中央通りの歩道）
    island: [58.5, -94, 75.5, -86],                           // 線路の輪の中の植え込み
    benches: [[57, -79.0], [47, -79.0], [110, -86], [113, -96]],
  },
  // ガラスの屋根の広場（総曲輪の広場の雰囲気を参考にした独自の意匠）。屋根の高さ・柱・舞台・段の席・大きな画面・机と椅子・植え込み
  gplaza: {
    rect: [10.6, -34, 36, -6.5], roofY: 15.5, ridgeY: 18.5, cols: [[10.9, -33.7], [23.3, -33.7], [35.7, -33.7], [35.7, -6.8], [26.2, -6.8], [19.8, -6.8], [10.9, -6.8], [10.9, -20.2]],
    stage: [16, -33.6, 30, -30.4], steps: [[13, -16.2, 19, -14.2], [27, -16.2, 33, -14.2]], screen: [23, -33.9, 10, 4.2],
    tables: [[15, -10.6], [20.5, -11.4], [30.5, -10.6]], planters: [[13.2, -27.4], [33.6, -27.4], [33.6, -12.2]], name: 'ひかり広場（仮）',
  },
  // 細い隙間をふさぐ当たり判定（見た目は建物のかげ）
  closers: [[10.5, -35.3, 11.4, -34], [36, -78, 40, -76], [116, -78, 118, -76]],
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
    if (L.kind === 'barrier2') { R(x0, z0, x1, z1, 1.4); continue; }
    R(x0, z0, x1, z1, L.kind === 'fill' ? 3 : ['tower', 'dept', 'station', 'fillB'].includes(L.kind) ? 14 : 7.5);
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
  // ── フェーズ10：中央通り・駅前・ガラスの屋根の広場 ──
  if (T.streetLights) for (const sl of T.streetLights) for (const [x, zz] of sl.pts) R(x - 0.15, zz - 0.15, x + 0.15, zz + 0.15, 9);
  for (const p of T.props) {
    if (p.kind === 'busstop2') R(...p.solid, 2.6);
    if (p.kind === 'yukigakoi') R(p.x - 0.45, p.z - 0.45, p.x + 0.45, p.z + 0.45, 1.8);
    if (p.kind === 'streettree') R(p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3, 4);      // P16：街路樹の幹（公園の木と同じ）
  }
  for (const [x, zz] of signalPoles(T)) R(x - 0.1, zz - 0.1, x + 0.1, zz + 0.1, 5);
  if (T.yokochoUnits) { const zf = T.walk.find(w => w.id === 'yokocho').rect[3];      // P14：横丁の店の前の縁台・樽の机
    for (const u of T.yokochoUnits) { if (u.front.includes('bench')) R(u.x0 + 0.28, zf - 0.53, u.x0 + 1.42, zf, 0.45); if (u.front.includes('taru')) R(u.x0 + 0.2, zf - 0.92, u.x0 + 1.04, zf, 1.0); } }
  const A = T.avenue;
  if (A) {
    for (const st of A.stops) {                                       // 電停：島（歩いて上がれる 0.24m）・車道側の手すり・屋根の柱
      const [x0, z0, x1, z1] = st.rect; R(x0, z0, x1, z1, 0.24);
      if (st.rail === 'W') R(x0, z0, x0 + 0.12, z1 - 1.2, 1.1); if (st.rail === 'E') R(x1 - 0.12, z0, x1, z1 - 1.2, 1.1);
      if (st.rail) R(x0, z0, x1, z0 + 0.12, 1.1);                     // 南の端も手すり（北の端が横断歩道への口）
      for (const [x, zz] of stopPosts(st)) R(x - 0.06, zz - 0.06, x + 0.06, zz + 0.06, 2.6);
    }
    for (const [x, zz] of catenaryPoles(T)) R(x - 0.16, zz - 0.16, x + 0.16, zz + 0.16, 8);
    for (const t of A.trams) { const [x0, z0, x1, z1] = vehicleRect(t.x, t.z, t.ry, t.len, 2.4); R(x0, z0, x1, z1, 3.6); }
    for (const b of A.buses) { const [x0, z0, x1, z1] = vehicleRect(b.x, b.z, b.ry, 10.5, 2.5); R(x0, z0, x1, z1, 3.2); }
  }
  const ST = T.station;
  if (ST) {
    { const [x, zz] = ST.clock; R(x - 0.5, zz - 0.5, x + 0.5, zz + 0.5, 6); }
    { const [x0, z0, x1, z1] = ST.bikes.rect; R(x0, z0 + 1.2, x1, z0 + 2.0, 1.1); R(x0, z1 - 2.0, x1, z1 - 1.2, 1.1); for (const [x, zz] of [[x0 + 0.2, z0 + 0.3], [x1 - 0.2, z0 + 0.3], [x0 + 0.2, z1 - 0.3], [x1 - 0.2, z1 - 0.3]]) R(x - 0.08, zz - 0.08, x + 0.08, zz + 0.08, 2.4); }
    for (const [x, zz] of ST.taxi.cars) R(x - 0.85, zz - 2.2, x + 0.85, zz + 2.2, 1.5);
    { const [x, zz] = ST.taxi.stand; R(x - 1.6, zz - 0.3, x + 1.6, zz + 0.3, 2.4); }
    for (const [x0, z0, x1, z1] of ST.bus.islands) { R(x0, z0, x1, z1, 0.24); for (let zz = z0 + 2; zz < z1 - 1; zz += 5.5) R(x0 + 0.1, zz - 0.08, x0 + 0.26, zz + 0.08, 2.6); }
    for (const [x, zz] of walkwayPosts(T)) R(x - 0.07, zz - 0.07, x + 0.07, zz + 0.07, 3);
    for (const [x, zz] of canopyColumns(T)) R(x - 0.25, zz - 0.25, x + 0.25, zz + 0.25, 9);
    { const [x0, z0, x1, z1] = ST.island; R(x0, z0, x1, z1, 0.6); }
    for (const [x, zz] of ST.benches) R(x - 0.9, zz - 0.3, x + 0.9, zz + 0.3, 0.8);
  }
  const G = T.gplaza;
  if (G) {
    for (const [x, zz] of G.cols) R(x - 0.25, zz - 0.25, x + 0.25, zz + 0.25, 16);
    R(...G.stage, 0.6);
    for (const r of G.steps) R(...r, 0.8);
    for (const [x, zz] of G.tables) R(x - 0.9, zz - 0.9, x + 0.9, zz + 0.9, 0.9);
    for (const [x, zz] of G.planters) R(x - 0.8, zz - 0.8, x + 0.8, zz + 0.8, 1.0);
  }
  for (const c of T.closers || []) R(c[0], c[1], c[2], c[3], 7);
  return out;
}
/** 乗り物の足もと（中心・向き・長さ・幅）→ [x0, z0, x1, z1]。ry＝0 は南北（z）に長い */
export function vehicleRect(x, z, ry, len, w) { const along = Math.abs(Math.sin(ry)) > 0.5; const a = along ? len : w, b = along ? w : len; return [x - a / 2, z - b / 2, x + a / 2, z + b / 2]; }
/** 信号の柱（横断歩道の両端）。along：歩く向き */
export function signalPoles(T = TOWN) {
  const out = [];
  for (const c of T.crossings) {
    if (!c.signal || c.id === 'x_main') continue;                     // x_main（用水路沿いの道の正面）は前からの形（world/town.js）
    if (c.along === 'x') out.push([c.x0 - 0.45, c.z1 + 0.3], [c.x1 + 0.45, c.z0 - 0.3]);
    else out.push([c.x0 + 0.25, c.z1 + 0.45], [c.x1 - 0.25, c.z0 - 0.45]);
  }
  return out;
}
/** 電停の屋根の柱 */
export function stopPosts(st) {
  if (!st.shelter) return [];
  const [x0, , x1] = st.rect, [za, zb] = st.shelter, x = st.rail === 'W' ? x0 + 0.25 : x1 - 0.25, out = [];
  for (let z = za + 0.4; z <= zb; z += 3.8) out.push([x, z]);
  return out;
}
/** 架線の柱 */
export function catenaryPoles(T = TOWN) { const out = []; if (T.avenue) for (const c of T.avenue.catenary) for (const p of c.pts) out.push(p); return out; }
/** 屋根つき歩道の柱 */
export function walkwayPosts(T = TOWN) { const w = T.station && T.station.walkway, out = []; if (!w) return out; for (let z = w.z0 + 0.4; z <= w.z1 - 0.2; z += 4) out.push([w.x0 + 0.1, z], [w.x1 - 0.1, z]); return out; }
/** 駅の大屋根の柱（駅舎の前・電停より奥） */
export function canopyColumns(T = TOWN) { const c = T.station && T.station.canopy, out = []; if (!c) return out; for (let x = c[0]; x <= c[2] + 0.1; x += 12) out.push([x, -101.4]); return out; }
/** 家の建物の足もと（区画の中・表から下がる） */
export function houseFoot(L) {
  const [x0, z0, x1, z1] = L.rect, f = L.face, set = 3.2, side = 1.2, back = L.shallow ? 0.8 : 2.4;
  const w = x1 - x0, d = z1 - z0, maxD = Math.min(10, (f === 'N' || f === 'S' ? d : w) - set - back);
  if (f === 'N') return [x0 + side, z0 + set, x1 - side, z0 + set + maxD];
  if (f === 'S') return [x0 + side, z1 - set - maxD, x1 - side, z1 - set];
  if (f === 'E') return [x1 - set - maxD, z0 + side, x1 - set, z1 - side];
  return [x0 + set, z0 + side, x0 + set + maxD, z1 - side];
}
// ───────────── フェーズ11：建物の出入り口（玄関・店の戸・シャッター・自動ドア）。world/town.js・town2.js もここから位置を取る ─────────────
/** 決まった乱数（区画の id から。world/town.js と同じ） */
// 本体は共通の mapkit/core/rng.js へ移した（出る数は同じ）。ここは再輸出するだけ
export { seeded };
/** 建物の区画の種類（出入り口が要る物） */
export const BUILDING_KINDS = ['house', 'shop', 'bldg', 'apartment', 'konbini', 'machiya', 'tower', 'dept', 'station', 'home'];
/** 区画の枠（world/town.js の frame と同じ）：u＝表に沿って・v＝表から奥へ */
export function lotFrame(L) {
  const [x0, z0, x1, z1] = L.rect, f = L.face || 'N', alongX = f === 'N' || f === 'S';
  const W = alongX ? x1 - x0 : z1 - z0, D = alongX ? z1 - z0 : x1 - x0;
  const at = (u, v) => f === 'N' ? [x0 + u, z0 + v] : f === 'S' ? [x0 + u, z1 - v] : f === 'E' ? [x1 - v, z0 + u] : [x0 + v, z0 + u];
  const out = f === 'N' ? [0, -1] : f === 'S' ? [0, 1] : f === 'E' ? [1, 0] : [-1, 0];
  return { W, D, at, out, alongX, f };
}
/** 家の玄関：u（表に沿った位置）。門の切れ目（幅 gate）も同じ u。L.door（'L'｜'R'）で決められる・無ければ id の乱数（最初の 1 回） */
export function houseDoor(L) {
  const F = lotFrame(L), side = 1.2, a = F.W - side * 2, first = seeded(L.id)();
  const left = L.door ? L.door === 'L' : first < 0.5;
  return { u: side + (left ? 1.3 : a - 1.3), gate: 1.3, set: 3.2 };
}
/** 町家の戸口（間口 9m ごとに 1 つ）。r：続きの乱数（屋根の瓦などに使う） */
export function machiyaDoors(L) {
  const F = lotFrame(L), r = seeded(L.id), W = F.W, units = Math.max(1, Math.round(W / 9)), doors = [];
  for (let k = 0; k < units; k++) { const u0 = k * W / units, uw = W / units, u = u0 + uw * (0.35 + r() * 0.3), w = Math.min(2.0, uw * 0.3), lit = !!(L.lit && (k === 0 || r() < 0.5)); doors.push({ u, w, lit, u0, uw }); }
  return { doors, r };
}
/**
 * 区画の出入り口の一覧：{ lot, kind（door｜shutter｜auto｜glass｜gate）, u, w, door:[x,z]（建物の面の上）, gate:[x,z]（区画の表の縁＝道に出る所）, out:[ox,oz] }
 * 家は門（塀の切れ目）と玄関が同じ u。店・ビルは表の面＝区画の縁。
 */
export function lotEntrances(L, T = TOWN) {
  if (!BUILDING_KINDS.includes(L.kind)) return [];
  if (L.kind === 'home') { const g = T.homeLot.gate, x = (g[0] + g[1]) / 2; const [dx, dz] = homeW(0, 6); return [{ lot: L.id, kind: 'door', u: x - L.rect[0], w: g[1] - g[0], door: [dx, dz - 0.2], gate: [x, L.rect[1]], out: [0, -1] }]; }
  const F = lotFrame(L), E = (kind, u, w, v) => ({ lot: L.id, kind, u, w, door: F.at(u, v), gate: F.at(u, 0), out: F.out });
  if (L.kind === 'house') { const d = houseDoor(L); return [E('door', d.u, 0.95, d.set)]; }
  if (L.kind === 'shop' || L.kind === 'bldg') return [E(L.shutter && !L.office ? 'shutter' : 'door', L.shutter && !L.office ? F.W / 2 : shopDoorU(L), L.shutter && !L.office ? F.W - 0.8 : 1.6, 0)];
  if (L.kind === 'apartment') return [E(L.open ? 'gate' : 'door', F.W / 2, L.open ? 2.4 : 1.8, L.open ? 0 : 2.0)];
  if (L.kind === 'konbini') return [E('auto', F.W - 2.4, 1.8, 0)];
  if (L.kind === 'machiya') return machiyaDoors(L).doors.map(d => E('door', d.u, d.w, 0));
  if (L.kind === 'tower') return [E('glass', F.W / 2, 2.4, 0)];
  if (L.kind === 'dept') return deptDoorsU(L).map(u => E('auto', u, 3.0, 0));
  if (L.kind === 'station') { const S = T.station, ac = (S.atrium[0] + S.atrium[1]) / 2 - L.rect[0]; return [-3.5, 0, 3.5].map(o => E('glass', ac + o, 3.0, 0)); }
  return [];
}
/** 店の戸（ガラスの店・事務所）：表の中ほど（看板の下・左寄り） */
export function shopDoorU(L) { const W = lotFrame(L).W; if (L.office) return 1.6; return Math.max(1.3, Math.min(W - 1.3, W * 0.3)); }
/** 百貨店・まちなかのビルの自動ドア（間口 12m ごとに 1 つ・両端は避ける） */
export function deptDoorsU(L) { if (L.doorsU) return L.doorsU.slice(); const W = lotFrame(L).W, n = Math.max(1, Math.round(W / 12)), out = []; for (let i = 0; i < n; i++) out.push((i + 0.5) * W / n); return out; }
/** 奥の家並み（fill）・奥のビル（fillB）の升目（world/town.js の backHouses・town2.js の fillB と同じ割り方） */
export function fillCells(L) {
  const [x0, z0, x1, z1] = L.rect, out = [];
  if (L.kind === 'fill') {
    // 細い区画（幅 6m 未満）：長い向きに 8〜10m ごと・縁から 0.3m（狭い家・物置）。2.5m 未満は塀だけ（small）
    if (x1 - x0 < 6 || z1 - z0 < 6) { const alongX = x1 - x0 >= z1 - z0, len = alongX ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(len / 9)), step = len / n;
      for (let i = 0; i < n; i++) { const a = (alongX ? x0 : z0) + i * step; const r = alongX ? [a + 0.3, z0 + 0.3, a + step - 0.3, z1 - 0.3] : [x0 + 0.3, a + 0.3, x1 - 0.3, a + step - 0.3]; out.push({ rect: r, narrow: true, small: r[2] - r[0] < 2.5 || r[3] - r[1] < 2.5 }); }
      return out; }
    for (let x = x0; x < x1 - 4; x += 10) for (let z = z0; z < z1 - 4; z += 10) { const w = Math.min(10, x1 - x) - 2, d = Math.min(10, z1 - z) - 2; out.push({ rect: [x + 1, z + 1, x + 1 + w, z + 1 + d], x, z, small: w < 3 || d < 3 }); } }
  else if (L.kind === 'fillB') {
    if (x1 - x0 < 4 || z1 - z0 < 4) return [{ rect: [x0, z0, x1, z1], small: true }];
    for (let x = x0; x < x1 - 2; x += 12) for (let z = z0; z < z1 - 2; z += 12) { const w = Math.min(12, x1 - x) - 0.6, d = Math.min(12, z1 - z) - 0.6; out.push({ rect: [x + 0.3, z + 0.3, x + 0.3 + w, z + 0.3 + d], x, z, small: w < 3 || d < 3 }); }
  }
  return out;
}
/** 歩ける所か（T.walk の範囲・どの区画の中でもない） */
export function isWalkable(x, z, T = TOWN) {
  if (!T.walk.some(w => x > w.rect[0] && x < w.rect[2] && z > w.rect[1] && z < w.rect[3])) return false;
  return !T.lots.some(L => L.kind !== 'home' && L.kind !== 'parking' && x > L.rect[0] && x < L.rect[2] && z > L.rect[1] && z < L.rect[3]);
}
let _solids = null;
/** 出入り口の前を塞ぐ物（電柱・自販機・車など。0.3m の余裕）があるか */
export function blockedAt(x, z, T = TOWN, r = 0.3) { if (!_solids || _solids.T !== T) { _solids = townSolids(T).filter(b => b.maxY > 0.3); _solids.T = T; } return _solids.some(b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r); }
/** 奥の家並み・ビルの、道に面した升目の出入り口（面の真ん中）：{ lot, cell, side, door:[x,z], gate:[x,z], out } */
export function fillEntrances(L, T = TOWN) {
  const out = [], [lx0, lz0, lx1, lz1] = L.rect;
  fillCells(L).forEach((c, i) => {
    if (c.small) return;
    const [x0, z0, x1, z1] = c.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [side, near, gx, gz, dx, dz, o] of [['N', z0 - lz0, cx, lz0 - 0.8, cx, z0, [0, -1]], ['S', lz1 - z1, cx, lz1 + 0.8, cx, z1, [0, 1]], ['W', x0 - lx0, lx0 - 0.8, cz, x0, cz, [-1, 0]], ['E', lx1 - x1, lx1 + 0.8, cz, x1, cz, [1, 0]]]) {
      if (near > 1.2) continue;
      const alongX = side === 'N' || side === 'S', half = (alongX ? x1 - x0 : z1 - z0) / 2 - 0.8;
      for (const k of [0, -0.5, 0.5, -0.9, 0.9]) {             // 面の真ん中から順に、道へ出られる所（塞ぐ物が無い所）
        const sx = alongX ? gx + k * half : gx, sz = alongX ? gz : gz + k * half;
        if (!isWalkable(sx, sz, T) || blockedAt(sx, sz, T)) continue;
        out.push({ lot: L.id, cell: i, side, door: alongX ? [dx + k * half, dz] : [dx, dz + k * half], gate: [sx - o[0] * 0.8, sz - o[1] * 0.8], out: o }); break;
      }
    }
  });
  return out;
}
/** ガードレールの区間（南の歩道の縁・x の範囲）。横断歩道・角・コンビニの出入り口・公園の入口を空ける */
export function guardSpans(T = TOWN) {
  const gaps = [[7, 14.5], [-2.8, 2.8], [14.5, 32], [-6.5, -0.5], [61.6, 67]]; void T;
  const out = []; let x = -43;
  for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > x) out.push([x, a]); x = Math.max(x, b); }
  if (x < 65.5) out.push([x, 65.5]);
  return out;
}
/** 街灯の一覧（電柱から）：{ id, x, z, h, kind, dead, flicker } */
export function townLamps(T = TOWN) {
  const out = [];
  for (const pl of T.poleLines) pl.pts.forEach(([x, z], i) => {
    const id = pl.id + ':' + i;
    out.push({ id, x, z, kind: pl.lamp, h: pl.lamp === 'tall' ? 6.2 : 4.6, dead: T.deadLamps.includes(id), flicker: T.flickerLamps.includes(id) });
  });
  if (T.streetLights) for (const sl of T.streetLights) sl.pts.forEach(([x, z], i) => {
    const id = sl.id + ':' + i;
    out.push({ id, x, z, kind: 'modern', h: 7.6, dir: sl.dir, dead: T.deadLamps.includes(id), flicker: T.flickerLamps.includes(id) });
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
 * 古いセーブの位置を今の町（town3）へ移す。from：セーブの place.layout（無し＝town1）。
 * town1（自宅がアーケードの南の正面・z 6〜16）：家の中 → 同じ家具の前（ローカル座標のまま自宅へ）／家の前の路地（z −4〜6）→ アーケード前の広場／アーケードの中 → そのまま。
 * town2（フェーズ9）：歩ける所は同じ（増えただけ）。新しい物（信号の柱・街灯など）に重なった時だけ、いちばん近い道案内の点へ。
 */
export function migrateTownPos(pos, from) {
  let x = pos[0], z = pos[2] != null ? pos[2] : pos[1], moved = null;
  if (from !== 'town2' && from !== TOWN_LAYOUT) {
    if (z > 6 - 0.4 && Math.abs(x) < 6.4 && z < 16.6) { const [wx, wz] = homeW(Math.max(-5.5, Math.min(5.5, x)), Math.max(6.6, Math.min(15.6, z))); return { pos: [wx, 0, wz], moved: 'home' }; }
    if (z > -4.2) return { pos: [0, 0, -2], moved: 'forecourt' };
    return { pos: [x, 0, z], moved: null };
  }
  if (!inHome(x, z) && z > -4.2) {
    const R = 0.4, hit = townSolids().some(b => b.maxY > 0.25 && x > b.minX - R && x < b.maxX + R && z > b.minZ - R && z < b.maxZ + R);
    if (hit) { const k = nearestNode(x, z); [x, z] = TOWN.nav.nodes[k]; moved = 'nudge'; }
  }
  return { pos: [x, 0, z], moved };
}

// 町全体の見取り図（区画の配置・地図の画面と docs/shinshoku/TOWN_MAP.md）。単位 m・おおよそ。ゲームの区画は 1 つずつ別に読み込む（つなぎは出入り口）。
export const MACRO = {
  note: '町の名前は未定（境界事象の町とは別）。雪国の地方都市くらいの広さ（駅から歩いて 15〜20 分の範囲）。名前・店名はすべて仮。フェーズ10：駅と中央通り（電車通り・バス通り）は商店街と同じ区画で歩ける。',
  // rect：おおよその範囲（m）。label：地図の文字の位置（重ならないように手で置く）
  districts: [
    { id: 'station', name: '駅・駅前広場（仮）', rect: [40, -128, 116, -78], kind: 'rail', area: 'shotengai', label: [-40, -150] },
    { id: 'avenue', name: '中央通り（電車通り・バス通り）', rect: [66, -78, 92, 46], kind: 'ave', area: 'shotengai', label: [110, 110] },
    { id: 'gplaza', name: 'ガラス屋根の広場（仮）', rect: [10.6, -34, 36, -6.5], kind: 'plaza2', area: 'shotengai', label: [-170, 0] },
    { id: 'shotengai', name: 'あけぼの通り商店街', rect: [-11, -72, 11, -4], kind: 'arcade', area: 'shotengai', label: [-150, -40] },
    { id: 'alley', name: '裏路地', rect: [-40, -110, 0, -72], kind: 'alley', area: 'alley', label: [-130, -160] },
    { id: 'plaza', name: '商業施設の前（ことぶきSC・仮）', rect: [-130, -112, -50, -76], kind: 'mall', area: 'plaza', label: [-250, -60] },
    { id: 'shelter', name: '市民体育館（避難所）', rect: [150, -175, 230, -105], kind: 'gym', area: 'shelter', label: [150, -186] },
    { id: 'tunnel', name: '地下通路', rect: [228, -110, 262, -66], kind: 'under', area: 'tunnel', label: [270, -100] },
    { id: 'hospital', name: '中央病院（仮）', rect: [250, -60, 340, 20], kind: 'hospital', area: 'hospital', label: [250, 36] },
    { id: 'office', name: '観測分室（仮）', rect: [250, -215, 300, -175], kind: 'office', area: 'office', label: [310, -200] },
    { id: 'lab', name: '研究施設（地下研究区画・旧研究棟・観測棟）', rect: [270, -370, 400, -255], kind: 'lab', area: 'lab', label: [150, -380] },
    { id: 'admin', name: '中央管理棟', rect: [410, -350, 450, -300], kind: 'admin', area: 'admin', label: [380, -290] },
    { id: 'residential', name: '住宅地', rect: [-44, 14, 62, 66], kind: 'res', area: 'shotengai', label: [-150, 60] },
    { id: 'konbini', name: 'コンビニ', rect: [13, 14, 32, 27], kind: 'shop', area: 'shotengai', label: [-150, 32] },
    { id: 'home', name: 'だんのうらの家', rect: [30, 43, 50, 66], kind: 'home', area: 'shotengai', label: [-150, 90] },
  ],
  roads: [
    { name: '駅前通り', pts: [[-250, 8], [70, 8]], w: 7 },
    { name: '中央通り（電車通り・バス通り）', pts: [[79, 60], [79, -112]], w: 18, noLabel: true },
    { name: '病院通り', pts: [[92, -20], [340, -20]], w: 6 },
    { name: '研究施設への道', pts: [[160, -20], [160, -195], [330, -195], [330, -255]], w: 6 },
    { name: '線路', pts: [[-250, -136], [460, -136]], w: 3, rail: true },
    { name: '路面電車（輪の線）', pts: [[80.25, 46], [80.25, -96], [56, -96], [56, -84], [77.75, -84], [77.75, 46]], w: 2, tram: true, noLabel: true },
    { name: '用水路', pts: [[6.9, 14], [6.9, 160]], w: 2, water: true },
    { name: '川', pts: [[-250, 175], [460, 135]], w: 18, water: true },
  ],
  bus: [[-60, 8], [79, 8], [79, -20], [160, -20], [250, -20]],
  busTerminal: [[79, 8], [79, -95], [101, -95]],
};
