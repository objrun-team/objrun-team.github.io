'use strict';

// The shared crew renderer calls these two functions for its accessible signal labels.
function updateText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function tr(value, ...args) {
  if (Array.isArray(value)) return window.replayLocale.text(...value);
  const packets = {
    '执行回执': ['执行回执','Execution receipt'], '提交脚本': ['提交任务','Submit task'],
    '定位错误': ['检查错误','Inspect error'], '确认收到': ['确认收到','Acknowledge'],
    '内核确认': ['内核确认','Kernel acknowledgement'], '任务请求': ['查询记录','Query records'],
    '数据库记录': ['数据库记录','Database record'], '验证结果': ['验证结果','Check result'],
    '提交证书': ['提交核验材料','Submit evidence'], '提交坐标': ['提交核验材料','Submit evidence'],
    '{0}，{1}。本次交接：{2}': ['{0} · {1} · {2}', '{0} · {1} · {2}']
  };
  const message = packets[value] ? window.replayLocale.text(...packets[value]) : value;
  return message.replace(/\{(\d+)\}/g, (_, i) => args[i]);
}

(() => {
  const byId = id => document.getElementById(id);
  const local = (zh, en) => window.replayLocale.text(zh, en);
  const roles = {
    ai: {name:['AI 工作区','AI workspace'],color:'#c2a5e8'},
    run: {name:['Run 内核','Run kernel'],color:'#e8b971'},
    db: {name:['SQLite 数据库','SQLite database'],color:'#91bfd6'},
    result: {name:['独立验证器','Verifier'],color:'#a6c9a5'}
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const {proofs, baseline, records} = rnaArchive;
  const steps = rnaSteps;
  const indexOf = new Map();
  let duration = 0;
  for (const [i, step] of steps.entries()) {
    indexOf.set(step.id, i);
    step.start = duration;
    step.seconds = i === 0 ? 4 : step.id === 'final' ? 8 : 6;
    duration += step.seconds;
  }
  const seek = byId('story-seek'), select = byId('chapter-select');
  seek.max = duration;
  const clock = time => [Math.floor(time/60), Math.floor(time)%60].map(n => String(n).padStart(2,'0')).join(':');
  byId('duration').textContent = clock(duration);
  const stages = steps.map((step, i) => {
    const option = new Option('', String(i));
    select.add(option);
    return option;
  });
  let position = 0, current = -1, playing = false, rate = .75, frame = 0, lastFrame = null;
  let selectedMotif = 0, openRole = null, resumeAfterDialog = false;
  let activeProof = '', latestNotes = {};
  const passed = id => current >= indexOf.get(id);
  const pairing = drawPairing(byId('pairing'));
  const motifNames = [['核心','Core'],['发夹 I','Hairpin I'],['发夹 II','Hairpin II'],['发夹 III','Hairpin III']];
  const motifButtons = motifNames.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => {
      if (i === selectedMotif) return;
      selectedMotif = i;
      renderMotif(true);
    });
    byId('motif-tabs').append(button);
    return button;
  });
  byId('pairing').addEventListener('click', event => {
    const motif = event.target.closest('[data-motif]');
    if (motif) motifButtons[Number(motif.dataset.motif)].click();
  });

  function enter(element) {
    if (reduced.matches || !element.animate) return;
    element.getAnimations().filter(animation => animation.id === 'checkpoint').forEach(animation => animation.cancel());
    element.animate([
      {opacity:.45, filter:'blur(1.6px)', transform:'translateY(2px)'},
      {opacity:1, filter:'blur(0)', transform:'translateY(0)'}
    ], {id:'checkpoint',duration:450,easing:'cubic-bezier(.22,.78,.27,1)'});
  }

  function renderMotif(animate) {
    const ready = passed('target');
    pairing.motion.setReady(ready);
    updateText(byId('target-status'), ready ? '#52' : local('#52 · 归档预览','#52 · Archive preview'));
    const motif = tr(motifNames[selectedMotif]);
    const figure = byId('pairing');
    figure.toggleAttribute('data-covered', Boolean(activeProof));
    figure.toggleAttribute('data-rechecked', activeProof === 'replay');
    const checked = activeProof ? local('四个基序均已完整核对。','All four motifs have complete checks. ') : '';
    figure.setAttribute('aria-label', local('目标基序连接示意。','Schematic motif connections. ') + checked + local('已选择','Selected: ') + motif);
    motifButtons.forEach((button, i) => {
      updateText(button, tr(motifNames[i]));
      button.setAttribute('aria-pressed', String(i === selectedMotif));
      pairing.groups[i].classList.toggle('selected', i === selectedMotif);
    });
    const component = proofs[activeProof]?.components[selectedMotif];
    updateText(byId('rivals'), component ? String(component.rivals) : '—');
    updateText(byId('coverage'), component ? component.visited.toLocaleString('en-US') : '—');
    renderProofPanels();
    if (animate) enter(byId('coverage').closest('.readout'));
  }

  // Each bar starts at zero and appears only with an archived value. Keep the upward decimal enclosure.
  function displayBound(value) {
    const [whole, decimal] = value.split('.');
    const places = 9;
    const scale = BigInt(10)**BigInt(places);
    const truncated = BigInt(whole)*scale + BigInt(decimal.slice(0,places).padEnd(places,'0'));
    const n = truncated + BigInt(/[1-9]/.test(decimal.slice(places)));
    return (n/scale).toString() + '.' + (n%scale).toString().padStart(places,'0');
  }

  function renderProofPanels() {
    const proof = proofs[activeProof];
    const proofLabel = activeProof === 'replay' ? local('独立重算','Independent replay') : activeProof || '—';
    updateText(byId('coverage-checkpoint'), proofLabel);
    const header = document.createElement('li');
    header.className = 'coverage-head';
    for (const label of [local('基序','Motif'), local('竞争结构','Rivals'), local('已核对赋值','Assignments checked')]) {
      header.append(Object.assign(document.createElement('span'), {textContent:label}));
    }
    const factors = document.createElement('ol');
    const rows = motifNames.map((name, i) => {
      const component = proof?.components[i];
      const label = tr(name);
      const row = document.createElement('li');
      row.dataset.selected = String(i === selectedMotif);
      const count = component?.visited.toLocaleString('en-US') ?? '—';
      const countLabel = component ? count + ' / ' + component.assignment_count.toLocaleString('en-US') : '—';
      row.append(Object.assign(document.createElement('span'), {textContent:label}),
        Object.assign(document.createElement('strong'), {textContent:component?.rivals ?? '—'}),
        Object.assign(document.createElement('strong'), {textContent:count, title:countLabel}));
      const factor = document.createElement('li');
      factor.dataset.selected = row.dataset.selected;
      factor.append(document.createTextNode(label), Object.assign(document.createElement('b'), {
        textContent:component ? displayBound(component.upper).slice(0, 8) + '…' : '—',
        title:component?.upper ?? ''
      }));
      factors.append(factor);
      return row;
    });
    byId('component-coverage').replaceChildren(header, ...rows);
    updateText(byId('coverage-foot'), proof
      ? local('四个基序均已完整核对。','All four motifs have complete coverage.')
      : local('等待首份具备完整覆盖的检查记录。','Waiting for a check with complete coverage.'));
    const total = document.createElement('div');
    total.className = 'proof-total';
    total.append(Object.assign(document.createElement('span'), {textContent:local('整体上界','Overall bound')}),
      Object.assign(document.createElement('output'), {textContent:proof ? displayBound(proof.probability_upper) : '—'}));
    byId('proof-product').replaceChildren(factors, total);
    updateText(byId('product-foot'), proof
      ? local('四项相乘。最终上界向上舍入显示。','Multiply all four factors. The displayed total is rounded up.')
      : local('边界匹配且覆盖完整后，才能合成整体上界。','The overall bound requires compatible boundaries and complete coverage.'));
  }

  const bars = [
    {at:'target', name:['基线','Baseline'], value:baseline},
    ...['002','003','004'].map((key,i) => ({at:['trial2','trial3','trial4'][i],name:['试验 '+key,'Trial '+key],value:proofs[key].probability_upper}))
  ];
  for (const [i,bar] of bars.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bar-row';
    button.dataset.kind = i === 0 ? 'cache' : 'trial';
    button.innerHTML = '<span class="bar-label"></span><span class="scale" aria-hidden="true"><i class="bar"></i></span><span class="chart-value"></span>';
    button.addEventListener('click', () => jumpTo(bar.at));
    byId('bound-chart').append(button);
    bar.element = button;
  }
  byId('bound-chart').insertAdjacentHTML('beforeend','<div class="axis-row" aria-hidden="true"><span></span><span class="axis"><span>0</span><span>0.10</span><span>0.20</span></span></div>');

  function renderBounds(animate) {
    const latest = bars.filter(bar => passed(bar.at)).at(-1);
    for (const bar of bars) {
      const button = bar.element, reached = passed(bar.at), visible = reached || bar === bars[0];
      const label = tr(bar.name);
      button.disabled = !reached;
      button.classList.toggle('latest', latest === bar);
      updateText(button.firstElementChild,label);
      const value = visible ? displayBound(bar.value) : '—';
      updateText(button.lastElementChild,value);
      button.querySelector('.bar').style.width = visible ? Number(bar.value)*500 + '%' : '0';
      button.setAttribute('aria-label', label + ' · ' + (visible ? value : local('等待记录','Waiting for record')));
    }
    updateText(byId('current-bound'), displayBound((latest ?? bars[0]).value));
    let status = local('归档基线预览','Archived baseline preview');
    if (latest === bars[0]) status = local('作者缓存','Author cache');
    if (activeProof) {
      const host = activeProof === 'replay' || (activeProof === '002' && passed('receipt2')) || (activeProof === '003' && passed('receipt3'));
      status = host ? local('宿主已验收','Host verified') : local('本地检查完成','Local check complete');
    }
    if (passed('final')) status = local('独立重算一致','Independent replay matched');
    updateText(byId('proof-status'),status);
    byId('proof-status').disabled = !latest;
    const delta = latest ? (1-Number(latest.value)/Number(baseline))*100 : 0;
    const drop = delta && delta.toFixed(delta<.01?4:2);
    updateText(byId('improvement'), drop ? local('较原界收紧 '+drop+'%',drop+'% tighter') : '');
    if (animate) enter(byId('current-bound'));
  }

  // Branch states are reductions over checkpoints, including interrupted and local-only work.
  const branches = [
    {id:'root',at:'start',name:['上界搜索','Bound search']},
    {id:'primary',parent:'root',at:'target',name:['#52 · Repetitious Sequences 8/10','#52 · Repetitious Sequences 8/10']},
    {id:'one',parent:'primary',at:'trial1',name:['试验 001','Trial 001'],states:[['trial1','pending','检查中','Checking'],['inputOnly','blocked','仅有输入','Input only']]},
    {id:'two',parent:'primary',at:'trial2',name:['试验 002','Trial 002'],states:[['trial2','candidate','已覆盖','Covered'],['receipt2','verified','已验收','Verified']]},
    {id:'fallback',parent:'root',at:'backup',name:['#61 · Chicken feet','#61 · Chicken feet'],states:[['backup','pending','探索中','Exploring'],['stop','blocked','原界保留','Baseline retained']]},
    {id:'three',parent:'primary',at:'start3',name:['试验 003','Trial 003'],states:[['start3','pending','检查中','Checking'],['trial3','candidate','已覆盖','Covered'],['receipt3','verified','已验收','Verified']]},
    {id:'split',parent:'primary',at:'split',name:['核心分解','Core split']},
    {id:'a',parent:'split',at:'split',name:['分支 A','Branch A'],states:[['split','repeat','仅局部界','Local only']]},
    {id:'b',parent:'split',at:'split',name:['分支 B','Branch B'],states:[['split','blocked','边界不符','Boundary failed']]},
    {id:'four',parent:'primary',at:'start4',name:['试验 004','Trial 004'],states:[['start4','pending','检查中','Checking'],['trial4','candidate','已覆盖','Covered'],['final','verified','已验收','Verified']]},
    {id:'backupCheck',parent:'fallback',at:'backupStart',name:['作业 186','Job 186'],states:[['backupStart','pending','检查中','Checking'],['backupStop','blocked','已中断','Interrupted']]},
    {id:'host',parent:'four',at:'final',name:['独立重算','Independent replay'],states:[['final','verified','一致','Matched']]}
  ];
  const branchElements = new Map();
  for (const branch of branches) {
    const li = document.createElement('li');
    li.dataset.branch = branch.id;
    li.innerHTML = '<button type="button"><span></span><span class="branch-status"></span></button>';
    li.firstElementChild.addEventListener('click', () => jumpTo(branch.at));
    branchElements.set(branch.id,li);
  }
  function renderTree(animate) {
    for (const branch of branches) {
      const li = branchElements.get(branch.id);
      if (!passed(branch.at)) {li.remove(); continue;}
      if (!li.isConnected) {
        let list = byId('search-tree');
        if (branch.parent) {
          const parent = branchElements.get(branch.parent);
          list = parent.querySelector(':scope > ul');
          if (!list) {list = document.createElement('ul'); parent.append(list);}
        }
        list.append(li);
        if (animate) enter(li);
      }
      const button = li.firstElementChild;
      const state = branch.states?.filter(([id])=>passed(id)).at(-1);
      li.dataset.state = state?.[1] || '';
      button.toggleAttribute('data-current', branch.id === steps[current].branch);
      if (branch.id === steps[current].branch) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
      updateText(button.firstElementChild,tr(branch.name));
      updateText(button.lastElementChild,state ? local(state[2],state[3]) : '');
    }
  }

  function source(key) {
    if (!key.startsWith('proof')) return records[key];
    const id = key.slice(5), p = proofs[id];
    const path = id === 'replay' ? 'final/target-52-independent-replay/report.json' : 'work/trial-'+id+'/report.json';
    const counts = p.components.map((part,i) =>
      [i, part.rivals, part.visited, part.assignment_count].join('    ')).join('\n');
    return {path, excerpt:[
      'target_id = '+p.target_id, 'valid = '+p.valid, 'complete = '+p.complete, '',
      'component    rivals    visited    assignment_count', counts, '',
      'probability_upper = '+p.probability_upper, 'certificate_sha256 = '+p.certificate_sha256
    ].join('\n')};
  }
  function renderRecord() {
    const boundNote = openRole === 'bound';
    const note = boundNote ? {
      entry: activeProof ? ['proof'+activeProof, '完整覆盖的四个基序可沿保留的边界配对组合。各基序的一致上界相乘，给出整体概率上界。', 'The four motifs combine along preserved boundary pairs. The product of their uniform bounds gives an upper bound for the whole target.'] : ['targets','目标结构与比较基线在搜索前冻结。','The target structure and comparison baseline were frozen before search.'],
      utc: activeProof ? steps.find(step => step.proof === activeProof).utc : steps[indexOf.get('target')].utc
    } : latestNotes[openRole];
    if (!note) return;
    const [key,zh,en] = note.entry;
    const record = source(key);
    const reading = byId('record-reading');
    reading.replaceChildren();
    updateText(byId('record-title'), boundNote ? local('整体概率上界','Overall upper bound') : tr(roles[openRole].name));
    const speech = document.createElement('p');
    speech.textContent = note.utc+' UTC · '+local(zh,en);
    const path = document.createElement('code');
    path.className = 'record-path';
    path.textContent = record.path;
    const context = document.createElement('p');
    context.className = 'field-note';
    context.textContent = local('run-20261030-a · 档案字段与原文节选','run-20261030-a · Selected fields and excerpts');
    const pre = document.createElement('pre');
    pre.textContent = record.excerpt;
    reading.append(speech,path,context,pre);
    if (key.startsWith('proof')) {
      const id = key.slice(5), p = proofs[id];
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = local('查看分量上界与舍入代码','Component bounds and rounding code');
      details.append(summary);
      if (id === 'replay') {
        const audit = document.createElement('p');
        audit.textContent = local('核心有 5 个配对变量和 10 个未配对变量，完整赋值域为','The core has 5 paired and 10 unpaired variables, giving')+' 6⁵ × 4¹⁰ = 8,153,726,976.';
        const citation = document.createElement('code');
        citation.className = 'record-path';
        citation.textContent = 'final/replay-domain-audit.json';
        details.append(citation,audit);
      }
      const sourcePath = document.createElement('code');
      sourcePath.className = 'record-path'; sourcePath.textContent = record.path;
      const components = document.createElement('pre');
      components.textContent = p.components.map((component, i) => tr(motifNames[i])+' ≤ '+component.upper).join('\n');
      const codePath = document.createElement('code');
      codePath.className = 'record-path'; codePath.textContent = 'checker/check.py';
      const code = document.createElement('pre');
      code.textContent = records.guard.excerpt+'\n\n'+records.round.excerpt;
      details.append(sourcePath,components,codePath,code);
      reading.append(details);
    }
  }
  function renderArchive() {
    const rows = [
      [local('档案目录','Run directory'),'rna-bound-search/run-20261030-a'],
      [local('当前检查点','Checkpoint'),steps[current].utc+' UTC · 2026-10-30'],
      [local('当前上界','Current upper bound'),byId('current-bound').textContent]
    ];
    if (passed('stop')) {
      rows.push([local('搜索时长','Time to search stop'),'02:07:22'],
        [local('有回执的费用','Receipted cost'),'US$1.017070052 · 336 / 337'],
        [local('费用未知的请求','Request with unknown charge'),'#318']);
    }
    if (passed('final')) rows.push([local('主目标证书','Primary certificate'),proofs.replay.certificate_sha256],
      [local('备用目标','Fallback target'),local('#61 · 原界保留','#61 · baseline retained')]);
    const facts = byId('archive-facts');
    facts.replaceChildren();
    for (const [name,value] of rows) {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent=name; dd.textContent=value; row.append(dt,dd); facts.append(row);
    }
  }
  function openDialog(dialog) {
    resumeAfterDialog = playing;
    pause();
    dialog.showModal();
  }
  function inspectRole(role) {
    openRole = role; renderRecord(); openDialog(byId('record-dialog'));
  }
  byId('proof-status').addEventListener('click', () => inspectRole('bound'));
  byId('archive-button').addEventListener('click', () => {renderArchive(); openDialog(byId('archive'));});
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.querySelector('.dismiss').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {if (e.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) dialog.close();
    }});
    dialog.addEventListener('close', () => {
      openRole = null;
      if (resumeAfterDialog) play();
      resumeAfterDialog = false;
    });
  }
  function renderStep(animate) {
    const step = steps[current];
    const oldProof = activeProof;
    activeProof = ''; latestNotes = {};
    for (const item of steps.slice(0,current+1)) {
      activeProof = item.proof || activeProof;
      for (const [role,entry] of Object.entries(item.notes)) latestNotes[role] = {entry,utc:item.utc};
    }
    select.value = String(current);
    updateText(byId('story-title'),tr(step.title));
    updateText(byId('utc'),step.utc+' UTC');
    byId('utc').dateTime = '2026-10-30T'+step.utc+'Z';
    const visible = steps.slice(0,current+1);
    const points = [];
    for (const item of visible) {
      const report = {receipt2:'002',receipt3:'003',final:'replay'}[item.id];
      const val = item.id==='target' ? baseline : proofs[report]?.probability_upper;
      if (val) points.push({at:item.start,utc:item.utc,value:Number(val),label:displayBound(val)});
    }
    if (!points.length) points.push({at:0,utc:steps[0].utc,value:Number(baseline),label:displayBound(baseline)});
    const evidence = Object.fromEntries(Object.entries(latestNotes).map(([role,{entry}])=>{
      const record = source(entry[0]);
      return [role,{file:record.path,excerpt:record.excerpt}];
    }));
    const note = step.notes[step.to] ?? Object.values(step.notes).at(-1);
    caseStory.show({index:current,start:step.start,end:step.start+step.seconds,from:step.from,to:step.to,chapter:current,description:local(note[1],note[2]),records:evidence,
      phase:['inputOnly','backupStop','split'].includes(step.id)?'reject':step.id==='final'?'accept':'run',
      focus:step.proof?[2,3]:[0,1],
      score:{points,limits:[Number(proofs.replay.probability_upper),Number(baseline)],unit:points.length===1?local('作者参考上界','Reference upper bound'):local('已验收概率上界','Accepted upper bound'),
        note:activeProof && !['final','receipt2','receipt3'].includes(step.id) ? local('最近验收值','Latest accepted bound') : local('目标 #52','Target #52'),
        startUtc:steps[0].utc,endUtc:steps.at(-1).utc,utc:step.utc}});
    if (animate) enter(byId('story-title'));
    renderBounds(animate && oldProof !== activeProof);
    renderMotif(animate && oldProof !== activeProof);
    renderTree(animate);
    if (animate && (step.id === 'target' || oldProof !== activeProof)) enter(byId('pairing'));
    if (openRole) renderRecord();
    if (byId('archive').open) renderArchive();
  }
  function updateTransport() {
    document.getElementById('story-view').dataset.playing=String(playing);
    const end = position >= duration;
    const label = playing ? local('暂停','Pause') : end ? local('重播','Replay') : local('播放','Play');
    updateText(byId('story-play').querySelector('span'),label);
    byId('story-play').querySelector('use').setAttribute('href',playing ? '#i-pause' : '#i-play');
    byId('story-prev').disabled = position <= 0;
    byId('story-next').disabled = current >= steps.length-1;
    updateText(byId('story-speed'),rate+'×');
    byId('story-speed').setAttribute('aria-label',local('切换速度，当前 ','Change speed, currently ')+rate+'×');
  }
  function draw(time, force=false) {
    position = Math.max(0,Math.min(duration,time));
    const next = steps.findLastIndex(step => step.start <= position);
    if (next !== current || force) {
      const animate = current !== -1 && !force;
      current = next; renderStep(animate); updateTransport();
    }
    const step = steps[current], progress = (position-step.start)/step.seconds;
    caseStory.travel(progress);
    seek.value = position;
    seek.style.setProperty('--played',position/duration*100+'%');
    seek.setAttribute('aria-valuetext',clock(position)+' · '+tr(step.title));
    updateText(byId('story-timecode'),clock(position));
    byId('story-prev').disabled = position <= 0;
  }
  function tick(now) {
    if (!playing) return;
    draw(position + (lastFrame === null ? 0 : (now-lastFrame)*rate/1000));
    lastFrame = now;
    if (position >= duration) pause(); else frame = requestAnimationFrame(tick);
  }
  function pause() {
    playing = false; cancelAnimationFrame(frame); lastFrame = null; updateTransport();
  }
  function play() {
    if (playing) return;
    if (position >= duration) draw(0);
    playing = true; lastFrame = null; updateTransport(); frame = requestAnimationFrame(tick);
  }
  function jumpTo(id) {
    pause(); draw(steps[indexOf.get(id)].start); updateTransport();
  }
  byId('story-play').addEventListener('click', () => playing ? pause() : play());
  byId('story-speed').addEventListener('click', () => {
    const rates = [.5,.75,1,1.5,2];
    rate = rates[(rates.indexOf(rate)+1)%rates.length];
    lastFrame = null; updateTransport();
  });
  byId('story-next').addEventListener('click', () => jumpTo(steps[Math.min(current+1,steps.length-1)].id));
  byId('story-prev').addEventListener('click', () => jumpTo(steps[position > steps[current].start+.15 ? current : Math.max(0,current-1)].id));
  select.addEventListener('change', () => jumpTo(steps[Number(select.value)].id));
  seek.addEventListener('input', () => {pause(); draw(Number(seek.value)); updateTransport();});
  document.addEventListener('visibilitychange', () => {lastFrame = null;});
  reduced.addEventListener('change', () => {
    if (reduced.matches) document.getAnimations().filter(a => a.id === 'checkpoint').forEach(a=>a.cancel());
    draw(position,true);
  });
  function localize() {
    const labels = {
      start:['开始','Start'], target:['冻结基线','Baseline'], trial1:['试验 001','Trial 001'],
      inputOnly:['未交回证明','Input only'], trial2:['试验 002','Trial 002'], backup:['备用目标','Fallback #61'],
      receipt2:['验收 002','Verify 002'], start3:['提交 003','Submit 003'], trial3:['试验 003','Trial 003'],
      receipt3:['验收 003','Verify 003'], resume2:['恢复阶段二','Resume phase 2'], split:['核心分解','Core split'],
      resume3:['恢复阶段三','Resume phase 3'], start4:['提交 004','Submit 004'], backupStart:['备用枚举','Fallback check'],
      backupStop:['备用枚举中断','Fallback stops'], trial4:['试验 004','Trial 004'], stop:['停止搜索','Stop search'], final:['独立终检','Final replay']
    };
    for (const [i,option] of stages.entries()) updateText(option,tr(labels[steps[i].id]));
    draw(position,true);
  }
  document.addEventListener('replaylanguagechange',localize);
  localize();
  play();
})();
