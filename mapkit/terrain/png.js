// 小さな PNG の読み書き（依存なし・node とブラウザ両方）。高さマップ（16bit のグレー）のため。
// 圧縮の展開・圧縮は標準の DecompressionStream／CompressionStream（'deflate'＝zlib の形。node 18 以降・Chromium・Safari 16.4 以降）。
// 読める物：色の種類 0（グレー）・2（RGB）・4（グレー＋α）・6（RGBA）、8bit／16bit、インターレース無し。それ以外は誤りを投げる。
// canvas の画像の読み込みは 8bit に丸められるので使わない（16bit の高さを失う）。

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CH = { 0: 1, 2: 3, 4: 2, 6: 4 };

let CRC;
function crc32(buf, start, end) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = start; i < end; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
}
async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
export const inflate = bytes => pipe(bytes, new DecompressionStream('deflate'));
export const deflate = bytes => pipe(bytes, new CompressionStream('deflate'));

/** PNG → { width, height, bitDepth, colorType, channels, data }（data は 1 標本ずつ：16bit なら Uint16Array） */
export async function decodePNG(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) throw new Error('PNG ではありません（先頭の印が違う）');
  let p = 8, hdr = null; const idat = [];
  const u32 = o => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  while (p + 8 <= b.length) {
    const len = u32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]), d0 = p + 8;
    if (d0 + len + 4 > b.length) throw new Error('PNG が途中で切れています');
    if (crc32(b, p + 4, d0 + len) !== u32(d0 + len)) throw new Error(`PNG の ${type} の CRC が合いません`);
    if (type === 'IHDR') hdr = { width: u32(d0), height: u32(d0 + 4), bitDepth: b[d0 + 8], colorType: b[d0 + 9], interlace: b[d0 + 12] };
    else if (type === 'IDAT') idat.push(b.subarray(d0, d0 + len));
    else if (type === 'IEND') break;
    p = d0 + len + 4;
  }
  if (!hdr) throw new Error('PNG に IHDR がありません');
  const { width: W, height: H, bitDepth: bd, colorType: ct } = hdr;
  if (!CH[ct]) throw new Error(`この PNG の色の種類（${ct}）は読めません（グレー・RGB・RGBA だけ）`);
  if (bd !== 8 && bd !== 16) throw new Error(`この PNG のビット数（${bd}）は読めません（8 か 16）`);
  if (hdr.interlace) throw new Error('インターレースの PNG は読めません');
  const total = idat.reduce((s, x) => s + x.length, 0), z = new Uint8Array(total); let o = 0; for (const x of idat) { z.set(x, o); o += x.length; }
  const raw = await inflate(z);
  const ch = CH[ct], bpp = ch * bd / 8, stride = W * bpp;
  if (raw.length < H * (stride + 1)) throw new Error('PNG の中身が足りません');
  const out = new Uint8Array(H * stride), prev = new Uint8Array(stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : prev;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? row[i - bpp] : 0, c = up[i], ul = i >= bpp ? up[i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + c; else if (f === 3) v = x + ((a + c) >> 1);
      else if (f === 4) { const pp = a + c - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - c), pc = Math.abs(pp - ul); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? c : ul); }
      else throw new Error(`PNG の行の濾過（${f}）が違います`);
      row[i] = v & 255;
    }
  }
  let data;
  if (bd === 16) { data = new Uint16Array(W * H * ch); for (let i = 0; i < data.length; i++) data[i] = (out[i * 2] << 8) | out[i * 2 + 1]; }
  else data = out;
  return { width: W, height: H, bitDepth: bd, colorType: ct, channels: ch, data };
}

/** 16bit のグレー PNG を作る（values は Uint16Array・行の順） */
export const encodePNG16 = (width, height, values) => encodePNG(width, height, values, { bitDepth: 16, channels: 1 });

/** PNG を作る。channels 1（グレー）・3（RGB）・4（RGBA）、bitDepth 8／16。濾過は Up（高さは上下の差が小さい） */
export async function encodePNG(width, height, values, { bitDepth = 8, channels = 1 } = {}) {
  const ct = { 1: 0, 2: 4, 3: 2, 4: 6 }[channels], bps = bitDepth / 8, stride = width * channels * bps, raw = new Uint8Array(height * (stride + 1));
  const byte = bitDepth === 16
    ? (y, i) => { const v = values[y * width * channels + (i >> 1)]; return i & 1 ? v & 255 : v >> 8; }
    : (y, i) => values[y * stride + i] & 255;
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 2;                                         // Up：上の行の同じバイトとの差
    for (let i = 0; i < stride; i++) raw[y * (stride + 1) + 1 + i] = (byte(y, i) - (y ? byte(y - 1, i) : 0)) & 255;
  }
  const z = await deflate(raw);
  const chunks = [];
  const chunk = (type, data) => {
    const c = new Uint8Array(12 + data.length), dv = new DataView(c.buffer);
    dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) c[4 + i] = type.charCodeAt(i); c.set(data, 8);
    dv.setUint32(8 + data.length, crc32(c, 4, 8 + data.length)); chunks.push(c);
  };
  const ih = new Uint8Array(13), dv = new DataView(ih.buffer); dv.setUint32(0, width); dv.setUint32(4, height); ih[8] = bitDepth; ih[9] = ct; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  chunk('IHDR', ih); chunk('IDAT', z); chunk('IEND', new Uint8Array(0));
  const n = 8 + chunks.reduce((s, c) => s + c.length, 0), out = new Uint8Array(n); out.set(SIG, 0); let o = 8; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
