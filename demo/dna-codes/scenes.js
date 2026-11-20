// Presentation seconds set the reading pace. utc is the corresponding archive timestamp.
const dnaScenes = (() => {
  const stages = [];
  const add = (utc, from, to, title, say, reply, details = {}) =>
    stages.push({utc, from, to, title, say, reply, seconds: 5.5, ...details});
  const branch = (id, parent, zh, en, count, unit = 'orbits') => ({id, parent, label: [zh, en], count, unit});
  function receipt(size, details = {}) {
    const i = dnaArchive.checks.findIndex(c => c.size === size);
    const check = dnaArchive.checks[i];
    const n = size.toLocaleString('en-US');
    const previous = i ? dnaArchive.checks[i-1].size : 676;
    const gain = (size - previous).toLocaleString('en-US');
    const priorLabel = i ? ['上份回执','the previous checkpoint'] : ['参考码本','the reference'];
    add(check.utc, 'result', 'run', [n + ' 条通过核验', n + ' verified words'],
      [n + ' 条互异码字通过检查，最小距离为 4。', 'All ' + n + ' words pass. The closest pair differs in four places.'],
      ['已保存。比' + priorLabel[0] + '多 ' + gain + ' 条，现有 ' + (size/4) + ' 个四元轨道。',
       'Saved. Up ' + gain + ' words from ' + priorLabel[1] + ', for a total of ' + (size/4) + ' four-word orbits.'],
      {size, seconds: 3.8, ...details});
  }

  add(dnaArchive.start, 'run', 'db', ['启动五小时搜索', 'Open the five-hour search'],
    ['以 676 条为参照，沿用预检通过的工具。', 'Start from the 676-word reference. Load the tools checked in preflight.'],
    ['预检记录里，执行、状态、提交和核验四项均可用。', 'The preflight query lists all four tools as available.'],
    {chapter: ['参考码本', 'Reference codebook'], node: branch('root', null, '扩大码本', 'Grow the codebook'), records: {run: ['window'], db: ['preflight']}});
  add('09:00:08.958', 'db', 'run', ['运行器创建首个搜索任务', 'The runner creates the first task'],
    ['阶段 001 已登记，目标是超过 676 条。', 'Task 001 is registered with a threshold of 676.'],
    ['SQLite 保存首个执行单元和任务描述，交给内核接手。', 'SQLite saves the first execution unit and the task brief for the kernel.'],
    {records: {db: ['dna-search-001'], run: ['dna-search-001']}});
  add('09:00:34.240', 'ai', 'run', ['复现参考集合', 'Reproduce the reference set'],
    ['从长度 10、恰有 5 个 G 或 C 的码字开始，排除含反向互补三联片段的词。', 'Start with length-10 words containing five G/C letters. Exclude words with a reverse-complement triple pair.'],
    ['论文的 1,008 条 GC 候选经过筛选，正好还原 676 条参考码字。', 'Filtering the 1,008 published GC candidates reproduces the 676 reference words exactly.'],
    {view: 'reference', node: branch('reference','root','复现论文集合','Reproduce the reference',676,'words'), records: {ai: ['filterCode'], run: ['pool','baseline']}});
  add('09:00:48.091', 'ai', 'run', ['把闭合约束写进轨道', 'Group words into closed orbits'],
    ['把原词、反向、互补和反向互补放在一起，一次选取整组。', 'Group each word with its reverse, complement and reverse complement. Select all four together.'],
    ['158,808 条通过片段筛选的词，恰好分成 39,702 个四元轨道。', 'The 158,808 words that pass the fragment filter form 39,702 orbits of four.'],
    {chapter: ['建立冲突图', 'Build the conflict graph'], node: branch('orbits','root','四元轨道','Four-word orbits',39702), records: {ai: ['orbit'], run: ['orbit']}});
  add('09:03:17.887', 'ai', 'run', ['标记不能共存的轨道', 'Connect conflicting orbits'],
    ['如果跨轨道的一对词少于 4 个位置不同，这两个轨道就不能同时选。', 'Join two orbits if any cross-orbit pair differs in fewer than four positions.'],
    ['冲突图已保存。选中的轨道之间必须没有边。', 'Conflict graph saved. A compatible selection has no edges between its orbits.'],
    {view: 'edge', node: branch('graph','orbits','构造冲突图','Build conflict graph'), records: {ai: ['edges'], run: ['edges']}});
  add('09:04:00.606', 'run', 'ai', ['候选中仍有冲突边', 'The selection still contains edges'],
    ['第一次读图选了 9,726 个顶点，检查发现大量冲突邻接。', 'The graph reader selected 9,726 vertices. Its adjacency check found conflicts.'],
    ['我来检查邻接表在文件里的排列。', 'I’ll check how the adjacency lists are laid out on disk.'],
    {fault: true, node: branch('reader','graph','读图检查失败','Graph reader fails'), records: {ai: ['badGraph'], run: ['badGraph']}});
  add('09:05:40.627', 'ai', 'run', ['重新读取邻接表', 'Read the adjacency lists correctly'],
    ['按文件中的顺序读取每个顶点的邻居，再核对双向边。', 'Read each vertex and its neighbors in file order, then check both directions.'],
    ['39,702 个顶点，不对称邻接和自环均为零。', '39,702 vertices. No asymmetric adjacencies or self-loops.'],
    {node: branch('graphfix','reader','修复邻接表读取','Repair adjacency reader'), records: {ai: ['graphRead'], run: ['graphRead']}});
  add('09:06:14.237', 'ai', 'run', ['先检查轨道内部距离', 'Screen within-orbit distances'],
    ['同一轨道的四个词也要彼此相隔至少 4 位。', 'The four words inside a single orbit must also be at least four positions apart.'],
    ['当前预筛留下 22,230 个轨道，交给独立集搜索。', 'The current prefilter leaves 22,230 orbits for independent-set search.'],
    {node: branch('screen','orbits','轨道内部预筛','Within-orbit prefilter',22230), records: {ai: ['oldCode'], run: ['oldFilter']}});
  receipt(1396, {chapter: ['扩大独立集', 'Grow the independent set'], seconds: 6,
    node: branch('mis','graph','多起点独立集搜索','Multi-start independent sets',1396,'words'),
    records: {ai: ['greedy','localFirst']}});
  receipt(1484);
  add('09:10:31.103', 'db', 'run', ['提高下一阶段门槛', 'Raise the next threshold'],
    ['阶段 001 完成。阶段 002 的门槛为 1,484 条。', 'Task 001 closed. Task 002 starts with a threshold of 1,484.'],
    ['继续搜索，五小时截止时间照旧。', 'Continue the search on the original five-hour clock.'],
    {records: {db: ['dna-search-002'], run: ['dna-search-002']}});
  for (const n of [1524,1556,1560,1564,1568]) receipt(n);
  add('11:22:09.185', 'ai', 'run', ['尝试合并候选', 'Try merging candidate sets'],
    ['把已有独立集放进候选池，尝试重组。', 'Pool the independent sets and try recombining them.'],
    ['合并程序已编译，当前候选含 392 个轨道。', 'The merge program has compiled. The current candidate holds 392 orbits.'],
    {node: branch('merge','mis','合并候选池','Merge candidate sets'), records: {ai: ['merge'], run: ['merge']}});
  add('12:23:05.644', 'ai', 'run', ['按位置重算 Hamming 距离', 'Count differing positions directly'],
    ['按不同二进制位数除以二，会漏算碱基差异。现在每个不同的位置只计一次。', 'Halving the number of differing bits undercounted letter changes. Count each changed position once.'],
    ['可用轨道从 22,230 增至 39,002，多出 16,772 个。', 'The usable pool grows from 22,230 to 39,002 orbits, restoring 16,772.'],
    {chapter: ['修正距离预筛', 'Correct the distance filter'], seconds: 7, view: 'reinstated',
      node: branch('exact','screen','修正逐位距离','Correct position count',39002), records: {ai: ['oldCode','newCode'], run: ['newFilter']}});
  for (const n of [1612,1644,1668,1676]) receipt(n);
  add('13:24:24.063337', 'run', 'ai', ['从已保存的候选恢复', 'Resume from the saved candidate'],
    ['宿主进程意外退出，已恢复运行器。', 'The host processes exited unexpectedly. The runner has been restored.'],
    ['继续使用工作目录中的候选，沿用原截止时间。', 'Resume from the stored files with the original deadline.'],
    {records: {run: ['recovery'], ai: ['recovery']}});
  receipt(1684);
  add('13:35:38.967', 'ai', 'run', ['导出的两个码字只差三位', 'Two exported words differ in only three places'],
    ['422 个轨道导出了 1,688 个互异码字。请逐对检查。', 'The 422 orbits exported to 1,688 distinct words. Check the pairs.'],
    ['发现距离为 3 的一对，当前有效规模仍为 1,684。', 'A pair is only three positions apart. The verified best stays at 1,684.'],
    {chapter: ['核对导出映射', 'Check the export mapping'], seconds: 7, view: 'conflict', fault: true,
      node: branch('export','mis','候选导出冲突','Candidate export conflict'), records: {ai: ['badExport'], run: ['conflict']}});
  add('13:35:57.041', 'ai', 'run', ['恢复原始轨道编号', 'Map back to the original orbit IDs'],
    ['先把子图下标映射回原轨道编号，再导出同一组 422 个轨道。', 'Map subgraph indices back to original orbit IDs before exporting the same 422 orbits.'],
    ['本地复查通过，等待宿主验收。', 'The local check passes. The candidate is ready for host verification.'],
    {view: 'local', node: branch('remap','export','修正导出映射','Repair the export map'), records: {ai: ['map','mapUse'], run: ['localFixed']}});
  receipt(1688, {seconds: 6, node: branch('best','remap','验收最佳码本','Best codebook verified',1688,'words')});
  add('13:36:36.390', 'db', 'run', ['以 1,688 条继续搜索', 'Search beyond 1,688'],
    ['阶段 007 已登记，目标是超过 1,688 条。', 'Task 007 is registered with a threshold of 1,688.'],
    ['在剩余时间内继续寻找更大集合。', 'Use the remaining time to search for a larger set.'],
    {records: {db: ['dna-search-007'], run: ['dna-search-007']}});
  add('13:58:48.845', 'run', 'result', ['五小时窗口结束', 'The five-hour window closes'],
    ['调度已结束。请复核保存的最佳集合与最后一份完整候选。', 'The runner has stopped. Recheck the best snapshot and the last complete candidate.'],
    ['两份文件进入独立终检。', 'Both files go to the final independent check.'],
    {chapter: ['独立终检', 'Independent audit'], records: {run: ['end']}});
  add('13:59:43.961099', 'result', 'run', ['独立终检确认 1,688 条', 'Independent audit confirms 1,688'],
    ['两份快照哈希一致，两套检查均通过。最小 Hamming 距离为 4。', 'Both snapshots have the same hash and pass both checks. Minimum Hamming distance is four.'],
    ['按复现的 Table 4 规则，比参考集合多 1,012 条（+149.70%）。最优规模仍未知。', 'Under the reproduced Table 4 rules, that is 1,012 additional words (+149.70%). The optimum is open.'],
    {seconds: 7, audit: true, node: branch('audit','root','双重整数核验','Independent integer checks'), records: {result: ['audit','checker'], run: ['end','audit']}});
  let start = 0;
  for (const stage of stages) {
    stage.start = start;
    start = Math.round((start + stage.seconds) * 10) / 10;
    stage.end = start;
  }
  return stages;
})();
