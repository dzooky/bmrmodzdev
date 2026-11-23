# Data Tool feasibility progress

## v0.1.11 — isolated staged CDS sampling experiment (2026-11-23)
- **Implemented on feature branch:** explicit read-only `signalStaging` operation launches the existing bounded isolated SOME/IP worker with the generated CDS config at `/var/opt/bmrmodz-data-tool/generator-test/de_bmw_infotainment_vehicle_CDS.json`. Only `statusEngineTemperature` and `statusEngineSpeed2` are allowed; a single worker at a time, 8s hard deadline. The active CDS config and ACL are not installed, registered, modified or copied.
- **Prior in-car evidence (v0.1.10 with Diagnostics v0.1.12):** staged config and ACL audit PASS, requests 1, offers 0, UID 0. Active config absent, native module loads, and UDS response echoes present. This does not prove ACL registration or native signal reception.
- **Automated:** worker fake SOME/IP staged-path test, missing-config and allowlist checks, timeout and diagnostics staged-read execution tests. CI pending. **v0.1.11 NOT YET IN-CAR VERIFIED.**
- **Next:** update Data Tool and Diagnostics v0.1.13, parked car manual Run diagnostics / Send report. A staged sample PASS confirms a sample was received, not independent correctness of decoded values or registered ACL.


## v0.1.10 — passive CDS staging/ACL audit (2026-11-23)
- **Implemented on feature branch:** new read-only `someipAudit` socket command inspects the two staged generator files, validates the two requested CDS field entries, counts ACL offers/requests, and reports Data Tool UID/GID. ACL entries, authorization details and raw config are never transmitted. The standalone service's ACL registration mechanism remains **unknown/unverified**; no file installation, permission change, native subscription, or ECU traffic.
- **Confirmed in car for v0.1.9:** staged CDS and ACL generation PASS, native SOME/IP load PASS, five ECU UDS replies PASS; active CDS config absent, temperature and RPM SKIP. These results do **not** confirm service-side ACL authorization or signal delivery.
- **Automated:** staging audit structural tests and diagnostic report coverage; CI to be verified. **v0.1.10 audit NOT YET VEHICLE VERIFIED.** Companion Diagnostics v0.1.12 required for the new report row.


## v0.1.9 — MGU Node EEXIST generator fix (2026-11-23)
- **Implemented on feature branch:** the manual CDS generator checks its tool-owned root and staging paths before mkdir. It reuses an empty staging directory and never deletes or overwrites partial outputs; files in place of directories are rejected. Active CDS config, ACL registration, ECU reads and existing applications are unchanged.
- **In-car evidence (v0.1.8, Diagnostics v0.1.11):** uploaded report showed `EEXIST: file already exists, mkdir '/var/opt/bmrmodz-data-tool'`; generator did not produce a staged CDS config. The same test series observed intermittent DDE/EGS misses followed by valid responses. CDS reception remains unverified.
- **Automated:** added old-Node-style EEXIST mkdir simulation, initial directory creation, empty-staging retry and partial-output preservation. Verify final CI. **v0.1.9 NOT YET VERIFIED IN CAR.**
- **Next:** install Data Tool v0.1.9 with existing Diagnostics v0.1.11, Generate CDS test, Run diagnostics, Send report. Inspect actual BMW generator outcome before any separate CDS activation/ACL authorization work.


## v0.1.8 — retry and original-error reporting (2026-11-23)
- **Implemented in dzooky/bmrmodzdev main:** generation prechecks can retry; one generator process at a time; retry only if the fixed staging directory is empty, without overwriting partial output. Generator exit/stderr failure is returned and retained by `someipGenerated` for the next diagnostic report. At most three launched generator attempts per service start. No ACL registration, active config modification, or autonomous reads.
- **In-car observation of v0.1.7:** displayed `One generator test per service start`, while report recorded no generated CDS JSON; original first failure was lost. This update addresses diagnostic visibility but does not yet prove generator success.
- **Automated:** unit regression for precheck retry, stderr retention, staging protection and socket behavior; CI status to verify. **In car: v0.1.8 NOT VERIFIED.**


## v0.1.7 — manual isolated BMW CDS generator experiment (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** fixed-path, one-shot, bounded `someipGenerate` command manually invokes firmware-backed BMW generator with the tool-owned read-only CDS manifest. Output goes exclusively to `/var/opt/bmrmodz-data-tool/generator-test`, and is checked via passive `someipGenerated`. If staging already exists, generation refuses to overwrite it. Config/ACL files are not activated or registered; no ECU access, controls, or boot-time generation.
- **Safety and limitations:** the Unix socket is shared by local clients (current experimental access model), so generator request is permitted only once per service start and uses fixed paths and a 12s subprocess timeout. Generated ACL file is not proof of authorization. `configCheck` still reads the separate active config and CDI sampling remains blocked until separate verification.
- **Automated:** static safe-mode/no-ACL assertions, missing-firmware precheck tests, socket mock and diagnostics runner coverage; final CI status must be checked. **In car: NOT YET VERIFIED**. User-reported v0.1.6 environment check had catalog yes, generator yes, manifest yes, CDS no, UID 0, ACL unverified.
- **Next step:** install Data Tool 0.1.7 and Diagnostics 0.1.9, manually press Generate CDS test once, run diagnostics and upload report. Check generation results before considering any ACL registration or CDS subscription.


## v0.1.6 — passive SOME/IP setup survey (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** new on-demand, read-only `someipSetup` operation checks whether the BMW catalog, firmware AppManagement generator bundle, Data Tool signal manifest and tool-owned generated CDS config exist, and reports process UID/GID with ACL registration explicitly `not verified`. Also exposed via `probe.js someipSetup`.
- **Safety:** does not run a generator, register ACLs, inspect private OAP application configs, create SOME/IP proxies, or poll any ECU. Existing UDS transport and allowlist remain unchanged. Standalone tool ACL registration / usable CDS subscription remain unresolved.
- **In-car evidence from uploaded report:** native SOME/IP module loaded, UDS positive responses from DDE/EGS/IHKA/BDC/ACSM, config missing ENOENT; CDS sampling skipped. New 0.1.6 tool and 0.1.8 companion are **not yet vehicle tested**.
- **Automated:** mock missing/present file regression and socket-level zero-UDS test; verify GitHub Actions separately before claiming pass.


## v0.1.5 — separate Data Tool Diagnostics MGU companion (2026-11-22)
- **Implemented on draft PR #48:** tool version increased to 0.1.5 for an explicitly read-only companion app (`apps/data-diagnostics`, 0.1.0). The app calls only the Data Tool socket and provides a parked-car smoke test and sanitized offline QR report.
- **Scope:** no ECU control, no automatic polling, no changes to OSA/DPF/CC/Spritmonitor, no migration. A QR summary is not equivalent to full JSON export.
- **Tests:** app/runner/translation/QR/manifest and tool CI passed on PR #48 at a83829cab387 (Data Tool feasibility run 45080774732; Car Equipment, Notification Tool, MGU Store manifest checks also passed). In-car validation remains pending.
- **Known blocker:** native SOME/IP module/config/ACL support from the independent systemd tool remains unproven. Full functional test coverage still requires the real MGU.

## v0.1.4 — static CC control contract and corrected BMW manifest (2026-11-22)\n- **Implemented on draft PR #48:** exact source-backed CC UDS operation matrix with status reads, ACSM `0x31` belt routines, IHKA press/release/stop, BDC wheel heat `0x2E`, response echo checks, safety requirements. The `ccPlan` operation is **static only**. No controls can be executed.\n- Corrected `signal-manifest.json` structure to BMW generator `proxies`/`services` format after comparing with `kit/tools/build.py`. Added schema regression test.\n- **Automated checks:** workflow validates CC matrix, no-UDS/no-control behavior, signal manifest, and launches the actual isolated worker against a fake SOME/IP binding to check load, subscription, temperature/RPM extraction, allowlist and missing configuration; CI status is recorded separately.\n- **Outstanding:** platform identity/ACL registration, standalone native SOME/IP field reception, real ECU control feedback and concurrency have not been demonstrated in-car.\n\n## v0.1.3 — tool-owned SOME/IP configuration checks and passive report (2026-11-22)
- **Implemented in feature branch:** dedicated signal manifest and local `configCheck`/`report` APIs; one-shot CLI support; checks generated CDS fields against a tool-owned configuration path (`/var/opt/bmrmodz-data-tool/config/de_bmw_infotainment_vehicle_CDS.json`). Report deliberately performs no ECU traffic, native loading or signal subscription.
- **Automated tests:** added report/config tests and no-UDS-report assertions. CI status must be checked for this commit.
- **Remaining blocker:** the MGU's BMW generator must produce the tool-owned SOME/IP interface JSON and authorization must be verified on the vehicle. Having the manifest or a JSON file alone does not register an ACL or prove access. Real-car tests are still pending.
- **Control path:** CC `0x31`/`0x2E` remains unimplemented; existing apps unchanged. No migration authorized.

## v0.1.2 — isolated native SOME/IP probe (2026-11-22)
- **Implemented:** explicit `signalNative load` and `signalNative sample` API. Native module loading and CDS proxy/subscription occur ONLY in a child process under an 8-second kill timeout; the service never loads the binding itself.
- **Scope:** read-only `statusEngineTemperature` and `statusEngineSpeed2` in instance `1`. Sample requires `BMRMODZ_CDS_CONFIG` pointing to a valid generated CDS interface configuration. No automatic subscriptions, unattended vehicle reading, app migration or ECU writes.
- **Regression:** fake worker checks allowlist, command isolation, successful subprocess reply and hard timeout; service checks mock API and no UDS read. CI status must be checked after push.
- **Known blocker:** a service-owned generated SOME/IP config and native module discoverability/ACL on the real MGU are not yet proven. This revision cannot count as vehicle validation.

## v0.1.1 — passive SOME/IP environment feasibility (2026-11-22)
- **Implemented:** passive `signalEnvironment` local API, reporting read-only catalog presence, requested signal fields, and whether a native `someip` module can be resolved without executing it.
- **Safety:** no native module loading, proxy creation, subscription, ECU request or actuator action during survey. Existing apps unchanged.
- **Tests:** offline catalog coverage / missing-module tests and local API no-UDS-traffic regression added; GitHub CI to be verified independently.
- **Limits:** native SOME/IP permissions, functional proxy, field subscriptions and background availability still **unverified in car**. `someip` module path and ACL may differ on MGU.

## v0.1.0 — first experimental build (2026-11-22)
- **Implemented on feature branch:** standalone systemd tool, local Unix socket JSON Lines API, explicit on-demand allowlisted UDS 0x22 reads to DDE, EGS, IHKA, BDC, ACSM, gateway.
- Uses installed hmictl helper; no executable bundled. Request serialization, identical-read coalescing, short TTL cache, response echo validation, TASU pending handling, error counters.
- Starts without ECU traffic; no automatic polling. Existing applications, Car Equipment and Notification Tool remain untouched.
- **Not implemented:** CDS / SOME-IP subscriptions, UDS routine controls (0x31) and writes (0x2E), per-app permission enforcement, sustained live streaming, vehicle-side full coverage.
- **Safety:** No actuator commands. Explicitly triggered tests only; test with vehicle parked and after reviewing logs. No claim of real vehicle verification.
- **Automated tests:** see test.js (run status to be recorded independently). **In-car:** not tested.

## Required GO/NO-GO gates before any migration
1. Prove each allowlisted DDE/EGS/IHKA/BDC/ACSM/gateway DID using a standalone tool on the real MGU.
2. Prove CDS/SOME-IP subscriptions from a service or establish an appropriate supported signal bridge.
3. Design and parked-vehicle-test tightly scoped CC operations (ACSM routine read, IHKA routine control, BDC write) with authorization, safety gates and physical confirmation.
4. Validate sustained read intervals, concurrency with BMRMODZ and third-party apps, collision rates, watchdog restart and recovery.
5. Preserve existing app behavior; do not migrate before complete coverage is demonstrated.
