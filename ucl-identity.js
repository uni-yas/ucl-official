import * as THREE from 'three';
import { createEmergence } from './ucl-emergence-particles.js?v=emergence-20261012-1';
import { INTRO_END, phaseAt, motionAt } from './ucl-emergence-timing.js?v=emergence-20261012-1';
import { createCrystalGlints } from './ucl-emergence-crystal.js?v=emergence-20261012-1';
import { createMarkFocus } from './ucl-emergence-focus.js?v=emergence-20261012-1';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Canonical SVG outlines remain stationary. Their dark fill samples the same
// closed 48-second Opal field as the background, with an inverted slate palette.
const root=document.documentElement;
const canvas=document.querySelector('.identity-canvas');
const homeView=document.querySelector('.home-view');
const params=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const LOOP=48, REVEAL_SECONDS=.5;
const IDENTITY_SCALE=.5;
const state={composition:params.get('composition')==='mark'?'mark':'signature',paused:params.get('paused')==='1',time:0,ambient:0,ready:false};
root.dataset.composition=state.composition;
const clamp=THREE.MathUtils.clamp;
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
let renderer,scene,camera,background,backgroundScene,backgroundCamera,backgroundMaterial;
let mark,name,markParts=[],letters=[];
let nameSurface,nameEdge;
let layout,frame=0,last=0,lastStatus=0,compositionAmount=state.composition==='signature'?1:0;
let groundGlow,emergence,backdropMaterial,energyGlow,energyTrace,crystalGlints,markFocusPass;
let markSurface,markEdge,logoBlur=0;
let presented=false,revealAt=0;
const inkUniforms={uOpalField:{value:null},uIdentityHeight:{value:1},uScrollWorld:{value:0}};

function report(error){
  const detail={type:'ucl-identity-status',renderer:root.dataset.renderer,revision:'emergence-20261012-1',phase:phaseAt(state.time),startup:root.dataset.startup,composition:state.composition,motion:state.paused||reduced.matches?'paused':'playing',time:+state.time.toFixed(2),ambient:+state.ambient.toFixed(2)};
  if(renderer){detail.viewport=`${innerWidth} × ${innerHeight}`;detail.draws=renderer.info.render.calls;detail.triangles=renderer.info.render.triangles;}
  if(error)detail.error=error;
  root.dataset.phase=detail.phase;
  root.dataset.motion=detail.motion;
  window.parent.postMessage(detail,location.origin);
}

function material(edge=0){
  return new THREE.ShaderMaterial({
    uniforms:{...inkUniforms,uEdge:{value:edge},uReveal:{value:0},uEnergy:{value:0},uCharge:{value:0},uCrystal:{value:0},uCrystalSweep:{value:0},uIntroTime:{value:0}},
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
      uniform float uReveal;
      uniform float uEnergy;
      uniform float uCharge;
      uniform float uCrystal;
      uniform float uCrystalSweep;
      uniform float uIntroTime;
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
        float lightBand=exp(-pow((identityPosition.y/uIdentityHeight+.5-mod(uIntroTime*.8,1.8))/.18,2.));
        vec3 energyColor=mix(vec3(.191,.423,.807),vec3(.807,.266,.337),clamp(uv.x+.15,0.,1.));
        energyColor=mix(energyColor,vec3(1.),lightBand*.45);
        energyColor=mix(energyColor,vec3(1.),uCharge);
        // A few fixed triangular facets are revealed by a passing reflection.
        // Only the existing filled geometry is shaded; no borders or noise.
        vec2 crystalPosition=identityPosition/uIdentityHeight*7.5;
        vec2 lattice=vec2(crystalPosition.x-crystalPosition.y*.57735,crystalPosition.y*1.1547);
        vec2 cell=floor(lattice),f=fract(lattice);
        float triangle=step(1.,f.x+f.y);
        float facet=fract(sin(dot(cell+vec2(triangle*.37,triangle*.71),vec2(127.1,311.7)))*43758.5453);
        float reflection=exp(-pow((uv.x*.74+uv.y*.64-mix(-.1,1.7,uCrystalSweep))/.10,2.));
        float facetLight=reflection*(.045+pow(facet,4.)*.27);
        energyColor*=1.+(facet-.5)*.16*uCrystal;
        energyColor+=mix(vec3(.72,.88,1.),vec3(1.,.86,.91),facet)*facetLight*uCrystal;
        gl_FragColor=vec4(mix(linearInk,energyColor,uEnergy),uReveal);
        #include <colorspace_fragment>
      }
    `,
    transparent:true,depthWrite:false,toneMapped:false
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
    new SVGLoader().loadAsync('/ucl-g.svg'),
    new SVGLoader().loadAsync('/ucl-wordmark.svg'),
    fetch('/ucl-opal.frag').then(r=>{if(!r.ok)throw new Error('Opal field unavailable');return r.text();})
  ]);
  background=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  backgroundScene=new THREE.Scene();backgroundCamera=new THREE.Camera();
  const hex=h=>new THREE.Vector3(...[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255));
  backgroundMaterial=new THREE.ShaderMaterial({
    uniforms:{resolution:{value:new THREE.Vector2(1,1)},phase:{value:0},paper:{value:hex('#fcfcfd')},colorA:{value:hex('#a9cffe')},colorB:{value:hex('#ddaae9')},colorC:{value:hex('#f4d196')}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:frag.replace('gl_FragColor=vec4(color,1.);','vec3 linearColor=mix(color/12.92,pow((color+.055)/1.055,vec3(2.4)),step(vec3(.04045),color));\ngl_FragColor=vec4(linearColor,clamp((iridescence*.65+sheen*.35)*quiet,0.,1.));'),
    depthTest:false,depthWrite:false,toneMapped:false
  });
  backgroundScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),backgroundMaterial));
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
    uniforms:{map:{value:background.texture},uDay:{value:0},uFlash:{value:0},uCharge:{value:0},uJet:{value:0},uJetReach:{value:0},uJetAngle:{value:Math.PI/2},uProjection:{value:0},uProjectionSpread:{value:0},uCenter:{value:new THREE.Vector2(.5,.5)},uAspect:{value:new THREE.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}',
    fragmentShader:"uniform sampler2D map;\nuniform float uDay;\nuniform float uFlash;\nuniform float uCharge;\nuniform float uJet;\nuniform float uJetReach;\nuniform float uJetAngle;\nuniform float uProjection;\nuniform float uProjectionSpread;\nuniform vec2 uCenter;\nuniform vec2 uAspect;\nvarying vec2 vUv;\n\nvec3 toSRGB(vec3 c) {\n  return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));\n}\nvec3 toLinear(vec3 c) {\n  return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));\n}\n\nvoid main() {\n  vec4 opalSample=texture2D(map,vUv);\n  vec3 field=opalSample.rgb;\n  // Invert the actual animated Opal field in display space, then darken it.\n  // Working directly in linear RGB would produce the wrong complement.\n  vec3 dusk=toLinear((vec3(1.)-toSRGB(field))*.82);\n  vec2 offset=(vUv-uCenter)*uAspect;\n  float distanceFromMark=length(offset);\n  float reach=length(max(uCenter,vec2(1.)-uCenter)*uAspect);\n  float progress=clamp(uDay,0.,1.);\n  float travel=progress;\n  float front=mix(-.16,reach+.32,travel);\n  float opened=1.-smoothstep(front-.20,front+.12,distanceFromMark);\n  opened*=smoothstep(0.,.08,progress);\n\n  // A soft, widening pressure front opens the light background. There is no\n  // hard circle or fullscreen flash; the wave shares the mark's exact center.\n  float wake=exp(-pow((distanceFromMark-front)/.12,2.));\n  float fine=exp(-pow((distanceFromMark-front)/.035,2.));\n  float angle=atan(offset.y,offset.x);\n  float accent=.5+.5*sin(angle+progress*1.3);\n  vec3 blue=toLinear(vec3(121.,174.,232.)/255.);\n  vec3 rose=toLinear(vec3(232.,141.,157.)/255.);\n  vec3 light=mix(blue,rose,accent);\n  float envelope=smoothstep(0.,.12,progress)*(1.-smoothstep(.64,1.,progress));\n  vec3 color=mix(dusk,field,opened);\n  color+=(light*wake*.15+mix(light,vec3(1.),.35)*fine*.07)*envelope;\n  // Charge stays local to the mark. The one release impulse is brief and\n  // centered; no full-screen strobe or camera shake is needed for force.\n  color+=light*exp(-pow(distanceFromMark/.18,2.))*uCharge*.045;\n  color+=mix(light,vec3(1.),.7)*exp(-pow(distanceFromMark/.27,2.))*uFlash*.42;\n  // The final accent uses paired, gently sweeping lighthouse beams. White\n  // in their narrow cores, blue/rose in the surrounding scattered light.\n  vec2 axis=vec2(cos(uJetAngle),sin(uJetAngle));\n  float along=dot(offset,axis);\n  float across=abs(dot(offset,vec2(-axis.y,axis.x)));\n  float reachMask=1.-smoothstep(uJetReach*reach*1.6,uJetReach*reach*1.6+.10,abs(along));\n  float spine=exp(-pow(across/(.009+abs(along)*.013),2.));\n  float veil=exp(-pow(across/(.035+abs(along)*.057),2.));\n  vec3 poleColor=mix(rose,blue,smoothstep(-.06,.06,along));\n  color+=(mix(poleColor,vec3(1.),.8)*spine*.64+poleColor*veil*.27)*uJet*reachMask;\n  // The actual Opal renderer stores its existing iridescent ribbon in alpha.\n  // Let the narrow beam's last light spread onto that same moving surface,\n  // rather than inventing a second wave or a separately timed color field.\n  float projectionMask=exp(-pow(across/mix(.055,.62,uProjectionSpread),2.));\n  float projected=opalSample.a*projectionMask*uProjection;\n  vec3 projectedHue=mix(vec3(.48,.68,1.),vec3(1.,.76,.46),smoothstep(-.02,.02,field.r-field.b));\n  color+=(vec3(1.)-field)*projectedHue*projected*.42;\n  // Exact endpoint: preserve the original Opal renderer, including its grain.\n  if(progress>=1.)color=field;\n  gl_FragColor=vec4(color,1.);\n  #include <colorspace_fragment>\n}\n",
    depthWrite:false,depthTest:false,toneMapped:false
  }));
  backdropMaterial=backdrop.material;
  backdrop.frustumCulled=false;backdrop.renderOrder=-1000;scene.add(backdrop);

  inkUniforms.uOpalField.value=background.texture;
  const front=material();
  const edge=material(1);
  markSurface=front;markEdge=edge;
  mark=new THREE.Group();
  markParts=makeParts(g,{depth:5,bevel:.7,curveSegments:10,center:[128,128]},front,edge);
  markParts.forEach(p=>mark.add(p.mesh));scene.add(mark);
  name=new THREE.Group();
  // The wordmark shares the exact same continuous field as the symbol.
  nameSurface=material();
  nameEdge=material(1);
  letters=makeParts(n,{depth:1.5,bevel:.85,curveSegments:8,center:[757.878,45.0115]},nameSurface,nameEdge);
  name.add(combineWordmark(letters));scene.add(name);
  emergence=createEmergence({scene,mark,svgData:g,renderer});
  crystalGlints=createCrystalGlints({mark,svgData:g,renderer});
  // A soft spill from the same filled silhouette; it never adds a new outline.
  const energyCanvas=document.createElement('canvas');energyCanvas.width=512;energyCanvas.height=512;
  const energyContext=energyCanvas.getContext('2d');energyContext.scale(2,2);
  energyContext.shadowColor='#79aee8';energyContext.shadowBlur=18;
  const energyGradient=energyContext.createLinearGradient(0,0,256,256);energyGradient.addColorStop(0,'#79aee8');energyGradient.addColorStop(1,'#e88d9d');energyContext.fillStyle=energyGradient;
  for(const path of g.paths){const d=path.userData?.node?.getAttribute('d');if(d)energyContext.fill(new Path2D(d));}
  const energyTexture=new THREE.CanvasTexture(energyCanvas);energyTexture.colorSpace=THREE.SRGBColorSpace;
  energyGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:energyTexture,transparent:true,opacity:0,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  energyGlow.scale.set(256,256,1);energyGlow.position.z=-4;energyGlow.renderOrder=-1;mark.add(energyGlow);
  const edgePoints=[],edgeDistances=[];
  for(const path of g.paths)for(const shape of SVGLoader.createShapes(path)){
    const points=shape.getSpacedPoints(160);
    for(let i=0;i<points.length-1;i++){
      for(const k of [i,i+1]){edgePoints.push(points[k].x-128,128-points[k].y,4.5);edgeDistances.push(k/(points.length-1));}
    }
  }
  const traceGeometry=new THREE.BufferGeometry();traceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(edgePoints,3));traceGeometry.setAttribute('aDistance',new THREE.Float32BufferAttribute(edgeDistances,1));
  const traceMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0}},vertexShader:'attribute float aDistance;varying float vDistance;void main(){vDistance=aDistance;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;uniform float uOpacity;varying float vDistance;void main(){float d=abs(fract(vDistance-uTime*.72+.5)-.5);float light=exp(-pow(d/.06,2.));vec3 tint=mix(vec3(.191,.423,.807),vec3(.807,.266,.337),vDistance);gl_FragColor=vec4(mix(tint,vec3(1.),light*.6),uOpacity*(.08+light*.92));\n#include <colorspace_fragment>\n}',transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  energyTrace=new THREE.LineSegments(traceGeometry,traceMaterial);energyTrace.renderOrder=20;mark.add(energyTrace);
  markFocusPass=createMarkFocus({renderer,scene,camera,mark,exclude:[emergence.group]});

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
  await markFocusPass.compile();
  state.ready=true;
  if(reduced.matches)state.time=INTRO_END;
  else if(params.has('at'))state.time=clamp(Number(params.get('at'))||0,0,INTRO_END);
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
  markFocusPass?.resize(innerWidth,innerHeight);
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
  if(!home||(homeView?.scrollTop||0)>12)state.time=INTRO_END;
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
  groundGlow.material.opacity=.25*smooth((state.time-5.5)/1.1);
  name.visible=home&&state.composition==='signature';
  name.rotation.set(0,0,0);
  const clock=reduced.matches?INTRO_END:state.time;
  const motion=motionAt(clock),t=motion.scene;
  mark.scale.setScalar(markPx/208*unit*motion.markScale);
  logoBlur=t<5.75?0:motion.markBlur;
  root.dataset.logoScale=motion.markScale.toFixed(4);
  root.dataset.logoBlur=logoBlur.toFixed(4);
  const markAlpha=smooth((t-5.75)/.8);
  const energy=1.-smooth((t-7.0)/1.8);
  for(const m of [markSurface,markEdge]){
    m.uniforms.uReveal.value=markAlpha;
    m.uniforms.uEnergy.value=energy;
    m.uniforms.uCharge.value=motion.charge*.4+motion.flash*.7;
    m.uniforms.uCrystal.value=motion.crystal;
    m.uniforms.uCrystalSweep.value=motion.crystalSweep;
    m.uniforms.uIntroTime.value=t;
  }
  for(const m of [nameSurface,nameEdge])m.uniforms.uReveal.value=smooth((clock-5.15)/1.45);
  energyGlow.material.opacity=smooth((t-5.6)/.65)*(1.-smooth((t-6.8)/1.3))*(.32+motion.charge*.18+motion.flash*.52);
  energyTrace.material.uniforms.uTime.value=t-5.6;
  energyTrace.material.uniforms.uOpacity.value=smooth((t-5.85)/.35)*(1.-smooth((t-6.9)/.9))*(.85-motion.crystal*.27);
  backdropMaterial.uniforms.uDay.value=motion.release;
  backdropMaterial.uniforms.uFlash.value=motion.flash;
  backdropMaterial.uniforms.uCharge.value=motion.charge;
  backdropMaterial.uniforms.uJet.value=motion.jet;
  backdropMaterial.uniforms.uJetReach.value=motion.jetReach;
  backdropMaterial.uniforms.uJetAngle.value=motion.jetAngle;
  backdropMaterial.uniforms.uProjection.value=motion.projection;
  backdropMaterial.uniforms.uProjectionSpread.value=motion.projectionSpread;
  backdropMaterial.uniforms.uCenter.value.set(.5,.5+mark.position.y/(unit*innerHeight));
  backdropMaterial.uniforms.uAspect.value.set(innerWidth/Math.min(innerWidth,innerHeight),innerHeight/Math.min(innerWidth,innerHeight));
  emergence.update({time:clock,width:innerWidth,height:innerHeight,markPx:markPx*motion.markScale,markScale:motion.markScale,home,scrollPx:homeView?.scrollTop||0});
  crystalGlints.update({time:clock,home,focus:motion.markFocus});
  root.dataset.intro=phaseAt(clock);
  root.style.setProperty('--intro-cue',smooth((clock-5.2)/1.4));

}

function draw(){
  if(!state.ready)return;
  pose();
  backgroundMaterial.uniforms.phase.value=state.ambient/LOOP;
  renderer.setRenderTarget(background);renderer.render(backgroundScene,backgroundCamera);
  renderer.setRenderTarget(null);markFocusPass.render(logoBlur);
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
  if(!state.paused&&!reduced.matches){state.time=Math.min(INTRO_END,state.time+dt*motionRate);state.ambient=(state.ambient+dt*motionRate)%LOOP;}
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
  if(reduced.matches){state.time=INTRO_END;compositionAmount=state.composition==='signature'?1:0;}
  if((!state.paused&&!reduced.matches)||compositionAmount!==(state.composition==='signature'?1:0))frame=requestAnimationFrame(animate);
  draw();report();
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='ucl-identity')return;
  const d=event.data;
  if(d.composition==='mark'||d.composition==='signature'){state.composition=d.composition;root.dataset.composition=state.composition;}
  if(typeof d.paused==='boolean')state.paused=d.paused;
  if(d.replay){homeView?.scrollTo({top:0,behavior:'instant'});state.time=0;state.ambient=0;}
  if(Number.isFinite(d.seek)){state.time=clamp(d.seek,0,INTRO_END);state.ambient=state.time%LOOP;}
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
