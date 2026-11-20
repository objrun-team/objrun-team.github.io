function createDnaStory() {
  const el = id => document.getElementById('story-' + id);
  const {text} = replayLocale;
  const kernel = createDnaKernelTrace();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = dnaArchive.records;
  const referenceSize = 676;
  const previous = dnaArchive.checks.at(-2);
  const accepted = dnaArchive.checks.at(-1);
  const digits = n => n.toLocaleString('en-US');
  const clock = utc => utc.slice(0,8);
  const actor = {
    runner:['运行器','Runner'], kernel:['内核','Kernel'], ai:['AI','AI'],
    db:['数据库','Database'], verifier:['验证器','Verifier']
  };
  const reject = {
    phase:'reject', utc:'13:35:38.967', tool:'#332', request:287, slot:76, receipt:records.conflict,
    title:['1,688 条候选被拒绝','The 1,688-word candidate fails'],
    description:['任意两个码字至少要有 4 个位置不同。这一对只差 3 位。','Every pair needs at least four different letters. This pair differs in just three.']
  };
  const repair = {
    phase:'repair', utc:'13:35:57.041', tool:'#333', request:288, slot:78, receipt:records.localFixed,
    title:['AI 修正导出映射','The AI fixes the export mapping'],
    description:['用子图编号查回原始轨道编号，再重新导出同一组候选。','Look up the original orbit IDs from the subgraph indices, then export the same selection again.']
  };
  const exportFrames = [
    {...reject, at:0, pc:892, route:['kernel','db']},
    {...reject, at:9.6, pc:906, route:['db','kernel']},
    {...repair, at:13.6, utc:'13:35:44.708', tool:'#332', request:287, slot:76, receipt:records.conflict,
      pc:543, route:['kernel','ai'],
      model:dnaCallEvidence[288],
      trace:['适配器带着 #332 的失败回执发出请求。归档的模型回复发起了修正映射的工具调用。','The adapter sends the #332 failure receipt with the request. The archived model response calls the tool to correct the mapping.']},
    {...repair, at:16.5, pc:892, route:['runner','kernel'], local:true},
    {...repair, at:22.5, pc:906, route:['ai','verifier'], local:true, utc:'13:36:02.630', tool:'#334', request:289, slot:80,
      receipt:{source:'jobs/334.log',body:'1688 candidate.txt\nclosure bad 0\nTOTAL BAD 0\nOK'},
      model:dnaCallEvidence[290]},
    {at:25.5, phase:'accept', utc:accepted.utc, pc:543, route:['verifier','kernel'], tool:'verify', request:290, slot:82,
      title:['宿主验收 1,688 条','The host verifies 1,688 words'],
      description:['独立检查也通过。已验证码本由 1,684 条增加到 1,688 条。','The independent check agrees. The verified codebook grows from 1,684 to 1,688 words.'],
      receipt:{source:'verify · candidate.txt',body:'{\n  "pass": 1,\n  "valid": true,\n  "outcome": "passed"\n}\n\nverifier-events.jsonl · ' + accepted.utc + 'Z\nsize: ' + accepted.size + '\nminimum_hamming: 4\nindependent_valid: true'},
      trace:['第 290 次请求带回 verify 成功的回执。宿主同时记录了规模 1,688、最小距离 4 的独立核验结果。','Request #290 carries the successful verify receipt. The host log records the independently checked size of 1,688 and minimum distance of four.']}
  ];
  const archiveRole = {run:'kernel',db:'db',ai:'ai',result:'verifier'};
  const requestForJob = {7:4,8:5,13:11,15:13,18:16,20:18,161:142,230:199};
  function requestEvidence(cue,items) {
    if (cue.size === 1396) {
      return {request:22,slot:44,tool:'verify',receipt:items.at(-1)};
    }
    const checkpointRequest = dnaCheckpointRequests[cue.size];
    if (checkpointRequest) {
      const call = dnaCallEvidence[checkpointRequest];
      return {request:checkpointRequest,slot:call.slot,tool:call.label,
        receipt:{source:'requests/' + checkpointRequest + '.json · message ' + call.slot,body:JSON.stringify(call.receipt,null,2)}};
    }
    for (const record of items) {
      const job = record.source.match(/^jobs\/(\d+)/)?.[1];
      const request = requestForJob[job];
      if (!request) continue;
      const tool = '#' + job;
      const slot = dnaRequestTraces[request].rows.find(row => row[2] === tool)[0];
      return {request,slot,tool,receipt:record};
    }
    return {};
  }
  const frames = [];
  const firstTask = dnaArchive.tasks[0];
  const graphBuild = {orbits:'orbits',graph:'build',reader:'build',graphfix:'build',screen:'build'};
  const nodes = new Map(dnaScenes.filter(cue => cue.node).map(cue => [cue.node.id,cue.node]));
  let duration = 0, chapter = 'setup', verified, comparison = dnaArchive.reference;
  for (const cue of dnaScenes) {
    if (cue.node?.id === 'orbits') chapter = 'graph';
    if (cue.node?.id === 'mis') chapter = 'search';
    if (cue.records?.run?.includes('end')) chapter = 'audit';
    if (cue.node?.id === 'export') {
      chapter = 'export';
      for (const point of exportFrames) {
        const best = point.phase === 'accept' ? accepted : previous;
        frames.push({...point, chapter, at:duration+point.at, verified:best,
          branch:nodes.get(point.phase === 'accept' ? 'best' : point.phase === 'repair' ? 'remap' : 'export'),
          pair:point.phase === 'reject' ? dnaArchive.conflict : accepted.pair,
          result:point.phase === 'accept' ? ['+4 条已通过宿主验收','+4 words verified by the host'] :
            point.local ? ['本地通过，等待宿主验收','Local check passed · awaiting host'] :
            point.phase === 'repair' ? ['重新导出候选','Exporting the corrected candidate'] :
            ['候选有冲突，已验证规模维持不变','Conflict found. Verified count holds.']});
      }
      duration += 29;
      verified = accepted;
      comparison = accepted.pair;
      continue;
    }
    if (cue.node?.id === 'remap' || cue.size === accepted.size) continue;
    if (cue.size) {
      verified = dnaArchive.checks.find(check => check.size === cue.size);
      comparison = verified.pair;
    }
    let pairExample = comparison;
    if (cue.view === 'edge') pairExample = dnaArchive.edge.pair;
    if (cue.view === 'reinstated') pairExample = dnaArchive.reinstated;
    const route = [archiveRole[cue.from],archiveRole[cue.to]];
    const items = Object.entries(cue.records ?? {}).flatMap(([role,keys]) =>
      keys.map(key => ({...records[key], role:archiveRole[role]})));
    if (cue.utc === dnaArchive.start) items.reverse(); // Preflight query before the run window.
    if (cue.size) items.push({
      source:'verifier-events.jsonl · ' + verified.utc + 'Z', role:'verifier',
      body:JSON.stringify({task:verified.task,size:verified.size,minimum_hamming:4,valid:true,sha256:verified.hash},null,2)
    });
    const startsFirstTask = cue.utc === firstTask.time.slice(11,-1);
    const current = {
      at:duration, utc:cue.utc, chapter, route, title:cue.title, description:cue.reply,
      action:cue.say, items, verified, pair:pairExample, phase:cue.view === 'edge' ? 'reject' : 'run', checkpoint:cue.size,
      branch:cue.node, graphView:graphBuild[cue.node?.id] ?? (chapter === 'search' ? 'search' : undefined),
      host:cue.utc === dnaArchive.start ? 'setup' : cue.audit ? 'audit' :
        cue.records?.run?.includes('end') ? 'close' : cue.records?.run?.includes('recovery') ? 'recovery' : '',
      startsFirstTask,
      result:(!verified ? ['已发表的参照值','Published benchmark'] :
        cue.audit ? ['双重核验通过','Both independent checks passed'] :
        cue.size ? ['宿主已保存此核验结果','Host checkpoint saved'] :
        ['最近一次通过核验的规模','Most recent verified checkpoint']),
      ...requestEvidence(cue,items)
    };
    frames.push(current);
    const seconds = current.request ? Math.max(cue.seconds,11) : Math.max(cue.seconds,6);
    const openingOrchestration = current.host === 'setup' || startsFirstTask;
    duration += openingOrchestration ? seconds / 2 : seconds;
    if (startsFirstTask) {
      const {result,phase} = current;
      frames.push({
        at:duration,utc:'09:00:18',chapter,route:['kernel','ai'],phase,result,pair:comparison,request:1,
        title:['内核发出首轮 AI 请求','The kernel sends the first AI request'],
        description:[`内核接手 ${firstTask.id} 的首个执行单元，读取任务描述。`,`The kernel picks up the first unit of ${firstTask.id} and reads the task brief.`],
        receipt:{source:'requests/1.json',body:'1  system\n2  user\n3  user'},
        trace:['内核把任务描述装入请求 #1，发给 AI。','The kernel sends request #1 with the task brief to AI.']
      });
      duration += 6;
      frames.push({
        at:duration,utc:'09:00:23',chapter,route:['kernel','ai'],phase,result,pair:comparison,request:2,slot:5,tool:'#4',
        title:['首批工具回执进入下一轮','The first tool results enter the next request'],
        description:['内核通过父节点找回作业 #3 和 #4 的回执。','The kernel follows parent links to recover results from jobs #3 and #4.'],
        receipt:{source:'requests/2.json · messages 4–5',body:'4  tool · job #3\n5  tool · job #4'}
      });
      duration += 12;
    }
  }

  function entrance(node, id) {
    node.getAnimations().filter(animation => animation.id === id).forEach(animation => animation.cancel());
    if (reduced.matches) return;
    node.animate([
      {opacity:.5, transform:'translateY(5px)', filter:'blur(1.75px)'},
      {opacity:1, transform:'translateY(0)', filter:'blur(0)'}
    ], {id, duration:450, easing:'cubic-bezier(.22,1,.36,1)'});
  }
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const crew = el('crew');
  const roles = [...crew.querySelectorAll('[data-role]')];
  const roleButtons = Object.fromEntries(roles.map(button => [button.dataset.role,button]));
  const rolePoints = {};
  const wireDiagram = el('wire');
  const guides = el('wire-guides');
  const wire = el('wire-path');
  const arrow = el('wire-arrow');
  const packet = el('packet');
  const rail = el('seek');
  const playButton = el('play');
  const speedButton = el('speed');
  const traceWindow = document.getElementById('trace-window');
  const traceFocus = createDnaTraceFocus(traceWindow,reduced);
  const branchPanel = document.getElementById('trace-branch-tree');
  const output = document.getElementById('trace-output');
  const outputScroll = document.getElementById('trace-output-scroll');
  const outputDock = document.getElementById('trace-output-dock');
  const receiptLog = document.getElementById('trace-log');
  const returnFields = document.getElementById('trace-return-fields');
  const outputEmpty = document.getElementById('trace-output-empty');
  const messageHistory = output.querySelector('.trace-history');
  const outputHeading = output.querySelector(':scope > header');
  let historyWasOpen = false;
  let playbackRate = .75;
  const end = duration;
  rail.max = end;
  const timeline = frames.flatMap((frame,i) => {
    const through = (frames[i+1]?.at ?? end) - frame.at;
    const engine = frame.request ? kernel.moments(frame) : [];
    const host = dnaHostMoments(frame);
    const steps = [...engine,...host];
    if (!steps.length) throw new Error('Missing trace for ' + frame.utc);
    const previousCheck = frames[i-1]?.verified;
    const receiptStep = frame.phase === 'accept' ? steps.findIndex(step => step.kind === 'send') :
      frame.checkpoint ? steps.length - 1 : 0;
    const firstWrite = steps.findIndex(step => step.kind === 'author');
    const lastWrite = steps.findLastIndex(step => step.kind === 'author');
    const writeAt = frame.at + through*firstWrite/steps.length;
    const writeEnds = frame.at + through*(lastWrite+1)/steps.length;
    return steps.map((step,j) => ({frame,step,at:frame.at + through*j/steps.length,
      writeAt,writeEnds,verified:j < receiptStep ? previousCheck : frame.verified}));
  });
  const receipts = new Map();
  let figureKey, figure, lastRequest, lastCall, lastReceipt, lastPhase;
  for (const moment of timeline) {
    const {frame,verified} = moment;
    if (frame.request) lastRequest = frame.request;
    const call = frame.model ?? dnaCallEvidence[frame.request];
    if (call) {
      lastCall = call;
      if (frame.receipt) {
        lastReceipt = frame.receipt;
        lastPhase = frame.phase;
      }
    }
    moment.lastRequest = lastRequest;
    moment.lastCall = lastCall;
    moment.lastReceipt = lastReceipt;
    moment.lastPhase = lastPhase;
    if (verified && !receipts.has(verified)) {
      receipts.set(verified,{at:moment.at,panel:'trace-output'});
    }
    const waiting = verified !== frame.verified;
    const view = frame.host === 'audit' ? 'hamming' :
      frame.phase === 'repair' || (frame.phase === 'accept' && waiting) ? 'mapping' :
      frame.graphView && (!frame.checkpoint || waiting) ? frame.graphView : 'comparison';
    const pair = waiting && verified ? verified.pair : frame.pair;
    const key = view === 'comparison' ? pair.join('/') : view;
    if (key !== figureKey) {
      figureKey = key;
      figure = {view,pair,at:moment.at};
    }
    moment.figure = figure;
  }
  const figures = createDnaStoryFigures(el,text,reduced,check => {
    const receipt = receipts.get(check);
    if (!receipt) return;
    seek(receipt.at);
    setInspection(true);
    focusEvidence(receipt.panel);
  });
  const branchTimes = new Map();
  for (const frame of frames) {
    if (!frame.branch || branchTimes.has(frame.branch.id)) continue;
    const receipt = frame.checkpoint || frame.phase === 'accept' ? receipts.get(frame.verified) : undefined;
    branchTimes.set(frame.branch.id,receipt?.at ?? frame.at);
  }
  const searchTree = createDnaBranchHistory(el('branches'),text,id => seek(branchTimes.get(id)));
  let position = 0, last = 0, handle = 0, index = -1, traceIndex = -1, playing = false, inspecting = true;
  let selectedRole, receiver, wireLength = 0, lastTravel = -1, transferKey, transferAt, transferLength, transferFrom;
  let displayedCheck, displayedFigure, fixedFigure;
  let writingRow, databaseFocus;

  function modeRoute(frame,step) {
    if (step.route) return step.route;
    if (frame.request === 1 && step.kind === 'init') return ['db','kernel'];
    if (step.kind === 'author') return ['ai'];
    if (step.kind === 'tool-result') return ['kernel','db'];
    if (step.kind === 'lookup' || step.kind === 'select') return ['kernel','db'];
    if (step.kind === 'move' || step.kind === 'read') return ['db','kernel'];
    if (step.kind === 'send') return frame.phase === 'accept' ? ['verifier','kernel'] : ['kernel','ai'];
    return ['kernel'];
  }

  function wireSegment(from,to) {
    const a = rolePoints[from], b = rolePoints[to];
    const length = Math.hypot(b.x-a.x,b.y-a.y);
    const dx = (b.x-a.x)/length, dy = (b.y-a.y)/length;
    return [a.x+dx*a.radius,a.y+dy*a.radius,b.x-dx*b.radius,b.y-dy*b.radius];
  }

  function drawWire() {
    const to = receiver?.dataset.role;
    lastTravel = -1;
    if (!to || !rolePoints[transferFrom] || to === transferFrom) {
      wire.removeAttribute('d');
      arrow.removeAttribute('d');
      wireLength = 0;
      return;
    }
    const [x1,y1,x2,y2] = wireSegment(transferFrom,to);
    const direct = transferFrom !== 'kernel' && to !== 'kernel';
    const mx = (x1+x2)/2, my = (y1+y2)/2 - (direct ? 12 : 0);
    wire.setAttribute('d',`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`);
    const length = Math.hypot(x2-mx,y2-my);
    const dx = (x2-mx)/length, dy = (y2-my)/length;
    const bx = x2-6*dx, by = y2-6*dy;
    arrow.setAttribute('d',`M${bx-3*dy} ${by+3*dx} L${x2} ${y2} ${bx+3*dy} ${by-3*dx}`);
    wireLength = wire.getTotalLength();
  }

  function layoutCrew() {
    const bounds = crew.getBoundingClientRect();
    if (!bounds.width) return;
    wireDiagram.setAttribute('viewBox',`0 0 ${crew.clientWidth} ${crew.clientHeight}`);
    for (const button of roles) {
      const {role} = button.dataset;
      const avatar = button.querySelector('.story-avatar');
      const rect = avatar.getBoundingClientRect();
      rolePoints[role] = {
        x:rect.left+rect.width/2-bounds.left,
        y:rect.top+rect.height/2-bounds.top,
        radius:avatar.clientWidth*(role === 'kernel' ? .52 : .38)
      };
    }
    guides.setAttribute('d',['ai','db','verifier'].map(role => {
      const [x1,y1,x2,y2] = wireSegment('kernel',role);
      return `M${x1} ${y1} L${x2} ${y2}`;
    }).join(' '));
    if (receiver) {
      drawWire();
      animateCrew();
    }
  }

  function showCrew(moment) {
    const {frame,step} = moment;
    const [from, to = from] = modeRoute(frame,step);
    const different = from !== to;
    const key = frame.at + '/' + from + '/' + to;
    if (transferKey !== key) {
      transferKey = key;
      transferAt = moment.at;
      transferLength = Math.min(.68,(timeline[traceIndex+1]?.at ?? end) - moment.at);
      transferFrom = from;
      crew.dataset.sender = from;
      receiver?.style.removeProperty('--arrival');
      receiver = roleButtons[to];
      drawWire();
    }
    el('handoff').textContent = (different ? [from,to] : [from]).map(role => text(...actor[role])).join(' → ');
    for (const button of roles) {
      const role = button.dataset.role;
      const sending = role === from;
      const receiving = role === to;
      const active = sending || receiving;
      button.dataset.active = String(active);
      button.setAttribute('aria-disabled',String(!active));
      const status = !active ? '' :
        frame.startsFirstTask && role === 'db' ? (receiving && !sending ? text('写入任务','Saving task') : text('任务就绪','Task ready')) :
        frame.request === 1 && step.kind === 'init' && role === 'kernel' ? text('接手任务','Picking up task') :
        frame.request === 1 && step.kind === 'send' && role === 'ai' ? text('收到请求 #1','Request #1') :
        role === 'ai' && step.kind === 'author' ? text('写调用','Writing call') :
        role === 'db' && sending ? text('返回记录','Returning rows') :
        role === 'verifier' && step.kind === 'host' ? text('核验候选','Checking') :
        sending && different ? text('发出','Sending') :
        receiving && different ? text('接收','Receiving') : text('执行','Running');
      button.querySelector('.story-role-status').textContent = status;
      const panel = {db:'trace-query',kernel:'trace-source',ai:'trace-model',verifier:'trace-output'}[role];
      button.setAttribute('aria-controls',panel);
    }
    if (selectedRole?.getAttribute('aria-disabled') === 'true') selectedRole = undefined;
    updateInspection();
  }

  function animateCrew() {
    // The same clock drives the proof, the handoff and the receiver's response.
    const age = (position-transferAt) / Math.max(.12,transferLength*.7);
    const travel = reduced.matches ? 1.6 : Math.max(0,Math.min(1.6,age));
    if (travel === lastTravel) return;
    lastTravel = travel;
    let opacity = 0;
    if (wireLength && travel > 0 && travel < 1) {
      const eased = travel * travel * (3-2*travel);
      const point = wire.getPointAtLength(wireLength*eased);
      packet.setAttribute('cx',point.x);
      packet.setAttribute('cy',point.y);
      opacity = Math.min(1,travel*9,(1-travel)*9);
    }
    packet.setAttribute('opacity',opacity);
    const arrival = wireLength && travel >= 1 && travel < 1.6 ? Math.sin(Math.PI*(travel-1)/.6) : 0;
    if (receiver) receiver.style.setProperty('--arrival',arrival.toFixed(3));
  }

  function updateInspection() {
    el('trace').querySelectorAll('[data-inspected]').forEach(panel => panel.removeAttribute('data-inspected'));
    for (const button of roles) {
      const selected = inspecting && selectedRole === button;
      button.setAttribute('aria-expanded',String(selected));
      if (selected) document.getElementById(button.getAttribute('aria-controls')).setAttribute('data-inspected','');
    }
  }

  function setInspection(open, button) {
    const appearing = open && !inspecting;
    inspecting = open;
    selectedRole = open ? button : undefined;
    el('trace').hidden = !open;
    el('inspect').setAttribute('aria-expanded',String(open));
    const label = el('inspect').querySelector('span');
    label.dataset.zh = open ? '收起执行详情' : '查看这次执行';
    label.dataset.en = open ? 'Hide execution details' : 'Inspect this step';
    label.textContent = text(label.dataset.zh,label.dataset.en);
    updateInspection();
    if (!open) {
      traceFocus.cancel();
      return;
    }
    changePlayback(false);
    if (appearing) {
      const moment = timeline[traceIndex];
      followTrace(moment,writingRow,true);
      traceFocus.swap(traceWindow);
    }
    if (button) focusEvidence(button.getAttribute('aria-controls'));
  }

  function focusEvidence(id) {
    const hostMode = output.dataset.mode === 'host';
    if (id === 'trace-output' && !hostMode) receiptLog.open = true;
    const panel = document.getElementById(id);
    panel.setAttribute('data-inspected','');
    panel.focus({preventScroll:true});
    const target = id === 'trace-output' ?
      (hostMode ? (returnFields.hidden ? outputHeading : returnFields) : document.getElementById('trace-receipt')) :
      panel.querySelector('.trace-caret') || panel.querySelector('.at') || panel.querySelector('header') || panel;
    traceFocus.show(target);
    if (document.documentElement.scrollHeight > window.innerHeight + 4) {
      traceWindow.scrollIntoView({block:'nearest',behavior:reduced.matches ? 'instant' : 'smooth'});
    }
  }

  function syncOutputPanel(mode) {
    const previous = output.dataset.mode;
    const reading = mode === 'context';
    const wasReading = messageHistory.hasAttribute('data-reading-context');
    if (reading && !wasReading) {
      historyWasOpen = messageHistory.open;
      messageHistory.open = true;
    } else if (!reading && wasReading) {
      messageHistory.open = historyWasOpen;
    }
    messageHistory.toggleAttribute('data-reading-context',reading);
    output.dataset.mode = mode;
    if (previous !== mode) {
      if (mode === 'context') {
        outputScroll.replaceChildren(messageHistory,branchPanel,outputEmpty,returnFields);
        outputDock.replaceChildren(receiptLog);
      } else if (mode === 'host') {
        outputScroll.replaceChildren(outputEmpty,returnFields,branchPanel);
        outputDock.replaceChildren(receiptLog,messageHistory);
      } else {
        outputScroll.replaceChildren(branchPanel,outputEmpty,returnFields);
        outputDock.replaceChildren(receiptLog,messageHistory);
      }
    }
    outputDock.hidden = [...outputDock.children].every(node => node.hidden);
    document.getElementById('trace-output-title').textContent = mode === 'context' ?
      text('上下文消息','Context messages') : mode === 'host' ?
      text('参数与回执','Parameters and receipt') : text('搜索路径','Search paths');
  }

  function followTrace({step,frame}, cursor, immediate = false) {
    if (!inspecting) return;
    const host = step.kind === 'host';
    const source = traceWindow.querySelector('#trace-code .at');
    const hostSql = host && ((step.source === 'runner-recovery2.ts' && (step.pc === 280 || step.pc === 281)) || step.source === 'runtime/src/tasks/publish.ts');
    const query = step.kind === 'lookup' ? 'parent' : ['select','read'].includes(step.kind) ? 'context' : hostSql ? 'host-sql' : undefined;
    const databaseTarget = query ? document.getElementById('trace-sql') :
      step.cur === undefined ? undefined : traceWindow.querySelector('#trace-units .current');
    const databaseKey = databaseTarget && `${frame.request ?? step.source}:${query ?? 'row'}:${step.hit ?? step.cur ?? step.pc ?? ''}`;
    const followTarget = !databaseKey || immediate || databaseKey !== databaseFocus;
    databaseFocus = databaseKey;
    let target = databaseTarget ?? cursor;
    if (!target && step.kind === 'author') target = document.querySelector('#trace-model-call .trace-record-line');
    if (step.kind === 'tool-result' || (step.kind === 'send' && frame.phase === 'accept')) {
      target = document.querySelector('#trace-return-fields:not([hidden])') ?? document.getElementById('trace-origin');
    }
    if (host && !hostSql && step.fields.length) {
      target = document.querySelector('#trace-return-fields:not([hidden])');
    }
    if (!host && !output.contains(target) && !receiptLog.open && !messageHistory.open) {
      traceFocus.showContext(branchPanel.querySelector('#story-branches [aria-current="step"]') ?? branchPanel.querySelector('#story-branches > ul > li > button'),immediate);
    }
    traceFocus.show(target ?? source,source,immediate,followTarget);
    if (query === 'context' && messageHistory.open) {
      const row = messageHistory.querySelector('.reading:not([hidden])');
      traceFocus.showContext(row ?? messageHistory.querySelector('summary'),immediate,Boolean(row));
    }
  }

  function checkpointChart(verified,utc,animate) {
    const x = time => 14 + Math.max(0,Math.min(300,dnaPlots.elapsed(time))) / 300 * 260;
    const y = size => 69 - (size-referenceSize) / (accepted.size-referenceSize) * 52;
    figures.chart(verified,utc,x,y,animate);
    el('base-time').textContent = dnaArchive.start.slice(0,5);
    el('gain-time').textContent = utc.slice(0,5) === dnaArchive.start.slice(0,5) ? '' : utc.slice(0,5);
    el('chart-label').textContent = verified ?
      text('小点表示核验回执。圆环表示 ' + clock(utc) + ' UTC 的当前事件，已验证规模为 ' + digits(verified.size) + ' 条。',
        'Small dots mark verified receipts. The outlined dot marks the current event at ' + clock(utc) + ' UTC, with ' + digits(verified.size) + ' verified words.') :
      text('参考码本 676 条，等待首个核验点','676-word reference, awaiting the first verified checkpoint');
  }

  function draw(force = false, settle = false, animateChart = !force && !settle) {
    const i = frames.findLastIndex(frame => frame.at <= position);
    rail.value = position;
    rail.style.setProperty('--played',position / end * 100 + '%');
    const frame = frames[i];
    const nextTrace = timeline.findLastIndex(moment => moment.at <= position);
    const moment = timeline[nextTrace];
    const traceChanged = nextTrace !== traceIndex || force;
    const authoring = moment.step.kind === 'author';
    const progress = authoring ? Math.max(0,Math.min(1,(position-moment.writeAt)/(moment.writeEnds-moment.writeAt))) : 1;
    if (traceChanged) {
      const initial = traceIndex < 0;
      const detailed = moment.step.kind !== 'host';
      traceIndex = nextTrace;
      document.getElementById('trace-title').textContent = detailed ?
        text('内核执行','Kernel trace') : text('运行调度','Run orchestration');
      if (detailed) {
        writingRow = kernel.render(moment.frame,moment.step,progress,moment.lastCall);
        syncOutputPanel(['select','read'].includes(moment.step.kind) ? 'context' : 'kernel');
      } else {
        kernel.renderHost(moment.frame,moment.step,moment);
        writingRow = undefined;
        syncOutputPanel('host');
      }
      followTrace(moment,writingRow,initial || force);
      showCrew(moment);
      el('prev').disabled = traceIndex <= 0;
      el('next').disabled = traceIndex === timeline.length-1;
    } else if (authoring) {
      const cursor = kernel.type(progress);
      if (cursor) {
        writingRow = cursor;
        if (inspecting) traceFocus.show(cursor);
      }
    }
    updateTime();
    const check = moment.verified;
    const pending = check !== frame.verified;
    const checkChanged = check !== displayedCheck;
    if (i !== index || checkChanged || force) {
      const phase = pending && frame.phase === 'accept' ? 'repair' : frame.phase;
      const candidateSize = frame.verified?.size;
      el('title').textContent = pending ?
        text('核验 ' + digits(candidateSize) + ' 条候选','Check a ' + digits(candidateSize) + '‑word candidate') : text(...frame.title);
      el('score-title').textContent = check ? text('已验证规模','Verified codebook') : text('参考码本','Reference codebook');
      el('count').textContent = digits(check?.size ?? referenceSize);
      el('result').textContent = pending ? text('等待本次核验回执','Awaiting the current verdict') : text(...frame.result);
      el('stage').dataset.phase = phase;
      checkpointChart(check,frame.utc,animateChart);
      figures.observe(frame,check);
      if (!force && check !== displayedCheck && index >= 0) entrance(el('count'),'count');
      displayedCheck = check;
    }
    if (settle) fixedFigure = moment.figure;
    else if (fixedFigure !== moment.figure) fixedFigure = undefined;
    if (moment.figure !== displayedFigure || force) {
      figures.show(moment.figure,force);
      displayedFigure = moment.figure;
    }
    figures.draw(position,fixedFigure === moment.figure);
    if (traceChanged) {
      const action = moment.step.kind === 'host' ? text(...moment.step.caption) : kernel.caption(moment.step,frame);
      const showHandoff = frame.startsFirstTask || (frame.request === 1 && moment.step.kind === 'send');
      const description = pending ?
        text('验证器检查任意两个码字是否至少相差四位。','The verifier checks that every pair differs in at least four places.') :
        showHandoff ? action : text(...frame.description);
      if (el('description').textContent !== description) el('description').textContent = description;
      rail.setAttribute('aria-valuetext',el('title').textContent + ' · ' + clock(frame.utc) + ' UTC · ' + action);
    }
    if (i === index && !checkChanged && !force) {
      animateCrew();
      return;
    }
    index = i;
    searchTree(frames.slice(0,i+1).map(point => point.branch)
      .filter(branch => branch && branchTimes.get(branch.id) <= position));
    for (const button of chapters) {
      button.setAttribute('aria-current',button.dataset.chapter === frame.chapter ? 'step' : 'false');
    }
    animateCrew();
  }

  function updateTime() {
    const seconds = Math.floor(position);
    const label = String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0');
    if (el('timecode').textContent !== label) el('timecode').textContent = label;
    el('timecode').title = clock(timeline[traceIndex]?.frame.utc ?? dnaArchive.start) + ' UTC';
  }

  function updateControls() {
    playButton.querySelector('use').setAttribute('href',playing ? '#i-pause' : '#i-play');
    playButton.querySelector('span').textContent = playing ? text('暂停','Pause') :
      position >= end ? text('重播','Replay') : text('播放','Play');
    speedButton.textContent = playbackRate + '×';
    speedButton.setAttribute('aria-label',text('回放倍速 ','Playback speed ') + speedButton.textContent);
  }

  function changePlayback(next) {
    playing = next;
    el('view').dataset.playing = String(playing);
    cancelAnimationFrame(handle);
    last = 0;
    if (playing && position >= end) position = 0;
    if (playing && position === 0) fixedFigure = undefined;
    if (playing && !document.hidden) handle = requestAnimationFrame(tick);
    updateControls();
  }
  function tick(now) {
    if (!playing) return;
    if (last) position = Math.min(end,position + (now-last)/1000*playbackRate);
    last = now;
    draw();
    if (position < end) handle = requestAnimationFrame(tick);
    else changePlayback(false);
  }
  function seek(to,animateChart = false) {
    position = to;
    changePlayback(false);
    draw(false,true,animateChart);
  }
  function stepKernel(direction) {
    const target = timeline[traceIndex+direction];
    if (target) seek(target.at,direction > 0);
  }
  rail.addEventListener('input',() => seek(Number(rail.value)));
  playButton.addEventListener('click',() => changePlayback(!playing));
  el('prev').addEventListener('click',() => stepKernel(-1));
  el('next').addEventListener('click',() => stepKernel(1));
  speedButton.addEventListener('click',() => {
    const speeds = [.5,.75,1,1.5,2];
    playbackRate = speeds[(speeds.indexOf(playbackRate)+1)%speeds.length];
    updateControls();
  });
  rail.addEventListener('keydown',event => {
    if (event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) changePlayback(!playing);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepKernel(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  el('trace').addEventListener('keydown',event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    stepKernel(event.key === 'ArrowLeft' ? -1 : 1);
  });
  for (const button of chapters) {
    button.addEventListener('click',() => seek(frames.find(frame => frame.chapter === button.dataset.chapter).at));
  }
  el('inspect').addEventListener('click',() => setInspection(!inspecting));
  traceWindow.addEventListener('dna-code-focus',event => traceFocus.show(event.detail));
  for (const button of roles) {
    button.addEventListener('click',() => {
      if (button.getAttribute('aria-disabled') !== 'true') setInspection(true,button);
    });
  }
  reduced.addEventListener('change',() => {
    if (reduced.matches) el('view').getAnimations({subtree:true}).forEach(animation => animation.cancel());
    traceFocus.cancel();
    draw(true);
  });
  document.addEventListener('visibilitychange',() => changePlayback(playing));
  layoutCrew();
  new ResizeObserver(layoutCrew).observe(crew);
  new ResizeObserver(() => {
    traceFocus.cancel();
    draw(true);
  }).observe(traceWindow);
  draw();
  changePlayback(false);
  return {
    play:() => changePlayback(true), pause:() => changePlayback(false),
    render:() => { draw(true); changePlayback(playing); },
    get utc() { return frames[index].utc; },
    seekUtc:utc => {
      const target = frames.findLastIndex(frame => frame.utc <= utc);
      if (Math.max(0,target) !== index) seek(frames[Math.max(0,target)].at);
    },
    get playing() { return playing; }
  };
}
