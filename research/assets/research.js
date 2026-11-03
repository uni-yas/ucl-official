(() => {
  const lang = document.documentElement.lang;
  for (const a of document.querySelectorAll('[data-r-language]')) {
    const base=a.getAttribute('href');const sync=()=>{a.href=base+location.hash};sync();window.addEventListener('hashchange',sync);
    a.addEventListener('click', () => {try{localStorage.setItem('ucl-site-language',a.hreflang)}catch{}});
  }
  try{localStorage.setItem('ucl-site-language',lang)}catch{}
  const copy = document.querySelector('[data-copy-citation]');
  if (copy) copy.addEventListener('click',async()=>{
    const citation=document.querySelector('.citation').innerText.trim();
    const status=document.querySelector('.copy-feedback');
    try{await navigator.clipboard.writeText(citation);status.textContent=lang==='ja'?'コピーしました。':'Copied.'}
    catch{const range=document.createRange();range.selectNodeContents(document.querySelector('.citation'));const sel=getSelection();sel.removeAllRanges();sel.addRange(range);status.textContent=lang==='ja'?'選択した引用をコピーしてください。':'Copy the selected citation.'}
  });
})();
const picker=document.querySelector('.choose');
if(picker){document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.open=false});picker.addEventListener('keydown',e=>{if(e.key==='Escape'){picker.open=false;picker.querySelector('summary').focus()}})}
