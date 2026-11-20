// The rate eases toward rest while a figure is being inspected. Elapsed time is
// local to the figure, independent of playback speed, scrubbing and tab switches.
class FigureMotion {
  constructor(figure, advance, suspend = () => {}) {
    const panel = figure.closest('.sphere-panel');
    this.panel = panel;
    this.advance = advance;
    this.suspend = suspend;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.hovered = matchMedia('(hover: hover)').matches && panel.matches(':hover');
    this.pressed = null;
    this.visible = false;
    this.ready = false;
    this.enabled = false;
    this.rate = 0;
    this.frame = 0;
    this.last = null;
    this.tick = this.tick.bind(this);

    panel.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'touch') { this.hovered = true; this.wake(); }
    });
    panel.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'touch') { this.hovered = false; this.wake(); }
    });
    panel.addEventListener('pointerdown', e => {
      if (e.isPrimary) { this.pressed = e.pointerId; this.wake(); }
    });
    const release = e => {
      if (e.pointerId === this.pressed) { this.pressed = null; this.wake(); }
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    panel.addEventListener('focusin', () => this.wake());
    panel.addEventListener('focusout', () => this.wake());

    const sync = () => this.sync();
    document.addEventListener('visibilitychange', sync);
    this.reduced.addEventListener('change', sync);
    const dialogs = new MutationObserver(sync);
    document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, {attributes:true, attributeFilter:['open']}));
    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.sync();
    }).observe(figure);
  }

  setReady(ready) {
    if (this.ready === ready) return;
    this.ready = ready;
    this.sync();
  }

  sync() {
    const enabled = this.ready && this.visible && !this.reduced.matches && !document.hidden && !document.querySelector('dialog[open]');
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) this.wake();
    else {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.last = null;
      this.rate = 0;
      this.suspend();
    }
  }

  wake() {
    if (this.enabled && !this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.frame = 0;
    const dt = this.last === null ? 0 : Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    const reading = this.panel.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    const target = this.hovered || this.pressed !== null || reading ? 0 : 1;
    const before = this.rate;
    // Exponential damping keeps velocity continuous if the pointer reverses mid-fade.
    this.rate += (target - this.rate) * -Math.expm1(-dt / (target ? .32 : .16));
    if (Math.abs(target - this.rate) < .002) this.rate = target;
    const idleSeconds = dt * (before + this.rate) / 2;
    const coasting = this.advance(dt, idleSeconds, this.rate);
    if (target || this.rate || coasting) this.wake();
    else this.last = null;
  }
}
