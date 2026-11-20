// Shared view for the three archived case replays. Each case owns its clock and records.
const caseStory = (() => {
  const id = name => document.getElementById(name);
  const text = (zh,en) => replayLocale.text(zh,en);
  const set = (name,value) => {
    const element = id(name);
    if (element.textContent !== value) element.textContent = value;
  };
  const chapters = [...document.querySelectorAll('.story-chapters button')];
  const crew = id('story-crew');
  const actors = [...crew.querySelectorAll('.story-role')];
  const trace = id('story-trace'), rail = id('story-seek');
  const execution = createCaseExecution(archivedCaseTrace,seek,showRoute);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let route, endpoints = {}, wireLength = 0, lastProgress = 0;

  function seek(at) {
    rail.value = at;
    rail.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function pause() {
    if (id('story-view').dataset.playing==='true') id('story-play').click();
  }
  function inspection(open,actor) {
    if (open) pause();
    trace.hidden = !open;
    id('story-inspect').setAttribute('aria-expanded', String(open));
    id('story-inspect').setAttribute('aria-label', open ? text('收起执行详情','Hide execution details') : text('展开执行详情','Show execution details'));
    actors.forEach(button => button.setAttribute('aria-expanded',String(open && button === actor)));
    trace.querySelectorAll('[data-inspected]').forEach(node => node.removeAttribute('data-inspected'));
    execution.inspect(actor);
    if (actor) {
      const panel = id(actor.getAttribute('aria-controls'));
      panel.dataset.inspected = '';
      panel.focus({preventScroll:true});
      if (panel.getBoundingClientRect().top >= innerHeight) panel.scrollIntoView({block:'nearest'});
    }
  }
  id('story-inspect').onclick = () => inspection(trace.hidden);
  actors.forEach(actor => actor.onclick = () => {if(actor.dataset.active==='true') inspection(true,actor);});
  chapters.forEach(button => button.onclick = () => {
    pause();
    const menu = id('chapter-select');
    menu.value = button.dataset.chapter;
    menu.dispatchEvent(new Event('change',{bubbles:true}));
  });
  function keys(event) {
    if (event.target.closest('button,select,summary,a') || event.altKey || event.ctrlKey || event.metaKey) return;
    const action = {'ArrowLeft':'story-prev','ArrowRight':'story-next',' ':'story-play'}[event.key];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat || event.key !== ' ') id(action).click();
  }
  rail.addEventListener('keydown',keys);
  rail.addEventListener('input',pause,{capture:true});
  for (const [name,direction] of [['story-prev',-1],['story-next',1]]) {
    id(name).addEventListener('click',event=>{
      event.stopImmediatePropagation();
      pause();
      execution.stepBy(direction);
    },{capture:true});
  }
  trace.addEventListener('keydown',keys);

  function segment(a,b) {
    const p=endpoints[a], q=endpoints[b];
    const length=Math.hypot(q.x-p.x,q.y-p.y) || 1;
    const dx=(q.x-p.x)/length, dy=(q.y-p.y)/length;
    return [p.x+p.r*dx,p.y+p.r*dy,q.x-q.r*dx,q.y-q.r*dy];
  }
  function drawWire() {
    if (!route || !endpoints.kernel) return;
    if (route[0]===route[1]) {
      wireLength=0;
      id('story-wire-path').removeAttribute('d');
      id('story-wire-arrow').removeAttribute('d');
      id('story-packet').setAttribute('opacity','0');
      return;
    }
    const [x,y,u,v]=segment(...route);
    const bend = route.includes('kernel') ? 0 : 12;
    const mx=(x+u)/2, my=(y+v)/2-bend;
    const wire=id('story-wire-path');
    wire.setAttribute('d',`M${x} ${y} Q${mx} ${my} ${u} ${v}`);
    const angle=Math.atan2(v-my,u-mx), dx=Math.cos(angle),dy=Math.sin(angle);
    id('story-wire-arrow').setAttribute('d',`M${u-6*dx-3*dy} ${v-6*dy+3*dx} L${u} ${v} L${u-6*dx+3*dy} ${v-6*dy-3*dx}`);
    wireLength=wire.getTotalLength();
    travel(lastProgress);
  }
  function measure() {
    const rect=crew.getBoundingClientRect();
    if (!rect.width) return;
    id('story-wire').setAttribute('viewBox',`0 0 ${crew.clientWidth} ${crew.clientHeight}`);
    for (const actor of actors) {
      const r=actor.querySelector('svg').getBoundingClientRect();
      endpoints[actor.dataset.role]={x:r.x+r.width/2-rect.x,y:r.y+r.height/2-rect.y,r:r.width*(actor.dataset.role==='kernel' ? .52 : .38)};
    }
    id('story-wire-guides').setAttribute('d',['ai','db','verifier'].map(role=>{
      const [x,y,u,v]=segment('kernel',role);
      return `M${x} ${y}L${u} ${v}`;
    }).join(' '));
    drawWire();
  }
  function travel(progress) {
    lastProgress=progress;
    const t=Math.max(0,Math.min(1,progress*2));
    const packet=id('story-packet');
    if (!wireLength || reduced.matches || t<=0 || t>=1) {
      if (packet.getAttribute('opacity')!=='0') packet.setAttribute('opacity','0');
      return;
    }
    const point=id('story-wire-path').getPointAtLength(wireLength*t*t*(3-2*t));
    packet.setAttribute('cx',point.x);
    packet.setAttribute('cy',point.y);
    packet.setAttribute('opacity',Math.min(1,t*8,(1-t)*8));
  }
  new ResizeObserver(measure).observe(crew);

  function score(frame) {
    const {points, limits, unit, note, startUtc, endUtc, utc}=frame.score;
    const toSeconds=s=>{
      const [h,m,sec=0]=s.split(':').map(Number);
      return h*3600+m*60+sec;
    };
    const first=toSeconds(startUtc), duration=toSeconds(endUtc)-first;
    const x=time=>14+260*Math.max(0,Math.min(1,(toSeconds(time)-first)/duration));
    const y=value=>69-52*(value-limits[0])/(limits[1]-limits[0]);
    const latest=points.at(-1);
    set('story-score-title',unit);
    set('story-count',latest?.label ?? '—');
    set('story-result',note);
    set('story-base-time',startUtc.slice(0,5));
    set('story-gain-time',utc.slice(0,5)===startUtc.slice(0,5)?'':utc.slice(0,5));
    set('story-chart-label',unit+' · '+note);
    const keypoints=[];
    if(points.length) {
      const baseline=y(points[0].value);
      id('story-view').querySelector('.story-base').setAttribute('d',`M14 ${baseline}H274`);
    }
    for (const [i,p] of points.entries()) {
      const last=points[i-1];
      if (last) keypoints.push([x(p.utc),y(last.value)]);
      keypoints.push([x(p.utc),y(p.value)]);
    }
    if(latest) keypoints.push([x(utc),y(latest.value)]);
    id('story-series').setAttribute('d',keypoints.map(([a,b],i)=>(i?'L':'M')+a+' '+b).join(' '));
    const place=(node,a,b)=>{node.style.left=a/288*100+'%';node.style.top=b/85*100+'%'};
    const marker=id('story-marker');
    marker.hidden=!latest;
    if(latest) place(marker,x(utc),y(latest.value));
    const group=id('story-checkpoints');
    const signature=points.map(p=>p.at+' '+p.label+' '+p.utc).join('/')+unit;
    if(group.dataset.points!==signature){
      group.dataset.points=signature;
      group.replaceChildren(...points.map(p=>{
        const btn=document.createElement('button');
        btn.className='story-checkpoint';btn.type='button';
        btn.title=p.utc+' UTC · '+unit+' '+p.label;
        btn.setAttribute('aria-label',btn.title);
        place(btn,x(p.utc),y(p.value));
        btn.onclick=()=>seek(p.at);
        return btn;
      }));
    }
  }

  function showRoute(from,to) {
    route=[from,to];
    crew.dataset.sender=route[0];
    for(const actor of actors){
      const name=actor.dataset.role;
      actor.dataset.active=String(route.includes(name));
      actor.setAttribute('aria-disabled',String(!route.includes(name)));
      actor.querySelector('small').textContent=name===from && from===to?text('执行','Running'):name===route[0]?text('发出','Sending'):name===route[1]?text('接收','Receiving'):'';
    }
    drawWire();
  }

  function show(frame) {
    const {description,chapter,phase,focus}=frame;
    set('story-description',description);
    id('story-stage').dataset.phase=phase;
    const current=chapters.findLast(button=>Number(button.dataset.chapter)<=chapter);
    chapters.forEach(button=>button.setAttribute('aria-current',button===current?'step':'false'));
    [...id('story-dna-lab').children].forEach((card,i)=>card.dataset.focus=String(focus.includes(i)));
    set('story-handoff',description);
    score(frame);
    execution.attach(frame);
    id('story-timecode').title=frame.score.utc+' UTC';
    id('story-inspect').setAttribute('aria-label',trace.hidden?text('展开执行详情','Show execution details'):text('收起执行详情','Hide execution details'));

  }
  function advance(progress) {
    execution.tick(progress);
    travel(progress);
    const at=Number(rail.value);
    id('story-prev').disabled=at===0 && progress===0;
    id('story-next').disabled=at>=Number(rail.max) && progress>=1;
  }
  return {show,travel:advance};
})();
