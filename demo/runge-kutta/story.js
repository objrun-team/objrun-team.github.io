// 'at' is compressed presentation time. 'utc' is the archived experiment clock.
// Each role keeps its most recent evidence until an update replaces it.
const rkScenes = [
  {
    at: 0, utc: '15:41:35', title: ['冻结搜索条件', 'Fix the search constraints'], route: ['run', 'ai'],
    branch: ['root', null, 'Williamson 2N 搜索', 'Williamson 2N search'],
    updates: {
      ai: ['保持五阶段三阶，只调整低存储系数。', 'Keep five stages and third order. Vary the low-storage coefficients.', 'goal'],
      run: ['首次模型调用启动实验时钟。', 'The first model request starts the clock.', 'clock'],
      db: ['第一阶段已设置基线门槛。', 'The first task has a baseline threshold.', 'phase1'],
      result: ['从提交的系数重建 Butcher 表，再核对误差和稳定性。', 'I’ll reconstruct the tableau from the submitted coefficients.', 'rules']
    }
  },
  {
    at: 4, utc: '15:41:38', title: ['重建 Table 8', 'Reconstruct Table 8'], route: ['run', 'result'], metric: 'baseline',
    branch: ['base', 'root', '重建参考方法', 'Reconstructed baseline'],
    updates: {
      ai: ['按原始 2N 递推重建第五行。', 'Rebuild the fifth row from the two-register recurrence.', 'baselineCode'],
      run: ['读取基线审计。', 'Read the reference audit.', 'readBaseline'],
      result: ['a₅₁ 应为 2053/11172。修正后，主误差范数为 0.015632。', 'The recurrence gives a₅₁ = 2053/11172. The corrected norm is 0.015632.', 'baseline']
    }
  },
  {
    at: 12, utc: '15:42:24', title: ['求解九个方程', 'Solve nine equations'], route: ['ai', 'run'],
    branch: ['search', 'root', '数值寻根', 'Numerical root search'],
    updates: {
      ai: ['稳定多项式固定了链形树的误差。求使其余三项为零的根。', 'The polynomial fixes the chain-tree error. Solve for zeros of the other three terms.', 'solve'],
      run: ['启动带多个随机初值的求根程序。', 'Start the multistart root search.', 'launch']
    }
  },
  {
    at: 18, utc: '15:43:29', title: ['读取任务状态', 'Read the task state'], route: ['run', 'db'],
    updates: {
      run: ['读取求根期间的任务记录。', 'Read the task record while the solver runs.', 'sql1'],
      db: ['监控查询返回 rk-search-001，状态为 claimed。', 'The monitor finds rk-search-001 in the claimed state.', 'sql1']
    }
  },
  {
    at: 22, utc: '15:45:25', title: ['找到十二个数值解', 'Recover twelve numerical roots'], route: ['run', 'ai'],
    branch: ['roots', 'search', '多起点求解', 'Multistart solutions'],
    updates: {
      run: ['求解器报告 12 个解，可作为高精度细化的初值。', 'The solver reports 12 roots for high-precision refinement.', 'seeds'],
      ai: ['取这些数值解作为细化的起点。', 'Use these numerical roots as starting points for refinement.', 'seeds']
    }
  },
  {
    at: 29, utc: '15:46:30', title: ['首次通过数值检查', 'Verify the first improvement'], route: ['run', 'result'], metric: 'first',
    branch: ['first', 'roots', '首个合格候选', 'First feasible candidate', 'candidate'],
    updates: {
      ai: ['用高精度 Newton 迭代细化初值。', 'Refine the seeds with high-precision Newton steps.', 'refine'],
      run: ['保存首次通过验证的改进。', 'Archive the first verified improvement.', 'firstCheck'],
      result: ['主误差降至 0.013967，稳定多项式通过数值核对。', 'The norm falls to 0.013967. The polynomial passes the numerical checks.', 'firstCheck']
    }
  },
  {
    at: 37, utc: '15:51:31', title: ['一个误差更小的候选被拒绝', 'Reject a smaller error'], route: ['run', 'result'], fault: true, metric: 'free',
    branch: ['free', 'search', '放开稳定性约束', 'Relaxed stability', 'blocked'],
    updates: {
      ai: ['把 z⁴ 系数改为 1/24，尝试消去最后的误差项。', 'Try setting the fourth-degree coefficient to 1/24 to cancel the last error term.', 'freeSearch'],
      run: ['将放开稳定性约束的候选交给原验证器。', 'Check the relaxed candidate against the original constraints.', 'freeCheck'],
      result: ['误差约为 1.14 × 10⁻⁶⁰，但稳定域已经改变。拒绝此候选。', 'The norm is about 1.14 × 10⁻⁶⁰, but the stability region has changed. Reject this candidate.', 'freeCheck']
    }
  },
  {
    at: 45, utc: '15:53:02', title: ['比较等误差候选', 'Compare equal-error candidates'], route: ['run', 'result'], metric: 'large',
    branch: ['large', 'roots', '大系数分支', 'Large-coefficient branch', 'candidate'],
    updates: {
      run: ['保留这组同样达到数值下界的系数。', 'Keep the second set of coefficients at the numerical floor.', 'largeCheck'],
      result: ['范数同样接近下界，最大系数绝对值却达 70.27。', 'The norm again matches the floor numerically, with a maximum coefficient magnitude of 70.27.', 'largeCheck']
    }
  },
  {
    at: 51, utc: '16:08:07', title: ['复核较小系数的候选', 'Check the smaller coefficients'], route: ['run', 'result'], metric: 'selected',
    branch: ['selected', 'roots', '较小系数分支', 'Smaller-coefficient branch', 'candidate'],
    updates: {
      ai: ['保留最大系数绝对值为 5.32 的高精度候选。', 'Keep the high-precision candidate with a maximum coefficient magnitude of 5.32.', 'selectedCoefficients'],
      run: ['将细化后的系数送检。', 'Submit the refined coefficients for checking.', 'selectedCheck'],
      result: ['通过数值判据。要证明达到下界，还需要精确证书。', 'The numerical checks pass. Attainment of the bound still needs an exact certificate.', 'selectedCheck']
    }
  },
  {
    at: 58, utc: '16:16:44', title: ['代数关系未通过检验', 'Reject the proposed algebraic relation'], route: ['result', 'run'], fault: true,
    branch: ['pslq', 'selected', 'PSLQ 代数猜想', 'PSLQ relation', 'blocked'],
    updates: {
      result: ['模 1,000,000,007 后最大公因式为 1。候选多项式连一阶条件也无法满足。', 'Over the finite field the gcd is 1. No root of the proposed polynomial meets even the first-order condition.', 'gcd'],
      run: ['将独立审计的结论送回当前任务。', 'Deliver the independent audit to the active task.', 'feedback']
    }
  },
  {
    at: 65, utc: '16:44:49', title: ['停止有缺项的证明', 'Stop an incomplete proof'], route: ['run', 'ai'], fault: true,
    branch: ['job40', 'pslq', '符号余式检查', 'Symbolic remainder check', 'blocked'],
    updates: {
      run: ['审查发现确定性的类型错误，停止任务 40。', 'Stop job 40 after the audit identifies a type error.', 'job40'],
      ai: ['脚本漏检 z⁵，还把 sum(β) = 1 当成了阶条件。', 'The script omits the fifth-degree coefficient and imposes a spurious sum(β) = 1 condition.', 'job40']
    }
  },
  {
    at: 71, utc: '16:48:27', title: ['恢复同一轮搜索', 'Recover the same run'], route: ['run', 'db'],
    branch: ['recovery', 'root', '从保留的记录恢复', 'Database recovery'],
    updates: {
      run: ['工具调用与回执配对失败。沿用原截止时间和验证器恢复。', 'A tool call lost its matching response. Resume with the original deadline and checker.', 'recovery'],
      db: ['原库保留。恢复库中的 rk-search-002 已领取。', 'The original database is preserved. The recovery database shows rk-search-002 claimed.', 'sql2']
    }
  },
  {
    at: 78, utc: '16:52:36', title: ['构造有理隔离盒', 'Enclose the root in a rational box'], route: ['ai', 'run'],
    branch: ['box', 'selected', '有理区间隔离', 'Rational root isolation'],
    updates: {
      ai: ['用九维有理区间盒隔离代数根，提交给独立验证器。', 'Submit a nine-dimensional rational box for independent checking.', 'box'],
      run: ['收到隔离盒和候选系数。', 'Receive the proposed box and candidate coefficients.', 'box']
    }
  },
  {
    at: 85, utc: '16:58', title: ['证明达到精确下界', 'Certify the exact lower bound'], route: ['run', 'result'], certified: true,
    branch: ['proof', 'box', '独立隔离审计', 'Independent isolation audit', 'verified'],
    updates: {
      run: ['从原始递推重新计算方程与区间 Jacobian。', 'Rebuild the equations and interval Jacobian from the original recurrence.', 'auditCode'],
      result: ['盒内有唯一根。前三个误差项严格为零，范数恰为 639/45752。', 'The box contains a unique root. Three error terms vanish exactly, leaving a norm of 639/45752.', 'proof']
    }
  },
  {
    at: 94, utc: '17:19:31', title: ['比较四个留出问题', 'Compare four held-out problems'], route: ['run', 'result'], final: true,
    branch: ['ode', 'proof', '等成本 ODE 对照', 'Equal-cost ODE tests', 'verified'],
    updates: {
      ai: ['主误差下降 10.65%，达到固定可行集内的全局最小值。', 'Leading error is down 10.65%, reaching the global minimum on this fixed feasible set.', 'proof'],
      run: ['最终归档含 88 份模型回执，费用合计约 1.60 美元。', 'The archive contains 88 model receipts totaling about US$1.60.', 'summary'],
      result: ['每种方法各用 1,600 次函数求值，三个问题的终点误差下降，Logistic 上升 8.5%。', 'At 1,600 RHS calls per method, endpoint error falls on three problems and rises by 8.5% on logistic.', 'heldOut']
    }
  }
];
