import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
const $=s=>document.querySelector(s);
const manifest=await (await fetch('./manifest.json')).json();
const renderer=new THREE.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.1,2000);
scene.add(new THREE.HemisphereLight(0xf4fff7,0x526b54,2.0));
const key=new THREE.DirectionalLight(0xfff4dc,3.2);key.position.set(-8,14,10);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xb8d7ff,1.2);fill.position.set(9,7,-8);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x789378,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(80,80,0x6c8976,0x89a68b);grid.position.y=-.018;grid.material.transparent=true;grid.material.opacity=.2;scene.add(grid);
const loader=new GLTFLoader(); let active=null, current=null, mode='object', yaw=2.55, pitch=.27, distance=9, dragging=false,last={x:0,y:0}, focus=new THREE.Vector3(0,.6,0);
function resize(){const r=$('#stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('#stage'));resize();
function frame(){requestAnimationFrame(frame);camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*distance,focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(focus);renderer.render(scene,camera);}frame();
function dispose(o){o.traverse(n=>{if(n.isMesh){n.geometry.dispose();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose();}});}
async function show(m){mode='object';current=m;$('#cityOverview').classList.remove('active');$('#loading').classList.remove('hidden');$('#sceneTitle').textContent=m.title;$('#sceneMeta').textContent=`MISSION ${String(m.level).padStart(2,'0')} / 15`;
  renderer.shadowMap.enabled=true;
  $('.scene-label').textContent='OBJECT PREVIEW · 3D';
  if(active){scene.remove(active);dispose(active);active=null;}
  try{const gltf=await loader.loadAsync('./'+m.model);active=gltf.scene;scene.add(active);active.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
    const b=new THREE.Box3().setFromObject(active),s=b.getSize(new THREE.Vector3()),max=Math.max(...s.toArray());focus.set(0,s.y*.44,0);distance=Math.max(3.6,max*2.05);pitch=max>9?.2:.3;$('#loading').classList.add('hidden');}
  catch(e){$('#loading').textContent='Không tải được GLB';console.error(e);}
  document.querySelectorAll('.tile').forEach(t=>t.classList.toggle('active',t.dataset.id===m.id));
  $('#selectedTag').textContent=`${manifest.cities.find(c=>c.id===m.city).name.toUpperCase()} · OBJECT ${String(m.level).padStart(2,'0')}`;
  $('#selectedNum').textContent=`${String(m.level).padStart(2,'0')} / 15`;$('#selectedTitle').textContent=m.title;$('#selectedDesc').textContent=m.description;
  $('#dimensions').textContent=(m.actualSize||m.size).map(v=>Number(v).toFixed(1)).join(' × ')+' m';
}
async function showCity(){
  const c=manifest.cities.find(x=>x.id===city);mode='city';$('#cityOverview').classList.add('active');$('#loading').classList.remove('hidden');
  renderer.shadowMap.enabled=false;
  $('#sceneTitle').textContent=c.name;$('#sceneMeta').textContent='CITY OVERVIEW · 15 LANDMARKS';
  if(active){scene.remove(active);dispose(active);active=null;}
  try{const gltf=await loader.loadAsync('./'+c.overviewModel);active=gltf.scene;scene.add(active);active.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
    const bounds=new THREE.Box3().setFromObject(active);focus.copy(bounds.getCenter(new THREE.Vector3()));
    yaw=2.35;pitch=1.0;
    const size=bounds.getSize(new THREE.Vector3()),hx=size.x/2,hy=size.y/2,hz=size.z/2;
    const vf=THREE.MathUtils.degToRad(camera.fov),hf=2*Math.atan(Math.tan(vf/2)*camera.aspect);
    const halfWidth=Math.abs(Math.cos(yaw))*hx+Math.abs(Math.sin(yaw))*hz;
    const halfHeight=Math.abs(Math.sin(pitch)*Math.sin(yaw))*hx+Math.cos(pitch)*hy+Math.abs(Math.sin(pitch)*Math.cos(yaw))*hz;
    distance=Math.max(halfWidth/Math.tan(hf/2),halfHeight/Math.tan(vf/2))*1.12;
    $('#loading').classList.add('hidden');
  }catch(e){$('#loading').textContent='Không tải được city GLB';console.error(e);}
  $('#selectedTag').textContent=`${c.name.toUpperCase()} · CITY OVERVIEW`;
  $('.scene-label').textContent='CITY OVERVIEW · 15 LANDMARKS';
  $('#selectedNum').textContent='15 LANDMARKS';$('#selectedTitle').textContent=`${c.name} — toàn cảnh`;
  $('#selectedDesc').textContent=`${c.subtitle}. Một góc nhìn chung gồm đường phố, mảng xanh và 15 vật thể nhiệm vụ.`;
  $('#dimensions').textContent='City diorama · GLB';
}
let city=manifest.cities[0].id;
function renderCity(){const c=manifest.cities.find(x=>x.id===city),list=manifest.missions.filter(m=>m.city===city);
  $('#cityName').textContent=c.name;$('#citySub').textContent=`${c.subtitle} · 15 nhiệm vụ`;
  $('#citySwitch').innerHTML=manifest.cities.map(x=>`<button data-city="${x.id}" class="${x.id===city?'active':''}">${x.name}</button>`).join('');
  $('#missionGrid').innerHTML=list.map(m=>`<button class="tile" data-id="${m.id}"><img loading="lazy" src="${m.preview}" alt=""><em>${String(m.level).padStart(2,'0')}</em><b>${m.title}</b></button>`).join('');
  document.querySelectorAll('.tile').forEach(t=>t.addEventListener('click',()=>show(list.find(m=>m.id===t.dataset.id))));show(list.find(m=>m.id===current?.id)||list[0]);
}
$('#citySwitch').addEventListener('click',e=>{const b=e.target.closest('[data-city]');if(b){city=b.dataset.city;renderCity();}});
$('#cityOverview').addEventListener('click',showCity);
const canvas=$('#scene'); canvas.addEventListener('pointerdown',e=>{dragging=true;last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-last.x)*.009;pitch=Math.max(-.1,Math.min(1.15,pitch+(e.clientY-last.y)*.007));last={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('wheel',e=>{distance=Math.max(2.5,Math.min(70,distance*Math.exp(e.deltaY*.001)));e.preventDefault();},{passive:false});
renderCity();
