(() => {
  const lang = document.documentElement.lang;
  for (const a of document.querySelectorAll('[data-r-language]')) {
    const base=a.getAttribute('href');const sync=()=>{a.href=base+location.hash};sync();window.addEventListener('hashchange',sync);
    a.addEventListener('click', () => {try{localStorage.setItem('ucl-site-language',a.hreflang)}catch{}});
  }
  try{localStorage.setItem('ucl-site-language',lang)}catch{}

})();
const picker=document.querySelector('.choose');
if(picker){document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.open=false});picker.addEventListener('keydown',e=>{if(e.key==='Escape'){picker.open=false;picker.querySelector('summary').focus()}})}
