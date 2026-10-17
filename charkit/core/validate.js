// charkit の検査：キャラクターの設定（wakaba-char/1）とモーションのメタデータ（anim）。純粋関数・DOM なし。
// JSON スキーマの検査そのものは共通の mapkit/core/schema.js（1 つだけの実装）を使い、ここは charkit の中身のつながりを見る。
import { validate } from '../../mapkit/core/schema.js';
import { IDS } from '../../mapkit/core/schemas.js';
import { isHumanBone, extBones, matchBones, checkSkeleton, FINGERS } from '../rig/bonemap.js';
import { checkCombatRef, resolvePath } from '../anim/combatfit.js';

export { validate };

/** 材質の名前の規則（docs/wakaba-charkit/06 §4） */
export const MATERIAL_RE = /^(skin|face|eye_iris|eye_white|eye_hl|brow|mouth|hair|(cloth|metal|acc|glass)_[a-z0-9_]+)$/;
/** 補正の形の名前：cor_<骨>_<軸><符号><角度> */
export const CORRECTIVE_RE = /^cor_([A-Za-z]+)_([xyz])([+-])(\d+)$/;
/** 男性の体の基準で要る寸法（デザインの検査で女性の体つきに寄らないかを見るため） */
export const MASCULINE_METRICS = ['shoulderWidthM', 'hipWidthM', 'heightM', 'headsTall'];
/** モーションの組（docs/wakaba-charkit/07 §2） */
export const ANIM_GROUPS = ['idle', 'loco', 'trav', 'int', 'cmb', 'react', 'gest', 'face', 'cin'];

/** personality の数値の欄を「点つきの道」で全部 */
function personalityKeys(p) {
  const out = [];
  for (const [sec, v] of Object.entries(p || {})) if (v && typeof v === 'object' && !Array.isArray(v) && sec !== 'states') for (const [k, x] of Object.entries(v)) if (typeof x === 'number') out.push(`${sec}.${k}`);
  return out;
}
/** states のキー（"walkSpeed" か "gesture.amount"）を personality の道へ。見つからなければ null（14 §4.3） */
export function resolveStateKey(personality, key) {
  const all = personalityKeys(personality);
  if (key.includes('.')) return all.includes(key) ? key : null;
  const hits = all.filter(k => k.endsWith('.' + key));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * キャラクターの設定を検査。opt.fileExists(name)：forms の file が有るか（無いのは注意だけ・まだ作っていない）。
 * 戻り値：{ valid, errors:[{path,msg}], warnings:[{path,msg}] }
 */
export function validateCharacter(cfg, registry, opt = {}) {
  const v = validate(IDS.character, cfg, { registry });
  if (!v.valid) return { valid: false, errors: v.errors, warnings: [] };
  const errors = [], warnings = [];
  const E = (path, msg) => errors.push({ path, msg }), W = (path, msg) => warnings.push({ path, msg });
  const body = cfg.body || {}, canon = cfg.canon || {};
  // 設定の正本と体の作り（例：だんのうらは男性。mustKeep に「男性」があるのに sex が male でなければ誤り）
  if ((canon.mustKeep || []).some(s => /男性/.test(s)) && body.sex !== 'male') E('/body/sex', 'canon.mustKeep に「男性」があるのに body.sex が male ではありません');
  if ((canon.mustKeep || []).some(s => /女性/.test(s)) && body.sex !== 'female') E('/body/sex', 'canon.mustKeep に「女性」があるのに body.sex が female ではありません');
  if (body.sex === 'male') {
    for (const k of MASCULINE_METRICS) if (body[k] === undefined) E(`/body/${k}`, '男性の体の基準の寸法がありません（女性の体つきに寄らないかの検査に使う）');
    if (body.shoulderWidthM !== undefined && body.hipWidthM !== undefined) {
      const r = body.shoulderWidthM / body.hipWidthM;
      if (r <= 1.0) E('/body', `肩幅 ÷ 腰幅 = ${r.toFixed(2)}：男性の体の基準（肩幅 > 腰幅）に合いません`);
      else if (r < 1.1) W('/body', `肩幅 ÷ 腰幅 = ${r.toFixed(2)}：男性としては腰が広め（三面図で確かめる）`);
    }
    if (!(canon.mustNot || []).some(s => /女性/.test(s))) W('/canon/mustNot', '男性のキャラクター：「女性の体つきにしない」を mustNot に書いておくとよい');
  }
  // 姿（forms）
  for (const [id, f] of Object.entries(cfg.forms || {})) {
    if (f.file && opt.fileExists && !opt.fileExists(f.file)) W(`/forms/${id}/file`, `モデル ${f.file} はまだありません（作るまでコード製の仮の姿）`);
    for (const e of extBones(f.extraBones || [])) if (e.error) E(`/forms/${id}/extraBones`, `${e.name}：${e.error}`);
    for (const n of f.extraBones || []) if (!n.startsWith('ext_') && !n.startsWith('socket_')) E(`/forms/${id}/extraBones`, `${n}：追加の骨は ext_（または socket_）で始める`);
  }
  // 陰影の材質の名前
  for (const k of Object.keys((cfg.shader || {}).materials || {})) if (!MATERIAL_RE.test(k)) E(`/shader/materials/${k}`, '材質の名前の規則（skin・face・eye_iris・hair・cloth_<部位>・metal_<部位>・acc_<部位>・glass_<部位> など）に合いません');
  // 補正の形
  (cfg.correctives || []).forEach((c, i) => {
    const m = CORRECTIVE_RE.exec(c.shape);
    if (!m) { E(`/correctives/${i}/shape`, `「${c.shape}」は cor_<骨>_<軸><符号><角度> の形ではありません`); return; }
    if (m[1] !== c.bone) E(`/correctives/${i}`, `名前の骨 ${m[1]} と bone ${c.bone} が違います`);
    if (m[2] !== c.axis) E(`/correctives/${i}`, `名前の軸 ${m[2]} と axis ${c.axis} が違います`);
    if (Number(m[3] + m[4]) !== c.toDeg) W(`/correctives/${i}`, `名前の角度 ${m[3]}${m[4]} と toDeg ${c.toDeg} が違います`);
    if (!isHumanBone(c.bone)) E(`/correctives/${i}/bone`, `${c.bone} は VRM の humanoid の骨の名前ではありません`);
  });
  (cfg.colliders || []).forEach((c, i) => { if (!isHumanBone(c.bone) && !c.bone.startsWith('ext_')) E(`/colliders/${i}/bone`, `${c.bone} は VRM の骨の名前でも ext_ でもありません`); });
  // 性格の状態（states）のキーが実在の値を指すか
  const P = cfg.personality || {};
  for (const [st, mods] of Object.entries(P.states || {})) for (const k of Object.keys(mods || {})) if (!resolveStateKey(P, k)) E(`/personality/states/${st}/${k}`, `「${k}」は personality の数値の欄を指していません（点つきの道か、一意な短い名前）`);
  for (const [id, f] of Object.entries(cfg.forms || {})) if (f.personalityOverride) for (const [sec, o] of Object.entries(f.personalityOverride)) for (const k of Object.keys(o || {})) if (!(P[sec] && k in P[sec])) W(`/forms/${id}/personalityOverride/${sec}/${k}`, '元の personality に無い欄を上書きしています');
  // license は門（mapkit/assets/gate.js）で見る。ここでは AI が verifiedBy を書いていないかだけ
  if (cfg.license && /claude|codex|grok|\bai\b/i.test(cfg.license.verifiedBy || '')) E('/license/verifiedBy', 'verifiedBy は人だけが書く（AI の名前が入っています）');
  return { valid: errors.length === 0, errors, warnings };
}

/** モデルの骨の名前（glTF のノード名）を、設定と標準骨格に照らす */
export function checkModelBones(names, cfg = null, opt = {}) {
  const errors = [], warnings = [];
  const found = matchBones(names, opt.map || {}, { extended: true, profile: opt.profile, strict: true });
  const sk = checkSkeleton(found);
  if (sk.missingRequired.length) errors.push({ path: '/skeleton', msg: '必須の骨がありません：' + sk.missingRequired.join(', ') });
  if (sk.missingRecommended.length) (opt.requireRecommended ? errors : warnings).push({ path: '/skeleton', msg: `推奨（本基盤では必須）の骨が ${sk.missingRecommended.length} 本ありません：` + sk.missingRecommended.slice(0, 8).join(', ') + (sk.missingRecommended.length > 8 ? '…' : '') });
  const ext = extBones(names);
  for (const e of ext) if (e.error) errors.push({ path: '/ext', msg: `${e.name}：${e.error}` });
  if (cfg) for (const [id, f] of Object.entries(cfg.forms || {})) if (!opt.form || opt.form === id) for (const n of f.extraBones || []) if (!names.includes(n)) warnings.push({ path: `/forms/${id}/extraBones`, msg: `${n} がモデルにありません` });
  return { valid: errors.length === 0, errors, warnings, found, skeleton: sk, fingers: sk.fingers, fingersTotal: FINGERS.length, ext: ext.filter(e => !e.error) };
}

/**
 * モーションのメタデータ（anim-meta）を検査。opt.combat（{ file → モジュールの書き出し }）を渡すと combatRef を照合する。
 * 戻り値：{ valid, errors, warnings, combat?: checkCombatRef の結果 }
 */
export function validateAnim(meta, registry, opt = {}) {
  const v = validate(IDS.anim, meta, { registry });
  if (!v.valid) return { valid: false, errors: v.errors, warnings: [] };
  const errors = [], warnings = [];
  const E = (path, msg) => errors.push({ path, msg }), W = (path, msg) => warnings.push({ path, msg });
  const a = meta.anim, name = meta.id.replace(/^anim\./, '');
  if (!meta.id.startsWith('anim.')) E('/id', 'モーションの id は anim.<名前>');
  else if (!ANIM_GROUPS.includes(name.split('_')[0])) E('/id', `組「${name.split('_')[0]}」は ${ANIM_GROUPS.join('/')} のどれでもありません（<組>_<動き>[_<向き・段>][_<変種>]）`);
  if (a.durationS !== undefined && Math.abs(a.durationS - a.frames / a.fps) > 0.01) E('/anim/durationS', `durationS ${a.durationS} が frames / fps = ${(a.frames / a.fps).toFixed(3)} と合いません`);
  (a.events || []).forEach((e, i) => { if (e.frame > a.frames) E(`/anim/events/${i}`, `こま ${e.frame} がクリップの長さ ${a.frames} を超えています`); });
  for (const [k, list] of Object.entries(a.contacts || {})) list.forEach(([s, t], i) => { if (s > t || t > a.frames) E(`/anim/contacts/${k}/${i}`, `区間 [${s}, ${t}] が逆か長さ ${a.frames} を超えています`); });
  const q = a.quality || {};
  if (q.human != null && q.reviewedBy !== undefined && !String(q.reviewedBy).trim()) W('/anim/quality/reviewedBy', '人の点数があるのに reviewedBy が空');
  if (q.score !== undefined && q.auto !== undefined) {
    const want = q.human == null ? q.auto : 0.4 * q.auto + 0.6 * q.human * 20;
    if (Math.abs(q.score - want) > 0.5) E('/anim/quality/score', `score ${q.score} が式（human が無ければ auto、あれば 0.4×auto＋0.6×human×20）の ${want} と合いません`);
  }
  if (a.loop && /_(start|stop|land|draw)/.test(name)) W('/anim/loop', 'ループにしない種類の名前に見えます');
  let combat;
  if (a.combatRef) {
    const mod = opt.combat && opt.combat[a.combatRef.file];
    if (!mod) W('/anim/combatRef', `戦闘の数字 ${a.combatRef.file} を読んでいないので照合していません`);
    else {
      const data = resolvePath(mod, a.combatRef.path);
      if (!data) E('/anim/combatRef/path', `${a.combatRef.file} に ${a.combatRef.path} がありません`);
      else {
        combat = checkCombatRef(a, data);
        if (!combat.ok && combat.fitOk) W('/anim/combatRef', '戦闘の数字とこまがずれています（区間ごとの伸縮で合わせる）：' + combat.diffs.join('／'));
        if (!combat.fitOk) E('/anim/combatRef', '戦闘の数字に合わせられません（作り直し）：' + combat.diffs.concat(combat.fit.errors).join('／'));
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings, combat };
}
