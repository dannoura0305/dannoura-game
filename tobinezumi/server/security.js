// tobinezumi/server/security.js — Ver.0.6「公開準備」：WebSocket の入口の守り（ws に依存しない・テストしやすい形）。
//
//  ・Origin の確認（TOBI_ORIGIN：カンマ区切りの許可リスト）。ブラウザは WebSocket の接続に Origin を必ず付けるので、
//    よそのサイトに埋め込まれたページから、遊んでいる子のログイン（localStorage のトークン）でつながれるのを防ぐ。
//    ・リストが空 → だれでも（ローカル開発）。サーバー自身が配ったページ（Origin のホスト＝Host）はいつでも通す。
//    ・Origin が無い接続（ボット・道具）は通す。TOBI_ORIGIN_STRICT=1 なら断る。
//    ・'https://*.github.io' のような 1 段のワイルドカードも書ける（自分のページだけにするなら完全な URL で）。
//  ・接続元（IP）ごとの上限：同時接続 TOBI_MAX_CONN_PER_IP（6）・新しい接続 TOBI_CONN_PER_MIN（30/分）・
//    メッセージ TOBI_MSG_PER_IP（300/秒：同じ IP のすべての接続の合計。1 接続ごとの 150/秒は game.js）。0 で切る。
//    本番では既定で入る。ローカル（ボットの試験など同じ IP から何十もつなぐ）では書かなければ切ってある（securityFromEnv）。
//  ・接続元の IP：TOBI_TRUST_PROXY=1 のときだけ Fly-Client-IP / X-Forwarded-For（いちばん左）を信じる（Fly.io・Render の前段）。
export const LIMITS = { CONN_PER_IP: 6, CONN_PER_MIN: 30, MSG_PER_IP_SEC: 300, MAX_PAYLOAD: 16 * 1024 };

/** 'https://a.example, https://*.github.io' → ['https://a.example', 'https://*.github.io']（末尾の / は落とす） */
export function parseOrigins(s) {
  return String(s || '').split(/[,\s]+/).map(x => x.trim().replace(/\/+$/, '').toLowerCase()).filter(Boolean);
}
function matchOrigin(origin, pat) {
  if (pat === '*') return true;
  if (!pat.includes('*')) return origin === pat;
  const m = /^([a-z]+:\/\/)\*\.(.+)$/.exec(pat);
  if (!m) return false;
  if (!origin.startsWith(m[1])) return false;
  const host = origin.slice(m[1].length);
  return host.endsWith('.' + m[2]) && !host.slice(0, -(m[2].length + 1)).includes('.');
}
/**
 * その Origin から WebSocket をつないでよいか。
 * @param {string|undefined} origin  リクエストの Origin
 * @param {string|undefined} host    リクエストの Host（サーバー自身が配ったページか）
 * @param {string[]} allow           parseOrigins の結果（空ならだれでも）
 * @returns {{ok:boolean, reason?:string}}
 */
export function checkOrigin(origin, host, allow = [], { strict = false } = {}) {
  if (!origin) return strict ? { ok: false, reason: 'no-origin' } : { ok: true };
  const o = String(origin).trim().replace(/\/+$/, '').toLowerCase();
  if (o === 'null') return { ok: false, reason: 'null-origin' };
  if (!allow.length) return { ok: true };
  try { if (host && new URL(o).host === String(host).toLowerCase()) return { ok: true }; } catch (e) { return { ok: false, reason: 'bad-origin' }; }
  return allow.some(p => matchOrigin(o, p)) ? { ok: true } : { ok: false, reason: 'origin' };
}

/** 接続元の IP（プロキシの後ろでは TOBI_TRUST_PROXY=1 のときだけ前段のヘッダーを使う） */
export function clientIp(req, trustProxy = false) {
  const h = req.headers || {};
  if (trustProxy) {
    const fly = h['fly-client-ip'];
    if (fly) return String(fly).trim();
    const xf = h['x-forwarded-for'];
    if (xf) return String(xf).split(',')[0].trim();
  }
  return String((req.socket && req.socket.remoteAddress) || '?').replace(/^::ffff:/, '');
}

/** IP ごとの同時接続・接続の速さ・メッセージの速さ */
export class IpLimiter {
  constructor({ connPerIp = LIMITS.CONN_PER_IP, connPerMin = LIMITS.CONN_PER_MIN, msgPerSec = LIMITS.MSG_PER_IP_SEC } = {}) {
    this.connPerIp = connPerIp; this.connPerMin = connPerMin; this.msgPerSec = msgPerSec;
    this.ips = new Map();      // ip → {open, joins:[t], tokens, at}
  }
  _get(ip) { let r = this.ips.get(ip); if (!r) { r = { open: 0, joins: [], tokens: this.msgPerSec, at: 0 }; this.ips.set(ip, r); } return r; }
  /** 新しい接続：よければ open を 1 増やして ok */
  tryConnect(ip, now = Date.now()) {
    const r = this._get(ip);
    r.joins = r.joins.filter(t => now - t < 60000);
    if (this.connPerIp > 0 && r.open >= this.connPerIp) return { ok: false, reason: 'too-many-connections' };
    if (this.connPerMin > 0 && r.joins.length >= this.connPerMin) return { ok: false, reason: 'too-many-attempts' };
    r.open++; r.joins.push(now);
    return { ok: true };
  }
  release(ip) { const r = this.ips.get(ip); if (!r) return; r.open = Math.max(0, r.open - 1); if (!r.open && !r.joins.length) this.ips.delete(ip); }
  /** メッセージ 1 通（トークンバケツ：1 秒で msgPerSec 回復・最大 msgPerSec） */
  tryMessage(ip, now = Date.now()) {
    if (!(this.msgPerSec > 0)) return true;
    const r = this._get(ip);
    r.tokens = Math.min(this.msgPerSec, r.tokens + (r.at ? (now - r.at) / 1000 * this.msgPerSec : this.msgPerSec));
    r.at = now;
    if (r.tokens < 1) return false;
    r.tokens -= 1;
    return true;
  }
  /** 古い記録を捨てる（1 分ごと） */
  sweep(now = Date.now()) { for (const [ip, r] of this.ips) { r.joins = r.joins.filter(t => now - t < 60000); if (!r.open && !r.joins.length) this.ips.delete(ip); } }
  stats() { let open = 0; for (const r of this.ips.values()) open += r.open; return { ips: this.ips.size, open }; }
}

/**
 * 環境変数 → startServer の設定（index.js と DEPLOY.md の説明が同じになるように 1 か所で）。
 * 接続元ごとの上限は、本番（NODE_ENV=production / TOBI_PUBLIC=1）では LIMITS が既定。ローカル（npm start・ボット 20 体の試験）では
 * 書かなければ切ってある（0）。どちらでも環境変数で決められる。
 */
export function securityFromEnv(env = process.env) {
  const prod = env.NODE_ENV === 'production' || env.TOBI_PUBLIC === '1';
  const n = (k, d) => (env[k] != null && env[k] !== '' && Number.isFinite(Number(env[k])) ? Number(env[k]) : prod ? d : (k === 'TOBI_MAX_PAYLOAD' ? d : 0));
  return {
    origins: parseOrigins(env.TOBI_ORIGIN),
    originStrict: env.TOBI_ORIGIN_STRICT === '1',
    trustProxy: env.TOBI_TRUST_PROXY === '1',
    connPerIp: n('TOBI_MAX_CONN_PER_IP', LIMITS.CONN_PER_IP),
    connPerMin: n('TOBI_CONN_PER_MIN', LIMITS.CONN_PER_MIN),
    msgPerIp: n('TOBI_MSG_PER_IP', LIMITS.MSG_PER_IP_SEC),
    maxPayload: n('TOBI_MAX_PAYLOAD', LIMITS.MAX_PAYLOAD),
  };
}
/**
 * 本番（NODE_ENV=production か TOBI_PUBLIC=1）の設定の確かめ。errors があれば起動しない（index.js）、warnings はログに出す。
 */
export function productionCheck(env = process.env) {
  const prod = env.NODE_ENV === 'production' || env.TOBI_PUBLIC === '1';
  const errors = [], warnings = [];
  if (!prod) return { prod, errors, warnings };
  if (env.TOBI_DEV === '1') errors.push('TOBI_DEV=1（開発用の dev コマンド・早回し）は公開サーバーでは使えません。消してから起動してください');
  if (!parseOrigins(env.TOBI_ORIGIN).length) warnings.push('TOBI_ORIGIN（つないでよいページの URL）が空です。サーバー自身が配るページ以外からも つながります（例：TOBI_ORIGIN=https://<ユーザー名>.github.io）');
  if (env.TOBI_TRUST_PROXY !== '1') warnings.push('TOBI_TRUST_PROXY が 1 ではありません。Fly.io・Render の後ろでは 1 にすると、接続元ごとの上限が正しく効きます');
  return { prod, errors, warnings };
}
