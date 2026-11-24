# DPF Status DEV progress

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

