/* Xem thử 30 màn đã thiết kế: vật thể thật + áo khối, và chạy lại lời giải.
 *
 * Trang này là để NGHIỆM THU thiết kế, không phải để chơi. Nó trả lời đúng ba
 * câu: áo khối có ôm sát vật thể không, gỡ xong có lộ ra đúng vật thể không,
 * và thứ tự gỡ mà bộ sinh hứa có chạy thật không.
 */
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../city-assets/vendor/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const data = await (await fetch('./city-levels.json')).json();

const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdff0f6);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8a80, 2.1));
const key = new THREE.DirectionalLight(0xfff3d8, 2.6);
key.position.set(-9, 16, 11); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -30; key.shadow.camera.right = 30;
key.shadow.camera.top = 30; key.shadow.camera.bottom = -30;
scene.add(key);
scene.add(new THREE.DirectionalLight(0xbcd9ff, 0.9).translateX(9).translateY(6).translateZ(-9));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x9ec59a, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
scene.add(ground);

const loader = new GLTFLoader();
const root = new THREE.Group(); scene.add(root);
let objGroup = null, cubeMesh = null, solidMesh = null, level = null;
let yaw = -Math.PI / 4, pitch = 0.62, dist = 20, focus = new THREE.Vector3();
let show = { cubes: true, obj: true, solid: false };
let solving = null;

/* hộp bo góc đơn giản — bản xem thử không cần shader mặt như game chính */
function roundedBox(size, r, seg = 3) {
  return new THREE.BoxGeometry(size, size, size, seg, seg, seg)
    .toNonIndexed();
}
const DIRV = [null, [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function resize() {
  const w = innerWidth - 310, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

function frame() {
  requestAnimationFrame(frame);
  camera.position.set(
    focus.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    focus.y + Math.sin(pitch) * dist,
    focus.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(focus);
  renderer.render(scene, camera);
}
frame();

/* ─────────── dựng một màn ─────────── */
async function load(L) {
  level = L;
  for (const g of [objGroup, cubeMesh, solidMesh]) if (g) root.remove(g);
  objGroup = cubeMesh = solidMesh = null;

  const cell = L.cell, o = L.origin;
  // tâm lưới, để xoay quanh giữa khối chứ không quanh gốc toạ độ
  const mid = [0, 1, 2].map((i) => o[i] + L.size[i] * cell / 2);
  focus.set(mid[0], Math.max(cell, mid[1] * 0.92), mid[2]);
  dist = Math.max(...L.size) * cell * 2.3;

  const gltf = await loader.loadAsync('../' + L.model);
  objGroup = gltf.scene;
  objGroup.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  objGroup.visible = show.obj;
  root.add(objGroup);

  const cubes = L.blocks;
  const geo = roundedBox(cell * 0.94, cell * 0.085);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0 });
  cubeMesh = new THREE.InstancedMesh(geo, mat, cubes.length);
  cubeMesh.castShadow = cubeMesh.receiveShadow = true;
  cubeMesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(cubes.length * 3), 3);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  cubes.forEach((b, i) => {
    m.makeTranslation(o[0] + (b[0] + 0.5) * cell,
      o[1] + (b[1] + 0.5) * cell, o[2] + (b[2] + 0.5) * cell);
    cubeMesh.setMatrixAt(i, m);
    c.set(b[4] === 1 ? b[5] : '#9aa4ac');
    cubeMesh.setColorAt(i, c);
  });
  cubeMesh.instanceMatrix.needsUpdate = true;
  cubeMesh.visible = show.cubes;
  root.add(cubeMesh);

  // ô thân vật thể: chỉ bật khi cần soi vì sao một khối không ra được
  const sg = new THREE.BoxGeometry(cell, cell, cell);
  solidMesh = new THREE.InstancedMesh(sg,
    new THREE.MeshBasicMaterial({ color: 0xff4d6d, wireframe: true }), L.solid.length);
  L.solid.forEach((s, i) => {
    m.makeTranslation(o[0] + (s[0] + 0.5) * cell,
      o[1] + (s[1] + 0.5) * cell, o[2] + (s[2] + 0.5) * cell);
    solidMesh.setMatrixAt(i, m);
  });
  solidMesh.instanceMatrix.needsUpdate = true;
  solidMesh.visible = show.solid;
  root.add(solidMesh);

  const q = L.metrics;
  $('#tTitle').textContent = `${L.level}. ${L.title}`;
  $('#tSub').textContent = `${L.city} · ${L.kind} · ô ${L.cell} m · lưới ${L.size.join('×')}`
    + (L.hard ? ' · MÀN KHÓ' : '');
  $('#tStats').innerHTML =
    `<span><i>khối</i> <b>${q.cubes}</b></span>`
    + `<span><i>chặn</i> <b>${q.blockers}</b></span>`
    + `<span><i>bấm được lúc đầu</i> <b>${q.startFree}</b></span>`
    + `<span><i>trung bình</i> <b>${q.freeAvg}</b></span>`
    + `<span><i>mũi tên khuất</i> <b>${q.hiddenPct}%</b></span>`;
  $('#pStat').textContent = `${q.cubes} khối`;
  $('#pSub').textContent = 'kéo để xoay · lăn để phóng to';
}

/* ─────────── chạy lại lời giải ───────────
 * Dùng đúng luật của game: đường bay phải trống tới hết biên lưới. Nếu bộ sinh
 * sai ở đâu thì chỗ này sẽ đứng lại và báo còn bao nhiêu khối chưa ra được. */
function solve() {
  if (!level) return;
  if (solving) { clearInterval(solving); solving = null; }
  const L = level, size = L.size;
  const live = new Map(), fixed = new Set();
  const key3 = (x, y, z) => (x * 64 + y) * 64 + z;
  L.blocks.forEach((b, i) => {
    if (b[4] === 1) live.set(key3(b[0], b[1], b[2]), { i, b });
    else fixed.add(key3(b[0], b[1], b[2]));
  });
  L.solid.forEach((s) => fixed.add(key3(s[0], s[1], s[2])));
  const hidden = new THREE.Matrix4().makeTranslation(0, 1e5, 0);
  const m = new THREE.Matrix4(), o = L.cell, org = L.origin;
  L.blocks.forEach((b, i) => {
    m.makeTranslation(org[0] + (b[0] + 0.5) * o, org[1] + (b[1] + 0.5) * o,
      org[2] + (b[2] + 0.5) * o);
    cubeMesh.setMatrixAt(i, m);
  });
  cubeMesh.instanceMatrix.needsUpdate = true;

  const clear = (b) => {
    const d = DIRV[b[3]];
    let x = b[0] + d[0], y = b[1] + d[1], z = b[2] + d[2];
    while (x >= 0 && x < size[0] && y >= 0 && y < size[1] && z >= 0 && z < size[2]) {
      const k = key3(x, y, z);
      if (fixed.has(k) || live.has(k)) return false;
      x += d[0]; y += d[1]; z += d[2];
    }
    return true;
  };
  let taps = 0;
  solving = setInterval(() => {
    const free = [...live.values()].filter((e) => clear(e.b));
    if (!free.length) {
      clearInterval(solving); solving = null;
      $('#pStat').textContent = live.size
        ? `KẸT — còn ${live.size} khối` : `xong sau ${taps} lượt`;
      $('#pSub').textContent = live.size ? 'bộ sinh sai' : 'lời giải chạy hết';
      return;
    }
    const e = free[Math.floor(free.length / 2)];
    live.delete(key3(e.b[0], e.b[1], e.b[2]));
    cubeMesh.setMatrixAt(e.i, hidden);
    cubeMesh.instanceMatrix.needsUpdate = true;
    taps++;
    $('#pStat').textContent = `${live.size} khối còn lại`;
    $('#pSub').textContent = `đang bấm được: ${free.length}`;
  }, 26);
}

/* ─────────── danh sách + điều khiển ─────────── */
let city = data.cities[0].id;
function paintTabs() {
  $('#cityTab').innerHTML = '';
  data.cities.forEach((c) => {
    const b = document.createElement('button');
    b.textContent = c.name;
    b.className = c.id === city ? 'on' : '';
    b.onclick = () => { city = c.id; paintTabs(); paintList(); };
    $('#cityTab').appendChild(b);
  });
}
function paintList() {
  const box = $('#list'); box.innerHTML = '';
  data.levels.filter((L) => L.city === city).forEach((L) => {
    const r = document.createElement('div');
    r.className = 'row' + (level && level.id === L.id ? ' on' : '');
    r.innerHTML = `<div class="n">${String(L.level).padStart(2, '0')}</div>
      <div><div>${L.title}</div><div class="sub">${L.metrics.cubes} khối · ô ${L.cell}m</div></div>
      <div class="tag${L.hard ? ' hard' : ''}">${L.hard ? 'KHÓ' : 'thường'}</div>`;
    r.onclick = async () => {
      if (solving) { clearInterval(solving); solving = null; }
      await load(L); paintList();
    };
    box.appendChild(r);
  });
}
paintTabs(); paintList();

$('#bCubes').onclick = (e) => {
  show.cubes = !show.cubes; e.target.classList.toggle('on', show.cubes);
  if (cubeMesh) cubeMesh.visible = show.cubes;
};
$('#bObj').onclick = (e) => {
  show.obj = !show.obj; e.target.classList.toggle('on', show.obj);
  if (objGroup) objGroup.visible = show.obj;
};
$('#bSolid').onclick = (e) => {
  show.solid = !show.solid; e.target.classList.toggle('on', show.solid);
  if (solidMesh) solidMesh.visible = show.solid;
};
$('#bSolve').onclick = () => solve();

let drag = null;
$('#gl').addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw -= (e.clientX - drag.x) * 0.008;
  pitch = Math.max(-0.2, Math.min(1.35, pitch + (e.clientY - drag.y) * 0.006));
  drag = { x: e.clientX, y: e.clientY };
});
$('#gl').addEventListener('wheel', (e) => {
  e.preventDefault();
  dist = Math.max(2, Math.min(160, dist * (1 + Math.sign(e.deltaY) * 0.1)));
}, { passive: false });

await load(data.levels[0]);
paintList();
window.__preview = { load, data, get level() { return level; } };
