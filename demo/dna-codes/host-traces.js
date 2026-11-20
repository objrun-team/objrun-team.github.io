// Selected lines of the archived host and kernel sources.
const dnaHostSource = {
  "runner-recovery2.ts": {"32":"const priorDeadline = !preflight && existsSync(join(dir, 'deadline.json')) ? JSON.parse(readFileSync(join(dir, 'deadline.json'), 'utf8')) : null;","33":"const hard = priorDeadline ? priorDeadline.deadline_epoch*1000 : start + duration;","47":"let best = JSON.parse(readFileSync(join(originalRun, 'best-verified.json'), 'utf8'));","84":"event({ event: 'job_started', id });","107":"text = readFileSync(actual, 'utf8').replace(/^\\uFEFF/, '');","112":"const checked = await command([python, join(originalRun, 'checker.py'), artifact, '--threshold', String(threshold), '--independent']);","114":"const report = { ...JSON.parse(checked.stdout), artifact, raw_sha256: hash, task: taskId, checked_utc: new Date().toISOString() };","116":"appendFileSync(join(dir, 'verifier-events.jsonl'), JSON.stringify(report)+'\\n');","119":"put(join(dir, 'best-verified.json'), best);","120":"copyFileSync(artifact, join(dir, 'best-verified.txt'));","223":"const threshold = best.size;","224":"currentTask = 'dna-search-'+String(++phase).padStart(3, '0');","225":"thresholds.set(currentTask, threshold);","232":"await api('POST', '/tasks', { id: currentTask, run: 'dna-five-hours', mode: 'dna-search', agent: 'dna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: Math.max(1, Math.floor(remaining()/1000)), maxBranches: unlimited, maxDeadSiblings: unlimited });","233":"event({ event: 'task_started', id: currentTask, threshold, remaining_seconds: Math.floor(remaining()/1000) });","273":"// Test real container tools and real independent validation before any model call.","274":"const smoke = runJob(\"python - <<'PY'\\nimport numpy,scipy,numba,sympy,ortools\\nprint('DNA environment ready')\\nPY\\ng++ --version | head -n 1\");","275":"await smoke.proc.exited;","276":"if (smoke.exitCode !== 0) throw new Error('Scientific container preflight failed');","277":"const audit = await verifyArtifact('{\"path\":\"candidate.txt\"}', 'preflight');","280":"const state = await api('POST', '/query', { sql: \"select name,usable from tool where name in ('run_command','job_status','verify','submit')\" });","281":"put(join(dir, 'check-result.json'), { passed: true, model_calls: 0, audit: JSON.parse(audit.note), tools: state, container: jobStatus(smoke.id) });","286":"while (remaining() && engine.exitCode === null) {","288":"try { task = await api('GET', '/tasks/'+currentTask+'/status'); }","303":"stopping = true;","304":"for (const ctl of controllers) ctl.abort();","307":"for (const job of jobs.values()) if (job.exitCode === null) try { job.proc.kill(); } catch {}","308":"try { if (engine) { engine.kill(); await engine.exited; } } catch {}","310":"try { await verifyArtifact('{\"path\":\"candidate.txt\"}', currentTask); } catch (e) { event({ event: 'final_checkpoint_error', error: String(e) }); }","313":"put(join(dir, 'completion.json'), result);"},
  "runtime/src/tasks/publish.ts": {"210":"const instance = p.instance ?? `${p.id}#1`;","229":"`insert into task (id, mode, place, run, source, domain, description, created_at, workdir, objective, readable,","230":"claimed_by, result, max_branches, max_dead_siblings, solve_seconds,","231":"max_searches, no_search, state)","232":"values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?, ?, ?, ?, ?, 'open')`,","247":"`insert into \"${sub}\" (task, cycle, unit, node, from_cycle, from_unit, agent, instance, place, at, done)","248":"values (?, ?, 1, 1, null, null, ?, ?, ?, ?, 0)`,","249":"[p.id, cycle, p.agent, instance, p.place, now],","259":"deliver(db, {","260":"agent: p.agent,","261":"instance,","262":"unit: 1,","263":"by: p.source === \"user\" ? \"user\" : \"world\",","264":"body: description,","268":"db.exec(\"release publish_one\");"},
  "runtime/src/api/tasks.ts": {"255":"const t = one(store, \"select id,state,result,created_at,solve_seconds from task where id = ?\", [String(a.id)]);","256":"if (!t) return reply.code(404).send({ error: `no such task: ${String(a.id)}` });"},
  "checker.py": {"98":"words = Path(args.path).read_text(encoding='utf-8-sig').split()","99":"result = check(words, args.threshold)","100":"if args.independent:","101":"result['independent_valid'] = independent_check(words)","102":"result['valid'] = result['valid'] and result['independent_valid']","103":"result['improved'] = result['improved'] and result['valid']","104":"print(json.dumps(result))"},
};

function dnaHostMoments(frame) {
  const runner = 'runner-recovery2.ts';
  const publisher = 'runtime/src/tasks/publish.ts';
  const checker = 'checker.py';
  const stage = (route,source,pc,lines,caption,fields=[],origin='') =>
    ({kind:'host',route,source,pc,lines,caption,fields,origin});
  const taskEvent = frame.items?.find(record => record.source === 'events.jsonl');
  if (frame.checkpoint || frame.host === 'audit') {
    const c = frame.verified;
    const task = dnaArchive.tasks.find(entry => entry.id === c.task);
    const audit = frame.host === 'audit';
    const origin = audit ? 'final-independent-check.json' : 'verifier-events.jsonl · ' + c.utc + 'Z';
    const load = [['task',c.task],['candidate',audit ? 'final-best_verified.txt / final-last_complete_candidate.txt' : 'candidate.txt'],['threshold',audit ? 676 : task.threshold]];
    const result = [['size',c.size],['minimum_hamming',4],['valid',true]];
    return [
      stage(['kernel','verifier'],checker,98,[98,99,100,101,102,103,104],
        ['载入这次归档对应的候选文件。','Load the candidate associated with this archived check.'],load,origin),
      stage(['verifier'],checker,99,[98,99,100,101,102,103,104],
        ['主检查器计算码本规模和最小距离。','The primary checker computes size and minimum distance.'],result,origin),
      stage(['verifier'],checker,101,[98,99,100,101,102,103,104],
        ['独立实现复核同一候选集。','An independent implementation checks the same candidate.'],
        [...result,['independent_valid',true]],origin),
      stage(['verifier','kernel'],checker,104,[98,99,100,101,102,103,104],
        audit ? ['终检两份快照一致，归档保留相同的哈希。','The final audit records the same hash for both snapshots.'] :
          ['核验回执返回，已验证规模可以更新。','The check returns and the verified size can advance.'],
        [...result,['independent_valid',true],['sha256',c.hash]],origin)
    ];
  }
  if (taskEvent) {
    const task = JSON.parse(taskEvent.body);
    const input = [['id',task.id],['threshold',task.threshold],['remaining_seconds',task.remaining_seconds]];
    const row = [['task',task.id],['cycle','ask'],['unit',1],['from_cycle',null],['from_unit',null]];
    return [
      stage(['runner'],runner,224,[223,224,225,232,233],
        [`准备 ${task.id}，起始门槛为 ${task.threshold} 条。`,`Prepare ${task.id} with a threshold of ${task.threshold} words.`],input,'events.jsonl · task_started'),
      stage(['runner','kernel'],runner,232,[223,224,225,232,233],
        ['运行器把任务定义发给内核的任务 API。','The runner submits the task to the kernel API.'],input,'events.jsonl · task_started'),
      stage(['kernel','db'],publisher,247,[247,248,249,259,260,261,262,263,264,268],
        ['SQLite 写入首个执行单元，两个父键为 NULL。','SQLite creates the first execution unit with NULL parent keys.'],row,'publish.ts · INSERT parameters'),
      stage(['db'],publisher,264,[247,248,249,259,260,261,262,263,264,268],
        ['SQLite 保存任务描述，首个执行单元已就绪。','SQLite saves the task brief. The first execution unit is ready.'],[['role','user'],['unit',1],['event','task_started']],'publish.ts / events.jsonl')
    ];
  }
  if (frame.host === 'setup') {
    const window = JSON.parse(dnaArchive.records.window.body);
    const rows = [['job_status',1],['run_command',1],['submit',1],['verify',1]];
    return [
      stage(['kernel'],runner,274,[273,274,275,276,277,280,281],
        ['等候容器工具的预检进程退出。','Wait for the tool preflight process to exit.'],[['model_calls',0],['passed',true]],'preflight/check-result.json'),
      stage(['kernel','verifier'],runner,276,[273,274,275,276,277,280,281],
        ['验证器先核验 676 条参考码本。','Check the published 676-word reference first.'],
        [['size',676],['minimum_hamming',4],['independent_valid',true]],'preflight/check-result.json · audit'),
      stage(['kernel','db'],runner,280,[273,274,275,276,277,280,281],
        ['发送真实的预检 SQL，查询四个工具是否可用。','Send the archived SQL for the availability of four tools.'],[],'preflight/check-result.json · tools'),
      stage(['db','kernel'],runner,281,[273,274,275,276,277,280,281],
        ['数据库返回四条工具记录，usable 均为 1。','The database returns all four tools with usable = 1.'],rows,'preflight/check-result.json · tools.rows'),
      stage(['kernel'],runner,281,[280,281],
        ['五小时窗口固定，后续阶段继续沿用这个截止时间。','The deadline remains fixed across subsequent tasks.'],Object.entries(window),'deadline.json')
    ];
  }
  if (frame.host === 'recovery') {
    const record = JSON.parse(dnaArchive.records.recovery.body);
    return [
      stage(['kernel'],runner,32,[32,33,47],
        ['恢复运行器时载入归档的截止时间。','Reload the recorded deadline when restarting the runner.'],Object.entries(record),'infrastructure-recovery.jsonl'),
      stage(['kernel'],runner,33,[32,33,47],
        ['继续沿用五小时窗口的原截止时间。','Keep the original five-hour deadline.'],
        [['deadline_utc',JSON.parse(dnaArchive.records.window.body).deadline_utc]],'deadline.json'),
      stage(['kernel'],runner,47,[32,33,47],
        ['读取已写入磁盘的最佳核验证书。','Read the best verified checkpoint already saved to disk.'],
        [['size',frame.verified.size],['sha256',frame.verified.hash]],'best-verified.json / verifier-events.jsonl')
    ];
  }
  if (frame.host === 'close') {
    return [
      stage(['kernel'],runner,303,[303,304,307,308,310,313],
        ['截止时间到，运行器进入收尾。','At the deadline the runner begins shutdown.' ]),
      stage(['kernel','verifier'],runner,310,[303,304,307,308,310,313],
        ['收尾时把最后一份候选交给验证器。','Send the last complete candidate to the verifier during shutdown.'],
        [['path','candidate.txt'],['verified_best',frame.verified.size]],'completion.json / final-independent-check.json'),
      stage(['kernel'],runner,313,[303,304,307,308,310,313],
        ['把结束原因和模型请求数写入运行档案。','Write the finish reason and request count into the run archive.'],
        Object.entries(JSON.parse(dnaArchive.records.end.body)),'completion.json')
    ];
  }
  return [];
}

function createDnaHostTrace(panel) {
  function node(tag,text) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function heading(title,source) {
    const header = node('header');
    header.append(node('h3',title),node('code',source));
    return header;
  }
  const code = node('section');
  const data = node('section');
  code.className = data.className = 'trace-event-record trace-scroll';
  code.id = 'trace-host-code';
  data.id = 'trace-host-data';
  code.tabIndex = data.tabIndex = -1;
  panel.replaceChildren(code,data);
  return {
    render(step) {
      const {text} = replayLocale;
      const block = node('div');
      for (const line of step.lines) {
        const snippet = withoutDnaCodeComments(dnaHostSource[step.source][line],step.source.endsWith('.py'));
        if (!snippet) continue;
        const row = node('div');
        row.className = 'kt-code-row' + (line === step.pc ? ' at' : '');
        row.append(node('span',line),node('code',snippet));
        block.append(row);
      }
      code.replaceChildren(heading(text('源码位置','Source cursor'),step.source),block);
      data.replaceChildren(heading(text('参数与回执','Parameters and receipt'),step.origin));
      if (step.fields.length) {
        const list = node('dl'); list.className = 'trace-fields';
        for (const [key,value] of step.fields) {
          list.append(node('dt',key),node('dd',typeof value === 'string' ? value : JSON.stringify(value)));
        }
        data.append(list);
      } else {
        data.append(node('p',text('等待当前步骤的回执。','Waiting for this step’s result.')));
      }
    }
  };
}

