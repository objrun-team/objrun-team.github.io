function createDnaTraceFocus(viewport, reduced) {
  const narrow = matchMedia('(max-width:600px)');
  const easing = 'cubic-bezier(.22,1,.36,1)';
  const motions = new Map();
  let frame = 0, focused;

  function lift(node) {
    if (!node || reduced.matches || !node.isConnected) return;
    node.getAnimations().filter(animation => animation.id === 'trace-focus').forEach(animation => animation.cancel());
    node.animate([{opacity:.65,filter:'blur(1.4px)'},{opacity:1,filter:'blur(0)'}],
      {id:'trace-focus',duration:290,easing});
  }

  const point = (a,b,t) => 3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
  function ease(progress) {
    let low = 0, high = 1;
    for (let i=0;i<10;i++) {
      const middle = (low+high)/2;
      if (point(.22,.36,middle) < progress) low = middle;
      else high = middle;
    }
    return point(1,1,(low+high)/2);
  }

  function tick(now) {
    frame = 0;
    for (const [port,motion] of motions) {
      if (!port.clientHeight || !motion.target.isConnected) {
        motions.delete(port);
        continue;
      }
      const progress = Math.max(0,Math.min(1,(now-motion.start)/motion.duration));
      port.scrollTop = progress === 1 ? motion.to : motion.from+(motion.to-motion.from)*ease(progress);
      if (progress === 1) {
        motions.delete(port);
        if (motion.arrive) lift(motion.target);
      }
    }
    if (motions.size) frame = requestAnimationFrame(tick);
  }

  function reveal(target, pane, arrive, immediate) {
    if (!pane || !target.getClientRects().length) return;
    const port = narrow.matches ? viewport : pane;
    if (!port.clientHeight) return;
    const top = port.getBoundingClientRect().top;
    const bounds = target.getBoundingClientRect();
    const available = port.clientHeight;
    const caret = target.classList.contains('trace-caret');
    const header = pane.firstElementChild;
    const pinned = header?.matches(narrow.matches ? '.kt-task-heading' : 'header');
    const inset = pinned && !header.contains(target) ? header.offsetHeight : 0;
    let current = port.scrollTop;
    const offset = bounds.top-top+current;
    const height = Math.min(bounds.height,available-inset-24);
    const maxScroll = port.scrollHeight-available;
    if (caret) {
      const minimum = Math.max(0,offset+height-available+8);
      const maximum = Math.min(maxScroll,Math.max(0,offset-inset-8));
      const corrected = Math.max(0,Math.min(maxScroll,Math.min(Math.max(current,minimum),maximum)));
      if (Math.abs(corrected-current) > 1) {
        motions.delete(port);
        port.scrollTop = corrected;
        current = port.scrollTop;
      }
    }
    const prior = motions.get(port);
    const view = prior?.to ?? current;
    const bottomSpace = caret ? 44 : 8;
    if (offset >= view+inset+8 && offset+height <= view+available-bottomSpace) {
      if (arrive && !prior && !immediate) lift(target);
      return;
    }
    const lead = inset+Math.max(12,Math.min(56,(available-inset-height)*.28));
    const destination = Math.max(0,Math.min(offset-lead,maxScroll));
    if (immediate || reduced.matches) {
      motions.delete(port);
      port.scrollTop = destination;
    } else if (Math.abs(view-destination) > 1) {
      motions.set(port,{from:current,to:destination,start:performance.now(),duration:caret ? 180 : 450,target,arrive});
      if (!frame) frame = requestAnimationFrame(tick);
    }
  }

  function show(target, source, immediate = false, followTarget = true) {
    if (!target) return;
    const pane = target.closest('.trace-scroll');
    const changed = focused !== pane;
    if (changed) {
      focused?.removeAttribute('data-trace-focus');
      focused = pane;
      focused?.setAttribute('data-trace-focus','');
    }
    if (!narrow.matches && source && !pane?.contains(source)) {
      reveal(source,source.closest('.trace-scroll'),false,immediate);
    }
    if (followTarget) reveal(target,pane,changed,immediate);
  }

  function cancel() {
    cancelAnimationFrame(frame);
    frame = 0;
    motions.clear();
  }
  viewport.addEventListener('wheel',cancel,{passive:true});
  viewport.addEventListener('touchstart',cancel,{passive:true});
  function showContext(target, immediate, followOnNarrow = false) {
    if (target && (!narrow.matches || followOnNarrow)) reveal(target,target.closest('.trace-scroll'),false,immediate);
  }
  return {show,showContext,cancel,swap:lift};
}
