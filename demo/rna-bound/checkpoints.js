// Checkpoints are ordered by archive UTC. The player gives each a short reading interval.
const rnaSteps = [
  {
    id: 'start', utc: '15:49:33', title: ['启动搜索', 'Start the search'], from: 'run', to: 'ai', branch: 'root',
    notes: {
      ai: ['clock', '第一轮调用开始。先读取预先选定的谜题。', 'The first call starts. I’ll read the frozen puzzle.'],
      run: ['clock', '从首次付费调用开始计时。', 'The run clock starts with the first paid call.'],
      db: ['sql', '预检查到了四项已启用的工具。', 'The preflight query found four enabled tools.'],
      result: ['preflight', '预检通过，等待候选证书。', 'Preflight passed. Waiting for a candidate.']
    }
  },
  {
    id: 'target', utc: '15:49:36', title: ['读取冻结基线', 'Read the frozen baseline'], from: 'ai', to: 'run', branch: 'primary',
    notes: {
      ai: ['load', '读取 #52 的目标结构和作者缓存。', 'Load the target structure and author cache for #52.'],
      run: ['targets', '主目标有 80 个位置，论文展示的上界为 0.1874。', 'The primary puzzle has 80 sites. The paper lists a bound of 0.1874.']
    }
  },
  {
    id: 'trial1', utc: '15:53:30', title: ['启动第一次枚举', 'Try the first enumeration'], from: 'run', to: 'result', branch: 'one',
    notes: {
      ai: ['domain', '第一个候选的核心有 8,153,726,976 个可行赋值。', 'The first candidate has 8,153,726,976 feasible core assignments.'],
      run: ['began001', '作业 36 启动了本地检查。', 'Job 36 launches the local check.'],
      result: ['guard', '要给出上界，访问计数必须等于完整赋值域的大小。', 'A bound requires a visit count equal to the entire assignment domain.']
    }
  },
  {
    id: 'inputOnly', utc: '15:55:25', title: ['第一次枚举未交回证明', 'The first trial has no proof'], from: 'ai', to: 'run', branch: 'one',
    notes: {
      ai: ['noReport', '目录里只有枚举输入。', 'The component directory contains only the input.'],
      run: ['noReport', '尚未收到完整报告，保留原界。', 'There is no complete report. Keep the baseline.']
    }
  },
  {
    id: 'trial2', utc: '16:14:23', title: ['第二次试验覆盖完整', 'Complete the smaller domain'], from: 'run', to: 'result', branch: 'two', proof: '002',
    notes: {
      ai: ['proof002', '这一版保留了 11 个核心竞争结构。', 'This version keeps 11 rivals for the core.'],
      run: ['proof002', '第二次试验已写入四个基序的报告。', 'Trial 002 reports results for all four motifs.'],
      result: ['proof002', '核心的 84,934,656 个赋值全部核对完毕。', 'All 84,934,656 core assignments were checked.']
    }
  },
  {
    id: 'backup', utc: '16:14:55', title: ['检查备用谜题', 'Inspect the fallback puzzle'], from: 'ai', to: 'run', branch: 'fallback',
    notes: {
      ai: ['backup', '开始检查备用谜题 Chicken feet 的结构。', 'Inspect the structure of the fallback puzzle, Chicken feet.'],
      run: ['targets', '备用目标是 #61，其作者缓存上界约为 0.133690。', 'The fallback is #61. Its author-cache bound is about 0.133690.']
    }
  },
  {
    id: 'receipt2', utc: '16:19:49', title: ['验收首个更紧的界', 'Accept the first tighter bound'], from: 'run', to: 'result', branch: 'two',
    notes: {
      run: ['receipt002', '把通过核验的证书与候选摘要一起记录。', 'Record the accepted bound with the candidate digest.'],
      result: ['receipt002', '整体验证值已低于 0.1874，也低于作者缓存。', 'The verified bound falls below both 0.1874 and the author cache.']
    }
  },
  {
    id: 'start3', utc: '16:24:52', title: ['检查第三个候选', 'Check the third candidate'], from: 'ai', to: 'run', branch: 'three',
    notes: {
      ai: ['began003', '提交第三个候选做完整检查。', 'Submit the third candidate for a full check.'],
      run: ['began003', '作业 68 开始。图中保留最近的完整报告。', 'Job 68 starts. The figures retain the latest complete report.']
    }
  },
  {
    id: 'trial3', utc: '16:31:59', title: ['完成 81.5 亿个核心赋值的枚举', 'Cover 8.15 billion core assignments'], from: 'run', to: 'result', branch: 'three', proof: '003',
    notes: {
      ai: ['proof003', '第三版在核心使用 12 个竞争结构。', 'The third candidate uses 12 core rivals.'],
      run: ['proof003', '第三次试验完成，等待宿主验收。', 'The third trial is complete and awaits host acceptance.'],
      result: ['proof003', '核心枚举完整。三个短发夹也各自覆盖了 147,456 个赋值。', 'The core is complete. Each short hairpin also covers 147,456 assignments.']
    }
  },
  {
    id: 'receipt3', utc: '16:43:25', title: ['宿主确认第三次试验', 'Accept the third certificate'], from: 'run', to: 'result', branch: 'three',
    notes: {
      run: ['receipt003', '第二份改进回执已写入验证日志。', 'The verification log records a second improvement.'],
      result: ['receipt003', '整体验证上界约为 0.157789053。', 'The verified overall bound is about 0.157789053.']
    }
  },
  {
    id: 'resume2', utc: '16:52:27', title: ['从传输停滞中恢复', 'Recover from a stalled call'], from: 'run', to: 'db', branch: 'three',
    notes: {
      run: ['phase2', '任务 002 已启动，继续使用原截止时间。', 'Task 002 starts under the original deadline.'],
      db: ['recovery2', '已保留上一阶段的数据库及预写日志。', 'The previous database and its write-ahead log were preserved.']
    }
  },
  {
    id: 'split', utc: '17:07:22', title: ['检验两条分解分支', 'Test two decomposition branches'], from: 'run', to: 'result', branch: 'split',
    notes: {
      ai: ['split', '尝试把主目标的核心拆成更小的部分。', 'Try splitting the primary core into smaller parts.'],
      run: ['split', 'A 分支返回局部结果。', 'Branch A returned a local result.'],
      result: ['split', 'B 分支移除了必需的边界配对，无法组合成整体证明。', 'Branch B removed a required boundary pair, so the pieces cannot certify a global bound.']
    }
  },
  {
    id: 'resume3', utc: '17:24:44', title: ['恢复第三阶段', 'Resume in phase three'], from: 'run', to: 'db', branch: 'split',
    notes: {
      run: ['phase3', '再次恢复。任务 003 沿用已保存的候选。', 'Task 003 resumes with the saved candidates.'],
      db: ['recovery3', '两次恢复前的数据库均已保留。', 'Databases from both earlier phases were kept.']
    }
  },
  {
    id: 'start4', utc: '17:42:00', title: ['交接第四个候选', 'Hand off the fourth candidate'], from: 'ai', to: 'run', branch: 'four',
    notes: {
      ai: ['began004', '第四个候选交给本地检查器。', 'Send candidate 004 to the local checker.'],
      run: ['began004', '作业 180 开始。', 'Job 180 starts.']
    }
  },
  {
    id: 'backupStart', utc: '17:47:35', title: ['再次检查备用分支', 'Revisit the fallback branch'], from: 'ai', to: 'run', branch: 'backupCheck',
    notes: {
      ai: ['backupJobStart', '主目标核验期间，再检查一次备用分支。', 'Try the fallback branch again while the primary check runs.'],
      run: ['backupJobStart', '作业 186 开始。', 'Job 186 starts.']
    }
  },
  {
    id: 'backupStop', utc: '17:51:45', title: ['备用枚举中断', 'The fallback check stops'], from: 'run', to: 'ai', branch: 'backupCheck',
    notes: {
      ai: ['backupJob', '备用目标的这次尝试没有给出完整证书。', 'This fallback attempt produced no complete certificate.'],
      run: ['backupJob', '作业 186 返回退出码 137。', 'Job 186 returned exit code 137.']
    }
  },
  {
    id: 'trial4', utc: '17:52:05', title: ['第四份本地证明完成', 'Complete the fourth local proof'], from: 'run', to: 'result', branch: 'four', proof: '004',
    notes: {
      ai: ['proof004', '核心增加到 14 个竞争结构。', 'The core now has 14 rivals.'],
      run: ['proof004', '第四份报告就绪，保留候选以供独立重算。', 'The fourth report is complete. Keep its candidate for independent replay.'],
      result: ['proof004', '四部分均已完整覆盖，合成上界约为 0.157700067。', 'All four components are covered. Their combined bound is about 0.157700067.']
    }
  },
  {
    id: 'stop', utc: '17:56:55', title: ['停搜并冻结候选', 'Stop search and freeze the candidate'], from: 'run', to: 'ai', branch: 'four',
    notes: {
      ai: ['usage', '搜索已停。337 次请求中有 336 份费用回执。', 'Search stopped. There are 336 cost receipts for 337 requests.'],
      run: ['stop', '保留第四个候选，交给冻结版本的检查器重算。', 'Keep candidate 004 for a fresh run of the frozen checker.'],
      result: ['round', '独立重算每个分量的界，向上舍入它们的乘积。', 'Recompute each component bound and round the product upward.']
    }
  },
  {
    id: 'final', utc: '18:08:52', title: ['独立终检通过', 'Independent replay passes'], from: 'run', to: 'result', branch: 'host', proof: 'replay',
    notes: {
      ai: ['finished', '主目标上界收紧 15.85%。备用目标维持原界。', 'The primary bound is 15.85% tighter. The fallback retains its baseline.'],
      run: ['finished', '独立重算与第四份报告一致。', 'Independent replay agrees with the fourth report.'],
      result: ['proofreplay', '四组覆盖计数全部相符。保守上界约为 0.157700067。', 'All four coverage counts match. The conservative bound is about 0.157700067.']
    }
  }
];
