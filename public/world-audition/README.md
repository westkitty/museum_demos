# World Audition Lab - public preview candidate

This folder is a public-safe, **unverified runtime candidate** for the independent World Audition Lab. It is separate from production Museum of Me and the eight replacement experiments.

21 source-backed project identities, 105 **proposed** opportunities, and 21 source-available previews. INFINITUM uses its exact pinned official Three.js r187 runtime; its complete gameplay and device performance remain unverified. Original project source archives are **not published**. Source hashes in the metadata refer to locally retained private originals.

The original Lab interface is preserved with a bounded public transport adapter. Only the 21 executable preview subsets are repacked as seekable, uncompressed ZIP_STORED per-world payloads; a scoped service worker serves them as same-origin URLs. This requires HTTPS or localhost, service-worker support, and WebGL2. The UI supports only one active iframe at a time.

**Proof:** static payload manifest and JS syntax may pass before commit. Real WebGL interaction, 21 complete playthroughs, mobile GPU and sustained performance must be independently verified; until then do not call this a released playable collection.

The existing repository's museum Pages workflow is not a valid publication proof for this folder and must not be triggered without correction.
## Additive source packaging: INFINITUM (2026-11-14)

The archived v0.8 authored source now has a self-contained browser-module preview using exact upstream Three.js r187 (core/module/OrbitControls), locally original assets and no CDN. Its 50-entry ZIP_STORED payload is fetched only when launched. Original source and asset signatures are retained. This is **SOURCE IMPLEMENTED**; real CI WebGL and interaction proof is separate, and 4 remaining INFINITUM opportunities are still PROPOSED.

## E09 dual-backend startup diagnostics (test-only, 2026-11-14)

The Lab preserves its existing 21-world software-WebGL compatibility smoke. New opt-in E09 profiling separates that portable compatibility lane from the hardware-accelerated Apple Metal performance lane. Both exercise the authored **ENTER E09** button with a real Playwright keyboard or pointer action and verify `isTrusted`, a registered handler call, WebGL context, actual first draw and the following animation-frame proxy. Never substitute a synthetic DOM click to claim input accessibility.

```sh
node tests/world-audition-profile.mjs --mode=swiftshader --runs=1 --input=keyboard
node tests/world-audition-profile.mjs --mode=metal --runs=2 --input=keyboard
node --test tests/world-audition-profile.test.mjs
```

Metal runs require macOS and verify the actual ANGLE Metal renderer; a SwiftShader fallback is an explicit failure, not a performance result. The script owns an ephemeral loopback HTTP server, writes JSON under `test-results/`, bounds each run and reports separate errors for missing trusted input, missing WebGL/draw, action timeouts, and iframe teardown. A slow trusted action that eventually renders is reported separately. The default input is the real keyboard Enter action; `--input=pointer` exercises the browser pointer lane. The CLI rejects arbitrary output paths or unbounded sample counts. All game ZIP bytes, visuals, review localStorage, source metadata and production museum files remain unchanged.

Measurements include browser launch, service-worker registration/control, ZIP HTTP delivery, E09 Enter-handler execution, WebGL context, canvas mounting, first GL draw, and following `requestAnimationFrame` scheduling. These are **stage timing proxies**, not measured presentation timestamps, FPS, gameplay completion, visual fidelity certification or broad device benchmarks. SwiftShader is suitable for portability/compatibility, not a hardware performance target. The optional compatibility diagnostic is available on manual GitHub Actions dispatch; regular PR validation keeps its original 21-world smoke and upload. The Metal command is run only on the authorized Big Mac, not Ubuntu CI.
