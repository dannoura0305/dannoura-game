// 画質の段（docs/wakaba-mapkit/07 §6.1）。DOM・three.js なし・純粋関数（node で試験）。
// autoPreset は境界侵食の shinshoku/render/quality.js から移した（作品側は再輸出するだけ・挙動は同じ）。
// MAP_PRESETS は地図（mapkit.html）用の段：07 §6.1 の ultra／high／mid／low の上限（描画呼び出し・三角形）と、仮の形（灰色の箱）で効く値。
// ultra の数値は目標（実機の計測で直す）。フェーズ 3（写実）で足した値：texMax（材質のテクスチャの辺の上限）・lodScale（LOD の距離の倍率）・
// post（ブルーム・周辺減光＝PC の高い段だけ）・terrainLayers（地面の塗り分けの層の数）・triplanar（崖の三面投影）・leaves（落ち葉の数）・wind（葉の揺れ）・
// grassDensity（下草の 1 点あたりの株の数）・shadowRange（影の範囲 m）・lodMin（使う一番細かい LOD：スマホは LOD1 から）・
// shadowSmall: false（小物・建物の部品は影を落とさない＝影の描画の呼び出しを減らす。木・建物の網・地形は落とす）。

/** 端末の様子から段を選ぶ。env = { touch, w, h, dpr, cores, mem } → 'high'|'mid'|'low'（ultra は自動では選ばない＝利用者が選ぶ） */
export function autoPreset(env = {}) {
  const small = Math.min(env.w || 1280, env.h || 800) < 560;
  if (env.touch && small) return 'low';
  if (env.touch) return 'mid';
  if ((env.cores && env.cores <= 2) || (env.mem && env.mem <= 2)) return 'low';
  if ((env.cores && env.cores <= 4) || (env.dpr && env.dpr >= 2.5 && (env.w || 0) * (env.h || 0) > 2e6)) return 'mid';
  return 'high';
}

export const MAP_PRESETS = {
  ultra: { label: '最高（RTX 3060 Ti 級）', drawCalls: 400, tris: 1500000, texMB: 1200, resScale: 1, antialias: true, shadows: true, shadowSize: 2048, shadowRange: 55, terrainStep: 1, grass: 1.0, grassFar: 55, grassDensity: 4, treeFar: 220, far: 400, fps: 60,
    texMax: 1024, lodScale: 1.35, post: { bloom: true, vignette: true, msaa: true }, terrainLayers: 6, triplanar: true, leaves: 90, wind: true, envMap: true },
  high: { label: '高（PC）', drawCalls: 250, tris: 800000, texMB: 800, resScale: 1, antialias: true, shadows: true, shadowSize: 1024, shadowRange: 40, terrainStep: 1, grass: 1.0, grassFar: 40, grassDensity: 3, treeFar: 180, far: 320, fps: 60,
    texMax: 1024, lodScale: 1.0, post: { bloom: true, vignette: true }, terrainLayers: 6, triplanar: true, leaves: 60, wind: true, envMap: true },
  mid: { label: '中', drawCalls: 160, tris: 400000, texMB: 400, resScale: 0.85, antialias: false, shadows: true, shadowSize: 512, shadowRange: 30, terrainStep: 2, grass: 0.5, grassFar: 30, grassDensity: 2, treeFar: 140, far: 240, fps: 30,
    texMax: 512, lodScale: 0.8, post: null, terrainLayers: 6, triplanar: true, leaves: 25, wind: true, envMap: true, shadowSmall: false },
  low: { label: '低（スマホ）', drawCalls: 120, tris: 200000, texMB: 150, resScale: 0.62, antialias: false, shadows: false, shadowSize: 0, shadowRange: 0, terrainStep: 2, grass: 0, grassFar: 0, grassDensity: 0, treeFar: 110, far: 180, fps: 30,
    texMax: 256, lodScale: 0.6, post: null, terrainLayers: 4, triplanar: false, leaves: 0, wind: false, envMap: true, lodMin: 1 },
};
export const MAP_PRESET_KEYS = ['ultra', 'high', 'mid', 'low'];

/** 予算の判定（07 §6.1）：{ pass, over:[項目] } */
export function checkBudget(preset, m) {
  const p = MAP_PRESETS[preset]; if (!p) return { pass: false, over: ['preset'] };
  const over = [];
  if (m.drawCalls != null && m.drawCalls > p.drawCalls) over.push('drawCalls');
  if (m.tris != null && m.tris > p.tris) over.push('tris');
  if (m.texMB != null && m.texMB > p.texMB) over.push('texMB');
  return { pass: over.length === 0, over };
}

/** テクスチャ 1 枚の GPU の量（バイト・RGBA8・mip 込み＝×4/3） */
export function texBytes(w, h = w, mips = true) { return Math.round(w * h * 4 * (mips ? 4 / 3 : 1)); }

/** 材質の組（目録の material）を段で読む時の大きさ（辺）：sizes の中で texMax 以下の一番大きい物。ファイルが無い大きさは飛ばす */
export function pickTexSize(sizes, texMax, available = null) {
  const ok = (sizes || []).filter(s => s <= texMax && (!available || available.includes(s))).sort((a, b) => b - a);
  return ok.length ? ok[0] : Math.min(...(sizes || [256]));
}

/**
 * GPU のテクスチャの量の見積もり（MB）。mats＝[{ sizes, maps: { albedo: {辺: file}, normal, orh } }]。地面の配列（層の数×3 枚）も足す。
 * 実際の量は renderer.info.memory.textures の数と、この式で play_map.mjs が書く
 */
export function estimateTexMB(mats, preset = 'high', terrain = { layers: 6, size: 1024 }) {
  const P = MAP_PRESETS[preset] || MAP_PRESETS.high;
  let b = 0;
  for (const m of mats || []) for (const [k, bySize] of Object.entries(m.maps || {})) {
    const s = pickTexSize(Object.keys(bySize).map(Number), P.texMax);
    b += texBytes(s);
    void k;
  }
  if (terrain) { const ts = Math.min(terrain.size || 1024, P.texMax); b += texBytes(ts) * (P.terrainLayers || terrain.layers) * 3; }
  return Math.round(b / 1048576 * 10) / 10;
}

/**
 * 描画の量の見積もり（フェーズ 3 の写実の描画＝mapkit/runtime/scene.js の作り方と同じ数え方。実際の数は play_map.mjs が renderer.info で測る）。
 * 建物：手続きの網は材質ごとに 1 つ（≈10）＋部品（kit）は種類×LOD×材質ごとにインスタンス 1 つ。木・岩・小物：種類×種類違い×LOD×材質。
 * 見える範囲で使われる組だけが描かれるので、全部の組の 55%（スマホは LOD1 から＝少ない）を見積もりにする。影がある段は影を落とす物をもう 1 回。
 */
export function estimateBudget(layout, preset = 'high') {
  const P = MAP_PRESETS[preset] || MAP_PRESETS.high;
  const kinds = new Set((layout.objects || []).map(o => o.kind));
  const lods = P.lodMin ? 1 : 2, prims = 1.6;
  const kitCalls = Math.round(kinds.size * lods * prims * 0.55) + Math.round(8 * lods * prims * 0.55);   // 8＝建物の部品の種類（壁・柱・棟・格子・障子・本殿・鳥居・灯籠）
  const trees = (layout.objects || []).filter(o => o.cls === 'tree').length;
  const grass = (layout.instances || []).reduce((s, i) => s + i.count, 0) * P.grass;
  const nTerr = (layout.terrain.nx - 1) / P.terrainStep, terrTris = nTerr * nTerr * 2;
  const bldMats = 10;
  const opaque = 1 + 1 + bldMats + kitCalls + (grass ? 2 : 0) + (P.leaves ? 1 : 0) + 1 + 2 + 2;   // 地形・空・建物・部品・草とシダ・落ち葉・電線・人・道案内
  const drawCalls = opaque + (P.shadows ? bldMats + Math.round(kitCalls * 0.6) : 0) + (P.post ? 7 : 0);
  const near = Math.min(trees, 60), far = trees - near;
  const tris = Math.round(terrTris + near * 900 + far * 6 + 40000 + grass * P.grassDensity * Math.min(1, (P.grassFar * P.grassFar * Math.PI) / (layout.size[0] * layout.size[1])) * 6 + 2000);
  return { drawCalls, tris, texMB: estimateTexMB([], preset, { layers: P.terrainLayers, size: 1024 }) + 60 * (P.texMax / 1024) ** 2 };
}
