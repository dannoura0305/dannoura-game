// 画面の部品（DOM）：HUD・調べるの印・トースト・会話・一時停止メニュー・設定・金庫・倒れた時・性能表示。
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** キーの表示名（KeyW → W・Space → Space・ShiftLeft → 左Shift） */
export const keyName = c => c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : ({ ShiftLeft: '左Shift', ShiftRight: '右Shift', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ControlLeft: '左Ctrl', ControlRight: '右Ctrl', AltLeft: '左Alt', AltRight: '右Alt' })[c] || c;

export const CONTROLS = [
  ['移動', 'WASD', '左スティック', '左の円'], ['カメラ', 'マウス', '右スティック', '右側をなぞる'], ['走る', 'Shift', 'L3（切替）', '円を外まで倒す'],
  ['攻撃（刀・鉄パイプ）', '左クリック', 'X', '斬'], ['強攻撃／居合の構え', '左クリック長押し／Q 長押し', 'Y 長押し', '斬 長押し'],
  ['銃を構える', '右クリック（押す間）', 'LT', '銃（押す→構え・離す→撃つ）'], ['撃つ', '構え中に左クリック', 'RT', '同上'],
  ['回避（ジャスト回避）', 'Space', 'A', '避'], ['弾く（パリィ）', 'F', 'LB', '弾'], ['持ち替え（近接⇄銃）', 'ホイール／X', 'RB', '替'],
  ['武器を選ぶ', '1 刀・2 銃・3 鉄パイプ', '—', '—'],
  ['装填', 'R', '構え中に X', '弾切れで自動'], ['ロックオン／相手の切替', '中クリック・T ／ Z・C（ロック中にマウスを素早く振っても）', 'R3 ／ 十字キー左右', '自動／敵をタップ'],
  ['懐中電灯', 'L', '十字キー下', '灯'], ['調べる・話す', 'E', 'B', '調'],
  ['回復', 'H', '十字キー上', '回'], ['化けを解く／戻す（白髪形態・第3章の転機のあと）', 'V 長押し', 'View（Back）長押し', '化 長押し'],
  ['火縄銃（第4章から）', '4 キー（紫：銃床で打つ）／白で 替＝妖爪⇄火縄銃・攻撃で妖弾（溜め 0.5 秒）', 'RB（白）', '替 長押しで近接を順に／白で 替'],
  ['巨大猫又：妖爪連撃／紫の咆哮／跳躍／妖気放出', '左クリック／F／Space／右クリック（押し続ける）', 'X／LB／A／LT', '斬／弾／避／銃（押し続ける）'],
  ['第6章：糸の中継を切る（白）／振動計を当てる／蒸気弁を開ける／点検表を渡す', '調べる（E）', 'B', '調'],
  ['白髪形態：妖爪／妖刀／猫火／瞬歩／幻術', '左クリック／長押し／構え＋左クリック／Space／F', 'X／Y 長押し／LT＋RT／A／LB', '斬／斬 長押し／銃／避／弾'], ['一時停止', 'Esc／P', 'Start', '≡'], ['場面を飛ばす', 'E・Esc・Space を 1 秒長押し', 'B／Start 長押し', '調／≡ 長押し'],
];

const svg = d => `<svg viewBox="0 0 48 48" aria-hidden="true">${d}</svg>`;
const WEAPON_UI = {
  handgun: { name: 'ハンドガン（仮）', svg: svg('<path d="M6 16h30l3 4h4v6H24l-2 4h-6l2 8H9l3-12H6z" fill="#e8e0f4"/><rect x="12" y="19" width="20" height="2" fill="#7a6a9a"/>') },
  katana: { name: '日本刀', svg: svg('<path d="M4 40 L40 6 l3 2 L9 42z" fill="#e8ecf6"/><rect x="4" y="36" width="9" height="4" transform="rotate(-42 8 38)" fill="#8a5ab8"/><circle cx="12" cy="35" r="3" fill="#c8a040"/>') },
  pipe: { name: '鉄パイプ', svg: svg('<rect x="6" y="21" width="36" height="6" rx="2" transform="rotate(-30 24 24)" fill="#a8a4a0"/><rect x="6" y="21" width="9" height="6" transform="rotate(-30 24 24)" fill="#5a3a2a"/>') },
  matchlock: { name: '火縄銃（登録証つき）', svg: svg('<rect x="4" y="25" width="15" height="7" rx="2" transform="rotate(-18 12 28)" fill="#8a5a34"/><rect x="16" y="19" width="28" height="3.5" transform="rotate(-18 30 21)" fill="#2a2830"/><rect x="24" y="17.5" width="2.5" height="6" transform="rotate(-18 25 20)" fill="#c8a040"/><rect x="34" y="14.4" width="2.5" height="6" transform="rotate(-18 35 17)" fill="#c8a040"/><path d="M14 30q2 6-3 9" stroke="#b04a2a" stroke-width="2" fill="none"/>') },
  claw: { name: '妖爪（白髪形態）', svg: svg('<path d="M12 40 Q16 22 30 8 Q22 26 18 40z M20 42 Q26 24 40 12 Q30 30 26 42z M28 44 Q34 30 44 22 Q36 34 33 44z" fill="#e8d8ff"/>') },
  none: { name: '素手', svg: svg('<circle cx="24" cy="24" r="9" fill="none" stroke="#9c92b0" stroke-width="3"/>') },
};
const ITEM_UI = [
  ['medkit_l', '救急箱', svg('<rect x="7" y="14" width="34" height="24" rx="3" fill="#e8e4ec"/><rect x="18" y="9" width="12" height="6" fill="none" stroke="#e8e4ec" stroke-width="3"/><path d="M21 19h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#d0405a"/>')],
  ['medkit_s', 'ばんそうこう', svg('<rect x="6" y="18" width="36" height="12" rx="6" transform="rotate(-25 24 24)" fill="#f0c8a8"/><rect x="18" y="19" width="12" height="10" transform="rotate(-25 24 24)" fill="#fff0e0"/>')],
  ['coffee', '缶コーヒー', svg('<rect x="15" y="9" width="18" height="30" rx="3" fill="#8a5a3a"/><rect x="15" y="17" width="18" height="10" fill="#e8d8c0"/><rect x="17" y="6" width="14" height="4" rx="1" fill="#b8b0a8"/>')],
  ['ammo', '弾', svg('<rect x="13" y="16" width="6" height="22" fill="#c8a040"/><path d="M13 16q3-9 6 0z" fill="#d8b860"/><rect x="21" y="16" width="6" height="22" fill="#c8a040"/><path d="M21 16q3-9 6 0z" fill="#d8b860"/><rect x="29" y="16" width="6" height="22" fill="#c8a040"/><path d="M29 16q3-9 6 0z" fill="#d8b860"/>')],
];

export class UI {
  constructor(root, game) {
    this.root = root; this.g = game; this.toastT = 0; this.barkT = 0;
    root.innerHTML = `
<div id="sh-hud">
  <div class="sh-vital"><div class="sh-face"><img alt=""><span>だ</span></div><div class="sh-hpwrap"><div class="sh-hpname">だんのうら <i class="sh-paw"></i></div><div class="sh-hp"><i class="sh-hpfill"></i><i class="sh-hplag"></i></div><div class="sh-hpnum"></div><div class="sh-yoki"><span>妖力</span><div class="sh-ykbar"><i></i><b></b></div><em class="sh-ykn"></em></div></div></div>
  <div class="sh-combo"><b class="sh-cn"></b><span>Combo</span><div class="sh-cb"></div></div><div class="sh-form">白髪形態</div>
  <div class="sh-weapon"><div class="sh-wmain"><div class="sh-wicon"></div><div class="sh-wtext"><b class="sh-ammo"></b><span class="sh-wname"></span></div></div><div class="sh-wsub"><div class="sh-wicon2"></div><span class="sh-wname2"></span><kbd class="sh-wkey"></kbd></div><div class="sh-swapbar"><i></i></div><div class="sh-items"></div></div>
  <div class="sh-obj"><div class="sh-objc"></div><div class="sh-objh">メインミッション</div><div class="sh-objt"></div><div class="sh-objsh">サブミッション</div><div class="sh-objs"></div></div>
  <div class="sh-comp"></div><div class="sh-lightic">灯</div>
  <div class="sh-map"><canvas width="300" height="300"></canvas><div class="sh-mapdist"></div></div>
  <div class="sh-slots4"></div>
  <div class="sh-hints"></div>
  <div class="sh-boss"><div class="sh-bossn"></div><div class="sh-bossbar"><i></i></div><div class="sh-bossp"></div></div>
  <div class="sh-cross"></div>
  <div class="sh-prompt"></div>
  <div class="sh-toast"></div>
  <div class="sh-bark"></div>
  <div class="sh-log"></div>
  <div class="sh-lock"></div>
  <div class="sh-marks"></div>
  <div class="sh-slow"></div><div class="sh-flash"></div><div class="sh-lowhp"></div><div class="sh-vignette"></div>
  <div class="sh-hint"></div>
  <div class="sh-gskills"></div>
</div>
<div class="sh-lb sh-lbt"></div><div class="sh-lb sh-lbb"></div><div class="sh-sub"></div><div class="sh-skip">長押しで飛ばす</div>
<div class="sh-card"><div class="sh-cardt"></div></div><div class="sh-fade"></div>
<div id="sh-puz" hidden></div>
<div id="sh-dialog" hidden><div class="sh-dname"></div><div class="sh-dtext"></div><div class="sh-dnext">▼</div></div>
<div id="sh-menu" hidden></div>
<div id="sh-safe" hidden></div>
<div id="sh-dead" hidden><div class="sh-deadt">倒れた……</div><button data-a="retry">直前から</button><button data-a="title">タイトルへ</button></div>
<div id="sh-perf" hidden></div>
<div id="sh-rotate" hidden>横向きにしてください</div>`;
    this.el = {
      hpfill: $('.sh-hpfill', root), hplag: $('.sh-hplag', root), hpnum: $('.sh-hpnum', root), items: $('.sh-items', root), weapon: $('.sh-weapon', root), ammo: $('.sh-ammo', root), swapbar: $('.sh-swapbar i', root),
      wicon: $('.sh-wicon', root), wname: $('.sh-wname', root), wicon2: $('.sh-wicon2', root), wname2: $('.sh-wname2', root), wkey: $('.sh-wkey', root), wsub: $('.sh-wsub', root),
      faceImg: $('.sh-face img', root), map: $('.sh-map canvas', root), mapWrap: $('.sh-map', root), mapDist: $('.sh-mapdist', root), slots4: $('.sh-slots4', root), hints: $('.sh-hints', root), objsh: $('.sh-objsh', root),
      cross: $('.sh-cross', root), prompt: $('.sh-prompt', root), toast: $('.sh-toast', root), bark: $('.sh-bark', root), log: $('.sh-log', root), lock: $('.sh-lock', root), marks: $('.sh-marks', root),
      slow: $('.sh-slow', root), flash: $('.sh-flash', root), lowhp: $('.sh-lowhp', root), hint: $('.sh-hint', root),
      obj: $('.sh-obj', root), objc: $('.sh-objc', root), objt: $('.sh-objt', root), objs: $('.sh-objs', root), comp: $('.sh-comp', root), lightic: $('.sh-lightic', root),
      gskills: $('.sh-gskills', root), boss: $('.sh-boss', root), yoki: $('.sh-yoki', root), ykfill: $('.sh-ykbar i', root), ykmin: $('.sh-ykbar b', root), ykn: $('.sh-ykn', root), combo: $('.sh-combo', root), cn: $('.sh-cn', root), cb: $('.sh-cb', root), form: $('.sh-form', root), bossn: $('.sh-bossn', root), bossbar: $('.sh-bossbar i', root), bossp: $('.sh-bossp', root),
      lbt: $('.sh-lbt', root), lbb: $('.sh-lbb', root), sub: $('.sh-sub', root), skip: $('.sh-skip', root), card: $('.sh-card', root), cardt: $('.sh-cardt', root), fadeEl: $('.sh-fade', root), puz: $('#sh-puz', root),
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
    this.el.hpnum.textContent = `HP ${Math.ceil(F.hp)} / ${F.hpMax}`;
    this.el.lowhp.style.opacity = r < 0.3 ? (0.35 + Math.sin(performance.now() / 300) * 0.15).toFixed(2) : '0';
    // 妖力（白髪形態の解禁後）・連撃の数（concept_03 の「Combo」）
    const yk = F.yokiOn || F.white;
    if (this.el.yoki.classList.contains('on') !== yk) this.el.yoki.classList.toggle('on', yk);
    if (yk) { const v = F.yoki / F.C.white.gauge.max; this.el.ykfill.style.width = (v * 100).toFixed(1) + '%'; this.el.ykmin.style.left = (F.C.white.gauge.min / F.C.white.gauge.max * 100) + '%'; this.el.ykfill.parentElement.classList.toggle('ready', F.yoki >= F.C.white.gauge.min && !F.white); this.el.ykn.textContent = Math.floor(F.yoki); }
    const cn = F.comboN;
    if (cn !== this.comboShown) { this.comboShown = cn; this.el.combo.classList.toggle('on', cn >= 2); if (cn >= 2) { this.el.cn.textContent = cn; const m = F.comboMul(); this.el.cb.textContent = F.white ? `連撃ボーナス ×${m.toFixed(1)}` : ''; this.el.combo.classList.remove('pop'); void this.el.combo.offsetWidth; this.el.combo.classList.add('pop'); } }
    // 武器の札（今の武器・持ち替え先）
    const W = WEAPON_UI, cur = W[F.weapon] || W.none, alt = W[F.swapTarget() || 'none'] || W.none;
    if (this.wKey !== F.weapon + '|' + F.swapTarget()) { this.wKey = F.weapon + '|' + F.swapTarget(); this.el.wicon.innerHTML = cur.svg; this.el.wname.textContent = cur.name; this.el.wicon2.innerHTML = alt.svg; this.el.wname2.textContent = alt.name; this.el.wsub.hidden = !F.swapTarget(); }
    this.el.ammo.textContent = F.weapon === 'handgun' ? `${F.mag} / ${F.ammo}` : F.weapon === 'none' ? '' : F.owned.includes('handgun') ? `弾 ${F.mag}/${F.ammo}` : '';
    this.el.weapon.classList.toggle('gun', F.weapon === 'handgun');
    const sw = F.st.name === 'swap' ? F.st.f / F.st.total : F.st.name === 'reload' ? F.st.f / F.C.handgun.reload : 0;
    this.el.swapbar.style.width = (sw * 100).toFixed(0) + '%';
    this.el.cross.classList.toggle('on', F.weapon === 'handgun' && !!F.aimHeld);
    this.el.cross.classList.toggle('weak', !!p.aimWeak);
    // 道具の 4 枠
    const it = this.g.items, key = ['medkit_s', 'medkit_l', 'coffee'].map(k => it[k] || 0).join(',') + ',' + F.ammo;
    if (key !== this.slotKey) {
      this.slotKey = key;
      this.el.slots4.innerHTML = ITEM_UI.map(([id, name, svg]) => { const n = id === 'ammo' ? F.ammo : it[id] || 0; return `<div class="sh-slot ${n ? '' : 'empty'}" title="${name}">${svg}<b>${n}</b><small>${name}</small></div>`; }).join('');
    }
  }
  /** 右側の操作のヒント（入力の種類で変える） */
  hints(dev, ctx) {
    const K = dev === 'pad' ? { aim: 'LT', fire: 'RT', atk: 'X', reload: 'X長', swap: 'RB', dodge: 'A', parry: 'LB', use: 'B', heal: '↑', light: '↓', lock: 'R3' } : { aim: '右クリ', fire: '左クリ', atk: '左クリ', reload: 'R', swap: 'ホイール', dodge: 'Space', parry: 'F', use: 'E', heal: 'H', light: 'L', lock: 'T' };
    const rows = ctx.gun ? [[K.aim, '構える'], [K.fire, '発砲'], [K.reload, 'リロード'], [K.swap, '武器切替'], [K.dodge, '回避'], [K.heal, '回復']]
      : ctx.match && ctx.white ? [[K.atk, '妖弾（溜め）'], [K.aim, '構える'], [K.swap, '妖爪へ'], [K.dodge, '瞬歩'], [K.parry, '幻術'], [K.lock, 'ロックオン']]
      : ctx.match ? [[K.atk, '銃床で打つ（長押し：強）'], [K.dodge, '回避'], [K.swap, '武器切替'], [dev === 'pad' ? '—' : '1〜4', '武器を選ぶ'], [K.lock, 'ロックオン'], [K.light, '懐中電灯']]
      : [[K.atk, ctx.melee ? '攻撃（長押し：強）' : '—'], [K.parry, '弾く'], [K.dodge, '回避'], [K.swap, '武器切替'], [K.lock, 'ロックオン'], [K.light, '懐中電灯']];
    const html = rows.map(([k, t]) => `<div><kbd>${k}</kbd>${t}</div>`).join('');
    if (html !== this.hintHtml) { this.hintHtml = html; this.el.hints.innerHTML = html; }
  }
  setPortrait(url) { if (url) { this.el.faceImg.src = url; this.el.faceImg.parentElement.classList.add('img'); } }
  /** ミニマップ（円・北を示す方位・目標までの距離）。m = { img, minX, minZ, ppm, px, pz, yaw, dots:[{x,z,c}], target:{x,z}|null, dist } */
  minimap(m) {
    const cv = this.el.map, g = cv.getContext('2d'), W = cv.width, R = W / 2, k = m.k || 7;
    g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(R, R, R - 6, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(16,10,30,.82)'; g.fillRect(0, 0, W, W);
    g.translate(R, R); g.rotate(m.yaw);
    if (m.img) { g.globalAlpha = 0.95; g.drawImage(m.img, (m.minX - m.px) * k, (m.minZ - m.pz) * k, m.img.width / m.ppm * k, m.img.height / m.ppm * k); g.globalAlpha = 1; }
    for (const d of m.dots) { g.fillStyle = d.c; g.beginPath(); g.arc((d.x - m.px) * k, (d.z - m.pz) * k, d.r || 5, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // 目標（円の外なら縁に）
    if (m.target) {
      const dx = m.target.x - m.px, dz = m.target.z - m.pz, c = Math.cos(m.yaw), s = Math.sin(m.yaw);
      let x = (dx * c - dz * s) * k, y = (dx * s + dz * c) * k; const L = Math.hypot(x, y), lim = R - 16;
      if (L > lim) { x = x / L * lim; y = y / L * lim; }
      g.save(); g.translate(R + x, R + y); g.rotate(Math.PI / 4); g.fillStyle = '#ffd040'; g.strokeStyle = '#3a2a00'; g.lineWidth = 2; g.fillRect(-8, -8, 16, 16); g.strokeRect(-8, -8, 16, 16); g.restore();
    }
    // 自分（上向きの矢印）
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(R, R - 13); g.lineTo(R + 9, R + 10); g.lineTo(R, R + 5); g.lineTo(R - 9, R + 10); g.closePath(); g.fill();
    // 縁と方位
    g.strokeStyle = 'rgba(220,200,255,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 6, 0, Math.PI * 2); g.stroke();
    g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [lab, a] of [['N', Math.PI], ['E', Math.PI / 2], ['S', 0], ['W', -Math.PI / 2]]) {
      // 世界の向き a（+z を 0）を画面へ：上＝カメラの前
      const wx = Math.sin(a), wz = Math.cos(a), c = Math.cos(m.yaw), s = Math.sin(m.yaw);
      const x = (wx * c - wz * s), y = (wx * s + wz * c);
      g.fillStyle = lab === 'N' ? '#ff9ac8' : '#e8dcff'; g.fillText(lab, R + x * (R - 20), R + y * (R - 20));
    }
    this.el.mapDist.textContent = m.dist != null ? `${Math.round(m.dist)}m` : '';
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
  mark(id, sp, kind, label) {
    let e = this.markEls.get(id);
    if (!sp || !kind) { if (e) e.className = 'sh-mark'; return; }
    if (!e) { e = h('div', 'sh-mark'); this.el.marks.appendChild(e); this.markEls.set(id, e); }
    e.className = 'sh-mark on ' + kind + (label ? ' copy' : ''); const t = kind === 'red' ? '危' : kind === 'issen' ? '閃' : '！';
    if (e.dataset.t !== t + (label || '')) { e.dataset.t = t + (label || ''); e.innerHTML = label ? `${t}<small>${esc(label)}</small>` : t; }
    e.style.transform = `translate(${sp.x}px,${sp.y}px)`;
  }
  /** 白髪形態の表示 */
  form(on) { this.el.form.classList.toggle('on', !!on); this.root.classList.toggle('white', !!on); }
  // ── 会話 ──
  showLine(sp, text, who) {
    const pid = { dan: 'dannoura', companion: 'companion' }[who], url = pid && this.g.portraits && this.g.portraits[pid];
    if (!this.el.dport) { this.el.dport = document.createElement('img'); this.el.dport.className = 'sh-dport'; this.el.dialog.appendChild(this.el.dport); }
    this.el.dport.hidden = !url; if (url) this.el.dport.src = url; this.el.dialog.classList.toggle('port', !!url);
    this.el.dialog.hidden = false; this.el.dname.textContent = sp.name || ''; this.el.dname.style.color = sp.color || '#fff';
    this.el.dname.hidden = !sp.name; this.el.dtext.textContent = text; this.el.dialog.classList.toggle('sys', !sp.name);
  }
  hideDialog() { this.el.dialog.hidden = true; }
  // ── 目標・相棒・懐中電灯・ボス ──
  objective(ch, text, sub) { this.el.objc.textContent = ch || ''; this.el.objt.textContent = text || ''; this.el.objs.textContent = sub || ''; this.el.objsh.hidden = !sub; this.el.obj.classList.toggle('on', !!text); if (text !== this.lastObj) { this.lastObj = text; this.el.obj.classList.remove('new'); void this.el.obj.offsetWidth; this.el.obj.classList.add('new'); } }
  companion(state, name) { const e = this.el.comp; if (!state) { e.className = 'sh-comp'; return; } const T = { follow: 'ついてきている', hide: '隠れている', cower: 'おびえている', grabbed: 'つかまれた！', wait: '待っている', scripted: '' }; e.className = 'sh-comp on ' + state; e.textContent = `${name}：${T[state] ?? ''}`; }
  light(on) { this.el.lightic.classList.toggle('on', !!on); }
  boss(name, ratio, phase, extra) { const b = this.el.boss; if (name == null) { b.classList.remove('on'); return; } b.classList.add('on'); this.el.bossn.textContent = name; this.el.bossbar.style.width = (Math.max(0, ratio) * 100).toFixed(1) + '%'; this.el.bossp.textContent = phase || ''; b.classList.toggle('rc', !!extra); }
  // ── 演出：上下の黒い帯・字幕・章の札・暗転 ──
  letterbox(on) { this.el.lbt.classList.toggle('on', !!on); this.el.lbb.classList.toggle('on', !!on); this.el.skip.classList.toggle('on', !!on); this.root.classList.toggle('cine', !!on); }
  subtitle(sp, text) { const e = this.el.sub; if (!text) { e.classList.remove('on'); return; } e.innerHTML = (sp && sp.name ? `<b style="color:${sp.color || '#fff'}">${esc(sp.name)}</b>` : '') + esc(text); e.classList.add('on'); }
  skipProgress(k) { this.el.skip.style.setProperty('--k', String(Math.min(1, k))); }
  chapterCard(title, dur = 3.2) { const c = this.el.card; this.el.cardt.textContent = title; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); clearTimeout(this.cardTimer); this.cardTimer = setTimeout(() => c.classList.remove('on'), dur * 1000); }
  fade(on) { this.el.fadeEl.classList.toggle('on', !!on); }
  // ── 調べ物の画面 ──
  closePuzzle() { this.el.puz.hidden = true; this.el.puz.innerHTML = ''; this.el.puz.classList.remove('choice'); if (this.puzKey) { removeEventListener('keydown', this.puzKey); this.puzKey = null; } }
  _puz(html, onClick, onKey) {
    const p = this.el.puz; p.hidden = false; p.innerHTML = `<div class="sh-pbox">${html}</div>`;
    p.onclick = e => { const b = e.target.closest('button'); if (b) { this.g.sfx.play('ui'); onClick(b.dataset, b); } };
    if (this.puzKey) removeEventListener('keydown', this.puzKey);
    this.puzKey = e => { if (e.code === 'Escape') { e.preventDefault(); onClick({ close: '1' }); } else if (onKey) onKey(e); };
    addEventListener('keydown', this.puzKey);
  }
  /** 名簿の照合：班ごとに 7 人の名簿と 6 枚の受付票。受付票の無い人を選ぶ */
  rosterUI(R, state, onPick, onClose, group) {
    const gs = R.groups, g = group || gs.find(x => !(state.done || {})[x]) || gs[0];
    const people = R.people.filter(p => p.group === g), cards = R.cards(g), done = (state.done || {})[g];
    const html = `<div class="sh-ptitle">避難者名簿の照合 <small>名簿 42 人・受付票 36 枚（名前は仮）</small></div>
      <nav class="sh-pnav">${gs.map(x => `<button data-g="${x}" class="${x === g ? 'on' : ''} ${(state.done || {})[x] ? 'ok' : ''}">${x}班${(state.done || {})[x] ? '✓' : ''}</button>`).join('')}</nav>
      <div class="sh-pcols"><div><div class="sh-phead">名簿（${g}班）</div>${people.map(p => `<button class="sh-pname ${done === p.name ? 'hit' : ''}" data-pick="${esc(p.name)}" ${done ? 'disabled' : ''}>${p.no}．${esc(p.name)}</button>`).join('')}</div>
      <div><div class="sh-phead">受付票（${g}班・${cards.length} 枚）</div>${cards.map(c => `<div class="sh-pcard">${esc(c)}</div>`).join('')}</div></div>
      <p class="sh-note">受付票が無い人（来ていない人）を、名簿から 1 人選んでください。${state.miss ? `（ちがう選択 ${state.miss} 回）` : ''}</p>
      <div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.g) return this.rosterUI(R, state, onPick, onClose, d.g); if (d.pick) { const ns = onPick(g, d.pick); if (ns) this.rosterUI(R, ns, onPick, onClose, ns.done[g] ? (gs.find(x => !ns.done[x]) || g) : g); } });
  }
  /** 番号の引き出し（1〜9） */
  drawerUI(onTry, onClose, note) {
    const html = `<div class="sh-ptitle">受付の机の引き出し <small>${esc(note || '')}</small></div><div class="sh-pgrid">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div><div class="sh-sbtn"><button data-close="1">やめる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.n) onTry(+d.n); }, e => { if (/^Digit[1-9]$/.test(e.code)) onTry(+e.code.slice(5)); });
  }
  /** 館内放送のマイク：名前を選んで呼ぶ */
  micUI(options, onPick, onClose, note) {
    const html = `<div class="sh-ptitle">館内放送のマイク <small>${esc(note || '')}</small></div><div class="sh-plist">${options.map(n => `<button data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div><div class="sh-sbtn"><button data-close="1">やめる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.name) onPick(d.name); });
  }
  /** 防犯映像：4 台のカメラ。あり得ない記録を選ぶ */
  cctvUI(cams, draw, onPick, onClose, note) {
    const html = `<div class="sh-ptitle">防犯カメラの映像 <small>明かりが消えた瞬間の記録</small></div><div class="sh-pcams">${cams.map(c => `<button class="sh-pcam" data-cam="${c.id}"><canvas width="240" height="135" data-c="${c.id}"></canvas><span>${esc(c.place)}</span><code>${esc(c.stamp)}</code></button>`).join('')}</div><p class="sh-note">${esc(note || '')}</p><div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.cam) onPick(d.cam); });
    for (const cv of this.el.puz.querySelectorAll('canvas')) draw(cv.dataset.c, cv.getContext('2d'), cv.width, cv.height);
  }
  /** 病院の「記録のない患者」：病室の札とカルテ棚を照らし合わせ、カルテの無い患者（の病室）を選ぶ */
  recordsUI(R, state, onPick, onClose) {
    const html = `<div class="sh-ptitle">病室の札とカルテの照合 <small>名前はすべて仮</small></div>
      <div class="sh-pcols"><div><div class="sh-phead">病室の札（ホワイトボード）</div>${R.plates.map(p => `<button class="sh-pname" data-room="${p.room}" ${state.done ? 'disabled' : ''}>${p.room}　${esc(p.name)}</button>`).join('')}</div>
      <div><div class="sh-phead">カルテ棚</div>${R.charts.map(c => `<div class="sh-pcard"><b>${c.room}</b>　${esc(c.name)}<br><small>${esc(c.note)}</small></div>`).join('')}</div></div>
      <p class="sh-note">カルテが無い患者は、どの病室？（札の名前とカルテの名前を見比べる）${state.miss ? `（ちがう選択 ${state.miss} 回）` : ''}</p><div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.room) { const ns = onPick(d.room); if (ns) this.recordsUI(R, ns, onPick, onClose); } });
  }
  /** 入退室の記録（第4章の必須）：あり得ない時刻の行を選ぶ */
  logsUI(logs, state, onPick, onClose, note) {
    const html = `<div class="sh-ptitle">入退室の記録（研究区画 B・分室） <small>時刻・職員証の番号はすべて仮</small></div>
      <div class="sh-logs">${logs.map(l => `<button class="sh-logrow ${state.picked === l.id ? 'hit' : ''}" data-log="${l.id}" ${state.done ? 'disabled' : ''}><code>${esc(l.time)}</code><b>${esc(l.card)}</b><span>${esc(l.what)}</span></button>`).join('')}</div>
      <p class="sh-note">${esc(note || '')}${state.miss ? `（ちがう選択 ${state.miss} 回）` : ''}</p><div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.log) { const ns = onPick(d.log); if (ns) this.logsUI(logs, ns, onPick, onClose, note); } });
  }
  /** 配電盤（第4章・第5章 secret の必須。B.hint：保全記録の一行）：遮断器を入れ切りして「投入」 */
  breakerUI(B, on, hint, onApply, onClose, msg) {
    const load = B.list.filter(b => on.has(b.id)).reduce((s, b) => s + b.load, 0);
    const html = `<div class="sh-ptitle">配電盤（非常電源） <small>容量 ${B.capacity}・名前と値は仮</small></div>
      <div class="sh-brk">${B.list.map(b => `<button data-brk="${b.id}" class="${on.has(b.id) ? 'on' : ''}"><i></i><b>${esc(b.name)}</b><small>${hint ? '負荷 ' + b.load : '負荷 ？'}</small></button>`).join('')}</div>
      <p class="sh-note">いまの負荷 ${hint ? load : '？'} ／ ${B.capacity}。${hint ? (B.hint || '保全記録：応答炉は非常時に入れないこと。') : '（盤の横に保全記録がある）'}${msg ? '<br>→ ' + esc(msg) : ''}</p>
      <div class="sh-sbtn"><button data-apply="1">投入する</button><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => {
      if (d.close) return onClose();
      if (d.brk) { if (on.has(d.brk)) on.delete(d.brk); else on.add(d.brk); this.g.sfx.play('breaker'); return this.breakerUI(B, on, hint, onApply, onClose, msg); }
      if (d.apply) { const r = onApply([...on]); if (r && !r.ok) this.breakerUI(B, on, hint, onApply, onClose, r.msg); else if (r && r.ok) this.breakerUI(B, on, hint, onApply, onClose, r.msg); }
    });
  }
  /** 点呼卓（第5章の必須）：名前を順に選んで「呼ぶ」。names：部屋の札の名前（部屋の順）、seq：今の並び */
  rollcallUI(names, seq, onPick, onUndo, onCall, onClose, note, miss) {
    const html = `<div class="sh-ptitle">点呼卓（収容棟） <small>名前・番号はすべて仮</small></div>
      <div class="sh-plist">${names.map(n => `<button data-name="${esc(n.name)}" ${seq.includes(n.name) ? 'disabled' : ''}><code>${esc(n.room)}</code> ${esc(n.name)}</button>`).join('')}</div>
      <p class="sh-note">呼ぶ順：${seq.length ? seq.map((n, i) => `${i + 1}．${esc(n)}`).join('　') : '（まだ）'}<br>${esc(note || '')}${miss ? `（ちがう点呼 ${miss} 回）` : ''}</p>
      <div class="sh-sbtn"><button data-call="1" ${seq.length ? '' : 'disabled'}>呼ぶ（鐘を鳴らす）</button><button data-undo="1">やり直す</button><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.undo) return onUndo(); if (d.call) return onCall(); if (d.name) onPick(d.name); });
  }
  /** 監視カメラ（第6章B）：4 台の記録の時刻と画面の奥の壁時計（見るだけ） */
  clockUI(cams, draw, onClose, note) {
    const html = `<div class="sh-ptitle">監視卓（中央管理棟） <small>時刻・名前はすべて仮</small></div><div class="sh-pcams">${cams.map(c => `<div class="sh-pcam"><canvas width="240" height="135" data-c="${c.id}"></canvas><span>CAM-${c.id.slice(1)}　${esc(c.place)}</span><code>記録 ${esc(c.stamp)}</code></div>`).join('')}</div><p class="sh-note">${esc(note || '')}</p><div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); });
    for (const cv of this.el.puz.querySelectorAll('canvas')) draw(cv.dataset.c, cv.getContext('2d'), cv.width, cv.height);
  }
  /** 保守扉の時刻の入力（第6章B の必須）：候補の時刻から選ぶ。onPick は失敗の文（null で成功） */
  timeUI(options, onPick, onClose, note, msg) {
    const html = `<div class="sh-ptitle">機械室の保守扉 <small>最後の正常な巡回の時刻を入れる</small></div><div class="sh-plist sh-times">${options.map(t => `<button data-t="${esc(t)}"><code>${esc(t)}</code></button>`).join('')}</div><p class="sh-note">${esc(note || '').replace(/\n/g, '<br>')}${msg ? '<br>→ ' + esc(msg) : ''}</p><div class="sh-sbtn"><button data-close="1">やめる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.t) { const m = onPick(d.t); if (m) this.timeUI(options, onPick, onClose, note, m); } });
  }
  /** 点検表（第6章B の必須）：前回値・今回値（測った物だけ）・温度・音。止めるべき機械を選ぶ。onPick は失敗の文（null で成功） */
  roundsUI(rows, onPick, onClose, note, msg) {
    const Z = { good: '良', warn: '注意', danger: '危険' };
    const html = `<div class="sh-ptitle">点検表（機械室・巡回） <small>値はすべて仮・作中の保全基準</small></div>
      <table class="sh-ctl sh-rounds"><tr><th>機械</th><th>前回</th><th>今回（振動）</th><th>軸受</th><th>音</th><th></th></tr>${rows.map(r => `<tr><th>${esc(r.name)}</th><td>${r.prev.toFixed(1)}</td><td>${r.now == null ? '<i>未測定</i>' : `<b class="z-${r.zone}">${r.now.toFixed(1)}</b>（${Z[r.zone]}）`}</td><td>${r.temp == null ? '—' : r.temp + '℃'}</td><td>${r.sound == null ? '—' : esc(r.sound)}</td><td><button data-pick="${r.id}">止める</button></td></tr>${r.note && r.now != null ? `<tr><td colspan="6"><small>${esc(r.note)}</small></td></tr>` : ''}`).join('')}</table>
      <p class="sh-note">${esc(note || '').replace(/\n/g, '<br>')}${msg ? '<br>→ ' + esc(msg) : ''}</p><div class="sh-sbtn"><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.pick) { const m = onPick(d.pick); if (m) this.roundsUI(rows, onPick, onClose, note, m); } });
  }
  /** 隔離（止める手順）：手順を順に選んで「実行」 */
  lotoUI(steps, seq, onPick, onUndo, onRun, onClose, note, msg, miss) {
    const name = id => (steps.find(s => s.id === id) || {}).name || id;
    const html = `<div class="sh-ptitle">P-2 を止める手順 <small>現場盤・遮断器・弁（仮）</small></div>
      <div class="sh-plist sh-loto">${steps.map(s => `<button data-step="${s.id}" ${seq.includes(s.id) ? 'disabled' : ''}>${esc(s.name)}</button>`).join('')}</div>
      <p class="sh-note">順番：${seq.length ? seq.map((id, i) => `${i + 1}．${esc(name(id))}`).join('　') : '（まだ）'}<br>${esc(note || '')}${miss ? `（やり直し ${miss} 回）` : ''}${msg ? '<br>→ ' + esc(msg) : ''}</p>
      <div class="sh-sbtn"><button data-run="1" ${seq.length ? '' : 'disabled'}>実行する</button><button data-undo="1">やり直す</button><button data-close="1">閉じる</button></div>`;
    this._puz(html, d => { if (d.close) return onClose(); if (d.undo) return onUndo(); if (d.run) return onRun(); if (d.step) onPick(d.step); });
  }
  /** 巨大猫又の暴走・守る場面の技の案内（items：[[名前, キー, 動いている, 薄く]]） */
  giantSkillsList(items) {
    const key = 'L' + items.map(i => i.join()).join('|');
    if (key === this.gsKey) return; this.gsKey = key;
    this.el.gskills.innerHTML = items.map(([n, k, act, dim]) => `<div class="${act ? 'act' : ''} ${dim ? 'dim' : ''}"><kbd>${k}</kbd><b>${n}</b></div>`).join('');
  }
  /** 巨大猫又の技の案内（concept_04 の配置を参考に独自に：右下に 4 つ） */
  giantSkills(dev, F) {
    const K = dev === 'pad' ? ['X', 'LB', 'A', 'LT'] : dev === 'touch' ? ['斬', '弾', '避', '銃'] : ['左クリ', 'F', 'Space', '右クリ'];
    const st = F.st.name, need = F.G.roar.cost;
    const items = [['妖爪連撃', K[0], st === 'claw'], ['紫の咆哮', K[1], st === 'roar', F.gauge < need], ['跳躍', K[2], st === 'leap'], ['妖気放出', K[3], st === 'beam', F.gauge < 5]];
    const key = items.map(i => i.join()).join('|') + dev;
    if (key === this.gsKey) return; this.gsKey = key;
    this.el.gskills.innerHTML = items.map(([n, k, act, dim]) => `<div class="${act ? 'act' : ''} ${dim ? 'dim' : ''}"><kbd>${k}</kbd><b>${n}</b></div>`).join('');
  }
  /** 選択（時間制限なし・閉じられない）。options：[{id,label,sub}] */
  choiceUI(title, options, onPick, note) {
    const html = `<div class="sh-ptitle sh-choice-t">${esc(title)}</div><div class="sh-choice">${options.map((o, i) => `<button data-pick="${o.id}"><kbd>${i + 1}</kbd><b>${esc(o.label)}</b><small>${esc(o.sub || '')}</small></button>`).join('')}</div>${note ? `<p class="sh-note">${esc(note)}</p>` : ''}`;
    this._puz(html, d => { if (d.pick) onPick(d.pick); }, e => { const m = /^Digit([1-9])$/.exec(e.code); if (m && options[+m[1] - 1]) onPick(options[+m[1] - 1].id); });
    this.el.puz.classList.add('choice');
  }
  /** 装備の欄 */
  equipBody(g) {
    const own = g.ownedEquip || [], on = g.equipped || [];
    if (!own.length) return '<p class="sh-note">まだ装備を持っていません。（金庫・裏路地の祠・警備室の落とし物箱）</p>';
    return `<div class="sh-equip">${own.map(id => { const e = g.EQUIP[id]; return `<button data-eq="${id}" class="${on.includes(id) ? 'on' : ''}"><b>${esc(e.name)}</b><small>${esc(e.desc)}</small>${on.includes(id) ? '<em>装備中</em>' : ''}</button>`; }).join('')}</div><p class="sh-note">装備の枠は 2 つ。持ち替え・居合・見切りの時間が変わります（名前・効果は仮）。</p>`;
  }
  /** キーの割り当て（キーボード）：操作ごとに今のキーと「変える」。変える＝次に押したキー（Esc でやめる） */
  keysBody(g) {
    const L = g.input.rebindable(), wait = this.keyWait;
    return `<table class="sh-ctl sh-keys">${L.map(([a, label]) => `<tr><th>${esc(label)}</th><td>${g.input.codesOf(a).map(c => `<kbd>${esc(keyName(c))}</kbd>`).join(' ') || '—'}</td><td><button data-rebind="${a}" class="${wait === a ? 'on' : ''}">${wait === a ? '次に押すキー…（Esc でやめる）' : '変える'}</button></td></tr>`).join('')}</table>
      <p class="sh-note">マウス（攻撃・構え・ロック）とゲームパッド・タッチの割り当ては変わりません。同じキーを別の操作に使っていた時は、入れ替えます。</p><div class="sh-sbtn"><button data-keyreset="1">既定に戻す</button></div>`;
  }
  waitKey(action) {
    const g = this.g; this.keyWait = action; this.openMenu('keys');
    const fn = e => {
      e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', fn, true); this.keyWait = null;
      if (e.code !== 'Escape') g.rebindKey(action, e.code);
      this.openMenu('keys');
    };
    addEventListener('keydown', fn, true);
  }
  endCard(stats, onClose, title = '第2章（避難所）　ここまで', note = '') {
    const html = `<div class="sh-ptitle">${esc(title)}</div><div class="sh-stats">${stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('')}</div><p class="sh-note">${esc(note)}</p><div class="sh-sbtn"><button data-close="1">続ける</button></div>`;
    this._puz(html, d => { if (d.close) onClose(); });
  }
  // ── 一時停止メニュー ──
  openMenu(tab = 'top') {
    const g = this.g, m = this.el.menu, S = g.settings;
    m.hidden = false;
    const tabs = [['top', '再開'], ['equip', '装備'], ['controls', '操作'], ['keys', 'キー'], ['settings', '設定'], ['load', 'ロード'], ['title', 'タイトルへ']];
    let body = '';
    if (tab === 'controls') {
      body = `<table class="sh-ctl"><tr><th>操作</th><th>キーボード＋マウス</th><th>ゲームパッド</th><th>タッチ</th></tr>${CONTROLS.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>
      <p class="sh-note">一閃：<b>ジャスト回避</b>（敵の攻撃が当たる直前に回避）の直後に攻撃＝見切り一閃。<b>パリィ</b>（白い「！」の攻撃に合わせて弾く）の直後に攻撃＝弾き一閃。<b>居合</b>（Q 長押しで構え）中に攻撃を受けると抜刀一閃。弱点（光る所）を撃った直後に攻撃＝撃ち一閃。赤い「危」は弾けない：回避のみ。</p>`;
    } else if (tab === 'keys') {
      body = this.keysBody(g);
    } else if (tab === 'equip') {
      body = this.equipBody(g);
    } else if (tab === 'settings') {
      body = `<div class="sh-set">
        <label>画質の段 <select data-s="preset">${[['auto', '自動（' + (g.autoPresetKey === 'low' ? '低' : g.autoPresetKey === 'mid' ? '中' : '高') + '）'], ['high', '高（PC）'], ['mid', '中'], ['low', '低（スマホ）'], ['custom', '個別']].map(([v, n]) => `<option value="${v}" ${(S.preset || 'auto') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>画質（解像度）<input type="range" min="0.4" max="1" step="0.05" data-s="resScale" value="${S.resScale}"><span>${Math.round(S.resScale * 100)}%</span></label>
        <label><input type="checkbox" data-s="shadows" ${S.shadows ? 'checked' : ''}>影</label>
        <label><input type="checkbox" data-s="outline" ${S.outline ? 'checked' : ''}>輪郭線</label>
        <label><input type="checkbox" data-s="rain" ${S.rain ? 'checked' : ''}>雨</label>
        <label><input type="checkbox" data-s="halos" ${S.halos !== false ? 'checked' : ''}>光のにじみ（ブルームの代わり）</label>
        <label><input type="checkbox" data-s="wet" ${S.wet !== false ? 'checked' : ''}>濡れた地面の映り込み</label>
        <label>字幕の大きさ <select data-s="subSize">${[['s', '小'], ['m', '中'], ['l', '大']].map(([v, n]) => `<option value="${v}" ${(S.subSize || 'm') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>難しさ <select data-s="difficulty">${[['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']].map(([v, n]) => `<option value="${v}" ${S.difficulty === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-s="assist" ${S.assist ? 'checked' : ''}>一閃の手助け（窓を広げる・スロー延長）</label>
        <label>暴走の「抑える」 <select data-s="rampageInput">${[['both', '長押しと連打の両方'], ['hold', '長押しだけ'], ['mash', '連打だけ']].map(([v, n]) => `<option value="${v}" ${(S.rampageInput || 'both') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>画面の揺れ <select data-s="shake">${[['1', 'ふつう'], ['0.4', '弱い'], ['0', 'なし']].map(([v, n]) => `<option value="${v}" ${String(S.shake ?? 1) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>視点の速さ<input type="range" min="0.3" max="2.5" step="0.1" data-s="sens" value="${S.sens}"><span>${S.sens}</span></label>
        <label><input type="checkbox" data-s="invertY" ${S.invertY ? 'checked' : ''}>上下を反転</label>
        <label>音量<input type="range" min="0" max="1" step="0.05" data-s="volume" value="${S.volume}"><span>${Math.round(S.volume * 100)}%</span></label>
        <label><input type="checkbox" data-s="touchUI" ${S.touchUI ? 'checked' : ''}>タッチ操作を表示</label>
      </div><p class="sh-note">セーブは自宅のノートPC（手動）と、場所の移動・決着のあと（自動）。戦闘中は自動セーブしません。</p>`;
    } else if (tab === 'load') {
      const L = g.store.list();
      body = `<div class="sh-slots">${['auto', 'slot1', 'slot2', 'slot3', 'tenki', 'branch'].filter(k => k !== 'tenki' && k !== 'branch' || L[k]).map(k => { const s = L[k]; return `<button data-load="${k}" ${s ? '' : 'disabled'}>${k === 'auto' ? '自動' : k === 'tenki' ? '転機の前' : k === 'branch' ? '◆ 分岐の前' : '枠' + k.slice(-1)}　${s ? new Date(s.savedAt).toLocaleString('ja-JP') + '　' + fmtSec(s.playSec) : '（空き）'}</button>`; }).join('')}</div>`;
    } else {
      body = `<div class="sh-mtitle">境界侵食<small>（仮題）序章〜第6章 試作</small></div><p class="sh-note">${esc(g.chapterTitle())}　／　${esc(g.objectiveText())}</p><p class="sh-note">救った帰路：${g.count('kiro', 'rescue')}　倒した帰路：${g.count('kiro', 'kill')}　閉店：${g.heitenStatus()}　収容者：${g.bossStatus()}　（相棒）の信頼：${g.companionTrust()}</p>`;
    }
    m.innerHTML = `<div class="sh-mbox"><nav>${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="sh-mbody">${body}</div></div>`;
    m.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      g.sfx.play('ui');
      if (b.dataset.tab === 'top' && tab === 'top') return g.resume();
      if (b.dataset.tab === 'title') { location.href = 'index.html'; return; }
      if (b.dataset.tab) return this.openMenu(b.dataset.tab === 'top' ? 'top' : b.dataset.tab);
      if (b.dataset.load) { g.loadSlot(b.dataset.load); }
      if (b.dataset.eq) { g.toggleEquip(b.dataset.eq); this.openMenu('equip'); }
      if (b.dataset.rebind) { this.waitKey(b.dataset.rebind); }
      if (b.dataset.keyreset) { g.resetKeys(); this.openMenu('keys'); }
    };
    m.oninput = e => {
      const k = e.target.dataset.s; if (!k) return;
      const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
      g.applySetting(k, v);
      if (k === 'preset') return this.openMenu('settings');
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
