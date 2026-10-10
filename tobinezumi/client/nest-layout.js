// tobinezumi/client/nest-layout.js — 巣データ → 画面上の配置（DOM なし。テストで両モードの一致を確かめる）
// 全体モード（ビルド）と閲覧モード（歩く）は、どちらも「同じセル座標 × 16px」で家具・部屋を置く。変換表は持たない。
import { objectsWithFixtures, CELL, climbMap, slopeMap } from '../shared/nest-rules.js';
import { FURNITURE } from '../shared/items.js';

/** 家具・備え付けのピクセル矩形 */
export function objectRects(data) {
  return objectsWithFixtures(data).map(o => ({ ...o, px: o.x * CELL, py: o.y * CELL, pw: o.w * CELL, ph: o.h * CELL }));
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
  const lights = objects.filter(o => o.type === 'lamp').map(o => ({ x: o.px + o.pw / 2, y: o.py + 9, r: FURNITURE.lamp.light }));
  return {
    cell: CELL, width: data.w * CELL, height: data.h * CELL,
    rooms: roomRects(data), objects, interact, lights,
    exit: { x: data.entrance.x * CELL + CELL / 2, y: (data.surfaceY + 1) * CELL },
    climb: climbMap(data), slopes: slopeMap(data),
  };
}
