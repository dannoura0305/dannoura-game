// tobinezumi/client/nest-layout.js — 巣データ → 画面上の配置（DOM なし。テストで両モードの一致を確かめる）
// 全体モード（ビルド）と閲覧モード（歩く）は、どちらも「同じセル座標 × 16px」で家具・部屋を置く。変換表は持たない。
import { objectsWithFixtures, CELL, climbMap, slopeMap, tryOp } from '../shared/nest-rules.js';
import { FURNITURE } from '../shared/items.js';

/** 家具・備え付けのピクセル矩形 */
export function objectRects(data) {
  return objectsWithFixtures(data).map(o => {
    const r = o.roomId ? data.rooms.find(q => q.id === o.roomId) : null;   // floorY：部屋の床（壁に掛けた飾りか、床に置いた飾りか）
    return { ...o, px: o.x * CELL, py: o.y * CELL, pw: o.w * CELL, ph: o.h * CELL, ...(r ? { floorY: (r.y + r.h) * CELL } : {}) };
  });
}
export function roomRects(data) {
  return data.rooms.map(r => ({ ...r, px: r.x * CELL, py: r.y * CELL, pw: r.w * CELL, ph: r.h * CELL }));
}

/** 全体モード：描く物の一覧 */
export function buildLayout(data) {
  return { cell: CELL, width: data.w * CELL, height: data.h * CELL, rooms: roomRects(data), objects: objectRects(data) };
}

/** 閲覧モード：描く物＋調べられる場所＋灯り＋出口 */
export function walkLayout(data) {
  const objects = objectRects(data);
  const interact = objects.map(o => ({
    id: o.id, type: o.type,
    x0: o.px - 4, x1: o.px + o.pw + 4, floorY: o.py + o.ph,
    action: o.type === 'nestbed' ? 'sleep' : o.type === 'storage' ? 'store' : 'look',
  }));
  const lights = objects.filter(o => FURNITURE[o.type] && FURNITURE[o.type].light).map(o => ({ x: o.px + o.pw / 2, y: o.py + 9, r: FURNITURE[o.type].light }));
  return {
    cell: CELL, width: data.w * CELL, height: data.h * CELL,
    rooms: roomRects(data), objects, interact, lights,
    exit: { x: data.entrance.x * CELL + CELL / 2, y: (data.surfaceY + 1) * CELL },
    climb: climbMap(data), slopes: slopeMap(data),
  };
}

// ── Ver.0.9：全体モードの「掘る」をなぞったとき（DOM なし） ──
/** (x0,y0) から (x1,y1) へ、縦横だけでつながるマスの列（始まりのマスは入れない）。指が速くてもマスを飛ばさない */
export function cellPath(x0, y0, x1, y1) {
  const out = [];
  let x = x0, y = y0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  let ex = 0, ey = 0;
  for (let k = 0; k < dx + dy && k < 400; k++) {
    // 線から離れにくい方へ 1 マス
    const stepX = ey >= dy || (ex < dx && (2 * ex + 1) * dy <= (2 * ey + 1) * dx);
    if (stepX) { x += sx; ex++; } else { y += sy; ey++; }
    out.push({ x, y });
  }
  return out;
}
/**
 * なぞった道のりのマスを、手元の予想（まだ返事の来ていない掘りも済んだものとした巣）で順に確かめる。
 * 「もう掘ってある」マスは通りぬけ、ほかの理由で掘れないマスで止まる。返り値 {ops, data, reason, at}
 * （at＝最後に確かめたマス。止まったときはその手前）
 */
export function planDigs(data, path, max = 8) {
  const ops = [];
  let d = data, reason = null, at = null;
  for (const c of path) {
    if (ops.length >= max) break;
    const op = { op: 'dig', x: c.x, y: c.y };
    const r = tryOp(d, op, null);
    if (r.ok) { d = r.data; ops.push(op); at = c; continue; }
    if (r.reason === 'もう掘ってある') { at = c; continue; }
    reason = r.reason; break;
  }
  return { ops, data: d, reason, at };
}
/**
 * 1 回なぞり終えたときの知らせ（ひとつにまとめる）。n＝掘れたマス、reason＝手元で掘れないと分かった最初の理由、
 * fail＝送ったのに断られた理由、already＝もう掘ってある所だけをなぞった。
 * 掘れた → その場に小さく浮かぶ文字（pop。トーストは出さない）。掘れなかった・とちゅうで止まった → 理由のトースト（bad）。
 */
export function digStrokeNote({ n = 0, reason = null, fail = null, already = false } = {}) {
  if (n > 0) return { pop: n === 1 ? '掘った' : n + ' マス掘った', toast: fail ? { text: 'とちゅうで止まった：' + fail, kind: 'bad' } : null };
  const why = fail || reason || (already ? 'もう掘ってある' : null);
  return { pop: null, toast: why ? { text: why, kind: 'bad' } : null };
}
