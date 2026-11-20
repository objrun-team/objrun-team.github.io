(() => {
  'use strict';
  const root = document.documentElement;
  const slug = root.dataset.replay;
  const article = root.dataset.article || slug;
  const routed = Boolean(root.dataset.language);
  const button = document.getElementById('language');
  const caseLink = document.getElementById('case-link');
  const standalone = root.hasAttribute('data-standalone');
  const officialSite = 'https://objrun-team.github.io';
  const navigation = [...document.querySelectorAll('.navigation a:not(#language)')].map(link => {
    const url = new URL(link.getAttribute('href'), officialSite + '/demo/' + slug + '/');
    const path = url.pathname.replace(/^\/zh\//, '/').replace(/index\.html$/, '').replace(/\/runs\.html$/, '/runs/');
    return { link, path: path + url.hash };
  });

  function currentLanguage() {
    if (routed) return location.pathname.startsWith('/zh/') ? 'zh' : 'en';
    const requested = new URLSearchParams(location.search).get('lang');
    if (requested === 'zh' || requested === 'en') return requested;
    if (!standalone) {
      try {
        if (localStorage.getItem('objrun-lang-explicit') === '1' && localStorage.getItem('objrun-lang') === 'zh') return 'zh';
      } catch { /* Source previews also work without browser storage. */ }
    }
    return 'en';
  }
  let language = currentLanguage();

  function urlFor(next) {
    const url = new URL(location.href);
    if (routed) {
      url.pathname = (next === 'zh' ? '/zh' : '') + '/demo/' + slug + '/';
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', next);
    }
    return url;
  }

  function localize() {
    root.lang = language === 'zh' ? 'zh-Hans' : 'en';
    if (routed) {
      root.dataset.language = language;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.href = new URL(urlFor(language).pathname, canonical.href).href;
    }
    for (const el of document.querySelectorAll('[data-zh][data-en]')) el.textContent = el.dataset[language];
    for (const [suffix, attr] of [['label','aria-label'], ['title','title']]) {
      for (const el of document.querySelectorAll('[data-en-' + suffix + '][data-zh-' + suffix + ']')) {
        el.setAttribute(attr, el.getAttribute('data-' + language + '-' + suffix));
      }
    }
    const next = language === 'en' ? 'zh' : 'en';
    button.textContent = next === 'zh' ? '中文' : 'EN';
    button.lang = next === 'zh' ? 'zh-Hans' : 'en';
    button.setAttribute('aria-label', next === 'zh' ? '切换为中文' : 'Switch to English');
    if (button.tagName === 'A') {
      button.href = urlFor(next);
      button.hreflang = button.lang;
    }
    const prefix = (standalone ? officialSite : '') + (language === 'zh' ? '/zh' : '');
    if (routed || standalone) {
      for (const { link, path } of navigation) link.href = prefix + path;
      if (caseLink) caseLink.href = prefix + '/blog/' + article + '/';
    } else if (caseLink) {
      caseLink.href = '../../blog/' + article + (language === 'zh' ? '.html' : '.en.html');
    }
  }

  function change(next) {
    if (next === language) return;
    language = next;
    localize();
    document.dispatchEvent(new CustomEvent('replaylanguagechange', { detail: { lang: language } }));
  }

  window.replayLocale = {
    get lang() { return language; },
    text(zh, en) { return language === 'zh' ? zh : en; }
  };
  localize();
  button.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    const next = language === 'en' ? 'zh' : 'en';
    try {
      localStorage.setItem('objrun-lang', next);
      localStorage.setItem('objrun-lang-explicit', '1');
    } catch { /* The current replay also works without browser storage. */ }
    if (location.protocol !== 'file:') history.pushState(null, '', urlFor(next));
    change(next);
  });
  window.addEventListener('popstate', () => change(currentLanguage()));
})();
