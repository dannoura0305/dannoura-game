// ルート・分岐の状態の骨組み（ROUTE_BRANCH_SPEC）。DOM なし。
// フェーズ2の切片では分岐は起きない（route=null のまま）。状態の形・記録・再現性だけを先に作ってテストする。
export const ROUTES = ['reveal', 'secret'];

export function newRouteState() {
  return { route: null, routeLock: null, reveal: { companionKnows: false, firstWhiteAt: null }, forms: { whiteFree: false, giantSeen: false }, branchLog: [] };
}

/** 分岐を記録する。同じ入力からは同じ結果（at 以外）。一度決まったルートは変えない */
export function choose(state, route, ctx = {}) {
  if (!ROUTES.includes(route)) throw new Error('unknown route ' + route);
  const s = JSON.parse(JSON.stringify(state));
  if (s.routeLock) { s.branchLog.push({ id: ctx.id || 'branch', pick: route, ignored: true, at: ctx.at || null }); return s; }
  s.route = route; s.routeLock = ctx.chapter || 'ch04';
  if (route === 'reveal') { s.reveal.companionKnows = true; s.reveal.firstWhiteAt = ctx.chapter || 'ch04'; }
  s.branchLog.push({ id: ctx.id || 'branch', pick: route, chapter: ctx.chapter || 'ch04', tries: ctx.tries || 1, assisted: !!ctx.assisted, at: ctx.at || null });
  return s;
}

/** 白い姿（自由操作）を使えるか。secret では常に不可 */
export function canUseWhite(state, chapterNo = 0) {
  if (state.route !== 'reveal') return false;
  return chapterNo >= 5 || state.forms.whiteFree;
}

/** 記録の比較用（at を除く） */
export function logKey(state) { return JSON.stringify(state.branchLog.map(e => { const o = Object.assign({}, e); delete o.at; return o; })); }
