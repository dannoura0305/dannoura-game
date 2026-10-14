// 序章〜第3章（病院・地下通路）の流れ（SCENARIO_FLOW）。DOM なし。
// 第3章【仮】：SCENARIO_FLOW では「ショッピングモール」だが、イメージ資料（concept_05）の舞台の順（避難所→病院→地下通路）に合わせて
// 病院（記録のない患者）と地下通路（白髪形態の転機）にした（OPEN_QUESTIONS Q27）。山場（恐ろしい姿の異形が子どもを守っていた）と原文の台詞はそのまま。
// 1 つの「段」= 目標の文・どの区画か・次の段へ進む条件（director が出来事を見て進める）。表示の名前・目標の文は【仮】。
export const CHAPTERS = {
  prologue: { no: 0, title: '序章　閉店時間' },
  ch1: { no: 1, title: '第1章　帰路' },
  ch2: { no: 2, title: '第2章　静養（避難所）' },
  ch3: { no: 3, title: '第3章　見た目' },
  ch4: { no: 4, title: '第4章　境界の夜' },
};

export const STEPS = [
  { id: 'pro_meet', ch: 'prologue', area: 'shotengai', state: 'normal', obj: '商店街で（相棒）と会う（喫茶「灯」の前）' },
  { id: 'pro_pipe', ch: 'prologue', area: 'shotengai', state: 'normal', obj: '何か武器になる物を（自販機の横）' },
  { id: 'pro_fight', ch: 'prologue', area: 'shotengai', state: 'normal', obj: '帰路を追い払う' },
  { id: 'pro_home', ch: 'prologue', area: 'shotengai', state: 'normal', obj: '家へ戻る（アーケードの外・南）' },
  { id: 'pro_tv', ch: 'prologue', area: 'shotengai', state: 'normal', obj: '居間で一息つく（ソファ）' },
  { id: 'ch1_katana', ch: 'ch1', area: 'shotengai', state: 'outbreak', obj: '刀を取る（居間の刀掛け）', sub: '金庫は任意（番号の手掛かりを探す）' },
  { id: 'ch1_street', ch: 'ch1', area: 'shotengai', state: 'outbreak', obj: '（相棒）を探す：商店街の奥、空き店舗から裏路地へ', sub: '帰路は救っても倒しても、避けてもよい' },
  { id: 'ch1_alley', ch: 'ch1', area: 'alley', obj: '裏路地を抜ける', sub: '帰路の道をふさがなければ、素通りする' },
  { id: 'ch1_plaza', ch: 'ch1', area: 'plaza', obj: '表通りへ（商業施設の前）' },
  { id: 'ch2_shelter', ch: 'ch2', area: 'plaza', obj: '避難所（市民体育館）へ：渡り廊下', sub: '警備室の防犯映像（任意）' },
  { id: 'ch2_roster', ch: 'ch2', area: 'shelter', obj: '名簿と受付票を照らし合わせる（ロビー）' },
  { id: 'ch2_key', ch: 'ch2', area: 'shelter', obj: '体育館の鍵を探す（受付の机の引き出し）' },
  { id: 'ch2_gym', ch: 'ch2', area: 'shelter', obj: '体育館の中を確かめる' },
  { id: 'ch2_boss', ch: 'ch2', area: 'shelter', obj: '収容者を止める', sub: '点呼の間に名前を呼ぶ（マイク）／器具庫へ誘って閉じ込める／倒す' },
  { id: 'ch2_end', ch: 'ch2', area: 'shelter', obj: '（相棒）と話す' },
  // 第3章「見た目」【仮】病院 → 地下通路
  { id: 'ch3_hosp', ch: 'ch3', area: 'shelter', obj: '病院へ（ロビー西の連絡通路）', sub: '名簿の未着の人は、病院へ運ばれた？' },
  { id: 'ch3_lobby', ch: 'ch3', area: 'hospital', obj: '病院の受付を調べる', sub: '待合の人に気をつける' },
  { id: 'ch3_records', ch: 'ch3', area: 'hospital', obj: 'ナースステーションで、病室の札とカルテを照らし合わせる', sub: '処置室の看護記録（任意）' },
  { id: 'ch3_ward', ch: 'ch3', area: 'hospital', obj: '「記録のない患者」の病室へ（小児病棟の奥）', sub: '暗い病棟：懐中電灯' },
  { id: 'ch3_guard', ch: 'ch3', area: 'hospital', obj: '子どもの前に立つ異形……？', sub: '攻めずに様子を見る／倒す' },
  { id: 'ch3_down', ch: 'ch3', area: 'hospital', obj: '地下通路へ（奥の階段・地下1階）', sub: '子どもを連れて避難所へ戻る' },
  { id: 'ch3_tunnel', ch: 'ch3', area: 'tunnel', obj: '地下通路を抜けて避難所へ', sub: '（相棒）の声に気をつける' },
  { id: 'ch3_boss', ch: 'ch3', area: 'tunnel', obj: '写し身を止める', sub: 'こちらの動きを真似てくる（頭の上の印を見る）' },
  { id: 'ch3_boss2', ch: 'ch3', area: 'tunnel', obj: '写し身を止める', sub: '「呼び声」の間は動きが止まる' },
  { id: 'ch3_end', ch: 'ch3', area: 'tunnel', obj: '（第3章はここまで。自由に歩けます）' },
  // 第4章「境界の夜」【仮】観測分室（地上）→ 地下研究区画 → 分岐（ここだけ）。reveal：白い姿・巨大猫又／secret：人の姿の試練・配電盤・守り
  // 段の並びは 1 本だが、分岐の後の段（ch4_r_*・ch4_s_*）は互いに atLeast で比べない（route で分ける）。
  { id: 'ch4_office', ch: 'ch4', area: 'office', obj: '観測分室を調べる（監視室の端末）', sub: '分室の人はどこへ？' },
  { id: 'ch4_logs', ch: 'ch4', area: 'office', obj: '入退室の記録と、停電の記録を照らし合わせる', sub: '事故報告書（監視室）・非常電源の保全記録（電気室）' },
  { id: 'ch4_vault', ch: 'ch4', area: 'office', obj: '保管庫の返却箱から職員証 B-07 を取る', sub: '保管庫に預けていた物もある' },
  { id: 'ch4_down', ch: 'ch4', area: 'office', obj: '地下の研究区画へ（奥のエレベーター）', sub: '所長室の記録（任意）' },
  { id: 'ch4_lab', ch: 'ch4', area: 'lab', obj: '地下研究区画を進む（中央の試験床）', sub: '応答体：試験の手順をくり返している' },
  { id: 'ch4_branch', ch: 'ch4', area: 'lab', obj: '（相棒）を助ける' },
  { id: 'ch4_r_fight', ch: 'ch4', area: 'lab', obj: '（相棒）を囲む群れを払う', sub: '白い姿：妖爪・猫火・瞬歩・幻術・妖弾' },
  { id: 'ch4_r_rise', ch: 'ch4', area: 'lab', obj: '搬入口へ（区画の南）', sub: '地響きが近づいてくる' },
  { id: 'ch4_r_giant', ch: 'ch4', area: 'yard', obj: '境界の先触れを止める', sub: '「喰らう」は詰所を狙う：間に立つか、咆哮で止める' },
  { id: 'ch4_r_end', ch: 'ch4', area: 'yard', obj: '（第4章はここまで）' },
  { id: 'ch4_s_trial', ch: 'ch4', area: 'lab', obj: '人の姿のまま、群れを払う', sub: '紫の姿の技だけ（白い姿は使わない）' },
  { id: 'ch4_s_power', ch: 'ch4', area: 'lab', obj: '配電盤で制御室の隔壁に電気を回す（西の壁）', sub: '保全記録：非常電源の容量' },
  { id: 'ch4_s_sneak', ch: 'ch4', area: 'lab', obj: '（相棒）と制御室へ（東の通路）', sub: '弁を開けると蒸気で姿を隠せる' },
  { id: 'ch4_s_hold', ch: 'ch4', area: 'lab', obj: '（相棒）が応答炉を止めるまで守る', sub: '戸口から来る応答体を近づけない' },
  { id: 'ch4_s_end', ch: 'ch4', area: 'lab', obj: '（第4章はここまで）' },
];
/** 分岐（第4章）の後の段の組 */
export const R_STEPS = ['ch4_r_fight', 'ch4_r_rise', 'ch4_r_giant', 'ch4_r_end'];
export const S_STEPS = ['ch4_s_trial', 'ch4_s_power', 'ch4_s_sneak', 'ch4_s_hold', 'ch4_s_end'];
/** 段がどちらのルートの物か（'reveal'|'secret'|null） */
export function stepRoute(id) { return R_STEPS.includes(id) ? 'reveal' : S_STEPS.includes(id) ? 'secret' : null; }
// 目標の場所（ミニマップの印・距離）。[区画, x, z]。'enemy:<id>' は敵の位置
export const TARGETS = {
  pro_meet: ['shotengai', -2.5, -33.8], pro_pipe: ['shotengai', -2.6, -30.2], pro_fight: 'enemy:kiro_t', pro_home: ['shotengai', 0, 8.6], pro_tv: ['shotengai', -3.5, 14.0],
  ch1_katana: ['shotengai', 5.0, 14.0], ch1_street: ['shotengai', -3.7, -66.5], ch1_alley: ['alley', 12, -23.0], ch1_plaza: ['plaza', -14, 0],
  ch2_shelter: ['plaza', 17.8, 5], ch2_roster: ['shelter', -6.0, 15.4], ch2_key: ['shelter', 1.4, 13.6], ch2_gym: ['shelter', 0, 1.0], ch2_boss: 'enemy:shuuyou_1', ch2_end: null,
  ch3_hosp: ['shelter', -6.6, 18.4], ch3_lobby: ['hospital', 0, 13.2], ch3_records: ['hospital', -6.2, 2.0], ch3_ward: ['hospital', 9.0, -17.5], ch3_guard: 'enemy:mamori', ch3_down: ['hospital', -9.6, -19.2],
  ch3_tunnel: ['tunnel', 0, -30], ch3_boss: 'enemy:utsushimi', ch3_boss2: 'enemy:utsushimi', ch3_end: null,
  ch4_office: ['office', -7.4, 3.2], ch4_logs: ['office', -7.4, 3.2], ch4_vault: ['office', 9.6, 4.2], ch4_down: ['office', 7.6, -11.6],
  ch4_lab: ['lab', 0, -9], ch4_branch: null, ch4_r_fight: null, ch4_r_rise: ['lab', 0, -23], ch4_r_giant: 'enemy:sakibure', ch4_r_end: null,
  ch4_s_trial: null, ch4_s_power: ['lab', -13.8, -18.0], ch4_s_sneak: ['lab', 15.0, -18.2], ch4_s_hold: ['lab', 18.6, -18.2], ch4_s_end: null,
};
export const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.id, i]));
export function stepDef(id) { return STEPS[STEP_INDEX[id]] || STEPS[0]; }
export function nextStepId(id) { const i = STEP_INDEX[id]; return i == null || i >= STEPS.length - 1 ? id : STEPS[i + 1].id; }
export function atLeast(cur, id) { return (STEP_INDEX[cur] ?? -1) >= (STEP_INDEX[id] ?? 99); }
/** 商店街の状態（normal＝序章のふだん／outbreak＝発生後） */
export function streetState(stepId) { return atLeast(stepId, 'ch1_katana') ? 'outbreak' : 'normal'; }
/** その段で持っている武器の初期（新しく始めた時・段から始める試験用） */
export function weaponsAt(stepId) {
  if (!atLeast(stepId, 'pro_fight')) return [];
  if (!atLeast(stepId, 'ch1_street')) return ['pipe'];
  return ['pipe', 'katana'];
}
/** 章の番号（'ch3' → 3） */
export function chapterNo(stepId) { const d = stepDef(stepId); return CHAPTERS[d.ch] ? CHAPTERS[d.ch].no : 0; }
/** 第3章の転機（構えの選択）の前か後か */
export function afterTenki(stepId) { return atLeast(stepId, 'ch3_boss2');
}
/** 区画グラフの検査用：段ごとに必要な区画へ行けるか（data/areas.js の AREA_GRAPH） */
export function reachable(graph, from = 'shotengai') {
  const seen = new Set([from]), q = [from];
  while (q.length) { const a = q.shift(); for (const b of (graph[a] || {}).exits || []) if (!seen.has(b)) { seen.add(b); q.push(b); } }
  return seen;
}
