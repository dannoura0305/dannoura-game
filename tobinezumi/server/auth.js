// tobinezumi/server/auth.js — パスワード（scrypt）・セッショントークン・ログイン試行の制限
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

export const SESSION_DAYS = 30;
const N = 16384, R = 8, PP = 1, KEYLEN = 64;

function scryptAsync(pw, salt, n, r, p) {
  return new Promise((res, rej) => scrypt(pw, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k)));
}

/** 'scrypt$N$r$p$salt$hash'（どちらも base64） */
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(pw).normalize('NFKC'), salt, N, R, PP);
  return `scrypt$${N}$${R}$${PP}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  try {
    const [alg, n, r, p, salt, hash] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const want = Buffer.from(hash, 'base64');
    const got = await scryptAsync(String(pw).normalize('NFKC'), Buffer.from(salt, 'base64'), +n, +r, +p);
    return got.length === want.length && timingSafeEqual(got, want);
  } catch (e) { return false; }
}
/** パスワードが合わないときも同じくらい時間をかける（ユーザー名の有無を時間で当てられないように） */
let DUMMY = null;
export async function dummyVerify(pw) { if (!DUMMY) DUMMY = await hashPassword('dummy-password'); await verifyPassword(pw, DUMMY); return false; }

export function newToken() { return randomBytes(32).toString('base64url'); }
export function tokenHash(token) { return createHash('sha256').update(String(token)).digest('hex'); }

/** 窓 windowMs のあいだ max 回まで（キーごと）。fail() で数え、ok() で消す */
export class RateLimiter {
  constructor({ max = 5, windowMs = 5 * 60 * 1000, now = () => Date.now() } = {}) { this.max = max; this.windowMs = windowMs; this.now = now; this.m = new Map(); }
  _list(key) {
    const t = this.now();
    const a = (this.m.get(key) || []).filter(x => t - x < this.windowMs);
    if (a.length) this.m.set(key, a); else this.m.delete(key);
    return a;
  }
  blocked(key) { return this._list(key).length >= this.max; }
  hit(key) { const a = this._list(key); a.push(this.now()); this.m.set(key, a); return a.length; }
  clear(key) { this.m.delete(key); }
  /** あと何ミリ秒で解除されるか */
  retryAfter(key) { const a = this._list(key); return a.length < this.max ? 0 : Math.max(0, this.windowMs - (this.now() - a[0])); }
  sweep() { for (const k of [...this.m.keys()]) this._list(k); }
}

export class Auth {
  constructor(store, { now = () => Date.now(), loginMax = 5, loginWindowMs = 5 * 60 * 1000, registerMax = 20, registerWindowMs = 10 * 60 * 1000, sessionDays = SESSION_DAYS } = {}) {
    this.store = store; this.now = now;
    this.loginFails = new RateLimiter({ max: loginMax, windowMs: loginWindowMs, now });          // ユーザー名ごと
    this.ipFails = new RateLimiter({ max: loginMax * 4, windowMs: loginWindowMs, now });        // 接続元ごと（総当たり対策）
    this.registers = new RateLimiter({ max: registerMax, windowMs: registerWindowMs, now });
    this.sessionMs = sessionDays * 86400000;
  }
  issue(accountId) {
    const token = newToken();
    this.store.createSession(tokenHash(token), accountId, this.now() + this.sessionMs, this.now());
    return token;
  }
  /** token → アカウント（期限切れ・無効は null） */
  check(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
    const s = this.store.session(tokenHash(token));
    if (!s) return null;
    if (s.expires_at < this.now()) { this.store.deleteSession(tokenHash(token)); return null; }
    return this.store.account(s.account_id);
  }
  revoke(token) { if (typeof token === 'string') this.store.deleteSession(tokenHash(token)); }

  /** {ok, account, token} / {ok:false, code, reason} */
  async register(username, password, ip = '?') {
    if (this.registers.blocked('ip:' + ip)) return { ok: false, code: 'rate', reason: '登録が多すぎる。しばらく待ってね' };
    if (this.store.accountByName(username)) return { ok: false, code: 'taken', reason: 'そのユーザー名は使われている' };
    const hash = await hashPassword(password);
    if (this.store.accountByName(username)) return { ok: false, code: 'taken', reason: 'そのユーザー名は使われている' };   // 待っている間に取られた
    this.registers.hit('ip:' + ip);
    const id = this.store.createAccount(username, hash, this.now());
    this.store.touchLogin(id, this.now());
    return { ok: true, account: this.store.account(id), token: this.issue(id) };
  }
  async login(username, password, ip = '?') {
    const ku = 'u:' + String(username).toLowerCase(), ki = 'ip:' + ip;
    if (this.loginFails.blocked(ku) || this.ipFails.blocked(ki)) {
      const s = Math.ceil(Math.max(this.loginFails.retryAfter(ku), this.ipFails.retryAfter(ki)) / 1000);
      return { ok: false, code: 'rate', reason: `ログインの失敗が多すぎる。${s} 秒ほど待ってね` };
    }
    const acc = this.store.accountByName(username);
    const ok = acc ? await verifyPassword(password, acc.pass_hash) : await dummyVerify(password);
    if (!ok) { this.loginFails.hit(ku); this.ipFails.hit(ki); return { ok: false, code: 'auth', reason: 'ユーザー名かパスワードが違う' }; }
    this.loginFails.clear(ku);
    this.store.touchLogin(acc.id, this.now());
    return { ok: true, account: acc, token: this.issue(acc.id) };
  }
}
