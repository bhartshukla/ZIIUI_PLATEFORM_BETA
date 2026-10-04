const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

class Lenis {
  constructor({ lerp: lerpFactor = 0.085, smoothWheel = true } = {}) {
    this.lerpFactor = lerpFactor;
    this.scroll     = window.scrollY;
    this.target     = window.scrollY;
    this.velocity   = 0;
    this.direction  = 0;
    this._lastScroll = window.scrollY;
    this._raf       = null;
    this._onWheel  = this._onWheel.bind(this);
    this._onScroll = this._onScroll.bind(this);
    if (smoothWheel) {
      window.addEventListener('wheel', this._onWheel, { passive: false });
    }
    window.addEventListener('scroll', this._onScroll, { passive: true });
  }
  _onWheel(e) {}
  _onScroll() { this.target = window.scrollY; }
  raf(time) {
    if (!this._lt) this._lt = time;
    const rawDt = (time - this._lt) / 1000;
    this._lt = time;
    const dt = Math.min(rawDt, 0.05);
    const prev    = this.scroll;
    this.scroll   = damp(this.scroll, this.target, 12, dt);
    this.velocity = (this.scroll - prev) / dt;
    this.direction = Math.sign(this.velocity);
  }
  get scrollY() { return this.scroll; }
  get progress() {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    return maxScroll > 0 ? this.scroll / maxScroll : 0;
  }
}

const vert = `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragBase = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  varying vec2 vUv;
  vec2 coverUv(vec2 uv, vec2 img, vec2 plane){
    float ia = img.x / img.y;
    float pa = plane.x / plane.y;
    vec2 s = vec2(1.0);
    if(pa > ia) s.y = ia / pa;
    else        s.x = pa / ia;
    return (uv - 0.5) * s + 0.5;
  }
  void main(){
    vec2 uv = coverUv(vUv, uImageSize, uPlaneSize);
    uv = clamp(uv, 0.0, 1.0);
    gl_FragColor = texture2D(uTexture, uv);
  }
`;

const fragCover = `
  precision highp float;
  uniform float uProgress;
  uniform float uRawProgress;
  uniform float uPixelSize;
  uniform float uTime;
  uniform vec2  uPlaneSize;
  uniform sampler2D uChars;
  uniform float uCharCount;
  varying vec2 vUv;
  float hash(vec2 p){
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float hash3(vec3 p){
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  void main(){
    vec2 gridSize  = uPlaneSize / uPixelSize;
    vec2 pixelId   = floor(vUv * gridSize);
    vec2 gridUv    = pixelId / gridSize;
    vec2 gridFrac  = fract(vUv * gridSize);
    float blockRand  = hash(pixelId);
    float progressY  = 1.0 - gridUv.y;
    float rowRand    = hash(vec2(0.0, pixelId.y));
    float delay      = progressY + 0.35*blockRand + 0.05*rowRand;
    float blockReveal = uProgress - delay;
    float softEdge = 0.025;
    float blockAlpha = 1.0 - smoothstep(-softEdge, softEdge, blockReveal);
    if(blockAlpha < 0.004) discard;
    float timeFlicker = floor(uTime * 8.0);
    float charIndex   = floor(hash3(vec3(pixelId, timeFlicker)) * uCharCount);
    float fontMargin = 0.08 + 0.08 * hash(pixelId + 17.3);
    vec2  charUV     = vec2(
      gridFrac.x * (1.0 - 2.0*fontMargin) + fontMargin,
      (charIndex + gridFrac.y) / uCharCount
    );
    float letterMask = texture2D(uChars, charUV).r;
    float letterAppearBase  = -0.20;
    float letterAppearThresh = letterAppearBase + 0.07*blockRand;
    float letterShow = smoothstep(letterAppearThresh, 0.0, blockReveal) * blockAlpha;
    letterShow *= step(0.002, uProgress);
    float thresh     = 0.28 + 0.10*hash(pixelId + 333.0);
    float letterAlpha = smoothstep(thresh - 0.08, thresh + 0.08, letterMask)
                      * pow(max(letterShow, 0.0), 0.65 + 0.3*hash(pixelId + 544.0));
    if(letterAlpha < 0.4 && hash(pixelId + uRawProgress*7.577) > 0.62){
      float charIndex2   = mod(charIndex + 1.0, uCharCount);
      vec2  charUV2      = vec2(charUV.x, (charIndex2 + gridFrac.y)/uCharCount);
      float letterMask2  = texture2D(uChars, charUV2).r;
      float letterAlpha2 = smoothstep(thresh-0.08, thresh+0.08, letterMask2) * letterShow;
      letterAlpha = max(letterAlpha, letterAlpha2 * 0.55);
    }
    float lightness = 0.03 + 0.04*hash(pixelId + 77.0);
    vec3  blockColor = vec3(lightness);
    vec3 glyphBase = mix(vec3(0.85,0.86,0.92), vec3(0.98,0.97,0.95), hash(pixelId+149.0));
    vec3 glyphColor = mix(glyphBase, vec3(1.0), 0.18 + 0.24*hash(pixelId+999.0));
    vec2 cellCenter = gridFrac - 0.5;
    float innerVig  = 1.0 - smoothstep(0.3, 0.5, length(cellCenter));
    blockColor *= 0.7 + 0.3*innerVig;
    vec3  finalRgb  = mix(blockColor, glyphColor, letterAlpha);
    float finalAlpha = blockAlpha;
    gl_FragColor = vec4(finalRgb, finalAlpha);
  }
`;

function buildAtlas(chars, cellPx = 96) {
  const canvas = document.createElement('canvas');
  canvas.width  = cellPx;
  canvas.height = cellPx * chars.length;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle    = '#fff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(cellPx * 0.70) + 'px "Courier New", monospace';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cellPx / 2, cellPx * i + cellPx / 2);
  });
  return canvas;
}

gsap.registerPlugin(ScrollTrigger);

const CHARS = [
  '0','1','2','3','4','5','6','7','8','9',
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '#','@','!','?','%','&','*','+','-','=','~','^',
  '░','▒','▓','█','■','□','▪','▫','◆','◇','●','○','◎','⊕'
];

const stage   = document.getElementById('webglStage');
const img     = document.getElementById('sourceImg');
const display = document.getElementById('progressDisplay');
img.style.opacity = '0';

function waitImg(el) {
  return new Promise(res => {
    if (el.complete && el.naturalWidth) return res(el);
    el.onload = el.onerror = () => res(el);
  });
}

async function boot() {
  await waitImg(img);
  const W = stage.clientWidth;
  const H = stage.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.autoClear = false;
  renderer.sortObjects = false;
  stage.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo    = new THREE.PlaneGeometry(2, 2);

  const imgTex = new THREE.Texture(img);
  imgTex.needsUpdate = true;
  imgTex.minFilter   = THREE.LinearFilter;
  imgTex.magFilter   = THREE.LinearFilter;
  imgTex.generateMipmaps = false;

  const baseMat = new THREE.ShaderMaterial({
    vertexShader:   vert,
    fragmentShader: fragBase,
    uniforms: {
      uTexture:   { value: imgTex },
      uImageSize: { value: new THREE.Vector2(img.naturalWidth || 2070, img.naturalHeight || 1380) },
      uPlaneSize: { value: new THREE.Vector2(W, H) },
    },
    depthTest: false,
  });
  scene.add(new THREE.Mesh(geo, baseMat));

  const atlasCvs  = buildAtlas(CHARS, 96);
  const charsTex  = new THREE.CanvasTexture(atlasCvs);
  charsTex.minFilter = THREE.LinearFilter;
  charsTex.magFilter = THREE.LinearFilter;
  charsTex.generateMipmaps = false;

  const coverMat = new THREE.ShaderMaterial({
    vertexShader:   vert,
    fragmentShader: fragCover,
    uniforms: {
      uProgress:    { value: 0.0 },
      uRawProgress: { value: 0.0 },
      uPixelSize:   { value: 22.0 },
      uTime:        { value: 0.0 },
      uPlaneSize:   { value: new THREE.Vector2(W, H) },
      uChars:       { value: charsTex },
      uCharCount:   { value: CHARS.length },
    },
    transparent: true,
    depthWrite:  false,
    depthTest:   false,
  });
  scene.add(new THREE.Mesh(geo, coverMat));

  window.addEventListener('resize', () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h);
    baseMat.uniforms.uPlaneSize.value.set(w, h);
    coverMat.uniforms.uPlaneSize.value.set(w, h);
  });

  let rawProgress    = 0;
  let smoothProgress = 0;

  ScrollTrigger.create({
    trigger: stage, start: 'top bottom', end: 'bottom top',
    onUpdate(self) {
      rawProgress = gsap.utils.clamp(0, 1, (self.progress - 0.05) / 0.85);
    },
  });

  ScrollTrigger.create({
    trigger: '#endSection', start: 'top 80%',
    onEnter: () => document.getElementById('endSection').classList.add('visible'),
    onLeaveBack: () => document.getElementById('endSection').classList.remove('visible'),
  });

  const lenis = new Lenis({ lerp: 0.085 });
  let prevTime = 0;

  function loop(time) {
    requestAnimationFrame(loop);
    const dt = Math.min((time - prevTime) / 1000, 0.05);
    prevTime = time;
    lenis.raf(time);
    ScrollTrigger.update();
    smoothProgress = damp(smoothProgress, rawProgress, 6.5, dt);
    coverMat.uniforms.uProgress.value    = smoothProgress;
    coverMat.uniforms.uRawProgress.value = rawProgress;
    coverMat.uniforms.uTime.value        = time * 0.001;
    const pct = Math.round(smoothProgress * 100);
    display.textContent = pct + '%';
    display.style.color = smoothProgress > 0.5
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(255,255,255,0.25)';
    renderer.clear();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

boot();
