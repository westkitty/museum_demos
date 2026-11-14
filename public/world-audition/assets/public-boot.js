/* World Audition Lab: support compressed, public-safe preview payloads. */
(()=>{'use strict';
 let ready;
 window.__auditionPublicPrepare=()=>{if(ready)return ready;ready=(async()=>{
  if(!('serviceWorker' in navigator))throw new Error('this browser does not support service workers');
  const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  await navigator.serviceWorker.ready;
  if(navigator.serviceWorker.controller)return;
  await new Promise((resolve,reject)=>{
    const done=()=>{clearTimeout(t);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};
    const t=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',done);reject(new Error('service worker did not take control'));},12000);
    navigator.serviceWorker.addEventListener('controllerchange',done);
    if(navigator.serviceWorker.controller)done();
  });
 })().catch(error=>{ready=null;throw error;});return ready;};
})();