// 音の素材を読む人（ブラウザ）。対応表は data/sound.js、置いてあるファイルの表は data/sound_files.js。2026-11-13
// ・起動時には何も読まない。open() されるまで（遊びが始まり、起動の後読み bootMs.lateAt を過ぎるまで）頼まれた物は覚えておくだけ。
// ・区画に入った時：その区画の環境音・曲を先に、続いて効果音・足音を 1 つずつ（同時に 2 本まで）読む。読めた物は覚えておく。
// ・読めない・まだの音は、呼ぶ側（core/audio.js・core/bgm.js）が合成音で鳴らすか、鳴らさない。
// ・繰り返す音（環境音・繰り返す曲）は、読んだ時に端の無音（mp3 の詰め物が残るブラウザ向け）を測って外し、終わりの 80ms に頭の 80ms を溶かし込んで
//   繰り返す区間 loop(id) を [頭の 80ms の後, 終わり] にする（mp3 の境目が数サンプルずれても継ぎ目で音が切れない）（2026-11-14）。
import { MATERIALS, SE_MAP, STEPS, fileOf, areaLoadList, seLoadList } from '../data/sound.js';

export class SoundBank {
  /** sfx = core/audio.js の Sfx（同じ AudioContext）・base = assets/sound/ の URL・files = SOUND_FILES */
  constructor(sfx, base, files) {
    this.sfx = sfx; this.base = base; this.files = files || {};
    this.bufs = new Map(); this.loading = new Map(); this.queue = []; this.active = 0; this.opened = false;
    this.log = []; this.bytes = 0; this.onload = null; this.seAsked = false; this.loops = new Map();
  }
  /** 読み始めてよい（遊びが始まって起動の後読みを過ぎた）。それまでに頼まれた物を読み始める */
  open() { if (this.opened) return; this.opened = true; this._pump(); }
  has(id) { return this.bufs.has(id); }
  buf(id) { return this.bufs.get(id) || null; }
  /** 繰り返す区間 [始め, 終わり]（秒）。端に無音の詰め物が無ければ [0, 長さ] */
  loop(id) { const b = this.bufs.get(id); return this.loops.get(id) || (b ? [0, b.duration] : null); }
  /** 繰り返す音（src.loop = true の物）に区間を付ける */
  setLoop(src, id) { const L = this.loop(id); if (L && L[1] > L[0]) { src.loopStart = L[0]; src.loopEnd = L[1]; } }
  /** 置いてある素材か（ファイルの表にある） */
  exists(id) { const f = fileOf(id); return !!(f && this.files[f]); }
  info(id) { return this.files[fileOf(id)] || null; }
  /** 読む物を頼む（先頭＝急ぐ物）。置いていない素材は頼まない */
  want(ids, urgent = false) {
    for (const id of ids) {
      if (!this.exists(id) || this.bufs.has(id) || this.loading.has(id) || this.queue.includes(id)) continue;
      if (urgent) this.queue.unshift(id); else this.queue.push(id);
    }
    this._pump();
  }
  /** 区画に入った時（環境の種類は複数のことがある：自宅と町 等） */
  enterArea(area, ambKinds) {
    this.want(areaLoadList(area, ambKinds, this.files), true);
    if (!this.seAsked) { this.seAsked = true; this.want(seLoadList(this.files)); }
  }
  /** 効果音の名前 → 鳴らす素材（読めていれば）{ buf, g, rate }。読めていなければ読むのを頼んで null */
  se(name) {
    const e = SE_MAP[name]; if (!e) return null;
    const ok = e.m.filter(id => this.bufs.has(id));
    if (!ok.length) { if (e.m.some(id => this.exists(id))) this.want(e.m, true); return null; }
    const id = ok[Math.floor(Math.random() * ok.length)], r = e.r || [1, 1];
    return { id, buf: this.bufs.get(id), g: e.g ?? 0.6, rate: r[0] + Math.random() * (r[1] - r[0]) };
  }
  /** 足音の 1 歩（読めていれば）{ buf, off, dur, g } */
  step(surface, run) {
    const s = STEPS[surface] || STEPS.asphalt, id = run ? s.run : s.walk, b = this.bufs.get(id); if (!b) return null;
    const sl = (this.info(id) || {}).slices; let off = 0, dur = Math.min(0.4, b.duration);
    if (sl && sl.length) { const k = sl[Math.floor(Math.random() * sl.length)]; off = k[0]; dur = k[1]; }
    return { id, buf: b, off, dur, g: s.g };
  }
  _pump() {
    if (!this.opened) return;
    const ctx = this.sfx && this.sfx.ctx; if (!ctx) return;          // 音の準備（利用者の操作の後）ができてから
    while (this.active < 2 && this.queue.length) {
      const id = this.queue.shift(), f = fileOf(id); this.active++;
      const t0 = performance.now();
      const p = fetch(new URL(f, this.base)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then(ab => { this.bytes += ab.byteLength; return new Promise((ok, ng) => { const q = ctx.decodeAudioData(ab, ok, ng); if (q && q.then) q.then(ok, ng); }); })
        .then(b => { const k = (MATERIALS[id] || {}).kind; if (k === 'amb' || (k === 'bgm' && MATERIALS[id].loop)) this.loops.set(id, loopFade(b, edgeTrim(b))); this.bufs.set(id, b); this.log.push({ id, f, at: Math.round(t0), ms: Math.round(performance.now() - t0), kind: (MATERIALS[id] || {}).kind }); if (this.onload) this.onload(id); return b; })
        .catch(e => { this.log.push({ id, f, err: String(e && e.message || e) }); return null; })
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
/** 継ぎ目を溶かす：区間 [a, z]（秒）の終わりの F 秒に頭の F 秒を重ねる（バッファを書き換える）。返り値：繰り返す区間 [a + F, z] */
export function loopFade(b, [a, z], F = 0.08) {
  const sr = b.sampleRate, A = Math.round(a * sr), Z = Math.round(z * sr), N = Math.min(Math.round(F * sr), (Z - A) >> 3);
  if (N < 8) return [a, z];
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < N; i++) { const w = (i + 1) / N, j = Z - N + i; d[j] = d[j] * Math.sqrt(1 - w) + d[A + i] * Math.sqrt(w); }
  }
  return [(A + N) / sr, z];
}
