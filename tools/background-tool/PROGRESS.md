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

## Diagnostics test control
- CI 45681486412 failed on temporary test directory cleanup (state file); Data Tool regression 45681486299 passed. Avoid writing state on absent unregister; clean test artifacts. Diagnostics now exposes start/stop and hit count for fixed reference experiment. New CI pending. No live notification or general registration yet.

## v0.1.1 — autonomous notification experiment
- Prior 0.1.0 reference test in vehicle recorded one hit with successful reads. Notification Tool 0.2.1 independent display confirmed in car. New explicit test starts with 15 s arming delay, then registers the same B57 reference field for 120 s; valid nonnegative sample triggers one fixed KOMBI notification via showText. No direct ECU reads or arbitrary registration; no automatic retry. Stop/expiry removes demand. Restart discards test. Runtime counters distinguish hits and queue acceptance; actual display requires vehicle confirmation. Requires NT 0.2.1. CI pending.

## v0.1.1 vehicle verification — 2026-11-25
- PR #99 CI PASS. Test hits/notification accepted 1/1; user confirmed autonomous KOMBI display while radio and navigation foreground, and automatic return of BC after notification. Verified baseline.

## v0.1.2 open API candidate
- Open local register/update/unregister/status by informational app ID; persisted declarative rules, bounded notification-only adapter, shared workload limits, reserved diagnostic namespace. No authenticated identity; no actuator actions or drive reset. Existing controlled test retained. CI and vehicle public API validation pending; OSA/DPF unchanged.

## v0.1.3 — CDS scope support
- Independent CDS and legacy DPF sessions, shared evaluation, decoded CDS values, unchanged raw DPF semantics. Failed scope isolated; empty demand releases its session. Data Tool 0.1.60 required. Added mixed-scope regression coverage. CI and in-car verification pending. No OSA registration yet.

## v0.1.4 — declarative rearm condition
- 0.1.3 PR #107 merged; Background Tool and Data Tool CI PASS (45709862688 / 45709862749). Added optional rising-trigger rearm condition, preserving persisted latch and legacy rules. New CI and vehicle validation pending.

## v0.1.5 — declarative state transitions
- 0.1.4 PR #108 merged; OSA, BG and Data Tool CI PASS. Add bounded state rules, bit masks, optional previous-state gate and timed repeat with persisted state. Existing rising/rearm behavior unchanged. No DPF-specific logic in BG. CI and vehicle verification pending.
