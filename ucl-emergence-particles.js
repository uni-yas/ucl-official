import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { INTRO_END, RELEASE_AT, motionAt } from './ucl-emergence-timing.js?v=emergence-20261012-1';

// The intro lives in the approved mark's coordinate system. No replacement
// outline is drawn: every arrival point is on an actual filled SVG triangle.
const PARTICLES = 960;
const NETWORK_NODES = 150;
const MAX_LINKS = 128;
const COMPLETE = INTRO_END;
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function trianglesFromSVG(svgData) {
  const triangles = [];
  let totalArea = 0;
  for (const path of svgData.paths) {
    if (path.userData?.style?.fill === 'none') continue;
    for (const shape of SVGLoader.createShapes(path)) {
      // ShapeGeometry preserves holes as well as concave polygon boundaries.
      const geometry = new THREE.ShapeGeometry(shape, 10);
      const positions = geometry.getAttribute('position');
      const indices = geometry.index;
      const count = indices ? indices.count : positions.count;
      for (let i = 0; i < count; i += 3) {
        const a = indices ? indices.getX(i) : i;
        const b = indices ? indices.getX(i + 1) : i + 1;
        const c = indices ? indices.getX(i + 2) : i + 2;
        const ax = positions.getX(a), ay = positions.getY(a);
        const bx = positions.getX(b), by = positions.getY(b);
        const cx = positions.getX(c), cy = positions.getY(c);
        const area = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) * .5;
        if (area < 1e-8) continue;
        totalArea += area;
        triangles.push({ ax, ay, bx, by, cx, cy, end: totalArea });
      }
      geometry.dispose();
    }
  }
  if (!triangles.length) throw new Error('The emergence effect requires a filled SVG mark.');
  return { triangles, totalArea };
}

const pointVertex = `
  attribute float aSize;
  attribute float aSeed;
  attribute float aBokeh;
  attribute float aNode;
  attribute vec3 aTint;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uGather;
  uniform float uEnergy;
  uniform float uOpacity;
  uniform float uHalo;
  uniform float uRelease;
  uniform float uFocus;
  varying vec3 vTint;
  varying float vAlpha;
  varying float vBokeh;
  varying float vNode;
  void main() {
    vec4 eye = modelViewMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * eye;
    float settledSize = mix(.72, 1.18, aSeed);
    float diameter = mix(aSize, settledSize, uGather);
    diameter = mix(diameter, 1.1 + aSeed * 1.6, uRelease);
    float wave = .5 + .5 * sin(position.y * .036 + position.x * .013 - uTime * 3.1);
    diameter *= 1. + uEnergy * wave * .25;
    // Defocus is tied to actual camera depth, not a larger decorative halo.
    // Near particles spread their core and lose the bright pinpoint. The
    // focus plane becomes the logo surface as the cloud gathers.
    float nearDefocus = smoothstep(.65, 1.80, 10.6 + eye.z) * aNode * (1. - uGather) * (1. - uFocus);
    float coreDiameter = diameter + nearDefocus * 5.5;
    float perspective = mix(clamp(10.6 / max(.1, -eye.z), .72, 1.42), 1., uGather);
    float haloScale = mix(mix(6., 2.8, aNode), 7.5, uGather);
    float haloDiameter = diameter * haloScale + nearDefocus * 2.;
    gl_PointSize = max(.65, mix(coreDiameter, haloDiameter, uHalo) * uPixelRatio * perspective);
    vBokeh = nearDefocus;
    vNode = aNode * (1. - uGather);
    vTint = mix(aTint, vec3(1.), uEnergy * wave * .14);
    float quietFlicker = .83 + .17 * sin(uTime * (.34 + aSeed * .25) + aSeed * 35.);
    vAlpha = uOpacity * quietFlicker * mix(.70, 1., aSeed);
    // Only the graph's real nodes are prominent at first. The remaining
    // samples become visible as they are recruited into the forming mark.
    float hierarchy = mix(mix(.12, .23, aSeed), mix(.82, 1.35, aSeed), aNode);
    vAlpha *= mix(hierarchy, 1., uGather);
    vAlpha *= mix(clamp(perspective, .8, 1.15), 1., uGather);
    vAlpha *= 1. + uEnergy * (.35 + wave * .85);
    vAlpha *= mix(1., .16 + uEnergy * .035, uHalo);
    vAlpha *= mix(1., .32, vBokeh);
    vAlpha *= mix(1., aNode, uRelease);
    vAlpha *= 1. + uFocus * (1. - uGather) * (1. - uRelease) * .10;
  }
`;

const pointFragment = `
  varying vec3 vTint;
  varying float vAlpha;
  varying float vBokeh;
  varying float vNode;
  uniform float uHalo;
  uniform float uFocus;
  void main() {
    vec2 p = gl_PointCoord * 2. - 1.;
    float radius2 = dot(p, p);
    if (radius2 > 1.) discard;
    float sharpness = mix(5.6, mix(3.8, 5.8, uFocus), vNode * (1. - uHalo));
    float shape = exp(-radius2 * mix(sharpness, 2.2, vBokeh));
    shape *= 1. - smoothstep(.62, 1., radius2);
    vec3 color = mix(vTint, vec3(1.), (1. - uHalo) * .18 * (1. - vBokeh * .42));
    gl_FragColor = vec4(color, shape * vAlpha);
    #include <colorspace_fragment>
  }
`;

const lineVertex = `
  attribute float aAlpha;
  attribute vec3 aTint;
  uniform float uFocus;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vec4 eye = modelViewMatrix * vec4(position, 1.);
    vAlpha = aAlpha * mix(1., .35, smoothstep(.65, 1.80, 10.6 + eye.z) * (1. - uFocus));
    vTint = aTint;
    gl_Position = projectionMatrix * eye;
  }
`;

const lineFragment = `
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    gl_FragColor = vec4(vTint, vAlpha);
    #include <colorspace_fragment>
  }
`;

export function createEmergence({ scene, mark, svgData, renderer }) {
  if (!scene || !mark || !renderer) throw new Error('Emergence requires the identity scene, mark and renderer.');
  const random = randomGenerator(0x55434c31);
  const { triangles, totalArea } = trianglesFromSVG(svgData);
  const position = new Float32Array(PARTICLES * 3);
  const targets = new Float32Array(PARTICLES * 3);
  const origin = new Float32Array(PARTICLES * 3);
  const sizes = new Float32Array(PARTICLES);
  const seeds = new Float32Array(PARTICLES);
  const bokeh = new Float32Array(PARTICLES);
  const nodeFlags = new Float32Array(PARTICLES);
  const nodeIndices = Array.from({ length: NETWORK_NODES }, (_, n) => Math.floor(n * PARTICLES / NETWORK_NODES));
  for (const index of nodeIndices) nodeFlags[index] = 1;
  const tints = new Float32Array(PARTICLES * 3);
  const delays = new Float32Array(PARTICLES);
  const bends = new Float32Array(PARTICLES);
  const phases = new Float32Array(PARTICLES);
  // Reuse the official Contact animation's blue and rose, alongside white.
  const colors = [new THREE.Color('#79aee8'), new THREE.Color('#e88d9d'), new THREE.Color('#ffffff')];

  for (let i = 0; i < PARTICLES; i++) {
    const p = i * 3;
    const area = random() * totalArea;
    let low = 0, high = triangles.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (triangles[mid].end < area) low = mid + 1;
      else high = mid;
    }
    const triangle = triangles[low];
    const r = Math.sqrt(random()), v = random();
    const a = 1 - r, b = r * (1 - v), c = r * v;
    targets[p] = triangle.ax * a + triangle.bx * b + triangle.cx * c - 128;
    targets[p + 1] = 128 - (triangle.ay * a + triangle.by * b + triangle.cy * c);
    targets[p + 2] = 3.7 + random() * .25;
    // A restrained, asymmetric cloud: full-width, with breathing room above
    // the navigation. The normalized origins are stable across resize/seek.
    origin[p] = random() - .5;
    origin[p + 1] = random() - .5;
    origin[p + 2] = (random() - .5) * 185;
    sizes[i] = .88 + Math.pow(random(), 2) * 1.55;
    seeds[i] = random();
    bokeh[i] = random() < .028 ? 1 : 0;
    if (bokeh[i]) sizes[i] = 4.2 + random() * 3.5;
    delays[i] = random() * .5;
    bends[i] = (random() - .5) * .32;
    phases[i] = random() * TAU;
    const color = colors[random() < .12 ? 2 : (random() < .58 ? 0 : 1)];
    color.toArray(tints, p);
  }

  // This changes presentation only; the original random sequence, SVG
  // sampling and final-size seed remain identical to the first version.
  for (let i = 0; i < PARTICLES; i++) {
    // Keep the deterministic SVG sample/trajectory sequence unchanged while
    // giving the three requested light colors a clear, balanced presence.
    colors[i % 10 < 4 ? 2 : i % 10 < 7 ? 0 : 1].toArray(tints, i * 3);
    if (nodeFlags[i]) {
      // Small focused cores. A sparse foreground layer crosses the camera's
      // focus plane; its blur is computed in the shader from that depth.
      sizes[i] = 2.8 + Math.pow(seeds[i], .6) * 1.8;
      origin[i * 3 + 2] *= 2.3;
      if (bokeh[i] || seeds[i] > .86) {
        origin[i * 3 + 2] = 300 + seeds[i] * 160;
      }
    } else {
      bokeh[i] = 0;
      sizes[i] = .78 + seeds[i] * .66;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aBokeh', new THREE.BufferAttribute(bokeh, 1));
  geometry.setAttribute('aNode', new THREE.BufferAttribute(nodeFlags, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
  const shared = {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uGather: { value: 0 },
    uEnergy: { value: 0 },
    uOpacity: { value: 0 },
    uRelease: { value: 0 },
    uFocus: { value: 0 }
  };
  const makePointMaterial = halo => new THREE.ShaderMaterial({
    uniforms: { ...shared, uHalo: { value: halo } },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const haloMaterial = makePointMaterial(1);
  const coreMaterial = makePointMaterial(0);
  const halos = new THREE.Points(geometry, haloMaterial);
  const cores = new THREE.Points(geometry, coreMaterial);
  halos.frustumCulled = cores.frustumCulled = false;
  halos.renderOrder = 30;
  cores.renderOrder = 32;

  // Build a sparse proximity graph once. It connects the initial cloud, not
  // arbitrary far-apart samples, and cannot produce a dense triangulated web.
  const candidates = [];
  const used = new Set();
  for (let n = 0; n < NETWORK_NODES; n++) {
    const a = nodeIndices[n];
    const neighbors = [];
    for (let m = 0; m < NETWORK_NODES; m++) {
      if (n === m) continue;
      const b = nodeIndices[m];
      const dx = origin[a * 3] - origin[b * 3];
      const dy = (origin[a * 3 + 1] - origin[b * 3 + 1]) * 1.7;
      neighbors.push({ b, distance: dx * dx + dy * dy });
    }
    neighbors.sort((a, b) => a.distance - b.distance);
    for (const { b, distance } of neighbors.slice(0, 2)) {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (used.has(key) || distance > .045) continue;
      used.add(key);
      candidates.push({ a, b, distance, birth: 1.8 + random() * 1.08, strength: .40 + random() * .60 });
    }
  }
  // Spatially distributed links, rather than only the shortest cluster.
  const links = candidates
    .map(link => ({ ...link, order: random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_LINKS);
  const linePositions = new Float32Array(links.length * 6);
  const lineAlpha = new Float32Array(links.length * 2);
  const lineTints = new Float32Array(links.length * 6);
  for (let i = 0; i < links.length; i++) {
    const color = colors[i % 7 === 0 ? 1 : 0];
    color.toArray(lineTints, i * 6);
    color.toArray(lineTints, i * 6 + 3);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  lineGeometry.setAttribute('aTint', new THREE.BufferAttribute(lineTints, 3));
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: { uFocus: shared.uFocus },
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const network = new THREE.LineSegments(lineGeometry, lineMaterial);
  network.frustumCulled = false;
  network.renderOrder = 31;
  const group = new THREE.Group();
  group.name = 'UCL light emergence';
  group.add(halos, network, cores);
  mark.add(group);

  let disposed = false;
  const stats = Object.freeze({
    particles: PARTICLES,
    networkNodes: NETWORK_NODES,
    foregroundBokeh: bokeh.reduce((sum, value) => sum + value, 0),
    links: links.length,
    drawCalls: 3,
    triangles: triangles.length,
    sampledArea: +totalArea.toFixed(3),
    duration: COMPLETE,
    seed: 'UCL1'
  });

  function update({ time, width, height, markPx, markScale = 1, home = true, scrollPx = 0 }) {
    if (disposed) return;
    const clock = Math.max(0, Number.isFinite(time) ? time : COMPLETE);
    const motion = motionAt(clock);
    const t = motion.scene;
    group.visible = home && clock < COMPLETE && markPx > 0;
    if (!group.visible) return;
    // scrollPx intentionally needs no compensation: the parent's mark pose
    // already scrolls with the home hero, including its entire particle field.
    void scrollPx;
    const localPerPixel = 208 / Math.max(1, markPx);
    const spanX = Math.max(1, width) * .90 * localPerPixel;
    const spanY = Math.max(1, height) * .70 * localPerPixel;
    const drift = Math.min(spanX, spanY) * .034;
    const gather = smooth(3.3, 6, t);
    const energy = smooth(5.90, 6.10, t) * (1 - smooth(6.10, 6.45, t));
    const releasing = clock >= RELEASE_AT;
    const release = motion.release;
    shared.uTime.value = t;
    shared.uPixelRatio.value = renderer.getPixelRatio();
    shared.uGather.value = releasing ? 0 : gather;
    shared.uEnergy.value = energy + motion.tension * .12;
    shared.uRelease.value = releasing ? 1 : 0;
    shared.uFocus.value = motion.focus;
    // Hand the fully assembled particles to the parent's continuous luminous
    // SVG surface. Preserve the formation through 5.9 s, then remove grain:
    // fade to zero before the release begins at 6.65 s, with no handoff jump.
    const surfaceHandoff = Math.pow(1 - smooth(6.05, 6.65, t), 3);
    shared.uOpacity.value = releasing
      ? motion.releaseLight * 1.4
      : smooth(0, .72, t) * surfaceHandoff * (1 + motion.tension * .28);

    for (let i = 0; i < PARTICLES; i++) {
      const p = i * 3;
      if (releasing) {
        // A sparse return of the same lights: radiate from points on the
        // completed glyph, leaving the continuous logo surface in place.
        const tx = targets[p], ty = targets[p + 1];
        const axial = i % 5 !== 0;
        const angle = axial
          ? motion.jetAngle + (ty < 0 ? Math.PI : 0) + bends[i] * .30
          : Math.atan2(ty, tx) + bends[i] * .35;
        const launch = clamp((release - delays[i] * .025) / (1 - delays[i] * .025));
        const distance = launch * Math.hypot(spanX, spanY) * (axial ? .88 + seeds[i] * .16 : .48 + seeds[i] * .14);
        position[p] = tx + Math.cos(angle) * distance;
        position[p + 1] = ty + Math.sin(angle) * distance;
        position[p + 2] = targets[p + 2] + Math.sin(launch * Math.PI) * 20;
        continue;
      }
      const start = 3.3 + delays[i];
      const scatterTime = Math.min(t, start);
      const phase = phases[i];
      // One gentle outward breath, held at the expanded position. Each
      // curved inward path starts there; no second recoil or reset is added.
      const breath = smooth(2.75, 3.25, scatterTime);
      const expansion = 1 + breath * .13;
      const ox = (origin[p] * spanX + Math.sin(scatterTime * .39 + phase) * drift) * expansion;
      const oy = (origin[p + 1] * spanY + Math.cos(scatterTime * .29 + phase * 1.31) * drift) * expansion;
      // The screen-spanning cloud retains its original depth while only its
      // destination glyph is compressed; otherwise the opening loses DOF.
      const oz = (origin[p + 2] + Math.sin(scatterTime * .31 + phase) * 15) * (1 + breath * .06) / markScale;
      if (t <= start) {
        position[p] = ox;
        position[p + 1] = oy;
        position[p + 2] = oz;
      } else if (t >= 6) {
        position[p] = targets[p];
        position[p + 1] = targets[p + 1];
        position[p + 2] = targets[p + 2];
      } else {
        // Soft, individually curved paths. Both ends have zero velocity;
        // there is no late orbit or overshoot that would blur the glyph gaps.
        const u = smooth(start, 6, t);
        const v = 1 - u;
        const b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
        const tx = targets[p], ty = targets[p + 1], tz = targets[p + 2];
        const dx = tx - ox, dy = ty - oy;
        const bend = bends[i];
        const c1x = ox + dx * .35 - dy * bend;
        const c1y = oy + dy * .35 + dx * bend;
        const c2x = tx - dx * .075 - dy * bend * .22;
        const c2y = ty - dy * .075 + dx * bend * .22;
        position[p] = b0 * ox + b1 * c1x + b2 * c2x + b3 * tx;
        position[p + 1] = b0 * oy + b1 * c1y + b2 * c2y + b3 * ty;
        position[p + 2] = b0 * oz + b1 * (oz * .72 + 18) + b2 * (tz + 13) + b3 * tz;
      }
    }
    geometry.getAttribute('position').needsUpdate = true;

    network.visible = t >= 1.8 && t < 5.5;
    if (network.visible) {
      const departure = 1 - smooth(3.9, 5.5, t);
      for (let i = 0; i < links.length; i++) {
        const link = links[i], a = link.a * 3, b = link.b * 3, p = i * 6;
        const arrival = smooth(link.birth, link.birth + .44, t);
        linePositions[p] = position[a];
        linePositions[p + 1] = position[a + 1];
        linePositions[p + 2] = position[a + 2];
        // Draw each connection from its source toward its neighbor, softly.
        linePositions[p + 3] = position[a] + (position[b] - position[a]) * arrival;
        linePositions[p + 4] = position[a + 1] + (position[b + 1] - position[a + 1]) * arrival;
        linePositions[p + 5] = position[a + 2] + (position[b + 2] - position[a + 2]) * arrival;
        const alpha = arrival * departure * link.strength * .25 * (1 + motion.tension * .45);
        lineAlpha[i * 2] = alpha * .78;
        lineAlpha[i * 2 + 1] = alpha;
      }
      lineGeometry.getAttribute('position').needsUpdate = true;
      lineGeometry.getAttribute('aAlpha').needsUpdate = true;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mark.remove(group);
    geometry.dispose();
    lineGeometry.dispose();
    coreMaterial.dispose();
    haloMaterial.dispose();
    lineMaterial.dispose();
  }

  return { update, dispose, stats, group };
}
