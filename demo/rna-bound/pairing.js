// Abstract motif topology of frozen target #52. Spacing and rung lengths are schematic.
function drawPairing(svg) {
  const ns = 'http://www.w3.org/2000/svg';
  function shape(parent, tag, attrs) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  const scaffold = shape(svg, 'g', {class:'pairing-model'});
  const groups = Array.from({length: 4}, (_, i) => shape(scaffold, 'g', {'data-motif': i}));
  const core = groups[0];
  const a = [128, 132], b = [217, 107];
  const radians = degrees => degrees * Math.PI / 180;
  const direction = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
  function point(center, angle, radius, offset = 0) {
    return [center[0] + radius * Math.cos(angle) - offset * Math.sin(angle),
      center[1] + radius * Math.sin(angle) + offset * Math.cos(angle)];
  }
  const line = (g, p, q, klass) => shape(g, 'line', {x1:p[0], y1:p[1], x2:q[0], y2:q[1], class:klass});
  function arcLoop(g, center, radius, arms, beads) {
    const angles = arms.map(v => (v + 2 * Math.PI) % (2 * Math.PI)).sort((x,y) => x-y);
    const gap = Math.asin(5 / radius);
    for (let i = 0; i < angles.length; i++) {
      const start = angles[i] + gap;
      const end = (i + 1 < angles.length ? angles[i+1] : angles[0] + 2 * Math.PI) - gap;
      const p = point(center, start, radius), q = point(center, end, radius);
      shape(g, 'path', {d:`M ${p} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${q}`, class:'backbone'});
      for (let n=1; n<=beads; n++) {
        const [cx,cy] = point(center, start + (end-start)*n/(beads+1), radius);
        shape(g, 'circle', {cx, cy, r:1.75, class:'site'});
      }
    }
  }
  function stem(g, start, end, startRadius, endRadius) {
    const angle = direction(start, end);
    const near = Math.sqrt(startRadius**2 - 25);
    const far = Math.hypot(end[0]-start[0], end[1]-start[1]) - Math.sqrt(endRadius**2 - 25);
    for (const side of [-5, 5]) line(g, point(start,angle,near,side), point(start,angle,far,side), 'backbone');
    for (const fraction of [.32, .72]) {
      const distance = near + (far-near)*fraction;
      const p = point(start,angle,distance,-5), q = point(start,angle,distance,5);
      line(g,p,q,'rung');
      for (const [cx,cy] of [p,q]) shape(g,'circle',{cx,cy,r:2.4,class:'pair-site'});
    }
  }
  const end = [68, 177];
  const tips = [[105,53], [224,40], [301,119]];
  arcLoop(core,a,25,[direction(a,end),direction(a,tips[0]),direction(a,b)],3);
  arcLoop(core,b,22,[direction(b,a),direction(b,tips[1]),direction(b,tips[2])],3);
  stem(core,a,b,25,22);
  stem(core,a,end,25,5);
  const open = direction(a,end);
  const tail1 = point(end,open,0,5), tail2 = point(end,open,0,-5);
  shape(core,'path',{d:`M ${tail1} q -11 9 -17 3`,class:'backbone'});
  shape(core,'path',{d:`M ${tail2} q -8 15 -20 16`,class:'backbone'});
  for (const [i, tip] of tips.entries()) {
    const base = i === 0 ? a : b;
    stem(groups[i+1], base, tip, i === 0 ? 25 : 22, 14);
    arcLoop(groups[i+1], tip, 14, [direction(tip,base)], 6);
    const number = shape(groups[i+1],'text',{x:tip[0], y:tip[1]+3, class:'motif-id','text-anchor':'middle'});
    number.textContent = ['I','II','III'][i];
  }
  // Move the camera over the whole diagram; all four motifs keep their archived connections.
  let phase = 0;
  const motion = new FigureMotion(svg, (_, idleSeconds) => {
    phase = (phase + idleSeconds * 2*Math.PI / 12) % (2*Math.PI);
    scaffold.setAttribute('transform', `translate(0 ${1.2*Math.sin(2*phase)}) rotate(${1.8*Math.sin(phase)} 172 117)`);
  }, () => {
    if (!motion.ready || motion.reduced.matches) {
      phase = 0;
      scaffold.removeAttribute('transform');
    }
  });
  return {groups, motion};
}
