# RSE Diagnostics 0.1.0
- Implemented: isolated English-only experimental app, Info initial screen, ten manually marked snapshots, local JSON report, matching process names, interface names and socket counts. No ECU requests, active network access, root helper or existing tool changes.
- Automated tests: fixture and offline preview workflow added; results pending.
- In-car: not verified. OAP sandbox may restrict visibility. No inference about RSE execution from absence of evidence.
- Known limitations: report stays in app data directory; portable export, registry discovery, log correlation and continuous monitoring not implemented. Results screen displays latest snapshot only. New app launch starts a new in-memory session; first capture replaces prior report.
- Next: parked vehicle test, establish visibility and report retrieval before expanding instrumentation.

## 0.1.1 — report recovery
- In-car 0.1.0: user confirmed first ten-event capture completed; final screenshot reported six matching processes (including HmiDisplayClust and HmiMain3D), VLAN interfaces, 5321 UNIX sockets and zero skipped process entries. Full report not yet retrieved; RSE execution location unknown.
- Implemented read-only recovery of original report, no capture/write/reset controls, per-event baseline deltas, manual HTTPS export through existing receiver envelope (runMode distinguishes RSE, notes.rseReport holds validated original observations). English only. No other app or server changes.
- CI pending; data persistence across Store upgrade and deployed receiver acceptance unverified. Do not uninstall. Missing/invalid report is never overwritten. No socket identity or traffic capture. Large reports beyond receiver limit are rejected rather than truncated.
