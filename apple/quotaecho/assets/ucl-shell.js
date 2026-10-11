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

// The approved 48-second Opal shader, rendered without the corporate 3D mark.
// Keep the opaque fallback until a frame is ready; stop work in hidden tabs.
(async () => {
  const host = document.querySelector('.ucl-ambient');
  const canvas = host?.querySelector('canvas');
  if (!canvas) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl, program, frame = 0, last = 0, elapsed = 0, contextLost = false;
  try {
    gl = canvas.getContext('webgl', {alpha:false,antialias:false,powerPreference:'low-power'});
    if (!gl) return;
    const response = await fetch(new URL('./ucl-opal.frag', document.currentScript.src));
    if (!response.ok) return;
    const fragment = await response.text();
    function shader(type, source) {
      const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Opal shader unavailable');
      return result;
    }
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const [key,values] of Object.entries({paper:[252,252,253],colorA:[169,207,254],colorB:[221,170,233],colorC:[244,209,150]})) gl.uniform3fv(gl.getUniformLocation(program,key),values.map(x=>x/255));
    const resolution = gl.getUniformLocation(program,'resolution'), phase = gl.getUniformLocation(program,'phase');
    function draw() {
      if (contextLost) return;
      const scale = Math.min(devicePixelRatio || 1, 1.5);
      const width=Math.round(innerWidth*scale),height=Math.round(innerHeight*scale);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
      gl.uniform2f(resolution,width,height);gl.uniform1f(phase,(elapsed%48)/48);gl.drawArrays(gl.TRIANGLES,0,3);
      host.dataset.ready='true';
    }
    function tick(now){frame=0;if(last)elapsed+=(now-last)/1000;last=now;draw();frame=requestAnimationFrame(tick);}
    function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(document.hidden||contextLost)return;draw();if(!reduced.matches)frame=requestAnimationFrame(tick);}
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    window.addEventListener('resize',draw);window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);last=0;});window.addEventListener('pageshow',sync);
    canvas.addEventListener('webglcontextlost',()=>{contextLost=true;cancelAnimationFrame(frame);frame=0;delete host.dataset.ready;});
    sync();
  } catch { delete host.dataset.ready; }
})();
