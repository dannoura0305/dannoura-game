// 他作品のセーブを「読むだけ」のアダプタ（CROSS_GAME_LINK_SPEC §2）。
// どのキーも書かない。無い・壊れている・古い形でも例外を出さず「無い」を返す。結果は毎回作る（保存しない）。
const MAIN_ENDINGS = ['rebirth', 'king', 'engineer', 'father', 'debtfree', 'normal', 'collapse', 'bankrupt', 'flame'];   // game.js ENDING_LIST と同じ ID
const KYOKAI_FLAGS_ALLOWED = ['b30_read', 'shiro_met', 'd8_bureau'];
const TOBI_CROSSOVER = ['dragons_card', 'machine_part', 'charm', 'black_feather', 'odd_crystal', 'unknown_card'];

function readJSON(ls, k) { try { const v = ls.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
function readStr(ls, k) { try { return ls.getItem(k); } catch (e) { return null; } }

export function mainAdapter(ls) {
  return {
    endings() {
      const seen = readJSON(ls, 'dannoura_endings');
      if (!seen || typeof seen !== 'object') return [];
      return MAIN_ENDINGS.filter(id => seen[id]);
    },
    cleared() { return this.endings().length > 0; },
    whiteSeen() {
      for (const k of ['dannoura_save_slot1', 'dannoura_save_slot2', 'dannoura_save_slot3', 'dannoura_save_v1']) {
        const s = readJSON(ls, k);
        try { if (s && s.story && s.story.flags && s.story.flags.white_seen) return true; } catch (e) { /* 古い形 */ }
        try { if (s && s.flags && s.flags.white_seen) return true; } catch (e) { /* 古い形 */ }
      }
      return false;
    },
  };
}
export function kyokaiAdapter(ls) {
  return {
    endings() { const e = readJSON(ls, 'kyokai_endings'); return Array.isArray(e) ? e.filter(x => typeof x === 'string') : []; },
    trueEnd() { return readStr(ls, 'kyokai_true_end') === '1'; },
    flags() {
      const s = readJSON(ls, 'kyokai_save_v1'); const o = {};
      const f = s && s.flags && typeof s.flags === 'object' ? s.flags : {};
      for (const k of KYOKAI_FLAGS_ALLOWED) if (f[k]) o[k] = true;
      return o;
    },
  };
}
export function tobiAdapter(ls) {
  return {
    offline() { return !!readJSON(ls, 'tobi_save_v1'); },
    toyama() { const s = readJSON(ls, 'tobi_save_v1'); return !!(s && (s.toyama || (s.achievements && s.achievements.toyama))); },
    crossover() {
      const s = readJSON(ls, 'tobi_save_v1'); const c = s && s.collection;
      if (!c) return [];
      const has = id => Array.isArray(c) ? c.includes(id) : !!c[id];
      return TOBI_CROSSOVER.filter(has);
    },
  };
}
