(() => {
  'use strict';

  // One shared tooltip for every chart mark that carries data-tip.
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.append(tip);
  let active = null;
  let width = 0, height = 0;
  let pointerX = 0, pointerY = 0;
  let pendingFrame = 0;

  function position() {
    pendingFrame = 0;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, pointerX + 14));
    const top = pointerY - height - 12 < 8 ? pointerY + 16 : pointerY - height - 12;
    tip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  function show(target, x, y) {
    pointerX = x;
    pointerY = y;
    if (active !== target) {
      hide();
      active = target;
      const mark = target.dataset.mark && document.getElementById(target.dataset.mark);
      if (mark) mark.classList.add('is-active');
      tip.textContent = target.dataset.tip;
      // Measure only when content changes. Pointer motion only moves this layer.
      width = tip.offsetWidth;
      height = tip.offsetHeight;
      position();
      tip.classList.add('is-visible');
    } else if (!pendingFrame) {
      pendingFrame = requestAnimationFrame(position);
    }
  }

  function hide() {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    if (!active) return;
    tip.classList.remove('is-visible');
    if (active) {
      const mark = active.dataset.mark && document.getElementById(active.dataset.mark);
      if (mark) mark.classList.remove('is-active');
    }
    active = null;
  }

  document.querySelectorAll('[data-tip]').forEach(element => {
    element.setAttribute('tabindex', '0');
    element.addEventListener('pointermove', event => show(element, event.clientX, event.clientY));
    element.addEventListener('pointerleave', hide);
    element.addEventListener('focus', () => {
      const box = element.getBoundingClientRect();
      show(element, box.left + box.width / 2, box.top);
    });
    element.addEventListener('blur', hide);
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide, { passive: true });
})();
