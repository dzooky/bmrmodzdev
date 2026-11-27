# OSA Engine Diagnostics — experimental standalone app

## 2026-11-27 — 0.1.1 manual osa_ report upload
- **Implemented:** Explicit BTN_SEND action sends the complete allowlisted JSON comparison as `notes.osa_engine_report`, `runMode=osa_engine_compare`, and prefixed CDS result detail through existing `https://dzooky.eu/bmrmodz.php`; reports save locally as `osa_engine_report.json`. Displays exact server-returned ID and success/failure; never claims success on rejection.
- **Compatibility:** Existing backend expects legacy `application=bmrmodz-data-diagnostics` format; this isolated adapter carries true OSA origin in runMode/notes. Server ID format is 24 hex characters, so `osa_` is a report-type prefix, not an actual server-generated ID prefix. Whether server indexes nested notes is unverified until real upload.
- **Safety:** HTTPS TLS verification, manual send, bounded payload and replies, no VIN or secrets. Previous local 0.1.0 report remains readable. No changes to Data Tool, data-diagnostics, OSA or OSA DEV.
- **Automated tested:** CI pending. **In-car verified:** NO; real B47 and real server acceptance pending.


## 2026-11-27 — 0.1.0 B47/engine comparison candidate
- **Implemented:** Standalone package `osa-engine-diagnostics`, no OSA/DPF/Data Tool code modifications. Info first tab with mandated development notice, manually initiated sequential native BMW CDS vs shared CDS Data Tool engine read, decoded oil/coolant/RPM, partial/missing/error reporting, on-screen comparison and local JSON report in app data directory. No DDE identification or petrol/diesel restrictions.
- **Safety:** Read-only BMW CDS attribute watch using original OSA manifest; end native proxy before connecting to public CDS scope. Data Tool owns its own acquisition and cache, no consumer direct UDS or Tool API changes. No background polling. Do not run stable OSA or OSA DEV concurrently during this comparison.
- **Report:** JSON file `osa-engine-diagnostics-report.json` in this application's private data directory; summary logged as `OSA_ENGINE_REPORT`. This is not a network upload/download feature. Tester can photograph the result and diagnostic screen or extract app logs/file using an available MGU log collection method.
- **Automated tested:** CI pending. Tests include raw CDS decoding, partial/invalid samples, manual demand and release, and error reporting.
- **In-car verified:** NO. B47 Engine empty in OSA DEV 0.2.71, exact cause unconfirmed. Compare parked with engine running; capture both tabs and report. Do not claim compatibility with B47, B48, B58 or other engine before actual samples.
