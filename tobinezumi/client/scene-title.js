// tobinezumi/client/scene-title.js — A. タイトル・ログイン・キャラクター作成・確認
// オフライン：この端末のプロフィール（localStorage）。オンライン：ユーザー名／パスワード（Net 経由でサーバーへ）。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import { Sprites } from './sprites.js';
import { FURS } from './art.js';
import { FUR_IDS, NAME_MAX, validName } from '../shared/protocol.js';
import { hash2 } from '../shared/rng.js';

export class TitleScene {
  constructor(game) { this.game = game; this.t = 0; }

  enter() {
    const g = this.game;
    this.dom = el('div', 'tb-scene tb-title');
    g.hud.appendChild(this.dom);
    g.ui.showHUD(false);
    this.fur = this.fur || 'sand';
    this.name = this.name || '';
    this.showTop();
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; }

  _panel(html, cls = '') {
    this.dom.innerHTML = '';
    const p = el('div', 'tb-panel tb-ui-block ' + cls, html);
    this.dom.appendChild(p);
    return p;
  }

  async showTop() {
    const g = this.game, net = g.net;
    const hello = this.hello || (this.hello = await net.hello());
    const off = net.mode === 'offline';
    const ch = hello.character;
    const p = this._panel(`
      <div class="tb-logo"><div class="tb-logo-main">トビネズミ</div><div class="tb-logo-sub">MMO（仮称）　ver.0.9「すみずみまで」</div></div>
      <div class="tb-mode ${off ? 'off' : 'on'}">${off ? 'オフライン：ひとりで遊ぶ（この端末に保存）' + (net.fallbackFrom ? '<br><small>サーバーにつながらなかったので、ひとりで遊びます</small>' : '') : 'オンライン：' + esc(net.url)}</div>
      <div class="tb-title-btns"></div>
      <a class="tb-back" href="index.html">← 本編（だんのうら）に戻る</a>`, 'tb-titlebox');
    const box = p.querySelector('.tb-title-btns');
    const btn = (label, fn, cls = '') => { const b = el('button', 'tb-btn wide ' + cls, label); b.onclick = fn; box.appendChild(b); return b; };
    if (off) {
      if (ch) {
        btn('つづきから（' + esc(ch.name) + '）', () => g.startGame(), 'primary').id = 'tb-continue';
        btn('はじめから（データを消す）', async () => {
          if (!await g.ui.confirm('はじめから', 'この端末のトビネズミの記録（持ち物・巣）を消して、はじめから遊びますか？<br><span class="tb-dim">本編・境界事象のセーブには影響しません。</span>', '消してはじめる', 'やめる')) return;
          net.resetAll(); delete g.settings.goal; g.saveSettings(); this.hello = null; await net.login('local'); this.hello = await net.hello(); this.showCreate();
        });
      } else {
        btn('はじめる', async () => { await net.login('local'); this.showCreate(); }, 'primary').id = 'tb-start';
      }
    } else {
      if (hello.ok && hello.account) {
        btn(ch ? 'つづきから（' + esc(ch.name) + '）' : 'キャラクターを作る', () => ch ? g.startGame() : this.showCreate(), 'primary');
        btn('ログアウト', async () => { await net.logout(); this.hello = null; this.showTop(); });
      } else {
        btn('ログイン', () => this.showLogin('login'), 'primary');
        btn('新規登録', () => this.showLogin('register'));
      }
    }
  }

  showLogin(kind) {
    const g = this.game, net = g.net;
    const reg = kind === 'register';
    const p = this._panel(`
      <div class="tb-ph">${reg ? '新規登録' : 'ログイン'}</div>
      <label class="tb-field">ユーザー名<input class="u" autocomplete="username" maxlength="16" placeholder="3〜16 文字（英数字 _ -）"><span class="tb-err e-u"></span></label>
      <label class="tb-field">パスワード<input class="p" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="8 文字以上"><span class="tb-err e-p"></span></label>
      <div class="tb-btns"><button class="tb-btn primary ok">${reg ? '登録する' : 'ログイン'}</button><button class="tb-btn back">もどる</button></div>`, 'tb-login');
    const u = p.querySelector('.u'), pw = p.querySelector('.p');
    const go = async () => {
      p.querySelector('.e-u').textContent = ''; p.querySelector('.e-p').textContent = '';
      const r = reg ? await net.register(u.value.trim(), pw.value) : await net.login(u.value.trim(), pw.value);
      if (!r.ok) { const e = r.reason || 'できなかった'; p.querySelector(/パスワード/.test(e) ? '.e-p' : '.e-u').textContent = e; return; }
      this.hello = await net.hello();
      if (r.character || (this.hello && this.hello.character)) g.startGame(); else this.showCreate();
    };
    p.querySelector('.ok').onclick = go;
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') go(); e.stopPropagation(); });
    u.addEventListener('keydown', e => e.stopPropagation());
    p.querySelector('.back').onclick = () => this.showTop();
    if (!g.isTouch) setTimeout(() => u.focus(), 0);   // スマホでは勝手にキーボードを出さない
  }

  showCreate() {
    const g = this.game;
    const labels = Sprites.furLabels() || {};
    const p = this._panel(`
      <div class="tb-ph">キャラクター作成</div>
      <div class="tb-create">
        <div class="tb-portrait"><canvas width="128" height="128"></canvas></div>
        <div class="tb-cform">
          <label class="tb-field">なまえ<input class="nm" maxlength="${NAME_MAX}" placeholder="1〜${NAME_MAX} 文字"><span class="tb-err e-n"></span></label>
          <div class="tb-sub">毛色を選択</div>
          <div class="tb-furpick"><button class="tb-arrow l">◀</button><div class="tb-samples"><canvas width="32" height="32"></canvas><canvas width="32" height="32"></canvas><canvas width="32" height="32"></canvas></div><button class="tb-arrow r">▶</button></div>
          <div class="tb-furname"></div>
          <div class="tb-sexpick"><button type="button" class="tb-btn small sx" data-s="f">♀ 女の子</button><button type="button" class="tb-btn small sx" data-s="m">♂ 男の子</button></div>
          <div class="tb-btns"><button class="tb-btn primary ok" id="tb-decide">決定</button></div>
        </div>
      </div>`, 'tb-createbox');
    const nm = p.querySelector('.nm');
    nm.value = this.name;
    nm.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') decide(); });
    nm.addEventListener('input', () => { this.name = nm.value; });
    const draw = () => {
      const pc = p.querySelector('.tb-portrait canvas'), pg = pc.getContext('2d');
      pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, 128, 128); pg.drawImage(Sprites.portrait(this.fur), 0, 0);
      const views = [['field', 'idle', 'down'], ['side', 'idle', 'right'], ['field', 'hop', 'up']];
      p.querySelectorAll('.tb-samples canvas').forEach((c, i) => {
        const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; cg.clearRect(0, 0, 32, 32);
        const [v, a, d] = views[i]; Sprites.drawJerboa(cg, this.fur, v, a, d, 0, 16, 30);
      });
      const f = FURS.find(f => f.id === this.fur);
      p.querySelector('.tb-furname').textContent = (labels[this.fur] || (f && f.name) || this.fur) + `（${FUR_IDS.indexOf(this.fur) + 1}/${FUR_IDS.length}）`;
    };
    this.sex = this.sex || (Math.random() < 0.5 ? 'f' : 'm');
    const markSex = () => { for (const b of p.querySelectorAll('.sx')) b.classList.toggle('on', b.dataset.s === this.sex); };
    for (const b of p.querySelectorAll('.sx')) b.onclick = () => { this.sex = b.dataset.s; markSex(); };
    markSex();
    const step = d => { const i = FUR_IDS.indexOf(this.fur); this.fur = FUR_IDS[(i + d + FUR_IDS.length) % FUR_IDS.length]; draw(); };
    p.querySelector('.l').onclick = () => step(-1);
    p.querySelector('.r').onclick = () => step(1);
    const decide = () => {
      const e = validName(nm.value);
      if (e) { p.querySelector('.e-n').textContent = e; return; }
      this.name = nm.value.trim();
      this.showConfirm();
    };
    p.querySelector('.ok').onclick = decide;
    this._keys = e => { if (document.activeElement === nm) return; if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); };
    draw();
    if (!g.isTouch) setTimeout(() => nm.focus(), 0);
  }

  showConfirm() {
    const g = this.game;
    const p = this._panel(`
      <div class="tb-ph">確認</div>
      <div class="tb-confirm"><canvas width="128" height="128"></canvas><div><div class="tb-big">「${esc(this.name)}」</div><div>${this.sex === 'm' ? '♂ 男の子' : '♀ 女の子'}・若者（3 日）から</div><div>この子で はじめますか？</div></div></div>
      <div class="tb-btns"><button class="tb-btn primary ok" id="tb-begin">はじめる</button><button class="tb-btn back">もどる</button></div>`, 'tb-confirmbox');
    const c = p.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(Sprites.portrait(this.fur), 0, 0);
    p.querySelector('.back').onclick = () => this.showCreate();
    p.querySelector('.ok').onclick = async () => {
      const r = await g.net.createCharacter({ name: this.name, fur: this.fur, sex: this.sex });
      if (!r.ok) { g.ui.toast(r.reason || '作れなかった', 'bad'); this.showCreate(); return; }
      g.startGame();
    };
  }

  fixed() {}
  update(dt) { this.t += dt; if (this._keys) { const inp = this.game.input; if (inp.take('ArrowLeft')) this._keys({ key: 'ArrowLeft' }); if (inp.take('ArrowRight')) this._keys({ key: 'ArrowRight' }); } }

  /** 夜の砂漠で跳ねるトビネズミ（Ver.0.9：本物の三日月・遠い岩山・流れ星・親子で跳ねる） */
  draw() {
    const sc = this.game.screen, g = sc.g, t = this.t;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#141026'); sky.addColorStop(0.5, '#3a2a4e'); sky.addColorStop(0.78, '#8a4e52'); sky.addColorStop(1, '#c8784e');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const gy = H - 270;   // 画面の高さが変わっても、砂丘は下端に
    const nStars = Math.round(70 * (W * H) / (480 * 270));
    for (let i = 0; i < nStars; i++) {
      const x = Math.floor(hash2(i, 1, 3) * W), y = Math.floor(hash2(1, i, 3) * (150 + gy));
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash2(i, i, 2) * 2) + i);
      const a = (0.25 + tw * 0.6) * (1 - y / (190 + gy) * 0.5);
      g.fillStyle = `rgba(255,244,214,${a.toFixed(3)})`; g.fillRect(x, y, 1, 1);
      if (hash2(i, 7, 11) < 0.06) { g.fillStyle = `rgba(255,244,214,${(a * 0.45).toFixed(3)})`; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); }
    }
    // 流れ星（ときどき）
    const sp = 7, k = (t % sp) / 0.9, si = Math.floor(t / sp);
    if (k < 1) {
      const sx = W * (0.15 + 0.5 * hash2(si, 3, 17)), sy = 18 + 50 * hash2(si, 4, 17);
      for (let j = 0; j < 14; j++) { const q = k - j * 0.018; if (q < 0) break; g.fillStyle = `rgba(255,246,220,${((1 - j / 14) * (1 - k) * 0.9).toFixed(3)})`; g.fillRect(Math.round(sx + q * 90), Math.round(sy + q * 34), 1, 1); }
    }
    // 三日月（欠けた所は空が透ける）と ぼんやりした光
    const mx = Math.round(W * 0.79), my = Math.round(52 + gy * 0.3);
    if (!this._moon) {
      const c = document.createElement('canvas'); c.width = c.height = 32; const m = c.getContext('2d');
      m.fillStyle = '#f4e8c8'; m.beginPath(); m.arc(16, 16, 13, 0, Math.PI * 2); m.fill();
      m.fillStyle = '#fffbe8'; m.beginPath(); m.arc(14, 18, 11, 0, Math.PI * 2); m.fill();
      m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(22, 12, 12, 0, Math.PI * 2); m.fill();
      this._moon = c;
    }
    const glow = g.createRadialGradient(mx, my, 4, mx, my, 46);
    glow.addColorStop(0, 'rgba(255,236,190,0.16)'); glow.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = glow; g.fillRect(mx - 46, my - 46, 92, 92);
    g.drawImage(this._moon, mx - 16, my - 16);
    // 遠い岩山（平らな頂の台地）
    g.fillStyle = '#3e2c46';
    for (let x = 0; x < W; x++) {
      const u = (x + 37) / W;
      const mesa = Math.max(0, 1 - Math.abs(u - 0.22) * 9) * 22 + Math.max(0, 1 - Math.abs(u - 0.66) * 6) * 30 + Math.max(0, 1 - Math.abs(u - 0.95) * 11) * 16;
      const h = mesa > 1 ? Math.min(26, Math.round(mesa)) + Math.round(Math.sin(x / 9) * 1.2) : 0;
      if (h > 0) g.fillRect(x, 196 + gy - h, 1, h + 8);
    }
    const dune = (base, amp, f, ph, col, speed) => {
      g.fillStyle = col;
      base += gy;
      for (let x = 0; x < W; x++) { const y = Math.round(base + Math.sin((x + t * speed) / f + ph) * amp + Math.sin((x + t * speed) / (f * 0.37) + ph * 2) * amp * 0.3); g.fillRect(x, y, 1, H - y); }
    };
    const duneY = (base, amp, f, ph, speed, x) => Math.round(base + gy + Math.sin((x + t * speed) / f + ph) * amp + Math.sin((x + t * speed) / (f * 0.37) + ph * 2) * amp * 0.3);
    dune(196, 9, 60, 1, '#5a3a3e', 4);
    dune(218, 7, 44, 3, '#7a4c3a', 8);
    // 中ほどの砂丘の草（砂丘といっしょに流れる）
    for (let i = 0; i < Math.ceil(W / 60); i++) {
      const x = Math.round(((i * 60 + hash2(i, 2, 5) * 40) - t * 8) % (W + 40) + W + 40) % (W + 40) - 20;
      const y = duneY(218, 7, 44, 3, 8, x);
      g.fillStyle = '#5c3a2c';
      g.fillRect(x, y - 3, 1, 3); g.fillRect(x + 2, y - 4, 1, 4); g.fillRect(x - 2, y - 2, 1, 2); g.fillRect(x + 4, y - 2, 1, 2);
    }
    dune(240, 5, 30, 5, '#a2683e', 14);
    // 跳ねるトビネズミの親子（左から右へ。子は少し遅れて小さく）
    const span = W + 120;
    const hopper = (delay, scale, fur) => {
      const x = ((t * 46 - delay) % span + span) % span - 40;
      const hop = ((t * 46 - delay) / 26 % 1 + 1) % 1;
      const z = Math.sin(hop * Math.PI) * 10 * scale;
      const y = 246 + gy + Math.round(Math.sin((x + t * 14) / 30 + 5) * 5);
      Sprites.drawShadow(g, x, y, (1 - z / 30) * scale);
      if (scale === 1) { Sprites.drawJerboa(g, fur, 'side', 'walk', 'right', Math.floor(hop * 4), x, y - z); return; }
      g.save(); g.translate(Math.round(x), Math.round(y - z)); g.scale(scale, scale);
      Sprites.drawJerboa(g, fur, 'side', 'walk', 'right', Math.floor(hop * 4), 0, 0);
      g.restore();
    };
    hopper(52, 0.62, 'cream'); hopper(30, 0.66, 'sand'); hopper(0, 1, 'sand');
    sc.clearUI();
  }
}
