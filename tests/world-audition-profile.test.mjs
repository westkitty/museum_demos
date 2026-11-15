import test from 'node:test';
import assert from 'node:assert/strict';
import {durationMs,median,classifyTrace,expectedBackend,parseArgs} from './world-audition-profile-core.mjs';
test('duration guards refuse negative/unrecorded timestamps',()=>{
 assert.equal(durationMs(10,20.21),10.2);
 assert.equal(durationMs(undefined,20),null);
 assert.equal(durationMs(20,10),null);
});
test('median keeps actual distributions, ignores nonnumeric observations',()=>{
 assert.equal(median([7,2,3]),3);
 assert.equal(median([9,2,3,7]),5);
 assert.equal(median([]),null);
});
test('backend identity fails closed and Metal is never accepted as SwiftShader',()=>{
 assert.equal(expectedBackend('swiftshader','ANGLE (Google, Vulkan SwiftShader Device, SwiftShader driver)'),true);
 assert.equal(expectedBackend('metal','ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)'),true);
 assert.equal(expectedBackend('metal','ANGLE (Google, SwiftShader driver)'),false);
 assert.equal(expectedBackend('swiftshader','ANGLE Metal Renderer: Apple M4'),false);
});
test('CLI fails closed on Mac/backend mismatch, arbitrary output paths, or excessive work',()=>{
 assert.equal(parseArgs(['--mode=metal'],'darwin').runs,2);
 assert.equal(parseArgs(['--mode=swiftshader'],'linux').runs,1);
 assert.throws(()=>parseArgs(['--mode=metal'],'linux'),/Apple host/);
 assert.throws(()=>parseArgs(['--mode=metal','--runs=10'],'darwin'),/1\.\.3/);
 assert.throws(()=>parseArgs(['--mode=metal','--out=..\/bad.json'],'darwin'),/local test-results/);
 assert.throws(()=>parseArgs(['--mode=metal','--oops=x'],'darwin'),/Unsupported/);
});
const completed={trustedClick:true,keydownTrusted:true,handlerCalls:1,handlerEndAt:25,input:'keyboard',contextAt:10,firstDrawAt:20,nextRafAt:30,iframeRemoved:true,pageErrors:[]};
test('a slow trusted interaction is distinguished from failed input',()=>{
 assert.equal(classifyTrace({...completed,actionError:'Playwright action exceeded budget'}),'SLOW_ACTION_WITH_RENDER_PROOF');
 assert.equal(classifyTrace({...completed,trustedClick:false}),'TRUSTED_INPUT_NOT_OBSERVED');
 assert.equal(classifyTrace({...completed,keydownTrusted:false}),'TRUSTED_KEYDOWN_NOT_OBSERVED');
 assert.equal(classifyTrace({...completed,handlerCalls:0}),'ENTER_HANDLER_NOT_OBSERVED');
 assert.equal(classifyTrace({...completed,contextAt:null}),'NO_WEBGL_CONTEXT');
 assert.equal(classifyTrace({...completed,firstDrawAt:null}),'NO_WEBGL_DRAW');
 assert.equal(classifyTrace({...completed,iframeRemoved:false}),'TEARDOWN_FAILED');
 assert.equal(classifyTrace({...completed,timeout:true}),'BOUNDED_TIMEOUT');
});
