// 境界侵食 P13：環境の意味と物理の点検（record.mjs の記録に当てる規則）。
// 規則（カテゴリ）：
//  float     … 浮いている物（地面・壁・支えのどれにも触れていない形のかたまり：看板・灯具・室外機・小物・車…）
//  pierce    … めり込み（車と柱・縁石・建物／看板が壁の中に埋まる／小物が建物に深く入る）
//  furniture … 脚の無い家具（座面・机の天板が下から支えられていない）
//  signage   … 店の名前の看板の後ろが空（建物の表が無い）・表はあるが店の表（戸・窓・シャッター・店の中）が無い
//  facade    … 歩ける所から建物の欠け（向こうが空に抜ける）・枠の無い戸
//  vehicle   … 車輪が地面に着かない・道／駐車場の外・道の向きと違う・車どうしが重なる
//  zfight    … 同じ面に重なる 2 つの面（ちらつき）
//  block     … 出入り口の前を塞ぐ物（P11 の試験と同じデータ＋見た目の形）
// 重さ：error（直す・試験で 0）／warn（理由つきで許す：ALLOW）。
import { TOWN, BUILDING_KINDS, lotEntrances, isWalkable, blockedAt } from '../../../shinshoku/data/town.js';

const TOL = 0.025;
export const STOREFRONT = /win|door|shutter|glass|noren|shoji|lattice|koshi|menu|shop|curtain|office|garage|konbini|counter|interior/;
export const CATS = ['float', 'pierce', 'furniture', 'signage', 'facade', 'vehicle', 'zfight', 'block'];

// ── 分類（組み立ての関数の名前から） ──
const VEH = new Set(['car0', 'tram', 'bus', 'ambulance', 'truck', 'vehicle', 'carBody', 'van', 'taxi']);
const BLD = new Set(['house', 'shop', 'apartment', 'konbini', 'backHouses', 'homeExterior', 'machiya', 'tower', 'dept', 'fillB', 'station', 'roofGable', 'buildHome', 'barrier', 'barrier2', 'win', 'genkan', 'doorFrame', 'glassDoor', 'shopFront', 'storefront']);
const isVeh = p => VEH.has(p.fn) || /^inst:(car|bus|tram|ambul|truck|van)/i.test(p.fn) || p.veh;
const isGroundish = p => p.max[1] <= 0.03;
const isSign = p => p.text != null && p.text !== '';
const dims = p => [p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]];
const ov = (a, b, t = 0) => a.min[0] <= b.max[0] + t && a.max[0] >= b.min[0] - t && a.min[1] <= b.max[1] + t && a.max[1] >= b.min[1] - t && a.min[2] <= b.max[2] + t && a.max[2] >= b.min[2] - t;
const depth = (a, b) => Math.min(Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]), Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]), Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]));
const ctr = p => [(p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2];
const r2 = v => Math.round(v * 100) / 100;

/** xz の升目（2m）で近い物を探す */
class Grid {
  constructor(list, cell = 2) { this.c = cell; this.m = new Map(); this.big = []; for (const p of list) this.ins(p); }
  key(i, j) { return i * 100003 + j; }
  ins(p) {
    const c = this.c, i0 = Math.floor(p.min[0] / c), i1 = Math.floor(p.max[0] / c), j0 = Math.floor(p.min[2] / c), j1 = Math.floor(p.max[2] / c);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) { this.big.push(p); return; }
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = this.key(i, j); let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(p); }
  }
  near(mn, mx) {
    const c = this.c, out = new Set(this.big), i0 = Math.floor(mn[0] / c), i1 = Math.floor(mx[0] / c), j0 = Math.floor(mn[2] / c), j1 = Math.floor(mx[2] / c);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = this.m.get(this.key(i, j)); if (a) for (const p of a) out.add(p); }
    return out;
  }
}
function segBoxDist(seg, p) {   // 線分と箱の近さ（線分の上を 0.1m ごとに見る）
  const [a, b] = seg, L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(L / 0.1));
  let best = 1e9;
  for (let k = 0; k <= n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
    const dx = Math.max(p.min[0] - x, 0, x - p.max[0]), dy = Math.max(p.min[1] - y, 0, y - p.max[1]), dz = Math.max(p.min[2] - z, 0, z - p.max[2]); best = Math.min(best, Math.hypot(dx, dy, dz)); }
  return best;
}
function rayHit(G, o, d, maxD, skip) {   // 水平の光線と箱（AABB）の最初の当たり
  let best = maxD + 1, hit = null; const step = 4;
  for (let s = 0; s < maxD; s += step) {
    const a = [o[0] + d[0] * s, o[1], o[2] + d[2] * s], b = [o[0] + d[0] * Math.min(maxD, s + step), o[1], o[2] + d[2] * Math.min(maxD, s + step)];
    for (const p of G.near([Math.min(a[0], b[0]), 0, Math.min(a[2], b[2])], [Math.max(a[0], b[0]), 0, Math.max(a[2], b[2])])) {
      if (skip && skip(p)) continue;
      if (o[1] < p.min[1] || o[1] > p.max[1]) continue;
      let t0 = 0, t1 = maxD;
      for (const ax of [0, 2]) { if (Math.abs(d[ax]) < 1e-9) { if (o[ax] < p.min[ax] || o[ax] > p.max[ax]) { t0 = 1e9; break; } continue; } let ta = (p.min[ax] - o[ax]) / d[ax], tb = (p.max[ax] - o[ax]) / d[ax]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
      if (t0 <= t1 && t0 < best) { best = t0; hit = p; }
    }
    if (hit && best <= s + step) break;
  }
  return hit ? { t: best, p: hit } : null;
}
const pointIn = (G, x, y, z, skip) => { for (const p of G.near([x, y, z], [x, y, z])) { if (skip && skip(p)) continue; if (x >= p.min[0] && x <= p.max[0] && y >= p.min[1] && y <= p.max[1] && z >= p.min[2] && z <= p.max[2]) return p; } return null; };

/** 1 つの区画の点検。pieces：record.mjs の記録。A：区画（bounds・boxes）。戻り値：issues[] */
export function auditArea(area, pieces, A, opt = {}) {
  const issues = [];
  const solid = pieces.filter(p => p.src !== 'wire' && dims(p).every(v => v >= 0));
  const wires = pieces.filter(p => p.src === 'wire');
  const G = new Grid(solid), GW = new Grid(wires);
  const push = (cat, sev, msg, p, extra = {}) => issues.push(Object.assign({ area, cat, sev, msg, pos: p ? ctr(p).map(r2) : null, box: p ? [p.min.map(r2), p.max.map(r2)] : null, fn: p ? p.fn : null, at: p ? p.at : null, text: p && p.text ? p.text : undefined }, extra));
  const groundY = A && A.groundY != null ? A.groundY : 0;

  // ── float：支えのつながり（地面に触れる物から、触れている物をたどる） ──
  {
    const seen = new Uint8Array(pieces.length + 1), idx = new Map(solid.map((p, k) => [p, k])), q = [];
    const grounded = new Uint8Array(solid.length);
    solid.forEach((p, k) => { if (p.min[1] <= groundY + 0.06) { grounded[k] = 1; q.push(p); } });
    const adj = p => { const out = []; const mn = p.min.map(v => v - TOL), mx = p.max.map(v => v + TOL); for (const o of G.near(mn, mx)) if (o !== p && ov(p, o, TOL)) out.push(o); return out; };
    // 電線に触れる物（提灯・吊った看板）は電線の両端の支えに頼る：電線の区間のどれかが支えに触れていれば、それに触れる物も支えられる
    const wireOk = new Set();
    for (const w of wires) { for (const o of G.near(w.min.map(v => v - 0.1), w.max.map(v => v + 0.1))) if (segBoxDist(w.seg, o) < 0.08 && o.max[1] > 1.5) { wireOk.add(w); break; } }
    while (q.length) { const p = q.pop(); for (const o of adj(p)) { const k = idx.get(o); if (!grounded[k]) { grounded[k] = 1; q.push(o); } } }
    // 電線に吊った物
    let changed = true;
    while (changed) { changed = false;
      solid.forEach((p, k) => { if (grounded[k]) return; for (const w of GW.near(p.min.map(v => v - 0.1), p.max.map(v => v + 0.1))) if (wireOk.has(w) && segBoxDist(w.seg, p) < 0.06) { grounded[k] = 1; q.push(p); changed = true; break; } });
      while (q.length) { const p = q.pop(); for (const o of adj(p)) { const k = idx.get(o); if (!grounded[k]) { grounded[k] = 1; q.push(o); changed = true; } } }
    }
    // 浮いたかたまり
    const done = new Uint8Array(solid.length);
    solid.forEach((p, k) => {
      if (grounded[k] || done[k]) return;
      const comp = [], st = [p]; done[k] = 1;
      while (st.length) { const a = st.pop(); comp.push(a); for (const o of adj(a)) { const j = idx.get(o); if (!grounded[j] && !done[j]) { done[j] = 1; st.push(o); } } }
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const c of comp) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], c.min[i]); mx[i] = Math.max(mx[i], c.max[i]); }
      const box = { min: mn, max: mx, fn: [...new Set(comp.map(c => c.fn))].join(','), at: [...new Set(comp.map(c => c.at))].slice(0, 4).join(','), text: comp.map(c => c.text).filter(Boolean).join(' / ') };
      // 一番近い物（どれだけ離れているか）
      let gap = 1e9; for (const o of G.near(mn.map(v => v - 1), mx.map(v => v + 1))) { if (comp.includes(o)) continue; const dx = Math.max(o.min[0] - mx[0], 0, mn[0] - o.max[0]), dy = Math.max(o.min[1] - mx[1], 0, mn[1] - o.max[1]), dz = Math.max(o.min[2] - mx[2], 0, mn[2] - o.max[2]); gap = Math.min(gap, Math.hypot(dx, dy, dz)); }
      push('float', gap <= 0.05 ? 'warn' : 'error', `浮いている（${comp.length} 個の形・地面から ${r2(mn[1])}m・近い物まで ${gap > 9 ? '1m 以上' : r2(gap) + 'm'}）`, box, { n: comp.length, gap: r2(gap), keys: [...new Set(comp.map(c => c.key))].join(',') });
    });
  }

  // ── pierce：車のめり込み・看板が壁に埋まる・小物が建物に深く入る ──
  {
    const veh = solid.filter(isVeh);
    const vehSet = new Set(veh);
    const reported = new Set();
    for (const v of veh) for (const o of G.near(v.min, v.max)) {
      if (vehSet.has(o) || isGroundish(o) || !ov(v, o)) continue;
      if (o.max[1] <= 0.04 || o.src === 'wire') continue;
      const dp = depth(v, o); if (dp < 0.04) continue;
      if (v.inst && o.inst === v.inst && o.ik === v.ik) continue;
      const k = (o.fn) + '|' + Math.round(ctr(v)[0]) + ',' + Math.round(ctr(v)[2]); if (reported.has(k)) continue; reported.add(k);
      push('pierce', 'error', `車がめり込む（${v.fn} × ${o.fn}：${r2(dp)}m）`, v, { other: o.fn, otherAt: o.at });
    }
    for (const s of solid.filter(isSign)) {
      const ds = dims(s), th = Math.min(...ds);
      for (const o of G.near(s.min, s.max)) {
        if (o === s || isSign(o) || o.key === 'sign' || !o.aa || !s.aa) continue;
        const inside = s.min.every((v, i) => v >= o.min[i] - 0.002) && s.max.every((v, i) => v <= o.max[i] + 0.002);
        if (inside && dims(o).some((v, i) => v > ds[i] + 0.01)) { push('pierce', 'error', `看板が他の形の中に埋まる（「${s.text}」× ${o.fn}）`, s, { other: o.fn }); break; }
      }
      void th;
    }
  }

  // ── furniture：座面・天板（薄い水平の板）が下から支えられていない ──
  {
    for (const p of solid) {
      const [w, h, d] = dims(p); if (h > 0.1 || p.min[1] < 0.3 || p.min[1] > 1.0) continue;
      const fa = w * d; if (fa < 0.08 || fa > 3.5 || Math.min(w, d) < 0.25) continue;
      if (!/bench|chair|table|seat|stool|desk|counter|gplaza|busStop2|busstop|stops|park|inst:/.test(p.fn + p.at)) continue;
      // 下から触れる物（脚・台）
      let under = false, side = false;
      for (const o of G.near(p.min.map(v => v - TOL), p.max.map(v => v + TOL))) {
        if (o === p || !ov(p, o, TOL)) continue;
        if (o.max[1] <= p.max[1] + 0.01 && o.max[1] >= p.min[1] - TOL - 0.02 && o.min[1] < p.min[1] - 0.02) under = true;   // 下から触れる物（脚・台・ベッドの枠）
        else if (o.min[1] < p.min[1] - 0.15 && o.max[1] >= p.max[1] - 0.01 && dims(o)[1] > 1.2) side = true;   // 壁に付いた棚・カウンター
      }
      if (!under && !side) push('furniture', 'error', `脚・支えの無い座面／天板（${p.fn}・高さ ${r2(p.min[1])}m）`, p);
    }
  }

  // ── signage：看板の後ろ／下に建物の表と店の表があるか ──
  {
    const SKIP = /→|←|↑|入口|出口|のりば|乗り場|停留|バス|電停|駅|STATION|ごみ|回覧|注意|禁止|立入|止まれ|時刻|本日|運転|休業|募集|閉店|セール|案内|お知らせ|知らせ|掲示|号|番|丁目|^\d|方面|行き|toilet|トイレ|非常|避難|消火|AED|受付|外来|救急|病院|管理|出入|関係者|EXIT|自動ドア|押|引|開|閉|満|空|P$|駐|自転車|タクシー|案内図|地図|通り|広場|横丁|商店街|アーケード|町内|市|区|ようこそ|祭|ひかり広場|中止|ありがとう|表札|様$/;
    const BIZ = /屋|店|処|館|喫茶|カフェ|理容|美容|薬局|書店|精肉|青果|鮮魚|酒|食堂|居酒屋|焼き鳥|おでん|スナック|立ち飲み|そば|うどん|ラーメン|寿司|和菓子|菓子|茶舗|呉服|金物|時計|めがね|眼鏡|写真|電器|靴|花|クリーニング|銭湯|湯$|たばこ|たい焼き|不動産|整骨|医院|歯科|銀行|信用金庫|ホテル|旅館|画廊|コンビニ|スーパー|百貨店|ビル|英会話|塾|雑貨|文具|本と|八百屋/;
    const supported = s => { for (const o of G.near(s.min.map(v => v - TOL), s.max.map(v => v + TOL))) if (o !== s && ov(s, o, TOL)) return true; return false; };
    for (const s of solid.filter(isSign)) {
      const t = s.text; if (!BIZ.test(t) || SKIP.test(t)) continue;
      const ds = dims(s); const ax = ds[0] < ds[2] ? 0 : 2;            // 看板の板の厚みの向き
      if (ds[1] < 0.15 && Math.min(ds[0], ds[2]) > 0.3) continue;      // 平らに置いた札（地面の上）
      const c = ctr(s);
      const probe = (sign, y, dmax) => { for (let dd = 0.06; dd <= dmax; dd += 0.15) { const P = c.slice(); P[ax] += sign * (ds[ax] / 2 + dd); P[1] = y; const o = pointIn(G, P[0], P[1], P[2], q => q === s || q.max[1] < 0.2 || isSign(q)); if (o) return { o, dd }; } return null; };
      if (pointIn(G, c[0], s.max[1] + 0.4, c[2], q => q === s || isSign(q))) continue;          // 店の中の品書き（上に天井）＝表の看板ではない
      const o1a = ax === 0 ? 2 : 0;
      const probe2 = (sign, ys, dmax) => { for (const y of ys) for (const off of [0, -0.8, 0.8]) { const c0 = c.slice(); c[o1a] = c0[o1a] + off; const r = probe(sign, y, dmax); c[o1a] = c0[o1a]; if (r) return r; } return null; };
      const back = [probe(1, c[1], 1.6), probe(-1, c[1], 1.6)];
      const low = [probe2(1, [1.3, 0.8], 2.5), probe2(-1, [1.3, 0.8], 2.5)];
      // 看板の厚みの向きの両側どちらにも、看板の高さで何も無い＝宙の看板（柱に付いた看板は横の柱を見る）
      const pole = (() => { for (const o of G.near(s.min.map(v => v - 0.15), s.max.map(v => v + 0.15))) { if (o === s) continue; const od = dims(o); if (od[1] > 1.5 && Math.max(od[0], od[2]) < 0.4 && ov(s, o, 0.12)) return o; } return null; })();
      if (!back[0] && !back[1] && !pole) { if ((s.min[1] > 6 || (low[0] || low[1])) && supported(s)) continue; push('signage', 'error', `店の看板の後ろが空（「${t}」）`, s); continue; }   // 屋上の看板（屋根に立つ）は後ろが空でよい
      // 看板の下（地面の近く 1.3m）に建物の表（戸・窓・シャッター・店の中）があるか
      if (!low[0] && !low[1] && !pole) { push('signage', 'error', `店の看板の下が空の場所（「${t}」：店の表が無い）`, s); continue; }
      if (pole) continue;
      // 看板の下の 0.1〜2.6m・左右 ±（看板の幅の半分＋1.5m）に、店の表（戸・窓・シャッター・のれん・ガラス・店の中の物）があるか
      const side = low[0] ? 1 : -1, f = low[0] || low[1], o1 = ax === 0 ? 2 : 0, half = Math.max(ds[o1] / 2 + 1.5, 1.6);
      const facadeAt = c[ax] + side * (ds[ax] / 2 + f.dd);
      const mn = [0, 0.1, 0], mx = [0, 2.6, 0]; mn[o1] = c[o1] - half; mx[o1] = c[o1] + half; mn[ax] = Math.min(facadeAt - side * 0.6, facadeAt + side * 4); mx[ax] = Math.max(facadeAt - side * 0.6, facadeAt + side * 4);
      let front = 0;
      const isFront = o => (o.tile && STOREFRONT.test(o.tile)) || ['glass', 'glass2', 'shutter'].includes(o.key) || o.store || /door|Door|genkan|shutter|unit|storefront/.test(o.fn || '');
      if (isFront(f.o)) front++;
      for (const o of G.near(mn, mx)) {
        if (o === f.o || o === s || !ov({ min: mn, max: mx }, o)) continue;
        if (isFront(o)) front++;
      }
      if (!front) push('signage', 'error', `店の看板の下がただの壁（「${t}」：戸・窓・シャッター・店の中が無い）`, s);
    }
  }

  // ── facade：枠の無い戸（地図帳の戸の絵の横に枠が無い）。歩ける所から空へ抜ける所は町だけ（下） ──
  {
    for (const p of solid) {
      if (!p.tile || !/^door|shopglass|autodoor|steeldoor/.test(p.tile)) continue;
      const [w, h, d] = dims(p); if (h < 1.6) continue;
      let fr = 0; for (const o of G.near(p.min.map(v => v - 0.15), p.max.map(v => v + 0.15))) { if (o === p || o.key === 'sign') continue; const od = dims(o); if (od[1] > h * 0.8 && Math.max(od[0], od[2]) < 0.25 && ov(p, o, 0.06)) fr++; }
      if (fr < 2) push('facade', 'warn', `戸の枠が無い（${p.tile}・${p.fn}）`, p);
    }
  }

  // ── zfight：同じ平面で同じ向きの面が重なる（色・絵が違う） ──
  {
    const aa = solid.filter(p => p.aa && p.src === 'b');
    const buckets = new Map();
    aa.forEach(p => { for (let ax = 0; ax < 3; ax++) for (const s of [0, 1]) { const v = s ? p.max[ax] : p.min[ax]; const k = ax + ':' + s + ':' + Math.round(v * 250); let a = buckets.get(k); if (!a) buckets.set(k, a = []); a.push(p); } });
    const seenPair = new Set();
    for (const [k, list] of buckets) {
      if (list.length < 2) continue;
      const [ax0, s0] = k.split(':').map(Number), o1 = (ax0 + 1) % 3, o2 = (ax0 + 2) % 3;
      if (list.length > 400) continue;
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const va = s0 ? a.max[ax0] : a.min[ax0], vb = s0 ? b.max[ax0] : b.min[ax0]; if (Math.abs(va - vb) > 0.002) continue;
        if (a.key === b.key && a.tile === b.tile && a.color === b.color) continue;       // 同じ見た目＝ちらつきが見えない
        const w1 = Math.min(a.max[o1], b.max[o1]) - Math.max(a.min[o1], b.min[o1]), w2 = Math.min(a.max[o2], b.max[o2]) - Math.max(a.min[o2], b.min[o2]);
        if (w1 <= 0.03 || w2 <= 0.03 || w1 * w2 < 0.02) continue;
        if (ax0 === 1 && s0 === 0 && va <= groundY + 0.01) continue;                   // 地面の下を向く面（見えない）
        if (ax0 === 1 && s0 === 0) continue;                                           // 下を向く面はほぼ見えない
        // 面がほかの箱の中に隠れている時は見えない
        const pk = Math.min(a.i, b.i) + '-' + Math.max(a.i, b.i); if (seenPair.has(pk)) continue; seenPair.add(pk);
        const m = [0, 0, 0]; m[ax0] = va; m[o1] = (Math.max(a.min[o1], b.min[o1]) + Math.min(a.max[o1], b.max[o1])) / 2; m[o2] = (Math.max(a.min[o2], b.min[o2]) + Math.min(a.max[o2], b.max[o2])) / 2;
        const off = m.slice(); off[ax0] += s0 ? 0.01 : -0.01;
        if (pointIn(G, off[0], off[1], off[2], q => q === a || q === b)) continue;
        const area = w1 * w2;
        push('zfight', area > 0.3 ? 'error' : 'warn', `同じ面が重なる（${a.fn}/${a.tile || a.key} × ${b.fn}/${b.tile || b.key}・${r2(area)}㎡）`, { min: a.min.map((v, q) => q === ax0 ? va : Math.max(v, b.min[q])), max: a.max.map((v, q) => q === ax0 ? va : Math.min(v, b.max[q])), fn: a.fn + '×' + b.fn, at: a.at + '×' + b.at }, { sqm: r2(area) });
      }
    }
  }

  // ── 町：歩ける所から空へ抜ける・車・出入り口の前 ──
  if (area === 'shotengai') townRules(solid, G, push);
  return issues;
}

function townRules(solid, G, push) {
  const T = TOWN;
  // facade：歩ける所の縁から外へ（建物の区画の方）見て、60m 以内に何も無い＝欠け（空・地面の下敷きが見える）
  const skip = p => p.src === 'wire' || p.max[1] < 0.6;
  for (const w of T.walk) {
    const [x0, z0, x1, z1] = w.rect;
    const edges = [[[x0, z0], [x1, z0], [0, -1]], [[x0, z1], [x1, z1], [0, 1]], [[x0, z0], [x0, z1], [-1, 0]], [[x1, z0], [x1, z1], [1, 0]]];
    for (const [a, b, n] of edges) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.floor(L / 2.5));
      for (let i = 0; i < m; i++) {
        const t = (i + 0.5) / m, x = a[0] + (b[0] - a[0]) * t - n[0] * 0.3, z = a[1] + (b[1] - a[1]) * t - n[1] * 0.3;
        if (x < T.bounds.minX + 1 || x > T.bounds.maxX - 1 || z < T.bounds.minZ + 1 || z > T.bounds.maxZ - 1) continue;
        // 隣も歩ける所なら飛ばす（道の続き）
        if (isWalkable(x + n[0] * 1.0, z + n[1] * 1.0)) continue;
        for (const y of [1.6, 4.5]) {
          const h = rayHit(G, [x, y, z], [n[0], 0, n[1]], 60, skip);
          // 町の外（bounds）まで 60m より近い＝町の縁の何も無い所が見える（error）。町の中を 60m 以上見通す（アーケードの奥など）は霧で見えない（warn）
          const exit = Math.min(n[0] > 0 ? (T.bounds.maxX - x) : n[0] < 0 ? (x - T.bounds.minX) : 1e9, n[1] > 0 ? (T.bounds.maxZ - z) : n[1] < 0 ? (z - T.bounds.minZ) : 1e9);
          if (!h) push('facade', y < 2 && exit < 60 ? 'error' : 'warn', `歩ける所（${w.name}）から外が空に抜ける（高さ ${y}m・向き ${n.join(',')}${exit < 60 ? '・町の縁まで ' + r2(exit) + 'm' : '・霧の奥'}）`, { min: [x - 0.1, y - 0.1, z - 0.1], max: [x + 0.1, y + 0.1, z + 0.1], fn: 'walk:' + w.id, at: 'data/town.js' }, { dir: n });
        }
      }
    }
  }
  // vehicle：車のかたまり（つながった車の形）ごと
  const veh = solid.filter(isVeh), G2 = new Grid(veh), done = new Set(), cars = [];
  for (const v of veh) {
    if (done.has(v)) continue; const comp = [], st = [v]; done.add(v);
    while (st.length) { const a = st.pop(); comp.push(a); for (const o of G2.near(a.min.map(q => q - 0.05), a.max.map(q => q + 0.05))) if (!done.has(o) && ov(a, o, 0.05) && o.fn === a.fn) { done.add(o); st.push(o); } }
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const c of comp) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], c.min[i]); mx[i] = Math.max(mx[i], c.max[i]); }
    cars.push({ min: mn, max: mx, fn: v.fn, at: v.at, n: comp.length });
  }
  const roadKinds = new Set(['main', 'lane', 'avenue', 'parking', 'plaza', 'yard', 'forecourt']);
  for (const c of cars) {
    const [w, h, d] = dims(c), cx = (c.min[0] + c.max[0]) / 2, cz = (c.min[2] + c.max[2]) / 2;
    if (c.min[1] > 0.05 || c.min[1] < -0.05) push('vehicle', 'error', `車輪が地面に着かない（下 ${r2(c.min[1])}m・${c.fn}）`, c);
    const wk = T.walk.find(q => cx >= q.rect[0] && cx <= q.rect[2] && cz >= q.rect[1] && cz <= q.rect[3]);
    const lot = T.lots.find(L => cx >= L.rect[0] && cx <= L.rect[2] && cz >= L.rect[1] && cz <= L.rect[3]);
    const okLot = lot && ['parking', 'home', 'house', 'hospital', 'konbini'].includes(lot.kind);
    if (!(wk && roadKinds.has(wk.kind)) && !okLot) push('vehicle', 'error', `車が道・駐車場の外（${wk ? wk.kind + ':' + wk.id : lot ? 'lot:' + lot.id : '何も無い所'}）`, c);
    if (wk && (wk.kind === 'main' || wk.kind === 'avenue' || wk.kind === 'lane')) {
      const rw = wk.rect[2] - wk.rect[0], rd = wk.rect[3] - wk.rect[1], roadAlongX = rw > rd, carAlongX = w > d;
      if (roadAlongX !== carAlongX && Math.max(w, d) > 3) push('vehicle', 'error', `車の向きが道と合わない（${wk.id}）`, c);
    }
  }
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i], b = cars[j]; if (ov(a, b, 0.3) && a.fn === b.fn) push('vehicle', 'error', `車どうしが近すぎる・重なる（${a.fn}）`, a); }
  // block：出入り口の前（0.6m 外）を、見た目の形（高さ 0.35〜1.8m）が塞ぐ
  for (const L of T.lots.filter(L => BUILDING_KINDS.includes(L.kind))) for (const e of lotEntrances(L)) {
    const tan = [Math.abs(e.out[1]), Math.abs(e.out[0])], span = Math.max(0, (e.w || 0.9) - 0.9), k = Math.max(1, Math.ceil(span / 0.4));
    let free = false, by = null;
    for (let i = 0; i <= k; i++) {
      const o = span ? (i / k - 0.5) * span : 0, x = e.gate[0] + e.out[0] * 0.6 + tan[0] * o, z = e.gate[1] + e.out[1] * 0.6 + tan[1] * o;
      if (!isWalkable(x, z) || blockedAt(x, z)) continue;
      const hit = pointIn(G, x, 1.0, z, p => p.max[1] < 0.35 || p.src === 'wire') || pointIn(G, x, 0.5, z, p => p.max[1] < 0.35 || p.src === 'wire');
      if (!hit) { free = true; break; } by = hit;
    }
    if (!free) push('block', 'error', `${L.id} の ${e.kind} の前が塞がれている${by ? '（' + by.fn + '）' : ''}`, { min: [e.gate[0] - 0.5, 0, e.gate[1] - 0.5], max: [e.gate[0] + 0.5, 2, e.gate[1] + 0.5], fn: by ? by.fn : 'data', at: L.id }, { dir: e.out });
  }
}

/** 理由つきで許す（warn に下げる）物：area・cat・fn・text の正規表現 */
export const ALLOW = [];
export function applyAllow(issues) {
  for (const it of issues) for (const a of ALLOW) {
    if ((a.area && a.area !== it.area) || (a.cat && a.cat !== it.cat)) continue;
    if (a.fn && !a.fn.test(it.fn || '')) continue; if (a.text && !a.text.test(it.text || '')) continue; if (a.msg && !a.msg.test(it.msg)) continue;
    if (a.near && (!it.pos || Math.hypot(it.pos[0] - a.near[0], it.pos[2] - a.near[1]) > (a.r || 2))) continue;
    if (it.sev === 'error') { it.sev = 'warn'; it.allow = a.why; }
  }
  return issues;
}
