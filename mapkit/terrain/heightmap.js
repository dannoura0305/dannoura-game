// 高さマップ（DOM・three.js なし）。docs/wakaba-mapkit/07 §1 terrain/heightmap.js。
// 16bit PNG／RAW（符号なし 16bit・リトルエンディアン）→ Float32 の高さ。高さ・法線・傾きを返す（双線形）。
// 並び：data[j * nx + i] が x = i * cell、z = j * cell（m）の高さ。PNG の行 j ＝ z の j 番目（行 0 が z = 0）。
// 16bit の値 0〜65535 を minY〜maxY（m）へ直線で写す（Gaea・Blender の書き出しと同じ考え。範囲は地図仕様の terrain.source に書く）。
import { decodePNG, encodePNG16 } from './png.js';

export class Heightfield {
  /** { nx, nz, cell, data?: Float32Array, minY, maxY } */
  constructor({ nx, nz, cell = 1, data = null, minY = 0, maxY = 100 }) {
    this.nx = nx; this.nz = nz; this.cell = cell; this.minY = minY; this.maxY = maxY;
    this.data = data || new Float32Array(nx * nz);
    if (this.data.length !== nx * nz) throw new Error(`高さの数 ${this.data.length} が ${nx}×${nz} と合いません`);
  }
  get sizeX() { return (this.nx - 1) * this.cell; }
  get sizeZ() { return (this.nz - 1) * this.cell; }
  clone() { return new Heightfield({ nx: this.nx, nz: this.nz, cell: this.cell, data: this.data.slice(), minY: this.minY, maxY: this.maxY }); }
  get(i, j) { i = i < 0 ? 0 : i >= this.nx ? this.nx - 1 : i; j = j < 0 ? 0 : j >= this.nz ? this.nz - 1 : j; return this.data[j * this.nx + i]; }
  set(i, j, v) { this.data[j * this.nx + i] = v; }
  /** 高さ（双線形・範囲の外は端の値） */
  at(x, z) {
    const fx = Math.max(0, Math.min(this.nx - 1, x / this.cell)), fz = Math.max(0, Math.min(this.nz - 1, z / this.cell));
    const i = Math.min(this.nx - 2, Math.floor(fx)), j = Math.min(this.nz - 2, Math.floor(fz)), u = fx - i, v = fz - j, n = this.nx, d = this.data, k = j * n + i;
    return (d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + n] * (1 - u) + d[k + n + 1] * u) * v;
  }
  /** 傾き [dh/dx, dh/dz]（升目 1 つ分の中央差分） */
  grad(x, z) { const e = this.cell; return [(this.at(x + e, z) - this.at(x - e, z)) / (2 * e), (this.at(x, z + e) - this.at(x, z - e)) / (2 * e)]; }
  /** 法線 [x, y, z]（上向き・長さ 1） */
  normal(x, z) { const [gx, gz] = this.grad(x, z), L = Math.hypot(gx, 1, gz); return [-gx / L, 1 / L, -gz / L]; }
  /** 傾きの角度（度） */
  slopeDeg(x, z) { const [gx, gz] = this.grad(x, z); return Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI; }
  /** 範囲 [min, max] */
  extent() { let a = Infinity, b = -Infinity; for (const v of this.data) { if (v < a) a = v; if (v > b) b = v; } return [a, b]; }
  /** 16bit に丸める（書き出し → 読み込みと同じ値にする。配置の検査は丸めた後の地形で行う） */
  quantize() { const r = this.maxY - this.minY; for (let k = 0; k < this.data.length; k++) { const q = Math.round(Math.max(0, Math.min(1, (this.data[k] - this.minY) / r)) * 65535); this.data[k] = this.minY + q / 65535 * r; } return this; }
  /** 1 つの値を 16bit に丸めた値 */
  quantizeValue(y) { const r = this.maxY - this.minY; return this.minY + Math.round(Math.max(0, Math.min(1, (y - this.minY) / r)) * 65535) / 65535 * r; }
  /** 高さの指紋（16bit の値の FNV-1a） */
  fingerprint() { const u = this.toUint16(); let h = 2166136261; for (let k = 0; k < u.length; k++) { h ^= u[k] & 255; h = Math.imul(h, 16777619); h ^= u[k] >> 8; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
  toUint16() { const r = this.maxY - this.minY, out = new Uint16Array(this.data.length); for (let k = 0; k < out.length; k++) out[k] = Math.round(Math.max(0, Math.min(1, (this.data[k] - this.minY) / r)) * 65535); return out; }
  toPNG16() { return encodePNG16(this.nx, this.nz, this.toUint16()); }
  /** RAW（符号なし 16bit・リトルエンディアン・行の順） */
  toRAW16() { const u = this.toUint16(), b = new Uint8Array(u.length * 2); for (let k = 0; k < u.length; k++) { b[k * 2] = u[k] & 255; b[k * 2 + 1] = u[k] >> 8; } return b; }
}

/** 16bit 値の並び → Heightfield。size は [w, d]（m）。cell は size / (n - 1) */
export function fromUint16(nx, nz, values, { size, minY = 0, maxY = 100, bits = 16 } = {}) {
  const max = bits === 8 ? 255 : 65535, r = maxY - minY, data = new Float32Array(nx * nz);
  for (let k = 0; k < data.length; k++) data[k] = minY + values[k] / max * r;
  const cell = size ? size[0] / (nx - 1) : 1;
  if (size && Math.abs(size[1] / (nz - 1) - cell) > 1e-6) throw new Error(`高さマップの升目が正方形になりません（${nx}×${nz} に ${size[0]}×${size[1]}m）`);
  return new Heightfield({ nx, nz, cell, data, minY, maxY });
}

/** PNG（16bit か 8bit のグレー・色付きなら最初の色）→ Heightfield */
export async function heightfieldFromPNG(bytes, opt = {}) {
  const img = await decodePNG(bytes);
  let v = img.data;
  if (img.channels > 1) { const one = new (img.bitDepth === 16 ? Uint16Array : Uint8Array)(img.width * img.height); for (let k = 0; k < one.length; k++) one[k] = v[k * img.channels]; v = one; }
  return fromUint16(img.width, img.height, v, Object.assign({ bits: img.bitDepth }, opt));
}

/** RAW16（リトルエンディアン）→ Heightfield。n×n の正方形（n は長さから求める）か nx・nz を渡す */
export function heightfieldFromRAW16(bytes, opt = {}) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), N = b.length >> 1;
  const nx = opt.nx || Math.round(Math.sqrt(N)), nz = opt.nz || N / nx;
  if (nx * nz !== N) throw new Error(`RAW16 の大きさ ${b.length} バイトが ${nx}×${nz} と合いません`);
  const u = new Uint16Array(N); for (let k = 0; k < N; k++) u[k] = b[k * 2] | (b[k * 2 + 1] << 8);
  return fromUint16(nx, nz, u, opt);
}
