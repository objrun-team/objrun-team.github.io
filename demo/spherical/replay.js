const byId = id => document.getElementById(id);
const make = (tag, text) => Object.assign(document.createElement(tag), {textContent: text});
const {stages, minima} = sphericalRecord;
const view = new ConfigurationView(byId('geometry'));
const last = stages.length - 1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const roles = {
  ai: {name:'AI 智能体', evidence:'脚本工作区', color:'#c9b6f1'},
  run: {name:'Run 内核', evidence:'执行回执', color:'#e0b47b'},
  db: {name:'SQLite 数据库', evidence:'查询记录', color:'#99cadd'},
  result: {name:'构型验证器', evidence:'验证记录', color:'#a7d7b5'}
};
const traceView = new EnergyTrace(byId('trace'));
const gramView = new ConfigurationView(byId('gram'), 'gram');
gramView.setMode('gram');
gramView.onCell = (i, j, value) => {
  const angle = Math.acos(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
  const summary = 'G[' + (i + 1) + ', ' + (j + 1) + '] = ' + value.toFixed(4) + ' · ' + angle.toFixed(1) + '°';
  byId('gram-cell').textContent = summary;
  byId('gram').setAttribute('aria-description', summary);
  view.highlightedPair = [i, j];
  view.draw();
};

// Each chapter explains a recorded checkpoint. Times are presentation seconds.
// Code is visible when submitted. Query rows and configurations change on receipt.
function branch(id, start, finish, state = 'done') {
  return {id, start, finish, state};
}
function cue(from,to,title,say,reply,packet,seconds,changes={}) {
  return {from,to,title,say,reply,packet,seconds,...changes};
}
const chapters = [
  {name:'载入目标', title:'封存目标，读取参照', config:'参照构型', events:[
    cue('run','db','领取阶段 001','领取阶段 001，从作者的坐标开始。','已登记，状态为 claimed。','001 · claimed',3.6,{db:true,search:branch('root','载入目标','目标已登记')}),
    cue('run','ai','读取搜索程序','先看搜索程序怎样计算能量。','我先读 search_support.py，核对目标函数。','search_support.py',3.9,{code:0}),
    cue('run','result','测量参照能量','这里是作者的参照坐标，帮我算一下它的能量。','约 5.87 × 10⁻¹²。之后的候选都和这组参照比较。','参照坐标',4.1,{result:true,search:branch('root','测量参照','参照已测')}),
  ]},
  {name:'搜索候选', title:'从不同起点寻找低谷', config:'候选构型 1', events:[
    cue('ai','run','检查候选的梯度','检查梯度，看看附近有没有下坡方向。','检查脚本已执行，作业 #10 正常退出。','verify.py',3.5,{code:0,search:branch('first','检查梯度','已检查')}),
    cue('ai','run','提交精修脚本','精修脚本写好了，先试跑点积。','作业 #12 返回了一个类型错误。','refine_hp.py',3.4,{code:1,search:branch('unfixed','执行精修','TypeError','blocked')}),
    cue('run','ai','第 18 行抛出 TypeError','第 18 行报错了。mp.fdot 要一对分量，收到的却是一个乘积。','我找到那一行了，改成逐项相乘再求和。','TypeError',4.8,{fault:true,search:branch('unfixed','TypeError','第 18 行报错','blocked')}),
    cue('ai','run','修复点积计算','点积已经改好。请用同一组坐标再跑一次。','精修通过，能量约为 0.123749。','请求 #8 · 修订',4.9,{code:2,search:branch('fixed','重跑点积','精修通过')}),
    cue('run','result','候选构型 1 收敛','第一条搜索轨迹回来了，起点的能量是 19.053138。','收敛到 0.123749，候选构型 1 的坐标已保存。','候选构型 1',6.7,{sample:true,result:true,search:branch('first','等待收敛','构型 1 · 0.123749','candidate')}),
    cue('run','db','一次工具调用没有返回','这次工具调用没有返回，请留下中断记录。','消息表里有一条 stuck 记录。','stuck',4,{db:true,search:branch('interrupt','调用未返回','调用中断','blocked')}),
  ]},
  {name:'恢复任务', title:'从中断处恢复搜索', config:'候选构型 1', events:[
    cue('db','run','从阶段 002 恢复','阶段 001 标为了失败，阶段 002 已领取。','我沿用原来的截止时间，从现有工作目录继续。','002 · claimed',4.4,{db:true,search:branch('resume','接续任务','已恢复')}),
    cue('run','ai','找回候选坐标','上一轮的坐标还在，可以接着查。','我按能量找回候选构型 1，再核对一遍。','已存坐标',3.6,{code:0}),
    cue('run','result','另一个起点收敛到同一类构型','换了一个起点，再看这条轨迹的终点。','还是 0.123749，这次落在同一类低谷。','候选构型 1',5.7,{sample:true,result:true,search:branch('rerun','迭代中','回到构型 1','repeat')}),
  ]},
  {name:'构造证书', title:'为候选构型 2 改写证书', config:'候选构型 2', events:[
    cue('ai','run','改写第二份证书','我改了第二份证书的增广系数，用 Cholesky 分解检查曲率。','第二份证书的脚本已执行。','certify_second_basin.py',4.4,{code:0,search:branch('second','改写证书','脚本已执行')}),
    cue('run','result','候选构型 2 收敛','候选构型 2 的坐标到了，和上一类比较一下。','这一组停在 0.137260，高于构型 1 的 0.123749。','候选构型 2',5.8,{sample:true,result:true,search:branch('second','核对坐标','构型 2 · 0.137260','candidate')}),
    cue('run','db','核对九个阶段','查一下当前九个阶段各是什么状态。','7 个完成，1 个失败，还有 1 个已领取。','任务快照',3.7,{db:true}),
  ]},
  {name:'精修坐标', title:'提高候选构型 3 的精度', config:'候选构型 3', events:[
    cue('ai','run','精修候选构型 3','我用 140 位精度精修第三组点，每一步都重新归一化。','精修脚本已执行，坐标可以复查了。','refine_basin3.py',4.2,{code:0,search:branch('third','140 位精修','精修完成')}),
    cue('run','result','保存候选构型 3 坐标','第三组点的迭代轨迹到了。','能量停在 0.176815，和前两类不同。','候选构型 3',5.8,{sample:true,result:true,search:branch('third','核对坐标','构型 3 · 0.176815','candidate')}),
    cue('run','db','领取阶段 012','请核对阶段 012 和它前一阶段的状态。','阶段 011 已完成，阶段 012 已领取。','012 · claimed',3.6,{db:true}),
  ]},
  {name:'鞍点下降', title:'沿负曲率方向离开鞍点', config:'候选构型 4', events:[
    cue('ai','run','从鞍点试探单步下降','沿负曲率方向迈一步，再从落点寻找新低谷。','作业 #253 已启动，结果会写入 sdA.log。','saddle_descent.py',4.2,{singleStep:'started',search:branch('single','提交作业','运行中','running')}),
    cue('ai','run','沿鞍点的负曲率方向搜索','我从鞍点沿负曲率方向走一步，再交给优化器。','级联下降脚本已执行。','cascade.py',4.8,{code:0,search:branch('cascade','提交脚本','搜索中','running')}),
    cue('run','ai','单步下降只命中已知低谷','sdA.log 里通过正曲率筛选的终点只有两类，能量都见过了。','记下这两个低谷，再看级联下降。','sdA.log',4.5,{singleStep:'finished',search:branch('single','核对终点','只命中构型 1、2','repeat')}),
    cue('run','result','找到候选构型 4','级联下降找到了另一组点，看看它落在哪里。','能量约为 0.296787，这是候选构型 4。','候选构型 4',4.7,{result:true,search:branch('cascade','核对坐标','构型 4 · 0.296787','candidate')}),
    cue('run','db','核对十三个阶段','现在一共十三个阶段，帮我核一下状态。','11 个完成，1 个失败，1 个已领取。','任务快照',3.8,{db:true}),
  ]},
  {name:'独立验证', title:'独立验证四个局部极小', config:'已验证构型', events:[
    cue('run','ai','停止模型调度','模型调度到这里结束，后面由宿主在本地验算。','收到。我的脚本和候选坐标都留在工作目录里。','停止调度',3.9),
    cue('db','run','核对封存的任务','封存库里共有 13 项任务目标。','归档已核对，进入独立验证。','封存记录',3.4,{db:true}),
    cue('run','result','四个局部极小通过验证','四份证书都在，请用 220 位区间运算独立复核。','四个能量区间互不相交，均高于参照值。验证通过。','四份证书',5.8,{code:0,result:true,search:branch('verify','复核区间证书','四份证书通过','verified')}),
  ]},
];

function historyTime(seconds) {
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function filmTime(seconds) {
  return historyTime(Math.floor(seconds)).slice(3);
}
function highlight(text) {
  const out = document.createDocumentFragment();
  const tokens = /(#.*$|'[^']*'|"[^"]*"|\b(?:def|return|for|in|if|try|except|continue|import|from|SELECT|AS|FROM|ORDER|BY|DESC|LIMIT|WHERE|LIKE|GROUP|count|substr)\b|\b\d+(?:\.\d+)?\b)/g;
  let from = 0;
  for (const match of text.matchAll(tokens)) {
    out.append(text.slice(from, match.index));
    const token = make('span',match[0]);
    token.className = match[0][0] === '#' ? 'comment' : /^['"]/.test(match[0]) ? 'str' : /^\d/.test(match[0]) ? 'num' : 'kw';
    out.append(token);
    from = match.index + match[0].length;
  }
  out.append(text.slice(from));
  return out;
}

const events=[];
let total=0;
for (const [chapter,step] of chapters.entries()) {
  step.start=total;
  for (const event of step.events) {
    events.push({...event,chapter,start:total,end:total+event.seconds});
    total+=event.seconds;
  }
}
const requestShare = 0.67;
const arrival = requestShare / CollaborationMap.transferSpeed;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
let position=0, rate=.75, playing=false, frame=0, previousTime=0;
let activeIndex=-1, hasArrived=false, shownCode='', shownDb=-2, shownResult=-1, minimum=3;
let plotKey = '', sphereFade = null, traceChapter = -1;
let sceneMotion = false;
const transitionMs = 450;
const oldGeometry=byId('old-geometry');
const seek=byId('story-seek');
seek.max=total;
byId('duration').textContent=filmTime(total);

function renderDb(index) {
  if (index===shownDb) return;
  shownDb=index;
  const record=stages[Math.max(0,index)];
  updateText(byId('db-name'), index===last?'sealed.sqlite':'h2h.sqlite');
  const clauses = record.sql.split(/\s+(?=FROM\b|WHERE\b|GROUP BY\b|ORDER BY\b|LIMIT\b)/);
  const predicate = clauses.find(clause => /^(WHERE|GROUP BY)\b/.test(clause));
  const ordering = clauses.filter(clause => /^(ORDER BY|LIMIT)\b/.test(clause));
  const excerpt = predicate || (ordering.length ? ordering.join('\n') : record.sql);
  byId('query').replaceChildren(highlight(excerpt));
  const header=make('tr','');
  header.append(...record.columns.map(col=>make('th',col)));
  byId('columns').replaceChildren(header);
  const rows=index<0?[[tr('等待任务记录')]]:record.rows;
  byId('rows').replaceChildren(...rows.map(values=>{
    const row=make('tr',''); row.append(...values.map(value=>make('td',value))); return row;
  }));
}
// Line numbers refer to the archived excerpts. A string selects a literal expression.
const focusLines = {
  'GOAL.md': [[2]],
  'search_support.py': [[12, 's=x@x.T'], [13, 'np.sum(s**4)-36']],
  'verify.py': [[11], [12]],
  'stdin.py': [[10]],
  'certify_second_basin.py': [[61]],
  'refine_basin3.py': [[45]],
  'saddle_descent.py': [[34]],
  'cascade.py': [[32], [33, 'z,info=optimize(y,end)']]
};
let currentCode, previousVersion;

function codeLine(source, label, style = '') {
  const line = make('span', '');
  line.className = ('line ' + style).trim();
  const number = make('span', label);
  number.className = 'ln';
  const body = make('span', '');
  body.className = 'source';
  body.append(highlight(source));
  line.append(number, body);
  return line;
}

function pointProductLine(version, style = '') {
  const offset = version.lines.findIndex(line => line.includes('s[i,j]='));
  const call = version.lines[offset].split('s[i,j]=')[1];
  // Fold only list-comprehension arguments in this call. The detail view retains every byte.
  const compact = call.replace(/\[[^\n]*?for k in range\(d\)\]/g, '…').replace(/,…/g, ', …');
  const sign = {removed:'−', edited:'+'}[style] || '';
  return codeLine(compact, sign + (version.first + offset), style);
}

function renderCode(index,revision,single = false) {
  const key = single ? 'single-step' : index + '/' + revision;
  if (key===shownCode) return;
  shownCode=key;
  const record=stages[Math.max(0,index)];
  const code=single ? sphericalRecord.singleStep.code : index<0 ? {file:'GOAL.md',first:1,lines:[tr('24 个单位向量，位于六维空间。'),tr('寻找可被证明的非全局局部极小。')]} :
    revision>0 ? record.revisions[revision-1] : record.code;
  updateText(byId('file-name'), code.file==='stdin.py'?tr('python · 标准输入'):code.file);
  const action = single ? '新建' : revision === 2 ? '修订' : ['读取','新建','执行','改编','新建','新建'][index];
  updateText(byId('request'), index < 0 ? tr('任务摘要') : tr('{0} · 请求 #{1}',tr(action),code.request || 2));
  byId('open-code').title = code.file;
  currentCode = code;
  previousVersion = revision === 2 ? record.revisions[0] : null;
  const preview = [];
  if (code.file === 'refine_hp.py') {
    if (previousVersion) preview.push(pointProductLine(previousVersion, 'removed'));
    preview.push(pointProductLine(code, previousVersion ? 'edited' : ''));
  } else {
    for (const [number, fragment] of focusLines[code.file] ?? [[code.first]]) {
      const source = code.lines[number - code.first];
      preview.push(codeLine(fragment && source.includes(fragment) ? fragment : source.trim(), number));
    }
  }
  byId('code').replaceChildren(...preview);
  byId('revisions').hidden=index!==1;
  [...byId('revisions').children].forEach((btn,i)=>btn.setAttribute('aria-pressed',i===revision));
}
// The fixed camera changes only when the underlying configuration or the selected view changes.
function energyText(energy) {
  return energy < 1e-8 ? (energy * 1e12).toFixed(3) + '×10⁻¹²' : energy.toFixed(6);
}

function paintPlot(event, progress) {
  const terminal = shownResult === last;
  const record = stages[shownResult];
  const data = terminal ? minima[minimum] : record;
  const key = terminal ? 'verified/' + minimum : 'stage/' + shownResult;
  if (key !== plotKey) {
    const canvas = byId('geometry');
    if (plotKey && sceneMotion && canvas.width && canvas.height) {
      // Composite any unfinished handoff before starting another one.
      const snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      const ctx = snapshot.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      if (sphereFade) {
        ctx.globalAlpha = Number(getComputedStyle(oldGeometry).opacity);
        ctx.drawImage(oldGeometry, 0, 0);
      }
      clearBlend();
      oldGeometry.width = canvas.width;
      oldGeometry.height = canvas.height;
      oldGeometry.getContext('2d').drawImage(snapshot, 0, 0);
      oldGeometry.hidden = false;
      sphereFade = oldGeometry.animate([{opacity:1},{opacity:0}], {duration:transitionMs, easing:enterEase});
      sphereFade.onfinish = clearBlend;
    }
    plotKey = key;
    view.setData(data.vectors);
    gramView.setData(data.vectors);
    const label = terminal ? tr('已验证构型 {0}',minimum + 1) : tr(chapters[shownResult].config);
    updateText(byId('result-file'), label);
    const coordinates = data.vectors[0].map(v => v.toFixed(5)).join(', ');
    byId('result-note').textContent = 'F = ' + energyText(data.energy) + '\n' + 'v₁ = (' + coordinates + ')' +
      (terminal ? '\n' + tr('区间验证精度 220 位，4 份证书通过。') : '');
    updateText(byId('config-name'), label);
    updateText(byId('energy'), energyText(data.energy));
    const local = window.replayLocale.text;
    byId('minimum-energy').textContent = energyText(data.energy);
    byId('reference-energy').textContent = energyText(stages[0].energy);
    byId('minimum-curvature').textContent = terminal ? data.curvature.toFixed(6) : '—';
    const proof = byId('minimum-proof');
    proof.dataset.tone = terminal ? 'good' : 'pending';
    proof.textContent = terminal ? local('通过 · 220 位','Passed · 220 bits') : local('待独立复核','Awaiting independent check');
    byId('minimum-note').textContent = terminal
      ? local('四个低谷的能量区间互不重叠，均高于参照值。','Four disjoint energy intervals, all above the reference.')
      : local('参照给出更低能量。候选仍须通过局部极小核验。','The reference gives a lower energy. Candidates still need a local-minimum check.');
    if (!shownResult) byId('minimum-note').textContent = local('以作者构型的能量作为后续比较基准。','The author’s configuration is the energy reference for later candidates.');
  }
  paintEnergy(event, progress, sceneMotion);
}
function clearBlend() {
  if (sphereFade) sphereFade.cancel();
  sphereFade = null;
  oldGeometry.hidden = true;
}
let fullTrace = false;
function paintEnergy(event, progress, animate, force = false) {
  const values = stages[traceChapter]?.trace ?? null;
  const step = values ? (event.sample ? sampleIndex(values, progress) : values.length - 1) : -1;
  const previousRun = traceView.values;
  if (!traceView.setData(values, step, fullTrace, animate && !reduced.matches) && !force) return;
  byId('trace-empty').hidden = Boolean(values);
  if (animate && previousRun !== values) revealChange(byId('chart-area'));
  const zoomed = traceView.level > 0;
  const scale = tr(traceView.level === 2 ? 'F − 末步能量 · 对称对数' : '线性能量 F');
  const caption = zoomed ? tr('局部放大 · 第 {0}–{1} 步 · {2}',traceView.start+1,traceView.end+1,scale)
    : tr('全程 · 迭代步 / 对数能量 F');
  updateText(byId('trace-scale'), caption, animate);
  byId('trace-view').hidden = !values || !traceView.autoLevel;
  updateText(byId('trace-view'), tr(fullTrace ? '跟随放大' : '查看全程'), animate);
  const sample = values ? (step+1) + ' / ' + values.length + ' · F = ' +
    (zoomed ? values[step].toPrecision(14) : energyText(values[step])) : tr('等待搜索记录。');
  byId('trace').title = sample;
  byId('trace').setAttribute('aria-label', caption + '. ' + sample);
}
byId('trace-view').addEventListener('click', () => {
  fullTrace = !fullTrace;
  const event = events[activeIndex];
  paintEnergy(event, (position-event.start)/event.seconds, true);
});
function sampleIndex(values, progress) {
  // Decelerate through the last samples so the second magnification can be read.
  return Math.round(smooth(clamp(progress / arrival)) * (values.length - 1));
}
// These are families of attempts, not a taxonomy of all possible minima.
// Event annotations reveal only what was known at that moment in the replay.
const searchNodes = new Map();
for (const [id, parent, name] of [
  ['root', null, '球面局部极小'],
  ['multi', 'root', '多起点搜索'],
  ['first', 'multi', '首组候选精修'],
  ['unfixed', 'first', '原点积脚本'],
  ['fixed', 'first', '修复后重跑'],
  ['resume', 'multi', '任务恢复与复查'],
  ['interrupt', 'resume', '阶段 001 调用'],
  ['rerun', 'resume', '更换起点'],
  ['second', 'multi', '改写 Cholesky 证书'],
  ['third', 'multi', '随机起点精修'],
  ['saddle', 'root', '鞍点下降'],
  ['single', 'saddle', '单步下降'],
  ['cascade', 'saddle', '级联下降'],
  ['verify', 'root', '独立验证']
]) {
  const item = make('li',''), button = make('button',''), status = make('span',''), children = make('ul','');
  item.dataset.branch = id;
  status.className = 'branch-status';
  button.append(make('span', tr(name)), status);
  item.append(button, children);
  const node = {parent, name, item, button, status, children, time:0};
  searchNodes.set(id, node);
  button.addEventListener('click', () => {pause(); jump(node.time, true);});
}

function renderSearch(index, arrived) {
  const seen = new Map();
  let active;
  for (let i = 0; i <= index; i++) {
    const event = events[i], path = event.search;
    if (!path) continue;
    const received = i < index || arrived;
    const time = event.start + (received ? event.seconds * arrival + .002 : 0);
    seen.set(path.id, {time, text:received ? path.finish : path.start,
      state:received ? path.state : event.fault ? 'blocked' : 'running'});
    for (let parent = searchNodes.get(path.id).parent; parent; parent = searchNodes.get(parent).parent) {
      if (!seen.has(parent)) seen.set(parent, {time:event.start, text:'', state:'group'});
    }
    active = path.id;
  }
  for (const [id, node] of searchNodes) {
    if (!seen.has(id)) node.item.remove();
  }
  for (const [id, record] of seen) {
    const node = searchNodes.get(id);
    const firstVisit = !node.item.parentNode;
    if (firstVisit) {
      const list = node.parent ? searchNodes.get(node.parent).children : byId('search-tree');
      list.append(node.item);
    }
    node.time = record.time;
    node.item.dataset.state = record.state;
    updateText(node.status, tr(record.text), sceneMotion && !firstVisit);
    if (firstVisit && sceneMotion) revealChange(node.button);
    node.button.toggleAttribute('data-current', active === id);
    if (active === id) node.button.setAttribute('aria-current','step');
    else node.button.removeAttribute('aria-current');
    node.button.title = tr('回看{0} · {1}',tr(node.name),filmTime(record.time));
  }
}

// The renderer and the transitions use the same boundary snapshots. Old text
// can soften before delivery without delaying or duplicating the new record.
function buildCardFrames() {
  const frames = [];
  const words = {ai:'等待读取搜索程序。', run:'等待任务。', db:'等待第一条任务记录。', result:'参照坐标已载入，等待测量。'};
  const lastAction = {...words};
  let code = -1, revision = 0, db = -1, result = 0, receipt = null, singleScript = false, trace = -1;
  for (const event of events) {
    for (const arrived of [false, true]) {
      if (arrived) words[event.to] = event.reply;
      else words[event.from] = event.say;
      if (event.singleStep === 'started') {
        singleScript = true;
        if (arrived) receipt = sphericalRecord.singleStep.started;
      }
      if (event.singleStep === 'finished') receipt = sphericalRecord.singleStep.finished;
      if (event.sample) trace = event.chapter;
      if (event.code !== undefined && event.chapter !== last && (event.to !== 'ai' || arrived)) {
        code = event.chapter;
        revision = event.code;
        singleScript = false;
        const item = revision ? stages[code].revisions[revision - 1] : stages[code].code;
        if (arrived) receipt = item.receipt;
      }
      if (arrived && event.db) db = event.chapter;
      if (arrived && event.result) result = event.chapter;
      const terminal = event.chapter === last;
      const hostSource = terminal && Boolean(event.result);
      const fields = {
        code: singleScript ? 'single-step' : code + '/' + revision,
        receipt: terminal ? (result === last ? 'verified' : 'verifying') : receipt,
        'sql-output': db,
        'result-note': result,
        'host-source': hostSource
      };
      const speaker = arrived ? event.to : event.from;
      lastAction[speaker] = event.title;
      for (const id of Object.keys(roles)) fields['speech-' + id] = id === speaker ? words[id] : lastAction[id];

      const snapshot = {at:event.start + (arrived ? event.seconds * arrival : 0),
        fields, words:{...words}, code, revision, singleScript, db, result, receipt, trace, terminal, hostSource};
      snapshot.changes = changedFields(frames[frames.length - 1], snapshot);
      frames.push(snapshot);
    }
  }
  return frames;
}

function changedFields(previous, next) {
  return previous ? Object.keys(next.fields).filter(id => previous.fields[id] !== next.fields[id]) : [];
}

const cardFrames = buildCardFrames();
const motionStyle = getComputedStyle(document.documentElement);
const enterEase = motionStyle.getPropertyValue('--ease-travel').trim();
const exitEase = motionStyle.getPropertyValue('--ease-in-out').trim();
const fadeOutMs = 150, fadeInMs = transitionMs - fadeOutMs;

function revealChange(node) {
  if (reduced.matches || document.hidden || node.hidden) return;
  for (const animation of node.getAnimations()) {
    if (animation.id === 'replay-change') animation.cancel();
  }
  node.animate([
    {opacity:.4, filter:'blur(1.5px)', transform:'translateY(2px)'},
    {opacity:1, filter:'blur(0)', transform:'translateY(0)'}
  ], {id:'replay-change', duration:transitionMs, easing:enterEase});
}

function updateText(node, value, animate = sceneMotion) {
  if (node.textContent === value) return;
  node.textContent = value;
  if (animate && value) revealChange(node);
}

const networkBoard = byId('collaboration-map').parentElement;
const cardAnimations = new Set();
let preparedExit = null;

function settleCards() {
  for (const animation of cardAnimations) animation.cancel();
  cardAnimations.clear();
  preparedExit = null;
}

function animateFields(ids, entering, duration) {
  if (reduced.matches || document.hidden) return;
  for (const id of ids) {
    const field = byId(id);
    if (!field.getClientRects().length || field.contains(document.activeElement)) continue;
    const speech = field.classList.contains('station-speech');
    const clear = {opacity:1, filter:'blur(0px)'};
    const soft = {opacity:speech ? .22 : .42, filter:speech ? 'blur(2.4px)' : 'blur(1.25px)'};
    if (speech) {
      clear.transform = 'translateY(0)';
      soft.transform = entering ? 'translateY(4px)' : 'translateY(-1.5px)';
    }
    const animation = field.animate(entering ? [soft, clear] : [clear, soft], {
      duration,
      easing: entering ? enterEase : exitEase,
      fill: entering ? 'none' : 'forwards'
    });
    cardAnimations.add(animation);
    if (entering) animation.onfinish = () => cardAnimations.delete(animation);
  }
}

function renderEvidence(index,arrived,snapshot) {
  const {code, revision, db, result, receipt, singleScript, terminal} = snapshot;
  const current = events[index];
  traceChapter = snapshot.trace;
  for (const id of Object.keys(roles)) {
    const speech = byId('speech-' + id), text = tr(snapshot.fields[speech.id]);
    if (speech.textContent !== text) speech.textContent = text;
    const speaking = id === (arrived ? current.to : current.from);
    byId('station-' + id).classList.toggle('speaking', speaking);
  }
  const scriptInUse = current.code !== undefined || current.fault || current.singleStep;
  byId('station-ai').classList.toggle('previewing', !terminal && Boolean(scriptInUse) &&
    (current.from === 'ai' || arrived || current.fault));
  byId('station-db').classList.toggle('previewing', Boolean(current.db) && db === current.chapter);
  renderSearch(index, arrived);
  const traceName = traceChapter < 0 ? '' : tr(chapters[traceChapter].config);
  updateText(byId('energy-trace-origin'), traceChapter >= 0 && traceChapter < current.chapter ? tr('上次记录 · {0}',traceName) : traceName);
  renderCode(code,revision,singleScript); renderDb(db);
  if (result===last && shownResult!==last) minimum=minima.length-1;
  shownResult = result;
  updateText(byId('checked'), stages[result].checked.toLocaleString('en-US'));
  byId('final-choices').hidden = result !== last;
  byId('host-source').hidden = !snapshot.hostSource;
  [...byId('minima').children].forEach((button, i) => button.setAttribute('aria-pressed', i === minimum));
  const label = byId('job-id'), stamp = byId('job-time'), output = byId('receipt');
  output.classList.toggle('error', Boolean(!terminal && receipt?.error));
  stamp.hidden = !receipt || terminal;

  if (terminal) {
    updateText(label, tr('本地验证'));
    output.textContent = result === last
      ? [tr('验证精度　220 位'),tr('证书通过　4 / 4'),tr('复核构型　{0}',stages[last].checked.toLocaleString('en-US'))].join('\n')
      : [tr('模型调度结束'),tr('独立验证器复核区间证书')].join('\n');
  } else if (receipt) {
    updateText(label, tr('作业 #{0}',receipt.job));
    updateText(stamp, (receipt.finished || receipt.started).slice(11, 19) + ' UTC');
    stamp.dateTime = receipt.finished || receipt.started;
    output.textContent = receipt.returns ? receipt.returns.map(row =>
      'F = ' + row.energy.toFixed(6) + '  ' + tr('{0} 次',row.hits)).join('\n') : receipt.error || (receipt.refinedEnergy
      ? 'F = ' + Number(receipt.refinedEnergy).toFixed(12)
      : receipt.finished ? 'exit ' + receipt.exitCode : tr('已启动'));
  } else {
    updateText(label, tr('目标已封存'));
    output.textContent = [tr('输入　24 个六维单位向量'),tr('判据　非全局局部极小')].join('\n');
  }
}

function openRecord(id) {
  pause();
  const dialog = byId('record-dialog');
  dialog.dataset.role = id;
  byId('record-title').textContent = tr(roles[id].name) + ' · ' + tr(roles[id].evidence);
  const evidence = byId('evidence-' + id).cloneNode(true);
  const revisions = evidence.querySelector('#revisions');
  if (revisions) {
    revisions.classList.add('reading-revisions');
    [...revisions.children].forEach((button, i) => button.addEventListener('click', () => {
      jump(events.find(e=>e.chapter===1 && e.code===i).start,true);
      openRecord('ai');
      byId('record-reading').querySelectorAll('.reading-revisions button')[i].focus();
    }));
  }
  const link = evidence.querySelector('.source-link');
  if (link) link.replaceWith(make('span', link.firstElementChild.textContent));
  if (id === 'ai') {
    const block = evidence.querySelector('#code');
    block.className = 'archive-code';
    block.replaceChildren();
    for (const version of [previousVersion, currentCode].filter(Boolean)) {
      if (previousVersion) block.append(make('strong', tr(version === previousVersion ? '修复前' : '修复后')));
      version.lines.forEach((source, i) => block.append(codeLine(source, version.first + i)));
    }
  }
  if (id === 'db') {
    const block = evidence.querySelector('#query');
    block.className = 'archive-query';
    block.replaceChildren(highlight(stages[Math.max(0, shownDb)].sql));
  }
  for (const el of [evidence, ...evidence.querySelectorAll('[id]')]) el.removeAttribute('id');
  const snapshot = cardFrames[activeIndex * 2 + Number(hasArrived)];
  byId('record-reading').replaceChildren(make('p', tr(snapshot.words[id])), evidence);
  if (!dialog.open) dialog.showModal();
  else revealChange(byId('record-reading'));
}
for (const [id, role] of [['open-code','ai'], ['open-sql','db'], ['open-run','run'], ['open-result','result']]) {
  byId(id).addEventListener('click', () => openRecord(role));
}
byId('close-record').addEventListener('click', () => byId('record-dialog').close());

function setupEvent(index) {
  const event = events[index];
  byId('checkpoint').textContent = historyTime(stages[event.chapter].time);
  updateText(byId('story-title'), tr(event.title));
  byId('chapter-select').value = event.chapter;
}

function draw(time, instant = false, reveal = false) {
  position = Math.max(0, Math.min(total, time));
  let index = events.findIndex(e => position < e.end);
  if (index < 0) index = events.length - 1;
  const event = events[index], progress = (position - event.start) / event.seconds;
  const changed = index !== activeIndex, arrived = progress >= arrival;
  const previous = cardFrames[activeIndex * 2 + Number(hasArrived)];
  const frameIndex = index * 2 + Number(arrived);
  const snapshot = cardFrames[frameIndex];
  const refresh = instant || previous !== snapshot;
  sceneMotion = !reduced.matches && !document.hidden && (reveal || (playing && !instant));
  if (refresh) {
    document.documentElement.classList.toggle('scene-motion',sceneMotion);
    settleCards();
    networkBoard.classList.toggle('blending', !reduced.matches && (reveal || (playing && !instant)));
  }
  if (instant || changed) {
    activeIndex = index;
    setupEvent(index);
    if (instant && !sceneMotion) {
      clearBlend();
      traceView.finishTransition();
      for (const effect of document.getAnimations()) if (effect.id === 'replay-change') effect.cancel();
    }
  }
  if (refresh) {
    hasArrived = arrived;
    renderEvidence(index, arrived, snapshot);
  }
  paintPlot(event, progress);
  if (refresh) {
    const local = replayLocale.text;
    const utc = stage => stage.utc.slice(11,19);
    const db = stages[Math.max(0,snapshot.db)];
    const record = stages[snapshot.result];
    const visible = events.slice(0,index+1);
    const points = stages.slice(0,snapshot.result+1).map((stage,chapter) => {
      const completed=events.find(e=>e.chapter===chapter && e.result);
      return {at:chapter && completed ? completed.start+completed.seconds*arrival+.001 : 0,utc:utc(stage),value:stage.checked,label:stage.checked.toLocaleString('en-US')};
    });
    const job=byId('receipt').textContent;
    const verifier=record===stages[last]?stages[last].code:null;
    caseStory.show({index,start:event.start,end:event.end,from:arrived?event.to:event.from,to:arrived?event.from:event.to,chapter:event.chapter,
      phase:event.fault?'reject':snapshot.result===last?'accept':'run',description:tr(arrived?event.reply:event.say),
      focus:snapshot.result===last?[1,3]:event.sample?[0,2]:[0,1],
      records:{ai:{file:currentCode.file,first:currentCode.first,excerpt:currentCode.lines.join('\n')},
        run:snapshot.receipt && typeof snapshot.receipt==='object'
          ? {file:local('作业回执','Job receipt')+' #'+snapshot.receipt.job,excerpt:JSON.stringify(snapshot.receipt,null,2)}
          : {file:local('任务记录','Task record'),excerpt:db.sql+'\n\n'+job},
        db:{file:byId('db-name').textContent,sql:db.sql,columns:db.columns,rows:snapshot.db<0?[]:db.rows},
        result:{file:verifier?.file ?? byId('config-name').textContent,excerpt:byId('result-note').textContent,
          fields:{F:byId('energy').textContent,N:24,dim:6}}},
      score:{points,limits:[1,stages[last].checked],unit:local('已复核构型','Configurations checked'),
        note:tr(chapters[snapshot.result].config),utc:utc(stages[event.chapter]),startUtc:utc(stages[0]),endUtc:utc(stages[last])}});
  }
  caseStory.travel(progress);
  const next = cardFrames[frameIndex + 1];
  const remainingMs = next ? (next.at - position) * 1000 / rate : Infinity;
  if (refresh && (reveal || (playing && !instant))) {
    const fields = changedFields(previous, snapshot);
    // At double speed, leave a clear reading interval between two transitions.
    const duration = reveal ? transitionMs : Math.min(fadeInMs, remainingMs * .55);
    animateFields(fields, true, duration);
  }

  if (playing && !instant && !reduced.matches && next && next !== preparedExit) {
    if (remainingMs > 0 && remainingMs <= fadeOutMs) {
      settleCards();
      preparedExit = next;
      animateFields(next.changes, false, remainingMs);
    }
  }
  seek.value = position;
  seek.style.setProperty('--played', (100 * position / total) + '%');
  const clock = filmTime(position);
  if (byId('story-timecode').textContent !== clock) byId('story-timecode').textContent = clock;
}
function transport() {
    document.getElementById('story-view').dataset.playing=String(playing);
  const ended=position>=total, label=playing?'暂停':ended?'重播':'播放';
  updateText(byId('story-play').querySelector('span'), tr(label), activeIndex >= 0);
  byId('story-play').querySelector('use').setAttribute('href',playing?'#i-pause':'#i-play');
  byId('story-play').setAttribute('aria-label',tr('{0}运行回放',tr(label)));
  byId('story-prev').disabled=position<=0;
  byId('story-next').disabled=ended;
}
function pause() {
  playing=false; cancelAnimationFrame(frame);
  networkBoard.classList.remove('blending');
  traceView.finishTransition();
  settleCards();
  transport();
}
function jump(time, reveal = false) {
  if (time >= total) pause();
  draw(time, true, reveal);previousTime=performance.now();
  transport();
}
function tick(now) {
  if(!playing) return;
  draw(position+(now-previousTime)*rate/1000); previousTime=now;
  if(position>=total) {pause();return;}
  byId('story-prev').disabled=false;
  frame=requestAnimationFrame(tick);
}
function play() {
  if(position>=total) draw(0, true, true);
  playing=true;previousTime=performance.now();transport();frame=requestAnimationFrame(tick);
}
byId('story-play').addEventListener('click',()=>playing?pause():play());
byId('story-prev').addEventListener('click',()=>{
  pause();jump(events[position-events[activeIndex].start>.08?activeIndex:Math.max(0,activeIndex-1)].start, true);
});
byId('story-next').addEventListener('click',()=>{pause();jump(events[activeIndex].end, true);});
byId('story-speed').addEventListener('click',()=>{
  settleCards();
  const speeds = [.5,.75,1,1.5,2];
  rate=speeds[(speeds.indexOf(rate)+1)%speeds.length];
  updateText(byId('story-speed'),rate+'×',true);
  byId('story-speed').setAttribute('aria-label',tr('切换回放速度，当前 {0} 倍',rate));
});
seek.addEventListener('input',()=>{pause();jump(Number(seek.value));});
document.addEventListener('visibilitychange',()=>{if(document.hidden) pause();});
reduced.addEventListener('change',()=>{
  if (reduced.matches) pause();
  draw(position, true);
});
const chapterMenu = byId('chapter-select');
chapters.forEach((_, index) => chapterMenu.add(new Option('',String(index))));
chapterMenu.addEventListener('change', () => jump(chapters[Number(chapterMenu.value)].start,true));
const revisions = ['梯度检查','高精度精修','修复点积'];
revisions.forEach((label,index)=>{
  const btn=make('button','');
  btn.addEventListener('click',()=>{pause();jump(events.find(e=>e.chapter===1&&e.code===index).start, true);});
  byId('revisions').append(btn);
});
minima.forEach((point,index)=>{
  const energy = point.energy.toFixed(6);
  const btn=make('button',energy);
  btn.addEventListener('click',()=>{
    const different = minimum !== index;
    minimum=index;
    draw(position, true, different);
    if (different) animateFields(['result-note'], true, transitionMs);
  });
  byId('minima').append(btn);
});
byId('verify-code').textContent = stages[last].code.lines.join('\n');
byId('reset-view').addEventListener('click',()=>view.reset(!reduced.matches));
const archive=byId('archive');
byId('archive-button').addEventListener('click',()=>{pause();archive.showModal();});
byId('close').addEventListener('click',()=>archive.close());
archive.addEventListener('click',e=>{
  const box=archive.getBoundingClientRect();
  if(e.target===archive && (e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)) archive.close();
});
const archiveFacts = [
  ['运行编号','run-20261030T152926Z'],['模型',sphericalRecord.model],['模型调度时长',historyTime(sphericalRecord.modelSeconds)],
  ['含本地验证',historyTime(stages[last].time)],['模型请求',String(sphericalRecord.requests)],['模型调用费用','US$ '+sphericalRecord.cost.toFixed(2)],
];
function labelControls() {
  chapters.forEach((chapter, index) => {
    chapterMenu.options[index].textContent = String(index+1).padStart(2,'0') + ' · ' + tr(chapter.name);
    chapterMenu.options[index].title = tr(chapter.title);
  });
  revisions.forEach((name, i) => {byId('revisions').children[i].textContent = tr(name);});
  minima.forEach((point, i) => byId('minima').children[i].setAttribute('aria-label',
    tr('查看局部极小 {0}，能量 {1}',i+1,point.energy.toFixed(6))));
  for (const node of searchNodes.values()) node.button.firstElementChild.textContent = tr(node.name);
  byId('story-speed').setAttribute('aria-label',tr('切换回放速度，当前 {0} 倍',rate));
  byId('facts').replaceChildren(...archiveFacts.map(([label,value]) => {
    const row = make('div','');
    row.append(make('dt',tr(label)),make('dd',value));
    return row;
  }));
}
labelControls();

document.addEventListener('replaylanguagechange', () => {
  labelControls();
  // Rerender the current snapshot without touching the playback clock or selected minimum.
  shownCode = '';
  shownDb = -2;
  plotKey = '';
  draw(position,true);
  const event = events[activeIndex];
  paintEnergy(event,(position-event.start)/event.seconds,false,true);
  gramView.setMode('gram');
  transport();
  const reader = byId('record-dialog');
  if (reader.open) openRecord(reader.dataset.role);
  for (const node of document.querySelectorAll('.intro,.scene-heading,.station-heading,.station-speech,.evidence,.sphere-head,.readout,.search-panel,.energy-head,.trace-foot,#chapter-select')) {
    revealChange(node);
  }
});

const openingBranch = new URLSearchParams(location.search).get('branch');
const openingEvent = events.find(event => event.search?.id === openingBranch);
draw(openingEvent?.start ?? 0, true);
transport();
if (document.hidden) {
  document.addEventListener('visibilitychange', play, {once:true});
} else {
  play();
}

