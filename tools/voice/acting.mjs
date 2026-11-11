// 演技の付け方（tools/voice/gen.mjs から使う）。VOICEVOX の audio_query（accent_phrases）を直接いじって、
// 間（読点・「……」・「——」）・語尾の上げ下げ・溜め・叫びの強さを作る。行ごとの指定は acting.json。
//
// 1 行の指定（acting.json の lines["場面id#行の番号"]）：
//   a: 型（acting.json の presets の名前。例 "sad"・"whisper"・"shout"）。型の値に、行の値を重ねる
//   speed・pitch・intonation：声の割り当て（voices.json）に掛ける・足す（speed と intonation は倍率、pitch は足す）
//   volume：音量の倍率（音量をそろえた後に掛ける。0.7＝ささやき、1.25＝叫び）
//   pause：間の倍率（読点・「……」の間をまとめて伸び縮み）。pre・post：前後の無音（秒）
//   tail：語尾 "down"（つぶやき・言い切って沈む）・"up"（呼びかけ・問い）・"fall"（強く言い切る）・"trail"（消え入る）
//   stretch：語尾の母音を伸ばす倍率（溜め・「……」で終わる）
//   style：声の種類 { "声の名前": スタイル id }（型の style に重ねる）
//   ph：句ごとの調整 [{ i: 句の番号（負は後ろから）, pitch: 足す, k: 抑揚の倍率, len: 長さの倍率, pause: その句の後の間（秒） }]
//   why：その演技にした理由（場面の文脈）

/** 読む文から、句読点のまとまり（間の種類）を取り出す。頭の「……」（lead）・終わりの「……」「！」「？」（end）は別に返す */
export function punctGroups(s) {
  const re = /[、。！？!?…—\s　]+/g, out = []; let m, lead = null, end = null;
  while ((m = re.exec(s))) {
    const g = m[0], kind = /[…]/.test(g) ? 'ellipsis' : /—/.test(g) ? 'dash' : /[？?]/.test(g) ? 'q' : /[！!]/.test(g) ? 'excl' : /。/.test(g) ? 'period' : /、/.test(g) ? 'comma' : /\s/.test(g.replace(/　/g, '')) ? 'comma' : null;
    if (!kind) continue;                                           // 全角の空白だけは間にしない
    if (m.index === 0) { lead = kind; continue; }
    if (m.index + g.length === s.length) { end = kind === 'ellipsis' || /…/.test(g) ? 'ellipsis' : /[！!]/.test(g) ? 'excl' : /[？?]/.test(g) ? 'q' : kind; continue; }
    out.push(kind);
  }
  return { mid: out, lead, end };
}
export const PAUSE = { comma: 0.22, period: 0.4, excl: 0.3, q: 0.34, ellipsis: 0.52, dash: 0.45 };   // 間の長さ（秒・型の pause で伸び縮み）。元は全部 0.35〜0.42 の同じ長さだった

/** 型と行の指定を重ねる */
export function specOf(presets, line, voiceName) {
  const base = (line && line.a && presets[line.a]) || {}, s = Object.assign({}, base, line || {});
  const style = Object.assign({}, base.style || {}, (line && line.style) || {});
  s.styleId = style[voiceName];
  return s;
}

const voiced = m => m.pitch > 0;
function phraseScale(ap, k) {                                      // 句の中の抑揚を k 倍（平均の高さを中心に）
  const v = ap.moras.filter(voiced); if (!v.length || k === 1) return;
  const mean = v.reduce((a, m) => a + m.pitch, 0) / v.length;
  for (const m of v) m.pitch = mean + (m.pitch - mean) * k;
}
/**
 * audio_query に演技を付ける（その場で書き換える）。g = punctGroups(読む前の文)、s = specOf(...)
 * 返り値：句読点と間の対応が合ったか（合わない時は間の種類を付けず、間の倍率だけ掛ける）
 */
export function applyActing(q, g, s) {
  const AP = q.accent_phrases, pauses = AP.filter(ap => ap.pause_mora), ps = s.pause ?? 1;
  const aligned = pauses.length === g.mid.length;
  pauses.forEach((ap, i) => { ap.pause_mora.vowel_length = (aligned ? PAUSE[g.mid[i]] : ap.pause_mora.vowel_length) * ps; });
  // 「——」の後の句は少し強く（言い切る）
  if (aligned) AP.forEach((ap, i) => { if (ap.pause_mora && g.mid[pauses.indexOf(ap)] === 'dash' && AP[i + 1]) phraseScale(AP[i + 1], 1.25); });
  // 頭の「……」：言いよどんでから話す。終わりの「……」：消え入る（語尾を伸ばして下げる）
  q.prePhonemeLength = (s.pre ?? 0.05) + (g.lead === 'ellipsis' ? 0.22 * ps : 0);
  q.postPhonemeLength = (s.post ?? 0.12) + (g.end === 'ellipsis' ? 0.15 : 0);
  const last = AP[AP.length - 1], lv = last ? last.moras.filter(voiced) : [];
  let tail = s.tail || (g.end === 'ellipsis' ? 'trail' : g.end === 'excl' ? 'fall' : null), stretch = s.stretch ?? (g.end === 'ellipsis' ? 1.35 : 1);
  if (g.end === 'excl') { for (const ap of AP) phraseScale(ap, 1.15); if (last) phraseScale(last, 1.2); }   // 「！」は句の抑揚を強く
  if (last && lv.length) {
    const n = lv.length, fin = lv[n - 1];
    if (tail === 'down' || tail === 'trail') lv.forEach((m, i) => { m.pitch -= (tail === 'trail' ? 0.16 : 0.1) * Math.pow((i + 1) / n, 1.5); });
    if (tail === 'up') { fin.pitch += 0.14; if (n > 1) lv[n - 2].pitch += 0.04; }
    if (tail === 'fall') { if (n > 1) lv[0].pitch += 0.05; fin.pitch -= 0.06; }
    if (stretch !== 1) fin.vowel_length *= stretch;
  }
  for (const e of s.ph || []) {                                     // 句ごとの調整
    const ap = AP[e.i < 0 ? AP.length + e.i : e.i]; if (!ap) continue;
    if (e.k) phraseScale(ap, e.k);
    for (const m of ap.moras) { if (e.pitch && voiced(m)) m.pitch += e.pitch; if (e.len) { m.vowel_length *= e.len; if (m.consonant_length) m.consonant_length *= e.len; } }
    if (e.pause != null && ap.pause_mora) ap.pause_mora.vowel_length = e.pause;
  }
  return aligned;
}
