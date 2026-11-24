# DPF Status DEV progress

## v0.1.74 — isolated copy for Data Tool integration (2026-11-24)
- **Copied from:** `dzooky/bmrmodz` main commit `24eda19efd308c1d18489febb2af1876faa7af2b`, DPF Status v0.1.74. Original application source, tests, translations and image assets copied; original progress archived in `SOURCE_PROGRESS.md`.
- **Isolation:** dedicated app/package ID `dpf-dev`, title `DPF Status DEV`, logging ID `DPFD`; production `dzooky/bmrmodz/apps/dpf` unchanged. No functional code changes to DPF main.js or transport. Experimental Data Tool remains OFF by default.
- **Dependencies:** development Data Tool `0.1.38` declared as minimum; DPF-specific font handling included in DEV build. Verified shared runtime DPF dependencies are identical in both repositories at copy time.
- **Implementation:** copied baseline only. The target multi-app cached data contract is defined in `tools/data-tool/WORKFLOW.md`, **not yet implemented in the DPF DEV app**.
- **Automated:** syntax, mocks, source parity and localization checks in `.github/workflows/dpf-dev-check.yml`; record CI result separately after run.
- **In-car:** unverified. Do not launch stable and DEV DPF simultaneously for initial TASU tests; cloned app identity does not isolate the shared vehicle TASU or Data Tool service. Production 0.1.74 recovery is also unverified in car.
- **Next:** restore Data Tool successful before/after-sleep baseline separately; then experiment with Tool reading **only in this DEV copy**, perform targeted car verification, and port a proven minimal change to production only after explicit approval.

