// English is the default. Only an explicit switch is saved in this browser.
(() => {
  'use strict';
  // Replays choose their language from their entry URL in replay-language.js.
  if (document.documentElement.dataset.replay) return;
  let preferred = 'en';
  try {
    const saved = localStorage.getItem('objrun-lang');
    if (localStorage.getItem('objrun-lang-explicit') === '1' && (saved === 'zh' || saved === 'en')) preferred = saved;
  } catch { /* Language links also work without browser storage. */ }

  const fixed = document.documentElement.dataset.language;
  const pageLanguage = document.documentElement.lang === 'en' ? 'en' : 'zh';
  window.objrunLanguage = fixed || preferred;

  // Default English URLs honor a previous manual Chinese choice. Explicit
  // Chinese URLs remain readable without JavaScript or stored preferences.
  // Unbuilt blog files retain their paired .html language links for previews.
  const target = fixed
    ? (pageLanguage === 'en' && preferred === 'zh' ? 'zh-Hans' : null)
    : (location.pathname.includes('/blog/') && pageLanguage === 'zh' && preferred === 'en' ? 'en' : null);
  if (target) {
    const alternate = document.querySelector(`link[rel="alternate"][hreflang="${target}"]`);
    if (alternate) {
      const destination = new URL(alternate.href, location.href);
      location.replace(destination.pathname + location.search + location.hash);
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a#language');
    if (!link) return;
    const next = link.hreflang === 'en' ? 'en' : 'zh';
    try {
      localStorage.setItem('objrun-lang', next);
      localStorage.setItem('objrun-lang-explicit', '1');
    } catch { /* The link itself still selects a language. */ }
  });
})();
