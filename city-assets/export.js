import * as THREE from '../vendor/three.module.js';
import { GLTFExporter } from './vendor/GLTFExporter.js';
import { cities, missions, buildMission, buildCityScene, buildTinyBlockKit } from './models.js';

const status = document.querySelector('#status');
const exporter = new GLTFExporter();
const lines = [];
function say(s) { lines.push(s); status.textContent = lines.slice(-12).join('\n'); }

async function buildAll() {
  const manifest = { format:'BlockAwayCityAssets/1.0', units:'meters', upAxis:'Y', visualDesign:{blockDominantMissionTarget:'80%',primaryForms:'boxes and rectangular prisms',secondaryForms:'small wheels, lamps and accents'}, cities:[], missions:[], tinyBlockReference:{model:'tiny-blocks/tiny-block-kit.glb',spec:'tiny-blocks/design-spec.json'} };
  for (let i=0; i<missions.length; i++) {
    const mission = missions[i];
    try {
      const {root} = buildMission(mission);
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      const actualSize = bounds.getSize(new THREE.Vector3()).toArray().map(v=>+v.toFixed(3));
      const scene = new THREE.Scene(); scene.add(root);
      const glb = await new Promise((resolve,reject)=>exporter.parse(scene,resolve,reject,{binary:true,onlyVisible:true}));
      const response = await fetch(`http://127.0.0.1:8090/upload/models/${mission.id}.glb`, {method:'POST',body:glb});
      if (!response.ok) throw new Error(`upload HTTP ${response.status}`);
      manifest.missions.push({...mission, actualSize, shapeStyle:'block-dominant', model:`models/${mission.id}.glb`, preview:`previews/${mission.id}.png`, objectOrigin:'center X/Z, ground Y=0'});
      say(`${i+1}/30  ${mission.id} — ${mission.title}  ${actualSize.join(' × ')} m`);
      root.traverse(o=>{ if(o.isMesh){o.geometry.dispose(); if(Array.isArray(o.material))o.material.forEach(m=>m.dispose()); else o.material.dispose();} });
    } catch(e) { say(`ERROR ${mission.id}: ${e.message}`); throw e; }
  }
  for(const city of cities){
    const root=buildCityScene(city.id),scene=new THREE.Scene();scene.add(root);root.updateMatrixWorld(true);
    const glb=await new Promise((resolve,reject)=>exporter.parse(scene,resolve,reject,{binary:true,onlyVisible:true}));
    const response=await fetch(`http://127.0.0.1:8090/upload/cities/${city.id}.glb`,{method:'POST',body:glb});if(!response.ok)throw new Error(`city upload HTTP ${response.status}`);
    manifest.cities.push({...city,overviewModel:`city-scenes/${city.id}.glb`,overviewPreview:`city-scenes/${city.id}.png`,overviewSize:[92,24,70]});
    root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
    say(`CITY VIEW — ${city.name} exported`);
  }
  const kit=buildTinyBlockKit(),kitScene=new THREE.Scene();kitScene.add(kit);
  const kitGlb=await new Promise((resolve,reject)=>exporter.parse(kitScene,resolve,reject,{binary:true,onlyVisible:true}));
  const kitResponse=await fetch('http://127.0.0.1:8090/upload/tiny-blocks/tiny-block-kit.glb',{method:'POST',body:kitGlb});if(!kitResponse.ok)throw new Error(`tiny-block kit HTTP ${kitResponse.status}`);
  const r=await fetch('http://127.0.0.1:8090/manifest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(manifest,null,2)});
  if(!r.ok) throw new Error(`manifest HTTP ${r.status}`);
  say('DONE — all 30 GLB files and manifest saved.');
  window.__exportComplete = true;
}
buildAll().catch(e=>{say(`FATAL: ${e.stack||e}`); window.__exportError=String(e);});
