# Climate Comfort DEV progress

## 2026-11-26 — activation policy staged for Background Tool integration
- **Implemented (offline policy only, no release bump):** `activation-plan.js` provides deterministic per-seat / heating / ventilation / steering activation decisions after an explicit engine-start event, immutable per-function startup temperature checks, belt latch gate, D plus RPM >1000 timer arming, configurable 1/2/3/5-minute policy (default 3), strict expiry, and at-most-once intent. Stop/start reset must be signaled explicitly by a verified driving-cycle source.
- **Automated-tested:** CI pending; deterministic no-engine/no-belt/false-temperature/D/RPM/timer/expiry/retry/start-stop cases added.
- **Not implemented in car:** CC DEV does NOT yet run this state machine or send actuation via BG. Current BG Tool 0.1.5 is notification-only and handles only CDS/DPF; Data Tool API 0.1.62 does not yet expose validated gear D or seat-belt fields. Do not bypass shared Data Tool or execute vehicle commands from the new policy. The new algorithm is **not vehicle-verified**.
- **Next required stage:** Validate read-only gear and per-seat belt signals, extend managed Data Tool catalog and BG scopes, define authenticated/bounded actuator adapter and cycle-lifetime semantics, then wire settings and registration with a controlled car test. Stable CC unchanged.

## 2026-11-26 — 0.1.65 temperature display in-car confirmation
- **In-car verified (user report):** CC DEV 0.1.65 displays temperature readings in the vehicle, in addition to previously confirmed successful installation and UI display.
- **Scope:** This is observed UI temperature display; no individual raw CDS/IHKA values, freshness diagnostics, or actuator behavior were provided. Data Tool source and automation behavior are not independently verified by this observation.
- **Remaining:** Verify actual heating/ventilation commands and automation separately. Production Climate Comfort unchanged.

## 2026-11-26 — 0.1.65 in-car installation and display confirmation
- **In-car verified (user report):** MGU Store installation succeeds and CC DEV display now works on 0.1.65. This confirms the previously reported installation/display regression is resolved in this vehicle.
- **Automated-tested:** PR #117 passed preview, local immutable artwork hash checks, and Store-mode MGU_OUT package generation.
- **Not yet verified:** Data Tool temperature consumption, control behavior, and individual Front/Rear/Steering interaction are not specifically confirmed by this report. Do not extrapolate from successful display.
- **Production:** Stable Climate Comfort unchanged.

## 2026-11-26 — 0.1.65 vendor verified artwork for offline Store builds
- **Store report:** CC DEV 0.1.64 repeatedly failed with `build failed exit 1` despite passing GitHub MGU_OUT build. Exact Store failure log is unavailable; outbound asset download is the leading suspected discrepancy, **not a proven root cause**.
- **Implemented:** Restore six missing PNGs as real version-controlled files in `apps/cc-dev`, each byte-identical to production commit `02081e0` and matching the manifest's pinned Git SHA-1. The builder now uses those local files without contacting raw.githubusercontent.com. No UI redesign or automation/diagnostic logic changes. Remove temporary asset-vendoring workflow.
- **Automated-tested:** Pending final PR checks (preview + MGU_OUT archive validation).
- **In-car verified:** Pending reinstall and opening Front/Rear/Steering in CC DEV 0.1.65. Stable Climate Comfort unchanged.

## 2026-11-26 — Store build failure investigation
- **In-car/Store report:** User reports `build failed exit 1` for CC DEV with no diagnostic log available. The exact failing command and root cause are **unknown**.
- **Implemented (CI only):** Add a Store-mode (`MGU_OUT`) archive build and packaged PNG validation to the CC DEV workflow, in addition to existing preview tests, to detect builder-only failures. No change to CC DEV runtime, app version, or production.
- **Automated-tested:** PASS in PR #116: preview and MGU_OUT Store .tgz packaging with six valid images. A passing CI cannot guarantee the vehicle MGU Store environment behaves the same.
- **In-car verified:** No new verification; do not claim this check fixes the installation.

## 2026-11-26 — 0.1.64 restore missing seat and steering artwork
- **Root cause:** During initial production-to-DEV copying six PNGs (front/rear seats and steering wheels) became zero-byte Git blobs; opening Front/Rear/Steering triggers lazy PNG decoding and the render loop fails. Info/My Car/Settings/About do not use these image files and continue working.
- **Implemented:** Pin six original production PNG files to immutable production commit 02081e0 and verify their original Git blob SHA-1 at build time before staging into the app. Invalid or missing assets cause a failed build rather than a broken install. Other app behavior and data collection are unchanged.
- **Automated-tested:** CI pending, with packaging guard checking valid PNG signatures/sizes.
- **In-car verified:** Not yet; user needs to install 0.1.64 and try Front/Rear/Steering.
- **Regression:** CC DEV 0.1.63 did not fix missing pages; prior tabInfo change is not the root cause.


## 2026-11-26 — 0.1.63 tab navigation regression fix
- **In-car report:** CC DEV 0.1.62 opens after MGU restart, correct DEV name, VO configuration detected and Front/Rear/Steering tab labels visible, but touch on those tabs does not switch pages.
- **Implemented:** Always attach the ordered application tab list and selected index to the display recorder (`cv.tabInfo`), so the shared display tab dispatcher resolves page taps when the header is not using `cv.chrome`. Preserve existing equipment gating, temperature reading, controls and rendered tab layout.
- **Automated-tested:** CI pending. Add static integration guard for recorder metadata.
- **In-car verified:** No. Re-test tab switching on 0.1.63; no change to production CC.


## 2026-11-26 — 0.1.62 managed temperature migration
- **Implemented:** CC DEV foreground temperatures now consume Data Tool CDS outside temperature and four IHKA D8D7 footwell values through separate opt-in sessions. Session renews every 5 s and closes when MAIN is hidden. No direct CC-side footwell/exterior acquisition and no native fallback; invalid/stale samples disable temperature-driven commands. Existing engine RPM safety, manual IHKA/steering controls, equipment detection and UI are preserved.
- **Automated-tested:** CI pending; managed temperature tests cover subscription, validity, disconnect, recovery and unsupported/missing values.
- **In-car verified:** No. IHKA 0.1.61 vehicle read remains unverified; do not run CC DEV and production CC automatic controls at once.
- **Not migrated:** Automatic CC actuation remains foreground-only; Background Tool integration is a separate step.


## 2026-11-25 — isolated production baseline

- **Implemented:** Copied all source files and binary assets of Climate Comfort 0.1.61 from `dzooky/bmrmodz/apps/climate-comfort` into `dzooky/bmrmodzdev/apps/cc-dev`.
- **DEV identity:** `cc-dev` app ID, `Climate Comfort DEV` title and `CLCD` logging ID. Original settings, automation, controls and diagnostics are otherwise unchanged.
- **Automated-tested:** Pending CI/build verification.
- **In-car verified:** No. The DEV copy has not yet been tested in a vehicle.
- **Known issue:** Existing automation is tied to the visible `MAIN` screen loop; automatic background operation is not implemented in this copy.
- **Approved next step:** Gradually migrate `cc-dev` to the BMRMODZ Background Tool via its shared APIs. Preserve stable Climate Comfort without changes.
- **Safety:** Do not run stable CC and CC DEV automated controls simultaneously before exclusive command ownership is established. Both use the same vehicle diagnostic/actuator paths.
