# Climate Comfort DEV progress

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
