// 第5章（旧研究棟）と第6章A の冒頭（暴走）のデータ【すべて仮・provisional】。DOM なし（node のテストから読む）。
// 区画：oldwing（旧研究棟の収容棟）─ atrium（観測棟の吹き抜け：継接）。reveal は 6A の冒頭へ town（巨大用の町）。
// ルートで順路が変わる（SCENARIO_FLOW 第5章A／B）。理由は第4章の決着の違い（同じ世界のまま）：
//   reveal：搬入ヤードの戦いで東の廊下の床が崩れた → 白い姿で跳んで主任研究室へ（延期の記録の原本）。応答炉は動いたまま＝収容棟に電気がある。
//   secret：応答炉を止めた → 旧研究棟は停電・排水ポンプも止まって地下の記録保管庫が水につかった → 配電盤（保全の知識）・弁・刀で切る封印の札
//           → 記録保管庫（延期の記録の控え）。どちらのルートも「配偶者の延期の記録」は必ず通る道の上にある（取り逃しで閉じない）。
// 名前・番号・日付はすべて仮。実在の人物・本編の設定とは関係ない。研究者・配偶者の名前は出さない（塗りつぶし）。

/** 収容棟の被験者（部屋の札・被験者名簿）。在棟の 3 人が収容者として歩いている。点呼は「在棟の人を収容の古い順に」 */
export const SUBJECTS = [
  { no: 'S-02', name: '葛西 トモ', room: '101', since: '4/02', status: '移送済' },
  { no: 'S-05', name: '宮下 ハジメ', room: '102', since: '4/09', status: '在棟' },
  { no: 'S-08', name: '桐生 アヤ', room: '103', since: '4/03', status: '在棟' },
  { no: 'S-11', name: '浅井 ゴロウ', room: '104', since: '4/15', status: '移送済' },
  { no: 'S-14', name: '野見 ミツ', room: '105', since: '4/05', status: '在棟' },
  { no: 'S-17', name: '早瀬 リク', room: '106', since: '4/11', status: '移送済' },
];
/** 日付 'M/DD' → 比べられる数 */
const dayOf = s => { const [m, d] = s.split('/').map(Number); return m * 100 + d; };
/** 点呼の正しい順（在棟・収容の古い順の名前） */
export function rollcallAnswer(list = SUBJECTS) { return list.filter(s => s.status === '在棟').sort((a, b) => dayOf(a.since) - dayOf(b.since)).map(s => s.name); }
/**
 * 点呼の判定。seq：呼んだ名前の並び。{ ok, why } why：'count'（人数が違う）|'absent'（在棟でない人を呼んだ）|'order'（順が違う）|''
 * 名簿（収容日・在棟）か、合図の時に収容者が戸口に立つ順の観察＋部屋の札、どちらからでも答えが出る。
 */
export function checkRollcall(seq = [], list = SUBJECTS) {
  const ans = rollcallAnswer(list);
  if (seq.some(n => !ans.includes(n))) return { ok: false, why: 'absent' };
  if (seq.length !== ans.length) return { ok: false, why: 'count' };
  if (seq.some((n, i) => n !== ans[i])) return { ok: false, why: 'order' };
  return { ok: true, why: '' };
}
/** 合図の時に収容者が戸口に立つ順（観察の手掛かり）：部屋の番号の並び */
export function rollcallRooms(list = SUBJECTS) { const ans = rollcallAnswer(list); return ans.map(n => list.find(s => s.name === n).room); }

/** secret の配電盤（旧研究棟の非常電源）：容量 4 のうちに点呼卓・隔離扉の錠・排水ポンプ。焼却炉は入れない */
export const BREAKERS5 = {
  provisional: true,
  capacity: 4, hint: '保全記録：焼却炉は非常時に入れないこと（収容者が騒ぐ）。',
  list: [
    { id: 'C', name: '点呼卓（収容棟）', load: 1, need: true },
    { id: 'G', name: '隔離扉の錠', load: 1, need: true },
    { id: 'P', name: '排水ポンプ（地下）', load: 2, need: true },
    { id: 'L', name: '照明（収容棟）', load: 1 },
    { id: 'X', name: '焼却炉', load: 3, forbid: true },
  ],
};
/** 遮断器の組を判定（第4章の配電盤と同じ形）。why：'forbid'|'over'|'need:<id>'|'' */
export function checkBreakers5(on = [], B = BREAKERS5) {
  const set = new Set(on), L = B.list.filter(b => set.has(b.id)), load = L.reduce((s, b) => s + b.load, 0);
  if (L.some(b => b.forbid)) return { ok: false, load, why: 'forbid' };
  if (load > B.capacity) return { ok: false, load, why: 'over' };
  for (const b of B.list) if (b.need && !set.has(b.id)) return { ok: false, load, why: 'need:' + b.id };
  return { ok: true, load, why: '' };
}

/** 資料（第5章）。required の 1 つ（延期の記録）は、ルートごとに別の場所（同じ文面の原本／控え） */
export const DOCS5 = {
  delay: { id: 'ch5_delay', title: '境界応答試験 第三次 実施の延期について（提案）', required: true, worldFact: true,
    text: '提案者：主任研究員（氏名の欄は黒く塗りつぶされている）。「隔離槽の圧の記録に説明のつかない揺れがある。原因が分かるまで、試験を一週間延ばしてほしい」。下に差し戻しの印と、別の筆跡で「予定どおり実施」。端に小さな付箋：「お願い。延ばして」' },
  roster: { id: 'ch5_roster', title: '被験者名簿（収容棟）', required: false, worldFact: true },
  notes: { id: 'ch5_notes', title: '研究ノート（境界応答）', required: false, worldFact: true,
    text: '「応答は記憶に寄る。繰り返しの手順（輪）が強いほど、こちら側の形が保たれる」……何枚かは破り取られている。' },
  duty: { id: 'ch5_duty', title: '観測棟の当番表', required: false, worldFact: true,
    text: '観測室の机：A＝当直・B＝主任研究員（第三次試験の担当）・C＝記録係。B の欄の名前だけ、上から紙が貼られている。' },
  letter: { id: 'ch5_letter', title: '被験者の手紙（103 号室）', required: false, worldFact: true,
    text: '「点呼の鐘が鳴ったら、戸の前に立つ。それだけ守れば、ここは静かです。家の猫は元気でしょうか」' },
};

/** 旧研究棟（収容棟）の敵・置き場所（座標は world/areas5.js の oldwing） */
export const OLDWING = {
  provisional: true,
  // 部屋（x：西 −、東 +、z：部屋の中心）。戸口は廊下側 x = ±2.6
  rooms: { '101': [-6.2, 2.0], '102': [-6.2, -5.0], '103': [-6.2, -12.0], '104': [6.2, 2.0], '105': [6.2, -5.0], '106': [6.2, -12.0] },
  // 収容者（在棟の 3 人）：部屋の前の廊下を往復。合図（鐘）で戸口に立つ（収容の古い順に 1 体ずつ）
  shuusha: [
    { id: 'shuusha_1', subject: 'S-08', path: [[-1.6, -9.0], [-1.6, -15.0]] },
    { id: 'shuusha_2', subject: 'S-14', path: [[1.6, -2.0], [1.6, -8.0]] },
    { id: 'shuusha_3', subject: 'S-05', path: [[-1.4, 0.0], [-1.4, -6.0]] },
  ],
  bellEvery: 18,                            // 点呼の鐘（秒）
  // ルートごとの敵
  reveal: [{ id: 'mimic_o1', kind: 'mimic', pos: [0.0, -18.0] }, { id: 'mimic_o2', kind: 'mimic', pos: [-1.0, 4.0] }, { id: 'outou_o1', kind: 'outou', pos: [11.0, 6.0] }],
  secret: [{ id: 'outou_o2', kind: 'outou', pos: [9.0, 6.4], path: [[9.0, 6.4], [13.0, 6.4]] }, { id: 'outou_o3', kind: 'outou', pos: [-11.0, 7.2], path: [[-11.0, 7.2], [-11.0, 10.4]] }],
  gap: { minX: 9.95, maxX: 14.0, minZ: -13.6, maxZ: -10.0 },    // reveal：崩れた床（東の帯 → 主任研究室）
  steam: { minX: -14.0, maxX: -9.0, minZ: 6.0, maxZ: 12.0 },
  pickups: [
    { id: 'ow_ammo_1', item: 'ammo_box', pos: [-12.6, 12.2] },
    { id: 'ow_med_1', item: 'medkit_s', pos: [12.6, 12.4] },
    { id: 'ow_med_2', item: 'medkit_l', pos: [0.0, -21.8] },
    { id: 'ow_coffee', item: 'coffee', pos: [-9.4, -16.4] },
  ],
};

/** 観測棟の吹き抜け（継接の戦い）。机 A/B/C（鞄の持ち主＝当番表・鞄の札で分かる） */
export const ATRIUM = {
  provisional: true,
  boss: { id: 'tsugihagi', pos: [0, -6], home: [[0, -6], [-5, -10], [5, -10]] },
  desks: { A: [-9.0, -16.4], B: [0.0, -17.0], C: [9.0, -16.4] },
  bagOwner: 'B',
  watch: [10.6, 7.8],                       // （相棒）が見守る観測室の窓の前
  arena: { minX: -13.5, maxX: 13.5, minZ: -18.5, maxZ: 8.5 },
  pickups: [{ id: 'at_ammo_1', item: 'ammo_box', pos: [-12.4, 8.0] }, { id: 'at_med_1', item: 'medkit_l', pos: [12.4, 2.0] }],
};

/**
 * 第6章A の冒頭「暴走」（CS-06A-1・CS-06A-2）と「守る」の数値。巨大猫又は力があふれて体が言うことを聞かない（本人は抑えようとしている）。
 * 操作は「抑える」と移動だけ（市民を攻撃する入力は無い）。失敗の状態は無い：（相棒）の声で必ず我に返る。
 */
export const RAMPAGE = {
  provisional: true,
  inputs: ['move', 'suppress', 'camera'],          // 暴走の場面で使える入力の表（attack・claw・roar・beam は無い）
  suppress: { holdGain: 0.55, mashGain: 0.12, decay: 0.18 },   // 抑える：長押し（毎秒）／連打（1 回）・何もしないと下がる（毎秒）
  lurch: { every: [1.6, 3.4], dist: 7.5 },        // 勝手に踏み出す（抑えるほど間が空き、短くなる）
  calls: { first: 7.0, every: 4.2, needed: 4 },   // （相棒）が名前を呼ぶ：最初・間隔・我に返るのに要る回数
  injuryAt: 5.5,                                   // 瓦礫で（相棒）が負傷する時刻（演出のみ・致命傷ではない）
  maxSec: 40,                                      // どう操作しても、この時間で必ず我に返る（失敗の状態は無い）
  calmAt: 0.62,                                    // 呼ばれた回数がそろい、抑えがこの値以上なら早く我に返る
};
/**
 * 守る（我に返ったあと）：倒れてくる電柱・看板・落ちる瓦礫から逃げる人と（相棒）を守る。
 * kind：pole（電柱：尾で払う＝攻撃）・sign（看板：尾で払う）・debris（瓦礫：体で受ける＝弾く）・bus（避難バス：前足でつかむ＝調べる）。
 */
export const PROTECT = {
  provisional: true,
  hazards: [
    { id: 'h1', kind: 'pole', at: [-18, 2], t: 1.5, warn: 5.0, r: 10 },
    { id: 'h2', kind: 'debris', at: [1.5, 18], t: 7.0, warn: 5.0, r: 9 },
    { id: 'h3', kind: 'sign', at: [16, -2], t: 13.0, warn: 5.0, r: 10 },
    { id: 'h4', kind: 'bus', at: [-1.5, -22], t: 19.0, warn: 6.5, r: 11 },
    { id: 'h5', kind: 'debris', at: [-22, -1], t: 26.0, warn: 5.0, r: 9 },
  ],
  act: { pole: 'tailSweep', sign: 'tailSweep', debris: 'shield', bus: 'lift' },
};
