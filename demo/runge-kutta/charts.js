const rkCharts = (() => {
  const t = (zh, en) => window.replayLocale.text(zh, en);
  const byId = id => document.getElementById(id);
  const {baseline, candidates, contours, heldOut} = rkArchive;
  const stabilityPlot = byId('stability-plot');
  const probeOutput = byId('stability-probe');
  let activePolynomial = null, probePoint = null;
  let boundaryTime = 0, boundaryTrace;
  const motion = new FigureMotion(stabilityPlot, (_, idleSeconds, rate) => {
    boundaryTime = (boundaryTime + idleSeconds) % 14;
    boundaryTrace.style.strokeDashoffset = -100 * boundaryTime / 14;
    boundaryTrace.style.opacity = .85 * rate;
  }, () => { if (boundaryTrace) boundaryTrace.style.opacity = 0; });
  const odeNames = {
    nonautonomous_riccati: ['非自治 Riccati', 'Non-autonomous Riccati'],
    cubic_decay: ['立方衰减', 'Cubic decay'],
    coupled_nonlinear: ['耦合非线性系统', 'Coupled nonlinear system'],
    logistic: ['Logistic', 'Logistic']
  };
  const number = n => Math.abs(n) < 0.000001 && n !== 0 ? n.toExponential(2) : n.toFixed(6);
  const percent = ratio => {
    const delta = (ratio - 1) * 100;
    return (delta < 0 ? '−' : '+') + Math.abs(delta).toFixed(1) + '%';
  };
  const legend = (kind, label) => `<span class="key"><i class="swatch ${kind}"></i>${label}</span>`;
  const svgLine = (x1, y1, x2, y2, css) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${css}"/>`;
  const svgText = (x, y, label, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${label}</text>`;

  function inspectStability(u, v) {
    const mark = stabilityPlot.querySelector('.probe-dot');
    if (!mark || !activePolynomial) return;
    probePoint = [u, v];
    const re = (u - 273) / 29, im = (128 - v) / 29;
    function magnitude(coefficients) {
      let real = 0, imaginary = 0;
      for (let i = coefficients.length - 1; i >= 0; i--) {
        [real, imaginary] = [real * re - imaginary * im + coefficients[i], real * im + imaginary * re];
      }
      return Math.hypot(real, imaginary);
    }
    mark.setAttribute('cx', u);
    mark.setAttribute('cy', v);
    mark.removeAttribute('visibility');
    const base = magnitude(baseline.polynomial).toFixed(3);
    const other = activePolynomial === baseline.polynomial ? '' : ' / ' + magnitude(activePolynomial).toFixed(3);
    probeOutput.textContent = 'z = ' + re.toFixed(2) + (im < 0 ? ' − ' : ' + ') + Math.abs(im).toFixed(2) + 'i · |R| ' + base + other;
    mark.ownerSVGElement.setAttribute('aria-description', probeOutput.textContent);
  }

  function pointerProbe(event) {
    const svg = stabilityPlot.firstElementChild;
    const transform = svg?.getScreenCTM();
    if (!transform) return;
    const {x, y} = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    if (x >= 27 && x <= 319 && y >= 17 && y <= 236) inspectStability(x, y);
  }
  stabilityPlot.addEventListener('pointermove', pointerProbe);
  stabilityPlot.addEventListener('pointerdown', pointerProbe);
  stabilityPlot.addEventListener('keydown', event => {
    const dx = Number(event.key === 'ArrowRight') - Number(event.key === 'ArrowLeft');
    const dy = Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
    if (!dx && !dy) return;
    event.preventDefault();
    const [u, v] = probePoint ?? [244, 128];
    inspectStability(Math.min(319, Math.max(27, u + dx * 7.25)), Math.min(236, Math.max(17, v + dy * 7.25)));
  });
  stabilityPlot.addEventListener('focusin', () => {
    if (!probePoint) inspectStability(244, 128);
  });

  function stability(metric, certified) {
    const x = re => 273 + 29 * re;
    const y = im => 128 - 29 * im;
    const failed = metric === 'free';
    const active = candidates[metric];
    let grid = '', axes = '';
    for (const re of [-8, -6, -4, -2, 0]) {
      grid += svgLine(x(re), 17, x(re), 236, 'gridline');
      axes += svgText(x(re), 249, re || '0');
    }
    for (const im of [-3, -2, -1, 0, 1, 2, 3]) {
      grid += svgLine(27, y(im), 319, y(im), 'gridline');
      if (Math.abs(im) !== 1 && Math.abs(im) !== 3) axes += svgText(18, y(im) + 4, im, 'end');
    }
    const mark = contours.frozen.map((path, i) => `<path class="contour level-${i}" d="${path}"/>`).join('');
    const comparison = failed ? `<path class="rejected-contour" d="${contours.rejected[0]}"/>` : '';
    const regionLabel = failed ? t('冻结稳定域与被拒候选的边界','Frozen stability region and rejected candidate boundary') : t('冻结多项式的绝对稳定域','Absolute stability region of the frozen polynomial');
    const preview = t('归档基线预览', 'Archived baseline preview');
    const tracer = metric ? `<path class="boundary-trace" aria-hidden="true" pathLength="100" d="${contours.frozen[0]}"/>` : '';
    activePolynomial = failed ? active.polynomial : baseline.polynomial;
    const hadFocus = stabilityPlot.contains(document.activeElement);
    stabilityPlot.innerHTML = `<svg class="phase-chart" viewBox="0 0 340 258" tabindex="0" role="img" aria-label="${metric ? regionLabel : preview}. ${t('用方向键查看一点','Use arrow keys to inspect a point')}">
      ${grid}<g transform="translate(273 128) scale(29 -29)">${mark}${tracer}</g>
      ${svgLine(27,128,319,128,'axis-line')}${svgLine(273,17,273,236,'axis-line')}
      <g transform="translate(273 128) scale(29 -29)">${comparison}</g>
      <g class="axis-label">${axes}${svgText(26,13,'Im z','start')}${svgText(317,249,'Re z','end')}</g>
      <circle class="probe-dot" r="3.6" visibility="hidden"/></svg>`;
    boundaryTrace = stabilityPlot.querySelector('.boundary-trace');
    motion.setReady(Boolean(boundaryTrace));
    let key = t('冻结域', 'Frozen region') + ' · |R(z)| ≤ 1';
    if (active && !failed) key = t('基线与候选','Baseline and candidate') + ' · |R(z)| ≤ 1';
    byId('region-key').innerHTML = legend('region',metric ? key : preview) + (failed ? legend('rejected',t('被拒候选','Rejected candidate')) : '');
    probeOutput.textContent = t('移动指针查看 |R(z)|','Point to inspect |R(z)|');
    if (probePoint) inspectStability(...probePoint);
    if (hadFocus) stabilityPlot.firstElementChild.focus({preventScroll:true});
    byId('norm').textContent = certified ? '639/45752' : metric ? number((active || baseline).norm) : '—';
    const change = byId('norm-change');
    change.hidden = !active || failed;
    if (!change.hidden) {
      change.textContent = '−' + ((1-active.norm/baseline.norm)*100).toFixed(2) + '%';
      change.title = t('相对修正基线的降幅','Reduction from the corrected baseline');
    }
    byId('verdict').textContent = certified ? t('已证明最优','Proven optimal') : failed ? t('稳定性未通过','Stability rejected') : active ? t('数值检查通过','Numerically valid') : metric ? t('修正后的基线','Corrected baseline') : t('等待基线','Awaiting baseline');
    byId('verdict').classList.toggle('fault',failed);
  }

  // Glyphs follow the order of checker.py's TREES[4].
  const glyphs = [
    [[0,0],[-8,-11],[0,-11],[8,-11]],
    [[0,0],[0,-9],[-6,-18],[6,-18]],
    [[0,0],[-6,-9],[6,-9],[6,-18]],
    [[0,0],[0,-6],[0,-12],[0,-18]]
  ];
  const parents = [[0,0,0],[0,1,1],[0,0,2],[0,1,2]];
  function treeGlyph(i, x, y) {
    const nodes = glyphs[i];
    const edges = parents[i].map((parent,j) => svgLine(...nodes[parent],...nodes[j+1],'tree-edge')).join('');
    const dots = nodes.map(([cx,cy]) => `<circle cx="${cx}" cy="${cy}" r="2.1"/>`).join('');
    return `<g class="tree-symbol" transform="translate(${x} ${y})">${edges}${dots}</g>`;
  }
  function terms(metric, certified) {
    const candidate = candidates[metric];
    const failed = metric === 'free';
    const scale = value => Math.abs(value) * 5900;
    let grid = '', marks = '';
    for (const tick of [0,.005,.010,.015]) {
      const y = 108 - scale(tick);
      grid += svgLine(43,y,387,y,'gridline') + svgText(37,y+3,tick ? tick.toFixed(3) : '0','end');
    }
    for (let i=0;i<4;i++) {
      const cx = 88 + i * 85;
      marks += treeGlyph(i,cx,137);
      const h = scale(baseline.terms[i]);
      marks += `<rect class="bar-base" x="${cx-15}" y="${108-h}" width="14" height="${h}"/>`;
      if (!candidate) continue;
      const actual = certified && i < 3 ? 0 : Math.abs(candidate.terms[i]);
      const bar = scale(actual);
      const css = failed ? 'bar-bad' : 'bar-ok';
      // The small marker locates values below a display pixel on the zero axis.
      marks += bar < 1 ? `<circle class="${css}" cx="${cx+8}" cy="108" r="2.5"/>` : `<rect class="${css}" x="${cx+1}" y="${108-bar}" width="14" height="${bar}"/>`;
    }
    const label = t('四阶有根树误差系数绝对值','Absolute fourth-order rooted-tree error coefficients');
    byId('metric-plot').innerHTML = `<svg class="terms-chart" viewBox="0 0 400 145" role="img" aria-label="${label}">
      <g class="axis-label">${grid}</g>${marks}</svg>`;
    const keys = legend('base',metric ? t('基线','Baseline') : t('归档基线预览','Archived baseline preview')) +
      (candidate ? legend(failed ? 'bad' : 'ok',failed ? t('被拒候选','Rejected candidate') : t('候选','Candidate')) : '');
    byId('metric-foot').innerHTML = `<span>${t('四阶树误差系数','Fourth-order tree errors')} · |τ|</span><div class="legend">${keys}</div>`;
  }

  function odes(available, rhs) {
    const rows = heldOut.filter(row => row.rhs_calls === rhs);
    byId('ode-plot').innerHTML = '<div class="ode-bars">' + Object.entries(odeNames).map(([id,names]) => {
      const row = rows.find(r => r.problem === id);
      const delta = (row.ratio-1)*100;
      const left = (50+Math.min(0,delta))/65*100;
      const width = Math.abs(delta)/65*100;
      const mark = available ? `<i class="${delta>0?'increase':'decrease'}" style="left:${left}%;width:${width}%"></i>` : '';
      return `<div class="ode-row"><span>${t(...names)}</span><div class="ode-track">${mark}</div><b>${available ? percent(row.ratio) : '—'}</b></div>`;
    }).join('') + '</div>';
    byId('ode-foot').textContent = available
      ? t('同等函数求值次数下，相对基线的终点误差变化。','Change in endpoint error versus the baseline at equal RHS cost.')
      : t('等待留出评测归档。','Waiting for the held-out comparison.');
  }
  return {stability, terms, odes, odeNames, number, percent};
})();
