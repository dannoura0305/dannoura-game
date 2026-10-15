// 第6章（A 巨躯の続き／B 制御）のデータ【すべて仮・provisional】。DOM なし（node のテストから読む）。
// 区画：reveal → ruins（暴走の後の商店街・人の大きさ）→ avenue（中央通り・巨大用：塗替との戦い）。
//       secret → admin（中央管理棟：監視室・機械室・制御室。町は壊れない）。
// どちらのルートも「最終章（終章）の入口」で止める（研究者との最後の場面・結末の台詞は入れない）。
// 研究者は声と記録だけ（名前を出さない・九条とは別人）。娘は電話・留守電・記憶だけ（危ない所に出てこない）。
// 名前・番号・時刻・数値はすべて仮。実在の人物・会社・規格とは関係ない（振動の目安は作中の保全基準）。

// ───────────────────────── 第6章A（reveal）：崩れた商店街の「置換の糸」 ─────────────────────────
/**
 * 置換の糸の中継（3 か所）。光の柱（北）から町へ伸びる糸は、中継ごとに次へ流れる。
 * 下流から切ると上流から伸び直す（元から順に切る）。白い姿の目でないと糸の流れが見えず、白い姿の爪でないと切れない（reveal の遊び）。
 * 手掛かり：①白い姿で中継を調べると「光の粒がどこから来て、どこへ流れるか」が分かる（観察）
 *           ②防災無線の記録（町の被害記録・任意）に、灯りが紫に変わった時刻の順（上流ほど早い）。どちらからでも同じ順になる。
 */
export const RELAYS = {
  provisional: true,
  list: [
    { id: 'T', name: '時計店の看板', pos: [5.2, -24.0], from: 'N', to: 'P', purpleAt: '23:58' },
    { id: 'P', name: 'アーケードの配電箱', pos: [-5.0, -4.0], from: 'T', to: 'Y', purpleAt: '00:03' },
    { id: 'Y', name: '銭湯の煙突の根もと', pos: [5.4, 16.0], from: 'P', to: '', purpleAt: '00:07' },
  ],
  source: { id: 'N', name: '北の光の柱', pos: [0, -60] },
};
/** 正しい切る順（上流から）。from をたどって求める（データから導く） */
export function relayOrder(R = RELAYS) {
  const out = []; let cur = R.source.id;
  for (let i = 0; i < R.list.length; i++) { const n = R.list.find(r => r.from === cur); if (!n) break; out.push(n.id); cur = n.id; }
  return out;
}
/** 紫に変わった時刻の順（防災無線の記録の手掛かり）。日付をまたぐ（23 時台 < 0 時台） */
export function relayOrderByTime(R = RELAYS) {
  const v = s => { const [h, m] = s.split(':').map(Number); return (h < 12 ? h + 24 : h) * 60 + m; };
  return R.list.slice().sort((a, b) => v(a.purpleAt) - v(b.purpleAt)).map(r => r.id);
}
/** 中継を切る。cut：もう切った id の並び。戻り：{ ok, why:''|'upstream'（上流がまだ）|'done'（もう切った）|'form'（白い姿でない） } */
export function cutRelay(cut, id, white, R = RELAYS) {
  if (!white) return { ok: false, why: 'form' };
  if (cut.includes(id)) return { ok: false, why: 'done' };
  const ord = relayOrder(R), next = ord[cut.length];
  if (id !== next) return { ok: false, why: 'upstream' };
  return { ok: true, why: '' };
}

/** 崩れた商店街（ruins）の置き場所・敵・資料 */
export const RUINS = {
  provisional: true,
  spawn: [0, 30, Math.PI],                 // 南（町＝暴走の場所の側）から入る
  exitNorth: [0, -38.5],                   // 北：中央通り（光の柱）へ
  busStop: [-5.4, 8.0],                    // 待人（バス停）
  umbrella: [6.4, 26.0],                   // 待人が待っている人の忘れ物（救う手掛かり）
  mimics: [{ id: 'mimic_r1', pos: [3.6, 2.0], yaw: Math.PI }, { id: 'mimic_r2', pos: [-3.8, -16.0], yaw: 0.4 }],
  spare: [{ id: 'mimic_r3', pos: [-2.4, -30.0] }, { id: 'mimic_r4', pos: [2.6, 10.0] }],   // ちがう順に切った時に出る影（2 体まで）
  pickups: [{ id: 'ru_med_1', item: 'medkit_s', pos: [-6.2, 22.0] }, { id: 'ru_ammo_1', item: 'ammo_box', pos: [6.4, -12.0] }, { id: 'ru_med_2', item: 'medkit_l', pos: [-6.0, -28.0] }],
};

/** 中央通り（avenue・巨大用）：塗替との戦い。人の残る集合住宅（3 棟）を「塗り替え」から守る */
export const AVENUE = {
  provisional: true,
  giantStart: [0, 34, Math.PI],
  boss: { id: 'nurikae', pos: [0, -14] },
  blocks: [
    { id: 'A', name: '集合住宅 A 棟', pos: [-30, -2], hp: 100 },
    { id: 'B', name: '集合住宅 B 棟', pos: [30, 6], hp: 100 },
    { id: 'C', name: '病院の別棟（相棒のいる所）', pos: [-26, 30], hp: 100 },
  ],
};

/** 資料（第6章）。worldFact：作中の人物が知り得ること */
export const DOCS6 = {
  damage: { id: 'ch6_damage', title: '防災無線の記録（町の被害）', required: false, worldFact: true,
    text: '「23:58　時計店付近の街灯が紫に変色」「00:03　アーケード中ほどで停電・配電箱から紫の光」「00:07　銭湯付近まで変色が拡大」「00:12　巨大な動物の目撃（同時刻、避難の誘導に協力したとの証言あり）」' },
  voice6a: { id: 'ch6_voice_a', title: '防災スピーカーの録音（研究者の声）', required: false, worldFact: true,
    text: '「……糸は記憶をたどる。人が毎晩見上げた灯りから、順に。だから、この町は取り戻せる」（声の主の名前は記録に無い）' },
  duty6: { id: 'ch6_duty', title: '中央管理棟の当番表と巡回記録', required: false, worldFact: true,
    text: '当直の巡回：2 分おき。監視室前 01:43 → 受付 01:45 → 機械室前 01:47。……その次の行は空白。' },
  cover: { id: 'ch6_cover', title: '事故報告書の差し替え（控え）', required: false, worldFact: true,
    text: '旧研究棟の事故の報告書が二通。一通目「主任研究員の延期の提案を退けた」。二通目（差し替え）では、その一文が消え、「予定どおり実施・異常なし」とだけある。' },
  rec6: { id: 'ch6_rec', title: '記録室の音声記録', required: false, worldFact: true,
    text: '「……あの日、延ばしていれば、と君は言うだろう。だから証明する。私の判断は、取り戻せば正しかったことになる」（声の主の名前は記録に無い）' },
  log6: { id: 'ch6_log', title: '当直の点検日誌', required: false, worldFact: true,
    text: '「P-2：ゴロゴロという音。軸受の温度が上がっている。止めたいが、上から『止めるな』と。……引き継ぎに書いておく」' },
};

// ───────────────────────── 第6章B（secret）：中央管理棟 ─────────────────────────
/**
 * 時刻の矛盾（必須・LEVEL_DESIGN_SPEC §4）：機械室の保守扉は「最後の正常な巡回の時刻」を入れると開く（当直の決まり）。
 * 監視カメラの記録時刻のうち 1 台（CAM-3）は、置き換えが始まった時から時計がずれている（記録 02:31）。
 * 画面の奥の壁時計（01:47）・当番表の巡回記録（2 分おき）のどちらからでも正しい時刻が出る。
 */
export const CLOCKS = {
  provisional: true,
  cams: [
    { id: 'C1', place: '監視室前', stamp: '01:43', wall: '1:43', who: '当直' },
    { id: 'C2', place: '受付', stamp: '01:45', wall: '1:45', who: '当直' },
    { id: 'C3', place: '機械室前', stamp: '02:31', wall: '1:47', who: '当直', drift: true },
    { id: 'C4', place: '連絡橋', stamp: '02:33', wall: '—', who: '（人の姿なし）' },
  ],
  answer: '01:47',
  options: ['01:45', '01:47', '02:31', '02:33'],
};
/** 時刻の判定。why：'drift'（ずれた記録をそのまま）|'other'|'' */
export function checkClock(t, C = CLOCKS) {
  if (t === C.answer) return { ok: true, why: '' };
  return { ok: false, why: C.cams.some(c => c.drift && c.stamp === t) ? 'drift' : 'other' };
}

/**
 * 巡回点検（必須・設備保全）：機械室の 4 台に振動計を当てて測る（長押し）→ 点検表で「止めるべき機械」を選ぶ。
 * 値は作中の保全基準（仮）：振動速度 mm/s・軸受の温度 ℃・音。前回値との比較（傾向）が大事：
 *   C-1 は値が高いが前回と同じ（基礎の共振で高めに出る・許容と保全記録にある）／P-2 は前回の 4 倍・温度も高い・ゴロゴロ（軸受）。
 * P-2 は研究者が境界の共振器につないだ冷却水ポンプ（拡大を支えている）。答え：P-2。
 */
export const ROUNDS = {
  provisional: true,
  zones: { good: 2.8, warn: 7.1 },                                    // 良 < 2.8 ≦ 注意 < 7.1 ≦ 危険（mm/s・仮）
  machines: [
    { id: 'P1', name: '冷却水ポンプ P-1', pos: [-9.0, -20.0], vib: 1.9, prev: 1.8, temp: 46, sound: '異音なし', note: '' },
    { id: 'P2', name: '冷却水ポンプ P-2', pos: [-3.0, -20.0], vib: 9.6, prev: 2.1, temp: 88, sound: 'ゴロゴロ（軸受）', note: '制御棟の配管へ増設の分岐（新しい溶接）', abnormal: true },
    { id: 'C1', name: '空気圧縮機 C-1', pos: [4.0, -20.0], vib: 7.4, prev: 7.2, temp: 61, sound: '規則的なうなり', note: '保全記録：基礎の共振で高めに出る（許容）' },
    { id: 'F1', name: '排気ファン F-1', pos: [10.0, -20.0], vib: 2.2, prev: 2.0, temp: 39, sound: '異音なし', note: '' },
  ],
  measureSec: 1.2,                                                    // 振動計を当てる長さ（長押し）
};
/** 振動の段（'good'|'warn'|'danger'） */
export function vibZone(v, R = ROUNDS) { return v < R.zones.good ? 'good' : v < R.zones.warn ? 'warn' : 'danger'; }
/** 止めるべき機械（傾向で判断：前回の 2 倍以上に増え、危険の段にあり、温度が 80℃ 以上）。データから導く */
export function roundsAnswer(R = ROUNDS) { return R.machines.filter(m => m.vib >= m.prev * 2 && vibZone(m.vib, R) === 'danger' && m.temp >= 80).map(m => m.id); }
/** 診断の判定。why：'baseline'（前回と同じ値の機械を選んだ）|'normal'|'' */
export function checkDiagnosis(id, R = ROUNDS) {
  const ans = roundsAnswer(R); if (ans.includes(id)) return { ok: true, why: '' };
  const m = R.machines.find(x => x.id === id); if (!m) return { ok: false, why: 'normal' };
  return { ok: false, why: vibZone(m.vib, R) !== 'good' && Math.abs(m.vib - m.prev) < 1 ? 'baseline' : 'normal' };
}

/**
 * 隔離（止め方）の手順（必須・設備保全の「止めて・切って・締めて・抜く」）：
 * ①現場盤で運転を止める → ②遮断器を切って施錠（ロックアウト）→ ③吐出弁を閉める → ④吸込弁を閉める → ⑤ドレン弁で残圧を抜く。
 * 間違えた時の起き方（説明）：回したまま弁を閉める＝締め切り運転・水撃（ウォーターハンマー）／吸込から閉める＝空回り（キャビテーション）／
 * 施錠の前に弁を触る＝誰かが入れ直すと危ない。何度でもやり直せる（罰は無い）。
 */
export const LOTO = {
  provisional: true,
  steps: [
    { id: 'stop', name: '現場盤で運転を止める' },
    { id: 'lock', name: '遮断器を切って施錠する（ロックアウト）' },
    { id: 'dis', name: '吐出弁を閉める' },
    { id: 'suc', name: '吸込弁を閉める' },
    { id: 'drain', name: 'ドレン弁で残圧を抜く' },
  ],
  order: ['stop', 'lock', 'dis', 'suc', 'drain'],
  hint: '保全の標準（盤の横の札）：止めて・切って・締めて・抜く。弁は吐出側から。',
};
/** 手順の判定。why：'hammer'（回したまま弁）|'lock'（施錠の前に弁）|'cav'（吸込から閉めた）|'drain'（圧が残る）|'count'|'' */
export function checkLoto(seq = [], L = LOTO) {
  if (seq.length !== L.order.length) return { ok: false, why: 'count', at: seq.length };
  const iStop = seq.indexOf('stop'), iLock = seq.indexOf('lock'), iDis = seq.indexOf('dis'), iSuc = seq.indexOf('suc'), iDr = seq.indexOf('drain');
  if (iDis < iStop || iSuc < iStop) return { ok: false, why: 'hammer' };
  if (iDis < iLock || iSuc < iLock || iStop > iLock) return { ok: false, why: 'lock' };
  if (iSuc < iDis) return { ok: false, why: 'cav' };
  if (iDr < iSuc) return { ok: false, why: 'drain' };
  return { ok: true, why: '' };
}

/** 制御装置の止め方（第6章B の終わり・必須の 1 手）：出力を 0 まで下げてから主幹を切る */
export const CONTROL_STOP = {
  provisional: true,
  options: [
    { id: 'estop', label: '非常停止（赤いボタン）', bad: '非常停止の札：「使用禁止・置き換えが途中で固まる」。……これは押せない' },
    { id: 'ramp', label: '拡大の出力を 0 まで下げてから、主幹を切る', ok: true },
    { id: 'main', label: '主幹をいきなり切る', bad: '取扱いの札：「出力のあるまま主幹を切ると、共振器に大きな電流が流れる」。……順番が違う' },
  ],
};

/** 中央管理棟（admin）の置き場所・敵 */
export const ADMIN = {
  provisional: true,
  spawn: { bridge: [0, 20.5, Math.PI], hall: [0, 4, Math.PI], machine: [0, -10.5, Math.PI], control: [0, -27.5, Math.PI] },
  machibito: { id: 'machibito_1', pos: [6.0, 15.4], clock: [8.6, 17.6], item: [-11.2, 14.6] },     // 受付の待合で待つ人（待人）・忘れ物
  roam: [{ id: 'mimic_a1', pos: [-8.0, 8.0], yaw: 0.2 }, { id: 'mimic_a2', pos: [9.0, -2.0], yaw: -1.2 }],
  boss: { id: 'touchoku', pos: [0, -16.0], desk: [12.0, -13.4], valve: [-3.0, -18.0] },
  steam: [                                                                                   // 機械室の蒸気弁（調べる＝線で噴く・当直が線の中なら崩れる）
    { id: 'V1', at: [-12.6, -12.0], dir: [1, 0], len: 9 },
    { id: 'V2', at: [12.6, -16.0], dir: [-1, 0], len: 9 },
    { id: 'V3', at: [0, -22.4], dir: [0, 1], len: 8 },
  ],
  pickups: [{ id: 'ad_med_1', item: 'medkit_s', pos: [-12.0, 18.0] }, { id: 'ad_ammo_1', item: 'ammo_box', pos: [12.4, 4.0] }, { id: 'ad_med_2', item: 'medkit_l', pos: [-12.6, -8.0] }, { id: 'ad_coffee', item: 'coffee', pos: [11.6, 18.4] }],
};
