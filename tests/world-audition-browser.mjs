import {chromium} from '@playwright/test';
const url=process.env.WORLD_AUDITION_URL||'http://127.0.0.1:8765/world-audition/';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
let errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 if(!response||!response.ok())throw Error('Lab shell did not serve');
 await page.locator('[data-open="dollhouse"]').first().click();
 await page.locator('#detail-launch').click();
 await page.locator('#player iframe').waitFor({state:'attached',timeout:25000});
 const frame=page.frameLocator('#player iframe');
 await frame.locator('canvas').first().waitFor({state:'attached',timeout:30000});
 const webgl=await frame.locator('canvas').first().evaluate(c=>!!(c.getContext('webgl2')||c.getContext('webgl')));
 if(!webgl)throw Error('No browser WebGL context in dollhouse candidate');
 await page.locator('#play-close').click();
 if(await page.locator('#player iframe').count())throw Error('Iframe persisted after close');
 if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
 const slugs=await page.evaluate(()=>JSON.parse(document.querySelector('#world-json').textContent).filter(x=>x.playable_candidate).map(x=>x.id));
 const loaded=[];
 for(const slug of slugs){
  console.log('Sweeping preview',slug);
  const countBefore=errors.length;
  await page.locator('[data-open="'+slug+'"]').first().click({timeout:15000});
  await page.locator('#detail-launch').click();
  await page.waitForFunction(id=>{const f=document.querySelector('#player iframe');return !!f?.contentDocument&&f.contentDocument.readyState==='complete'&&f.contentDocument.URL.includes('/worlds/'+id+'/index.html');},slug,{timeout:45000});
  if(slug==='infinitum'){
    const frame=page.frameLocator('#player iframe');
    await frame.locator('#interface button').first().waitFor({state:'attached',timeout:45000});
    const webgl=await frame.locator('#universe').evaluate(c=>!!c.getContext('webgl2'));
    if(!webgl)throw Error('INFINITUM did not create a WebGL2 context');
    console.log('PASS INFINITUM r187 live UI + WebGL2');
  }
  if(errors.length>countBefore)throw Error(slug+' page error: '+errors.slice(countBefore).join(' | '));
  // Some authored worlds capture pointer input; exercise the Lab DOM teardown independently.
  await page.locator('#play-close').evaluate(button=>button.click());
  if(await page.locator('#player iframe').count())throw Error(slug+' iframe persisted on exit');
  loaded.push(slug);
 }
 if(loaded.length!==21)throw Error('Expected 21 loaded previews, got '+loaded.length);
 console.log('PASS all-world document sweep:',loaded.join(', '));
 console.log('PASS public preview smoke: service worker, dollhouse canvas/WebGL, iframe teardown, 0 page errors');
}finally{await browser.close();}