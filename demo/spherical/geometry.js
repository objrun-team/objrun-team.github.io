function prepareCanvas(canvas, ctx) {
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(width * ratio), h = Math.round(height * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return {width, height};
}

function sphereGraticule() {
  const rings = [];
  const radians = degrees => degrees * Math.PI / 180;
  function ring(sample, equator = false) {
    rings.push({points:Array.from({length:89}, (_, i) => sample(i / 88)), equator});
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const angle = radians(lat), radius = Math.cos(angle), z = Math.sin(angle);
    ring(t => [radius * Math.cos(t * 2 * Math.PI), radius * Math.sin(t * 2 * Math.PI), z], lat === 0);
  }
  for (let lon = 0; lon < 360; lon += 20) {
    const x = Math.cos(radians(lon)), y = Math.sin(radians(lon));
    ring(t => {
      const angle = (t - .5) * Math.PI;
      return [Math.cos(angle) * x, Math.cos(angle) * y, Math.sin(angle)];
    });
  }
  return rings;
}

/* Orthographic view of the first three components. The Gram view uses all six. */
class ConfigurationView {
  constructor(canvas, mode = 'sphere') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = mode;
    this.selected = null;
    this.yawVelocity = 0;
    this.pitchVelocity = 0;
    this.reset();
    if (mode === 'sphere') {
      this.grid = sphereGraticule();
      this.motion = new FigureMotion(canvas,
        (dt, idleSeconds) => this.advance(dt, idleSeconds),
        () => {
          this.yawVelocity = this.pitchVelocity = 0;
          if (this.returnPose) this.reset();
        });
    }
    new ResizeObserver(() => this.draw()).observe(canvas);
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      if (this.mode === 'gram') {
        this.inspectCell(event);
        return;
      }
      this.returnPose = this.pointer = null;
      this.selected = null;
      this.yawVelocity = this.pitchVelocity = 0;
      this.drag = {id:event.pointerId, x:event.clientX, y:event.clientY, time:event.timeStamp};
      canvas.setPointerCapture(event.pointerId);
      this.draw();
    });
    canvas.addEventListener('pointermove', event => {
      if (!event.isPrimary) return;
      if (this.drag) {
        if (event.pointerId !== this.drag.id) return;
        const dx = (event.clientX - this.drag.x) * .009, lastPitch = this.pitch;
        this.yaw += dx;
        this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + (event.clientY - this.drag.y) * .009));
        const dt = Math.max(.004, (event.timeStamp - this.drag.time) / 1000);
        const weight = -Math.expm1(-dt / .045);
        const velocity = delta => Math.max(-3, Math.min(3, delta / dt));
        this.yawVelocity += (velocity(dx) - this.yawVelocity) * weight;
        this.pitchVelocity += (velocity(this.pitch - lastPitch) - this.pitchVelocity) * weight;
        Object.assign(this.drag, {x:event.clientX, y:event.clientY, time:event.timeStamp});
      } else {
        const box = canvas.getBoundingClientRect();
        const x = event.clientX - box.left, y = event.clientY - box.top;
        if (this.mode === 'sphere') {
          this.pointer = {x,y};
          if (this.hitPoint() === this.selected) return;
        } else {
          this.inspectCell(event);
          return;
        }
      }
      this.draw();
    });
    const release = event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      // A deliberate hold before release absorbs the last flick.
      const coast = this.motion?.enabled && event.type === 'pointerup'
        ? Math.exp(-Math.max(0, event.timeStamp - this.drag.time) / 85) : 0;
      this.yawVelocity *= coast;
      this.pitchVelocity *= coast;
      this.drag = null;
      this.motion?.wake();
    };
    for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type, release);
    canvas.addEventListener('pointerleave', () => {
      this.pointer = null;
      if (this.selected !== null) { this.selected = null; this.draw(); }
    });
    canvas.addEventListener('keydown', event => {
      const horizontal = Number(event.key === 'ArrowRight') - Number(event.key === 'ArrowLeft');
      const vertical = Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
      if (!horizontal && !vertical) return;
      event.preventDefault();
      if (this.mode === 'sphere') {
        this.returnPose = null;
        this.yawVelocity = this.pitchVelocity = 0;
        this.yaw += horizontal * .13;
        this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + vertical * .13));
      } else {
        this.cell = [(this.cell[0] + 24 + vertical) % 24, (this.cell[1] + 24 + horizontal) % 24];
      }
      this.draw();
    });
  }

  inspectCell(event) {
    if (!this.matrix) return;
    const box = this.canvas.getBoundingClientRect();
    const {x, y, cell} = this.matrix;
    const col = Math.floor((event.clientX - box.left - x) / cell);
    const row = Math.floor((event.clientY - box.top - y) / cell);
    if (Math.min(row, col) < 0 || Math.max(row, col) >= 24) return;
    if (row === this.cell[0] && col === this.cell[1]) return;
    this.cell = [row, col];
    this.draw();
  }

  hitPoint() {
    if (!this.pointer) return null;
    return this.points?.findLast(p => Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y) < 10)?.index ?? null;
  }

  advance(dt, idleSeconds) {
    if (this.drag) return false;
    if (this.returnPose) {
      const pose = this.returnPose;
      pose.elapsed += dt;
      const t = Math.min(1, pose.elapsed * 1000 / transitionMs);
      const ease = t * t * (3 - 2*t);
      this.yaw = pose.yaw + pose.turn * ease;
      this.pitch = pose.pitch + (-.35 - pose.pitch) * ease;
      if (t === 1) this.returnPose = null;
    } else {
      const decay = Math.exp(-dt / .26);
      const coast = .26 * (1 - decay);
      this.yaw += idleSeconds * (2 * Math.PI / 72) + this.yawVelocity * coast;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + this.pitchVelocity * coast));
      this.yawVelocity *= decay;
      this.pitchVelocity *= decay;
      if (Math.abs(this.yawVelocity) < .001) this.yawVelocity = 0;
      if (Math.abs(this.pitchVelocity) < .001 || Math.abs(this.pitch) === 1.5) this.pitchVelocity = 0;
    }
    this.draw();
    return Boolean(this.returnPose || this.yawVelocity || this.pitchVelocity);
  }

  reset(animate = false) {
    this.yawVelocity = this.pitchVelocity = 0;
    this.cell = [0, 1];
    if (animate && this.motion?.enabled) {
      const turn = Math.atan2(Math.sin(.64-this.yaw), Math.cos(.64-this.yaw));
      this.returnPose = {yaw:this.yaw, pitch:this.pitch, turn, elapsed:0};
      this.motion.wake();
    } else {
      this.returnPose = null;
      this.yaw = .64;
      this.pitch = -.35;
      this.draw();
    }
  }
  setData(vectors) {
    this.vectors = vectors;
    this.motion?.setReady(true);
    this.gram = vectors.map(a => vectors.map(b => a.reduce((sum, v, i) => sum + v * b[i], 0)));
    this.draw();
  }
  setMode(mode) {
    this.mode = mode;
    this.canvas.classList.toggle('matrix', mode === 'gram');
    const descriptions = {gram: '24 × 24 个六维内积。方向键可选择单元格。', sphere: '24 个六维单位向量的前三维投影。拖动或用方向键旋转。'};
    this.canvas.setAttribute('aria-label', tr(descriptions[mode]));
    this.draw();
  }
  draw() {
    if (!this.vectors) return;
    const size = prepareCanvas(this.canvas, this.ctx);
    if (!size) return;
    const {width, height} = size;
    if (this.mode === 'gram') this.drawGram(width, height);
    else this.drawSphere(width, height);
  }
  drawSphere(w, h) {
    const ctx = this.ctx, cx = w * .49, cy = h * .525;
    const radius = Math.min(w * .36, h * .415);
    const cos = Math.cos, sin = Math.sin, tau = 2 * Math.PI;
    const a = cos(this.yaw), b = sin(this.yaw), c = cos(this.pitch), d = sin(this.pitch);
    function project(x, y, z) {
      const depth = -b * x + a * y;
      return { x: cx + radius * (a * x + b * y), y: cy - radius * (c * z + d * depth), z: c * depth - d * z };
    }
    function line(x1, y1, x2, y2, color, weight = 1) {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
    }
    function disc(x, y, r, fill) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, tau); ctx.fillStyle = fill; ctx.fill();
    }
    const volume = ctx.createRadialGradient(cx-radius*.28,cy-radius*.38,0,cx,cy,radius);
    volume.addColorStop(0,'#252831'); volume.addColorStop(.76,'#15161b'); volume.addColorStop(1,'#20232c');
    disc(cx,cy,radius,volume);

    // Batch segments by depth so rotating the mesh needs only a few strokes per frame.
    const lineGroups = [[], []];
    for (const ring of this.grid) {
      const paths = lineGroups[Number(ring.equator)];
      let last = project(...ring.points[0]);
      for (let i = 1; i < ring.points.length; i++) {
        const next = project(...ring.points[i]), depth = (next.z + last.z) / 2;
        const shade = depth > 0 ? 1 + Math.round(depth * 6) : 0;
        const path = paths[shade] ||= new Path2D();
        path.moveTo(last.x,last.y);
        path.lineTo(next.x,next.y);
        last = next;
      }
    }
    lineGroups.forEach((paths, equator) => paths.forEach((path, shade) => {
      const opacity = shade ? .2 + .03*(shade-1) : .045;
      ctx.strokeStyle = 'rgba(161,177,225,' + opacity*(equator ? 1.6 : 1) + ')';
      ctx.lineWidth = equator ? 1.05 : .68;
      ctx.stroke(path);
    }));
    ctx.beginPath(); ctx.arc(cx,cy,radius,0,tau); ctx.strokeStyle='#9299ad'; ctx.lineWidth=.85; ctx.stroke();
    ctx.font='italic 12px Georgia, serif'; ctx.fillStyle='#aab1c0';
    for (const [i,label] of ['x₁','x₂','x₃'].entries()) {
      const unit=[0,0,0]; unit[i]=1.18;
      const pos=project(...unit), neg=project(...unit.map(v=>-v));
      ctx.setLineDash([3,5]); line(neg.x,neg.y,pos.x,pos.y,'#aebaff45',.8); ctx.setLineDash([]);
      ctx.fillText(label,pos.x+3,pos.y);
    }
    const points=this.vectors.map((v,index)=>({...project(...v),index})).sort((p,q)=>p.z-q.z);
    this.points=points;
    const pair = points.filter(point => this.highlightedPair?.includes(point.index));
    if (pair.length === 2) line(pair[0].x, pair[0].y, pair[1].x, pair[1].y, '#c8b4fea0');
    for (const p of points) {
      const depth=(p.z+1)*.5;
      const highlighted = pair.includes(p);
      if (highlighted) disc(p.x, p.y, 7, '#c8b4fe36');
      disc(p.x, p.y, 2.6 + depth * 1.8, highlighted ? '#d5c6ff' : 'rgba(223,230,254,' + (.56 + depth * .44) + ')');
    }
    this.selected = this.hitPoint();
    const p=points.find(v=>v.index===this.selected);
    if (!p) return;
    const sign=p.x>cx?1:-1, x=p.x+sign*19, y=p.y-18;
    ctx.beginPath(); ctx.arc(p.x,p.y,7.5,0,tau); ctx.strokeStyle='#f0f2ff'; ctx.lineWidth=.9; ctx.stroke();
    line(p.x+sign*5,p.y-5,x,y,'#c3ccffb0'); line(x,y,x+sign*17,y,'#c3ccffb0');
    ctx.font='12px Consolas, monospace'; ctx.textAlign=sign>0?'left':'right'; ctx.fillStyle='#f4f5ff';
    ctx.fillText('v'+String(p.index+1).padStart(2,'0'),x+sign*21,y+4); ctx.textAlign='left';
  }
  drawGram(w,h) {
    const ctx=this.ctx, size=Math.min(w-53,h-38), cell=size/24;
    const x=(w-size)/2, y=(h-size)/2+5;
    this.matrix={x,y,cell};
    this.gram.forEach((row,i)=>row.forEach((value,j)=>{
      const t=Math.min(1,Math.abs(value));
      const base=[46,48,68], tip=value>=0?[200,180,254]:[106,192,216];
      ctx.fillStyle='rgb('+base.map((v,k)=>Math.round(v+(tip[k]-v)*t)).join(',')+')';
      ctx.fillRect(x+j*cell,y+i*cell,cell-.45,cell-.45);
    }));
    ctx.font='10px Consolas, monospace'; ctx.fillStyle='#c5c5d8'; ctx.textAlign='center';
    for(const i of [0,5,11,17,23]) {
      ctx.fillText(String(i+1),x+(i+.5)*cell,y-6);
      ctx.fillText(String(i+1),x-13,y+(i+.7)*cell);
    }
    const [i,j]=this.cell;
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.strokeRect(x+j*cell,y+i*cell,cell,cell);
    ctx.textAlign='left';
    this.onCell?.(i, j, this.gram[i][j]);
  }
}

class EnergyTrace {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = 0;
    this.windowStart = 0;
    this.highlight = 0;
    this.zoomFrame = 0;
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  setData(values, step, overview = false, animate = false) {
    if (this.values === values && this.step === step && this.overview === overview) return false;
    const sameRun = this.values === values, oldLevel = this.level;
    this.values = values;
    this.step = step;
    this.overview = overview;
    const last = values ? values.length - 1 : 0;
    const fraction = last > 15 ? step / last : 0;
    this.autoLevel = fraction === 1 ? 2 : fraction >= .60 ? 1 : 0;
    this.level = overview ? 0 : this.autoLevel;
    this.start = this.level ? Math.floor(last * .42) : 0;
    this.end = last;
    if (this.level === 2) {
      // Only use the terminal value after its sample has appeared in the replay.
      const tolerance = Math.max(Math.abs(values[last]) * .001, 1e-12);
      let start = last;
      while (start > 0 && Math.abs(values[start - 1] - values[last]) <= tolerance) start--;
      this.start = Math.min(start, last - 8);
    }
    if (values && !sameRun) {
      this.logLow = Math.floor(Math.log10(Math.min(...values)));
      this.logHigh = Math.max(this.logLow + 1, Math.ceil(Math.log10(Math.max(...values))));
    }
    if (sameRun && animate && oldLevel !== this.level) {
      // Capture the visible frame so a second toggle can reverse a zoom in flight.
      const image = document.createElement('canvas');
      image.width = this.canvas.width;
      image.height = this.canvas.height;
      image.getContext('2d').drawImage(this.canvas, 0, 0);
      this.zoom = {image, start:this.windowStart, highlight:this.highlight, began:performance.now()};
    } else if (!sameRun || !animate) {
      this.zoom = null;
    }
    this.draw();
    return true;
  }

  finishTransition() {
    if (!this.zoom) return;
    this.zoom = null;
    this.draw();
  }

  axis() {
    if (!this.level) {
      const low = this.values ? this.logLow : 0, high = this.values ? this.logHigh : 2;
      const ticks = Array.from({length:high-low+1}, (_,i) => [low+i, String(10 ** (low+i))]);
      return {low, high, ticks, transform:Math.log10};
    }
    if (this.level === 2) return this.finalAxis();
    // Fit the linear axis to recorded samples reached so far. The minimum
    // span prevents floating-point noise at convergence from filling the plot.
    const window = this.values.slice(this.start, this.step + 1);
    const min = Math.min(...window), max = Math.max(...window);
    const span = Math.max(max - min, Math.max(1, Math.abs(max)) * 1e-12);
    const rough = span / 3, scale = 10 ** Math.floor(Math.log10(rough));
    const interval = [1,2,5,10].find(n => n * scale >= rough) * scale;
    const first = Math.floor((min - .025 * span) / interval);
    const last = Math.max(first + 2, Math.ceil((max + .025 * span) / interval));
    const digits = Math.max(0, -Math.floor(Math.log10(interval) + 1e-9));
    const ticks = [];
    for (let i=first; i<=last; i++) ticks.push([i*interval, (i*interval).toFixed(digits)]);
    return {low:first*interval, high:last*interval, ticks, transform:value=>value};
  }

  finalAxis() {
    const terminal = this.values[this.end];
    const delta = this.values.slice(this.start).map(v => v-terminal);
    const linearWidth = 1e-12;
    const symlog = d => Math.sign(d) * Math.log1p(Math.abs(d)/linearWidth) / Math.LN10;
    const ticks = [[0,'0']];
    const min = Math.min(...delta), max = Math.max(...delta);
    for (const [sign, extent] of [[1,max],[-1,-min]]) {
      if (extent <= linearWidth) continue;
      for (let power=Math.ceil(Math.log10(extent)); power>=-11; power-=3) {
        ticks.push([symlog(sign * 10 ** power), (sign>0?'+':'−')+'1e'+power]);
      }
    }
    const low = Math.min(symlog(min), ...ticks.map(t=>t[0]));
    const high = Math.max(symlog(max), ...ticks.map(t=>t[0]), .25);
    const padding = .06 * Math.max(1,high-low);
    return {low:low-padding, high:high+padding, ticks, transform:v=>symlog(v-terminal)};
  }

  draw() {
    const ctx = this.ctx;
    const size = prepareCanvas(this.canvas, ctx);
    if (!size) return;
    const {width, height} = size, values = this.values;
    const zoom = this.zoom;
    let blend = 1;
    if (zoom && zoom.image.width === this.canvas.width && zoom.image.height === this.canvas.height) {
      const t = Math.min(1, (performance.now() - zoom.began) / transitionMs);
      blend = t * t * (3 - 2 * t);
    }
    if (blend === 1) {
      this.zoom = null;
      cancelAnimationFrame(this.zoomFrame);
      this.zoomFrame = 0;
    } else if (!this.zoomFrame) {
      this.zoomFrame = requestAnimationFrame(() => {
        this.zoomFrame = 0;
        this.draw();
      });
    }
    const axis = this.axis();
    ctx.font = '11px Consolas, monospace';
    const left = Math.max(31, ...axis.ticks.map(tick => ctx.measureText(tick[1]).width + 13));
    const right = width - 18, top = 13, bottom = height - 43;
    const x = i => left + (i - this.start) / Math.max(1, this.end - this.start) * (right-left);
    const y = v => bottom - (v-axis.low) / (axis.high-axis.low) * (bottom-top);
    ctx.globalAlpha = blend;
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    for (const [value, label] of axis.ticks) {
      const py = y(value);
      ctx.strokeStyle = '#ffffff14';
      ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke();
      if (values) {ctx.fillStyle = '#979da8'; ctx.fillText(label, left-7, py+3);}
    }
    if (!values) return;
    ctx.fillStyle = '#979da8';
    for (const i of [this.start, Math.round((this.start+this.end)/2), this.end]) {
      ctx.textAlign = i===this.start ? 'left' : i===this.end ? 'right' : 'center';
      ctx.fillText(String(i+1), x(i), bottom+15);
    }
    ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#9aa6ff';
    ctx.beginPath();
    ctx.moveTo(left, y(axis.transform(values[this.start])));
    for (let i=this.start+1; i<=this.step; i++) ctx.lineTo(x(i), y(axis.transform(values[i])));
    ctx.stroke();
    ctx.fillStyle = '#eff1ff';
    ctx.beginPath(); ctx.arc(x(this.step), y(axis.transform(values[this.step])), 3, 0, 2*Math.PI); ctx.fill();

    // Keep each curve with its axis when switching between energy and terminal residuals.
    if (this.zoom) {
      const cutoff = height - 22;
      const sourceHeight = cutoff * zoom.image.height / height;
      ctx.globalAlpha = 1 - blend;
      ctx.drawImage(zoom.image, 0, 0, zoom.image.width, sourceHeight, 0, 0, width, cutoff);
    }
    ctx.globalAlpha = 1;
    const bandY = height-19, bandHeight = 14;
    const bandLeft = 31;
    const fullX = i => bandLeft + i / Math.max(1,values.length-1) * (right-bandLeft);
    const highlight = Number(this.level > 0);
    this.windowStart = this.zoom ? zoom.start + (this.start - zoom.start) * blend : this.start;
    this.highlight = this.zoom ? zoom.highlight + (highlight - zoom.highlight) * blend : highlight;
    ctx.fillStyle = '#ffffff07'; ctx.fillRect(bandLeft, bandY, right-bandLeft, bandHeight);
    if (this.highlight > 0) {
      ctx.globalAlpha = this.highlight;
      ctx.fillStyle = '#7c8cff29'; ctx.fillRect(fullX(this.windowStart),bandY,right-fullX(this.windowStart),bandHeight);
      ctx.strokeStyle = '#9aa6ff99'; ctx.lineWidth = 1;
      for (const i of [this.windowStart,this.end]) {
        ctx.beginPath(); ctx.moveTo(fullX(i),bandY); ctx.lineTo(fullX(i),bandY+bandHeight); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#88909f'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0; i<=this.step; i++) {
      const heightFraction = (Math.log10(values[i])-this.logLow)/(this.logHigh-this.logLow);
      const py = bandY+bandHeight-2-heightFraction*(bandHeight-4);
      if (i===0) ctx.moveTo(fullX(i),py); else ctx.lineTo(fullX(i),py);
    }
    ctx.stroke();
  }
}

