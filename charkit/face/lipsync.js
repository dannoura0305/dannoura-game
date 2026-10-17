// 文字 → 母音の口（日本語）。docs/wakaba-charkit/13 §1.3（口のずれ ±40ms）・06 の expressions.lipsync（mode:"text_vowel"）。純粋関数・DOM なし。
// 字幕の文字を「拍（モーラ）」に分け、拍ごとに母音（a・i・u・e・o）か口を閉じる（ん・っ・句読点）を当て、字幕の表示時間に並べる。
// VRM の口の表情の名前：aa・ih・ou・ee・oh。漢字は読みが分からないので、文字の番号で決まる母音を 2 拍ぶん当てる（同じ文なら毎回同じ口）。

const ROW = {
  a: 'あかさたなはまやらわがざだばぱぁゃゎアカサタナハマヤラワガザダバパァャヮヵ',
  i: 'いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィ',
  u: 'うくすつぬふむゆるぐずづぶぷぅゅゔウクスツヌフムユルグズヅブプゥュヴ',
  e: 'えけせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェヶ',
  o: 'おこそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョ',
};
const VOWEL_OF = new Map();
for (const [v, s] of Object.entries(ROW)) for (const ch of s) VOWEL_OF.set(ch, v);
const SMALL = new Set([...'ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ']);
const PURE = new Set([...'あいうえおアイウエオ']);
export const VISEME = { a: 'aa', i: 'ih', u: 'ou', e: 'ee', o: 'oh' };
export const VOWELS = ['a', 'i', 'u', 'e', 'o'];
/** 1 拍の長さの目安（秒）。日本語のふつうの話す速さ：毎秒 7〜8 拍 */
export const MORA_S = 0.13;

/** 1 文字の母音。'n'＝ん（口を閉じ気味）、'q'＝っ（止まる）、'-'＝のばす、' '＝間（句読点・空白）、null＝読まない記号 */
export function vowelOf(ch) {
  if (VOWEL_OF.has(ch)) return VOWEL_OF.get(ch);
  if (ch === 'ん' || ch === 'ン') return 'n';
  if (ch === 'っ' || ch === 'ッ') return 'q';
  if (ch === 'ー' || ch === '〜' || ch === '～') return '-';
  if (/[、。，．,.!?！？…‥「」『』（）()　\s]/.test(ch)) return ' ';
  if (/[A-Za-z]/.test(ch)) return 'aeiou'.includes(ch.toLowerCase()) ? ch.toLowerCase() : null;
  if (/[0-9０-９]/.test(ch)) return 'i';
  if (/[一-鿿々]/.test(ch)) return 'kanji';
  return null;
}

/** 文字列 → 拍の並び [{ v: 'a'|'i'|'u'|'e'|'o'|'n'|'q'|' ', w: 重さ（拍の数） }] */
export function morae(text) {
  const out = [];
  const chars = [...String(text || '')];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], v = vowelOf(ch);
    if (v == null) continue;
    if (SMALL.has(ch) && out.length && VOWELS.includes(out[out.length - 1].v)) { out[out.length - 1].v = VOWEL_OF.get(ch); continue; }   // きゃ → a（前の拍に重ねる）
    if (v === '-') { if (out.length) out.push({ v: out[out.length - 1].v === ' ' ? ' ' : out[out.length - 1].v, w: 1 }); continue; }
    if (v === 'kanji') { const c = ch.codePointAt(0); out.push({ v: VOWELS[c % 5], w: 1, c: true }, { v: VOWELS[(c >> 3) % 5], w: 1, c: true }); continue; }
    if (v === ' ') { if (out.length && out[out.length - 1].v === ' ') out[out.length - 1].w += 1; else out.push({ v: ' ', w: /[、，,]/.test(ch) ? 1.5 : /[。．.!?！？…]/.test(ch) ? 2.5 : 1 }); continue; }
    out.push({ v, w: v === 'q' ? 0.8 : 1, c: !PURE.has(ch) });   // c：子音で始まる（拍の始めに口が少し閉じる）
  }
  while (out.length && out[out.length - 1].v === ' ') out.pop();
  while (out.length && out[0].v === ' ') out.shift();
  return out;
}

/**
 * 時間の並びを作る。dur：字幕の表示時間（秒）。話す速さは MORA_S を基準に、字幕の時間に収まるよう縮める（伸ばしはしない：
 * 余った時間は口を閉じて待つ＝字幕が出てから話し終わるまで）。offset：口の始まりのずれ（秒・＋で遅らせる）。
 * 戻り値：{ keys:[{ t0, t1, v }], end }（v は 'a'…'o' または 'n'・'q'・' '）
 */
export function timeline(text, dur = 2, opt = {}) {
  const M = morae(text);
  const total = M.reduce((s, m) => s + m.w, 0);
  const speak = Math.max(0.2, dur * (opt.fill ?? 0.92));
  const per = total > 0 ? Math.min(opt.moraS ?? MORA_S, speak / total) : MORA_S;
  let t = opt.offset || 0; const keys = [];
  for (let i = 0; i < M.length; i++) { const m = M[i], d = per * m.w; keys.push({ t0: t, t1: t + d, v: m.v, c: !!m.c, nc: !!(M[i + 1] && M[i + 1].c) }); t += d; }
  return { keys, end: t, per };
}

/**
 * 時刻 t の口の重み { aa, ih, ou, ee, oh }（0〜1）。母音は拍の始めで立ち上がり、次の拍へなめらかにつなぐ。
 * attack：立ち上がりの時間（秒・口の形の重みが 0.5 を超えるまでの遅れを ±40ms に収める）。gain：大きさ。
 */
export function weightsAt(tl, t, opt = {}) {
  const w = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  if (!tl || !tl.keys.length || t < tl.keys[0].t0 - 0.05 || t > tl.end + 0.12) return w;
  const gain = opt.gain ?? 0.9, attack = opt.attack ?? 0.05, release = opt.release ?? 0.07;
  for (const k of tl.keys) {
    if (!VOWELS.includes(k.v)) continue;
    // 子音で始まる拍は拍の始めから少し遅れて開く（子音の間は閉じ気味）。次が子音なら拍の終わりの少し前から閉じ始める
    const a0 = k.c ? k.t0 - 0.02 : k.t0 - attack, a1 = k.c ? k.t0 + 0.04 : k.t0;
    const rel = k.nc ? Math.min(release, 0.05) : release;
    const r0 = k.nc ? k.t1 - 0.03 : k.t1, r1 = r0 + rel;
    if (t < a0 || t > r1) continue;
    let a;
    if (t < a1) a = (t - a0) / (a1 - a0);
    else if (t <= r0) a = 1;
    else a = 1 - (t - r0) / rel;
    a = Math.max(0, Math.min(1, a));
    const key = VISEME[k.v];
    // 「い」「え」は口の開きが小さい。o・u は丸い
    const amp = k.v === 'a' ? 1 : k.v === 'o' ? 0.85 : k.v === 'e' ? 0.75 : k.v === 'i' ? 0.6 : 0.7;
    w[key] = Math.max(w[key], a * amp * gain);
  }
  return w;
}

/** 重みの中でいちばん大きい口と 2 番目（顔の絵の口の欄の切り替えに使う） */
export function topTwo(w) {
  const arr = Object.entries(w).sort((a, b) => b[1] - a[1]);
  return { a: arr[0][1] > 0.02 ? arr[0][0] : null, wa: arr[0][1], b: arr[1][1] > 0.02 ? arr[1][0] : null, wb: arr[1][1] };
}

/** 口の重みが 0.5 を超える時刻（試験：母音の始まりとのずれ） */
export function onsetTimes(tl, opt = {}, step = 0.001) {
  const out = [];
  tl.keys.forEach((k, i) => {
    if (!VOWELS.includes(k.v)) return;
    const prev = tl.keys[i - 1];
    if (prev && prev.v === k.v && !k.c) return;                   // 同じ母音が続く（あ→あ）：口は開いたまま＝始まりが無い
    const key = VISEME[k.v];
    let armed = !(prev && prev.v === k.v);                        // 同じ母音の後は、いったん閉じてから開く所を探す
    const from = prev ? Math.max(k.t0 - 0.06, (prev.t0 + prev.t1) / 2) : k.t0 - 0.06;   // 前の拍の自分の開きを拾わない
    for (let t = from; t <= k.t1; t += step) { const w = weightsAt(tl, t, opt)[key]; if (w <= 0.5) armed = true; else if (armed) { out.push({ v: k.v, t0: k.t0, onset: t }); break; } }
  });
  return out;
}
