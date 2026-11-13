# Museum of Me — Unified Eight-Exhibit Replacement Program & AWE Uplift Handoff

**Handoff Date:** 2026-11-13 (14:25 EST)  
**Primary Demo Repository (`main`):** `https://github.com/westkitty/museum_demos`  
**Upstream Source Repository:** `https://github.com/westkitty/museum-of-me-vnext` (Draft PR `#57` @ `31cefc7` against `main`)  
**Local Authoritative Worktree:** `/Users/andrew/Museum_of_Me_8demo/worktree-arena-8` (`arena/eight-replacements` @ `5dc0daa`)  
**Integration Decision:** `NOT AUTHORIZED` (prototype candidates only; live museum registry, incumbents, world, Builder, Workshop, `main`, and `pages-preview` remain untouched)

---

## 1. Everything Completed Today (`2026-11-13`)

### Phase 1 — Unified Eight-Exhibit Replacement Program (`M0–M9`, `007a107`..`31cefc7`)
Built all eight independently testable interactive 3D exhibit replacement prototypes from `Museum_of_Me_Antigravity_Unified_Eight_Project.md` on `arena/eight-replacements` (branched off `origin/main` @ `392a138`):

| Milestone | Commit | Slot | Candidate Path & Summary |
|---|---|---|---|
| `M0` | `007a107` | `_shared` | Shared isolated candidate preview host, frozen `ExhibitModule` / `ResourceScope` contract tests, Vitest & Playwright arena configs (`experiments/arena/replacements/_shared/`) |
| `M1` | `9cc8f5f` | `E30` | **The Spell That Leaves a Scar** (`experiments/arena/replacements/E30-the-spell-that-leaves-a-scar/`) — causal scar matrix, refraction, and undo (`P053`) |
| `M2` | `c6899ac` | `E28` | **Ninety Seconds to Vacuum** (`experiments/arena/replacements/E28-ninety-seconds-to-vacuum/`) — 4 power presets, bulkhead seal, and 3 repeatable endings (`P051`) |
| `M3` | `574c438` | `E26` | **Reality Becomes a Cartridge** (`experiments/arena/replacements/E26-reality-becomes-a-cartridge/`) — coastal diorama <-> playable 5-stage cartridge + overlay (`P037`, `P038`) |
| `M4` | `b2feae6` | `E25` | **The Battlefield Inside the Table** (`experiments/arena/replacements/E25-the-battlefield-inside-the-table/`) — cover, sightline ray, and 1-square flip (`P015`) |
| `M5` | `2c6649b` | `E24` | **The Campaign That Can Break** (`experiments/arena/replacements/E24-the-campaign-that-can-break/`) — 4-region campaign with ID break & repair (`P012`) |
| `M6` | `210589c` | `E12` | **The Headline That Built Two Cities** (`experiments/arena/replacements/E12-the-headline-that-built-two-cities/`) — twin framing cities, inference strip, and shared-source dissolve (`P062`) |
| `M7` | `a8e2327` | `E20` | **The Impossible Cleanup** (`experiments/arena/replacements/E20-the-impossible-cleanup/`) — MB audit shrink and zero-delete safe plan (`P024`, `P032`, `P061`) |
| `M8` | `60bf873` | `E13` | **The Disobedient Orchestra** (`experiments/arena/replacements/E13-the-disobedient-orchestra/`) — 4-layer drift vs strict-cue convergence (`P010`) |
| `M9` | `31cefc7` | `docs` | Finalized `experiments/arena/replacements/PROGRAM_STATUS.md` with incumbent baseline metrics and M0–M9 gate closeout; opened Draft PR `#57` on `westkitty/museum-of-me-vnext` |

### Phase 2 — Iterative AWE Uplift Engine (`Iterations 1–3`, `d6e044c`..`5dc0daa`)
Completed three evidence-backed visual and causal uplift cycles tracked in `experiments/arena/replacements/AWE_ITERATION_LEDGER.md`:

1. **Iteration 1 (`d6e044c`) — `E26` (`WestCat Systems — Built to a Live Deadline`)**
   - Replaced uniform bar-chart boxes and capsule runner with sculpted Vancouver Island coastal landmarks (`Island Timber Pier`, `Harbour Rail Spur`, `Tidal Narrows Stack`, `Cedar Ridge Bluff`, `Point Beacon`), WestCat feline + floating speech bubble, and quantized 16-bit cartridge tiers with brass edge-connector pins.
   - Converted `WESTCAT Overlay` into an authentic `OFF -> OPAQUE [BLOCKS] -> CLICK-THROUGH` rule where attempting movement while opaque captures a red audience poll misclick rather than advancing, paired with verbatim fragmented repo badges (`WESTCAT-OVERLAY-RELOADED`, `westcat-polling-overlay`, `westcat_overlay`).
2. **Iteration 2 (`417447a`) — `E20` (`Utility & Privacy Bench — What the Tool Declines to Do`)**
   - Elevated workbench deck (`BENCH_TOP_Y = 1.16`) clear of front console levers and rebuilt solid green bars into 4 translucent `"CLEANER CLAIM"` sleeves peeling away to reveal grounded physical traps (`P032` bronze archive vault with severed cloud stub, twin hardlinked inode forks, `P061` rebounding regen coil stack, `P024` pinned rollback padlock).
   - Mounted a bolted crimson `DELETE ALL: OMITTED BY DESIGN` fascia plate beside the conserved `64.0 GB` gauge and added a premature `assembleSafePlan` refusal guard (`DECLINED: N/4 unverified shells`) blocking safe-plan completion until all 4 gates are verified.
3. **Iteration 3 (`5dc0daa`) — `E12` (`Rhetorical InDEX — Move the Lens, Not the Verdict`)**
   - Spaced 3 immutable harbor logs beneath `IMMUTABLE SOURCE LOGS (3)` (`y = 2.92`), added a sweeping optical scanner aperture (`1.56 x 0.34`) + bilateral filaments, and rebuilt `City A` / `City B` into 3 distinct rhetorical strata (`Evidence` bedrock, `Framing` fluted/buttressed colonnade scaling via `Emphasis` and retracting to `0.03` height on `Dissolve` at `x = ±1.68` clear of `centralLedger`, and strippable translucent `Inference` crystal spires).
   - Surfaced per-timestamp `P062` move-span tags (`framing`, `interpretation`, `inference`) while hiding divergent headlines when dissolved and keeping zero truth scoring (`Commission 13`).

### Phase 3 — Verification & Repository Bootstrap (`museum_demos`)
- **Latest Verified Full Run (after Iteration 3 final edit, before `5dc0daa` commit):**
  - `npx tsc --noEmit -p experiments/arena/replacements/tsconfig.json`: **PASS**
  - `npx eslint --max-warnings 0 "experiments/arena/replacements/**/*.ts"`: **PASS** (0 warnings)
  - `npx vitest run --config experiments/arena/replacements/vitest.arena.config.ts`: **PASS** (9 test files, 25 tests)
  - `npx playwright test --config experiments/arena/replacements/playwright.arena.config.ts`: **PASS** (9 Chromium WebGL suites; `E12` visual captures inspected cleanly with `Plinth hits: 0`, `Last unmount leak: 0`, `Resources: 155, Meshes: 89, Tris: 1626`)
  - `npm run typecheck && npm run lint && npm test`: **PASS** (100 test files, 987 tests)
- **Stale / Pre-Uplift Gates (last run at M9 `31cefc7`, not re-run after Iterations 1–3):**
  - `npm run build`, `npm run verify:dist`, `npm run validate:source-parity`, `npm run validate:exhibits`, `npm run validate:hotpaths`, `npm run validate:frameloop`, `npm run validate:privacy`, `npm run check:budgets` (all passed at `31cefc7`; Iterations 1–3 modified only `experiments/arena/replacements/**`).
- **Demo Repository Snapshot Pushed (`westkitty/museum_demos`):**
  - Exported the full runnable `arena/eight-replacements` commit history (`5dc0daa`) plus `Museum_of_Me_Antigravity_Unified_Eight_Project.md` and `HANDOFF.md` to `https://github.com/westkitty/museum_demos` (`main`), keeping `*/artifacts/`, `node_modules/`, and `dist/` gitignored, and keeping `/Users/andrew/Museum_of_Me_8demo/worktree-arena-8` cleanly anchored on `arena/eight-replacements` (`5dc0daa`) without altering `westkitty/museum-of-me-vnext` Draft PR `#57`.

---

## 2. What Needs to Be Done Next

### Priority 1 — Remaining AWE Uplift Iterations (5 of 8 Candidates Remaining)
Apply the same BEFORE-screenshot + canonical-grounding + causal-uplift cycle (appending each pass to `experiments/arena/replacements/AWE_ITERATION_LEDGER.md`) to the remaining five candidates:
1. **`E30` (`experiments/arena/replacements/E30-the-spell-that-leaves-a-scar/`)** — review `E30` WebGL screenshots, `data/projects/*.json` (`P053`), and incumbent `src/exhibits/games/AetherVFX.ts`; inspect scar persistence, refraction, undo legibility, and label clearance (also note `E30` had 7,874 tris / 173 res at M9 — tighten geometry/draw efficiency if helpful).
2. **`E28` (`experiments/arena/replacements/E28-ninety-seconds-to-vacuum/`)** — review `P051` canon & `AgainstTheVoid.ts`; deepen atmospheric/resource-tradeoff legibility across all 4 power presets and 3 endings.
3. **`E25` (`experiments/arena/replacements/E25-the-battlefield-inside-the-table/`)** — review `P015` canon & `DnDexTable.ts`; sharpen cover/LOS causal readability and turn-flip consequence.
4. **`E24` (`experiments/arena/replacements/E24-the-campaign-that-can-break/`)** — review `P012` canon & `InvincibleMagic.ts`; make broken ID / schema corruption and repair causality visually unmistakable.
5. **`E13` (`experiments/arena/replacements/E13-the-disobedient-orchestra/`)** — review `P010` canon & `SunoStudio.ts`; strengthen muted visual legibility of 4-layer drift vs strict-cue convergence.

### Priority 2 — Refresh Metrics, Matrix, and Remotes After All 8 Uplifts
1. **Update `experiments/arena/replacements/PROGRAM_STATUS.md`:** refresh `E26`, `E20`, `E12` (and subsequent `E30/E28/E25/E24/E13`) measured `Resources / Meshes / Tris / Plinth hits / Leak` figures so the scorecard reflects the post-uplift code rather than M9 values.
2. **Re-run Full Repository Gates:** run `npm run build`, `npm run verify:dist`, `npm run validate:source-parity`, `npm run validate:exhibits`, `npm run validate:hotpaths`, `npm run validate:frameloop`, `npm run validate:privacy`, `npm run check:budgets`, plus the full arena Vitest & Playwright suites.
3. **Sync Remotes (on explicit approval):**
   - Push `arena/eight-replacements` (`5dc0daa` + remaining uplifts) to `origin` (`westkitty/museum-of-me-vnext`) so Draft PR `#57` is current.
   - Sync `main` on `westkitty/museum_demos` with any newly completed uplifts and updated `PROGRAM_STATUS.md` / `HANDOFF.md`.

### Priority 3 — Side-by-Side Review & Optional Promotion Gate (`NOT YET AUTHORIZED`)
1. Conduct human interactive side-by-side playtesting in the candidate preview harness (`Compare Incumbent`, keyboard/touch, `reducedMotion`, `Detail: LOW/HIGH`, camera presets).
2. Obtain explicit owner sign-off per `E##` before creating a separate integration branch that modifies `src/exhibits/index.ts` or swaps any live museum exhibit.

---

## 3. Quick Commands & Boundaries for Next Session

```bash
cd /Users/andrew/Museum_of_Me_8demo/worktree-arena-8
export PATH="/opt/homebrew/bin:$PATH"
export MUSEUM_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Arena isolated checks
npx tsc --noEmit -p experiments/arena/replacements/tsconfig.json
npx eslint --max-warnings 0 "experiments/arena/replacements/**/*.ts"
npx vitest run --config experiments/arena/replacements/vitest.arena.config.ts
npx playwright test --config experiments/arena/replacements/playwright.arena.config.ts

# Core museum regression checks
npm run typecheck && npm run lint && npm test
```

### Non-Negotiable Invariants
- Keep all candidate edits strictly inside `experiments/arena/replacements/**`.
- Preserve `ExhibitBase` + `ResourceScope` ownership, `PLINTH_BOX` exclusion (`[-1.3, 1.3] x [0, 0.9] x [-1.3, 1.3]`), zero per-frame allocations in `update()`, zero leak on remount/dispose, `reducedMotion` parity, `this.scaled()` (`detailScale: 0.5`), muted-by-default audio, and zero spider motifs.
- Do not modify `src/`, `data/`, incumbents, `src/exhibits/index.ts`, `main`, or `pages-preview` without explicit separate owner authorization.
