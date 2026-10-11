import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Canonical SVG outlines remain stationary. Their dark fill samples the same
// closed 48-second Opal field as the background, with an inverted slate palette.
const root=document.documentElement;
const canvas=document.querySelector('.identity-canvas');
const homeView=document.querySelector('.home-view');
const params=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const LOOP=48, REVEAL_SECONDS=.9;
const IDENTITY_SCALE=.5;
const state={composition:params.get('composition')==='mark'?'mark':'signature',paused:params.get('paused')==='1',time:0,ambient:0,ready:false};
root.dataset.composition=state.composition;
const clamp=THREE.MathUtils.clamp;
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
let renderer,scene,camera,background,backgroundScene,backgroundCamera,backgroundMaterial;
let mark,name,markParts=[],letters=[];
let nameSurface,nameEdge;
let layout,frame=0,last=0,lastStatus=0,compositionAmount=state.composition==='signature'?1:0;
let groundGlow;
let presented=false,revealAt=0;
const inkUniforms={uOpalField:{value:null},uIdentityHeight:{value:1},uScrollWorld:{value:0}};

function report(error){
  const detail={type:'ucl-identity-status',renderer:root.dataset.renderer,revision:'opal-ink-2',phase:'ink',startup:root.dataset.startup,composition:state.composition,motion:state.paused||reduced.matches?'paused':'playing',time:+state.time.toFixed(2),ambient:+state.ambient.toFixed(2)};
  if(renderer){detail.viewport=`${innerWidth} × ${innerHeight}`;detail.draws=renderer.info.render.calls;detail.triangles=renderer.info.render.triangles;}
  if(error)detail.error=error;
  root.dataset.phase=detail.phase;
  root.dataset.motion=detail.motion;
  window.parent.postMessage(detail,location.origin);
}

function material(edge=0){
  return new THREE.ShaderMaterial({
    uniforms:{...inkUniforms,uEdge:{value:edge}},
    vertexShader:`
      varying vec3 vIdentityWorld;
      varying vec3 vIdentityNormal;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.);
        vIdentityWorld=world.xyz;
        vIdentityNormal=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader:`
      uniform sampler2D uOpalField;
      uniform float uIdentityHeight;
      uniform float uScrollWorld;
      uniform float uEdge;
      varying vec3 vIdentityWorld;
      varying vec3 vIdentityNormal;
      void main(){
        // Expand the full ambient field across the lockup. One world-space
        // mapping keeps the color continuous across every disconnected glyph.
        vec2 identityPosition=vIdentityWorld.xy-vec2(0.,uScrollWorld);
        vec2 uv=identityPosition/(uIdentityHeight*vec2(1.04,1.52))+vec2(.5,.52);
        vec3 field=texture2D(uOpalField,clamp(uv,vec2(.001),vec2(.999))).rgb;
        vec3 opal=mix(field*12.92,1.055*pow(max(field,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),field));
        vec3 inverse=vec3(1.)-opal;
        // The white Opal field has a deliberately quiet center. Expand its
        // small inverse values into visible midtones instead of crushing them
        // into the dark menu base; preserve complementary color differences.
        vec3 luminous=pow(vec3(1.)-exp(-max(inverse,vec3(0.))*5.2),vec3(.78));
        vec3 ink=vec3(51.,59.,75.)/255.+luminous*.64;
        float bevel=1.-pow(abs(normalize(vIdentityNormal).z),8.);
        ink=clamp(ink,vec3(.16),vec3(.90))*(1.-uEdge*.07-bevel*.035);
        vec3 linearInk=mix(ink/12.92,pow((ink+.055)/1.055,vec3(2.4)),step(vec3(.04045),ink));
        gl_FragColor=vec4(linearInk,1.);
        #include <colorspace_fragment>
      }
    `,
    toneMapped:false
  });
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
  // of maintaining a separate mesh for every letter.
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
  // Two device pixels per CSS pixel keep the thin curved surfaces smooth.
  renderer.setPixelRatio(2);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.setClearColor(0xfcfcfd,1);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,100);
  camera.position.set(0,0,10.6);

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

  inkUniforms.uOpalField.value=background.texture;
  const front=material();
  const edge=material(1);
  mark=new THREE.Group();
  markParts=makeParts(g,{depth:5,bevel:.7,curveSegments:10,center:[128,128]},front,edge);
  markParts.forEach(p=>mark.add(p.mesh));scene.add(mark);
  name=new THREE.Group();
  // The wordmark shares the exact same continuous field as the symbol.
  nameSurface=material();
  nameEdge=material(1);
  letters=makeParts(n,{depth:1.5,bevel:.85,curveSegments:8,center:[757.878,45.0115]},nameSurface,nameEdge);
  name.add(combineWordmark(letters));scene.add(name);

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
  // Warm the actual background and identity render passes while
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
  const markPx=Math.min(innerHeight*.48,innerWidth*.66*208/199.324,560)*IDENTITY_SCALE;
  const namePx=Math.min(innerWidth*.82,780)*IDENTITY_SCALE;
  const nameHeight=namePx*74.023/1499.756;
  const gap=clamp(innerHeight*.053,28,56)*IDENTITY_SCALE;
  layout={unit,markPx,namePx,nameHeight,gap};
  mark.scale.setScalar(markPx/208*unit);
  name.scale.setScalar(namePx/1499.756*unit);
  inkUniforms.uIdentityHeight.value=markPx*unit;
  if(state.ready)draw();
}

function pose(){
  const home=!root.dataset.page||root.dataset.page==='home';
  mark.visible=home;groundGlow.visible=home;
  const {unit,markPx,nameHeight,gap}=layout;
  const scrollWorld=home?(homeView?.scrollTop||0)*unit:0;
  inkUniforms.uScrollWorld.value=scrollWorld;
  const stack=(gap+nameHeight)*compositionAmount;
  mark.position.y=stack*.5*unit+scrollWorld;
  mark.rotation.set(.018,-.035,0);
  name.position.y=-(markPx*.5+gap+nameHeight*.5-stack*.5)*unit+scrollWorld;
  groundGlow.position.y=mark.position.y-(markPx*.5+gap*.48)*unit;
  groundGlow.scale.set(markPx*.9*unit,markPx*.12*unit,1);
  groundGlow.material.opacity=.25;
  name.visible=home&&state.composition==='signature';
  name.rotation.set(0,0,0);

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
window.addEventListener('ucl:pagechange',draw);
window.addEventListener('ucl:homescroll',()=>{if(!frame)draw();});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.ready=false;root.dataset.renderer='fallback';if(frame)cancelAnimationFrame(frame);report('Graphics context lost; canonical SVG fallback displayed.');});
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);});
window.addEventListener('pageshow',sync);
export const ready=init().catch(error=>{root.dataset.renderer='fallback';report(error.message);console.error('UCL identity:',error);});

// Invoked only by the local verification page. Samples actual GPU output for
// loop continuity and visible motion, rather than just comparing parameters.
export async function verifyRenderedLoop(){
  await ready;
  if(!state.ready)throw new Error('WebGL initialization failed');
  const previous={...state};
  state.paused=true;sync();
  state.time=6;compositionAmount=1;state.composition='signature';
  const gl=renderer.getContext(),size=renderer.getDrawingBufferSize(new THREE.Vector2());
  const sample=seconds=>{
    state.ambient=seconds;draw();
    const pixels=new Uint8Array(size.x*size.y*4);
    gl.readPixels(0,0,size.x,size.y,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    return pixels;
  };
  const compare=(a,b)=>{
    let total=0,max=0,changed=0;
    for(let i=0;i<a.length;i++){if(i%4===3)continue;const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);if(d>1)changed++;}
    return {meanByteDifference:+(total/(a.length*.75)).toFixed(5),maxByteDifference:max,channelsChangedAboveOne:+(changed/(a.length*.75)).toFixed(5)};
  };
  const matrices=()=>[...mark.matrixWorld.elements,...name.matrixWorld.elements,...markParts.flatMap(p=>Array.from(p.mesh.matrixWorld.elements))];
  const start=sample(0),startPose=matrices();
  // Compare against the actual background at the same phase. This keeps the
  // identity mask valid when the palette changes from dark to luminous.
  mark.visible=false;name.visible=false;
  renderer.render(scene,camera);
  const withoutIdentity=new Uint8Array(size.x*size.y*4);
  gl.readPixels(0,0,size.x,size.y,gl.RGBA,gl.UNSIGNED_BYTE,withoutIdentity);
  const end=sample(48),before=sample(48-1/60),after=sample(1/60),later=sample(4),laterPose=matrices();
  // The background must not be able to make a static logo pass the motion check.
  // Compare only the clearly covered pixels of the stationary identity.
  let inkPixels=0,inkDifference=0,inkSeamMax=0;
  for(let y=Math.floor(size.y*.2);y<size.y*.8;y++)for(let x=Math.floor(size.x*.15);x<size.x*.85;x++){
    const i=(y*size.x+x)*4;
    if(Math.max(...[0,1,2].map(c=>Math.abs(start[i+c]-withoutIdentity[i+c])))<30)continue;
    inkPixels++;
    for(let c=0;c<3;c++){
      inkDifference+=Math.abs(start[i+c]-later[i+c]);
      inkSeamMax=Math.max(inkSeamMax,Math.abs(start[i+c]-end[i+c]));
    }
  }
  const inkMotion={pixels:inkPixels,fourSecondMeanByteDifference:+(inkDifference/Math.max(1,inkPixels*3)).toFixed(5),endpointMaxByteDifference:inkSeamMax};
  const poseDelta=Math.max(...startPose.map((value,i)=>Math.abs(value-laterPose[i])));
  const result={revision:'opal-ink-2',size:[size.x,size.y],loopSeconds:LOOP,markParts:markParts.length,wordmarkGlyphs:letters.length,draws:renderer.info.render.calls,geometryTransformDelta:poseDelta,endpoints:compare(start,end),seamStep:compare(before,start),followingStep:compare(start,after),fourSecondMotion:compare(start,later),webglError:gl.getError()};
  result.inkMotion=inkMotion;
  result.passed=result.endpoints.maxByteDifference<=1&&result.fourSecondMotion.meanByteDifference>1&&inkPixels>0&&inkMotion.fourSecondMeanByteDifference>1&&poseDelta===0&&result.webglError===0;
  Object.assign(state,previous);sync();
  return result;
}
