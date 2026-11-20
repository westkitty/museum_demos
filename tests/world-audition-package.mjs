import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/world-audition');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hit=html.match(/<script id="world-json" type="application\/json">([\s\S]*?)<\/script>/);
assert(hit,'embedded catalog exists');
const catalog=JSON.parse(hit[1]);
assert.equal(catalog.length,21);
assert.equal(new Set(catalog.map(x=>x.id)).size,21);
assert.equal(catalog.flatMap(x=>x.opportunities).length,105);
assert.equal(catalog.filter(x=>x.playable_candidate).length,21);
assert(!fs.existsSync(path.join(root,'archives')),'private source archives must not be public');
assert(!fs.existsSync(path.join(root,'worlds')),'no raw build/source tree may be public');
for(const file of ['index.html','assets/worlds.json']){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 assert(!/(?:\/mnt\/data|\/Users\/|\/home\/oai|(?:C:|D:)\\\\Users\\\\)/.test(text),`${file} contains internal build-machine paths`);
}
for(const rel of ['vendor/three187/three.core.js','vendor/three187/three.module.js','vendor/three187/OrbitControls.js','vendor/three187/LICENSE.txt','sw.js','assets/lab.js','assets/lab.css','assets/public-boot.js','vendor/three.module.min.js','vendor/three.core.min.js','vendor/THREE_LICENSE.txt'])assert(fs.existsSync(path.join(root,rel)),rel);
const payloads=JSON.parse(fs.readFileSync(path.join(root,'docs/PUBLIC_PAYLOADS.json'),'utf8'));
assert.equal(payloads.length,21);
for(const c of catalog.filter(x=>x.playable_candidate)){
 const archive=fs.readFileSync(path.join(root,'payload',c.id+'.zip'));
 const entries=new Map();let o=0;
 while(o+30<=archive.length&&archive.readUInt32LE(o)===0x04034b50){
  const flags=archive.readUInt16LE(o+6),method=archive.readUInt16LE(o+8);
  const size=archive.readUInt32LE(o+18),n=archive.readUInt16LE(o+26),extra=archive.readUInt16LE(o+28);
  assert.equal(flags&8,0,`${c.id} must have no ZIP data descriptors`);
  assert.equal(method,0,`${c.id} must use ZIP_STORED`);
  const name=archive.toString('utf8',o+30,o+30+n),start=o+30+n+extra;
  assert(start+size<=archive.length,`${c.id} in-range entry`);
  assert(!/\.(?:ts|tsx|map|log|zip)$/i.test(name),`${c.id} public runtime only: ${name}`);
  if(!name.endsWith('/'))entries.set(name,archive.subarray(start,start+size));
  o=start+size;
 }
 assert(entries.has('worlds/'+c.id+'/index.html'),`${c.id} launch document`);
 const page=entries.get('worlds/'+c.id+'/index.html').toString();
 for(const m of page.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
  const ref=m[1];if(!ref||ref.startsWith('#')||/^(data:|blob:|https?:|mailto:)/i.test(ref))continue;
  assert(!ref.startsWith('/'),`${c.id} no root-relative refs: ${ref}`);
  const target=path.posix.normalize(path.posix.join('worlds',c.id,decodeURIComponent(ref.split('?')[0].split('#')[0])));
  assert(entries.has(target)||fs.existsSync(path.join(root,target)),`${c.id} missing ${target}`);
 }
}
console.log(`PASS public artifact: ${catalog.length} families, 21 stored preview payloads, 105 proposals, 0 private ZIP archives`);