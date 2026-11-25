# Background Tool progress

## v0.1.0 foundation — 2026-11-25
- Approved: universal declarative persistent registrations; app controls registration lifecycle; continuous evaluation independent of foreground; Data Tool owns acquisition; Notification Tool and approved action adapters own execution.
- Implemented: isolated engine, validation, shared demand calculation, rising/once triggers, invalid/stale input suppression, injectable persistence and dispatch, regression test.
- Not implemented: MGU packaging/service, durable storage adapter, authenticated registration IPC, Data Tool runtime adapter, Notification Tool integration, real vehicle action handlers, session/drive reset, diagnostic reporting. Once means registration lifetime in this foundation, not once per drive. No vehicle control enabled.
- Automated tests: included; execution pending at authoring. In-car: not tested. No existing application or Data Tool changes.
