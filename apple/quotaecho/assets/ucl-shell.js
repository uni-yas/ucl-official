// Explicit product URLs choose the language. Stored preferences never redirect
// an Apple Support/Privacy link to another page or another locale.
(() => {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'ja';
  try { localStorage.setItem('ucl-site-language', locale); } catch {}
  const choices = [...document.querySelectorAll('[data-ucl-language]')];
  function syncLanguageLinks() {
    for (const link of choices) {
      const path = link.dataset.uclLanguage === 'en' ? '/apple/quotaecho/en/' : '/apple/quotaecho/';
      link.href = path + location.hash;
    }
  }
  syncLanguageLinks();
  window.addEventListener('hashchange', syncLanguageLinks);
  for (const link of choices) link.addEventListener('click', () => {
    try { localStorage.setItem('ucl-site-language', link.dataset.uclLanguage); } catch {}
  });
})();

// The shared static opal surface is provided by /assets/opal/shell.css.
