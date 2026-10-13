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
      <div class="tb-logo"><div class="tb-logo-main">トビネズミ</div><div class="tb-logo-sub">MMO（仮称）　ver.0.2「暮らし」</div></div>
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
          net.resetAll(); this.hello = null; await net.login('local'); this.hello = await net.hello(); this.showCreate();
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
      <div class="tb-confirm"><canvas width="128" height="128"></canvas><div><div class="tb-big">「${esc(this.name)}」</div><div>この子で はじめますか？</div></div></div>
      <div class="tb-btns"><button class="tb-btn primary ok" id="tb-begin">はじめる</button><button class="tb-btn back">もどる</button></div>`, 'tb-confirmbox');
    const c = p.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(Sprites.portrait(this.fur), 0, 0);
    p.querySelector('.back').onclick = () => this.showCreate();
    p.querySelector('.ok').onclick = async () => {
      const r = await g.net.createCharacter({ name: this.name, fur: this.fur });
      if (!r.ok) { g.ui.toast(r.reason || '作れなかった', 'bad'); this.showCreate(); return; }
      g.startGame();
    };
  }

  fixed() {}
  update(dt) { this.t += dt; if (this._keys) { const inp = this.game.input; if (inp.take('ArrowLeft')) this._keys({ key: 'ArrowLeft' }); if (inp.take('ArrowRight')) this._keys({ key: 'ArrowRight' }); } }

  /** 夜の砂漠で跳ねるトビネズミ */
  draw() {
    const sc = this.game.screen, g = sc.g, t = this.t;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#141026'); sky.addColorStop(0.5, '#3a2a4e'); sky.addColorStop(0.78, '#8a4e52'); sky.addColorStop(1, '#c8784e');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const gy = H - 270;   // 画面の高さが変わっても、砂丘は下端に
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(hash2(i, 1, 3) * W), y = Math.floor(hash2(1, i, 3) * (140 + gy));
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash2(i, i, 2) * 2) + i);
      g.fillStyle = `rgba(255,244,214,${0.3 + tw * 0.6})`; g.fillRect(x, y, 1, 1);
    }
    const mx = Math.round(W * 0.79), my = Math.round(52 + gy * 0.3);
    g.fillStyle = '#f4e8c8'; g.beginPath(); g.arc(mx, my, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2a4e'; g.beginPath(); g.arc(mx + 6, my - 4, 12, 0, Math.PI * 2); g.fill();
    const dune = (base, amp, f, ph, col, speed) => {
      g.fillStyle = col;
      base += gy;
      for (let x = 0; x < W; x++) { const y = Math.round(base + Math.sin((x + t * speed) / f + ph) * amp + Math.sin((x + t * speed) / (f * 0.37) + ph * 2) * amp * 0.3); g.fillRect(x, y, 1, H - y); }
    };
    dune(196, 9, 60, 1, '#5a3a3e', 4);
    dune(218, 7, 44, 3, '#7a4c3a', 8);
    dune(240, 5, 30, 5, '#a2683e', 14);
    // 跳ねるトビネズミ（左から右へ）
    const span = W + 80, x = ((t * 46) % span) - 40;
    const hop = (t * 46 / 26) % 1;
    const z = Math.sin(hop * Math.PI) * 10;
    const y = 246 + gy + Math.round(Math.sin((x + t * 14) / 30 + 5) * 5);
    Sprites.drawShadow(g, x, y, 1 - z / 30);
    Sprites.drawJerboa(g, 'sand', 'side', 'walk', 'right', Math.floor(hop * 4), x, y - z);
    sc.clearUI();
  }
}
