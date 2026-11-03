// Only the Research link, its historic hash, and an explicitly requested enquiry.
(() => {
  const names={"hex-grid-identifying-code-density":{"ja":"六角格子","en":"Hexagonal grid"},"identifying-codes-4-6-12":{"ja":"4.6.12格子","en":"4.6.12 grid"}};
  function sync(){
    const params=new URLSearchParams(location.search);
    let stored;try{stored=localStorage.getItem('ucl-site-language')}catch{}
    const lang=(params.get('lang')||stored||document.documentElement.lang)==='en'?'en':'ja';
    const path=lang==='en'?'/research/en/':'/research/';
    if(location.hash==='#research'){location.replace(path);return}
    const link=document.querySelector('[data-page-link="research"]');if(link)link.href=path;
    if(location.hash!=='#contact'||!Object.hasOwn(names,params.get('paper')))return;
    const field=document.querySelector('#contact-message');
    if(field&&!field.value)field.value=(lang==='ja'?'研究相談：':'Research enquiry: ')+names[params.get('paper')][lang]+'\n';
  }
  sync();window.addEventListener('hashchange',sync);window.addEventListener('ucl:pagechange',sync);
})();
