/* ZIP_STORED public preview transport. No private source archives are shipped. */
const scope=new URL(self.registration.scope);
const running=new Map();
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',glb:'model/gltf-binary',gltf:'model/gltf+json',woff:'font/woff',woff2:'font/woff2',wasm:'application/wasm',bin:'application/octet-stream',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',txt:'text/plain; charset=utf-8'};
function zipEntries(buffer){const v=new DataView(buffer),out=new Map();let o=0;
 while(o+30<=buffer.byteLength&&v.getUint32(o,true)===0x04034b50){
  const flags=v.getUint16(o+6,true),method=v.getUint16(o+8,true),n=v.getUint32(o+18,true),ln=v.getUint16(o+26,true),ex=v.getUint16(o+28,true);
  if(flags&8||method!==0)throw new Error('Expected seekable ZIP_STORED payload');
  const p=o+30+ln+ex;
  if(p+n>buffer.byteLength)throw new Error('Truncated preview payload');
  const name=new TextDecoder().decode(new Uint8Array(buffer,o+30,ln));
  if(!name.endsWith('/'))out.set(name,{offset:p,length:n});o=p+n;
 }return out;
}
async function load(slug){if(running.has(slug))return running.get(slug);const req=(async()=>{
 const file=new URL('./payload/'+encodeURIComponent(slug)+'.zip',scope);
 const r=await fetch(file.toString(),{cache:'force-cache'});if(!r.ok)throw Error('Preview payload '+r.status);
 const buffer=await r.arrayBuffer();return{buffer,entries:zipEntries(buffer)};
})();running.set(slug,req);if(running.size>2)running.delete(running.keys().next().value);
 return req.catch(e=>{running.delete(slug);throw e;});}
// Gardens' optional standalone offline worker cannot be installed via the
// Lab's virtual ZIP transport: Chromium fetches SW installation scripts
// directly from the physical host. Preserve the original ZIP, and suppress
// only this known optional registration in the served module.
function adaptGardensModule(slug,key,bytes){
 if(slug!=='gardens'||key!=='worlds/gardens/src/main.js')return bytes;
 const source=new TextDecoder().decode(bytes);
 const marker="navigator.serviceWorker.register('./sw.js').catch(() => { });";
 // Fail open to untouched gameplay if the archived source ever drifts.
 if(source.split(marker).length!==2)return bytes;
 return new TextEncoder().encode(source.replace(marker,
   'void 0; /* Lab outer service worker owns this offline preview. */'));
}

// A source-pinned adapter for a 700ms introduction-tour race in Theater.
// The original ZIP is immutable. Only the exact archived module is adapted,
// and any source drift leaves the bytes untouched for regression detection.
function adaptTheaterTour(slug,key,bytes){
 if(slug!=='theater'||key!=='worlds/theater/assets/index-BDYrz-Ry.js')return bytes;
 const source=new TextDecoder().decode(bytes);
 const replacements=[
  ['const yt=W("tour-dialog"),lt=','let __labTourPending=null;const yt=W("tour-dialog"),lt='],
  ['v=function(){tt=0,R(),yt.showModal()}','v=function(){window.clearTimeout(__labTourPending),__labTourPending=null,tt=0,R(),yt.showModal()}'],
  ['b=function(){document.querySelectorAll(".tour-highlight").forEach(M=>M.classList.remove("tour-highlight")),yt.close(),Pt.tourSeen=!0,i()}','b=function(){window.clearTimeout(__labTourPending),__labTourPending=null,document.querySelectorAll(".tour-highlight").forEach(M=>M.classList.remove("tour-highlight")),yt.close(),Pt.tourSeen=!0,i()}'],
  ['Pt.tourSeen||window.setTimeout(v,700)','Pt.tourSeen||(__labTourPending=window.setTimeout(v,700))']
 ];
 if(replacements.some(([before])=>source.split(before).length!==2))return bytes;
 let adapted=source;
 for(const [before,after] of replacements)adapted=adapted.replace(before,after);
 return new TextEncoder().encode(adapted);
}

async function serve(url){const suffix=url.pathname.slice(scope.pathname.length);const parts=suffix.split('/');
 if(parts[0]!=='worlds'||parts.length<3)return fetch(url.toString());
 const slug=parts[1];if(!/^[a-z0-9-]+$/.test(slug))return new Response('Invalid world',{status:400});
 try{const {buffer,entries}=await load(slug),key=parts.join('/'),entry=entries.get(key);
  if(!entry)return new Response('Missing preview resource',{status:404});
  const raw=new Uint8Array(buffer,entry.offset,entry.length),ext=key.split('.').pop().toLowerCase();
  const bytes=adaptTheaterTour(slug,key,adaptGardensModule(slug,key,raw));
  return new Response(bytes,{status:200,headers:{'Content-Type':types[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=86400'}});
 }catch(e){return new Response('Preview could not load',{status:503});}}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname+'worlds/'))return;
 event.respondWith(serve(url));});