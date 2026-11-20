function createDnaTraceModel(revisions = dnaCallRevisions) {
  const {text} = replayLocale;
  const panel = document.getElementById('trace-model');
  const scroller = document.getElementById('trace-model-scroll');
  const file = document.getElementById('trace-model-file');
  const code = document.getElementById('trace-model-call');
  const empty = document.getElementById('trace-model-empty');
  const toggle = document.getElementById('trace-model-diff');
  const terminal = document.getElementById('trace-terminal');
  const termSource = document.getElementById('trace-terminal-source');
  const termBadge = document.getElementById('trace-terminal-badge');
  const termBody = document.getElementById('trace-terminal-body');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const caret = document.createElement('span');
  caret.className = 'trace-caret';
  caret.setAttribute('aria-hidden','true');
  const linesOf = record => record.body.replace(/\r?\n$/,'').split(/\r?\n/).flatMap((original,i) => {
    const line = withoutDnaCodeComments(original,record.tool === 'run_command');
    return line || !original.trim() ? [{line,number:i+(record.first ?? 1)}] : [];
  });
  let call, previous, rows = [], length = 0, writing = false, diff = false, progress = 1;
  let shownAmount = -1, wasTyping = false;

  function compare(before, after) {
    const sizes = Array.from({length:before.length+1},() => new Uint16Array(after.length+1));
    for (let i=before.length-1;i>=0;i--) {
      for (let j=after.length-1;j>=0;j--) {
        sizes[i][j] = before[i].line === after[j].line ? 1+sizes[i+1][j+1] : Math.max(sizes[i+1][j],sizes[i][j+1]);
      }
    }
    const result = [];
    let i = 0, j = 0;
    while (i < before.length || j < after.length) {
      if (i < before.length && j < after.length && before[i].line === after[j].line) {
        result.push({...after[j],kind:'same'});
        j++;
        i++;
      } else if (i < before.length && (j === after.length || sizes[i+1][j] >= sizes[i][j+1])) {
        result.push({...before[i],kind:'removed'});
        i++;
      } else {
        result.push({...after[j],kind:'added'});
        j++;
      }
    }
    return result;
  }

  function fill() {
    const lines = linesOf(call);
    const entries = diff ? compare(linesOf(previous),lines) : lines;
    length = 0;
    shownAmount = -1;
    rows = entries.map(({line,number,kind}) => {
      const row = document.createElement('span');
      row.className = 'trace-record-line';
      if (kind) row.dataset.diff = kind;
      const gutter = document.createElement('span');
      const symbol = kind === 'removed' ? '−' : kind === 'added' ? '+' : '';
      gutter.textContent = symbol ? symbol + ' ' + number : number;
      const content = document.createElement('code');
      const tokens = diff ? [{value:line}] : dnaCodeTokens(line);
      row.append(gutter,content);
      const typed = !diff || kind === 'added';
      const start = length;
      if (typed) length += line.length+1;
      return {row,content,tokens,length:line.length,visible:-1,typed,start};
    });
    code.replaceChildren(...rows.map(({row}) => row));
  }

  function type(value) {
    progress = value;
    if (!call) return;
    const active = writing && value < 1;
    const typing = active && !reduced.matches;
    panel.toggleAttribute('data-writing',active);
    const amount = typing ? Math.max(1,Math.floor(length*value)) : length;
    if (amount === shownAmount && typing === wasTyping) return;
    shownAmount = amount;
    wasTyping = typing;
    let activeCode;
    for (const entry of rows) {
      const {row,content,tokens,length,typed,start} = entry;
      const written = amount-start;
      const show = !typing || !typed || written >= 0;
      const current = typing && typed && written >= 0 && written <= length;
      const visible = !typing || !typed ? length : Math.min(length,Math.max(0,written));
      if (row.hidden === show) row.hidden = !show;
      if (show && entry.visible !== visible) {
        paintDnaCode(content,tokens,visible);
        entry.visible = visible;
      }
      row.classList.toggle('at',current);
      if (current) activeCode = content;
    }
    if (!activeCode) {
      caret.remove();
      return;
    }
    if (caret.parentElement !== activeCode) activeCode.append(caret);
    return caret;
  }

  function label() {
    toggle.setAttribute('aria-pressed',String(diff));
    toggle.textContent = text('对比旧代码','Diff');
    toggle.title = text('与归档中的旧实现对比','Compare with the previous archived implementation');
  }

  function renderTerminal(info) {
    if (!info?.receipt) {
      terminal.hidden = true;
      return;
    }
    terminal.hidden = false;
    termSource.textContent = info.receipt.source || '';
    if (!info.executed) {
      terminal.dataset.tone = 'pending';
      termBadge.textContent = text('编写中','writing');
      termBody.textContent = text('工具调用编写完成后执行，实时输出将显示在此处。','Terminal output will appear here once this tool call executes.');
      return;
    }
    const body = info.receipt.body || '';
    const status = info.receipt.status;
    const isError = status ? status === 'error' : /violating adjacencies|hd fail/i.test(body) || info.phase === 'reject';
    const isOk = !isError && /TOTAL BAD 0|newly valid 16772|asym 0 self 0|"passed"|"valid": true|min hamming 4/i.test(body);
    terminal.dataset.tone = isError ? 'error' : isOk ? 'ok' : 'neutral';
    termBadge.textContent = status ? info.receipt.badge : isError ? text('发现冲突','fault') : isOk ? text('通过','ok') : 'exit 0';
    termBody.textContent = body;
  }

  function render(next, isWriting, value, standby, terminalInfo) {
    panel.hidden = false;
    if (!next) {
      call = undefined;
      previous = undefined;
      diff = false;
      rows = [];
      length = 0;
      shownAmount = -1;
      wasTyping = false;
      caret.remove();
      panel.removeAttribute('data-writing');
      toggle.hidden = true;
      code.hidden = true;
      code.replaceChildren();
      empty.hidden = false;
      file.textContent = standby?.file ?? 'model_calls: 0';
      empty.textContent = standby?.note ?? text('尚未发起 AI 工具调用，等待任务进入执行。','No AI tool call yet. Waiting for the first model request.');
      renderTerminal(null);
      return;
    }
    empty.hidden = true;
    code.hidden = false;
    writing = isWriting;
    if (call !== next) {
      call = next;
      previous = revisions.get(call);
      diff = Boolean(previous);
      toggle.hidden = !previous;
      file.textContent = diff ? previous.source.split(' · ')[0] + ' → ' + call.source.split(' · ')[0] : call.source;
      fill();
      scroller.scrollTop = 0;
    }
    label();
    renderTerminal(terminalInfo);
    return type(value) ?? (caret.isConnected ? caret : undefined);
  }

  toggle.addEventListener('click',() => {
    diff = !diff;
    file.textContent = diff ? previous.source.split(' · ')[0] + ' → ' + call.source.split(' · ')[0] : call.source;
    label();
    fill();
    scroller.scrollTop = 0;
    const cursor = type(progress);
    panel.dispatchEvent(new CustomEvent('dna-code-focus',{bubbles:true,detail:cursor || code.firstElementChild}));
  });
  return {render,type};
}
