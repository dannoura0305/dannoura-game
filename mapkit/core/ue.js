// 配置（layout.json：wakaba-map-layout/1）・高さマップを Unreal Engine 5／Blender の座標へ写す計算（純粋関数・DOM なし）。
// 方式 C（ブラウザ版＝Three.js と 高性能 PC 版＝UE5 が同じ地図データ・同じ素材ライブラリを使う）のための橋。docs/wakaba-mapkit/10。
// tools/ue5/import_layout.py・tools/blender/import_layout.py は同じ式を Python で持ち、tests/wakaba-mapkit-bridge.test.mjs が突き合わせる。
//
// 座標（layout.json）：x＝東・y＝上・z＝北・m・右手系（Three.js と同じ）。rotY（度）はローカル +z（前）→ 世界 (sin, cos)。tilt（度）はローカル x 軸まわり（YXZ の順）。
// UE5：X・Y・Z（Z が上）・cm・左手系。写し方：UE (X, Y, Z) = (x, z, y) × 100（2 軸の入れ替えで左手系になるので鏡写しにならない）。
//   回転：Yaw = −rotY、Roll = tilt、Pitch = 0（UE の FRotator の行列で確かめた式。UE の画面では未検証）
//   大きさ：size [sx, sy(高さ), sz] → UE の (sx, sz, sy)。/Engine/BasicShapes/Cube（100cm・中心が原点）なら scale ＝ m の値そのまま。
// Blender：X・Y・Z（Z が上）・m・右手系。glTF の取り込みと同じ写し方：Blender (X, Y, Z) = (x, −z, y)。回転：Euler XYZ ＝ (tilt, 0, rotY)（度）。
//   → Blender から glTF（+Y 上）で書き出すと layout.json の座標に戻り、FBX（UE）で書き出すと UE の上の写し方に一致する。
// 高さ（16bit PNG）：行 j ＝ z = j×cell（行 0 が z = 0）、列 i ＝ x。UE の Landscape の取り込みは 列＝X・行＝Y なので、上の写し方なら画像を反転せずにそのまま使える。

export const CM = 100;

/** layout の位置 [x, y, z]（m）→ UE の [X, Y, Z]（cm） */
export const toUE = ([x, y, z]) => [r3(x * CM), r3(z * CM), r3(y * CM)];
/** layout の回転 → UE の { roll, pitch, yaw }（度） */
export const toUERot = (rotY = 0, tilt = 0) => ({ roll: r3(tilt || 0), pitch: 0, yaw: r3(-(rotY || 0)) || 0 });
/** layout の大きさ [sx, sy, sz]（m）→ UE の [sx, sz, sy]（BasicShapes の倍率） */
export const toUESize = ([sx, sy, sz]) => [r3(sx), r3(sz), r3(sy)];
/** layout → Blender（m） */
export const toBlender = ([x, y, z]) => [r3(x), r3(-z) || 0, r3(y)];
export const toBlenderRot = (rotY = 0, tilt = 0) => [r3(tilt || 0), 0, r3(rotY || 0)];
export const toBlenderSize = ([sx, sy, sz]) => [r3(sx), r3(sz), r3(sy)];

/** 部品（buildings[].parts[]：c が中心）→ UE の置き方（BasicShapes：中心が原点・100cm） */
export function partToUE(p) {
  return { id: p.id, location: toUE(p.c), rotation: toUERot(p.rotY, p.tilt), scale: toUESize(p.size), shape: p.shape };
}
/**
 * 物（objects[]：at が底の中心）→ UE の置き方。
 * mesh が仮の形（BasicShapes：中心が原点）なら高さの半分を上げて size を倍率に、
 * 本物の素材（pivot: bottom_center・1 単位＝1m で作った物）なら at のまま・scale は一様。
 */
export function objectToUE(o, { pivot = 'center_basic' } = {}) {
  const at = o.at.slice();
  if (pivot === 'center_basic') {
    at[1] += o.size[1] / 2 - (o.embed || 0) / 2;
    return { id: o.id, kind: o.kind, location: toUE(at), rotation: toUERot(o.rotY), scale: toUESize(o.size) };
  }
  const s = r3(o.scale || 1);
  return { id: o.id, kind: o.kind, location: toUE(at), rotation: toUERot(o.rotY), scale: [s, s, s] };
}

// ── Landscape（UE の高さの地面）
/** Epic の推奨の大きさ（頂点の数・正方形）。1 辺の頂点数＝区画の数×区画の中の区分×四角形の数＋1 */
export const UE_RECOMMENDED = [127, 253, 505, 1009, 2017, 4033, 8129];
const QUADS = [7, 15, 31, 63, 127, 255];

/**
 * n（1 辺の頂点数）に合う区画の割り方を探す：{ quadsPerSection, sectionsPerComponent（1 辺：1 か 2）, components（1 辺）, total }。
 * 合わなければ null（UE は端を切るか伸ばす）。区画は 1 辺 32 個（全部で 1024 個）まで。Epic の表と同じく 63 quads・2×2 を先に選ぶ。
 */
export function landscapeLayout(n) {
  const prefer = [[63, 2], [127, 2], [127, 1], [63, 1], [255, 1], [255, 2], [31, 2], [31, 1], [15, 2], [15, 1], [7, 2], [7, 1]];
  for (const [q, s] of prefer) {
    const per = q * s;
    if ((n - 1) % per) continue;
    const c = (n - 1) / per;
    if (c >= 1 && c <= 32) return { quadsPerSection: q, sectionsPerComponent: s, components: c, total: c * c };
  }
  return null;
}
/** 元の頂点数（nSrc）以上で一番小さい推奨の大きさ（無ければ最大） */
export function pickLandscapeSize(nSrc) { return UE_RECOMMENDED.find(n => n >= nSrc) || UE_RECOMMENDED[UE_RECOMMENDED.length - 1]; }

/**
 * Landscape の取り込みの値：16bit の 0〜65535 が minM〜maxM（m）に、1 辺 n 頂点が sizeM（m）になるように。
 * UE の式：高さ（cm）＝ (値 − 32768) × ScaleZ / 128 ＋ Location.Z。ScaleZ 100 で ±256m。
 *   → ScaleZ ＝ (maxM − minM) × 100 × 128 / 65535、Location.Z ＝ minM × 100 ＋ 32768 × ScaleZ / 128
 *   ScaleX＝ScaleY ＝ sizeM × 100 / (n − 1)（cm／四角形 1 つ）
 */
export function landscapeSettings({ n, sizeM, minM, maxM }) {
  const range = maxM - minM;
  if (!(range > 0)) throw new Error('高さの範囲が 0 以下です');
  const scaleZ = range * CM * 128 / 65535, scaleXY = sizeM * CM / (n - 1);
  return {
    size: n, layout: landscapeLayout(n),
    scale: { x: r6(scaleXY), y: r6(scaleXY), z: r6(scaleZ) },
    location: { x: 0, y: 0, z: r6(minM * CM + 32768 * scaleZ / 128) },
    rangeM: r6(range), cellM: r6(sizeM / (n - 1)),
  };
}
/** 16bit の値 → UE の高さ（cm）（landscapeSettings の検算用） */
export const ueHeightCm = (v, s) => (v - 32768) * s.scale.z / 128 + s.location.z;

/** 高さの格子（Float32・nx×nz・cell）を n×n に双線形で取り直す（端は端の値） */
export function resample(data, nx, nz, n) {
  const out = new Float32Array(n * n), fx = (nx - 1) / (n - 1), fz = (nz - 1) / (n - 1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * fx, z = j * fz, i0 = Math.min(nx - 2, Math.floor(x)), j0 = Math.min(nz - 2, Math.floor(z)), u = x - i0, v = z - j0, k = j0 * nx + i0;
    out[j * n + i] = (data[k] * (1 - u) + data[k + 1] * u) * (1 - v) + (data[k + nx] * (1 - u) + data[k + nx + 1] * u) * v;
  }
  return out;
}

function r3(v) { return Math.round(v * 1000) / 1000; }
function r6(v) { return Math.round(v * 1e6) / 1e6; }
