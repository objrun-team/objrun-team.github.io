// The scientific chapter supplies the clock. The DNA inspector renders each
// source cursor, context lookup, tool call and receipt from the case archive.
function createCaseExecution(archive, seek, onRoute) {
  const get = id => document.getElementById('trace-' + id);
  const text = replayLocale.text;
  const kernel = createDnaKernelTrace(archive);
  const trace = document.getElementById('story-trace');
  const focus = createDnaTraceFocus(get('window'), matchMedia('(prefers-reduced-motion: reduce)'));
  const panel = get('output'), scroll = get('output-scroll'), dock = get('output-dock');
  const history = panel.querySelector('.trace-history');
  const tree = get('branch-tree'), fields = get('return-fields'), empty = get('output-empty'), log = get('log');
  const role = {ai:'ai',run:'kernel',db:'db',result:'verifier'};
  let priorHistory = false, frame, steps = [], current = -1, previousCall, previousRequest, currentReceipt;
  let previousLocation;

  function receipt(call, request) {
    if (!call) return;
    const meta = call.receipt;
    const status = meta.running ? 'running' : meta.exitCode === 0 ? 'ok' : Number.isInteger(meta.exitCode) ? 'error' : 'received';
    const badge = meta.running ? text('运行中','running') : Number.isInteger(meta.exitCode) ? 'exit '+meta.exitCode : text('已返回','received');
    return {source:'requests/'+request+'.json · message #'+call.slot+' · '+call.label,
      body:call.output,status,badge};
  }
  function showMode(mode) {
    const reading = mode === 'context';
    const wasReading = history.hasAttribute('data-reading-context');
    if (reading && !wasReading) {priorHistory=history.open;history.open=true;}
    if (!reading && wasReading) history.open=priorHistory;
    history.toggleAttribute('data-reading-context',reading);
    if (panel.dataset.mode !== mode) {
      if (reading) {
        scroll.replaceChildren(history,tree,empty,fields);
        dock.replaceChildren(log);
      } else {
        scroll.replaceChildren(...(mode==='host' ? [empty,fields,tree] : [tree,empty,fields]));
        dock.replaceChildren(log,history);
      }
    }
    panel.dataset.mode=mode;
    dock.hidden=[...dock.children].every(node=>node.hidden);
    get('output-title').textContent=reading ? text('上下文消息','Context messages') :
      mode==='host' ? text('参数与回执','Parameters and receipt') : text('搜索路径','Search paths');
  }
  function parseValues(record) {
    if(record.fields) return Object.entries(record.fields);
    let obj;
    try {obj=JSON.parse(record.excerpt);} catch {
      return String(record.excerpt ?? '').split('\n')
        .map(line=>line.match(/^([\w.]+)\s*=\s*(.{1,150})$/)).filter(Boolean)
        .map(([,key,value])=>[key,value]).slice(0,6);
    }
    if(Array.isArray(obj) || !obj || typeof obj!=='object') return [];
    return Object.entries(obj).filter(([,v])=>v!==null && typeof v!=='object' && String(v).length<180).slice(0,6);
  }
  function database(record) {
    let {rows,sql,columns}=record;
    if(!sql) {
      const match=record.excerpt?.match(/^(select[\s\S]+?)\n\s*\n([\[{][\s\S]*)$/i);
      if(!match) return;
      sql=match[1];
      try {const obj=JSON.parse(match[2]);rows=Array.isArray(obj)?obj:obj.rows;} catch {return;}
    }
    if(!Array.isArray(rows)) return;
    columns=columns ?? Object.keys(rows[0] ?? {});
    const table=sql.match(/\bfrom\s+["']?(\w+)/i)?.[1] ?? 'SQLite';
    return {table,columns,rows:rows.map(r=>Array.isArray(r)?r:columns.map(k=>r[k])),
      sql,title:table==='tool'?text('工具表','Tool table'):text('任务表','Task rows')};
  }
  function attach(next) {
    const spec=archive.stages[next.index];
    if (!spec) throw new Error('Missing case trace for scene '+next.index);
    frame=next;
    const prior=archive.stages.slice(0,next.index).findLast(s=>s.request || s.publication);
    previousRequest=prior?.request;
    if (prior?.publication) {
      previousRequest='root:'+prior.publication;
      archive.requests[previousRequest]={task:prior.publication,units:1,root:true,rows:[]};
    }
    previousCall=archive.calls[previousRequest];
    const call=archive.calls[spec.request];
    currentReceipt=receipt(call,spec.request);
    steps=[];
    const kernelFrame={request:spec.request,slot:call?.slot,tool:call?.label,
      phase:next.phase,receipt:currentReceipt};
    if(spec.request) {
      steps.push(...kernel.moments(kernelFrame).map(step=>({...step,kernelFrame})));
    }
    if(spec.blocks) {
      const record=next.records[spec.role];
      let pairs=parseValues(record);
      if(!pairs.length && record.excerpt) pairs=[['source',record.file], [text('摘要','Summary'),record.excerpt.split('\n').find(s=>s.trim())?.slice(0,140) ?? '']];
      for(const block of spec.blocks) {
        steps.push({kind:'host', source:spec.file,pc:block.pc,lines:block.lines.map(([n])=>n),
          excerpt:Object.fromEntries(block.lines),origin:spec.publication && spec.file==='run.ts' ? 'events.jsonl · task_started' : (spec.query?.origin ?? record.file),
          fields:spec.publication && spec.file==='run.ts' && block.pc>200 ? [['task',spec.publication],['event','task_started']] : pairs,
          database:spec.query ? {...spec.query,title:text('任务表','Task rows')} :
            spec.file==='monitor.py' && spec.role==='db'?database(record):undefined,
          receipt:record.excerpt?{source:record.file,body:record.excerpt}:undefined});
      }
    }
    if(spec.publication) {
      const task=spec.publication;
      const publishAt=steps.findIndex(s=>s.excerpt?.[s.pc]?.includes("'/tasks'"));
      const remainder=steps.splice(publishAt<0?steps.length:publishAt+1);
      for(const block of archive.publication.blocks) {
        steps.push({kind:'host',source:archive.publication.file,pc:block.pc,
          lines:block.lines.map(([line])=>line),excerpt:Object.fromEntries(block.lines),task,
          origin:'events.jsonl · task_started',fields:[['task',task],['cycle','ask'],['unit',1]],
          route:block.pc===247?['kernel','db']:['db','kernel']});
      }
      archive.requests['root:'+task]={task,units:1,root:true,rows:[]};
      steps.push(...remainder.map(step=>({...step,rootRequest:'root:'+task})));
      if (next.index===0) {
        const first={request:1,receipt:{source:'requests/1.json',body:'messages: '+archive.requests[1].rows.length}};
        steps.push(...kernel.moments(first).map(step=>({...step,kernelFrame:first})));
      }
    }
    current=-1;
  }
  function route(step) {
    if(step.route) return step.route;
    if(step.kind==='host') return [role[frame.from],role[frame.to]];
    if(step.kind==='author') return ['ai','kernel'];
    if(['lookup','select','read','tool-result'].includes(step.kind)) return ['kernel','db'];
    if(['move','return'].includes(step.kind)) return ['db','kernel'];
    if(step.kind==='send') return ['kernel','ai'];
    return ['kernel','kernel'];
  }
  function tick(fraction) {
    if(!steps.length) return;
    const part=Math.max(0,Math.min(1,fraction))*steps.length;
    const index=Math.min(steps.length-1,Math.floor(part));
    const step=steps[index], changed=current!==index;
    const authors=step.kind==='author'?steps.filter(s=>s.kind==='author'):null;
    const progress=authors?Math.min(1,(part-steps.indexOf(authors[0]))/authors.length):1;
    if(!changed) {
      if(authors) {
        const cursor=kernel.type(progress);
        if(cursor && !trace.hidden) focus.show(cursor);
      }
      return;
    }
    const immediate=current<0 || Math.abs(current-index)>1;
    current=index;
    get('title').textContent=step.kind==='host'?text('运行调度','Run orchestration'):text('内核执行','Kernel trace');
    let cursor;
    if(step.kind==='host') {
      const active=step.rootRequest ?? archive.stages[frame.index].request ?? previousRequest;
      const lastCall=archive.calls[active];
      kernel.renderHost(frame,step,{lastRequest:active,lastCall,lastReceipt:receipt(lastCall,active),lastPhase:frame.phase});
      showMode('host');
    } else {
      cursor=kernel.render(step.kernelFrame,step,progress,previousCall);
      showMode(['select','read'].includes(step.kind)?'context':'kernel');
    }
    const [from,to]=route(step);
    onRoute(from,to,step.kind);
    const src=get('code').querySelector('.at');
    const sql=['lookup','select','read'].includes(step.kind) || step.database;
    let target=sql?get('sql'):cursor ?? get('units').querySelector('.current:not([hidden])');
    if(step.kind==='tool-result' || (step.kind==='host' && !sql && !fields.hidden)) target=fields;
    if(!trace.hidden) {
      focus.show(target ?? src,src,immediate);
      if(panel.dataset.mode==='context') focus.showContext(history.querySelector('.reading:not([hidden])') ?? history.querySelector('summary'),immediate);
      else focus.showContext(tree.querySelector('[aria-current=step]'),immediate);
    }
    previousLocation=target ?? src;
  }
  function stepBy(direction) {
    if(!frame || !steps.length) return;
    const width=(frame.end-frame.start)/steps.length;
    const at=current+direction;
    seek(at<0 ? Math.max(0,frame.start-.002) : at>=steps.length ? frame.end+.002 : frame.start+at*width+.001);
  }
  function inspect(actor) {
    focus.cancel();
    if(trace.hidden) return;
    if(!actor){focus.show(previousLocation,get('code').querySelector('.at'),true);return;}
    const section=document.getElementById(actor.getAttribute('aria-controls'));
    if(section===panel && panel.dataset.mode!=='host') log.open=true;
    const target=section.querySelector('.trace-caret,.at') ?? (section===panel && !fields.hidden?fields:section.querySelector('header')) ?? section;
    section.focus({preventScroll:true});
    focus.show(target);
  }
  get('window').addEventListener('dna-code-focus',e=>focus.show(e.detail));
  return {attach,tick,stepBy,inspect};
}
