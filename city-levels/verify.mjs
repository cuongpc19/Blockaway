/* Kiểm độc lập bằng JS: đúng luật engine, chạy hết 30 màn, không render. */
import fs from 'fs';
const data = JSON.parse(fs.readFileSync(new URL('./city-levels.json', import.meta.url),'utf8'));
const DIRV=[null,[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
let bad=0, totTaps=0;
for(const L of data.levels){
  const size=L.size, k=(x,y,z)=>(x*64+y)*64+z;
  const live=new Map(), fixed=new Set();
  for(const b of L.blocks){ if(b[4]===1) live.set(k(b[0],b[1],b[2]),b); else fixed.add(k(b[0],b[1],b[2])); }
  for(const s of L.solid) fixed.add(k(s[0],s[1],s[2]));
  const clear=b=>{const d=DIRV[b[3]];let x=b[0]+d[0],y=b[1]+d[1],z=b[2]+d[2];
    while(x>=0&&x<size[0]&&y>=0&&y<size[1]&&z>=0&&z<size[2]){const q=k(x,y,z);
      if(fixed.has(q)||live.has(q))return false;x+=d[0];y+=d[1];z+=d[2];}return true;};
  let taps=0,minFree=1e9,sum=0,steps=0;
  for(;;){
    const free=[...live.values()].filter(clear);
    if(!free.length)break;
    minFree=Math.min(minFree,free.length);sum+=free.length;steps++;
    const b=free[free.length>>1];live.delete(k(b[0],b[1],b[2]));taps++;
  }
  totTaps+=taps;
  const ok=live.size===0;
  if(!ok){bad++;console.log('KET',L.id,'con',live.size);}
  else console.log(`${L.id} lv${String(L.level).padStart(2)} ${String(taps).padStart(3)} luot  min${String(minFree).padStart(3)}  TB ${(sum/steps).toFixed(1).padStart(5)}  ${L.hard?'KHO':'   '} ${L.title}`);
}
console.log(bad? `\n${bad} MAN KET`:'\n30/30 man giai het, tong '+totTaps+' luot bam');
