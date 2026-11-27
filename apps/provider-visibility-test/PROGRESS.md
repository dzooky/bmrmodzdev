# Provider visibility test 0.1.2
- Implemented: disable SDK rhmiLoadingEnabled for this test app only; retain BACKGROUND, disabled entry point, autostart, manifest and app ID. No vehicle requests or changes to the functional provider. Actual startup and menu behavior remain unverified.
- Automated checks: preview verifies both SDK flags for test and unchanged defaults for native provider; pending execution.
- In-car: update existing test app and check iDrive menu, engine off. If still visible, investigate menu registration rather than further speculative SDK flags.

## 0.1.1 vehicle result (2026-11-27)
- Update installed; user confirmed still visible among iDrive apps (visibility FAIL). Startup and permissions not verified. CI 5/5 PASS, PR #176 merged.

# Provider visibility test 0.1.1
- Implemented: disable SDK entryPointLoadingEnabled for this test app only; retain BACKGROUND, autostart, RHMI loading, app identity and passive startup probe. Existing provider unchanged. SDK may stop loading the JS entrypoint; actual startup and visibility remain unknown.
- Automated checks: preview assertions added; pending execution.
- In-car: not verified. Update existing test app, inspect menu visibility; no engine start required.

## 0.1.0 vehicle result (2026-11-27)
- Installation PASS; app remained visible among iDrive apps (visibility FAIL). Autostart and effective native permissions not verified.
- CI: five PR #173 checks passed, merged to main.

# Provider visibility test 0.1.0
- Implemented: isolated OAP package with experimental BACKGROUND visibility and autostart; same TASU manifest declaration as the provider. No ECU reads, proxy initialization, commands, socket or shared data changes. Passive startup log and private report record native module and generated configuration presence only.
- Automated checks: preview workflow added; pending execution.
- In-car: not verified. Install separately, check Store and iDrive menu, inspect startup log/report after wake. Configuration presence does not prove effective TASU authorization. Uninstall test after observation.
- Existing provider remains unchanged. BACKGROUND support and Store hiding are unverified.
