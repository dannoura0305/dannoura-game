// 第4章「境界の夜」のデータ【すべて仮・provisional】：区画の敵・拾う物・調べ物（ログの照合・配電盤）・守りの波・巨大戦の小物。
// 区画：office（観測分室・地上）─ lab（地下研究区画）─ yard（研究施設の搬入ヤード：巨大猫又の戦場・reveal だけ）。
// 名前・番号・時刻はすべて仮。本編の結末・他作品の設定には触れない。DOM なし（node のテストから読む）。

/** 観測分室（地上）。事故（停電）の時刻は第1章の回覧板と同じ 10/14 23:41 */
export const OFFICE = {
  provisional: true,
  accident: { date: '10/14', time: '23:41' },
  // カードの読み取り機は停電から非常電源の切り替えまで止まっていた（事故報告書・保全記録の 2 か所で分かる＝どちらか 1 つで足りる）
  offline: { from: '23:41', to: '02:10' },
  // 入退室の記録（必須の謎）。止まっていた間に「記録がある」1 行＝あり得ない時刻 → その職員証は保管庫の返却箱に
  logs: [
    { id: 'L1', time: '21:58', card: 'K-11', what: '研究区画 B　封鎖（定期点検）' },
    { id: 'L2', time: '23:05', card: 'K-11', what: '分室　退館' },
    { id: 'L3', time: '23:36', card: 'B-02', what: '分室　入館（当直交代）' },
    { id: 'L4', time: '23:40', card: 'B-02', what: '監視室　入室' },
    { id: 'L5', time: '00:52', card: 'B-07', what: '研究区画 B　扉　解錠' },
    { id: 'L6', time: '02:14', card: 'B-02', what: '非常電源　切替の確認' },
    { id: 'L7', time: '02:31', card: 'B-02', what: '研究区画 B　扉　施錠の確認' },
    { id: 'L8', time: '03:02', card: 'K-11', what: '分室　入館（呼び出し）' },
  ],
  answer: 'L5',
  card: 'B-07',
};

/** 時刻 'HH:MM'（深夜を跨ぐ：12 時前は翌日として足す）→ 分 */
export function toMin(t, base = '12:00') { const [h, m] = t.split(':').map(Number); let v = h * 60 + m; const [bh] = base.split(':').map(Number); if (h < bh) v += 24 * 60; return v; }
/** 止まっていた間（from〜to）に入る記録 */
export function impossibleLogs(O = OFFICE) { const a = toMin(O.offline.from), b = toMin(O.offline.to); return O.logs.filter(l => { const t = toMin(l.time); return t > a && t < b; }); }
/** 選んだ行を判定する。state：{ done, miss, picked } */
export function pickLog(state = {}, id, O = OFFICE) {
  const s = Object.assign({ done: false, miss: 0, picked: null }, state);
  if (s.done) return s;
  if (impossibleLogs(O).some(l => l.id === id)) { s.done = true; s.picked = id; } else s.miss++;
  return s;
}

/** 配電盤（secret の必須の仕掛け）：非常電源の容量 3 のうちに、制御室の隔壁を開け、槽の鎮静を保ち、応答炉は落としたまま */
export const BREAKERS = {
  provisional: true,
  capacity: 3,
  list: [
    { id: 'L', name: '照明（研究区画）', load: 1 },
    { id: 'D', name: '隔壁（制御室の扉）', load: 2, need: true },
    { id: 'S', name: '鎮静（試験槽）', load: 1, need: true },
    { id: 'R', name: '応答炉', load: 3, forbid: true },
    { id: 'V', name: '換気', load: 1 },
  ],
};
/** 入れた遮断器の組（id の並び）を判定。{ ok, load, why } why：'over'（容量を超える）|'reactor'（応答炉）|'door'|'sedation'|'' */
export function checkBreakers(on = [], B = BREAKERS) {
  const set = new Set(on), L = B.list.filter(b => set.has(b.id));
  const load = L.reduce((s, b) => s + b.load, 0);
  if (L.some(b => b.forbid)) return { ok: false, load, why: 'reactor' };
  if (load > B.capacity) return { ok: false, load, why: 'over' };
  for (const b of B.list) if (b.need && !set.has(b.id)) return { ok: false, load, why: b.id === 'D' ? 'door' : 'sedation' };
  return { ok: true, load, why: '' };
}

/** 地下研究区画の敵・置き場所（座標は world/areas4.js の lab） */
export const LAB = {
  provisional: true,
  // 応答体：習慣の輪（habit：槽 ⇄ 試験端末）・待機（idle：槽のそば）
  outou: [
    { id: 'outou_1', pos: [-10.0, 2.0], tank: [-11.2, 2.0], habit: true },
    { id: 'outou_2', pos: [10.0, -4.0], tank: [11.2, -4.0] },
    { id: 'outou_3', pos: [-10.0, -12.0], tank: [-11.2, -12.0], habit: true },
  ],
  terminal: [-5.6, 0.4],
  // 罠（試験床）：（相棒）を囲む群れ。分岐の戦い（reveal：白い姿／secret：人の姿の試練）に使う。手助けは 1 体減らす
  trap: [
    { id: 'trap_o1', kind: 'outou', pos: [-3.6, -11.6] }, { id: 'trap_o2', kind: 'outou', pos: [3.8, -11.2] }, { id: 'trap_o3', kind: 'outou', pos: [0.2, -14.0] },
    { id: 'trap_m1', kind: 'mimic', pos: [-4.4, -6.2] }, { id: 'trap_m2', kind: 'mimic', pos: [4.6, -6.0] },
  ],
  trapCenter: [0, -9.0],
  // secret：緊急停止のあと、制御室への通路をうろつく応答体（鎮静が切れかけ）
  roam: [
    { id: 'outou_r1', pos: [10.6, -14.0], path: [[10.6, -14.0], [10.6, -21.0]] },
    { id: 'outou_r2', pos: [7.0, -21.0], path: [[7.0, -21.0], [12.0, -21.0]] },
  ],
  steam: { minX: 6.0, maxX: 14.0, minZ: -23.0, maxZ: -12.0 },
  // 制御室の守り：（相棒）が端末を操作する 40 秒。波ごとに 2 つの戸口から
  hold: { sec: 40, console: [18.6, -18.2], doors: [[15.0, -13.4], [15.0, -23.0]], waves: [{ at: 0, n: 2 }, { at: 13, n: 2 }, { at: 26, n: 3 }] },
  pickups: [
    { id: 'lb_ammo_1', item: 'ammo_box', pos: [-12.0, 6.4] },
    { id: 'lb_med_1', item: 'medkit_s', pos: [12.4, 6.0] },
    { id: 'lb_med_2', item: 'medkit_l', pos: [-13.0, -19.4] },
    { id: 'lb_coffee', item: 'coffee', pos: [12.6, -9.6] },
  ],
};

export const OFFICE_AREA = {
  pickups: [
    { id: 'of_med_1', item: 'medkit_s', pos: [-10.6, 9.6] },
    { id: 'of_ammo_1', item: 'ammo_box', pos: [10.6, -1.0] },
    { id: 'of_coffee', item: 'coffee', pos: [-1.6, 10.4] },
  ],
};

/** 搬入ヤード（巨大猫又の戦場）。壊れる小物（コンテナ・ガスの槽・照明の塔・小屋・柵・クレーン）。人は置かない */
export const YARD = {
  provisional: true,
  boss: { id: 'sakibure', pos: [0, -30] },
  shelter: { x: -36, z: 30, r: 5, hp: 100 },     // （相棒）が避難したポンプ小屋（守る）
  giantStart: [6, 30, Math.PI],
  props: (() => {
    const P = []; let n = 0;
    const add = (kind, x, z, ry = 0) => P.push({ id: kind + '_' + (n++), kind, x, z, ry });
    for (let i = 0; i < 5; i++) { add('container', -50 + i * 7.5, -6, 0); add('container', 22 + i * 7.5, 2, 0.1); }
    for (let i = 0; i < 4; i++) add('container', 40, -30 + i * 6.5, Math.PI / 2);
    for (const [x, z] of [[-48, 18], [-44, 22], [46, 24], [50, 18], [-26, -24], [28, -22]]) add('tank', x, z);
    for (const [x, z] of [[-30, 6], [30, 10], [-12, 26], [16, -12], [-52, -30], [54, -6]]) add('tower', x, z);
    for (const [x, z] of [[-20, 44], [22, 46], [48, 40], [-56, 40]]) add('shed', x, z, 0.3);
    for (let i = 0; i < 8; i++) add('fence', -28 + i * 8, 52, 0);
    add('crane', -40, -40, 0.6); add('crane', 44, -44, -0.5);
    return P;
  })(),
  propHp: { container: 30, tank: 20, tower: 15, shed: 25, fence: 8, crane: 60 },
  propR: { container: 3.6, tank: 2.6, tower: 1.6, shed: 4.6, fence: 4, crane: 3.4 },
};
