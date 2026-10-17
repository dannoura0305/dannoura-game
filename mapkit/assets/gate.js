// ライセンス門（mapkit・charkit 共通の 1 つの門）。素材メタデータ（wakaba-assets/asset-meta.schema.json v1.1）を、
// 作品の条件（wakaba.config.json の projects.<id>）と配信先（targets）に照らして pass／block を決める。純粋関数・DOM なし。
// 規則：docs/wakaba-mapkit/07 §3.1（素材）＋ docs/wakaba-charkit/07 §4（権利：同意・他人の映像・SMPL・研究用 AI・Mixamo/Fab を Web・人の点数）。
// AI は license.verifiedBy を書かない（人が確かめた印）。門は「止める」側に倒す：分からない物は通さない。

/** 理由の符号と文（日本語） */
export const RULES = {
  SCHEMA: 'メタデータがスキーマに合いません',
  MISSING: '作品が使うと書いた素材が目録（またはファイル）に見つからない',
  LICENSE_UNKNOWN: 'license.id が unknown（または空）：自動では使わない（quarantine）',
  COMMERCIAL_UNKNOWN: 'license.commercial が unknown：商用に使えるか分からない',
  UNVERIFIED: 'license.verifiedBy が空：人がライセンスを確かめるまで使わない（AI は記入しない）',
  NON_COMMERCIAL: '商用不可（commercial: no）だが、作品は商用（または未定＝商用として扱う）',
  NO_WEB_REDIST: '配信先が公開の Web だが、素のファイルの再配布が yes ではない：Web の書き出しに入れない（PC 版だけ可・要確認）',
  KNOWN_NO_WEB: 'Mixamo・Fab・Megascans など、素のファイルを Web で配れない（または未確認の）出どころ：Web の書き出しに入れない（UE5 の PC 版＝非公開の配信先なら license 次第で可）',
  ENGINE: 'license.engines に配信先のエンジンも any も無い',
  AI_MODEL_MISSING: 'source.type が ai_generated だが source.aiModel（モデル名・版・規約）が空',
  REGION_LIMIT: 'license.regionLimit がある：人に確認するまで止める',
  STATUS: 'status が quarantine／retired',
  NO_CONSENT: '自分で撮影（self_capture）だが license.performerConsent（演者の同意の記録）が空',
  FOREIGN_VIDEO: '元の映像が他人の物（source.type: unknown、または出典の URL が自分の場所でない）：作品に使わない',
  SMPL_DEP: 'SMPL／SMPL-X などの模型を通しているが、商用の許可（deps[].licensed: true）が無い（作品が商用か未定）',
  COMPARISON_ONLY: '研究用（非商用）の AI を通した、または use が「比較のみ」：作品に入れない（比較用だけ）',
  NO_HUMAN_SCORE: 'quality.human（人の点数）が空：作品の本番の束に入れない',
};

/** リポジトリの中の道具（tools/…）で手続きで作った自作の素材か（docs/wakaba-mapkit/11 §4）。
 * 外の権利者がいない（原本＝リポジトリのスクリプト）ので、verifiedBy が空でも止めず「注意（UNVERIFIED_GENERATED）」にする。
 * 条件：source.type self_made・source.generator が tools/ の下・license.id が own か project・商用 yes・再配布 yes。人が確かめたら verifiedBy を書く（AI は書かない） */
export function isRepoGenerated(meta) {
  const m = meta || {}, L = m.license || {}, S = m.source || {};
  return S.type === 'self_made' && /^tools\/[A-Za-z0-9_./-]+$/.test(String(S.generator || '')) && !/\.\./.test(String(S.generator)) && ['own', 'project'].includes(low(L.id)) && L.commercial === 'yes' && L.redistributeRaw === 'yes';
}

/** 商用の許可が別に要る体の模型（小文字で比べる） */
export const RESTRICTED_DEPS = ['smpl', 'smpl-x', 'smplx', 'smpl-h', 'smplh', 'smplify', 'smplify-x', 'mano', 'flame', 'star'];
/** 研究用（非商用）とされる動画 → 動きの AI（docs/wakaba-charkit/02・09）。規約は変わるので source.aiCommercial を人が書くのが正 */
export const RESEARCH_AI = ['gvhmr', 'wham', '4d-humans', '4dhumans', 'tram', 'humor'];

const low = s => String(s || '').toLowerCase();
const blank = s => !String(s || '').trim();

/** wakaba.config.json と作品の id・配信先の id から門の条件を作る */
export function makeContext(config, projectId, { target, stage = 'production' } = {}) {
  const p = (config && config.projects && config.projects[projectId]) || {};
  const targets = p.targets && p.targets.length ? p.targets : [{ id: 'web', engine: 'threejs', public: true }];
  const t = typeof target === 'object' && target ? target : (targets.find(x => x.id === target) || targets[0]);
  return {
    project: projectId || null,
    commercial: p.commercial !== false,          // true・"unknown"・未記入は「商用」として扱う（厳しい側）
    ownDomains: (p.ownDomains || []).map(low),
    target: { id: t.id, engine: t.engine || 'threejs', public: t.public !== false },
    settings: t.settings || {},                     // 配信先ごとの書き出しの設定（形式・テクスチャの上限など。catalog.mjs が使う）
    stage,                                          // production（本番の束）／dev（開発中の試し）
  };
}

function depId(d) { return low(typeof d === 'string' ? d : d && d.id); }
function isForeignUrl(url, own) {
  if (blank(url)) return false;
  let u; try { u = new URL(url); } catch (e) { return false; }   // NAS:/… など自分の場所の書き方
  if (!/^https?:$/.test(u.protocol)) return false;
  const h = low(u.hostname);
  return !own.some(d => h === d || h.endsWith('.' + d));
}

/**
 * 1 件の素材メタデータを門に通す。opt.schemaErrors（スキーマ検査の結果）を渡すと SCHEMA で止める。
 * 戻り値：{ id, category, result: 'pass'|'block', reasons:[{code,msg}], warnings:[{code,msg}], credits: {id,text}|null }
 */
export function evaluate(meta, ctx, opt = {}) {
  const m = meta || {}, L = m.license || {}, S = m.source || {}, cat = m.category;
  const reasons = [], warnings = [];
  const block = (code, extra) => reasons.push({ code, msg: RULES[code] + (extra ? `（${extra}）` : '') });
  const warn = (code, msg) => warnings.push({ code, msg });
  const shipped = cat !== 'motion_source';        // 撮影の元の動画などは配らない（Web・エンジンの規則は当てない）

  if (opt.schemaErrors && opt.schemaErrors.length) block('SCHEMA', opt.schemaErrors.slice(0, 3).map(e => `${e.path || '/'} ${e.msg}`).join('／'));
  // ── mapkit 07 §3.1
  if (blank(L.id) || low(L.id) === 'unknown') block('LICENSE_UNKNOWN');
  if (blank(L.commercial) || L.commercial === 'unknown') block('COMMERCIAL_UNKNOWN');
  if (blank(L.verifiedBy)) { if (isRepoGenerated(m)) warn('UNVERIFIED_GENERATED', `リポジトリの道具（${S.generator}）で作った自作：外の権利者はいない。人が確かめたら license.verifiedBy を書く`); else block('UNVERIFIED'); }
  if (L.commercial === 'no' && ctx.commercial) block('NON_COMMERCIAL');
  if (shipped && ctx.target.public && L.redistributeRaw !== 'yes') block('NO_WEB_REDIST', `redistributeRaw: ${L.redistributeRaw || '空'}`);
  const mixamo = [L.id, S.url, S.author].some(x => /mixamo/i.test(String(x || '')));
  const fab = S.type === 'fab' || /^fab/i.test(String(L.id || '')) || /(^|\.)fab\.com/i.test(String(S.url || ''));
  const megascans = [L.id, S.url, S.author].some(x => /megascans|quixel/i.test(String(x || '')));
  if (shipped && ctx.target.public && (mixamo || fab || megascans)) block('KNOWN_NO_WEB', mixamo ? 'Mixamo' : fab ? 'Fab' : 'Megascans');
  const engines = L.engines || [];
  if (shipped && !engines.includes('any') && !engines.includes(ctx.target.engine)) block('ENGINE', `配信先 ${ctx.target.engine}`);
  if (S.type === 'ai_generated' && blank(S.aiModel)) block('AI_MODEL_MISSING');
  if (!blank(L.regionLimit)) block('REGION_LIMIT', L.regionLimit);
  if (m.status === 'quarantine' || m.status === 'retired') block('STATUS', m.status);
  // ── charkit 07 §4（権利）
  if (S.type === 'self_capture' && blank(L.performerConsent)) block('NO_CONSENT');
  if (cat === 'motion_source' && (S.type === 'unknown' || isForeignUrl(S.url, ctx.ownDomains))) block('FOREIGN_VIDEO', S.url || S.type);
  const restricted = (L.deps || []).filter(d => RESTRICTED_DEPS.includes(depId(d)) && !(typeof d === 'object' && d.licensed === true));
  if (restricted.length && ctx.commercial) block('SMPL_DEP', restricted.map(depId).join(', '));
  const research = RESEARCH_AI.find(a => low(S.aiModel).includes(a));
  if (S.aiCommercial === 'no' || (research && S.aiCommercial !== 'yes') || (m.use || []).includes('比較のみ')) block('COMPARISON_ONLY', research || S.aiModel || '比較のみ');
  if (cat === 'animation') {
    const human = m.anim && m.anim.quality ? m.anim.quality.human : null;
    if (human == null) { if (ctx.stage === 'production') block('NO_HUMAN_SCORE'); else warn('NO_HUMAN_SCORE', RULES.NO_HUMAN_SCORE); }
  }
  if (S.aiCommercial === 'unknown' && !blank(S.aiModel)) warn('AI_TERMS', '通した AI の規約（商用可否）が未確認');

  const credits = blank(L.attribution) ? null : { id: m.id, text: L.attribution };
  return { id: m.id || null, category: cat || null, result: reasons.length ? 'block' : 'pass', reasons, warnings, credits };
}

/** キャラクターの設定（<id>.character.json）の license を同じ門に通す。人の点数の規則は当てない */
export function evaluateCharacter(config, ctx, opt = {}) {
  const c = config || {};
  const meta = { id: 'char.' + (c.id || 'unknown'), category: 'character', source: c.source || { type: 'self_made' }, license: c.license || {}, status: 'draft' };
  return evaluate(meta, ctx, opt);
}

/** 作品の全部の配信先（web・ue5 など）で門に通す：{ <target id>: evaluate の結果 }。方式 C（同じ素材を両方の版で使う）の目録用 */
export function evaluateTargets(meta, config, projectId, opt = {}) {
  const p = (config && config.projects && config.projects[projectId]) || {};
  const targets = p.targets && p.targets.length ? p.targets : [{ id: 'web', engine: 'threejs', public: true }];
  const out = {};
  for (const t of targets) {
    const ctx = makeContext(config, projectId, { target: t.id, stage: opt.stage || 'production' });
    out[t.id] = meta && meta.spec === 'wakaba-char/1' ? evaluateCharacter(meta, ctx, opt) : evaluate(meta, ctx, opt);
  }
  return out;
}

/** 結果の束 → license-gate.json の形 */
export function summarize(results, ctx, at = new Date().toISOString()) {
  const pass = results.filter(r => r.result === 'pass').length;
  return {
    gate: 'wakaba-license-gate/1', at, project: ctx.project, target: ctx.target, commercial: ctx.commercial, stage: ctx.stage,
    summary: { total: results.length, pass, block: results.length - pass },
    results,
    credits: results.filter(r => r.result === 'pass' && r.credits).map(r => r.credits),
  };
}
