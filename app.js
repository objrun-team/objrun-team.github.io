(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticLanguage = document.documentElement.dataset.language;
  let language = window.objrunLanguage || 'en';
  const text = (zh, en) => language === 'zh' ? zh : en;

  function setLanguage(next, persist = false) {
    language = next;
    document.documentElement.lang = next === 'zh' ? 'zh-Hans' : 'en';
    document.querySelectorAll('[data-zh][data-en]').forEach(element => { element.textContent = element.dataset[next]; });
    $('language').textContent = text('EN', '中文');
    $('language').setAttribute('aria-label', text('Switch to English', '切换为中文'));
    if (persist) { try { localStorage.setItem('objrun-lang', next); localStorage.setItem('objrun-lang-explicit', '1'); } catch { /* Work without local storage. */ } }
  }
  if (!staticLanguage) $('language').addEventListener('click', () => setLanguage(language === 'zh' ? 'en' : 'zh', true));

  const comingSoon = $('coming-soon');
  document.querySelectorAll('[data-coming-soon]').forEach(button => {
    button.addEventListener('click', () => comingSoon.showModal());
  });

  // ---------- Counting numbers ----------
  // A score counts up from 0 on an exponential ease-out: most of the distance goes
  // by in the first third, then it slows into the final value. The final text is
  // kept in data-final, so screen readers and reduced motion see it directly.
  const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  function countUp(node, duration = 1400, delay = 0) {
    const final = node.dataset.final ?? (node.dataset.final = node.textContent);
    const target = parseFloat(final);
    if (!Number.isFinite(target) || reducedMotion.matches) { node.textContent = final; return; }
    const places = (final.split('.')[1] || '').length;
    let start = 0;
    node.textContent = (0).toFixed(places);
    const frame = now => {
      if (!start) start = now + delay;
      const t = Math.max(0, (now - start) / duration);
      node.textContent = t >= 1 ? final : (target * easeOutExpo(t)).toFixed(places);
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function countBoard(panel) {
    panel.querySelectorAll('tbody tr').forEach((tr, i) => {
      tr.style.setProperty('--i', i);
      const score = tr.querySelector('.score');
      if (score) countUp(score, tr.classList.contains('ours') ? 1300 : 900, i * 35);
    });
  }

  // ---------- Leaderboard tabs ----------
  const tabs = [...document.querySelectorAll('.board-tab')];
  function selectTab(tab, focus) {
    if (tab.getAttribute('aria-selected') === 'true') {
      if (focus) tab.focus();
      return;
    }
    tabs.forEach(other => {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = $(other.getAttribute('aria-controls'));
      panel.hidden = !selected;
      // Hiding the previous board cancels its entrance; no forced layout needed.
      panel.classList.toggle('is-entering', selected);
      if (selected) countBoard(panel);
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab, false));
    tab.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        selectTab(tabs[event.key === 'Home' ? 0 : tabs.length - 1], true);
      } else if (step) {
        event.preventDefault();
        selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
      }
    });
  });
  setLanguage(language);

  // Keep the file unloaded and show a poster until the visitor chooses to play.
  const film = $('overview-film');
  const playFilm = $('play-film');
  if (film && playFilm) {
    film.hidden = true;
    playFilm.hidden = false;
    playFilm.addEventListener('click', () => {
      playFilm.hidden = true;
      film.hidden = false;
      film.focus({ preventScroll: true });
      // Native controls remain available if the browser declines the play request.
      film.play().catch(() => {});
    });
  }

  // ---------- Header: observe only the top boundary ----------
  const header = $('site-header');
  if ('IntersectionObserver' in window) {
    const sentinel = document.createElement('span');
    sentinel.className = 'scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    header.before(sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
  } else {
    header.classList.add('is-scrolled');
  }

  // ---------- Card light under a fine pointer, one read/write per frame ----------
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pointerFrame = 0;
  let pointerCard = null;
  let pointerX = 0, pointerY = 0;
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    const card = event.target.closest && event.target.closest('.spot');
    if (!card) return;
    pointerCard = card;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const box = pointerCard.getBoundingClientRect();
      pointerCard.style.setProperty('--mx', `${pointerX - box.left}px`);
      pointerCard.style.setProperty('--my', `${pointerY - box.top}px`);
    });
  }, { passive: true });

  // Reveal sections as they enter view. Without JS, IO or with reduced motion,
  // everything is shown immediately and the numbers stay static.
  const revealables = document.querySelectorAll('[data-reveal]');
  function showAll() { revealables.forEach(element => element.classList.add('is-visible')); }
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('is-visible');
        observer.unobserve(target);
        // Score cards: the big number counts while its bars grow (same stagger via --d).
        const score = target.querySelector('.score > span');
        if (score) countUp(score, 1500, (parseFloat(target.style.getPropertyValue('--d')) || 0) * 90 + 250);
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(element => observer.observe(element));
    // The first leaderboard plays its entrance once, when it first scrolls into view.
    const firstBoard = document.querySelector('.board[role="tabpanel"]:not([hidden])');
    if (firstBoard) {
      const boardObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        boardObserver.disconnect();
        firstBoard.classList.add('is-entering');
        countBoard(firstBoard);
      }, { threshold: .2 });
      boardObserver.observe(firstBoard);
    }
    reducedMotion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      showAll();
    });
  } else {
    showAll();
  }
})();
