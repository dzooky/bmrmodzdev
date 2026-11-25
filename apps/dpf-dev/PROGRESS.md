# DPF Status DEV progress

## 2026-11-25 — DPF DEV 0.1.80 managed API migration
- Tool 0.1.55 / Diagnostics 0.1.67, PR #88 merged ef9af123, CI 45649080867 PASS. Two B57 120 s endurance tests PASS, 23 samples per field, REQUEST max 5.46 s / MODE 5.45 s; release PASS. Stale observations 12/14 then 15/15. User confirms other apps, competing apps, native settings and media functional during testing.
- DPF DEV uses public named demand/snapshot API by default; existing experimental setting retained as explicit native reference switch (previous saved false may require manual enable). All foreground profile fields, background REQUEST/MODE when cluster notifications enabled. No automatic native fallback in managed mode. Existing calibration and timestamps retained, reconnect bounded, no production DPF or Tool runtime changes. CI and vehicle pending.

## Open API foundation — 2026-11-24
- Mixed B57 freshness in-car screenshot 12/12 PASS (5.36/5.55 s fast, 60.40–61.20 s slow); installed revision ambiguous. PR #83 merged 09225816, both CI runs PASS.
- User approved open local read-only API with enforced resource limits, no mandatory tokens. Offline dispatcher and draft API.md added; no runtime listener or consumer migration yet. CI pending. Background test remains next runtime milestone.

## In-car v0.1.79 — 2026-11-24
- All 12 B57 manual native vs scheduler cache comparisons OK, no difference or missing values. PR #82 CI 45485794738/45485794749 PASS, merged f130a787. Periodic mixed freshness test next; production subscription still blocked by app identity.


## v0.1.79 — compare scheduler cache (2026-11-24)
- User confirms DPF DEV remains functional after full B57 scheduler test (12/12 PASS). Existing manual Compare now requests one fixed scheduler snapshot, checks engine profile and compares all available readings against original native reference, preserving differences/OK/N/A/FAIL. No automatic subscription or production migration. Requires Tool 0.1.52. CI and vehicle comparison pending.


## Private gateway preparation — 2026-11-24
- Tool-side private dispatcher added for future authenticated demand/snapshot/release; not wired to the running service or this application. DPF DEV 0.1.78 remains unchanged. Real MGU package attestation remains the blocker; manual Compare remains the verified reference.


## Next-stage declarative Data Tool demands (source-only, 2026-11-24)
**Integration:** PR #71 merged to dev `main` at `2b6850a6bcab6ffc0e43dd175af270e0f42f458a`. DPF DEV regression #26 (PR), #27 (`main`) **PASS**; Data Tool regression #252 (PR), #253 (`main`) **PASS**. Only offline tests: no authenticated runtime gateway, no in-car periodic Tool acquisition, and no app or Tool version bump.

- **Implemented but NOT wired:** `data-demand-plan.js` declares profile-dependent B57/B47 foreground fields and minimal B57 regeneration background fields, freshness targets, and short demand lease. Cross-module tests compare it with the Tool's private `dpf-demand-profile.js`. No new app setting, transport change, timer, periodic Tool request, installed version or user-visible behavior; DPF DEV remains v0.1.78.
- **Vehicle-tested reference (user confirmed):** manual v0.1.78 B57 comparison of all 12 fields first returned all OK; repeated comparisons were successful, with observed small temperature differences of 0.375 C and 0.5 C and a later all-OK result. The original production DPF and OSA/EGS continued to function afterward. This confirms repeated MANUAL reads and no observed coexistence regression, **not** periodic scheduling or long-term multi-app safety.
- **Blocked next runtime step:** wait for per-app authentication/gateway and Tool-owned demand activation/lease renewal. The old diagnostic socket cannot be treated as a production-safe consumer endpoint. Test the new Tool scheduler using a trusted simulated grant only; no in-car auto polling before a safe gateway and measured sustainable rate are established.


## v0.1.78 — complete missing native references in a manual test (2026-11-24)
**Integration:** PR #70 merged to dev `main` at `dde168ca901914239b2f5eb665bd4ccb79b4bc80`. DPF DEV regressions/MGU offline preview #23 (PR) and #24 (`main`) **PASS**; Data Tool regression #250 (`main`) **PASS**. **In-car verification of v0.1.78 pending.**
- **Observed in car (0.1.76):** a valid -0.5 C temperature difference, all other initially available fields OK; repeated comparisons showed about 3 then 2 OK and other rows N/A, later roughly half OK/half N/A. This is consistent with, but does not independently prove, missing/aging per-page legacy DPF samples. A user-triggered all-data comparison cannot depend on whichever tab was previously open.
- **Targeted fix (DEV only):** on the explicit `Compare all DPF data with Data Tool` action, wait until a running normal DPF scan is complete (max 60s), snapshot fresh native values, and fetch **only missing or >90s stale** B47/B57 profile DIDs using the original read-only TASU path in profile order, sequentially, never concurrently with existing DPF polling. Only after that run the existing serial Data Tool comparison. Validate positive UDS DID/length/bytes; any native read failure remains N/A and is not treated as Tool failure. No background acquisition, production DPF/OSA edits, Tool service/socket changes, alternate transport or retries added. This is an explicit diagnostic-only dual-source verification, **not** the approved production consumer data contract.
- **UI semantics:** per-field OK for exactly equal raw samples, signed numeric delta for nonzero values, N/A for unavailable native reference, FAIL for invalid Tool read; summary now distinguishes Difference and Incomplete from genuine read failure (v0.1.77).
- **Automated testing / vehicle:** offline reference acquisition tests and existing DPF DEV regressions and MGU preview; CI pending. This combined manual test has NOT yet been verified in car. Stop on any interference with independent DPF/OSA.


## v0.1.77 — distinguish comparison differences/missing data from read failures (2026-11-24)
- **Observed in car, v0.1.76:** user reported one temperature difference of -0.5 C, all other compared readings OK, but overall Settings action showed `Failed`. On a subsequent attempt user reported nearly all N/A, only 3 OK. No per-field ECU failure evidence has been supplied. The original 30s native snapshot freshness requirement (inconsistent with the established 90s DPF UI freshness) and up to 12 serial Tool reads can produce N/A; do not interpret missing native snapshots as a transport fault. The precise cause of each missing sample is unconfirmed.
- **Regression fix:** retain existing bounded manual DPF comparison, but classify summary as `Responding` when all match, `Difference` when at least one nonzero delta and no errors, `Incomplete` when only valid matches plus missing/stale native references, and `Failed` only for an actual invalid/failed Tool read. Per-field OK / numeric delta / N/A / FAIL unchanged. Align native snapshot eligibility to 90s, consistent with existing DPF stale() handling; N/A still denotes uncollected, non-native or >90s old samples. No additional native ECU reads. All 21 non-English translation catalogs updated, unchanged Tool and production apps.
- **CI and in-car status:** pending after branch integration; no vehicle verification for this fix yet.


## v0.1.76 — all DPF profile data, differences only (2026-11-24)
**Integration:** PR #68 merged into dev `main` at `6b30ce3e920e4640619ce0eea59730837680134d`. DPF DEV test/preview CI #15 (PR), #16 (`main`) **PASS**; Data Tool regression #241 (PR), #242 (`main`) **PASS**. **DPF DEV v0.1.76 not yet tested in car.**
- **Vehicle baseline:** DPF DEV 0.1.75 manual DDE B57 SOOT comparison showed 12.99 g on original TASU and 12.99 g via Tool, 0.00 g difference; ages 17 s / 1 s; Tool responding, native source selected. One successful in-car sample, not complete migration.
- **Implemented (DEV only):** existing manual Settings action now compares every allowlisted DDE field in the identified DPF profile: B57 6 overview + 6 detail DIDs, B47 4 overview DIDs. Reuses the *existing* native snapshots, only sends a Tool read for fields with a native sample no older than 30 s, and reports one right-side row per field: `OK` for exactly identical raw data, signed scaled difference with unit otherwise, `N/A` for absent/stale/non-native native sample, `FAIL` for failed/invalid Tool reply. Only differences/statuses displayed, not the two absolute values. As source ages differ, nonzero readings may be legitimate vehicle changes, not necessarily decoder bugs.
- **Safeguards:** no new native/TASU requests, no automatic Tool polling, no transport/queue/cache/service change, existing on-demand comparison action, full-data Tool setting stays OFF, production DPF and OSA untouched. For all B57 values to be compared, open Detail then Overview before pressing the action, while snapshots are recent; missing Detail samples are reported `N/A`, never falsely `OK`.
- **Testing:** source checks, translation coverage and offline MGU preview planned in CI; no car confirmation for v0.1.76 yet.


## v0.1.75 — manual SOOT source comparison (2026-11-24)
**Integration:** PR #67 merged to dev `main` at `e1a395fe1d2b68b6ee45c4303f62229a680aa4f0`; DPF DEV checks + offline MGU preview #12 (PR) and #13 (`main`) **PASS**; Data Tool regression #239 (`main`) **PASS**. **In-car DPF DEV SOOT comparison remains unverified**. Do not confuse earlier confirmed Tool cache experiment with this new consumer integration.

- **Vehicle reference before implementation:** Data Tool 0.1.43 with Diagnostics 0.1.53 achieved **Cache test PASS** on MGU: one physical IHKA ECU read, one coalesced request, one cache hit, 3/3 valid responses, third response from cache; user confirmed original DPF and OSA EGS continued updating. This verifies the isolated Tool cache experiment only, **not** migrated DPF DEV behavior.
- **Implemented, DEV only:** a manual `Compare soot with Data Tool` Settings action. It snapshots the already collected **SOOT** sample from the original DPF TASU path (DDE 0x12 / DID 0x44BE), requires age <=30s, then makes **one** allowlisted read via Data Tool 0.1.43 through the pre-existing experimental local socket. It never performs a second native TASU read, changes the DPF display source, or invokes fallback/retries. Differences and sample ages are shown in Diagnostics; invalid/missing/stale samples are clearly reported. Comparison is disabled while `experimentalDataTool` transport mode is enabled, to guarantee the reference is native.
- **Preserved:** production DPF and OSA entirely untouched; no Tool service/transport change, no automatic demand, new polling, existing regeneration logic or source selection. Experimental normal DPF transport mode stays OFF by default. Existing DPF DEV package ID and MGU buttons unchanged.
- **Automated checks:** dedicated SOOT comparison scenarios, legacy socket return-shape compatibility, translations in all 21 non-English catalogs, DPF DEV offline checks and package preview. **CI pending; in-car verification pending.** Security note: this experiment uses the existing *unauthenticated diagnostic socket*, **not** a proven production-safe per-app data gateway. No production app migration is implied.


## v0.1.74 — isolated copy for Data Tool integration (2026-11-24)
- **Copied from:** `dzooky/bmrmodz` main commit `24eda19efd308c1d18489febb2af1876faa7af2b`, DPF Status v0.1.74. Original application source, tests, translations and image assets copied; original progress archived in `SOURCE_PROGRESS.md`.
- **Isolation:** dedicated app/package ID `dpf-dev`, title `DPF Status DEV`, logging ID `DPFD`; production `dzooky/bmrmodz/apps/dpf` unchanged. No functional code changes to DPF main.js or transport. Experimental Data Tool remains OFF by default.
- **Dependencies:** development Data Tool `0.1.38` declared as minimum; DPF-specific font handling included in DEV build. Verified shared runtime DPF dependencies are identical in both repositories at copy time.
- **Implementation:** copied baseline only. The target multi-app cached data contract is defined in `tools/data-tool/WORKFLOW.md`, **not yet implemented in the DPF DEV app**.
- **Automated:** syntax, mocks, source parity and localization checks in `.github/workflows/dpf-dev-check.yml`; record CI result separately after run.
- **In-car:** unverified. Do not launch stable and DEV DPF simultaneously for initial TASU tests; cloned app identity does not isolate the shared vehicle TASU or Data Tool service. Production 0.1.74 recovery is also unverified in car.
- **Next:** restore Data Tool successful before/after-sleep baseline separately; then experiment with Tool reading **only in this DEV copy**, perform targeted car verification, and port a proven minimal change to production only after explicit approval.

