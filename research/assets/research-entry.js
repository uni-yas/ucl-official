// Keep the Research link and news anchors aligned with the selected language.
(() => {
  function sync(){
    const params=new URLSearchParams(location.search);
    let stored;try{stored=localStorage.getItem('ucl-site-language')}catch{}
    const lang=(params.get('lang')||stored||document.documentElement.lang)==='en'?'en':'ja';
    const path=lang==='en'?'/research/en/':'/research/';
    if(location.hash==='#research'){location.replace(path);return}
    const link=document.querySelector('[data-page-link="research"]');if(link)link.href=path;
    for(const news of document.querySelectorAll('[data-research-target]')){news.href=path+'#'+news.dataset.researchTarget;news.hreflang=lang;}
  }
  sync();window.addEventListener('hashchange',sync);window.addEventListener('ucl:pagechange',sync);
})();
