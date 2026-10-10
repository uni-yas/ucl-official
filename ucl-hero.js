(() => {
  'use strict';
  const palettes={
    cool:['#fcfcfd','#a9cffe','#ddaae9','#f4d196'],
    mint:['#fcfcfd','#89dde2','#adafe8','#f3d7a5'],
    warm:['#fdfcf9','#f0ce8e','#ebafc8','#b8c5f2']
  };
  const params=new URLSearchParams(location.search);
  let palette=Object.hasOwn(palettes,params.get('palette'))?params.get('palette'):'cool';
  const root=document.documentElement;
  root.dataset.palette=palette;
  const canvas=document.querySelector('.light-field');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const loopSeconds=48;
  let paused=params.get('paused')==='1',lost=false,raf=0,clock=0,last=0;
  let program,uniforms;
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  function setPalette(name){
    if(!Object.hasOwn(palettes,name))return;
    palette=name;root.dataset.palette=name;
    if(!program||lost)return;
    ['paper','colorA','colorB','colorC'].forEach((key,i)=>gl.uniform3fv(uniforms[key],rgb(palettes[name][i])));
    draw();
  }
  function draw(){
    if(!program||lost)return;
    gl.uniform1f(uniforms.phase,clock/loopSeconds);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function resize(){
    if(!program||lost)return;
    const dpr=Math.min(devicePixelRatio||1,1.5),scale=Math.min(1,1800/(innerWidth*dpr));
    canvas.width=Math.max(1,Math.round(innerWidth*dpr*scale));
    canvas.height=Math.max(1,Math.round(innerHeight*dpr*scale));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    draw();
  }
  function animate(now){
    if(!program||lost||paused||reduced.matches||document.hidden){raf=0;last=0;return;}
    if(!last)last=now;
    if(now-last>=1000/30){clock=(clock+Math.min((now-last)/1000,0.1))%loopSeconds;last=now;draw();}
    raf=requestAnimationFrame(animate);
  }
  function syncMotion(){
    if(raf)cancelAnimationFrame(raf);
    raf=0;last=0;
    if(program&&!lost&&!paused&&!reduced.matches&&!document.hidden)raf=requestAnimationFrame(animate);
    root.dataset.motion=!program||lost?'unavailable':paused||reduced.matches||document.hidden?'paused':'playing';
    draw();
  }
  function compile(type,id){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,document.getElementById(id).textContent);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Background shader: '+gl.getShaderInfoLog(shader));
    return shader;
  }
  function init(){
    if(!gl)return;
    try{
      program=gl.createProgram();
      const vertex=compile(gl.VERTEX_SHADER,'field-vertex'),fragment=compile(gl.FRAGMENT_SHADER,'field-fragment');
      gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Background link failed');
      gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      uniforms=Object.fromEntries(['resolution','phase','paper','colorA','colorB','colorC'].map(k=>[k,gl.getUniformLocation(program,k)]));
      setPalette(palette);resize();canvas.classList.add('is-ready');syncMotion();
    }catch(error){program=null;canvas.classList.remove('is-ready');console.warn(error.message);}
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==location.origin)return;
    const data=event.data;
    if(!data||data.type!=='ucl-preview')return;
    if(data.palette)setPalette(data.palette);
    if(typeof data.paused==='boolean'){paused=data.paused;syncMotion();}
  });
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',syncMotion);
  reduced.addEventListener('change',syncMotion);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.classList.remove('is-ready');syncMotion();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;init();});
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
  window.addEventListener('pageshow',syncMotion);
  init();
})();
