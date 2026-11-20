// Counts from work/orbgraph.bin and final-best_verified.txt.
const dnaRunDiagrams = {
  "orbits": 39702,
  "edges": 13927552,
  "meanDegree": 701.6,
  "degreeBins": [
    [
      400,
      90
    ],
    [
      500,
      2602
    ],
    [
      600,
      17588
    ],
    [
      700,
      15668
    ],
    [
      800,
      3524
    ],
    [
      900,
      230
    ]
  ],
  "distances": [
    [
      4,
      34294
    ],
    [
      5,
      85444
    ],
    [
      6,
      202318
    ],
    [
      7,
      345240
    ],
    [
      8,
      407762
    ],
    [
      9,
      260396
    ],
    [
      10,
      88374
    ]
  ]
};

function createDnaBranchHistory(container,text,jump) {
  const states = {
    reference:'verified',
    reader:'failed',
    graphfix:'repaired',
    mis:'verified',
    exact:'repaired',
    export:'failed',
    remap:'repaired',
    best:'verified',
    audit:'verified'
  };
  const tags = {
    reader:['失败','failed'],
    graphfix:['已修复','fixed'],
    export:['冲突','conflict'],
    remap:['已修复','fixed'],
    audit:['通过','passed']
  };
  return branches => {
    const focused = container.contains(document.activeElement) ? document.activeElement.dataset.branch : undefined;
    const ordered = new Map(branches.map(branch => [branch.id,branch]));
    const active = branches.at(-1)?.id;
    const lineage = new Set();
    for (let id = active; id; id = ordered.get(id)?.parent) lineage.add(id);
    const children = new Map();
    for (const branch of ordered.values()) {
      const list = children.get(branch.parent) ?? [];
      list.push(branch);
      children.set(branch.parent,list);
    }
    function group(parent) {
      const list = document.createElement('ul');
      const siblings = children.get(parent) ?? [];
      const lineageIndex = siblings.findIndex(branch => lineage.has(branch.id));
      for (const [index,branch] of siblings.entries()) {
        const item = document.createElement('li');
        if (lineage.has(branch.id)) item.dataset.lineage = 'true';
        if (index < lineageIndex) item.dataset.trunk = 'active';
        const state = states[branch.id];
        if (state) item.dataset.state = state;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.branch = branch.id;
        if (state) button.dataset.state = state;
        if (branch.id === active) button.setAttribute('aria-current','step');
        if (state === 'failed') button.dataset.failed = '';
        const dot = document.createElement('i');
        dot.className = 'branch-dot';
        dot.setAttribute('aria-hidden','true');
        const label = document.createElement('span');
        label.className = 'branch-label';
        label.textContent = text(...branch.label);
        button.append(dot,label);
        if (branch.count) {
          const count = document.createElement('small');
          count.className = 'branch-metric';
          const unit = branch.unit === 'words' ? text('条','words') : text('个轨道','orbits');
          count.textContent = branch.count.toLocaleString('en-US') + ' ' + unit;
          button.append(count);
        } else if (tags[branch.id]) {
          const tag = document.createElement('small');
          tag.className = 'branch-tag';
          tag.textContent = text(...tags[branch.id]);
          button.append(tag);
        }
        button.addEventListener('click',() => {
          const keepFocus = document.activeElement === button;
          jump(branch.id);
          if (keepFocus) container.querySelector(`[data-branch="${branch.id}"]`)?.focus({preventScroll:true});
        });
        item.append(button);
        if (children.has(branch.id)) item.append(group(branch.id));
        list.append(item);
      }
      return list;
    }
    container.replaceChildren(group(null));
    if (focused) container.querySelector(`[data-branch="${focused}"]`)?.focus({preventScroll:true});
  };
}
