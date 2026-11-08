/* A decorative SVG, independent of the corporate WebGL renderer. */
(() => {
  const hero = document.querySelector('.research-hero');
  const svg = hero?.querySelector('.research-orbit');
  if (!svg) return;
  const art = hero.querySelector('.research-art-window');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const front = svg.querySelector('.orbit-movers-front');
  const back = svg.querySelector('.orbit-movers-back');
  const dots = [...svg.querySelectorAll('[data-orbit]')].map(node => ({
    node, rx:Number(node.dataset.rx), ry:Number(node.dataset.ry),
    offset:Number(node.dataset.orbit)*Math.PI*2/3,
    light:node.querySelector('.orbit-light'),glow:node.querySelector('.orbit-glow'),
    point:node.querySelector('.orbit-particle'),tail:node.querySelector('.orbit-tail'),
    gradient:svg.querySelector(`#orbit-tail-${node.dataset.orbit}`)
  }));
  let frame=0, last=0, elapsed=.7*3/(Math.PI*2), visible=false;
  const period=3, interval=1000/30;
  function paint(){
    const phase=elapsed/period*Math.PI*2;
    for(const p of dots){
      const angle=phase+p.offset, depth=(Math.sin(angle)+1)/2;
      const x=60+p.rx*Math.cos(angle), y=60+p.ry*Math.sin(angle);
      const tx=60+p.rx*Math.cos(angle-.14), ty=60+p.ry*Math.sin(angle-.14);
      const layer=Math.sin(angle)>=0?front:back;
      if(p.node.parentNode!==layer)layer.append(p.node);
      p.node.setAttribute('opacity',(.65+depth*.35).toFixed(3));
      p.light.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)})`);
      p.point.setAttribute('r',(.32+depth*.12).toFixed(3));
      p.glow.setAttribute('opacity',(.84+.16*Math.sin(angle*2+p.offset)).toFixed(3));
      p.tail.setAttribute('d',`M ${tx.toFixed(3)} ${ty.toFixed(3)} A ${p.rx} ${p.ry} 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)}`);
      p.gradient.setAttribute('x1',tx.toFixed(3));p.gradient.setAttribute('y1',ty.toFixed(3));
      p.gradient.setAttribute('x2',x.toFixed(3));p.gradient.setAttribute('y2',y.toFixed(3));
    }
  }
  function tick(now){
    frame=0;
    if(!last)last=now;
    if(now-last>=interval){
      elapsed=(elapsed+Math.min((now-last)/1000,.1))%period;
      last=now;paint();
    }
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    const playing=visible&&!document.hidden&&!reduced.matches;
    hero.dataset.motion=playing?'playing':reduced.matches?'still':'paused';
    paint();
    if(playing)frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0});
  window.addEventListener('pageshow',sync);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:0});
  observer.observe(art);
  sync();
})();
