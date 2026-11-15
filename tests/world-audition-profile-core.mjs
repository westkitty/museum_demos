export function durationMs(start,end){
  return Number.isFinite(start)&&Number.isFinite(end)&&end>=start
    ? Math.round((end-start)*10)/10 : null;
}
export function median(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return null;
  return sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
}
export function classifyTrace(record){
  if(record.timeout) return 'BOUNDED_TIMEOUT';
  if(!record.trustedClick) return 'TRUSTED_INPUT_NOT_OBSERVED';
  if(!record.keydownTrusted && record.input==='keyboard') return 'TRUSTED_KEYDOWN_NOT_OBSERVED';
  if(record.handlerCalls!==1||!record.handlerEndAt)return 'ENTER_HANDLER_NOT_OBSERVED';
  if(record.actionError&&!record.contextAt) return 'INPUT_OR_STARTUP_ERROR';
  if(!record.contextAt) return 'NO_WEBGL_CONTEXT';
  if(!record.firstDrawAt) return 'NO_WEBGL_DRAW';
  if(!record.nextRafAt) return 'NO_FOLLOWING_RAF';
  if(!record.iframeRemoved) return 'TEARDOWN_FAILED';
  if(record.pageErrors?.length) return 'PAGE_ERROR';
  return record.actionError?'SLOW_ACTION_WITH_RENDER_PROOF':'PASS';
}
export function expectedBackend(mode,renderer){
  if(typeof renderer!=='string')return false;
  if(mode==='swiftshader')return /SwiftShader/i.test(renderer);
  if(mode==='metal')return /ANGLE Metal Renderer: Apple/i.test(renderer);
  return false;
}
export function parseArgs(argv,platform){
  const result={mode:null,runs:null,input:'keyboard',out:null,maxMs:null};
  for(const item of argv){
    const found=/^--(mode|runs|input|out|max-ms)=(.+)$/.exec(item);
    if(!found)throw Error('Unsupported argument: '+item);
    const [,key,val]=found;
    if(key==='mode')result.mode=val;
    if(key==='runs')result.runs=Number(val);
    if(key==='input')result.input=val;
    if(key==='out')result.out=val;
    if(key==='max-ms')result.maxMs=Number(val);
  }
  if(!['metal','swiftshader'].includes(result.mode))throw Error('Specify --mode=swiftshader or --mode=metal');
  if(result.mode==='metal'&&platform!=='darwin')throw Error('Metal lane requires an Apple host; never substitute SwiftShader');
  result.runs??=result.mode==='metal'?2:1;
  result.maxMs??=result.mode==='metal'?85000:155000;
  if(!Number.isInteger(result.runs)||result.runs<1||result.runs>3)throw Error('--runs must be 1..3');
  if(!Number.isInteger(result.maxMs)||result.maxMs<5000||result.maxMs>180000)throw Error('--max-ms outside 5000..180000');
  if(!['keyboard','pointer'].includes(result.input))throw Error('--input must be keyboard or pointer');
  if(result.out&&!/^test-results\/[A-Za-z0-9_-]+\.json$/.test(result.out))throw Error('--out must be a local test-results/*.json path');
  result.out??='test-results/world-audition-e09-'+result.mode+'.json';
  return result;
}
