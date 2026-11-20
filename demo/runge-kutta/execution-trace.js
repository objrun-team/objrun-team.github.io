const archivedCaseTrace = {
  "taskTable": "task_rk_search",
  "initialTask": "rk-search-001",
  "messageTable": "agent_rk_msg",
  "publication": {
    "file": "runtime/src/tasks/publish.ts",
    "blocks": [
      {
        "pc": 247,
        "lines": [
          [
            244,
            "    );"
          ],
          [
            245,
            "    run("
          ],
          [
            246,
            "      db,"
          ],
          [
            247,
            "      `insert into \"${sub}\" (task, cycle, unit, node, from_cycle, from_unit, agent, instance, place, at, done)"
          ],
          [
            248,
            "       values (?, ?, 1, 1, null, null, ?, ?, ?, ?, 0)`,"
          ],
          [
            249,
            "      [p.id, cycle, p.agent, instance, p.place, now],"
          ],
          [
            250,
            "    );"
          ],
          [
            251,
            "    run(db, `insert into \"${ctx}\" (instance, task, unit, place, done) values (?, ?, 1, ?, 0)`, ["
          ]
        ]
      },
      {
        "pc": 259,
        "lines": [
          [
            256,
            "    // 任务描述就是上下文的第一条。**内核不解读它** —— 它只是一条消息。"
          ],
          [
            257,
            "    // 走那条唯一的投递管道：`by` 说的是**谁放的**，kind / role / 人写的那个标记"
          ],
          [
            258,
            "    // 都是推出来的。`source=user` 的任务描述是真人写的，缀上标记；别的来源不缀。"
          ],
          [
            259,
            "    deliver(db, {"
          ],
          [
            260,
            "      agent: p.agent,"
          ],
          [
            261,
            "      instance,"
          ],
          [
            262,
            "      unit: 1,"
          ],
          [
            263,
            "      by: p.source === \"user\" ? \"user\" : \"world\","
          ]
        ]
      }
    ],
    "role": "db"
  },
  "stages": [
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 276,
          "lines": [
            [
              273,
              "    { name: 'independent_rooted_tree_check', moment: 'done', domain: 'bool', handle: `http://127.0.0.1:${toolServer.port}/verify` },"
            ],
            [
              274,
              "  ], edges: [{ src: 'candidate_shape', out: 0, dst: 'independent_rooted_tree_check' }], sink: 'independent_rooted_tree_check', checks: unlimited, reuse: 'never' };"
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rk-five-hours', mode: 'rk-search', agent: 'rk', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: Math.max(1, Math.floor(remaining()/1000)), maxBranches: unlimited, maxDeadSiblings: unlimited });"
            ],
            [
              277,
              "  event({ event: 'task_started', id: currentTask, threshold, remaining_seconds: Math.floor(remaining()/1000) });"
            ],
            [
              278,
              "}"
            ],
            [
              279,
              ""
            ],
            [
              280,
              "try {"
            ]
          ]
        },
        {
          "pc": 277,
          "lines": [
            [
              274,
              "  ], edges: [{ src: 'candidate_shape', out: 0, dst: 'independent_rooted_tree_check' }], sink: 'independent_rooted_tree_check', checks: unlimited, reuse: 'never' };"
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rk-five-hours', mode: 'rk-search', agent: 'rk', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: Math.max(1, Math.floor(remaining()/1000)), maxBranches: unlimited, maxDeadSiblings: unlimited });"
            ],
            [
              277,
              "  event({ event: 'task_started', id: currentTask, threshold, remaining_seconds: Math.floor(remaining()/1000) });"
            ],
            [
              278,
              "}"
            ],
            [
              279,
              ""
            ],
            [
              280,
              "try {"
            ],
            [
              281,
              "  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is missing');"
            ]
          ]
        },
        {
          "pc": 185,
          "lines": [
            [
              182,
              "  deadline={started_utc:new Date(start).toISOString(),deadline_utc:new Date(hard).toISOString(),deadline_epoch:hard/1000,duration_seconds:18000,model,only_campaign_budget:'elapsed time; first paid request dispatch'};"
            ],
            [
              183,
              "  put(join(dir,'deadline.json'),deadline); clearTimeout(hardTimer);"
            ],
            [
              184,
              "  hardTimer=setTimeout(()=>{stopping=true;for(const ctl of controllers)ctl.abort();for(const job of jobs.values())if(job.exitCode===null)try{job.proc.kill();}catch{};try{engine?.kill();}catch{};event({event:'hard_deadline_local_stop'});},remaining());"
            ],
            [
              185,
              "  startGuard(); event({event:'first_paid_request_clock_started',...deadline});"
            ],
            [
              186,
              "}"
            ],
            [
              187,
              ""
            ],
            [
              188,
              "async function startProxy() {"
            ],
            [
              189,
              "  proxy = Bun.serve({ hostname: '127.0.0.1', port: 0, idleTimeout: 255, fetch: serveJson(async req => {"
            ]
          ]
        }
      ],
      "role": "run",
      "publication": "rk-search-001"
    },
    {
      "request": 2
    },
    {
      "request": 4
    },
    {
      "file": "monitor.py",
      "blocks": [
        {
          "pc": 52,
          "lines": [
            [
              49,
              "    con = sqlite3.connect(db.as_uri()+'?mode=ro', uri=True, timeout=2)"
            ],
            [
              50,
              "    con.row_factory = sqlite3.Row"
            ],
            [
              51,
              "    try:"
            ],
            [
              52,
              "        out['tasks'] = [dict(r) for r in con.execute('select id,state,created_at,solve_seconds from task order by created_at')]"
            ],
            [
              53,
              "        out['last_messages'] = [dict(r) for r in con.execute('select kind,substr(body,1,1600) as body from agent_rk_msg order by rowid desc limit 3')]"
            ],
            [
              54,
              "    except sqlite3.Error as e: out['db_note'] = str(e)"
            ],
            [
              55,
              "    finally: con.close()"
            ],
            [
              56,
              "import hashlib,subprocess,time"
            ]
          ]
        }
      ],
      "role": "db"
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 99,
          "lines": [
            [
              96,
              "  proc.stdin.write(cmd); proc.stdin.end();"
            ],
            [
              97,
              "  const job = { id, proc, logPath, errPath, started: new Date().toISOString(), exitCode: null as number|null };"
            ],
            [
              98,
              "  jobs.set(id, job);"
            ],
            [
              99,
              "  event({ event: 'job_started', id, pid:proc.pid });"
            ],
            [
              100,
              "  proc.exited.then((code: number) => { job.exitCode = code; event({ event: 'job_finished', id, code }); });"
            ],
            [
              101,
              "  return job;"
            ],
            [
              102,
              "}"
            ],
            [
              103,
              ""
            ]
          ]
        },
        {
          "pc": 100,
          "lines": [
            [
              97,
              "  const job = { id, proc, logPath, errPath, started: new Date().toISOString(), exitCode: null as number|null };"
            ],
            [
              98,
              "  jobs.set(id, job);"
            ],
            [
              99,
              "  event({ event: 'job_started', id, pid:proc.pid });"
            ],
            [
              100,
              "  proc.exited.then((code: number) => { job.exitCode = code; event({ event: 'job_finished', id, code }); });"
            ],
            [
              101,
              "  return job;"
            ],
            [
              102,
              "}"
            ],
            [
              103,
              ""
            ],
            [
              104,
              "function jobStatus(id: number, tail = 100) {"
            ]
          ]
        }
      ],
      "role": "run"
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              "    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('outside workspace');"
            ],
            [
              122,
              "    text = readFileSync(actual, 'utf8').replace(/^\\uFEFF/, '');"
            ],
            [
              123,
              "  } catch (e) { return { value: false, note: `Cannot read candidate: ${String(e)}` }; }"
            ],
            [
              124,
              "  const hash = createHash('sha256').update(text).digest('hex');"
            ],
            [
              125,
              "  const artifact = join(dir, 'verified', hash+'.candidate.json');"
            ],
            [
              126,
              "  if (!existsSync(artifact)) writeFileSync(artifact, text);"
            ],
            [
              127,
              "  assertFrozen();"
            ],
            [
              128,
              "  const checked = await command([python, join(originalRun, 'checker.py'), artifact, '--threshold', String(best.error_norm), '--independent']);"
            ]
          ]
        },
        {
          "pc": 132,
          "lines": [
            [
              129,
              "  if (checked.code !== 0) throw new Error(`Checker infrastructure failed: ${checked.stderr}`);"
            ],
            [
              130,
              "  const report = { ...JSON.parse(checked.stdout), artifact, raw_sha256: hash, task: taskId, checked_utc: new Date().toISOString() };"
            ],
            [
              131,
              "  put(join(dir, 'verified', hash+'.json'), report);"
            ],
            [
              132,
              "  appendFileSync(join(dir, 'verifier-events.jsonl'), JSON.stringify(report)+'\\n');"
            ],
            [
              133,
              "  if (report.valid && report.improved) {"
            ],
            [
              134,
              "    best = { ...report, high_precision: undefined, moments: undefined, independent: report.independent ? { precision_digits: report.independent.precision_digits, max_constraint_residual: report.independent.max_constraint_residual, error_norm: report.independent.error_norm } : undefined };"
            ],
            [
              135,
              "    put(join(dir, 'best-verified.json'), best);"
            ],
            [
              136,
              "    copyFileSync(artifact, join(dir, 'best-verified.candidate.json'));"
            ]
          ]
        }
      ],
      "role": "result",
      "request": 10
    },
    {
      "file": "checker.py",
      "blocks": [
        {
          "pc": 55,
          "lines": [
            [
              52,
              "    valid=max(oc,sr,mp.mpf(dec['max_constraint_residual']))<=tol and cross<mp.mpf('1e-80')"
            ],
            [
              53,
              "    margin=max(mp.mpf(frozen['minimum_absolute_improvement']),100*uncertainty)"
            ],
            [
              55,
              "if __name__=='__main__':"
            ],
            [
              56,
              "    p=argparse.ArgumentParser();p.add_argument('candidate');p.add_argument('--threshold');p.add_argument('--independent',action='store_true');args=p.parse_args()"
            ],
            [
              57,
              "    try:result=evaluate(args.candidate,args.threshold)"
            ],
            [
              58,
              "    except Exception as e:result={'valid':False,'improved':False,'error':str(e)}"
            ],
            [
              59,
              "    print(json.dumps(result,indent=2))"
            ]
          ]
        }
      ],
      "role": "result",
      "request": 23
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              "    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('outside workspace');"
            ],
            [
              122,
              "    text = readFileSync(actual, 'utf8').replace(/^\\uFEFF/, '');"
            ],
            [
              123,
              "  } catch (e) { return { value: false, note: `Cannot read candidate: ${String(e)}` }; }"
            ],
            [
              124,
              "  const hash = createHash('sha256').update(text).digest('hex');"
            ],
            [
              125,
              "  const artifact = join(dir, 'verified', hash+'.candidate.json');"
            ],
            [
              126,
              "  if (!existsSync(artifact)) writeFileSync(artifact, text);"
            ],
            [
              127,
              "  assertFrozen();"
            ],
            [
              128,
              "  const checked = await command([python, join(originalRun, 'checker.py'), artifact, '--threshold', String(best.error_norm), '--independent']);"
            ]
          ]
        },
        {
          "pc": 132,
          "lines": [
            [
              129,
              "  if (checked.code !== 0) throw new Error(`Checker infrastructure failed: ${checked.stderr}`);"
            ],
            [
              130,
              "  const report = { ...JSON.parse(checked.stdout), artifact, raw_sha256: hash, task: taskId, checked_utc: new Date().toISOString() };"
            ],
            [
              131,
              "  put(join(dir, 'verified', hash+'.json'), report);"
            ],
            [
              132,
              "  appendFileSync(join(dir, 'verifier-events.jsonl'), JSON.stringify(report)+'\\n');"
            ],
            [
              133,
              "  if (report.valid && report.improved) {"
            ],
            [
              134,
              "    best = { ...report, high_precision: undefined, moments: undefined, independent: report.independent ? { precision_digits: report.independent.precision_digits, max_constraint_residual: report.independent.max_constraint_residual, error_norm: report.independent.error_norm } : undefined };"
            ],
            [
              135,
              "    put(join(dir, 'best-verified.json'), best);"
            ],
            [
              136,
              "    copyFileSync(artifact, join(dir, 'best-verified.candidate.json'));"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              "    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('outside workspace');"
            ],
            [
              122,
              "    text = readFileSync(actual, 'utf8').replace(/^\\uFEFF/, '');"
            ],
            [
              123,
              "  } catch (e) { return { value: false, note: `Cannot read candidate: ${String(e)}` }; }"
            ],
            [
              124,
              "  const hash = createHash('sha256').update(text).digest('hex');"
            ],
            [
              125,
              "  const artifact = join(dir, 'verified', hash+'.candidate.json');"
            ],
            [
              126,
              "  if (!existsSync(artifact)) writeFileSync(artifact, text);"
            ],
            [
              127,
              "  assertFrozen();"
            ],
            [
              128,
              "  const checked = await command([python, join(originalRun, 'checker.py'), artifact, '--threshold', String(best.error_norm), '--independent']);"
            ]
          ]
        },
        {
          "pc": 132,
          "lines": [
            [
              129,
              "  if (checked.code !== 0) throw new Error(`Checker infrastructure failed: ${checked.stderr}`);"
            ],
            [
              130,
              "  const report = { ...JSON.parse(checked.stdout), artifact, raw_sha256: hash, task: taskId, checked_utc: new Date().toISOString() };"
            ],
            [
              131,
              "  put(join(dir, 'verified', hash+'.json'), report);"
            ],
            [
              132,
              "  appendFileSync(join(dir, 'verifier-events.jsonl'), JSON.stringify(report)+'\\n');"
            ],
            [
              133,
              "  if (report.valid && report.improved) {"
            ],
            [
              134,
              "    best = { ...report, high_precision: undefined, moments: undefined, independent: report.independent ? { precision_digits: report.independent.precision_digits, max_constraint_residual: report.independent.max_constraint_residual, error_norm: report.independent.error_norm } : undefined };"
            ],
            [
              135,
              "    put(join(dir, 'best-verified.json'), best);"
            ],
            [
              136,
              "    copyFileSync(artifact, join(dir, 'best-verified.candidate.json'));"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "file": "audit_algcert.py",
      "blocks": [
        {
          "pc": 22,
          "lines": [
            [
              19,
              "alpha=[zero]+polys[:4];beta=polys[4:];y=[zero]*5;q=[zero]*5"
            ],
            [
              20,
              "for i in range(5):"
            ],
            [
              21,
              "    q=[(alpha[i]*x)%P for x in q];q[i]+=one"
            ],
            [
              22,
              "    y=[(v+beta[i]*w)%P for v,w in zip(y,q)]"
            ],
            [
              23,
              "res=(sum(y,zero)-one)%P;g=s.gcd(P,res)"
            ]
          ]
        },
        {
          "pc": 24,
          "lines": [
            [
              21,
              "    q=[(alpha[i]*x)%P for x in q];q[i]+=one"
            ],
            [
              22,
              "    y=[(v+beta[i]*w)%P for v,w in zip(y,q)]"
            ],
            [
              23,
              "res=(sum(y,zero)-one)%P;g=s.gcd(P,res)"
            ],
            [
              24,
              "print(json.dumps({'certificate_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'prime':prime,'minpoly_degree':P.degree(),'first_order_residual_mod_prime':str(res.as_expr()),'gcd_degree':g.degree(),'status':'rejected' if g.degree()==0 else 'not_rejected_by_this_necessary_test','explanation':'An invertible-denominator, degree-preserving modular gcd of 1 rules out a common algebraic root satisfying even sum(b)=1. A non-rejection does not certify all order conditions or isolate a real root.'},indent=2))"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "file": "stop-invalid-proof-job.py",
      "blocks": [
        {
          "pc": 16,
          "lines": [
            [
              13,
              " if parent<=1:break"
            ],
            [
              14,
              "assert matched,'Target is not in this exact run namespace'"
            ],
            [
              15,
              "os.kill(target,signal.SIGTERM)"
            ],
            [
              16,
              "print(json.dumps({'stopped_invalid_certificate_job_pid':target,'reason':'Deterministic list-vs-polynomial type error; missing R5 and an extraneous sum(beta) condition; model feedback delivered','campaign_deadline_unchanged':True}))"
            ]
          ]
        }
      ],
      "role": "run"
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 32,
          "lines": [
            [
              29,
              "}"
            ],
            [
              30,
              "let start = Date.now(), monotonicStart = performance.now();"
            ],
            [
              31,
              "const duration = preflight ? 180_000 : 18_000_000;"
            ],
            [
              32,
              "const priorDeadline = !preflight && existsSync(join(dir, 'deadline.json')) ? JSON.parse(readFileSync(join(dir, 'deadline.json'), 'utf8')) : null;"
            ],
            [
              33,
              "let hard = priorDeadline ? priorDeadline.deadline_epoch*1000 : start + duration;"
            ],
            [
              34,
              "const remaining = () => Math.max(0, Math.min(hard-Date.now(), hard-start-(performance.now()-monotonicStart)));"
            ],
            [
              35,
              "const unlimited = 2_147_483_647;"
            ],
            [
              36,
              "const container = 'objrun-rk-' + start + (preflight ? '-check' : '');"
            ]
          ]
        },
        {
          "pc": 276,
          "lines": [
            [
              273,
              "    { name: 'independent_rooted_tree_check', moment: 'done', domain: 'bool', handle: `http://127.0.0.1:${toolServer.port}/verify` },"
            ],
            [
              274,
              "  ], edges: [{ src: 'candidate_shape', out: 0, dst: 'independent_rooted_tree_check' }], sink: 'independent_rooted_tree_check', checks: unlimited, reuse: 'never' };"
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rk-five-hours', mode: 'rk-search', agent: 'rk', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: Math.max(1, Math.floor(remaining()/1000)), maxBranches: unlimited, maxDeadSiblings: unlimited });"
            ],
            [
              277,
              "  event({ event: 'task_started', id: currentTask, threshold, remaining_seconds: Math.floor(remaining()/1000) });"
            ],
            [
              278,
              "}"
            ],
            [
              279,
              ""
            ],
            [
              280,
              "try {"
            ]
          ]
        },
        {
          "pc": 277,
          "lines": [
            [
              274,
              "  ], edges: [{ src: 'candidate_shape', out: 0, dst: 'independent_rooted_tree_check' }], sink: 'independent_rooted_tree_check', checks: unlimited, reuse: 'never' };"
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rk-five-hours', mode: 'rk-search', agent: 'rk', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: Math.max(1, Math.floor(remaining()/1000)), maxBranches: unlimited, maxDeadSiblings: unlimited });"
            ],
            [
              277,
              "  event({ event: 'task_started', id: currentTask, threshold, remaining_seconds: Math.floor(remaining()/1000) });"
            ],
            [
              278,
              "}"
            ],
            [
              279,
              ""
            ],
            [
              280,
              "try {"
            ],
            [
              281,
              "  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is missing');"
            ]
          ]
        }
      ],
      "role": "db",
      "publication": "rk-search-002"
    },
    {
      "file": "audit_isolation.py",
      "blocks": [
        {
          "pc": 115,
          "lines": [
            [
              112,
              "    return proof"
            ],
            [
              113,
              ""
            ],
            [
              114,
              "if __name__=='__main__':"
            ],
            [
              115,
              "    result=audit(*(Path(x) for x in sys.argv[1:4]));output=Path(sys.argv[4]);output.write_text(json.dumps(result,indent=2))"
            ],
            [
              116,
              "    print(json.dumps({k:v for k,v in result.items() if not k.endswith('_exact') and k not in ['isolating_box','rational_midpoint','rational_preconditioner','independent_K_image']},indent=2))"
            ]
          ]
        }
      ],
      "role": "ai",
      "request": 67
    },
    {
      "file": "audit_isolation.py",
      "blocks": [
        {
          "pc": 115,
          "lines": [
            [
              112,
              "    return proof"
            ],
            [
              113,
              ""
            ],
            [
              114,
              "if __name__=='__main__':"
            ],
            [
              115,
              "    result=audit(*(Path(x) for x in sys.argv[1:4]));output=Path(sys.argv[4]);output.write_text(json.dumps(result,indent=2))"
            ],
            [
              116,
              "    print(json.dumps({k:v for k,v in result.items() if not k.endswith('_exact') and k not in ['isolating_box','rational_midpoint','rational_preconditioner','independent_K_image']},indent=2))"
            ]
          ]
        },
        {
          "pc": 116,
          "lines": [
            [
              113,
              ""
            ],
            [
              114,
              "if __name__=='__main__':"
            ],
            [
              115,
              "    result=audit(*(Path(x) for x in sys.argv[1:4]));output=Path(sys.argv[4]);output.write_text(json.dumps(result,indent=2))"
            ],
            [
              116,
              "    print(json.dumps({k:v for k,v in result.items() if not k.endswith('_exact') and k not in ['isolating_box','rational_midpoint','rational_preconditioner','independent_K_image']},indent=2))"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "file": "finalize.py",
      "blocks": [
        {
          "pc": 70,
          "lines": [
            [
              67,
              "    exact_audit=json.loads((final/'exact-isolation-audit.json').read_text())"
            ],
            [
              68,
              "    shutil.copy2(RUN/'certified.candidate.json',final/'certified.candidate.json')"
            ],
            [
              69,
              "for label,p in [('baseline',RUN/'reference/baseline.json'),('selected',snap)]:"
            ],
            [
              70,
              "    r=subprocess.run([sys.executable,str(RUN/'benchmarks.py'),str(p),str(RUN/'reference/baseline-audit.json')],capture_output=True,text=True,check=True)"
            ],
            [
              71,
              "    (final/(label+'.held-out.json')).write_text(r.stdout)"
            ],
            [
              72,
              "base=json.loads((RUN/'reference/baseline-audit.json').read_text())"
            ],
            [
              73,
              "events=[]"
            ],
            [
              74,
              "for line in (RUN/'calls.jsonl').read_text().splitlines():"
            ]
          ]
        },
        {
          "pc": 71,
          "lines": [
            [
              68,
              "    shutil.copy2(RUN/'certified.candidate.json',final/'certified.candidate.json')"
            ],
            [
              69,
              "for label,p in [('baseline',RUN/'reference/baseline.json'),('selected',snap)]:"
            ],
            [
              70,
              "    r=subprocess.run([sys.executable,str(RUN/'benchmarks.py'),str(p),str(RUN/'reference/baseline-audit.json')],capture_output=True,text=True,check=True)"
            ],
            [
              71,
              "    (final/(label+'.held-out.json')).write_text(r.stdout)"
            ],
            [
              72,
              "base=json.loads((RUN/'reference/baseline-audit.json').read_text())"
            ],
            [
              73,
              "events=[]"
            ],
            [
              74,
              "for line in (RUN/'calls.jsonl').read_text().splitlines():"
            ],
            [
              75,
              "    try:events.append(json.loads(line))"
            ]
          ]
        }
      ],
      "role": "result"
    }
  ],
  "requests": {
    "2": {
      "task": "rk-search-001",
      "units": 3,
      "root": true,
      "rows": [
        [
          1,
          "system",
          "instructions"
        ],
        [
          2,
          "user",
          "brief"
        ],
        [
          3,
          "assistant",
          "run_command + run_command"
        ],
        [
          4,
          "tool",
          "#2"
        ],
        [
          5,
          "tool",
          "#3"
        ],
        [
          6,
          "user",
          "task-view"
        ]
      ]
    },
    "4": {
      "task": "rk-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          7,
          "tool",
          "#4"
        ],
        [
          8,
          "tool",
          "#5"
        ],
        [
          9,
          "assistant",
          "run_command + run_command"
        ],
        [
          10,
          "tool",
          "#6"
        ],
        [
          11,
          "tool",
          "#7"
        ],
        [
          12,
          "user",
          "task-view"
        ]
      ]
    },
    "10": {
      "task": "rk-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          20,
          "tool",
          "#12"
        ],
        [
          21,
          "assistant",
          "run_command"
        ],
        [
          22,
          "tool",
          "#13"
        ],
        [
          23,
          "assistant",
          "run_command"
        ],
        [
          24,
          "tool",
          "#14"
        ],
        [
          25,
          "user",
          "task-view"
        ]
      ]
    },
    "23": {
      "task": "rk-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          52,
          "tool",
          "#24"
        ],
        [
          53,
          "assistant",
          "run_command"
        ],
        [
          54,
          "tool",
          "#25"
        ],
        [
          55,
          "assistant",
          "run_command"
        ],
        [
          56,
          "tool",
          "#26"
        ],
        [
          57,
          "user",
          "task-view"
        ]
      ]
    },
    "67": {
      "task": "rk-search-002",
      "units": 5,
      "root": false,
      "rows": [
        [
          44,
          "tool",
          "#61"
        ],
        [
          45,
          "assistant",
          "run_command"
        ],
        [
          46,
          "tool",
          "#62"
        ],
        [
          47,
          "assistant",
          "run_command"
        ],
        [
          48,
          "tool",
          "#63"
        ],
        [
          49,
          "user",
          "task-view"
        ]
      ]
    },
    "1": {
      "task": "rk-search-001",
      "units": 1,
      "root": true,
      "rows": [
        [
          1,
          "system",
          "instructions"
        ],
        [
          2,
          "user",
          "brief"
        ],
        [
          3,
          "user",
          "task-view"
        ]
      ]
    }
  },
  "calls": {
    "2": {
      "source": "requests/1.response.json · arguments.command",
      "tool": "run_command",
      "body": "cat /reference/baseline-audit.json 2>&1 | head -100",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 3,
        "running": false,
        "exitCode": 0
      },
      "slot": 5,
      "label": "#3",
      "output": "{\n  \"id\": 3,\n  \"running\": false,\n  \"exitCode\": 0\n}\n\"source_url\": \"https://link.springer.com/article/10.1007/s10543-026-01139-3/tables/8\",\n  \"alpha\": [\n    \"0\",\n    \"-9/16\",\n    \"-62032/41503\",\n    \"5929/9234\",\n    \"-45/98\"\n  ],\n  \"beta\": [\n    \"1/4\",\n    \"36/49\",\n    \"847/3078\",\n    \"3/14\",\n    \"7/43\"\n  ],\n  \"A\": [\n    [\n      \"0\",\n      \"0\",\n      \"0\",\n      \"0\",\n      \"0\"\n    ],\n    [\n      \"1/4\",\n      \"0\",\n      \"0\",\n      \"0\",\n      \"0\"\n    ],\n    [\n      \"-8/49\",\n      \"36/49\",\n      \"0\",\n      \"0\",\n      \"0\"\n    ],\n    [\n      \"163/2394\",\n      \"3484/10773\",\n      \"847/3078\",\n      \"0\",\n      \"0\"\n    ],\n    [\n      \"2053/11172\",\n      \"2960/25137\",\n      \"847/2052\",\n      \"3/14\",\n      \"0\"\n    ]\n  ],\n  \"b\": [\n    \"37/258\",\n    \"220/11…"
    },
    "4": {
      "source": "requests/3.response.json · arguments.command · L1–36",
      "tool": "run_command",
      "body": "cd /work && cat > solve9.py <<'EOF'\nimport numpy as np\nfrom scipy.optimize import fsolve\nR4=np.float64(1901)/68628; R5=np.float64(121)/68628\n\ndef build(x):\n    a=[0.0]+list(x[:4]); b=list(x[4:9])\n    beta=[b[i]-a[i+1]*b[i+1] for i in range(4)]+[b[4]]\n    rows=[]\n    for i in range(5):\n        if i==0: r=np.zeros(5); r[0]=1.0\n        else: r=a[i]*rows[-1].copy(); r[i]+=1.0\n        rows.append(r)\n    A=np.zeros((5,5))\n    for i in range(5):\n        for j in range(i):\n            A[i]+=beta[j]*rows[j]\n    return a,b,beta,A\n\ndef resid(x):\n    a,b,beta,A=build(x)\n    c=A@np.ones(5)\n    Ac=A@c; A2c=A@Ac; A3c=A@A2c\n    c2=c*c; c3=c2*c\n    return np.array([b@np.ones(5)-1.0, b@c-0.5, b@c2-1.0/3, b@c3-0.25,\n                     b@Ac-1.0/6, b@(A@c2)-1.0/12, b@(c*Ac)-0.125,\n                     b@A2c-R4, b@A3c-R5])\n\nrng=np.random.default_rng(0)\nsols=[]\nfor trial in range(20000):\n    x0=rng.uniform(-2,2,9)\n    try:\n        s,info,ier,msg=fsolve(resid,x0,full_output=True)\n    except Exception: continue\n    if ier==1 and np.max(np.abs(resid(s)))<1e-11:",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 7,
        "running": false,
        "exitCode": 0
      },
      "slot": 11,
      "label": "#7",
      "output": "{\n  \"id\": 7,\n  \"running\": false,\n  \"exitCode\": 0\n}\nnum sols 12\n[-8.40265774e-01 -1.09314862e+00 -7.67982939e-01 -7.02685819e+01\n  1.62149972e-01  3.26792948e-01  3.12419747e-01  1.86158842e-01\n  1.24784916e-02] 5.822675674949096e-12\n[-0.83131889 -5.3182433   0.06998477 -2.10554938  0.17133184  0.33509869\n  0.11223981  0.28728964  0.09404002] 3.304301277040622e-13\n[ 0.13647375 -8.88643709  0.07726864 -1.4167039   0.27080446  0.19758338\n -0.06809473  0.33372965  0.26597724] 2.1843638009499955e-14\n[-3.34247762e-01 -1.30423338e+00 -7.61939263e+03 -5.83776000e-05\n  3.41609180e-01 -3.27234368e-01  6.23207546e-01  2.33600940e-03\n  3.60081632e-01] 1.5102086248219848e-12\n[-1.02772084e+02  4.33967600e-03 -1.00572618e+00 -1.16515830e+00\n -9.49158304e-0…"
    },
    "10": {
      "source": "requests/9.response.json · arguments.command",
      "tool": "run_command",
      "body": "cd /work && cat > mkcand.py <<'EOF'\nimport mpmath as mp, pickle, json, os, time, hashlib\nmp.mp.dps=120\nsols=pickle.load(open('sols.pkl','rb'))\nidx=1\nx=[mp.mpf(v) for v in sols[idx]]\nal=[\"0\"]+[mp.nstr(v,60) for v in x[:4]]\nbe=[mp.nstr(v,60) for v in x[4:]]\ncand={\"schema\":\"williamson-2n-v1\",\"stages\":5,\"alpha\":al,\"beta\":be}\ntmp=\"/work/.candidate.tmp\"\nopen(tmp,\"w\").write(json.dumps(cand,indent=1))\nos.replace(tmp,\"/work/candidate.json\")\nprint(json.dumps(cand,indent=1))\nprog={\"starts\":time.time(),\"evaluations\":7,\"objectives\":{\"error_norm\":mp.nstr(mp.mpf(639)/45752,40)},\n \"residuals\":{\"max\":mp.nstr(max(abs(v) for v in [mp.mpf(s) for s in sols[idx]]),3)},\n \"algorithm\":\"9-equation Newton (order1-3 + stability c4,c5 + e1=e2=e3=0)\",\"seed\":idx,\n \"checkpoint\":time.strftime(\"%Y-%m-%dT%H:%M:%SZ\",time.gmtime()),\n \"floor\":\"639/45752 = b*A^2*c - 1/24 fixed by stability polynomial coefficient c4=1901/68628\",\n \"note\":\"all solutions of the 9-eq system attain the floor exactly\"}\nopen(\"/work/progress.json\",\"w\").write(json.dumps(prog,indent=1))\nprint(\"sha256\",hashlib.sha256(open('/work/candidate.json','rb').read()).hexdigest())\nEOF\npython3 mkcand.py",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 14,
        "running": false,
        "exitCode": 0
      },
      "slot": 24,
      "label": "#14",
      "output": "{\n  \"id\": 14,\n  \"running\": false,\n  \"exitCode\": 0\n}\n{\n \"schema\": \"williamson-2n-v1\",\n \"stages\": 5,\n \"alpha\": [\n  \"0\",\n  \"-0.831318887966203907022300243533966822663843075109661449049569\",\n  \"-5.31824329626261459177783165358317648077672538880474371973265\",\n  \"0.0699847695712632139762472104750187462241050008800285320556027\",\n  \"-2.10554938345081985154013118929385185018814840315142948992607\"\n ],\n \"beta\": [\n  \"0.449905709914644562284326724913704801404466455700576176189734\",\n  \"0.932017325137007306987380500081187702695403534978816327893916\",\n  \"0.0921339150571591318583406320240533280759571523617925981938071\",\n  \"0.485295542203269815161700006589869750439144801658174921598331\",\n  \"0.0940400192098557327481256165015576297281116880266934781685315\"\n ]\n}\n…"
    },
    "23": {
      "source": "requests/22.response.json · arguments.command · L1–36",
      "tool": "run_command",
      "body": "cd /work && sha256sum candidate.json && cat > mkfree.py <<'EOF'\nimport numpy as np, mpmath as mp, json, os, pickle\nfrom scipy.optimize import least_squares\ndef build_np(x):\n    a=[0.0]+list(x[:4]); be=list(x[4:9])\n    rows=[]\n    for i in range(5):\n        if i==0: r=np.zeros(5); r[0]=1.0\n        else: r=a[i]*rows[-1].copy(); r[i]+=1.0\n        rows.append(r)\n    A=np.zeros((5,5))\n    for i in range(5):\n        for j in range(i): A[i]+=be[j]*rows[j]\n    b=np.zeros(5)\n    for j in range(5): b+=be[j]*rows[j]\n    return A,b\ndef resid8_np(x,target):\n    A,b=build_np(x); c=A@np.ones(5); Ac=A@c; A2c=A@Ac\n    c2=c*c; c3=c2*c\n    return np.array([b@np.ones(5)-1,b@c-0.5,b@c2-1/3,b@c3-0.25,b@Ac-1/6,\n                     b@(A@c2)-1/12,b@(c*Ac)-0.125,b@A2c-target])\nsols=pickle.load(open('sols.pkl','rb'))\nx0=np.array([float(v) for v in sols[1]])\nbest=None\nfor trial in range(60):\n    xx=x0+np.random.default_rng(trial).normal(0,0.3,9)\n    r=least_squares(resid8_np,xx,args=(1/24,),xtol=1e-15,ftol=1e-15,gtol=1e-15)\n    if best is None or r.cost<best.cost: best=r\nprint(\"cost\",best.cost,\"maxres\",np.max(np.abs(best.fun)))\nxseed=best.x\nmp.mp.dps=200\ndef build(x):\n    al=[mp.mpf(0)]+[x[i] for i in range(4)]; be=[x[4+i] for i in range(5)]\n    rows=[]\n    for i in range(5):\n        if i==0: r=[mp.mpf(0)]*5; r[0]=mp.mpf(1)",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 26,
        "running": false,
        "exitCode": 0
      },
      "slot": 56,
      "label": "#26",
      "output": "{\n  \"id\": 26,\n  \"running\": false,\n  \"exitCode\": 0\n}\nccb00d4d7f351ab343a1ce8142d813417445c367d2e64546a06f176e6ce88e33  candidate.json\ncost 4.857893469349449e-30 maxres 1.942890293094024e-15\nfinal resid 8.1651e-202\nb.A2c 0.0416666666666666666666666666667 b.A3c 0.0047002919486847496924163413022\nc4-1/24 0.0 c5-1/120 -0.0036330414\nc4-1901/68628 0.013966603\n{\n \"schema\": \"williamson-2n-v1\",\n \"stages\": 5,\n \"alpha\": [\n  \"0\",\n  \"-0.909389243932681440244887835952588766585006709263150501533326\",\n  \"-5.43362409324787776670399488316210521449368515808174203801264\",\n  \"-0.189143737172364027412047159899927590624443292974931668943845\",\n  \"-2.84272320778954548508813954554999416356032017805078105307733\"\n ],\n \"beta\": [\n  \"0.439134332974592357919035826232804450396…"
    },
    "67": {
      "source": "requests/66.response.json · arguments.command · L1–36",
      "tool": "run_command",
      "body": "cd /work && cat > mkcert2.py <<'PYEOF'\nimport json, pickle, time\nfrom fractions import Fraction as F\nimport mpmath as mp\nimport sympy as sp\nmp.mp.dps = 220\n\nclass IV:\n    __slots__=('lo','hi')\n    def __init__(s,lo,hi=None):\n        if hi is None: hi=lo\n        s.lo=F(lo); s.hi=F(hi)\n    def __add__(s,o): o=iv(o); return IV(s.lo+o.lo,s.hi+o.hi)\n    def __radd__(s,o): return iv(o).__add__(s)\n    def __sub__(s,o): o=iv(o); return IV(s.lo-o.hi,s.hi-o.lo)\n    def __rsub__(s,o): o=iv(o); return IV(o.lo-s.hi,o.hi-s.lo)\n    def __mul__(s,o):\n        o=iv(o); p=(s.lo*o.lo,s.lo*o.hi,s.hi*o.lo,s.hi*o.hi)\n        return IV(min(p),max(p))\n    def __rmul__(s,o): return iv(o).__mul__(s)\n    def __neg__(s): return IV(-s.hi,-s.lo)\n    def __pow__(s,n):\n        r=IV(1)\n        for _ in range(n): r=r*s\n        return r\ndef iv(x):\n    if isinstance(x,IV): return x\n    if isinstance(x,F): return IV(x)\n    return IV(F(x))\ndef pf(s):\n    if '/' in s:\n        n,d=s.split('/'); return F(int(n),int(d))\n    return F(int(s))\ndef fs(x): return str(x.numerator)+\"/\"+str(x.denominator) if x.denominator!=1 else str(x.numerator)\n\n# ---------------- symbolic exact system ----------------",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 63,
        "running": false,
        "exitCode": 0
      },
      "slot": 48,
      "label": "#63",
      "output": "{\n  \"id\": 63,\n  \"running\": false,\n  \"exitCode\": 0\n}\nmax |F(m)| = 1.815e-80\nKrawczyk strict inclusion: True\nwrote certificate, inclusion = True\n=== independent verify ===\nlabels: ['b.1-1', 'b.c-1/2', 'b.c2-1/3', 'b.Ac-1/6', 'b.A2c-1901/68628', 'b.A3c-121/68628', 'b.c3-1/4', 'b.Ac2-1/12', 'b.(c*Ac)-1/8']\ndegrees: [5, 5, 9, 5, 5, 5, 13, 8, 9]\n0 in F(X): True\nmax |F(m)| = 1.815e-80\n||I-Y J(m)||_inf = 0.000e+00\nINDEPENDENT Krawczyk inclusion: True\n  x0  slack=1.000e-25 / 1.000e-25\n  x1  slack=1.000e-25 / 1.000e-25\n  x2  slack=1.000e-25 / 1.000e-25\n  x3  slack=1.000e-25 / 1.000e-25\n  x4  slack=1.000e-25 / 1.000e-25\n  x5  slack=1.000e-25 / 1.000e-25\n  x6  slack=1.000e-25 / 1.000e-25\n  x7  slack=1.000e-25 / 1.000e-25\n  x8  slack=1.000e-25 / 1.000e-25…"
    }
  },
  "kernelSource": [
    [
      538,
      [
        "      this.#restate(p.task, p.sub);",
        "",
        "      await this.#atMoment(p, facts, \"pre_send\");",
        "",
        "      const pickd = this.#handleOf(p);",
        "      const back = await this.#reg.get(pickd.handle).call({",
        "        ...facts,",
        "        place: p.place,",
        "        instance: p.instance,",
        "        unit: p.unit,",
        "        // 这一站挑好的那条轨。适配器直接用，不用自己再挑一遍。"
      ]
    ],
    [
      561,
      [
        "",
        "      // 回来再落一行",
        "      // 模型自己说的那条**不走投递管道** —— 那是它自己的轨迹，直接落库；",
        "      // 而且 kind 得由适配器说（prompt 还是 call），推不出来。",
        "      const r = (back ?? {}) as { role?: string; kind?: string; body?: unknown } & Partial<Said>;",
        "      this.#push(p, r.role ?? \"assistant\", r.kind ?? \"prompt\", text(r.body ?? back), r);",
        "",
        "      // A late HTTP/model response may be recorded, but cannot reopen a closed task or unit.",
        "      const taskState = String(one(this.#store.ro, \"select state from task where id = ?\", [p.task])?.state);",
        "      const unitDone = Number(one(this.#store.ro, `select done from \"${p.sub}\" where task = ? and unit = ?`, [p.task, p.unit])?.done) === 1;"
      ]
    ],
    [
      882,
      [
        "  #contextOf(p: Pending): Row[] {",
        "    const line: number[] = [];",
        "    const seen = new Set<string>();",
        "    let cur: Unit = p;",
        "    for (;;) {",
        "      const key = `${cur.cycle}#${cur.unit}`;",
        "      if (seen.has(key)) throw new Error(`chain for ${p.task} in ${p.sub} is cyclic, at ${key}`);",
        "      seen.add(key);",
        "      line.unshift(cur.unit);",
        "      if (cur.from_cycle === null || cur.from_unit === null) break;",
        "      const up = one(",
        "        this.#store.ro,",
        "        `select task, cycle, unit, from_cycle, from_unit from \"${p.sub}\" where task = ? and cycle = ? and unit = ?`,",
        "        [p.task, cur.from_cycle, cur.from_unit],",
        "      ) as unknown as Unit | null;",
        "      if (!up) {",
        "        throw new Error(`${p.sub} ${p.task} ${cur.cycle}#${cur.unit} says it came from ${cur.from_cycle}#${cur.from_unit}, but that row is missing`);",
        "      }",
        "      cur = up;",
        "    }",
        "",
        "    const t = this.#msgTable(p.agent);",
        "    const holes = line.map(() => \"?\").join(\", \");",
        "    // 按 unit 的先后、再按 seq 排 —— unit 编号在一个任务里单调递增，所以它就是时间序。",
        "    let rows = all(",
        "      this.#store.ro,",
        "      `select unit, seq, role, kind, body, thought from \"${t}\"",
        "        where instance = ? and unit in (${holes}) order by unit, seq`,",
        "      [p.instance, ...line],"
      ]
    ],
    [
      928,
      [
        "    // 认不出来，该补的漏掉。漏掉之后原文里那个悬空的调用还在，一路发到那一端，",
        "    // SDK 本地就拒：`Tool result is missing for tool call …`。八站栽在这儿，全是交卷站。",
        "    const typed = rows as unknown as { unit: number; seq: number; kind: string; body: string }[];",
        "    if (answerMissing(this.#store.rw, p.agent, p.instance, typed) > 0) {",
        "      rows = all(",
        "        this.#store.ro,",
        "        `select unit, seq, role, kind, body, thought from \"${t}\"",
        "          where instance = ? and unit in (${holes}) order by unit, seq`,",
        "        [p.instance, ...line],",
        "      );",
        "    }",
        "    return this.#mend(p, this.#fit(p, rows, line));",
        "  }"
      ]
    ]
  ],
  "revisionPairs": []
};
