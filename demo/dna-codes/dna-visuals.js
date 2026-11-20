// Real-data scientific visualizers for the DNA codebook replay:
// 1. Degree-stratified 39,702-orbit space & independent-set canvas (from orbgraph.bin counts)
// 2. Interactive 32x32 Hamming distance matrix (from final-code.txt + archived active pair)
// 3. Four-word closed orbit symmetry diagram (w, rev, comp, rc)
// All canvas loops respect prefers-reduced-motion, visibility, open dialogs, and smooth hover damping.

const dnaMotion = (() => {
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeOutExpo = t => {
    const x = clamp01(t);
    return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  };
  const easeOutCubic = t => {
    const x = clamp01(t);
    return 1 - (1 - x) ** 3;
  };
  const easeOutBack = (t, s = 1.55) => {
    const x = clamp01(t) - 1;
    return 1 + (s + 1) * x ** 3 + s * x ** 2;
  };
  const easeInOutCubic = t => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
  };
  const damp = (cur, target, dt, tau) => {
    if (dt <= 0) return cur;
    return cur + (target - cur) * -Math.expm1(-dt / tau);
  };

  function createLoop(canvas, renderFrame) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const storyView = document.getElementById('story-view');
    const isPlaying = () => storyView?.dataset.playing === 'true';
    let hovered = false;
    let pressed = false;
    let visible = true;
    let frame = 0;
    let last = null;
    let idleRate = 0;

    function isActive() {
      const shown = canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
      if (!shown) return false;
      const rect = canvas.getBoundingClientRect();
      const inView = visible || (rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth);
      return inView && !document.hidden && !document.querySelector('dialog[open]');
    }

    function wake() {
      if (!frame && isActive()) frame = requestAnimationFrame(tick);
    }

    function stop() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      last = null;
    }

    function sync() {
      if (isActive()) {
        if (reduced.matches) {
          stop();
          idleRate = 0;
          renderFrame(0, 0, 0, true);
        } else {
          wake();
        }
      } else {
        stop();
        idleRate = 0;
      }
    }

    function tick(now) {
      frame = 0;
      if (!isActive()) {
        last = null;
        idleRate = 0;
        return;
      }
      const dt = last === null ? 1 / 60 : Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (reduced.matches) {
        idleRate = 0;
        renderFrame(dt, 0, 0, true);
        return;
      }
      const targetIdle = !isPlaying() || hovered || pressed ? 0 : 1;
      const prevRate = idleRate;
      idleRate = damp(idleRate, targetIdle, dt, targetIdle ? 0.42 : 0.16);
      if (Math.abs(targetIdle - idleRate) < 0.002) idleRate = targetIdle;
      const idleDt = dt * (prevRate + idleRate) * 0.5;
      const needsMore = renderFrame(dt, idleDt, idleRate, false);
      if (needsMore || targetIdle > 0 || idleRate > 0) wake();
      else last = null;
    }

    canvas.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'touch') { hovered = true; wake(); }
    });
    canvas.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'touch') { hovered = false; wake(); }
    });
    canvas.addEventListener('pointerdown', e => {
      if (e.isPrimary) { pressed = true; wake(); }
    });
    const release = () => { if (pressed) { pressed = false; wake(); } };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    if (storyView) {
      new MutationObserver(() => wake()).observe(storyView, {attributes: true, attributeFilter: ['data-playing']});
    }
    const dialogs = new MutationObserver(sync);
    document.querySelectorAll('dialog').forEach(d => dialogs.observe(d, {attributes: true, attributeFilter: ['open']}));
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(canvas);

    return {wake, sync, get reduced() { return reduced.matches; }};
  }

  return {clamp01, easeOutExpo, easeOutCubic, easeOutBack, easeInOutCubic, damp, createLoop};
})();

function createDnaOrbitSpace(canvas, text) {
  const ctx = canvas.getContext('2d');
  const bins = dnaRunDiagrams.degreeBins;
  const totalOrbits = dnaRunDiagrams.orbits;
  const totalPoints = 1588; // 1 dot ~= 25 orbits
  const points = [];
  let seed = 20261030;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Distribute dots proportionally to archived degree bins (400..999).
  let created = 0;
  bins.forEach(([degStart, count], bi) => {
    const n = bi === bins.length - 1 ? totalPoints - created : Math.round(count / totalOrbits * totalPoints);
    created += n;
    for (let i = 0; i < n; i++) {
      const deg = degStart + rand() * 100;
      const angle = rand() * Math.PI * 2;
      const norm = (deg - 400) / 600; // 0 (low degree, outer) -> 1 (high degree, inner)
      const radius = Math.max(0.16, Math.min(0.95, 0.22 + (1 - norm) * 0.72 + (rand() - 0.5) * 0.035));
      points.push({
        deg,
        baseAngle: angle,
        baseRadius: radius,
        order: rand(),
        rank: rand() + norm * 0.35, // lower degree orbits preferentially enter MIS
        phase: rand() * Math.PI * 2,
        twinklePhase: rand() * Math.PI * 2,
        twinkleSpeed: 0.72 + rand() * 1.35,
        brightStar: rand() < 0.14,
        radialSpeed: 0.62 + (1 - radius) * 0.68, // subtle differential orbital drift
        // Animated per-point state
        r: 138, g: 155, b: 232,
        a: 0.52,
        dotR: 1.45,
        radialScale: 1,
        haloA: 0,
        popAge: 1,
        wasSelected: false,
        x: 0,
        y: 0
      });
    }
  });

  // Partition points to match exact archived screening counts:
  // 22,230 initial valid (55.99%), 16,772 wrongly dropped & restored (42.24%), 700 truly invalid (1.76%).
  points.sort((a, b) => a.order - b.order);
  const initialCut = Math.round(totalPoints * 22230 / totalOrbits);
  const restoredCut = Math.round(totalPoints * 39002 / totalOrbits);
  points.forEach((p, idx) => {
    p.group = idx < initialCut ? 'initial' : idx < restoredCut ? 'restored' : 'invalid';
    p.idx = idx;
  });

  // Deterministic representative conflict chords (with staggered reveal & pulse seeds).
  const chords = [];
  for (let i = 0; i < 64; i++) {
    const a = Math.floor(rand() * totalPoints);
    const b = (a + 13 + Math.floor(rand() * 240)) % totalPoints;
    chords.push({
      a, b,
      bad: rand() < 0.24,
      stagger: i / 64,
      pulsePhase: rand(),
      pulseSpeed: 0.22 + rand() * 0.2
    });
  }
  const initialEligible = points.filter(p => p.group === 'initial').sort((a, b) => a.rank - b.rank);
  const allEligible = points.filter(p => p.group !== 'invalid').sort((a, b) => a.rank - b.rank);

  let state = {mode: 'orbits', selectedOrbits: 0, corrected: false, screened: false, fault: false, exactHighlight: false};
  let misSet = new Set();
  let reveal = 1;
  let hovered = null;
  let hoverFade = 0;
  let width = 0, height = 0, cx = 0, cy = 0, R = 0;

  // Nonlinear transition wave timers (0..1, 1 = settled)
  let restoreWave = 1;
  let screenWave = 1;
  let faultWave = 1;
  let buildWave = 1;
  let idleTime = 0;
  let driftAngle = 0;
  let transitionEnergy = 0;

  function updateCoordinates(idleRate = 0) {
    for (const p of points) {
      const a = p.baseAngle + driftAngle * p.radialSpeed;
      const microBreath = idleRate > 0.005 ? Math.sin(idleTime * 1.15 + p.phase) * 0.007 * idleRate : 0;
      const rad = (p.baseRadius * p.radialScale + microBreath) * R;
      p.x = cx + Math.cos(a) * rad;
      p.y = cy + Math.sin(a) * rad;
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = width * 0.5;
    cy = height * 0.51;
    R = Math.min(width * 0.45, height * 0.45);
    updateCoordinates();
    return true;
  }

  function computeMisSet(s) {
    const nextSet = new Set();
    const misCount = s.selectedOrbits ? Math.max(12, Math.round(s.selectedOrbits / 2.2)) : 0;
    if (misCount > 0) {
      const pool = s.corrected ? allEligible : initialEligible;
      for (let i = 0; i < Math.min(misCount, pool.length); i++) nextSet.add(pool[i].idx);
    }
    return nextSet;
  }

  function setState(next) {
    const prev = state;
    const same = prev.mode === next.mode && prev.selectedOrbits === next.selectedOrbits &&
      prev.corrected === next.corrected && prev.screened === next.screened &&
      prev.fault === next.fault && prev.exactHighlight === next.exactHighlight;
    if (same) return;

    state = next;
    misSet = computeMisSet(next);

    // Trigger dramatic nonlinear wavefront transitions on meaningful state changes.
    if ((!prev.corrected && next.corrected) || (!prev.exactHighlight && next.exactHighlight)) {
      restoreWave = 0;
      transitionEnergy = 1;
    }
    if (!prev.screened && next.screened && !next.corrected) {
      screenWave = 0;
      transitionEnergy = 1;
    }
    if (!prev.fault && next.fault) {
      faultWave = 0;
      transitionEnergy = 1;
    }
    if (prev.mode === 'orbits' && next.mode !== 'orbits') {
      buildWave = 0;
      transitionEnergy = 1;
    }
    for (const p of points) {
      const nowSel = misSet.has(p.idx);
      if (nowSel && !p.wasSelected) {
        p.popAge = 0;
        transitionEnergy = 1;
      }
      p.wasSelected = nowSel;
    }
    transitionEnergy = Math.max(transitionEnergy, 0.85);
    motion.wake();
    if (motion.reduced) render(0, 0, 0, true);
  }

  function setReveal(value) {
    const clamped = dnaMotion.clamp01(value);
    if (Math.abs(clamped - reveal) < 0.002) return;
    reveal = clamped;
    transitionEnergy = Math.max(transitionEnergy, 0.5);
    motion.wake();
    if (motion.reduced) render(0, 0, 0, true);
  }

  function targetVisual(p, s, isSelected) {
    if (isSelected) {
      return {r: 168, g: 227, b: 202, a: 0.96, dotR: 2.05, radialScale: 1.0, haloA: 0.22};
    }
    if (p.group === 'invalid' && s.screened) {
      return {r: 112, g: 118, b: 130, a: 0.20, dotR: 1.05, radialScale: 0.94, haloA: 0};
    }
    if (p.group === 'restored') {
      if (s.screened && !s.corrected) {
        return {r: 237, g: 158, b: 145, a: 0.19, dotR: 1.1, radialScale: 0.92, haloA: 0};
      }
      if (s.corrected) {
        return {
          r: 152, g: 204, b: 255,
          a: s.exactHighlight ? 0.88 : 0.66,
          dotR: s.exactHighlight ? 1.75 : 1.5,
          radialScale: 1.0,
          haloA: s.exactHighlight ? 0.14 : 0
        };
      }
    }
    return {r: 138, g: 155, b: 232, a: 0.54, dotR: 1.45, radialScale: 1.0, haloA: 0};
  }

  function drawQuadraticPartial(ax, ay, qx, qy, bx, by, t) {
    if (t <= 0.005) return;
    if (t >= 0.995) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(qx, qy, bx, by);
      ctx.stroke();
      return;
    }
    // de Casteljau subdivision of quadratic Bézier at parameter t
    const x01 = ax + (qx - ax) * t;
    const y01 = ay + (qy - ay) * t;
    const x12 = qx + (bx - qx) * t;
    const y12 = qy + (by - qy) * t;
    const x012 = x01 + (x12 - x01) * t;
    const y012 = y01 + (y12 - y01) * t;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(x01, y01, x012, y012);
    ctx.stroke();
  }

  function quadPoint(ax, ay, qx, qy, bx, by, t) {
    const u = 1 - t;
    return [
      u * u * ax + 2 * u * t * qx + t * t * bx,
      u * u * ay + 2 * u * t * qy + t * t * by
    ];
  }

  function render(dt, idleDt, idleRate, reduced) {
    if (!width && !resize()) return false;

    // Advance ambient idle clocks (smoothly damped to 0 when inspecting).
    if (!reduced) {
      idleTime += idleDt;
      driftAngle += idleDt * 0.032;
      if (restoreWave < 1) restoreWave = Math.min(1, restoreWave + dt / 1.25);
      if (screenWave < 1) screenWave = Math.min(1, screenWave + dt / 0.95);
      if (faultWave < 1) faultWave = Math.min(1, faultWave + dt / 0.95);
      if (buildWave < 1) buildWave = Math.min(1, buildWave + dt / 1.05);
      hoverFade = dnaMotion.damp(hoverFade, hovered ? 1 : 0, dt, 0.12);
      if (Math.abs((hovered ? 1 : 0) - hoverFade) < 0.005) hoverFade = hovered ? 1 : 0;
    } else {
      restoreWave = 1;
      screenWave = 1;
      faultWave = 1;
      buildWave = 1;
      hoverFade = hovered ? 1 : 0;
    }

    // Smoothly interpolate all 1,588 dots toward their phase target with nonlinear wavefronts.
    let maxDelta = 0;
    const restoreFront = dnaMotion.easeOutExpo(restoreWave) * 1.12;
    const screenFront = dnaMotion.easeOutCubic(screenWave) * 1.15;
    for (const p of points) {
      const isSelected = misSet.has(p.idx);
      const tgt = targetVisual(p, state, isSelected);
      if (reduced) {
        p.r = tgt.r; p.g = tgt.g; p.b = tgt.b;
        p.a = tgt.a; p.dotR = tgt.dotR; p.radialScale = tgt.radialScale;
        p.haloA = tgt.haloA; p.popAge = 1;
      } else {
        // Gate restored/screened transitions behind the nonlinear wavefront
        let gate = 1;
        let burst = 0;
        if (restoreWave < 1 && p.group === 'restored' && state.corrected) {
          const dist = restoreFront - p.baseRadius;
          if (dist < 0) gate = 0.05;
          else {
            const localT = dnaMotion.clamp01(dist / 0.24);
            burst = Math.sin(localT * Math.PI);
            gate = dnaMotion.easeOutBack(localT, 1.4);
          }
        } else if (screenWave < 1 && p.group !== 'initial' && state.screened && !state.corrected) {
          const dist = screenFront - (1 - p.baseRadius);
          gate = dist < 0 ? 0.04 : 1;
        }
        const tau = gate < 0.2 ? 0.9 : 0.18;
        p.r = dnaMotion.damp(p.r, tgt.r + burst * 75, dt, tau);
        p.g = dnaMotion.damp(p.g, tgt.g + burst * 45, dt, tau);
        p.b = dnaMotion.damp(p.b, tgt.b + burst * 20, dt, tau);
        p.a = dnaMotion.damp(p.a, Math.min(1, tgt.a + burst * 0.3), dt, tau);
        p.dotR = dnaMotion.damp(p.dotR, tgt.dotR + burst * 1.75, dt, 0.15);
        p.radialScale = dnaMotion.damp(p.radialScale, tgt.radialScale + burst * 0.045, dt, 0.22);
        p.haloA = dnaMotion.damp(p.haloA, tgt.haloA + burst * 0.34, dt, 0.18);
        if (p.popAge < 1) {
          p.popAge = Math.min(1, p.popAge + dt / 0.58);
          maxDelta = Math.max(maxDelta, 1 - p.popAge);
        }
        maxDelta = Math.max(maxDelta, Math.abs(tgt.a - p.a), Math.abs(tgt.dotR - p.dotR));
      }
    }
    updateCoordinates(reduced ? 0 : idleRate);

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Subtle scientific polar coordinate grid (conflict degree rings).
    const rings = [
      {r: 0.94, label: 'deg 400'},
      {r: 0.62, label: 'deg 700'},
      {r: 0.30, label: 'deg 900'}
    ];

    ctx.strokeStyle = 'rgba(255,255,255,0.065)';
    ctx.lineWidth = 1;
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r * R, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * R * 0.96, cy - Math.sin(a) * R * 0.96);
      ctx.lineTo(cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R * 0.96);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(151,156,165,0.62)';
    ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.textAlign = 'left';
    for (const ring of rings) {
      ctx.fillText(ring.label, cx + 4, cy - ring.r * R + 11);
    }

    // Nonlinear shockwave rings for restoration (+16,772) or fault (reader error).
    if (!reduced && restoreWave < 1) {
      const p = dnaMotion.easeOutExpo(restoreWave);
      const ringR = Math.max(2, p * R * 1.04);
      const alpha = (1 - p) * 0.65;
      ctx.strokeStyle = `rgba(164,218,255,${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.2 * (1 - p * 0.55);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!reduced && faultWave < 1) {
      const p = dnaMotion.easeOutExpo(faultWave);
      const ringR = Math.max(2, p * R * 1.02);
      const alpha = (1 - p) * 0.62;
      ctx.strokeStyle = `rgba(237,150,136,${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.1 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ephemeral ambient pair-check filaments in standby/orbits mode (organic live graph feel).
    if (state.mode === 'orbits' && !reduced && idleRate > 0.02) {
      for (let k = 0; k < 5; k++) {
        const slot = Math.floor(idleTime * 0.42 + k * 1.7);
        const phase = (idleTime * 0.42 + k * 1.7) % 1;
        const c = chords[(slot * 11 + k * 7) % chords.length];
        const a = points[c.a], b = points[c.b];
        const env = Math.sin(phase * Math.PI) ** 1.6 * idleRate;
        const t = dnaMotion.easeInOutCubic(phase);
        ctx.strokeStyle = `rgba(148,168,238,${(0.18 * env).toFixed(3)})`;
        ctx.lineWidth = 0.85;
        drawQuadraticPartial(a.x, a.y, cx, cy, b.x, b.y, Math.min(1, t * 1.35));
        const [px, py] = quadPoint(a.x, a.y, cx, cy, b.x, b.y, t);
        ctx.fillStyle = `rgba(198,214,255,${(0.65 * env).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Conflict edges overlay with staggered Bézier sweep & ambient traveling sparks.
    if (state.mode !== 'orbits') {
      const progress = Math.min(reveal, buildWave);
      for (let i = 0; i < chords.length; i++) {
        const c = chords[i];
        const localT = dnaMotion.easeOutExpo((progress - c.stagger * 0.45) / 0.55);
        if (localT <= 0.01) continue;
        const a = points[c.a], b = points[c.b];
        if (state.fault && c.bad) {
          const pulse = reduced ? 1 : 0.78 + 0.22 * Math.sin(idleTime * 4.5 + i);
          ctx.strokeStyle = `rgba(237,164,152,${(0.48 * pulse).toFixed(3)})`;
          ctx.lineWidth = 1.15;
        } else {
          ctx.strokeStyle = state.mode === 'search' ? 'rgba(124,140,255,0.06)' : 'rgba(130,147,205,0.14)';
          ctx.lineWidth = 0.8;
        }
        drawQuadraticPartial(a.x, a.y, cx, cy, b.x, b.y, localT);

        // Traveling signal pulse along selected chords when idle.
        if (!reduced && idleRate > 0.05 && localT >= 0.98 && (i % 8 === 0 || (state.fault && c.bad && i % 3 === 0))) {
          const raw = (idleTime * c.pulseSpeed + c.pulsePhase) % 1;
          const pt = dnaMotion.easeInOutCubic(raw);
          const [px, py] = quadPoint(a.x, a.y, cx, cy, b.x, b.y, pt);
          const env = Math.sin(raw * Math.PI) * idleRate;
          ctx.fillStyle = state.fault && c.bad
            ? `rgba(255,190,178,${(0.75 * env).toFixed(3)})`
            : `rgba(176,192,255,${(0.48 * env).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, state.fault && c.bad ? 2.1 : 1.55, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw constellation dots (non-selected first) with organic starlight fade-in/fade-out.
    for (const p of points) {
      if (misSet.has(p.idx)) continue;
      let alpha = p.a;
      let dotRadius = p.dotR;
      let starHalo = p.haloA;
      if (!reduced && idleRate > 0.01) {
        const wave = 0.5 + 0.5 * Math.sin(idleTime * p.twinkleSpeed + p.twinklePhase);
        const star = wave * wave * (p.brightStar ? 1 : 0.85);
        // Smoothly dim down and bloom up like stars, easing back to 1.0x when idleRate -> 0.
        const alphaMul = 1 + ((0.38 + star * 1.08) - 1) * idleRate;
        const radMul = 1 + ((0.84 + star * 0.42) - 1) * idleRate;
        alpha = Math.min(1, p.a * alphaMul);
        dotRadius = p.dotR * radMul;
        if (p.brightStar && star > 0.52) {
          starHalo = Math.max(starHalo, (star - 0.52) * 0.48 * idleRate * Math.min(1, p.a * 1.4));
        }
      }
      if (starHalo > 0.015) {
        ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${starHalo.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw selected independent-set orbits on top with starlight breathing mint halos + pop overshoot.
    if (misSet.size > 0) {
      for (const p of points) {
        if (!misSet.has(p.idx)) continue;
        const pop = reduced ? 1 : dnaMotion.easeOutBack(p.popAge, 2.0);
        const wave = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(idleTime * (1.2 + p.twinkleSpeed * 0.55) + p.twinklePhase);
        const star = wave * wave;
        const haloR = (3.6 + star * 2.2 * idleRate) * Math.max(0.5, pop);
        const haloA = 0.14 + (0.04 + star * 0.22 - 0.14) * idleRate;
        const coreA = 1 + ((0.64 + star * 0.36) - 1) * idleRate;
        ctx.fillStyle = `rgba(158,214,190,${Math.max(0.05, haloA).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced && p.popAge < 1) {
          ctx.strokeStyle = `rgba(184,238,214,${((1 - p.popAge) * 0.7).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2 + dnaMotion.easeOutExpo(p.popAge) * 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(180,237,212,${coreA.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.2, (1.82 + star * 0.38 * idleRate) * pop), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hover callout with smooth spring reticle.
    if (hovered && hoverFade > 0.01) {
      ctx.save();
      ctx.globalAlpha = hoverFade;
      const ringR = 5.2 + (1 - hoverFade) * 6;
      ctx.strokeStyle = '#f7f8f8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(hovered.x, hovered.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      const status = misSet.has(hovered.idx) ? text('独立集已选','Selected in IS') :
        hovered.group === 'restored' && state.screened && !state.corrected ? text('误筛剔除','Dropped by old filter') :
        hovered.group === 'restored' && state.corrected ? text('按位修正恢复','Restored (+16,772)') :
        hovered.group === 'invalid' && state.screened ? text('轨道内距 < 4','Within-orbit d < 4') :
        text('可用闭合轨道','Valid closed orbit');
      const label = `deg ≈ ${Math.round(hovered.deg)} · ${status}`;
      ctx.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
      const tw = ctx.measureText(label).width + 14;
      const bx = Math.max(6, Math.min(width - tw - 6, hovered.x + 10));
      const by = Math.max(6, hovered.y - 26);
      ctx.fillStyle = 'rgba(13,14,18,0.92)';
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f7f8f8';
      ctx.fillText(label, bx + 7, by + 13.5);
      ctx.restore();
    }
    ctx.restore();

    const activeTransitions = restoreWave < 1 || screenWave < 1 || faultWave < 1 || buildWave < 1 ||
      maxDelta > 0.008 || (hovered && hoverFade < 0.99) || (!hovered && hoverFade > 0.01);
    if (!activeTransitions) transitionEnergy = 0;
    return activeTransitions;
  }

  const motion = dnaMotion.createLoop(canvas, render);

  function draw() {
    if (resize()) render(0, 0, 0, motion.reduced);
    motion.sync();
  }

  canvas.addEventListener('pointermove', event => {
    if (!width) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = null, bestDist = 169;
    for (const p of points) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (best !== hovered) {
      hovered = best;
      motion.wake();
      if (motion.reduced) render(0, 0, 0, true);
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (hovered) {
      hovered = null;
      motion.wake();
      if (motion.reduced) render(0, 0, 0, true);
    }
  });
  new ResizeObserver(() => {
    if (resize()) {
      motion.sync();
      if (motion.reduced) render(0, 0, 0, true);
    }
  }).observe(canvas);
  return {setState, setReveal, draw};
}

function createDnaDistanceMatrix(canvas, text, onInspect) {
  const ctx = canvas.getContext('2d');
  const allWords = dnaCertificateText.trim().split('\n');
  const N = 32;
  const baseSample = Array.from({length: N}, (_, i) => allWords[Math.floor(i * allWords.length / N)]);
  const hamming = (a, b) => {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  };
  const rgbFor = (d, isConflict) => {
    if (d === 0) return [17, 19, 25];
    if (d < 4) return isConflict ? [229, 123, 104] : [201, 104, 87];
    if (d === 4) return [103, 191, 162];
    if (d === 5) return [81, 115, 184];
    if (d === 6) return [63, 87, 146];
    if (d === 7) return [48, 65, 112];
    if (d === 8) return [37, 49, 84];
    return [28, 36, 61];
  };

  let words = baseSample.slice();
  let distances = [];
  let fromColors = [];
  let toColors = [];
  const cellPhase = Array.from({length: N}, (_, i) =>
    Array.from({length: N}, (_, j) => ((i * 37 + j * 17 + i * j * 7) % 628) / 100));
  let conflictPair = false;
  let lastPairKey = '';
  let hovered = null;
  let hoverFade = 0;
  let size = 0, padX = 0, padY = 0, cell = 0;

  // Nonlinear transition & ambient idle clocks
  let morph = 1;
  let conflictRipple = 1;
  let idleTime = 0;

  function recompute(animate) {
    const nextDist = Array.from({length: N}, (_, i) =>
      Array.from({length: N}, (_, j) => (i === j ? 0 : hamming(words[i], words[j]))));
    const nextColors = Array.from({length: N}, (_, i) =>
      Array.from({length: N}, (_, j) => rgbFor(nextDist[i][j], conflictPair && ((i === 0 && j === 1) || (i === 1 && j === 0)))));
    fromColors = toColors.length ? toColors : nextColors;
    toColors = nextColors;
    distances = nextDist;
    morph = animate ? 0 : 1;
    if (animate && conflictPair) conflictRipple = 0;
  }
  recompute(false);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = Math.floor(Math.min(rect.width, rect.height));
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    padX = Math.floor((rect.width - size) / 2);
    padY = Math.floor((rect.height - size) / 2);
    cell = size / N;
    return true;
  }

  function setPair(pair, isConflict) {
    const key = (pair ? pair.join('/') : '') + '|' + Boolean(isConflict);
    if (key === lastPairKey) return;
    const animate = lastPairKey !== '';
    lastPairKey = key;
    words = baseSample.slice();
    if (pair && pair.length === 2) {
      words[0] = pair[0];
      words[1] = pair[1];
    }
    conflictPair = Boolean(isConflict);
    recompute(animate);
    motion.wake();
    if (motion.reduced) render(0, 0, 0, true);
  }

  function render(dt, idleDt, idleRate, reduced) {
    if (!size && !resize()) return false;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!reduced) {
      idleTime += idleDt;
      if (morph < 1) morph = Math.min(1, morph + dt / 0.82);
      if (conflictRipple < 1) conflictRipple = Math.min(1, conflictRipple + dt / 1.15);
      hoverFade = dnaMotion.damp(hoverFade, hovered ? 1 : 0, dt, 0.11);
      if (Math.abs((hovered ? 1 : 0) - hoverFade) < 0.005) hoverFade = hovered ? 1 : 0;
    } else {
      morph = 1;
      conflictRipple = 1;
      hoverFade = hovered ? 1 : 0;
    }

    const maxDiag = 2 * (N - 1);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const diag = (i + j) / maxDiag;
        const localT = reduced || morph >= 1 ? 1 : dnaMotion.clamp01((morph - diag * 0.42) / 0.58);
        const eased = dnaMotion.easeOutCubic(localT);
        const fc = fromColors[i][j], tc = toColors[i][j];
        let r = fc[0] + (tc[0] - fc[0]) * eased;
        let g = fc[1] + (tc[1] - fc[1]) * eased;
        let b = fc[2] + (tc[2] - fc[2]) * eased;

        let waveScale = 1;
        if (!reduced && idleRate > 0.01 && i !== j) {
          const d = distances[i][j];
          // Gentle intersecting 2D wave modulates cell size subtly like soft ripples.
          const w1 = Math.sin((i * 0.24 + j * 0.19) - idleTime * 1.45);
          const w2 = Math.sin((i * 0.15 - j * 0.22) + idleTime * 0.92);
          const ripple = w1 * 0.68 + w2 * 0.32;
          waveScale = 1 + (ripple * 0.11 - 0.04) * idleRate;
          const lift = ripple * (d === 4 ? 10 : d < 4 ? 12 : 5.5) * idleRate;
          r += lift * 0.78;
          g += lift;
          b += lift * 0.95;
        }

        // Nonlinear scale pop during diagonal transition combined with gentle idle size ripple.
        const popScale = reduced || morph >= 1 ? waveScale : (0.72 + 0.28 * dnaMotion.easeOutBack(localT, 1.35)) * waveScale;
        const baseW = Math.max(1, cell - 1);
        const w = Math.max(1, Math.min(cell - 0.35, baseW * popScale));
        const cxCell = padX + j * cell + cell * 0.5;
        const cyCell = padY + i * cell + cell * 0.5;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r)) | 0},${Math.max(0, Math.min(255, g)) | 0},${Math.max(0, Math.min(255, b)) | 0})`;
        ctx.fillRect(cxCell - w * 0.5, cyCell - w * 0.5, w, w);
      }
    }

    // Expanding warm alert ripple around cell (0,1) when a d=3 conflict occurs.
    if (!reduced && conflictPair && conflictRipple < 1) {
      const p = dnaMotion.easeOutExpo(conflictRipple);
      const rx = padX + 1.5 * cell;
      const ry = padY + 0.5 * cell;
      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, padY, size, size);
      ctx.clip();
      ctx.strokeStyle = `rgba(255,184,170,${((1 - p) * 0.85).toFixed(3)})`;
      ctx.lineWidth = 2.2 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(rx, ry, cell * 0.6 + p * size * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle crosshair on hover (smoothly faded).
    if (hovered && hoverFade > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${(0.075 * hoverFade).toFixed(3)})`;
      ctx.fillRect(padX, padY + hovered.i * cell, size, cell);
      ctx.fillRect(padX + hovered.j * cell, padY, cell, size);
    }

    // Breathing focus reticle on active anchored pair (0,1) or hovered cell.
    const focus = hovered ?? {i: 0, j: 1};
    const fd = distances[focus.i][focus.j];
    const isActiveConflict = fd > 0 && fd < 4;
    const pulse = reduced || hovered ? 0.5 : 0.5 + 0.5 * Math.sin(idleTime * (isActiveConflict ? 4.4 : 2.3));
    const expand = hovered ? 0 : pulse * 2.2 * idleRate;

    if (!hovered && idleRate > 0.02) {
      ctx.strokeStyle = isActiveConflict
        ? `rgba(255,176,162,${(0.22 + 0.36 * pulse) * idleRate})`
        : `rgba(184,230,210,${(0.14 + 0.24 * pulse) * idleRate})`;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(
        padX + focus.j * cell - expand,
        padY + focus.i * cell - expand,
        cell + expand * 2,
        cell + expand * 2
      );
      // Faint mirror hint on symmetric cell (1,0)
      ctx.strokeStyle = isActiveConflict
        ? `rgba(255,176,162,${(0.24 * idleRate).toFixed(3)})`
        : `rgba(247,248,248,${(0.18 * idleRate).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(padX + focus.i * cell + 0.5, padY + focus.j * cell + 0.5, cell - 1, cell - 1);
    }

    ctx.strokeStyle = isActiveConflict ? '#ffb8aa' : '#f7f8f8';
    ctx.lineWidth = 1.65;
    ctx.strokeRect(padX + focus.j * cell + 0.5, padY + focus.i * cell + 0.5, cell - 1, cell - 1);

    return morph < 1 || conflictRipple < 1 || (hovered && hoverFade < 0.99) || (!hovered && hoverFade > 0.01);
  }

  const motion = dnaMotion.createLoop(canvas, render);

  function draw() {
    if (resize()) render(0, 0, 0, motion.reduced);
    motion.sync();
  }

  function cellAt(event) {
    if (!size) return null;
    const rect = canvas.getBoundingClientRect();
    const j = Math.floor((event.clientX - rect.left - padX) / cell);
    const i = Math.floor((event.clientY - rect.top - padY) / cell);
    if (i < 0 || j < 0 || i >= N || j >= N || i === j) return null;
    return {i, j};
  }

  canvas.addEventListener('pointermove', event => {
    const next = cellAt(event);
    if (next?.i === hovered?.i && next?.j === hovered?.j) return;
    hovered = next;
    motion.wake();
    if (motion.reduced) render(0, 0, 0, true);
    if (hovered) {
      onInspect?.({
        pair: [words[hovered.i], words[hovered.j]],
        distance: distances[hovered.i][hovered.j],
        i: hovered.i,
        j: hovered.j
      });
    } else {
      onInspect?.(null);
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!hovered) return;
    hovered = null;
    motion.wake();
    if (motion.reduced) render(0, 0, 0, true);
    onInspect?.(null);
  });
  new ResizeObserver(() => {
    if (resize()) {
      motion.sync();
      if (motion.reduced) render(0, 0, 0, true);
    }
  }).observe(canvas);
  return {setPair, draw};
}

function renderDnaQuartet(container, word, text, showBug) {
  const cacheKey = `${word}|${Boolean(showBug)}|${document.documentElement.lang}`;
  if (container.dataset.quartetKey === cacheKey) return;
  container.dataset.quartetKey = cacheKey;

  const compMap = {A: 'T', T: 'A', C: 'G', G: 'C'};
  const rev = s => [...s].reverse().join('');
  const comp = s => [...s].map(c => compMap[c]).join('');
  const members = [
    {tag: 'w', label: text('原码字', 'word'), seq: word},
    {tag: 'rev', label: text('反向', 'reverse'), seq: rev(word)},
    {tag: 'comp', label: text('互补', 'complement'), seq: comp(word)},
    {tag: 'rc', label: text('反向互补', 'rev-comp'), seq: rev(comp(word))}
  ];
  const hamming = (a, b) => [...a].reduce((n, ch, i) => n + Number(ch !== b[i]), 0);
  const encode = s => [...s].reduce((acc, ch, i) => acc | ('ACGT'.indexOf(ch) << (2 * i)), 0);
  const popcount = n => { let c = 0; while (n) { n &= n - 1; c++; } return c; };
  const trueD = hamming(members[0].seq, members[1].seq);
  const bugD = Math.floor(popcount(encode(members[0].seq) ^ encode(members[1].seq)) / 2);

  const list = document.createElement('div');
  list.className = 'quartet-list';
  members.forEach((m, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'quartet-row';
    row.style.setProperty('--row-i', rowIndex);
    const tag = document.createElement('span');
    tag.className = 'quartet-tag';
    tag.textContent = m.tag;
    tag.title = m.label;
    const bases = document.createElement('div');
    bases.className = 'quartet-bases';
    [...m.seq].forEach((ch, baseIndex) => {
      const b = document.createElement('i');
      b.dataset.base = ch;
      b.style.setProperty('--base-i', baseIndex);
      if (showBug && (rowIndex === 0 || rowIndex === 1) && members[0].seq[baseIndex] !== members[1].seq[baseIndex]) {
        b.dataset.diff = 'true';
      }
      b.textContent = ch;
      bases.append(b);
    });
    const meta = document.createElement('small');
    const d = m.tag === 'w' ? 'GC 5/10' : 'd=' + hamming(members[0].seq, m.seq);
    meta.textContent = d;
    if (showBug && rowIndex === 1) meta.dataset.highlight = 'true';
    row.append(tag, bases, meta);
    list.append(row);
  });
  const foot = document.createElement('p');
  foot.className = 'quartet-note';
  if (showBug) foot.dataset.bug = 'true';
  foot.textContent = showBug ?
    text(`w 与 rev 实际相差 ${trueD} 位（有效）；旧代码 popcount/2 误算为 ${bugD} 位而丢弃。`,
      `w vs rev differs in ${trueD} positions (valid); popcount/2 miscounted ${bugD} and dropped it.`) :
    text('同一轨道 4 个码字整体入选或排除，天然满足反向与互补闭合。',
      'All four words enter or leave together, guaranteeing reversal & complement closure.');
  container.replaceChildren(list, foot);
}
