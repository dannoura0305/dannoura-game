// tobinezumi/client/music.js — 曲（2026-11-14）。CC0 の曲（soundbank.js が後から読む）を、場面に合わせて小さく流す。
// ・野原では、入ってしばらくしてから 1 曲（短い曲は 2 分半ほど繰り返して）流し、フェードで終えて 1〜2 分半ほど休む。ずっと鳴り続けない（長く遊んでも疲れない）。
// ・タイトルは静かな曲を続けて流す。巣の中は子守歌を 2 分ほど流して少し休む。富山と砂嵐の間は流さない（sound-data.js の bgmPick）。
// ・捕食者に狙われている間は曲を下げる（緊張は予告の音と間で伝え、こわい曲は流さない）。
// ・曲が読めていない時は、読むのを頼んで待つ（無音のまま。合成の曲は作らない）。大きさは設定「音楽」に従う。
import { audioCtx, audioRunning, bus, installAudioUnlock, setBusVolume } from './audio-core.js';
import { bgmPick, BGM_PLAN, BGM_LEVEL, MATERIALS } from './sound-data.js';

const rnd = ([a, b]) => a + Math.random() * (b - a);

export class Music {
  constructor(volume = 0.5) {
    this.bank = null; this.cur = null; this.scene = null; this.wait = 0; this.n = 0; this.duckK = 1;
    this.debug = { id: null, state: 'idle', log: [] };
    installAudioUnlock();
    this.setVolume(volume);
  }
  setBank(b) { this.bank = b; }
  /** 設定の「音楽」（0〜1。ふつう 0.5） */
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); setBusVolume('music', this.volume * 2 * BGM_LEVEL); }
  _stop(fade = BGM_PLAN.fade) {
    const c = this.cur; if (!c) return; this.cur = null;
    const ctx = audioCtx(), t = ctx.currentTime;
    try { c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0.0001, t + fade); c.src.stop(t + fade + 0.05); } catch (e) {}
    this.debug.state = 'fade';
  }
  _play(id, endless) {
    const ctx = audioCtx(), b = this.bank.buf(id), m = MATERIALS[id];
    const src = ctx.createBufferSource(), g = ctx.createGain(), duck = ctx.createGain();
    src.buffer = b; src.loop = !!m.loop; if (m.loop) this.bank.setLoop(src, id);
    g.gain.value = 0.0001; duck.gain.value = this.duckK;
    src.connect(g); g.connect(duck); duck.connect(bus('music'));
    const t = ctx.currentTime + 0.05, F = 2.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + F);
    src.start(t);
    // 長さ：繰り返す曲は maxPlay まで（1 周より短くはしない）。巣・タイトルは止めない
    let len = null;
    if (!endless) {
      len = m.loop ? Math.max(b.duration, Math.floor(BGM_PLAN.maxPlay / b.duration) * b.duration) : b.duration;
      const end = t + len;
      g.gain.setValueAtTime(1, Math.max(t + F, end - BGM_PLAN.fade)); g.gain.linearRampToValueAtTime(0.0001, end);
      src.stop(end + 0.05);
    }
    this.cur = { id, src, g, duck, until: len == null ? Infinity : performance.now() / 1000 + len };
    this.n++;
    this.debug.id = id; this.debug.state = 'play'; this.debug.log.push({ id, at: Math.round(performance.now()), len: len && Math.round(len) });
    if (this.debug.log.length > 20) this.debug.log.shift();
  }
  /** 毎フレーム。c = { scene: 'title'|'field'|'nest'|'other', region, period, season, weather, fest, threat } */
  update(dt, c) {
    if (!audioRunning() || !this.bank) return;
    const ctx = audioCtx();
    // 狙われている間は下げる（戻すのはゆっくり）
    const dk = c.threat ? BGM_PLAN.duck : 1;
    if (dk !== this.duckK) { this.duckK = dk; if (this.cur) this.cur.duck.gain.setTargetAtTime(dk, ctx.currentTime, dk < 1 ? 0.25 : 1.5); }
    if (c.scene !== this.scene) {
      const prev = this.scene; this.scene = c.scene;
      const keep = this.cur && bgmPick({ ...c, n: this.n - 1 }) === this.cur.id;
      if (!keep) { this._stop(prev === 'title' ? 1.2 : BGM_PLAN.fade); this.wait = rnd(BGM_PLAN.firstWait[c.scene] || [3, 6]); }
    }
    const want = bgmPick({ ...c, n: this.n });
    if (this.cur) {
      // 流さない場面になった（富山・砂嵐・他の画面）、または巣とタイトルで曲が変わった → フェードで終える
      if (!bgmPick({ ...c, n: this.n - 1 }) || (this.cur.until === Infinity && want !== this.cur.id)) { this._stop(); this.wait = 4; }
      else if (performance.now() / 1000 >= this.cur.until) { this.cur = null; this.debug.state = 'rest'; this.wait = c.scene in BGM_PLAN.restIn ? BGM_PLAN.restIn[c.scene] : rnd(BGM_PLAN.rest); }
      return;
    }
    this.wait -= dt;
    if (this.wait > 0 || !want || this.volume <= 0) return;
    if (!this.bank.has(want)) { this.bank.want([want], true); this.wait = 1; this.debug.state = 'loading'; return; }
    this._play(want, c.scene === 'title');
  }
}
