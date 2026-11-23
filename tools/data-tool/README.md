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

### v0.1.12 CDS sample numeric validation

The isolated staged CDS worker reports a usable sample only when engine coolant temperature, oil temperature, or RPM fields required by the requested signal are finite JavaScript numbers. Zero RPM is valid. No plausible-range assumptions are made; invalid results return field validity flags without leaking raw vehicle values. No system ACL or config change is performed.

### v0.1.13 — experimental CDS Data Engine

Explicit `cdsDemand` for consumer `diagnostics` starts one shared, isolated, read-only CDS stream using the existing generator-test configuration. `cdsSnapshot` reports fresh oil, coolant and RPM values plus per-field age, with 2-second freshness validity. `cdsRelease` or a 3-second unrenewed lease stops it. A separate worker reads both CDS fields with one SOME/IP proxy. No auto-start, unattended polling, ECU controls, system ACL registration or active config installation. Production apps are not yet authorized consumers. No continuous in-car verification yet.

### v0.1.14 — test-only Data Manifest and multi-consumer CDS leases

`data-manifest.json` defines the three decoded CDS fields and explicitly allowlisted diagnostic consumers `diagnostics` and `diagnostics-secondary`, with separate 3-second renewable demand leases. One CDS proxy is shared while any consumer remains leased; per-consumer snapshots are restricted to manifest fields and cease exposing valid data after release/expiry. This is a **test harness**, not user/production app authorization: the local Unix socket does not authenticate application identities yet. Do not add DPF/OSA/CC consumer IDs until security and lifecycle policy are reviewed.

### v0.1.15 — fail-closed IPC groundwork

A separate Unix socket `/run/bmrmodz-data-tool/secure.sock` is created with mode `0600`. It only accepts `{ "op": "securityStatus" }`. All CDS, UDS, subscription, control and generation requests to this socket are denied until *actual OS peer identity verification* and authorization can be implemented and tested on MGU. File permissions do not authenticate an app, and a consumer ID inside a request is not proof of origin. `securityCheck` on the legacy diagnostic socket checks owner-only permission and reports that peer identity and production client enablement are both unverified/disabled. The original `ctl.sock` remains 0666 for compatibility with the experimental diagnostic app: it is NOT a production-secure interface. Do not connect DPF/OSA/CC or silently change the existing socket until MGU client runtime UID/GID and a workable peer-credential mechanism have been verified.

### v0.1.16 — installer health regression hotfix

The optional secure listener introduced in 0.1.15 is now **disabled on startup by default** to avoid making an unverified second socket a prerequisite for legacy Data Tool health. The existing read-only diagnostics socket stays available, while `securityCheck` explicitly reports `secureSocket.present:false` and production client access disabled. The separate `secure.sock` remains fail-closed and can only be enabled for an isolated experiment using `BMRMODZ_SECURE_IPC_EXPERIMENT=1`; do **not** enable it for production or infer peer identity from socket permissions. The in-car installer reported `Data Tool is not healthy` for 0.1.15; the precise underlying cause remains unconfirmed without service logs. Added actual subprocess boot and simulated secure socket failure regression tests.

### v0.1.17 — passive app identity survey

The read-only legacy API `{ "op": "identitySurvey" }` reports the Data Tool's own UID/GID, legacy socket owner/mode, Node major version and whether the running Node `net.Socket` prototype exposes `getPeerCredentials`. The companion Diagnostics v0.1.19 reads its own UID/GID locally and reports both observations in the manually sent sanitized report. These readings **do not authenticate a remote peer**. In particular, a consumer label in JSON and app-reported UID cannot be trusted by the Data Tool. No `/proc` scanning, additional sockets, system permission changes, CDS/UDS traffic, controls or production access are introduced by the survey.


### v0.1.25 — optional passive secure peer survey
The pre-existing opt-in `secure.sock` now exposes a limited, status-only `peer` observation via `securityStatus`. If the MGU Node runtime supports `net.Socket.getPeerCredentials()`, the service can report whether a kernel-supplied numeric identity was observable and whether its UID matched the explicitly configured experimental DAC UID. If unsupported, the result is `kernelCredentialsAvailable:false`; **no fallback to client-supplied IDs, no assumed authentication and no production access**. Regardless of the result, application identity verification and production data permission remain false. `getData`, UDS reads and CDS requests on this socket are denied. The listener is disabled by default and the production apps are not wired to it. No additional vehicle tests are required for the software-only survey; on-car verification of socket visibility and native runtime support remains pending.


### v0.1.26 — internal named-data broker foundation
A packaged internal `data-catalog.js` / `data-broker.js` pair is available for simulated broker tests: read-only named fields for DPF B47/B57, OSA/CDS/EGS and Climate Comfort/IHKA, using the established production decoders and profile checks. A trusted in-process `Symbol` grant is required for each consumer; grants are never inferred from unauthenticated JSON or DAC alone. The internal broker coordinates identical UDS requests and concurrent CDS leases with explicit freshness. **It is not yet reachable from any Unix socket or production app**. `brokerPlan` is a passive catalog/status query on the legacy diagnostic socket only and never starts ECU/SOME-IP traffic. `getData` is deliberately not enabled. The secure socket remains optional, status-only and fail-closed pending genuine app authorization on MGU.


### v0.1.27 — one-shot broker/IPC test pack
The diagnostic socket accepts `{ "op": "brokerSelfTest" }` **only on explicit request**. It exercises fake DPF/OSA/CC data and opaque in-process scopes with concurrency, then opens and removes a temporary `0600` Unix socket to verify default-denied `getData`, security-status availability and whether the running MGU Node socket can observe kernel peer credentials. It does **not** read a vehicle, enable a secure production socket or authenticate a real application. Results include only sanitized booleans, never peer IDs. A `broker-gateway.js` dispatcher and optional test-harness socket injection exist for automated testing. No authenticated package-aware resolver has been demonstrated on MGU: default secure IPC remains status-only, installation without the opt-in flag remains unchanged, and DPF/OSA/CC have not been migrated. Diagnostics v0.1.33 includes this check in the usual Run/Send flow.


### v0.1.28 — legacy Node startup compatibility
Data Tool 0.1.27 was reported `is not healthy` by the vehicle installer. The likely startup crash was a Node-14+-only `?.` operator in `data-broker.js`, now imported by the service at boot. This release removes that syntax, avoids modern `fs.rmSync` in the manual IPC test and adds Node 12 compatibility checks to CI. No secure production access is enabled. The actual root cause and recovery in the vehicle remain pending in-car verification.


### v0.1.30 — temporary IPC runtime socket correction
The manual, test-only socket now binds within the proven Data Tool service runtime directory, under a short random name instead of `os.tmpdir()`. The legacy ctl.sock is never modified. Failures expose only a bounded stage and safe error category. New Diagnostics v0.1.35 reports these in existing notes. No production client data access is enabled. Vehicle retest remains necessary.


### v0.1.31 — live diagnostic connection peer survey
Two parked MGU diagnostics runs reproduced `local IPC listen` failures on the **extra temporary socket** while all original vehicle reads continued passing. The normal `brokerSelfTest` now reuses the existing, already-connected `ctl.sock` peer to observe whether the MGU Node runtime exposes kernel peer credentials; it no longer tries to create a second socket. Synthetic DPF/OSA/CC isolation and sharing tests remain unchanged. The legacy socket is world-accessible and not a trusted app identity gateway: kernel credential API observation is not production authorization. The separate optional secure socket remains disabled by default. Companion Diagnostics 0.1.36 reports this result in the usual one-run/sent-report workflow.


### v0.1.32 — app authentication feasibility, no live data gateway
The opt-in diagnostic command `authFeasibility` passively checks whether the running service can observe its own Linux process isolation metadata (process status, cgroup, security label, PID namespace and Seccomp/NoNewPrivs) and whether the established Node socket exposes kernel peer credentials. It returns capability flags **only**. No raw contents, PIDs, UIDs, package names, secrets, or file paths are returned. This metadata is not app authentication. The separate `auth-policy.js` is an offline-tested security contract requiring **all** of kernel peer proof, package identity binding, specific process instance and verified isolation, resolving to opaque grants. There is currently no trusted native attestor on MGU; the test policy is not wired into the service. In particular `SO_PEERCRED` availability alone never authorizes a caller and neither the 0666 diagnostic socket nor its JSON consumer labels can be used for production data. The optional 0600 listener still defaults off. No app migrated; vehicle validation remains to be done with Diagnostics v0.1.37.
