import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../public/world-audition/assets/review-import-plan.js';
const plan = globalThis.WorldAuditionReviewPlan.planImport;
const ids = ['dollhouse', 'infinitum', 'pelagia'];
function sanitize(v) {
  const r = { visited:false, reviewed:false, notes:'', scores:{} };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return r;
  r.visited = v.visited === true;
  r.reviewed = v.reviewed === true;
  r.notes = typeof v.notes === 'string' ? v.notes.slice(0,5000) : '';
  if (v.scores && typeof v.scores === 'object' && !Array.isArray(v.scores)) {
    for (const dim of ['Identity', 'Gameplay', 'Visual impact', 'Accessibility', 'Performance']) {
      const n = Number(v.scores[dim]);
      if (Number.isInteger(n) && n >= 1 && n <= 5) r.scores[dim] = n;
    }
  }
  return r;
}
const current = {
  dollhouse: {notes:'original observations', reviewed:true, scores:{Gameplay:4}},
  infinitum: {notes:'original INFINITUM notes', visited:true},
  pelagia: {notes:'underwater input lag', scores:{Performance:2}}
};
const payload = review => ({schemaVersion:1, review});
test('previews a limited, sanitized import without mutating user state', () => {
  const before = JSON.stringify(current);
  const p = plan(payload({dollhouse:{notes:'new review',reviewed:true,scores:{Gameplay:99,Identity:5}},unexpected:{notes:'ignore'}}),current,ids,sanitize);
  assert.equal(p.count,1);
  assert.deepEqual(p.ids,['dollhouse']);
  assert.equal(p.before.dollhouse.notes,'original observations');
  assert.equal(p.after.dollhouse.notes,'new review');
  assert.equal(p.after.dollhouse.scores.Identity,5);
  assert.equal(p.after.dollhouse.scores.Gameplay,undefined);
  assert.equal(p.after.pelagia.notes,'underwater input lag');
  assert.equal(JSON.stringify(current),before);
});
test('rejects an unknown-only import instead of silently reporting success', () => {
  assert.throws(()=>plan(payload({ghost:{notes:'x'}}),current,ids,sanitize),/no matching/);
});
test('rejects wrong schema and array/null entries before applying changes', () => {
  assert.throws(()=>plan({schemaVersion:2,review:{}},current,ids,sanitize),/schema/);
  for(const entry of [null,[],true,7]) assert.throws(()=>plan(payload({pelagia:entry}),current,ids,sanitize),/Invalid review entry/);
});
test('normalizes malicious values and limits notes without polluting prototypes', () => {
  const data=JSON.parse('{"schemaVersion":1,"review":{"pelagia":{"notes":"ok","scores":{"__proto__":{"polluted":true},"Performance":9}}}}');
  const p=plan(data,current,ids,sanitize);
  assert.equal(p.after.pelagia.notes,'ok');
  assert.equal(p.after.pelagia.scores.Performance,undefined);
  assert.equal({}.polluted,undefined);
  const long=plan(payload({pelagia:{notes:'a'.repeat(9000)}}),current,ids,sanitize);
  assert.equal(long.after.pelagia.notes.length,5000);
});
test('only recognized IDs are copied into an own-key object', () => {
  const p=plan(payload({__proto__:null,infinitum:{notes:'approved'}}),current,ids,sanitize);
  assert.equal(Object.getPrototypeOf(p.after),null);
  assert.equal(p.after.infinitum.notes,'approved');
  assert.equal(p.after.dollhouse.notes,'original observations');
});
