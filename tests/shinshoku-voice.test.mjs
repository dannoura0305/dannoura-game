// 『境界侵食』演出の台詞の声（VOICEVOX で作った音声・core/voice.js・tools/voice/）。2026-11-10
// 対応表：演出の声のある行すべてに音声がある・話し手と文のハッシュが合う・地の文（sys）とト書きには無い・使われない音声が無い。
// 時間：声に合わせて延ばしても、各場面は元の +30% 以内・台詞と出来事の並びは変わらない。クレジット：使った声はすべて表記。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CutscenePlayer, duration, voiceWarp } from '../shinshoku/story/cutscene.js';
import { voiceHash, voiceText, voiceKey, voiceLensFor, NO_VOICE_WHO } from '../shinshoku/core/voice.js';
import { CREDITS } from '../shinshoku/data/ch7.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const R = p => new URL('../' + p, import.meta.url);
const VDIR = R('shinshoku/assets/voice/');
const man = JSON.parse(readFileSync(new URL('manifest.json', VDIR), 'utf8'));
const VO = JSON.parse(readFileSync(R('tools/voice/voices.json'), 'utf8'));
const all = Object.values(CUTSCENES);

t('ハッシュ：同じ文は同じ値・文が一字でも違えば別の値（FNV-1a 32bit・8 桁）', () => {
  assert.equal(voiceHash('dan', '停電、かしら'), voiceHash('dan', '停電、かしら'));
  assert.notEqual(voiceHash('dan', '停電、かしら'), voiceHash('dan', '停電かしら'));
  assert.notEqual(voiceHash('dan', 'はい'), voiceHash('companion', 'はい'));
  assert.match(voiceHash('a', 'b'), /^[0-9a-f]{8}$/);
});
t('読む文：sys・全体が（ ）のト書き・「……」だけは声なし。頭の（放送）等は読まない', () => {
  assert.equal(voiceText('sys', '（テレビは砂嵐）'), '');
  assert.equal(voiceText('companion', '（悲鳴）'), '');
  assert.equal(voiceText('dan', '（……戻らなきゃ）'), '');
  assert.equal(voiceText('child', '…………'), '');
  assert.equal(voiceText('pa', '（放送）点呼を、はじめます'), '点呼を、はじめます');
  assert.equal(voiceText('mimic', '「こっちよ。早く」'), 'こっちよ。早く');
  assert.equal(voiceText('dan', '停電、かしら'), '停電、かしら');
});
t('対応表：声のある行すべてに音声（ハッシュ一致・ファイルあり・長さあり）。sys とト書きには無い', () => {
  let need = 0;
  for (const cs of all) (cs.lines || []).forEach((l, i) => {
    const k = voiceKey(cs.id, i), e = man.lines[k];
    if (!voiceText(l.who, l.text)) { assert.ok(!e, '声の無い行に音声: ' + k); return; }
    need++;
    assert.ok(e, '音声が無い: ' + k + ' ' + l.text);
    assert.equal(e.h, voiceHash(l.who, l.text), 'ハッシュが合わない（文が変わった？ tools/voice/gen.mjs で作り直す）: ' + k);
    assert.ok(e.f.includes(e.h) && existsSync(new URL(e.f, VDIR)), 'ファイル: ' + e.f);
    assert.ok(e.d > 0.2 && e.d < 12, '長さ: ' + k);
    assert.ok(!NO_VOICE_WHO.has(l.who));
  });
  assert.equal(Object.keys(man.lines).length, need, '対応表に、今の演出に無い行がある');
  assert.ok(need >= 220, '声のある行 ' + need);
});
t('音声のファイル：mp3（Safari でも鳴る）・1 本 64KB 以下・合計 4MB 以下・対応表に無い mp3 は置かない', () => {
  const used = new Set(Object.values(man.lines).map(e => e.f)); let total = 0;
  for (const f of readdirSync(VDIR)) {
    if (f === 'manifest.json') continue;
    assert.ok(f.endsWith('.mp3') && used.has(f), '余分なファイル: ' + f);
    const b = readFileSync(new URL(f, VDIR)), sz = statSync(new URL(f, VDIR)).size; total += sz;
    assert.ok(sz < 64 * 1024, f + ' ' + sz);
    assert.ok((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), 'mp3 でない: ' + f);
  }
  assert.ok(total < 4 * 1048576, '合計 ' + (total / 1048576).toFixed(2) + 'MB');
  assert.ok(statSync(new URL('manifest.json', VDIR)).size < 40 * 1024);
});
t('声の割り当て：話し手すべてに声がある（sys を除く）・だんのうらは男性の声（玄野武宏）・相棒は女性の声', () => {
  const whos = new Set(); for (const cs of all) for (const l of cs.lines || []) if (voiceText(l.who, l.text)) whos.add(l.who);
  for (const w of whos) assert.ok(VO.who[w], '割り当てが無い: ' + w);
  assert.equal(VO.who.dan.voice, '玄野武宏'); assert.equal(VO.who.companion.voice, '冥鳴ひまり');
  for (const k of Object.keys(VO.overrides)) { const [id, i] = k.split('#'); assert.ok(CUTSCENES[id] && CUTSCENES[id].lines[+i], '上書きの行が無い: ' + k); }
});
t('クレジット：使った声はすべて「VOICEVOX:名前」でスタッフロール・タイトルの注記・VOICE_CREDITS.md に。字幕のみ・声なしの表記は消えた', () => {
  const used = new Set([...Object.values(VO.who), ...Object.values(VO.overrides)].map(v => v.voice).filter(Boolean));
  const title = readFileSync(R('shinshoku.html'), 'utf8'), doc = readFileSync(R('docs/shinshoku/VOICE_CREDITS.md'), 'utf8');
  for (const v of used) {
    assert.ok(CREDITS.lines.some(([, s]) => s === 'VOICEVOX:' + v), 'スタッフロール: ' + v);
    assert.ok(title.includes('VOICEVOX:' + v), 'タイトル: ' + v);
    assert.ok(doc.includes('VOICEVOX:' + v), 'VOICE_CREDITS.md: ' + v);
  }
  assert.ok(!CREDITS.lines.some(([, s]) => /声なし/.test(s)));
  assert.ok(!/九条/.test(JSON.stringify(VO) + doc));
});
t('時間：声に合わせて延ばしても、各場面は元の +30% 以内・並びは変わらない・声は次の行（場面の終わり）までにほぼ収まる', () => {
  let over = [];
  for (const cs of all) {
    const lens = voiceLensFor(cs, man), r = voiceWarp(cs, lens), D0 = duration(cs), D1 = duration(r.cs);
    assert.ok(D1 <= D0 * 1.3 + 0.05, cs.id + ' ' + D0 + '→' + D1);
    assert.ok(D1 >= D0 - 1e-6);
    for (const key of ['cam', 'lines', 'events', 'actors', 'sounds']) {
      const a = cs[key] || [], b = r.cs[key] || []; assert.equal(a.length, b.length);
      for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) if (a[i].t < a[j].t) assert.ok(b[i].t <= b[j].t + 1e-9, cs.id + ' ' + key + ' の並び');
    }
    r.cs.lines.forEach((l, i) => {
      assert.equal(l.text, cs.lines[i].text); assert.equal(l.who, cs.lines[i].who);   // 文は変えない
      if (!lens[i]) return;
      assert.ok(l.dur >= cs.lines[i].dur);
      const nx = r.cs.lines.filter(m => m.t > l.t + 1e-6).reduce((a, m) => Math.min(a, m.t), D1);
      if (lens[i] > nx - l.t + 0.05) over.push(cs.id + '#' + i + ' ' + (lens[i] - (nx - l.t)).toFixed(2));
    });
  }
  assert.ok(over.length <= 4, '声が次の行に食い込む: ' + over.join(', '));
  assert.equal(voiceWarp(CUTSCENES.cs00_tv, CUTSCENES.cs00_tv.lines.map(() => 0)).cs, CUTSCENES.cs00_tv, '声なしなら元のまま');
});
t('再生する人：host.voiceLens があれば延ばした場面を再生・無ければ今のまま。字幕は必ず出る', () => {
  const calls = [];
  const host = { setCam() {}, subtitle(w, s, L) { calls.push([w, s, L && L.t]); }, letterbox() {}, event() {}, actor() {}, sound() {}, done() {}, shot: () => ({ pos: [0, 1.6, 0], look: [0, 1.4, 1], fov: 40, ci: 0 }) };
  const cs = CUTSCENES.cs01_reunion, lens = voiceLensFor(cs, man), before = JSON.stringify(cs);
  const P0 = new CutscenePlayer(host); P0.play(cs); const d0 = P0.dur;
  const P1 = new CutscenePlayer(Object.assign({}, host, { voiceLens: () => lens })); P1.play(cs);
  assert.ok(P1.dur > d0 && P1.dur <= d0 * 1.3 + 0.05);
  calls.length = 0; while (P1.active) P1.update(1 / 30);
  const shown = calls.filter(c => c[1]).map(c => c[1]);
  for (const l of cs.lines) if (l.who !== 'sys') assert.ok(shown.includes(l.text), '字幕: ' + l.text);
  assert.equal(JSON.stringify(cs), before, '元のデータは変えない');
});
t('読み込み：起動時に音声を読まない（対応表は後で・音声は演出の直前にその分だけ）・飛ばしで止める・設定に声の入切と音量', () => {
  const main = readFileSync(R('shinshoku/main.js'), 'utf8'), story = readFileSync(R('shinshoku/game/story.js'), 'utf8'), ui = readFileSync(R('shinshoku/ui/ui.js'), 'utf8'), voice = readFileSync(R('shinshoku/core/voice.js'), 'utf8');
  assert.ok(!/\.mp3/.test(main + story));
  assert.match(main, /setTimeout\(\(\) => \{ if \(this\.settings\.voiceOn !== false\) this\.voice\.loadManifest\(\); \}, \d+\)/);
  assert.match(story, /V\.preload\(cs\)/); assert.match(story, /g\.cut\.skipped\) g\.voice\.stop\(\)/);
  assert.match(ui, /data-s="voiceOn"/); assert.match(ui, /data-s="voiceVol"/);
  assert.match(main, /voiceOn: true, voiceVol: 0\.9/);
  assert.match(voice, /setOn\(on\) \{ this\.on = !!on; if \(!on\) this\.stop\(\); \}/);
});
console.log(`shinshoku-voice: ${n} passed`);
