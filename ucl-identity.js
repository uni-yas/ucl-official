import * as THREE from 'three';
import { SVGLoader } from './ucl-SVGLoader.js';

// Canonical SVG outlines, extruded in place. The ambient field retains Opal v3's
// closed 48-second path. The complete identity is stationary: only light moves.
const root=document.documentElement;
const canvas=document.querySelector('.identity-canvas');
const params=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const LOOP=48, TAU=Math.PI*2, REVEAL_SECONDS=.9;
const state={composition:params.get('composition')==='mark'?'mark':'signature',paused:params.get('paused')==='1',time:0,ambient:0,ready:false};
root.dataset.composition=state.composition;
const clamp=THREE.MathUtils.clamp;
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
let renderer,scene,camera,background,backgroundScene,backgroundCamera,backgroundMaterial;
let mark,name,markParts=[],letters=[],materials=[];
let nameSurface,nameEdge;
let layout,frame=0,last=0,lastStatus=0,compositionAmount=state.composition==='signature'?1:0;
let keyLight,rimLight,fillLight,groundGlow;
let presented=false,revealAt=0;
const glassUniforms={uGlassPhase:{value:0}};

function report(error){
  const detail={type:'ucl-identity-status',renderer:root.dataset.renderer,revision:'opal-glass-4',phase:'light',startup:root.dataset.startup,composition:state.composition,motion:state.paused||reduced.matches?'paused':'playing',time:+state.time.toFixed(2),ambient:+state.ambient.toFixed(2)};
  if(renderer){detail.viewport=`${innerWidth} × ${innerHeight}`;detail.draws=renderer.info.render.calls;detail.triangles=renderer.info.render.triangles;}
  if(error)detail.error=error;
  root.dataset.phase=detail.phase;
  root.dataset.motion=detail.motion;
  window.parent.postMessage(detail,location.origin);
}

function makeStudio(){
  // HDR softboxes and negative fill: contrasting reflections make clear glass
  // readable on white, without a black outline or an unrelated chrome texture.
  const width=768,height=384,data=new Float32Array(width*height*4);
  const wrap=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
  const box=(u,v,x,y,w,h,soft)=>{
    const dx=wrap(u,x)/w,dy=Math.abs(v-y)/h;
    return (1-smooth((dx-1+soft)/soft))*(1-smooth((dy-1+soft)/soft));
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/height,i=(y*width+x)*4;
    const ceiling=.05+.14*smooth((v-.3)/.5);
    let r=ceiling*.91,g=ceiling*.94,b=ceiling*1.05;
    const panels=[
      [.67,.63,.075,.32,.92,6.0,6.1,6.4],
      [.88,.50,.055,.31,.90,3.3,4.0,5.7],
      [.53,.72,.16,.10,.94,4.1,3.8,3.3],
      [.21,.58,.18,.24,.90,1.7,1.7,1.85],
      [.96,.48,.09,.36,1.0,1.1,.55,1.05],
      [.55,.43,.085,.36,1.0,.65,1.05,1.85],
      [.76,.80,.18,.07,.96,3.6,3.1,2.4]
    ];
    for(const [px,py,pw,ph,soft,pr,pg,pb] of panels){const m=box(u,v,px,py,pw,ph,soft);r+=m*pr;g+=m*pg;b+=m*pb;}
    data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=1;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromEquirectangular(texture);
  texture.dispose();pmrem.dispose();
  return target.texture;
}

function material(overrides={}){
  const m=new THREE.MeshPhysicalMaterial({
    color:0xe4edfc,metalness:.015,roughness:.05,transmission:.96,
    thickness:7,ior:1.52,attenuationColor:0xccdff7,attenuationDistance:1.8,
    iridescence:.42,iridescenceIOR:1.32,iridescenceThicknessRange:[220,380],
    clearcoat:.65,clearcoatRoughness:.075,envMapIntensity:1.30,
    dispersion:.12,...overrides
  });
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,glassUniforms);
    shader.vertexShader='varying vec3 vIdentityWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvIdentityWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='uniform float uGlassPhase;\nvarying vec3 vIdentityWorld;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>\nfloat faceFactor=pow(abs(normal.z),12.0);\nvec2 lens=vec2(sin(vIdentityWorld.y*1.2+vIdentityWorld.x*.5)*.055,cos(vIdentityWorld.x*1.1-vIdentityWorld.y*.4)*.035);\nnormal=normalize(normal+vec3(lens*faceFactor,0.));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',
      `
        float glassAxis=vIdentityWorld.x*.82+vIdentityWorld.y*.30;
        float lightCenter=2.35*sin(uGlassPhase-.60);
        float lightDistance=(glassAxis-lightCenter)/.72;
        float softReflection=exp(-lightDistance*lightDistance);
        float fillDistance=(glassAxis-lightCenter-.78)/1.18;
        float negativeFill=exp(-fillDistance*fillDistance);
        float filmDistance=(glassAxis-lightCenter+.48)/.30;
        float film=exp(-filmDistance*filmDistance);
        vec3 filmColor=mix(vec3(.62,.78,1.),vec3(1.,.77,.58),.5+.5*sin(uGlassPhase+1.1));
        outgoingLight*=1.-negativeFill*.16;
        outgoingLight+=softReflection*vec3(.20,.21,.24)+film*filmColor*.075;
      \n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey=()=> 'ucl-opal-glass-3';
  materials.push(m);return m;
}

function makeParts(data,{depth,bevel,curveSegments,center},surface,edge){
  const parts=[];
  for(const path of data.paths)for(const shape of SVGLoader.createShapes(path)){
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:bevel,bevelOffset:-bevel,bevelThickness:bevel*.9,curveSegments});
    // Flip SVG's y axis in geometry so front-facing normals and winding remain
    // correct; a rotation is a proper transform, unlike a negative group scale.
    geometry.rotateX(Math.PI);
    geometry.computeBoundingBox();
    const c=geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-c.x,-c.y,-c.z);
    const mesh=new THREE.Mesh(geometry,[surface,edge]);
    const base=new THREE.Vector3(c.x-center[0],c.y+center[1],0);
    mesh.position.copy(base);
    parts.push({mesh,base,id:path.userData?.node?.id||''});
  }
  return parts;
}

function combineWordmark(parts){
  // The name is fixed, so batch its 22 glyphs into two material draws instead
  // of maintaining a separate animated, transmissive mesh for every letter.
  const groups=[[],[]],attributes={},sizes={};let vertices=0;
  for(const {mesh,base} of parts){
    const geometry=mesh.geometry;geometry.translate(base.x,base.y,base.z);
    for(const [key,attribute] of Object.entries(geometry.attributes)){
      if(!attributes[key]){attributes[key]=[];sizes[key]=attribute.itemSize;}
      attributes[key].push(attribute.array);
    }
    for(const group of geometry.groups)for(let j=group.start;j<group.start+group.count;j++)groups[group.materialIndex].push(j+vertices);
    vertices+=geometry.getAttribute('position').count;
  }
  const combined=new THREE.BufferGeometry();
  for(const [key,arrays] of Object.entries(attributes)){
    const data=new Float32Array(arrays.reduce((total,array)=>total+array.length,0));let offset=0;
    for(const array of arrays){data.set(array,offset);offset+=array.length;}
    combined.setAttribute(key,new THREE.BufferAttribute(data,sizes[key]));
  }
  combined.setIndex(groups[0].concat(groups[1]));
  combined.addGroup(0,groups[0].length,0);combined.addGroup(groups[0].length,groups[1].length,1);
  const mesh=new THREE.Mesh(combined,parts[0].mesh.material);
  for(const part of parts)part.mesh.geometry.dispose();
  return mesh;
}

async function init(){
  root.dataset.startup='preparing';
  renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,1.5),1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.setClearColor(0xfcfcfd,1);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,100);
  camera.position.set(0,0,10.6);
  scene.environment=makeStudio();

  const [g,n,frag]=await Promise.all([
    new SVGLoader().loadAsync('ucl-g.svg'),
    new SVGLoader().loadAsync('ucl-wordmark.svg'),
    fetch('ucl-opal.frag').then(r=>{if(!r.ok)throw new Error('Opal field unavailable');return r.text();})
  ]);
  background=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  backgroundScene=new THREE.Scene();backgroundCamera=new THREE.Camera();
  const hex=h=>new THREE.Vector3(...[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255));
  backgroundMaterial=new THREE.ShaderMaterial({
    uniforms:{resolution:{value:new THREE.Vector2(1,1)},phase:{value:0},paper:{value:hex('#fcfcfd')},colorA:{value:hex('#a9cffe')},colorB:{value:hex('#ddaae9')},colorC:{value:hex('#f4d196')}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:frag.replace('gl_FragColor=vec4(color,1.);','vec3 linearColor=mix(color/12.92,pow((color+.055)/1.055,vec3(2.4)),step(vec3(.04045),color));\ngl_FragColor=vec4(linearColor,1.);'),
    depthTest:false,depthWrite:false,toneMapped:false
  });
  backgroundScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),backgroundMaterial));
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
    uniforms:{map:{value:background.texture}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}',
    fragmentShader:'uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=texture2D(map,vUv);\n#include <colorspace_fragment>\n}',
    depthWrite:false,depthTest:false,toneMapped:false
  }));
  backdrop.frustumCulled=false;backdrop.renderOrder=-1000;scene.add(backdrop);

  const front=material();
  const edge=material({color:0xaebed8,transmission:.88,roughness:.055,metalness:.12,iridescence:.55,thickness:7,attenuationColor:0xcbdcf6,attenuationDistance:1.8});
  mark=new THREE.Group();
  markParts=makeParts(g,{depth:5,bevel:.7,curveSegments:10,center:[128,128]},front,edge);
  markParts.forEach(p=>mark.add(p.mesh));scene.add(mark);
  name=new THREE.Group();
  // Share the glass palette and world-space light; a faintly denser tint keeps
  // the small wordmark readable without a separate dark lettering treatment.
  nameSurface=material({color:0xbac9df,transmission:.94});
  nameEdge=material({color:0xaebed8,transmission:.88,roughness:.055,metalness:.12,iridescence:.55,attenuationColor:0xcbdcf6,attenuationDistance:1.8});
  letters=makeParts(n,{depth:1.5,bevel:.85,curveSegments:8,center:[757.878,45.0115]},nameSurface,nameEdge);
  name.add(combineWordmark(letters));scene.add(name);
  keyLight=new THREE.DirectionalLight(0xfff7ed,1.6);keyLight.position.set(-3,5,8);scene.add(keyLight);
  rimLight=new THREE.DirectionalLight(0xc8dcff,2);rimLight.position.set(3,2,-1);scene.add(rimLight);
  fillLight=new THREE.DirectionalLight(0xf7d7e9,.8);fillLight.position.set(-4,-2,3);scene.add(fillLight);

  const glowCanvas=document.createElement('canvas');glowCanvas.width=256;glowCanvas.height=64;
  const glow=glowCanvas.getContext('2d');
  glow.scale(4,1);const gradient=glow.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(72,72,146,.19)');gradient.addColorStop(.3,'rgba(137,117,188,.10)');gradient.addColorStop(1,'rgba(147,135,196,0)');
  glow.fillStyle=gradient;glow.fillRect(0,0,64,64);
  groundGlow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,toneMapped:false}));
  groundGlow.position.z=-.5;scene.add(groundGlow);

  resize();
  pose();
  await renderer.compileAsync(backgroundScene,backgroundCamera);
  await renderer.compileAsync(scene,camera);
  state.ready=true;
  if(reduced.matches)state.time=6;
  // Warm the actual background, transmission and main render passes while
  // hidden. Shader compilation alone does not prepare every first-use pass.
  draw();
  await new Promise(requestAnimationFrame);
  draw();
  await new Promise(requestAnimationFrame);
  presented=true;revealAt=performance.now();
  root.dataset.startup=reduced.matches?'ambient':'revealing';
  root.dataset.renderer='webgl';
  sync();
}

function resize(){
  if(!renderer||!camera)return;
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  if(!background)return;
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());
  background.setSize(size.x,size.y);backgroundMaterial.uniforms.resolution.value.copy(size);
  const worldHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*camera.position.z;
  const unit=worldHeight/innerHeight;
  const markPx=Math.min(innerHeight*.48,innerWidth*.66*208/199.324,560);
  const namePx=Math.min(innerWidth*.82,780);
  const nameHeight=namePx*74.023/1499.756;
  const gap=clamp(innerHeight*.053,28,56);
  layout={unit,markPx,namePx,nameHeight,gap};
  mark.scale.setScalar(markPx/208*unit);
  name.scale.setScalar(namePx/1499.756*unit);
  // Three.js scales optical thickness with the object. Compensate for the
  // different SVG units so the name retains the mark's glass density.
  nameSurface.thickness=nameEdge.thickness=7*mark.scale.x/name.scale.x;
  if(state.ready)draw();
}

function pose(){
  const angle=TAU*state.ambient/LOOP;
  glassUniforms.uGlassPhase.value=angle;
  const {unit,markPx,nameHeight,gap}=layout;
  const stack=(gap+nameHeight)*compositionAmount;
  mark.position.y=stack*.5*unit;
  mark.rotation.set(.018,-.035,0);
  name.position.y=-(markPx*.5+gap+nameHeight*.5-stack*.5)*unit;
  groundGlow.position.y=mark.position.y-(markPx*.5+gap*.48)*unit;
  groundGlow.scale.set(markPx*.9*unit,markPx*.12*unit,1);
  groundGlow.material.opacity=.25;
  name.visible=state.composition==='signature';
  name.rotation.set(0,0,0);
  scene.environmentRotation.set(.012*Math.sin(angle),.58+.26*Math.sin(angle)+.035*Math.sin(angle*2),0);
  keyLight.position.set(-3+.8*Math.sin(angle),5+.35*Math.cos(angle),8);
  rimLight.position.set(3+.5*Math.sin(angle),2+.3*Math.cos(angle),-1);
}

function draw(){
  if(!state.ready)return;
  pose();
  backgroundMaterial.uniforms.phase.value=state.ambient/LOOP;
  renderer.setRenderTarget(background);renderer.render(backgroundScene,backgroundCamera);
  renderer.setRenderTarget(null);renderer.render(scene,camera);
}
function animate(now){
  frame=0;
  if(document.hidden)return;
  const dt=last?Math.min((now-last)/1000,.06):0;last=now;
  const visibleSeconds=Math.max(0,(now-revealAt)/1000);
  // Reveal one complete, still frame. Only then bring the light gently up to
  // its normal speed, so startup opacity and moving color never compete.
  const motionRate=smooth((visibleSeconds-REVEAL_SECONDS)/.65);
  root.dataset.startup=visibleSeconds<REVEAL_SECONDS?'revealing':'ambient';
  if(!state.paused&&!reduced.matches){state.time+=dt*motionRate;state.ambient=(state.ambient+dt*motionRate)%LOOP;}
  const target=state.composition==='signature'?1:0;
  compositionAmount=THREE.MathUtils.damp(compositionAmount,target,8,dt);
  if(Math.abs(compositionAmount-target)<.001)compositionAmount=target;
  draw();
  if(now-lastStatus>600){report();lastStatus=now;}
  if((!state.paused&&!reduced.matches)||compositionAmount!==target)frame=requestAnimationFrame(animate);
}
function sync(){
  if(frame)cancelAnimationFrame(frame);
  frame=0;last=0;
  if(!state.ready||!presented||document.hidden)return;
  if(reduced.matches){state.time=Math.max(state.time,6);compositionAmount=state.composition==='signature'?1:0;}
  if((!state.paused&&!reduced.matches)||compositionAmount!==(state.composition==='signature'?1:0))frame=requestAnimationFrame(animate);
  draw();report();
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='ucl-identity')return;
  const d=event.data;
  if(d.composition==='mark'||d.composition==='signature'){state.composition=d.composition;root.dataset.composition=state.composition;}
  if(typeof d.paused==='boolean')state.paused=d.paused;
  if(d.replay){state.time=0;state.ambient=0;}
  if(Number.isFinite(d.seek)){state.time=clamp(d.seek,0,120);state.ambient=state.time%LOOP;}
  sync();
});
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.ready=false;root.dataset.renderer='fallback';if(frame)cancelAnimationFrame(frame);report('Graphics context lost; canonical SVG fallback displayed.');});
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);});
window.addEventListener('pageshow',sync);
export const ready=init().catch(error=>{root.dataset.renderer='fallback';report(error.message);console.error('UCL identity:',error);});
