import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname).replace(/^\//,'').replaceAll('%20',' ');
const out=path.resolve(root);
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
  if(req.method!=='POST'){res.writeHead(405);return res.end('POST only');}
  let dest;
  if(url.pathname==='/manifest') dest=path.join(out,'manifest.json');
  else { const m=url.pathname.match(/^\/upload\/(models|cities|tiny-blocks)\/([a-z0-9-]+\.glb)$/); if(m) dest=path.join(out,m[1]==='cities'?'city-scenes':m[1],m[2]); }
  if(!dest){res.writeHead(404);return res.end('not found');}
  const chunks=[];let bytes=0;
  req.on('data',c=>{bytes+=c.length;if(bytes>40_000_000){req.destroy();}else chunks.push(c);});
  req.on('end',()=>{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.concat(chunks));res.writeHead(200,{'Access-Control-Allow-Origin':'*','Content-Type':'text/plain'});res.end(`saved ${path.basename(dest)} (${bytes} bytes)`);console.log(`saved ${path.relative(out,dest)} ${bytes}`);});
});
server.listen(8090,'127.0.0.1',()=>console.log(`City asset writer listening on 127.0.0.1:8090 → ${out}`));
