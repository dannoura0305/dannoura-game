// 本作のセーブ（SAVE_DATA_SPEC §1・§2・§5・§6）。DOM なし：storage（localStorage と同じ形）を渡す。
// 書くのは 'shinshoku_save_v1' と 'shinshoku_settings' だけ（壊れた JSON の退避 'shinshoku_save_v1.broken.<日時>' を除く）。
export const SAVE_KEY = 'shinshoku_save_v1';
export const SETTINGS_KEY = 'shinshoku_settings';
export const SAVE_VER = 1;
export const GAME_VER = '0.4.0';
export const SLOT_NAMES = ['auto', 'slot1', 'slot2', 'slot3', 'branch', 'tenki'];   // tenki：第3章の転機（構えの選択）の前（上書きできる）

// 版の移行（1 つずつ上げる）。知らない項目は残す。
export const STEPS = {
  1: s => s,
};

export function emptySave() {
  return { ver: SAVE_VER, gameVer: GAME_VER, slots: { auto: null, slot1: null, slot2: null, slot3: null, branch: null, tenki: null } };
}

/**
 * 文字列（または null）を読み、最新の形にする。
 * 戻り値 { ok, save, status }：status = 'empty'|'ok'|'migrated'|'broken'|'newer'
 */
export function migrate(raw) {
  if (raw == null || raw === '') return { ok: true, save: emptySave(), status: 'empty' };
  let s;
  try { s = JSON.parse(raw); } catch (e) { return { ok: false, save: emptySave(), status: 'broken' }; }
  if (!s || typeof s !== 'object' || typeof s.ver !== 'number' || !s.slots || typeof s.slots !== 'object') return { ok: false, save: emptySave(), status: 'broken' };
  if (s.ver > SAVE_VER) return { ok: false, save: s, status: 'newer' };
  let changed = false;
  while (s.ver < SAVE_VER) {
    const step = STEPS[s.ver + 1];
    if (!step) return { ok: false, save: emptySave(), status: 'broken' };
    s = step(s); s.ver++; changed = true;
  }
  for (const k of SLOT_NAMES) if (!(k in s.slots)) s.slots[k] = null;
  return { ok: true, save: s, status: changed ? 'migrated' : 'ok' };
}

/** 1 枠の形（SAVE_DATA_SPEC §2 の項目のうち、フェーズ2で使う物＋将来の欄） */
export function makeSlot(st) {
  return {
    savedAt: st.savedAt || new Date().toISOString(),
    playSec: Math.round(st.playSec || 0),
    place: { area: st.area || 'shotengai', state: 'outbreak', spawn: st.spawn || null, pos: st.pos || [0, 0, 0], yaw: st.yaw || 0 },
    difficulty: st.difficulty || 'normal',
    story: Object.assign({
      chapter: 'slice', step: 'free', route: null, routeLock: null, stance: null,
      reveal: { companionKnows: false, firstWhiteAt: null }, forms: { whiteFree: false, whiteUnlocked: false, giantSeen: false },
      flags: {}, trust: { companion: 50 }, resolutions: {}, docs: [], subquests: {}, bosses: {}, yokaiLog: [], branchLog: [],
    }, st.story || {}),
    player: Object.assign({
      hp: 100, hpMax: 100, yoki: 0,
      weapons: { pipe: null, katana: { lv: 1 }, handgun: { lv: 1, mag: 12 }, matchlock: null },
      ammo: { handgun: 24 }, equipSlot: ['katana', 'handgun'], equipped: 'katana',
      items: [], storage: { home: [], office: [] }, skills: [], skillPts: 0,
    }, st.player || {}),
    world: Object.assign({ areas: {}, enemies: {} }, st.world || {}),
    seed: st.seed || 1,
  };
}

export class SaveStore {
  constructor(storage) { this.ls = storage; this.lastError = null; this.status = null; }
  _get(k) { try { return this.ls.getItem(k); } catch (e) { return null; } }
  read() {
    const raw = this._get(SAVE_KEY);
    const r = migrate(raw);
    this.status = r.status;
    if (r.status === 'broken' && raw) {
      // 黙って消さない：退避してから新しく始める
      try { this.ls.setItem(SAVE_KEY + '.broken.' + new Date().toISOString().replace(/[:.]/g, '-'), raw); } catch (e) { /* 容量超過など */ }
    }
    return r;
  }
  load(slot) { const r = this.read(); return r.ok ? (r.save.slots[slot] || null) : null; }
  write(slot, data) {
    if (!SLOT_NAMES.includes(slot)) throw new Error('unknown slot ' + slot);
    if (slot === 'branch' && this.load('branch')) { this.lastError = 'branch_locked'; return false; }
    const r = this.read();
    if (r.status === 'newer') { this.lastError = 'newer'; return false; }
    const s = r.save; s.slots[slot] = data; s.gameVer = GAME_VER;
    let json;
    try { json = JSON.stringify(s); } catch (e) { this.lastError = 'stringify'; return false; }
    try { this.ls.setItem(SAVE_KEY, json); } catch (e) { this.lastError = 'quota'; return false; }
    // 書けたことを確かめる
    if (this._get(SAVE_KEY) !== json) { this.lastError = 'verify'; return false; }
    this.lastError = null; return true;
  }
  remove(slot) { const r = this.read(); if (!r.ok) return false; r.save.slots[slot] = null; try { this.ls.setItem(SAVE_KEY, JSON.stringify(r.save)); return true; } catch (e) { return false; } }
  list() { const r = this.read(); const o = {}; for (const k of SLOT_NAMES) { const v = r.save && r.save.slots ? r.save.slots[k] : null; o[k] = v ? { savedAt: v.savedAt, playSec: v.playSec, area: v.place && v.place.area } : null; } return o; }
  readSettings() { try { return JSON.parse(this._get(SETTINGS_KEY) || 'null') || null; } catch (e) { return null; } }
  writeSettings(s) { try { this.ls.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
}
