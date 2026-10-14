// tobinezumi/server/tools/proto-client.mjs — PROTOCOL.md どおりに話す小さなクライアント（ボット・テスト用。DOM なし）
// Node 22 の組み込み WebSocket を使う（ws パッケージは要らない）。
import { stepField, makeFieldState, STEP_DT } from '../../shared/move.js';
import { buildFieldMap } from '../../shared/regions.js';
import { moveMods } from '../../shared/life.js';
import { envAt, fieldMods } from '../../shared/season.js';
import { makeClock } from '../../shared/daynight.js';

let MAP = null;
export const fieldMap = () => MAP || (MAP = buildFieldMap());

export class ProtoClient {
  constructor(url, { WS = globalThis.WebSocket, log = () => {} } = {}) {
    this.url = url; this.WS = WS; this.log = log;
    this.rid = 0; this.waiting = new Map(); this.handlers = new Map();
    this.seq = 0; this.st = null; this.world = null; this.lastSnap = null; this.snaps = 0;
    this.bytesIn = 0; this.msgsIn = 0;
    this.closed = false;
  }
  connect(timeoutMs = 5000) {
    return new Promise((res, rej) => {
      const ws = new this.WS(this.url);
      this.ws = ws;
      const t = setTimeout(() => { rej(new Error('connect timeout')); try { ws.close(); } catch (e) {} }, timeoutMs);
      ws.onopen = () => { clearTimeout(t); res(this); };
      ws.onerror = e => { clearTimeout(t); rej(new Error('ws error')); };
      ws.onclose = () => { this.closed = true; for (const [, w] of this.waiting) w({ ok: false, reason: 'closed' }); this.waiting.clear(); this._emit('close', {}); };
      ws.onmessage = ev => {
        this.bytesIn += ev.data.length; this.msgsIn++;
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'res') { const w = this.waiting.get(m.rid); if (w) { this.waiting.delete(m.rid); w(m); } return; }
        if (m.t === 'snapshot') { this.lastSnap = m; this.snaps++; }
        if (m.t === 'life') this.life = m.life;      // Ver.0.2：暮らしの数値（へとへとだと移動が変わる）
        if (m.t === 'welcome' || m.t === 'clock') { if (m.clock) this.clock = m.clock; if (m.serverTime) this.offset = m.serverTime - Date.now(); }
        if (m.t === 'caught') { this.st = makeFieldState(m.x, m.y); this.caught = (this.caught || 0) + 1; }   // Ver.0.3：つかまって安全な所へ
        this._emit(m.t, m);
      };
    });
  }
  on(t, fn) { if (!this.handlers.has(t)) this.handlers.set(t, []); this.handlers.get(t).push(fn); return this; }
  _emit(t, m) { for (const fn of this.handlers.get(t) || []) { try { fn(m); } catch (e) { this.log(e); } } }
  /** 次の t が来るまで待つ（pred で絞れる） */
  wait(t, pred = () => true, timeoutMs = 5000) {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { done = true; rej(new Error('wait timeout: ' + t)); }, timeoutMs);
      let done = false;
      this.on(t, m => { if (!done && pred(m)) { done = true; clearTimeout(timer); res(m); } });
    });
  }
  send(msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); }
  req(t, payload = {}, timeoutMs = 8000) {
    return new Promise(res => {
      const rid = ++this.rid;
      const timer = setTimeout(() => { this.waiting.delete(rid); res({ ok: false, reason: 'timeout' }); }, timeoutMs);
      this.waiting.set(rid, m => { clearTimeout(timer); res(m); });
      this.send({ t, rid, ...payload });
    });
  }
  close() { this.closed = true; try { this.ws.close(); } catch (e) {} }

  /** 登録（もういれば ログイン）→ キャラが無ければ作る → 地上へ */
  async enter(username, password, { name = username.slice(0, 10), fur = 'sand' } = {}) {
    let r = await this.req('hello', { v: 1 });
    r = await this.req('register', { username, password });
    if (!r.ok && r.code === 'taken') r = await this.req('login', { username, password });
    if (!r.ok) throw new Error('login: ' + r.reason);
    this.token = r.token; this.account = r.account;
    if (!r.character) { const c = await this.req('create_char', { name, fur }); if (!c.ok) throw new Error('create_char: ' + c.reason); }
    return this.join();
  }
  async join() {
    const j = await this.req('join_field');
    if (!j.ok) throw new Error('join_field: ' + j.reason);
    this.world = j.world;
    if (j.world.life) this.life = j.world.life;
    if (j.world.clock) this.clock = j.world.clock;
    this.st = makeFieldState(j.world.you.x, j.world.you.y);
    this.st.dir = j.world.you.dir;
    return j.world;
  }
  /** 入力を n 個まとめて送る（ローカルでも同じ規則で当てて、予測位置を持つ） */
  inputs(list) {
    const out = [];
    for (const i of list) {
      const inp = { seq: ++this.seq, mx: i.mx | 0, my: i.my | 0, jump: i.jump ? 1 : 0 };
      if (this.st) this.st = stepField(this.st, inp, STEP_DT, fieldMap(), fieldMods(moveMods(this.life), this.moveEnv()));
      out.push(inp);
    }
    for (let k = 0; k < out.length; k += 30) this.send({ t: 'input', inputs: out.slice(k, k + 30) });
    return this.st;
  }
  /** 移動に効く天気（砂嵐は遅い）。サーバーと同じ時計で（0.25 秒ごとに作りなおす） */
  moveEnv() {
    const t = Date.now() + (this.offset || 0);
    if (!this._env || t > this._envT) { this._envT = t + 250; this._env = envAt(this.clock || makeClock(), t, { enabled: !this.world || !this.world.danger || this.world.danger.env !== false }); }
    return this._env;
  }
  /** ack が seq に追いつくまで待つ */
  async synced(timeoutMs = 3000) {
    const target = this.seq;
    if (this.lastSnap && this.lastSnap.ack >= target) return this.lastSnap;
    return this.wait('snapshot', m => m.ack >= target, timeoutMs);
  }
}
