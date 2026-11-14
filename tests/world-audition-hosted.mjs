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
assert.equal(catalog.length,21);assert.equal(catalog.filter(w=>w.playable_candidate).length,20);
assert.equal(manifest.length,20);
const worker=await (await get('world-audition/sw.js')).text();
assert(worker.includes('ZIP_STORED'));
const payload=manifest.find(x=>x.slug==='dollhouse');
assert(payload);
const data=Buffer.from(await (await get('world-audition/payload/dollhouse.zip')).arrayBuffer());
assert.equal(createHash('sha256').update(data).digest('hex'),payload.sha256);
console.log('PASS hosted World Audition Lab: exact SHA, 21 catalog, 20 previews, service worker and Dollhouse payload hash');