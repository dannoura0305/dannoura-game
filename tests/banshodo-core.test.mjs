// 万象堂：占術エンジン（banshodo/bansho-core.js）の試験。答えは暦の既知の値で確かめる。
// ・干支の日（2000-01-01＝戊午）・立春（2024 年は 2/4 17:27 頃）・九星・四柱（年・月・日・時、0 時の日替わり）
// ・足りない入力の占術は出さない・同じ seed なら同じ結果・統合は同じ系統を二重に数えない・保存は同意したときだけ
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const B = require(join(ROOT, 'banshodo/bansho-core.js'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const P = (date, time, extra) => Object.assign({ id: 'p1', birth: { date, time: time || null, place: null } }, extra || {});

t('日の干支：1900-01-01＝甲戌、2000-01-01＝戊午', () => {
  assert.equal(B.cal.kanshiOfIndex(B.cal.dayIndex(1900, 1, 1)).name, '甲戌');
  assert.equal(B.cal.kanshiOfIndex(B.cal.dayIndex(2000, 1, 1)).name, '戊午');
});
t('立春：2024 年は 2 月 4 日 17 時台（日本時間）', () => {
  const r = B.cal.risshun(2024); const j = new Date(r.getTime() + 9 * 3600000);
  assert.equal(j.getUTCMonth(), 1); assert.equal(j.getUTCDate(), 4); assert.equal(j.getUTCHours(), 17);
});
t('四柱：2000-01-01 12:00 は 己卯・丙子・戊午・戊午', () => {
  const r = B.run('shichu', P('2000-01-01', '12:00'));
  assert.deepEqual([r.facts.year, r.facts.month, r.facts.day, r.facts.hour], ['己卯', '丙子', '戊午', '戊午']);
  assert.equal(r.facts.dayMaster, '戊');
});
t('四柱：0 時の日替わり。23:30 は当日の日柱のまま、時柱は翌日の干で 甲子', () => {
  const r = B.run('shichu', P('2000-01-01', '23:30'));
  assert.equal(r.facts.day, '戊午'); assert.equal(r.facts.hour, '甲子');
  const r2 = B.run('shichu', P('2000-01-02', '00:30'));
  assert.equal(r2.facts.day, '己未'); assert.equal(r2.facts.hour, '甲子');
});
t('四柱：立春の前後で年柱が変わる（2024-02-04 の 12 時は癸卯、18 時は甲辰）', () => {
  assert.equal(B.run('shichu', P('2024-02-04', '12:00')).facts.year, '癸卯');
  assert.equal(B.run('shichu', P('2024-02-04', '18:00')).facts.year, '甲辰');
});
t('四柱：時刻が分からなければ時柱を出さず、立春の日は「不確か」と書く', () => {
  const r = B.run('shichu', P('2024-02-04'));
  assert.equal(r.facts.hour, null); assert.ok(r.facts.unsure.includes('year'));
  assert.ok(r.notes.some(s => s.includes('立春の日')));
});
t('九星：2000 年＝九紫、1990 年＝一白、2024/3/1＝三碧・月命 五黄、2024/3/10＝月命 四緑', () => {
  assert.equal(B.run('kyusei', P('2000-06-01')).facts.honmei, 9);
  assert.equal(B.run('kyusei', P('1990-06-01')).facts.honmei, 1);
  const a = B.run('kyusei', P('2024-03-01')); assert.equal(a.facts.honmei, 3); assert.equal(a.facts.getsumei, 5);
  assert.equal(B.run('kyusei', P('2024-03-10')).facts.getsumei, 4);
  assert.equal(B.run('kyusei', P('2024-01-15')).facts.honmei, 4); // 立春前は前の年（2023＝四緑）
});
t('数秘術：1990-01-01＝3、マスターナンバー 22 を残す／残さない', () => {
  assert.equal(B.run('numerology', P('1990-01-01')).facts.lifePath, 3);
  const m = B.run('numerology', P('1982-09-29')); // 1+9+8+2+0+9+2+9 = 40 → 4
  assert.equal(m.facts.lifePath, 4);
  const e = B.run('numerology', P('2009-09-02')); // 2+0+0+9+0+9+0+2 = 22
  assert.equal(e.facts.lifePath, 22);
  assert.equal(B.run('numerology', P('2009-09-02'), { school: { master: false } }).facts.lifePath, 4);
});
t('星座：2000-01-01＝山羊座。時刻が無く、星座が変わる日には注意を書く', () => {
  assert.equal(B.run('zodiac', P('2000-01-01')).facts.sun, 9);
  const cusp = B.run('zodiac', P('2024-03-20')); // 春分の日（魚座→牡羊座）
  assert.ok(cusp.notes.some(s => s.includes('時刻を入れると')));
});
t('干支（生まれ年）：元日で区切ると 2024-01-15 は甲辰、立春で区切ると癸卯', () => {
  assert.equal(B.run('eto', P('2024-01-15')).facts.kanshi, '甲辰');
  assert.equal(B.run('eto', P('2024-01-15'), { school: { etoYear: 'risshun' } }).facts.kanshi, '癸卯');
});
t('足りない入力の占術は出さない（ホロスコープは時刻と場所、血液型は血液型）', () => {
  const p = P('2000-01-01');
  assert.deepEqual(B.available('horoscope', p).missing, ['birth.time', 'birth.place']);
  assert.equal(B.run('horoscope', p).ok, false);
  assert.equal(B.available('blood', p).ok, false);
  assert.equal(B.available('numerology', { birth: {} }).ok, false);
  assert.equal(B.available('numerology', P('2000-02-30')).ok, false); // 無い日付
});
t('ホロスコープ：時刻と場所があれば七天体とアセンダントを出す', () => {
  const pl = B.texts.PLACES.find(x => x.name === '富山県');
  const r = B.run('horoscope', { birth: { date: '2000-01-01', time: '12:00', place: pl } });
  assert.equal(r.ok, true); assert.equal(Math.floor(r.facts.lon.Sun / 30), 9);
  assert.ok(r.facts.lon.Asc >= 0 && r.facts.lon.Asc < 360); assert.equal(r.items.length, 8);
  // 正午の東京付近では、太陽は南中（第 10 ハウス付近）。ホールサインで 9〜11 ハウスに入る
  const sunHouse = ((9 - r.facts.ascSign) % 12 + 12) % 12 + 1;
  assert.ok(sunHouse >= 9 && sunHouse <= 11, 'sun house ' + sunHouse);
});
t('易：卦の番号（乾＝1、坤＝2、水雷屯＝3、水火既済＝63）', () => {
  assert.equal(B.cal.hexOf([1, 1, 1, 1, 1, 1]), 1);
  assert.equal(B.cal.hexOf([0, 0, 0, 0, 0, 0]), 2);
  assert.equal(B.cal.hexOf([1, 0, 0, 0, 1, 0]), 3);
  assert.equal(B.cal.hexOf([1, 0, 1, 0, 1, 0]), 63);
  const seen = new Set(); for (let a = 0; a < 64; a++) seen.add(B.cal.hexOf([0, 1, 2, 3, 4, 5].map(k => (a >> k) & 1)));
  assert.equal(seen.size, 64);
});
t('引く占いは seed と選んだ札で再現できる', () => {
  const a = B.run('tarot', {}, { seed: 'abc', spread: 'three', picks: [3, 7, 11] });
  const b = B.run('tarot', {}, { seed: 'abc', spread: 'three', picks: [3, 7, 11] });
  assert.deepEqual(a.facts, b.facts);
  assert.notDeepEqual(a.facts, B.run('tarot', {}, { seed: 'abd', spread: 'three', picks: [3, 7, 11] }).facts);
  assert.deepEqual(B.run('iching', {}, { seed: 'x' }).facts, B.run('iching', {}, { seed: 'x' }).facts);
  assert.equal(B.run('rune', {}, { seed: 'x', spread: 'three' }).items.length, 3);
});
t('今日の運勢・おみくじは、同じ日・同じ人なら同じ（日付は日本時間）', () => {
  const p = P('1990-05-05');
  const d1 = new Date('2026-11-25T00:30:00+09:00'), d2 = new Date('2026-11-25T23:30:00+09:00'), d3 = new Date('2026-11-26T00:10:00+09:00');
  assert.deepEqual(B.run('today', p, { now: d1 }).facts, B.run('today', p, { now: d2 }).facts);
  assert.notEqual(B.run('today', p, { now: d1 }).facts.date, B.run('today', p, { now: d3 }).facts.date);
  assert.deepEqual(B.run('omikuji', p, { now: d1 }).facts, B.run('omikuji', p, { now: d2 }).facts);
  assert.equal(B.run('today', p, { now: d1 }).facts.dayKanshi, B.cal.kanshiOfIndex(B.cal.dayIndex(2026, 11, 25)).name);
});
t('統合：同じ系統（星座とホロスコープ）は二重に数えず、出典を必ず書く。引く占いは入れない', () => {
  const pl = B.texts.PLACES.find(x => x.name === '東京都');
  const p = { id: 'x', blood: 'A', birth: { date: '1990-05-05', time: '08:00', place: pl } };
  const rs = ['numerology', 'zodiac', 'horoscope', 'kyusei', 'shichu', 'blood', 'eto'].map(id => B.run(id, p)).concat([B.run('tarot', p, { seed: 's' })]);
  const s = B.integrate(rs);
  assert.ok(!s.methods.includes('星座占い') && s.methods.includes('ホロスコープ'));
  assert.ok(!s.methods.includes('タロット'));
  for (const e of s.common) { assert.ok(e.n >= 2); assert.equal(new Set(e.from.map(f => f.method)).size, e.n); }
  for (const x of s.text) for (const src of x.src) assert.ok(rs.some(r => r.ok && r.themes.some(th => th.src === src)), '出典が結果に無い: ' + src);
  assert.equal(s.generatedBy, 'template');
  assert.ok(s.text.at(-1).s.includes('科学的に確かめられたことではありません'));
});
t('テーマは決まった語彙だけ（すべての占術・いろいろな日付）', () => {
  const pl = B.texts.PLACES[12];
  for (let y = 1950; y <= 2020; y += 7) for (const md of ['01-03', '04-17', '08-08', '12-31']) {
    const p = { blood: 'O', birth: { date: y + '-' + md, time: '05:40', place: pl } };
    for (const m of B.methods.list()) { const r = B.run(m.id, p, { seed: y + md }); if (r.ok) for (const th of r.themes) assert.ok(B.texts.THEMES[th.tag]); }
  }
});
t('保存：本人が「保存する」を選んだときだけ端末に書く。全部消せる', () => {
  const ls = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; }, removeItem(k) { delete this.d[k]; } };
  const st = B.createStore(ls);
  st.saveProfile({ v: 1, consent: { store: false, photo: false }, people: [{ id: 'a' }] });
  assert.equal(ls.d['bansho.profile.v1'], undefined); assert.equal(st.profile().people.length, 1); // その場だけ（メモリ）
  st.saveProfile({ v: 1, consent: { store: true, photo: false }, people: [{ id: 'a' }] });
  assert.ok(ls.d['bansho.profile.v1']);
  st.addReading({ at: 'x', methods: [] }, true); assert.equal(st.book().readings.length, 1);
  st.clearAll(); assert.deepEqual(Object.keys(ls.d), []); assert.equal(st.book().readings.length, 0);
});
t('占術の追加：同じ id は断り、語彙に無いテーマは断る', () => {
  assert.throws(() => B.methods.register({ id: 'tarot', compute() {} }));
  B.methods.register({ id: 'test-bad', name: 'x', compute: () => ({ themes: [{ tag: 'nope' }] }) });
  const r = B.run('test-bad', {}); assert.equal(r.themes.length, 0); assert.equal(r.dropped, 1);
});
console.log(`banshodo-core: ${n} 件 ok`);
