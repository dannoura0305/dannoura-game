// 顔の絵 v2（コードで組むキャラクター用・charkit/shader/toon2.js の顔の材質と組）。地図帳 512×256：
//   左半分（今の配置）：目のまぶた・まつ毛の層 [0,0]-[128,128]／眉 [128,0]-[256,48]／表情の口 [128,48]-[256,96]／鼻 [128,96]-[192,128]／頬 [192,96]-[256,128]／自由 [0,128]-[256,256]
//   右半分：虹彩の層 [256,0]-[384,128]／白目の形の層 [384,0]-[512,128]／口の欄（母音）[256,128]-[512,256]：1 欄 64×24（4 列 × 5 段）
// 目の 3 層はシェーダーで重ね、虹彩だけが視線（uGaze）と視差でずれる。絵の左（x 小）＝目じり（左目の外側。右目は左右を写す）。
// デザインは本作独自（他作品の目の描き方を写さない）。
export const MOUTH_SLOTS = { closed: 0, aa: 1, ih: 2, ou: 3, ee: 4, oh: 5, n: 6 };
const SLOT = s => [256 + (s % 4) * 64, 128 + Math.floor(s / 4) * 24];

/**
 * 目の形の型。o：{ shape:'male'|'female'|'child', iris, irisDark, irisLight, pupil, lash, lid（0..0.5 上まぶたの下がり）, happy, slit, glow, sclera, ring }
 * 返すのは目の形（白目の外形）の道を作る関数。cx,cy：中心
 */
function eyeGeom(o) {
  const sh = o.shape || 'male';
  // 目の外形：目じり（左）・目がしら（右）。男性：細め・つり気味、女性：丸め、子ども：大きく丸い
  const P = sh === 'male' ? { ox: 14, oy: 56, ix: 112, iy: 72, top: 26, bot: 104, topK: 0.62, botK: 0.55, tilt: -6 }
    : sh === 'child' ? { ox: 14, oy: 62, ix: 112, iy: 70, top: 18, bot: 112, topK: 0.7, botK: 0.68, tilt: -2 }
    : { ox: 12, oy: 60, ix: 112, iy: 70, top: 20, bot: 108, topK: 0.68, botK: 0.62, tilt: -3 };
  const lid = o.lid || 0;
  const top = P.top + lid * 70;
  return { P, top, upper(g) { g.moveTo(P.ox, P.oy); g.bezierCurveTo(P.ox + 14, top + 2, P.ix - 34, top - 6, P.ix, P.iy); }, lower(g) { g.lineTo(P.ix, P.iy); g.bezierCurveTo(P.ix - 18, P.bot, P.ox + 30, P.bot + 4, P.ox, P.oy); } };
}

/** 目の 3 層を描く（左目の絵。右目は網の方で写す） */
export function drawEyeLayers(g, o = {}) {
  const E = eyeGeom(o), P = E.P;
  const cx = 64 + (o.irisX || 0), cy = 66 + (o.irisY || 0);
  const irw = o.irw || (o.shape === 'child' ? 33 : o.shape === 'male' ? 27 : 30), irh = o.irh || (o.shape === 'child' ? 40 : o.shape === 'male' ? 35 : 37);
  // ── 白目の形の層（384,0）──
  g.save(); g.translate(384, 0);
  g.beginPath(); E.upper(g); E.lower(g); g.closePath();
  g.save(); g.clip();
  const sg = g.createLinearGradient(0, E.top, 0, P.bot);
  sg.addColorStop(0, o.scleraShade || '#c9c2dc'); sg.addColorStop(0.35, o.sclera || '#fbf9ff'); sg.addColorStop(1, o.sclera || '#fbf9ff');
  g.fillStyle = sg; g.fillRect(0, 0, 128, 128);
  if (o.happy) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(64, P.bot + 46, 70, 62, 0, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.restore(); g.restore();
  // ── 虹彩の層（256,0）──
  g.save(); g.translate(256, 0);
  const gr = g.createLinearGradient(0, cy - irh, 0, cy + irh);
  gr.addColorStop(0, o.irisDark || '#1b0d2a'); gr.addColorStop(0.38, o.iris || '#8a5cd6'); gr.addColorStop(0.78, o.irisLight || '#e6ccff'); gr.addColorStop(1, o.iris || '#8a5cd6');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, irw, irh, 0, 0, Math.PI * 2); g.fill();
  // 放射の筋・内側の輪
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.4;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * irw * 0.38, cy + Math.sin(a) * irh * 0.38); g.lineTo(cx + Math.cos(a) * irw * 0.86, cy + Math.sin(a) * irh * 0.86); g.stroke(); }
  if (o.ring !== false) { g.strokeStyle = o.ringColor || 'rgba(255,236,255,.38)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(cx, cy + 2, irw * 0.72, irh * 0.74, 0, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
  g.strokeStyle = o.irisDark || '#1b0d2a'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx, cy, irw, irh, 0, 0, Math.PI * 2); g.stroke();
  // 瞳
  g.fillStyle = o.pupil || '#120820'; g.beginPath();
  if (o.slit) g.ellipse(cx, cy + 1, irw * 0.15, irh * 0.66, 0, 0, Math.PI * 2); else g.ellipse(cx, cy + 2, irw * 0.38, irh * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  if (o.glow) { const gg = g.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, irw); gg.addColorStop(0, o.glow); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.beginPath(); g.ellipse(cx, cy, irw, irh, 0, 0, Math.PI * 2); g.fill(); }
  // 光（大・小・下の照り返し）
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + irw * 0.32, cy - irh * 0.42, irw * 0.3, irh * 0.2, -0.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx - irw * 0.36, cy + irh * 0.08, irw * 0.1, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx - irw * 0.1, cy + irh * 0.62, irw * 0.36, irh * 0.08, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  g.restore();
  // ── まぶた・まつ毛の層（0,0）──
  g.save();
  // 白目の上の影（上まぶたの落とす影）：白目の形の中だけ
  g.save(); g.beginPath(); E.upper(g); E.lower(g); g.closePath(); g.clip();
  const shg = g.createLinearGradient(0, E.top - 4, 0, E.top + 30);
  shg.addColorStop(0, o.lidShadow || 'rgba(70,40,110,.55)'); shg.addColorStop(1, 'rgba(70,40,110,0)');
  g.fillStyle = shg; g.fillRect(0, 0, 128, 128);
  g.restore();
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 上まぶたの線（太い・目じりで跳ねる）
  g.strokeStyle = o.lash || '#1a0f24';
  g.lineWidth = o.lashW || 8; g.beginPath(); E.upper(g); g.stroke();
  // 目じりの跳ね（男性は控えめ）
  const fl = o.shape === 'male' ? 0.7 : 1;
  g.lineWidth = (o.lashW || 8) * 0.8; g.beginPath(); g.moveTo(P.ox + 6, P.oy - 4); g.quadraticCurveTo(P.ox - 4 * fl, P.oy - 8 * fl, P.ox - 8 * fl, P.oy - 16 * fl); g.stroke();
  if (o.shape !== 'male') { g.lineWidth = 3; for (const [x, y, dx, dy] of [[P.ox + 18, E.top + 8, -6, -9], [P.ox + 30, E.top + 2, -4, -10]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); } }
  // 目がしらの切れ込み
  g.lineWidth = 3; g.beginPath(); g.moveTo(P.ix - 2, P.iy - 2); g.lineTo(P.ix + 6, P.iy + 4); g.stroke();
  // 二重の線
  g.lineWidth = 2; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(P.ox + 16, P.oy - 18 + (o.lid || 0) * 40); g.bezierCurveTo(P.ox + 34, E.top - 14, P.ix - 40, E.top - 18, P.ix - 10, P.iy - 30 + (o.lid || 0) * 40); g.stroke(); g.globalAlpha = 1;
  // 下まぶた（細い・途中で切れる）
  g.lineWidth = 2.4; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(P.ox + 10, P.oy + 14); g.bezierCurveTo(P.ox + 30, P.bot + 4, P.ix - 30, P.bot + 2, P.ix - 12, P.iy + 22); g.stroke(); g.globalAlpha = 1;
  if (o.happy) { g.lineWidth = o.lashW || 8; g.beginPath(); g.moveTo(P.ox + 6, P.bot - 18); g.quadraticCurveTo(64, P.bot - 46, P.ix - 4, P.bot - 22); g.stroke(); }
  g.restore();
}

/** 眉（区画 128,0 の 128×48）。tilt＋で眉頭が下がる（険しい）。絵の左＝眉じり */
export function drawBrow2(g, o = {}) {
  g.save(); g.translate(128, 0);
  const tilt = o.tilt || 0, y = o.y || 0, arch = o.arch || 0;
  g.strokeStyle = o.color || '#3a2058'; g.fillStyle = o.color || '#3a2058'; g.lineCap = 'round';
  // 眉じり（左・細い）→ 眉頭（右・太い）の細長い形
  const x0 = 12, x1 = 118, y0 = 26 - tilt * 0.4 + y, y1 = 30 + tilt + y, my = 14 - arch + y;
  const w = o.w || 7;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(60, my, x1, y1 - w * 0.5); g.lineTo(x1, y1 + w * 0.5); g.quadraticCurveTo(62, my + w * 1.1, x0 + 4, y0 + 2); g.closePath(); g.fill();
  g.restore();
}

function mouthShape(g, kind, o = {}) {
  // 128×48 の箱の中に描く（中心 64,24）
  const ln = o.color || '#7a3048', inside = o.inside || '#5a1a2a', tongue = o.tongue || '#e07890', teeth = '#fffaf8';
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ln; g.lineWidth = o.w || 4;
  const open = (w, h, y = 22, tri = 0) => {
    g.fillStyle = inside; g.beginPath(); g.moveTo(64 - w, y); g.quadraticCurveTo(64, y - 4 - tri, 64 + w, y); g.quadraticCurveTo(64 + w * 0.6, y + h, 64, y + h); g.quadraticCurveTo(64 - w * 0.6, y + h, 64 - w, y); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = teeth; g.fillRect(64 - w, y - 6, w * 2, 5 + Math.min(3, h * 0.12)); g.fillStyle = tongue; g.beginPath(); g.ellipse(64, y + h, w * 0.55, h * 0.4, 0, 0, Math.PI * 2); g.fill(); g.restore();
    g.lineWidth = (o.w || 4) * 0.8; g.beginPath(); g.moveTo(64 - w, y); g.quadraticCurveTo(64, y - 4 - tri, 64 + w, y); g.stroke();
  };
  switch (kind) {
    case 'aa': open(17, 18, 16, 2); break;
    case 'ih': open(19, 7, 20, 0); break;
    case 'ou': g.fillStyle = inside; g.beginPath(); g.ellipse(64, 24, 7, 8, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 2.5; g.stroke(); break;
    case 'ee': open(18, 12, 18, 1); break;
    case 'oh': g.fillStyle = inside; g.beginPath(); g.ellipse(64, 24, 11, 13, 0, 0, Math.PI * 2); g.fill(); g.save(); g.clip(); g.fillStyle = tongue; g.beginPath(); g.ellipse(64, 34, 8, 5, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.lineWidth = 2.5; g.beginPath(); g.ellipse(64, 24, 11, 13, 0, 0, Math.PI * 2); g.stroke(); break;
    case 'n': g.beginPath(); g.moveTo(52, 25); g.quadraticCurveTo(64, 27, 76, 25); g.stroke(); break;
    case 'open': open(14, 12, 18, 1); break;
    case 'o': g.fillStyle = inside; g.beginPath(); g.ellipse(64, 24, 9, 11, 0, 0, Math.PI * 2); g.fill(); break;
    case 'line': g.beginPath(); g.moveTo(48, 25); g.quadraticCurveTo(64, 27, 80, 25); g.stroke(); break;
    case 'frown': g.beginPath(); g.moveTo(46, 30); g.quadraticCurveTo(64, 18 - (o.smile || 0), 82, 30); g.stroke(); break;
    case 'grin': open(18, 10, 18, -3); break;
    default: { const s = o.smile ?? 4; g.beginPath(); g.moveTo(44, 22); g.quadraticCurveTo(64, 28 + s, 84, 22); g.stroke(); g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(42, 20); g.lineTo(46, 24); g.moveTo(86, 20); g.lineTo(82, 24); g.stroke(); g.globalAlpha = 1; }
  }
}
/** 表情の口（区画 128,48） */
export function drawMouth2(g, o = {}) { g.save(); g.translate(128, 48); mouthShape(g, o.kind || 'smile', o); g.restore(); }
/** 母音の口の欄（右下）。o は色など */
export function drawVisemes(g, o = {}) {
  for (const [name, s] of Object.entries(MOUTH_SLOTS)) {
    const [x, y] = SLOT(s);
    g.save(); g.translate(x, y); g.scale(0.5, 0.5); mouthShape(g, name === 'closed' ? 'line' : name, Object.assign({}, o, { w: (o.w || 4) * 1.4 })); g.restore();
  }
}
/** 鼻（区画 128,96 の 64×32）：小さな影の線と光 */
export function drawNose2(g, o = {}) {
  g.save(); g.translate(128, 96);
  g.strokeStyle = o.color || 'rgba(170,100,110,.8)'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(34, 4); g.quadraticCurveTo(36, 16, 30, 24); g.stroke();
  g.fillStyle = o.color || 'rgba(170,100,110,.6)'; g.beginPath(); g.ellipse(28, 25, 3, 1.6, 0.3, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** 頬の赤み（区画 192,96） */
export function drawBlush2(g, o = {}) {
  g.save(); g.translate(192, 96);
  const gr = g.createRadialGradient(32, 16, 2, 32, 16, 28); gr.addColorStop(0, o.color || 'rgba(255,130,160,.45)'); gr.addColorStop(1, 'rgba(255,130,160,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
  if (o.lines) { g.strokeStyle = 'rgba(255,110,140,.45)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(20 + i * 9, 20); g.lineTo(26 + i * 9, 11); g.stroke(); } }
  g.restore();
}
