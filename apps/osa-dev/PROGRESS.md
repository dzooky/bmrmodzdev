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

## 2026-11-26 — 0.2.66 engine-start notification candidate
- User did not observe automatic notification after an apparent cool-down to 77 C and subsequent warm-up; exact samples and dispatch status unavailable. Root cause unconfirmed. Approved one notification per engine start, including already-warm oil. Existing rising/rearm API now uses RPM >=300 and oil target to fire, RPM=0 to rearm; temperature fluctuations alone no longer rearm. Adds existing CDS RPM demand at 5 s; no acquisition or DPF changes. Persistent latch survives app/BG restart. A stop missed during sleep or between samples cannot be detected by this rule alone; start/stop and sleep behavior require validation. CI pending.

## 2026-11-26 — local app pop-up prototype
- Start with `bash preview/osa-dev/run.sh`, then open `http://127.0.0.1:8078/`. The MGU App Kit emulator stages only OSA DEV in an isolated workspace. The local overlay supplies the DEV runtime helpers, settings sheet and OSA CJK font from bmrmodzdev commit 2a0346a.
- Switch Pop-up scenario to try first install, routine update, one important notice, or skipped versions. Select a different scenario and return to replay. The prototype confirms IDs only on the last page and persists them in emulator settings. OSA's 22 languages are supported by the pop-up catalogs.
- Verified rendering, navigation and persistence across emulator restart in Edge. Preview-only. Next is visual approval and then deciding how real installs and upgrades will supply notice history. No vehicle verification for this prototype.

## 2026-11-26 — OSA DEV localization
- Translate gauge titles before the Kit caches their panels. Switching app languages refreshes all three gauges without a restart. Localized the settings version label, automatic language marker, pop-up confirmation, equipment reload text and remaining release history entries.
- Audited UI labels in all 22 languages. Verified all five Spanish screens, repeated Slovak/Spanish switching and Chinese Welcome in Edge. Added missing Chinese glyphs to the isolated preview atlas. Vehicle localization remains unverified.

## 2026-11-26 — first-launch welcome copy
- Added the approved introduction to engine oil, coolant and automatic transmission oil monitoring, plus the optional engine-oil temperature alert. Localized the title and both paragraphs in all 22 languages. The blue accent sits below the title.
- Verified text fit and glyph coverage with the MGU renderer in all languages. Checked Slovak, Spanish and Simplified Chinese in the browser emulator. The welcome is still a local preview scenario. Next is to connect it to real install and upgrade state.
- Added a translated 0.2.66 What's New entry for the first-launch welcome preview.

## 2026-11-26 — update notices start with 0.2.66
- Prepare a localized, versioned notice for each significant OSA DEV update starting with 0.2.66. Preserve IDs and the release order so an upgrade that skips versions can show relevant unconfirmed notices. Routine updates have no pop-up. Fresh installs show Welcome. Older history stays in What's New.
- 0.2.66 What's New preview lists automatic equipment checks, background oil temperature monitoring and the KOMBI alert at the target temperature. All 22 languages are included.
- Next: connect notices to install and upgrade state. Engine-start notification behavior still needs vehicle verification.

## 2026-11-26 — Settings preview parity
- Use the settings sheet from bmrmodzdev commit 2a0346a in the isolated OSA DEV emulator. It restores the original Reload and Run action buttons and their statuses. Shared repository runtime is untouched.
- Removed the Screen layout control from OSA DEV Settings. Fresh app state still uses the renderer default (full screen). Saved layout values retain their existing behavior.

## 2026-11-26 — OSA DEV 0.2.70
- First launch shows the localized welcome. Upgrades from the legacy baseline with saved settings or history can show an applicable, versioned What's New notice. Acknowledgment persists in settings. A legacy installation with no surviving app data is indistinguishable from a fresh install.
- The Settings list omits Screen layout and the simulator scenario. The scenario remains available in the emulator sidebar. Gauge labels are translated before their panels are cached. Existing OSA DEV data acquisition and notification dependencies are retained.
- The OSA-specific CJK atlas includes the localized pop-up glyphs. It is in a shared MGU Store build input path. No other app manifests or versions were changed. In-car behavior is unverified.
