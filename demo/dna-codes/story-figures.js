function createDnaStoryFigures(el, text, reduced, openReceipt) {
  const minimum = 4;
  const dnaLab = el('dna-lab');
  const orbitCard = el('orbit-card');
  const matrixCard = el('matrix-card');
  const sideCard = el('side-card');
  const pairCard = el('pair-card');
  const comparison = el('comparison');
  const pairChecks = el('pair-checks');
  const pairPill = el('pair-pill');
  const words = el('words');
  const mapping = el('mapping');
  const hamming = el('hamming');
  const checkpoints = el('checkpoints');
  const marker = el('marker');
  const series = el('series');
  const tabStats = el('tab-stats');
  const tabQuartet = el('tab-quartet');
  const statsPane = el('stats-pane');
  const quartetPane = el('quartet-pane');
  const points = dnaArchive.checks.map(check => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-checkpoint';
    button.hidden = true;
    return {check,button,distance:Infinity};
  });
  checkpoints.append(...points.map(point => point.button));
  let figure, columns = [], scanDuration = 0, scanned = -1, figureAge = -1, lastPairKey = '';
  let chartFrame = 0, chartDistance;
  let inspectingMatrix = false, manualTab = false, lastAutoPhase = '', currentQuartetWord = 'AAAAACCCCC', currentIsExact = false;

  const format = n => n.toLocaleString('en-US');
  function histogram(id, bins, interval = 1) {
    const max = Math.max(...bins.map(([,count]) => count));
    el(id).replaceChildren(...bins.map(([value,count], idx) => {
      const bar = document.createElement('div');
      bar.style.setProperty('--bar-i', idx);
      if (id === 'distances' && value === 4) bar.dataset.min = 'true';
      const stack = document.createElement('i');
      const label = document.createElement('small');
      label.textContent = value;
      stack.style.height = Math.max(4, count/max*100) + '%';
      bar.title = (interval === 1 ? value : value + '–' + (value+interval-1)) + ' · ' + format(count);
      bar.append(stack,label);
      return bar;
    }));
  }
  histogram('degrees',dnaRunDiagrams.degreeBins,100);
  histogram('distances',dnaRunDiagrams.distances);

  function setSideTab(tab, manual = false) {
    if (manual) manualTab = true;
    const isStats = tab === 'stats';
    tabStats.setAttribute('aria-selected',String(isStats));
    tabQuartet.setAttribute('aria-selected',String(!isStats));
    statsPane.hidden = !isStats;
    quartetPane.hidden = isStats;
  }
  tabStats.addEventListener('click',() => setSideTab('stats',true));
  tabQuartet.addEventListener('click',() => setSideTab('quartet',true));

  const compMap = {A:'T',T:'A',C:'G',G:'C'};
  const revSeq = s => [...s].reverse().join('');
  const rcSeq = s => [...s].reverse().map(c => compMap[c]).join('');
  const hamDist = (a, b) => [...a].reduce((n, ch, i) => n + Number(ch !== b[i]), 0);
  const encode2Bit = s => [...s].reduce((acc, ch, i) => acc | ('ACGT'.indexOf(ch) << (2 * i)), 0);
  const popcount = n => { let c = 0; while (n) { n &= n - 1; c++; } return c; };

  function renderPairChecks(pair) {
    if (!pairChecks || !pair || pair.length !== 2) return;
    const [w1, w2] = pair;
    const gc1 = [...w1].filter(c => c === 'G' || c === 'C').length;
    const gc2 = [...w2].filter(c => c === 'G' || c === 'C').length;
    const dTrue = hamDist(w1, w2);
    const dRev = hamDist(w1, revSeq(w2));
    const dRc = hamDist(w1, rcSeq(w2));
    const dBit = Math.floor(popcount(encode2Bit(w1) ^ encode2Bit(w2)) / 2);
    const items = [
      {
        label: text('GC 含量平衡','GC balance'),
        value: `${gc1}/10 · ${gc2}/10`,
        tone: gc1 === 5 && gc2 === 5 ? 'ok' : 'conflict'
      },
      {
        label: text('反向距离 d(w₁, rev w₂)','Reverse d(w₁, rev w₂)'),
        value: `d = ${dRev}` + (dRev >= 4 ? ' ≥ 4' : ' < 4'),
        tone: dRev >= 4 ? 'ok' : 'conflict'
      },
      {
        label: text('反向互补 d(w₁, rc w₂)','Rev-comp d(w₁, rc w₂)'),
        value: `d = ${dRc}` + (dRc >= 4 ? ' ≥ 4' : ' < 4'),
        tone: dRc >= 4 ? 'ok' : 'conflict'
      },
      {
        label: text('2-bit popcount/2','2-bit popcount/2'),
        value: dBit < dTrue ? `${dBit} < ${dTrue} (${text('低估','undercount')})` : `${dBit} = ${dTrue}`,
        tone: dBit < dTrue ? 'warn' : 'ok'
      }
    ];
    pairChecks.replaceChildren(...items.map(item => {
      const box = document.createElement('div');
      box.className = 'dna-check-chip';
      box.dataset.tone = item.tone;
      const k = document.createElement('span');
      k.textContent = item.label;
      const v = document.createElement('strong');
      v.textContent = item.value;
      box.append(k, v);
      return box;
    }));
  }

  function buildPairColumns(pair) {
    const [first,second] = pair;
    scanDuration = 0;
    columns = [...first].map((letter,i) => {
      const node = document.createElement('div');
      node.className = 'story-column';
      const different = letter !== second[i];
      const position = document.createElement('small');
      position.textContent = String(i+1).padStart(2,'0');
      const top = document.createElement('span');
      top.dataset.base = letter;
      top.textContent = letter;
      const bottom = document.createElement('span');
      bottom.dataset.base = second[i];
      bottom.textContent = second[i];
      node.append(position,top,document.createElement('i'),bottom);
      const start = scanDuration;
      scanDuration += different ? .2 : .075;
      return {node,different,start};
    });
    words.replaceChildren(...columns.map(({node}) => node));
    scanned = -1;
    renderPairChecks(pair);
  }

  const orbitSpace = createDnaOrbitSpace(el('orbit-canvas'),text);
  const distanceMatrix = createDnaDistanceMatrix(el('matrix-canvas'),text,info => {
    const readout = el('matrix-hover');
    if (info) {
      inspectingMatrix = true;
      readout.textContent = `w[${info.i}] × w[${info.j}] · d=${info.distance}`;
      if (figure && figure.view !== 'hamming') {
        buildPairColumns(info.pair);
        scan(9,info.pair);
      }
      renderDnaQuartet(el('quartet'),info.pair[0],text,false);
    } else {
      inspectingMatrix = false;
      readout.textContent = text('悬停格子查码字对','Hover cells');
      if (figure && figure.pair && figure.view !== 'hamming') {
        buildPairColumns(figure.pair);
        scan(9,figure.pair);
      }
      renderDnaQuartet(el('quartet'),currentQuartetWord,text,currentIsExact);
    }
  });

  function observe(frame, check) {
    const graphReady = frame.utc >= '09:03:17';
    const screened = frame.utc >= '09:06:14';
    const corrected = frame.utc >= '12:23:05';
    const branchId = frame.branch?.id ?? '';
    const isExact = branchId === 'exact';
    const isFault = branchId === 'reader';
    const stages = [[dnaRunDiagrams.orbits,text('闭合轨道','Closed orbits'),'']];
    if (screened) stages.push([22230,text('初次预筛','Initial screen'),'dropped']);
    if (corrected) stages.push([39002,text('按位修正后','After correction'),'restored']);
    const filterEl = el('filter');
    const filterKey = stages.map(([n,c]) => n + c).join('|');
    if (filterEl.dataset.filterKey !== filterKey) {
      filterEl.dataset.filterKey = filterKey;
      filterEl.replaceChildren(...stages.map(([count,caption,tone], idx) => {
        const row = document.createElement('div');
        row.style.setProperty('--bar-i', idx);
        if (tone) row.dataset.tone = tone;
        const label = document.createElement('span');
        label.textContent = caption;
        const amount = document.createElement('strong');
        amount.textContent = format(count);
        row.style.setProperty('--share',count/dnaRunDiagrams.orbits);
        row.append(label,amount);
        return row;
      }));
    }
    el('degrees').hidden = !graphReady;
    el('degrees').setAttribute('aria-label',text('归档冲突图中，每个轨道的邻居数分布。','Neighbors per orbit in the archived conflict graph.'));
    el('degree-note').textContent = !graphReady ? text('建图前 · 39,702 个闭合轨道待建冲突边','Pre-graph · 39,702 closed orbits queued') : check ?
      text(format(check.size/4) + ' 个互不冲突轨道已核验',format(check.size/4) + ' orbits verified in independent set') :
      text(format(dnaRunDiagrams.edges) + ' 条边 · 平均 ' + dnaRunDiagrams.meanDegree + ' 邻居',
        format(dnaRunDiagrams.edges) + ' edges · mean degree ' + dnaRunDiagrams.meanDegree);
    const count = dnaRunDiagrams.distances.reduce((sum,[,n]) => sum+n,0);
    el('distance-note').textContent = text(format(count) + ' 对 · 0 对小于 4 · 最小距离 4',
      format(count) + ' pairs · 0 below 4 · minimum distance 4');
    el('distances').setAttribute('aria-label',dnaRunDiagrams.distances.map(([d,n]) => d + ': ' + format(n)).join(' · '));

    const orbitMode = !graphReady ? 'orbits' : frame.graphView || 'search';
    orbitSpace.setState({
      mode:orbitMode,
      selectedOrbits:check ? check.size / 4 : 0,
      screened,
      corrected,
      fault:isFault,
      exactHighlight:isExact
    });
    const pill = el('orbit-pill');
    pill.dataset.tone = isFault ? 'conflict' : isExact || check ? 'ok' : '';
    pill.textContent = isFault ? text('273,687 冲突','273,687 violations') :
      isExact ? text('39,002 (+16,772)','39,002 (+16,772)') :
      check ? text(format(check.size / 4) + ' / ' + (corrected ? '39,002' : '22,230') + ' 已选',
        format(check.size / 4) + ' / ' + (corrected ? '39,002' : '22,230') + ' IS') :
      screened ? text('22,230 / 39,702','22,230 / 39,702') :
      graphReady ? text('13.9M 冲突边','13.9M edges') :
      text('39,702 轨道','39,702 orbits');

    const autoPhase = !graphReady ? 'setup' : branchId === 'orbits' ? 'orbits' : isExact ? 'exact' : 'stats';
    if (autoPhase !== lastAutoPhase) {
      lastAutoPhase = autoPhase;
      manualTab = false;
    }
    if (!manualTab) setSideTab(autoPhase === 'stats' ? 'stats' : 'quartet',false);
    currentIsExact = isExact;
    currentQuartetWord = isExact ? dnaArchive.reinstated[0] : (frame.pair?.[0] ?? 'AAAAGGTGCG');
    if (!inspectingMatrix) renderDnaQuartet(el('quartet'),currentQuartetWord,text,currentIsExact);
  }

  function show(next, force) {
    const changed = figure !== next;
    if (!changed && !force) return;
    figure = next;
    const {view,pair} = figure;
    const isGraphFocus = view !== 'comparison' && view !== 'mapping' && view !== 'hamming';
    orbitCard.dataset.focus = String(isGraphFocus);
    sideCard.dataset.focus = String(isGraphFocus);
    matrixCard.dataset.focus = String(!isGraphFocus);
    pairCard.dataset.focus = String(!isGraphFocus);

    mapping.hidden = view !== 'mapping';
    comparison.hidden = view === 'hamming';
    if (pairChecks) pairChecks.hidden = view === 'mapping' || view === 'hamming';
    hamming.hidden = view !== 'hamming';
    figureAge = -1;

    const isConflict = Boolean(pair && pair.join('/') === dnaArchive.conflict.join('/'));
    distanceMatrix.setPair(pair,isConflict);
    distanceMatrix.draw();
    orbitSpace.draw();

    const pill = el('matrix-pill');
    pill.dataset.tone = isConflict ? 'conflict' : view === 'hamming' ? 'ok' : '';
    pill.textContent = isConflict ? text('d = 3 冲突','d = 3 conflict') :
      view === 'hamming' ? text('32 × 32 · 0 冲突','32 × 32 · 0 conflicts') :
      text('32 × 32 · d ≥ 4','32 × 32 · d ≥ 4');
    if (!inspectingMatrix) el('matrix-hover').textContent = text('悬停格子查码字对','Hover cells');

    const pairKey = pair ? pair.join('/') : '';
    if (pair && view !== 'hamming' && (pairKey !== lastPairKey || force)) {
      lastPairKey = pairKey;
      buildPairColumns(pair);
    }
  }

  function scan(age, activePair = figure.pair) {
    if (!columns.length || !activePair) return;
    const complete = age >= scanDuration;
    const current = complete ? columns.length : columns.findLastIndex(column => column.start <= age);
    if (current === scanned) return;
    scanned = current;
    words.dataset.scanning = String(!complete);
    words.style.setProperty('--scan-column',Math.min(scanned,columns.length-1));
    let distance = 0;
    for (const [i,{node,different}] of columns.entries()) {
      const counted = different && i <= scanned;
      node.classList.toggle('differs',counted);
      node.classList.toggle('scanning',scanned === i);
      distance += Number(counted);
    }
    const pass = distance >= minimum;
    const difference = text('处不同',distance === 1 ? 'difference' : 'differences');
    const label = difference + (complete ? (pass ? text(' · 通过',' · pass') : text(' · 未通过',' · fail')) : '');
    comparison.dataset.verdict = complete ? (pass ? 'pass' : 'fail') : '';
    comparison.style.setProperty('--distance',distance / columns.length);
    if (pairPill) {
      pairPill.dataset.tone = complete ? (pass ? 'ok' : 'conflict') : '';
      pairPill.textContent = complete ?
        (pass ? `d = ${distance} · OK` : `d = ${distance} < 4`) :
        '10-mer · GC 50%';
    }
    el('distance').textContent = distance;
    el('distance-label').textContent = label;
    words.setAttribute('aria-label',activePair.join(' / ') + ' · ' + distance + ' ' + label +
      ' · ' + text('至少 4 位','Minimum 4'));
  }

  function draw(position, settle) {
    const age = settle || reduced.matches ? 2 : Math.min(2,Math.max(0,position-figure.at));
    if (age === figureAge) return;
    figureAge = age;
    const rev = ease(age/.7);
    dnaLab.style.setProperty('--chart-reveal',rev);
    orbitSpace.setReveal(rev);
    if (figure.view === 'mapping') {
      mapping.style.setProperty('--lookup',ease(age/.65));
      if (!inspectingMatrix) scan(age);
    } else if (figure.view === 'hamming') {
      hamming.style.setProperty('--chart-reveal',rev);
    } else {
      if (!inspectingMatrix) scan(age);
    }
  }

  function ease(value) {
    const t = Math.min(1,Math.max(0,value));
    return 1 - (1-t)**3;
  }

  function placeOnChart(node,x,y) {
    node.style.left = x/288*100 + '%';
    node.style.top = y/85*100 + '%';
  }

  function chart(check, utc, x, y, animate) {
    const vertices = [{x:14,y:69,distance:0}];
    function append(px,py) {
      const previous = vertices.at(-1);
      const length = Math.abs(px-previous.x) + Math.abs(py-previous.y);
      if (length) vertices.push({x:px,y:py,distance:previous.distance+length});
    }
    for (const point of points) {
      point.distance = Infinity;
      if (!check || point.check.size > check.size) continue;
      const px = x(point.check.utc), py = y(point.check.size);
      append(px,vertices.at(-1).y);
      append(px,py);
      point.distance = vertices.at(-1).distance;
      placeOnChart(point.button,px,py);
      const count = format(point.check.size);
      const label = text('查看 ' + count + ' 条码字的核验回执','View receipt for ' + count + ' verified words');
      point.button.setAttribute('aria-label',label);
      point.button.title = label;
    }
    const last = vertices.at(-1);
    append(Math.max(last.x,x(utc)),last.y);
    const end = vertices.at(-1).distance;

    function paint(distance) {
      chartDistance = distance;
      let tip = vertices[0];
      let path = `M${tip.x} ${tip.y}`;
      for (let i=1;i<vertices.length;i++) {
        if (distance <= tip.distance) break;
        const next = vertices[i];
        const progress = Math.min(1,(distance-tip.distance)/(next.distance-tip.distance));
        tip = progress === 1 ? next : {
          x:tip.x+(next.x-tip.x)*progress, y:tip.y+(next.y-tip.y)*progress, distance
        };
        path += `L${tip.x} ${tip.y}`;
      }
      series.setAttribute('d',path);
      placeOnChart(marker,tip.x,tip.y);
      for (const point of points) {
        const hidden = point.distance > distance;
        if (point.button.hidden !== hidden) point.button.hidden = hidden;
      }
    }

    cancelAnimationFrame(chartFrame);
    const start = chartDistance;
    if (!animate || reduced.matches || !(end > start)) {
      paint(end);
      return;
    }
    paint(start);
    const startedAt = performance.now();
    function advance(now) {
      const progress = Math.min(1,(now-startedAt)/450);
      paint(progress === 1 ? end : start+(end-start)*ease(progress));
      if (progress < 1) chartFrame = requestAnimationFrame(advance);
    }
    chartFrame = requestAnimationFrame(advance);
  }

  checkpoints.addEventListener('click',event => {
    let point = points.find(entry => entry.button === event.target);
    if (!point) return;
    if (event.detail) {
      // Neighboring receipts can share a hit area on a narrow plot.
      let closest = Infinity;
      for (const entry of points) {
        if (entry.button.hidden) break;
        const box = entry.button.getBoundingClientRect();
        const distance = Math.hypot(event.clientX-box.x-box.width/2,event.clientY-box.y-box.height/2);
        if (distance >= closest) continue;
        closest = distance;
        point = entry;
      }
    }
    openReceipt(point.check);
  });
  return {show,draw,chart,observe};
}
