(() => {
  'use strict';

  // Homepage loop, with illustrative data (not a recorded run).
  // The AI is a living swarm. Each round it sends one light per open slot of the
  // target into G, a sealed frame. G sweeps over the frame: lights on a slot stay,
  // join their neighbours and draw part of the figure; lights off target turn
  // amber and fly back to the AI as feedback. The AI tries again with what came
  // back, until the figure is complete. Motion is driven by damped springs, so
  // every arrival overshoots and settles instead of following a fixed curve.

  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Share of the target that is right after each round.
  const ROUNDS = [.34, .58, .79, .92, 1];
  const THINK = 1200, EMIT = 560, FLY = 1050, CHECK = 1250, BACK = 1000;

  const canvas = $('loop-field');
  const ctx = canvas && canvas.getContext('2d');
  const loop = $('system');
  if (!ctx) return;
  let W = 0, H = 0, dpr = 1, vertical = false;
  let ai = { x: 0, y: 0, r: 0 }, g = { x: 0, y: 0, s: 0 };
  let swarm = [], slots = [], packets = [];
  let tilt = { x: 0, y: 0 }, tiltGoal = { x: 0, y: 0 };

  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lerp = (a, b, k) => a + (b - a) * k;
  const inOutCubic = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const inOutQuart = k => k < .5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2;
  const outExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);

  // ---------- Springs ----------
  // Under-damped by default: critical damping would be c = 2 * sqrt(k).
  const spring = (x, k, c) => ({ x, v: 0, to: x, k, c });
  function stepSpring(s, f) {
    const n = Math.max(1, Math.ceil(f)), h = f / n;
    for (let i = 0; i < n; i++) { s.v += ((s.to - s.x) * s.k - s.v * s.c) * h; s.x += s.v * h; }
  }
  const breath = spring(1, .05, .2);      // swarm scale
  const excite = spring(0, .03, .3);      // how hard the AI is thinking
  const glow = spring(0, .06, .35);       // swarm brightness
  const frameS = spring(1, .07, .16);     // G's frame scale
  const score = spring(0, .07, .5);       // the number under G

  // ---------- Glow sprites ----------
  // Every light is a pre-rendered soft sprite drawn additively, so the scene reads
  // as light rather than as flat dots.
  const sprites = new Map();
  function sprite(r, gg, b) {
    const key = `${r | 0},${gg | 0},${b | 0}`;
    let s = sprites.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = 64;
    const c = s.getContext('2d');
    const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(.1, `rgba(${key},1)`);
    grad.addColorStop(.28, `rgba(${key},.32)`);
    grad.addColorStop(.6, `rgba(${key},.06)`);
    grad.addColorStop(1, `rgba(${key},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    sprites.set(key, s);
    return s;
  }
  const quant = (c, steps = 8) => c.map(v => Math.round(v / steps) * steps);
  const mixRgb = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const NEAR = [196, 236, 255], FAR = [88, 92, 214];
  const DEPTH = Array.from({ length: 8 }, (_, i) => sprite(...quant(mixRgb(FAR, NEAR, i / 7))));
  const C_FLY = [168, 182, 255], C_OK = [236, 242, 255], C_BAD = [255, 178, 92], C_GREEN = [120, 240, 170], C_HOME = [140, 152, 255];

  // ---------- Target ----------
  // A sealed emblem in units of the frame: an outer ring, a five-lobed rose and
  // a small inner ring. Each slot knows its neighbour on the same contour, so
  // locked slots can be joined into lines.
  // The figure is a generic neural network: three layers of nodes (small rings)
  // joined by straight connections. Nothing in it is anyone's logo.
  const NODE_R = .045;
  const LAYERS = [[-.33, [-.24, 0, .24]], [0, [-.33, -.11, .11, .33]], [.33, [-.13, .13]]]
    .map(([u, vs]) => vs.map(v => ({ u, v })));
  const SLOT_UNITS = [];
  const GHOST = [];
  function chain(points, closed) {
    const base = SLOT_UNITS.length;
    points.forEach(([u, v], i) => {
      const last = i === points.length - 1;
      SLOT_UNITS.push({ u, v, next: last ? (closed ? base : -1) : base + i + 1 });
    });
    GHOST.push(closed ? [...points, points[0]] : points);
  }
  LAYERS.flat().forEach(n => {
    chain(Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return [n.u + Math.cos(a) * NODE_R, n.v + Math.sin(a) * NODE_R]; }), true);
  });
  for (let l = 0; l < LAYERS.length - 1; l++) {
    LAYERS[l].forEach(a => LAYERS[l + 1].forEach(b => {
      const du = b.u - a.u, dv = b.v - a.v, len = Math.hypot(du, dv);
      const ux = du / len, uy = dv / len, span = len - NODE_R * 2.6;
      const steps = 4;
      chain(Array.from({ length: steps + 1 }, (_, i) => {
        const d = NODE_R * 1.3 + span * i / steps;
        return [a.u + ux * d, a.v + uy * d];
      }), false);
    }));
  }
  // The order in which slots come right, fixed so every run tells the same story.
  const ORDER = (() => {
    const idx = SLOT_UNITS.map((_, i) => i);
    let s = 5;
    const r = () => (s = (s * 48271) % 2147483647) / 2147483647;
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const rank = [];
    idx.forEach((slot, k) => { rank[slot] = k; });
    return rank;
  })();

  function layout() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vertical = W < 640;
    if (vertical) {
      ai = { x: W / 2, y: H * .27, r: Math.min(W * .19, 76) };
      g = { x: W / 2, y: H * .66, s: Math.min(W * .66, 240) };
    } else {
      ai = { x: W * .27, y: H * .48, r: Math.min(H * .17, 92) };
      g = { x: W * .73, y: H * .48, s: Math.min(H * .52, W * .27, 290) };
    }
    slots = SLOT_UNITS.map(p => ({ x: g.x + p.u * g.s, y: g.y + p.v * g.s, next: p.next }));
    const want = vertical ? 600 : 880;
    if (swarm.length !== want) buildSwarm(want);
    const tagAi = $('loop-ai'), tagG = $('loop-g');
    tagAi.style.left = `${ai.x}px`; tagAi.style.top = `${ai.y + ai.r + 34}px`;
    tagG.style.left = `${g.x}px`; tagG.style.top = `${g.y + g.s / 2 + 22}px`;
  }

  function buildSwarm(count) {
    seed = 11;
    const ring = Math.round(count * .08);
    swarm = Array.from({ length: count }, (_, i) => {
      if (i < ring) {
        // A thin tilted orbit of beads around the body.
        return { orbit: true, a: i / ring * Math.PI * 2, rr: 1.32 + rand() * .06, sp: .00024 + rand() * .00005, s: .5 + rand() * .7, n: rand() * 6.28 };
      }
      const k = i - ring, m = count - ring;
      const y = 1 - (k + .5) / m * 2, rr = Math.sqrt(1 - y * y), a = k * 2.399963;
      return { x: Math.cos(a) * rr, y, z: Math.sin(a) * rr, n: rand() * Math.PI * 2, s: .6 + rand() * .9 };
    });
  }

  // Curved wires: the submission arcs one way, the feedback the other.
  function curve(a, b, bend) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const k = len * bend;
    return { x: (a.x + b.x) / 2 + dy / len * k, y: (a.y + b.y) / 2 - dx / len * k };
  }
  const bez = (a, c, b, u) => ({ x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
  const outAnchor = () => vertical ? { x: ai.x, y: ai.y + ai.r * 1.1 } : { x: ai.x + ai.r * 1.1, y: ai.y };
  const inAnchor = () => vertical ? { x: g.x, y: g.y - g.s / 2 } : { x: g.x - g.s / 2, y: g.y };

  // ---------- Schedule ----------
  let clock = 0, events = [];
  let scan = null, passed = 0, passedAt = -1e9;
  let shown = -1;
  const dots = $('loop-dots');

  function at(t, fn) { events.push([t, fn]); }
  function stepOn(name) {
    document.querySelectorAll('#loop-steps li').forEach(li => li.classList.toggle('is-on', li.dataset.step === name));
  }

  function cycle() {
    clock = 0; events = []; packets = []; scan = null; passed = 0;
    loop.classList.remove('is-passed');
    dots.textContent = '';
    stepOn(null);
    let t = 600;
    ROUNDS.forEach((share, i) => {
      const goal = Math.round(share * slots.length);
      at(t, () => { excite.to = 1; stepOn(null); });
      t += i === 0 ? THINK + 300 : THINK;
      at(t, now => { excite.to = .3; stepOn('submit'); submit(goal, now); });
      t += EMIT + FLY + 260;
      at(t, now => { excite.to = 0; stepOn('check'); scan = { start: now }; packets.forEach(p => { p.judged = p.state === 'ok'; }); });
      t += CHECK;
      if (share < 1) {
        at(t, now => { scan = null; stepOn('feedback'); sendBack(now); });
        at(t + 380 + BACK, () => { const dot = document.createElement('i'); dots.append(dot); });
        t += 380 + BACK + 250;
      } else {
        at(t, now => {
          scan = null; passed = 1; passedAt = now;
          frameS.v += .028;
          loop.classList.add('is-passed');
          stepOn(null);
          const dot = document.createElement('i'); dot.className = 'ok'; dots.append(dot);
        });
        t += 4400;
        at(t, now => { goHome(now); loop.classList.remove('is-passed'); passed = 0; });
        t += 2000;
        at(t, cycle);
      }
    });
    events.sort((a, b) => a[0] - b[0]);
  }

  const newPacket = (slot, from) => ({ slot, right: false, off: { x: 0, y: 0 }, state: 'fly', judged: false, from, t0: 0, dur: 0, bend: 0, jit: rand() * 6.28, x: from.x, y: from.y, vx: 0, vy: 0, hot: 0, trail: [] });

  function submit(goal, t) {
    // The AI recoils as it lets go.
    breath.v -= .022;
    glow.v += .02;
    let k = 0;
    slots.forEach((_, slot) => {
      if (packets.some(p => p.slot === slot && p.state === 'ok')) return;
      const a = (rand() - .5) * 1.3 + (vertical ? Math.PI / 2 : 0);
      const from = { x: ai.x + Math.cos(a) * ai.r * .85, y: ai.y + Math.sin(a) * ai.r * .85 };
      packets = packets.filter(p => p.slot !== slot);
      const p = newPacket(slot, from);
      p.right = ORDER[slot] < goal;
      if (!p.right) { const b = rand() * Math.PI * 2, d = g.s * (.045 + rand() * .05); p.off = { x: Math.cos(b) * d, y: Math.sin(b) * d }; }
      p.t0 = t + (k++ / slots.length) * EMIT * 1.7 + rand() * 140;
      p.dur = FLY * (.8 + rand() * .4);
      p.bend = .14 + rand() * .14;
      packets.push(p);
    });
  }

  function sendBack(t) {
    let k = 0;
    packets.forEach(p => {
      if (p.state !== 'bad') return;
      p.state = 'back';
      p.from = null;
      p.t0 = t + 380 + (k++) * 10 + rand() * 140;
      p.dur = BACK * (.8 + rand() * .4);
    });
  }

  function goHome(t) {
    packets.forEach((p, k) => {
      p.state = 'home';
      p.from = null;
      p.t0 = t + (k % 24) * 24 + rand() * 220;
      p.dur = 1150 + rand() * 350;
    });
  }

  // ---------- Simulation ----------
  function settle(p, f, dest, stiff, damp) {
    const n = Math.max(1, Math.ceil(f)), h = f / n;
    for (let i = 0; i < n; i++) {
      p.vx += ((dest.x - p.x) * stiff - p.vx * damp) * h;
      p.vy += ((dest.y - p.y) * stiff - p.vy * damp) * h;
      p.x += p.vx * h; p.y += p.vy * h;
    }
  }

  function update(dt) {
    const t = clock;
    const f = Math.min(dt / 16.67, 3);
    [breath, excite, glow, frameS, score].forEach(s => stepSpring(s, f));
    breath.to = 1 - excite.x * .06;
    glow.to = excite.x * .5;
    tilt.x += (tiltGoal.x - tilt.x) * Math.min(.035 * f, 1);
    tilt.y += (tiltGoal.y - tilt.y) * Math.min(.035 * f, 1);
    const scanY = scan ? g.y - g.s / 2 - 8 + (g.s + 16) * inOutCubic(Math.min((t - scan.start) / CHECK, 1)) : -1e9;
    const home = { x: ai.x, y: ai.y };
    let locked = 0;
    for (const p of packets) {
      const px = p.x, py = p.y;
      const slot = slots[p.slot];
      const dest = { x: slot.x + p.off.x, y: slot.y + p.off.y };
      if (p.state === 'fly') {
        const k = (t - p.t0) / p.dur;
        if (k < 0) { p.x = p.from.x; p.y = p.from.y; p.trail.length = 0; continue; }
        if (k >= 1) {
          // Arrive carrying the flight's momentum, then let a spring settle it.
          p.state = 'land';
        } else {
          const q = bez(p.from, curve(p.from, dest, p.bend), dest, inOutQuart(k));
          p.vx = (q.x - p.x) / f; p.vy = (q.y - p.y) / f;
          p.x = q.x; p.y = q.y;
        }
      } else if ((p.state === 'back' || p.state === 'home') && t >= p.t0) {
        if (!p.from) p.from = { x: p.x, y: p.y };
        const k = (t - p.t0) / p.dur;
        if (k >= 1) {
          p.state = 'gone';
          breath.v += .0016; glow.v += .012;
          continue;
        }
        const q = bez(p.from, curve(p.from, home, -p.bend), home, inOutCubic(k));
        p.vx = (q.x - p.x) / f; p.vy = (q.y - p.y) / f;
        p.x = q.x; p.y = q.y;
      } else {
        // On the frame: right ones sit still, wrong ones hover uneasily.
        const uneasy = p.state === 'bad' || p.state === 'back';
        const wob = uneasy ? 2.2 : p.state === 'land' ? .8 : .3;
        const target = { x: dest.x + Math.cos(t * .0042 + p.jit) * wob, y: dest.y + Math.sin(t * .0035 + p.jit * 1.3) * wob };
        settle(p, f, target, uneasy ? .045 : .085, uneasy ? .16 : .22);
        if (scan && !p.judged && p.y <= scanY) {
          p.judged = true;
          p.hot = 1;
          if (p.right) p.state = 'ok';
          else { p.state = 'bad'; const b = rand() * 6.28; p.vx += Math.cos(b) * 2.6; p.vy += Math.sin(b) * 2.6; }
        }
      }
      if (p.state === 'ok') locked++;
      p.hot *= Math.pow(.955, f);
      // Trail: the last few positions, shrinking once the light is still.
      const moved = Math.hypot(p.x - px, p.y - py);
      if (moved > .25) { p.trail.unshift(px, py); if (p.trail.length > 24) p.trail.length = 24; }
      else if (p.trail.length) p.trail.length = Math.max(0, p.trail.length - 4);
    }
    packets = packets.filter(p => p.state !== 'gone');
    score.to = locked / slots.length * 100;
    const pct = Math.max(0, Math.min(100, Math.round(score.x)));
    if (pct !== shown) { shown = pct; $('loop-score').textContent = pct; }
  }

  // ---------- Drawing ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function drawWires(t) {
    const a = outAnchor(), b = inAnchor();
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 8]);
    [[a, b, .2, 1, 'rgba(154,166,255,.18)'], [b, a, .2, -1, 'rgba(255,178,92,.1)']].forEach(([p, q, bend, dir, color]) => {
      const c = curve(p, q, bend);
      ctx.lineDashOffset = -t * .014 * dir;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(c.x, c.y, q.x, q.y); ctx.stroke();
    });
    ctx.restore();
  }

  function drawFrame(t) {
    const since = t - passedAt;
    const ok = passed ? outExpo(Math.min(since / 900, 1)) : 0;
    const s = g.s * frameS.x, x = g.x - s / 2, y = g.y - s / 2, r = s * .16;
    // Glass body with a soft inner light.
    const body = ctx.createLinearGradient(x, y, x + s * .6, y + s);
    body.addColorStop(0, 'rgba(255,255,255,.05)');
    body.addColorStop(.55, 'rgba(255,255,255,.012)');
    body.addColorStop(1, 'rgba(255,255,255,.025)');
    roundRect(x, y, s, s, r);
    ctx.fillStyle = body; ctx.fill();
    const inner = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, s * .6);
    inner.addColorStop(0, ok ? `rgba(110,232,160,${.06 * ok})` : `rgba(124,140,255,${scan ? .06 : .03})`);
    inner.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = inner; ctx.fill();
    // Edge.
    ctx.lineWidth = 1;
    ctx.strokeStyle = ok ? `rgba(120,240,170,${.2 + ok * .4})` : `rgba(210,216,255,${scan ? .22 : .1})`;
    ctx.stroke();
    // Specular line along the top edge.
    const spec = ctx.createLinearGradient(x, 0, x + s, 0);
    spec.addColorStop(0, 'rgba(255,255,255,0)');
    spec.addColorStop(.5, 'rgba(255,255,255,.28)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = spec;
    ctx.beginPath(); ctx.moveTo(x + r, y + .5); ctx.lineTo(x + s - r, y + .5); ctx.stroke();
    // A slow light travels around the sealed edge.
    ctx.save();
    roundRect(x, y, s, s, r);
    ctx.setLineDash([s * .35, s * 3.65]);
    ctx.lineDashOffset = -((t * .00009) % 1) * s * 4;
    ctx.strokeStyle = ok ? 'rgba(160,255,200,.5)' : 'rgba(255,255,255,.26)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    // The accept rings out, fast then slow.
    if (passed) {
      [0, 220, 440].forEach(lag => {
        const k = (since - lag) / 1700;
        if (k < 0 || k > 1) return;
        const grow = outExpo(k) * g.s * .2;
        roundRect(x - grow, y - grow, s + grow * 2, s + grow * 2, r + grow * .8);
        ctx.strokeStyle = `rgba(120,240,170,${(1 - k) * (1 - k) * .55})`; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  }

  function drawTarget(t) {
    // The ghost of the figure: what G expects, faintly visible.
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(200,208,255,.05)';
    ctx.beginPath();
    LAYERS.flat().forEach(n => {
      ctx.moveTo(g.x + (n.u + NODE_R) * g.s, g.y + n.v * g.s);
      ctx.arc(g.x + n.u * g.s, g.y + n.v * g.s, NODE_R * g.s, 0, Math.PI * 2);
    });
    GHOST.slice(LAYERS.flat().length).forEach(line => {
      line.forEach(([u, v], i) => i ? ctx.lineTo(g.x + u * g.s, g.y + v * g.s) : ctx.moveTo(g.x + u * g.s, g.y + v * g.s));
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,226,255,.13)';
    for (const p of slots) { ctx.beginPath(); ctx.arc(p.x, p.y, .9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    // Locked lights join their locked neighbours, so the figure draws itself.
    const at = [];
    for (const p of packets) if (p.state === 'ok') at[p.slot] = p;
    const ok = passed ? outExpo(Math.min((t - passedAt) / 900, 1)) : 0;
    const [r, gg, b] = mixRgb(C_OK, C_GREEN, ok);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    [[5, .05 + ok * .07], [1.1, .5 + ok * .3]].forEach(([width, alpha]) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = `rgba(${r | 0},${gg | 0},${b | 0},${alpha})`;
      ctx.beginPath();
      at.forEach((p, slot) => {
        const q = p && at[slots[slot].next];
        if (!q) return;
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    });
    ctx.restore();

    // The check: a band of light sweeps down the frame.
    if (scan) {
      const k = inOutCubic(Math.min((t - scan.start) / CHECK, 1));
      const x = g.x - g.s / 2, y = g.y - g.s / 2, s = g.s;
      const sy = y - 8 + (s + 16) * k;
      ctx.save();
      roundRect(x, y, s, s, s * .16); ctx.clip();
      const band = ctx.createLinearGradient(0, sy - 90, 0, sy);
      band.addColorStop(0, 'rgba(154,166,255,0)');
      band.addColorStop(1, 'rgba(154,166,255,.13)');
      ctx.fillStyle = band; ctx.fillRect(x, sy - 90, s, 90);
      const line = ctx.createLinearGradient(x, 0, x + s, 0);
      line.addColorStop(0, 'rgba(230,236,255,0)');
      line.addColorStop(.5, 'rgba(240,244,255,.85)');
      line.addColorStop(1, 'rgba(230,236,255,0)');
      ctx.fillStyle = line; ctx.fillRect(x, sy - .5, s, 1);
      ctx.restore();
    }
  }

  function drawSwarm(t) {
    const R = ai.r * breath.x;
    const spin = t * .00018 + excite.x * Math.sin(t * .0007) * .4;
    const ay = spin + tilt.x * .45, ax = .36 + tilt.y * .35 + Math.sin(t * .00037) * .07;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const lit = .8 + glow.x;
    // Soft core light that breathes with the body.
    const core = ctx.createRadialGradient(ai.x, ai.y, 0, ai.x, ai.y, R * 1.9);
    core.addColorStop(0, `rgba(124,140,255,${.13 + glow.x * .2})`);
    core.addColorStop(.45, `rgba(110,120,255,${.035 + glow.x * .04})`);
    core.addColorStop(1, 'rgba(124,140,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(ai.x - R * 2, ai.y - R * 2, R * 4, R * 4);
    const ORBIT_TILT = 1.15, oc = Math.cos(ORBIT_TILT), os = Math.sin(ORBIT_TILT);
    for (const p of swarm) {
      let x, y, z;
      if (p.orbit) {
        const a = p.a + t * p.sp * (1 + excite.x * 2.5);
        const ox = Math.cos(a) * p.rr, oz = Math.sin(a) * p.rr;
        x = ox; y = -oz * os; z = oz * oc;
      } else {
        // The surface ripples with slow, layered waves, so it never looks rigid.
        const wave = Math.sin(p.x * 2.6 + t * .0009) * Math.cos(p.y * 2.2 - t * .0007) * .07
          + Math.sin(p.z * 3.1 + t * .0013 + p.n) * .03 * (1 + excite.x * 1.5);
        const w = 1 + wave;
        x = p.x * w; y = p.y * w; z = p.z * w;
      }
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const depth = Math.max(0, Math.min(1, (z2 + 1.3) / 2.6));
      const persp = 1.5 / (1.9 - z2 * .5);
      const px = ai.x + x1 * R * persp, py = ai.y + y1 * R * persp;
      const size = p.s * (2.6 + depth * 5.2) * (p.orbit ? .9 : 1);
      ctx.globalAlpha = Math.min(1, (.1 + depth * depth * .85) * lit * (p.orbit ? .9 : 1));
      ctx.drawImage(DEPTH[Math.round(depth * 7)], px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPackets(t) {
    const ok = passed ? outExpo(Math.min((t - passedAt) / 900, 1)) : 0;
    ctx.lineCap = 'round';
    for (const p of packets) {
      let color = C_FLY;
      if (p.state === 'ok') color = mixRgb(C_OK, C_GREEN, ok);
      else if (p.state === 'bad' || p.state === 'back') color = C_BAD;
      else if (p.state === 'home') color = C_HOME;
      const [r, gg, b] = color;
      // Tapered trail.
      const tr = p.trail;
      if (tr.length >= 4) {
        let lx = p.x, ly = p.y;
        const n = tr.length / 2;
        for (let i = 0; i < tr.length; i += 2) {
          const k = 1 - i / 2 / n;
          ctx.strokeStyle = `rgba(${r},${gg},${b},${k * .5})`;
          ctx.lineWidth = 1.8 * k;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tr[i], tr[i + 1]); ctx.stroke();
          lx = tr[i]; ly = tr[i + 1];
        }
      }
      const size = (p.state === 'ok' ? 15 : 13) * (1 + p.hot * .9);
      ctx.globalAlpha = .9;
      ctx.drawImage(sprite(...quant(color)), p.x - size / 2, p.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    const t = clock;
    ctx.clearRect(0, 0, W, H);
    drawWires(t);
    drawFrame(t);
    drawTarget(t);
    ctx.globalCompositeOperation = 'lighter';
    drawSwarm(t);
    drawPackets(t);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Loop ----------
  let raf = 0, last = 0, inView = false;
  function tick(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    clock += dt;
    while (events.length && events[0][0] <= clock) { const [time, fn] = events.shift(); fn(time); }
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  function showStatic() {
    cancelAnimationFrame(raf); raf = 0;
    events = []; scan = null; passed = 1; passedAt = -1e9; clock = 0;
    packets = slots.map((s, slot) => Object.assign(newPacket(slot, { x: s.x, y: s.y }), { right: true, state: 'ok', judged: true }));
    loop.classList.add('is-passed');
    score.x = score.to = 100;
    shown = -1; update(0);
    draw();
  }
  function refresh() {
    if (reducedMotion.matches) { showStatic(); return; }
    const active = inView && !document.hidden;
    if (active && !raf) {
      if (!events.length) cycle();
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!active && raf) {
      cancelAnimationFrame(raf); raf = 0;
    }
  }

  // ---------- Wiring ----------
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const box = canvas.getBoundingClientRect();
    tiltGoal = { x: ((event.clientX - box.left) / W - .5) * 2, y: ((event.clientY - box.top) / H - .5) * 2 };
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { tiltGoal = { x: 0, y: 0 }; });

  layout();
  new ResizeObserver(() => { layout(); if (!raf) draw(); }).observe(canvas);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; refresh(); }).observe(loop);
  document.addEventListener('visibilitychange', refresh);
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) { events = []; packets = []; passed = 0; score.x = score.to = 0; loop.classList.remove('is-passed'); }
    refresh();
  });
})();
