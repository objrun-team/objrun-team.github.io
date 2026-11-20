// Live unit IDs were not archived. Replay the known request tail using relative
// row labels and the actual positions of its call/result pairs in each request.
function createDnaKernelTrace(archive) {
  const requests = archive?.requests ?? dnaRequestTraces;
  const calls = archive?.calls ?? dnaCallEvidence;
  const modelRevisions = archive ? new Map(archive.revisionPairs.map(([a,b])=>[calls[a],calls[b]])) : dnaCallRevisions;
  const taskTable = archive?.taskTable ?? 'task_dna_search';
  const messageTable = archive?.messageTable ?? 'agent_dna_msg';
  const reachesRoot = request => archive ? requests[request].root : request <= 2;
  const el = id => document.getElementById('trace-' + id);
  const {text} = replayLocale;
  const cycles = ['ask','act','ask','act','ask'];
  const unit = index => 'u' + index;
  const unitsFor = request => archive ? requests[request].units : reachesRoot(request) ? request*2-1 : cycles.length;
  const contextRow = row => row[1] !== 'system' && row[2] !== 'task-view';

  function element(tag, value) {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    return node;
  }

  const codeBlocks = (archive?.kernelSource ?? dnaKernelSource).map(([start,lines]) => {
    const rows = lines.map((line,i) => {
      const snippet = withoutDnaCodeComments(line);
      if (!snippet && line.trim()) return null;
      const row = element('div');
      row.className = 'kt-code-row';
      const code = element('code');
      paintDnaCode(code,dnaCodeTokens(snippet));
      row.append(element('span',start+i),code);
      return row;
    });
    return {start,rows};
  });
  let sourceBlock;
  const loopback = document.createElementNS('http://www.w3.org/2000/svg','svg');
  loopback.id = 'trace-loopback';
  loopback.setAttribute('aria-hidden','true');
  const turn = document.createElementNS(loopback.namespaceURI,'path');
  loopback.append(turn);
  const modelEditor = createDnaTraceModel(modelRevisions);
  const taskRows = cycles.map((cycle,i) => {
    const row = element('tr');
    row.append(element('td',cycle),element('td',unit(i)),element('td',cycles[i-1] ?? '…'),element('td',i ? unit(i-1) : '…'));
    if (i) {
      const tip = row.lastElementChild;
      tip.insertAdjacentHTML('beforeend','<svg class="kt-parent" viewBox="0 0 18 34" aria-hidden="true"><path d="M1 34 C19 34 19 0 1 0 M4 -3 1 0l3 3"/></svg>');
    }
    return row;
  });
  el('units').append(...taskRows);
  const messageRows = Array.from({length:6},() => {
    const row = element('tr');
    row.append(element('td'),element('td'),element('td'));
    el('messages').append(row);
    return row;
  });

  function moments({pc,request,model}) {
    const rows = requests[request].rows;
    const count = rows.filter(contextRow).length;
    const all = cycles.slice(0,unitsFor(request)).map((_,i) => i);
    const collected = [
      {pc:906, kind:'select', line:all, shown:0},
      {pc:906, kind:'read', line:all, shown:Math.ceil(count/2)},
      {pc:939, kind:'return', line:all, shown:count}
    ];
    if (count > 1) collected.splice(2,0,{pc:906,kind:'read',line:all,shown:count});
    const sent = {pc:543,kind:'send',line:all,shown:count};
    if (pc === 906) return collected;
    if (pc === 543) {
      if (model?.tool === 'run_command') {
        return [...model.steps.map(activeLine => ({pc:543,kind:'author',line:all,shown:count,activeLine})),sent];
      }
      return [sent];
    }
    const call = calls[request];
    const toolSteps = !pc && call ? [
      ...call.steps.map(activeLine => ({pc:543,kind:'author',line:[],shown:0,activeLine})),
      {pc:566,kind:'tool-result',line:[],shown:0}
    ] : [];

    const walk = [];
    const line = [];
    const add = (pc,kind,cur,hit) => walk.push({pc,kind,cur,hit,line:[...line],shown:0});
    const pending = all.at(-1);
    add(883,'init');
    add(885,'start',pending);
    add(886,'loop',pending);
    for (let cur=pending; cur>=0; cur--) {
      line.unshift(cur);
      add(890,'append',cur);
      if (!cur) {
        add(891,reachesRoot(request) ? 'root' : 'earlier',cur);
        break;
      }
      add(891,'check',cur);
      add(892,'lookup',cur,cur-1);
      add(900,'move',cur-1);
      add(886,'loop',cur-1);
    }
    if (!archive && request === 287) return walk;
    if (reachesRoot(request)) return [...toolSteps,...walk,...collected,sent];
    return [...toolSteps,...walk,...collected,...(pc ? [] : [sent])];
  }

  function caption(step,frame) {
    const cur = unit(step.cur);
    const hit = unit(step.hit);
    switch (step.kind) {
      case 'author': return text('逐字演示归档中的 AI 工具调用。','Replay the archived AI tool call as it is written.');
      case 'tool-result': return text('工具已返回。内核把回执作为消息写入上下文表。','The tool returns. The kernel stores its receipt as a context message.');
      case 'init': return text('创建空的 line[]，用来收集本轮的祖先单元。','Initialize line[] to collect the units on this request’s chain.');
      case 'start': return text('cur 从当前请求的待处理行 ' + cur + ' 开始。','Start cur at ' + cur + ', the pending unit for this request.');
      case 'append': return text('把 ' + cur + ' 放到 line[] 开头，保留由早到晚的顺序。','Prepend ' + cur + ' to line[] so earlier units come first.');
      case 'check': return text(cur + ' 有父指针，继续查询。',cur + ' has a parent pointer. Continue to the lookup.');
      case 'lookup': return text('按 from_cycle 和 from_unit 查询，命中父行 ' + hit + '。','Look up from_cycle and from_unit. SQL matches parent ' + hit + '.');
      case 'move': return text('执行 cur = up，指针移到 ' + cur + '。','Execute cur = up. The pointer moves to ' + cur + '.');
      case 'loop': return text('回到循环，从 ' + cur + ' 继续回溯。','Return to the loop and continue from ' + cur + '.');
      case 'root': return text('父键为 NULL，结束回溯。','The parent key is NULL. End the walk.');
      case 'earlier': return text('其余父行继续按同一规则回溯，此处省略重复步骤。','The remaining parent rows follow the same rule. Repeated steps are abbreviated here.');
      case 'select': return text('按 line[] 查询历史消息，先按 unit 排，再按 seq 排。','Select history for line[], ordered by unit and then seq.');
      case 'read':
        return frame.slot && step.shown === requests[frame.request].rows.filter(contextRow).length ?
          text('读到 ' + frame.tool + ' 的工具回执，对应归档消息 #' + frame.slot + '。', 'The ' + frame.tool + ' receipt appears at archived message #' + frame.slot + '.') :
          text('按查询顺序装入历史消息。','Add history to the context in query order.');
      case 'return': return text('内核整理历史消息，将上下文交给模型适配器。','The kernel prepares the history and returns it to the model adapter.');
      case 'send': return frame.trace ? text(...frame.trace) :
        text('适配器补齐请求内容，发出归档请求 #' + frame.request + '。','The adapter assembles and sends archived request #' + frame.request + '.');
    }
  }

  function renderSql(...parts) {
    el('sql').replaceChildren(...parts.flatMap(part =>
      typeof part !== 'string' ? [part] : part.split(/(\b(?:SELECT|INSERT INTO|VALUES|FROM|WHERE|AND|IN|ORDER BY)\b)/g)
        .map((word,i) => {
          if (!(i%2)) return word;
          const token = element('span',word);
          token.className = 'syntax-keyword';
          return token;
        })));
  }

  function setDbColumns(names) {
    const columns = el('db-columns');
    columns.dataset.cols = String(names.length);
    columns.replaceChildren(...names.map(name => element('span',name)));
  }

  function query(step,frame) {
    const sql = el('sql');
    const bind = value => element('b',value);
    const lookup = step.kind === 'lookup';
    const reading = step.kind === 'select' || step.kind === 'read';
    sql.classList.toggle('active',lookup || reading);
    if (lookup) {
      el('query-title').textContent = text('按父键查询','Look up the parent row');
      renderSql('SELECT task, cycle, unit, from_cycle, from_unit\nFROM "' + taskTable + '"\nWHERE task = ',bind("'" + requests[frame.request].task + "'"),' AND cycle = ',bind("'" + cycles[step.hit] + "'"),
        '\n  AND unit = ',bind(':' + unit(step.hit)));
    } else if (step.shown || step.kind === 'select') {
      el('query-title').textContent = reading ? text('按顺序读取上下文','Read context in order') : text('上一条历史查询','Last history query');
      const units = step.line.map(i => ':' + unit(i));
      if (!reachesRoot(frame.request)) units.unshift(':earlier_units');
      renderSql('SELECT unit, seq, role, kind, body, thought\nFROM "' + messageTable + '"\nWHERE instance = ',bind(':instance'),
        '\n  AND unit IN (',bind(units.join(', ')),')\nORDER BY unit, seq');
    } else {
      el('query-title').textContent = text('SQL','SQL');
      sql.textContent = step.kind === 'tool-result' ?
        text('回执随工具消息写回。读取它的 SQL 出现在后续回溯步骤。','The receipt is recorded with the tool message. The next walk shows the query that reads it.') :
        text('等待父记录查询。','Waiting for the parent lookup.');
    }
  }

  function updateMessages(frame,step) {
    const positions = requests[frame.request].rows;
    const labels = {
      instructions:text('工具规则','Tool instructions'),brief:text('原始任务','Task brief'),
      'task-view':text('本轮任务','Task view')
    };
    const sent = step.kind === 'send';
    let previous = 0;
    messageRows.forEach((row,i) => {
      row.hidden = i >= positions.length;
      if (row.hidden) return;
      const [position,role,entry] = positions[i];
      const included = sent || (contextRow(positions[i]) && ++previous <= step.shown);
      row.cells[0].textContent = position;
      row.cells[1].textContent = role;
      row.cells[2].textContent = labels[entry] ?? entry;
      row.classList.toggle('included',included);
      row.classList.toggle('primary',position === frame.slot && included);
      row.classList.toggle('reading',step.kind === 'read' && included && previous === step.shown && contextRow(positions[i]));
    });
    el('history-title').textContent = sent ? text('发给模型的消息','Model input') : text('历史消息','Message history');
    const count = positions.at(-1)[0];
    const retained = positions.filter(contextRow).length;
    el('message-count').textContent = sent ?
      text('归档请求共 ' + count + ' 条，当前显示 ' + positions.length + ' 条。','Archived request: ' + count + ' messages. Showing ' + positions.length + '.') :
      text('已读消息：' + step.shown + ' / ' + retained + '。','Messages read: ' + step.shown + ' of ' + retained + '.');
  }

  function showSource(pc,rewinding) {
    const block = codeBlocks.find(({start,rows}) => pc >= start && pc < start+rows.length);
    if (block !== sourceBlock) {
      sourceBlock = block;
      el('code').replaceChildren(...(block?.rows.filter(Boolean) ?? []));
      if (block?.start === 882) el('code').append(loopback);
    }
    block?.rows.forEach((row,i) => row?.classList.toggle('at',block.start+i === pc));
    if (block?.start === 882) {
      const from = block.rows[900-882], to = block.rows[886-882];
      const y1 = from.offsetTop+from.offsetHeight/2, y2 = to.offsetTop+to.offsetHeight/2;
      loopback.setAttribute('viewBox','0 0 20 ' + el('code').offsetHeight);
      loopback.dataset.active = String(rewinding);
      turn.setAttribute('d',`M18 ${y1}H13Q6 ${y1} 6 ${y1-7}V${y2+7}Q6 ${y2} 13 ${y2}H18 m-3 -3 3 3-3 3`);
    }
  }

  function render(frame,step,progress,lastCall) {
    el('source-title').textContent = text('执行位置','Execution cursor');
    el('source-file').textContent = 'loop.ts';
    el('units-title').textContent = text('任务表','Task rows');
    el('db-table').textContent = taskTable;
    setDbColumns(['cycle','unit','from_cycle','from_unit']);
    el('host-table').hidden = true;
    el('units-empty').hidden = true;
    el('task-wrap').hidden = false;
    el('line-wrap').hidden = false;
    el('output-origin').textContent = '';
    el('output-empty').hidden = true;
    el('log').hidden = false;
    el('output').querySelector('.trace-history').hidden = false;
    const rewinding = step.kind === 'move' || (step.kind === 'loop' && step.cur < unitsFor(frame.request)-1);
    showSource(step.pc,rewinding);
    const cursor = el('cursor');
    cursor.hidden = step.cur === undefined;
    if (!cursor.hidden) cursor.style.setProperty('--cursor-row',step.cur);
    taskRows.forEach((row,i) => {
      row.hidden = i >= unitsFor(frame.request);
      row.classList.toggle('current',i === step.cur);
      row.classList.toggle('hit',i === step.hit);
      row.classList.toggle('lookup',i === step.cur && step.hit !== undefined);
      row.classList.toggle('collected',step.kind === 'select' || step.kind === 'read');
    });
    const parent = reachesRoot(frame.request) ? 'NULL' : '…';
    taskRows[0].cells[2].textContent = parent;
    taskRows[0].cells[3].textContent = parent;
    const line = step.line.map(i => {
      const chip = element('span',unit(i));
      chip.classList.toggle('new',step.kind === 'append' && i === step.cur);
      return chip;
    });
    if (!reachesRoot(frame.request) && ((step.cur === undefined && step.line.length) || step.kind === 'earlier')) line.unshift(element('span','…'));
    el('line').replaceChildren(...(line.length ? line : [element('code','[ ]')]));
    query(step,frame);
    updateMessages(frame,step);
    el('file').textContent = 'requests/' + frame.request + '.json';
    el('origin').textContent = (frame.slot ? text('回执 #' + frame.slot,'Receipt #' + frame.slot) : text('请求记录','Request record')) +
      (frame.receipt.source ? ' · ' + frame.receipt.source : '');
    el('receipt').textContent = frame.receipt.body;
    const call = calls[frame.request];
    const showFields = call && ['tool-result','read','return','send'].includes(step.kind);
    const fields = el('return-fields');
    fields.hidden = !showFields;
    fields.replaceChildren(...(showFields ? Object.entries(call.receipt).flatMap(([key,value]) =>
      [element('dt',key),element('dd',typeof value === 'string' ? value : JSON.stringify(value))]) : []));
    return modelEditor.render(frame.model ?? call ?? lastCall,step.kind === 'author',progress,{
      file:'requests/' + frame.request + '.json',
      note:text('内核正在组装首轮上下文，尚无 AI 工具调用。','Kernel is assembling request #1. No AI tool call yet.')
    },{
      receipt:frame.receipt,
      executed:step.kind !== 'author',
      phase:frame.phase
    });
  }

  function renderHost(frame,step,{lastRequest,lastCall,lastReceipt,lastPhase}) {
    const bind = value => element('b',value);
    sourceBlock = undefined;
    el('source-title').textContent = text('源码位置','Source cursor');
    el('source-file').textContent = step.source;
    const codeRows = [];
    const hostLines = step.excerpt ?? dnaHostSource[step.source];
    for (const line of step.lines) {
      const snippet = withoutDnaCodeComments(hostLines[line],step.source.endsWith('.py'));
      if (!snippet) continue;
      const row = element('div');
      row.className = 'kt-code-row' + (line === step.pc ? ' at' : '');
      const code = element('code');
      paintDnaCode(code,dnaCodeTokens(snippet));
      row.append(element('span',line),code);
      codeRows.push(row);
    }
    el('code').replaceChildren(...codeRows);

    const sql = el('sql');
    const isToolPreflight = step.source === 'runner-recovery2.ts' && (step.pc === 280 || step.pc === 281);
    const isTaskPublish = step.source === 'runtime/src/tasks/publish.ts';
    if (step.database) {
      const db = step.database;
      el('units-title').textContent = db.title;
      el('db-table').textContent = db.table;
      setDbColumns(db.columns);
      el('host-table').hidden = !db.rows.length;
      el('task-wrap').hidden = true;
      el('cursor').hidden = true;
      el('line-wrap').hidden = true;
      el('units-empty').hidden = Boolean(db.rows.length);
      el('units-empty').textContent = text('等待查询返回。','Waiting for query results.');
      el('host-rows').replaceChildren(...db.rows.map(values => {
        const row = element('tr');
        row.classList.toggle('hit',step.pc===step.lines.at(-1) || db.rows.length===1);
        row.append(...values.map(value => element('td',String(value))));
        return row;
      }));
      el('query-title').textContent = text('归档查询','Archived query');
      sql.classList.add('active');
      renderSql(db.sql);
    } else if (isToolPreflight) {
      el('units-title').textContent = text('工具表','Tool table');
      el('db-table').textContent = 'tool';
      setDbColumns(['name','usable']);
      el('task-wrap').hidden = true;
      el('line-wrap').hidden = true;
      el('units-empty').hidden = true;
      el('host-table').hidden = false;
      const tools = [['job_status',1],['run_command',1],['submit',1],['verify',1]];
      el('host-rows').replaceChildren(...tools.map(([name,usable]) => {
        const row = element('tr');
        if (step.pc === 281) row.className = 'hit';
        row.append(element('td',name),element('td',String(usable)));
        return row;
      }));
      el('query-title').textContent = step.pc === 280 ? text('预检工具查询','Preflight tool query') : text('工具查询结果','Preflight query result');
      sql.classList.add('active');
      renderSql('SELECT name, usable\nFROM tool\nWHERE name IN (',bind("'run_command', 'job_status', 'verify', 'submit'"),')');
    } else if (isTaskPublish) {
      const taskEvent = frame.items?.find(r => r.source === 'events.jsonl');
      const taskId = step.task ?? (taskEvent ? JSON.parse(taskEvent.body).id : 'dna-search-001');
      el('units-title').textContent = text('任务表','Task rows');
      el('db-table').textContent = taskTable;
      setDbColumns(['cycle','unit','from_cycle','from_unit']);
      el('host-table').hidden = true;
      el('units-empty').hidden = true;
      el('task-wrap').hidden = false;
      el('line-wrap').hidden = false;
      el('cursor').hidden = false;
      el('cursor').style.setProperty('--cursor-row',0);
      taskRows.forEach((row,i) => {
        row.hidden = i > 0;
        row.classList.toggle('current',i === 0);
        row.classList.toggle('hit',i === 0 && step.pc === 247);
        row.classList.remove('lookup','collected');
      });
      taskRows[0].cells[2].textContent = 'NULL';
      taskRows[0].cells[3].textContent = 'NULL';
      el('line').replaceChildren(element('code','[ ]'));
      sql.classList.add('active');
      if (step.pc === 247) {
        el('query-title').textContent = text('写入首个执行单元','Insert root execution unit');
        renderSql('INSERT INTO "' + taskTable + '" (task, cycle, unit, from_cycle, from_unit)\nVALUES (',bind("'" + taskId + "'"),', ',bind("'ask'"),', ',bind('1'),', ',bind('NULL'),', ',bind('NULL'),')');
      } else {
        el('query-title').textContent = text('写入首条任务消息','Deliver initial task brief');
        sql.replaceChildren('deliver(db, { agent: ',bind("'" + (archive?.messageTable.slice(6,-4) ?? "dna") + "'"),', instance: ',bind("'" + taskId + "#1'"),', unit: ',bind('1'),', by: ',bind("'user'"),' })');
      }
    } else {
      el('units-title').textContent = text('任务表','Task rows');
      el('db-table').textContent = taskTable;
      setDbColumns(['cycle','unit','from_cycle','from_unit']);
      el('host-table').hidden = true;
      el('cursor').hidden = true;
      if (lastRequest) {
        el('task-wrap').hidden = false;
        el('line-wrap').hidden = false;
        el('units-empty').hidden = true;
        const count = unitsFor(lastRequest);
        taskRows.forEach((row,i) => {
          row.hidden = i >= count;
          row.classList.remove('current','hit','lookup','collected');
        });
        const parent = reachesRoot(lastRequest) ? 'NULL' : '…';
        taskRows[0].cells[2].textContent = parent;
        taskRows[0].cells[3].textContent = parent;
        el('line').replaceChildren(element('code','[ ]'));
      } else {
        el('task-wrap').hidden = true;
        el('line-wrap').hidden = true;
        el('units-empty').hidden = false;
        el('units-empty').textContent = text('尚未写入执行单元，等待任务初始化。','No execution unit yet. Waiting for task initialization.');
      }
      sql.classList.remove('active');
      el('query-title').textContent = text('SQL','SQL');
      sql.textContent = archive ? text('此步骤在宿主执行。','This step runs on the host.') : step.source === 'checker.py' ?
        text('宿主运行 checker.py 本地独立核验，本步不查询 SQLite。','Host runs checker.py locally; no SQLite query in this step.') :
        text('运行器执行环境预检或读写归档文件，本步不查询 SQLite。','Runner executes preflight or archive I/O; no SQLite query in this step.');
    }

    el('output-origin').textContent = step.origin;
    el('log').hidden = !step.receipt;
    if (step.receipt) {el('origin').textContent=step.receipt.source; el('receipt').textContent=step.receipt.body;}
    el('output').querySelector('.trace-history').hidden = true;
    const fields = el('return-fields');
    const hasFields = step.fields.length > 0;
    fields.hidden = !hasFields;
    fields.replaceChildren(...(hasFields ? step.fields.flatMap(([key,value]) =>
      [element('dt',key),element('dd',typeof value === 'string' ? value : JSON.stringify(value))]) : []));
    const outEmpty = el('output-empty');
    outEmpty.hidden = hasFields;
    if (!hasFields) outEmpty.textContent = text('等待当前步骤的回执。','Waiting for this step’s result.');

    modelEditor.render(lastCall,false,1,{
      file:archive ? '—' : 'model_calls: 0',
      note:archive ? text('等待本次回放的首个模型调用。','Waiting for the first model call in this replay.') : text('尚未发起 AI 工具调用，等待预检与任务创建完成。','No AI tool call yet. Waiting for preflight and task creation.')
    },lastReceipt ? {receipt:lastReceipt,executed:true,phase:lastPhase} : null);
  }
  return {moments,render,renderHost,caption,type:modelEditor.type};
}
