const archivedCaseTrace = {
  "taskTable": "task_rna_bound_search",
  "initialTask": "rna-bound-search-001",
  "messageTable": "agent_rna_msg",
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
              "  const recoveryNote=existsSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt')) ? readFileSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt'),'utf8') : '';"
            ],
            [
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
          "pc": 69,
          "lines": [
            [
              66,
              "  const first=Date.now(); clockWall=first; monotonicStart=performance.now(); hard=first+18_000_000;"
            ],
            [
              67,
              "  deadline={started_utc:new Date(first).toISOString(),deadline_utc:new Date(hard).toISOString(),deadline_epoch:hard/1000,duration_seconds:18000,model,only_campaign_budget:'elapsed time; begins immediately before first paid dispatch'};"
            ],
            [
              68,
              "  put(join(dir,'deadline.json'),deadline); armTimer();"
            ],
            [
              69,
              "  event({event:'first_paid_dispatch_clock',...deadline});"
            ],
            [
              70,
              "}"
            ],
            [
              71,
              ""
            ],
            [
              72,
              "const token = randomBytes(24).toString('hex');"
            ],
            [
              73,
              "let graderQueue = Promise.resolve();"
            ]
          ]
        }
      ],
      "role": "run",
      "publication": "rna-bound-search-001"
    },
    {
      "request": 2
    },
    {
      "request": 21
    },
    {
      "request": 25
    },
    {
      "file": "checker/check.py",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              " out=Path(args.out);out.mkdir(parents=True,exist_ok=True)"
            ],
            [
              122,
              " try:"
            ],
            [
              123,
              "  raw=Path(args.certificate).read_bytes();cert=json.loads(raw);freeze=json.loads(Path(args.freeze).read_text())"
            ],
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
            ]
          ]
        },
        {
          "pc": 127,
          "lines": [
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "request": 44
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 147,
          "lines": [
            [
              144,
              "    '/audit/'+hash+'.candidate.json','--freeze','/freeze.json','--out','/audit/'+hash+'-proof'];"
            ],
            [
              145,
              "  const checked=await command(argv);"
            ],
            [
              146,
              "  writeFileSync(join(dir,'verified',hash+'.checker.stdout.log'),checked.stdout);"
            ],
            [
              147,
              "  writeFileSync(join(dir,'verified',hash+'.checker.stderr.log'),checked.stderr);"
            ],
            [
              148,
              "  if(checked.code!==0) return {value:false,note:'Independent checker incomplete/interrupted; no universal bound. '+checked.stderr.slice(-2000)};"
            ],
            [
              149,
              "  let report:any;try{report=JSON.parse(checked.stdout.trim());}catch{throw Error('Invalid checker response');}"
            ],
            [
              150,
              "  report={...report,artifact,raw_sha256:hash,task:taskId,checked_utc:new Date().toISOString()};"
            ],
            [
              151,
              "  put(reportPath,report);appendFileSync(join(dir,'verifier-events.jsonl'),JSON.stringify(report)+'\\n');"
            ]
          ]
        },
        {
          "pc": 151,
          "lines": [
            [
              148,
              "  if(checked.code!==0) return {value:false,note:'Independent checker incomplete/interrupted; no universal bound. '+checked.stderr.slice(-2000)};"
            ],
            [
              149,
              "  let report:any;try{report=JSON.parse(checked.stdout.trim());}catch{throw Error('Invalid checker response');}"
            ],
            [
              150,
              "  report={...report,artifact,raw_sha256:hash,task:taskId,checked_utc:new Date().toISOString()};"
            ],
            [
              151,
              "  put(reportPath,report);appendFileSync(join(dir,'verifier-events.jsonl'),JSON.stringify(report)+'\\n');"
            ],
            [
              152,
              "  const prev=Number(best[report.target_id]?.probability_upper ?? 1.0000000000000002);"
            ],
            [
              153,
              "  const better=report.valid&&Number(report.probability_upper)<prev;"
            ],
            [
              154,
              "  if(better){best[report.target_id]=report;put(join(dir,'best-verified.json'),best);copyFileSync(artifact,join(dir,'best-'+report.target_id+'.candidate.json'));event({event:'verified_bound',target:report.target_id,bound:report.probability_upper,improved:report.improved,sha256:hash});}"
            ],
            [
              155,
              "  return {value:Boolean(better&&report.improved),note:JSON.stringify(report)};"
            ]
          ]
        }
      ],
      "role": "result"
    },
    {
      "request": 50
    },
    {
      "file": "checker/check.py",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              " out=Path(args.out);out.mkdir(parents=True,exist_ok=True)"
            ],
            [
              122,
              " try:"
            ],
            [
              123,
              "  raw=Path(args.certificate).read_bytes();cert=json.loads(raw);freeze=json.loads(Path(args.freeze).read_text())"
            ],
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
            ]
          ]
        },
        {
          "pc": 127,
          "lines": [
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
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
          "pc": 147,
          "lines": [
            [
              144,
              "    '/audit/'+hash+'.candidate.json','--freeze','/freeze.json','--out','/audit/'+hash+'-proof'];"
            ],
            [
              145,
              "  const checked=await command(argv);"
            ],
            [
              146,
              "  writeFileSync(join(dir,'verified',hash+'.checker.stdout.log'),checked.stdout);"
            ],
            [
              147,
              "  writeFileSync(join(dir,'verified',hash+'.checker.stderr.log'),checked.stderr);"
            ],
            [
              148,
              "  if(checked.code!==0) return {value:false,note:'Independent checker incomplete/interrupted; no universal bound. '+checked.stderr.slice(-2000)};"
            ],
            [
              149,
              "  let report:any;try{report=JSON.parse(checked.stdout.trim());}catch{throw Error('Invalid checker response');}"
            ],
            [
              150,
              "  report={...report,artifact,raw_sha256:hash,task:taskId,checked_utc:new Date().toISOString()};"
            ],
            [
              151,
              "  put(reportPath,report);appendFileSync(join(dir,'verifier-events.jsonl'),JSON.stringify(report)+'\\n');"
            ]
          ]
        },
        {
          "pc": 151,
          "lines": [
            [
              148,
              "  if(checked.code!==0) return {value:false,note:'Independent checker incomplete/interrupted; no universal bound. '+checked.stderr.slice(-2000)};"
            ],
            [
              149,
              "  let report:any;try{report=JSON.parse(checked.stdout.trim());}catch{throw Error('Invalid checker response');}"
            ],
            [
              150,
              "  report={...report,artifact,raw_sha256:hash,task:taskId,checked_utc:new Date().toISOString()};"
            ],
            [
              151,
              "  put(reportPath,report);appendFileSync(join(dir,'verifier-events.jsonl'),JSON.stringify(report)+'\\n');"
            ],
            [
              152,
              "  const prev=Number(best[report.target_id]?.probability_upper ?? 1.0000000000000002);"
            ],
            [
              153,
              "  const better=report.valid&&Number(report.probability_upper)<prev;"
            ],
            [
              154,
              "  if(better){best[report.target_id]=report;put(join(dir,'best-verified.json'),best);copyFileSync(artifact,join(dir,'best-'+report.target_id+'.candidate.json'));event({event:'verified_bound',target:report.target_id,bound:report.probability_upper,improved:report.improved,sha256:hash});}"
            ],
            [
              155,
              "  return {value:Boolean(better&&report.improved),note:JSON.stringify(report)};"
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
          "pc": 32,
          "lines": [
            [
              29,
              "}"
            ],
            [
              30,
              "const start = Date.now(); let clockWall=start, monotonicStart=performance.now();"
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
              "const remaining = () => Math.max(0, Math.min(hard-Date.now(), hard-clockWall-(performance.now()-monotonicStart)));"
            ],
            [
              35,
              "const unlimited = 2_147_483_647;"
            ],
            [
              36,
              "const container = 'objrun-rna-' + start + (preflight ? '-check' : '');"
            ]
          ]
        },
        {
          "pc": 276,
          "lines": [
            [
              273,
              "  const recoveryNote=existsSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt')) ? readFileSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt'),'utf8') : '';"
            ],
            [
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
      "publication": "rna-bound-search-002"
    },
    {
      "request": 75
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
              "const start = Date.now(); let clockWall=start, monotonicStart=performance.now();"
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
              "const remaining = () => Math.max(0, Math.min(hard-Date.now(), hard-clockWall-(performance.now()-monotonicStart)));"
            ],
            [
              35,
              "const unlimited = 2_147_483_647;"
            ],
            [
              36,
              "const container = 'objrun-rna-' + start + (preflight ? '-check' : '');"
            ]
          ]
        },
        {
          "pc": 276,
          "lines": [
            [
              273,
              "  const recoveryNote=existsSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt')) ? readFileSync(join(work,'MONITOR-FEEDBACK-20261030T1722.txt'),'utf8') : '';"
            ],
            [
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
              275,
              ""
            ],
            [
              276,
              "  await api('POST', '/tasks', { id: currentTask, run: 'rna-five-hours', mode: 'rna-bound-search', agent: 'rna', place: 'local', source: 'user', description, objective, readable: false, solveSeconds: unlimited, maxBranches: unlimited, maxDeadSiblings: unlimited });"
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
      "publication": "rna-bound-search-003"
    },
    {
      "request": 200
    },
    {
      "request": 278
    },
    {
      "file": "run.ts",
      "blocks": [
        {
          "pc": 111,
          "lines": [
            [
              108,
              "  proc.stdin.write(cmd); proc.stdin.end();"
            ],
            [
              109,
              "  const job = { id, proc, logPath, errPath, started: new Date().toISOString(), exitCode: null as number|null };"
            ],
            [
              110,
              "  jobs.set(id, job);"
            ],
            [
              111,
              "  event({ event: 'job_started', id });"
            ],
            [
              112,
              "  proc.exited.then((code: number) => { job.exitCode = code; event({ event: 'job_finished', id, code }); });"
            ],
            [
              113,
              "  return job;"
            ],
            [
              114,
              "}"
            ],
            [
              115,
              ""
            ]
          ]
        },
        {
          "pc": 112,
          "lines": [
            [
              109,
              "  const job = { id, proc, logPath, errPath, started: new Date().toISOString(), exitCode: null as number|null };"
            ],
            [
              110,
              "  jobs.set(id, job);"
            ],
            [
              111,
              "  event({ event: 'job_started', id });"
            ],
            [
              112,
              "  proc.exited.then((code: number) => { job.exitCode = code; event({ event: 'job_finished', id, code }); });"
            ],
            [
              113,
              "  return job;"
            ],
            [
              114,
              "}"
            ],
            [
              115,
              ""
            ],
            [
              116,
              "function jobStatus(id: number, tail = 100) {"
            ]
          ]
        }
      ],
      "role": "run"
    },
    {
      "file": "checker/check.py",
      "blocks": [
        {
          "pc": 124,
          "lines": [
            [
              121,
              " out=Path(args.out);out.mkdir(parents=True,exist_ok=True)"
            ],
            [
              122,
              " try:"
            ],
            [
              123,
              "  raw=Path(args.certificate).read_bytes();cert=json.loads(raw);freeze=json.loads(Path(args.freeze).read_text())"
            ],
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
            ]
          ]
        },
        {
          "pc": 127,
          "lines": [
            [
              124,
              "  result=verify(cert,freeze,out);result['certificate_sha256']=sha(raw)"
            ],
            [
              125,
              " except Exception as e:result={'valid':False,'complete':False,'error':str(e),'error_type':type(e).__name__}"
            ],
            [
              126,
              " dump(out/'report.json',result)"
            ],
            [
              127,
              " print(json.dumps({k:v for k,v in result.items() if k!='components'}))"
            ],
            [
              128,
              "if __name__=='__main__':main()"
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
          "pc": 28,
          "lines": [
            [
              25,
              " except (psutil.Error,KeyError):pass"
            ],
            [
              26,
              "for n,h in json.loads((run/'frozen-g.json').read_text())['files'].items():assert hashlib.sha256((run/n).read_bytes()).hexdigest()==h,('frozen checker changed',n)"
            ],
            [
              27,
              "freeze=json.loads((run/'targets-frozen.json').read_text())"
            ],
            [
              28,
              "best=json.loads((run/'best-verified.json').read_text())"
            ],
            [
              29,
              "results=[]"
            ],
            [
              30,
              "for target in freeze['targets']:"
            ],
            [
              31,
              " tid=target['id'];b=best.get(tid);fresh=None"
            ],
            [
              32,
              " if b and b.get('valid'):"
            ]
          ]
        },
        {
          "pc": 29,
          "lines": [
            [
              26,
              "for n,h in json.loads((run/'frozen-g.json').read_text())['files'].items():assert hashlib.sha256((run/n).read_bytes()).hexdigest()==h,('frozen checker changed',n)"
            ],
            [
              27,
              "freeze=json.loads((run/'targets-frozen.json').read_text())"
            ],
            [
              28,
              "best=json.loads((run/'best-verified.json').read_text())"
            ],
            [
              29,
              "results=[]"
            ],
            [
              30,
              "for target in freeze['targets']:"
            ],
            [
              31,
              " tid=target['id'];b=best.get(tid);fresh=None"
            ],
            [
              32,
              " if b and b.get('valid'):"
            ],
            [
              33,
              "  artifact=Path(b['artifact']);assert hashlib.sha256(artifact.read_bytes()).hexdigest()==b['raw_sha256']"
            ]
          ]
        }
      ],
      "role": "run"
    },
    {
      "file": "finalize.py",
      "blocks": [
        {
          "pc": 39,
          "lines": [
            [
              36,
              "  proc=subprocess.run(['wsl','-d','Ubuntu','--','env','OMP_NUM_THREADS=4',py,linux(run/'checker/check.py'),linux(artifact),'--freeze',linux(run/'targets-frozen.json'),'--out',linux(out)],capture_output=True,text=True)"
            ],
            [
              37,
              "  (out/'host.stdout.log').write_text(proc.stdout);(out/'host.stderr.log').write_text(proc.stderr)"
            ],
            [
              38,
              "  if proc.returncode==0:"
            ],
            [
              39,
              "   try:fresh=json.loads(proc.stdout)"
            ],
            [
              40,
              "   except ValueError:pass"
            ],
            [
              41,
              " old=Decimal(target['author_cache_baseline']); paper=Decimal(target['paper_display_bound'])"
            ],
            [
              42,
              " independently_proved=Decimal(fresh['probability_upper']) if fresh and fresh.get('valid') else None"
            ],
            [
              43,
              " improved=independently_proved is not None and independently_proved<min(old,paper)"
            ]
          ]
        },
        {
          "pc": 42,
          "lines": [
            [
              39,
              "   try:fresh=json.loads(proc.stdout)"
            ],
            [
              40,
              "   except ValueError:pass"
            ],
            [
              41,
              " old=Decimal(target['author_cache_baseline']); paper=Decimal(target['paper_display_bound'])"
            ],
            [
              42,
              " independently_proved=Decimal(fresh['probability_upper']) if fresh and fresh.get('valid') else None"
            ],
            [
              43,
              " improved=independently_proved is not None and independently_proved<min(old,paper)"
            ],
            [
              44,
              " # Preserve the original reference if this campaign did not improve it."
            ],
            [
              45,
              " new=min(old,independently_proved) if independently_proved is not None else old"
            ]
          ]
        }
      ],
      "role": "result"
    }
  ],
  "requests": {
    "2": {
      "task": "rna-bound-search-001",
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
    "21": {
      "task": "rna-bound-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          53,
          "tool",
          "#34"
        ],
        [
          54,
          "assistant",
          "run_command"
        ],
        [
          55,
          "tool",
          "#35"
        ],
        [
          56,
          "assistant",
          "run_command"
        ],
        [
          57,
          "tool",
          "#36"
        ],
        [
          58,
          "user",
          "task-view"
        ]
      ]
    },
    "25": {
      "task": "rna-bound-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          61,
          "tool",
          "#38"
        ],
        [
          62,
          "assistant",
          "run_command"
        ],
        [
          63,
          "tool",
          "#39"
        ],
        [
          64,
          "assistant",
          "run_command"
        ],
        [
          65,
          "tool",
          "#40"
        ],
        [
          66,
          "user",
          "task-view"
        ]
      ]
    },
    "44": {
      "task": "rna-bound-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          101,
          "assistant",
          "run_command"
        ],
        [
          102,
          "tool",
          "#58"
        ],
        [
          103,
          "assistant",
          "run_command + run_command"
        ],
        [
          104,
          "tool",
          "#59"
        ],
        [
          105,
          "tool",
          "#60"
        ],
        [
          106,
          "user",
          "task-view"
        ]
      ]
    },
    "50": {
      "task": "rna-bound-search-001",
      "units": 5,
      "root": false,
      "rows": [
        [
          117,
          "tool",
          "#66"
        ],
        [
          118,
          "assistant",
          "run_command"
        ],
        [
          119,
          "tool",
          "#67"
        ],
        [
          120,
          "assistant",
          "run_command"
        ],
        [
          121,
          "tool",
          "#68"
        ],
        [
          122,
          "user",
          "task-view"
        ]
      ]
    },
    "75": {
      "task": "rna-bound-search-002",
      "units": 5,
      "root": false,
      "rows": [
        [
          44,
          "assistant",
          "job_status + run_command"
        ],
        [
          45,
          "tool",
          "#103"
        ],
        [
          46,
          "tool",
          "#105"
        ],
        [
          47,
          "assistant",
          "run_command"
        ],
        [
          48,
          "tool",
          "#106"
        ],
        [
          49,
          "user",
          "task-view"
        ]
      ]
    },
    "200": {
      "task": "rna-bound-search-003",
      "units": 5,
      "root": false,
      "rows": [
        [
          392,
          "tool",
          "#177"
        ],
        [
          393,
          "assistant",
          "run_command + job_status + job_status"
        ],
        [
          394,
          "tool",
          "#180"
        ],
        [
          395,
          "tool",
          "#170"
        ],
        [
          396,
          "tool",
          "#177"
        ],
        [
          397,
          "user",
          "task-view"
        ]
      ]
    },
    "278": {
      "task": "rna-bound-search-003",
      "units": 5,
      "root": false,
      "rows": [
        [
          708,
          "tool",
          "#170"
        ],
        [
          709,
          "assistant",
          "run_command + job_status + job_status"
        ],
        [
          710,
          "tool",
          "#186"
        ],
        [
          711,
          "tool",
          "#180"
        ],
        [
          712,
          "tool",
          "#170"
        ],
        [
          713,
          "user",
          "task-view"
        ]
      ]
    },
    "1": {
      "task": "rna-bound-search-001",
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
      "body": "cat /reference/targets-frozen.json 2>/dev/null | head -200",
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
      "output": "{\n  \"id\": 3,\n  \"running\": false,\n  \"exitCode\": 0\n}"
    },
    "21": {
      "source": "requests/20.response.json · arguments.command",
      "tool": "run_command",
      "body": "cd /work && mkdir -p trial-001 && nohup python3 /reference/checker/check.py /work/candidate-001.json --freeze /reference/targets-frozen.json --out /work/trial-001 > /work/trial-001/run.log 2>&1 &\necho \"started pid $!\"; sleep 20; cat /work/trial-001/run.log; ls -la /work/trial-001/",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 36,
        "running": true,
        "exitCode": null
      },
      "slot": 57,
      "label": "#36",
      "output": "{\n  \"id\": 36,\n  \"running\": true,\n  \"exitCode\": null\n}"
    },
    "25": {
      "source": "requests/24.response.json · arguments.command",
      "tool": "run_command",
      "body": "cat /work/trial-001/run.log; echo \"---\"; ls -la /work/trial-001/component-0-group-0/; echo \"---ps\"; ps aux | grep -E \"enumerate|check.py\" | grep -v grep | head",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 40,
        "running": false,
        "exitCode": 0
      },
      "slot": 65,
      "label": "#40",
      "output": "{\n  \"id\": 40,\n  \"running\": false,\n  \"exitCode\": 0\n}"
    },
    "44": {
      "source": "requests/43.response.json · arguments.command · L1–6",
      "tool": "run_command",
      "body": "cd /work/search && python3 -c \"\nimport sys; sys.path.insert(0,'/reference/checker')\nfrom energy_model import *\nt='.....((.((.((...)).((...))...)))).((.((.((...)).((...))...)))).....'\nprint('len',len(t))\npair,ch,par=parse(t)",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 60,
        "running": false,
        "exitCode": 0
      },
      "slot": 105,
      "label": "#60",
      "output": "{\n  \"id\": 60,\n  \"running\": false,\n  \"exitCode\": 0\n}"
    },
    "50": {
      "source": "requests/49.response.json · arguments.command · L1–6",
      "tool": "run_command",
      "body": "cd /work/search && python3 -c \"\nimport sys, json; sys.path.insert(0,'/work/search')\nfrom hairpin import *\nR=json.load(open('/work/search/cur52b.json'))\ncomps=[{'nodes':[-1,1,2,25,26],'rival_groups':[R]}]\nfor (a,b) in [(9,18),(33,42),(49,58)]:",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 68,
        "running": false,
        "exitCode": 0
      },
      "slot": 121,
      "label": "#68",
      "output": "{\n  \"id\": 68,\n  \"running\": false,\n  \"exitCode\": 0\n}"
    },
    "75": {
      "source": "requests/74.response.json · arguments.command",
      "tool": "run_command",
      "body": "cd /work/search2; echo \"=== A.log ===\"; cat A.log; echo \"=== B.log ===\"; cat B.log; echo \"=== files ===\"; ls -la",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 106,
        "running": false,
        "exitCode": 0
      },
      "slot": 48,
      "label": "#106",
      "output": "{\n  \"id\": 106,\n  \"running\": false,\n  \"exitCode\": 0\n}"
    },
    "200": {
      "source": "requests/199.response.json · arguments.command",
      "tool": "run_command",
      "body": "cd /work && python3 /reference/checker/check.py /work/candidate-004.json --freeze /reference/targets-frozen.json --out /work/trial-004 > /work/search3/check004.log 2>&1; echo \"rc=$?\"",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 180,
        "running": true,
        "exitCode": null
      },
      "slot": 394,
      "label": "#180",
      "output": "{\n  \"id\": 180,\n  \"running\": true,\n  \"exitCode\": null\n}"
    },
    "278": {
      "source": "requests/277.response.json · arguments.command · L1–6",
      "tool": "run_command",
      "body": "cd /work && cat > /work/search3/checkall.py <<'PYEOF'\nimport sys, json, math, random, itertools, time\nsys.path.insert(0,'/work/search'); sys.path.insert(0,'/reference/checker')\nfrom energy_model import *\nfrom check import parse, diff_atoms\nfrom collections import Counter",
      "first": 1,
      "steps": [
        1,
        2,
        3
      ],
      "receipt": {
        "id": 186,
        "running": true,
        "exitCode": null
      },
      "slot": 710,
      "label": "#186",
      "output": "{\n  \"id\": 186,\n  \"running\": true,\n  \"exitCode\": null\n}"
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
