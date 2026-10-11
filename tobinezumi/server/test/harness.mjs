// テスト用の道具：ws を使わずに Game へ「偽の接続」をつなぐ（node:sqlite と共有ルールだけで動く）
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../db.js';
import { Auth } from '../auth.js';
import { Game } from '../game.js';
import { makeFieldState, STEP_DT, stepField } from '../../shared/move.js';
import { canDigBurrow, TILE } from '../../shared/regions.js';

let pass = 0, fail = 0;
export async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
export function done() { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

export function tempDir(prefix = 'tobi-test-') { return mkdtempSync(join(tmpdir(), prefix)); }
export function rmDir(d) { try { rmSync(d, { recursive: true, force: true }); } catch (e) {} }

/** 時計を手で進められる Game（ティックは自分で呼ぶ） */
export async function makeGame({ dir = tempDir(), clock = { t: 1_700_000_000_000 }, gameOpts = {}, authOpts = {} } = {}) {
  const now = () => clock.t;
  const store = await openDb(join(dir, 'game.db'), { log: () => {} });
  const auth = new Auth(store, { now, ...authOpts });
  const game = new Game({ store, auth, now, log: () => {}, ...gameOpts });
  return { dir, clock, now, store, auth, game, close() { game.stop(); store.close(); } };
}

export class FakeClient {
  constructor(game, ip = '127.0.0.1') {
    this.game = game; this.inbox = []; this.rid = 0; this.wait = new Map(); this.closed = false; this.seq = 0;
    this.conn = { ip, sendRaw: t => this._recv(JSON.parse(t)), close: () => { this.closed = true; this.s.onClose(); } };
    this.s = game.connect(this.conn);
  }
  _recv(m) {
    if (m.t === 'res' && this.wait.has(m.rid)) { const f = this.wait.get(m.rid); this.wait.delete(m.rid); f(m); return; }
    this.inbox.push(m);
  }
  send(m) { this.s.onMessage(JSON.stringify(m)); }
  req(t, p = {}) { return new Promise(res => { const rid = ++this.rid; this.wait.set(rid, res); this.send({ t, rid, ...p }); }); }
  take(t) { const out = this.inbox.filter(m => m.t === t); this.inbox = this.inbox.filter(m => m.t !== t); return out; }
  last(t) { const a = this.inbox.filter(m => m.t === t); return a[a.length - 1] || null; }
  async enter(user, pass = 'password123', name = user.slice(0, 10), fur = 'sand') {
    let r = await this.req('register', { username: user, password: pass });
    if (!r.ok) r = await this.req('login', { username: user, password: pass });
    if (!r.ok) throw new Error(r.reason);
    this.token = r.token; this.account = r.account;
    if (!r.character) { const c = await this.req('create_char', { name, fur }); if (!c.ok) throw new Error(c.reason); }
    const j = await this.req('join_field');
    if (!j.ok) throw new Error(j.reason);
    this.world = j.world;
    return j.world;
  }
  get player() { return this.game.players.get(this.account.id); }
  /** サーバーの確定位置を直接置く（テスト用：歩かせる代わり） */
  place(x, y) { const p = this.player; p.st = makeFieldState(x, y); p.inbox = []; return p; }
  inputs(list) { const out = list.map(i => ({ seq: ++this.seq, mx: i.mx | 0, my: i.my | 0, jump: i.jump ? 1 : 0 })); for (let k = 0; k < out.length; k += 30) this.send({ t: 'input', inputs: out.slice(k, k + 30) }); return out; }
  close() { this.conn.close(); }
}

/** 掘れる場所を探す（出発点から離れた所） */
export function findDigSpot(map, entrances = [], skip = 0) {
  for (let ty = 6; ty < map.h - 6; ty++) for (let tx = 6; tx < map.w - 6; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160) continue;
    if (canDigBurrow(map, x, y, entrances).ok) { if (skip-- > 0) continue; return { x, y }; }
  }
  throw new Error('掘れる場所が無い');
}
export { makeFieldState, STEP_DT, stepField };
