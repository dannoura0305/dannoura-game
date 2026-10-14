// 画面の部品（DOM）：HUD・調べるの印・トースト・会話・一時停止メニュー・設定・金庫・倒れた時・性能表示。
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const CONTROLS = [
  ['移動', 'WASD', '左スティック', '左の円'], ['カメラ', 'マウス', '右スティック', '右側をなぞる'], ['走る', 'Shift', 'L3（切替）', '円を外まで倒す'],
  ['刀（連撃）', '左クリック', 'X', '斬'], ['強攻撃／居合の構え', 'Q 長押し', 'Y 長押し', '斬 長押し'],
  ['銃を構える', '右クリック（押す間）', 'LT', '銃（押す→構え・離す→撃つ）'], ['撃つ', '構え中に左クリック', 'RT', '同上'],
  ['回避（ジャスト回避）', 'Space', 'A', '避'], ['弾く（パリィ）', 'F', 'LB', '弾'], ['持ち替え（刀⇄銃）', 'ホイール／1・2／X', 'RB', '替'],
  ['装填', 'R', '構え中に X', '弾切れで自動'], ['ロックオン', '中クリック／T', 'R3', '自動'], ['調べる・話す', 'E', 'B', '調'],
  ['回復', 'H', '十字キー上', '回'], ['一時停止', 'Esc／P', 'Start', '≡'],
];

export class UI {
  constructor(root, game) {
    this.root = root; this.g = game; this.toastT = 0; this.barkT = 0;
    root.innerHTML = `
<div id="sh-hud">
  <div class="sh-vital"><div class="sh-face"><span>だ</span></div><div class="sh-hpwrap"><div class="sh-hpname">だんのうら</div><div class="sh-hp"><i class="sh-hpfill"></i><i class="sh-hplag"></i></div><div class="sh-items"></div></div></div>
  <div class="sh-weapon"><div class="sh-wslot" data-w="katana"><b>刀</b></div><div class="sh-wslot" data-w="handgun"><b>銃</b><span class="sh-ammo"></span></div><div class="sh-swapbar"><i></i></div></div>
  <div class="sh-cross"></div>
  <div class="sh-prompt"></div>
  <div class="sh-toast"></div>
  <div class="sh-bark"></div>
  <div class="sh-log"></div>
  <div class="sh-lock"></div>
  <div class="sh-marks"></div>
  <div class="sh-slow"></div><div class="sh-flash"></div><div class="sh-lowhp"></div><div class="sh-vignette"></div>
  <div class="sh-hint"></div>
</div>
<div id="sh-dialog" hidden><div class="sh-dname"></div><div class="sh-dtext"></div><div class="sh-dnext">▼</div></div>
<div id="sh-menu" hidden></div>
<div id="sh-safe" hidden></div>
<div id="sh-dead" hidden><div class="sh-deadt">倒れた……</div><button data-a="retry">直前から</button><button data-a="title">タイトルへ</button></div>
<div id="sh-perf" hidden></div>
<div id="sh-rotate" hidden>横向きにしてください</div>`;
    this.el = {
      hpfill: $('.sh-hpfill', root), hplag: $('.sh-hplag', root), items: $('.sh-items', root), weapon: $('.sh-weapon', root), ammo: $('.sh-ammo', root), swapbar: $('.sh-swapbar i', root),
      cross: $('.sh-cross', root), prompt: $('.sh-prompt', root), toast: $('.sh-toast', root), bark: $('.sh-bark', root), log: $('.sh-log', root), lock: $('.sh-lock', root), marks: $('.sh-marks', root),
      slow: $('.sh-slow', root), flash: $('.sh-flash', root), lowhp: $('.sh-lowhp', root), hint: $('.sh-hint', root),
      dialog: $('#sh-dialog', root), dname: $('.sh-dname', root), dtext: $('.sh-dtext', root), menu: $('#sh-menu', root), safe: $('#sh-safe', root), dead: $('#sh-dead', root), perf: $('#sh-perf', root), rotate: $('#sh-rotate', root),
    };
    this.lag = 1; this.markEls = new Map();
    this.el.dialog.addEventListener('pointerdown', e => { e.preventDefault(); this.g.dialogNext(); });
    this.el.dead.addEventListener('click', e => { const a = e.target.dataset.a; if (a === 'retry') this.g.retry(); if (a === 'title') location.href = 'index.html'; });
  }
  // ── HUD ──
  hud(p) {
    const F = p.fighter, r = F.hp / F.hpMax;
    this.el.hpfill.style.width = (r * 100).toFixed(1) + '%';
    this.lag = this.lag > r ? Math.max(r, this.lag - 0.006) : r; this.el.hplag.style.width = (this.lag * 100).toFixed(1) + '%';
    this.el.hpfill.classList.toggle('low', r < 0.3);
    this.el.lowhp.style.opacity = r < 0.3 ? (0.35 + Math.sin(performance.now() / 300) * 0.15).toFixed(2) : '0';
    const it = this.g.items; const heal = (it.medkit_s || 0) + (it.medkit_l || 0) + (it.coffee || 0);
    this.el.items.textContent = heal ? `回復 ×${heal}` : '';
    for (const s of this.el.weapon.querySelectorAll('.sh-wslot')) s.classList.toggle('on', s.dataset.w === F.weapon);
    this.el.ammo.textContent = `${F.mag}／${F.ammo}`;
    this.el.weapon.classList.toggle('gun', F.weapon === 'handgun');
    const sw = F.st.name === 'swap' ? F.st.f / F.st.total : F.st.name === 'reload' ? F.st.f / 84 : 0;
    this.el.swapbar.style.width = (sw * 100).toFixed(0) + '%';
    this.el.cross.classList.toggle('on', F.weapon === 'handgun' && !!F.aimHeld);
    this.el.cross.classList.toggle('weak', !!p.aimWeak);
  }
  prompt(text, key) { if (!text) { this.el.prompt.classList.remove('on'); return; } this.el.prompt.innerHTML = `<kbd>${esc(key)}</kbd>${esc(text)}`; this.el.prompt.classList.add('on'); }
  toast(text, kind = '', dur = 1.2) { const t = this.el.toast; t.textContent = text; t.className = 'sh-toast on ' + kind; this.toastT = dur; }
  bark(who, text, color, dur = 3) { this.el.bark.innerHTML = (who ? `<b style="color:${color}">${esc(who)}</b>` : '') + esc(text); this.el.bark.classList.add('on'); this.barkT = dur; }
  log(text) { const e = h('div', 'sh-logi', esc(text)); this.el.log.prepend(e); setTimeout(() => e.classList.add('out'), 2600); setTimeout(() => e.remove(), 3400); while (this.el.log.children.length > 4) this.el.log.lastChild.remove(); }
  hint(text) { this.el.hint.textContent = text || ''; this.el.hint.classList.toggle('on', !!text); }
  flash(kind = 'issen') { const f = this.el.flash; f.className = 'sh-flash'; void f.offsetWidth; f.className = 'sh-flash on ' + kind; }
  slow(on) { this.el.slow.classList.toggle('on', !!on); }
  tick(dt) {
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.el.toast.classList.remove('on'); }
    if (this.barkT > 0) { this.barkT -= dt; if (this.barkT <= 0) this.el.bark.classList.remove('on'); }
  }
  /** 画面上の印（ロックオン・敵の予兆） */
  lockAt(sp) { const l = this.el.lock; if (!sp) { l.classList.remove('on'); return; } l.style.transform = `translate(${sp.x}px,${sp.y}px)`; l.classList.add('on'); }
  mark(id, sp, kind) {
    let e = this.markEls.get(id);
    if (!sp || !kind) { if (e) e.className = 'sh-mark'; return; }
    if (!e) { e = h('div', 'sh-mark'); this.el.marks.appendChild(e); this.markEls.set(id, e); }
    e.className = 'sh-mark on ' + kind; e.textContent = kind === 'red' ? '危' : kind === 'issen' ? '閃' : '！';
    e.style.transform = `translate(${sp.x}px,${sp.y}px)`;
  }
  // ── 会話 ──
  showLine(sp, text) {
    this.el.dialog.hidden = false; this.el.dname.textContent = sp.name || ''; this.el.dname.style.color = sp.color || '#fff';
    this.el.dname.hidden = !sp.name; this.el.dtext.textContent = text; this.el.dialog.classList.toggle('sys', !sp.name);
  }
  hideDialog() { this.el.dialog.hidden = true; }
  // ── 一時停止メニュー ──
  openMenu(tab = 'top') {
    const g = this.g, m = this.el.menu, S = g.settings;
    m.hidden = false;
    const tabs = [['top', '再開'], ['controls', '操作'], ['settings', '設定'], ['load', 'ロード'], ['title', 'タイトルへ']];
    let body = '';
    if (tab === 'controls') {
      body = `<table class="sh-ctl"><tr><th>操作</th><th>キーボード＋マウス</th><th>ゲームパッド</th><th>タッチ</th></tr>${CONTROLS.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>
      <p class="sh-note">一閃：<b>ジャスト回避</b>（敵の攻撃が当たる直前に回避）の直後に攻撃＝見切り一閃。<b>パリィ</b>（白い「！」の攻撃に合わせて弾く）の直後に攻撃＝弾き一閃。<b>居合</b>（Q 長押しで構え）中に攻撃を受けると抜刀一閃。弱点（光る所）を撃った直後に攻撃＝撃ち一閃。赤い「危」は弾けない：回避のみ。</p>`;
    } else if (tab === 'settings') {
      body = `<div class="sh-set">
        <label>画質（解像度）<input type="range" min="0.4" max="1" step="0.05" data-s="resScale" value="${S.resScale}"><span>${Math.round(S.resScale * 100)}%</span></label>
        <label><input type="checkbox" data-s="shadows" ${S.shadows ? 'checked' : ''}>影</label>
        <label><input type="checkbox" data-s="outline" ${S.outline ? 'checked' : ''}>輪郭線</label>
        <label><input type="checkbox" data-s="rain" ${S.rain ? 'checked' : ''}>雨</label>
        <label>難しさ <select data-s="difficulty">${[['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']].map(([v, n]) => `<option value="${v}" ${S.difficulty === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-s="assist" ${S.assist ? 'checked' : ''}>一閃の手助け（窓を広げる・スロー延長）</label>
        <label>視点の速さ<input type="range" min="0.3" max="2.5" step="0.1" data-s="sens" value="${S.sens}"><span>${S.sens}</span></label>
        <label><input type="checkbox" data-s="invertY" ${S.invertY ? 'checked' : ''}>上下を反転</label>
        <label>音量<input type="range" min="0" max="1" step="0.05" data-s="volume" value="${S.volume}"><span>${Math.round(S.volume * 100)}%</span></label>
        <label><input type="checkbox" data-s="touchUI" ${S.touchUI ? 'checked' : ''}>タッチ操作を表示</label>
      </div><p class="sh-note">セーブは自宅のノートPC（手動）と、場所の移動・決着のあと（自動）。戦闘中は自動セーブしません。</p>`;
    } else if (tab === 'load') {
      const L = g.store.list();
      body = `<div class="sh-slots">${['auto', 'slot1', 'slot2', 'slot3'].map(k => { const s = L[k]; return `<button data-load="${k}" ${s ? '' : 'disabled'}>${k === 'auto' ? '自動' : '枠' + k.slice(-1)}　${s ? new Date(s.savedAt).toLocaleString('ja-JP') + '　' + fmtSec(s.playSec) : '（空き）'}</button>`; }).join('')}</div>`;
    } else {
      body = `<div class="sh-mtitle">境界侵食<small>（仮題）フェーズ2 切片</small></div><p class="sh-note">救った帰路：${g.count('kiro', 'rescue')}　倒した帰路：${g.count('kiro', 'kill')}　閉店：${g.heitenStatus()}</p>`;
    }
    m.innerHTML = `<div class="sh-mbox"><nav>${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="sh-mbody">${body}</div></div>`;
    m.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      g.sfx.play('ui');
      if (b.dataset.tab === 'top' && tab === 'top') return g.resume();
      if (b.dataset.tab === 'title') { location.href = 'index.html'; return; }
      if (b.dataset.tab) return this.openMenu(b.dataset.tab === 'top' ? 'top' : b.dataset.tab);
      if (b.dataset.load) { g.loadSlot(b.dataset.load); }
    };
    m.oninput = e => {
      const k = e.target.dataset.s; if (!k) return;
      const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
      g.applySetting(k, v);
      const sp = e.target.nextElementSibling; if (sp && sp.tagName === 'SPAN') sp.textContent = k === 'sens' ? v : Math.round(v * 100) + '%';
    };
    this.menuTab = tab;
  }
  closeMenu() { this.el.menu.hidden = true; }
  // ── セーブ（ノートPC） ──
  openSave() {
    const g = this.g, m = this.el.menu, L = g.store.list();
    m.hidden = false;
    m.innerHTML = `<div class="sh-mbox"><nav><button data-close="1">閉じる</button></nav><div class="sh-mbody"><div class="sh-mtitle">セーブ</div><div class="sh-slots">${['slot1', 'slot2', 'slot3'].map(k => { const s = L[k]; return `<button data-save="${k}">枠${k.slice(-1)}　${s ? new Date(s.savedAt).toLocaleString('ja-JP') + '　' + fmtSec(s.playSec) : '（空き）'}</button>`; }).join('')}</div><p class="sh-note">自動セーブ：${L.auto ? new Date(L.auto.savedAt).toLocaleString('ja-JP') : 'なし'}</p></div></div>`;
    m.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.close) return g.resume(); if (b.dataset.save) { const ok = g.saveSlot(b.dataset.save); g.sfx.play(ok ? 'save' : 'ui_ng'); this.openSave(); } };
    m.oninput = null;
  }
  // ── 金庫 ──
  openSafe(digits, onTry, onClose) {
    const s = this.el.safe; s.hidden = false; const val = new Array(digits).fill(0);
    const render = () => {
      s.innerHTML = `<div class="sh-sbox"><div class="sh-stitle">金庫（4桁）<small>番号は仮</small></div><div class="sh-dials">${val.map((v, i) => `<div class="sh-dial"><button data-i="${i}" data-d="1">▲</button><b>${v}</b><button data-i="${i}" data-d="-1">▼</button></div>`).join('')}</div><div class="sh-sbtn"><button data-a="open">開ける</button><button data-a="close">やめる</button></div><p class="sh-note">数字キー・矢印でも入力できます</p></div>`;
    };
    render();
    let cur = 0;
    s.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.d) { const i = +b.dataset.i; val[i] = (val[i] + +b.dataset.d + 10) % 10; this.g.sfx.play('ui'); render(); } if (b.dataset.a === 'open') { if (!onTry(val.join(''))) { s.querySelector('.sh-sbox').classList.add('ng'); this.g.sfx.play('ui_ng'); setTimeout(render, 400); } } if (b.dataset.a === 'close') onClose(); };
    this.safeKey = e => {
      if (s.hidden) return;
      if (/^Digit\d$/.test(e.code)) { val[cur] = +e.code.slice(5); cur = (cur + 1) % digits; render(); }
      if (e.code === 'ArrowUp') { val[cur] = (val[cur] + 1) % 10; render(); } if (e.code === 'ArrowDown') { val[cur] = (val[cur] + 9) % 10; render(); }
      if (e.code === 'ArrowRight') cur = (cur + 1) % digits; if (e.code === 'ArrowLeft') cur = (cur + digits - 1) % digits;
      if (e.code === 'Enter') { if (!onTry(val.join(''))) { this.g.sfx.play('ui_ng'); } }
      if (e.code === 'Escape') onClose();
    };
    addEventListener('keydown', this.safeKey);
  }
  closeSafe() { this.el.safe.hidden = true; if (this.safeKey) removeEventListener('keydown', this.safeKey); }
  showDead(on) { this.el.dead.hidden = !on; }
  perf(text) { this.el.perf.hidden = false; this.el.perf.textContent = text; }
}
function fmtSec(s) { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; }
