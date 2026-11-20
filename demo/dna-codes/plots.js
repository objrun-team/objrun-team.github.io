const dnaPlots = (() => {
  const {text} = replayLocale;
  const fmt = n => n.toLocaleString('en-US');
  const {reference, edge, conflict, reinstated, checks} = dnaArchive;
  const panel = document.querySelector('.pair-body');
  const scan = document.createElement('span');
  scan.className = 'alignment-scan';
  scan.setAttribute('aria-hidden','true');
  let scanTime = 0;
  const motion = new FigureMotion(panel, (_, idleSeconds, rate) => {
    scanTime = (scanTime + idleSeconds) % 9;
    const phase = Math.min(1, scanTime / 7);
    scan.style.transform = 'translateX(' + (900 * phase) + '%)';
    scan.style.opacity = rate * Math.min(1, 12*phase, 12*(1-phase));
  }, () => { scan.style.opacity = 0; });

  // The binary orbit file uses four little-endian uint32 words per orbit.
  // The two example pairs below have been decoded from those rows offline.
  function examples(state) {
    const result = {};
    if (state.reference) {
      const c = state.check;
      result.book = c ? {
        pair: c.pair, context: text('已核验码本','Verified codebook') + ' · ' + fmt(c.size),
        source: 'verified/' + c.hash + '.txt',
        note: text('高亮位置不同，达到最小距离。','Highlighted positions differ, meeting the distance bound.')
      } : {
        pair: reference, context: text('论文参考码本','Reference codebook') + ' · 676',
        source: 'reference/published-fss.txt',
        note: text('这一对参考码字恰好相差四位。','These two reference words differ in exactly four places.')
      };
      result.book.tab = text('码本','Codebook');
    }
    if (state.edge) result.edge = {
      pair: edge.pair, context: text('冲突图','Conflict graph') + ' · ' + text('轨道','orbits') + ' ' + edge.orbits.join(' / '),
      source: 'work/orbgraph.bin · (0, 23)\nwork/orbwords.bin · 0, 23',
      tab: text('冲突边','Graph edge'), tone: 'conflict',
      note: text('小于 4。这两个轨道不能同时入选。','Below four. These two orbits cannot both be selected.')
    };
    if (state.reinstated) result.reinstated = {
      pair: reinstated, context: text('重新纳入的轨道','Reinstated orbit') + ' · 6019',
      source: 'work/orbwords.bin · 6019\nwork/orbvalid.bin[6019] = 0\nwork/orbvalid2.bin[6019] = 1',
      tab: text('修正预筛','Prefilter'),
      note: text('旧预筛计为 3，逐位比较得到 4。','The old filter counted three. The words differ in four positions.')
    };
    if (state.conflict) {
      delete result.edge;
      result.conflict = {
        pair: conflict, context: text('未通过的导出','Failed export') + ' · #332', source: 'jobs/332.log · L4',
        tab: text('导出冲突','Export conflict'), tone: 'conflict',
        note: text('小于 4。这份导出未计入已验证规模。','Below four. This export earned no verified checkpoint.')
      };
    }
    if (state.view === 'local') result.local = {
      pair: checks.at(-1).pair, context: text('本地通过，等待宿主核验','Local check passed · awaiting host'),
      source: 'work/cand422.txt\njobs/333.log', tab: text('候选','Candidate'),
      note: text('使用修正后的轨道映射导出。','Exported using the corrected orbit mapping.')
    };
    return result;
  }

  function alignment(example) {
    const container = document.getElementById('alignment');
    const pair = example?.pair || ['··········','··········'];
    const cells = document.createDocumentFragment();
    let differences = 0;
    for (let i = 0; i < 10; i++) {
      const changed = pair[0][i] !== pair[1][i];
      if (changed) differences++;
      const cell = document.createElement('span');
      cell.className = 'position-cell' + (changed ? ' changed' : '');
      const top = document.createElement('span');
      const bottom = document.createElement('span');
      top.textContent = pair[0][i];
      bottom.textContent = pair[1][i];
      cell.append(top, document.createElement('i'), bottom);
      cells.append(cell);
    }
    container.replaceChildren(cells, scan);
    panel.dataset.tone = example ? example.tone || 'valid' : 'waiting';
    motion.setReady(Boolean(example));
    const context = example?.context || text('等候第一组码字','Waiting for the first word pair');
    document.getElementById('pair-context').textContent = context;
    document.getElementById('distance-value').textContent = example ? differences + ' / 10' : '— / 10';
    document.getElementById('distance-note').textContent = example?.note || text('每一列对应一个碱基位置。','Each column is one letter position.');
    container.setAttribute('aria-label', example
      ? context + ' · ' + pair.join(' / ') + ' · ' + text('Hamming 距离','Hamming distance') + ' ' + differences
      : context);
  }

  function time(utc) { return Date.parse(dnaArchive.day + 'T' + utc + 'Z'); }
  const elapsed = utc => (time(utc) - time(dnaArchive.start)) / 60000;
  function chart(receipts, utc) {
    const svg = document.getElementById('trace');
    const width = Math.max(220, svg.clientWidth), height = svg.clientHeight || 176;
    const left = 47, right = width - 16, top = 13, bottom = height - 27;
    const x = minutes => left + (right-left) * minutes / 300;
    const y = size => bottom - (bottom-top) * (size-600) / 1200;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    let drawing = '';
    for (const size of [800,1200,1600,1800]) {
      drawing += `<path class="grid-line" d="M${left} ${y(size)}H${right}"/><text x="${left-7}" y="${y(size)+3}" text-anchor="end">${fmt(size)}</text>`;
    }
    for (const minutes of [0,60,120,180,240,300]) {
      drawing += `<text x="${x(minutes)}" y="${bottom+18}" text-anchor="middle">${minutes}</text>`;
    }
    drawing += `<path class="base-line" d="M${left} ${y(676)}H${right}"/>`;
    if (receipts.length) {
      const points = receipts.map(c => [x(elapsed(c.utc)), y(c.size)]);
      let path = 'M' + points[0].join(' ');
      for (const [px,py] of points.slice(1)) path += 'H' + px + 'V' + py;
      path += 'H' + x(Math.min(300,elapsed(utc)));
      drawing += `<path class="series-line" d="${path}"/>`;
      points.forEach(([px,py], i) => {
        const c = receipts[i];
        drawing += `<circle cx="${px}" cy="${py}" r="${i === points.length-1 ? 4.2 : 2.8}"><title>${c.utc} UTC · ${fmt(c.size)}</title></circle>`;
      });
      const [lastX,lastY] = points.at(-1);
      const rightAligned = lastX > right-40;
      drawing += `<text class="point-label" x="${lastX + (rightAligned ? -4 : 4)}" y="${lastY-9}" text-anchor="${rightAligned ? 'end' : 'start'}">${fmt(receipts.at(-1).size)}</text>`;
      if (points.length > 1) {
        drawing += `<text class="point-label" x="${points[0][0]}" y="${points[0][1]+15}">${fmt(receipts[0].size)}</text>`;
      }
    }
    svg.innerHTML = drawing;
    const last = receipts.at(-1);
    const empty = document.getElementById('trace-empty');
    empty.hidden = Boolean(last);
    document.getElementById('checkpoints').textContent = last
      ? fmt(last.size) + ' · ' + text('回执 ↗','Receipts ↗') : text('回执 ↗','Receipts ↗');
    svg.setAttribute('aria-label', document.getElementById('chart-title').textContent + ' · ' + (last
      ? text('当前','Current') + ' ' + fmt(last.size)
      : empty.textContent));
  }
  return {alignment, examples, chart, elapsed};
})();
