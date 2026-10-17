// 共通のスキーマの一覧と登録簿の作り方。ファイルの読み方は呼ぶ側が渡す（node は fs・ブラウザは fetch）。
//   node：  const reg = await loadRegistry(p => JSON.parse(readFileSync(join(ROOT, p), 'utf8')));
//   ブラウザ：const reg = await loadRegistry(p => fetch(new URL('../../' + p, import.meta.url)).then(r => r.json()));
import { createRegistry } from './schema.js';

/** $id → リポジトリの根からの場所。スキーマの正本はコードと一緒に置く（素材ライブラリの置き場所が決まっても動かさない） */
export const SCHEMA_FILES = {
  'wakaba-assets/asset-meta.schema.json': 'mapkit/schema/asset-meta.schema.json',
  'mapkit/schema/map-spec.schema.json': 'mapkit/schema/map-spec.schema.json',
  'mapkit/schema/map-report.schema.json': 'mapkit/schema/map-report.schema.json',
  'mapkit/schema/map-layout.schema.json': 'mapkit/schema/map-layout.schema.json',
  'wakaba-assets/asset-sources.schema.json': 'mapkit/schema/asset-sources.schema.json',
  'wakaba-assets/ue5-import.schema.json': 'mapkit/schema/ue5-import.schema.json',
  'charkit/schema/character.schema.json': 'charkit/schema/character.schema.json',
  'charkit/schema/anim-meta.schema.json': 'charkit/schema/anim-meta.schema.json',
};
export const IDS = {
  asset: 'wakaba-assets/asset-meta.schema.json',
  mapSpec: 'mapkit/schema/map-spec.schema.json',
  mapReport: 'mapkit/schema/map-report.schema.json',
  mapLayout: 'mapkit/schema/map-layout.schema.json',
  assetSources: 'wakaba-assets/asset-sources.schema.json',
  ue5Import: 'wakaba-assets/ue5-import.schema.json',
  character: 'charkit/schema/character.schema.json',
  anim: 'charkit/schema/anim-meta.schema.json',
};

export async function loadRegistry(readJson) {
  const list = await Promise.all(Object.values(SCHEMA_FILES).map(p => readJson(p)));
  return createRegistry(list);
}

/** データの形から種類を当てる（CLI 用）：'mapSpec'|'mapReport'|'mapLayout'|'assetSources'|'ue5Import'|'character'|'anim'|'asset'|null */
export function detectKind(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.layout === 'wakaba-map-layout/1') return 'mapLayout';
  if (d.sources === 'wakaba-asset-sources/1') return 'assetSources';
  if (d.ue5import === 'wakaba-ue5-import/1') return 'ue5Import';
  if (d.spec === 'wakaba-map/1') return 'mapSpec';
  if (d.report === 'wakaba-map-report/1') return 'mapReport';
  if (d.spec === 'wakaba-char/1') return 'character';
  if (d.category === 'animation' || d.anim) return 'anim';
  if (d.category && d.license) return 'asset';
  return null;
}
