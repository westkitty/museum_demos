#!/usr/bin/env node
// Read-only two-condition reproduction of a nested service-worker request.
// The original Gardens ZIP and all source payloads remain untouched.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const root=path.resolve('public');
const outfile=path.resolve('test-results/world-audition-gardens-forensics.json');
const archivePath=path.join(root,'world-audition/payload/gardens.zip');
const hash=()=>createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
const initialHash=hash();
const expectAdapter=process.env.GARDENS_EXPECT_ADAPTER==='1';
const hits=[];
let phase='setup';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.zip':'application/zip','.json':'application/json; charset=utf-8','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
  catch{res.writeHead(400);res.end();return;}
  const absolute=path.resolve(root,'.'+pathname);
  if(absolute!==root&&!absolute.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let filename=absolute;
  try{if(fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');}catch{}
  try{
    const stat=fs.statSync(filename);
    if(!stat.isFile())throw Error('not file');
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(filename).pipe(res);
    hits.push({phase,url:pathname,status:200});
  }catch{
    res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
    hits.push({phase,url:pathname,status:404});
  }
});
const report={schemaVersion:1,kind:'gardens-nested-sw-causal-test',timestamp:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,payloadSha256Before:initialHash,cases:[],requests:hits};
let browser;
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base='http://127.0.0.1:'+server.address().port+'/world-audition/';
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
  for(const suppress of [false,true]){
    phase=suppress?'registration-suppressed-control':'unmodified-baseline';
    const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
    await context.addInitScript(({suppress})=>{
      if(!location.pathname.endsWith('/worlds/gardens/index.html'))return;
      const container=navigator.serviceWorker;
      if(!container)return;
      const original=container.register.bind(container);
      window.__gardensRegistrationAudit={attempts:[],suppressed:0};
      container.register=function(scriptURL,options){
        const url=new URL(scriptURL,location.href);
        window.__gardensRegistrationAudit.attempts.push(url.href);
        if(suppress&&url.pathname.endsWith('/worlds/gardens/sw.js')){
          window.__gardensRegistrationAudit.suppressed++;
          return Promise.resolve({scope:new URL('./',location.href).href});
        }
        return original(scriptURL,options);
      };
    },{suppress});
    const result={phase,consoleErrors:[],pageErrors:[],failedRequests:[],attempts:[],suppressions:0,webgl2:false,iframeRemoved:false};
    const page=await context.newPage();
    page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text().slice(0,500));});
    page.on('pageerror',e=>result.pageErrors.push(String(e.message).slice(0,500)));
    page.on('requestfailed',request=>result.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
    try{
      const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
      if(!response?.ok())throw Error('Lab host not available');
      await page.locator('[data-open="gardens"]').first().click();
      await page.locator('#detail-launch').click();
      const frame=page.frameLocator('#player iframe');
      await frame.locator('#world').waitFor({state:'attached',timeout:30000});
      result.webgl2=await frame.locator('#world').evaluate(c=>!!c.getContext('webgl2'));
      // The fixed adapter suppresses the call. Wait for the actual frame's
      // authored load event instead of waiting for registration to happen.
      const active=page.frames().find(f=>f.url().includes('/worlds/gardens/index.html'));
      if(!active)throw Error('Gardens iframe unexpectedly missing');
      await active.waitForLoadState('load',{timeout:15000});
      await page.waitForTimeout(900);
      const info=await frame.locator('body').evaluate(()=>window.__gardensRegistrationAudit);
      result.attempts=info.attempts;result.suppressions=info.suppressed;
      await page.locator('#play-close').evaluate(b=>b.click());
      result.iframeRemoved=(await page.locator('#player iframe').count())===0;
    }finally{
      await context.close();
      report.cases.push(result);
      console.log('GARDENS_CASE',JSON.stringify(result));
    }
  }
  const failed='/'+'world-audition/worlds/gardens/sw.js';
  report.baseline404s=hits.filter(r=>r.phase==='unmodified-baseline'&&r.status===404);
  report.control404s=hits.filter(r=>r.phase==='registration-suppressed-control'&&r.status===404);
  report.payloadSha256After=hash();
  const [baseline,control]=report.cases;
  const expectedRegistered=x=>x.attempts.some(url=>url.endsWith(failed));
  if(!baseline.webgl2||!control.webgl2||!baseline.iframeRemoved||!control.iframeRemoved)throw Error('Startup or teardown was not preserved');
  if(report.payloadSha256After!==initialHash)throw Error('Preview payload bytes unexpectedly changed');
  if(expectAdapter){
    if(baseline.attempts.length||control.attempts.length||baseline.suppressions||control.suppressions)
      throw Error('Nested registration still called under Lab adapter');
    if(report.baseline404s.some(r=>r.url===failed)||report.control404s.some(r=>r.url===failed))
      throw Error('Nested worker 404 persists under Lab adapter');
    if(baseline.consoleErrors.length||control.consoleErrors.length||baseline.pageErrors.length||control.pageErrors.length)
      throw Error('Console/page errors persisted after Lab adapter');
    report.verdict='GARDENS_ADAPTER_REGRESSION_PASS';
  }else{
    if(!expectedRegistered(baseline)||!expectedRegistered(control)||control.suppressions!==1)
      throw Error('Nested registration control did not execute');
    if(!report.baseline404s.some(r=>r.url===failed))throw Error('Nested SW script 404 was not reproduced');
    if(report.control404s.some(r=>r.url===failed))throw Error('Nested SW 404 persists after suppression');
    report.verdict='CAUSAL_REPRODUCTION_PASS';
  }
}catch(error){report.verdict='UNVERIFIED';report.failure=String(error?.stack||error).slice(0,1200);process.exitCode=1;}
finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  fs.mkdirSync(path.dirname(outfile),{recursive:true});
  fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n');
  console.log('GARDENS_FORENSICS_VERDICT',report.verdict);
  console.log('GARDENS_FORENSICS_BASELINE_404S',JSON.stringify(report.baseline404s||[]));
  console.log('GARDENS_FORENSICS_CONTROL_404S',JSON.stringify(report.control404s||[]));
  console.log('GARDENS_FORENSICS_EVIDENCE_FILE',outfile);
}
