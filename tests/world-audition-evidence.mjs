#!/usr/bin/env node
/* Read-only 21-world runtime evidence. Document load and WebGL are not gameplay certification. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.WORLD_AUDITION_URL || 'http://127.0.0.1:8765/world-audition/';
const output = path.resolve(process.env.WORLD_AUDITION_EVIDENCE_FILE || 'test-results/world-audition-runtime-evidence.json');
const waitAfterLoadMs = Math.min(5000, Math.max(0, Number(process.env.WORLD_AUDITION_SETTLE_MS || 600)));
const report = {
  schemaVersion: 1,
  kind: 'runtime-startup-observation',
  recordedAt: new Date().toISOString(),
  startUrl: base,
  limitations: [
    'Document loading does not verify gameplay, objectives, collision, input correctness or victory.',
    'WebGL context creation does not verify frame rate, camera quality, artifacts or GPU disposal.',
    'Software WebGL in automated Chromium is not physical-device or mobile-GPU validation.'
  ],
  worlds: [],
  summary: {}
};
let browser;
try {
  browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
  const page = await browser.newPage({viewport:{width:1280,height:800}, reducedMotion:'reduce'});
  await page.addInitScript(() => {
    const metrics = { webgl:0, webgl2:0 };
    Object.defineProperty(window, '__worldAuditionProbe', {value:metrics, configurable:false});
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...rest) {
      const result = nativeGetContext.call(this, type, ...rest);
      if (result && type === 'webgl') metrics.webgl++;
      if (result && type === 'webgl2') metrics.webgl2++;
      return result;
    };
  });
  const errors = [];
  page.on('pageerror', e => errors.push({kind:'pageerror', message:String(e.message).slice(0,500)}));
  page.on('console', m => {if(m.type()==='error')errors.push({kind:'console-error',message:m.text().slice(0,500)});});
  const r = await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  if (!r?.ok()) throw new Error('Lab host HTTP document unavailable');
  const catalog = await page.evaluate(() => JSON.parse(document.querySelector('#world-json').textContent));
  const candidates = catalog.filter(w=>w.playable_candidate);
  if(catalog.length !== 21 || candidates.length !== 21) throw new Error(`Expected 21 source families and 21 candidate URLs; got ${catalog.length}/${candidates.length}`);
  for (const [i,world] of candidates.entries()) {
    if (!/^[a-z0-9-]+$/.test(world.id)) throw new Error('Unsafe world ID in catalog');
    const start = Date.now(), errorOffset = errors.length;
    const item = {id:world.id,name:world.name,exhibit:world.exhibit,documentLoaded:false,webglContexts:0,webgl2Contexts:0,canvasCount:0,teardownRemoved:false,observedErrors:[],startupMs:null,proofState:'NOT_STARTED'};
    try {
      await page.locator(`[data-open="${world.id}"]`).first().click({timeout:15000});
      await page.locator('#detail-launch').click({timeout:15000});
      await page.waitForFunction(id => {
        const f = document.querySelector('#player iframe');
        return !!f?.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.URL.includes('/worlds/'+id+'/index.html');
      },world.id,{timeout:45000});
      item.documentLoaded = true;
      await page.waitForTimeout(waitAfterLoadMs);
      const frame = page.frames().find(f=>f.url().includes('/worlds/'+world.id+'/index.html'));
      if (frame) {
        const frameData = await frame.evaluate(() => ({
          canvasCount:document.querySelectorAll('canvas').length,
          webgl:window.__worldAuditionProbe?.webgl ?? null,
          webgl2:window.__worldAuditionProbe?.webgl2 ?? null,
          title:document.title.slice(0,120)
        }));
        item.canvasCount = frameData.canvasCount;
        item.webglContexts = frameData.webgl;
        item.webgl2Contexts = frameData.webgl2;
        item.pageTitle = frameData.title;
      }
      item.proofState = item.webgl2Contexts > 0 ? 'WEBGL2_INITIALIZED' : item.webglContexts > 0 ? 'WEBGL1_INITIALIZED' : 'DOCUMENT_ONLY';
      item.startupMs = Date.now()-start;
    } catch(e) {
      item.proofState='LOAD_OR_INSPECTION_FAILED';
      item.failure=String(e.message||e).slice(0,600);
    } finally {
      item.observedErrors = errors.slice(errorOffset);
      try {
        // Games may capture pointer input: use host DOM invocation to avoid fighting their pointer capture.
        await page.locator('#play-close').evaluate(button=>button.click(),{timeout:5000});
        item.teardownRemoved = await page.locator('#player iframe').count()===0;
      }catch(e){item.teardownFailure=String(e.message||e).slice(0,300);}
      report.worlds.push(item);
      console.log(`${i+1}/${candidates.length} ${item.id}: ${item.proofState}, canvases=${item.canvasCount}, errors=${item.observedErrors.length}, iframeRemoved=${item.teardownRemoved}`);
    }
  }
  report.summary={
    catalogCount:catalog.length,
    candidates:candidates.length,
    documentsLoaded:report.worlds.filter(w=>w.documentLoaded).length,
    webglObserved:report.worlds.filter(w=>w.webglContexts>0||w.webgl2Contexts>0).length,
    iframeTeardownPasses:report.worlds.filter(w=>w.teardownRemoved).length,
    worldsWithConsoleOrPageErrors:report.worlds.filter(w=>w.observedErrors.length>0).map(w=>w.id),
    worldsWithStartupFailures:report.worlds.filter(w=>!w.documentLoaded).map(w=>w.id),
    scope:'initialization observations only; manual full game playthroughs still required'
  };
} catch(e) {
  report.fatalError=String(e.message||e).slice(0,1000);
  console.error('Lab evidence run error:',report.fatalError);
} finally {
  if(browser) await browser.close();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log('Wrote local runtime evidence:',output);
}
if (report.fatalError || report.worlds.some(w=>!w.documentLoaded||!w.teardownRemoved||w.observedErrors.some(e=>e.kind==='pageerror'))) {
  process.exitCode=1;
}
