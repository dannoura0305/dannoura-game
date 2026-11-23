// ══════════════════════════════════════════════════════════
// ゲームパッド診断（window.PADDIAG）：gamepad.html（単独）と、ゲーム内の一時停止メニューから開く
//  ・接続・切断の記録、名前・配置（standard か）・流儀（Xbox／PlayStation／Nintendo）
//  ・論理ボタン（A B X Y …）と生のボタン番号・軸の値、スティックの位置、トリガーの深さ
//  ・ボタン割り当ての学習（非標準の機種向け。1 つずつ押す → この端末に保存）
//  ・入力遅延の目安（読み取りの間隔、コントローラーの更新時刻から読み取りまで）と反応テスト
//  ・振動テスト（対応環境のみ）
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const CSS = `
.pdg{color:#e8e4ff;font:13px/1.5 sans-serif;}
.pdg h3{margin:10px 0 4px;font-size:13px;color:#ffd75a;letter-spacing:.06em;}
.pdg .pdg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:4px;}
.pdg .pdg-b{padding:4px 2px;border:1px solid rgba(230,224,255,.3);border-radius:4px;text-align:center;background:#16123e;font-size:12px;position:relative;overflow:hidden;}
.pdg .pdg-b.on{background:#2f8f3a;border-color:#bfffc8;}
.pdg .pdg-b small{display:block;color:#a99cc8;font-size:10px;}
.pdg .pdg-b i{position:absolute;left:0;bottom:0;height:3px;background:#ffd75a;}
.pdg .pdg-sticks{display:flex;gap:14px;flex-wrap:wrap;align-items:center;}
.pdg .pdg-st{width:84px;height:84px;border:1px solid #cfc8f0;border-radius:50%;position:relative;background:radial-gradient(circle,#221d55 0 18%,#14113a 19%);}
.pdg .pdg-st b{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#ffd75a;left:50%;top:50%;}
.pdg .pdg-st span{position:absolute;bottom:-18px;left:0;right:0;text-align:center;font-size:11px;color:#a99cc8;}
.pdg .pdg-raw{font-family:monospace;font-size:11px;word-break:break-all;color:#cfc8f0;}
.pdg .pdg-log{max-height:96px;overflow:auto;font-size:11px;color:#cfc8f0;background:#0c0a26;border:1px solid rgba(230,224,255,.2);padding:4px 6px;border-radius:4px;}
.pdg button{font:inherit;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(230,224,255,.45);border-radius:5px;padding:6px 10px;margin:2px 4px 2px 0;cursor:pointer;}
.pdg .pdg-wiz{padding:8px;border:1px solid #ffd75a;border-radius:6px;background:#221d55;margin-top:6px;}
.pdg .pdg-flash{display:inline-block;width:40px;height:20px;border-radius:4px;background:#333;vertical-align:middle;margin-left:6px;}
.pdg .pdg-flash.on{background:#ffd75a;}
.pdg table{border-collapse:collapse;font-size:12px;}.pdg td{padding:1px 8px 1px 0;}
`;
  const WIZ = [['A', 'A（下のボタン：Xbox の A・PS の ×・Nintendo の B）'], ['B', 'B（右のボタン：Xbox の B・PS の ○・Nintendo の A）'], ['X', 'X（左のボタン）'], ['Y', 'Y（上のボタン）'],
    ['LB', 'LB（L1・L）'], ['RB', 'RB（R1・R）'], ['LT', 'LT（L2・ZL）を奥まで'], ['RT', 'RT（R2・ZR）を奥まで'], ['SELECT', 'View（Create・−）'], ['START', 'Menu（Options・＋）'],
    ['L3', '左スティックを押し込む'], ['R3', '右スティックを押し込む'], ['UP', '十字キー 上'], ['DOWN', '十字キー 下'], ['LEFT', '十字キー 左'], ['RIGHT', '十字キー 右'],
    ['LX', '左スティックを右に倒す'], ['LY', '左スティックを下に倒す'], ['RX', '右スティックを右に倒す'], ['RY', '右スティックを下に倒す']];
  const D = {
    host: null, log: [], wiz: null, react: null, off: [], raf: 0,
    mount(host, opts) {
      const I = root.INPUT; if (!host || !I) return;
      this.unmount(); this.host = host; this.opts = opts || {};
      if (!document.getElementById('pdg-style')) { const s = document.createElement('style'); s.id = 'pdg-style'; s.textContent = CSS; document.head.appendChild(s); }
      host.innerHTML = `<div class="pdg">
        <div class="pdg-pads"></div>
        <h3>ボタン（論理名／標準の番号）</h3><div class="pdg-grid pdg-btns"></div>
        <h3>スティック・トリガー</h3><div class="pdg-sticks"><div class="pdg-st" data-s="L"><b></b><span>左</span></div><div class="pdg-st" data-s="R"><b></b><span>右</span></div><div class="pdg-trig" style="flex:1;min-width:140px"></div></div>
        <h3 style="margin-top:22px">生の値（ブラウザが返す番号）</h3><div class="pdg-raw"></div>
        <h3>ボタン割り当て</h3><div class="pdg-map"></div>
        <h3>入力遅延の目安</h3><div class="pdg-lat"></div>
        <h3>振動</h3><div class="pdg-rum"></div>
        <h3>接続・切断の記録</h3><div class="pdg-log"></div>
      </div>`;
      const q = s => host.querySelector(s);
      const bg = q('.pdg-btns'); bg.innerHTML = I.BTN.map(b => `<div class="pdg-b" data-b="${b}">${b}<small>#${I.STD[b]}</small><i></i></div>`).join('');
      host.addEventListener('click', this._click = e => { const b = e.target.closest('[data-act]'); if (b) { e.stopPropagation(); this.action(b.dataset.act); } });
      this.off.push(I.on('connect', p => this.addLog(`接続：${p.name}（${p.mapping || '非標準'}・ボタン${p.buttons}・軸${p.axes}）`)));
      this.off.push(I.on('disconnect', p => this.addLog(`切断：${p.name}`)));
      for (const k in I.pads) this.addLog(`接続中：${I.pads[k].name}`);
      this.off.push(I.on('frame', (S, now) => this.frame(S, now)));
      this.renderStatic();
    },
    unmount() { this.off.forEach(f => f()); this.off = []; if (this.host && this._click) this.host.removeEventListener('click', this._click); this.host = null; this.wiz = null; this.react = null; },
    addLog(t) { const d = new Date(); this.log.unshift(`${d.toLocaleTimeString()}　${t}`); this.log.length = Math.min(this.log.length, 30); const el = this.host && this.host.querySelector('.pdg-log'); if (el) el.innerHTML = this.log.map(x => `<div>${esc(x)}</div>`).join('') || '（まだありません）'; },
    renderStatic() {
      const I = root.INPUT, q = s => this.host.querySelector(s);
      const gp = I.raw();
      const fam = { xbox: 'Xbox 配置', ps: 'PlayStation 配置', nintendo: 'Nintendo 配置' };
      q('.pdg-pads').innerHTML = gp ? `<table><tr><td>名前</td><td>${esc(gp.id)}</td></tr><tr><td>配置</td><td>${gp.mapping === 'standard' ? 'standard（標準）' : '非標準（番号を推定。合わなければ下で割り当て）'}</td></tr><tr><td>流儀</td><td>${fam[I.familyOf(gp.id)]}</td></tr><tr><td>番号</td><td>${gp.index}（ボタン ${gp.buttons.length}・軸 ${gp.axes.length}）</td></tr><tr><td>台数</td><td>${Object.keys(I.pads).length}</td></tr></table>`
        : '<p>コントローラーが見つかりません。つないでから <b>どれかのボタンを押して</b> ください（iPhone・iPad・一部のブラウザは、ボタンを押すまで見えません）。</p>';
      const learned = gp && I.maps[gp.id];
      q('.pdg-map').innerHTML = (gp ? `<div>${learned ? 'この機種は学習した割り当てを使っています。' : gp.mapping === 'standard' ? '標準の配置をそのまま使っています。' : '非標準：番号を推定しています。'}</div>
        <button type="button" data-act="wiz">割り当てを覚えさせる（1 つずつ押す）</button>${learned ? '<button type="button" data-act="reset">学習した割り当てを消す</button>' : ''}` : '') + '<div class="pdg-wizbox"></div>';
      q('.pdg-rum').innerHTML = gp ? (I.canRumble() ? '<button type="button" data-act="rum1">弱く</button><button type="button" data-act="rum2">強く</button><button type="button" data-act="rum3">長く</button>' : 'この端末・ブラウザでは、ゲームパッドの振動を使えません（ブラウザが振動の機能を出していません）。') : '—';
      q('.pdg-lat').innerHTML = '<span class="pdg-latv"></span><div style="margin-top:4px"><button type="button" data-act="react">反応テスト（光ったらどれかのボタン）</button><span class="pdg-flash"></span> <span class="pdg-reactv"></span></div>';
      this.lastId = gp ? gp.id : '';
    },
    action(a) {
      const I = root.INPUT;
      if (a === 'wiz') { const gp = I.raw(); if (gp) this.wiz = { id: gp.id, i: 0, map: { buttons: {}, axes: {} }, base: snap(gp), wait: 0, t0: performance.now() }; }
      if (a === 'reset') { const gp = I.raw(); if (gp) { I.setMap(gp.id, null); this.renderStatic(); } }
      if (a === 'skip' && this.wiz) this.wizNext(null);
      if (a === 'cancel') { this.wiz = null; this.renderStatic(); }
      if (a === 'rum1') I.rumble(200, 0, 0.5); if (a === 'rum2') I.rumble(300, 1, 1); if (a === 'rum3') I.rumble(1000, 0.5, 0.3);
      if (a === 'react') this.react = { at: performance.now() + 1200 + Math.random() * 2000, shown: 0 };
    },
    wizNext(found) {
      const w = this.wiz, [name] = WIZ[w.i];
      if (found) {
        if (found.type === 'button') w.map.buttons[name] = found.i;
        else if (found.type === 'axis') {
          if (name === 'LT' || name === 'RT') w.map.axes[name + 'a'] = found.i;
          else if (/^(UP|DOWN|LEFT|RIGHT)$/.test(name)) w.map.hat = found.i;
          else w.map.axes[name] = found.i;
        }
      }
      w.i++; w.wait = performance.now() + 350;
      if (w.i >= WIZ.length) {
        const I = root.INPUT, std = I.STD, map = w.map;
        // 覚えなかった物は標準の番号で埋める
        for (const b of I.BTN) if (map.buttons[b] == null && !(map.hat != null && /^(UP|DOWN|LEFT|RIGHT)$/.test(b))) map.buttons[b] = std[b];
        for (const a of ['LX', 'LY', 'RX', 'RY']) if (map.axes[a] == null) map.axes[a] = { LX: 0, LY: 1, RX: 2, RY: 3 }[a];
        I.setMap(w.id, map); this.wiz = null; this.addLog('割り当てを保存しました'); this.renderStatic();
      }
    },
    frame(S, now) {
      if (!this.host || !this.host.isConnected) { this.unmount(); return; }
      const I = root.INPUT, q = s => this.host.querySelector(s), gp = I.raw();
      if ((gp ? gp.id : '') !== this.lastId) this.renderStatic();
      for (const el of this.host.querySelectorAll('.pdg-b')) { const b = el.dataset.b; el.classList.toggle('on', !!S.buttons[b]); el.querySelector('i').style.width = Math.round((S.values[b] || 0) * 100) + '%'; }
      for (const el of this.host.querySelectorAll('.pdg-st')) { const s = I.stick(el.dataset.s); el.querySelector('b').style.transform = `translate(${s.x * 36}px,${s.y * 36}px)`; }
      q('.pdg-trig').innerHTML = ['LT', 'RT'].map(t => `<div>${t}：${Math.round((S.values[t] || 0) * 100)}%</div>`).join('') + `<div>LX ${S.axes.LX.toFixed(2)} LY ${S.axes.LY.toFixed(2)}<br>RX ${S.axes.RX.toFixed(2)} RY ${S.axes.RY.toFixed(2)}</div>`;
      q('.pdg-raw').textContent = gp ? 'buttons: ' + Array.from(gp.buttons).map((b, i) => `${i}:${(typeof b === 'number' ? b : b.value).toFixed(2)}${b.pressed ? '*' : ''}`).join(' ') + '\naxes: ' + Array.from(gp.axes).map((a, i) => `${i}:${a.toFixed(2)}`).join(' ') : '—';
      const st = I.stats, gap = st.pollGapN ? st.pollGapSum / st.pollGapN : 0, lag = st.lagN ? st.lagSum / st.lagN : null;
      const lv = q('.pdg-latv'); if (lv) lv.textContent = `読み取り間隔 平均 ${gap.toFixed(1)}ms（${gap ? Math.round(1000 / gap) : 0}回/秒）　コントローラー更新→読み取り ${lag == null ? '（このブラウザは更新時刻を返しません）' : `平均 ${lag.toFixed(1)}ms・最大 ${st.lagMax.toFixed(1)}ms`}　画面に出るまでの目安 ${((lag || 0) + gap).toFixed(0)}〜${((lag || 0) + gap * 2).toFixed(0)}ms`;
      // 反応テスト
      const R = this.react;
      if (R) {
        const fl = q('.pdg-flash'), rv = q('.pdg-reactv');
        if (!R.shown && now >= R.at) { R.shown = now; if (fl) fl.classList.add('on'); }
        const any = Object.keys(S.pressed).length > 0;
        if (any && R.shown) { const ms = now - R.shown; if (rv) rv.textContent = `${ms.toFixed(0)}ms（人の反応＋入力遅延＋画面の遅れ）`; if (fl) fl.classList.remove('on'); this.react = null; }
        else if (any && !R.shown) { if (rv) rv.textContent = '早すぎ！もう一度'; this.react = null; }
      }
      // 割り当ての学習：生の値で、基準から変わったボタン・軸を探す
      const w = this.wiz, box = q('.pdg-wizbox');
      if (w && box) {
        if (!gp || gp.id !== w.id) { this.wiz = null; box.innerHTML = '途中で外れたのでやめました'; return; }
        box.innerHTML = `<div class="pdg-wiz">(${w.i + 1}/${WIZ.length}) <b>${esc(WIZ[w.i][1])}</b><br><button type="button" data-act="skip">この機種には無い（飛ばす）</button><button type="button" data-act="cancel">やめる</button></div>`;
        if (now < w.wait) { w.base = snap(gp, w.base); return; }
        const cur = snap(gp);
        let found = null;
        cur.b.forEach((v, i) => { if (!found && v > 0.6 && (w.base.b[i] || 0) < 0.3) found = { type: 'button', i }; });
        if (!found) { let best = 0; cur.a.forEach((v, i) => { const d = Math.abs(v - (w.base.a[i] || 0)); if (d > 0.6 && d > best) { best = d; found = { type: 'axis', i }; } }); }
        if (found) this.wizNext(found);
      }
    },
  };
  function snap(gp) { return { b: Array.from(gp.buttons).map(b => typeof b === 'number' ? b : (b.pressed ? Math.max(1, b.value) : b.value)), a: Array.from(gp.axes) }; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  root.PADDIAG = D;
})(typeof window !== 'undefined' ? window : globalThis);
