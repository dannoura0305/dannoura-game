// 戦闘のクリップと作品の戦闘の数字（60Hz のこま）の照合。純粋関数。docs/wakaba-charkit/07 §5・14 §4.4。
// 遊びの数字（shinshoku/data/combat.js など）が正。合わない時はクリップの方を区間ごとに伸縮する（倍率 0.6〜1.6 の外は作り直しの印）。
export const GAME_FPS = 60;
export const SCALE_MIN = 0.6, SCALE_MAX = 1.6;

/** "COMBAT.katana.light[0]" のような道で、モジュールの書き出し（または任意のオブジェクト）から値を取り出す。無ければ undefined */
export function resolvePath(root, path) {
  let o = root;
  for (const tok of String(path).match(/[^.[\]]+/g) || []) { if (o == null) return undefined; o = o[/^\d+$/.test(tok) ? Number(tok) : tok]; }
  return o;
}

/**
 * クリップの印（hitStart・hitEnd・全長）と data の { startup, active, recovery }（60Hz のこま）から、区間ごとの時間の対応を作る。
 * events：[{ t, frame }]、frames：クリップの全こま数、fps：クリップのこまの速さ（30|60）。
 * 戻り値：{ map: [[srcT, dstT], ...]（秒）, scales: [s1, s2, s3], ok, errors }
 */
export function fitSegments(events, frames, fps, data) {
  const errors = [];
  const at = t => { const e = (events || []).find(x => x.t === t); return e ? e.frame / fps : null; };
  const hs = at('hitStart'), he = at('hitEnd'), total = frames / fps;
  if (hs == null) errors.push('hitStart の印がありません');
  if (he == null) errors.push('hitEnd の印がありません');
  if (!data || !Number.isFinite(data.startup) || !Number.isFinite(data.active)) errors.push('戦闘の数字（startup・active）がありません');
  if (errors.length) return { map: [], scales: [], ok: false, errors };
  const rec = Number.isFinite(data.recovery) ? data.recovery : 0;
  const d1 = data.startup / GAME_FPS, d2 = (data.startup + data.active) / GAME_FPS, d3 = (data.startup + data.active + rec) / GAME_FPS;
  const src = [0, hs, he, total], dst = [0, d1, d2, d3];
  const scales = [0, 1, 2].map(i => { const s = src[i + 1] - src[i]; return s > 0 ? (dst[i + 1] - dst[i]) / s : Infinity; });
  const ok = scales.every(s => s >= SCALE_MIN && s <= SCALE_MAX);
  if (!ok) errors.push(`伸縮の倍率 ${scales.map(s => s.toFixed(2)).join('・')} に ${SCALE_MIN}〜${SCALE_MAX} の外がある：作り直しの印`);
  return { map: src.map((s, i) => [s, dst[i]]), scales, ok, errors };
}

/** 根の動きの踏み込みの距離を data.lunge（m）に合わせる倍率 */
export const lungeScale = (rootDistM, lungeM) => rootDistM > 1e-6 ? lungeM / rootDistM : 1;

/**
 * モーションのメタデータ（anim）が戦闘の数字と合っているかを見る（伸縮の前の照合）。
 * 一致の条件：hitStart のこま＝startup、hitEnd＝startup＋active、全長＝startup＋active＋recovery（60Hz に直して比べる）。
 * 戻り値：{ ok（伸縮なしで一致）, fitOk（伸縮で合わせられる）, expected, actual, diffs:[文], fit }
 */
export function checkCombatRef(anim, data) {
  const fps = anim.fps || GAME_FPS, k = GAME_FPS / fps;
  const ev = t => { const e = (anim.events || []).find(x => x.t === t); return e ? e.frame * k : null; };
  const expected = { hitStart: data.startup, hitEnd: data.startup + data.active, total: data.startup + data.active + (data.recovery || 0) };
  const actual = { hitStart: ev('hitStart'), hitEnd: ev('hitEnd'), total: anim.frames * k };
  const diffs = [];
  for (const key of ['hitStart', 'hitEnd', 'total']) if (actual[key] !== expected[key]) diffs.push(`${key}：クリップ ${actual[key] == null ? 'なし' : actual[key]}／戦闘の数字 ${expected[key]}（60Hz のこま）`);
  const fit = fitSegments(anim.events, anim.frames, fps, data);
  return { ok: diffs.length === 0, fitOk: fit.ok, expected, actual, diffs, fit };
}
