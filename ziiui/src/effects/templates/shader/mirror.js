const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader1 = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform float uGrayscale;
  uniform float uEdgeIntensity;
  uniform float uEdgeBrightness;
  varying vec2 vUv;
  mat3 sobelX = mat3(-1.,0.,1.,-2.,0.,2.,-1.,0.,1.);
  mat3 sobelY = mat3(-1.,-2.,-1.,0.,0.,0.,1.,2.,1.);
  float getLum(vec3 c) { return dot(c, vec3(0.299,0.587,0.114)); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
               mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
  }
  float fbm(vec2 p) {
    float v=0.,a=.5,freq=1.;
    for(int i=0;i<5;i++){v+=a*noise(p*freq);a*=.5;freq*=2.;}
    return v;
  }
  float sobel(sampler2D tex, vec2 uv, vec2 ts) {
    float gx=0.,gy=0.;
    for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){
      vec2 off=vec2(float(i),float(j))*ts;
      float l=getLum(texture2D(tex,uv+off).rgb);
      gx+=l*sobelX[i+1][j+1]; gy+=l*sobelY[i+1][j+1];
    }}
    return sqrt(gx*gx+gy*gy);
  }
  void main() {
    vec2 ratio = vec2(
      min((uResolution.x/uResolution.y)/(uImageResolution.x/uImageResolution.y),1.),
      min((uResolution.y/uResolution.x)/(uImageResolution.y/uImageResolution.x),1.)
    );
    vec2 uv = vec2(vUv.x*ratio.x+(1.-ratio.x)*.5, vUv.y*ratio.y+(1.-ratio.y)*.5);
    vec4 tex = texture2D(uTexture, uv);
    float gray = getLum(tex.rgb);
    tex.rgb = mix(tex.rgb, vec3(gray), uGrayscale);
    vec2 c = vUv - vec2(.5,.5);
    float asp = uResolution.x/uResolution.y;
    c.x *= asp;
    float dist = length(c);
    float angle = atan(c.y, c.x);
    vec2 pxUv = floor(vUv*uResolution/6.)*6./uResolution;
    float bn = fbm(pxUv*100.)*.15 + fbm(vec2(angle*5.,0.))*.15;
    float nd = (dist+bn) / length(vec2(asp*.5,.5));
    float thr = uDissolve*1.5;
    float mask = smoothstep(thr-.03, thr, nd);
    vec2 ts = 1./uResolution;
    float edge = pow(clamp(sobel(uTexture,uv,ts),0.,1.),.7)*2.;
    vec3 base = mix(tex.rgb, vec3(0.), uGrayscale);
    base += vec3(1.)*edge*uEdgeIntensity*2.*(1.+uGrayscale*3.)*uEdgeBrightness;
    float ezW = .15*(1.-uDissolve)+.02;
    float ez = smoothstep(thr-ezW, thr-ezW+.04, nd)*smoothstep(thr+.02, thr-.02, nd);
    float sp = hash(floor(vUv*uResolution/4.))*ez;
    base += vec3(sp*3.*(1.-uDissolve)*uEdgeBrightness*(1.+uGrayscale*2.));
    gl_FragColor = vec4(clamp(base,0.,1.), mask*tex.a);
  }
`;

const fragmentShader2 = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uEdgeIntensity;
  uniform float uDarkness;
  uniform float uGrayscale;
  varying vec2 vUv;
  mat3 sobelX = mat3(-1.,0.,1.,-2.,0.,2.,-1.,0.,1.);
  mat3 sobelY = mat3(-1.,-2.,-1.,0.,0.,0.,1.,2.,1.);
  float getLum(vec3 c) { return dot(c, vec3(0.299,0.587,0.114)); }
  float sobel(sampler2D tex, vec2 uv, vec2 ts) {
    float gx=0.,gy=0.;
    for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){
      vec2 off=vec2(float(i),float(j))*ts;
      float l=getLum(texture2D(tex,uv+off).rgb);
      gx+=l*sobelX[i+1][j+1]; gy+=l*sobelY[i+1][j+1];
    }}
    return sqrt(gx*gx+gy*gy);
  }
  void main() {
    vec2 ratio = vec2(
      min((uResolution.x/uResolution.y)/(uImageResolution.x/uImageResolution.y),1.),
      min((uResolution.y/uResolution.x)/(uImageResolution.y/uImageResolution.x),1.)
    );
    vec2 uv = vec2(vUv.x*ratio.x+(1.-ratio.x)*.5, vUv.y*ratio.y+(1.-ratio.y)*.5);
    vec4 tex = texture2D(uTexture, uv);
    float gray = getLum(tex.rgb);
    tex.rgb = mix(tex.rgb, vec3(gray), uGrayscale);
    vec2 ts = 1./uResolution;
    float edge = pow(clamp(sobel(uTexture,uv,ts),0.,1.),.7)*2.;
    vec3 base = mix(tex.rgb, vec3(0.), uDarkness);
    base += vec3(1.)*edge*uEdgeIntensity*2.;
    gl_FragColor = vec4(clamp(base,0.,1.), tex.a);
  }
`;

const W = window.innerWidth, H = window.innerHeight;
const geo = new THREE.PlaneGeometry(2, 2);

const scene1 = new THREE.Scene();
const cam1 = new THREE.OrthographicCamera(-1,1,1,-1,.1,10);
cam1.position.z = 1;
const renderer1 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer1.setSize(W, H);
renderer1.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas1').appendChild(renderer1.domElement);

const scene2 = new THREE.Scene();
const cam2 = new THREE.OrthographicCamera(-1,1,1,-1,.1,10);
cam2.position.z = 1;
const renderer2 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer2.setSize(W, H);
renderer2.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas2').appendChild(renderer2.domElement);

let mat1, mat2;
const loader = new THREE.TextureLoader();

loader.load(
  'https://images.unsplash.com/photo-1577081395884-e70fc91645ad?w=1134&auto=format&fit=crop',
  (tex) => {
    mat1 = new THREE.ShaderMaterial({
      uniforms: {
        uTexture:       { value: tex },
        uResolution:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageResolution: { value: new THREE.Vector2(tex.image.width, tex.image.height) },
        uDissolve:      { value: 0.0 },
        uGrayscale:     { value: 0.0 },
        uEdgeIntensity: { value: 0.0 },
        uEdgeBrightness:{ value: 1.0 }
      },
      vertexShader,
      fragmentShader: fragmentShader1,
      transparent: true
    });
    scene1.add(new THREE.Mesh(geo, mat1));
  }
);

loader.load(
  'https://images.unsplash.com/photo-1705167110557-a16203e0fe24?w=1274&auto=format&fit=crop',
  (tex) => {
    mat2 = new THREE.ShaderMaterial({
      uniforms: {
        uTexture:       { value: tex },
        uResolution:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageResolution: { value: new THREE.Vector2(tex.image.width, tex.image.height) },
        uEdgeIntensity: { value: 0.6 },
        uDarkness:      { value: 1.0 },
        uGrayscale:     { value: 1.0 }
      },
      vertexShader,
      fragmentShader: fragmentShader2,
      transparent: true
    });
    scene2.add(new THREE.Mesh(geo, mat2));
  }
);

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer1.setSize(w, h);
  renderer2.setSize(w, h);
  if (mat1) mat1.uniforms.uResolution.value.set(w, h);
  if (mat2) mat2.uniforms.uResolution.value.set(w, h);
});

const hint = document.getElementById('scrollHint');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;

  if (mat1) {
    mat1.uniforms.uDissolve.value       = progress;
    mat1.uniforms.uGrayscale.value      = Math.min(1.0, progress / 0.4);
    mat1.uniforms.uEdgeIntensity.value  = progress * 0.5;
    mat1.uniforms.uEdgeBrightness.value = 1.0 - progress;
  }

  if (mat2) {
    const ap = Math.min(1.0, progress * 1.1);
    mat2.uniforms.uEdgeIntensity.value = 0.6 * (1.0 - ap);
    mat2.uniforms.uDarkness.value      = 1.0 - ap;
    mat2.uniforms.uGrayscale.value     = 1.0 - ap;
  }

  hint.style.opacity = Math.max(0, 1 - progress * 5);
});

function raf() {
  renderer2.render(scene2, cam2);
  renderer1.render(scene1, cam1);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
