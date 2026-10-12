import * as THREE from 'three';

const MARK_LAYER = 1;
const MAX_BLUR_CSS_PX = 4;
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0., 1.);
  }
`;

// Five bilinear samples implement a normalized, separable nine-tap Gaussian.
// Both color and coverage remain premultiplied in linear light while filtering.
const gaussian = `
  uniform sampler2D map;
  uniform vec2 stepUv;
  varying vec2 vUv;
  vec4 filtered() {
    vec4 color = texture2D(map, vUv) * .2270270270;
    color += texture2D(map, vUv + stepUv * 1.3846153846) * .3162162162;
    color += texture2D(map, vUv - stepUv * 1.3846153846) * .3162162162;
    color += texture2D(map, vUv + stepUv * 3.2307692308) * .0702702703;
    color += texture2D(map, vUv - stepUv * 3.2307692308) * .0702702703;
    return color;
  }
`;

/**
 * Defocus only the existing mark, including its attached light and reflections.
 * Construct after those children exist. Excluded particle subtrees stay sharp.
 * resize() follows renderer.setSize(); render() replaces the main scene render.
 */
export function createMarkFocus({ renderer, scene, camera, mark, exclude = [] }) {
  if (!renderer || !scene || !camera || !mark) {
    throw new Error('Mark focus requires the existing renderer, scene, camera and mark.');
  }

  const originalLayers = new Map();
  const excluded = new Set(exclude.filter(Boolean));
  function assign(object, inheritedExclusion = false) {
    const skip = inheritedExclusion || excluded.has(object);
    originalLayers.set(object, object.layers.mask);
    object.layers.set(skip ? 0 : MARK_LAYER);
    for (const child of object.children) assign(child, skip);
  }
  assign(mark);

  const targetOptions = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false
  };
  const markTarget = new THREE.WebGLRenderTarget(1, 1, {
    ...targetOptions, depthBuffer: true, samples: 4
  });
  const horizontalTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const verticalTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const targets = [markTarget, horizontalTarget, verticalTarget];
  for (const target of targets) target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  markTarget.texture.name = 'mark-focus-linear-source';
  horizontalTarget.texture.name = 'mark-focus-horizontal';
  verticalTarget.texture.name = 'mark-focus-vertical';

  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: markTarget.texture }, stepUv: { value: new THREE.Vector2() } },
    vertexShader,
    fragmentShader: `${gaussian}\nvoid main() { gl_FragColor = filtered(); }`,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false
  });
  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: verticalTarget.texture } },
    vertexShader,
    fragmentShader: `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        vec4 premultiplied = texture2D(map, vUv);
        float coverage = clamp(premultiplied.a, 0., 1.);
        if (coverage < .00001) discard;
        // Convert straight linear color, then premultiply in output space.
        // Encoding an already premultiplied value would brighten soft edges.
        gl_FragColor = vec4(premultiplied.rgb / max(premultiplied.a, .00001), coverage);
        #include <colorspace_fragment>
        gl_FragColor.rgb *= gl_FragColor.a;
      }
    `,
    transparent: true,
    premultipliedAlpha: true,
    blending: THREE.NormalBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const passScene = new THREE.Scene();
  const passCamera = new THREE.Camera();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  plane.frustumCulled = false;
  passScene.add(plane);
  const bufferSize = new THREE.Vector2();
  let disposed = false;

  function resize(width, height) {
    if (disposed) return;
    // The drawing buffer is authoritative, including DPR and device rounding.
    renderer.getDrawingBufferSize(bufferSize);
    const pixelRatio = renderer.getPixelRatio();
    const w = Math.max(1, Math.round(bufferSize.x || width * pixelRatio || 1));
    const h = Math.max(1, Math.round(bufferSize.y || height * pixelRatio || 1));
    if (markTarget.width === w && markTarget.height === h) return;
    for (const target of targets) target.setSize(w, h);
  }

  function captureState() {
    return {
      target: renderer.getRenderTarget(),
      cubeFace: renderer.getActiveCubeFace(),
      mipLevel: renderer.getActiveMipmapLevel(),
      clearColor: renderer.getClearColor(new THREE.Color()),
      clearAlpha: renderer.getClearAlpha(),
      autoClear: renderer.autoClear,
      mask: camera.layers.mask,
      background: scene.background,
      viewport: renderer.getViewport(new THREE.Vector4()),
      scissor: renderer.getScissor(new THREE.Vector4()),
      scissorTest: renderer.getScissorTest()
    };
  }

  function restoreState(saved) {
    camera.layers.mask = saved.mask;
    scene.background = saved.background;
    renderer.autoClear = saved.autoClear;
    renderer.setClearColor(saved.clearColor, saved.clearAlpha);
    renderer.setRenderTarget(saved.target, saved.cubeFace, saved.mipLevel);
    renderer.setViewport(saved.viewport);
    renderer.setScissor(saved.scissor);
    renderer.setScissorTest(saved.scissorTest);
  }

  function render(blurCssPx = 0) {
    if (disposed) return;
    const radius = Number.isFinite(blurCssPx) ? Math.max(0, Math.min(MAX_BLUR_CSS_PX, blurCssPx)) : 0;
    const saved = captureState();
    try {
      if (radius === 0) {
        // The settled identity takes the exact original render path: no filter,
        // color conversion, extra render target or changed material remains.
        camera.layers.mask = saved.mask | 1 | (1 << MARK_LAYER);
        renderer.render(scene, camera);
        return;
      }

      resize();
      camera.layers.set(0);
      renderer.render(scene, camera);

      camera.layers.set(MARK_LAYER);
      scene.background = null;
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      renderer.setScissorTest(false);
      renderer.setRenderTarget(markTarget);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // sigma is expressed in CSS pixels, independent of the device density.
      const spacing = radius * renderer.getPixelRatio() / 1.7;
      plane.material = blurMaterial;
      blurMaterial.uniforms.map.value = markTarget.texture;
      blurMaterial.uniforms.stepUv.value.set(spacing / markTarget.width, 0);
      renderer.setRenderTarget(horizontalTarget);
      renderer.render(passScene, passCamera);
      blurMaterial.uniforms.map.value = horizontalTarget.texture;
      blurMaterial.uniforms.stepUv.value.set(0, spacing / markTarget.height);
      renderer.setRenderTarget(verticalTarget);
      renderer.render(passScene, passCamera);

      plane.material = compositeMaterial;
      renderer.setRenderTarget(saved.target, saved.cubeFace, saved.mipLevel);
      renderer.setViewport(saved.viewport);
      renderer.setScissor(saved.scissor);
      renderer.setScissorTest(saved.scissorTest);
      renderer.render(passScene, passCamera);
    } finally {
      restoreState(saved);
    }
  }

  async function compile() {
    if (disposed) return;
    const saved = captureState();
    try {
      resize();
      camera.layers.set(MARK_LAYER);
      scene.background = null;
      renderer.setRenderTarget(markTarget);
      await renderer.compileAsync(scene, camera);
      plane.material = blurMaterial;
      renderer.setRenderTarget(horizontalTarget);
      await renderer.compileAsync(passScene, passCamera);
      plane.material = compositeMaterial;
      renderer.setRenderTarget(saved.target, saved.cubeFace, saved.mipLevel);
      await renderer.compileAsync(passScene, passCamera);
    } finally {
      restoreState(saved);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const [object, mask] of originalLayers) object.layers.mask = mask;
    for (const target of targets) target.dispose();
    plane.geometry.dispose();
    blurMaterial.dispose();
    compositeMaterial.dispose();
  }

  resize();
  return { render, resize, compile, dispose };
}
