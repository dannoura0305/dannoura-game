// tobinezumi/client/soundbank.js — 音の素材（CC0）を後から読む係（2026-11-14）。
// ・起動時には何も読まない。open() されるまで（最初の操作の後、遊びが落ち着いてから）頼まれた物は覚えておくだけ。
// ・場面に入った時：その場面の曲・環境音を先に、続いて効果音を 1 つずつ（同時に 2 本まで）読む。読めた物は覚えておく。
// ・読めない・まだの音は、呼ぶ側（sfx.js・ambient.js・music.js）が合成音で鳴らすか、鳴らさない。
// ・繰り返す音は、読んだ時に端の無音（mp3 の詰め物）を外し、終わりの 80ms に頭の 80ms を溶かし込んで継ぎ目で切れないようにする。
import { MATERIALS, SE_MAP, fileOf, loadListFor, seLoadList } from './sound-data.js';
import { audioCtx } from './audio-core.js';

export class SoundBank {
  /** base = assets/sound/ の URL・files = SOUND_FILES */
  constructor(base, files) {
    this.base = base; this.files = files || {};
    this.bufs = new Map(); this.loading = new Map(); this.queue = []; this.active = 0; this.opened = false;
    this.log = []; this.bytes = 0; this.seAsked = false; this.loops = new Map(); this.lastKey = '';
  }
  open() { if (this.opened) return; this.opened = true; this._pump(); }
  has(id) { return this.bufs.has(id); }
  buf(id) { return this.bufs.get(id) || null; }
  exists(id) { const f = fileOf(id); return !!(f && this.files[f]); }
  info(id) { return this.files[fileOf(id)] || null; }
  /** 繰り返す区間 [始め, 終わり]（秒） */
  loop(id) { const b = this.bufs.get(id); return this.loops.get(id) || (b ? [0, b.duration] : null); }
  setLoop(src, id) { const L = this.loop(id); if (L && L[1] > L[0]) { src.loopStart = L[0]; src.loopEnd = L[1]; } }
  want(ids, urgent = false) {
    for (const id of ids) {
      if (!this.exists(id) || this.bufs.has(id) || this.loading.has(id) || this.queue.includes(id)) continue;
      if (urgent) this.queue.unshift(id); else this.queue.push(id);
    }
    this._pump();
  }
  /** 場面（sound-data.js の bgmPick と同じ形）に要る物を頼む。同じ場面なら何もしない */
  enter(c) {
    const key = [c.scene, c.region, c.period, c.season, c.weather].join('|');
    if (key === this.lastKey) return; this.lastKey = key;
    this.want(loadListFor(c, this.files), true);
    if (!this.seAsked && (c.scene === 'field' || c.scene === 'nest')) { this.seAsked = true; this.want(seLoadList(this.files)); }
  }
  /** 効果音の名前 → { id, buf, rate }（読めていれば）。読めていなければ読むのを頼んで null */
  se(name) {
    const e = SE_MAP[name]; if (!e) return null;
    const ok = e.m.filter(id => this.bufs.has(id));
    if (!ok.length) { if (this.opened && e.m.some(id => this.exists(id))) this.want(e.m); return null; }
    const id = ok[Math.floor(Math.random() * ok.length)], r = e.r || [1, 1];
    return { id, buf: this.bufs.get(id), rate: r[0] + Math.random() * (r[1] - r[0]), info: this.info(id) };
  }
  _pump() {
    if (!this.opened) return;
    const ctx = audioCtx(); if (!ctx) return;
    while (this.active < 2 && this.queue.length) {
      const id = this.queue.shift(), f = fileOf(id); this.active++;
      const t0 = performance.now();
      const p = fetch(new URL(f, this.base)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + r.status))))
        .then(ab => { this.bytes += ab.byteLength; return new Promise((ok, ng) => { const q = ctx.decodeAudioData(ab, ok, ng); if (q && q.then) q.then(ok, ng); }); })
        .then(b => {
          const m = MATERIALS[id] || {};
          if (m.kind === 'amb' || (m.kind === 'bgm' && m.loop)) this.loops.set(id, loopFade(b, edgeTrim(b)));
          this.bufs.set(id, b);
          this.log.push({ id, f, at: Math.round(t0), ms: Math.round(performance.now() - t0), kind: m.kind });
          return b;
        })
        .catch(e => { this.log.push({ id, f, err: String((e && e.message) || e) }); return null; })
        .finally(() => { this.loading.delete(id); this.active--; this._pump(); });
      this.loading.set(id, p);
    }
  }
}
/** 端の無音（|x| < 1e-4 が続く所。各端 0.08 秒まで）を除いた区間 [始め, 終わり]（秒） */
export function edgeTrim(b) {
  const d = b.getChannelData(0), n = d.length, lim = Math.min(n >> 2, Math.round(b.sampleRate * 0.08));
  let a = 0; while (a < lim && Math.abs(d[a]) < 1e-4) a++;
  let z = 0; while (z < lim && Math.abs(d[n - 1 - z]) < 1e-4) z++;
  return [a / b.sampleRate, (n - z) / b.sampleRate];
}
/** 継ぎ目を溶かす：区間 [a, z] の終わりの F 秒に頭の F 秒を重ねる（バッファを書き換える）。返り値：繰り返す区間 [a + F, z] */
export function loopFade(b, [a, z], F = 0.08) {
  const sr = b.sampleRate, A = Math.round(a * sr), Z = Math.round(z * sr), N = Math.min(Math.round(F * sr), (Z - A) >> 3);
  if (N < 8) return [a, z];
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < N; i++) { const w = (i + 1) / N, j = Z - N + i; d[j] = d[j] * Math.sqrt(1 - w) + d[A + i] * Math.sqrt(w); }
  }
  return [(A + N) / sr, z];
}
