(()=>{
 const root=document.querySelector('.publication-browser');if(!root)return;
 const ja=root.dataset.lang==='ja', rows=[...root.querySelectorAll('.paper')];
 const state={field:'all',origin:'all'}, labels={};
 for(const key of ['field','origin']){labels[key]={};root.querySelectorAll(`button[data-${key}]`).forEach(b=>{labels[key][b.dataset[key]]=b.textContent;b.addEventListener('click',()=>{state[key]=b.dataset[key];update();});});}
 function update(){let count=0;rows.forEach(row=>{row.hidden=!((state.field==='all'||row.dataset.field===state.field)&&(state.origin==='all'||row.dataset.origin===state.origin));if(!row.hidden)count++;});
 for(const key of ['field','origin'])root.querySelectorAll(`button[data-${key}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===state[key])));
 const active=Object.keys(state).filter(k=>state[k]!=='all');root.querySelector('[data-filter-caption]').textContent=active.length?active.map(k=>labels[k][state[k]]).join(' · '):(ja?'すべての公開論文':'All publications');
 root.querySelector('.paper-count').textContent=count;root.querySelector('[data-count-unit]').textContent=ja?'件':(count===1?'paper':'papers');root.querySelector('.paper-reset').hidden=!active.length;root.querySelector('.paper-empty').hidden=count!==0;
 }
 function reset(){state.field=state.origin='all';update();}
 root.querySelector('.paper-reset').addEventListener('click',reset);
 root.querySelector('.paper-clear').addEventListener('click',()=>{reset();root.querySelector('button[data-field="all"]').focus();});
 function anchor(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const row=rows.find(x=>x.id===id);if(row){reset();row.querySelector('details').open=true;requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));}else if(id==='original-research'||id==='additional-results'){reset();state.origin=id==='original-research'?'original':'prior';update();}}
 root.querySelector('.paper-filters').hidden=false;update();window.addEventListener('hashchange',anchor);anchor();
})();
