# Background Tool progress

## v0.1.0 foundation — 2026-11-25
- Approved: universal declarative persistent registrations; app controls registration lifecycle; continuous evaluation independent of foreground; Data Tool owns acquisition; Notification Tool and approved action adapters own execution.
- Implemented: isolated engine, validation, shared demand calculation, rising/once triggers, invalid/stale input suppression, injectable persistence and dispatch, regression test.
- Not implemented: MGU packaging/service, durable storage adapter, authenticated registration IPC, Data Tool runtime adapter, Notification Tool integration, real vehicle action handlers, session/drive reset, diagnostic reporting. Once means registration lifetime in this foundation, not once per drive. No vehicle control enabled.
- Automated tests: included; execution pending at authoring. In-car: not tested. No existing application or Data Tool changes.

## Runtime foundation — 2026-11-25
- Initial engine and Data Tool regression CI passed (45679017191 / 45679017117).
- Added atomic file storage, owner-scoped internal API, serialized recurring evaluation, catalog filtering, demand lease renewal and reconnect, status and action failure counters, simulated restart tests. Runtime adapters accept injected connections and dispatchers; no public IPC, live dispatch, installer or autostart yet. New CI pending. No vehicle verification.
- Raw numeric Data Tool fields only; unsupported fields do not trigger. Once-per-drive semantics pending. Persistence commits before dispatch (at-most-once attempt; crash can lose action). Stale temporary file recovery and authenticated transport remain deployment gates.

## Passive service and Diagnostics integration
- Runtime CI and Data Tool regression passed (45679787304 / 45679787106). Added standalone status-only Unix socket, Node service and systemd unit draft, copied existing public Data Tool client, optional Diagnostics v0.1.68 passive monitoring. Registration IPC and live actions deliberately disabled; service health does not prove data evaluation. Packaging and real MGU verification pending.

## Packaging foundation
- Background Tool service CI passed (45680259703). Existing Diagnostics CI failed on outdated expected version; corrected test and added monitoring assertions. Component manifest and DEV store entry added following existing Data Tool structure. Installation not verified; public registration and live dispatch still disabled.

## Controlled reference experiment
- Package and Diagnostics regression CI PASS (45680803922 / 45680803892). Added explicit two-minute B57 regeneration-request read-only test using one fixed rule and an in-memory counter; no real notification or actuator dispatch. Restart removes test registration; stop/expiry releases demand. Public arbitrary registration still disabled. CI and MGU pending.
