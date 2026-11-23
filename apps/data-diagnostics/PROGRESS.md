# Data Tool Diagnostics progress

## v0.1.41 — native process metadata accessibility survey (2026-11-23)
- **Vehicle baseline:** Tool 0.1.35 / Diagnostics 0.1.40: 23 PASS, 0 FAIL, 5 SKIP; real SO_PEERCRED successful on MGU, with installed package identity still NO-GO.
- **Implemented:** 29th manual `processBoundary` step requests Tool 0.1.36 `processBoundaryProbe`, reporting only booleans and sanitized `Process boundary:` note for cgroup, self/peer UID equivalence and process stat accessibility. It confirms production remains disabled and app identity unverified even on PASS. No UI button, data fields or upload schema changed; original vehicle read tests continue. **In-car v0.1.41 not verified.**


## v0.1.40 — native helper lifecycle compatibility (2026-11-23)
- **In-car observation:** Data Tool 0.1.34 / Diagnostics 0.1.39: 22 PASS, 0 FAIL, 6 SKIP. New `nativeKernel` skipped after a `timeout`; all preceding tests and vehicle reads stayed healthy.
- **Change:** depends on Data Tool 0.1.35 which avoids Node 8 `close`-event socket lifecycle ambiguity and gives coarse phase-specific timeout. Diagnostics result formatting and existing 28 steps are unchanged, with updated title/version only. **In-car 0.1.40 not verified.** PASS means kernel peer primitive observed, never verified application package identity.


## v0.1.39 — explicit native SO_PEERCRED vehicle experiment (2026-11-23)
- **Verified baseline:** Tool v0.1.33 / Diagnostics v0.1.38 22 PASS, 0 FAIL, 5 SKIP in real car, x86_64 ELF 64-bit Node 8 N-API 4. Only peer API and per-package identity unverified.
- **Implemented:** 28th `nativeKernel` step in the existing manual Run calls Tool 0.1.34 `nativePeerProbe`, which executes a pinned static no-libc x86_64 helper **only on explicit request** with inherited existing ctl.sock client FD. Check PASS only if kernel SO_PEERCRED proof succeeds and all production-access and app-authentication flags remain false; SKIP on bounded missing/unsupported runtime conditions; FAIL on unexpected/insecure result. Preserve original app buttons, UDS/CDS semantics, existing report schema and safe textual note `Kernel peer:`. No DPF/OSA/CC source changes.
- **Automated:** regressions and host ELF execution/roundtrip plus source binary identity. **In-car v0.1.39 UNVERIFIED.** A PASS cannot authenticate a specific application; future proof must bind peer PID/process instance to trusted signed installed package and isolation before enabling any application data API.


## v0.1.38 — native peer ABI read-only checkpoint (2026-11-23)
- **Vehicle baseline:** v0.1.37 / Data Tool 0.1.32: 21 PASS, 0 FAIL, 5 SKIP; native Node peer API unavailable, cgroup accessible, no app identity verified.
- **Implemented:** additional `nativePeer` test (#27) requests Tool v0.1.33 `nativePeerFeasibility`, displays sanitized architecture/ELF/Node/N-API summary and includes it in existing report `notes`. No raw /proc/ELF contents, PID/UID, identifiers or filenames leave the tool. Three MGU buttons, existing DDE/EGS/CDS tests and server upload schema unchanged; the Results view uses two columns of 14/13 rows.
- **GO/NO-GO:** PASS means passive ABI data were collected while production access remained OFF; it does **not** indicate that a native SO_PEERCRED helper is deployed or package identity proven. The Linux-host native experiment is CI-only. **In-car v0.1.38 unverified** until one Run + Send report.


## v0.1.37 — explicit read-only authentication boundary survey (2026-11-23)
- **Baseline real-car:** Tool 0.1.31 / Diagnostics 0.1.36 20 PASS, 0 FAIL, 5 SKIP; native Node peer API unavailable, application authentication NO-GO.
- **Implemented:** one `authBoundary` check added to the existing manual Run sequence (26 checks), reading Tool 0.1.32 `authFeasibility`. Report includes booleans and sanitized textual readiness in the existing `notes` array (no new upload result IDs or fields); original three hardware buttons, before/after snapshots and existing vehicle tests preserved. A PASS for the survey only means observability and fail-closed state were checked; it **does not** mean an app has been authenticated. Without trusted per-app identity, OSA/DPF/CC cannot consume broker data.
- **CI:** check staged fixtures, translation and strict upload payload, Node 12 startup and offline preview. **In-car v0.1.37 NOT VERIFIED**, one combined manual Run/Send report is needed to inspect /proc-based feasibility.


## v0.1.36 — test actual connected IPC without creating second socket (2026-11-23)
- **In-car evidence:** 2026-11-23 19:30 UTC, v0.1.35 + Tool 0.1.30: 19 PASS, 1 FAIL, 5 SKIP; new `brokerGateway` failed solely in second socket `listen OTHER`. The DDE/EGS/CDS and SOME/IP checks passed again.
- **Fix:** with Tool 0.1.31, the same `brokerGateway` step retains the synthetic three-app broker test but observes kernel credential API support on the actual, already connected diagnostic socket. The check no longer creates an extra socket; any supported credential observations are **NOT package authentication**. Existing 25 tests, before/after snapshots, strictly sanitized HTTPS report and 3-button UI remain intact. No production data access or background polling. Automated tests verify the new response contract; **in-car 0.1.36 unverified** until one new report.


## v0.1.35 — corrected MGU runtime IPC probe (2026-11-23)
- **In-car observation:** v0.1.34 with Data Tool 0.1.29 produced 19 PASS, 1 FAIL, 5 SKIP. Only brokerGateway failed at `local IPC listen`. The existing DDE/EGS/SOME-IP/CDS tests passed.
- **Implemented:** new Data Tool v0.1.30 test probes an independent short-lived socket inside the established working Data Tool runtime directory instead of `/tmp`. Diagnostics v0.1.35 reports an allowlisted OS error category along with failure stage, while preserving all 25 steps, the three buttons and existing HTTPS report schema. In-car v0.1.35 remains unverified pending one parked test.


## v0.1.34 — report exact safe IPC subtest failure stage (2026-11-23)
- **In-car observation:** v0.1.33 with Data Tool 0.1.28 produced 19 PASS, 1 FAIL, 5 SKIP; all core DDE/EGS/CDS checks pass. The sole FAIL is `brokerGateway`, but the previous HTTPS report only contained `Broker IPC: FAIL` without a subtest breakdown.
- **Implemented:** classify synthetic broker failure versus local socket failure; include sanitized `failureStage` in existing `brokerGateway.detail` and existing upload `notes` without new server JSON fields or new UI buttons. The Data Tool v0.1.29 local socket probe supplies the coarse failure stage without exposing UID/PID, filesystem paths or sensitive errors. Versions updated as a pair; read-only diagnostics and all existing vehicle checks remain unchanged.
- **Automated:** CI pending at change creation. **In-car v0.1.34 unverified.** Next: parked one Run, Send report; use the stage to apply a targeted fix rather than guessing.


## v0.1.33 — integrated safe broker and local IPC diagnostic (2026-11-23)
- **Implemented:** existing manual Run test adds `brokerGateway` as step 25, calling Data Tool v0.1.27 `brokerSelfTest`. The tool performs a synthetic per-app authorization/concurrency check and a local-only, temporary Unix socket deny/peer capability test. No real vehicle reads originate from this step and no production secure data gateway is enabled.
- **UI:** keep exactly three MGU buttons: phase-aware Run, Generate CDS test, Send report. Results displayed in two columns with 13/12 shorter rows to fit 520px; no additional buttons or screens. Old before/after reports remain readable. A sanitized summary is included in the existing `notes` array accepted by the upload API, not in a new result row or top-level property.
- **Dependencies:** Diagnostics now requires Data Tool >=0.1.27. DPF, OSA and Climate Comfort unchanged. Tests added for the 25th step, gateway response validation and report compatibility. **In-car 0.1.33: NOT VERIFIED**, nor are real peer credentials or package identity. Next: one combined parked run + report; do not re-run unnecessary sleep/heat tests.
 

## v0.1.32 — correct CDS temperature and RPM conversion (2026-11-23)
- **In-car issue:** v0.1.31 before-sleep report passed 19/24 checks (19 PASS, 0 FAIL, 5 SKIP), but transmitted CDS raw oil 58 and coolant 64 as °C. Production OSA `kit/runtime/car.js` uses temperature raw minus 48 °C, and RPM raw times 0.25. Thus the same captured raw values correspond to 10 °C oil and 16 °C coolant; RPM was zero so unaffected in that report. These are corrected interpretations, not new readings.
- **Fix:** apply verified OSA CDS scaling and reject invalid sentinels (temperature 255, RPM 65535) in Diagnostics `vehicle-values.js` before showing, comparing or uploading CDS measures. Preserve Data Tool v0.1.24, existing read-only ECU steps, DPF/EGS/IHKA handling, three-button MGU layout, persisted phase snapshots and upload schema. Do not rewrite any previous already-sent report.
- **Automated:** add tests for the exact reported values, RPM factor and invalid sentinels; CI pending. **In-car v0.1.32: unverified.** Keep v0.1.31 first report as pre-sleep baseline with its temperature values corrected analytically, then obtain a fresh after-wake report for comparison.


## v0.1.31 — restore visible Send report on MGU (2026-11-23)
- **In-car regression reported:** v0.1.30 declared four MAIN screen buttons; actual MGU renders only three visible action slots. "Send report" was fourth and inaccessible. CI and offline preview did not catch the hardware layout limit.
- **Implemented:** restore the three-slot manifest: phase-aware Run (label switches from "Run before sleep" to "Run after wake"), Generate CDS test, Send report. Persisted before/after snapshots select next action after app restart; completing an after snapshot starts the next cycle at before. Starting a new before measurement clears stale after data and its local saved file so values from different sleep cycles cannot accidentally be compared. Existing full read-only test sequence, values, report upload schema, CDS generator and Data Tool 0.1.24 unchanged.
- **Automated:** assert exactly three manifest buttons and phase-aware run handler, translations and release note updated. CI pending; **actual MGU button visibility for v0.1.31 is not yet re-verified.** Next: update app, run before, Send report, let car sleep, wake, run after using same button now labeled after, Send report again.


## v0.1.30 — manual before/after sleep snapshots across existing apps (2026-11-23)
- **Implemented (feature branch):** explicit Run before sleep and Run after wake actions persist independent schema-1 reports in the diagnostics app's private data directory, retain the most recent report for manual HTTPS upload and reload snapshots after restart. Two comparison tabs display differences; no background monitoring, automatic requests, control actions, server schema changes or production app changes.
- **Reference decoding from production GitHub:** DPF `apps/dpf/dde-profiles.js`: identify DDE `0x12/F150` as B57 `0F1FE8` or B47 `0F2678`; read soot `44BE`, ash `44BD`, distance since regeneration `44BF`, variant average `4B2F` / `44C7`, verifying DID, length and scaling. OSA `apps/osa/transmission.js`: identify EGS `0x18/F150` as `0F25D0` before converting its already-requested `6000` temperature from raw minus 40. Climate Comfort `apps/climate-comfort/seat-temperature.js`: signed footwell temperatures from the existing IHKA `0x78/D8D7` reply with 19-byte UDS length. OSA shared CDS oil/coolant/RPM values are derived only from existing request-driven CDS snapshot, with freshness flags checked. Unsupported variants are not guessed.
- **Manual diagnostic baseline:** all existing 22 checks retained, with the successful v0.1.29 IHKA→BDC→ACSM→DDE→EGS order preserved. Added DPF and EGS identity validation checks (24 total); one explicitly authorized batch of five DPF reads plus one EGS identity read when the existing DDE/EGS check succeeds. No extra reads if DDE/EGS is unavailable. New read-only requests use the Data Tool's existing exact ECU/DID allowlist; Data Tool remains v0.1.24. These new checks have not been verified in the car.
- **Report privacy/compatibility:** raw UDS, VIN, SGBD indices and arbitrary untrusted values are not uploaded. Locally retain only decoded, bounded measures; upload only sanitized numeric comparison strings through existing allowlisted DDE/EGS/CDS result detail fields, as the server rejects new report properties. Full before/after report copies remain local.
- **Automated:** tests for supported B47/B57 DPF scaling, invalid lengths and DIDs, OSA ATF and IHKA signed-byte positions, CDS validity, 24-check order, phase persistence logic and strict report schema. CI pending. **In-car v0.1.30: unverified.** The reported v0.1.29 two successful consecutive 17 PASS/0 FAIL/5 SKIP tests are preserved as baseline, not proof of sleep/wake reliability or correct decoded values.
- **Next car check:** while parked, run before-sleep snapshot and manually send it; allow full vehicle sleep, wake and run after-wake snapshot, then manually send it. Compare both snapshots and production app readings near the same operating conditions; ambient/temperature changes with elapsed time do not imply decoder bugs.


## v0.1.29 — established ECU-first TASU routing experiment (2026-11-23)
- **Implemented in feature branch:** existing five manual read-only UDS checks reordered to IHKA `0x78/D8D7`, BDC `0x40/D074`, ACSM `0x01/4053` **before** DDE `0x12/44BB` and EGS `0x18/6000`. No new UDS requests, changes of addresses/DIDs, extra retries, control commands, background polling, CDS, IPC, or server report schema. The earlier 1-second inter-ECU spacing and all 22 checks remain.
- **Rationale from existing production source:** `dzooky/bmrmodz/apps/dpf/main.js` uses `ReadOnlyDiag` with native `kit/runtime/diag.js` TASU proxy, which is materially different from the experimental Data Tool's `hmictl` transport. Production DPF identifies DDE via 22 F1 50 before reading sensor DIDs and handles transport busy verdicts. A gateway VO read implemented in Car Equipment Tool is **not** proof of DDE/EGS route readiness. The new ordering is an **experiment**, not a verified initialization fix or substitute for native proxy behavior.
- **In-car baseline, v0.1.28 + Tool v0.1.24:** first manual run DDE and EGS each FAIL with TASU 0x25 x1 and ~3.3s duration; second run both PASS in ~0.2s. SOME/IP environment/native timings similar across runs. Root cause of first-run rejection remains unknown.
- **Automated:** UDS execution order regression added; CI pending. **In-car v0.1.29: unverified.** Data Tool stays v0.1.24. Compare first run DDE/EGS to baseline, without claiming resolution based on synthetic tests.


## v0.1.28 — immediate TASU rejection and no redundant retries (2026-11-23)
- **Implemented in branch:** Data Tool dependency 0.1.24; explicit DDE/EGS `readTrace` returns a sanitized `TASU rejected request` error promptly on a well-formed short TASU `0x7F` rejection, while preserving aggregated TASU status code. Existing diagnostics retries only `No matching response`; therefore explicit TASU rejection does not trigger repeated attempts, avoiding the previous ~12-second first-run failure delay. All 22 manual read-only checks, 1-second inter-ECU spacing, compact server-compatible HTTPS schema and SOME/IP/CDS timing result rows unchanged. New visible What's New and regression test assert no retry on TASU rejection.
- **Vehicle evidence before change:** first MGU test DDE and EGS each TASU `0x25` x3, 3/3 timeouts; next run DDE/EGS immediately PASS, SOME/IP environment/native/load differences small. This **does not** prove first-run rejection is fixed, only that the tool can now report it promptly and accurately. Physical DDE/EGS routing remains unverified.
- **Automated:** transport/diagnostics retry tests plus whole CI; **in-car v0.1.28 not verified.** Next explicit parked first run and one repeat to confirm shorter rejection response and whether subsequent requests succeed.


## v0.1.27 — restore HTTPS upload schema compatibility (2026-11-23)
- **Regression fix (feature branch):** v0.1.26 introduced a new top-level `someipTimings` JSON property; the real report endpoint rejected it with `Unknown report field`. Remove the unsupported field from the transmitted payload. Continue measuring SOME/IP/CDS durations locally; transmit three established result rows (`someipEnvironment`, `someipLoad`, `cdsStream`) with existing `durationMs` fields alongside DDE/EGS and unexpected FAILs. No backend schema change, raw data, new vehicle requests or Data Tool update; the 22 checks and local full report remain intact.
- **Automated:** strict upload top-level-field assertion, allowed timing row tests and existing upload/runner regression suite; verify CI. **In-car:** actual server acceptance of v0.1.27 not yet verified; request retry of existing report after app update (no new car test needed).


## v0.1.26 — TASU status code histogram + SOME/IP step timing (2026-11-23)
- **Implemented on feature branch:** DDE/EGS details prioritize sanitized numeric TASU short-reject status histogram, retaining up to three attempts and prior trace counters. Read-only manual diagnostics still execute all 22 checks; compact upload still includes DDE/EGS and any other FAIL rows, plus an allowlist of millisecond durations for SOME/IP environment/config/setup/staging/native load and CDS checks. No raw signal values or extra ECU reads; the durations measure individual checks, not proof of an active SOME/IP registration or complete warm-up.
- **Real-car baseline (Diagnostics v0.1.25 + Data Tool v0.1.22):** first run 15 PASS / 2 FAIL / 5 SKIP with DDE/EGS each 3 short, length-consistent 0x7F TASU reject-marker frames; second 17 PASS / 0 FAIL / 5 SKIP with DDE 193ms, EGS 211ms. User observed faster SOME/IP UI progression on second run; earlier compact reports lacked per-step timings, so not yet quantitatively confirmed. Neither observed reject byte nor ECU wake state is established as cause.
- **Automated:** added TASU code summarizer, SOME/IP timing extraction and strict compact-upload allowlist regression. **In-car v0.1.26 not yet tested.** Next send two reports to compare TASU code counts and step timings before changing retries or transport.


## v0.1.25 — short TASU status marker diagnostics (2026-11-23)
- **Implemented on feature branch:** existing 22 checks retained, including all baseline regression checks. Manual HTTPS upload includes DDE, EGS and any other FAIL rows only, with original total PASS/FAIL/SKIP counts preserved; full results remain available in local export and in the app. DDE/EGS trace detail now prioritizes sanitized short TASU marker counts (0x7F reject marker vs unknown), length consistency and bands before the 160-character upload detail limit. New Data Tool dependency 0.1.22. Manual ECU 1s spacing, three-attempt bounded read retry, CDS and IPC unchanged. Marker alone is NOT a confirmed UDS NRC, ECU response, or actionable rejection reason.
- **Observed on MGU before this update:** Diagnostics v0.1.24 + Data Tool v0.1.21: first run DDE/EGS FAIL with three shortHeader events each, second run both PASS first attempt; normal IHKA/BDC/ACSM/CDS checks PASS. Cause of intermittent framing is unverified. 0.1.25 not yet in-car verified.
- **Automated:** synthetic frame marker/length classification, sanitized summary test and baseline regressions; CI to verify, then one parked read-only report for interpretation.


## v0.1.24 — TASU framing taxonomy and 1s inter-ECU interval (2026-11-23)
- **Implemented (feature branch):** manual DDE/EGS trace report now includes sanitized malformed event reason counts (short frame/header, length overflow, non-hex, odd length, missing). In response to user request, insert a 1000ms interval between successive **different ECU checks** (DDE, EGS, IHKA, BDC, ACSM); existing per-ECU three-attempt DDE/EGS retry and 600ms retry gaps are unchanged. No extra requests, no changes to regular Data Tool reads, security, CDS, background behavior or controls.
- **Observed before this change (v0.1.23 + tool 0.1.20):** first explicit run 15 PASS/2 FAIL/5 SKIP: DDE and EGS `ack 3/3`, `ecu 0`, `malformed 3`, `timeout 3`; second immediate run 17 PASS/0 FAIL/5 SKIP: both 1/3 ACK+ECU match and no malformed/timeout; user reports third run again failed with `malformed 3` (full third report not provided). Cause is not established.
- **Automated:** existing runner/transport regressions and new frame classification summary test, CI to verify. **In-car v0.1.24 not verified.** Run once parked, send sanitized result, compare malformed subclasses; do not conclude that a delay fixes routing without evidence.


## v0.1.23 — DDE/EGS TASU response routing trace (2026-11-23)
- **Implemented on feature branch:** existing 22 manual rows remain; only the DDE/EGS three-attempt read-only checks call the new Data Tool `readTrace` diagnostic-only operation and append aggregated, sanitized command-ACK, matching/other ECU frame, DID mismatch, negative/pending, malformed and timeout counts. Other ECU, CDS and IPC tests remain unchanged. Requires Data Tool v0.1.20.
- **Vehicle evidence from v0.1.22 (2026-11-23):** 15 PASS / 2 FAIL / 5 SKIP, DDE and EGS `No matching response; attempt 3/3` (~11.7s each). No claim of vehicle-verification for v0.1.23; diagnostic traces do not include raw UDS content or prove ECU wake state.
- **Automated:** trace summary fixtures and read-only transport observability tests in CI; verify CI outcome before car testing. **Next:** one parked explicit test, then interpret ACK / ECU routing / DID mismatch without changing retry limits by guesswork.


## v0.1.22 — bounded drivetrain ECU read-only retry diagnostics (2026-11-23)
- **Implemented on feature branch:** in explicit manual Diagnostics only, DDE (0x12 / 0x44BB) and EGS (0x18 / 0x6000) get up to **three sequential read attempts**, with 600 ms pause between attempts, but ONLY on exact `No matching response` results. The final row records `attempt N/3`; other ECU checks remain single-shot. No change to Data Tool transport, ECU allowlist, UDS DID, timeout, CDS streaming, IPC or service startup. There is no background polling or retry of negative UDS responses, malformed positive replies or socket/transport errors.
- **Reason:** on-car 0.1.21 report showed DDE and EGS 3.5 s no-response failures while other reads passed; user reports that repeated manual runs eventually make DDE/EGS respond. The test measures how many attempts are needed without claiming ECU wake-up as proven cause.
- **Automated:** added recovery-after-two-timeouts, bounded-exhaustion, negative-response, malformed-success and transport-error tests, plus report attempt text and version/release-note coverage. CI must independently confirm results. **In-car:** 0.1.22 not yet tested. Suggested: run once parked with drivetrain awake and send sanitized report. A PASS on retry is communication evidence only, not proof of correctly decoded sensor values.


- **MGU report 2026-11-23 (v0.1.21):** 22 checks, 15 PASS / 2 FAIL / 5 SKIP. DDE 3565ms and EGS 3507ms yielded `No matching response`; IHKA, BDC, ACSM, CDS numeric fields, and shared CDS stream/multi-consumer lifecycle passed. Identity/DAC results are expected SKIP, with the opt-in probe disabled. Cause of drivetrain ECU timeouts not established; repeat the same read-only test parked with the drivetrain awake before changing timing, retry behavior, or ECU profiles.

## v0.1.21 — optional secure socket DAC observation (2026-11-23)
- **Implemented on development branch:** adds `Experimental DAC socket` (22 total read-only checks), using existing `securityCheck` metadata. Disabled or untargeted experimental sockets are SKIP. Matching 0600 owner UID plus the app's own UID is PASS for **ownership observation only**, not peer authentication; mismatched target is FAIL. Production data access remains disabled regardless.
- Requires Data Tool 0.1.19. No automatic configuration, socket connection from the app, vehicle operations, CDS polling, or new secrets. Expected with default settings and previously observed results: 17 PASS / 0 FAIL / 5 SKIP; **not yet verified in car**.
- **Automated:** mock matching/mismatched UID and existing regression tests; CI to verify.


- **User-supplied MGU report 2026-11-23:** 21 explicit checks: 17 PASS / 0 FAIL / 4 SKIP. The added legacy IPC exposure SKIP confirms the mode-0666 socket is not production-safe. Tool and app identity observations PASS. `deviceVerified:false` remains in report, and these results do not authorize production consumption or verify ECU value semantics.

## v0.1.20 — legacy diagnostic socket exposure audit (2026-11-23)
- **Implemented on development branch:** adds one read-only manual check (`Legacy IPC exposure`, 21 checks total) using Data Tool v0.1.18 identity data. World-accessible legacy socket is explicitly `SKIP`, not a security success; invalid or missing exposure information is `FAIL`. No new car data polling, socket permissions, or production app access.
- Update manifest dependency to Data Tool v0.1.18; report remains sanitized, with no vehicle values or identifying data. Expected on the previously observed MGU socket mode `0666`: 17 PASS / 0 FAIL / 4 SKIP if all previous checks still pass; **not verified in car**.
- **Automated:** runner assertions updated; CI status must be checked independently.

# Data Tool Diagnostics progress

## v0.1.19 — passive application and tool identity survey (2026-11-23)
- **Implemented on feature branch:** three additional manual rows (20 total): Data Tool self UID/GID and diagnostic socket owner/mode, Diagnostics app process self UID/GID, and reported native peer credential API availability. The peer-auth check remains SKIP by design because `peerIdentityVerified:false` and production access is disabled. Own-process readings are observational, not a trusted authentication handshake.
- **In-car evidence from 0.1.18:** 15 PASS, 0 FAIL, 2 SKIP. Shared stream, UDS, and installation health pass; secure IPC disabled. **0.1.19 not yet tested in car**.
- **Automated:** identity survey unit tests, runner regression and 10/10 result columns for 20 rows; CI to verify. Requires Data Tool 0.1.17. Expected if platform exposes UID/GID: 17 PASS / 0 FAIL / 3 SKIP. No production access or additional vehicle reads.


## v0.1.18 — installation health regression companion (2026-11-23)
- **Reported:** Data Tool 0.1.15 failed installation health on MGU, so secure IPC was not vehicle-verified. The exact reason is unknown without MGU service logs.
- **Implemented on branch:** dependency to Data Tool 0.1.16, visible release note, and `Secure IPC readiness` SKIP handling when the experimental secure listener is intentionally disabled. The 17 explicit read-only tests and manual report upload are otherwise unchanged.
- **Automated:** existing regression and translation tests plus updated service boot health; CI to verify. **0.1.18 NOT YET VERIFIED IN CAR.** Expected in-car totals if everything works: 15 PASS / 0 FAIL / 2 SKIP.


## v0.1.17 — secure IPC readiness audit (2026-11-23)
- **Implemented on feature branch:** adds 17th manual `Secure IPC readiness` check using Data Tool 0.1.15. It is `SKIP` (expected) when the owner-only 0600 test socket exists but peer identity is unverified and production access is disabled; FAIL if secure socket is not restricted. The existing 16 checks, three buttons and report sanitization are unchanged.
- **Prior in-car evidence (v0.1.16):** 15 PASS / 0 FAIL / 1 SKIP, including successful two-consumer lease, expiry and restart. Does not authenticate application callers.
- **Automated:** diagnostic readiness case, fail-closed secure IPC test; CI to verify. **v0.1.17 NOT VERIFIED IN CAR.**
- **Next:** parked-car manual Run diagnostics / Send report. Expected: 15 PASS / 0 FAIL / 2 SKIP (active CDS config and unfinished production IPC authentication).


## v0.1.16 — two-consumer CDS lifecycle test (2026-11-23)
- **Implemented on feature branch:** manual diagnostics now have 16 checks. The new `CDS multi-consumer lifecycle` test starts two test-only manifest consumers, verifies one shared worker and a filtered secondary cache, releases one consumer while keeping the stream alive for the other, verifies natural lease expiry, then restarts/stops the worker. No automatic startup or changes to DPF/OSA/CC. The existing three buttons, manual HTTPS sanitized reporting, and expected active-config SKIP remain unchanged.
- **In-car evidence from v0.1.15:** individual CDS numeric values and shared stream refresh/stop PASS in a vehicle (14 PASS / 0 FAIL / 1 SKIP); the new two-consumer test is **not yet verified in car**.
- **Automated:** fixture coverage for two leases, expiry, lifecycle and separate fields, plus existing checks; CI to verify. Requires Data Tool v0.1.14.


## v0.1.15 — shared CDS streaming lifecycle check (2026-11-23)
- **Implemented on feature branch:** 15 manual checks, adding a bounded `CDS shared data engine` test that demands a stream, reads two snapshots about 0.9s apart, verifies cached oil/coolant/RPM freshness and increasing sample count, then releases the demand and verifies shutdown. The old active CDS config check is a documented SKIP when absent in experimental staging mode; staged config and ACL audits are still separate PASS/FAIL checks. No fake active config or ACL registration.
- Keeps Run diagnostics / Generate CDS test / Send report, no raw sensor data in uploaded report. Requires Data Tool v0.1.13. **In-car unverified**; successful individual numeric samples from v0.1.14 do not prove the persistent engine.
- **Automated:** streaming report, inactive config handling, existing UDS and language checks; CI pending.


## v0.1.14 — validate numeric staged CDS samples (2026-11-23)
- **Implemented on feature branch:** CDS temperature/RPM PASS requires the isolated worker to report explicitly validated finite numeric fields. Invalid fields report their keys only (no numeric values transmitted). Existing 14 checks, three actions, manual HTTPS Send report and UDS tests remain unchanged. Requires Data Tool v0.1.12.
- **In-car evidence from v0.1.13:** received native staged temperature and RPM samples in 266/297 ms, respectively, but the old test did not verify numeric payloads. Inactive CDS config still missing; no ACL registration proven.
- **Automated:** mock valid/invalid CDS result assertions; CI to verify. **v0.1.14 NOT YET VERIFIED IN CAR.**


## v0.1.13 — sample CDS directly from staged configuration (2026-11-23)
- **Implemented on feature branch:** manual diagnostics now request staged-only temperature and RPM SOME/IP probes through Data Tool 0.1.11 rather than skipping both simply because active CDS config is missing. The same 14 checks, three buttons, and manual HTTPS Send report remain. Each staged probe is isolated, read-only and bounded; native loading, staging audit and allowlist prerequisites apply. No ACL registration or active config changes.
- **Automated:** mocked staged signal/worker and diagnostics tests; CI to verify. **v0.1.13 NOT YET VEHICLE VERIFIED.** The prior report (v0.1.12) showed staging ACL audit PASS, 1 request, UID 0, but no real CDS samples.
- **Next:** run diagnostics and send report after updating both components. Distinguish native proxy init / subscribe / no signal from valid staged sample. Never treat positive sample alone as proof of decoded value correctness.


## v0.1.12 — passive CDS ACL audit reporting (2026-11-23)
- **Implemented on feature branch:** adds one `CDS ACL audit` step (14 total) to manually run diagnostics, showing staged config/ACL structural validity, sanitized counts and running UID. A PASS means staged files pass structural checks **only**, never ACL registration. Keeps three buttons, existing UDS tests, HTTPS Send report and CDS sampling SKIPs. Requires Data Tool v0.1.10.
- **Verified evidence from prior in-car report:** Data Tool v0.1.9 generator produced staged CDS+ACL, native binding loaded, five ECU UDS response echoes present; active config missing and actual CDS values unavailable.
- **Automated:** runner/translation regressions and workflow; CI to verify. **v0.1.12 NOT YET VERIFIED IN CAR.**


## v0.1.11 — focused generator/UDS diagnostics (2026-11-23)
- **Implemented in dzooky/bmrmodzdev main:** only Run diagnostics, Generate CDS test, and Send report are declared and bound; removed Next/Previous actions while tab switching stays. Removed network interfaces, route and TCP tests from the run and uploaded JSON (16 -> 13 checks). Manual HTTPS report upload remains unchanged.
- **Dependency:** Data Tool 0.1.8; its `someipGenerated` status retains the original generator failure for diagnostic report instead of losing it behind a one-attempt message. No automatic activation of CDS or ACL changes.
- **In-car evidence on previous version:** user received `One generator test per service start`; 0.1.10 report showed 10 PASS, 4 FAIL, 2 SKIP, with staged CDS missing. **This v0.1.11 is NOT YET verified in-car.**
- **Automated tests:** runner checks 13 results and no network entries; manifest requires three visible actions, upload client retained. Final GitHub CI to verify.


## v0.1.10 — restore visible Send report action (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** removed unused Export report button from the OAP manifest and UI button binding, keeping Run diagnostics, Generate CDS test, Send report, Previous page, Next page in that order. Six declared actions had crowded out Send report on MGU. Manual HTTPS upload logic is unchanged; data/QR export internals are retained, with no visible Export button.
- **Automated:** manifest ordering and button bindings asserted in regression; final CI to be checked. **In-car:** new button layout and report upload from v0.1.10 not yet verified.
- Data Tool remains v0.1.7. No other application or generator logic changed.


## v0.1.9 — isolated CDS generator test control (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** manual `Generate CDS test` button triggers one bounded tool-level generator experiment (Data Tool 0.1.7), with in-app success/failure feedback. `CDS generator test` result row checks staged CDS JSON, fields and ACL file without registering ACLs; 16 results display in two columns. Existing Run, Send, export, UDS, network and SOME/IP native-load behavior is preserved.
- **Safety:** staging-only output, no modification of active CDS config or other apps; normal CDS config/temperature/RPM tests remain FAIL/SKIP until authorized activation. Current local socket has broad access; this experimental write operation is intentionally one-shot and fixed-path, not a production feature.
- **In-car baseline:** prior 0.1.8 report on 2026-11-23: 10 PASS, 3 FAIL, 2 SKIP; catalog/generator/manifest present, CDS config absent, UID 0 and ACL unverified. Native SOME/IP loaded; five UDS ECU replies matched. Upload report received. **New 0.1.9 generation action is not vehicle-verified**.
- **Validation:** automated tests and preview build should be checked on final commit; no in-car generator or ACL results yet.


## v0.1.8 — passive standalone SOME/IP setup check (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** new `SOME/IP setup` diagnostic row queries Data Tool 0.1.6 passive `someipSetup`, showing catalog, BMW generator bundle, tool manifest, tool-owned config, process UID and explicitly unverified ACL status. Layout fits 15 results without overlapping the footer. Existing UDS, network, upload, and isolated native module test behavior remains unchanged.
- **Dependency:** tool minimum 0.1.6. Requires updating **both** Data Tool and diagnostics app. No generated CDS file, ACL registration, or native signal subscription is introduced.
- **Real-car basis:** the user supplied a complete real-MGU report: 9 PASS, 3 FAIL, 2 SKIP; native module loaded, five allowlisted ECU UDS response echoes matched, CDS config missing ENOENT. Upload succeeded through public receiver; latest passive setup test and CDS reception remain **not verified in car**.
- **Automated:** runner and pure survey regressions added. Confirm final GitHub Actions status independently.


## PHP receiver counter fix (2026-11-23)
- **In-car/user-host evidence:** Data Tool Diagnostics 0.1.7 reached `https://dzooky.eu/bmrmodz.php` but received HTTP 500 with a non-JSON body. The user-provided PHP error log identified a fatal `TypeError: json_decode() expects parameter 1 to be string, bool given` at the hourly counter decode; only `.upload-lock.php` was present in the reports directory.
- **Implemented on dzooky/bmrmodzdev main:** `server/bmrmodz.php` validates the counter file content and newline before passing a nonempty string to `json_decode()`. Missing/malformed counters safely default to zero. Data Tool Diagnostics app remains at 0.1.7 and is unchanged.
- **Locally tested:** `php -l` succeeded and a simulated HTTPS POST through PHP's built-in server with a missing counter returned HTTP 201, creating an anonymized report and `.hourly-count.php`. **Public hosting / in-car end-to-end: NOT YET VERIFIED**. User must replace the PHP receiver on hosting, then retry Send report. Public unauthenticated receiver remains temporary.


## v0.1.7 — corrected BMR upload path and footer layout (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** fixed the manual HTTPS report URL from the mistakenly ordered `/brmmodz.php` to the user's actual `/bmrmodz.php`. Updated upload tests and renamed the repository PHP receiver file accordingly; no changes to installed public hosting were made.
- **UI:** upload/export feedback now uses the single footer line at y=506 outside the Results panels instead of rendering over the final diagnostic row (y=460/479). PASS/FAIL/SKIP totals are displayed in the top-right Results header. Existing HTTP diagnostic details and protections remain unchanged.
- **In-car observation (user):** v0.1.6 returned HTTP 404 with a >4 KB "Oops! That page can't be found" HTML reply; the user subsequently identified the reversed BMR/BRM characters in the configured URL. Successful POST to the corrected endpoint is not yet vehicle-verified. SOME/IP config ENOENT remains an independent known issue.
- **Validation:** automated workflow status must be checked for the final revision; on-car rendering and successful upload remain pending.


## v0.1.6 — bounded HTTP response diagnostics (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** manual report upload failure now includes HTTP status and Content-Type, along with a short sanitized error preview (or JSON error) for the public HTTPS endpoint. The 4 KB server response cap remains; the request is still manual and the sanitized payload limit stays 32 KB.
- **User-observed in-car with v0.1.5:** upload produced `Oversized server reply`, indicating an HTTP response body exceeding 4 KB reached the client; no confirmed successful report receipt. A website GET in the user's browser returned the expected `{"ok":false,"error":"Method not allowed"}`, which does not validate the POST response.
- **Known independent blocker:** SOME/IP config `No such file or directory` remains unresolved and is unaffected by network/upload changes. Do not fake a CDS config to mark it PASS.
- **Automated:** regression coverage added for HTTP 403 JSON, HTTP 404 HTML and oversized HTML; test regex syntax corrected. GitHub CI status must be checked against latest commit. **In-car:** v0.1.6 not yet verified.
- **AGENTS.md:** test/experimental/diagnostic applications are exempt from mandatory What's New; normal production apps retain it. This app kept the v0.1.6 entry already included in the authorized release.


## v0.1.5 — MGU internet access declaration (2026-11-23)
- **Implemented in dzooky/bmrmodzdev main:** matched working Spritmonitor's `app.json` by adding `mguInternet: true` to the Data Tool Diagnostics app. MGU App Kit `kit/tools/build.py` passes this flag through to its generated application `package.json`. This flag was missing in v0.1.4 and is a likely cause of `ENOTFOUND`/`ENETUNREACH` from the OAP process, but the diagnosis is not yet vehicle-confirmed.
- Updated version, English What's New, CI regression assertion and documentation. Preserved the explicit HTTPS `https://dzooky.eu/brmmodz.php` upload with its existing uplink-DNS lookup, and all read-only tests; Data Tool 0.1.5 is unchanged.
- **Testing:** automated build and regression status to be verified after latest commit. **In-car:** upload over public HTTPS still NOT VERIFIED; request user to update/reinstall the app to ensure the new package's internet declaration takes effect, run manually parked, and report the exact upload result.
- **Security:** the temporary unauthenticated public receiver is for controlled testing only. No new secrets, VINs, or vehicle identification are transmitted intentionally.


## Public PHP receiver for v0.1.4 (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** `server/brmmodz.php` is a temporary HTTPS-only POST receiver compatible with no-token v0.1.4. Validates 32 KB schema and result allowlist; stores anonymized report data under `bmrmodz_reports` next to the deployed PHP script, creates the directory if writable, enforces a global 30/hour and 500-total quota, and returns the 24-character report ID with HTTP 201.
- **Direct web access mitigation:** Stored reports use `.php` with a 404 guard and JSON after the first line, not raw `.json`; **requires PHP execution for all report files** to prevent disclosure. If hosting serves PHP as static text, reports WILL be exposed; a true private storage path outside document root is preferable for production. Files and upload endpoint remain publicly exposed to unauthenticated abuse/traffic within their quotas, so use for short controlled tests only. This receiver is not deployed or verified on dzooky.eu.
- **Local validation:** `php -l` succeeded, simulated HTTPS POST returned HTTP 201 and direct report URL returned HTTP 404 in local PHP test server; no real-host or MGU upload validation.


## v0.1.4 — public HTTPS report endpoint (2026-11-23)
- **Implemented on dzooky/bmrmodzdev main:** manual Send report now targets `https://dzooky.eu/brmmodz.php` on TCP 443 with TLS verification; no automatic uploads or token; field allowlisting and the 32 KB limit remain. MGU uplink DNS lease lookup fallback is restored for HTTPS host resolution.
- **Diagnostics/UI:** TCP probe now targets `dzooky.eu:443`, while route probe requires a default route. App version and English What's New updated to 0.1.4; tests updated for new endpoint and scheme.
- **Server prerequisite (not done):** the LAN-only `server/bmrmodz.php` cannot be copied unchanged: its `192.168.0.x` remote-IP check rejects public requests. Public hosting also needs effective access control/rate limits and stored report download protection. The application presently supplies no auth token; token-enforcing PHP cannot accept it without a separate client change. Do not expose a writable unauthenticated JSON collector or reports directory to the internet.
- **Vehicle:** latest observed 0.1.3 in-car network route/TCP failures, SOME/IP config ENOENT, intermittent ECU results; 0.1.4 public HTTPS transfer **not yet vehicle tested**. CI result must be checked independently.


## v0.1.3 — OAP network route diagnostics (2026-11-23)
- **In-car observation (user):** Data Tool Diagnostics 0.1.2 was installed and run on a parked MGU connected to home Wi-Fi. Manual Send report failed with `ENETUNREACH`; LAN server had independently accepted an HTTP 201 and written a test report from DietPi. The MGU-side application-to-server network path remains unverified; do not assume Wi-Fi association implies an OAP network route.
- **Implemented in dzooky/bmrmodzdev main:** Manual Run diagnostics now also checks OAP-process non-loopback IPv4 interfaces, reads `/proc/net/route` (no shell), and attempts an outbound TCP connection to `192.168.0.10:80` with a short timeout. Three separate PASS/FAIL results and sanitised short details are included in the existing Results page and report, independent of Data Tool service availability. Existing ECU and CDS read-only probes remain unchanged.
- **Version/UI:** app 0.1.3, English What's New "Network diagnostics", adjusted result grid to fit 14 entries. No new network permissions claimed, no automatic uploads, no vehicle controls.
- **Validation:** GitHub Actions test workflow triggered; check actual result before calling CI passed. Real-car results for 0.1.3 are **not tested**.
- **Next:** install 0.1.3 via `dzooky/bmrmodzdev`, run diagnostics parked, inspect the three Network results, and report their exact text. Do not change DietPi or Wi-Fi configuration until evidence identifies the failure point.


## v0.1.2 — LAN HTTP manual report upload (2026-11-23)
- **Implemented on draft PR #48:** `apps/data-diagnostics/upload.js` sends sanitized reports only on explicit **Send report** to `http://192.168.0.10/bmrmodz.php` using HTTP port 80, with no DNS fallback, internet hostname, or authentication token. All allowlist, request-size and response-ID checks remain.
- **Updated:** English What's New `0.1.2 — LAN report upload`, app manifest version, README and mock upload regression checks. The prior HTTPS flow remains documented below as historical v0.1.1 implementation.
- **Server smoke test confirmed by user:** DietPi returned HTTP 201 and created a JSON file with mode 0600 plus `index.html`. This verifies local server-side receipt, not MGU operation.
- **Not verified in car:** LAN reachability and actual MGU upload, UI, Data Tool ECU/CDS reads. Reports are stored under the web root and may be accessed by their direct URLs; temporary isolated LAN testing only.


## PHP LAN receiver storage adjustment (2026-11-23)
- **Implemented on draft PR #48:** PHP receiver now stores reports in `__DIR__/bmrmodz_reports` beside `bmrmodz.php`, matching the shared Nginx/PHP-FPM mount without Docker or Nginx configuration changes. Requires an existing writable directory; creates an empty `index.html` to prevent ordinary directory listings.
- **Limitation:** `index.html` does not protect individual JSON files from direct HTTP access. Use only on a non-public test LAN; do not include identifying data. Source IP restriction may see a Docker/proxy IP instead of the client IP and needs verification during the HTTP test.
- **Still pending:** in-container runtime test and real-car validation. The MGU client upload endpoint is still the old external HTTPS address; it has not been changed in this PHP-only step.


## LAN receiver draft (2026-11-23)
- **Implemented on draft PR #48:** `server/bmrmodz.php` switched to LAN-only no-token acceptance from peer IPv4 `192.168.0.0/24`, with private storage outside the web root. Default directory is `../bmrmodz_reports`, which must be created writable on the home server. The server does not trust forwarding headers. HTTPS is not required on this isolated LAN.
- **Not yet integrated:** MGU app `upload.js` still sends authenticated HTTPS to `dzooky.eu`, and must be switched to LAN HTTP before it can send to this receiver. Neither part has been validated on the home server or in the car. Home server must not be exposed to public internet.
- No app release/version change from this PHP-only edit.


## v0.1.1 — manual HTTPS report sender (2026-11-22)
- **Implemented on draft PR #48:** one-shot explicit **Send report** control posts the sanitized JSON report to `https://dzooky.eu/bmrmodz.php` using HTTPS with the existing MGU uplink DNS fallback. It never auto-uploads. The screen shows the returned anonymous report ID or a safe error.
- Added `server/bmrmodz.php`: private report storage, authentication header, strict POST/HTTPS/size/schema checks, and no public report read API. Server requires token and private directory configured outside GitHub.
- **Language:** user approved English-only for this experimental test app; removed the other languages from its manifest and active catalogs. Visible 0.1.1 What's New is in English.
- **Tests:** mock HTTPS destination/header/redaction test and CI PHP syntax check added; verify current CI status independently. No actual deployment to dzooky.eu, no token provisioned, no real vehicle test.
- **Remaining:** one-time server and MGU secret provisioning and HTTPS connectivity verification. No token is included in source or release package.

## v0.1.0 — MGU parked-car feasibility tester (2026-11-22)

- **Implemented on draft PR #48:** new independent OAP diagnostic application using MGU App Kit. Info is the first tab and initial view with the mandatory development notice. Diagnostics, Results and Share tabs provide a manual read-only test sequence and results. Never contacts any ECU directly.
- Uses local Unix socket to Data Tool 0.1.5, explicitly checks service, SOME/IP environment/config/native load, DDE, EGS, IHKA, BDC and ACSM read-only samples, CDS temperature and RPM subscription. Missing service/config/native capability yields FAIL or SKIP, never a fabricated PASS.
- Stores a sanitized JSON report in the app data directory on Export and renders a compact, VIN-free QR code for phone scanning (no external server, network transfer or credentials). Failed operations include short error details; raw ECU data, vehicle order and VIN are excluded.
- Originally localized in 22 languages; deliberately simplified to English-only in v0.1.1 per user direction. The tester itself does not subscribe to vehicle HMI/ECU signals.
- **Automated tests:** read-only runner, UDS echo validation, safe failures, socket protocol, 22 language catalogs, static notice, full mock QR encoding and offline MGU preview build all passed in GitHub Actions Data Tool feasibility on PR #48 (head a83829cab387, run 45080774732). This is CI validation only, not in-car operation.
- **In-car:** NOT TESTED. Hardware-visible UI, QR scanning on screen, tool installation and actual ECU/CDS reads remain unverified.
- **Known limitation:** Tool-only SOME/IP config/ACL provisioning is not proven; the CDS tests may fail or be skipped. Export writes to application data; the QR transfers only a sanitized compact report, not full JSON.
- **Safety:** operator-triggered only, parked vehicle required; no CC actuator, UDS 0x31/0x2E or unattended polling.

## Next
1. Review CI/PR and MGU Store deployment on test branch.
2. Parked-car smoke check: Info notice, menu buttons, native module/config report, service startup and tool-only connection.
3. Parked-car read-only ECU sampling and QR scanning; send sanitized report to development.
4. Investigate SOME/IP identity/ACL without borrowing private app config or bypassing permissions.
5. Only after full functional coverage is proven, decide on migration.
