// 検証レポート（wakaba-map-report/1）の形・検査・人が読む md への変換。純粋関数・DOM なし（ファイルへの書き出しはフェーズ 2 の build_map.mjs）。
// docs/wakaba-mapkit/07 §7。約束：check が "human" の条件は pass を null のまま（AI は通ったと書かない）。
import { validate } from '../core/schema.js';
import { IDS } from '../core/schemas.js';

/** 空のレポート（auto の各欄は「まだ測っていない」＝ pass: null） */
export function makeReport({ map, seed, specHash = undefined, builder = 'claude-code', builtAt = new Date().toISOString() }) {
  const r = {
    report: 'wakaba-map-report/1', map, seed, builtAt, builder,
    auto: {
      deterministic: { pass: null }, keepOut: { pass: null, violations: [] }, float: { pass: null, items: [] }, overlap: { pass: null, items: [] },
      reach: { pass: null, goals: {}, unreachable: [] }, interiors: { pass: null }, license: { pass: null, blocked: [] },
      budget: { pass: null }, perf: { device: 'swiftshader', fps: null, note: '実機で測る' },
    },
    conditions: [], gaps: [], fixes: [],
  };
  if (specHash) r.specHash = specHash;
  return r;
}

/** スキーマ＋約束（人が見る項目に pass を書いていない・auto の結果と items の食い違い） */
export function validateReport(rep, registry) {
  const v = validate(IDS.mapReport, rep, { registry });
  const errors = v.errors.slice(), warnings = [];
  (rep.conditions || []).forEach((c, i) => { if (c.check === 'human' && c.pass !== null) errors.push({ path: `/conditions/${i}/pass`, msg: '人が見る項目（check: human）に pass が書かれています：AI は null のまま人へ渡す' }); });
  for (const k of ['float', 'overlap']) { const a = (rep.auto || {})[k]; if (a && a.pass === true && (a.items || []).length) warnings.push({ path: `/auto/${k}`, msg: 'pass なのに items がある（理由付きで許したか確かめる）' }); }
  const reach = (rep.auto || {}).reach; if (reach && reach.pass === true && (reach.unreachable || []).length) errors.push({ path: '/auto/reach', msg: '届かない目的地があるのに pass' });
  return { valid: errors.length === 0, errors, warnings };
}

const mark = p => p === true ? '✅ 合格' : p === false ? '❌ 不合格' : '⏳ 未判定';
/** 人が読む md */
export function reportToMarkdown(rep) {
  const L = [`# 検証レポート：${rep.map}`, '', `- 種：\`${rep.seed}\`／作成：${rep.builtAt}（${rep.builder}）${rep.specHash ? `／仕様：\`${rep.specHash.slice(0, 19)}…\`` : ''}`, '', '## 自動の検査', '', '| 項目 | 結果 | 中身 |', '|---|---|---|'];
  for (const [k, v] of Object.entries(rep.auto || {})) {
    const { pass, ...rest } = v || {};
    L.push(`| ${k} | ${k === 'perf' ? '（参考）' : mark(pass)} | ${JSON.stringify(rest).replace(/\|/g, '\\|').slice(0, 160)} |`);
  }
  L.push('', '## 条件', '', '| 条件 | 確かめ方 | 結果 | 根拠 |', '|---|---|---|---|');
  for (const c of rep.conditions || []) L.push(`| ${c.text} | ${c.check === 'human' ? '人が見る' : '自動'} | ${mark(c.pass)} | ${c.evidence || ''} |`);
  if ((rep.gaps || []).length) { L.push('', '## 足りない素材（計画のみ・承認待ち）', ''); for (const g of rep.gaps) L.push(`- \`${g.need}\`：${g.plan}（${g.status}）`); }
  if ((rep.fixes || []).length) { L.push('', '## 直し方の案', ''); for (const f of rep.fixes) L.push(`- ${f.issue} → ${f.proposal}${f.auto ? '（自動で直せる）' : ''}`); }
  return L.join('\n') + '\n';
}
