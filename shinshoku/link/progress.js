// 作品をまたぐ共通の進行ストア 'wakaba_progress_v1'（SAVE_DATA_SPEC §3・GAME_INTEGRATION_SPEC §4）。
// 本作が書けるのは games.shinshoku だけ。main・kyokai・tobi の欄は保存せず、読むたびにアダプタで作る（読み取り専用）。
import { mainAdapter, kyokaiAdapter, tobiAdapter } from './adapters.js';

export const WP_KEY = 'wakaba_progress_v1';
export const WP_VER = 1;
const OWN = 'shinshoku';

function emptyOwn() {
  return { ver: 1, endings: {}, chaptersCleared: [], routesCleared: [], achievements: {}, gallery: [], openingsSeen: [], bestiary: {}, bossLog: {}, docsRead: 0 };
}
export function migrateWP(raw) {
  let s = null;
  try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
  if (!s || typeof s !== 'object' || typeof s.games !== 'object' || !s.games) s = { ver: WP_VER, updatedAt: null, games: {} };
  if (typeof s.ver !== 'number') s.ver = WP_VER;
  return s;
}
function deepMerge(a, b) {
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], v);
    else a[k] = v;
  }
  return a;
}

export function createWP(ls) {
  const adapters = { main: mainAdapter(ls), kyokai: kyokaiAdapter(ls), tobi: tobiAdapter(ls) };
  const rawStored = () => { try { return ls.getItem(WP_KEY); } catch (e) { return null; } };
  return {
    adapters,
    /** 全体。他作品の欄はアダプタで毎回作る（readonly:true） */
    read() {
      const s = migrateWP(rawStored());
      const out = JSON.parse(JSON.stringify(s));
      out.games[OWN] = Object.assign(emptyOwn(), out.games[OWN] || {});
      const m = adapters.main, k = adapters.kyokai, t = adapters.tobi;
      out.games.main = { readonly: true, endings: m.endings(), whiteSeen: m.whiteSeen(), cleared: m.cleared() };
      out.games.kyokai = { readonly: true, endings: k.endings(), trueEnd: k.trueEnd(), flags: k.flags() };
      out.games.tobi = { readonly: true, offline: t.offline(), toyama: t.toyama(), crossover: t.crossover() };
      return out;
    },
    get(game, path) {
      let o = this.read().games[game];
      for (const p of String(path || '').split('.').filter(Boolean)) { if (o == null) return undefined; o = o[p]; }
      return o;
    },
    /** 自分の欄だけ書く。他の欄を渡すと例外 */
    write(game, patch) {
      if (game !== OWN) throw new Error('wakaba_progress_v1: shinshoku は games.' + game + ' に書けません');
      const s = migrateWP(rawStored());
      // 保存するのは本作の欄（と、他作品が将来自分で書いた欄はそのまま残す）
      const own = Object.assign(emptyOwn(), s.games[OWN] || {});
      deepMerge(own, patch || {});
      s.games[OWN] = own; s.ver = WP_VER; s.updatedAt = new Date().toISOString();
      try { ls.setItem(WP_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
    },
    /** 1 つ数を足す（図鑑） */
    bump(enemy, field) {
      const cur = (this.read().games[OWN].bestiary || {})[enemy] || { seen: true, rescued: 0, killed: 0 };
      cur.seen = true; cur[field] = (cur[field] || 0) + 1;
      return this.write(OWN, { bestiary: { [enemy]: cur } });
    },
    achieve(id) {
      const a = this.read().games[OWN].achievements || {};
      if (a[id]) return false;
      return this.write(OWN, { achievements: { [id]: new Date().toISOString() } });
    },
  };
}
