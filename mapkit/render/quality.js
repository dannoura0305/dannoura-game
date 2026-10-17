// 画質の段（docs/wakaba-mapkit/07 §6.1）。DOM・three.js なし・純粋関数（node で試験）。
// autoPreset は境界侵食の shinshoku/render/quality.js から移した（作品側は再輸出するだけ・挙動は同じ）。
// MAP_PRESETS は地図（mapkit.html）用の段：07 §6.1 の ultra／high／mid／low の上限（描画呼び出し・三角形）と、仮の形（灰色の箱）で効く値。
// ultra の数値は目標（フェーズ 3 で実機の計測で直す）。草・影・見える距離は仮の形の時の値。

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
  ultra: { label: '最高（RTX 3060 Ti 級）', drawCalls: 400, tris: 1500000, texMB: 1200, resScale: 1, antialias: true, shadows: true, shadowSize: 2048, terrainStep: 1, grass: 1.0, grassFar: 60, treeFar: 220, far: 400, fps: 60 },
  high: { label: '高（PC）', drawCalls: 250, tris: 800000, texMB: 800, resScale: 1, antialias: true, shadows: true, shadowSize: 1024, terrainStep: 1, grass: 0.6, grassFar: 40, treeFar: 180, far: 320, fps: 60 },
  mid: { label: '中', drawCalls: 160, tris: 400000, texMB: 400, resScale: 0.85, antialias: false, shadows: true, shadowSize: 512, terrainStep: 2, grass: 0.25, grassFar: 30, treeFar: 140, far: 240, fps: 30 },
  low: { label: '低（スマホ）', drawCalls: 120, tris: 200000, texMB: 150, resScale: 0.62, antialias: false, shadows: false, shadowSize: 0, terrainStep: 2, grass: 0, grassFar: 0, treeFar: 110, far: 180, fps: 30 },
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

/**
 * 描画の量の見積もり（mapkit/runtime/scene.js の作り方と同じ数え方）。実際の数は play_map.mjs が renderer.info で測る。
 * 建物は材質ごとに 1 つへまとめる・木/岩/小物/草は種類ごとにインスタンス 1 つ・地形 1 つ・空 1・人 2・道案内 2。影がある段は影を落とす物をもう 1 回。
 */
export function estimateBudget(layout, preset = 'high') {
  const P = MAP_PRESETS[preset] || MAP_PRESETS.high;
  const mats = new Set(); let partTris = 0;
  for (const b of layout.buildings || []) for (const p of b.parts || []) if (p.visible !== false) { mats.add(p.mat); partTris += p.shape === 'cyl' ? 32 : p.shape === 'gable' ? 8 : 12; }
  const kinds = new Set((layout.objects || []).map(o => o.kind)), trees = (layout.objects || []).filter(o => o.cls === 'tree').length;
  const grass = (layout.instances || []).reduce((s, i) => s + i.count, 0) * P.grass;
  const nTerr = (layout.terrain.nx - 1) / P.terrainStep, terrTris = nTerr * nTerr * 2;
  const objTris = (layout.objects || []).reduce((s, o) => s + (o.cls === 'tree' ? 76 : o.cls === 'rock' ? 40 : 28), 0);
  const casters = mats.size + kinds.size + (trees ? 1 : 0);
  const drawCalls = 1 + mats.size + kinds.size + (trees ? 1 : 0) + (grass ? 1 : 0) + 1 + 2 + 2 + (P.shadows ? casters + 2 : 0);
  const tris = Math.round(terrTris + partTris + objTris + grass * 4 + 2000);
  return { drawCalls, tris, texMB: 1 };
}
