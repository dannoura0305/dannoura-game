// 当たり判定（DOM・three.js なし）。本体は共通の mapkit/core/geom.js へ移した（二重の実装を残さない・bones.js と同じ形）。
// ここは作品側の入口として再輸出するだけ。box・resolveCircle などの挙動は移す前と同じ。
// 区画の壁・建物は軸に沿った箱（AABB）。キャラクターは「カプセル」＝ XZ 平面の円（半径 r）＋高さ。地面は y=0 の平ら。
export { box, resolveCircle, insideAny, rayBoxes, lineOfSight, rayCylinder, raySphere } from '../../mapkit/core/geom.js';
