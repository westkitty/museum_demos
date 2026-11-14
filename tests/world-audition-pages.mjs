#!/usr/bin/env node
// Independent public Pages contract. Does not touch the production museum registry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const app=path.join(root,'world-audition');
const required=['index.html','assets/lab.css','assets/lab.js','assets/public-boot.js','assets/worlds.json','sw.js','vendor/three.module.min.js','vendor/THREE_LICENSE.txt','docs/PUBLIC_PAYLOADS.json'];
for(const f of required)assert(existsSync(path.join(app,f)),`Pages release missing ${f}`);
const info=JSON.parse(readFileSync(path.join(root,'build-info.json'),'utf8'));
assert.equal(info.base,'/museum_demos/','GitHub Pages base must be this repository');
if(process.env.MUSEUM_BUILD_SHA)assert.equal(info.sha,process.env.MUSEUM_BUILD_SHA);
const catalog=JSON.parse(readFileSync(path.join(app,'assets/worlds.json'),'utf8'));
const html=readFileSync(path.join(app,'index.html'),'utf8');
const embedded=JSON.parse(html.match(/<script id="world-json" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
assert.deepEqual(embedded,catalog,'embedded catalogue must match JSON source');
assert.equal(catalog.length,21);
assert.equal(catalog.flatMap(w=>w.opportunities).length,105);
assert.equal(catalog.filter(w=>w.playable_candidate).length,20);
for(const name of ['index.html','assets/worlds.json']){
 const text=readFileSync(path.join(app,name),'utf8');
 assert(!/(?:\/mnt\/data|\/Users\/|\/home\/oai|(?:C:|D:)\\\\Users\\\\)/.test(text),`${name}: leaked build path`);
}
const manifest=JSON.parse(readFileSync(path.join(app,'docs/PUBLIC_PAYLOADS.json'),'utf8'));
assert.equal(manifest.length,20);
const byId=new Map(manifest.map(x=>[x.slug,x]));
for(const w of catalog.filter(x=>x.playable_candidate)){
 const m=byId.get(w.id);assert(m,`missing payload for ${w.id}`);
 const p=path.join(app,'payload',w.id+'.zip');
 assert(existsSync(p),`missing ${w.id} ZIP`);
 const buffer=readFileSync(p);
 assert.equal(buffer.length,m.bytes,`${w.id} unexpected bytes`);
 assert.equal(createHash('sha256').update(buffer).digest('hex'),m.sha256,`${w.id} hash mismatch`);
}
for(const forbidden of ['archives','src','source','node_modules','.env'])assert(!existsSync(path.join(app,forbidden)),`public site includes ${forbidden}`);
const bytes=manifest.reduce((sum,x)=>sum+x.bytes,0);
console.log(`PASS Pages Lab: ${catalog.length} families, ${manifest.length} verified lazy payloads, ${(bytes/1024/1024).toFixed(2)} MiB deferred, 105 proposed ideas, no original source archives or absolute build paths`);