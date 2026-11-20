// These two callbacks are used by the shared spherical crew renderer.
function updateText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function tr(value, direction, _kind, packet) {
  if (Array.isArray(value)) return window.replayLocale.text(...value);
  if (packet !== undefined) return direction + ' · ' + packet;
  return value;
}

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (zh,en) => window.replayLocale.text(zh,en);
  const roles = {
    ai: {name: ['AI 工作区','AI workspace'], color: '#c4a8ed'},
    run: {name: ['Run 内核','Run kernel'], color: '#e8b971'},
    db: {name: ['SQLite 数据库','SQLite database'], color: '#91bfd6'},
    result: {name: ['验证器','Verifier'], color: '#a6c9a5'}
  };
  const duration = 102;
  const speeds = [.5,.75,1,1.5,2];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = [];
  for (const scene of rkScenes) {
    const previous = frames.at(-1);
    const roleData = {...previous?.roles};
    for (const [id, update] of Object.entries(scene.updates)) roleData[id] = {update, utc:scene.utc};
    frames.push({
      roles:roleData, metric:scene.metric || previous?.metric,
      certified:Boolean(scene.certified || previous?.certified), final:Boolean(scene.final)
    });
  }
  let position = 0, index = -1, speed = .75, playing = true, tickId = 0, previousTick = null;
  let rhs = 1600, reading = null, resume = false, dragging = false;
  let drawnStability = '', drawnOdes = '';
  const dialog = $('record-dialog');
  const clock = seconds => [Math.floor(seconds/60),Math.floor(seconds%60)].map(n=>String(n).padStart(2,'0')).join(':');
  function enter(element) {
    if (motion.matches) return;
    element.getAnimations().filter(a => a.id === 'rk-checkpoint').forEach(a => a.cancel());
    element.animate([{opacity:.35,filter:'blur(1.7px)',transform:'translateY(2px)'},{opacity:1,filter:'blur(0)',transform:'none'}],
      {id:'rk-checkpoint',duration:450,easing:'cubic-bezier(.16,1,.3,1)'});
  }

  function populateControls() {
    $('chapter-select').replaceChildren(...rkScenes.map((scene,i) => new Option(tr(scene.title),String(i))));
    $('chapter-select').value = String(index);
    $('rhs').replaceChildren(...[200,400,800,1600,3200].map(n => new Option(n.toLocaleString('en-US') + ' ' + t('次求值','RHS'),String(n))));
    $('rhs').value = String(rhs);
    $('story-speed').textContent = speed + '×';
    $('duration').textContent = clock(duration);
    $('story-seek').max = duration;
    showPlay();
  }
  function showPlay() {
    document.getElementById('story-view').dataset.playing=String(playing);
    $('story-play').querySelector('use').setAttribute('href',playing ? '#i-pause' : '#i-play');
    $('story-play').querySelector('span').textContent = playing ? t('暂停','Pause') : position >= duration ? t('重播','Replay') : t('播放','Play');
  }

  function showTree() {
    const visited = new Map();
    const focused = document.activeElement.closest('#search-tree button')?.dataset.index;
    const root = $('search-tree');
    root.replaceChildren();
    const active = rkScenes.slice(0,index+1).findLast(scene => scene.branch).branch[0];
    for (let i=0;i<=index;i++) {
      const branch = rkScenes[i].branch;
      if (!branch) continue;
      const [id,parent,zh,en,state] = branch;
      const li=document.createElement('li'), btn=document.createElement('button');
      li.dataset.state = state || 'open';
      btn.type='button'; btn.dataset.index=i;
      btn.textContent=t(zh,en);
      if (id===active) {btn.dataset.current=''; btn.setAttribute('aria-current','step');}
      const status=document.createElement('span');
      status.className='branch-status';
      status.textContent = state==='blocked' ? t('驳回','Rejected') : state==='verified' ? t('已核验','Verified') : state==='candidate' ? t('数值合格','Feasible') : '';
      btn.append(status);
      li.append(btn);
      if (parent) {
        const ancestor=visited.get(parent);
        if (!ancestor.lastElementChild.matches('ul')) ancestor.append(document.createElement('ul'));
        ancestor.lastElementChild.append(li);
      } else root.append(li);
      visited.set(id,li);
      if (focused===String(i)) btn.focus({preventScroll:true});
    }
  }
  function drawCharts(force=false) {
    const frame=frames[index];
    const stableKey=[frame.metric,frame.certified].join('/');
    if (force || stableKey!==drawnStability) {
      rkCharts.stability(frame.metric,frame.certified);
      rkCharts.terms(frame.metric,frame.certified);
      if (drawnStability && !force) {
        enter($('stability-plot'));
        enter($('metric-plot'));
      }
      drawnStability=stableKey;
    }
    const odeKey=[frame.final,rhs].join('/');
    if (force || drawnOdes!==odeKey) {
      $('rhs').disabled = !frame.final;
      rkCharts.odes(frame.final,rhs);
      if (drawnOdes && !force) enter($('ode-plot'));
      drawnOdes=odeKey;
    }
  }
  function showCandidateChecks(scene, frame) {
    const {metric, certified} = frame;
    const {candidates} = rkArchive;
    const candidate = candidates[metric];
    const branch = scene.branch?.[0];
    const failed = metric === 'free';
    const labels = [
      ['check-stability', !metric ? '—' : failed ? t('已改变','Changed') : t('一致','Matched'), !metric ? 'pending' : failed ? 'bad' : 'good'],
      ['check-coefficient', candidate?.maxCoefficient.toFixed(2) ?? '—', candidate ? 'active' : 'pending'],
      ['check-floor', metric ? '639/45752' : '—', metric ? 'active' : 'pending'],
      ['check-certificate', certified ? t('通过','Passed') : branch === 'pslq' || branch === 'job40'
        ? t('该证明未通过','This proof failed') : candidate && !failed ? t('待独立证明','Awaiting proof') : '—',
        certified ? 'good' : branch === 'pslq' || branch === 'job40' ? 'bad' : 'pending']
    ];
    for (const [id, label, tone] of labels) {
      updateText($(id),label);
      $(id).dataset.tone = tone;
    }
    let note = t('等待读取冻结基线。','Waiting for the frozen baseline.');
    if (metric) note = t('稳定性多项式固定了第四个误差项。','The frozen polynomial fixes the fourth error term.');
    if (failed) note = t('误差项几乎为零，但稳定域改变，候选被拒。','Near-zero error terms, but the changed stability region rules this candidate out.');
    if (metric === 'large' || metric === 'selected') {
      const small = candidates.first.maxCoefficient.toFixed(2), large = candidates.large.maxCoefficient.toFixed(2);
      note = t(`两组范数相同，最大系数分别为 ${small} 和 ${large}，保留较小系数。`,
        `Equal norms. The smaller maximum coefficient (${small} versus ${large}) is preferred.`);
    }
    if (certified) note = t('前三项精确为零，剩余一项恰好达到下界。','Three terms are exactly zero. The fourth attains the bound.');
    updateText($('check-note'),note);
  }
  function showScene(force) {
    const scene=rkScenes[index], frame=frames[index];
    $('story-title').textContent=tr(scene.title);
    $('run-clock').textContent=scene.utc+' UTC';
    $('run-clock').dateTime='2026-10-30T'+scene.utc+'Z';
    $('chapter-select').value=String(index);
    $('story-prev').disabled=index===0;
    $('story-next').disabled=index===rkScenes.length-1;
    const evidence = Object.fromEntries(Object.entries(frame.roles).map(([role,{update}]) => {
      const key = update[2];
      const source = key === 'heldOut' ? {file:'held-out-comparison.json',excerpt:JSON.stringify(rkArchive.heldOut.filter(r=>r.rhs_calls===1600),null,2)} : rkArchive.records[key];
      return [role,source];
    }));
    const visible = rkScenes.slice(0,index+1);
    const points = visible.filter(s => s.metric === 'baseline' || s.metric === 'first' || s.certified).map(s => {
      const value = s.metric === 'baseline' ? rkArchive.baseline.norm : rkArchive.candidates.first.norm;
      return {at:s.at,utc:s.utc,value,label:s.certified?'639/45752':value.toFixed(6)};
    });
    const note = scene.updates[scene.route[1]] ?? Object.values(scene.updates).at(-1);
    if (!points.length) points.push({at:0,utc:scene.utc,value:rkArchive.baseline.norm,label:rkArchive.baseline.norm.toFixed(6)});
    const description=index===0 ? t('调整双寄存器方法的系数。','Tune the two-register coefficients.') : t(note[0],note[1]);
    caseStory.show({index,start:scene.at,end:rkScenes[index+1]?.at ?? duration,from:scene.route[0],to:scene.route[1],chapter:index,records:evidence,
      phase:scene.fault?'reject':frame.certified?'accept':'run',description,
      focus:frame.final?[2,3]:frame.metric==='free'?[0,2]:[0,1],
      score:{points,limits:[rkArchive.candidates.first.norm,rkArchive.baseline.norm],unit:index===0?t('参考主误差','Reference leading error'):t('已核验主误差','Verified leading error'),
        note:frame.certified?t('精确证书通过','Exact certificate verified'):t('冻结稳定性条件','Frozen stability constraints'),
        utc:scene.utc,startUtc:rkScenes[0].utc,endUtc:rkScenes.at(-1).utc}});
    showTree();
    drawCharts(force);
    showCandidateChecks(scene, frame);
    if (!force) enter($('story-title'));
  }
  function paint(force=false) {
    const next=rkScenes.findLastIndex(scene=>scene.at<=position);
    if (next!==index || force) {index=next;showScene(force);}
    const current=rkScenes[index];
    const until=rkScenes[index+1]?.at ?? duration;
    const progress=Math.min(1,(position-current.at)/(until-current.at));
    caseStory.travel(progress);
    $('story-seek').value=position;
    $('story-seek').style.setProperty('--played',position/duration*100+'%');
    const time=clock(position);
    updateText($('story-timecode'),time);
    $('story-seek').setAttribute('aria-valuetext',time+' · '+tr(current.title));
  }
  function step(now) {
    tickId=0;
    if (previousTick!==null) position=Math.min(duration,position+(now-previousTick)*speed/1000);
    previousTick=now;
    paint();
    if (position>=duration) {playing=false;showPlay();}
    schedule();
  }
  function schedule() {
    if (playing && !dragging && !document.hidden && !tickId) tickId=requestAnimationFrame(step);
  }
  function setPlaying(value) {
    playing=value;previousTick=null;
    cancelAnimationFrame(tickId);tickId=0;
    showPlay();schedule();
  }
  function seek(value) {
    position=Math.max(0,Math.min(value,duration));previousTick=null;
    if (position>=duration) setPlaying(false);
    paint();showPlay();
  }

  const readingArea=$('record-reading');
  function append(tag,value,css) {
    const node=document.createElement(tag);
    node.textContent=value;
    if (css) node.className=css;
    readingArea.append(node);
  }
  function evidence(key) {
    const rec=rkArchive.records[key];
    append('p',rec.file,'source-file');append('pre',rec.excerpt);
  }
  function table(headers,rows) {
    const tab=document.createElement('table');
    const head=tab.createTHead().insertRow();
    for (const header of headers) {const cell=document.createElement('th');cell.scope='col';cell.textContent=header;head.append(cell);}
    const body=tab.createTBody();
    for (const row of rows) {const tr=body.insertRow();for(const value of row) tr.insertCell().textContent=value;}
    readingArea.append(tab);
  }
  function odeData(budget=rhs) {
    append('p','final/held-out-comparison.json','source-file');
    const rows=rkArchive.heldOut.filter(row=>row.rhs_calls===budget);
    table([t('问题','ODE'),t('基线','Baseline'),t('候选','Candidate'),'Δ'],rows.map(row=>[
      tr(rkCharts.odeNames[row.problem]),row.baseline_error.toExponential(7),row.candidate_error.toExponential(7),rkCharts.percent(row.ratio)
    ]));
    append('p',t(`各方法均用 ${budget} 次函数求值，误差为终点最大绝对误差。四个问题在搜索前冻结。`,`Both methods use ${budget.toLocaleString('en-US')} RHS calls. Values are maximum absolute endpoint errors on four problems fixed before the search.`));
  }
  function renderRecord() {
    const scene=rkScenes[index], frame=frames[index], candidate=rkArchive.candidates[frame.metric];
    readingArea.replaceChildren();$('case-link').hidden=reading!=='archive';
    if (roles[reading]) {
      const {update,utc}=frame.roles[reading];
      $('record-title').textContent=tr(roles[reading].name);
      append('p',utc+' UTC · '+t(update[0],update[1]));
      if (update[2]==='heldOut') odeData(1600); else evidence(update[2]);
      if (update[2]==='largeCheck' || update[2]==='selectedCheck') {
        const checked=rkArchive.candidates[update[2]==='largeCheck' ? 'large' : 'selected'];
        append('p',checked.file.replace('.audit.json','.candidate.json'),'source-file');
        append('pre','max |αᵢ, βᵢ| ≈ '+checked.maxCoefficient.toPrecision(12));
      }
      if (update[2]==='proof' && frame.final) evidence('negative');
      return;
    }
    if (reading==='archive') {
      $('record-title').textContent=t('运行档案','Run archive');
      append('p',rkArchive.root,'source-file');
      append('p',t('2026 年 10 月 30 日。时间轴为压缩回放，阶段标题旁显示档案的 UTC 时间。16:58 的独立审计按快照文件名标至分钟。角色对话根据代码、日志和审计结果改写。','October 30, 2026. Playback time is compressed. Each checkpoint shows its archived UTC time. The 16:58 audit is dated to the minute by its snapshot filename. Dialogue paraphrases the archived code, logs and audits.'));
      append('h3',t('当前检查点','Current checkpoint'));append('p',scene.utc+' UTC · '+tr(scene.title));
      append('h3',t('如何读图','Reading the plots'));
      append('p',t('令 z = hλ。紫色区域内 |R(z)| ≤ 1，内侧等值线依次为 0.75、0.50、0.25。边界按归档多项式计算。误差图按四阶有根树分解，点表示小于一个像素的系数绝对值；精确零由隔离证书给出。','With z = hλ, the shaded region has |R(z)| ≤ 1. Interior contours mark 0.75, 0.50 and 0.25, computed from the archived polynomial. The bars show absolute fourth-order tree errors. Dots mark values below one plot pixel. The isolation proof establishes which terms are exactly zero.'));
      if (frame.final) {
        append('h3',t('最终归档','Final archive'));
        append('p',t('7 个不同候选中有 5 个通过冻结的数值判据。等误差候选按最大系数绝对值择优。研究在精确认证后停止，控制器把外部停止记为 infrastructure_error。','Five of seven distinct candidates passed the frozen numerical criteria. Maximum coefficient magnitude broke ties. The run stopped after certification. The controller recorded the external stop as infrastructure_error.'));
        evidence('summary');evidence('finish');evidence('science');
      }
      return;
    }
    if (reading==='polynomial') {
      $('record-title').textContent=t('稳定多项式','Stability polynomial');
      if (!frame.metric) {append('p',t('等待读取基线多项式。','Waiting for the baseline polynomial.'));return;}
      append('p','R(z) = 1 + z + z²/2 + z³/6 + (1901/68628)z⁴ + (121/68628)z⁵');
      append('p',t('四阶链形树误差等于 z⁴ 系数减去 1/24。故任一可行方法的范数至少为 639/45752。','The chain-tree error equals the fourth-degree coefficient minus 1/24. Its absolute value sets a lower bound of 639/45752 on every feasible norm.'));
      evidence('baseline');
      if (candidate) {
        append('p',candidate.file+' · high_precision.stability_ascending','source-file');
        append('pre',candidate.polynomial.map((v,i)=>'r'+i+' ≈ '+v).join('\n'));
        if (frame.metric==='free') append('p',t('虚线是被拒候选。其 z⁴ 系数约为 1/24，使稳定域发生变化。','The dashed contour belongs to the rejected candidate. Its fourth-degree coefficient is approximately 1/24, changing the stability region.'));
      }
      return;
    }
    $('record-title').textContent=reading==='ode' ? t('留出 ODE 对照','Held-out ODE comparison') : t('四阶误差分解','Fourth-order error terms');
    if (reading==='ode') {
      if (frame.final) odeData(); else append('p',t('等待最终留出评测。','Waiting for the final held-out comparison.'));
    } else if (frame.metric) {
      append('p','baseline-audit.json'+(candidate ? '\n'+candidate.file : '')+' · high_precision.tree_errors[4]','source-file');
      const formula=['(b·c³ − 1/4)/6','(b·Ac² − 1/12)/2','b·(c ⊙ Ac) − 1/8','b·A²c − 1/24'];
      const headers=[t('分量','Term'),t('基线','Baseline')];
      if (candidate) headers.push(frame.metric==='free' ? t('被拒候选','Rejected') : t('保存的候选','Saved candidate'));
      table(headers,formula.map((v,i)=>[v,rkCharts.number(rkArchive.baseline.terms[i]),...(candidate ? [rkCharts.number(candidate.terms[i])] : [])]));
      append('p',t('表中为保留符号的近似值。图中使用绝对值。','The table gives signed approximations. The graph shows their magnitudes.'));
      if (frame.certified) {append('p',t('隔离盒内的精确解有 τ = (0, 0, 0, −639/45752)。有限小数逼近该解。','The exact root in the box has τ = (0, 0, 0, −639/45752). The stored decimals approximate that root.')); evidence('proof');}
    } else append('p',t('等待基线误差。','Waiting for baseline errors.'));
  }
  function openRecord(key) {
    reading=key;resume=playing;setPlaying(false);
    renderRecord();dialog.showModal();dialog.scrollTop=0;
  }
  $('archive-button').onclick=()=>openRecord('archive');
  $('metric-data').onclick=()=>openRecord('metric');
  $('ode-data').onclick=()=>openRecord('ode');
  $('polynomial').onclick=()=>openRecord('polynomial');
  dialog.querySelector('.dismiss').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if (event.target===dialog) {const b=dialog.getBoundingClientRect();if (event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) dialog.close();}});
  dialog.addEventListener('close',()=>{reading=null;if(resume)setPlaying(true);});
  $('story-play').onclick=()=>{if(position>=duration)seek(0);setPlaying(!playing);};
  $('story-speed').onclick=()=>{speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];previousTick=null;$('story-speed').textContent=speed+'×';};
  $('story-prev').onclick=()=>seek(rkScenes[Math.max(0,index-1)].at);
  $('story-next').onclick=()=>seek(rkScenes[Math.min(rkScenes.length-1,index+1)].at);
  $('chapter-select').onchange=e=>seek(rkScenes[Number(e.target.value)].at);
  $('search-tree').onclick=e=>{const button=e.target.closest('button');if(button)seek(rkScenes[Number(button.dataset.index)].at);};
  $('story-seek').oninput=e=>seek(Number(e.target.value));
  $('story-seek').onpointerdown=()=>{dragging=true;cancelAnimationFrame(tickId);tickId=0;previousTick=null;};
  function releaseDrag() {if(dragging){dragging=false;previousTick=null;schedule();}}
  window.addEventListener('pointerup',releaseDrag);
  window.addEventListener('pointercancel',releaseDrag);
  $('rhs').onchange=e=>{rhs=Number(e.target.value);drawCharts();};
  document.addEventListener('replaylanguagechange',()=>{populateControls();paint(true);if(reading)renderRecord();});
  document.addEventListener('visibilitychange',()=>{previousTick=null;cancelAnimationFrame(tickId);tickId=0;schedule();});
  motion.addEventListener('change',()=>{
    if (motion.matches) {
      for (const animation of document.getAnimations()) {
        if (animation.id==='rk-checkpoint') animation.cancel();
      }
    }
    paint(true);
  });
  populateControls();paint(true);schedule();
})();
