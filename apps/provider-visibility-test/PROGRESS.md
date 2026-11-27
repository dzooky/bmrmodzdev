# Provider visibility test 0.1.0
- Implemented: isolated OAP package with experimental BACKGROUND visibility and autostart; same TASU manifest declaration as the provider. No ECU reads, proxy initialization, commands, socket or shared data changes. Passive startup log and private report record native module and generated configuration presence only.
- Automated checks: preview workflow added; pending execution.
- In-car: not verified. Install separately, check Store and iDrive menu, inspect startup log/report after wake. Configuration presence does not prove effective TASU authorization. Uninstall test after observation.
- Existing provider remains unchanged. BACKGROUND support and Store hiding are unverified.
