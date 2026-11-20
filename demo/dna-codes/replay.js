(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const {text} = replayLocale;
  const t = pair => text(...pair);
  const fmt = n => n.toLocaleString('en-US');
  const roles = {
    ai: {color:'#c9b6f1'}, run: {color:'#e0b47b'},
    db: {color:'#99cadd'}, result: {color:'#a7d7b5'}
  };
  const roleName = id => $('name-' + id).textContent;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = $('record-dialog');
  const total = dnaScenes.at(-1).end;
  let position = 0, rate = 1, playing = false, frame = 0, previousTime = 0;
  const story = createDnaStory();
  let index = -1, snapshot, available, selectedPair, recordType, resumeAfterRecord = false;
  let localAudit, auditPending = false, auditError = false;

  function make(tag, content, cls) {
    const el = document.createElement(tag);
    if (content !== undefined) el.textContent = content;
    if (cls) el.className = cls;
    return el;
  }
  function filmTime(seconds) {
    return [Math.floor(seconds/60),Math.floor(seconds)%60].map(n => String(n).padStart(2,'0')).join(':');
  }
  function reveal(node) {
    if (reduced.matches) return;
    node.getAnimations().filter(a => a.id === 'dna-reveal').forEach(a => a.cancel());
    node.animate([
      {opacity:.35, filter:'blur(1.6px)', transform:'translateY(2px)'},
      {opacity:1, filter:'blur(0)', transform:'none'}
    ], {id:'dna-reveal', duration:450, easing:'cubic-bezier(.2,.74,.18,1)'});
  }

  // Reuse the spherical crew and its responsive cable routing. Each cue here
  // represents a single archived exchange, with one outward signal on its cable.
  class CodebookMap extends CollaborationMap {
    draw(progress) {
      if (!this.event || !this.points) return;
      this.progress = progress;
      const {from, to, fault} = this.event;
      const forward = from === 'run';
      this.signal.style.color = fault ? '#e9ab98' : roles[from].color;
      this.active.setAttribute('marker-start', forward ? 'none' : 'url(#route-arrow)');
      this.active.setAttribute('marker-end', forward ? 'url(#route-arrow)' : 'none');
      const travel = Math.min(1, progress * 1.5 * CollaborationMap.transferSpeed);
      const arrived = travel >= 1;
      const eased = reduced.matches ? Number(arrived) : travel * travel * (3-2*travel);
      const along = forward ? eased : 1-eased;
      const p = this.active.getPointAtLength(along * this.length);
      const trail = reduced.matches ? 0 : Math.min(.12,16 / this.length,eased) * Math.sin(Math.PI*travel);
      this.tail.setAttribute('stroke-dasharray',trail + ' 2');
      this.tail.setAttribute('stroke-dashoffset',-Math.max(0,forward ? along-trail : along));
      this.tail.setAttribute('opacity',trail > .001 ? '.55' : '0');
      this.tip.setAttribute('cx',p.x);
      this.tip.setAttribute('cy',p.y);
      for (const id of Object.keys(roles)) {
        this.nodes[id].closest('.station').classList.toggle('speaking',id === (arrived ? to : from));
      }
    }
  }
  const map = new CodebookMap($('collaboration-map'), roles, openRecord);

  function receiptRecord(check) {
    return {
      source: 'verifier-events.jsonl · ' + check.utc + 'Z',
      body: JSON.stringify({checked_utc: dnaArchive.day + 'T' + check.utc + 'Z',
        task: check.task, size: check.size, valid: true, independent_valid: true,
        minimum_hamming: 4, sha256: check.hash}, null, 2)
    };
  }
  function stateAt(end) {
    const state = {records: {}, speech: {}, receipts: [], nodes: [], view: null};
    let lastDbTime = '';
    for (const [i, cue] of dnaScenes.slice(0,end+1).entries()) {
      if (cue.node) state.nodes.push({...cue.node,index:i,fault:cue.fault});
      state.speech[cue.from] = cue.say;
      state.speech[cue.to] = cue.reply;
      if (cue.view) {
        state[cue.view] = true;
        state.view = cue.view === 'reference' ? 'book' : cue.view;
      }
      for (const [role, keys] of Object.entries(cue.records || {})) {
        state.records[role] = keys.map(key => dnaArchive.records[key]);
        if (role === 'db') lastDbTime = cue.utc;
      }
      if (cue.size) {
        const check = dnaArchive.checks.find(c => c.size === cue.size);
        state.receipts.push(check);
        state.check = check;
        state.records.result = state.records.run = [receiptRecord(check)];
        state.view = 'book';
      }
      if (cue.audit) state.audit = true;
    }
    const task = dnaArchive.tasks.findLast(task => task.time.slice(11,-1) <= dnaScenes[end].utc);
    if (task && task.time.slice(11,-1) > lastDbTime) {
      const id = task.id.slice(-3), size = fmt(task.threshold);
      state.speech.db = task.remaining_seconds === 0
        ? ['阶段 ' + id + ' 登记时，剩余时间为零。','Task ' + id + ' was registered with zero seconds remaining.']
        : ['阶段 ' + id + ' 已登记，门槛为 ' + size + ' 条。','Task ' + id + ' was registered with a threshold of ' + size + '.'];
      state.records.db = [{source:'events.jsonl · ' + task.time, body:JSON.stringify({...task,event:'task_started'},null,2)}];
    }
    return state;
  }
  function showAlignment(animate = false) {
    const example = available[selectedPair];
    dnaPlots.alignment(example);
    $('pair-source').disabled = !example;
    const tabs = $('pair-tabs');
    const entries = Object.entries(available);
    const keepFocus = tabs.contains(document.activeElement);
    tabs.replaceChildren();
    if (entries.length > 1) {
      for (const [key, obj] of entries) {
        const button = make('button', obj.tab);
        button.setAttribute('aria-pressed', String(key === selectedPair));
        button.addEventListener('click', () => { selectedPair = key; showAlignment(true); });
        tabs.append(button);
        if (keepFocus && key === selectedPair) button.focus({preventScroll:true});
      }
    }
    if (animate) reveal($('alignment'));
  }
  function showTree() {
    const parentLists = {};
    const tree = $('tree');
    const previousFocus = tree.contains(document.activeElement) ? document.activeElement.dataset.at : null;
    tree.replaceChildren();
    const latest = snapshot.nodes.at(-1);
    for (const node of snapshot.nodes) {
      const item = make('li');
      item.dataset.state = node.fault ? 'blocked' : 'done';
      const button = make('button');
      button.dataset.at = node.index;
      button.append(make('span',t(node.label)),make('span',dnaScenes[node.index].utc.slice(0,5),'branch-status'));
      if (node === latest) button.setAttribute('aria-current','true');
      button.addEventListener('click',() => jump(node.index));
      item.append(button);
      if (node.parent) {
        const parent = parentLists[node.parent];
        let children = parent.querySelector(':scope > ul');
        if (!children) { children = make('ul'); parent.append(children); }
        children.append(item);
      } else tree.append(item);
      parentLists[node.id] = item;
      if (previousFocus === String(node.index)) button.focus({preventScroll:true});
    }
  }

  function showScene(next, localeChange = false) {
    const old = dnaScenes[index];
    index = next;
    const cue = dnaScenes[index];
    snapshot = stateAt(index);
    available = dnaPlots.examples(snapshot);
    if (!localeChange || !available[selectedPair]) selectedPair = snapshot.view;
    $('stage-title').textContent = t(cue.title);
    $('archive-clock').textContent = cue.utc.slice(0,8) + ' UTC';
    $('archive-clock').dateTime = dnaArchive.day + 'T' + cue.utc + 'Z';
    $('exchange-direction').textContent = roleName(cue.from) + ' → ' + roleName(cue.to);
    $('map-description').textContent = $('exchange-direction').textContent + ' · ' + t(cue.title);
    $('chapter-select').value = index;
    $('prev-event').disabled = index === 0;
    $('next-event').disabled = index === dnaScenes.length-1;
    for (const role of Object.keys(roles)) {
      const speech = $('speech-' + role);
      const message = snapshot.speech[role];
      const nextText = message ? t(message) : text('等待任务。','Waiting for a task.');
      if (speech.textContent !== nextText) {
        speech.textContent = nextText;
        if (old) reveal(speech);
      }
      const record = document.querySelector('[data-record="' + role + '"]');
      const sources = snapshot.records[role];
      record.hidden = !sources;
      if (sources) record.firstElementChild.textContent = sources[0].source.split(' · ')[0].split('/').at(-1);
    }
    const prevPair = $('alignment').getAttribute('aria-label');
    showAlignment();
    if (old && prevPair !== $('alignment').getAttribute('aria-label')) reveal($('alignment'));
    showTree();
    dnaPlots.chart(snapshot.receipts, cue.utc);
    if (map.points) map.setEvent(cue);
    else map.event = cue; // The search pane gets its first geometry when opened.
    if (old) reveal($('stage-title'));
  }
  function showMenu() {
    const menu = $('chapter-select');
    menu.replaceChildren();
    let group;
    for (const [i,cue] of dnaScenes.entries()) {
      if (cue.chapter) {
        group = make('optgroup'); group.label = t(cue.chapter); menu.append(group);
      }
      group.append(new Option(t(cue.title), String(i)));
    }
  }

  function block(container, record) {
    const div = make('div',undefined,'record-block');
    div.append(make('code',record.source,'record-source'),make('pre',record.body));
    container.append(div);
  }
  function renderRecord() {
    const content = $('record-reading');
    content.replaceChildren();
    $('case-link').hidden = recordType !== 'archive';
    function paragraph(zh,en) { content.append(make('p',text(zh,en))); }
    if (recordType === 'archive') {
      $('record-title').textContent = text('运行档案','Run archive');
      paragraph('2026 年 10 月 30 日，实验窗口为 08:58:48.072–13:58:48.072 UTC。回放按事件压缩时间。曲线以实际实验分钟为横轴，每次有效规模提升绘一个点。','On 30 October 2026 the run window was 08:58:48.072–13:58:48.072 UTC. Replay time is compressed by event. The chart uses real elapsed minutes and marks each verified improvement.');
      paragraph('复现的 Table 4 规则要求长度为 10、恰有 5 个 G/C、不同码字的 Hamming 距离至少为 4、排除词内互为反向互补的三联片段，并保持集合对反向和互补操作闭合。','The reproduced Table 4 profile requires length 10, exactly five G/C letters, and a Hamming distance of at least four between distinct words. It excludes reverse-complement triple pairs within a word and requires closure under reversal and complementation.');
      auditNotes(content);
    } else if (recordType === 'receipts') {
      $('record-title').textContent = text('码本规模回执','Codebook size receipts');
      content.append(make('code','FINAL-RESULT.json · milestones / verifier-events.jsonl','record-source'));
      if (!snapshot.check) paragraph('等候首个超过参考规模的有效集合。','Waiting for the first verified improvement over the reference.');
      else {
        const table = make('table',undefined,'checkpoint-table');
        const head = table.createTHead().insertRow();
        for (const label of ['UTC',text('用时（分）','Elapsed (min)'),text('有效条数','Words')]) head.append(make('th',label));
        const body = table.createTBody();
        for (const c of snapshot.receipts) {
          const row = body.insertRow();
          for (const v of [c.utc,dnaPlots.elapsed(c.utc).toFixed(2),fmt(c.size)]) row.insertCell().textContent = v;
        }
        content.append(table);
      }
    } else if (recordType === 'pair') {
      const ex = available[selectedPair];
      $('record-title').textContent = text('距离图来源','Alignment source');
      paragraph('每列比较同一位置。Hamming 距离是两个词在多少列上不同。','Each column compares the same position in both words. Their Hamming distance counts the columns that differ.');
      const differences = [...ex.pair[0]].flatMap((v,i) => v !== ex.pair[1][i] ? [i+1] : []);
      block(content,{source:ex.source,body:ex.pair.join('\n') + '\n\n' +
        text('不同的位置','Differing positions') + '   ' + differences.join(', ') + '\n' +
        text('Hamming 距离','Hamming distance') + '   ' + differences.length});
      paragraph('码本视图显示一对达到最小距离的码字。冲突边和修正预筛视图使用归档二进制轨道表解码的例子。','The codebook view shows a pair at the minimum distance. Graph-edge and prefilter examples are decoded from the archived binary orbit tables.');
    } else {
      $('record-title').textContent = roleName(recordType);
      if (snapshot.speech[recordType]) content.append(make('p',t(snapshot.speech[recordType])));
      const sources = snapshot.records[recordType] || [];
      if (!sources.length) paragraph('此时还没有该角色的记录。','No record for this role at this point.');
      for (const record of sources) block(content, record);
      if (snapshot.audit && (recordType === 'result' || recordType === 'run')) auditNotes(content);
    }
  }
  function auditNotes(container) {
    const size = fmt(dnaArchive.checks.at(-1).size);
    const button = make('button',text('在浏览器中复算 ' + size + ' 条码本','Recheck the ' + size + '-word codebook'),'recheck');
    const output = make('p',undefined,'audit-output');
    output.setAttribute('role','status');
    if (localAudit) {
      const a = localAudit;
      const hashStatus = a.hash === dnaArchive.checks.at(-1).hash ? text('SHA-256 相符。','SHA-256 matches.') :
        a.hash ? text('SHA-256 不符。','SHA-256 mismatch.') : text('此环境无法核对 SHA-256。','SHA-256 is unavailable in this context.');
      output.textContent = a.valid
        ? text(fmt(a.unique) + ' 个互异码字通过长度、GC、片段和闭合检查。已比较 ' + fmt(a.pairs) + ' 对，最小距离为 ' + a.minimum + '。',
          fmt(a.unique) + ' distinct words pass the length, GC, fragment and closure checks. Compared ' + fmt(a.pairs) + ' pairs. Minimum distance ' + a.minimum + '.')
        : text('码本未通过本地复核。','The codebook failed the local recheck.');
      output.append(' ' + hashStatus);
    } else {
      button.disabled = auditPending;
      if (auditPending) button.textContent = text('正在复核…','Checking…');
      if (auditError) output.textContent = text('复核未完成，可重试。','The check did not finish. Try again.');
      button.addEventListener('click', async () => {
        if (auditPending) return;
        auditPending = true;
        auditError = false;
        button.disabled = true;
        button.textContent = text('正在复核…','Checking…');
        try { localAudit = await verifyDnaCertificate(dnaCertificateText); }
        catch { auditError = true; }
        finally {
          auditPending = false;
          if (dialog.open) renderRecord();
        }
      });
      container.append(button);
    }
    container.append(output);
    block(container,dnaArchive.records.finalCode);
    container.append(make('p',text(
      '严格的反向及反向互补全对距离审计中，两项最小值均为 0。1,688 是在复现构造规则下已达到的规模，最优性尚未证明。',
      'The separate all-pairs reverse and reverse-complement audits both give minimum distance zero. The run establishes a codebook of size 1,688 under the reproduced construction rules. Optimality is open.'
    ),'scope-note'));
  }
  function openRecord(type) {
    recordType = type;
    resumeAfterRecord = story.playing;
    story.pause();
    const cue = dnaScenes.findLastIndex(event => event.utc <= story.utc);
    if (cue !== index) showScene(Math.max(0,cue));
    renderRecord();
    dialog.showModal();
  }

  function draw(forceLocale = false) {
    let next = dnaScenes.findIndex(cue => position < cue.end);
    if (next === -1) next = dnaScenes.length-1;
    if (next !== index || forceLocale) showScene(next, forceLocale);
    const cue = dnaScenes[index];
    map.draw((position-cue.start) / cue.seconds);
    $('seek').value = position;
    $('seek').style.setProperty('--played',(position/total*100) + '%');
    const clock = filmTime(position);
    if ($('position').textContent !== clock) {
      $('position').textContent = clock;
    }
    $('seek').setAttribute('aria-valuetext',clock + ' · ' + t(cue.title));
  }
  function tick(now) {
    if (!playing) return;
    if (previousTime) position = Math.min(total,position + (now-previousTime)*rate/1000);
    previousTime = now;
    draw();
    if (position >= total) playState(false);
    else frame = requestAnimationFrame(tick);
  }
  function showPlay() {
    $('play').querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('play').querySelector('span').textContent = playing ? text('暂停','Pause') :
      position >= total ? text('重播','Replay') : text('播放','Play');
    $('speed').setAttribute('aria-label',text('切换回放速度，当前 ','Change playback speed, currently ') + rate + '×');
  }
  function playState(next) {
    playing = next;
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (playing) {
      if (position >= total) position = 0;
      draw();
      frame = requestAnimationFrame(tick);
    }
    showPlay();
  }
  function seek(to) {
    position = Math.max(0,Math.min(total,to));
    previousTime = 0;
    draw();
    if (position === total && playing) playState(false);
    else showPlay();
  }
  function jump(to) {
    const cue = dnaScenes[to];
    if (cue) seek(cue.start);
  }
  $('seek').max = total;
  $('duration').textContent = filmTime(total);
  $('play').addEventListener('click',() => playState(!playing));
  $('prev-event').addEventListener('click',() => jump(index-1));
  $('next-event').addEventListener('click',() => jump(index+1));
  $('chapter-select').addEventListener('change',e => jump(Number(e.target.value)));
  $('seek').addEventListener('input',e => seek(Number(e.target.value)));
  let resumeAfterScrub = false;
  $('seek').addEventListener('pointerdown',() => {
    resumeAfterScrub = playing;
    if (playing) playState(false);
  });
  function finishScrub() {
    if (resumeAfterScrub && position < total) playState(true);
    resumeAfterScrub = false;
  }
  window.addEventListener('pointerup',finishScrub);
  window.addEventListener('pointercancel',finishScrub);
  $('speed').addEventListener('click',() => {
    const rates = [1,2,4,.5];
    rate = rates[(rates.indexOf(rate)+1)%rates.length];
    $('speed').textContent = rate + '×';
    showPlay();
  });
  for (const [id,type] of [['archive-button','archive'],['checkpoints','receipts'],['pair-source','pair']]) {
    $(id).addEventListener('click',() => openRecord(type));
  }
  document.querySelectorAll('[data-record]').forEach(btn => btn.addEventListener('click',() => openRecord(btn.dataset.record)));
  $('close-record').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {
    if (resumeAfterRecord) story.play();
  });
  document.addEventListener('visibilitychange',() => { previousTime = 0; });
  document.addEventListener('replaylanguagechange',() => {
    story.render();
    showMenu();
    draw(true);
    showPlay();
    if (dialog.open) renderRecord();
  });
  new ResizeObserver(() => {
    if (snapshot) dnaPlots.chart(snapshot.receipts,dnaScenes[index].utc);
  }).observe($('size-chart'));
  showMenu();
  draw();
  showPlay();
  story.play();
})();
