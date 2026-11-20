/* World Audition Lab: pure, data-only import preflight. No network or storage. */
(function (scope) {
  'use strict';
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function planImport(payload, currentWorld, knownIds, sanitizeEntry) {
    if (!isRecord(payload) || payload.schemaVersion !== 1 || !isRecord(payload.review)) {
      throw new Error('Unrecognized review format or schema');
    }
    if (!isRecord(currentWorld) || !Array.isArray(knownIds) || typeof sanitizeEntry !== 'function') {
      throw new Error('Invalid Lab import context');
    }
    if (knownIds.length > 1000 || new Set(knownIds).size !== knownIds.length) {
      throw new Error('Invalid known-world list');
    }
    const recognized = knownIds.filter(id => Object.hasOwn(payload.review, id));
    if (!recognized.length) throw new Error('Review contains no matching Lab worlds');
    for (const id of recognized) {
      if (!isRecord(payload.review[id])) throw new Error('Invalid review entry for ' + id);
    }
    const before = Object.create(null);
    const after = Object.create(null);
    for (const id of knownIds) {
      before[id] = sanitizeEntry(currentWorld[id]);
      after[id] = before[id];
    }
    for (const id of recognized) after[id] = sanitizeEntry(payload.review[id]);
    return { count: recognized.length, ids: recognized, before, after };
  }
  scope.WorldAuditionReviewPlan = Object.freeze({ planImport });
})(globalThis);
