// 序章〜第2章（避難所）の流れ（SCENARIO_FLOW）。DOM なし。
// 1 つの「段」= 目標の文・どの区画か・次の段へ進む条件（director が出来事を見て進める）。表示の名前・目標の文は【仮】。
export const CHAPTERS = {
  prologue: { no: 0, title: '序章　閉店時間' },
  ch1: { no: 1, title: '第1章　帰路' },
  ch2: { no: 2, title: '第2章　静養（避難所）' },
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
  { id: 'ch2_end', ch: 'ch2', area: 'shelter', obj: '（試作はここまで。自由に歩けます）' },
];
// 目標の場所（ミニマップの印・距離）。[区画, x, z]。'enemy:<id>' は敵の位置
export const TARGETS = {
  pro_meet: ['shotengai', -2.5, -33.8], pro_pipe: ['shotengai', -2.6, -30.2], pro_fight: 'enemy:kiro_t', pro_home: ['shotengai', 0, 8.6], pro_tv: ['shotengai', -3.5, 14.0],
  ch1_katana: ['shotengai', 5.0, 14.0], ch1_street: ['shotengai', -3.7, -66.5], ch1_alley: ['alley', 12, -23.0], ch1_plaza: ['plaza', -14, 0],
  ch2_shelter: ['plaza', 17.8, 5], ch2_roster: ['shelter', -6.0, 15.4], ch2_key: ['shelter', 1.4, 13.6], ch2_gym: ['shelter', 0, 1.0], ch2_boss: 'enemy:shuuyou_1', ch2_end: null,
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
/** 区画グラフの検査用：段ごとに必要な区画へ行けるか（data/areas.js の AREA_GRAPH） */
export function reachable(graph, from = 'shotengai') {
  const seen = new Set([from]), q = [from];
  while (q.length) { const a = q.shift(); for (const b of (graph[a] || {}).exits || []) if (!seen.has(b)) { seen.add(b); q.push(b); } }
  return seen;
}
