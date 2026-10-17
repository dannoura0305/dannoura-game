// 小さな JSON スキーマの検査（mapkit・charkit 共通の 1 つだけの実装）。依存なし・DOM なし（node と ブラウザの両方で使える）。
// 使う機能だけ：type（配列も）・required・enum・const・pattern・minimum/maximum・minItems/maxItems・minLength・
//   items・properties・additionalProperties（スキーマ or false）・allOf・anyOf・oneOf・$ref（内部 #/... と、登録した $id）。
// format は JSON Schema 2020-12 の既定と同じく「注釈」として扱い、検査しない（空文字の日付などを許す）。
// 戻り値：{ valid, errors: [{ path, msg }] }。path は '/license/commercial' の形。

const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const isType = (v, t) => t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : t === 'object' ? typeOf(v) === 'object' : typeOf(v) === t;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 登録簿：$id → スキーマ。createRegistry(s1, s2, ...) */
export function createRegistry(...schemas) {
  const map = new Map();
  for (const s of schemas.flat()) { if (!s || !s.$id) throw new Error('スキーマに $id がありません'); map.set(s.$id, s); }
  return map;
}

function pointer(root, frag) {
  if (!frag || frag === '#') return root;
  let o = root;
  for (const raw of frag.replace(/^#\/?/, '').split('/')) {
    const k = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (o == null || !(k in o)) return undefined;
    o = o[k];
  }
  return o;
}

function resolveRef(ref, root, registry) {
  const [id, frag] = ref.split('#');
  const base = id ? registry && registry.get(id) : root;
  if (!base) return { error: `$ref の先が見つかりません: ${ref}` };
  const s = pointer(base, frag ? '#' + frag : '#');
  if (s === undefined) return { error: `$ref の先が見つかりません: ${ref}` };
  return { schema: s, root: base };
}

function check(schema, v, path, root, registry, errors) {
  if (schema === true || schema === undefined) return;
  if (schema === false) { errors.push({ path, msg: 'ここには値を置けません' }); return; }
  if (schema.$ref) {
    const r = resolveRef(schema.$ref, root, registry);
    if (r.error) errors.push({ path, msg: r.error }); else check(r.schema, v, path, r.root, registry, errors);
  }
  if (schema.allOf) for (const s of schema.allOf) check(s, v, path, root, registry, errors);
  if (schema.anyOf || schema.oneOf) {
    const list = schema.anyOf || schema.oneOf;
    const okN = list.filter(s => { const e = []; check(s, v, path, root, registry, e); return !e.length; }).length;
    if (schema.anyOf && okN === 0) errors.push({ path, msg: 'anyOf のどれにも合いません' });
    if (schema.oneOf && okN !== 1) errors.push({ path, msg: `oneOf にちょうど 1 つ合う必要があります（${okN} 個）` });
  }
  if (schema.type) {
    const ts = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!ts.some(t => isType(v, t))) { errors.push({ path, msg: `型が違います（${ts.join('|')} のはずが ${typeOf(v)}）` }); return; }
  }
  if ('const' in schema && !eq(schema.const, v)) errors.push({ path, msg: `値は ${JSON.stringify(schema.const)} のはず` });
  if (schema.enum && !schema.enum.some(e => eq(e, v))) errors.push({ path, msg: `値 ${JSON.stringify(v)} は ${schema.enum.map(e => JSON.stringify(e)).join(' / ')} のどれでもありません` });
  if (typeof v === 'number') {
    if (schema.minimum !== undefined && v < schema.minimum) errors.push({ path, msg: `${v} は最小 ${schema.minimum} より小さい` });
    if (schema.maximum !== undefined && v > schema.maximum) errors.push({ path, msg: `${v} は最大 ${schema.maximum} より大きい` });
    if (schema.exclusiveMinimum !== undefined && v <= schema.exclusiveMinimum) errors.push({ path, msg: `${v} は ${schema.exclusiveMinimum} より大きいはず` });
  }
  if (typeof v === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(v)) errors.push({ path, msg: `「${v}」は形 ${schema.pattern} に合いません` });
    if (schema.minLength !== undefined && v.length < schema.minLength) errors.push({ path, msg: `文字数が ${schema.minLength} より少ない` });
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined && v.length < schema.minItems) errors.push({ path, msg: `要素が ${schema.minItems} 個より少ない（${v.length}）` });
    if (schema.maxItems !== undefined && v.length > schema.maxItems) errors.push({ path, msg: `要素が ${schema.maxItems} 個より多い（${v.length}）` });
    if (schema.items) v.forEach((x, i) => check(schema.items, x, `${path}/${i}`, root, registry, errors));
  }
  if (typeOf(v) === 'object') {
    for (const k of schema.required || []) if (!(k in v)) errors.push({ path: `${path}/${k}`, msg: '必須の欄がありません' });
    const props = schema.properties || {};
    for (const [k, x] of Object.entries(v)) {
      if (k in props) check(props[k], x, `${path}/${k}`, root, registry, errors);
      else if (schema.additionalProperties !== undefined) check(schema.additionalProperties, x, `${path}/${k}`, root, registry, errors);
    }
  }
}

/** schema（オブジェクト or 登録簿の $id）で data を検査 */
export function validate(schema, data, { registry } = {}) {
  if (typeof schema === 'string') { const s = registry && registry.get(schema); if (!s) throw new Error('登録されていないスキーマ: ' + schema); schema = s; }
  const errors = [];
  check(schema, data, '', schema, registry, errors);
  return { valid: errors.length === 0, errors };
}

/** 人が読む 1 行ずつの文字列に */
export const formatErrors = errors => errors.map(e => `${e.path || '/'}: ${e.msg}`);
