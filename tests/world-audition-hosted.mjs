#!/usr/bin/env node
// Exact published-revision test. Separate from the production museum hosted check.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const raw=process.argv[2],sha=process.argv[3];
if(!raw||!sha)throw Error('usage: node tests/world-audition-hosted.mjs https://westkitty.github.io/museum_demos/ SHA');
const base=new URL(raw);
assert.equal(base.protocol,'https:');
assert.equal(base.pathname,'/museum_demos/','refuse unrelated Pages site');
async function get(rel){
 const url=new URL(rel,base);
 const r=await fetch(url,{cache:'no-store',redirect:'follow'});
 if(!r.ok)throw Error(`${url.pathname}: HTTP ${r.status}`);
 if(new URL(r.url).origin!==base.origin)throw Error(`unexpected redirect: ${r.url}`);
 return r;
}
const receipt=await (await get('build-info.json')).json();
assert.equal(receipt.sha,sha,'Pages revision is not the intended commit');
assert.equal(receipt.base,'/museum_demos/');
const lab=await (await get('world-audition/')).text();
assert(lab.includes('world-json')&&lab.includes('World Audition Lab'));
const manifest=await (await get('world-audition/docs/PUBLIC_PAYLOADS.json')).json();
const catalog=await (await get('world-audition/assets/worlds.json')).json();
assert.equal(catalog.length,21);assert.equal(catalog.filter(w=>w.playable_candidate).length,21);
assert.equal(manifest.length,21);
const worker=await (await get('world-audition/sw.js')).text();
assert(worker.includes('ZIP_STORED'));
const payload=manifest.find(x=>x.slug==='dollhouse');
assert(payload);
const data=Buffer.from(await (await get('world-audition/payload/dollhouse.zip')).arrayBuffer());
assert.equal(createHash('sha256').update(data).digest('hex'),payload.sha256);
const inf=manifest.find(x=>x.slug==='infinitum');assert(inf);
const infdata=Buffer.from(await (await get('world-audition/payload/infinitum.zip')).arrayBuffer());
assert.equal(createHash('sha256').update(infdata).digest('hex'),inf.sha256);
for(const asset of ['vendor/three187/three.core.js','vendor/three187/three.module.js','vendor/three187/OrbitControls.js'])await get('world-audition/'+asset);
console.log('PASS hosted World Audition Lab: exact SHA, 21 preview payloads, Three.js r187, service worker and payload hashes');