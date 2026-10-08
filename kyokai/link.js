/* ══════════════════════════════════════════════════════════
   kyokai/link.js — 本編『だんのうら』のデータを「読むだけ」で参照する（担当D）
   ・本編の localStorage キー（dannoura_*）には一切書き込まない。
   ・壊れたJSON・古い形式・型違い・ストレージ不可でも例外を出さず null / 空で返す。
   ・window.KY_LINK = { hasMain, endings, best, b30, cleared, seen, summary, make }
   ・テスト用に KY_LINK.make(fakeStorage) で同じAPIを別ストレージから作れる。
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TYPES = ['collapse', 'bankrupt', 'flame', 'debtfree', 'engineer', 'father', 'king', 'rebirth', 'normal'];
  var GOOD = ['debtfree', 'engineer', 'father', 'king', 'rebirth', 'normal'];
  var BAD = ['collapse', 'bankrupt', 'flame'];
  var SLOT_KEYS = ['dannoura_save_slot1', 'dannoura_save_slot2', 'dannoura_save_slot3', 'dannoura_save_v1'];

  function num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function make(ls) {
    function get(k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } }
    function parse(k) { var r = get(k); if (r == null || r === '') return null; try { return JSON.parse(r); } catch (e) { return null; } }

    // dannoura_endings：{type:{firstDay, firstAt, count}}（古い版の配列 ['king',…] も許す）
    function seen() {
      var e = parse('dannoura_endings'), out = {};
      if (Array.isArray(e)) e.forEach(function (t) { if (TYPES.indexOf(t) >= 0) out[t] = { firstAt: '', count: 1 }; });
      else if (isObj(e)) Object.keys(e).forEach(function (t) {
        if (TYPES.indexOf(t) < 0 || !e[t]) return;
        var v = isObj(e[t]) ? e[t] : {};
        out[t] = { firstAt: typeof v.firstAt === 'string' ? v.firstAt : '', count: Math.max(1, Math.floor(num(v.count, 1))) };
      });
      return out;
    }
    function endings() { var s = seen(); return TYPES.filter(function (t) { return !!s[t]; }); }

    // セーブ（{version, savedAt, gs}／古い形式は gs 無しで直置きのこともある）
    function readSave(k) {
      var d = parse(k); if (!isObj(d)) return null;
      var g = isObj(d.gs) ? d.gs : (('day' in d || 'mental' in d) ? d : null);
      if (!g) return null;
      var sk = isObj(g.skills) ? g.skills : {}, skills = {};
      Object.keys(sk).forEach(function (n) { skills[n] = num(sk[n]); });
      return {
        key: k,
        savedAt: typeof d.savedAt === 'string' ? d.savedAt : '',
        day: Math.max(1, Math.min(31, Math.floor(num(g.day, 1)))),
        streamCount: Math.max(0, Math.floor(num(g.streamCount))),
        certKnow: num(g.certKnow), jobRep: num(g.jobRep), mental: num(g.mental, 50), fatigue: num(g.fatigue),
        followers: Math.max(0, Math.floor(num(g.followers))), anomalyCount: Math.max(0, Math.floor(num(g.anomalyCount))),
        childStress: num(g.childStress),
        endingReached: (typeof g.endingReached === 'string' && TYPES.indexOf(g.endingReached) >= 0) ? g.endingReached : null,
        skills: skills
      };
    }
    function saves() { var out = []; SLOT_KEYS.forEach(function (k) { var s = readSave(k); if (s) out.push(s); }); return out; }
    function best() {
      var list = saves(); if (!list.length) return null;
      list.sort(function (a, b) { return String(b.savedAt).localeCompare(String(a.savedAt)) || b.day - a.day; });
      var s = list[0], o = {};
      ['day', 'streamCount', 'certKnow', 'jobRep', 'mental', 'fatigue', 'followers', 'anomalyCount', 'childStress', 'endingReached', 'skills'].forEach(function (k) { o[k] = s[k]; });
      return o;
    }
    function hasMain() { return !!best() || endings().length > 0; }
    function cleared() { return endings().length > 0; }

    // いちばん「新しい」エンディング：セーブの endingReached → 記録の firstAt が新しいもの
    function lastEnding() {
      var b = best(); if (b && b.endingReached) return b.endingReached;
      var s = seen(), list = endings(); if (!list.length) return null;
      list.sort(function (a, c) { return String(s[c].firstAt).localeCompare(String(s[a].firstAt)); });
      return list[0];
    }

    // B-30 観測記録の差分（指示書 §18・原案「さらに重要な仕掛け」）
    function b30() {
      var b = best(), ending = lastEnding(), sk = b ? b.skills : {};
      var r = { study: false, stream: false, factory: false, unwell: false, good: false, bad: false, ending: ending, variant: null, child: false, anomaly: false, any: !!(b || ending) };
      if (b) {
        r.study = b.certKnow >= 55 || num(sk.focus) >= 2;
        r.stream = b.streamCount >= 8 || b.followers >= 300;
        r.factory = b.jobRep >= 60 || (num(sk.soundDiag) + num(sk.emergencyFix) + num(sk.wiring) + num(sk.plc)) >= 4;
        r.unwell = b.mental < 35 || b.fatigue >= 70;
        r.child = b.childStress < 30 || num(sk.bedtime) + num(sk.chores) >= 3;
        r.anomaly = b.anomalyCount >= 2;
      }
      if (ending) {
        r.good = GOOD.indexOf(ending) >= 0; r.bad = BAD.indexOf(ending) >= 0;
        if (ending === 'engineer') { r.study = true; r.factory = true; }
        if (ending === 'king') r.stream = true;
        if (ending === 'father') r.child = true;
        if (r.bad) r.unwell = true;
        r.variant = r.bad ? 'collapse' : ending === 'engineer' ? 'cert' : ending === 'king' ? 'stream' : ending === 'father' ? 'father' : 'success';
      }
      return r;
    }
    function summary() { return { hasMain: hasMain(), cleared: cleared(), endings: endings(), best: best(), b30: b30() }; }
    return { hasMain: hasMain, endings: endings, seen: seen, best: best, b30: b30, cleared: cleared, lastEnding: lastEnding, summary: summary, TYPES: TYPES.slice(), make: make };
  }

  var store = null;
  try { store = root.localStorage; } catch (e) { store = null; }
  root.KY_LINK = make(store);
})(typeof window !== 'undefined' ? window : globalThis);
