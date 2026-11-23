# BMRMODZ Data Tool — feasibility v0.1.8

This is **not** a ready-for-migration data broker. It is an MGU-installable, on-demand, read-only experimental service to prove whether a standalone tool can read the diagnostic ECUs needed by OSA, DPF and Climate Comfort.

## Architecture
- Boot starts a Node service with a local Unix socket; **no ECU reads at startup**.
- First explicit read opens an installed **hmictl** transport via TASU.
- Only preapproved UDS `0x22` ECU/DID combinations in `profiles.js` may be requested.
- One shared queue, 200 ms spacing, coalesced concurrent identical reads, 500 ms short cache. Forfeited/negative responses are not cached.
- The service does not send UDS 0x31/0x2E, does not control anything, and has no recurring background poll.
- CDS/SOME-IP standalone signal acquisition is unimplemented and must be separately proven.
- This tool is **independent** of Car Equipment Tool and changes no applications.

## API
Unix socket: `/run/bmrmodz-data-tool/ctl.sock`; UTF-8 JSON object + newline; response is JSON + newline. For example:
```json
{"op":"status"}
{"op":"capabilities"}
{"op":"signalEnvironment"}
{"op":"configCheck"}
{"op":"someipSetup"}
{"op":"someipGenerated"}
{"op":"someipGenerate"}
{"op":"report"}
{"op":"ccPlan"}
{"op":"signalNative","mode":"load"}
{"op":"signalNative","mode":"sample","field":"statusEngineTemperature"}
{"op":"read","ecu":18,"did":17595}
```
The example reads DDE 0x12, DID 0x44BB (decimal 17595). `status` never opens diagnostic transport. A successful result includes an `uds` byte array and timestamp; errors are explicit. **A successful socket response is not proof of correct ECU data**. Inspect raw values, timing and ECU correctness against the existing app.

## Dedicated SOME/IP configuration\n\nThe bundled `signal-manifest.json` uses the BMW generator `proxies`/`services` manifest schema and documents the required CDS instance and read-only fields. It is **not** an installed OAP application's permission grant. A genuine per-tool configuration must be generated with the firmware-compatible BMW interface generator and successfully authorized on the MGU; do not reuse private app configs or bypass access controls. The isolated worker expects `BMRMODZ_CDS_CONFIG` or the tool-owned default `/var/opt/bmrmodz-data-tool/config/de_bmw_infotainment_vehicle_CDS.json`. Until that file and permissions exist, `signalNative sample` will correctly report a configuration failure.\n\n`probe.js report` yields a passive, structured, VIN-free readiness report and sends **no vehicle requests**. `probe.js configCheck` checks only the tool-owned config file. These are not proofs of vehicle communication.\n\n## Passive SOME/IP setup survey
Run `probe.js someipSetup` or use the diagnostics app to inspect whether the master catalog, firmware AppManagement generator bundle, tool signal manifest, and tool-owned CDS config are present and which UID/GID runs the service. The operation is passive: it never executes a generator, copies another app's config, modifies ACL, or attempts a SOME/IP connection. A present generator bundle is not a proof of standalone ACL registration.\n\n## Manual generator experiment (v0.1.7)
Explicit `someipGenerate` runs a bounded generator probe with safe retries when the previous precheck failed or the staging directory is empty. It calls the BMW firmware-backed generator against the tool's exact read-only `signal-manifest.json`, producing a CDS JSON and `acl.json` **only** in `/var/opt/bmrmodz-data-tool/generator-test`. It never overwrites partial staged output, and subsequent requests preserve the original failure reason through `someipGenerated`. The read-only `someipGenerated` checks staged output and required fields, but NEVER registers the ACL or activates the CDS config. Normal `configCheck` and native sampling still target the active tool-owned config path and will remain FAIL/SKIP. The current Unix socket is shared; this operation is a short-lived, bounded diagnostic experiment, not a production API. A valid generated ACL file does not grant access or prove SOME/IP traffic.\n\n## In-car test companion app

`apps/data-diagnostics` is a separate OAP app that calls only this service. It offers manually triggered first-stage read-only diagnostics and a sanitized JSON plus offline QR summary export. Neither the app nor the tool is production ready. **Do not merge or deploy from a draft PR without review and test packaging.** The GUI does not send any 0x31/0x2E controls or poll in the background.

## Test sequence
1. Run `node tools/data-tool/test.js`, `node tools/data-tool/signal-environment.test.js` and `node tools/data-tool/signal-isolate.test.js` for offline safety/queue/transport and passive SOME/IP checks.
2. Install only on a review vehicle, with helper dependency available. Verify systemd active before requesting. Execute `node /var/opt/bmrmodz-data-tool/current/probe.js status` then `node /var/opt/bmrmodz-data-tool/current/probe.js signalEnvironment` and explicit `read 0x12 0x44BB` to collect one DDE sample. The Unix socket is accessible to local processes; keep it strictly read-only until access controls are defined.
3. Once passive environment checks pass, run `node /var/opt/bmrmodz-data-tool/current/probe.js signalNative load`. This launches a separate native-binding worker with a hard timeout. An isolated CDS sample additionally requires `BMRMODZ_CDS_CONFIG` in the **service environment** pointing to a generated CDS interface JSON created for this tool; invoke `probe.js signalNative sample statusEngineTemperature`. It does **not** search or borrow private app configs. If missing, expect an explicit `config` failure, not a claim of signal success. Keep the car parked and review test permission before using the experimental native loader.
4. With vehicle parked, compare single DDE/EGS/IHKA/BDC/ACSM reads to existing apps one by one; preserve a log of positive/negative/timeout, latency and VIN-free vehicle configuration.
5. Repeat on several sessions, then concurrency testing with one other app at a time, then controlled driving tests by a passenger.
6. Only after read verification, develop a **separate** authorized CC actuator test and signal provider experiment. No actuator operation can be performed by this version.

## Climate Comfort control feasibility\n\n`probe.js ccPlan` exposes an **inert** coverage matrix for IHKA seat press/release/stop, BDC wheel heating and ACSM belt routines. It does not execute any UDS 0x31 or 0x2E commands. Code for changing ECU state is intentionally absent. Vehicle-side validation and authorization are separate work.\n\n## Status
Implemented in source only. CI is checked separately; installation, native binding, SOME/IP configuration/ACL, signal reception and in-car diagnostic results are unverified. See `PROGRESS.md` for migration GO/NO-GO gates.

### v0.1.9 — older MGU Node directory handling

The manual CDS generator creates tool-owned root/staging directories only when absent. It reuses an existing empty staging directory, preserves partial output without overwriting it, and does not activate CDS or register ACLs. Data Tool Diagnostics v0.1.11 remains unchanged.

### v0.1.10 — passive staged ACL audit

Manual `someipAudit` inspects only the Data Tool-owned staged CDS config and ACL file and reports field-presence flags, offer/request counts, and service UID/GID. It does not return ACL content, register a BMW SOME/IP ACL, change installed configuration, create proxies, or issue vehicle requests. A positive audit indicates structurally present generator output, not authorization or CDS reception.

### v0.1.11 staged CDS sampling experiment

On explicit request, `signalStaging` (mode `sample`, allowlisted `statusEngineTemperature` or `statusEngineSpeed2`) runs a short-lived isolated native SOME/IP worker using the generated tool-owned staging configuration. Worker hard timeout is 8 seconds. No active configuration installation, ACL registration, background polling, or vehicle control. Receiving native field events is not proof of correct decoded values.
