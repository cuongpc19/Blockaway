/* Block Away — Tap Out Puzzle · HTML5/Three.js remake
 *
 * Level data is extracted 1:1 from the original Unity build (Block Away 2.8.6).
 * Data model recovered from the serialised assets:
 *   size  = (sx, sy, sz)  as stored in the file
 *   cell index i  ->  cx = i % sx ,  cy = (i/sx) % sy ,  cz = i / (sx*sy)
 *   cell  = (type, dir, colour)
 *      type   0 = empty, 1 = arrow cube, 2 / 3 = fixed blocker
 *      dir    1..6 -> +Z -Z +Y -Y +X -X   (in file space)
 *   To match the on-screen orientation of the original the world uses the
 *   swapped basis  world(x,y,z) = file(cz, cy, cx),  which turns the direction
 *   table into  1..6 -> +X -X +Y -Y +Z -Z.
 * A cube may be released when every cell along its direction, up to the edge of
 * the level's bounding box, is empty.
 */

import * as THREE from './vendor/three.module.js';
import { save } from './econ.js';
import { startUI } from './ui.js';

/* ══════════════════════════ palette ══════════════════════════ */
/* 1,5,6,7,8 sampled from the original gameplay capture; the rest are
   styled to match (the capture only ever shows those five). */
const PALETTE = [
  0xe8cfa0, // 0  unused -> gỗ mộc
  0xf2c230, // 1  vàng nghệ
  0xd9492c, // 2  đỏ son
  0xefdcb4, // 3  gỗ mộc nhạt
  0x3ba3cc, // 4  xanh nước
  0xf7e9cd, // 5  gỗ bạch dương
  0x2f6fb7, // 6  xanh lam
  0x1f4e96, // 7  lam đậm
  0x4f9b2e, // 8  lục đậm
  0xe8762a, // 9  cam
  0x7cb928, // 10 lục cốm
  0xc8372b, // 11 đỏ gạch
  0x2e9f96, // 12 lam ngọc
  0x4a63b0, // 13 lam tím
  0xe0c89a, // 14 gỗ sồi
  0xb03528, // 15 đỏ sẫm
];
const BLOCKER_COLOR = [0xbfa87c, 0x8a6a45]; // type 2, type 3 — gỗ chưa sơn
/* The cube shader writes straight into the sRGB framebuffer, so palette
   entries are kept as raw sRGB components (no working-space conversion). */
const srgb = (hex) => ({
  r: ((hex >> 16) & 255) / 255,
  g: ((hex >> 8) & 255) / 255,
  b: (hex & 255) / 255,
});

/* ══════════════════════════ constants ══════════════════════════ */
const DIRS = [
  null,
  new THREE.Vector3( 1, 0, 0), // 1
  new THREE.Vector3(-1, 0, 0), // 2
  new THREE.Vector3( 0, 1, 0), // 3
  new THREE.Vector3( 0,-1, 0), // 4
  new THREE.Vector3( 0, 0, 1), // 5
  new THREE.Vector3( 0, 0,-1), // 6
];
const YAW0 = -Math.PI / 4;
const PITCH0 = Math.atan(1 / Math.SQRT2); // 35.264° — true isometric
const CELL = 1.0;
const FLY_TIME = 0.52;
const FLY_DIST = 46;

const $ = (s) => document.querySelector(s);

/* ══════════════════════════ decal textures ══════════════════════════ */
function arrowTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  // stubby arrow pointing towards +u (right), matching the original glyph
  const P = [[0.93, 0.50], [0.28, 0.86], [0.46, 0.50], [0.28, 0.14]];
  g.beginPath();
  g.moveTo(P[0][0] * S, P[0][1] * S);
  for (let i = 1; i < P.length; i++) g.lineTo(P[i][0] * S, P[i][1] * S);
  g.closePath();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = S * 0.13;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.stroke();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ══════════════════════════ rounded cube with face data ══════════════════════════ */
function roundedCube(size = 1, radius = 0.14, seg = 5) {
  const h = size / 2, r = Math.min(radius, h * 0.999), inner = h - r;
  const faces = [
    { n: [ 1, 0, 0], t: [0, 0,-1], b: [0, 1, 0] },
    { n: [-1, 0, 0], t: [0, 0, 1], b: [0, 1, 0] },
    { n: [ 0, 1, 0], t: [1, 0, 0], b: [0, 0,-1] },
    { n: [ 0,-1, 0], t: [1, 0, 0], b: [0, 0, 1] },
    { n: [ 0, 0, 1], t: [1, 0, 0], b: [0, 1, 0] },
    { n: [ 0, 0,-1], t: [-1,0, 0], b: [0, 1, 0] },
  ];
  const pos = [], nrm = [], fn = [], ft = [], fb = [], uv = [], idx = [];
  let base = 0;
  for (const f of faces) {
    for (let iv = 0; iv <= seg; iv++) {
      for (let iu = 0; iu <= seg; iu++) {
        const u = iu / seg, v = iv / seg;
        // flat point on the cube surface
        const p = [0, 0, 0];
        for (let k = 0; k < 3; k++)
          p[k] = f.n[k] * h + f.t[k] * (u * size - h) + f.b[k] * (v * size - h);
        // push the corners/edges onto the rounding sphere
        const c = [
          Math.max(-inner, Math.min(inner, p[0])),
          Math.max(-inner, Math.min(inner, p[1])),
          Math.max(-inner, Math.min(inner, p[2])),
        ];
        const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
        const L = Math.hypot(d[0], d[1], d[2]) || 1;
        pos.push(c[0] + d[0] / L * r, c[1] + d[1] / L * r, c[2] + d[2] / L * r);
        nrm.push(d[0] / L, d[1] / L, d[2] / L);
        fn.push(...f.n); ft.push(...f.t); fb.push(...f.b);
        uv.push(u, v);
      }
    }
    const w = seg + 1;
    for (let iv = 0; iv < seg; iv++) {
      for (let iu = 0; iu < seg; iu++) {
        const a = base + iv * w + iu, b2 = a + 1, c2 = a + w + 1, d2 = a + w;
        idx.push(a, b2, c2, a, c2, d2); // CCW seen from outside (cross(t,b)=n)
      }
    }
    base += w * w;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aFaceN',   new THREE.Float32BufferAttribute(fn, 3));
  g.setAttribute('aFaceT',   new THREE.Float32BufferAttribute(ft, 3));
  g.setAttribute('aFaceB',   new THREE.Float32BufferAttribute(fb, 3));
  g.setAttribute('aFaceUV',  new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* ══════════════════════════ cube material ══════════════════════════ */
function cubeMaterial(arrowTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uArrow: { value: arrowTex },
      uLight: { value: new THREE.Vector3(0.38, 1.0, 0.55).normalize() },
    },
    vertexShader: /* glsl */`
      // instanceMatrix is declared by three.js itself under USE_INSTANCING
      attribute vec3 aFaceN, aFaceT, aFaceB;
      attribute vec2 aFaceUV;
      attribute vec3 aColor;
      attribute vec3 aDir;
      attribute vec2 aFlags;          // x = fade (1 visible), y = lime mix

      varying vec3 vN, vCol, vDecal, vLocal, vSeed;
      varying vec2 vUV;
      varying vec2 vFlags;

      void main(){
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        // gốc của khối trong thế giới: dùng làm hạt giống vân gỗ,
        // để hai khối cạnh nhau không lặp đúng một thớ
        vSeed  = instanceMatrix[3].xyz;
        gl_Position = projectionMatrix * modelViewMatrix * wp;
        vN     = normalize(mat3(instanceMatrix) * normal);
        vCol   = aColor;
        vUV    = aFaceUV;
        vFlags = aFlags;
        vLocal = position;
        // direction expressed in the face's own frame
        vDecal = vec3(dot(aDir, aFaceN), dot(aDir, aFaceT), dot(aDir, aFaceB));
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D uArrow;
      uniform vec3 uLight;
      varying vec3 vN, vCol, vDecal, vLocal, vSeed;
      varying vec2 vUV;
      varying vec2 vFlags;

      float hash(vec3 p){
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }
      /* value noise: thớ gỗ cần chỗ mềm, hạt băm thuần thì ra cát chứ không ra gỗ */
      float vnoise(vec3 p){
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      void main(){
        if (vFlags.x <= 0.003) discard;

        vec3 base = mix(vCol, vec3(0.77, 0.94, 0.14), vFlags.y);

        /* ---- vân gỗ ----
           Thớ chạy dọc trục X của khối, nên mặt trên và hai mặt bên đều cắt
           ngang thớ giống như một khối cắt ra từ thanh gỗ thật. Hạt giống lấy
           từ vị trí khối: cùng một màu nhưng mỗi khối một đường vân. */
        vec3 sp = vLocal + hash(floor(vSeed * 3.0 + 0.5)) * 17.0;
        float t = (sp.y * 4.6 + sp.z * 1.5)
                + vnoise(vec3(sp.x * 1.3, sp.y * 3.0, sp.z * 3.0)) * 2.3;
        float band = 0.5 + 0.5 * sin(t * 3.14159);
        /* Biên độ phải nhẹ: khối sơn thì thớ chỉ hiện mờ dưới lớp sơn, đánh
           mạnh tay là màu hoá ra cáu bẩn chứ không ra gỗ. */
        base *= 0.938 + 0.112 * band;
        base *= 0.980 + 0.040 * vnoise(vec3(sp.x * 2.0, sp.y * 18.0, sp.z * 18.0));

        /* ---- lighting: top ~1.0, sides ~0.55 (matches the original) ---- */
        vec3 n = normalize(vN);
        float diff = max(dot(n, normalize(uLight)), 0.0);
        float lamb = 0.55 + 0.50 * diff;
        /* gỗ sơn có lớp bóng mỏng: cạnh vát bắt một vệt sáng ấm */
        float rim = 0.05 * pow(1.0 - abs(dot(n, vec3(0.0, 1.0, 0.0))), 2.0);
        vec3 warm = vec3(1.035, 1.0, 0.945);              // đèn phòng trẻ, hơi ngả vàng

        /* ---- decal ---- */
        vec3 decal = vec3(0.0);
        float da = 0.0;
        float dn = vDecal.x;
        vec2 p = vUV - 0.5;
        /* Ba ký hiệu phải phân biệt được trong một cái liếc, vì khi xoay gần
           vuông góc với một bức tường thì mỗi khối chỉ còn một mặt nhìn thấy:
             mặt thoát  — đĩa sáng + VÒNG ngoài, đọc ra "đang lao về phía anh"
             mặt đuôi   — đĩa nhỏ hơn, mờ hơn hẳn, không vòng
             mặt bên    — mũi tên
           Bản gốc để mặt thoát là đĩa đặc trơn; cái vòng là mình thêm. */
        float r = length(p);
        if (dn > 0.5) {                       // mặt thoát
          float core = 1.0 - smoothstep(0.180, 0.200, r);
          float ring = smoothstep(0.243, 0.258, r) * (1.0 - smoothstep(0.290, 0.306, r));
          da = clamp(core + ring * 0.92, 0.0, 1.0);
          decal = vec3(1.0);
        } else if (dn < -0.5) {               // mặt đuôi
          da = (1.0 - smoothstep(0.165, 0.188, r)) * 0.60;
          decal = vec3(0.50, 0.50, 0.58);
        } else {                              // in-plane arrow
          float a = atan(vDecal.z, vDecal.y);
          float cs = cos(-a), sn = sin(-a);
          vec2 q = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs) / 0.50 + 0.5;
          if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
            da = texture2D(uArrow, q).a;
            decal = vec3(1.0);
          }
        }
        // decals keep most of their brightness on the shaded faces
        float dlamb = mix(lamb, 1.0, 0.42);

        vec3 rgb = mix(base * lamb * warm + rim, decal * dlamb, clamp(da, 0.0, 1.0));
        gl_FragColor = vec4(rgb, vFlags.x);
      }`,
    transparent: true,
  });
}

/* ══════════════════════════ trails ══════════════════════════ */
function trailTexture() {
  const W = 8, H = 128, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0.00, 'rgba(255,236,196,0.92)');
  grd.addColorStop(0.16, 'rgba(255,186,96,0.62)');
  grd.addColorStop(0.48, 'rgba(255,140,48,0.22)');
  grd.addColorStop(1.00, 'rgba(255,110,26,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class TrailPool {
  constructor(scene, n = 24) {
    const tex = trailTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, -0.5, 0); // pivot at the top edge
    this.items = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0,
      }));
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.items.push({ mesh: m, live: false });
    }
  }
  grab() {
    const it = this.items.find((x) => !x.live);
    if (it) { it.live = true; it.mesh.visible = true; }
    return it;
  }
  /* orient a billboard so its local +Y lies along `dir` and it faces `cam` */
  place(it, from, to, dir, width, cam, opacity) {
    const m = it.mesh;
    const len = from.distanceTo(to);
    if (len < 1e-4) { m.visible = false; return; }
    const mid = new THREE.Vector3().copy(from);
    const view = new THREE.Vector3().subVectors(cam.position, mid).normalize();
    let side = new THREE.Vector3().crossVectors(dir, view);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();
    const nrm = new THREE.Vector3().crossVectors(side, dir).normalize();
    const basis = new THREE.Matrix4().makeBasis(side, dir.clone().negate(), nrm);
    m.position.copy(from);
    m.quaternion.setFromRotationMatrix(basis);
    m.scale.set(width, len, 1);
    m.material.opacity = opacity;
    m.visible = opacity > 0.01;
  }
  free(it) { it.live = false; it.mesh.visible = false; }
}

/* ══════════════════════════ hiệu ứng ══════════════════════════
 * Hạt lửa, vòng xung kích và quầng sáng. Tất cả nằm TRONG nhóm đang xoay, nên
 * một vụ nổ bám đúng vào chỗ khối vừa vỡ kể cả khi người chơi quay bàn giữa
 * chừng — để ở scene thì hiệu ứng sẽ trôi ra sau lưng khối.
 *
 * Hồ cố định, không cấp phát theo khung hình: một cú Tên lửa bắn hơn trăm hạt
 * và người chơi hoàn toàn có thể bấm liên tiếp.
 */
function glowTexture(stops) {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [p, col] of stops) grd.addColorStop(p, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Sprite tự quay mặt về camera, nên vòng xung kích vẽ bằng sprite là đọc được
   từ mọi góc — một vòng tròn đặt nằm trong không gian thì nhìn nghiêng ra hình
   bầu dục dẹt và mất hẳn cảm giác sóng lan. */
class SpritePool {
  /* `add` = hoà trộn cộng. Nền của game là kem sáng, mà cộng vào gần-trắng thì
     vẫn ra trắng — nên chỉ cái lõi nóng mới dùng cộng, còn lửa, khói và vòng
     xung kích đều vẽ đè bằng màu đặc. Đây là lỗi đã thấy tận mắt: cả vụ nổ
     biến mất sạch trên nền sáng. */
  constructor(group, tex, n, add = false) {
    this.items = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, depthTest: false,
        blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0,
      }));
      s.visible = false;
      s.renderOrder = 6;
      group.add(s);
      this.items.push({ s, t: 0, dur: 1, r0: 0, r1: 1, a: 1, live: false });
    }
  }
  spawn(pos, color, r0, r1, dur, a = 1, drift = null) {
    // hết chỗ thì cướp cái già nhất: thà một vòng bị cắt ngang còn hơn im lặng
    const it = this.items.find((x) => !x.live)
      || this.items.reduce((p, q) => (q.t / q.dur > p.t / p.dur ? q : p));
    it.live = true; it.t = 0; it.dur = dur; it.r0 = r0; it.r1 = r1; it.a = a;
    it.drift = drift;
    it.s.position.copy(pos);
    it.s.material.color.setHex(color);
    it.s.material.opacity = a;
    it.s.scale.set(r0, r0, 1);
    it.s.visible = true;
  }
  update(dt) {
    let live = false;
    for (const it of this.items) {
      if (!it.live) continue;
      it.t += dt;
      const u = it.t / it.dur;
      if (u >= 1) { it.live = false; it.s.visible = false; continue; }
      live = true;
      const e = 1 - Math.pow(1 - u, 3);          // bung nhanh rồi tãi ra
      const r = it.r0 + (it.r1 - it.r0) * e;
      it.s.scale.set(r, r, 1);
      if (it.drift) it.s.position.addScaledVector(it.drift, dt);
      it.s.material.opacity = it.a * Math.pow(1 - u, 1.7);
    }
    return live;
  }
  reset() { this.items.forEach((it) => { it.live = false; it.s.visible = false; }); }
}

/* Hạt lửa: một THREE.Points duy nhất, vòng đệm quay vòng. Kích thước quy ra
   pixel thật (uScale = P[1][1] × chiều cao buffer / 2) nên hạt không phình to
   khi người chơi thu nhỏ khối lại. */
class Sparks {
  constructor(group, n = 700) {
    this.n = n; this.head = 0; this.dirty = false;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.siz = new Float32Array(n);
    this.alp = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);

    const g = new THREE.BufferGeometry();
    const dyn = (arr, k) =>
      new THREE.BufferAttribute(arr, k).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', dyn(this.pos, 3));
    g.setAttribute('aCol', dyn(this.col, 3));
    g.setAttribute('aSize', dyn(this.siz, 1));
    g.setAttribute('aAlpha', dyn(this.alp, 1));
    this.geo = g;

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      vertexShader: [
        'attribute vec3 aCol;',
        'attribute float aSize;',
        'attribute float aAlpha;',
        'uniform float uScale;',
        'varying vec3 vC; varying float vA;',
        'void main() {',
        '  vC = aCol; vA = aAlpha;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = clamp(aSize * uScale / max(0.001, -mv.z), 1.0, 120.0);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vC; varying float vA;',
        'void main() {',
        '  float d = length(gl_PointCoord - 0.5);',
        '  float a = smoothstep(0.5, 0.05, d);',
        '  a *= a * vA;',
        '  if (a < 0.004) discard;',
        // lõi sáng: tia lửa cháy trắng ở giữa rồi mới ra màu ở rìa, nhưng vừa
        // phải thôi — trắng quá thì trên nền kem không còn thấy gì
        '  vec3 c = mix(vC, vec3(1.0), smoothstep(0.30, 0.0, d) * 0.30 * vA);',
        '  gl_FragColor = vec4(c, a);',
        '}',
      ].join('\n'),
    });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = 5;
    group.add(this.pts);
  }

  /** colors: mảng hex; opt: {size, grav, drag, dir, spread} */
  emit(p, colors, count, speed, life, opt = {}) {
    const size = opt.size ?? 0.13;
    const spread = opt.spread ?? 1;
    const dir = opt.dir || null;
    for (let k = 0; k < count; k++) {
      const i = this.head; this.head = (this.head + 1) % this.n;
      // hướng ngẫu nhiên rải đều trên mặt cầu
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      let vx = s * Math.cos(th), vy = u, vz = s * Math.sin(th);
      if (dir) { vx = vx * spread + dir.x; vy = vy * spread + dir.y; vz = vz * spread + dir.z; }
      const sp = speed * (0.45 + Math.random() * 0.8);
      const j = i * 3;
      this.pos[j] = p.x + vx * 0.1;
      this.pos[j + 1] = p.y + vy * 0.1;
      this.pos[j + 2] = p.z + vz * 0.1;
      this.vel[j] = vx * sp;
      this.vel[j + 1] = vy * sp;
      this.vel[j + 2] = vz * sp;
      const c = srgb(colors[(Math.random() * colors.length) | 0]);
      this.col[j] = c.r; this.col[j + 1] = c.g; this.col[j + 2] = c.b;
      this.siz[i] = size * (0.55 + Math.random() * 0.95);
      this.life[i] = life * (0.7 + Math.random() * 0.65);
      this.age[i] = 0;
      this.alp[i] = 1;
      this.grav[i] = opt.grav ?? -2.4;
      this.drag[i] = opt.drag ?? 1.8;
    }
    this.dirty = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.n; i++) {
      if (this.alp[i] <= 0) continue;
      any = true;
      this.age[i] += dt;
      const u = this.age[i] / this.life[i];
      if (u >= 1) { this.alp[i] = 0; continue; }
      const d = Math.exp(-this.drag[i] * dt);
      const j = i * 3;
      this.vel[j] *= d;
      this.vel[j + 1] = this.vel[j + 1] * d + this.grav[i] * dt;
      this.vel[j + 2] *= d;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.alp[i] = Math.pow(1 - u, 1.4);
    }
    if (any || this.dirty) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aCol.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
      this.geo.attributes.aAlpha.needsUpdate = true;
      this.dirty = false;
    }
    return any;
  }
  reset() { this.alp.fill(0); this.dirty = true; }
}

class Fx {
  constructor(group) {
    const ringTex = glowTexture([
      [0.00, 'rgba(255,255,255,0)'], [0.54, 'rgba(255,255,255,0)'],
      [0.64, 'rgba(255,255,255,.55)'],
      [0.74, 'rgba(255,255,255,1)'], [0.86, 'rgba(255,255,255,.45)'],
      [1.00, 'rgba(255,255,255,0)'],
    ]);
    const ballTex = glowTexture([
      [0.00, 'rgba(255,255,255,1)'], [0.30, 'rgba(255,255,255,.98)'],
      [0.58, 'rgba(255,255,255,.55)'], [1.00, 'rgba(255,255,255,0)'],
    ]);
    this.sparks = new Sparks(group, 700);
    this.smoke = new SpritePool(group, ballTex, 20);        // khói — vẽ dưới cùng
    this.rings = new SpritePool(group, ringTex, 12);        // sóng xung kích
    this.balls = new SpritePool(group, ballTex, 14);        // quả cầu lửa
    this.glow  = new SpritePool(group, ballTex, 8, true);   // lõi nóng, hoà cộng
    this.smoke.items.forEach((it) => { it.s.renderOrder = 4; });
    this.balls.items.forEach((it) => { it.s.renderOrder = 7; });
    this.glow.items.forEach((it) => { it.s.renderOrder = 8; });
  }
  ring(p, color, r0, r1, dur, a = 1) { this.rings.spawn(p, color, r0, r1, dur, a); }
  flash(p, color, r, dur, a = 1) { this.balls.spawn(p, color, r * 0.22, r, dur, a); }
  hot(p, color, r, dur, a = 1) { this.glow.spawn(p, color, r * 0.3, r, dur, a); }
  /* Khói là thứ cho vụ nổ sức nặng: vài cụm lệch nhau, nở ra và bốc lên, tắt
     chậm hơn lửa. Một cụm duy nhất thì ra cái đĩa tròn, không ra khói. */
  puff(p, colors, n, spread, r1, dur, a = 0.5) {
    for (let i = 0; i < n; i++) {
      const o = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.7,
        (Math.random() - 0.5) * spread).add(p);
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.7,
        (Math.random() - 0.5) * 0.8);
      this.smoke.spawn(o, colors[(Math.random() * colors.length) | 0],
        r1 * 0.35, r1 * (0.75 + Math.random() * 0.6),
        dur * (0.8 + Math.random() * 0.5), a, drift);
    }
  }
  burst(p, colors, n, speed, life, opt) { this.sparks.emit(p, colors, n, speed, life, opt); }
  setScale(v) { this.sparks.mat.uniforms.uScale.value = v; }
  update(dt) {
    let live = this.sparks.update(dt);
    live = this.rings.update(dt) || live;
    live = this.balls.update(dt) || live;
    live = this.smoke.update(dt) || live;
    live = this.glow.update(dt) || live;
    return live;
  }
  reset() {
    this.sparks.reset(); this.rings.reset();
    this.balls.reset(); this.smoke.reset(); this.glow.reset();
  }
}

/* ══════════════════════════ audio ══════════════════════════ */
class Sfx {
  constructor() { this.on = true; this.ctx = null; }
  ac() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) this.ctx = new C();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone(f0, f1, dur, type = 'sine', gain = 0.16) {
    if (!this.on) return;
    const c = this.ac(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  pop(combo) {
    const n = Math.min(combo, 14);
    this.tone(520 * Math.pow(1.055, n), 1200 * Math.pow(1.04, n), 0.16, 'triangle', 0.14);
  }
  nope() { this.tone(150, 92, 0.14, 'square', 0.10); }

  /* Một vụ nổ phải có phần ỒN. Sóng sin đơn dù trầm đến mấy vẫn nghe ra tiếng
     báo tin nhắn, nên đây là nhiễu trắng lọc thấp dần cộng một cú thịch trầm. */
  noise(dur = 0.5, f0 = 2600, f1 = 90, gain = 0.26) {
    if (!this.on) return;
    const c = this.ac(); if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass';
    const t = c.currentTime;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(c.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }
  boom() {
    this.noise(0.6, 3200, 80, 0.3);
    this.tone(170, 38, 0.55, 'sine', 0.3);
    setTimeout(() => this.noise(0.34, 900, 60, 0.1), 70);   // dư âm
  }
  hum() { this.tone(140, 720, 0.34, 'sawtooth', 0.09); }
  chime() {
    [784, 1046, 1318].forEach((f, i) =>
      setTimeout(() => this.tone(f, f, 0.26, 'sine', 0.085), i * 70));
  }
  win() {
    [0, 0.1, 0.2, 0.34].forEach((d, i) => setTimeout(
      () => this.tone([523, 659, 784, 1046][i], [523, 659, 784, 1046][i], 0.3, 'sine', 0.13), d * 1000));
  }
}

/* ══════════════════════════ level store ══════════════════════════ */
async function loadLevels(onProgress) {
  const res = await fetch('./levels.bin');
  if (!res.ok) throw new Error('levels.bin ' + res.status);
  const total = +(res.headers.get('content-length') || 0);
  const chunks = []; let got = 0;
  const reader = res.body && res.body.getReader ? res.body.getReader() : null;
  let buf;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (total) onProgress(got / total);
    }
    buf = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
  } else {
    buf = new Uint8Array(await res.arrayBuffer());
  }
  onProgress(1);

  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
  if (magic !== 'BAWZ') throw new Error('bad levels.bin');
  const count = dv.getUint32(4, true);
  const dirStart = 12, ENT = 12;
  const blocksStart = dirStart + count * ENT;
  const index = new Array(count);
  for (let i = 0; i < count; i++) {
    const o = dirStart + i * ENT;
    index[i] = {
      num: dv.getUint16(o, true),
      sx: buf[o + 2], sy: buf[o + 3], sz: buf[o + 4],
      off: dv.getUint32(o + 5, true),
      n: dv.getUint16(o + 9, true),
      hard: buf[o + 11] === 1,      // cờ `ih` của bản gốc; hard_levels_labeling_enabled
    };
  }
  return {
    count,
    index,
    byNum: new Map(index.map((e, i) => [e.num, i])),
    /* Returns world-space blocks. File axes are swapped here:
       world x = file z, world y = file y, world z = file x. */
    get(i) {
      const e = index[i];
      const out = new Array(e.n);
      for (let k = 0; k < e.n; k++) {
        const p = blocksStart + (e.off + k) * 5;
        const td = buf[p + 3];
        out[k] = {
          x: buf[p + 2], y: buf[p + 1], z: buf[p],
          type: td >> 4, dir: td & 15, color: buf[p + 4],
        };
      }
      return { num: e.num, ex: e.sz, ey: e.sy, ez: e.sx, hard: e.hard, blocks: out };
    },
  };
}

/* ══════════════════════════ game ══════════════════════════ */
class Game {
  constructor(levels) {
    this.levels = levels;
    this.sfx = new Sfx();
    this.slot = 0;
    this.combo = 0;
    this._ev = {};
    this.blocks = [];
    this.flying = [];

    /* ---- renderer ---- */
    this.renderer = new THREE.WebGLRenderer({
      canvas: $('#gl'), antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
    this.pivot = new THREE.Vector3();

    /* ---- one instanced mesh reused by every level ---- */
    const MAX = 1200;
    this.geo = roundedCube(CELL * 0.985, 0.16, 4);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.aDir   = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.aFlags = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2);
    this.geo.setAttribute('aColor', this.aColor);
    this.geo.setAttribute('aDir', this.aDir);
    this.geo.setAttribute('aFlags', this.aFlags);
    this.mat = cubeMaterial(arrowTexture());
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;

    /* The original rotates the BLOCK, not the camera ("Swipe to rotate the
       block"), and level 5 even ships a baked starting rotation with roll in
       it — which a yaw/pitch orbit cannot reproduce. So the cluster sits in a
       group driven like a trackball, and the camera stays put. */
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.add(this.mesh);

    this.trails = new TrailPool(this.group);
    this.fx = new Fx(this.group);
    this.camShake = 0;                       // biên độ rung máy, mét; tắt dần

    /* ---- view state ----
       Two rotation models. Turntable (default) keeps world-up on screen-up, so
       the block never ends up rolled and a swipe always does the same thing.
       Free tumble reproduces the original, which really does roll. Either way
       the drag is applied 1:1 with no easing — easing during direct
       manipulation is what makes a drag feel like it is fighting you. */
    this.freeSpin = localStorage.getItem('ba_free') === '1';
    this.yaw = 0; this.pitch = 0;            // turntable angles
    this.vYaw = 0; this.vPitch = 0;          // rad/s, for release inertia
    this.q = new THREE.Quaternion();         // free-tumble orientation
    this.spinAxis = new THREE.Vector3(0, 1, 0);
    this.spinVel = 0;
    this.dragging = false;
    this.anim = false;                       // easing back to the default view
    this.dist = 12; this.tDist = 12;

    this.ray = new THREE.Raycaster();
    this.tmpM = new THREE.Matrix4();
    this.tmpV = new THREE.Vector3();

    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /* ─────────── level lifecycle ─────────── */
  load(slot) {
    this.slot = Math.max(0, Math.min(this.levels.count - 1, slot));
    const L = this.levels.get(this.slot);
    this.ex = L.ex; this.ey = L.ey; this.ez = L.ez;
    this.num = L.num;
    this.hard = L.hard;

    const ox = (L.ex - 1) / 2, oy = (L.ey - 1) / 2, oz = (L.ez - 1) / 2;
    this.occ = new Map();
    this.blocks = L.blocks.map((b, i) => {
      const blk = {
        i, gx: b.x, gy: b.y, gz: b.z,
        type: b.type, dir: b.dir,
        dirV: b.type === 1 ? DIRS[b.dir] : null,
        home: new THREE.Vector3((b.x - ox) * CELL, (b.y - oy) * CELL, (b.z - oz) * CELL),
        state: 'idle', t: 0, shake: 0, push: null, recoil: null, hint: 0,
        color: srgb(b.type === 1 ? (PALETTE[b.color] ?? PALETTE[0])
                                 : (BLOCKER_COLOR[b.type - 2] ?? 0x8d949c)),
      };
      this.occ.set(this.key(b.x, b.y, b.z), blk);
      return blk;
    });

    this.remaining = this.blocks.filter((b) => b.type === 1).length;
    this.flying.length = 0;
    this.trails.items.forEach((it) => this.trails.free(it));
    this.fx.reset();
    this.camShake = 0;
    this.combo = 0;

    /* upload instance data */
    this.mesh.count = this.blocks.length;
    for (const b of this.blocks) {
      this.aColor.setXYZ(b.i, b.color.r, b.color.g, b.color.b);
      const d = b.dirV || { x: 0, y: 0, z: 0 };
      this.aDir.setXYZ(b.i, d.x, d.y, d.z);
      this.aFlags.setXY(b.i, 1, 0);
      this.mesh.setMatrixAt(b.i, this.tmpM.makeTranslation(b.home.x, b.home.y, b.home.z));
    }
    this.aColor.needsUpdate = this.aDir.needsUpdate = this.aFlags.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    // the cached sphere is per-level; recompute it or picking uses stale bounds
    this.mesh.computeBoundingSphere();
    this.dirty = true;

    /* every level opens square-on, like the original */
    this.yaw = this.pitch = 0;
    this.vYaw = this.vPitch = this.spinVel = 0;
    this.q.identity();
    this.dragging = false; this.anim = false;
    this.applyRot();
    this.group.updateMatrixWorld();

    /* frame the cluster */
    this.resize();
    this.fitDist = this.computeFit();
    this.dist = this.tDist = this.fitDist;
    /* Place the camera here rather than leaving it to the next frame: while the
       Home screen is up the loop is paused, so anything that measures the view
       right after load() would otherwise read stale matrices. */
    this.placeCamera();

    this.emit('levelStart');
  }

  key(x, y, z) { return (x * 64 + y) * 64 + z; }

  /* ─────────── events (the UI layer listens; the game never touches DOM) ─────────── */
  on(name, fn) { (this._ev[name] || (this._ev[name] = [])).push(fn); return this; }
  emit(name, arg) {
    let last;
    for (const fn of this._ev[name] || []) { try { last = fn(arg); } catch (_) {} }
    return last;
  }

  /* ─────────── boosters ───────────
   * Every one of these attacks the same friction: in a 300-cube level the hard
   * part is spotting a cube whose path is clear, not deciding which to remove.
   * (Removing a cube only ever opens paths, so the board can never dead-end —
   * which is also why there is no undo: there is no move to take back.) */

  /* Chạm vào khối không đi được: nó lao đúng khoảng hở tới khối chặn rồi bật
     lại, còn khối chặn bị ủn một cái. Rung tại chỗ chỉ nói "không được"; lao
     vào rồi khựng lại thì nói luôn **tại sao** và **cái gì** đang chặn. */
  bump(b) {
    const d = b.dirV;
    let gap = 0;
    let x = b.gx + d.x, y = b.gy + d.y, z = b.gz + d.z;
    const chain = [];
    while (x >= 0 && x < this.ex && y >= 0 && y < this.ey && z >= 0 && z < this.ez) {
      const o = this.occ.get(this.key(x, y, z));
      if (o && o.state !== 'gone') {
        chain.push(o);
        if (chain.length >= 3) break;          // ủn lan tối đa 3 khối
      } else if (!chain.length) {
        gap++;                                  // còn trống thì khoảng hở dài ra
      } else break;                             // hết mạch khối chặn liền nhau
      x += d.x; y += d.y; z += d.z;
    }
    const dist = Math.min(gap, 4);
    const dur = 0.10 + dist * 0.045;
    b.push = { t: 0, dist: dist || 0.15, dur, dir: d };
    chain.forEach((o, i) => {
      o.recoil = { t: 0, amp: 0.15 * Math.pow(0.48, i), dir: d, wait: dur };
    });
    this.dirty = true;
  }

  /** every cube whose path is clear right now */
  freeCubes() { return this.blocks.filter((b) => this.isFree(b)); }

  /** tâm và bán kính của phần khối còn lại — mọi hiệu ứng đều neo vào đây */
  clusterCentre(out = new THREE.Vector3()) {
    out.set(0, 0, 0);
    const live = this.blocks.filter((b) => b.state === 'idle');
    if (!live.length) return out;
    for (const b of live) out.add(b.home);
    return out.multiplyScalar(1 / live.length);
  }
  clusterSpan(c) {
    let m = CELL;
    for (const b of this.blocks) {
      if (b.state === 'idle') m = Math.max(m, b.home.distanceTo(c));
    }
    return m;
  }

  /** Hint — "Highlights all cubes you can release!"
   *  Một sóng sáng quét từ tâm ra, và mỗi khối thoát được nảy lên một chùm
   *  lấp lánh khi sóng chạm tới: mắt bắt được *thứ tự* nên biết ngay là cùng
   *  một nhóm, thay vì cả bàn đồng loạt nhấp nháy. */
  lamp(secs = 3.0) {
    const free = this.freeCubes();
    const c = this.clusterCentre();
    const span = this.clusterSpan(c);
    this.fx.ring(c, 0xf0a81e, 0.5, span * 2.5 + 2, 0.62, 0.9);
    this.sfx.chime();
    for (const b of free) {
      b.hint = secs;
      const delay = (b.home.distanceTo(c) / Math.max(span, 0.01)) * 260;
      setTimeout(() => {
        if (b.state !== 'idle') return;
        this.fx.burst(b.home, [0xffe06a, 0xffb020, 0xfff3c8], 8, 1.6, 0.5,
          { size: 0.1, grav: 0.7, drag: 2.6 });
        this.fx.hot(b.home, 0xffe08a, 1.5, 0.28, 0.7);
      }, delay);
    }
    this.dirty = true;
    return free.length;
  }

  /** Magnet — "Attracts all tappable cubes at once!"
   *  Trước khi bay, mỗi khối sáng lên và nhả một vòng từ trường: người chơi
   *  thấy được *cái gì đang bị hút* chứ không chỉ thấy bàn vơi đi. */
  magnetAll() {
    const free = this.freeCubes();
    if (!free.length) return 0;
    const c = this.clusterCentre();
    const span = this.clusterSpan(c);
    // hai vòng lệch pha: một sóng thì phẳng, hai sóng thì thành nhịp
    this.fx.ring(c, 0x36a6ef, 0.4, span * 2.4 + 2, 0.55, 0.95);
    setTimeout(() => this.fx.ring(c, 0x7fd2ff, 0.4, span * 2.0 + 2, 0.5, 0.7), 110);
    this.sfx.hum();
    this.camShake = Math.max(this.camShake, 0.05);
    free.forEach((b, i) => {
      b.hint = 0.6;                                   // nạp sáng trước khi bị hút
      setTimeout(() => {
        if (b.state !== 'idle') return;
        this.fx.ring(b.home, 0x49b7ff, 0.2, 2.1, 0.32, 0.9);
        this.fx.flash(b.home, 0xbfeaff, 1.2, 0.26, 0.7);
        this.fx.burst(b.home, [0x8fd8ff, 0x2f9fe8, 0xffffff], 14, 2.5, 0.42,
          { size: 0.1, grav: 0, drag: 2.2 });
        this.release(b, null, { speed: 1.35 });
      }, 130 + i * 55);
    });
    return free.length;
  }

  /** Rocket — "Blows up some cubes!". Đường thoát duy nhất khi bàn bí, nên nó
   *  phá được cả khối chặn cố định, và nổ đúng chỗ đang kẹt nhất.
   *
   *  Dựng thành ba nhịp vì một vụ nổ đọc được là một vụ nổ có nhịp: loé sáng →
   *  sóng xung kích chạy ra → khối vỡ văng theo đúng lúc sóng chạm tới nó. */
  rocket(radius = 1.7, cap = 12) {
    const live = this.blocks.filter((b) => b.state === 'idle');
    if (!live.length) return 0;
    const stuck = live.filter((b) => b.type === 1 && !this.isFree(b));
    const pool = stuck.length ? stuck : live;
    // tâm nổ: khối kẹt gần trung tâm khối lượng còn lại nhất
    const c = new THREE.Vector3();
    for (const b of live) c.add(b.home);
    c.multiplyScalar(1 / live.length);
    let centre = pool[0], bd = Infinity;
    for (const b of pool) {
      const d = b.home.distanceToSquared(c);
      if (d < bd) { bd = d; centre = b; }
    }
    const hit = live
      .filter((b) => b.home.distanceTo(centre.home) <= radius)
      .sort((a, b) => a.home.distanceTo(centre.home) - b.home.distanceTo(centre.home))
      .slice(0, cap);

    const o = centre.home.clone();
    const R = radius * 4.5 + 3;

    /* nhịp 1 — lõi trắng, cầu lửa, hai sóng xung kích, khói cuộn */
    this.fx.hot(o, 0xfff6dc, 5.5, 0.22, 1);               // lõi nóng, chớp một cái
    this.fx.flash(o, 0xfff0a0, 5.2, 0.4, 1);              // ruột lửa vàng
    this.fx.flash(o, 0xff9a1e, 8.0, 0.62, 0.95);          // quầng cam
    this.fx.flash(o, 0xe03a10, 10.5, 0.8, 0.5);           // vành đỏ ngoài cùng
    this.fx.ring(o, 0xffa62a, 0.8, R, 0.62, 1);
    setTimeout(() => this.fx.ring(o, 0xffe08a, 0.8, R * 1.35, 0.8, 0.75), 100);
    this.fx.puff(o, [0xa89078, 0xc4ad94, 0x8a7460], 14, 2.0, 6.5, 1.9, 0.5);
    this.fx.burst(o, [0xffe06a, 0xff8a1e, 0xe0380f], 130, 10.5, 0.85,
      { size: 0.3, grav: -2.4, drag: 1.5 });
    // tàn lửa bay chậm, rơi lâu: đây là thứ làm vụ nổ có sức nặng
    setTimeout(() => this.fx.burst(o, [0xffc247, 0xff6a1e], 48, 3.0, 1.7,
      { size: 0.15, grav: -3.6, drag: 0.8 }), 70);
    /* nhịp 1b — hai cụm lửa phụ lệch tâm: một quả cầu duy nhất đọc ra là "một
       hiệu ứng", vài cụm nổ nối nhau mới đọc ra là "một vụ nổ". */
    for (let i = 0; i < 3; i++) {
      const q = o.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * radius * 1.8,
        (Math.random() - 0.5) * radius * 1.4,
        (Math.random() - 0.5) * radius * 1.8));
      setTimeout(() => {
        this.fx.flash(q, 0xffd24a, 3.6, 0.42, 0.95);
        this.fx.flash(q, 0xff7a1e, 5.0, 0.55, 0.6);
        this.fx.burst(q, [0xffe06a, 0xff7a1e], 26, 5.5, 0.7,
          { size: 0.2, grav: -2.6, drag: 1.5 });
      }, 70 + i * 85);
    }
    this.camShake = 0.62;
    this.sfx.boom();
    this.emit('boom', { power: 1 });

    /* nhịp 2 — khối vỡ văng ra đúng lúc sóng chạm tới */
    const dir = new THREE.Vector3();
    hit.forEach((b) => {
      const d = b.home.distanceTo(centre.home);
      const delay = 20 + d * 46;
      setTimeout(() => {
        if (b.state !== 'idle') return;
        dir.copy(b.home).sub(centre.home);
        if (dir.lengthSq() < 1e-6) dir.copy(UP);
        dir.normalize();
        this.fx.burst(b.home, [0xffd24a, 0xff8a2a, 0xd93a12], 16, 3.4, 0.5,
          { size: 0.12, dir, spread: 0.7, grav: -3.0, drag: 1.6 });
        this.fx.flash(b.home, 0xffa53a, 1.5, 0.24, 0.8);
        this.release(b, dir.clone(), { speed: 1.55, tumble: true });
      }, delay);
    });
    return hit.length;
  }

  /* clear saved progress (sound preference is kept — it isn't progress) */
  /* closest shipped level number, for level numbers the original skipped */
  nearestSlot(n) {
    let best = 0, bd = Infinity;
    this.levels.index.forEach((e, i) => {
      const d = Math.abs(e.num - n);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /* Iteratively solve for the camera distance at which the cluster's bounding
     box fills `target` of the viewport. Much tighter than a bounding-sphere
     estimate, which badly over-shoots for flat, wide levels. */
  computeFit(target = FIT_W, quat = null, targetY = FIT_H) {
    const hx = this.ex * CELL / 2, hy = this.ey * CELL / 2, hz = this.ez * CELL / 2;
    const corners = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new THREE.Vector3(sx * hx, sy * hy, sz * hz);
      if (quat) c.applyQuaternion(quat);
      corners.push(c);
    }
    const cam = new THREE.PerspectiveCamera(
      this.camera.fov, this.camera.aspect, 0.1, 1000);
    const cp = Math.cos(PITCH0);
    const dir = new THREE.Vector3(
      Math.sin(YAW0) * cp, Math.sin(PITCH0), Math.cos(YAW0) * cp);
    let d = Math.max(4, Math.hypot(hx, hy, hz) * 3);
    const v = new THREE.Vector3();
    for (let it = 0; it < 24; it++) {
      cam.position.copy(dir).multiplyScalar(d);
      cam.lookAt(this.pivot);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      /* Hai trục hai mốc khác nhau. Trên cửa sổ ngang, HUD ăn mất khoảng 18%
         chiều cao (thanh trên + hàng booster), nên lấp đầy chiều dọc bằng đúng
         mốc của chiều ngang là đẩy khối chui xuống dưới hàng nút. */
      let m = 0;
      for (const c of corners) {
        v.copy(c).project(cam);
        m = Math.max(m, Math.abs(v.x) / target, Math.abs(v.y) / targetY);
      }
      if (!(m > 0)) break;
      const next = d * m;
      if (Math.abs(next - d) < 1e-3) { d = next; break; }
      d = next;
    }
    // never come closer than the baseline zoom, or a 1-cell level fills the screen
    return Math.max(2.6, d, this.baselineDist());
  }

  /* Bản gốc giữ mức thu phóng gần như cố định và chỉ lùi ra khi khối không còn
     vừa khung. Chỉ riêng "vừa khung" thì một màn 1 ô sẽ phình ra kín màn hình.
     Nên đây là cái SÀN mà computeFit bị kẹp vào.
     
     Hai mốc chứ không phải một. Đo trên chính video bản gốc (384×848): một ô
     chiếm 128px = 33% bề NGANG, và 130px = 17% chiều CAO của khung chơi. Trên
     điện thoại hai con số đó là một, nhưng trên cửa sổ ngang thì không: lấy
     "cạnh ngắn" làm mốc thì cạnh ngắn hoá ra là chiều cao, và một ô nở ra 32%
     chiều cao — to gấp đôi bản gốc. Đây là lỗi thật, người dùng báo hai lần. */
  baselineDist() {
    const vFov = this.camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const r = 0.5 * Math.SQRT2 * CELL;                 // nửa bề ngang của một ô
    // khoảng cách nhỏ nhất để ô không vượt quá `frac` của cạnh có góc mở `fov`
    const need = (fov, frac) => r / (Math.tan(fov / 2) * frac);
    return Math.max(need(hFov, CELL_W), need(vFov, CELL_H));
  }

  /* ─────────── rules ─────────── */
  isFree(b) {
    if (b.type !== 1 || b.state !== 'idle') return false;
    const d = b.dirV;
    let x = b.gx + d.x, y = b.gy + d.y, z = b.gz + d.z;
    while (x >= 0 && x < this.ex && y >= 0 && y < this.ey && z >= 0 && z < this.ez) {
      const o = this.occ.get(this.key(x, y, z));
      if (o && o.state !== 'gone') return false;
      x += d.x; y += d.y; z += d.z;
    }
    return true;
  }

  tap(b) {
    if (!b || b.state !== 'idle') return;
    if (b.type !== 1) { b.shake = 0.3; this.sfx.nope(); this.emit('blocked', b); return; }
    if (!this.isFree(b)) { this.bump(b); this.sfx.nope(); this.emit('blocked', b); return; }

    this.release(b);
  }

  /** đẩy một khối ra ngoài.
   *  `dir` để Tên lửa thổi khối bay theo hướng khác; `opt.speed` nhân tốc độ
   *  bay, `opt.tumble` cho khối lộn nhào — khối bị nổ mà bay thẳng đơ thì
   *  trông như bị gỡ chứ không như bị thổi. */
  release(b, dir, opt = {}) {
    if (!b || b.state !== 'idle') return false;
    b.state = 'flying';
    b.t = 0;
    b.hint = 0;                        // đang bay thì thôi nhấp nháy
    b.push = b.recoil = null;
    b.fly = dir || b.dirV || UP;
    b.flyTime = FLY_TIME / (opt.speed || 1);
    b.tumble = opt.tumble
      ? { axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5,
                                  Math.random() - 0.5).normalize(),
          rate: 7 + Math.random() * 7 }
      : null;
    // một nhúm bụi ngay tại chỗ khối vừa rời đi, kể cả khi chạm tay thường
    this.fx.burst(b.home, [0xffffff, 0xfff0cf], 6, 1.6, 0.32,
      { size: 0.085, grav: -1.4, drag: 2.6 });
    this.dirty = true;
    b.trail = this.trails.grab();
    this.flying.push(b);
    this.occ.delete(this.key(b.gx, b.gy, b.gz));
    if (b.type === 1) {
      this.remaining--;
      this.combo++;
      this.sfx.pop(this.combo);
      this.emit('release', b);
    }
    if (this.remaining <= 0) setTimeout(() => this.emit('win'), 520);
    return true;
  }

  /* ─────────── per-frame ─────────── */
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // Home doesn't show the cluster, so don't pay for it
    if (this.paused) { this.clock.getDelta(); return; }

    /* fixed isometric camera; only the distance is user-controlled */
    this.dist += (this.tDist - this.dist) * Math.min(1, dt * 10);
    if (this.camShake > 0) this.camShake = Math.max(0, this.camShake - dt * 0.95);
    this.placeCamera();
    // hạt tính kích thước ra pixel thật, nên tỉ lệ phải theo camera hiện tại
    this.fx.setScale(
      this.camera.projectionMatrix.elements[5] * this.renderer.domElement.height * 0.5);
    this.fx.update(dt);

    this.updateRotation(dt);
    this.group.updateMatrixWorld();

    /* Light is defined in world space but the block turns under it, so the key
       direction is pushed into the block's frame — the cluster then reads the
       same from every angle, as it does in the original. */
    this.mat.uniforms.uLight.value
      .set(Math.sin(YAW0 + 0.45) * 0.55, 1.0, Math.cos(YAW0 + 0.45) * 0.55)
      .normalize()
      .applyQuaternion(INV_Q.copy(this.group.quaternion).invert());

    /* flying cubes */
    if (this.flying.length) this.dirty = true;
    for (let k = this.flying.length - 1; k >= 0; k--) {
      const b = this.flying[k];
      b.t += dt;
      const u = Math.min(1, b.t / (b.flyTime || FLY_TIME));
      const travel = (u * u * 0.82 + u * 0.18) * FLY_DIST;
      const p = this.tmpV.copy(b.fly).multiplyScalar(travel).add(b.home);
      const lime = Math.max(0, 1 - u * 5.2);
      const fade = u < 0.72 ? 1 : 1 - (u - 0.72) / 0.28;
      const sc = 1 - 0.25 * Math.max(0, u - 0.6) / 0.4;
      let rot = ZERO_Q;
      if (b.tumble) { QA.setFromAxisAngle(b.tumble.axis, b.t * b.tumble.rate); rot = QA; }
      this.mesh.setMatrixAt(b.i, this.tmpM.compose(
        p, rot, new THREE.Vector3(sc, sc, sc)));
      this.aFlags.setXY(b.i, Math.max(0, fade), lime);

      if (b.trail) {
        const tailBack = Math.min(travel, 7.5);
        const from = p.clone();
        const to = p.clone().sub(this.tmpV.copy(b.fly).multiplyScalar(tailBack));
        this.trails.place(b.trail, from, to, b.fly, 0.56, this.localCam(),
          Math.min(1, u * 5) * (1 - u) * 1.25);
      }

      if (u >= 1) {
        b.state = 'gone';
        this.aFlags.setXY(b.i, 0, 0);
        this.mesh.setMatrixAt(b.i, this.tmpM.makeTranslation(0, 1e5, 0));
        if (b.trail) { this.trails.free(b.trail); b.trail = null; }
        b.tumble = null;
        this.flying.splice(k, 1);
      }
    }

    /* hint pulse — rides the same instance channel as the release flash, which
       is safe because a cube can never be hinted and flying at the same time */
    for (const b of this.blocks) {
      if (b.hint > 0 && b.state !== 'idle') { b.hint = 0; continue; }
      if (b.hint > 0) {
        b.hint = Math.max(0, b.hint - dt);
        const k = b.hint > 0 ? 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(b.hint * 13)) : 0;
        this.aFlags.setXY(b.i, 1, k);
        this.dirty = true;
      }
    }

    /* va chạm khi bị chặn: khối lao tới, khối chặn bị ủn, cả hai bật về chỗ */
    const BACK = 0.30, RECOIL = 0.26;
    for (const b of this.blocks) {
      if (b.state !== 'idle') continue;
      let off = 0, dir = null, done = false;

      if (b.push) {
        const q = b.push;
        q.t += dt;
        if (q.t <= q.dur) {
          const k = q.t / q.dur;                       // lao tới: nhanh rồi khựng
          off = q.dist * (1 - Math.pow(1 - k, 3));
        } else {
          const u = (q.t - q.dur) / BACK;              // bật về, nảy tắt dần
          if (u >= 1) { b.push = null; done = true; }
          else off = q.dist * Math.pow(1 - u, 2) * Math.cos(u * 6.0);
        }
        dir = q.dir;
      } else if (b.recoil) {
        const q = b.recoil;
        q.t += dt;
        if (q.t < q.wait) { off = 0; dir = q.dir; }    // chờ cú va tới nơi
        else {
          const u = (q.t - q.wait) / RECOIL;
          if (u >= 1) { b.recoil = null; done = true; }
          else off = q.amp * Math.pow(1 - u, 2) * Math.cos(u * 7.0);
          dir = q.dir;
        }
      } else if (b.shake > 0) {
        b.shake = Math.max(0, b.shake - dt);
        off = Math.sin(b.shake * 62) * b.shake * 0.13;
        dir = b.dirV || UP;
        if (b.shake === 0) done = true;
      } else continue;

      this.dirty = true;
      if (done) {
        this.mesh.setMatrixAt(b.i,
          this.tmpM.makeTranslation(b.home.x, b.home.y, b.home.z));
      } else {
        const p = this.tmpV.copy(dir).multiplyScalar(off).add(b.home);
        this.mesh.setMatrixAt(b.i, this.tmpM.makeTranslation(p.x, p.y, p.z));
      }
    }

    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.aFlags.needsUpdate = true;
      this.dirty = this.flying.length > 0 || this.blocks.some((b) => b.shake > 0);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /* Radians per pixel, normalised to the viewport, so the same gesture turns
     the block by the same amount on a phone and on a desktop. A fixed
     per-pixel rate does not: it makes desktop drags feel dead and phone drags
     feel twitchy. */
  spinRate() {
    return SPIN_TURN /
      Math.max(240, Math.min(window.innerWidth, window.innerHeight));
  }

  /* Drag, applied immediately. Also tracks angular velocity so releasing
     mid-swipe lets the block coast, the way the original does. */
  spin(dx, dy, dtp) {
    const k = this.spinRate();
    const clampV = (v) => Math.max(-SPIN_CAP, Math.min(SPIN_CAP, v));
    const e = this.camera.matrixWorld.elements;

    if (this.freeSpin) {
      const ang = Math.hypot(dx, dy) * k;
      if (ang < 1e-7) return;
      TMP_A.set(e[0], e[1], e[2]).normalize();       // screen right
      TMP_B.set(e[4], e[5], e[6]).normalize();       // screen up
      // axis lies in the screen plane, perpendicular to the drag
      TMP_C.copy(TMP_B).multiplyScalar(dx).addScaledVector(TMP_A, dy).normalize();
      QA.setFromAxisAngle(TMP_C, ang);
      this.q.premultiply(QA).normalize();
      this.spinAxis.copy(TMP_C);
      this.spinVel = clampV(ang / dtp);
    } else {
      this.yaw += dx * k;
      this.pitch = Math.max(-PITCH_LIM, Math.min(PITCH_LIM, this.pitch + dy * k));
      const b = 0.7;                                  // smooth the velocity estimate
      this.vYaw   = this.vYaw   * (1 - b) + clampV(dx * k / dtp) * b;
      this.vPitch = this.vPitch * (1 - b) + clampV(dy * k / dtp) * b;
    }
    this.applyRot();
  }

  updateRotation(dt) {
    if (this.anim) {                                  // recenter
      const t = Math.min(1, dt * 9);
      if (this.freeSpin) {
        this.q.slerp(IDENT, t);
        if (this.q.angleTo(IDENT) < 2e-3) { this.q.identity(); this.anim = false; }
      } else {
        this.yaw += (0 - this.yaw) * t;
        this.pitch += (0 - this.pitch) * t;
        if (Math.abs(this.yaw) + Math.abs(this.pitch) < 2e-3) {
          this.yaw = this.pitch = 0; this.anim = false;
        }
      }
    } else if (!this.dragging) {                      // coast, then settle
      const damp = Math.exp(-3.4 * dt);
      if (this.freeSpin) {
        if (this.spinVel !== 0) {
          QA.setFromAxisAngle(this.spinAxis, this.spinVel * dt);
          this.q.premultiply(QA).normalize();
          this.spinVel *= damp;
          if (Math.abs(this.spinVel) < 0.04) this.spinVel = 0;
        }
      } else if (this.vYaw !== 0 || this.vPitch !== 0) {
        this.yaw += this.vYaw * dt;
        this.pitch = Math.max(-PITCH_LIM, Math.min(PITCH_LIM, this.pitch + this.vPitch * dt));
        this.vYaw *= damp; this.vPitch *= damp;
        if (Math.abs(this.vYaw) < 0.04) this.vYaw = 0;
        if (Math.abs(this.vPitch) < 0.04) this.vPitch = 0;
      }
    }
    this.applyRot();
  }

  /* Một chỗ duy nhất giữ giới hạn thu phóng: lăn chuột, chụm hai ngón và hai
     nút ở góc màn hình đều đi qua đây, nếu không thì ba đường sẽ trôi khác nhau
     và nút báo "hết cỡ" trong khi con lăn vẫn đi tiếp được. */
  zoomRange() { return { lo: this.fitDist * 0.45, hi: this.fitDist * 1.7 }; }
  setDist(d) {
    const { lo, hi } = this.zoomRange();
    this.tDist = Math.min(hi, Math.max(lo, d));
    this.emit('zoom', this.zoomState());
    return this.tDist;
  }
  /** k < 1 là phóng to (lại gần), k > 1 là thu nhỏ */
  zoomBy(k) { return this.setDist(this.tDist * k); }
  zoomState() {
    const { lo, hi } = this.zoomRange();
    return { atMin: this.tDist <= lo * 1.001, atMax: this.tDist >= hi * 0.999 };
  }

  placeCamera() {
    const cp = Math.cos(PITCH0);
    this.camera.position.set(
      Math.sin(YAW0) * cp * this.dist,
      Math.sin(PITCH0) * this.dist,
      Math.cos(YAW0) * cp * this.dist,
    );
    this.camera.lookAt(this.pivot);
    /* Rung SAU lookAt: chỉ tịnh tiến, không xoay. Rung bằng cách xoay thì cả
       khung hình đảo và người chơi thấy chóng chứ không thấy mạnh. */
    if (this.camShake > 0) {
      const a = this.camShake * this.dist * 0.09;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      this.camera.position.z += (Math.random() - 0.5) * a;
    }
    this.camera.updateMatrixWorld();
  }

  applyRot() {
    if (this.freeSpin) { this.group.quaternion.copy(this.q); return; }
    /* yaw about world up, THEN tip about the camera's (fixed) horizontal axis.
       Rebuilt from two scalars every frame, so roll can never accumulate. */
    const e = this.camera.matrixWorld.elements;
    TMP_A.set(e[0], e[1], e[2]).normalize();
    QA.setFromAxisAngle(UP, this.yaw);
    QB.setFromAxisAngle(TMP_A, this.pitch);
    this.group.quaternion.copy(QB).multiply(QA);
  }

  /* camera position expressed in the rotating group's own space */
  localCam() {
    this._lc = this._lc || new THREE.Vector3();
    this._lc.copy(this.camera.position);
    this.group.worldToLocal(this._lc);
    return { position: this._lc };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // dense levels shade a lot of pixels; trade a little sharpness for frame rate
    const cap = this.blocks.length > 420 ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap));
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.blocks.length) {
      this.fitDist = this.computeFit();
      this.tDist = Math.min(Math.max(this.tDist, this.fitDist * 0.55), this.fitDist * 1.7);
      this.emit('zoom', this.zoomState());
    }
  }

  /* ─────────── input ─────────── */
  bindInput() {
    const el = $('#gl');
    let ptr = null, moved = 0, pinch = null;

    const pick = (cx, cy) => {
      const r = el.getBoundingClientRect();
      const nx = ((cx - r.left) / r.width) * 2 - 1;
      const ny = -((cy - r.top) / r.height) * 2 + 1;
      this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
      const hits = this.ray.intersectObject(this.mesh, false);
      for (const h of hits) {
        const b = this.blocks[h.instanceId];
        if (b && b.state === 'idle') return b;
      }
      return null;
    };

    el.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      // record the gesture first: setPointerCapture can throw for synthetic
      // pointers, and losing the gesture would swallow the tap
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY,
              sx: e.clientX, sy: e.clientY, t: performance.now() };
      moved = 0;
      // grabbing stops whatever the block was doing
      this.vYaw = this.vPitch = this.spinVel = 0;
      this.anim = false;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this.sfx.ac();
    });

    el.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const now = performance.now();
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      const dtp = Math.max(8, now - ptr.t) / 1000;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 7) { this.dragging = true; this.spin(dx, dy, dtp); }
    });

    const up = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (moved <= 9) {
        const b = pick(e.clientX, e.clientY);
        if (b) this.tap(b);
      }
      // a stale pointer stops the drag; the velocity is kept so it coasts
      if (performance.now() - ptr.t > 120) this.vYaw = this.vPitch = this.spinVel = 0;
      this.dragging = false;
      ptr = null;
    };
    el.addEventListener('pointerup', up);
    window.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { ptr = null; this.dragging = false; });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(1 + Math.sign(e.deltaY) * 0.09);
    }, { passive: false });

    /* two-finger pinch zoom */
    const touches = new Map();
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        this.zoomBy(pinch / Math.max(d, 1));
        pinch = d;
        ptr = null; this.dragging = false;
      }
    }, { passive: true });
    el.addEventListener('touchend', () => { if (event?.touches?.length < 2) pinch = null; });
  }

  /* ─────────── ui ─────────── */


}

const ZERO_Q = new THREE.Quaternion();
const INV_Q = new THREE.Quaternion();
const QA = new THREE.Quaternion(), QB = new THREE.Quaternion();
const IDENT = new THREE.Quaternion();
const TMP_A = new THREE.Vector3(), TMP_B = new THREE.Vector3(), TMP_C = new THREE.Vector3();
const PITCH_LIM = 1.35;          // ~77°, stops the view tumbling over the pole
/* Khối được phép chiếm bao nhiêu phần khung hình. Bốn con số này quyết định
   toàn bộ cảm giác "to/nhỏ" của game, nên để cạnh nhau:
     CELL_* — trần kích thước của MỘT ô, đo từ video bản gốc (33% ngang / 17% dọc)
     FIT_*  — khung tối đa cho cả cụm khi cụm đã lớn hơn cái trần trên  */
const CELL_W = 0.33, CELL_H = 0.175;
const FIT_W = 0.80, FIT_H = 0.68;
/* How far the block turns for a swipe across the shorter side of the viewport.
   360 felt twitchy; this is the one number to nudge if it ever does again. */
const SPIN_TURN = 240 * Math.PI / 180;
const SPIN_CAP = 6;              // rad/s ceiling on a flick; scaled with SPIN_TURN
                                 // so a flick always coasts well under one swipe
const UP = new THREE.Vector3(0, 1, 0);

/* ══════════════════════════ stars ══════════════════════════ */
function drawStars() {
  const c = $('#stars');
  const w = c.width = window.innerWidth, h = c.height = window.innerHeight;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w, y = Math.random() * h * 0.62;
    const r = Math.random() * 1.3 + 0.25;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}

/* ══════════════════════════ boot ══════════════════════════ */
(async function boot() {
  drawStars();
  window.addEventListener('resize', drawStars);
  const bar = $('#bar i');
  try {
    const levels = await loadLevels((p) => { bar.style.width = (p * 100).toFixed(0) + '%'; });
    const game = new Game(levels);
    window.__game = game;
    game.sfx.on = save.snd;

    /* URL overrides:  ?reset  wipes progress and starts at level 1
                       ?level=N  jumps straight to that level number     */
    const q = new URLSearchParams(location.search);
    let slot = null, forced = false;
    if (q.has('reset')) { save.wipeProgress(); slot = 0; forced = true; }
    if (q.has('level')) {
      const n = parseInt(q.get('level'), 10);
      if (Number.isFinite(n)) { slot = levels.byNum.get(n) ?? game.nearestSlot(n); forced = true; }
    }
    if (slot === null) slot = save.slot;
    else save.setSlot(slot);
    // drop the query string so a refresh doesn't reset again
    if (q.has('reset') || q.has('level')) {
      history.replaceState(null, '', location.pathname);
    }

    startUI(game, { slot, forced });
    $('#load').classList.add('off');
  } catch (err) {
    $('#load').innerHTML =
      `<div style="text-align:center;padding:24px;line-height:1.6">
         <b>Không tải được level</b><br>
         <span style="opacity:.7;font-size:14px">${String(err)}</span><br>
         <span style="opacity:.7;font-size:13px">Hãy mở qua http://localhost, không mở file:// trực tiếp.</span>
       </div>`;
    throw err;
  }
})();
