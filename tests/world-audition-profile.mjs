#!/usr/bin/env node
/** Opt-in, read-only E09 startup diagnostics. Never modifies world ZIPs or Lab source.
 * --mode=swiftshader : portable WebGL compatibility
 * --mode=metal : real Apple ANGLE Metal performance, Darwin only
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {chromium} from '@playwright/test';
import {classifyTrace,durationMs,expectedBackend,median,parseArgs} from './world-audition-profile-core.mjs';
const options=parseArgs(process.argv.slice(2),process.platform);
const now=()=>performance.timeOrigin+performance.now();
const git=(...a)=>spawnSync('git',a,{encoding:'utf8',timeout:8000}).stdout?.trim()||'';
const source={head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),remote:git('remote','get-url','origin'),labBlob:git('hash-object','public/world-audition/assets/lab.js'),swBlob:git('hash-object','public/world-audition/sw.js')};
if(!source.remote.endsWith('/westkitty/museum_demos.git')||source.labBlob!=='4b1c6865db6ee7100e7b88162e16e2f2b4ce4023')throw Error('Lab repository or protected source SHA mismatch');
const report={schemaVersion:1,kind:'e09-dual-backend-profile',timestamp:new Date().toISOString(),mode:options.mode,source,platform:process.platform,input:options.input,bounds:{runs:options.runs,perRunMs:options.maxMs},limitations:['WebGL first draw and next RAF are timing proxies, not a display-present measurement','Renderer construction proxy includes synchronous scene setup','SwiftShader is software compatibility, never hardware performance','Not full gameplay or mobile/GPU lifecycle proof'],runs:[],httpRequests:[]};
const output=path.resolve(options.out),root=path.resolve('public');
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')};
let phase='setup';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.zip':'application/zip','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const t=now();let pathname;
 try{pathname=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname)}catch{res.writeHead(400);res.end();return;}
 let file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html')}catch{}
 try{
  const st=fs.statSync(file);if(!st.isFile())throw Error('not file');
  const hit={phase,url:pathname,start:t,bytes:st.size,status:200};
  res.once('finish',()=>{hit.end=now();hit.ms=durationMs(hit.start,hit.end);report.httpRequests.push(hit)});
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':st.size,'Cache-Control':'no-store'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();report.httpRequests.push({phase,url:pathname,status:404});}
});
const args=options.mode==='metal'?['--use-gl=angle','--use-angle=metal','--no-sandbox']:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'];
function inject(){
 const at=()=>performance.timeOrigin+performance.now();
 const m={contextAt:null,canvasAt:null,firstDrawAt:null,nextRafAt:null,clickAt:null,clickTrusted:false,keydownAt:null,keydownTrusted:false,afterClickMicrotaskAt:null,handlerCalls:0,handlerStartAt:null,handlerEndAt:null,sw:{registerStart:null,registerDone:null,controllerAt:null},longTasks:[]};
 Object.defineProperty(window,'__waProfile',{value:m});
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(m.longTasks.length<60)m.longTasks.push({at:performance.timeOrigin+e.startTime,durationMs:e.duration});}).observe({entryTypes:['longtask']})}catch{}
 const original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(kind,...a){const gl=original.call(this,kind,...a);if(gl&&/^webgl2?$/.test(kind)&&!m.contextAt)m.contextAt=at();return gl;};
 const append=Element.prototype.append;
 Element.prototype.append=function(...a){const out=append.apply(this,a);if(!m.canvasAt&&a.some(x=>x instanceof HTMLCanvasElement))m.canvasAt=at();return out;};
 let drew=false;
 const mark=()=>{if(drew)return;drew=true;m.firstDrawAt=at();requestAnimationFrame(()=>m.nextRafAt=at())};
 for(const proto of [window.WebGLRenderingContext?.prototype,window.WebGL2RenderingContext?.prototype]){
  if(!proto)continue;
  for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
   const d=Object.getOwnPropertyDescriptor(proto,name);
   if(typeof d?.value!=='function'||!d.writable)continue;
   Object.defineProperty(proto,name,{...d,value:function(...a){mark();return d.value.apply(this,a)}});
  }
 }
 const nativeAdd=EventTarget.prototype.addEventListener;
 EventTarget.prototype.addEventListener=function(type,listener,options){
  if(type==='click'&&this instanceof Element&&this.id==='enter-e09'&&typeof listener==='function'){
   return nativeAdd.call(this,type,function(...a){m.handlerCalls++;m.handlerStartAt=at();try{return listener.apply(this,a)}finally{m.handlerEndAt=at()}},options);
  }
  return nativeAdd.call(this,type,listener,options);
 };
 document.addEventListener('keydown',e=>{if(e.target?.id==='enter-e09'&&e.key==='Enter'){m.keydownAt=at();m.keydownTrusted=e.isTrusted}},true);
 document.addEventListener('click',e=>{if(e.target?.id==='enter-e09'){m.clickAt=at();m.clickTrusted=e.isTrusted;queueMicrotask(()=>m.afterClickMicrotaskAt=at())}},true);
 try{const sw=navigator.serviceWorker;if(sw){
  sw.addEventListener('controllerchange',()=>m.sw.controllerAt=at());
  const native=sw.register.bind(sw);
  sw.register=function(...a){m.sw.registerStart=at();return native(...a).then(reg=>{m.sw.registerDone=at();return reg})};
 }}catch{}
}

await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
report.base='http://127.0.0.1:'+server.address().port+'/world-audition/';
try{
 for(let index=0;index<options.runs;index++){
  phase=options.mode+'-'+index;
  const run={index,phase,input:options.input,stage:'LAUNCH',startedAt:now(),pageErrors:[],timeout:false,actionError:null};
  let browser,context,watchdog;
  try{
   let t=now();browser=await chromium.launch({headless:true,args});run.browserLaunchMs=durationMs(t,now());run.browserVersion=browser.version();
   watchdog=setTimeout(()=>{run.timeout=true;run.stageAtTimeout=run.stage;void browser?.close().catch(()=>{})},options.maxMs);
   t=now();context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',serviceWorkers:'allow'});run.contextMs=durationMs(t,now());
   await context.addInitScript(inject);
   const page=await context.newPage();
   page.on('pageerror',e=>run.pageErrors.push(String(e.message).slice(0,450)));
   t=now();const response=await page.goto(report.base,{waitUntil:'domcontentloaded',timeout:25000});run.hostDomMs=durationMs(t,now());
   if(!response?.ok())throw Error('Lab host document unavailable');
   await page.evaluate(()=>{
    const at=()=>performance.timeOrigin+performance.now(),m=window.__waProfile,prepare=window.__auditionPublicPrepare;
    if(typeof prepare!=='function')throw Error('Missing public preparation API');
    window.__auditionPublicPrepare=async function(...args){m.prepareStart=at();try{return await prepare(...args)}finally{m.prepareDone=at()}};
   });
   run.stage='HOST_INSPECT';
   const card=page.locator('[data-open="museum-e09"]').first();
   await card.focus();await page.keyboard.press('Enter');
   await page.locator('#detail-dialog').waitFor({state:'visible',timeout:12000});
   await page.waitForTimeout(200);
   run.stage='HOST_ENTER';run.hostEnterStart=now();
   await page.locator('#detail-launch').focus();await page.keyboard.press('Enter');
   run.hostEnterReturned=now();
   run.stage='E09_IFRAME';
   await page.waitForFunction(id=>{
    const f=document.querySelector('#player iframe');
    return !!f?.contentDocument&&f.contentDocument.URL.includes('/worlds/'+id+'/index.html')&&f.contentDocument.readyState==='complete';
   },'museum-e09',{timeout:30000});
   run.iframeReadyAt=now();
   const frame=page.frames().find(f=>f.url().includes('/worlds/museum-e09/index.html'));
   if(!frame)throw Error('E09 frame absent');
   run.stage='AUTHORED_TRUSTED_INPUT';
   const button=frame.locator('#enter-e09');
   await button.waitFor({state:'visible',timeout:10000});
   await button.focus();
   run.entryDispatchStart=now();
   try{if(options.input==='keyboard')await page.keyboard.press('Enter');else await button.click({timeout:45000})}
   catch(e){run.actionError=String(e?.message||e).slice(0,450)}
   run.entryDispatchReturn=now();
   run.stage='WEBGL_CONTEXT';
   await frame.waitForFunction(()=>!!window.__waProfile?.contextAt,null,{timeout:42000});
   run.stage='FIRST_DRAW';
   await frame.waitForFunction(()=>!!window.__waProfile?.firstDrawAt,null,{timeout:50000});
   run.stage='FOLLOWING_RAF';
   await frame.waitForFunction(()=>!!window.__waProfile?.nextRafAt,null,{timeout:50000});
   run.stage='COLLECT';
   run.frameProbe=await frame.evaluate(()=>{
    const probe=window.__waProfile;
    const canvas=document.querySelector('canvas.world-canvas');
    const gl=canvas?.getContext('webgl2'),info=gl?.getExtension('WEBGL_debug_renderer_info');
    return {...probe,renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):null};
   });
   run.hostProbe=await page.evaluate(()=>window.__waProfile);
   run.stage='TEARDOWN';
   await page.locator('#play-close').evaluate(b=>b.click());
   run.iframeRemoved=(await page.locator('#player iframe').count())===0;
   const p=run.frameProbe,h=run.hostProbe;
   run.trustedClick=p.clickTrusted===true;run.keydownTrusted=p.keydownTrusted===true;run.handlerCalls=p.handlerCalls;run.handlerEndAt=p.handlerEndAt;
   run.contextAt=p.contextAt;run.firstDrawAt=p.firstDrawAt;run.nextRafAt=p.nextRafAt;
   run.renderer=p.renderer;
   run.backendVerified=expectedBackend(options.mode,run.renderer);
   run.timings={
    registerMs:durationMs(h.sw.registerStart,h.sw.registerDone),
    controlMs:durationMs(h.sw.registerStart,h.sw.controllerAt),
    prepareMs:durationMs(h.prepareStart,h.prepareDone),
    hostEnterToDocumentMs:durationMs(run.hostEnterStart,run.iframeReadyAt),
    clickToContextMs:durationMs(p.clickAt,p.contextAt),
    contextToCanvasMs:durationMs(p.contextAt,p.canvasAt),
    e09HandlerMs:durationMs(p.handlerStartAt,p.handlerEndAt),
    canvasToHandlerEndMs:durationMs(p.canvasAt,p.handlerEndAt),
    contextToFirstDrawMs:durationMs(p.contextAt,p.firstDrawAt),
    firstDrawToNextRafMs:durationMs(p.firstDrawAt,p.nextRafAt)
   };
   run.stage='DONE';
  }catch(e){run.failure=String(e?.message||e).slice(0,900)}
  finally{
   if(watchdog)clearTimeout(watchdog);
   try{await context?.close()}catch{}
   try{await browser?.close()}catch{}
   run.finishedAt=now();run.totalMs=durationMs(run.startedAt,run.finishedAt);
   run.zipRequests=report.httpRequests.filter(x=>x.phase===phase&&x.url==='/world-audition/payload/museum-e09.zip');
   run.zipTransferMs=run.zipRequests.at(-1)?.ms??null;
   run.verdict=classifyTrace(run);
   if(run.verdict==='PASS'&&!run.backendVerified)run.verdict='BACKEND_MISMATCH';
   if(run.verdict==='PASS'&&run.failure)run.verdict='UNEXPECTED_FAILURE';
   report.runs.push(run);save();
   console.log('E09_PROFILE',JSON.stringify({mode:options.mode,index,verdict:run.verdict,renderer:run.renderer,zip:run.zipTransferMs,timing:run.timings,actionError:run.actionError,failure:run.failure}));
  }
 }
 report.summary={passCount:report.runs.filter(x=>x.verdict==='PASS').length,failures:report.runs.filter(x=>x.verdict!=='PASS').map(x=>({index:x.index,verdict:x.verdict,stage:x.stage,detail:x.failure||x.actionError||null})),medians:{
   browserLaunchMs:median(report.runs.map(x=>x.browserLaunchMs)),
   swPrepareMs:median(report.runs.map(x=>x.timings?.prepareMs)),
   zipTransferMs:median(report.runs.map(x=>x.zipTransferMs)),
   clickToContextMs:median(report.runs.map(x=>x.timings?.clickToContextMs)),
   drawToNextRafMs:median(report.runs.map(x=>x.timings?.firstDrawToNextRafMs))
 }};
 report.complete=true;save();
 if(report.summary.passCount!==options.runs)process.exitCode=1;
}finally{
 server.closeAllConnections?.();
 await new Promise(resolve=>server.close(resolve));
 save();
}
