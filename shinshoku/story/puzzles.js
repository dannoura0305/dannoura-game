// 調べ物の仕掛け（LEVEL_DESIGN_SPEC §7）。DOM なし・純粋関数（node でテスト）。
// ① 避難者名簿の食い違い【必須】：名簿（42 人・6 班）と受付票（36 枚）を班ごとに照らし合わせ、受付票の無い人（未着）を選ぶ。
//    → 未着の数（6）が、鍵のある引き出しの番号。未着の名前は、点呼の時にマイクで呼べる候補になる（収容者を救う）。
// ② 防犯映像の照合【任意】：4 台のカメラの「明かりが消えた瞬間」の記録のうち、あり得ない時刻（停電の前の日付）の 1 台を選ぶ。
//    → その時刻の数字が金庫の番号（data/safe.js の仮の値から作る）。落とし物箱が開く（抜刀補助）。
import { ROSTER } from '../data/areas.js';
import { SAFE } from '../data/safe.js';

export function rosterPeople() { return ROSTER.people.map(([name, group, missing, role], i) => ({ no: i + 1, name, group, missing: missing === 'missing', role: role || null })); }
export function missingPeople() { return rosterPeople().filter(p => p.missing); }
export function missingCount() { return missingPeople().length; }
export function bossName() { const p = rosterPeople().find(p => p.role === 'shuuyou'); return p ? p.name : null; }
export function bossNo() { const p = rosterPeople().find(p => p.role === 'shuuyou'); return p ? p.no : null; }
/** 受付票（名前だけ・班ごと・決まった順に混ぜる） */
export function cardsOf(group) {
  const names = rosterPeople().filter(p => p.group === group && !p.missing).map(p => p.name);
  return names.map((n, i) => [n, (i * 5 + group.charCodeAt(0)) % 11]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
}
/** 班の照合：選んだ名前が未着なら true */
export function checkPick(group, name) { const p = rosterPeople().find(q => q.group === group && q.name === name); return !!p && p.missing; }
/** 照合の状態 { done:{A:true…}, complete } を進める */
export function pickRoster(state, group, name) {
  const s = { done: Object.assign({}, state && state.done), miss: (state && state.miss) || 0 };
  if (checkPick(group, name)) s.done[group] = name; else s.miss++;
  s.complete = ROSTER.groups.every(g => s.done[g]);
  return s;
}
/** 引き出しの番号（未着の数） */
export function drawerAnswer() { return missingCount(); }
/** マイクで呼べる名前の候補：照合が済んでいれば未着の人（6 人）、まだなら名簿の全員 */
export function micOptions(rosterDone) { return (rosterDone ? missingPeople() : rosterPeople()).map(p => p.name); }
/** 名札の切れ端「No.4?」から当てはまる番号（名簿の人数まで） */
export function tornTagCandidates(prefix = 4, max = ROSTER.people.length) { const o = []; for (let n = prefix * 10; n < prefix * 10 + 10; n++) if (n <= max) o.push(n); return o; }

// ── 防犯映像 ──
export const OUTAGE = { date: '10/14', time: '23:41', provisional: true };
export function cctvCams(code = SAFE.code) {
  return [
    { id: 'cam1', place: 'アーケード入口', stamp: `${OUTAGE.date} 23:41:08`, ok: true },
    { id: 'cam2', place: '裏路地（喫茶 灯 裏口）', stamp: `${OUTAGE.date} 23:41:51`, ok: true },
    { id: 'cam3', place: '商業施設 正面', stamp: `10/13 ${code.slice(0, 2)}:${code.slice(2, 4)}:00`, ok: false },
    { id: 'cam4', place: '市民体育館 渡り廊下', stamp: `${OUTAGE.date} 23:42:27`, ok: true },
  ];
}
export function cctvAnswer(code = SAFE.code) { return cctvCams(code).find(c => !c.ok).id; }
export function checkCctv(id, code = SAFE.code) { return id === cctvAnswer(code); }
