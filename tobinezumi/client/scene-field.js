// tobinezumi/client/scene-field.js — B. 地上共有フィールド（見下ろし 2D）
// 自分：クライアント予測（Predictor）。他人：100ms 遅れの補間（Interp）。採集・巣穴・チャット・ミニマップ。
// Ver.0.3：捕食者（snapshot の preds を補間して描く・「！」・画面の端の赤・効果音）、天気（砂嵐・雨・寒い夜の粒と色）、
//   土地を調べる（L・「土地」）・ミニマップの重ね表示（M・ミニマップをタップ）・引っ越し・ふさいだ入口・草むらに隠れる・つかまった演出。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import * as A from './art.js';
import { Sprites } from './sprites.js';
import { Predictor, Interp } from './net.js';
import { buildFieldMap, T, TILE, regionAt, canDigBurrow, nearWater, POND, gateAt, isWaterTile } from '../shared/regions.js';
import { regionMap, REGION, TOYAMA } from '../shared/world.js';
import { trailPush, kidSpots, kidsHidden, unpackSpots } from '../shared/follow.js';
import { toyamaSeasonProps, paddyHarvested, glimpseSpot, shrineText, GLIMPSE, boardText, FOOTPRINTS, FOOT_END, FOOT_TEXT, TRAIN_TEXT, NEAR_TEXT, TEV, trainTime, crossoverComplete } from '../shared/toyama.js';
import { CURIOS, GATE_R, gateHint } from '../shared/collect.js';
import { discoveryCard, regionCard } from './world-ui.js';
import { moveMods } from '../shared/life.js';
import { stepField, makeFieldState, STEP_DT, FIELD } from '../shared/move.js';
import { itemName } from '../shared/items.js';
import { hash2, fbm } from '../shared/rng.js';
import { pickTapTarget, steerToward } from './touch-logic.js';
import { landAt, digTime, overlayColor, buildLands, PLOT_W, PLOT_H, CLIMATES, RARES } from '../shared/lands.js';
import { fieldMods } from '../shared/season.js';
import { threatTo, ALERT_STATES, inGrass, HIDE_AFTER, PRED } from '../shared/predators.js';
import { sfx } from './sfx.js';
import { festivalAt, festActBlock, marksVisible, offerPileSize, sparkleSet, shootingStars, onHill, FEST, OFFER_SPOT, HILL_SPOT } from '../shared/festival.js';
import { toyamaFestProps } from '../shared/toyama.js';
import { plotAt } from '../shared/lands.js';
import { HOUR_MS } from '../shared/daynight.js';

const WILD_R = 30;   // 野生の子に種子をあげられる距離
const costText = c => { const k = Object.entries(c || {}); return k.length ? '（' + k.map(([id, n]) => itemName(id) + ' ' + n).join('・') + '）' : ''; };

const PICK_R = 22, ENT_R = 20;
const HELP_KEYS = 'WASD/方向キー 跳ねる　Space 大ジャンプ　E 調べる・拾う・飲む　Q 食べる　L 土地　N 世界地図　C 図鑑　M 重ね表示　I 持ち物　F フレンド　K 家族　Enter チャット　Esc メニュー';
const HELP_TOUCH = 'スティックで跳ねる・地面や採集物をタップでそこへ（メニュー→ヘルプ）';
const HELP_LIFE = '<br><b>くらし</b>：右下（スマホは左上）のハート＝体調・稲妻＝空腹・しずく＝水分。種子を食べる（Q・「食べる」）、オアシスのふちや夜の夜露で E（調べる）で水を飲む、巣の寝床で眠ると体調が戻る。へとへと（体調 25 未満）だと遅く、大ジャンプできない。<br><b>昼と夜</b>：24 分で 1 日。トビネズミは夜行性で、夜は採集物が早く戻り、夜だけの種子と夜露が出る。';
const HELP_DANGER = '<br><b>危険（捕食者）</b>：夜と夕方は<b>フクロウ</b>（空から。地面の影が大きくなったら急降下）と<b>キツネ</b>（地上を追ってくる。低木や岩は越えられない）、昼は<b>ヘビ</b>（岩や草のかげで待ち伏せ・短く飛びかかる）。見つかると頭の上に<b>！</b>。<br>' +
  '逃げ方：<b>大ジャンプ</b>・ジグザグ・<b>入れる巣穴の入口</b>（自分・公開・フレンド）に飛び込む・<b>草むらでじっとする</b>（隠れる）・オアシスのほとりと出発点の広場は安全。跳ねると音で気づかれやすい。<br>' +
  'つかまると体調が大きく減り、持ち物の一部を落とす（だれでも拾える）。安全な所へ戻され、しばらく狙われない（死なない）。<br>' +
  '<b>天気と季節</b>：時計の横に季節と天気。砂嵐は遅くなり、物かげ（岩・低木・巣穴）にいないと体調が減る。雨は水たまり（飲める）ができて草や種がよく育つ。冬の夜は寒く、巣の外では体調が減る。夏の昼・冬に巣で眠ると休眠（よく休める）。<br>' +
  '<b>土地</b>：L（土地）でいる場所の食料・危険・地質・気候・希少資源・景観を調べる。巣は土地を選んで掘り、あとから引っ越しもできる（巣の中身はそのまま）。M でミニマップに危険・食料を重ねる。';
const HELP_FAMILY = '<br><b>いのちをつなぐ</b>：遊んでいる間だけ年をとる（世界の 1 日 = 24 分）。子ども → 若者 → おとな（4 日）→ 年寄り（24 日）。<br>' +
  'おとなになったら、ときどき現れる<b>野生のトビネズミ</b>（春に多い）に<b>そっと近づいてじっとする</b>か<b>種子をあげる</b>と、頭の上のハート（信頼）が満ちて なかよしになり ついてくる。跳ね回ったり大ジャンプすると逃げる。<br>' +
  'なかよしの子と自分の巣へ入ると つれあいに（寝床の部屋・倉庫の種子 10 以上・冬はだめ）。遊んだ時間で世界の半日たつと 2〜6 匹の赤ちゃんが生まれる。子は倉庫の種子を食べて育ち、若者になると外へついてくる（捕食者が来ると巣へかくれる）。<br>' +
  '<b>家族</b>（K・メニュー）から 育った子に<b>あとをつがせる</b>（巣・倉庫・持ち物・フレンドはそのまま）。家系図で毛色や耳・脚・尾・体の違いが見られる。';
const HELP_WORLD = '<br><b>広がり</b>：地図の端の<b>出口</b>（矢印）まで跳ねていくと、となりの土地へ旅する。北は<b>いわばの高台</b>（岩場：ヘビが多い・きれいな石）、東は<b>すなの海</b>（砂丘：さらさら砂で遅い・食べ物が少ない・夜はフクロウ）、西は<b>みずおとの谷</b>（渓谷：川・草木・涼しい。段差は下りるだけで、上がるのは坂から）。巣はどの土地にも掘れて、土地をまたいで引っ越せる。<br>' +
  'ときどき地上に<b>光る物</b>が出る（土地・季節・時間・天気で違う）。拾うと<b>図鑑</b>へ。図鑑の品は巣に飾れる。<b>実績</b>をとると飾りが増える。<b>共同巣</b>（オンライン）でフレンドといっしょに暮らせる。';
const HELP_FULL_KEYS = '<b>WASD・方向キー</b> 跳ねる／<b>Space</b> 大ジャンプ（小石の山や草むらを越える）<br><b>E</b> 拾う・調べる・巣に入る・巣を掘る・水を飲む・野生の子に種子をあげる<br><b>Q</b> 種子を 1 つ食べる／<b>L</b> 土地を調べる・引っ越す／<b>N</b> 世界地図／<b>C</b> 図鑑／<b>V</b> 実績／<b>M</b> ミニマップの重ね表示／<b>I</b> 持ち物／<b>F</b> フレンド／<b>K</b> 家族・家系図／<b>Enter</b> チャット／<b>Esc</b> メニュー／<b>H</b> 下の案内を出す・隠す' + HELP_LIFE + HELP_DANGER + HELP_FAMILY + HELP_WORLD;
const HELP_FULL_TOUCH = '<b>左のスティック</b> 跳ねる（左側のどこを触ってもよい）<br><b>ジャンプ</b> 大ジャンプ（小石の山や草むらを越える）<br><b>地面をタップ</b> そこへ跳ねていく<br><b>採集物・巣穴をタップ</b> 歩いて行って拾う・入る<br><b>自分をタップ・調べる</b> 拾う・巣を掘る・巣に入る・水を飲む<br><b>食べる</b> 種子を 1 つ食べる／<b>土地</b> いる場所の土地を調べる・引っ越す／<b>地図</b> 世界地図／<b>ミニマップをタップ</b> 危険・食料の重ね表示／<b>図鑑・実績・フレンド・共同巣</b> メニューから<br><b>持ち物・チャット・メニュー</b> 上の帯のボタン（ホットバーを押しても持ち物）／<b>家族</b> 体調のバーを押す・メニューから' + HELP_LIFE + HELP_DANGER + HELP_FAMILY + HELP_WORLD;
const PRIO = { [T.SAND]: 0, [T.DIRT]: 1, [T.GRASS]: 2 };
// Ver.0.5：土地ごとの地面の色味（素材の砂・土・草の上に重ねる）
const REGION_TINT = { rocks: 'rgba(110,112,120,0.22)', dunes: 'rgba(255,226,170,0.16)', canyon: 'rgba(60,120,60,0.12)', toyama: 'rgba(70,130,70,0.18)' };
const PROP_NAME = { shrine: '祠', post: '道しるべ', machine: '金属のかたまり', phone: '光る板', stone: '古い石の標', lights: '遠くの灯り', busstop: 'バス停', hasa: 'はさ掛け', lantern: '雪の灯り', footend: '雪の上の足あと',
  tflower: '小さな花', tgrass: '丸く ねた草', trice: '平らな石', tlantern: '小さな灯り' };   // Ver.0.8：富山の行事の夜の小さなもの
const SEASON_IX = { spring: 0, summer: 1, autumn: 2, winter: 3 };

export class FieldScene {
  get touchLayout() { return 'field'; }
  constructor(game) {
    this.game = game;
    this.map = (game.net && game.net.map) || buildFieldMap();
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.fx = [];        // 砂ぼこりなど
    this.flies = [];     // 蛍（富山・渓谷の夏の夜）
    this._prerender();
  }
  /** 土地が変わった（旅・不思議な穴・再接続）：地図を描きなおす */
  setMap(map) {
    if (!map || map === this.map) return;
    this.map = map;
    this._snow = null; this._mm = null; this._ct = null;
    this._prerender();
  }

  // ───────── 地図の下ごしらえ（一度だけ）─────────
  _prerender() {
    const m = this.map;
    const cv = A.mk(m.pxW, m.pxH), g = cv.getContext('2d');
    const useAssets = Sprites.has('tile.sand') && Sprites.has('tile.trans.sand_dirt') && Sprites.has('tile.trans.dirt_grass');
    if (useAssets) {
      // 角（コーナー）ごとの地形：0 砂・1 土・2 草。角はその右下のタイルの地面（見た目だけ半タイルずれる）
      const corner = (cx, cy) => m.ground[Math.max(0, Math.min(m.h - 1, cy)) * m.w + Math.max(0, Math.min(m.w - 1, cx))];
      const lvl = k => k === T.GRASS ? 2 : k === T.DIRT ? 1 : 0;
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const cs = [lvl(corner(tx, ty)), lvl(corner(tx + 1, ty)), lvl(corner(tx + 1, ty + 1)), lvl(corner(tx, ty + 1))];
        const x = tx * 16, y = ty * 16;
        Sprites.drawCell(g, 'tile.sand', Math.floor(hash2(tx, ty, 3) * 4), x, y);
        let bits = cs.reduce((a, c, i) => a | (c >= 1 ? 1 << i : 0), 0);
        if (bits === 15) Sprites.drawCell(g, 'tile.dirt', Math.floor(hash2(tx, ty, 4) * 3), x, y);
        else if (bits) Sprites.drawCell(g, 'tile.trans.sand_dirt', bits, x, y);
        bits = cs.reduce((a, c, i) => a | (c >= 2 ? 1 << i : 0), 0);
        if (bits === 15) Sprites.drawCell(g, 'tile.grass', Math.floor(hash2(tx, ty, 5) * 4), x, y);
        else if (bits) Sprites.drawCell(g, 'tile.trans.dirt_grass', bits, x, y);
      }
    } else {
      const variants = {};
      const tileFor = (kind, v) => {
        const k = kind + ':' + v;
        if (!variants[k]) variants[k] = A.groundTile(kind, v * 3, v * 7, 1);
        return variants[k];
      };
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const gk = m.ground[ty * m.w + tx];
        g.drawImage(tileFor(gk, Math.floor(hash2(tx, ty, 3) * 4)), tx * 16, ty * 16);
      }
      // 境目をぼかす（優先度の高い地面が低い地面へにじむ）
      const col = { [T.DIRT]: A.PAL.dirt, [T.GRASS]: A.PAL.grass };
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const gk = m.ground[ty * m.w + tx];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
          const nk = m.ground[ny * m.w + nx];
          if (PRIO[nk] <= PRIO[gk]) continue;
          const pal = col[nk];
          for (let i = 0; i < 16; i++) {
            const depth = 1 + Math.floor(hash2(tx * 16 + i, ty * 16 + dx * 3 + dy, 21) * 4);
            for (let d = 0; d < depth; d++) {
              if (hash2(tx * 31 + i, ty * 17 + d, 5) < 0.25 && d === depth - 1) continue;
              const px = dx === 1 ? 15 - d : dx === -1 ? d : i;
              const py = dy === 1 ? 15 - d : dy === -1 ? d : i;
              g.fillStyle = pal[(i + d) % 2 ? 0 : 1];
              g.fillRect(tx * 16 + px, ty * 16 + py, 1, 1);
            }
          }
        }
      }
    }
    // 平たい飾り
    this.tall = [];
    const bigUsed = new Set();
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      const t = m.tiles[ty * m.w + tx], v = Math.floor(hash2(tx, ty, 8) * 6);
      const x = tx * 16 + 8, y = ty * 16 + 8;
      if (t === T.TUFT) { if (!Sprites.drawCell(g, 'tile.grass_tuft', v, x - 8, y - 8)) A.drawTuft(g, x, y + 5, v); }
      else if (t === T.PEBBLE) { if (!Sprites.drawCell(g, 'tile.pebbles', v, x - 8, y - 8)) A.drawPebbleDeco(g, x, y + 4, v); }
      else if (t === T.SHRUB) this.tall.push({ kind: 'shrub', x, y: y + 6, v });
      else if (t === T.ROCK) {
        // 岩場は 2 タイル分の大岩をなるべく使う（右隣も岩で、まだ使っていなければ）
        const right = tx + 1 < m.w && m.tiles[ty * m.w + tx + 1] === T.ROCK && !bigUsed.has(ty * m.w + tx + 1);
        if (bigUsed.has(ty * m.w + tx)) continue;
        if (right && Sprites.has('tile.rock_big')) { bigUsed.add(ty * m.w + tx + 1); this.tall.push({ kind: 'rock_big', x: x + 8, y: y + 6, v }); }
        else this.tall.push({ kind: 'rock', x, y: y + 6, v });
      }
      else if (t === T.STONES) this.tall.push({ kind: 'stones', x, y: y + 5, v });
      else if (t === T.TREE) this.tall.push({ kind: 'tree', x, y: y + 6, v });
      // Ver.0.5：新しい土地の地形
      else if (t === T.DUNE) { g.globalAlpha = 0.5; if (!Sprites.drawCell(g, 'tile.dune', v % 3, x - 8, y - 8)) { g.fillStyle = 'rgba(250,220,160,.6)'; g.fillRect(x - 8, y - 8, 16, 16); } g.globalAlpha = 1; }
      else if (t === T.PATH) { if (!Sprites.drawCell(g, 'tile.path', v % 2, x - 8, y - 8)) { g.fillStyle = '#9a7a52'; g.fillRect(x - 8, y - 8, 16, 16); } }
      else if (t === T.CLIFF) { if (!Sprites.drawCell(g, 'tile.cliff', v % 2, x - 8, y - 8)) { g.fillStyle = '#5f666c'; g.fillRect(x - 8, y - 8, 16, 16); } }
      else if (t === T.LEDGE) { if (!Sprites.drawCell(g, 'tile.ledge', v % 2, x - 8, y - 8)) { g.fillStyle = '#74503a'; g.fillRect(x - 8, y - 2, 16, 10); } }
      else if (t === T.SAKURA) this.tall.push({ kind: 'sakura', x, y: y + 6, v });
      else if (t === T.RIVER || t === T.PADDY || t === T.CHANNEL) (this.wet || (this.wet = [])).push({ tx, ty, t });
    }
    if (!this.wet) this.wet = [];
    // 富山：北の雪の山なみ（地図の上 8 行）・家（入れない）・調べられる物
    if (m.region === 'toyama') {
      const bandH = TOYAMA.MOUNT_ROWS * 16;
      const sky = g.createLinearGradient(0, 0, 0, bandH);
      sky.addColorStop(0, '#9cc4e4'); sky.addColorStop(1, '#d8e8f0');
      g.fillStyle = sky; g.fillRect(0, 0, m.pxW, bandH);
      const mt = Sprites.get('tile.mountains');
      if (mt) for (let x = 0; x < m.pxW; x += mt.cell[0]) g.drawImage(mt.img, 0, 0, mt.cell[0], mt.cell[1], x, bandH - mt.cell[1], mt.cell[0], mt.cell[1]);
      else { g.fillStyle = '#eaf0f6'; for (let x = 0; x < m.pxW; x += 40) { g.beginPath(); g.moveTo(x, bandH); g.lineTo(x + 20, 30 + (x % 3) * 10); g.lineTo(x + 40, bandH); g.fill(); } }
      for (const h of m.houses || []) this.tall.push({ kind: 'house', x: (h.x + h.w / 2) * 16, y: (h.y + h.h) * 16 - 1, v: (h.x + h.y) % 2 });
    }
    for (const pr of m.props || []) if (pr.kind !== 'lights') this.tall.push({ kind: 'prop', pk: pr.kind, x: pr.x, y: pr.y, v: 0, prop: pr });
    if (REGION_TINT[m.region]) { g.fillStyle = REGION_TINT[m.region]; g.globalCompositeOperation = 'source-atop'; g.fillRect(0, m.region === 'toyama' ? TOYAMA.MOUNT_ROWS * 16 : 0, m.pxW, m.pxH); g.globalCompositeOperation = 'source-over'; }
    this.water = [];
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (m.tiles[ty * m.w + tx] === T.WATER) {
      const isW = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.tiles[y * m.w + x] === T.WATER;
      this.water.push({ tx, ty, edges: { n: !isW(tx, ty - 1), s: !isW(tx, ty + 1), w: !isW(tx - 1, ty), e: !isW(tx + 1, ty) } });
    }
    // 水辺（陸のタイルに重ねる波打ち際）：角が水に接しているもの
    if (Sprites.has('tile.edge.water')) {
      const isW = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.tiles[y * m.w + x] === T.WATER;
      this.shore = [];
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        if (isW(tx, ty)) continue;
        const cw = (cx, cy) => isW(cx - 1, cy - 1) || isW(cx, cy - 1) || isW(cx - 1, cy) || isW(cx, cy);
        const bits = (cw(tx, ty) ? 1 : 0) | (cw(tx + 1, ty) ? 2 : 0) | (cw(tx + 1, ty + 1) ? 4 : 0) | (cw(tx, ty + 1) ? 8 : 0);
        if (bits) this.shore.push({ tx, ty, bits });
      }
    }
    this.ground = cv;
    // ミニマップ（1 タイル 1 ピクセル）
    const mm = A.mk(m.w, m.h), mg = mm.getContext('2d');
    const mcol = ['#e0b87c', '#b07c4a', '#94984a', '#6e6056', '#5a6a2c', '#8a7a6a', '#3e7fb4', '#4e5a26', '#d0aa70', '#a0a24e',
      '#f0cc90', '#6a7076', '#5a3c26', '#3f8ab5', '#5fa9c9', '#4a9ac0', '#3c4858', '#dfe6ee', '#b49468', '#e890aa', '#8c6744'];   // Ver.0.5
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { mg.fillStyle = mcol[m.tiles[ty * m.w + tx]]; mg.fillRect(tx, ty, 1, 1); }
    this.minimap = mm;
  }

  // ───────── 世界の受け取り（joinField の結果）─────────
  init(world) {
    // Ver.0.5：土地が変わったら地図を差し替える
    const want = world.region || 'plains';
    if ((this.map.region || 'plains') !== want) this.setMap(want === 'plains' && this.game.net && this.game.net.map && this.game.net.map.region === 'plains' ? this.game.net.map : regionMap(want));
    this.region = want;
    this.gate = world.gate || null;
    this.home = world.you.home || null;
    if (world.collection && this.game.setCollection) this.game.setCollection(world.collection);
    const y = world.you;
    this.me = { id: y.id, name: y.name, fur: y.fur, look: y.look || this.game.look || null };
    this.inv = y.inv;
    this.myNest = y.nest;
    const st = makeFieldState(y.x, y.y); st.dir = y.dir || 'down';
    this.pred = new Predictor(st, (s, i) => stepField(s, i, STEP_DT, this.map, fieldMods(moveMods(this.game.life), this.game.env, this.game.traitMove)));
    this.pred.onReconcile = info => { this.game.debug.reconciles = (this.game.debug.reconciles || 0) + 1; this.game.debug.lastReconcile = info; };
    this.resources = new Map(world.resources.map(r => [r.id, { ...r }]));
    this.entrances = world.entrances.slice();
    this.players = new Map();
    for (const p of world.players || []) this.addPlayer(p);
    this.bubbles = new Map();
    this.view = { ...st };
    this.clockOffset = (world.serverTime || Date.now()) - Date.now();
    this.ping = null;
    this.preds = new Map(); this.predLatest = []; this.threat = null; this.stillT = 0; this.wx = []; this.shake = 0; this.flash = 0;
    this.danger = world.danger || { predators: 'off', env: false };
    // Ver.0.4：野生のトビネズミ（補間）・信頼・連れている若者の足あと
    this.wild = new Map(); this.trust = {}; this.trails = new Map(); this.kidVis = new Map(); this.kidSt = new Map();
    this.glimpse = null; this._glimpseT = 20; this.flies = [];
    this._festInit(world);   // Ver.0.8
    this.ready = true;
  }
  /** 世代交代・連れている若者が変わった（ほかの子） */
  updatePlayer(p) {
    if (!p) return;
    if (p.id === this.me.id) { this.me.name = p.name; this.me.fur = p.fur; this.me.look = p.look; return; }
    const rp = this.players.get(p.id);
    if (!rp) return;
    rp.name = p.name; rp.fur = p.fur || rp.fur; rp.look = p.look || null; rp.kids = p.kids || [];
  }
  /** 野生の子との出来事 */
  onWild(m) {
    const ui = this.game.ui;
    if (m.type === 'befriend') { const lw = this.wild.get(m.id), le = lw && lw.latest && lw.latest.sp === 'longear'; ui.toast((m.name || '野生の子') + ' と なかよしになった！ ついてくる。' + (le ? '巣へ入ると なかまとして住む（ミミナガトビネズミ：種がちがうので赤ちゃんはできない）' : 'いっしょに自分の巣へ入ろう')); sfx('safe'); const v = this.wild.get(m.id); if (v && v.latest) this.hearts(v.latest.x, v.latest.y); }
    else if (m.type === 'lost') ui.toast((m.name || '野生の子') + ' は 帰っていった');
    else if (m.type === 'startle') { const t = performance.now(); if (t - (this._startleT || 0) > 6000) { this._startleT = t; ui.toast((m.name || '野生の子') + ' が びっくりして逃げた（そっと近づいて、じっとしよう）', 'bad'); } }
  }
  hearts(x, y) { for (let i = 0; i < 5; i++) this.fx.push({ x: x + (Math.random() - 0.5) * 10, y: y - 16, vx: (Math.random() - 0.5) * 14, vy: -14 - Math.random() * 10, t: 0, life: 1 + Math.random() * 0.5, color: '#ff8aa0', heart: true }); }
  /** フレンドの一覧が変わった：入口の名札・ミニマップの色に使う */
  onFriends(list) { this.friendIds = new Set((list || []).filter(f => f.state === 'friend').map(f => f.id)); }
  isFriend(id) { return !!(this.friendIds && this.friendIds.has(id)); }
  /** ミニマップの点を光らせる（フレンドの巣の場所など） */
  pingAt(x, y, label) { this.ping = { x, y, label, until: this.t + 12 }; }
  onEat() { this.eatT = this.t; }
  addPlayer(p) {
    if (!p || p.id === this.me.id) return;
    const rp = { id: p.id, name: p.name, fur: p.fur || 'sand', look: p.look || null, kids: p.kids || [], interp: new Interp(), last: { x: p.x, y: p.y, z: 0, dir: p.dir || 'down', anim: 'idle' }, hop: 0 };
    rp.interp.push(this.serverNow() - 200, { x: p.x, y: p.y, z: 0, dir: p.dir || 'down', anim: 'idle' });
    this.players.set(p.id, rp);
  }
  serverNow() { return this.game.net.serverTime ? this.game.net.serverTime() : Date.now(); }

  // ───────── 通信の通知 ─────────
  onSnapshot(m) {
    if (!this.ready) return;
    if (this.game.scene === this) this.pred.reconcile(m.ack, m.you);
    for (const p of m.players || []) {
      let rp = this.players.get(p.id);
      if (!rp) continue;
      rp.interp.push(m.st, p);
    }
    // 捕食者：補間して描く。消えたものは少し待ってから外す
    const seen = new Set(), me = this.me.id;
    for (const q of m.preds || []) {
      seen.add(q.id);
      let v = this.preds.get(q.id);
      if (!v) { v = { id: q.id, kind: q.kind, interp: new Interp(), prev: null }; this.preds.set(q.id, v); }
      v.interp.push(m.st, q); v.latest = q; v.goneAt = 0;
      // 予告の音（自分が狙われたとき）
      if (q.target === me && q.state !== v.prev) {
        if (q.state === 'alert' || q.state === 'stalk' || q.state === 'rattle') { sfx('alert'); sfx(q.kind === 'owl' ? 'owl' : q.kind === 'fox' ? 'fox' : 'hiss'); }
        else if (q.state === 'dive') sfx('dive');
        else if (q.state === 'lunge') sfx('hiss');
      }
      if (v.prev && ALERT_STATES.has(v.prev) && !ALERT_STATES.has(q.state) && v.wasMine && q.state !== 'leave') { this.game.ui.toast(PRED[q.kind].name + 'から にげきった！'); sfx('safe'); }
      v.wasMine = q.target === me || (v.wasMine && ALERT_STATES.has(q.state));
      v.prev = q.state;
    }
    for (const [id, v] of this.preds) if (!seen.has(id)) { if (!v.goneAt) v.goneAt = m.st; else if (m.st - v.goneAt > 400) this.preds.delete(id); }
    this.predLatest = m.preds || [];
    this.threat = threatTo(this.predLatest, me);
    // 野生のトビネズミ
    const ws = new Set();
    for (const q of m.wild || []) {
      ws.add(q.id);
      let v = this.wild.get(q.id);
      if (!v) { v = { id: q.id, interp: new Interp() }; this.wild.set(q.id, v); }
      v.interp.push(m.st, q); v.latest = q; v.goneAt = 0;
    }
    for (const [id, v] of this.wild) if (!ws.has(id)) { if (!v.goneAt) v.goneAt = m.st; else if (m.st - v.goneAt > 400) this.wild.delete(id); }
    this.trust = m.wt || {};
    const was = this.gate;
    this.gate = m.gate || null;
    if (!was && this.gate && !this.gate.back) this.puff(this.gate.x, this.gate.y, '#e8f0ff', 10);
  }
  /** つかまった（サーバー／オフラインから）：安全な所へ戻る・画面がゆれる・落とした物 */
  onCaught(m) {
    if (!this.ready) return;
    this.pred.reset(makeFieldState(m.x, m.y));
    this._snapCam();
    this.autoGo = null;
    this.shake = 0.5; this.flash = 1;
    for (const v of this.preds.values()) v.wasMine = false;
    if (m.inv) { this.inv = m.inv; this.game.ui.setInventory(this.inv); }
    sfx('caught');
  }
  onResGone(m) { const r = this.resources.get(m.id); if (r) { this.resources.delete(m.id); if (m.by !== this.me.id) this.puff(r.x, r.y, '#e8d0a0'); } }
  onResSpawn(m) { this.resources.set(m.res.id, { ...m.res }); }
  onEntrance(m) {
    const e = m.entrance;
    this.entrances = this.entrances.filter(x => x.owner !== e.owner);
    if (e.gone || (e.region && e.region !== (this.map.region || 'plains'))) {   // Ver.0.5：ほかの土地へ引っ越していった
      if (e.own && this.myNest) this.myNest = { ...this.myNest, region: e.region };
      return;
    }
    this.entrances.push(e);
    if (e.own) this.myNest = { ...(this.myNest || {}), id: e.nestId, x: e.x, y: e.y, plugged: !!e.plugged, region: e.region || this.map.region || 'plains' };
    if (m.moved && !e.own) { this.puff(e.x, e.y, '#b98552', 8); if (this.isFriend(e.owner)) { this.game.ui.toast(e.name + ' が 巣を引っ越した（ミニマップで光っている所）'); this.pingAt(e.x, e.y, e.name + 'の巣'); } }
  }
  onChat(m) {
    this.bubbles.set(m.from, { text: m.text, until: performance.now() + 5000 });
  }

  // ───────── 画面の出入り ─────────
  enter(params = {}) {
    const g = this.game;
    this.dom = el('div', 'tb-scene');
    this.regionEl = el('div', 'tb-region'); this.dom.appendChild(this.regionEl);
    this.helpEl = el('div', 'tb-help', g.isTouch ? HELP_TOUCH : HELP_KEYS);
    this.dom.appendChild(this.helpEl);
    g.ui.setHelpLine(this.helpEl);   // Ver.0.7：トーストと重ならないように
    // 「E 拾う」の案内。タッチでは押せる（調べるボタンと同じ）
    this.promptEl = el('div', 'tb-prompt tb-ui-block hidden'); this.dom.appendChild(this.promptEl);
    this._promptHTML = null;   // 新しい案内の箱（前の文字を使い回さない）
    this.promptEl.addEventListener('click', () => { if (!g.ui.busy()) this.interact(); });
    this.autoGo = null;
    g.hud.appendChild(this.dom);
    g.ui.mountHotbarOnce();
    g.ui.setInventory(this.inv);
    g.ui.showHUD(true);
    if (params.pos) this.pred.reset(makeFieldState(params.pos.x, params.pos.y));
    this.busyUntil = 0;
    this.lastRegion = null;
    this._snapCam();
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; this.autoGo = null; this.game.ui.setHelpLine(null); this.game.ui.showHUD(false); }
  onTouchChange(on) { if (this.helpEl) this.helpEl.textContent = on ? HELP_TOUCH : HELP_KEYS; }
  helpHTML() { return this.game.isTouch ? HELP_FULL_TOUCH : HELP_FULL_KEYS; }

  _snapCam() { const v = this.pred.state; this.cam.x = this._clampX(v.x - W / 2); this.cam.y = this._clampY(v.y - H / 2); }
  _clampX(x) { return Math.max(0, Math.min(this.map.pxW - W, x)); }
  _clampY(y) { return Math.max(0, Math.min(this.map.pxH - H, y)); }

  // ───────── 入力と更新 ─────────
  fixed(dt) {
    const g = this.game, inp = g.input;
    const locked = g.ui.busy() || performance.now() < this.busyUntil || (g.net.mode === 'online' && g.net.state !== 'online');   // 再接続中は止まって待つ
    let ax = locked ? { mx: 0, my: 0 } : inp.axis();
    const jump = !locked && !!inp.take('Space');
    if (ax.mx || ax.my || jump) this.autoGo = null;            // 自分で動かしたらタップ移動はやめる
    else if (this.autoGo && !locked) ax = this._steer(dt);
    const i = this.pred.input({ mx: ax.mx, my: ax.my, jump });
    g.net.sendInput(i);
    const st = this.pred.state;
    this.stillT = st.anim === 'idle' && !st.jump ? this.stillT + dt : 0;
  }
  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.view = this.pred.view(dt);
    // カメラ
    const tx = this._clampX(this.view.x - W / 2), ty = this._clampY(this.view.y - H / 2);
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 8); this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 8);
    // 着地の砂ぼこり
    const st = this.pred.state;
    if (this._wasJump && !st.jump) { this.puff(st.x, st.y, '#e8cf9a', 6); }
    this._wasJump = !!st.jump;
    if (st.anim === 'hop' && (st.hop % 1) < (this._lastHop % 1) && Math.random() < 0.5) this.puff(st.x - st.fx * 4, st.y, '#e6c690', 2);
    this._lastHop = st.hop;
    let n = 0;
    for (const p of this.fx) { p.t += dt; if (p.t < p.life) this.fx[n++] = p; }
    this.fx.length = n;
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt * 1.4);
    this._weatherFx(dt);
    this.hidden = this.stillT >= HIDE_AFTER && inGrass(this.map, st.x, st.y);
    // 地域名
    const reg = regionAt(this.map, st.x, st.y);
    // Ver.0.8：区画の名前（土地の名前：shared/lands.js の nameLands）も 地域名の横に
    const plot = plotAt(st.x, st.y).id;
    if (!this.lastRegion || reg.name !== this.lastRegion.name || plot !== this._lastPlot) {
      const flash = !this.lastRegion || reg.name !== this.lastRegion.name;
      this.lastRegion = reg; this._lastPlot = plot;
      const L = landAt(this.map, st.x, st.y);
      this.regionEl.innerHTML = esc(reg.name) + (L ? '<small class="tb-landlabel">・' + esc(L.name) + '</small>' : '');
      this.game.debug.landName = L ? L.name : null;
      if (flash) { this.regionEl.classList.remove('flash'); void this.regionEl.offsetWidth; this.regionEl.classList.add('flash'); }
    }
    // Ver.0.5：出口に足を入れて、外へ向かっていたら旅をする
    const gt = gateAt(this.map, st.x, st.y);
    const outward = gt && ({ n: 'up', s: 'down', e: 'right', w: 'left' }[gt.dir] === st.dir) && (st.anim === 'hop' || this.autoGo);
    if (gt && outward && !this._traveling && !g.ui.busy() && this.t - (this._arrivedT || 0) > 0.8) this.travel(gt);
    this._glimpseTick(dt);
    this._tevTick(dt);
    this._fliesTick(dt);
    this._festTick(dt);   // Ver.0.8
    this._mmHoverTick();
    if (this.t > (g.isTouch ? 6 : 25) && !this._helpPinned) this.helpEl.classList.add('dim');   // 最初の数秒だけ（メニュー→ヘルプでいつでも）
    // 画面のタップ（タッチ）。マウスのクリックは従来どおり何もしない
    for (const ev of inp.takeMouse()) {
      if (ev.pt === 'mouse') continue;
      if (ev.type === 'down') this._tap = g.ui.busy() ? null : { id: ev.id, x: ev.x, y: ev.y, t: this.t };   // パネルを閉じる指は地面のタップにしない
      else if (ev.type === 'up' && this._tap && this._tap.id === ev.id) {
        const tp = this._tap; this._tap = null;
        if (Math.hypot(ev.x - tp.x, ev.y - tp.y) < 10 && this.t - tp.t < 0.6 && !g.ui.busy()) this.tapAt(ev.x, ev.y);
      } else if (ev.type === 'cancel') this._tap = null;
    }
    // キー
    if (!g.ui.busy()) {
      if (inp.take('KeyE')) this.interact();
      if (inp.take('KeyQ')) g.eat('inv');
      if (inp.take('KeyF')) g.openFriends();
      if (inp.take('KeyK')) g.openFamily();
      if (inp.take('KeyL')) this.openSurvey();
      if (inp.take('KeyN')) g.openWorldMap();
      if (inp.take('KeyC')) g.openCollection();
      if (inp.take('KeyV')) g.openAchievements();
      if (inp.take('KeyM')) this.cycleOverlay();
      if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
      if (inp.take('Enter') && !(g.ui._chatClosedAt && performance.now() - g.ui._chatClosedAt < 200)) g.ui.openChat();
      if (inp.take('Escape')) g.openMenu();
      if (inp.take('KeyH')) { this.helpEl.classList.toggle('dim'); g.ui.fitHelp(); }
    } else if (g.ui.modal && (inp.take('Escape') || (g.ui.invPanel && inp.take('KeyI')))) g.ui.closeModal();
    // 近くの対象の案内
    const tgt = this.target();
    this.curTarget = tgt;
    if (tgt && !g.ui.busy()) {
      const html = `<b>${g.isTouch ? '調べる' : 'E'}</b> ${esc(tgt.label)}`;
      if (this._promptHTML !== html) { this._promptHTML = html; this.promptEl.innerHTML = html; }
      this.promptEl.classList.remove('hidden');
    } else this.promptEl.classList.add('hidden');
  }

  // ───────── タップで移動（タッチ）─────────
  /** タップした所（画面の内部座標）へ向かう。採集物・巣穴なら着いたら拾う・入る */
  tapAt(sx, sy) {
    if (this._mm && sx >= this._mm.x0 - 4 && sx <= this._mm.x0 + this._mm.w + 4 && sy >= this._mm.y0 - 4 && sy <= this._mm.y0 + this._mm.h + 4) { this._mmTipAt(sx, sy, 3); this.cycleOverlay(); return; }
    const wx = sx + this.cam.x, wy = sy + this.cam.y, s = this.pred.state;
    // 自分をタップ：調べる（E と同じ）
    if (Math.hypot(wx - s.x, wy - (s.y - 10)) < 12) { this.autoGo = null; this.interact(); return; }
    const wv = (this.wildViews || []).find(w => Math.hypot(w.x - wx, w.y - 8 - wy) < 14);
    if (wv) { this.autoGo = { x: wv.x, y: wv.y, kind: 'wild', ref: wv, arrive: WILD_R - 6, best: 1e9, stuck: 0, t0: this.t }; return; }
    // 出口の近く（地図の端の 4 マス以内）をタップ：出口まで行って旅をする（横向きのタッチでは端がボタンの下になるので）
    for (const gt of this.map.gates || []) {
      const dx = Math.max(gt.x0 - wx, 0, wx - gt.x1), dy = Math.max(gt.y0 - wy, 0, wy - gt.y1);
      if (Math.hypot(dx, dy) < 64) { this.autoGo = { x: (gt.x0 + gt.x1) / 2, y: (gt.y0 + gt.y1) / 2, kind: 'gate', gate: gt, arrive: 2, best: 1e9, stuck: 0, t0: this.t }; return; }
    }
    const hit = pickTapTarget(wx, wy, { resources: [...this.resources.values()], entrances: this.entrances, players: this.remoteViews || [] });
    if (hit && hit.kind === 'res') this.autoGo = { x: hit.ref.x, y: hit.ref.y, kind: 'res', ref: hit.ref, arrive: PICK_R - 8 };
    else if (hit && hit.kind === 'ent') this.autoGo = { x: hit.ref.x, y: hit.ref.y + 2, kind: 'ent', ref: hit.ref, arrive: ENT_R - 8 };
    else if (hit && hit.kind === 'player') this.autoGo = { x: hit.ref.x, y: hit.ref.y, kind: 'player', ref: hit.ref, arrive: 18 };
    else this.autoGo = { x: wx, y: wy, kind: 'spot', arrive: 3 };
    this.autoGo.best = 1e9; this.autoGo.stuck = 0; this.autoGo.t0 = this.t;
  }
  _steer(dt) {
    const a = this.autoGo, s = this.pred.state;
    if (s.jump) return { mx: 0, my: 0 };
    if (a.kind === 'player' && a.ref) { const p = (this.remoteViews || []).find(v => v.id === a.ref.id); if (p) { a.x = p.x; a.y = p.y; } }
    if (a.kind === 'wild' && a.ref) { const w = (this.wildViews || []).find(v => v.id === a.ref.id); if (w) { a.x = w.x; a.y = w.y; } }
    const st = steerToward(s.x, s.y, a.x, a.y, a.arrive);
    if (a.kind === 'gate' && gateAt(this.map, s.x, s.y) === a.gate) { this.autoGo = null; this.travel(a.gate); return { mx: 0, my: 0 }; }
    if (st.done) {
      this.autoGo = null;
      if (a.kind === 'res' || a.kind === 'ent') { const tgt = this.target(); if (tgt && (tgt.res === a.ref || tgt.ent === a.ref)) this.interact(tgt); }
      if (a.kind === 'wild') { const tgt = this.target(); if (tgt && tgt.kind === 'wild') this.game.ui.toast('じっとしていると信頼が増える。調べる＝種子をあげる'); }
      return { mx: 0, my: 0 };
    }
    // 岩や水で止まったら（0.8 秒近づけない）あきらめる
    if (st.dist < a.best - 0.5) { a.best = st.dist; a.stuck = 0; } else a.stuck += dt;
    if (a.stuck > 0.8) { this.autoGo = null; if (a.kind !== 'spot' || st.dist > 12) this.game.ui.toast('そこまで行けない'); return { mx: 0, my: 0 }; }
    return st;
  }

  /** いちばん近い対象：採集物 > 巣穴 > 巣を掘る */
  target() {
    const s = this.pred.state;
    if (s.jump) return null;
    let best = null, bd = 1e9;
    for (const w of this.wildViews || []) {
      const d = Math.hypot(w.x - s.x, w.y - s.y) + (w.fol === this.me.id ? 14 : -6);   // 同じくらいなら野生の子を優先（ついてきている子は後回し：巣の入口を先に）
      if (d < WILD_R && d < bd) {
        bd = d;
        const tr = Math.round(this.trust[w.id] || 0), mine = w.fol === this.me.id;
        best = { kind: 'wild', w, label: mine ? w.name + '：なかよし（いっしょに巣へ入ろう）' : '種子をあげる（' + (w.sp === 'longear' ? 'ミミナガの' : '') + w.name + '・信頼 ' + tr + '/100）' };
      }
    }
    for (const r of this.resources.values()) {
      if (r.pending) continue;
      const d = Math.hypot(r.x - s.x, r.y - s.y);
      if (d < PICK_R && d < bd) { bd = d; best = r.kind === 'dew' ? { kind: 'dew', res: r, label: '夜露を飲む' } : r.kind === 'puddle' ? { kind: 'dew', res: r, label: '水たまりの水を飲む' }
        : r.kind === 'curio' ? { kind: 'res', res: r, label: (this.game.collection && this.game.collection.owned && this.game.collection.owned[r.cid] ? '光る物（' + ((CURIOS[r.cid] || {}).name || '？') + '・もう図鑑にある）' : '何か光るものを拾う') }
        : { kind: 'res', res: r, label: itemName(r.kind) + (r.n > 1 ? ' ×' + r.n : '') + ' を拾う' + (r.id[0] === 'x' ? '（落とし物）' : '') }; }
    }
    // Ver.0.5：不思議な穴・来た穴・調べられる物
    if (this.gate) { const d = Math.hypot(this.gate.x - s.x, this.gate.y - s.y); if (d < GATE_R && d < bd) { bd = d; best = { kind: 'gate', label: this.gate.back ? '来た穴に入る（谷へ戻る）' : '不思議な穴に入る' }; } }
    for (const pr of [...(this.map.props || []), ...this.seasonProps()]) {
      if (pr.kind === 'lights') continue;
      const d = Math.hypot(pr.x - s.x, pr.y - 6 - s.y);
      if (d < 26 && d < bd + 6) { bd = d; best = { kind: 'prop', prop: pr, label: '調べる（' + (PROP_NAME[pr.kind] || '…') + '）' }; }
    }
    for (const e of this.entrances) {
      const d = Math.hypot(e.x - s.x, e.y - s.y) - 4;   // 同じくらいの近さなら巣穴を優先
      if (d < ENT_R && d < bd) { bd = d; best = { kind: 'ent', ent: e, label: e.own ? '巣に入る（' + e.name + 'の巣）' : e.plugged ? e.name + 'の巣（入口がふさがれている）' : '訪ねる（' + e.name + 'の巣）' }; }
    }
    if (!best) { const ft = this._festTarget(s); if (ft) return ft; }   // Ver.0.8：季節の行事
    if (best) return best;
    if (nearWater(this.map, s.x, s.y)) return { kind: 'water', label: '水を飲む' };
    const gt = gateAt(this.map, s.x, s.y);
    if (gt) return { kind: 'travel', gate: gt, label: (REGION[gt.to] || {}).name + ' へ旅する' };
    if (!this.myNest && !this.map.noBurrow) {   // 富山では案内を出さない（掘れない理由は「土地」で）
      const chk = canDigBurrow(this.map, s.x, s.y, this.entrances);
      return chk.ok ? { kind: 'dig', label: 'ここに巣を掘る' } : { kind: 'nodig', label: '巣を掘れない：' + chk.reason };
    }
    return null;
  }

  async interact(pre) {
    const g = this.game, tgt = pre || this.target();
    if (!tgt) return;
    if (tgt.kind === 'res') {
      const r = tgt.res;
      r.pending = true;
      this.gatherT = this.t;
      const res = await g.net.pickup(r.id);
      if (res.ok) {
        this.resources.delete(r.id);
        this.inv = res.inv; g.ui.setInventory(this.inv);
        if (res.item === 'curio') { this.puff(r.x, r.y, '#fff8d8', 10); sfx('safe'); }   // 図鑑へ（collect の通知で札を出す）
        else g.ui.toast(itemName(res.item) + (res.n > 1 ? ' ×' + res.n : '') + ' を 手に入れた' + (r.id[0] === 'g' ? '（めずらしい！）' : ''));
        this.puff(r.x, r.y, '#fff0c0', 5);
      } else { r.pending = false; g.ui.toast(res.reason || '拾えなかった', 'bad'); }
    } else if (tgt.kind === 'ent') {
      const e = tgt.ent;
      const res = await g.net.enterNest(e.owner);
      if (!res.ok) { g.ui.toast(res.reason || '入れない', 'bad'); return; }
      g.enterNest(res.nest, e, res.invite || null);
    } else if (tgt.kind === 'dig') {
      const L = landAt(this.map, this.pred.state.x, this.pred.state.y), dt = digTime(L);
      const ok = await g.ui.confirm('巣を掘る', 'ここに あなたの巣穴を掘りますか？<br>' + g.ui.landSummaryHTML(L) + '<span class="tb-dim">（巣穴は 1 つだけ。あとから中を広げられる。土地は「土地」で調べられ、あとで引っ越しもできる）</span>', '掘る', 'やめる');
      if (!ok) return;
      this.busyUntil = performance.now() + dt * 1000 + 200;
      this.digT = this.t; this.digDur = dt;
      await new Promise(r => setTimeout(r, dt * 1000));
      const s = this.pred.state;
      const res = await g.net.digBurrow(s.x, s.y);
      if (!res.ok) { g.ui.toast(res.reason || '掘れなかった', 'bad'); return; }
      this.onEntrance({ entrance: res.entrance });
      this.myNest = { id: res.entrance.nestId, x: res.entrance.x, y: res.entrance.y, land: res.land };
      if (res.inv) { this.inv = res.inv; g.ui.setInventory(this.inv); }
      this.puff(res.entrance.x, res.entrance.y, '#b98552', 10);
      g.ui.toast(g.isTouch ? '巣穴ができた！ 入口をタップすると入れる' : '巣穴ができた！ 入口で E を押すと入れる');
    } else if (tgt.kind === 'dew' || tgt.kind === 'water') {
      const r = tgt.res;
      if (r) r.pending = true;
      const res = await g.net.drink(r ? r.id : undefined);
      if (r) r.pending = false;
      if (!res.ok) { g.ui.toast(res.reason || '飲めなかった', 'bad'); return; }
      if (r) { this.resources.delete(r.id); this.puff(r.x, r.y, '#bfe8ff', 5); }
      g.setLife(res.life, true);
      this.eatT = this.t;
      g.ui.toast((res.src === 'dew' ? '夜露を飲んだ' : '水を飲んだ') + '（水分 ' + Math.round(res.life.thirst) + '）');
    } else if (tgt.kind === 'nodig') {
      g.ui.toast(tgt.label, 'bad');
    } else if (tgt.kind === 'fest') {   // Ver.0.8
      if (tgt.why) g.ui.toast(tgt.why, 'bad'); else this.doFest(tgt.act);
    } else if (tgt.kind === 'festsit') {
      g.ui.toast('そのまま じっと すわって、空を 見上げよう');
    } else if (tgt.kind === 'travel') {
      this.travel(tgt.gate);
    } else if (tgt.kind === 'gate') {
      this.enterGate();
    } else if (tgt.kind === 'prop') {
      const pr = tgt.prop;
      let text = pr.kind === 'shrine' && this.map.region === 'toyama' ? shrineText(pr.text, (g.env && g.env.season) || 'spring') : pr.text;
      g.debug.lastProp = pr.kind;
      // Ver.0.7：富山の小さな出来事（1 回だけ）。夏の夜の光る板・冬の雪の上の足あと
      const ev = pr.tev || (pr.kind === 'phone' && this.map.region === 'toyama' && !this._tevSeen('board') && g.env && g.env.season === 'summer' && this.tod && this.tod.period === 'night' ? 'board' : null);
      if (ev) {
        if (ev === 'board') text = boardText(this.tod.hour);
        const r = await this._tevSend(ev);
        if (r && r.ok) { g.debug.tevShown = (g.debug.tevShown || []).concat(ev); if (ev === 'board') this.fx.push({ x: pr.x, y: pr.y - 10, vx: 0, vy: -4, t: 0, life: 1.6, color: '#d8ecff' }); }
        else if (ev === 'board') text = pr.text;
      }
      if (pr.kind === 'stone' && !this.gate) { const col = g.collection || {}; text += '<br><span class="tb-dim">' + esc(gateHint({ env: g.env, owned: col.owned || {}, found: !!col.found })) + '</span>'; }
      g.ui.note(text);
    } else if (tgt.kind === 'wild') {
      const w = tgt.w;
      if (w.fol === this.me.id) { g.ui.toast(w.name + ' は ついてくる。自分の巣の入口へ行って、いっしょに入ろう'); return; }
      if (this._courting) return;
      this._courting = true;
      const res = await g.net.court(w.id);
      this._courting = false;
      if (!res.ok) { g.ui.toast(res.reason || 'うけとってくれなかった', 'bad'); return; }
      if (res.inv) { this.inv = res.inv; g.ui.setInventory(this.inv); }
      this.eatT = this.t; this.hearts(w.x, w.y);
      g.ui.toast(res.befriended ? (res.name || w.name) + ' と なかよしになった！' : (res.name || w.name) + ' が 種子を食べた（信頼 ' + res.trust + '/100）');
      g.debug.court = (g.debug.court || 0) + 1;
    }
  }

  // ───────── 旅（Ver.0.5）─────────
  /** 出口から、となりの土地へ（画面を暗くして、着いたら地図を差し替える） */
  async travel(gt) {
    const g = this.game;
    if (this._traveling) return;
    this._traveling = true; this.autoGo = null;
    g.fade(true);
    const r = await g.net.travel(gt.to);
    if (!r.ok) { g.fade(false); this._traveling = false; this._arrivedT = this.t; g.ui.toast(r.reason || '行けなかった', 'bad'); return; }
    g.arrive(r.world, 'travel');
    this._traveling = false;
  }
  async enterGate() {
    const g = this.game;
    if (this._traveling) return;
    this._traveling = true; this.autoGo = null;
    g.fade(true, this.gate && !this.gate.back ? 'white' : null);
    const r = await g.net.enterGate();
    if (!r.ok) { g.fade(false); this._traveling = false; g.ui.toast(r.reason || '入れなかった', 'bad'); return; }
    g.arrive(r.world, 'gate', r.first);
    this._traveling = false;
  }
  /**
   * 富山の夜：遠くに白い小さな影が見えることがある（近づくと消える。名前はない）。
   * Ver.0.6：季節ごとに決まった所（shared/toyama.js の GLIMPSE_SPOTS）にだけ、その所が 100〜300px 先に見えているとき。説明はしない。
   */
  _glimpseTick(dt) {
    if (this.map.region !== 'toyama') { this.glimpse = null; return; }
    const tod = this.tod, s = this.pred.state;
    if (this.glimpse) {
      const gl = this.glimpse;
      gl.t += dt;
      const d = Math.hypot(gl.x - s.x, gl.y - s.y);
      if (d < 90 && !gl.going && !gl.near) { gl.going = true; gl.t = Math.max(gl.t, gl.life - 0.6); }
      if (gl.t > gl.life) this.glimpse = null;
      return;
    }
    if (!tod || tod.period !== 'night') return;
    this._glimpseT -= dt;
    if (this._glimpseT > 0) return;
    const season = (this.game.env && this.game.env.season) || 'spring';
    const at = glimpseSpot(season, tod.period, s.x, s.y);
    if (!at) { this._glimpseT = 2; return; }
    this._glimpseT = GLIMPSE.GAP_MIN + Math.random() * (GLIMPSE.GAP_MAX - GLIMPSE.GAP_MIN);
    this.glimpse = { x: at.x, y: at.y, t: 0, life: GLIMPSE.LIFE, season };
    this.game.debug.glimpse = { season, x: at.x, y: at.y, n: (this.game.debug.glimpse ? this.game.debug.glimpse.n : 0) + 1 };
    if (!this._glimpsed) { this._glimpsed = true; setTimeout(() => this.game.ui.toast('…いま、なにか白いものが いた気がする'), 1600); }
  }
  // ───────── Ver.0.7：富山の小さな出来事（shared/toyama.js。1 回だけ・説明しない）─────────
  _tevSeen(id) { const c = this.game.collection; return !!(c && c.tev && c.tev[id]); }
  /** 見たことをバックエンドへ（サーバーが条件を確かめて記録）。記録できたら図鑑の印に */
  async _tevSend(id) {
    const g = this.game;
    if (this._tevBusy) return null;
    this._tevBusy = true;
    let r = null;
    try { r = g.net.toyamaEvent ? await g.net.toyamaEvent(id) : null; } finally { this._tevBusy = false; }
    if (r && r.ok) {
      if (!g.collection.tev) g.collection.tev = {};
      Object.assign(g.collection.tev, r.seen || { [id]: Date.now() });
      if (!this._tevNow) this._tevNow = new Set();
      this._tevNow.add(id);
      g.debug.tev = Object.keys(g.collection.tev);
    }
    return r;
  }
  /** 時刻・図鑑で起きる出来事：4:44 ごろの遠い音・不思議な品がそろったあとの夜の白い影 */
  _tevTick(dt) {
    if (this.map.region !== 'toyama' || !this.tod || this._tevBusy || this._traveling) return;
    this._tevT = (this._tevT || 0) - dt;
    if (this._tevT > 0) return;
    this._tevT = 0.5;
    const g = this.game, s = this.pred.state, hour = this.tod.hour;
    if (!this._tevSeen('train') && trainTime(hour)) {
      this._tevSend('train').then(r => {
        if (!r || !r.ok || !r.first) return;
        sfx('train');
        g.ui.toast(TRAIN_TEXT);
        g.debug.tevShown = (g.debug.tevShown || []).concat('train');
      });
      return;
    }
    if (!this._tevSeen('white_near') && this.tod.period === 'night' && this.t - (this._arrivedT || 0) > 6 && !this.glimpse && crossoverComplete(g.collection && g.collection.owned)) {
      this._tevSend('white_near').then(r => {
        if (!r || !r.ok || !r.first) return;
        // 向いている方（ついてくる子たちは後ろ）に、すぐ近く
        const f = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[s.dir] || [1, 0];
        this.glimpse = { x: s.x + f[0] * TEV.NEAR_D, y: s.y + f[1] * TEV.NEAR_D * 0.8 + 4, t: 0, life: TEV.NEAR_LIFE, season: (g.env && g.env.season) || 'spring', near: true };
        this._glimpseT = GLIMPSE.GAP_MAX;
        g.debug.glimpse = { season: this.glimpse.season, x: this.glimpse.x, y: this.glimpse.y, near: true, n: (g.debug.glimpse ? g.debug.glimpse.n : 0) + 1 };
        g.debug.tevShown = (g.debug.tevShown || []).concat('white_near');
        setTimeout(() => g.ui.toast(NEAR_TEXT), 1400);
      });
    }
  }
  /** 冬の雪の上の小さな足あと（見るまで。見たあとも その場にいるあいだは残す） */
  _footOn() { const se = this.game.env && this.game.env.season; return this.map.region === 'toyama' && se === 'winter' && (!this._tevSeen('footprints') || (this._tevNow && this._tevNow.has('footprints'))); }
  drawFootprints(g) {
    if (!this._footOn()) return;
    for (let i = 0; i < FOOTPRINTS.length; i++) {
      const q = FOOTPRINTS[i], a = 0.62 + 0.38 * (i / FOOTPRINTS.length);
      // 小さな足あと（くぼみ：影の色＋ふちの白）。先へ行くほど少し浅い
      g.fillStyle = `rgba(250,252,255,${0.5 * a})`; g.fillRect(q.x - 2, q.y - 2, 4, 1);
      g.fillStyle = `rgba(78,92,122,${a})`; g.fillRect(q.x - 1, q.y - 1, 3, 3);
      g.fillRect(q.x - 2 + (q.side ? 0 : 1), q.y - 3, 1, 1); g.fillRect(q.x + 1 + (q.side ? 0 : 1), q.y - 3, 1, 1);
    }
  }
  /** 蛍（夏の夜の富山・谷の水べ）・富山と谷の冬の雪のつもり */
  _fliesTick(dt) {
    const env = this.game.env, tod = this.tod;
    const on = env && env.season === 'summer' && tod && tod.period === 'night' && (this.map.region === 'toyama' || this.map.region === 'canyon');
    let n = 0;
    for (const f of this.flies) { f.t += dt; f.x += Math.cos(f.a) * 6 * dt; f.y += Math.sin(f.a * 1.3) * 4 * dt; f.a += (Math.random() - 0.5) * dt * 3; if (f.t < f.life) this.flies[n++] = f; }
    this.flies.length = n;
    if (!on || this.flies.length > 70 || !this.wet.length) return;
    if (Math.random() < dt * 16) {
      const w = this.wet[Math.floor(Math.random() * this.wet.length)];
      const x = w.tx * 16 + 8, y = w.ty * 16 - 4;
      if (Math.abs(x - this.view.x) < W && Math.abs(y - this.view.y) < H) this.flies.push({ x, y, a: Math.random() * 6, t: 0, life: 4 + Math.random() * 4, ph: Math.random() * 6 });
    }
  }

  puff(x, y, color, n = 4) {
    for (let i = 0; i < n; i++) this.fx.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 10, t: 0, life: 0.4 + Math.random() * 0.3, color });
  }

  // ───────── 描画 ─────────
  draw() {
    const g = this.game.screen.g, sc = this.game.screen;
    const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 6 * this.shake * 2) : 0;
    const cx = Math.max(0, Math.round(this.cam.x) + sh), cy = Math.round(this.cam.y);
    g.drawImage(this.ground, cx, cy, W, H, 0, 0, W, H);
    g.save(); g.translate(-cx, -cy);
    // Ver.0.5：川・水田（季節で稲の色）・水路
    if (this.wet.length) {
      const sIx = SEASON_IX[(this.game.env && this.game.env.season) || 'spring'] || 0, fr = Math.floor(this.t * 4);
      for (const w of this.wet) {
        const x = w.tx * 16, y = w.ty * 16;
        if (x < cx - 16 || y < cy - 16 || x > cx + W || y > cy + H) continue;
        const cut = w.t === T.PADDY && this.map.region === 'toyama' && paddyHarvested(this.game.env && this.game.env.season, w.tx);
        const ok = w.t === T.RIVER ? Sprites.drawCell(g, 'tile.river', (fr + w.tx) % 4, x, y) : cut ? (Sprites.drawCell(g, 'tile.paddy_cut', (w.tx + w.ty) % 2, x, y) || A.drawStubble(g, x, y, w.tx, w.ty)) : w.t === T.PADDY ? Sprites.drawCell(g, 'tile.paddy', sIx, x, y) : Sprites.drawCell(g, 'tile.channel', (fr >> 1) % 2, x, y);
        if (!ok) { g.fillStyle = w.t === T.PADDY ? (sIx === 3 ? '#dfe6ee' : '#5fa9c9') : '#3f8ab5'; g.fillRect(x, y, 16, 16); }
      }
    }
    this.drawSnow(g, cx, cy);
    this.drawGates(g);
    // 水
    for (const w of this.water) {
      const x = w.tx * 16, y = w.ty * 16;
      if (x < cx - 16 || y < cy - 16 || x > cx + W || y > cy + H) continue;
      if (!Sprites.drawCell(g, 'tile.water', Math.floor(this.t * 3 + (w.tx + w.ty) * 0.5), x, y)) A.drawWater(g, x, y, this.t, w.edges, w.tx, w.ty);
    }
    if (this.shore) for (const w of this.shore) {
      const x = w.tx * 16, y = w.ty * 16;
      if (x < cx - 16 || y < cy - 16 || x > cx + W || y > cy + H) continue;
      Sprites.drawCell(g, 'tile.edge.water', w.bits, x, y, Math.floor(this.t * 3) % 4);
    }
    // 巣穴
    for (const e of this.entrances) {
      if (!Sprites.drawEntry(g, 'tile.burrow', e.own ? 0 : 1, e.x, e.y + 2)) A.drawBurrow(g, e.x, e.y, e.own);
      if (e.plugged && !Sprites.drawEntry(g, 'tile.plug', 0, e.x, e.y + 2)) A.drawPlug(g, e.x, e.y + 1);
    }
    if (this.surveyAt && this.t - this.surveyT < 20 && !Sprites.drawEntry(g, 'ui.land_flag', 0, this.surveyAt.x + 6, this.surveyAt.y)) { g.fillStyle = '#6e4a30'; g.fillRect(Math.round(this.surveyAt.x) + 6, Math.round(this.surveyAt.y) - 12, 1, 12); g.fillStyle = '#e05040'; g.fillRect(Math.round(this.surveyAt.x) + 7, Math.round(this.surveyAt.y) - 12, 5, 4); }
    // 採集物
    const tgt = this.curTarget;
    for (const r of this.resources.values()) {
      if (r.x < cx - 16 || r.y < cy - 16 || r.x > cx + W + 16 || r.y > cy + H + 16) continue;
      const hi = tgt && tgt.kind === 'res' && tgt.res === r;
      g.globalAlpha = r.pending ? 0.4 : 1;
      if (r.kind !== 'dew' && !Sprites.has('item.' + r.kind + '.ground')) { g.fillStyle = 'rgba(40,24,10,.25)'; g.fillRect(r.x - 4, r.y + 2, 8, 2); }
      if (hi) { g.fillStyle = 'rgba(255,240,180,' + (0.35 + 0.25 * Math.sin(this.t * 8)) + ')'; g.beginPath(); g.ellipse(r.x, r.y + 1, 8, 4, 0, 0, Math.PI * 2); g.fill(); }
      const bob = hi ? Math.round(Math.sin(this.t * 6) * 1) - 1 : 0;
      if (r.kind === 'curio') { if (!Sprites.drawEntry(g, 'item.curio.ground', Math.floor(this.t * 4 + r.x) % 3, r.x, r.y + 3 + bob)) { g.fillStyle = '#fff8d8'; g.fillRect(Math.round(r.x) - 2, Math.round(r.y) - 4 + bob, 4, 4); } }
      else if (r.kind === 'dew') A.drawDew(g, r.x, r.y + bob, this.t + r.x * 0.13);
      else if (r.kind === 'puddle') { if (!Sprites.drawEntry(g, 'tile.puddle', (r.x >> 3) & 1, r.x, r.y + 3)) A.drawPuddle(g, r.x, r.y + 1, this.t); const tw = 0.5 + 0.5 * Math.sin(this.t * 3 + r.y); g.fillStyle = `rgba(240,252,255,${0.4 + 0.5 * tw})`; g.fillRect(Math.round(r.x + 2), Math.round(r.y - 1), 1, 1); }
      else if (!Sprites.drawEntry(g, 'item.' + r.kind + '.ground', 0, r.x, r.y + 3 + bob)) A.drawItem(g, r.kind, r.x - 8, r.y - 12 + bob);
      if (r.id && r.id[0] === 'x') { g.fillStyle = 'rgba(255,230,150,' + (0.5 + 0.3 * Math.sin(this.t * 5 + r.x)) + ')'; g.fillRect(Math.round(r.x) - 6, Math.round(r.y) - 11, 1, 1); g.fillRect(Math.round(r.x) + 5, Math.round(r.y) - 9, 1, 1); }
      if (r.id && r.id[0] === 'g') { const tw = (this.t * 1.3 + r.x * 0.01) % 1; g.fillStyle = `rgba(255,250,220,${1 - tw})`; g.fillRect(Math.round(r.x) + 4, Math.round(r.y) - 10 - Math.round(tw * 4), 1, 1); }
      g.globalAlpha = 1;
    }
    // 捕食者：フクロウの影（地面）と、地上の捕食者（並べて描く）
    const now0 = this.serverNow();
    this.predViews = [];
    for (const v of this.preds.values()) {
      const q = v.interp.sample(now0) || v.latest;
      if (!q) continue;
      const pv = { ...v.latest, x: q.x, y: q.y, z: q.z || 0, sx: q.sx ?? v.latest.sx, sy: q.sy ?? v.latest.sy, sr: q.sr ?? v.latest.sr, kind: v.kind, gone: !!v.goneAt };
      this.predViews.push(pv);
      if (pv.kind === 'owl') this.drawOwlShadow(g, pv);
    }
    // 不思議な穴・来た穴
    if (this.gate) {
      const gx = this.gate.x, gy = this.gate.y + 2;
      if (!Sprites.drawEntry(g, 'tile.hole', Math.floor(this.t * 4) % 4, gx, gy)) { g.fillStyle = '#1a2040'; g.beginPath(); g.ellipse(gx, gy - 2, 9, 5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#e8f0ff'; g.stroke(); }
      if (Math.random() < 0.15) this.fx.push({ x: gx + (Math.random() - 0.5) * 16, y: gy - 2, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 10, t: 0, life: 1.2, color: '#e8f0ff' });
    }
    this.drawFootprints(g);   // Ver.0.7：冬の富山の雪の上の足あと
    // 背の高いもの＋トビネズミを y でならべる
    const list = [];
    for (const o of this.tall) if (o.x > cx - 40 && o.x < cx + W + 40 && o.y > cy - 10 && o.y < cy + H + 70) list.push(o);
    for (const pr of this.seasonProps()) if (pr.x > cx - 40 && pr.x < cx + W + 40 && pr.y > cy - 10 && pr.y < cy + H + 70) list.push({ kind: 'prop', pk: pr.kind, x: pr.x, y: pr.y, v: pr.v || 0, prop: pr });
    // Ver.0.8：季節の行事の印（花・灯り・供えた種の山）
    for (const m of this.festView()) if (m.kind !== 'gaze' && m.kind !== 'offer' && m.x > cx - 30 && m.x < cx + W + 30 && m.y > cy - 10 && m.y < cy + H + 30) list.push({ kind: 'fmark', x: m.x, y: m.y, m });
    if (this._offerN > 0 && OFFER_SPOT.x > cx - 40 && OFFER_SPOT.x < cx + W + 40 && OFFER_SPOT.y > cy - 20 && OFFER_SPOT.y < cy + H + 30) list.push({ kind: 'fpile', x: OFFER_SPOT.x, y: OFFER_SPOT.y });
    const now = this.serverNow();
    this.remoteViews = [];
    for (const rp of this.players.values()) {
      const s = rp.interp.sample(now) || rp.last;
      if (s.anim === 'hop' || s.anim === 'walk') rp.hop += 1 / 60 / FIELD.HOP_PERIOD; else rp.hop = 0;
      rp.last = s;
      const v = { kind: 'player', x: s.x, y: s.y, z: s.z || 0, dir: s.dir, anim: s.anim, hop: rp.hop, jump: s.jump, fur: rp.fur, look: rp.look, name: rp.name, id: rp.id, k: s.k || null, kh: s.kh ? 1 : 0 };
      list.push(v); this.remoteViews.push(v);
    }
    for (const pv of this.predViews) if (pv.kind !== 'owl') list.push({ ...pv, kind: 'pred', pkind: pv.kind });
    if (this.glimpse) list.push({ kind: 'glimpse', x: this.glimpse.x, y: this.glimpse.y, gl: this.glimpse });
    // 野生のトビネズミ
    this.wildViews = [];
    for (const v of this.wild.values()) {
      const q = v.interp.sample(now0) || v.latest;
      if (!q || v.goneAt) continue;
      const wv = { kind: 'wild', id: v.id, x: q.x, y: q.y, z: q.z || 0, dir: q.dir || v.latest.dir, anim: q.anim || 'idle', jump: q.jump, look: v.latest.look, name: v.latest.name, fol: v.latest.fol, mood: v.latest.mood, sp: v.latest.sp || null, hop: (v.hop = (q.anim === 'hop' ? (v.hop || 0) + 1 / 60 / FIELD.HOP_PERIOD : 0)) };
      list.push(wv); this.wildViews.push(wv);
    }
    const me = this.view;
    let myAnim = me.anim;
    if (this.digT != null && this.t - this.digT < (this.digDur || 1) + 0.2) myAnim = 'dig';
    else if (this.gatherT != null && this.t - this.gatherT < 0.35) myAnim = 'gather';
    else if (this.eatT != null && this.t - this.eatT < 0.7 && me.anim === 'idle') myAnim = 'eat';
    const meV = { kind: 'player', me: true, x: me.x, y: me.y, z: me.z, dir: me.dir, anim: myAnim, hop: me.hop, jump: me.jump, fur: this.me.fur, look: this.me.look || this.game.look, name: this.me.name, id: this.me.id, cd: me.cd };
    list.push(meV);
    // 連れている若者（足あとをたどってついてくる・捕食者が来ると巣へかくれる）
    this._kids(list, meV, this.game.myKids || [], true);
    for (const v of this.remoteViews) { const rp = this.players.get(v.id); if (rp && rp.kids && rp.kids.length) this._kids(list, v, rp.kids, false); }
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.kind === 'player') this.drawJerboa(g, o);
      else if (o.kind === 'wild') this.drawWild(g, o);
      else if (o.kind === 'kid') this.drawKid(g, o);
      else if (o.kind === 'pred') this.drawPred(g, o);
      else if (o.kind === 'shrub') { if (!Sprites.drawEntry(g, 'tile.shrub', o.v, o.x, o.y)) A.drawShrub(g, o.x, o.y, o.v); }
      else if (o.kind === 'rock') { if (!Sprites.drawEntry(g, 'tile.rock_small', o.v, o.x, o.y)) A.drawRock(g, o.x, o.y, o.v); }
      else if (o.kind === 'rock_big') { Sprites.drawEntry(g, 'tile.rock_big', o.v, o.x, o.y); }
      else if (o.kind === 'stones') {
        // 小石の山（大ジャンプで越えられる）：小石の飾りを 3 つ寄せて積む
        if (Sprites.has('tile.pebbles')) { Sprites.drawEntry(g, 'tile.pebbles', o.v, o.x - 4, o.y + 2); Sprites.drawEntry(g, 'tile.pebbles', o.v + 1, o.x + 4, o.y + 3); Sprites.drawEntry(g, 'tile.pebbles', o.v + 2, o.x, o.y - 1); }
        else A.drawStones(g, o.x, o.y, o.v);
      }
      else if (o.kind === 'tree') { if (!Sprites.drawEntry(g, 'tile.tree', 0, o.x, o.y)) A.drawTree(g, o.x, o.y); }
      else if (o.kind === 'sakura') { const si = SEASON_IX[(this.game.env && this.game.env.season) || 'spring'] || 0; if (!Sprites.drawEntry(g, 'tile.sakura', si, o.x, o.y)) { g.fillStyle = ['#f0a8c0', '#4f8236', '#d0702c', '#8c6744'][si]; g.beginPath(); g.ellipse(o.x, o.y - 26, 16, 12, 0, 0, Math.PI * 2); g.fill(); } }
      else if (o.kind === 'house') { if (!Sprites.drawEntry(g, 'tile.house', o.v, o.x, o.y)) { g.fillStyle = '#ebe2cf'; g.fillRect(o.x - 42, o.y - 40, 84, 38); g.fillStyle = '#2c3644'; g.fillRect(o.x - 46, o.y - 74, 92, 36); } }
      else if (o.kind === 'prop') this.drawProp(g, o);
      else if (o.kind === 'glimpse') this.drawGlimpse(g, o);
      else if (o.kind === 'fmark') this.drawFestMark(g, o);
      else if (o.kind === 'fpile') { const sz = offerPileSize(this._offerN); if (!Sprites.drawEntry(g, 'tile.fest_offering', sz - 1, o.x, o.y)) A.drawOfferPile(g, o.x, o.y, sz, this._moonK > 0.2); }
    }
    // タップで向かっている所
    if (this.autoGo) {
      const a = this.autoGo, k = (this.t * 2) % 1;
      g.strokeStyle = `rgba(255,236,170,${0.9 - k * 0.6})`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, 3 + k * 4, 1.5 + k * 2, 0, 0, Math.PI * 2); g.stroke();
    }
    // 砂ぼこり
    for (const p of this.fx) {
      g.globalAlpha = 1 - p.t / p.life;
      if (p.heart) { if (!Sprites.drawEntry(g, 'ui.heart', 4, p.x + p.vx * p.t, p.y + p.vy * p.t)) { g.fillStyle = p.color; g.fillRect(Math.round(p.x + p.vx * p.t), Math.round(p.y + p.vy * p.t), 3, 3); } }
      else { g.fillStyle = p.color; g.fillRect(Math.round(p.x + p.vx * p.t), Math.round(p.y + p.vy * p.t), 2, 1); }
    }
    g.globalAlpha = 1;
    // フクロウの影の輪（トビネズミより上に：影が見えるように）と、空のフクロウ（いちばん上）
    for (const pv of this.predViews) if (pv.kind === 'owl' && (pv.state === 'stalk' || pv.state === 'dive')) {
      const r = pv.sr || 4, x = Math.round(pv.sx ?? pv.x) + 0.5, y = Math.round(pv.sy ?? pv.y) + 0.5, pulse = 0.5 + 0.5 * Math.sin(this.t * 14);
      g.strokeStyle = pv.target === this.me.id ? `rgba(255,80,60,${0.45 + 0.45 * pulse})` : 'rgba(255,200,180,.45)'; g.lineWidth = 1;
      g.setLineDash([2, 2]); g.beginPath(); g.ellipse(x, y, r * 2 + 3, r + 2, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
    for (const pv of this.predViews) if (pv.kind === 'owl') this.drawPred(g, { ...pv, pkind: 'owl' });
    g.restore();
    // 天気・季節の色（夜の暗さより下に塗る）→ 昼夜：色味と暗さ（自分のまわりはほんのり明るい）・水面の星と月 → 天気の粒
    this.drawWeather(g, cx, cy, 'tint');
    this.drawNight(g, cx, cy, list);
    this.drawFestSky(g, cx, cy, list);   // Ver.0.8：流れ星・いっしょに すわった子の きらきら・灯り
    this.drawWeather(g, cx, cy, 'fx');
    // 捕食者の「！」（暗くても見える）・狙われているときの画面の端の赤・つかまった瞬間の赤
    this.drawAlerts(g, cx, cy);
    this.drawMinimap(g);

    // UI レイヤー：名札・吹き出し・巣穴の名前
    sc.clearUI();
    const nowMs = performance.now();
    if (this.overlay && this._mm) sc.text(this._mm.x0 + this._mm.w / 2, this._mm.y0 + this._mm.h + 2, this.overlay === 'danger' ? '危険（緑→赤）' : '食料（多いほど緑）', { size: 6, color: this.overlay === 'danger' ? '#ffb8a0' : '#b8f0a8', alpha: 0.95 });
    this.drawMmTip(sc);   // Ver.0.8：ミニマップの土地の名前
    for (const e of this.entrances) {
      const x = e.x - cx, y = e.y - cy;
      if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
      const fr = !e.own && this.isFriend(e.owner);
      sc.text(x, y + 14, e.name + 'の巣' + (fr ? '（フレンド）' : ''), { size: 6, color: e.own ? '#ffe9a8' : fr ? '#bff0c8' : '#f2dcc0', alpha: 0.9 });
    }
    // 出口の行き先（近くに来たら）
    for (const gt of this.map.gates || []) {
      const d = Math.hypot(gt.ax - this.view.x, gt.ay - this.view.y);
      if (d > 160) continue;
      const lx = (gt.x0 + gt.x1) / 2 - cx, ly = (gt.dir === 'n' ? 22 : gt.dir === 's' ? this.map.pxH - 26 : (gt.y0 + gt.y1) / 2) - cy;
      const arrow = { n: '↑', s: '↓', e: '→', w: '←' }[gt.dir];
      sc.text(Math.max(40, Math.min(W - 40, lx + (gt.dir === 'e' ? -30 : gt.dir === 'w' ? 30 : 0))), ly, arrow + ' ' + (REGION[gt.to] || {}).name, { size: 7, color: '#fff4c8', alpha: Math.min(1, (160 - d) / 60) });
    }
    if (this.gate && Math.hypot(this.gate.x - this.view.x, this.gate.y - this.view.y) < 120) sc.text(this.gate.x - cx, this.gate.y - cy + 14, this.gate.back ? '来た穴' : '不思議な穴', { size: 6, color: '#e8f0ff', alpha: 0.9 });
    for (const o of list) if (o.kind === 'wild') {
      const x = o.x - cx, y = o.y - cy - (o.z || 0);
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
      sc.text(x, y - (o.sp === 'longear' ? 40 : 34), (o.fol === this.me.id ? '♥ ' : '') + (o.sp === 'longear' ? 'ミミナガの' : '野生の') + o.name, { size: 6, color: o.fol === this.me.id ? '#ffc0cc' : o.sp === 'longear' ? '#d8e8ff' : '#e8e0c8', alpha: 0.9 });
    }
    for (const o of list) if (o.kind === 'kid' && o.comp && o.alpha > 0.3) sc.text(o.x - cx, o.y - cy - 37, '☆' + o.name, { size: 5, color: '#d8e8ff', alpha: 0.8 * o.alpha });   // Ver.0.7：地上の なかま
    for (const o of list) if (o.kind === 'player') {
      const x = o.x - cx, y = o.y - cy - (o.z || 0);
      sc.nameTag(x, y - 29, o.name, { me: !!o.me });
      if (o.me && this.hidden && ((this.predViews && this.predViews.length) || (this.tod && this.tod.period !== 'day'))) sc.text(x, y + 9, 'かくれている', { size: 6, color: '#c8f0a0', alpha: 0.9 });
      const b = this.bubbles.get(o.id);
      if (b && b.until > nowMs) sc.bubble(x, y - 38, b.text, { alpha: Math.min(1, (b.until - nowMs) / 400) });
    }
  }

  // ───────── Ver.0.8「季節のたのしみ」：季節の行事（shared/festival.js）─────────
  _festInit(world) {
    this.festMarks = new Map(); this.fest = null; this._festT = 0; this._festTry = 0; this._festView = []; this._offerN = 0; this._moonK = 0;
    for (const m of (world.fest && world.fest.marks) || []) this._addMark(m);
    this._festRefresh();
  }
  _markKey(m) { return m.occ + ':' + m.owner + ':' + (m.region || 'plains'); }
  _addMark(m) {
    if (!m || (m.region || 'plains') !== (this.map.region || 'plains')) return false;
    this.festMarks.set(this._markKey(m), m);
    return true;
  }
  /** 行事の印が増えた（自分・ほかの子・NPC） */
  onFest(msg) {
    const m = msg && msg.mark;
    if (!this.ready || !m) return;
    const isNew = !this.festMarks.has(this._markKey(m));
    if (!this._addMark(m)) return;
    this._festRefresh();
    if (isNew && m.kind !== 'gaze') this.puff(m.kind === 'offer' ? OFFER_SPOT.x : m.x, (m.kind === 'offer' ? OFFER_SPOT.y : m.y) - 4, m.kind === 'lantern' ? '#ffd890' : m.kind === 'plant' ? '#ffc8dc' : '#f4ecd0', 6);
  }
  /** いま見える印（同じ回のもの） */
  festView() { return this._festView; }
  _festRefresh() {
    const net = this.game.net;
    if (!net || !net.clock) return;
    const t = this.serverNow();
    this.fest = festivalAt(net.clock, t);
    this._festView = marksVisible([...this.festMarks.values()], net.clock, t, this.map.region || 'plains');
    this._offerN = this._festView.filter(m => m.kind === 'offer').length;
    this.festJoined = this._festView.some(m => String(m.owner) === String(this.me.id));
    const d = this.game.debug;
    d.fest = { id: this.fest.id, phase: this.fest.phase, occ: this.fest.occ, act: this.fest.act, joined: this.festJoined, marks: this._festView.map(m => ({ kind: m.kind, owner: m.owner, name: m.name, x: m.x, y: m.y })), offer: this._offerN };
  }
  /** 0.5 秒ごと：行事の様子・お知らせ（やさしいトースト）・星見の すわる（自動） */
  _festTick(dt) {
    const g = this.game;
    // すわっている秒（ほかの子・NPC：補間した見た目の動きで）
    for (const rp of this.players.values()) { const s = rp.last; rp.sitT = s && s.anim === 'idle' && !s.jump ? (rp.sitT || 0) + dt : 0; }
    this._festT -= dt;
    if (this._festT > 0) return;
    this._festT = 0.5;
    const before = this.fest;
    this._festRefresh();
    const f = this.fest;
    if (!f) return;
    // お知らせ：行事の夜になった（その回に 1 回）・もうすぐ（世界の 3 時間前から 1 回）。富山では出さない
    if (this.map.region !== 'toyama' && !g.ui.busy()) {
      if (f.phase === 'during' && this._festToast !== f.occ + 'd') { this._festToast = f.occ + 'd'; this._festToastSoon = f.occ; g.ui.toast(f.toast); g.debug.festToast = f.toast; if (before && before.phase === 'before') sfx('fest'); }
      else if (f.phase === 'before' && f.startW - f.w <= 3 * HOUR_MS && this._festToastSoon !== f.occ) { this._festToastSoon = f.occ; g.ui.toast('もうすぐ「' + f.name + '」（今夜 19 時から・' + f.where + '）'); g.debug.festToast = 'soon:' + f.id; }
    }
    // 星見：丘で じっと すわったら 参加（1 回）
    const s = this.pred.state;
    if (f.phase === 'during' && f.act === 'gaze' && !this.festJoined && onHill(this.map.region || 'plains', s.x, s.y) && this.stillT >= FEST.SIT_SEC && this.t - this._festTry > 3 && !this._festBusy) this.doFest('gaze', true);
  }
  /** 「調べる」の案内（行事の夜で、その場所にいるとき） */
  _festTarget(s) {
    const f = this.fest, g = this.game;
    if (!f || f.phase !== 'during' || this.festJoined || this.map.region === 'toyama') return null;
    const region = this.map.region || 'plains';
    if (f.act === 'gaze') return onHill(region, s.x, s.y) ? { kind: 'festsit', label: '星見：じっと すわって 空を見る（' + Math.min(FEST.SIT_SEC, Math.floor(this.stillT)) + '/' + FEST.SIT_SEC + '）' } : null;
    const ent = this.myNest && (this.myNest.region || 'plains') === region ? this.entrances.find(e => e.own) || null : null;
    const ctx = { fest: f, act: f.act, region, x: s.x, y: s.y, entrance: ent, spawn: this.map.spawn, done: false, inv: this.inv, still: 99, place: 'field' };
    const why = festActBlock(ctx);
    if (!why) return { kind: 'fest', act: f.act, label: f.name + '：' + f.verb + costText(f.cost) };
    // 場所は合っていて 持ち物だけ足りない → 理由つきで案内
    if (/要る$/.test(why)) return { kind: 'fest', act: f.act, why: f.name + '：' + why, label: f.name + '：' + f.verb + '（' + why + '）' };
    return null;
  }
  async doFest(act, quiet = false) {
    const g = this.game;
    if (this._festBusy) return;
    this._festBusy = true; this._festTry = this.t;
    let r = null;
    try { r = g.net.festAct ? await g.net.festAct(act) : null; } finally { this._festBusy = false; }
    if (!r) return;
    if (!r.ok) { if (!quiet) g.ui.toast(r.reason || 'できなかった', 'bad'); return; }
    if (r.inv) { this.inv = r.inv; g.ui.setInventory(this.inv); }
    this.onFest({ mark: r.mark });
    const f = this.fest || {};
    g.ui.toast(f.done || '参加した');
    sfx('fest');
    const s = this.pred.state;
    for (let i = 0; i < 10; i++) this.fx.push({ x: s.x + (Math.random() - 0.5) * 14, y: s.y - 10, vx: (Math.random() - 0.5) * 18, vy: -16 - Math.random() * 14, t: 0, life: 1 + Math.random() * 0.6, color: act === 'lantern' ? '#ffe0a0' : act === 'plant' ? '#ffd0e0' : act === 'offer' ? '#fff6d8' : '#e8f0ff' });
    g.debug.festDone = (g.debug.festDone || []).concat(act);
  }
  drawFestMark(g, o) {
    const m = o.m;
    if (m.kind === 'plant') { if (!Sprites.drawEntry(g, 'tile.fest_flower', m.v % 4, m.x, m.y)) A.drawFestFlower(g, m.x, m.y, m.v, this.t); }
    else if (m.kind === 'lantern') { const lit = this.tod && this.tod.dark > 0.15; if (!Sprites.drawEntry(g, 'tile.fest_lantern', lit ? 1 + (Math.floor(this.t * 3 + m.x) % 2) : 0, m.x, m.y)) A.drawFestLantern(g, m.x, m.y, lit, this.t); }
  }
  /** 夜の上に：流れ星（星見の夜はたくさん）・いっしょに すわった子の きらきら・富山の山へ落ちる星 */
  drawFestSky(g, cx, cy, list) {
    const tod = this.tod;
    if (!tod || tod.dark < 0.2) { this.game.debug.sparkle = []; return; }
    const f = this.fest, region = this.map.region || 'plains';
    const hoshi = !!f && f.phase === 'during' && f.act === 'gaze';
    const k = tod.dark / 0.66, now = this.serverNow();
    const env = this.game.env || {};
    const clearSky = env.weather !== 'rain' && env.weather !== 'snow' && env.weather !== 'sandstorm';
    if (clearSky && region !== 'toyama') {
      const stars = shootingStars(now, hoshi && region === 'plains');
      for (const st of stars) {
        const x0 = st.x0 * W, y0 = st.y0 * H, x1 = st.x1 * W, y1 = st.y1 * H;
        const hx = x0 + (x1 - x0) * st.k, hy = y0 + (y1 - y0) * st.k;
        for (let i = 0; i < 9; i++) {
          const tk = Math.max(0, st.k - i * 0.035);
          g.fillStyle = `rgba(255,252,230,${(1 - i / 9) * k * (1 - st.k * 0.5)})`;
          g.fillRect(Math.round(x0 + (x1 - x0) * tk), Math.round(y0 + (y1 - y0) * tk), i ? 1 : 2, 1);
        }
        void hx; void hy;
        if (hoshi && this._lastStar !== st.id && st.k < 0.2) { this._lastStar = st.id; if (onHill(region, this.view.x, this.view.y)) sfx('star'); }
      }
      this.game.debug.stars = stars.length;
    }
    if (region === 'toyama' && f && f.phase === 'during' && f.act === 'gaze') {   // 富山：山の方へ落ちる星がひとつ（ときどき）
      const p = (now % 9000) / 1600;
      if (p < 1) { const bandY = TOYAMA.MOUNT_ROWS * 16 - cy; const x0 = W * 0.3, y0 = Math.max(4, bandY - 60); for (let i = 0; i < 8; i++) { const tk = Math.max(0, p - i * 0.04); g.fillStyle = `rgba(240,248,255,${(1 - i / 8) * k})`; g.fillRect(Math.round(x0 + 60 * tk), Math.round(y0 + 50 * tk), 1, 1); } }
    }
    // いっしょに すわった子の きらきら（星見の夜・はじまりの原の丘）
    let sp = new Set();
    if (hoshi && region === 'plains') {
      const sit = [{ id: this.me.id, x: this.view.x, y: this.view.y, sit: this.stillT }];
      for (const v of this.remoteViews || []) { const rp = this.players.get(v.id); sit.push({ id: v.id, x: v.x, y: v.y, sit: rp ? rp.sitT || 0 : 0 }); }
      sp = sparkleSet(sit, region);
      for (const o of list) if (o.kind === 'player' && sp.has(o.id)) {
        for (let i = 0; i < 4; i++) {
          const a = this.t * 1.7 + i * 1.57 + (String(o.id).length % 3), r = 9 + Math.sin(this.t * 3 + i) * 2;
          const tw = 0.5 + 0.5 * Math.sin(this.t * 6 + i * 2);
          g.fillStyle = `rgba(255,250,200,${0.4 + 0.6 * tw})`;
          const x = Math.round(o.x - cx + Math.cos(a) * r), y = Math.round(o.y - cy - 12 + Math.sin(a) * r * 0.6);
          g.fillRect(x, y, 1, 1); if (tw > 0.8) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
        }
      }
    }
    this.game.debug.sparkle = [...sp];
    void HILL_SPOT;
  }
  // ───────── Ver.0.8：ミニマップの土地の名前（PC はマウスを重ねる・タッチはタップ）─────────
  _mmHoverTick() {
    const inp = this.game.input, m = inp.mouse;
    if (this.game.isTouch || !this._mm || !m.inside) { if (this.mmTip && this.mmTip.hover) this.mmTip = null; return; }
    const mm = this._mm;
    if (m.x >= mm.x0 && m.x < mm.x0 + mm.w && m.y >= mm.y0 && m.y < mm.y0 + mm.h) this._mmTipAt(m.x, m.y, 0, true);
    else if (this.mmTip && this.mmTip.hover) this.mmTip = null;
  }
  _mmTipAt(sx, sy, secs = 3, hover = false) {
    const mm = this._mm;
    if (!mm) return;
    const wx = (sx - mm.x0) / mm.w * this.map.pxW, wy = (sy - mm.y0) / mm.h * this.map.pxH;
    const L = landAt(this.map, Math.max(0, Math.min(this.map.pxW - 1, wx)), Math.max(0, Math.min(this.map.pxH - 1, wy)));
    if (!L) return;
    this.mmTip = { name: L.name, cx: L.cx, cy: L.cy, sy, until: hover ? Infinity : this.t + secs, hover };
    this.game.debug.mmTip = L.name;
  }
  drawMmTip(sc) {
    const tip = this.mmTip, mm = this._mm;
    if (!tip || !mm || this.t > tip.until) return;
    const s = mm.w / this.map.w, g = sc.ug;
    void g;
    const w = sc.measure(tip.name, 6.5) + 6;
    const x = Math.max(w / 2 + 2, mm.x0 - 4 - w / 2), y = Math.max(10, Math.min(mm.y0 + mm.h, tip.sy + 3));
    sc.nameTag(x, y, tip.name);
    this._mmTipBox = { x0: x - w / 2, x1: x + w / 2, y0: y - 8.5, y1: y + 2 };
    void s;
  }

  // ───────── 広がり（Ver.0.5）の描画 ─────────
  /** 出口：地面に矢印の石と、土地の境目の道しるべ */
  drawGates(g) {
    for (const gt of this.map.gates || []) {
      const x = gt.ax, y = gt.ay;
      const ang = { n: -Math.PI / 2, s: Math.PI / 2, e: 0, w: Math.PI }[gt.dir];
      const pulse = 0.55 + 0.35 * Math.sin(this.t * 3);
      g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(ang);
      g.fillStyle = `rgba(255,236,170,${pulse})`;
      for (let k = 0; k < 3; k++) { g.fillRect(6 + k * 7, -1, 4, 2); g.fillRect(8 + k * 7, -2, 2, 4); }
      g.restore();
    }
  }
  /** 富山の調べられる物・谷の石の標 */
  /** Ver.0.6：富山の季節の物（shared/toyama.js：重ねて描く・調べられる。地図は変えない） */
  seasonProps() {
    if (this.map.region !== 'toyama') return [];
    const se = (this.game.env && this.game.env.season) || 'spring';
    const foot = this._footOn();
    const fk = this.fest && this.fest.phase === 'during' ? this.fest.id : '';
    if (this._spSeason !== se || this._spFoot !== foot || this._spFest !== fk) {
      this._spSeason = se; this._spFoot = foot; this._spFest = fk;
      this._sp = toyamaSeasonProps(se).concat(toyamaFestProps(this.fest));   // Ver.0.8：行事の夜にだけ ひとつ
      if (foot) this._sp.push({ kind: 'footend', x: FOOT_END.x, y: FOOT_END.y + 6, text: FOOT_TEXT, tev: 'footprints', season: 'winter' });   // Ver.0.7
      this.game.debug.toyamaProps = this._sp.map(p => p.kind);
    }
    return this._sp;
  }
  drawProp(g, o) {
    if (o.pk === 'footend') return;   // 足あとは地面に（drawFootprints）
    // Ver.0.8：行事の夜の 富山の小さなもの
    if (o.pk === 'tflower') { if (!Sprites.drawEntry(g, 'tile.fest_flower', 3, o.x, o.y)) A.drawFestFlower(g, o.x, o.y, 3, this.t); return; }
    if (o.pk === 'tlantern') { const lit = this.tod && this.tod.dark > 0.2; if (!Sprites.drawEntry(g, 'tile.fest_lantern', lit ? 1 + (Math.floor(this.t * 3 + o.x) % 2) : 0, o.x, o.y)) A.drawFestLantern(g, o.x, o.y, lit, this.t); return; }
    if (o.pk === 'trice') { if (!Sprites.drawEntry(g, 'tile.fest_rice', 0, o.x, o.y)) A.drawRiceStone(g, o.x, o.y); return; }
    if (o.pk === 'tgrass') { A.drawFlatGrass(g, o.x, o.y); return; }
    const key = { shrine: 'tile.shrine', post: 'tile.post', machine: 'tile.machine', phone: 'tile.phone', stone: 'tile.stone_marker', busstop: 'tile.busstop', hasa: 'tile.hasa', lantern: 'tile.snow_lantern' }[o.pk];
    if (o.pk === 'lantern') { const night = this.tod && this.tod.dark > 0.2; if (!Sprites.drawEntry(g, key, night ? 1 + (Math.floor(this.t * 3 + o.x) % 2) : 0, o.x, o.y)) A.drawSnowLantern(g, o.x, o.y, night, this.t); return; }
    if (o.pk === 'hasa' && !Sprites.drawEntry(g, key, 0, o.x, o.y)) { A.drawHasa(g, o.x, o.y); return; }
    if (o.pk === 'busstop' && !Sprites.drawEntry(g, key, (this.game.env && this.game.env.season) === 'winter' ? 1 : 0, o.x, o.y)) { A.drawBusstop(g, o.x, o.y); return; }
    if (o.pk === 'hasa' || o.pk === 'busstop') return;
    const col = o.pk === 'phone' ? Math.floor(this.t * 0.7) % 2 : 0;
    if (!key || !Sprites.drawEntry(g, key, col, o.x, o.y)) { g.fillStyle = '#8a7a6a'; g.fillRect(Math.round(o.x) - 4, Math.round(o.y) - 10, 8, 10); }
    if (o.pk === 'phone' && col && Math.random() < 0.05) this.fx.push({ x: o.x, y: o.y - 8, vx: 0, vy: -6, t: 0, life: 0.6, color: '#bfe0ff' });
  }
  drawGlimpse(g, o) {
    const gl = o.gl, a = Math.max(0, Math.min(1, gl.t / 1.2, (gl.life - gl.t) / 0.8)) * (gl.near ? 1 : 0.85);
    if (a <= 0) return;
    if (gl.near) { g.globalAlpha = a * 0.25; g.fillStyle = '#e8f0ff'; g.beginPath(); g.ellipse(o.x, o.y - 6, 11, 9, 0, 0, Math.PI * 2); g.fill(); }   // Ver.0.7：すぐ近くの白い影（ほのかに光る）
    g.globalAlpha = a;
    if (!Sprites.drawEntry(g, 'fx.white_shape', Math.floor(this.t * 2) % 2, o.x, o.y)) { g.fillStyle = '#f4f8ff'; g.beginPath(); g.ellipse(o.x, o.y - 5, 4, 4, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }
  /** 冬の雪のつもり（季節が冬のあいだ。雪の日はもっと白く。砂丘は積もらない） */
  drawSnow(g, cx, cy) {
    const env = this.game.env;
    if (!env || env.season !== 'winter' || this.map.region === 'dunes') return;
    if (!this._snow) this._snow = this._makeSnow();
    const base = { toyama: 0.62, canyon: 0.42, rocks: 0.4 }[this.map.region] ?? 0.24;
    const prog = Math.min(1, 0.35 + (this.game.envSeasonProgress || 0.5));
    const a = Math.min(0.9, base * prog + (env.weather === 'snow' ? 0.2 * (env.weatherK ?? 1) : 0));
    g.save(); g.globalAlpha = a;
    g.drawImage(this._snow, cx, cy, W, H, cx, cy, W, H);
    g.restore();
  }
  _makeSnow() {
    const m = this.map, cv = A.mk(m.pxW, m.pxH), sg = cv.getContext('2d');
    const img = sg.createImageData(m.pxW, m.pxH), d = img.data;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      const t = m.tiles[ty * m.w + tx];
      if (isWaterTile(t) || t === T.HOUSE || t === T.MOUNT) continue;
      for (let py = 0; py < 16; py += 2) for (let px = 0; px < 16; px += 2) {
        const x = tx * 16 + px, y = ty * 16 + py;
        // 吹きだまり（大きなまだら）＋ふちの粒
        const v = fbm(x / 70, y / 70, 4441) * 0.75 + fbm(x / 14, y / 14, 77) * 0.25 + (hash2(x >> 1, y >> 1, 9) - 0.5) * 0.12;
        if (v < 0.46) continue;
        const c = v < 0.5 ? 232 : v > 0.62 ? 252 : 244;
        for (let k = 0; k < 4; k++) { const i = ((y + (k >> 1)) * m.pxW + x + (k & 1)) * 4; d[i] = c; d[i + 1] = c + 2; d[i + 2] = 255; d[i + 3] = 255; }
      }
    }
    sg.putImageData(img, 0, 0);
    return cv;
  }

  drawJerboa(g, o) {
    const fr = this._frame(o);
    // 影（跳ぶと小さく）
    const z = o.z || 0, sh = Math.max(0.45, 1 - z / 28);
    const inv = o.me && this.game.invulnUntil && this.serverNow() < this.game.invulnUntil;
    if (inv && Math.floor(this.t * 10) % 2) return;            // つかまったあと：点滅（しばらく狙われない）
    Sprites.drawShadow(g, o.x, o.y - 1, sh);
    const hid = o.me && this.hidden;
    if (hid) g.globalAlpha = 0.62;                              // 草むらでじっとして隠れている
    Sprites.drawJerboa(g, o.fur, 'field', fr.anim, o.dir || 'down', fr.frame, o.x, o.y - z, o.look || null);
    if (hid) { g.globalAlpha = 1; for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#6f8a3a' : '#8fa84a'; g.fillRect(Math.round(o.x) - 5 + i * 4, Math.round(o.y) - 4 - (i % 2), 1, 4); } }
    if (o.me && o.cd > 0) {   // 大ジャンプのクールダウン
      const k = o.cd / FIELD.JUMP_CD;
      g.fillStyle = 'rgba(42,26,16,.7)'; g.fillRect(Math.round(o.x) - 6, Math.round(o.y) + 2, 12, 2);
      g.fillStyle = '#f0c870'; g.fillRect(Math.round(o.x) - 6, Math.round(o.y) + 2, Math.round(12 * (1 - k)), 2);
    }
  }
  _frame(o) {
    const n = a => Sprites.frames('field', a);
    if (o.anim === 'jump' && o.jump) { const k = Math.min(0.999, o.jump.t / o.jump.dur); return { anim: 'jump', frame: Math.floor(k * n('jump')) }; }
    if (o.anim === 'jump') return { anim: 'jump', frame: 2 };
    if (o.anim === 'hop') return { anim: 'hop', frame: Math.floor(((o.hop || 0) % 1) * n('hop')) };
    if (o.anim === 'dig' || o.anim === 'gather' || o.anim === 'eat') return { anim: o.anim, frame: Math.floor(this.t * 8) % n(o.anim) };
    const tw = Math.floor(this.t * 2 + hash2(o.id ? o.id.length : 0, 1, 1) * 7) % 7 === 0;
    return { anim: 'idle', frame: tw ? 1 : 0 };
  }

  // ───────── いのちをつなぐ（Ver.0.4）─────────
  /** 野生のトビネズミ：見た目（遺伝子どおり）・気になると立ち上がる・頭の上に信頼のハート */
  drawWild(g, o) {
    const z = o.z || 0;
    Sprites.drawShadow(g, o.x, o.y - 1, Math.max(0.45, 1 - z / 28));
    let anim = o.anim === 'jump' ? 'jump' : o.anim === 'hop' ? 'hop' : (o.mood === 'curious' ? 'sniff' : 'idle');
    let frame = 0;
    if (anim === 'hop') frame = Math.floor(((o.hop || 0) % 1) * Sprites.frames('field', 'hop'));
    else if (anim === 'jump' && o.jump) frame = Math.floor(Math.min(0.999, o.jump.t / o.jump.dur) * Sprites.frames('field', 'jump'));
    else frame = Math.floor(this.t * 2 + o.x) % 2;
    if (!Sprites.drawJerboa(g, o.look ? o.look.fur : 'sand', 'field', anim, o.dir || 'down', frame, o.x, o.y - z, o.look || null)) Sprites.drawJerboa(g, 'sand', 'field', 'idle', o.dir || 'down', 0, o.x, o.y - z);
    const tr = this.trust[o.id] || 0, mine = o.fol === this.me.id;
    if (tr > 0 || mine) {
      const lv = mine ? 4 : Math.min(4, Math.floor(tr / 25));
      const bob = Math.round(Math.sin(this.t * 3 + o.x) * 1);
      if (!Sprites.drawEntry(g, 'ui.heart', lv, o.x, o.y - z - 27 + bob)) { g.fillStyle = '#e8485a'; g.fillRect(Math.round(o.x) - 2, Math.round(o.y - z) - 31 + bob, 4, 3); }
      if (!mine) { g.fillStyle = 'rgba(42,26,16,.75)'; g.fillRect(Math.round(o.x) - 7, Math.round(o.y - z) - 25 + bob, 14, 2); g.fillStyle = '#ff8aa0'; g.fillRect(Math.round(o.x) - 7, Math.round(o.y - z) - 25 + bob, Math.round(14 * tr / 100), 2); }
      else if (Math.floor(this.t * 2) % 2) Sprites.drawEntry(g, 'ui.sparkle', 0, o.x + 7, o.y - z - 24);
    }
  }
  /**
   * ついてくる若者（Ver.0.6：shared/follow.js）。自分の若者は予測の位置から足あとをたどる（サーバーと同じ計算）。
   * ほかの子の若者は、サーバーがスナップショットで送る位置（k）・かくれている（kh）をそのまま補間して描く（どの画面でも同じ道を歩く）。
   */
  _kids(list, owner, kids, mine) {
    if (!kids.length) return;
    let spots, danger;
    if (mine || this.game.net.mode !== 'online' || !owner.k) {
      let tr = this.trails.get(owner.id);
      if (!tr) { tr = []; this.trails.set(owner.id, tr); }
      trailPush(tr, owner.x, owner.y);
      spots = kidSpots(tr, owner, kids.length);
      danger = kidsHidden((this.predViews || []).filter(p => !p.gone), owner);
    } else {
      spots = unpackSpots(owner.k);
      danger = !!owner.kh;
    }
    // 捕食者が近い：巣へかくれる（消える）。いなくなったら戻ってくる
    const k0 = this.kidVis.get(owner.id) ?? 1;
    const k = Math.max(0, Math.min(1, k0 + (danger ? -0.06 : 0.03)));
    this.kidVis.set(owner.id, k);
    const who = kids.length === 1 ? kids[0].name : kids.some(x => x.comp) ? 'みんな' : '若者たち';   // Ver.0.7：なかま（comp）も同じく かくれる
    if (mine && danger && k0 >= 1) { this.game.ui.toast(who + 'は 巣へ かくれた'); this.puff(owner.x, owner.y, '#e6c690', 6); }
    if (mine && !danger && k0 <= 0 && k > 0) this.game.ui.toast(who + 'が もどってきた');
    if (mine) { this.game.debug.kidsVisible = k; this.game.debug.myKids = spots.map(q => [Math.round(q.x), Math.round(q.y)]); }
    if (!mine) { this.game.debug.remoteKids = (this.game.debug.remoteKids || {}); this.game.debug.remoteKids[owner.id] = spots.map(q => [Math.round(q.x), Math.round(q.y)]); this.game.debug.remoteComp = this.game.debug.remoteComp || {}; this.game.debug.remoteComp[owner.id] = kids.filter(x => x.comp).map(x => x.name); }
    if (mine) this.game.debug.myComp = kids.filter(x => x.comp).map(x => x.name);
    if (k <= 0) return;
    kids.forEach((kd, i) => {
      const q = spots[i] || { x: owner.x - 10 - i * 9, y: owner.y + 4 };
      let st = this.kidSt.get(kd.id);
      if (!st || Math.hypot(q.x - st.x, q.y - st.y) > 80) { st = { x: q.x, y: q.y, hop: 0 }; this.kidSt.set(kd.id, st); }
      const dx = q.x - st.x, dy = q.y - st.y, d = Math.hypot(dx, dy);
      const moving = d > 0.5;
      st.x += dx * 0.35; st.y += dy * 0.35;
      st.hop = moving ? st.hop + 1 / 60 / FIELD.HOP_PERIOD : 0;
      if (moving) st.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      list.push({ kind: 'kid', x: st.x, y: st.y, look: kd.look, name: kd.name, comp: !!kd.comp, dir: st.dir || owner.dir || 'down', hop: st.hop, anim: moving ? 'hop' : 'idle', alpha: k, mine });
    });
  }
  drawKid(g, o) {
    g.globalAlpha = o.alpha;
    Sprites.drawShadow(g, o.x, o.y - 1, 0.75);
    const n = Sprites.frames('field', 'hop');
    const frame = o.anim === 'hop' ? Math.floor(((o.hop || 0) % 1) * n) : Math.floor(this.t * 2 + o.x) % 2;
    Sprites.drawJerboa(g, o.look ? o.look.fur : 'sand', 'field', o.anim, o.dir, frame, o.x, o.y - (o.anim === 'hop' ? Math.round(Math.sin(((o.hop || 0) % 1) * Math.PI) * 3) : 0), o.look || null);
    g.globalAlpha = 1;
  }

  /** 夜の暗さ・夕焼けの色。光は自分（大きめ）・ほかのトビネズミ・自分の巣穴の灯り・夜露のきらめき */
  drawNight(g, cx, cy, list) {
    const tod = this.game.tod();
    this.tod = tod;
    const [r, gg, b, a] = tod.tint;
    if (a > 0) { g.fillStyle = `rgba(${r},${gg | 0},${b | 0},${a})`; g.fillRect(0, 0, W, H); }
    if (tod.dark <= 0.01) return;
    if (!this._nl || this._nl.width !== W || this._nl.height !== H) this._nl = A.mk(W, H);
    const lc = this._nl, lg = lc.getContext('2d');
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, W, H);
    // Ver.0.8：月見の夜（はじまりの原）は 月が明るい（暗さを少し弱めて、銀色に）
    const moonK = this._moonK = this.fest && this.fest.phase === 'during' && this.fest.act === 'offer' && (this.map.region || 'plains') === 'plains' ? 1 : 0;
    lg.fillStyle = moonK ? `rgba(14,18,40,${tod.dark * 0.62})` : `rgba(8,10,34,${tod.dark})`; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    const hole = (x, y, rad, k) => {
      const gr = lg.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(0.5, `rgba(0,0,0,${k * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    };
    for (const o of list) if (o.kind === 'player') hole(o.x - cx, o.y - cy - 6, o.me ? 74 : 30, o.me ? 0.92 : 0.6);
    for (const e of this.entrances) if (e.own) hole(e.x - cx, e.y - cy, 26 + Math.sin(this.t * 6) * 1.5, 0.7);
    for (const rs of this.resources.values()) if (rs.kind === 'dew') hole(rs.x - cx, rs.y - cy, 9, 0.5); else if (rs.kind === 'curio') hole(rs.x - cx, rs.y - cy - 3, 12, 0.6);
    if (this.gate) hole(this.gate.x - cx, this.gate.y - cy, 30 + Math.sin(this.t * 3) * 3, 0.85);
    for (const f of this.flies) hole(f.x - cx, f.y - cy, 7, 0.7 * (0.5 + 0.5 * Math.sin(this.t * 5 + f.ph)));
    if (this.glimpse) hole(this.glimpse.x - cx, this.glimpse.y - cy - 6, 16, 0.5);
    for (const pr of this.seasonProps()) if (pr.kind === 'lantern' || pr.kind === 'tlantern') hole(pr.x - cx, pr.y - cy - 6, (pr.kind === 'tlantern' ? 18 : 22) + Math.sin(this.t * 7 + pr.x) * 2, 0.75);
    // Ver.0.8：みんなの灯り・夜に咲く花・供えた種の山
    for (const m of this.festView()) {
      if (m.x < cx - 40 || m.x > cx + W + 40 || m.y < cy - 40 || m.y > cy + H + 40) continue;
      if (m.kind === 'lantern') hole(m.x - cx, m.y - cy - 8, 26 + Math.sin(this.t * 6 + m.x) * 2, 0.8);
      else if (m.kind === 'plant') hole(m.x - cx, m.y - cy - 6, 10, 0.35);
    }
    if (this._offerN > 0) hole(OFFER_SPOT.x - cx, OFFER_SPOT.y - cy - 4, 14 + offerPileSize(this._offerN) * 2, 0.5);
    g.drawImage(lc, 0, 0);
    if (moonK) { g.fillStyle = `rgba(200,214,255,${0.07 * tod.dark / 0.66})`; g.fillRect(0, 0, W, H); }
    // 蛍（暗い中で光る）・富山の遠くの灯り
    for (const f of this.flies) {
      const a = Math.min(1, f.t, f.life - f.t) * (0.45 + 0.55 * Math.sin(this.t * 4 + f.ph));
      if (a <= 0.05) continue;
      const x = Math.round(f.x - cx), y = Math.round(f.y - cy);
      g.fillStyle = `rgba(200,255,120,${a * 0.35})`; g.fillRect(x - 1, y - 1, 4, 4);
      g.fillStyle = `rgba(236,255,170,${a})`; g.fillRect(x, y, 2, 2);
    }
    if (this.map.region === 'toyama' && tod.dark > 0.2) {
      const bandY = TOYAMA.MOUNT_ROWS * 16 - 14 - cy;
      for (let i = 0; i < 14; i++) { const x = this.map.pxW - 200 + i * 13 - cx, on = (Math.floor(this.t * 0.5 + i * 7) % 9) !== 0; if (on && x > -4 && x < W + 4) { g.fillStyle = `rgba(255,236,170,${0.55 * tod.dark / 0.66})`; g.fillRect(Math.round(x), Math.round(bandY - (i % 3) * 3), 2, 1); } }
    }
    // 水面に映る星と月（夜）
    const k = tod.dark / 0.66;
    if (k > 0.3 && this.water.length && (this.map.region || 'plains') === 'plains') {
      g.save();
      const wx0 = (POND.x - POND.rx) * 16 - cx, wy0 = (POND.y - POND.ry) * 16 - cy;
      if (wx0 < W && wy0 < H && wx0 + POND.rx * 32 > 0 && wy0 + POND.ry * 32 > 0) {
        for (const w of this.water) {
          const h = hash2(w.tx, w.ty, 77);
          if (h > 0.35) continue;
          const tw = 0.5 + 0.5 * Math.sin(this.t * (2 + h * 5) + h * 40);
          g.fillStyle = `rgba(240,240,255,${(0.3 + 0.6 * tw) * k})`;
          g.fillRect(w.tx * 16 + Math.floor(h * 37) % 14 + 1 - cx, w.ty * 16 + Math.floor(h * 91) % 14 + 1 - cy, 1, 1);
        }
        // 月の映り込み（ゆらゆら）。Ver.0.8：月見の夜は まんまるで大きい
        const mx = POND.x * 16 + 18 - cx, my = POND.y * 16 - 10 - cy;
        if (moonK) {
          g.fillStyle = `rgba(255,250,220,${0.25 * k})`; g.beginPath(); g.ellipse(mx, my + 4, 16, 9, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = `rgba(255,252,232,${0.85 * k})`; g.beginPath(); g.ellipse(mx + Math.sin(this.t * 1.5) * 0.8, my + 4, 9, 6, 0, 0, Math.PI * 2); g.fill();
          for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,250,220,${0.5 * k - i * 0.08})`; g.fillRect(Math.round(mx - 7 + Math.sin(this.t * 2 + i) * 2), Math.round(my + 11 + i * 2), 14 - i * 2, 1); }
        } else for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(250,246,200,${0.55 * k - i * 0.1})`; g.fillRect(Math.round(mx - 4 + Math.sin(this.t * 2 + i) * 1.5), Math.round(my + i * 3), 8 - i, 1); }
      }
      g.restore();
    }
    // 夜露のきらめき（暗い中で光る）
    if (k > 0.2) for (const rs of this.resources.values()) if (rs.kind === 'dew') {
      const tw = 0.5 + 0.5 * Math.sin(this.t * 4 + rs.x);
      g.fillStyle = `rgba(220,245,255,${0.5 + 0.5 * tw})`; g.fillRect(Math.round(rs.x - cx), Math.round(rs.y - cy - 3), 1, 1);
    }
  }


  // ───────── 捕食者（Ver.0.3）─────────
  /** フクロウの影：狙っているときは地面の影がだんだん大きく濃くなる（急降下の予告） */
  drawOwlShadow(g, pv) {
    if (pv.state === 'stalk' || pv.state === 'dive') {
      const r = pv.sr || 4, x = pv.sx ?? pv.x, y = pv.sy ?? pv.y;
      g.fillStyle = `rgba(20,10,30,${0.25 + 0.3 * (r / 11)})`;
      g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r * 2, r, 0, 0, Math.PI * 2); g.fill();
    } else if (pv.z > 2) {
      g.fillStyle = 'rgba(20,10,30,0.16)';
      g.beginPath(); g.ellipse(Math.round(pv.x), Math.round(pv.y), 5, 2.4, 0, 0, Math.PI * 2); g.fill();
    }
  }
  /** 捕食者を 1 匹描く（素材があれば素材、無ければコード描画） */
  drawPred(g, o) {
    const flip = o.dir === 'left', k = o.pkind, a = o.gone || o.state === 'leave' ? Math.max(0, 1 - (o.t || 0) / 2.5) : 1;
    if (a <= 0) return;
    g.globalAlpha = a;
    if (k === 'fox') {
      Sprites.drawShadow(g, o.x, o.y - 1, 1.1);
      const run = o.state === 'chase' || o.state === 'leave' || o.state === 'roam' || o.state === 'toNest';
      const spd = o.state === 'chase' ? 14 : o.state === 'roam' ? 6 : 10;
      let col = run ? Math.floor(this.t * spd) % 4 : o.state === 'alert' ? 5 : o.state === 'dig' ? 6 + Math.floor(this.t * 6) % 2 : 4;
      if (!Sprites.drawEntry(g, 'pred.fox', col, o.x, o.y, { flip })) A.drawFox(g, o.x, o.y, { frame: col, flip, dig: o.state === 'dig' });
      if (o.state === 'dig' && Math.random() < 0.3) this.puff(o.x + (flip ? -10 : 10), o.y, '#b98552', 1);
    } else if (k === 'snake') {
      const lurk = o.state === 'lurk' || o.state === 'recover';
      if (lurk) g.globalAlpha = a * 0.7;                       // 待ち伏せ中は見えにくい
      const col = o.state === 'lunge' ? 4 : o.state === 'rattle' ? 2 + Math.floor(this.t * 12) % 2 : Math.floor(this.t * 1.5) % 2;
      const jx = o.state === 'rattle' ? Math.round(Math.sin(this.t * 60)) : 0;
      if (!Sprites.drawEntry(g, 'pred.snake', col, o.x + jx, o.y, { flip })) A.drawSnake(g, o.x + jx, o.y, { frame: col, flip, lunge: o.state === 'lunge' });
    } else if (k === 'owl') {
      const col = o.state === 'dive' ? 2 : Math.floor(this.t * 6) % 2;
      const y = o.y - (o.z || 0) - 8;
      if (!Sprites.drawEntry(g, 'pred.owl', col, o.x, y, { flip })) A.drawOwl(g, o.x, y, { frame: col, flip });
    }
    g.globalAlpha = 1;
  }
  /** 「！」（狙われている）と、画面の端の赤・つかまった瞬間の赤い光 */
  drawAlerts(g, cx, cy) {
    for (const pv of this.predViews || []) {
      if (!ALERT_STATES.has(pv.state)) continue;
      const mine = pv.target === this.me.id;
      const x = pv.x - cx, y = pv.y - cy - (pv.kind === 'owl' ? (pv.z || 0) + 22 : pv.kind === 'fox' ? 26 : 18);
      const bob = Math.round(Math.sin(this.t * 12) * (mine ? 1.5 : 0.5));
      if (!mine) g.globalAlpha = 0.55;
      if (!Sprites.drawEntry(g, 'ui.alert', 0, x, y + bob)) { g.fillStyle = '#ffd84a'; g.fillRect(Math.round(x) - 3, Math.round(y) - 12 + bob, 6, 11); g.fillStyle = '#c8201a'; g.fillRect(Math.round(x) - 1, Math.round(y) - 10 + bob, 2, 5); g.fillRect(Math.round(x) - 1, Math.round(y) - 4 + bob, 2, 2); }
      g.globalAlpha = 1;
    }
    const th = this.threat;
    if (th) {
      const k = 0.35 + 0.25 * Math.sin(this.t * (th.state === 'dive' || th.state === 'lunge' ? 22 : 9));
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
      gr.addColorStop(0, 'rgba(200,20,10,0)'); gr.addColorStop(1, `rgba(200,20,10,${k})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) { g.fillStyle = `rgba(255,60,40,${0.45 * this.flash})`; g.fillRect(0, 0, W, H); }
  }

  // ───────── 天気・季節（Ver.0.3）─────────
  _weatherFx(dt) {
    const env = this.game.env;
    const wx = this.wx;
    let n = 0;
    for (const p of wx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t < p.life) wx[n++] = p; }
    wx.length = n;
    if (!env) return;
    const k = env.weatherK ?? 1;
    if (env.weather === 'sandstorm') { for (let i = 0; i < Math.round(26 * k * dt * 60 / 4); i++) wx.push({ kind: 'sand', x: -10 + Math.random() * 30, y: Math.random() * H, vx: 260 + Math.random() * 160, vy: 20 + Math.random() * 30, t: 0, life: 2.2, len: 3 + Math.random() * 5 }); }
    else if (env.weather === 'rain') { for (let i = 0; i < Math.round(18 * k * dt * 60 / 4); i++) wx.push({ kind: 'rain', x: Math.random() * (W + 60) - 30, y: -8, vx: -40, vy: 300 + Math.random() * 80, t: 0, life: 1 + Math.random() * 0.2, len: 5 }); }
    if (env.weather === 'snow') { for (let i = 0; i < Math.round(10 * k * dt * 60 / 4); i++) wx.push({ kind: 'snow', x: Math.random() * W, y: -4, vx: -10 + Math.random() * 20, vy: 20 + Math.random() * 18, t: 0, life: 12 }); }
    else if (env.season === 'winter' && (env.period === 'night' || env.period === 'dusk') && Math.random() < dt * 8) wx.push({ kind: 'snow', x: Math.random() * W, y: -4, vx: -8 + Math.random() * 16, vy: 16 + Math.random() * 14, t: 0, life: 12 });
    if (env.season === 'spring' && this.map.region === 'toyama' && Math.random() < dt * 3) wx.push({ kind: 'petal', x: Math.random() * (W + 40), y: -4, vx: -14 + Math.random() * 8, vy: 14 + Math.random() * 8, t: 0, life: 14 });
    if (wx.length > 600) wx.splice(0, wx.length - 600);
  }
  drawWeather(g, cx, cy, layer = 'tint') {
    const env = this.game.env;
    if (!env) return;
    const k = env.weatherK ?? 1;
    if (layer === 'fx') { this._weatherParticles(g, env); return; }
    // 季節の色味（地面）：夏は明るく黄、秋は橙、冬は白っぽく青
    const st = { summer: 'rgba(255,230,120,0.06)', autumn: 'rgba(230,130,50,0.08)', winter: 'rgba(210,225,255,0.14)', spring: 'rgba(170,230,140,0.04)' }[env.season];
    if (st) { g.fillStyle = st; g.fillRect(0, 0, W, H); }
    if (env.weather === 'sandstorm') {
      g.fillStyle = `rgba(196,140,70,${0.32 * k})`; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.6);
      gr.addColorStop(0, 'rgba(170,110,50,0)'); gr.addColorStop(1, `rgba(150,96,44,${0.75 * k})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    } else if (env.weather === 'rain') {
      g.fillStyle = `rgba(60,80,110,${0.22 * k})`; g.fillRect(0, 0, W, H);
    } else if (env.weather === 'snow') {
      g.fillStyle = `rgba(200,215,235,${0.16 * k})`; g.fillRect(0, 0, W, H);
    }
    void cx; void cy;
  }
  _weatherParticles(g, env) {
    if (env.cold) {   // 寒い夜：画面の端に霜（暗くても見える）
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.62);
      gr.addColorStop(0, 'rgba(200,225,255,0)'); gr.addColorStop(1, 'rgba(200,225,255,0.32)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    const lit = this.tod ? 0.45 + 0.55 * this.tod.light : 1;     // 夜は粒も暗く
    for (const p of this.wx) {
      const a = Math.min(1, (p.life - p.t) * 2) * lit;
      if (p.kind === 'sand') { g.fillStyle = `rgba(250,220,160,${0.55 * a})`; g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.len), 1); }
      else if (p.kind === 'rain') { g.strokeStyle = `rgba(200,220,255,${0.55 * a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(p.x) + 0.5, Math.round(p.y)); g.lineTo(Math.round(p.x - 1.5) + 0.5, Math.round(p.y + p.len)); g.stroke(); if (p.y > H * 0.2 && p.t > p.life - 0.03) { g.fillStyle = 'rgba(220,235,255,.6)'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y + p.len), 3, 1); } }
      else if (p.kind === 'snow') { g.fillStyle = `rgba(250,252,255,${0.85 * Math.min(1, (p.life - p.t) * 2)})`; g.fillRect(Math.round(p.x + Math.sin(p.t * 2 + p.vx) * 3), Math.round(p.y), 1, 1); }
      else if (p.kind === 'petal') { g.fillStyle = `rgba(250,190,210,${0.9 * Math.min(1, (p.life - p.t) * 2)})`; g.fillRect(Math.round(p.x + Math.sin(p.t * 2 + p.vx) * 4), Math.round(p.y), 2, 1); }
    }
    void env;
  }

  // ───────── 土地（Ver.0.3）─────────
  /** ミニマップの重ね表示：なし → 危険 → 食料 → なし */
  cycleOverlay() {
    const order = [null, 'danger', 'food'];
    this.overlay = order[(order.indexOf(this.overlay || null) + 1) % order.length];
    this.game.ui.toast(this.overlay === 'danger' ? 'ミニマップ：危険の重ね表示（緑＝安全・赤＝危ない）' : this.overlay === 'food' ? 'ミニマップ：食料の重ね表示（濃い緑ほど多い）' : 'ミニマップ：重ね表示なし');
  }
  /** いる場所の土地を調べる（L・「土地」ボタン）。巣があれば、ここへ引っ越せる */
  async openSurvey() {
    const g = this.game;
    if (this._surveying || g.ui.busy()) return;
    this._surveying = true;
    const r = await g.net.survey();
    this._surveying = false;
    if (!r.ok) { g.ui.toast(r.reason || '調べられなかった', 'bad'); return; }
    this.surveyT = this.t; this.surveyAt = { x: this.pred.state.x, y: this.pred.state.y };
    g.ui.landPanel(r.land, r.here, {
      dig: r.here.canDig && !r.here.hasNest ? () => { g.ui.closeModal(); this.interact({ kind: 'dig' }); } : null,
      relocate: r.here.hasNest ? async () => {
        if (!r.here.canMove || r.here.cooldownMs > 0) return;
        const ok = await g.ui.confirm('引っ越す', `巣の入口を ここ（${esc(r.land.name)}）へ移しますか？<br>巣の中（部屋・家具・倉庫）はそのまま持っていける。<br>費用：${g.ui.costHTML(r.here.relocateCost)}<br><span class="tb-dim">次に引っ越せるのは ${Math.round((g.relocateCooldownMs || 600000) / 60000)} 分後</span>`, '引っ越す', 'やめる');
        if (!ok) return;
        this.busyUntil = performance.now() + (r.here.digTime || 1) * 1000 + 200;
        this.digT = this.t; this.digDur = r.here.digTime || 1;
        await new Promise(res => setTimeout(res, (r.here.digTime || 1) * 1000));
        const x = await g.net.relocate();
        if (!x.ok) { g.ui.toast(x.reason || '引っ越せなかった', 'bad'); return; }
        if (x.from) this.puff(x.from.x, x.from.y, '#b98552', 8);
        this.onEntrance({ entrance: x.entrance });
        this.myNest = { id: x.entrance.nestId, x: x.entrance.x, y: x.entrance.y, land: x.land, plugged: false };
        if (x.inv) { this.inv = x.inv; g.ui.setInventory(this.inv); }
        this.puff(x.entrance.x, x.entrance.y, '#b98552', 12);
        g.ui.toast('引っ越した！ 新しい入口は ' + x.land.name + '（巣の中はそのまま）');
      } : null,
    });
  }

  drawMinimap(g) {
    const m = this.map, s = W < 340 ? 0.5 : 0.75, mw = Math.round(m.w * s), mh = Math.round(m.h * s);
    const x0 = W - mw - 6, y0 = 6;
    const ct = y0 + mh + 5;   // 時計（DOM）はミニマップのすぐ下
    if (this._ct !== ct) { this._ct = ct; this.game.hud.style.setProperty('--clock-top', `calc(var(--u) * ${ct}px)`); }
    // 横向きのタッチ：右の端のボタンの列がミニマップに重ならないよう、ミニマップの下端（画面の px）を CSS へ
    if (this.game.isTouch && (this._mmT == null || this.t - this._mmT > 0.5)) {
      this._mmT = this.t;
      const sr = this.game.screen.stage.getBoundingClientRect(), k = sr.height / H;
      const v = Math.round(sr.top + (y0 + mh + 3) * k) + 'px';
      if (this._mmB !== v) { this._mmB = v; document.documentElement.style.setProperty('--mm-bottom', v); }
    }
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 3, y0 - 3, mw + 6, mh + 6);
    g.fillStyle = '#c8a46a'; g.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4);
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    g.imageSmoothingEnabled = true; g.drawImage(this.minimap, x0, y0, mw, mh); g.imageSmoothingEnabled = false;
    this._mm = { x0, y0, w: mw, h: mh };
    if (this.overlay) {   // 土地の重ね表示（区画ごと）
      for (const L of buildLands(m).values()) {
        const c = overlayColor(L, this.overlay);
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(Math.round(x0 + L.cx * PLOT_W * s), Math.round(y0 + L.cy * PLOT_H * s), Math.round(PLOT_W * s), Math.round(PLOT_H * s));
      }
    }
    if (this.mmTip && this.t <= this.mmTip.until) {   // Ver.0.8：名前を見ている区画
      g.strokeStyle = 'rgba(255,244,200,.9)'; g.lineWidth = 1;
      g.strokeRect(Math.round(x0 + this.mmTip.cx * PLOT_W * s) + 0.5, Math.round(y0 + this.mmTip.cy * PLOT_H * s) + 0.5, Math.round(PLOT_W * s) - 1, Math.round(PLOT_H * s) - 1);
    }
    const P = (x, y, c, r = 1) => { g.fillStyle = c; g.fillRect(Math.round(x0 + x / 16 * s) - r, Math.round(y0 + y / 16 * s) - r, r * 2 + 1, r * 2 + 1); };
    for (const e of this.entrances) {
      const fr = !e.own && this.isFriend(e.owner);
      P(e.x, e.y, e.own ? '#ffe070' : fr ? (Math.floor(this.t * 2) % 2 ? '#7ff0a0' : '#2a9050') : '#5a3018', e.own || fr ? 1 : 0);
    }
    if (this.ping && this.t < this.ping.until) {   // 「巣の場所」で光らせた所
      const k = (this.t * 1.5) % 1, px = x0 + this.ping.x / 16 * s, py = y0 + this.ping.y / 16 * s;
      g.strokeStyle = `rgba(150,255,180,${1 - k})`; g.lineWidth = 1;
      g.beginPath(); g.arc(Math.round(px) + 0.5, Math.round(py) + 0.5, 2 + k * 7, 0, Math.PI * 2); g.stroke();
    }
    for (const v of this.remoteViews || []) P(v.x, v.y, '#f4f0e8', 0);
    for (const gt of this.map.gates || []) P(gt.ax, gt.ay, Math.floor(this.t * 2) % 2 ? '#fff4c8' : '#c8a46a', 1);
    if (this.gate) P(this.gate.x, this.gate.y, '#e8f0ff', 1);
    // 捕食者（自分を狙っているものだけ赤く点滅）
    for (const pv of this.predViews || []) if (pv.target === this.me.id && ALERT_STATES.has(pv.state) && Math.floor(this.t * 6) % 2) P(pv.x, pv.y, '#ff3020', 0);
    // 土地を調べた所（旗）
    if (this.surveyAt && this.t - this.surveyT < 20) P(this.surveyAt.x, this.surveyAt.y, '#ff5040', 0);
    if (Math.floor(this.t * 3) % 3) P(this.view.x, this.view.y, '#e83a2a', 1);
    // 視界の枠
    g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1;
    g.strokeRect(Math.round(x0 + this.cam.x / 16 * s) + 0.5, Math.round(y0 + this.cam.y / 16 * s) + 0.5, Math.round(W / 16 * s), Math.round(H / 16 * s));
    void POND;
  }
}
