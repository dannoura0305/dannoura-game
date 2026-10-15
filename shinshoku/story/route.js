// ルート・分岐の状態（ROUTE_BRANCH_SPEC）。DOM なし。
// ・ルートの確定（route / routeLock）は第4章の分岐の場面だけ（choose）。
// ・フェーズ4（第3章「地下通路」の転機）で、その手前の「構え」＝ stance（'reveal'|'secret'）をはっきり選んで記録する（setStance）。
//   stance はルートを確定しない（第4章でどちらも必ず選べる）。branchLog に kind:'stance' で残し、同じ入力からは同じ記録になる。
//   stance が secret の間は白い姿の入力は無効（何も起きない・記録もしない）。reveal なら転機のあと白い姿を使える（相棒が見ている所では化けを解かない）。
export const ROUTES = ['reveal', 'secret'];
export const RULES_VER = 2;
/** 選択肢の表示（第3章の転機）。どちらも常に選べる */
export const STANCES = { reveal: '化けを、解く', secret: 'このまま、人として' };

export function newRouteState() {
  return { route: null, routeLock: null, stance: null, reveal: { companionKnows: false, firstWhiteAt: null }, forms: { whiteFree: false, whiteUnlocked: false, giantSeen: false }, yokaiLog: [], branchLog: [] };
}
const clone = s => JSON.parse(JSON.stringify(s));
/** 古いセーブの形を補う */
export function normalizeRoute(s = {}) {
  const b = newRouteState(), o = Object.assign(b, clone(s || {}));
  o.reveal = Object.assign({ companionKnows: false, firstWhiteAt: null }, o.reveal || {});
  o.forms = Object.assign({ whiteFree: false, whiteUnlocked: false, giantSeen: false }, o.forms || {});
  o.yokaiLog = o.yokaiLog || []; o.branchLog = o.branchLog || []; if (o.stance === undefined) o.stance = null;
  return o;
}

/** 分岐を記録する（第4章）。同じ入力からは同じ結果（at 以外）。一度決まったルートは変えない */
export function choose(state, route, ctx = {}) {
  if (!ROUTES.includes(route)) throw new Error('unknown route ' + route);
  const s = normalizeRoute(state);
  if (s.routeLock) { s.branchLog.push({ seq: s.branchLog.length + 1, id: ctx.id || 'branch', kind: 'route_lock', pick: route, ignored: true, at: ctx.at || null }); return s; }
  s.route = route; s.routeLock = { chapter: ctx.chapter || 'ch04', step: ctx.step || 'branch', at: ctx.at || null, rulesVer: RULES_VER };
  if (route === 'reveal') { s.reveal.companionKnows = true; s.reveal.firstWhiteAt = s.reveal.firstWhiteAt || { chapter: ctx.chapter || 'ch04', step: ctx.step || 'branch' }; }
  s.branchLog.push({ seq: s.branchLog.length + 1, id: ctx.id || 'branch', kind: 'route_lock', pick: route, decision: route, chapter: ctx.chapter || 'ch04', step: ctx.step || 'branch', tries: ctx.tries || 1, assisted: !!ctx.assisted, via: ctx.via || 'choice',
    trial: ctx.trial || null, rulesVer: RULES_VER, saveVer: ctx.saveVer ?? null, gameVer: ctx.gameVer ?? null, seed: ctx.seed ?? null, snapshot: ctx.snapshot || null, at: ctx.at || null });
  return s;
}

/**
 * 第3章の転機で「構え」を選ぶ（ルートは確定しない）。何度選び直しても古い記録は消さず追記。
 * ctx：{ chapter, step, via:'choice'|'load_tenki'|'debug', at, snapshot:{trust,docs,yokai} }
 */
export function setStance(state, stance, ctx = {}) {
  if (!ROUTES.includes(stance)) throw new Error('unknown stance ' + stance);
  const s = normalizeRoute(state);
  s.stance = stance;
  if (stance === 'reveal') s.forms.whiteUnlocked = true;
  s.branchLog.push({ seq: s.branchLog.length + 1, kind: 'stance', id: ctx.id || 'tenki', decision: stance, chapter: ctx.chapter || 'ch03', step: ctx.step || 'ch3_tenki', via: ctx.via || 'choice', locksRoute: false, rulesVer: RULES_VER, at: ctx.at || null, snapshot: ctx.snapshot || null });
  return s;
}
/** 今の構え（ルートが決まっていればルート） */
export function currentStance(state) { return (state && (state.route || state.stance)) || null; }

/**
 * 白い姿になれるか。{ ok, why }。why：'route'（秘匿のルート）|'stance'（このまま人として）|'locked'（まだ）|'watched'（相棒が見ている）
 * ctx：{ chapterNo, companionWatching }
 */
export function whiteAllowed(state, ctx = {}) {
  const s = state || {};
  if (s.route === 'secret') return { ok: false, why: 'route' };
  if (!s.route && s.stance === 'secret') return { ok: false, why: 'stance' };
  const unlocked = (s.route === 'reveal' && ((ctx.chapterNo || 0) >= 5 || (s.forms && s.forms.whiteFree))) || (s.stance === 'reveal' && s.forms && s.forms.whiteUnlocked);
  if (!unlocked) return { ok: false, why: 'locked' };
  if (ctx.companionWatching && !(s.reveal && s.reveal.companionKnows)) return { ok: false, why: 'watched' };
  return { ok: true, why: '' };
}
/** 白い姿（自由操作）を使えるか（第5章以降の判定。旧 API） */
export function canUseWhite(state, chapterNo = 0) {
  if (state.route !== 'reveal') return false;
  return chapterNo >= 5 || state.forms.whiteFree;
}
/** 妖力の使用記録（ルートの判定には使わない） */
export function logYokai(state, e) {
  const s = normalizeRoute(state);
  s.yokaiLog.push(Object.assign({ seq: s.yokaiLog.length + 1 }, e));
  if (!s.reveal.firstWhiteAt && e.form === 'white') s.reveal.firstWhiteAt = { chapter: e.chapter, step: e.step };
  if (s.yokaiLog.length > 200) s.yokaiLog.splice(0, s.yokaiLog.length - 200);
  return s;
}

/**
 * 分岐前のセーブ（slot 'branch'）を読み込んだ時：読み込む前の記録（そのあとに決めたルート）を消さずに残す（ROUTE_BRANCH_SPEC §4「再選択しても古い記録は消さず追記」）。
 * prev：読み込む前の状態、loaded：読み込んだ状態。読み込んだ側に無い route_lock を superseded:true で足し、seq を振り直す。ルートは読み込んだ側（未確定）のまま。
 */
export function carryBranchLog(prev, loaded) {
  const s = normalizeRoute(loaded), key = e => JSON.stringify([e.kind, e.decision, e.chapter, e.at, e.via]);
  const have = new Set(s.branchLog.map(key));
  for (const e of (prev && prev.branchLog) || []) if (e.kind === 'route_lock' && !e.ignored && !have.has(key(e))) { s.branchLog.push(Object.assign({}, e, { superseded: true })); have.add(key(e)); }
  s.branchLog.forEach((e, i) => { e.seq = i + 1; });
  return s;
}
/** 今のルート（最後の、取り消されていない route_lock） */
export function lastLock(state) { const L = ((state && state.branchLog) || []).filter(e => e.kind === 'route_lock' && !e.ignored && !e.superseded); return L.length ? L[L.length - 1] : null; }

/** 記録の比較用（at を除く） */
export function logKey(state) { return JSON.stringify(state.branchLog.map(e => { const o = Object.assign({}, e); delete o.at; return o; })); }
