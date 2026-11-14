/* World Audition Lab — standalone, local-first source audition. No production museum hooks. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const el = (name, className, text) => { const node = document.createElement(name); if(className) node.className=className; if(text!==undefined) node.textContent=String(text);return node; };
  const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const WORLD_LIST = JSON.parse(byId('world-json').textContent);
  const WORLD_MAP = new Map(WORLD_LIST.map(w => [w.id,w]));
  const DIMS = ['Identity','Gameplay','Visual impact','Accessibility','Performance'];
  const STORAGE = 'museum-world-audition-standalone-expansion-20261114-v1';
  let filter = 'all', search = '', activeId = WORLD_LIST[0].id, compare = [], currentFrame = null, currentWorld = null, startStamp = 0;
  let prefs = {motion:false};
  let record = {version:1, world:{}};
  const toast = message => {const target=byId('toast');target.textContent=message;target.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>target.hidden=true,3500);};
  const status = message => {byId('live-status').textContent=message;};
  function sanitizeEntry(entry){
    const r={visited:false,reviewed:false,notes:'',scores:{}};
    if(!entry||typeof entry!=='object')return r;
    r.visited=entry.visited===true;r.reviewed=entry.reviewed===true;
    r.notes=typeof entry.notes==='string'?entry.notes.slice(0,5000):'';
    if(entry.scores&&typeof entry.scores==='object')for(const k of DIMS){const n=Number(entry.scores[k]);if(Number.isInteger(n)&&n>=1&&n<=5)r.scores[k]=n;}
    return r;
  }
  function restore(){try{const d=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(d&&d.version===1&&d.world&&typeof d.world==='object'){for(const id of WORLD_MAP.keys())record.world[id]=sanitizeEntry(d.world[id]);}prefs.motion=d?.prefs?.motion===true;}catch(_){/* empty/denied local storage */}
    for(const id of WORLD_MAP.keys())record.world[id] ||= sanitizeEntry();
    document.body.classList.toggle('reduce-motion',prefs.motion);byId('motion-pref').checked=prefs.motion;
  }
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({...record,prefs}));}catch(_){status('Local storage unavailable: your review is kept until you leave this page.');}}
  function modeLabel(w){return ({'prebuilt':'SOURCE-PROVIDED BUILD','native-js':'OFFLINE JS ORIGINAL','converted-source':'OFFLINE-CONVERTED SOURCE','addon-dependency-unresolved':'SOURCE ONLY — NEEDS BUILD'})[w.technical_state]||'NOT VERIFIED';}
  function apparent(w){return !!w.playable_candidate;}
  function filtered(){return WORLD_LIST.filter(w => {
    if(filter==='try' && !apparent(w))return false;
    if(filter==='source' && apparent(w))return false;
    if(['platformer','exploration','puzzle','strategy'].includes(filter)&&w.family!==filter)return false;
    const haystack=[w.name,w.genre,w.exhibit,w.caption,w.controls,...w.tags].join(' ').toLowerCase();return !search||haystack.includes(search);
  });}
  function card(w){const visit=record.world[w.id].visited;return `<article class="world-card" data-family="${escapeHTML(w.family)}" style="--accent:${escapeHTML(w.accent)}">
    <div class="card-art" aria-hidden="true"><span class="art-sigil">${escapeHTML(w.exhibit)}</span><span class="art-ring"></span><span class="art-form"></span><span class="art-status">${escapeHTML(modeLabel(w))}</span></div>
    <div class="card-body"><div class="card-meta">${escapeHTML(w.genre)} / ${escapeHTML(w.exhibit)}</div><h3>${escapeHTML(w.name)}</h3><p>${escapeHTML(w.caption)}</p>
    <div class="card-bottom"><button class="outline-btn" type="button" data-open="${escapeHTML(w.id)}">Inspect world</button><span>${visit?'Previously opened':'Not yet entered'}</span></div></div></article>`;}
  function renderCards(){const worlds=filtered();byId('cards').innerHTML=worlds.map(card).join('');byId('empty-state').hidden=worlds.length>0;byId('shown-count').textContent=`${worlds.length} of ${WORLD_LIST.length} worlds`;
    for(const button of document.querySelectorAll('[data-filter]'))button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
    for(const node of document.querySelectorAll('[data-map-world]')){node.classList.toggle('active',node.dataset.mapWorld===activeId);node.classList.toggle('visited',record.world[node.dataset.mapWorld].visited);} }
  function renderMap(){const target=byId('map-nodes');target.replaceChildren();
    WORLD_LIST.forEach((w,i)=>{
      const theta=2*Math.PI*(i%11)/11-Math.PI/2+(i>=11?0.18:0);
      const rad=i>=11?0.425:0.312;
      const x=50+rad*100*Math.cos(theta),y=50+rad*100*Math.sin(theta);
      const b=el('button','orbit-node');b.type='button';b.dataset.mapWorld=w.id;b.title=w.name;b.setAttribute('aria-label',`Inspect ${w.name}`);b.style.setProperty('--x',`${x}%`);b.style.setProperty('--y',`${y}%`);b.style.setProperty('--color',w.accent);target.appendChild(b);
    });
    renderCards();
  }
  function renderDetail(w){const r=record.world[w.id];activeId=w.id;renderCards();
    byId('detail-heading').textContent=w.name;
    byId('detail-caption').textContent=w.caption;
    byId('detail-meta').textContent=`${w.exhibit} / ${w.genre} / ${modeLabel(w)}`;
    byId('detail-controls').textContent=w.controls;
    byId('detail-technical').textContent=w.inspection;
    byId('detail-mode').textContent=modeLabel(w);
    const archive=byId('detail-source');archive.textContent='Original source retained privately (SHA-256 listed below)';
    const launch=byId('detail-launch');launch.textContent=w.playable_candidate?'Enter this world':'Source only — build needed';launch.disabled=!w.playable_candidate;
    const op=byId('detail-opportunities');op.replaceChildren();
    (w.opportunities||[]).forEach((item,i)=>{const li=el('li');const t=el('strong','',`${i+1}. ${item.title}`);const p=el('p','',item.reason);li.append(t,p);op.appendChild(li);});
    const note=byId('detail-notes');note.value=r.notes;
    const reviewed=byId('detail-reviewed');reviewed.checked=r.reviewed;
    const scores=byId('detail-scores');scores.replaceChildren();
    DIMS.forEach(dim=>{
      const row=el('div','rating');const label=el('label','',dim);const select=el('select');select.name=dim;select.setAttribute('aria-label',dim+' score');
      for(const [v,s] of [['','Not scored'],['1','1 — weak'],['2','2'],['3','3 — mixed'],['4','4'],['5','5 — strong']]){const o=el('option','',s);o.value=v;select.appendChild(o);}
      select.value=String(r.scores[dim]||'');select.addEventListener('change',()=>{if(select.value)r.scores[dim]=Number(select.value);else delete r.scores[dim];persist();});
      row.append(label,select);scores.appendChild(row);
    });
    byId('detail-provenance').textContent=`${w.file} · ${w.archive_size.toLocaleString()} bytes · SHA-256 ${w.archive_sha256}`;
    byId('detail-status').textContent=w.technical_state==='addon-dependency-unresolved'
      ?'Blocked: Three.js 0.187.0 and its official OrbitControls addon must be built and tested before launch.'
      :w.technical_state==='converted-source'
      ?'Offline TypeScript-to-ESM conversion with local Three.js; syntactic checks are not proof of a browser playthrough.'
      :w.technical_state==='prebuilt'
      ?'Prebuilt preview recovered from the project archive. Lab-hosted playthrough remains unverified here.'
      :'Original JavaScript source / local distribution. Lab-hosted playthrough remains unverified here.';
    byId('detail-dialog').showModal();
  }
  function openDetail(id){const w=WORLD_MAP.get(id);if(w){const d=byId('detail-dialog');if(d.open)d.close();renderDetail(w);status(`${w.name} inspection details opened.`);}}
  function saveDetail(){const w=WORLD_MAP.get(activeId);if(!w)return;const r=record.world[w.id];r.notes=byId('detail-notes').value.slice(0,5000);r.reviewed=byId('detail-reviewed').checked;persist();renderCards();}
  function markVisited(w){record.world[w.id].visited=true;persist();renderCards();}
  async function enter(id){const w=WORLD_MAP.get(id);if(!w||!w.playable_candidate)return;try{await window.__auditionPublicPrepare();}catch(err){toast('Public preview could not initialize: '+String(err?.message||err).slice(0,90));return;}byId('detail-dialog').close();closePlayer(false);
    currentWorld=w;markVisited(w);startStamp=performance.now();
    byId('play-title').textContent=w.name;byId('play-mode').textContent=modeLabel(w);
    byId('play-controls').textContent=w.controls;
    byId('play-report').textContent='Opening public-preview source; a loaded document is not WebGL or gameplay proof.';
    const iframe=el('iframe');iframe.title=`Playable candidate: ${w.name}`;iframe.setAttribute('allow','fullscreen');iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-downloads');iframe.referrerPolicy='no-referrer';
    iframe.onload=()=>{if(currentWorld?.id!==w.id)return;const duration=Math.round(performance.now()-startStamp);byId('play-report').textContent=`Frame document loaded in ${duration} ms (not WebGL readiness or FPS).`;status(`${w.name} document loaded.`);};
    iframe.onerror=()=>{if(currentWorld?.id!==w.id)return;byId('play-report').textContent='Document could not load. Check server logs and source archive.';status('Preview load failure.');};
    byId('player-area').appendChild(iframe);currentFrame=iframe;
    iframe.src=w.launch;
    byId('player').classList.add('open');byId('player').setAttribute('aria-hidden','false');document.body.classList.add('playing');byId('play-close').focus();
    status(`${w.name} preview started. Only one preview iframe is active.`);
  }
  function closePlayer(focus=true){if(currentFrame){currentFrame.src='about:blank';currentFrame.remove();currentFrame=null;}if(currentWorld){status(`${currentWorld.name} iframe destroyed; local running context released.`);}currentWorld=null;
    byId('player').classList.remove('open');byId('player').setAttribute('aria-hidden','true');document.body.classList.remove('playing');if(focus)byId('browse-heading').focus({preventScroll:true});}
  function compareToggle(id){const idx=compare.indexOf(id);if(idx>=0)compare.splice(idx,1);else{if(compare.length>=2)compare.shift();compare.push(id);}renderCompareButton();}
  function renderCompareButton(){byId('compare-count').textContent=compare.length?`Compare ${compare.length}/2`:'Compare worlds';byId('compare-now').disabled=compare.length!==2;byId('compare-now').textContent=`Compare ${compare.length}/2`;
    const c=byId('compare-slots');c.replaceChildren();compare.forEach((id,i)=>{const w=WORLD_MAP.get(id);const x=el('div','compare-slot');const div=el('div');div.append(el('p','lowkey',`SLOT ${i+1}`),el('h3','',w.name));const b=el('button','quiet-btn','Remove');b.type='button';b.addEventListener('click',()=>compareToggle(id));x.append(div,b);c.appendChild(x);});
    if(!compare.length)c.appendChild(el('p','lowkey','Choose worlds from their inspection panels to compare identity and your own scores.'));
    byId('compare-add').textContent=compare.includes(activeId)?'Remove from comparison':'Add to comparison';}
  function presentCompare(){const [a,b]=compare.map(id=>WORLD_MAP.get(id));if(!a||!b)return;const row=byId('compare-grid');row.replaceChildren();
    for(const w of [a,b]){
      const box=el('div');box.append(el('p','smallcaps',w.exhibit),el('h3','',w.name),el('p','',w.genre),el('p','',w.caption),el('p','',w.controls));
      const scores=record.world[w.id].scores;
      for(const d of DIMS)box.appendChild(el('p','score-line',`${d}: ${scores[d]??'Not scored'}`));
      row.appendChild(box);
    }
    const overlap=a.tags.filter(x=>b.tags.some(y=>y.toLowerCase()===x.toLowerCase()));
    byId('compare-summary').textContent=overlap.length?`Shared source tags: ${overlap.join(', ')}. This is metadata, not a claim of common canon.`:'These worlds have different registered tags; compare their experiences without merging their source identities.';
    byId('compare-dialog').showModal();
  }
  function taskPacket(w){return `WORLD AUDITION LAB — SOURCE-BOUND PROJECT UPLIFT\nProject: ${w.name}\nExhibit: ${w.exhibit}\nSource archive: ${w.file}\nSHA-256: ${w.archive_sha256}\nEvidence: ${w.technical_state}; independent WebGL playthrough unverified by this Lab.\n\nGOAL: Implement and independently verify five source-grounded improvements in this standalone world, not in the production Museum of Me or Palimpsest. Inspect and preserve every existing mechanic, route, canon boundary, accessibility control and source asset. Do not fabricate completed checks.\n\nPROJECT-SPECIFIC PRIORITY CANDIDATES — audit each against actual code, drop any already implemented and replace with a verified higher-value gap:\n${(w.opportunities||[]).map((x,i)=>`${i+1}. ${x.title} — ${x.reason}`).join('\n')}\n\nRequired proof: build from original source with pinned dependencies, deterministic gameplay tests, actual browser WebGL + keyboard and touch journey, reduced-motion and mobile QA, representative sustained-frame performance, source-diff review, check rollback. Preserve original archive and write an additive status record (planned / implemented / verified). Include the final playable static build and exact hash.\n\nNo production integration, museum edit, commit, push or Pages publication without a verified independent repository and explicit authority.`;}
  async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Copied complete source-bound task packet.');return;}catch(_){const ta=el('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='0';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Copied task packet.');}catch(e){toast('Copy unavailable. Use Export Review to save the prompt.');}ta.remove();}}
  function downloadFile(name,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  function exportReview(){const payload={app:'World Audition Lab — Independent Expansion',schemaVersion:1,generatedAt:new Date().toISOString(),sourceCount:WORLD_LIST.length,review:record.world};downloadFile('world-audition-review-2026-11-14.json',JSON.stringify(payload,null,2));toast('Exported your locally entered scores and notes.');}
  function importReview(){byId('review-upload').click();}
  async function onUpload(file){if(!file)return;if(file.size>700000){toast('The review file is too large.');return;}let value;
    try{value=JSON.parse(await file.text());if(value?.schemaVersion!==1||!value?.review||typeof value.review!=='object')throw Error('Unrecognized review format');
      let imported=0;for(const id of WORLD_MAP.keys()){if(Object.hasOwn(value.review,id)){record.world[id]=sanitizeEntry(value.review[id]);imported++;}}persist();renderCards();toast(`Imported local reviews for ${imported} known worlds.`);
    }catch(_){toast('Import rejected: wrong schema or malformed JSON.');}
    byId('review-upload').value='';}
  function resetReviews(){if(!window.confirm('Erase Lab audition notes, scores and visited markers on this browser? Original projects and source files are never touched.'))return;
    record={version:1,world:{}};for(const id of WORLD_MAP.keys())record.world[id]=sanitizeEntry();compare=[];persist();renderCards();renderCompareButton();toast('Only local Lab review data was cleared.');}
  function start(){restore();byId('world-count').textContent=WORLD_LIST.length;byId('ready-count').textContent=WORLD_LIST.filter(w=>w.playable_candidate).length;byId('source-count').textContent=WORLD_LIST.length*5;
    renderMap();renderCompareButton();
    document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);return;}const map=e.target.closest('[data-map-world]');if(map){openDetail(map.dataset.mapWorld);return;}const fil=e.target.closest('[data-filter]');if(fil){filter=fil.dataset.filter;renderCards();return;}});
    byId('search').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase().slice(0,100);renderCards();});
    byId('detail-close').addEventListener('click',()=>byId('detail-dialog').close());
    byId('detail-dialog').addEventListener('close',()=>{saveDetail();renderCompareButton();});
    byId('detail-notes').addEventListener('change',saveDetail);byId('detail-reviewed').addEventListener('change',saveDetail);
    byId('detail-launch').addEventListener('click',()=>enter(activeId));
    byId('detail-copy').addEventListener('click',()=>{const w=WORLD_MAP.get(activeId);if(w)void copyText(taskPacket(w));});
    byId('compare-add').addEventListener('click',()=>compareToggle(activeId));byId('compare-now').addEventListener('click',presentCompare);
    byId('compare-close').addEventListener('click',()=>byId('compare-dialog').close());
    byId('view-comparison').addEventListener('click',()=>{renderCompareButton();byId('compare-dialog').showModal();});
    byId('play-close').addEventListener('click',()=>closePlayer());
    byId('play-inspect').addEventListener('click',()=>{const id=currentWorld?.id;closePlayer(false);if(id)openDetail(id);});
    byId('play-fullscreen').addEventListener('click',()=>{const target=currentFrame;if(target?.requestFullscreen)void target.requestFullscreen().catch(()=>toast('Fullscreen was declined by the browser.'));});
    byId('play-restart').addEventListener('click',()=>{const id=currentWorld?.id;if(id)enter(id);});
    byId('random-world').addEventListener('click',()=>{const set=filtered();if(set.length)openDetail(set[Math.floor(Math.random()*set.length)].id);});
    byId('export-review').addEventListener('click',exportReview);byId('import-review').addEventListener('click',importReview);
    byId('review-upload').addEventListener('change',e=>{void onUpload(e.target.files?.[0]);});
    byId('clear-review').addEventListener('click',resetReviews);
    byId('motion-pref').addEventListener('change',e=>{prefs.motion=e.target.checked;document.body.classList.toggle('reduce-motion',prefs.motion);persist();toast('Motion preference applied to Lab interface; use in-world controls for game effects.');});
    byId('prefs-open').addEventListener('click',()=>byId('prefs-dialog').showModal());byId('prefs-close').addEventListener('click',()=>byId('prefs-dialog').close());
    byId('scroll-catalog').addEventListener('click',()=>byId('browse-heading').scrollIntoView({behavior:prefs.motion?'instant':'smooth'}));
    window.addEventListener('message',e=>{
      if(!currentFrame||e.source!==currentFrame.contentWindow||e.origin!==location.origin||!e.data||typeof e.data!=='object')return;
      // Mock return requests never touch the production museum. The Lab only closes its own frame.
      if(['museum:pocket-world:return','museum:return','museum:return'].includes(e.data.type))closePlayer();
    });
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&byId('player').classList.contains('open')&&e.target===document.body){e.preventDefault();closePlayer();}});
    window.addEventListener('pagehide',()=>closePlayer(false));
    status(`Loaded ${WORLD_LIST.length} project records. No world renderer started.`);
  }
  start();
})();