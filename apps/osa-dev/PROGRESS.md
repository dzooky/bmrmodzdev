# Oil Service Assistant DEV progress

## 2026-11-25 — isolated production baseline
- Copied OSA 0.2.63 from dzooky/bmrmodz commit d32cd1aa15b6f8545e7bd863e3c75e4412e0147b. Original history is in SOURCE_PROGRESS.md.
- Separate package identity osa-dev, Oil Service Assistant DEV, OSAD; matching native settings IDs and notification sender identity. Included original assets and CJK font with build support.
- Existing acquisition, UI, translations, settings, history and warm-up logic retained. No Data Tool integration or runtime changes; no new version number for this baseline copy.
- Updated inherited test expectations to match existing 0.2.63 notification behavior and DEV identity. CI and in-car verification pending. Do not run stable OSA and OSA DEV concurrently during baseline testing; both still use original vehicle signal/diagnostic paths.
- Next: inspect named Data Tool catalog and public API, then migrate approved minimal background oil-temperature demand and foreground data without duplicate acquisition.
