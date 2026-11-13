(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const data = window.ObjectRunData;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const staticLanguage = document.documentElement.dataset.language;
  let language = window.objrunLanguage || 'en';
  const text = (zh, en) => language === 'zh' ? zh : en;

  const BENCHES = [
    { key: 'deepswe', name: 'DeepSWE' },
    { key: 'cmt', name: 'CMT-Benchmark' },
    { key: 'bird', name: 'BIRD Dev' },
    { key: 'scibench', name: 'SciBench' },
    { key: 'olympiad', name: 'OlympiadBench' },
  ];
  // What the vertical axis means for each benchmark, as the paper plots it.
  const AXES = {
    tests: { zh: '通过的测试比例', en: 'Share of tests passing', domain: [0, 1], ticks: [0, .5, 1], fmt: v => `${Math.round(v * 100)}%` },
    option: { zh: '所选选项', en: 'Option named', domain: [0, 3], ticks: [0, 1, 2, 3], fmt: v => 'ABCD'[v] ?? String(v) },
    rank: { zh: '第几个不同答案（对数）', en: 'Rank of distinct answer (log)', domain: [1, 64], ticks: [1, 4, 16, 64], log: true, fmt: v => String(v) },
    // Pass/fail checkers say nothing about closeness, so these plot when each verdict came back.
    time: { zh: '开始后的分钟数', en: 'Minutes since start', fmt: v => `${v.toFixed(1)} min`,
      note: { zh: '这个评测的判定器只回答对或不对，没有接近程度，所以纵轴画的是每次判决返回的时间。', en: "This benchmark's checker only says right or wrong, with no closeness, so the vertical axis shows when each verdict came back." } },
  };
  // The time axis spans each task's own run; the others are fixed per benchmark.
  function axisFor(task) {
    const axis = AXES[task.axis];
    if (task.axis !== 'time') return axis;
    const top = Math.max(2, Math.ceil(Math.max(...task.verdicts.map(v => v.y)) / 2) * 2);
    return { ...axis, domain: [0, top], ticks: [0, top / 2, top].map(t => Math.round(t * 10) / 10), fmt: v => String(Math.round(v * 10) / 10) };
  }
  const KIND = {
    near: { zh: '被拒，附带接近程度', en: 'Rejected, with how close' },
    wrong: { zh: '被拒，只说不对', en: 'Rejected, just wrong' },
    fmt: { zh: '格式不符', en: 'Rejected on form' },
    acc: { zh: '通过', en: 'Accepted' },
  };
  // How build_runs.py picked each task, in words.
  const RULE = {
    'solved, most verdicts': '已解，判决最多',
    'solved, most repeats': '已解，重复答案最多',
    'solved, most graded checks': '已解，评分检查最多',
    'never solved, most verdicts': '未解，判决最多',
    'never solved, most graded checks': '未解，评分检查最多',
  };

  // ---------- Small SVG helpers ----------
  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.append(node);
    return node;
  }
  function linear([d0, d1], [r0, r1]) { return v => r0 + (v - d0) / (d1 - d0) * (r1 - r0); }
  function logScale([d0, d1], [r0, r1]) { const a = Math.log(d0), b = Math.log(d1); return v => r0 + (Math.log(Math.max(d0, v)) - a) / (b - a) * (r1 - r0); }

  // ---------- Tooltip, one per page, moved by transform ----------
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.append(tip);
  let tipTarget = null;
  function showTip(target, lines, x, y) {
    if (tipTarget !== target) {
      tip.textContent = lines;
      tipTarget = target;
    }
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14));
    const top = y - h - 12 < 8 ? y + 16 : y - h - 12;
    tip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    tip.classList.add('is-visible');
  }
  function hideTip() { tip.classList.remove('is-visible'); tipTarget = null; }
  window.addEventListener('scroll', hideTip, { passive: true });
  function hoverable(node, lines) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('pointermove', e => showTip(node, lines(), e.clientX, e.clientY));
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('focus', () => { const b = node.getBoundingClientRect(); showTip(node, lines(), b.left + b.width / 2, b.top); });
    node.addEventListener('blur', hideTip);
  }

  // ---------- Database row text: what the verify/submit row says ----------
  function body(task, v) {
    if (v.kind === 'acc') return 'pass 1 · accepted';
    switch (task.axis) {
      case 'tests': return v.kind === 'fmt' ? 'pass 0 · empty' : `pass 0 · tests ${Math.round(v.y * 100)}%`;
      case 'option': return v.kind === 'fmt' ? 'pass 0 · no option parsed' : `pass 0 · wrong · ${AXES.option.fmt(v.y)}`;
      case 'rank': return `pass 0 · not equivalent · #${v.y}`;
      default: return `pass 0 · ${v.kind === 'fmt' ? 'form' : 'wrong'} · ${v.y.toFixed(1)} min`;
    }
  }
  function valueText(task, v) {
    if (task.axis === 'time') return AXES.time.fmt(v.y);
    if (v.kind === 'fmt') return text('格式不符', 'Rejected on form');
    if (v.kind === 'acc' && task.axis === 'tests') return '100%';
    return AXES[task.axis].fmt(v.y);
  }

  // ---------- Trajectory replay ----------
  let bench = 'deepswe';
  let current = null;
  let timer = 0;
  let step = 0;
  let marks = [];
  let reach = [];   // drawn share of the line at each verdict
  let centers = []; // mark positions in SVG units
  let halo = null;

  const W = 760, H = 300, M = { l: 64, r: 20, t: 18, b: 70 };
  const BAND = 30; // rejected-on-form band below the plot

  function drawTrajectory(task) {
    const chart = $('trajectory-chart');
    chart.textContent = '';
    const axis = axisFor(task);
    const n = task.verdicts.length;
    $('axis-note').textContent = axis.note ? text(axis.note.zh, axis.note.en) : '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${task.benchName} ${task.task}` }, chart);
    const plotB = H - M.b - BAND;
    const x = linear([1, Math.max(2, n)], [M.l + 10, W - M.r - 10]);
    const yRange = axis.invert ? [M.t, plotB] : [plotB, M.t];
    const y = (axis.log ? logScale : linear)(axis.domain, yRange);
    const clampY = v => Math.min(axis.domain[1], Math.max(axis.domain[0], v));

    const grid = el('g', { class: 'grid' }, svg);
    axis.ticks.forEach(t => {
      el('line', { x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) }, grid);
      el('text', { x: M.l - 10, y: y(t) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = axis.fmt(t);
    });
    const bandY = plotB + 14;
    // The time axis plots form rejections at their time, so it has no form band.
    if (task.axis !== 'time') {
      el('line', { x1: M.l, x2: W - M.r, y1: bandY + BAND / 2, y2: bandY + BAND / 2, class: 'band-line' }, svg);
      el('text', { x: M.l - 10, y: bandY + BAND / 2 + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = text('格式', 'form');
    }
    const xTicks = n <= 12 ? task.verdicts.map(v => v.k) : [1, ...[.25, .5, .75].map(f => Math.round(1 + f * (n - 1))), n];
    xTicks.forEach(k => { el('text', { x: x(k), y: H - M.b + 34, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = String(k); });
    el('text', { x: (M.l + W - M.r) / 2, y: H - 14, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = text('第几次判决', 'Verdict number');
    el('text', { x: 14, y: (M.t + plotB) / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 14 ${(M.t + plotB) / 2})` }, svg).textContent = text(axis.zh, axis.en);

    // New attempts are restarts after a rejected hand-in.
    task.verdicts.forEach((v, i) => {
      if (i > 0 && v.attempt !== task.verdicts[i - 1].attempt) {
        const at = (x(v.k) + x(task.verdicts[i - 1].k)) / 2;
        el('line', { x1: at, x2: at, y1: M.t, y2: bandY + BAND, class: 'attempt-line' }, svg);
      }
    });

    const pos = v => [x(v.k), v.kind === 'fmt' && task.axis !== 'time' ? bandY + BAND / 2 : y(clampY(v.kind === 'acc' && task.axis === 'tests' ? 1 : v.y))];
    const points = task.verdicts.map(pos);
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.map(c => c.toFixed(1)).join(' ')}`).join('');
    const line = el('path', { d: path, class: 'trajectory-line', pathLength: 1 }, svg);
    line.style.strokeDasharray = '1 1';
    line.style.strokeDashoffset = '1';
    // Share of the drawn length at each verdict, so the line stops exactly on each mark
    // (segments differ in length; a jump to the form band is longer than a step along).
    let run = 0;
    const lengths = points.map((p, i) => (run += i ? Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) : 0));
    reach = lengths.map(l => run ? l / run : 1);
    centers = points;

    const r = n > 50 ? 3.5 : n > 20 ? 4.5 : 6;
    marks = task.verdicts.map(v => {
      const [cx, cy] = pos(v);
      const g = el('g', { class: `mark mark-${v.kind}` }, svg);
      if (v.kind === 'fmt') el('rect', { x: cx - r, y: cy - r, width: r * 2, height: r * 2, rx: 2 }, g);
      else el('circle', { cx, cy, r: v.kind === 'acc' ? r + 2 : v.kind === 'wrong' ? r - .5 : r }, g);
      const hit = el('rect', { x: cx - Math.max(9, r + 4), y: M.t, width: Math.max(18, (r + 4) * 2), height: bandY + BAND - M.t, class: 'hit' }, svg);
      hoverable(hit, () => [
        `${text('第', 'Verdict ')}${v.k}${text(' 次判决', '')} · ${v.by}`,
        text(KIND[v.kind].zh, KIND[v.kind].en),
        valueText(task, v),
        `${text('第', 'Attempt ')}${v.attempt}${text(' 次尝试', '')}`,
      ].join('\n'));
      return g;
    });
    // One ring that follows the playhead and ripples out from each new verdict.
    halo = el('circle', { r: r + 3, class: 'halo', cx: points[0][0], cy: points[0][1] }, svg);
  }

  // A ring that grows and fades at the newest mark; larger and green for an accepted verdict.
  function ripple(i, delay) {
    if (!halo || reducedMotion.matches || !halo.animate) return;
    const acc = current.verdicts[i].kind === 'acc';
    halo.setAttribute('cx', centers[i][0]);
    halo.setAttribute('cy', centers[i][1]);
    halo.classList.toggle('is-acc', acc);
    halo.animate([
      { transform: 'scale(.6)', opacity: acc ? .9 : .55 },
      { transform: `scale(${acc ? 3.4 : 2.2})`, opacity: 0 },
    ], { duration: acc ? 1100 : 650, delay, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });
  }

  function liveRow(task, v) {
    const li = document.createElement('li');
    li.className = 'log-row';
    li.dataset.kind = v.kind;
    li.innerHTML = '<span class="log-seq"></span><span class="log-body"></span>';
    li.children[0].textContent = v.k;
    li.children[1].textContent = `${v.by} · ${body(task, v)}`;
    return li;
  }

  // The readout names the verdict under the playhead; before the first one it
  // describes the task.
  function renderReadout(task, shown) {
    const v = shown ? task.verdicts[shown - 1] : null;
    const fields = [
      [text('挑选规则', 'Picked as'), language === 'zh' ? (RULE[task.rule] ?? task.rule) : task.rule],
      [text('运行', 'Run'), task.run],
      [text('判决', 'Verdict'), `${v ? v.k : '—'} / ${task.verdicts.length}`],
      [text('尝试', 'Attempt'), v ? String(v.attempt) : '—'],
      [text('结果', 'Outcome'), v ? text(KIND[v.kind].zh, KIND[v.kind].en) : '—', v?.kind],
      [text('取值', 'Value'), v ? valueText(task, v) : '—'],
    ];
    const dl = $('readout');
    dl.textContent = '';
    fields.forEach(([label, value, kind]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      if (kind) dd.dataset.kind = kind;
      dl.append(dt, dd);
    });
  }

  function setOutcome(task, shown) {
    const done = shown >= task.verdicts.length;
    const n = task.verdicts.length;
    $('task-outcome').textContent = done
      ? (task.solved ? text(`✓ 第 ${n} 次判决通过`, `✓ accepted at verdict ${n}`) : text(`× ${n} 次判决仍未通过`, `× not accepted after ${n} verdicts`))
      : text(`第 ${shown} / ${n} 次判决`, `verdict ${shown} / ${n}`);
    $('task-outcome').dataset.state = done ? (task.solved ? 'done' : 'failed') : 'running';
    $('db-count').textContent = text(`已记录 ${shown} 条，显示最近 ${Math.min(shown, 8)} 条`, `${shown} logged, last ${Math.min(shown, 8)} shown`);
    marks.forEach((m, i) => m.classList.toggle('is-current', i === shown - 1));
    renderReadout(task, shown);
  }

  // The line travels from the previous mark to this one on an ease-in-out; the mark
  // springs in as the line arrives, then the ring ripples out from it.
  function reveal(i, travel = 0) {
    const task = current;
    const v = task.verdicts[i];
    const line = $('trajectory-chart').querySelector('.trajectory-line');
    line.style.transition = travel ? `stroke-dashoffset ${travel}ms var(--ease-travel)` : 'none';
    line.style.strokeDashoffset = String(1 - reach[i]);
    const arrive = i && travel ? Math.round(travel * .8) : 0;
    marks[i].style.animationDelay = `${arrive}ms`;
    marks[i].classList.add('is-shown');
    if (travel) ripple(i, arrive);
    const rows = $('live-rows');
    rows.prepend(liveRow(task, v));
    while (rows.children.length > 8) rows.lastElementChild.remove();
    setOutcome(task, i + 1);
  }

  // Long trajectories play faster so every task takes roughly the same time.
  // The pace eases: slow for the first verdicts, quick through the middle,
  // and slow again into the last one so the outcome lands.
  function intervalAt(k, n) {
    const base = Math.max(70, Math.min(520, 7000 / n));
    const t = n > 1 ? k / (n - 1) : 1;
    return base * (1 + 1.6 * Math.pow(Math.abs(2 * t - 1), 3)) * (n > 4 ? .75 : 1);
  }

  function tick() {
    timer = 0;
    if (!current || step >= current.verdicts.length) return;
    if (document.hidden) return;
    const n = current.verdicts.length;
    // The line takes most of the gap before this verdict to travel to it.
    reveal(step, step ? Math.round(intervalAt(step - 1, n) * .9) : 400);
    step++;
    if (step < n) timer = setTimeout(tick, intervalAt(step, n));
  }

  function start(task) {
    clearTimeout(timer);
    current = task;
    step = 0;
    hideTip();
    $('task-name').textContent = `${task.benchName} · ${task.task}`;
    drawTrajectory(task);
    $('live-rows').textContent = '';
    renderTable(task);
    if (reducedMotion.matches) {
      while (step < task.verdicts.length) reveal(step++);
      return;
    }
    setOutcome(task, 0);
    timer = setTimeout(tick, 300);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && current && !timer && step < current.verdicts.length) tick(); });

  function renderTable(task) {
    const table = $('verdict-table');
    table.textContent = '';
    const head = table.createTHead().insertRow();
    [text('判决', 'Verdict'), text('尝试', 'Attempt'), text('工具', 'Tool'), text('结果', 'Outcome'), text('取值', 'Value')].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.append(th);
    });
    const tbody = table.createTBody();
    task.verdicts.forEach(v => {
      const row = tbody.insertRow();
      [v.k, v.attempt, v.by, text(KIND[v.kind].zh, KIND[v.kind].en), valueText(task, v)].forEach(value => { row.insertCell().textContent = value; });
    });
  }

  function tasksOf(key) { return data.tasks.filter(t => t.bench === key); }

  function renderChips(selected) {
    const chips = $('task-chips');
    chips.textContent = '';
    tasksOf(bench).forEach(task => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'task-chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(task === selected));
      b.dataset.solved = String(task.solved);
      b.innerHTML = '<span class="chip-dot" aria-hidden="true"></span><span class="chip-name"></span><span class="chip-n"></span>';
      b.children[1].textContent = task.task.replace(/^test\//, '');
      b.children[2].textContent = `${task.solved ? '✓' : '×'} ${task.verdicts.length}`;
      b.addEventListener('click', () => { renderChips(task); start(task); });
      chips.append(b);
    });
  }

  function selectBench(key, task) {
    bench = key;
    document.querySelectorAll('.bench-tab').forEach(tab => {
      const on = tab.dataset.bench === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    const pick = task || tasksOf(key)[0];
    renderChips(pick);
    start(pick);
  }

  function renderBenchTabs() {
    const tabs = $('bench-tabs');
    tabs.textContent = '';
    BENCHES.forEach((b, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'bench-tab';
      tab.setAttribute('role', 'tab');
      tab.dataset.bench = b.key;
      tab.textContent = b.name;
      const count = document.createElement('span');
      count.className = 'n';
      count.textContent = tasksOf(b.key).length;
      tab.append(count);
      tab.addEventListener('click', () => selectBench(b.key));
      tab.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const next = BENCHES[(i + d + BENCHES.length) % BENCHES.length];
        selectBench(next.key);
        tabs.querySelector(`[data-bench="${next.key}"]`).focus();
      });
      tabs.append(tab);
    });
  }

  $('replay').addEventListener('click', () => current && start(current));

  // ---------- Reachability small multiples ----------
  function stepAt(curve, n) { let s = curve.points[0][1]; for (const [k, v] of curve.points) { if (k <= n) s = v; else break; } return s; }

  function drawReach() {
    const grid = $('reach-grid');
    grid.textContent = '';
    const RW = 220, RH = 170, RM = { l: 30, r: 8, t: 10, b: 26 };
    data.reach.forEach(curve => {
      const card = document.createElement('figure');
      card.className = 'reach-card';
      const nMax = curve.points[curve.points.length - 1][0];
      const final = curve.points[curve.points.length - 1][1];
      card.innerHTML = '<figcaption class="reach-head"><span class="reach-name"></span><span class="reach-final"></span></figcaption>';
      card.querySelector('.reach-name').textContent = curve.name;
      card.querySelector('.reach-final').textContent = `${final.toFixed(1)}%`;
      const svg = el('svg', { viewBox: `0 0 ${RW} ${RH}`, role: 'img', 'aria-label': `${curve.name}: S(n) ${text('从', 'from')} ${curve.points[0][1]}% ${text('到', 'to')} ${final}% , U ${curve.u.toFixed(1)}%` }, card);
      const x = nMax > 12 ? logScale([1, nMax], [RM.l, RW - RM.r]) : linear([1, nMax], [RM.l, RW - RM.r]);
      const y = linear([0, 100], [RH - RM.b, RM.t]);
      const g = el('g', { class: 'grid' }, svg);
      [0, 50, 100].forEach(t => {
        el('line', { x1: RM.l, x2: RW - RM.r, y1: y(t), y2: y(t) }, g);
        el('text', { x: RM.l - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = `${t}`;
      });
      const xt = nMax >= 30 ? [1, 10, nMax] : [1, nMax];
      xt.forEach((t, i) => {
        const anchor = i === xt.length - 1 ? 'end' : i ? 'middle' : 'start';
        el('text', { x: x(t), y: RH - 8, 'text-anchor': anchor, class: 'tick' }, svg).textContent = i ? String(t) : 'n=1';
      });
      el('line', { x1: RM.l, x2: RW - RM.r, y1: y(curve.u), y2: y(curve.u), class: 'u-line' }, svg);
      el('text', { x: RW - RM.r, y: y(curve.u) + (curve.u > 80 ? 14 : -5), 'text-anchor': 'end', class: 'u-label' }, svg).textContent = `U ${curve.u.toFixed(1)}%`;
      let d = `M${x(curve.points[0][0]).toFixed(1)} ${y(curve.points[0][1]).toFixed(1)}`;
      for (let i = 1; i < curve.points.length; i++) {
        d += `H${x(curve.points[i][0]).toFixed(1)}V${y(curve.points[i][1]).toFixed(1)}`;
      }
      el('path', { d, class: 'reach-line', pathLength: 1 }, svg);
      el('circle', { cx: x(nMax), cy: y(final), r: 2.5, class: 'reach-end', 'aria-hidden': 'true' }, svg);
      // Crosshair hover over the whole plot: report the step at that n.
      const cross = el('line', { y1: RM.t, y2: RH - RM.b, class: 'crosshair' }, svg);
      const hit = el('rect', { x: RM.l, y: RM.t, width: RW - RM.l - RM.r, height: RH - RM.t - RM.b, class: 'hit' }, svg);
      hit.addEventListener('pointermove', e => {
        const box = svg.getBoundingClientRect();
        const px = (e.clientX - box.left) / box.width * RW;
        let best = curve.points[0][0];
        for (const [k] of curve.points) if (Math.abs(x(k) - px) < Math.abs(x(best) - px)) best = k;
        cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best));
        cross.classList.add('is-on');
        showTip(hit, `${curve.name}\nn ≤ ${best}: ${stepAt(curve, best).toFixed(1)}%\nU: ${curve.u.toFixed(1)}%`, e.clientX, e.clientY);
      });
      hit.addEventListener('pointerleave', () => { cross.classList.remove('is-on'); hideTip(); });
      hit.setAttribute('tabindex', '0');
      hit.addEventListener('focus', () => { const b = hit.getBoundingClientRect(); showTip(hit, `${curve.name}\nn ≤ ${nMax}: ${final.toFixed(1)}%\nU: ${curve.u.toFixed(1)}%`, b.left + b.width / 2, b.top); });
      hit.addEventListener('blur', hideTip);
      card.style.setProperty('--i', grid.children.length);
      grid.append(card);
    });
    renderReachTable();
    revealReach();
  }

  // Draw the curves once the grid is on screen; a redraw (language switch) shows them at once.
  let reachSeen = false;
  function revealReach() {
    const cards = document.querySelectorAll('.reach-card');
    if (reachSeen || reducedMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach(c => c.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      reachSeen = true;
      document.querySelectorAll('.reach-card').forEach(c => c.classList.add('is-visible'));
    }, { threshold: .3 });
    io.observe($('reach-grid'));
  }

  // One table for all five panels: S(n) at a few budgets, next to U.
  function renderReachTable() {
    const table = $('reach-table');
    table.textContent = '';
    const picks = [1, 2, 3, 5, 10];
    const head = table.createTHead().insertRow();
    [text('评测', 'Benchmark'), 'U %', ...picks.map(k => `S(${k}) %`), text('S(最大) %', 'S(max) %'), text('最大 n', 'max n')].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      head.append(th);
    });
    const tb = table.createTBody();
    data.reach.forEach(curve => {
      const nMax = curve.points[curve.points.length - 1][0];
      const row = tb.insertRow();
      [curve.name, curve.u.toFixed(1), ...picks.map(k => k <= nMax ? stepAt(curve, k).toFixed(1) : '—'), stepAt(curve, nMax).toFixed(1), nMax].forEach(v => { row.insertCell().textContent = v; });
    });
  }

  // ---------- Language ----------
  function setLanguage(next, persist = false) {
    language = next;
    document.documentElement.lang = next === 'zh' ? 'zh-Hans' : 'en';
    document.querySelectorAll('[data-zh][data-en]').forEach(element => { element.textContent = element.dataset[next]; });
    $('language').textContent = text('EN', '中文');
    $('language').setAttribute('aria-label', text('Switch to English', '切换为中文'));
    if (persist) { try { localStorage.setItem('objrun-lang', next); localStorage.setItem('objrun-lang-explicit', '1'); } catch { /* Work without local storage. */ } }
  }
  if (!staticLanguage) $('language').addEventListener('click', () => {
    setLanguage(language === 'zh' ? 'en' : 'zh', true);
    drawReach();
    if (current) {
      // Redraw labels without restarting the replay.
      const shown = step;
      drawTrajectory(current);
      renderTable(current);
      for (let i = 0; i < shown; i++) marks[i].classList.add('is-shown', 'is-static');
      const line = $('trajectory-chart').querySelector('.trajectory-line');
      line.style.strokeDashoffset = String(shown ? 1 - reach[shown - 1] : 1);
      setOutcome(current, shown);
    }
  });

  setLanguage(language);
  renderBenchTabs();
  const hero = data.tasks.find(t => t.task === data.hero);
  selectBench(hero.bench, hero);
  drawReach();
})();
