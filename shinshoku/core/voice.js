// 演出の台詞の声（VOICEVOX で作った音声ファイル・tools/voice/ で再生成）。字幕は今のまま必ず出す。声は足すだけ。
// ・起動時には何も読まない。対応表（assets/voice/manifest.json：小さい）は遊びが始まってから後で読み、
//   音声は演出を再生する直前に、その演出の分だけ読む（先に読んだ物は覚えておく）。
// ・行と音声の対応は「場面 id ＋行の番号」と「話し手と文のハッシュ」。文が変わったら古い音声は使わない（ハッシュが合わない）。
// ・純粋関数（voiceHash・voiceText・voiceKey・voiceLensFor）は node でテストする。

/** 話し手と文のハッシュ（FNV-1a 32bit・8 桁の 16 進）。生成の道具（tools/voice/gen.mjs）と同じ物 */
export function voiceHash(who, text) {
  let h = 0x811c9dc5; const s = String(who) + '|' + String(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const voiceKey = (csId, i) => csId + '#' + i;
/** 声の要らない話し手（地の文・ト書き） */
export const NO_VOICE_WHO = new Set(['sys']);
/**
 * 読み上げる文（字幕の文から作る）。声が無い行は ''。
 *  ・全体が（ ）のト書き（「（悲鳴）」「（……戻らなきゃ）」）・「……」だけの行は声なし
 *  ・頭の（放送）（電話）（向こう側から）等は読まない。「 」の括弧は外す
 */
export function voiceText(who, text) {
  if (NO_VOICE_WHO.has(who)) return '';
  let s = String(text || '').trim();
  if (/^（[^（）]*）$/.test(s)) return '';
  s = s.replace(/^(（[^（）]*）\s*)+/, '').replace(/[「」『』]/g, '').trim();
  if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9ー]/u.test(s)) return '';
  return s;
}
/** その場面の各行の声の長さ（秒・声の無い行は 0）。man = 対応表。ハッシュの合わない行は 0 */
export function voiceLensFor(cs, man) {
  return (cs.lines || []).map((l, i) => { const e = man && man.lines && man.lines[voiceKey(cs.id, i)]; return e && e.h === voiceHash(l.who, l.text) ? e.d : 0; });
}

/** 再生する人（ブラウザ）。sfx = core/audio.js の Sfx（同じ AudioContext を使う・遷移の沈みと揃える） */
export class Voice {
  constructor(sfx, base) {
    this.sfx = sfx; this.base = base; this.man = null; this.bufs = new Map(); this.loading = new Map();
    this.on = true; this.vol = 0.9; this.master = 0.7; this.cur = null; this.log = [];
  }
  /** 対応表を読む（遊びが始まってから後で・一度だけ） */
  loadManifest() {
    if (this.manP) return this.manP;
    this.manP = fetch(new URL('manifest.json', this.base)).then(r => (r.ok ? r.json() : null)).then(m => { this.man = m; return m; }).catch(() => null);
    return this.manP;
  }
  setOn(on) { this.on = !!on; if (!on) this.stop(); }
  setVolume(v) { this.vol = +v; this._gain(); }
  setMaster(v) { this.master = +v; this._gain(); }
  _gain() { if (this.out) this.out.gain.value = this.vol * this.master; }
  _ensure() {
    const s = this.sfx; if (!s || !s.ctx) return null;
    if (!this.out) { this.out = s.ctx.createGain(); this.out.connect(s.voiceBus || s.ctx.destination); this._gain(); }
    return s.ctx;
  }
  lensFor(cs) { return this.man ? voiceLensFor(cs, this.man) : null; }
  /** その演出の分の音声を読む（先読み可）。結果は覚えておく */
  preload(cs) {
    if (!this.on || !this.man || !cs) return;
    (cs.lines || []).forEach((l, i) => {
      const e = this.man.lines[voiceKey(cs.id, i)]; if (!e || e.h !== voiceHash(l.who, l.text)) return;
      if (this.bufs.has(e.f) || this.loading.has(e.f)) return;
      const ctx = this._ensure(); if (!ctx) return;
      const p = fetch(new URL(e.f, this.base)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then(ab => new Promise((ok, ng) => { const q = ctx.decodeAudioData(ab, ok, ng); if (q && q.then) q.then(ok, ng); }))
        .then(b => { this.bufs.set(e.f, b); this.loading.delete(e.f); return b; })
        .catch(() => { this.loading.delete(e.f); return null; });
      this.loading.set(e.f, p);
    });
  }
  /** 行が出た時に鳴らす（L = 行・i = 行の番号）。読めていなければ、読めた時にまだその行が出ていれば鳴らす */
  line(cs, i, L) {
    this.stop();
    if (!this.on || !this.man || !cs || !L) return;
    const e = this.man.lines[voiceKey(cs.id, i)]; if (!e || e.h !== voiceHash(L.who, L.text)) return;
    const tok = this.tok = {}, start = () => {
      if (this.tok !== tok) return;
      const b = this.bufs.get(e.f), ctx = this._ensure(); if (!b || !ctx) return;
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; src.connect(g); g.connect(this.out);
      src.start(); this.cur = { src, g, key: voiceKey(cs.id, i) }; src.onended = () => { if (this.cur && this.cur.src === src) this.cur = null; };
      this._log({ key: voiceKey(cs.id, i), at: performance.now(), d: b.duration });
    };
    if (this.bufs.has(e.f)) start();
    else { this.preload(cs); const p = this.loading.get(e.f); if (p) { const t0 = performance.now(); p.then(() => { if (performance.now() - t0 < 400) start(); }); } }
  }
  /** 止める（行が替わる・飛ばし・演出の終わり）。ぷつっと切れないよう少しだけ絞る */
  stop() {
    this.tok = null; const c = this.cur; this.cur = null; if (!c) return;
    try { const t = c.src.context.currentTime; c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0, t + 0.06); c.src.stop(t + 0.07); } catch (e) { /* 止まっている */ }
    this._log({ stop: c.key, at: performance.now() });
  }
  _log(e) { this.log.push(e); if (this.log.length > 200) this.log.splice(0, this.log.length - 200); }   // 再生の記録（確かめる用・新しい 200 件）
  get playing() { return !!this.cur; }
}
