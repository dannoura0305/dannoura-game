// タッチ操作（横向き）：左の円で移動・右をなぞって視点・ボタン（走・視・灯・次）。
// 境界侵食の shinshoku/ui/touch.js は戦いのボタン（斬・銃・化…）と作品の game に結びついているので使わず、
// 同じ入力の器（shinshoku/core/input.js の Input の touch 欄：active・move・lookX/lookY・held・pressQ）に書く小さな物をここに置いた。
export function setupTouch(root, input, on = {}) {
  const T = input.touch; T.pressQ = T.pressQ || []; T.held = T.held || new Set();
  const wrap = document.createElement('div'); wrap.id = 'mk-touch';
  wrap.innerHTML = `<div class="mk-stick"><div class="mk-knob"></div></div>
    <div class="mk-tbtns"><button data-a="run">走</button><button data-a="view">視</button><button data-a="light">灯</button><button data-a="next">次</button></div>`;
  root.appendChild(wrap);
  const stick = wrap.querySelector('.mk-stick'), knob = wrap.querySelector('.mk-knob'), R = 56;
  let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
  wrap.addEventListener('touchstart', e => {
    T.active = true; input.device = 'touch';
    for (const t of e.changedTouches) {
      const b = t.target.closest && t.target.closest('button');
      if (b) { const a = b.dataset.a; b.classList.toggle('on', a === 'run' ? !b.classList.contains('on') : b.classList.contains('on')); if (on[a]) on[a](b); continue; }
      if (t.clientX < innerWidth * 0.45 && sid == null) { sid = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = (sx - 70) + 'px'; stick.style.top = (sy - 70) + 'px'; stick.classList.add('on'); }
      else if (lid == null) { lid = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sid) { let dx = t.clientX - sx, dy = t.clientY - sy; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; T.move.x = dx / R; T.move.y = -dy / R; }
      else if (t.identifier === lid) { T.lookX = (T.lookX || 0) + (t.clientX - lx) * 0.006; T.lookY = (T.lookY || 0) + (t.clientY - ly) * 0.005; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; T.move.x = T.move.y = 0; knob.style.transform = ''; stick.classList.remove('on'); } if (t.identifier === lid) lid = null; } e.preventDefault(); };
  wrap.addEventListener('touchend', end, { passive: false }); wrap.addEventListener('touchcancel', end, { passive: false });
  return { el: wrap, runOn: () => wrap.querySelector('[data-a="run"]').classList.contains('on') };
}
