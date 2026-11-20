#!/usr/bin/env node
// The Theater tour must not reopen after a visitor has replayed and dismissed
// it while the introductory delay is still pending. This tests the actual
// archived module delivered by the scoped Lab service worker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { chromium } from '@playwright/test';

const zipPath = 'public/world-audition/payload/theater.zip';
const scriptPath = 'worlds/theater/assets/index-BDYrz-Ry.js';
const archive = fs.readFileSync(zipPath);
const sha = value => createHash('sha256').update(value).digest('hex');
const originalSha = sha(archive);

function storedFile(buffer, target) {
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const length = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    assert.equal(flags & 8, 0, 'unsupported ZIP data descriptor');
    assert.equal(method, 0, 'preview must use ZIP_STORED');
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength + extraLength;
    assert(start + length <= buffer.length, 'truncated ZIP entry');
    if (name === target) return buffer.subarray(start, start + length);
    offset = start + length;
  }
  throw new Error('Theater compiled script missing from original preview ZIP');
}

const authored = storedFile(archive, scriptPath);
assert.equal(authored.toString('utf8').split('Pt.tourSeen||window.setTimeout(v,700)').length - 1, 1);
const swSource = fs.readFileSync('public/world-audition/sw.js', 'utf8');
const sandbox = {
  self: { registration: { scope: 'http://127.0.0.1/world-audition/' }, addEventListener() {} },
  URL, TextDecoder, TextEncoder, console
};
runInNewContext(swSource + '\nglobalThis.__adapt=adaptTheaterTour;', sandbox, { timeout: 2000 });
const transformed = sandbox.__adapt('theater', scriptPath, authored);
const text = Buffer.from(transformed).toString('utf8');
assert(text.includes('Pt.tourSeen||(__labTourPending=window.setTimeout(v,700))'));
assert.equal(text.split('window.clearTimeout(__labTourPending)').length - 1, 2);
assert.strictEqual(sandbox.__adapt('gardens', scriptPath, authored), authored);
assert.strictEqual(sandbox.__adapt('theater', 'worlds/theater/index.html', authored), authored);
assert.equal(sha(fs.readFileSync(zipPath)), originalSha, 'source ZIP must remain immutable');

const base = process.env.WORLD_AUDITION_URL || 'http://127.0.0.1:8768/world-audition/';
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox']
});
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (!location.pathname.endsWith('/worlds/theater/index.html')) return;
    const nativeSet = window.setTimeout.bind(window);
    const nativeClear = window.clearTimeout.bind(window);
    const audit = { scheduled: 0, cancelled: 0, handles: [] };
    window.__theaterIntroAudit = audit;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 700 && typeof callback === 'function') {
        audit.scheduled++;
        const handle = nativeSet(callback, 9000, ...args);
        audit.handles.push(handle);
        return handle;
      }
      return nativeSet(callback, delay, ...args);
    };
    window.clearTimeout = handle => {
      if (audit.handles.includes(handle)) audit.cancelled++;
      return nativeClear(handle);
    };
  });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert(response?.ok(), 'Lab preview did not load');
  await page.locator('[data-open="theater"]').first().click({ timeout: 15000 });
  await page.locator('#detail-launch').click();
  const frame = page.frameLocator('#player iframe');
  await frame.locator('#replay-tour').waitFor({ state: 'attached', timeout: 45000 });
  await page.waitForFunction(() => {
    const child = document.querySelector('#player iframe')?.contentWindow;
    return child?.__theaterIntroAudit?.scheduled === 1;
  }, null, { timeout: 60000 });

  // The authored replay control lives in its help dialog, not in the Lab UI.
  await frame.locator('#help-dialog').evaluate(dialog => dialog.showModal());
  await frame.locator('#replay-tour').click();
  assert.equal(await frame.locator('#tour-dialog').evaluate(dialog => dialog.open), true);
  await frame.locator('#tour-close').click();
  assert.equal(await frame.locator('#tour-dialog').evaluate(dialog => dialog.open), false);
  const audit = await frame.locator('body').evaluate(() => window.__theaterIntroAudit);
  assert.equal(audit.scheduled, 1);
  assert.equal(audit.cancelled, 1, 'replaying tour must cancel the pending introduction');
  await page.waitForTimeout(9300);
  assert.equal(await frame.locator('#tour-dialog').evaluate(dialog => dialog.open), false, 'dismissed tour reopened after its pending timer');
  await frame.locator('#help-dialog').evaluate(dialog => dialog.showModal());
  await frame.locator('#replay-tour').click();
  assert.equal(await frame.locator('#tour-dialog').evaluate(dialog => dialog.open), true, 'tour replay was damaged');
  await frame.locator('#tour-skip').click();
  assert.equal(await frame.locator('#tour-dialog').evaluate(dialog => dialog.open), false);
  await page.locator('#play-close').evaluate(button => button.click());
  assert.equal(await page.locator('#player iframe').count(), 0, 'iframe teardown regressed');
  assert.deepEqual(errors, [], 'uncaught page errors');
  await context.close();
} finally {
  await browser.close();
}
assert.equal(sha(fs.readFileSync(zipPath)), originalSha, 'source ZIP changed during browser test');
console.log('PASS Theater tour: original ZIP unchanged, pending introduction cancelled, no spontaneous reopening, replay and teardown preserved');
