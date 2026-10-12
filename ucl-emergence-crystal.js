import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// A few reflections visit real corners of the approved glyph. They never
// replace its surface, draw a second outline, or remain on the final identity.
const FIRST_GLINT = 4.38;
const LAST_GLINT = 4.87;
const GLINT_DURATION = .10;
const MAX_GLINTS = 10;
const clamp = value => Math.max(0, Math.min(1, value));

function outlineCorners(svgData) {
  const corners = [];
  const seen = new Set();
  for (const path of svgData.paths) {
    if (path.userData?.style?.fill === 'none') continue;
    for (const shape of SVGLoader.createShapes(path)) {
      for (const contour of [shape, ...shape.holes]) {
        const points = contour.getPoints(16).filter((point, index, all) =>
          !index || point.distanceToSquared(all[index - 1]) > 1e-8);
        if (points.length > 1 && points[0].distanceToSquared(points.at(-1)) < 1e-8) points.pop();
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const before = points[(i + points.length - 1) % points.length];
          const after = points[(i + 1) % points.length];
          const incoming = point.clone().sub(before).normalize();
          const outgoing = after.clone().sub(point).normalize();
          const turn = Math.acos(Math.max(-1, Math.min(1, incoming.dot(outgoing))));
          if (turn < Math.PI / 7) continue;
          const key = `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          corners.push({
            x: point.x - 128,
            y: 128 - point.y,
            turn,
            // Turn each tiny reflection with its own physical edge.
            angle: -Math.atan2(outgoing.y, outgoing.x) + .18
          });
        }
      }
    }
  }
  if (!corners.length) return [];

  // Farthest-point sampling spreads reflections over the actual structure,
  // rather than collecting a bright cluster at its most intricate junction.
  corners.sort((a, b) => b.y - a.y || a.x - b.x);
  const selected = [corners.shift()];
  while (selected.length < MAX_GLINTS && corners.length) {
    let winner = 0;
    let best = -1;
    for (let i = 0; i < corners.length; i++) {
      const candidate = corners[i];
      const separation = Math.min(...selected.map(other =>
        (candidate.x - other.x) ** 2 + (candidate.y - other.y) ** 2));
      const score = separation * (.85 + candidate.turn / Math.PI * .15);
      if (score > best) { best = score; winner = i; }
    }
    selected.push(corners.splice(winner, 1)[0]);
  }
  // The lock catches light from the top, travelling clockwise around the mark.
  const clockwise = point => (Math.atan2(point.x, point.y) + Math.PI * 2) % (Math.PI * 2);
  return selected.sort((a, b) => clockwise(a) - clockwise(b));
}

const vertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aAngle;
  attribute vec3 aTint;
  uniform float uPixelRatio;
  varying float vSize;
  varying float vAlpha;
  varying float vAngle;
  varying vec3 vTint;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    gl_PointSize = aSize * uPixelRatio;
    vSize = aSize;
    vAlpha = aAlpha;
    vAngle = aAngle;
    vTint = aTint;
  }
`;

const fragmentShader = `
  varying float vSize;
  varying float vAlpha;
  varying float vAngle;
  varying vec3 vTint;
  void main() {
    if (vAlpha < .001) discard;
    vec2 p = (gl_PointCoord - .5) * vSize;
    float c = cos(vAngle), s = sin(vAngle);
    vec2 q = mat2(c, -s, s, c) * p;
    float r2 = dot(p, p);
    // The white core is about one CSS pixel across. Four narrow, fading
    // diffraction rays read as a reflection, not a solid decorative star.
    float core = exp(-r2 * 3.4);
    float horizontal = exp(-q.y * q.y / .045) * exp(-abs(q.x) * .64);
    float vertical = exp(-q.x * q.x / .045) * exp(-abs(q.y) * .91);
    float rays = (horizontal + vertical) * .29;
    float halo = exp(-r2 / 4.8) * .045;
    float edge = 1. - smoothstep(vSize * .30, vSize * .48, length(p));
    float alpha = min(1., core + rays + halo) * vAlpha * edge;
    vec3 color = mix(vTint, vec3(1.), clamp(core * 1.4, 0., 1.));
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function createCrystalGlints({ mark, svgData, renderer }) {
  if (!mark || !svgData?.paths || !renderer) {
    throw new Error('Crystal glints require the approved SVG mark and renderer.');
  }
  const corners = outlineCorners(svgData);
  const count = corners.length;
  const position = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const alpha = new Float32Array(count);
  const angle = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  const blue = new THREE.Color('#79aee8');
  const rose = new THREE.Color('#e88d9d');
  corners.forEach((corner, i) => {
    position.set([corner.x, corner.y, 4.8], i * 3);
    size[i] = 8.5 + ((i * 7) % 11) * .39;
    angle[i] = corner.angle;
    (i % 2 ? rose : blue).toArray(tint, i * 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'approved-mark-crystal-reflections';
  points.frustumCulled = false;
  points.renderOrder = 36;
  points.visible = false;
  mark.add(points);
  let disposed = false;

  function update({ time, home = true, focus = 1 }) {
    if (disposed) return;
    // These are actual playback seconds, not the remapped formation clock.
    points.visible = home && count > 0 && time >= FIRST_GLINT && time <= LAST_GLINT + GLINT_DURATION;
    if (!points.visible) return;
    material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    for (let i = 0; i < count; i++) {
      const start = FIRST_GLINT + (LAST_GLINT - FIRST_GLINT) * i / Math.max(1, count - 1);
      const phase = clamp((time - start) / GLINT_DURATION);
      // Short clean catch, then a slower loss of reflection; neighbouring
      // pulses overlap only briefly, so at most two points shine together.
      const rise = clamp(phase / .20);
      const fall = clamp((1 - phase) / .80);
      alpha[i] = .9 * (rise * rise * (3 - 2 * rise)) * fall * fall * focus;
    }
    geometry.getAttribute('aAlpha').needsUpdate = true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mark.remove(points);
    geometry.dispose();
    material.dispose();
  }

  return {
    update,
    dispose,
    stats: { glints: count, drawCalls: count ? 1 : 0, first: FIRST_GLINT, last: LAST_GLINT + GLINT_DURATION }
  };
}
