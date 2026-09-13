import * as THREE from '../vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';

export const cities = [
  { id: 'greenbay', name: 'Greenbay', subtitle: 'Thành phố bên vịnh', palette: ['#67c66b','#ffd45b','#42a5d8'], sky: '#d9f4ff' },
  { id: 'metrovale', name: 'Metrovale', subtitle: 'Đô thị trung tâm', palette: ['#a879e8','#56c8c0','#ff9b65'], sky: '#e8e0ff' },
];

export const missions = [
  ['gb-01','greenbay','Ghế công viên','Ghế gỗ ven lối đi', [1.8,1.2,0.8], 'bench'],
  ['gb-02','greenbay','Thùng rác','Thùng rác phân loại', [0.7,1.35,0.7], 'bin'],
  ['gb-03','greenbay','Giá để xe đạp','Giá chữ U đôi', [1.5,1.15,0.65], 'rack'],
  ['gb-04','greenbay','Đèn đường','Đèn công viên hai nhánh', [1.5,4.5,1.2], 'lamp'],
  ['gb-05','greenbay','Cây non','Cây bóng mát bên phố', [2.8,4.6,2.8], 'tree'],
  ['gb-06','greenbay','Trạm xe buýt','Nhà chờ kính cạnh công viên', [3.8,2.8,1.6], 'shelter'],
  ['gb-07','greenbay','Ô tô gia đình','Xe xanh đỗ bên đường', [4.2,1.8,2.1], 'car'],
  ['gb-08','greenbay','Đài phun nước','Đài phun nước quảng trường', [4.0,2.6,4.0], 'fountain'],
  ['gb-09','greenbay','Cầu trượt','Cầu trượt sân chơi', [4.0,3.6,2.5], 'slide'],
  ['gb-10','greenbay','Quầy cà phê','Quầy cà phê trong công viên', [4.8,3.8,3.4], 'kiosk'],
  ['gb-11','greenbay','Nhà ven phố','Nhà mái ngói có hiên', [6.0,5.0,5.0], 'cottage'],
  ['gb-12','greenbay','Quán cà phê','Quán góc phố hai tầng', [7.0,6.4,5.4], 'cafe'],
  ['gb-13','greenbay','Nhà kính','Nhà kính vườn thực vật', [8.0,5.2,6.0], 'greenhouse'],
  ['gb-14','greenbay','Tòa văn phòng','Tòa nhà nhìn ra vịnh', [7.0,12.0,7.0], 'office'],
  ['gb-15','greenbay','Cầu vòm','Cầu đi bộ qua kênh', [14.0,5.0,5.5], 'archbridge'],
  ['mv-01','metrovale','Trụ chắn xe','Trụ bollard trước quảng trường', [0.65,1.15,0.65], 'bollard'],
  ['mv-02','metrovale','Vòi cứu hỏa','Vòi cứu hỏa góc phố', [0.95,1.35,0.8], 'hydrant'],
  ['mv-03','metrovale','Đèn giao thông','Cột đèn giao thông ba màu', [1.2,4.8,1.0], 'traffic'],
  ['mv-04','metrovale','Xe scooter','Scooter điện dùng chung', [1.9,1.7,0.7], 'scooter'],
  ['mv-05','metrovale','Tủ bán vé','Máy bán vé tàu điện', [1.2,2.1,0.9], 'ticket'],
  ['mv-06','metrovale','Tượng nghệ thuật','Tượng cánh buồm ở quảng trường', [2.8,4.2,2.2], 'sculpture'],
  ['mv-07','metrovale','Taxi','Taxi vàng đón khách', [4.3,1.9,2.1], 'taxi'],
  ['mv-08','metrovale','Xe giao hàng','Xe van giao hàng trong phố', [5.4,2.5,2.5], 'van'],
  ['mv-09','metrovale','Xe buýt điện','Xe buýt điện tuyến trung tâm', [8.0,3.2,2.7], 'bus'],
  ['mv-10','metrovale','Xe điện tram','Toa tram hiện đại', [10.0,3.7,2.8], 'tram'],
  ['mv-11','metrovale','Thư viện','Thư viện thành phố mái kính', [9.0,7.0,8.0], 'library'],
  ['mv-12','metrovale','Chung cư','Tòa căn hộ có ban công', [8.0,15.0,7.0], 'apartment'],
  ['mv-13','metrovale','Bệnh viện','Bệnh viện đa khoa trung tâm', [12.0,12.0,9.0], 'hospital'],
  ['mv-14','metrovale','Nhà ga trên cao','Nhà ga metro và sân ga', [15.0,8.0,7.0], 'station'],
  ['mv-15','metrovale','Cầu dây văng','Cầu lớn bắc qua sông', [22.0,12.0,8.0], 'cablebridge'],
].map(([id,city,title,description,size,kind], i) => ({ id, city, level: i % 15 + 1, title, description, size, kind }));

const MAT = {
  wood: 0x9a633d, wood2: 0xc18a55, paleWood: 0xe2bd80, leaf: 0x48a65b, leaf2: 0x70bf64,
  grass: 0x70bd65, dark: 0x344756, metal: 0x758797, silver: 0xb4c2c9, black: 0x29313c,
  road: 0x626f79, concrete: 0xc8d0cc, cream: 0xf1e6cb, white: 0xf5f5ed, glass: 0x8ad7e7,
  blue: 0x39a8cf, navy: 0x284f75, teal: 0x1e9b91, red: 0xe2544b, orange: 0xf19143,
  yellow: 0xf1c644, lime: 0x9bc34d, pink: 0xe9899a, purple: 0x8063b6, brick: 0xc9755a,
  roof: 0x9e5543, stone: 0x9da5a0, water: 0x42bddd, gold: 0xe3ae40,
};

export function buildMission(mission) {
  const root = new THREE.Group(); root.name = mission.id;
  const mats = new Map();
  function material(color, opts={}) {
    const key = `${color}_${opts.metalness||0}_${opts.roughness??0.72}_${opts.transparent?1:0}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({color, roughness: opts.roughness??0.72, metalness:opts.metalness||0, transparent:!!opts.transparent, opacity:opts.opacity??1}));
    return mats.get(key);
  }
  function mesh(geometry,color,x=0,y=0,z=0,rx=0,ry=0,rz=0, name='part') {
    const o=new THREE.Mesh(geometry,material(color)); o.position.set(x,y,z); o.rotation.set(rx,ry,rz); o.name=name; o.castShadow=true; o.receiveShadow=true; root.add(o); return o;
  }
  function box(w,h,d,c,x=0,y=h/2,z=0,name='box') { return mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,0,0,0,name); }
  function cyl(rt,rb,h,c,x=0,y=h/2,z=0,seg=12,name='cylinder',rx=0,rz=0) { return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),c,x,y,z,rx,0,rz,name); }
  function sphere(r,c,x=0,y=r,z=0,seg=12) { return mesh(new THREE.SphereGeometry(r,seg,8),c,x,y,z,0,0,0,'sphere'); }
  function cone(r,h,c,x=0,y=h/2,z=0,seg=10) { return mesh(new THREE.ConeGeometry(r,h,seg),c,x,y,z,0,0,0,'cone'); }
  function beam(a,b,r,c,seg=8) { const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b), v=B.clone().sub(A); const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),seg),c,...A.clone().add(B).multiplyScalar(.5).toArray(),0,0,0,'beam'); o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()); return o; }
  function bar(a,b,w,d,c,name='square-beam') { const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const o=mesh(new THREE.BoxGeometry(w,v.length(),d),c,...A.clone().add(B).multiplyScalar(.5).toArray(),0,0,0,name);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o; }
  function wheel(x,z,r=.34,c=MAT.black,y=.42) { cyl(r,r,.16,c,x,y,z,12,'wheel',Math.PI/2,0); cyl(r*.48,r*.48,.17,MAT.silver,x,y,z,12,'hub',Math.PI/2,0); }
  function windowBox(x,y,z,w,h,c=MAT.glass,d=.08) { box(w,h,d,c,x,y,z,'window'); box(w+.08,.07,d+.03,MAT.white,x,y,z,'sill'); }
  function tree(x,z,h=4, crown=1) { box(.38,h*.56,.38,MAT.wood,x,h*.28,z,'square-trunk'); box(crown*1.35,crown*.82,crown*1.2,MAT.leaf,x,h*.68,z,'block-canopy'); box(crown*.9,crown*.66,crown*.86,MAT.leaf2,x-crown*.42,h*.91,z+.12,'block-canopy'); box(crown*.92,crown*.72,crown*.9,0x39934c,x+crown*.4,h*.87,z-.08,'block-canopy'); }
  function car(body=MAT.blue, length=4.2) { const w=1.9; box(length*.58,.62,w,body,0,.72,0,'car-body'); box(length*.37,.68,w*.76,body,.12,1.35,0,'cab'); box(length*.32,.45,w*.8,MAT.glass,.12,1.39,0,'windshield'); for(const x of [-length*.32,length*.32]) for(const z of [-w*.5,w*.5]) wheel(x,z,.34); box(.1,.2,w*.72,MAT.white,length*.29,.82,0,'headlights'); box(.1,.16,w*.72,MAT.red,-length*.3,.8,0,'tail-lights'); }
  function building(w,h,d,wall=MAT.cream, floors=3, win=MAT.glass) { box(w,h,d,wall,0,h/2,0,'building'); for(let f=1;f<floors;f++){ const y=f*h/floors; for(let x=-w/2+.65;x<w/2-.35;x+=1.25){ windowBox(x,y,-d/2-.045,.7,.8,win); } } box(w+.45,.25,d+.45,MAT.roof,0,h+.12,0,'roof'); }

  switch(mission.kind) {
    case 'bench':
      for(let z=-.29;z<=.3;z+=.2) box(1.75,.11,.16,MAT.wood2,0,.82,z,'seat-plank');
      for(let z=-.29;z<=.3;z+=.2) box(1.75,.11,.16,MAT.wood2,0,1.16,z,'back-plank');
      for(const x of [-.66,.66]) { bar([x,.05,-.34],[x,.86,-.34],.13,.13,MAT.dark); bar([x,.05,.34],[x,.86,.34],.13,.13,MAT.dark); bar([x,.72,-.34],[x,1.25,-.34],.12,.12,MAT.dark); bar([x,.72,.34],[x,1.25,.34],.12,.12,MAT.dark); } break;
    case 'bin':
      box(.66,.92,.66,MAT.teal,0,.52,0,'bin-body'); box(.74,.14,.74,MAT.dark,0,1.05,0,'lid'); box(.28,.08,.04,MAT.black,0,.92,-.34,'slot'); box(.16,.12,.16,MAT.yellow,0,.35,.34,'recycle-mark'); break;
    case 'rack':
      for(const x of [-.56,.25]) { box(.14,.78,.14,MAT.metal,x,.42,0,'rack-post'); box(.78,.14,.14,MAT.metal,x,.88,0,'rack-top'); } box(1.45,.08,.22,MAT.concrete,0,.06,0,'base'); break;
    case 'lamp':
      box(.22,3.55,.22,MAT.dark,0,1.78,0,'square-lamp-post'); bar([0,3.38,0],[0,4.12,0],.16,.16,MAT.metal); bar([0,4.12,0],[.56,4.28,0],.12,.12,MAT.dark); bar([0,4.12,0],[-.56,4.28,0],.12,.12,MAT.dark); box(.42,.2,.34,MAT.yellow,.58,4.12,0,'block-lamp-head'); box(.42,.2,.34,MAT.yellow,-.58,4.12,0,'block-lamp-head'); box(.42,.12,.38,MAT.dark,0,.08,0,'foot'); break;
    case 'tree': tree(0,0,4.3,1.08); cyl(.72,.82,.16,MAT.wood2,0,.08,0,12,'tree-pit'); break;
    case 'shelter':
      for(const x of [-1.65,1.65]) for(const z of [-.58,.58]) cyl(.055,.07,2.5,MAT.dark,x,1.25,z,8,'shelter-post');
      box(3.55,.13,1.45,MAT.blue,0,2.53,0,'shelter-roof'); box(3.25,.95,.07,MAT.glass,-1.62,1.42,-.58,'glass-panel'); box(3.25,.95,.07,MAT.glass,1.62,1.42,-.58,'glass-panel'); box(2.4,.12,.48,MAT.wood2,0,.82,.25,'bench'); box(.62,.48,.08,MAT.teal,-1.45,1.45,-.66,'route-sign'); break;
    case 'car': car(MAT.teal,4.1); break;
    case 'fountain':
      box(3.55,.38,3.55,MAT.stone,0,.23,0,'square-basin'); box(2.92,.12,2.92,MAT.water,0,.48,0,'water'); box(.88,.76,.88,MAT.concrete,0,.9,0,'block-pedestal'); box(1.7,.22,1.7,MAT.stone,0,1.4,0,'upper-basin'); box(.52,.52,.52,MAT.water,0,1.74,0,'water-column'); box(.82,.16,.82,MAT.concrete,0,2.08,0,'top-cap'); break;
    case 'slide':
      for(const x of [-1.35,1.35]) { beam([x,.08,-.58],[x,2.18,-.58],.075,MAT.yellow); beam([x,.08,.58],[x,2.18,.58],.075,MAT.yellow); }
      box(1.55,.14,1.28,MAT.red,0,2.15,-.58,'platform');
      for(let i=0;i<5;i++){ const t=i/4; beam([-.78,2.05-t*1.65,.58],[.78,2.05-t*1.65,.58],.035,MAT.white); }
      // curved slide represented by a series of joined low-poly segments
      for(let i=0;i<8;i++){const t=i/7; box(.92,.10,.37,MAT.blue,.95+t*.95,1.95-t*1.65,.5+t*.28,'slide-run');}
      break;
    case 'kiosk':
      box(3.1,2.2,2.1,MAT.orange,0,1.2,0,'kiosk'); box(3.5,.18,2.5,MAT.roof,0,2.42,0,'awning'); box(3.3,.22,2.4,MAT.yellow,0,2.58,0,'roof-cap'); box(1.45,.88,.08,MAT.dark,0,1.52,-1.08,'service-window'); box(1.1,.7,.08,MAT.glass,0,1.57,-1.14,'window'); box(.65,.86,.12,MAT.wood2,-1.05,.52,-1.1,'counter'); box(.6,.1,.18,MAT.white,.9,.9,-1.1,'menu'); break;
    case 'cottage':
      box(4.8,3.0,4.0,MAT.cream,0,1.55,0,'house');
      // gabled roof
      for(const z of [-2.12,2.12]) { const g=mesh(new THREE.BufferGeometry(),MAT.roof,0,0,z); const verts=new Float32Array([-2.8,3.05,0,2.8,3.05,0,0,5.0,0,-2.8,3.05,-.12,0,5,-.12,2.8,3.05,-.12]); g.geometry.setAttribute('position',new THREE.BufferAttribute(verts,3)); g.geometry.setIndex([0,1,2,3,4,5]); g.geometry.computeVertexNormals(); }
      box(.95,1.75,.14,MAT.wood2,0,.9,-2.08,'door'); windowBox(-1.45,1.95,-2.09,.86,.9,MAT.glass); windowBox(1.45,1.95,-2.09,.86,.9,MAT.glass); box(5.7,.2,4.7,MAT.stone,0,.1,0,'foundation'); break;
    case 'cafe': building(5.5,5.5,4.0,MAT.brick,2,MAT.glass); box(5.9,.22,4.4,MAT.roof,0,5.62,0,'flat-roof'); box(5.3,1.1,.12,MAT.glass,0,1.0,-2.05,'shopfront'); box(5.5,.17,.45,MAT.yellow,0,2.28,-2.17,'awning'); box(1.8,.26,.18,MAT.cream,0,3.05,-2.1,'sign'); break;
    case 'greenhouse':
      box(7.3,.22,5.2,MAT.concrete,0,.11,0,'foundation');
      for(const x of [-3.45,3.45]) for(const z of [-2.35,2.35]) box(.13,4.2,.13,MAT.metal,x,2.32,z,'square-frame-post');
      for(let z=-2.35;z<=2.35;z+=1.15){box(7.0,.12,.12,MAT.metal,0,.28,z,'frame-rail');box(7.0,.12,.12,MAT.metal,0,4.28,z,'frame-rail');}
      for(let x=-3;x<=3;x+=1.5) box(.055,3.85,.035,MAT.glass,x,2.2,-2.36,'glass-panel-joint');
      for(const x of [-3.5,0,3.5]){bar([x,4.2,-2.4],[x,5.0,0],.12,.12,MAT.metal);bar([x,5,0],[x,4.2,2.4],.12,.12,MAT.metal);}
      for(let x=-2.5;x<=2.5;x+=1.3) for(let z=-1.3;z<=1.3;z+=1.2) {box(.28,.72,.28,MAT.wood2,x,.36,z,'planter');box(.72,.68,.7,MAT.leaf,x,1.05,z,'plant-cube');} break;
    case 'office': building(6.4,11.4,6.2,MAT.navy,9,MAT.glass); for(let y=1.5;y<11;y+=1.3) for(let x=-2.3;x<2.4;x+=1.2) box(.8,.82,.07,(Math.floor(y+x*10)%3===0)?MAT.yellow:MAT.glass,x,y,-3.14,'office-window'); box(6.9,.3,6.7,MAT.concrete,0,.15,0,'plaza'); box(2.2,.55,.16,MAT.cream,0,2,-3.2,'entrance-canopy'); break;
    case 'archbridge':
      box(12,.6,3.8,MAT.stone,0,3.75,0,'bridge-deck');
      for(let x=-5.4;x<=5.4;x+=.9){ const archY=1.05+2.3*Math.sqrt(Math.max(0,1-(x/5.5)**2)); bar([x,.55,-1.45],[x,archY,-1.45],.22,.22,MAT.cream); bar([x,.55,1.45],[x,archY,1.45],.22,.22,MAT.cream); }
      for(const z of [-1.65,1.65]){box(12,.18,.2,MAT.cream,0,4.5,z,'railing-top'); for(let x=-5.5;x<=5.5;x+=1) box(.12,.55,.12,MAT.cream,x,4.2,z,'railing-post');}
      for(const x of [-6.7,6.7]) box(1.4,1.4,4.6,MAT.concrete,x,.7,0,'abutment'); break;
    case 'bollard':
      box(.52,.72,.52,MAT.purple,0,.42,0,'block-bollard'); box(.62,.22,.62,MAT.silver,0,.89,0,'bollard-cap'); box(.72,.12,.72,MAT.stone,0,.06,0,'bollard-base'); break;
    case 'hydrant':
      box(.62,.72,.62,MAT.red,0,.48,0,'hydrant-body'); box(.78,.22,.78,MAT.red,0,.94,0,'hydrant-shoulder'); box(.46,.27,.46,MAT.red,0,1.18,0,'hydrant-cap');
      for(const x of [-1,1]) { box(.42,.3,.42,MAT.red,x*.48,.65,0,'hydrant-outlet'); box(.12,.34,.48,MAT.silver,x*.72,.65,0,'outlet-cap'); } break;
    case 'traffic':
      box(.16,3.9,.16,MAT.dark,0,1.95,0,'square-signal-pole'); bar([0,3.55,0],[.53,3.55,0],.14,.14,MAT.dark);
      box(.78,2.05,.48,MAT.black,.53,3.92,0,'signal-box'); for(let i=0;i<3;i++) box(.4,.4,.08,[MAT.red,MAT.yellow,MAT.grass][i],.53,4.55-i*.64,-.26,'square-signal-light');
      box(.7,.12,.7,MAT.stone,0,.08,0,'base'); break;
    case 'scooter':
      wheel(-.62,.0,.24); wheel(.68,0,.24); beam([-.62,.32,0],[.52,.38,0],.08,MAT.dark); beam([.48,.3,0],[.26,1.28,0],.055,MAT.metal); beam([.03,1.28,0],[.52,1.28,0],.06,MAT.dark); box(.72,.1,.32,MAT.teal,-.05,.38,0,'deck'); box(.16,.48,.12,MAT.black,.3,.72,-.04,'battery'); break;
    case 'ticket':
      box(.95,1.82,.72,MAT.navy,0,.95,0,'ticket-kiosk'); box(.66,.46,.06,MAT.glass,0,1.45,-.38,'screen'); box(.58,.33,.06,MAT.teal,0,.93,-.39,'touch-panel'); box(.5,.12,.06,MAT.yellow,0,.47,-.39,'ticket-slot'); box(.62,.07,.05,MAT.white,0,1.18,-.4,'status-light'); break;
    case 'sculpture':
      cyl(.82,.98,.45,MAT.stone,0,.23,0,12,'plinth');
      // abstract folded sail built from tilted rectangular slabs
      const sail1=box(.62,3.4,.24,MAT.teal,-.2,2.25,0,'block-sail'); sail1.rotation.z=.12;
      const sail2=box(.54,2.8,.22,MAT.gold,.42,2.0,.12,'block-sail'); sail2.rotation.z=-.12;sail2.rotation.y=.9;
      box(.5,.5,.5,MAT.white,0,.65,.6,'anchor-block'); break;
    case 'taxi': car(MAT.yellow,4.2); box(1.05,.17,.25,MAT.white,0,1.82,0,'taxi-sign'); box(.55,.16,.16,MAT.dark,0,1.91,0,'taxi-sign-text'); break;
    case 'van':
      box(4.75,1.45,2.05,MAT.white,0,1.02,0,'van-body'); box(1.65,1.08,1.91,MAT.white,1.42,1.95,0,'van-cab'); box(1.35,.7,.08,MAT.glass,1.42,2.05,-.99,'van-windshield'); box(2.6,.9,.08,MAT.teal,-.9,1.45,-1.04,'cargo-mark'); for(const x of [-1.55,1.55]) for(const z of [-1.06,1.06]) wheel(x,z,.4); break;
    case 'bus':
      box(7.35,2.45,2.4,MAT.teal,0,1.55,0,'bus-body'); box(7.0,.95,.08,MAT.glass,0,2.16,-1.22,'bus-windows'); box(1.25,1.1,.09,MAT.glass,2.75,2.08,-1.22,'driver-window'); box(6.8,.12,.08,MAT.white,0,1.45,-1.24,'beltline'); for(const x of [-2.7,2.7]) for(const z of [-1.2,1.2]) wheel(x,z,.48,.35); box(.32,.24,.08,MAT.yellow,3.68,1.4,-1.25,'headlight'); break;
    case 'tram':
      box(9.2,2.75,2.45,MAT.purple,0,1.78,0,'tram-body'); box(8.9,1.05,.08,MAT.glass,0,2.44,-1.25,'tram-window-band'); box(1.15,1.3,.09,MAT.glass,3.72,2.31,-1.25,'front-window'); for(let x=-3.8;x<=3.8;x+=1.5) box(.08,1.0,.1,MAT.white,x,2.42,-1.3,'window-post'); for(const x of [-3.2,-.9,1.8,3.3]) wheel(x,1.27,.33,.3,.48); beam([0,3.15,0],[0,4.0,0],.055,MAT.dark); beam([0,4,0],[.95,3.8,0],.045,MAT.dark); break;
    case 'library':
      box(8.3,5.6,7.1,MAT.cream,0,2.9,0,'library');
      for(let x=-3.25;x<=3.25;x+=.82) box(.68,3.6,.12,(x%2?MAT.glass:MAT.blue),x,2.95,-3.58,'glass-facade');
      box(8.8,.32,7.6,MAT.concrete,0,5.82,0,'roof-slab');
      // distinctive floating roof canopy
      for(const x of [-3,3]) beam([x,5.95,-2.8],[x*1.2,6.95,0],.12,MAT.gold);
      box(8.7,.2,4.8,MAT.white,0,6.93,0,'canopy'); box(2.0,2.7,.25,MAT.wood2,0,1.45,-3.66,'entry'); box(9,.24,7.8,MAT.stone,0,.12,0,'plaza'); break;
    case 'apartment':
      box(7.4,14.5,6.2,MAT.brick,0,7.3,0,'apartment-tower');
      for(let y=1.5;y<14;y+=1.65) for(let x=-2.7;x<=2.7;x+=1.35){ box(.82,.92,.08,MAT.glass,x,y,-3.16,'balcony-door'); box(.95,.12,.48,MAT.concrete,x,y-.55,-3.4,'balcony'); beam([x-.48,y-.05,-3.64],[x+.48,y-.05,-3.64],.035,MAT.silver); }
      box(7.8,.35,6.6,MAT.white,0,14.7,0,'roof'); for(const x of [-2.5,0,2.5]) box(.55,.7,.5,MAT.roof,x,15.22,0,'roof-vent'); break;
    case 'hospital':
      box(11.2,9.8,7.8,MAT.white,0,5.0,0,'hospital-main'); box(4.8,2.2,4.4,MAT.white,0,11.0,0,'hospital-upper');
      for(let y=2;y<9;y+=1.65) for(let x=-4.3;x<=4.4;x+=1.45) windowBox(x,y,-3.98,.8,.92,MAT.glass,.07);
      box(3.1,.55,.2,MAT.red,0,7.2,-4.03,'medical-cross-bar'); box(.55,2.0,.2,MAT.red,0,7.2,-4.05,'medical-cross-stem'); box(4.3,.45,1.4,MAT.blue,0,.3,-4.5,'emergency-portico'); box(3.7,.1,1.3,MAT.white,0,2.45,-4.1,'sign'); break;
    case 'station':
      // elevated platform and station concourse
      box(13.8,.5,5.3,MAT.concrete,0,4.0,0,'platform'); box(10.8,2.6,3.4,MAT.navy,0,5.55,0,'station-hall');
      for(let x=-4.6;x<=4.6;x+=1.55) windowBox(x,5.7,-1.76,1.0,1.45,MAT.glass,.08);
      box(14.4,.2,6.1,MAT.yellow,0,6.95,0,'platform-roof'); for(const x of [-6.1,6.1]) for(const z of [-2.1,2.1]) cyl(.09,.1,3.0,MAT.metal,x,5.5,z,8,'station-column');
      for(const x of [-4.8,4.8]) for(const z of [-1.9,1.9]) cyl(.34,.4,3.6,MAT.dark,x,1.8,z,10,'support-pillar');
      for(const z of [-1.15,1.15]) box(15,.12,.12,MAT.dark,0,.36,z,'rail'); break;
    case 'cablebridge':
      box(19,.7,4.8,MAT.road,0,5.3,0,'bridge-deck');
      for(const x of [-6.4,6.4]) { box(.55,11.2,.65,MAT.red,x,5.6,0,'bridge-tower'); box(1.8,.3,1.0,MAT.white,x,10.1,0,'tower-cap'); }
      for(const z of [-1.85,1.85]) { beam([-10,6,z],[10,6,z],.11,MAT.silver); for(let x=-9.5;x<=9.5;x+=.65){ const tower=x<0?-6.4:6.4; const top=10.0-Math.abs(Math.abs(x)-6.4)*.43; beam([tower,top,z],[x,5.68,z],.035,MAT.white); } }
      for(const z of [-2.1,2.1]) { beam([-9.5,6,z],[9.5,6,z],.08,MAT.white); for(let x=-9;x<=9;x+=1.0) beam([x,5.65,z],[x,6,z],.04,MAT.white); }
      for(const x of [-11.6,11.6]) box(2.4,3.0,5.3,MAT.stone,x,1.5,0,'bridge-abutment');
      box(22,.22,8,MAT.water,0,-.08,0,'river-base'); break;
  }
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const center=bounds.getCenter(new THREE.Vector3());
  root.position.x-=center.x; root.position.z-=center.z; root.position.y-=bounds.min.y;
  root.updateMatrixWorld(true);
  return { root, materials:[...mats.values()] };
}

/* A shared, miniature city tableau for the city overview tab. The individual
   mission GLBs above remain metre-accurate; these copies are composed and
   lightly rescaled only to make every landmark visible in one city view. */
export function buildCityScene(cityId) {
  const root=new THREE.Group();root.name=`${cityId}-city-overview`;
  const city=cities.find(c=>c.id===cityId), list=missions.filter(m=>m.city===cityId);
  const mat=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
  const colors=cityId==='greenbay'
    ? {ground:0x81bb7d,road:0x566c6b,walk:0xd8d7c7,accent:0x4a9c73,water:0x50b9d4,building:[0xf0dcb5,0xe4b278,0xc5ddd0,0x86b6bd]}
    : {ground:0x9ab48e,road:0x4f626e,walk:0xd4d4ca,accent:0x8072b3,water:0x48aeca,building:[0xded4ee,0xb6cbd4,0xf0c3a7,0x8f9eae]};
  const addBox=(w,h,d,color,x,y,z,name='city-part')=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));o.name=name;o.position.set(x,y+h/2,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
  const addCyl=(r,h,color,x,y,z)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8),mat(color));o.position.set(x,y+h/2,z);o.castShadow=true;root.add(o);return o;};
  // Continuous landscaped base and a clear street grid.
  addBox(92,.55,70,colors.ground,0,-.55,0,'city-island');
  for(const x of [-24,-8,8,24]) addBox(5,.035,68,colors.road,x,.005,0,'avenue');
  for(const z of [-18,0,18]) addBox(88,.04,4.2,colors.road,0,.01,z,'cross-street');
  for(const x of [-24,-8,8,24]) for(const z of [-18,0,18]) {
    addBox(5.05,.045,1.1,colors.walk,x,.018,z-2.6,'crosswalk');
    for(let i=-1;i<=1;i++) addBox(.19,.052,3.5,0xf3edcf,x+i*.85,.02,z,'lane-mark');
  }
  // A city-specific public green and waterfront / civic plaza.
  if(cityId==='greenbay') {
    addBox(10,.08,69,colors.water,-41,.01,0,'bay-water');
    addBox(7,.12,69,0xb4cdb0,-33,.04,0,'waterfront-walk');
    addBox(13,.08,11,0x65a96c,16,.04,25,'park-lawn');
    for(const [x,z] of [[11,22],[20,22],[11,28],[20,28],[15.5,24]]) {
      addBox(.38,2.2,.38,0x79573a,x,0,z,'park-tree-trunk');addBox(2.4,2,2.3,0x5ca568,x,2.1,z,'park-tree-crown');
    }
    addBox(10,.12,7,0xd1bd91,-15,.05,25,'harbor-plaza');
  } else {
    addBox(11,.08,69,colors.water,40,.01,0,'river-channel');
    addBox(5,.12,69,0xb8c8ab,32,.04,0,'river-promenade');
    addBox(14,.09,12,0x8072b3,-15,.04,-25,'civic-plaza');
    for(let i=0;i<6;i++) addBox(.55,.75,.55,0xede8dc,-20+i*2,.47,-25,'plaza-bollard');
  }
  // Background city blocks use chunky, readable silhouettes with simple inset windows.
  const backRows=cityId==='greenbay'
    ? [[-31,-27,5,9,5],[-16,-27,6,12,6],[1,-27,6,8,6],[17,-27,7,15,7],[33,-27,6,10,6],[-31,27,6,11,5],[-12,27,7,9,6],[4,27,6,13,6],[33,27,8,17,7]]
    : [[-32,-27,7,17,6],[-17,-27,8,22,7],[2,-27,7,16,7],[17,-27,7,25,7],[-32,27,8,20,7],[-15,27,7,15,6],[3,27,8,23,7],[18,27,8,19,7]];
  backRows.forEach(([x,z,w,h,d],i)=>{
    const c=colors.building[i%colors.building.length]; addBox(w,h,d,c,x,0,z,'background-building');
    const floors=Math.max(2,Math.floor(h/2.4)),windowRows=[1.0,Math.max(1.8,h-1.5)];
    for(const y of windowRows) for(let k=0;k<Math.min(3,Math.max(1,Math.floor(w/2.2)));k++)
      addBox(.72,.78,.04,cityId==='greenbay'?0x9ad7df:0xa8d9e2,x-(Math.min(3,Math.max(1,Math.floor(w/2.2)))-1)*.95/2+k*.95,y,z-d/2-.03,'building-window');
    addBox(w+.25,.24,d+.25,cityId==='greenbay'?0x777c72:0x626f78,x,h,z,'roof-cap');
  });
  // Place all 15 signature mission objects inside their own blocks.
  const xs=[-32,-16,0,16,32], zs=[-18,0,18];
  list.forEach((mission,i)=>{
    const {root:obj}=buildMission(mission);obj.name=`landmark-${mission.id}`;
    obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const b=new THREE.Box3().setFromObject(obj),size=b.getSize(new THREE.Vector3());
    const footprint=Math.max(size.x,size.z), desired=mission.level<5?2.8:mission.level<10?4.1:6.2;
    const scale=desired/Math.max(.1,footprint);obj.scale.setScalar(scale);
    const col=i%5,row=Math.floor(i/5),x=xs[col],z=zs[row];
    obj.position.set(x,0,z);root.add(obj);
    // A small colored plinth ties each task prop to its city block.
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(6.4,.12,6.4),mat(city.palette[i%city.palette.length]));plinth.position.set(x,-.05,z);plinth.receiveShadow=true;plinth.name=`mission-pad-${mission.id}`;root.add(plinth);
  });
  root.updateMatrixWorld(true);return root;
}

/* A stand-alone visual sample of the cube language for the follow-up session.
   The production puzzle uses its own 0.985-cell meshes; this kit documents
   proportions, bevel intention and the face-marking vocabulary. */
export function buildTinyBlockKit() {
  const root=new THREE.Group();root.name='tiny-block-design-reference';
  const palette=[0x41bd79,0x31a9d4,0xf1c748,0xa67be0,0xf0795f];
  const arrowShape=new THREE.Shape();arrowShape.moveTo(-.22,-.065);arrowShape.lineTo(.12,-.065);arrowShape.lineTo(.12,-.16);arrowShape.lineTo(.34,0);arrowShape.lineTo(.12,.16);arrowShape.lineTo(.12,.065);arrowShape.lineTo(-.22,.065);arrowShape.closePath();
  const arrowGeo=new THREE.ShapeGeometry(arrowShape);
  const arrowMat=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  const cubeGeo=new RoundedBoxGeometry(.92,.92,.92,3,.078);
  for(let i=0;i<5;i++){
    const col=i%3,row=Math.floor(i/3),x=(col-1)*1.35,z=(row-.5)*1.45;
    const cube=new THREE.Mesh(cubeGeo,new THREE.MeshStandardMaterial({color:palette[i],roughness:.62}));cube.position.set(x,.58,z);cube.name=`tiny-block-${i+1}`;cube.castShadow=true;root.add(cube);
    const mark=new THREE.Mesh(arrowGeo,arrowMat);mark.rotation.x=-Math.PI/2;mark.position.set(x,.58+.466,z);mark.name='direction-glyph';root.add(mark);
    const side=new THREE.Mesh(arrowGeo,arrowMat);side.rotation.y=Math.PI/2;side.position.set(x+.466,.58,z);side.name='direction-glyph';root.add(side);
  }
  const board=new THREE.Mesh(new THREE.BoxGeometry(5.5,.12,3.7),new THREE.MeshStandardMaterial({color:0x344f43,roughness:1}));board.position.set(0,.02,0);board.name='display-base';root.add(board);
  root.updateMatrixWorld(true);return root;
}
