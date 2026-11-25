'use strict';
// 万象堂：占術エンジン（DOM を使わない。node でも試験できる）。
// ・計算はすべて決定論的：同じ入力・同じ流派の設定・同じ seed なら、同じ結果になる。
// ・足りない入力がある占術は「出さない」（available が ok:false と missing を返す）。推測で埋めない。
// ・結果は共通の形 { method, family, name, engineVer, school, inputUsed, missing, facts, items, themes, notes }。
//   themes は BanshoTexts.THEMES の語彙だけを使い、src に「どの占術のどの要素から出たか」を必ず書く。
// ・天体の位置は astronomy-engine（MIT、vendor/astronomy.browser.min.js）で計算する。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bansho-texts.js'), root.Astronomy || require('./vendor/astronomy.browser.min.js'));
  else root.Bansho = factory(root.BanshoTexts, root.Astronomy);
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (T, A) {
  const ENGINE_VER = '1.0.0';
  const DEFAULT_SCHOOL = {
    dayBoundary: 'midnight',   // 日の変わり目は 0 時（制作者の決定 2026-11-25）。23 時台は当日の日柱・時柱の干は翌日の子の刻
    trueSolar: false,          // 真太陽時（生まれた場所の経度で時刻を直す）。既定は直さない
    master: true,              // 数秘術のマスターナンバー（11・22・33）を残す
    etoYear: 'newyear',        // 生まれ年の干支の境目：newyear＝元日、risshun＝立春
    houses: 'whole'            // ハウスの方式：ホールサイン
  };
  const mod = function (a, n) { return ((a % n) + n) % n; };
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };

  // ───────── 乱数（文字列の seed から決まる） ─────────
  function hashStr(s) {
    let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    return h1 >>> 0;
  }
  function rng(seed) {
    let a = hashStr(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  // ───────── 暦 ─────────
  function jdn(y, m, d) { // グレゴリオ暦の通日（正午の JD を整数にしたもの）
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function parseDate(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const y = +m[1], mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; const t = new Date(Date.UTC(y, mo - 1, d)); if (t.getUTCMonth() !== mo - 1) return null; return { y: y, m: mo, d: d }; }
  function parseTime(s) { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); if (!m) return null; const h = +m[1], mi = +m[2]; if (h > 23 || mi > 59) return null; return { h: h, mi: mi }; }
  // 現地の日時 → UTC の Date
  function toUtc(y, m, d, h, mi, tz) { return new Date(Date.UTC(y, m - 1, d, h, mi) - tz * 3600000); }
  // UTC の Date → 現地の年月日
  function localYmd(date, tz) { const t = new Date(date.getTime() + tz * 3600000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() }; }
  function needAstro() { if (!A) throw new Error('astronomy-engine（vendor/astronomy.browser.min.js）が読み込まれていません'); }
  function sunLon(date) { needAstro(); return A.SunPosition(date).elon; }
  function moonLon(date) { needAstro(); return A.EclipticGeoMoon(date).lon; }
  function bodyLon(body, date) { needAstro(); if (body === 'Sun') return sunLon(date); if (body === 'Moon') return moonLon(date); return A.Ecliptic(A.GeoVector(body, date, true)).elon; }
  // その年の立春（太陽黄経 315°）の瞬間
  const risshunCache = {};
  function risshun(year) { if (!risshunCache[year]) { needAstro(); risshunCache[year] = A.SearchSunLongitude(315, new Date(Date.UTC(year, 0, 20)), 40).date; } return risshunCache[year]; }
  // 太陽黄経から節月（0＝寅月 … 11＝丑月）
  function setsuMonth(lon) { return Math.floor(mod(lon - 315, 360) / 30); }

  // 生まれた瞬間。時刻が分からなければ正午で計算し、その日のうちに境目があれば「不確か」とする
  function birthMoment(person, school) {
    const b = (person && person.birth) || {};
    const ymd = parseDate(b.date); if (!ymd) return null;
    const tm = parseTime(b.time);
    const place = b.place && isFinite(b.place.lat) && isFinite(b.place.lon) ? b.place : null;
    const tz = place && isFinite(place.tz) ? place.tz : 9;
    const h = tm ? tm.h : 12, mi = tm ? tm.mi : 0;
    const utc = toUtc(ymd.y, ymd.m, ymd.d, h, mi, tz);
    // 真太陽時：経度差（標準時の子午線から 1 度 = 4 分）だけ時刻を直す（均時差は入れない）
    let lh = h, lmi = mi, ly = ymd.y, lm = ymd.m, ld = ymd.d;
    if (tm && school.trueSolar && place) {
      const shift = Math.round((place.lon - tz * 15) * 4);
      const loc = localYmd(new Date(utc.getTime() + shift * 60000), tz);
      ly = loc.y; lm = loc.m; ld = loc.d; lh = loc.h; lmi = loc.mi;
    }
    return { utc: utc, timeKnown: !!tm, place: place, tz: tz, y: ly, m: lm, d: ld, h: lh, mi: lmi, dayStart: toUtc(ymd.y, ymd.m, ymd.d, 0, 0, tz), dayEnd: toUtc(ymd.y, ymd.m, ymd.d, 23, 59, tz) };
  }

  // 干支の番号（0＝甲子 … 59＝癸亥）と名前
  function kanshi(stem, branch) { return { s: stem, b: branch, name: T.STEMS[stem] + T.BRANCHES[branch] }; }
  function kanshiOfIndex(i) { return kanshi(i % 10, i % 12); }
  function dayIndex(y, m, d) { return mod(jdn(y, m, d) + 49, 60); }
  const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水
  const stemEl = function (s) { return Math.floor(s / 2); };
  // 通変星（日主 dm から見た干 o）
  function tsuhen(dm, o) { const diff = mod(stemEl(o) - stemEl(dm), 5); return diff * 2 + ((o % 2) === (dm % 2) ? 0 : 1); }

  // 四柱
  function pillars(person, school) {
    const mo = birthMoment(person, school); if (!mo) return null;
    const unsure = [];
    const rs = risshun(mo.y);
    const yearY = mo.utc < rs ? mo.y - 1 : mo.y;
    if (!mo.timeKnown) {
      const r0 = risshun(mo.y);
      if (r0 >= mo.dayStart && r0 <= mo.dayEnd) unsure.push('year');
      if (setsuMonth(sunLon(mo.dayStart)) !== setsuMonth(sunLon(mo.dayEnd))) unsure.push('month');
    }
    const yi = mod(yearY - 4, 60);
    const year = kanshiOfIndex(yi);
    const n = setsuMonth(sunLon(mo.utc));
    const month = kanshi(mod((year.s % 5) * 2 + 2 + n, 10), (2 + n) % 12);
    const day = kanshiOfIndex(dayIndex(mo.y, mo.m, mo.d));
    let hour = null;
    if (mo.timeKnown) {
      const hb = Math.floor((mo.h * 60 + mo.mi + 60) / 120) % 12;
      const baseStem = mo.h >= 23 ? (day.s + 1) % 10 : day.s; // 0 時の日替わり：23 時台は翌日の子の刻の干
      hour = kanshi(mod((baseStem % 5) * 2 + hb, 10), hb);
    }
    return { year: year, month: month, day: day, hour: hour, yearY: yearY, setsu: n, moment: mo, unsure: unsure };
  }

  // ───────── 占術の登録 ─────────
  const REG = [];
  const byId = {};
  function register(def) {
    if (!def || !def.id || typeof def.compute !== 'function') throw new Error('占術の定義には id と compute が要ります');
    if (byId[def.id]) throw new Error('同じ id の占術がすでにあります: ' + def.id);
    def.needs = def.needs || []; def.family = def.family || def.id; def.group = def.group || 'other';
    REG.push(def); byId[def.id] = def; return def;
  }
  function has(person, path) {
    if (path === 'birth.place') { const p = person && person.birth && person.birth.place; return !!(p && isFinite(p.lat) && isFinite(p.lon)); }
    if (path === 'birth.date') return !!parseDate(person && person.birth && person.birth.date);
    if (path === 'birth.time') return !!parseTime(person && person.birth && person.birth.time);
    if (path === 'blood') return !!(person && T.BLOOD[person.blood]);
    return true;
  }
  function available(id, person) {
    const def = byId[id]; if (!def) return { ok: false, missing: [], unknown: true };
    const missing = def.needs.filter(function (p) { return !has(person, p); });
    return { ok: missing.length === 0, missing: missing };
  }
  function theme(tag, w, src) { if (!T.THEMES[tag]) throw new Error('語彙に無いテーマ: ' + tag); return { tag: tag, w: w, src: src }; }
  function run(id, person, opts) {
    opts = opts || {};
    const def = byId[id]; if (!def) throw new Error('占術がありません: ' + id);
    const av = available(id, person);
    if (!av.ok) return { method: id, name: def.name, family: def.family, ok: false, missing: av.missing };
    const school = Object.assign({}, DEFAULT_SCHOOL, opts.school || {});
    const out = def.compute({ person: person || {}, school: school, seed: opts.seed, picks: opts.picks, now: opts.now || new Date(), spread: opts.spread });
    const res = Object.assign({ method: id, name: def.name, family: def.family, group: def.group, ok: true, engineVer: ENGINE_VER, school: school,
      inputUsed: def.needs.slice(), missing: [], seed: opts.seed, picks: opts.picks, spread: opts.spread, notes: [], themes: [], items: [] }, out);
    // 語彙に無いテーマ・出典の無いテーマは捨てる（統合で在りもしない一致を作らないため）
    const bad = res.themes.filter(function (th) { return !th || !T.THEMES[th.tag] || !th.src; });
    if (bad.length) { res.themes = res.themes.filter(function (th) { return bad.indexOf(th) < 0; }); res.dropped = bad.length; }
    return res;
  }

  // ───────── 生年月日の占術 ─────────
  register({ id: 'numerology', name: '数秘術', group: 'west', family: 'numerology', needs: ['birth.date'], compute: function (c) {
    const ds = c.person.birth.date.replace(/-/g, '');
    let n = ds.split('').reduce(function (a, x) { return a + (+x); }, 0); const steps = [n];
    const keep = function (x) { return c.school.master && (x === 11 || x === 22 || x === 33); };
    while (n > 9 && !keep(n)) { n = String(n).split('').reduce(function (a, x) { return a + (+x); }, 0); steps.push(n); }
    const N = T.NUMEROLOGY[n];
    return { facts: { lifePath: n, steps: steps }, items: [{ h: 'ライフパス・ナンバー ' + n, t: N.t, sub: '生年月日の数字を足していくと ' + steps.join(' → ') }],
      themes: N.th.map(function (tg) { return theme(tg, 1, '数秘術・ライフパス ' + n); }) };
  } });

  register({ id: 'zodiac', name: '星座占い', group: 'west', family: 'astro', needs: ['birth.date'], compute: function (c) {
    const mo = birthMoment(c.person, c.school);
    const sun = Math.floor(sunLon(mo.utc) / 30);
    const items = [], notes = [], themes = [];
    const S = T.SIGNS[sun];
    items.push({ h: '太陽星座：' + S.n, t: S.t });
    if (!mo.timeKnown) {
      const a = Math.floor(sunLon(mo.dayStart) / 30), b = Math.floor(sunLon(mo.dayEnd) / 30);
      if (a !== b) notes.push('この日は太陽が ' + T.SIGNS[a].n + ' から ' + T.SIGNS[b].n + ' へ移る日です。生まれた時刻によって星座が変わるため、時刻を入れると確かになります。');
    }
    let moon = null;
    if (mo.timeKnown) moon = Math.floor(moonLon(mo.utc) / 30);
    else { const a = Math.floor(moonLon(mo.dayStart) / 30), b = Math.floor(moonLon(mo.dayEnd) / 30); if (a === b) moon = a; else notes.push('月の星座はこの日のうちに変わるため、生まれた時刻が分からないと出せません。'); }
    if (moon !== null) items.push({ h: '月星座：' + T.SIGNS[moon].n, t: '心の素顔として、' + T.SIGNS[moon].t });
    S.th.forEach(function (tg) { themes.push(theme(tg, 1, '星座・太陽 ' + S.n)); });
    if (moon !== null) themes.push(theme(T.SIGNS[moon].th[0], 0.5, '星座・月 ' + T.SIGNS[moon].n));
    return { facts: { sun: sun, moon: moon }, items: items, notes: notes, themes: themes };
  } });

  register({ id: 'horoscope', name: 'ホロスコープ', group: 'west', family: 'astro', needs: ['birth.date', 'birth.time', 'birth.place'], compute: function (c) {
    const mo = birthMoment(c.person, c.school);
    const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const pos = {}; bodies.forEach(function (b) { pos[b] = bodyLon(b, mo.utc); });
    // アセンダント：地方恒星時と黄道傾斜角から
    const lst = mod(A.SiderealTime(mo.utc) * 15 + mo.place.lon, 360) * Math.PI / 180;
    const jd = mo.utc.getTime() / 86400000 + 2440587.5, tc = (jd - 2451545) / 36525;
    const eps = (23.439291 - 0.0130042 * tc) * Math.PI / 180, phi = mo.place.lat * Math.PI / 180;
    pos.Asc = mod(Math.atan2(Math.cos(lst), -(Math.sin(lst) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * 180 / Math.PI, 360);
    const ascSign = Math.floor(pos.Asc / 30);
    const items = [], themes = [];
    Object.keys(pos).forEach(function (b) {
      const s = Math.floor(pos[b] / 30), deg = Math.floor(pos[b] % 30);
      const house = b === 'Asc' ? 1 : mod(s - ascSign, 12) + 1;
      items.push({ h: T.BODIES[b].n + '：' + T.SIGNS[s].n + ' ' + deg + '°' + (b === 'Asc' ? '' : '（第 ' + house + ' ハウス）'), t: T.BODIES[b].t + ' — ' + T.SIGNS[s].t });
    });
    const sun = Math.floor(pos.Sun / 30), moon = Math.floor(pos.Moon / 30);
    T.SIGNS[sun].th.forEach(function (tg) { themes.push(theme(tg, 1, 'ホロスコープ・太陽 ' + T.SIGNS[sun].n)); });
    themes.push(theme(T.SIGNS[moon].th[0], 0.6, 'ホロスコープ・月 ' + T.SIGNS[moon].n));
    themes.push(theme(T.SIGNS[ascSign].th[0], 0.6, 'ホロスコープ・アセンダント ' + T.SIGNS[ascSign].n));
    return { facts: { lon: pos, ascSign: ascSign }, items: items, themes: themes, notes: ['ハウスはホールサイン方式です。'] };
  } });

  register({ id: 'eto', name: '干支', group: 'east', family: 'eto', needs: ['birth.date'], compute: function (c) {
    const mo = birthMoment(c.person, c.school);
    let y = mo.y; const notes = [];
    if (c.school.etoYear === 'risshun' && mo.utc < risshun(mo.y)) y -= 1;
    else if (c.school.etoYear === 'newyear' && mo.utc < risshun(mo.y)) notes.push('立春より前の生まれです。四柱推命や九星では前の年（' + kanshiOfIndex(mod(y - 5, 60)).name + '）として扱います。');
    const k = kanshiOfIndex(mod(y - 4, 60));
    return { facts: { year: y, kanshi: k.name }, items: [{ h: k.name + '（' + T.STEM_YOMI[k.s] + '・' + T.ANIMALS[k.b] + '）', t: T.ANIMALS[k.b] + '年の生まれです。' }], notes: notes, themes: [] };
  } });

  register({ id: 'kyusei', name: '九星気学', group: 'east', family: 'kyusei', needs: ['birth.date'], compute: function (c) {
    const p = pillars(c.person, c.school);
    let s = String(p.yearY).split('').reduce(function (a, x) { return a + (+x); }, 0); while (s > 9) s = String(s).split('').reduce(function (a, x) { return a + (+x); }, 0);
    let honmei = 11 - s; if (honmei > 9) honmei -= 9;
    const start = [1, 4, 7].indexOf(honmei) >= 0 ? 8 : ([3, 6, 9].indexOf(honmei) >= 0 ? 5 : 2);
    const getsumei = mod(start - p.setsu - 1, 9) + 1;
    const H = T.KYUSEI[honmei], G = T.KYUSEI[getsumei];
    const notes = [];
    if (p.unsure.indexOf('year') >= 0) notes.push('立春の日の生まれです。生まれた時刻によって本命星が変わることがあります。');
    if (p.unsure.indexOf('month') >= 0) notes.push('節入りの日の生まれです。生まれた時刻によって月命星が変わることがあります。');
    return { facts: { honmei: honmei, getsumei: getsumei }, notes: notes,
      items: [{ h: '本命星：' + H.n, t: H.t }, { h: '月命星：' + G.n, t: '内面の性質として、' + G.t }],
      themes: H.th.map(function (tg) { return theme(tg, 1, '九星・本命星 ' + H.n); }).concat([theme(G.th[0], 0.5, '九星・月命星 ' + G.n)]) };
  } });

  register({ id: 'shichu', name: '四柱推命', group: 'east', family: 'shichu', needs: ['birth.date'], compute: function (c) {
    const p = pillars(c.person, c.school);
    const dm = p.day.s;
    const cols = [['年柱', p.year], ['月柱', p.month], ['日柱', p.day]]; if (p.hour) cols.push(['時柱', p.hour]);
    const items = [{ h: '命式', t: cols.map(function (x) { return x[0] + ' ' + x[1].name; }).join('　') + (p.hour ? '' : '　（時柱は生まれた時刻が分からないため出しません）') }];
    const D = T.DAY_MASTER[dm];
    items.push({ h: '日主：' + T.STEMS[dm] + '（' + T.ELEMENTS[stemEl(dm)] + '）', t: D.t });
    // 通変星：年・月・時の干と、四つの支の蔵干（本気）
    const stars = [];
    cols.forEach(function (x) { if (x[0] !== '日柱') stars.push({ at: x[0] + 'の干', i: tsuhen(dm, x[1].s) }); stars.push({ at: x[0] + 'の支', i: tsuhen(dm, T.HIDDEN[x[1].b]) }); });
    const cnt = {}; stars.forEach(function (s) { cnt[s.i] = (cnt[s.i] || 0) + 1; });
    const main = tsuhen(dm, T.HIDDEN[p.month.b]); // 月の支の蔵干を中心の星とする
    items.push({ h: '中心の星：' + T.TSUHEN[main].n, t: T.TSUHEN[main].t });
    // 五行の数（八字）
    const el = [0, 0, 0, 0, 0];
    cols.forEach(function (x) { el[stemEl(x[1].s)]++; el[BRANCH_EL[x[1].b]]++; });
    const notes = [];
    el.forEach(function (v, i) { const N = T.ELEMENT_NOTE[T.ELEMENTS[i]]; if (v >= 3) notes.push(T.ELEMENTS[i] + 'が ' + v + ' つ：' + N.many); if (v === 0) notes.push(T.ELEMENTS[i] + 'が無い：' + N.none); });
    if (p.unsure.indexOf('year') >= 0) notes.push('立春の日の生まれです。生まれた時刻によって年柱が変わることがあります。');
    if (p.unsure.indexOf('month') >= 0) notes.push('節入りの日の生まれです。生まれた時刻によって月柱が変わることがあります。');
    const themes = D.th.map(function (tg) { return theme(tg, 1, '四柱推命・日主 ' + T.STEMS[dm]); });
    T.TSUHEN[main].th.forEach(function (tg) { themes.push(theme(tg, 0.7, '四柱推命・中心の星 ' + T.TSUHEN[main].n)); });
    el.forEach(function (v, i) { if (v >= 3) themes.push(theme(T.ELEMENT_NOTE[T.ELEMENTS[i]].th, 0.4, '四柱推命・' + T.ELEMENTS[i] + 'が多い')); });
    return { facts: { year: p.year.name, month: p.month.name, day: p.day.name, hour: p.hour ? p.hour.name : null, dayMaster: T.STEMS[dm], main: T.TSUHEN[main].n, stars: stars.map(function (s) { return { at: s.at, n: T.TSUHEN[s.i].n }; }), elements: el, unsure: p.unsure },
      items: items, notes: notes, themes: themes };
  } });

  register({ id: 'blood', name: '血液型', group: 'birth', family: 'blood', needs: ['blood'], compute: function (c) {
    const B = T.BLOOD[c.person.blood];
    return { facts: { blood: c.person.blood }, items: [{ h: c.person.blood + ' 型', t: B.t }], notes: ['血液型と性格の結びつきに、科学的な根拠はありません。'],
      themes: B.th.map(function (tg) { return theme(tg, 0.4, '血液型・' + c.person.blood + ' 型'); }) };
  } });

  // ───────── 引く占い（seed と選んだ札で再現できる） ─────────
  function tarotDeck(seed) {
    const r = rng('tarot|' + seed);
    return shuffle(T.TAROT.map(function (_, i) { return i; }), r).map(function (i) { return { i: i, rev: r() < 0.35 }; });
  }
  register({ id: 'tarot', name: 'タロット', group: 'draw', family: 'tarot', needs: [], compute: function (c) {
    const spread = c.spread === 'three' ? 'three' : 'one';
    const pos = T.TAROT_POS[spread];
    const deck = tarotDeck(c.seed);
    const picks = (c.picks && c.picks.length === pos.length) ? c.picks : pos.map(function (_, k) { return k; });
    const cards = picks.map(function (p) { return deck[p]; });
    return { facts: { spread: spread, cards: cards.map(function (x) { return { n: T.TAROT[x.i].n, rev: x.rev }; }) },
      items: cards.map(function (x, k) { const C = T.TAROT[x.i]; return { h: pos[k] + '：' + C.n + (x.rev ? '（逆位置）' : '（正位置）'), t: x.rev ? C.rv : C.up, card: x.i, rev: x.rev }; }),
      themes: cards.map(function (x) { return theme(T.TAROT[x.i].th[0], x.rev ? 0.3 : 0.6, 'タロット・' + T.TAROT[x.i].n); }) };
  } });

  register({ id: 'rune', name: 'ルーン', group: 'draw', family: 'rune', needs: [], compute: function (c) {
    const r = rng('rune|' + c.seed);
    const n = c.spread === 'three' ? 3 : 1;
    const order = shuffle(T.RUNES.map(function (_, i) { return i; }), r).slice(0, n);
    const labels = n === 3 ? ['いま', '試練', '道しるべ'] : ['ひとつの文字'];
    const got = order.map(function (i) { const R = T.RUNES[i]; const rev = R.r !== false && r() < 0.3; return { i: i, rev: rev }; });
    return { facts: { runes: got.map(function (g) { return { n: T.RUNES[g.i].n, rev: g.rev }; }) },
      items: got.map(function (g, k) { const R = T.RUNES[g.i]; return { h: labels[k] + '：' + R.c + ' ' + R.n + (g.rev ? '（逆さ）' : ''), t: g.rev ? R.rv : R.up }; }),
      themes: got.map(function (g) { return theme(T.RUNES[g.i].th[0], 0.5, 'ルーン・' + T.RUNES[g.i].n); }) };
  } });

  // 易：三枚の硬貨を六回（下の爻から）。6＝老陰（変わる）、7＝少陽、8＝少陰、9＝老陽（変わる）
  function hexOf(lines) { // lines は下から 6 本、1＝陽
    const tri = function (b) { for (let i = 0; i < 8; i++) { const t = T.TRIGRAMS[i].bits; if (t[0] === b[0] && t[1] === b[1] && t[2] === b[2]) return i; } return -1; };
    return T.KING_WEN[tri(lines.slice(3, 6))][tri(lines.slice(0, 3))];
  }
  register({ id: 'iching', name: '易占い', group: 'draw', family: 'iching', needs: [], compute: function (c) {
    const r = rng('iching|' + c.seed);
    const vals = []; for (let k = 0; k < 6; k++) { let s = 0; for (let j = 0; j < 3; j++) s += r() < 0.5 ? 3 : 2; vals.push(s); }
    const main = vals.map(function (v) { return (v === 7 || v === 9) ? 1 : 0; });
    const moving = vals.map(function (v, k) { return (v === 6 || v === 9) ? k + 1 : 0; }).filter(Boolean);
    const changed = vals.map(function (v) { return v === 9 ? 0 : v === 6 ? 1 : ((v === 7) ? 1 : 0); });
    const h1 = hexOf(main), H1 = T.HEXAGRAMS[h1];
    const items = [{ h: '本卦：第 ' + h1 + ' 卦 ' + H1[0], t: H1[1], lines: main }];
    const themes = [theme(H1[2], 0.6, '易・' + H1[0])];
    let h2 = null;
    if (moving.length) {
      h2 = hexOf(changed); const H2 = T.HEXAGRAMS[h2];
      items.push({ h: '之卦（変わった先）：第 ' + h2 + ' 卦 ' + H2[0], t: '動く爻は ' + moving.map(function (k) { return ['初', '二', '三', '四', '五', '上'][k - 1]; }).join('・') + '。流れの行き先として、' + H2[1], lines: changed });
      themes.push(theme(H2[2], 0.3, '易・之卦 ' + H2[0]));
    }
    return { facts: { values: vals, main: h1, changed: h2, moving: moving }, items: items, themes: themes };
  } });

  // ───────── 今日 ─────────
  function todayYmd(now) { return localYmd(now, 9); } // 日付は日本時間で決める
  function todayKey(now) { const t = todayYmd(now); return t.y + '-' + pad(t.m) + '-' + pad(t.d); }
  register({ id: 'omikuji', name: 'おみくじ', group: 'today', family: 'omikuji', needs: [], compute: function (c) {
    const key = todayKey(c.now);
    const r = rng('omikuji|' + key + '|' + ((c.person && c.person.id) || 'guest'));
    const total = T.OMIKUJI.reduce(function (a, x) { return a + x.w; }, 0);
    let x = r() * total, k = 0; for (; k < T.OMIKUJI.length - 1; k++) { x -= T.OMIKUJI[k].w; if (x < 0) break; }
    const O = T.OMIKUJI[k];
    return { facts: { date: key, rank: O.n }, items: [{ h: O.n, t: O.t }], themes: [] };
  } });
  register({ id: 'today', name: '今日の運勢', group: 'today', family: 'today', needs: ['birth.date'], compute: function (c) {
    const key = todayKey(c.now), t = todayYmd(c.now);
    const p = pillars(c.person, c.school);
    const dayK = kanshiOfIndex(dayIndex(t.y, t.m, t.d));
    const ts = tsuhen(p.day.s, dayK.s);
    const D = T.TODAY_BY_TSUHEN[ts];
    const r = rng('today|' + key + '|' + c.person.birth.date + '|' + ((c.person && c.person.id) || ''));
    const color = T.LUCKY_COLORS[Math.floor(r() * T.LUCKY_COLORS.length)];
    const act = T.LUCKY_ACTS[Math.floor(r() * T.LUCKY_ACTS.length)];
    return { facts: { date: key, dayKanshi: dayK.name, tsuhen: T.TSUHEN[ts].n, level: D.lv },
      items: [{ h: key.replace(/-/g, '/') + '（' + dayK.name + 'の日）', t: D.t, stars: D.lv }, { h: '今日の星：' + T.TSUHEN[ts].n, t: T.TSUHEN[ts].t }, { h: 'ひとこと', t: '色は' + color + '。' + act + 'と吉。' }],
      themes: [theme(T.TSUHEN[ts].th[0], 0.6, '今日の運勢・' + T.TSUHEN[ts].n)] };
  } });

  // ───────── 統合エンジン（決定論的。AI は使わない） ─────────
  // 一人の人物についての占術（生年月日・血液型・手相など）だけを集める。引く占い・今日の占いは「その時の問い」なので入れない。
  const PERSON_GROUPS = { east: 1, west: 1, birth: 1, palm: 1 };
  function integrate(results) {
    // 同じ系統（family）は、いちばん詳しい物を一つだけ使う（例：ホロスコープがあれば星座占いは数えない）
    const fam = {};
    results.filter(function (r) { return r && r.ok && PERSON_GROUPS[r.group]; }).forEach(function (r) {
      const cur = fam[r.family]; if (!cur || (r.inputUsed || []).length > (cur.inputUsed || []).length) fam[r.family] = r;
    });
    const used = Object.keys(fam).map(function (k) { return fam[k]; });
    const tags = {};
    used.forEach(function (r) {
      r.themes.forEach(function (th) {
        const e = tags[th.tag] || (tags[th.tag] = { tag: th.tag, w: 0, from: {} });
        e.w += th.w; (e.from[r.family] = e.from[r.family] || { method: r.name, src: [] }).src.push(th.src);
      });
    });
    const list = Object.keys(tags).map(function (k) { const e = tags[k]; return { tag: e.tag, label: T.THEMES[e.tag].label, w: Math.round(e.w * 100) / 100, n: Object.keys(e.from).length, from: Object.keys(e.from).map(function (f) { return e.from[f]; }) }; });
    list.sort(function (a, b) { return b.n - a.n || b.w - a.w || (a.tag < b.tag ? -1 : 1); });
    const common = list.filter(function (e) { return e.n >= 2; });
    const unique = list.filter(function (e) { return e.n === 1 && e.w >= 0.9; });
    const conflicts = [];
    T.OPPOSITE.forEach(function (pr) {
      const a = tags[pr[0]], b = tags[pr[1]]; if (!a || !b) return;
      const fa = Object.keys(a.from), fb = Object.keys(b.from);
      if (fa.some(function (f) { return fb.indexOf(f) < 0; }) || fb.some(function (f) { return fa.indexOf(f) < 0; })) conflicts.push({ a: list.filter(function (e) { return e.tag === pr[0]; })[0], b: list.filter(function (e) { return e.tag === pr[1]; })[0] });
    });
    const srcText = function (e) { return e.from.map(function (f) { return f.method + '（' + f.src.map(function (s) { return s.split('・').slice(1).join('・'); }).join('、') + '）'; }).join('、'); };
    const text = [];
    if (!used.length) text.push({ s: '総合鑑定には、生年月日などで占う占術の結果が要ります。', src: [] });
    common.slice(0, 4).forEach(function (e) { text.push({ s: '「' + e.label + '」— ' + T.THEMES[e.tag].text + ' — が、' + srcText(e) + ' に共通して出ています。', src: e.from.map(function (f) { return f.src; }).reduce(function (a, x) { return a.concat(x); }, []) }); });
    if (used.length && !common.length) text.push({ s: '今回の占術どうしでは、はっきり重なるテーマはありませんでした。それぞれの結果を、別々の角度からの見方として読んでください。', src: [] });
    conflicts.forEach(function (c) { text.push({ s: '「' + c.a.label + '」を示す ' + srcText(c.a) + ' と、「' + c.b.label + '」を示す ' + srcText(c.b) + ' があります。どちらかが正しいのではなく、場面によって表れ方が変わる、と読むことができます。', src: [] }); });
    unique.slice(0, 3).forEach(function (e) { text.push({ s: srcText(e) + ' だけが「' + e.label + '」を強く示しています。', src: e.from[0].src }); });
    if (used.length) text.push({ s: '共通点が多くても、それは占いどうしの一致であって、科学的に確かめられたことではありません。', src: [] });
    return { methods: used.map(function (r) { return r.name; }), common: common, conflicts: conflicts, unique: unique, ranking: list, text: text, generatedBy: 'template', engineVer: ENGINE_VER };
  }

  // ───────── 運命の書（保存。本人が「保存する」を選んだときだけ端末に書く） ─────────
  const KEYS = { profile: 'bansho.profile.v1', book: 'bansho.book.v1', settings: 'bansho.settings.v1' };
  function createStore(storage) {
    const mem = {};
    const ls = storage || null;
    function get(k) { try { const v = ls && ls.getItem(k); if (v) return JSON.parse(v); } catch (e) { /* 読めなければ空 */ } return mem[k] || null; }
    function set(k, v, persist) { mem[k] = v; if (!ls) return; try { if (persist) ls.setItem(k, JSON.stringify(v)); else ls.removeItem(k); } catch (e) { /* 保存できなくても動かす */ } }
    function emptyProfile() { return { v: 1, consent: { store: false, photo: false }, people: [] }; }
    return {
      keys: KEYS,
      profile: function () { return get(KEYS.profile) || emptyProfile(); },
      saveProfile: function (p) { set(KEYS.profile, p, !!(p.consent && p.consent.store)); },
      settings: function () { return Object.assign({}, DEFAULT_SCHOOL, get(KEYS.settings) || {}); },
      saveSettings: function (s, persist) { set(KEYS.settings, s, persist); },
      book: function () { const b = get(KEYS.book); return b && Array.isArray(b.readings) ? b : { v: 1, readings: [] }; },
      addReading: function (rd, persist) {
        const b = this.book();
        rd.id = rd.id || ('r' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36));
        b.readings.unshift(rd); if (b.readings.length > 200) b.readings.length = 200;
        set(KEYS.book, b, persist); return rd;
      },
      removeReading: function (id, persist) { const b = this.book(); b.readings = b.readings.filter(function (r) { return r.id !== id; }); set(KEYS.book, b, persist); },
      clearAll: function () { Object.keys(KEYS).forEach(function (k) { delete mem[KEYS[k]]; try { ls && ls.removeItem(KEYS[k]); } catch (e) { /* 無視 */ } }); }
    };
  }

  return {
    ENGINE_VER: ENGINE_VER, DEFAULT_SCHOOL: DEFAULT_SCHOOL, texts: T,
    rng: rng, cal: { jdn: jdn, dayIndex: dayIndex, kanshiOfIndex: kanshiOfIndex, risshun: risshun, sunLon: sunLon, pillars: pillars, tsuhen: tsuhen, hexOf: hexOf, todayKey: todayKey, tarotDeck: tarotDeck },
    methods: { list: function () { return REG.slice(); }, get: function (id) { return byId[id] || null; }, register: register },
    available: available, run: run, integrate: integrate, createStore: createStore,
    // ゲームのイベント条件用：今日のテーマ（占い結果で本筋を止めないよう、足すだけの条件に使う）
    todayThemes: function (person, now) { const r = run('today', person, { now: now }); return r.ok ? r.themes.map(function (t) { return t.tag; }) : []; }
  };
});
