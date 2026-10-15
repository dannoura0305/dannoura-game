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
  // フェーズ6：分岐の後の章（ルートで章題が違う）。第6章A は冒頭（暴走 → 我に返る → 守る）だけ
  ch5a: { no: 5, title: '第5章A　侵食' },
  ch6a: { no: 6, title: '第6章A　巨躯' },
  ch5b: { no: 5, title: '第5章B　秘匿' },
  // フェーズ7：第6章B（中央管理棟）。第6章A は冒頭の後（崩れた商店街・中央通りの巨大戦）まで
  ch6b: { no: 6, title: '第6章B　制御' },
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
  // 第5章A「侵食」（reveal）【仮】旧研究棟：搬入ヤードの崩れた壁から入る。白い姿の自由操作。点呼（必須）・主任研究室の延期の記録（必須・崩れた床を白い姿で跳ぶ）→ 観測棟の継接
  { id: 'ch5_r_enter', ch: 'ch5a', area: 'oldwing', obj: '旧研究棟の収容棟へ（崩れた西の壁から）', sub: '白い姿：化を長押し（いつでも戻れる）' },
  { id: 'ch5_r_ward', ch: 'ch5a', area: 'oldwing', obj: '点呼卓で、在棟の被験者の点呼を終える', sub: '被験者名簿（資料室）か、鐘の時に戸口に立つ順を見る／東の廊下の奥に主任研究室' },
  { id: 'ch5_r_chief', ch: 'ch5a', area: 'oldwing', obj: '主任研究室で「延期の記録」を探す（東の廊下の奥）', sub: '崩れた床：白い姿なら跳べる' },
  { id: 'ch5_r_gate', ch: 'ch5a', area: 'oldwing', obj: '隔離扉から観測棟へ（廊下の北）' },
  { id: 'ch5_r_boss', ch: 'ch5a', area: 'atrium', obj: '継接を止める', sub: '部分ごとに壊れる：右腕（叩く）・左腕（鞄）・脚。鞄を持ち主の机へ返すこともできる' },
  { id: 'ch5_r_end', ch: 'ch5a', area: 'atrium', obj: '屋上へ（北東の階段）' },
  // 第6章A「巨躯」の冒頭（reveal）【仮】広域計画で町が置き換えられ始める → 止めるために力を使い、巨大猫又の力があふれて抑えきれなくなる（暴走）→ （相棒）の声で我に返る → 町を守る
  { id: 'ch6a_rampage', ch: 'ch6a', area: 'town', obj: '……抑える（化を長押し／弾の連打）', sub: '体が言うことを聞かない。町を壊したくない' },
  { id: 'ch6a_protect', ch: 'ch6a', area: 'town', obj: '町の人と（相棒）を守る', sub: '電柱・看板は尾で払う（攻撃）／瓦礫は体で受ける（弾く）／バスは前足で運ぶ（調べる）' },
  { id: 'ch6a_end', ch: 'ch6a', area: 'town', obj: '（相棒）を救急の列へ見送る' },
  // 第6章A の続き（フェーズ7）【仮】崩れた商店街（人の大きさ・白い姿）：置換の糸の中継を元から順に切る（必須）→ 中央通りで巨大猫又（自分の意思で）と塗替 → 最終章の入口
  { id: 'ch6a_threads', ch: 'ch6a', area: 'ruins', obj: '置換の糸の中継を、元（上流）から順に切る', sub: '白い姿の目で糸の流れを見る／防災無線の記録（任意）。白い姿の爪で切る' },
  { id: 'ch6a_avenue', ch: 'ch6a', area: 'ruins', obj: '中央通りへ（商店街の北の端）', sub: '糸の元：光の柱の下に、何かがいる' },
  { id: 'ch6a_boss', ch: 'ch6a', area: 'avenue', obj: '塗替を止める', sub: '「塗り替え」は人の残る棟を狙う：線の間に立つか、咆哮で止める' },
  { id: 'ch6a_fin', ch: 'ch6a', area: 'avenue', obj: '（第6章Aはここまで。光の柱の奥：最終章へ）' },
  // 第5章B「秘匿」（secret）【仮】同じ旧研究棟を別の順路で：地下研究区画の連絡通路から入る。応答炉を止めたので停電 → 配電盤（保全の知識）→ 点呼（必須）→ 封印の札を刀で切る・弁で水を抜く → 記録保管庫の延期の記録（控え・必須）→ 観測棟の継接（紫だけ）
  { id: 'ch5_s_enter', ch: 'ch5b', area: 'oldwing', obj: '旧研究棟の収容棟へ（地下の連絡通路から）', sub: '（相棒）と一緒：白い姿にはならない' },
  { id: 'ch5_s_power', ch: 'ch5b', area: 'oldwing', obj: '電気室の配電盤で、非常電源を回す（廊下の北東）', sub: '盤の横の保全記録：容量と焼却炉' },
  { id: 'ch5_s_ward', ch: 'ch5b', area: 'oldwing', obj: '点呼卓で、在棟の被験者の点呼を終える', sub: '被験者名簿（資料室）か、鐘の時に戸口に立つ順を見る／記録保管庫（西）も' },
  { id: 'ch5_s_archive', ch: 'ch5b', area: 'oldwing', obj: '記録保管庫で「延期の記録」の控えを探す（広間の西）', sub: '封印の札は刀で切れる・水は弁と排水ポンプで抜ける' },
  { id: 'ch5_s_gate', ch: 'ch5b', area: 'oldwing', obj: '隔離扉から観測棟へ（廊下の北）' },
  { id: 'ch5_s_boss', ch: 'ch5b', area: 'atrium', obj: '継接を止める（人の姿のまま）', sub: '部分ごとに壊れる：右腕（叩く）・左腕（鞄）・脚。鞄を持ち主の机へ返すこともできる' },
  { id: 'ch5_s_end', ch: 'ch5b', area: 'atrium', obj: '連絡橋から中央管理棟へ（北東の階段）' },
  // 第6章B「制御」（secret）【仮】中央管理棟：時刻の矛盾（監視室・必須）→ 巡回点検と診断（機械室・必須）→ 隔離の手順（必須）→ 当直（ボス）→ 制御装置の停止 → 最終章の入口
  { id: 'ch6_s_enter', ch: 'ch6b', area: 'admin', obj: '中央管理棟に入る（連絡橋から）', sub: '（相棒）と一緒：白い姿にはならない' },
  { id: 'ch6_s_monitor', ch: 'ch6b', area: 'admin', obj: '監視室で、機械室の保守扉の時刻を割り出す（西）', sub: '監視カメラの記録・当番表（任意）。ずれた時計に気をつける' },
  { id: 'ch6_s_rounds', ch: 'ch6b', area: 'admin', obj: '機械室を巡回点検して、止めるべき機械を見つける', sub: '振動計を当てる（調べる・離れずに少し待つ）→ 点検表で前回の値と比べる' },
  { id: 'ch6_s_isolate', ch: 'ch6b', area: 'admin', obj: '異常な機械を、安全な手順で止める', sub: '止めて・切って・締めて・抜く（盤の横の札）' },
  { id: 'ch6_s_boss', ch: 'ch6b', area: 'admin', obj: '当直を止める（人の姿のまま）', sub: '蒸気弁で崩す・崩れたら点検表を渡す（救う）／レンチを配管に施錠（無力化）／倒す' },
  { id: 'ch6_s_control', ch: 'ch6b', area: 'admin', obj: '制御室で、制御装置の拡大を止める（北）' },
  { id: 'ch6_s_end', ch: 'ch6b', area: 'admin', obj: '（第6章Bはここまで。記録の間：最終章へ）' },
];
/** フェーズ6 の段の組（第5章A＋第6章A の冒頭／第5章B） */
export const R5_STEPS = ['ch5_r_enter', 'ch5_r_ward', 'ch5_r_chief', 'ch5_r_gate', 'ch5_r_boss', 'ch5_r_end', 'ch6a_rampage', 'ch6a_protect', 'ch6a_end'];
export const S5_STEPS = ['ch5_s_enter', 'ch5_s_power', 'ch5_s_ward', 'ch5_s_archive', 'ch5_s_gate', 'ch5_s_boss', 'ch5_s_end'];
/** フェーズ7 の段の組（第6章A の続き／第6章B） */
export const R6_STEPS = ['ch6a_threads', 'ch6a_avenue', 'ch6a_boss', 'ch6a_fin'];
export const S6_STEPS = ['ch6_s_enter', 'ch6_s_monitor', 'ch6_s_rounds', 'ch6_s_isolate', 'ch6_s_boss', 'ch6_s_control', 'ch6_s_end'];
/** 分岐（第4章）の後の段の組 */
export const R_STEPS = ['ch4_r_fight', 'ch4_r_rise', 'ch4_r_giant', 'ch4_r_end'];
export const S_STEPS = ['ch4_s_trial', 'ch4_s_power', 'ch4_s_sneak', 'ch4_s_hold', 'ch4_s_end'];
/** 段がどちらのルートの物か（'reveal'|'secret'|null） */
export function stepRoute(id) { return R_STEPS.includes(id) || R5_STEPS.includes(id) || R6_STEPS.includes(id) ? 'reveal' : S_STEPS.includes(id) || S5_STEPS.includes(id) || S6_STEPS.includes(id) ? 'secret' : null; }
/** 同じルートの中で比べる（分岐の後の段どうしは atLeast で比べない：並びが 1 本なので）。ルートが違えば false */
export function atLeastIn(cur, id) { const L = [R_STEPS, S_STEPS, R5_STEPS, S5_STEPS, R6_STEPS, S6_STEPS]; const a = L.find(x => x.includes(cur)), b = L.find(x => x.includes(id)); if (!a || !b) return atLeast(cur, id); const ra = stepRoute(cur), rb = stepRoute(id); if (ra !== rb) return false; const seq = ra === 'reveal' ? R_STEPS.concat(R5_STEPS, R6_STEPS) : S_STEPS.concat(S5_STEPS, S6_STEPS); return seq.indexOf(cur) >= seq.indexOf(id); }
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
  ch5_r_enter: ['oldwing', 0, 9.0], ch5_r_ward: ['oldwing', 0, -19.4], ch5_r_chief: ['oldwing', 12.0, -20.0], ch5_r_gate: ['oldwing', 0, -21.6], ch5_r_boss: 'enemy:tsugihagi', ch5_r_end: ['atrium', 9.0, -13.0],
  ch6a_rampage: null, ch6a_protect: null, ch6a_end: null,
  ch5_s_enter: ['oldwing', 0, 9.0], ch5_s_power: ['oldwing', 8.5, -19.0], ch5_s_ward: ['oldwing', 0, -19.4], ch5_s_archive: ['oldwing', -12.0, -19.4], ch5_s_gate: ['oldwing', 0, -21.6], ch5_s_boss: 'enemy:tsugihagi', ch5_s_end: ['atrium', 9.0, -13.0],
  ch6a_threads: ['ruins', 5.2, -24.0], ch6a_avenue: ['ruins', 0, -38.5], ch6a_boss: 'enemy:nurikae', ch6a_fin: null,
  ch6_s_enter: ['admin', 0, 14.0], ch6_s_monitor: ['admin', -11.0, 6.0], ch6_s_rounds: ['admin', -3.0, -19.0], ch6_s_isolate: ['admin', -3.0, -18.6], ch6_s_boss: 'enemy:touchoku', ch6_s_control: ['admin', 0, -29.0], ch6_s_end: null,
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
