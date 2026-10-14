// タッチ操作（横向き）：左の円で移動、右側をなぞってカメラ、ボタン（斬・避・弾・銃・替・調・回・≡）。
// COMBAT_SYSTEM_SPEC §6：銃＝押すと自動照準で構え・離すと撃つ／斬の長押し＝強攻撃・居合／ロックオンは自動。
export function setupTouch(root, input, game) {
  const T = input.touch; T.pressQ = []; T.held = new Set();
  const wrap = document.createElement('div'); wrap.id = 'sh-touch';
  wrap.innerHTML = `<div class="tc-stick"><div class="tc-knob"></div></div>
  <button class="tc-b tc-atk" data-a="attack">斬</button><button class="tc-b tc-dodge" data-a="dodge">避</button>
  <button class="tc-b tc-parry" data-a="parry">弾</button><button class="tc-b tc-gun" data-a="gun">銃</button>
  <button class="tc-b tc-swap" data-a="swap">替</button><button class="tc-b tc-use" data-a="interact">調</button>
  <button class="tc-b tc-heal" data-a="heal">回</button><button class="tc-b tc-menu" data-a="pause">≡</button>`;
  root.appendChild(wrap);
  const stick = wrap.querySelector('.tc-stick'), knob = wrap.querySelector('.tc-knob');
  let stickId = null, sx = 0, sy = 0, lookId = null, lx = 0, ly = 0;
  const R = 56;
  const btnTimers = new Map();
  wrap.addEventListener('touchstart', e => {
    T.active = true; input.device = 'touch';
    for (const t of e.changedTouches) {
      const b = t.target.closest && t.target.closest('.tc-b');
      if (b) {
        const a = b.dataset.a; b.classList.add('on');
        if (a === 'gun') { T.held.add('aim'); game.touchAimAssist = true; }
        else if (a === 'attack') { T.pressQ.push('attack'); btnTimers.set(t.identifier, { a, t0: performance.now(), el: b, timer: setTimeout(() => T.held.add('heavy'), 260) }); continue; }
        else T.pressQ.push(a);
        btnTimers.set(t.identifier, { a, el: b });
        continue;
      }
      if (t.clientX < innerWidth * 0.42 && stickId == null) { stickId = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = (sx - 70) + 'px'; stick.style.top = (sy - 70) + 'px'; stick.classList.add('on'); }
      else if (lookId == null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sx, dy = t.clientY - sy; const L = Math.hypot(dx, dy); if (L > R) { dx = dx / L * R; dy = dy / L * R; }
        knob.style.transform = `translate(${dx}px,${dy}px)`; T.move.x = dx / R; T.move.y = -dy / R;
      } else if (t.identifier === lookId) {
        T.lookX = (T.lookX || 0) + (t.clientX - lx) * 0.006 * input.sens; T.lookY = (T.lookY || 0) + (t.clientY - ly) * 0.005 * input.sens; lx = t.clientX; ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; T.move.x = T.move.y = 0; knob.style.transform = ''; stick.classList.remove('on'); }
      if (t.identifier === lookId) lookId = null;
      const b = btnTimers.get(t.identifier);
      if (b) {
        b.el.classList.remove('on');
        if (b.a === 'gun') { T.held.delete('aim'); T.pressQ.push('attack'); T.fireRelease = 10; }
        if (b.a === 'attack') { clearTimeout(b.timer); T.held.delete('heavy'); }
        btnTimers.delete(t.identifier);
      }
    }
    e.preventDefault();
  };
  wrap.addEventListener('touchend', end, { passive: false }); wrap.addEventListener('touchcancel', end, { passive: false });
  return {
    el: wrap,
    show(on) { wrap.style.display = on ? '' : 'none'; },
    setUse(on) { wrap.querySelector('.tc-use').classList.toggle('vis', !!on); },
    setIssen(on) { wrap.querySelector('.tc-atk').classList.toggle('issen', !!on); },
  };
}
