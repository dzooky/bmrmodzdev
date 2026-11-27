# Data Native Provider (OAP app)
## 0.1.3 — close screen and title overlap
- Implemented: opt-in native title masking up to the status region; centered Close target in full renderer mode with native bar fallback, translated across all 22 locales. Close calls RHMI closeState only; no process or bridge shutdown. Existing acquisition and manifest unchanged.
- 0.1.2 vehicle evidence: information screen displayed in English (vehicle set to English); residual native title fragment visible. CI 5/5 PASS; other languages and bridge continuity unverified.
- CI pending. Vehicle test: check title, Close via touch/controller, reopen, verify provider remains reachable after closing. Platform lifecycle behavior not yet verified.

# Data Native Provider (OAP app)
## 0.1.2 — localized information-only screen
- Implemented: display title Data Provider, single full-layout information canvas without tabs/settings/buttons, 22 languages matching OSA, automatic HMIContext language with English fallback. Added read-only HMI language manifest matching OSA and renderer/inputgate dependencies for full layout. Reuse DPF CJK and Cyrillic atlases. Preserve technical app ID, autostart, TASU declarations, headless startup and acquisition modules.
- CI: pending; manifest checks cover 22 languages and unchanged TASU contract.
- In-car: not verified. Update provider, check information screen and iDrive language, then one existing parked belt reference test. Fullscreen depends on renderer support; language permission and data bridge must be confirmed on actual MGU.
- Custom icon deferred; existing icon retained.
- Visibility test 0.1.2 remained visible in iDrive; no experimental visibility flags transferred to provider.

# Data Native Provider (OAP app)
## 0.1.1 — first in-car provider transport confirmation (2026-11-27)
- **In-car verified (single parked snapshot):** With Data Tool 0.1.73 and Diagnostics 0.1.87, Tool OAP source returned `sample`, front-left `latched`, front-right `unlatched`. This supports successful startup, socket reachability, and end-to-end valid responses on this HU for one test.
- **Not yet verified:** Changing contacts across subsequent requests, ongoing operation after sleep/wake, gear selector (deliberately invalid), background app consumers. Retain the proven 0.1.1 implementation unchanged for next targeted Diagnostics 0.1.88 retest.

## 0.1.1 — headless autostart bootstrap fix (2026-11-26)
- **Implemented:** Start the dedicated on-demand IPC socket outside the UI-only `mgu.run({start(ctx)})` callback. BMW OAP may start in CONFIG_STATE with no RHMI application, where the normal runtime deliberately returns before calling `start(ctx)`. This previously left Provider 0.1.0 without a socket. Shared MGU kit runtime, Tool 0.1.72, Diagnostics 0.1.86, TASU requests, and UI functionality remain unchanged. The provider does not perform reads at boot.
- **Automated-tested:** CI pending, regression for headless bootstrap without any RHMI, existing authorized on-demand bridge tests and MGU preview. **In-car verified:** No. This fixes a definite source-code startup gap; BMW autostart, cross-process access and live ACSM responses remain unverified.
- **Install:** Use Provider 0.1.1 with existing Data Tool 0.1.72 and Diagnostics 0.1.86. One combined parked CC Test after install.

## 0.1.0 — proposed functional on-demand acquisition bridge (2026-11-26)
- **Implemented:** Autostart OAP app with its own installer-declared InternalTasu method+broadcast permissions, exact proven read-only ACSM contacts, and a reserved fail-closed gear result (no unverified VehicleInformation permission). Holds a private 0600 Unix socket in its own app data directory. No ECU reads at startup: only a Data Tool initiated request reads the values. Front and gear states are validated fail-closed and protected by a bounded coalescing cache. Uses supported mguAppStartType=autostart packaging.
- **Automated tested:** Data Tool build run 45851935363 SUCCESS (native bridge, exact registry layout, front reader, autostart metadata and both MGU previews); DPF/OSA/BG CI all PASS. **In-car verified:** No. Data Diagnostics 0.1.84 in-car native front belt readings prove the native path when an OAP app has the corresponding manifest. This new provider's autostart lifecycle, socket visibility, local requests and provider reads are not yet car-verified. Gear source is intentionally withheld after an unsupported manifest caused a previous install failure.
- **Safety:** No arbitrary UDS requests, controls, package ACL sharing, background polling, or vehicle actuation. Data Tool checks provider identity through root-controlled app registry, package metadata and dedicated socket ownership before querying.
- **Next:** Install Provider 0.1.0 + Data Tool 0.1.72 + Diagnostics 0.1.86 as one coordinated staged trial after CI. Restart HU once if the app platform requires autostart activation, then run one parked CC Test. If provider cannot be verified or gear interface isn't present, data remain invalid; no CC automation enabled.
