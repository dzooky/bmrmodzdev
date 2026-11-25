# Oil Service Assistant DEV progress

## 2026-11-25 — 0.2.64 foreground managed data
- Data Tool 0.1.60 / Diagnostics 0.1.75 vehicle test: all six fields valid, including EGS 28 C; DPF reference and release PASS. RPM 0; dynamic engine-running values unverified.
- Approved foreground-only migration, superseding background oil demand proposal. Two scoped sessions, renew every 5 s, cache snapshots, expiry handling, disconnect on hide, bounded reconnect. No native fallback, Background Tool integration or production OSA changes. Existing UI, notification preview/threshold and history retained; hidden demo path no longer provides simulated vehicle values. CI and vehicle retest pending.


## 2026-11-25 — isolated production baseline
- Copied OSA 0.2.63 from dzooky/bmrmodz commit d32cd1aa15b6f8545e7bd863e3c75e4412e0147b. Original history is in SOURCE_PROGRESS.md.
- Separate package identity osa-dev, Oil Service Assistant DEV, OSAD; matching native settings IDs and notification sender identity. Included original assets and CJK font with build support.
- Existing acquisition, UI, translations, settings, history and warm-up logic retained. No Data Tool integration or runtime changes; no new version number for this baseline copy.
- Updated inherited test expectations to match existing 0.2.63 notification behavior and DEV identity. CI and in-car verification pending. Do not run stable OSA and OSA DEV concurrently during baseline testing; both still use original vehicle signal/diagnostic paths.
- Next: inspect named Data Tool catalog and public API, then migrate approved minimal background oil-temperature demand and foreground data without duplicate acquisition.

## 2026-11-25 — 0.2.65 Background Registration
- Persistent oil-temperature-only rule while notification enabled; update target/language; unregister when disabled. BG owns automatic trigger, 2 C rearm and notification delivery. Foreground Data Tool sessions and manual preview unchanged. BG 0.1.4 and NT 0.2.1 required for this test package; conditional Store dependencies not implemented. Registration retries while app runs; uninstall cleanup not implemented. CI and in-car verification pending.
