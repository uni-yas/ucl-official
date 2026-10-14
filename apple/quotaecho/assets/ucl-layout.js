// Layout-only behavior shared by the corporate site and the product pages.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function renderLayout() {
    const japanese = root.lang === 'ja';
    const home = document.querySelector('.home-link');
    if (home) home.setAttribute('aria-label', japanese ? 'Universion Closure Logic — ホーム' : 'Universion Closure Logic — Home');
    for (const text of document.querySelectorAll('[data-ucl-back-label]')) text.textContent = japanese ? 'ページの先頭へ' : 'Back to top';
    for (const text of document.querySelectorAll('[data-ucl-footer-company]')) text.textContent = japanese ? '株式会社 Universion Closure Logic' : 'Universion Closure Logic';
    const names = {research:'RESEARCH',company:'COMPANY',products:'PRODUCTS & SERVICES',contact:'CONTACT'};
    const kicker = document.querySelector('[data-section-kicker]');
    if (kicker) kicker.textContent = names[root.dataset.page] || '';
  }
  for (const button of document.querySelectorAll('[data-ucl-back-top]')) {
    button.addEventListener('click', () => {
      const scrollRoot = button.closest('[data-ucl-scroller]');
      (scrollRoot || window).scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});
      const heading = scrollRoot?.querySelector('h1') || document.querySelector('main h1');
      if (heading) { heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); }
    });
  }
  window.addEventListener('ucl:pagechange', renderLayout);
  renderLayout();
})();
