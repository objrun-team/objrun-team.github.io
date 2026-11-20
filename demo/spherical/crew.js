// Four small instruments drawn in the same light, each with its own silhouette.
function buildCrew() {
  const shells = {
    ai: ['#eee5ff','#c4a8ed','#8669b5'],
    run: ['#fff0c9','#e8b971','#aa784b'],
    db: ['#dff3fb','#91bfd6','#6086a0'],
    result: ['#e2f3dd','#a6c9a5','#718e7d']
  };
  const paint = Object.entries(shells).map(([id, [light, mid, dark]]) =>
    `<linearGradient id="shell-${id}" x1="0" x2=".55" y1="0" y2="1"><stop stop-color="${light}"/><stop offset=".54" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`).join('');
  document.querySelector('.symbols').insertAdjacentHTML('beforeend', `<defs>${paint}</defs>
    <symbol id="mote-ai" viewBox="0 0 64 64">
      <path d="M9 38C8 24 19 11 35 10c10 0 19 6 22 15 5 14-2 25-17 28-4 1-9 1-14 0l-10 4 1-8c-4-2-7-6-8-11Z" fill="url(#shell-ai)"/>
      <path d="M14 29c3-9 11-15 22-16" fill="none" stroke="#fbf4ff" stroke-opacity=".72" stroke-width="2.2" stroke-linecap="round"/>
      <g fill="#382d46"><ellipse cx="26" cy="33" rx="2.7" ry="3.7"/><ellipse cx="40" cy="31.5" rx="2.7" ry="3.7"/></g>
      <path d="M31 38q3 2 6-1" fill="none" stroke="#534158" stroke-width="1.6" stroke-linecap="round"/>
    </symbol>
    <symbol id="mote-run" viewBox="0 0 64 64">
      <rect x="5" y="28" width="7" height="14" rx="3" fill="#a8845d"/><rect x="52" y="26" width="7" height="15" rx="3" fill="#bc956d"/>
      <path d="M10 26q0-13 14-14l15-1q14 0 16 13l1 15q0 12-12 14l-19 1Q11 54 10 42Z" fill="url(#shell-run)"/>
      <path d="M17 20q3-4 9-4l13-1" fill="none" stroke="#fff4d7" stroke-width="2" stroke-linecap="round"/>
      <rect x="16" y="25" width="34" height="17" rx="8" fill="#4a3c31"/>
      <g fill="#ffdc9d"><rect x="23" y="30" width="4" height="6" rx="1.7"/><rect x="37" y="30" width="4" height="6" rx="1.7"/></g>
      <path d="M29 47h8" stroke="#986a43" stroke-width="2" stroke-linecap="round"/>
    </symbol>
    <symbol id="mote-db" viewBox="0 0 64 64">
      <path d="M10 32h44v13c0 6-10 10-22 10s-22-4-22-10Z" fill="url(#shell-db)"/>
      <path d="M9 24h46v12c0 6-10 10-23 10S9 42 9 36Z" fill="#83aabe" stroke="#577d94" stroke-width="1.1"/>
      <path d="M9 19c0-6 10-10 23-10s23 4 23 10v10c0 6-10 11-23 11S9 35 9 29Z" fill="url(#shell-db)"/>
      <ellipse cx="32" cy="19" rx="22" ry="8" fill="#c0dce8"/>
      <path d="M14 17c4-4 11-6 18-6" fill="none" stroke="#f3fbfc" stroke-width="1.8" stroke-linecap="round"/>
      <g fill="#2f4857"><rect x="23" y="28" width="4" height="6" rx="2"/><rect x="37" y="28" width="4" height="6" rx="2"/></g>
    </symbol>
    <symbol id="mote-result" viewBox="0 0 64 64">
      <path d="M7 27c1-9 7-15 16-15 5 0 7 2 10 2 4 0 7-2 11-1 8 1 13 7 14 16l-1 8c-1 10-8 16-17 17l-14-1C14 52 6 44 6 34Z" fill="url(#shell-result)"/>
      <path d="M12 23c2-5 6-8 12-8" fill="none" stroke="#f3fae9" stroke-width="2" stroke-linecap="round"/>
      <path d="M30 30q2-2 5 0" fill="none" stroke="#50695a" stroke-width="3"/>
      <g fill="#e3efda" stroke="#566e60" stroke-width="2">
        <circle cx="21" cy="31" r="9.5"/><circle cx="44" cy="31" r="9.5"/>
      </g>
      <g fill="#30493e"><ellipse cx="22" cy="31" rx="4.4" ry="5.5"/><ellipse cx="45" cy="31" rx="4.4" ry="5.5"/></g>
      <g fill="#f7fff0"><circle cx="23.6" cy="29" r="1.55"/><circle cx="46.6" cy="29" r="1.55"/></g>
      <path d="M29 44q3 2 6 0" fill="none" stroke="#58715f" stroke-width="1.6" stroke-linecap="round"/>
    </symbol>`);
}
buildCrew();

// Cables follow the actual stations, including after a wrap or viewport resize.
class CollaborationMap {
  // Run each exchange on a faster clock, then hold its final state until the next cue.
  static transferSpeed = 2;

  constructor(svg, roles, inspect) {
    this.svg = svg;
    this.roles = roles;
    this.nodes = {};
    this.links = {};
    this.bodies = {};
    const observer = new ResizeObserver(() => this.resize());
    for (const [id, role] of Object.entries(roles)) {
      const station = document.getElementById('station-' + id);
      const port = station.querySelector('.node-port');
      station.style.setProperty('--role-color', role.color);
      port.addEventListener('click', () => inspect(id));
      this.nodes[id] = port;
      this.bodies[id] = port.querySelector('.node-body');
      observer.observe(station);
      if (id !== 'run') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.querySelector('#routes').append(path);
        this.links[id] = path;
      }
    }
    this.active = svg.querySelector('#active-route');
    this.tail = svg.querySelector('#signal-tail');
    this.tip = svg.querySelector('#signal-tip');
    this.ring = svg.querySelector('#arrival-ring');
    this.direction = document.getElementById('exchange-direction');
    this.trailFilter = svg.querySelector('#trail-blur');
    this.description = svg.querySelector('#map-description');
    this.signal = svg.querySelector('#signal');
    this.progress = 0;
    this.resize();
    observer.observe(svg);
  }

  resize() {
    const width = this.svg.clientWidth, height = this.svg.clientHeight;
    if (!width || !height) return;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const origin = this.svg.getBoundingClientRect();
    this.points = {};
    for (const [id, port] of Object.entries(this.nodes)) {
      const box = port.getBoundingClientRect();
      this.points[id] = [box.x + box.width / 2 - origin.x, box.y + box.height / 2 - origin.y];
    }
    const [hubX, hubY] = this.points.run;
    const [aiX, aiY] = this.points.ai;
    const [dbX, dbY] = this.points.db;
    const [verifierX, verifierY] = this.points.result;
    const rim = this.nodes.run.offsetWidth * .43;
    this.links.ai.setAttribute('d', `M ${hubX - rim} ${hubY} L ${aiX + rim} ${aiY}`);
    this.links.result.setAttribute('d', `M ${hubX} ${hubY + rim} L ${verifierX} ${verifierY - rim}`);

    // The database leaves the southwest port, descends its own track and turns west.
    const diagonal = rim * Math.SQRT1_2;
    const exitX = hubX - diagonal, exitY = hubY + diagonal;
    const trackX = (hubX + dbX) / 2, endX = dbX + rim;
    const bendY = exitY + exitX - trackX;
    const trim = Math.min(12, (trackX - endX) / 2, (exitX - trackX) / 2, (dbY - bendY) / 2);
    const inset = trim * Math.SQRT1_2;
    this.links.db.setAttribute('d', [
      `M ${exitX} ${exitY} L ${trackX + inset} ${bendY - inset}`,
      `Q ${trackX} ${bendY} ${trackX} ${bendY + trim} V ${dbY - trim}`,
      `Q ${trackX} ${dbY} ${trackX - trim} ${dbY} H ${endX}`
    ].join(' '));
    if (this.event) {
      this.setEvent(this.event);
      this.draw(this.progress, this.arrival, this.reduceMotion);
    }
  }

  setEvent(event) {
    this.event = event;
    this.sender = null;
    this.branch = event.from === 'run' ? event.to : event.from;
    const path = this.links[this.branch];
    this.active.setAttribute('d', path.getAttribute('d'));
    this.tail.setAttribute('d', path.getAttribute('d'));
    this.tail.setAttribute('pathLength', '1');
    this.length = path.getTotalLength();
    // A horizontal or vertical route has a zero-area object bounding box.
    const box = path.getBBox(), pad = 6;
    this.trailFilter.setAttribute('x', box.x - pad);
    this.trailFilter.setAttribute('y', box.y - pad);
    this.trailFilter.setAttribute('width', box.width + 2 * pad);
    this.trailFilter.setAttribute('height', box.height + 2 * pad);
    for (const [id, node] of Object.entries(this.nodes)) {
      this.bodies[id].removeAttribute('transform');
      node.closest('.station').classList.toggle('participating', id === event.from || id === event.to);
    }
  }

  draw(progress, arrival, reduceMotion) {
    if (!this.event || !this.points) return;
    this.progress = progress;
    this.arrival = arrival;
    this.reduceMotion = reduceMotion;
    const exchangeProgress = Math.min(1, progress * CollaborationMap.transferSpeed);
    const reply = exchangeProgress >= arrival;
    const {from, to, fault} = this.event;
    const sender = reply ? to : from, receiver = reply ? from : to;
    const duration = reply ? 1 - arrival : arrival;
    const local = (exchangeProgress - (reply ? arrival : 0)) / duration;
    const t = Math.max(0, Math.min(1, (local - .035) / .94));
    // Arc-length travel keeps the same easing across straight runs and rounded joins.
    const travel = reduceMotion ? Number(t >= .5) : t ** 3 * (10 + t * (6 * t - 15));
    const forward = sender === 'run';
    const along = forward ? travel : 1 - travel;
    if (sender !== this.sender) {
      this.sender = sender;
      this.signal.style.color = fault ? '#e9ab98' : this.roles[sender].color;
      this.active.setAttribute('marker-start', forward ? 'none' : 'url(#route-arrow)');
      this.active.setAttribute('marker-end', forward ? 'url(#route-arrow)' : 'none');
      let label = this.event.packet;
      if (this.branch === 'ai' && from === 'ai') label = reply ? '执行回执' : '提交脚本';
      if (this.branch === 'ai' && from === 'run' && reply) label = fault ? '定位错误' : '确认收到';
      if (this.branch === 'db') label = forward ? (reply ? '内核确认' : '任务请求') : '数据库记录';
      if (this.branch === 'result') label = reply ? '验证结果' : (this.event.code !== undefined ? '提交证书' : '提交坐标');
      const direction = tr(this.roles[sender].name) + ' → ' + tr(this.roles[receiver].name);
      updateText(this.direction, direction);
      this.description.textContent = tr('{0}，{1}。本次交接：{2}',direction,tr(label),tr(this.event.packet));
    }
    const point = this.active.getPointAtLength(along * this.length);
    const velocity = 16 * t * t * (1 - t) * (1 - t);
    const trail = reduceMotion ? 0 : Math.min(Math.min(.16, 16 / this.length) * velocity, travel);
    this.tail.setAttribute('stroke-dasharray', `${trail} 2`);
    this.tail.setAttribute('stroke-dashoffset', -Math.max(0, forward ? along - trail : along));
    this.tail.setAttribute('opacity', trail ? '.58' : '0');
    this.tip.setAttribute('cx', point.x);
    this.tip.setAttribute('cy', point.y);
    const settle = Math.max(0, Math.min(1, (local - .86) / .14));
    const [x, y] = this.points[receiver];
    const [sx, sy] = this.points[sender];
    const distance = Math.hypot(x - sx, y - sy) || 1;
    const lean = reduceMotion ? 0 : 1.6 * Math.sin(Math.PI * travel);
    const receive = reduceMotion ? 0 : .035 * Math.sin(Math.PI * settle);
    this.bodies[sender].setAttribute('transform', `translate(${(x - sx) * lean / distance} ${(y - sy) * lean / distance})`);
    this.bodies[receiver].setAttribute('transform', `translate(32 32) scale(${1 + receive}) translate(-32 -32)`);
    this.ring.setAttribute('cx', x);
    this.ring.setAttribute('cy', y);
    this.ring.setAttribute('r', this.nodes[receiver].offsetWidth * (.38 + .12 * settle));
    this.ring.setAttribute('opacity', reduceMotion ? 0 : .65 * Math.sin(Math.PI * settle));
  }
}
