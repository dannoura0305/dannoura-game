// tools/export_sprites.mjs — Web 版のコード描きドット絵（main/home/sprites.js の HOME_ART）を PNG に書き出す
//
//   node tools/export_sprites.mjs
//
// 出力（すべて T=32、つまり 1 ドット = 2px の等倍画像）:
//   godot/assets/sprites/items/<itemId>_r<rot>_<variant>[_lit|_f1].png   家具・飾り（回転×色違い×点灯/アニメ）
//   godot/assets/sprites/chars/<who>_<dir>_<pose>_<frame>.png           だんのうら・娘・ねこ（HOME_ART が対応していれば）
//   godot/assets/sprites/tiles/<tileId>_atlas.png                        床・地面（8×8 マスの模様違い）
//   godot/assets/sprites/bg/<area>_bg[_night].png                        床＋壁帯＋出入口の背景（配置なし）
//   godot/assets/sprites/bg/wall_room_{day,night}.png                    部屋の壁帯だけ
//   godot/assets/sprites/icons/<itemId>_<variant>.png                    収納リスト用 48×48
//   godot/assets/sprites/ui/<name>.png                                   ボタン用 32×32
//   godot/data/sprites.json    各 PNG の説明（ファイル名・占有マス・足元範囲の左上からのずれ px）
//   godot/data/catalog.json    HOME.CATALOG / MATERIALS / RECIPES / AREAS / BAL など
//   godot/data/default_home.json  新規ゲームの gs.homeData（HOME._fresh()）
//
// 位置合わせの約束（Godot 側の home.gd もこれに従う）:
//   アイテム … PNG の左上 = 足元範囲（回転後の占有 w×h マス）の左上 + (ox, oy)。壁掛けは y=0 行の左上が基準。
//   人物     … PNG の左上 = 立っているマスの左上 + (ox, oy)。娘の sleep は布団の足元範囲の左上が基準。
//   ox, oy はたいてい負（家具の高さ・影・灯りのにじみが上や外へはみ出すため）。
//
// Playwright（グローバル導入）と同梱 Chromium を使う。サーバーは立てず、空のページにスクリプトを直接読み込む。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'godot');
const SPR = path.join(OUT, 'assets', 'sprites');
const DATA = path.join(OUT, 'data');
const SCRIPTS = ['main/home/catalog.js', 'main/home/placement.js', 'main/home/state.js', 'main/home/renderer.js', 'main/home/sprites.js'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
let result;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  for (const s of SCRIPTS) await page.addScriptTag({ path: path.join(ROOT, s) });
  if (errors.length) console.warn('[page errors]', errors);

  result = await page.evaluate(() => {
    const T = 32, M = 192;              // M = 描画キャンバスの余白（灯りのにじみも入る大きさ）
    const HOME = window.HOME, ART = window.HOME_ART;
    if (!HOME || !ART) throw new Error('HOME / HOME_ART が読み込めません');
    const files = [];                   // {file, data(base64)}
    const seen = new Map();             // dataURL → file（同じ絵は 1 枚にまとめる）
    const json = { T, art_tile: ART.ART_TILE || 16, scale: T / (ART.ART_TILE || 16), items: {}, chars: {}, tiles: {}, bg: {}, icons: {}, ui: {} };

    // origin(ox0,oy0) を基準に描いて、透明でない範囲で切り抜く
    function capture(cw, ch, draw) {
      const c = document.createElement('canvas'); c.width = cw + M * 2; c.height = ch + M * 2;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      draw(x, M, M);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) if (d[(j * c.width + i) * 4 + 3] > 0) {
        if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
      }
      if (x1 < 0) return null;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const o = document.createElement('canvas'); o.width = w; o.height = h;
      o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
      return { canvas: o, ox: x0 - M, oy: y0 - M, w, h };
    }
    function save(file, canvas) {
      const url = canvas.toDataURL('image/png');
      if (seen.has(url)) return seen.get(url);
      seen.set(url, file);
      files.push({ file, data: url.slice(url.indexOf(',') + 1) });
      return file;
    }
    const safe = s => String(s).replace(/[^A-Za-z0-9_.-]/g, '_');

    // ── アイテム ──
    const fp = (id, rot) => HOME.footprint(id, rot);
    let lightCount = 0;
    ART.items().forEach(def => {
      const id = def.id, cat = HOME.CATALOG[id];
      const rots = (cat ? cat.rots : def.rots).slice();
      const entry = json.items[id] = { w: def.w, h: def.h, layer: cat ? cat.layer : 'furniture', sprites: {} };
      rots.forEach(rot => {
        const f = fp(id, rot);
        // カタログに色違いが無いのに絵だけ色違いを持つもの（木の椅子など）は 'default' → 絵の最初の色になる。'default' も必ず書き出す
        const variants = def.variants.indexOf('default') >= 0 ? def.variants : ['default'].concat(def.variants);
        variants.forEach(variant => {
          const states = [['', {}], ['_f1', { t: 0.75 }]];
          if (def.light) states.push(['_lit', { lit: true }]);
          let base = null;
          states.forEach(([suffix, extra]) => {
            const cap = capture(f.w * T, f.h * T, (x, ox, oy) => ART.drawItem(x, id, Object.assign({ rotation: rot, variant, px: ox, py: oy, T }, extra)));
            if (!cap) return;
            const url = cap.canvas.toDataURL('image/png');
            if (suffix === '') base = url;
            else if (url === base) return;          // アニメしない家具の f1 は省く
            const key = `r${rot}_${variant}${suffix}`;
            const file = save(`items/${safe(id)}_${key}.png`, cap.canvas);
            entry.sprites[key] = { file, fw: f.w, fh: f.h, ox: cap.ox, oy: cap.oy, w: cap.w, h: cap.h };
            if (suffix === '_lit') lightCount++;
          });
        });
      });
    });

    // ── 人物 ──
    const DIRS = ['down', 'up', 'left', 'right'];
    const POSES = { dan: ['stand', 'walk', 'sit', 'work', 'hold'], kid: ['stand', 'walk', 'sit', 'read', 'sleep'], cat: ['stand', 'walk', 'sit', 'sleep'] };
    const whoList = ['dan', 'kid'].concat((ART.chars || []).indexOf('cat') >= 0 ? ['cat'] : []);
    const skipped = [];
    whoList.forEach(who => {
      const entry = json.chars[who] = {};
      POSES[who].forEach(pose => {
        const frames = pose === 'walk' ? [0, 1, 2, 3] : [0, 1];
        const dirs = (who === 'kid' && pose === 'sleep') ? ['down', 'right'] : DIRS;   // 布団の縦(rot0)・横(rot90)
        dirs.forEach(dir => {
          let first = null;
          frames.forEach(frame => {
            // sleep は布団（2×3 / 3×2）の左上基準、それ以外は 1 マス
            const cw = (pose === 'sleep' && who === 'kid') ? (dir === 'down' ? 2 : 3) * T : T;
            const ch = (pose === 'sleep' && who === 'kid') ? (dir === 'down' ? 3 : 2) * T : T;
            const cap = capture(cw, ch, (x, ox, oy) => ART.drawChar(x, who, dir, frame, ox, oy, T, pose));
            if (!cap) { skipped.push(`${who}/${dir}/${pose}/${frame}`); return; }
            const url = cap.canvas.toDataURL('image/png');
            if (frame > 0 && url === first && pose !== 'walk') return;  // 動かないポーズは 1 枚
            if (frame === 0) first = url;
            const key = `${dir}_${pose}_${frame}`;
            const file = save(`chars/${who}_${key}.png`, cap.canvas);
            entry[key] = { file, ox: cap.ox, oy: cap.oy, w: cap.w, h: cap.h };
          });
        });
      });
    });

    // ── 床・地面（8×8 マスの模様違いを 1 枚に） ──
    Object.keys(HOME.TILES).forEach(tid => {
      const N = 8, c = document.createElement('canvas'); c.width = N * T; c.height = N * T;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) ART.drawTile(x, tid, gx * T, gy * T, T, gx, gy);
      json.tiles[tid] = { file: save(`tiles/${safe(tid)}_atlas.png`, c), cols: N, rows: N, size: T, note: 'cell (gx%8, gy%8) is the variation for grid cell (gx, gy)' };
    });

    // ── 背景（床＋壁帯＋出入口。配置なし） ──
    ['room', 'garden'].forEach(area => {
      const L = HOME.layout(area, T);
      [['day', false], ['night', true]].forEach(([k, night]) => {
        const c = document.createElement('canvas'); c.width = L.cw; c.height = L.ch;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        // night の暗さは Godot 側（CanvasModulate）で付けるので、壁・窓だけ夜にする
        HOME.renderArea(x, area, { placements: [], chars: [], T, t: 0, night: area === 'garden' ? night : false, wallNight: night, grid: false });
        if (area === 'garden' && night) {
          // renderArea の夜は全体を暗くする。床の明るさを昼と揃えるため、壁帯だけ夜版を使い床は昼版を重ねる
          const d = document.createElement('canvas'); d.width = L.cw; d.height = L.ch;
          const dx = d.getContext('2d'); dx.imageSmoothingEnabled = false;
          HOME.renderArea(dx, area, { placements: [], chars: [], T, t: 0, night: false, grid: false });
          x.drawImage(d, 0, L.band, L.cw, L.ch - L.band, 0, L.band, L.cw, L.ch - L.band);
        }
        // フェーズ3：Web 版の庭は家の正面（屋根つき）を描くため壁帯が 3 マス。Godot 版（home.gd の BAND=64）に合わせて上を切る。
        // 切らない家の正面は bg/garden_front_<day|night>.png（band 96）に別に書き出す
        const GODOT_BAND = 64;
        if (L.band > GODOT_BAND) {
          const cut = L.band - GODOT_BAND;
          const f = document.createElement('canvas'); f.width = L.cw; f.height = L.band;
          f.getContext('2d').drawImage(c, 0, 0);
          json.bg[`${area}_front_${k}`] = { file: save(`bg/${area}_front_${k}.png`, f), w: L.cw, h: L.band, band: L.band, note: 'house front (roof/wall/door/windows) with the full Web band height' };
          const o = document.createElement('canvas'); o.width = L.cw; o.height = L.ch - cut;
          o.getContext('2d').drawImage(c, 0, cut, L.cw, L.ch - cut, 0, 0, L.cw, L.ch - cut);
          json.bg[`${area}_${k}`] = { file: save(`bg/${area}_bg_${k}.png`, o), w: L.cw, h: L.ch - cut, band: GODOT_BAND, cols: L.w, rows: L.h };
          return;
        }
        json.bg[`${area}_${k}`] = { file: save(`bg/${area}_bg_${k}.png`, c), w: L.cw, h: L.ch, band: L.band, cols: L.w, rows: L.h };
      });
    });
    ['day', 'night'].forEach(k => {
      const L = HOME.layout('room', T), c = document.createElement('canvas'); c.width = L.cw; c.height = L.band;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      ART.drawWall(x, 0, 0, L.cw, L.band, T, { night: k === 'night' });
      json.bg[`wall_room_${k}`] = { file: save(`bg/wall_room_${k}.png`, c), w: L.cw, h: L.band };
    });

    // ── アイコン ──
    Object.keys(HOME.CATALOG).forEach(id => {
      const c = HOME.CATALOG[id];
      (c.variants || ['default']).forEach(v => {
        const ic = ART.icon(id, v === 'default' ? undefined : v);
        json.icons[`${id}|${v}`] = { file: save(`icons/${safe(id)}_${safe(v)}.png`, ic), w: ic.width, h: ic.height };
      });
    });
    (ART.uiNames || []).forEach(n => {
      const ic = ART.uiIcon(n);
      json.ui[n] = { file: save(`ui/${safe(n)}.png`, ic), w: ic.width, h: ic.height };
    });

    // ── データ ──
    const catalog = {
      items: HOME.CATALOG, tiles: HOME.TILES, materials: HOME.MATERIALS, recipes: HOME.RECIPES,
      areas: HOME.AREAS, bal: HOME.BAL, rot_dir: HOME.ROT_DIR, stage_names: HOME.STAGE_NAMES,
      pot_colors: HOME.POT_COLORS, plant_species: HOME.PLANT_SPECIES,
    };
    const fresh = HOME._fresh();
    return { files, json, catalog, fresh, skipped, lightCount };
  });
} finally {
  await browser.close();
}

// 古い PNG を消してから書く（名前が変わったときに残骸を残さない）
fs.rmSync(SPR, { recursive: true, force: true });
for (const f of result.files) {
  const p = path.join(SPR, f.file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.from(f.data, 'base64'));
}
fs.mkdirSync(DATA, { recursive: true });
const meta = Object.assign({ generated_by: 'tools/export_sprites.mjs', base_dir: 'res://assets/sprites/' }, result.json);
fs.writeFileSync(path.join(DATA, 'sprites.json'), JSON.stringify(meta, null, 1) + '\n');
fs.writeFileSync(path.join(DATA, 'catalog.json'), JSON.stringify(Object.assign({ generated_by: 'tools/export_sprites.mjs (from main/home/catalog.js)' }, result.catalog), null, 1) + '\n');
fs.writeFileSync(path.join(DATA, 'default_home.json'), JSON.stringify(result.fresh, null, 1) + '\n');

const count = k => Object.values(result.json[k]).reduce((s, e) => s + (e && e.sprites ? Object.keys(e.sprites).length : (e && e.file ? 1 : Object.keys(e || {}).length)), 0);
console.log(`PNG ${result.files.length} 枚（重複をまとめた数）を ${path.relative(ROOT, SPR)} に書き出しました`);
console.log(`  items:${count('items')} chars:${count('chars')} tiles:${count('tiles')} bg:${count('bg')} icons:${count('icons')} ui:${count('ui')}  灯り:${result.lightCount}`);
console.log(`  人物: ${Object.keys(result.json.chars).join(', ')}${result.json.chars.cat ? '' : '（cat は HOME_ART 未対応のため省略）'}`);
if (result.skipped.length) console.log('  描けなかった組み合わせ:', result.skipped.join(' '));
