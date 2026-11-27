## v0.2.8 — Restore installation after SOME/IP manifest rejection (2026-11-27)
- In-car report: 0.2.7 installation rejected with `some/ip manifest ask for what the unit does not have`. Exact offending interface/field unknown. Catalog field presence does not establish subscribability or manifest support.
- Fix: restore empty signals manifest from installed 0.2.6; remove runtime watches for both unverified fields. Keep profile candidate discovery and add passive field metadata (getter/notifier/setter presence, instance keys, schema keys). No permission bypass, no values read, no writes. Rule/profile states remain UNKNOWN. CI pending; installation not yet confirmed.
- Next: inspect report to distinguish setter-only/notification/readable fields and supported instances before requesting any new permission.

## v0.2.7 — OEM rule candidate reads and BMW profile discovery (2026-11-27)
- Vehicle evidence 0.2.6: catalog returned Climate.operationAutomaticSwitchDriverSeat and ClimateMaster.statusClimateUpdateAutomatic; no values or rule mapping yet. CI 46072224182 passed, merged PR #170.
- Implemented: one read-only watch per candidate, bounded numeric/boolean payload capture, profile-related catalog metadata discovery, active profile row UNKNOWN pending verified source. No profile identity is read or exported in this version. No ECU or write calls. Eight captures with values retained. No shared tool changes. CI pending; no in-car verification.
- Goal: profile-specific CC settings keyed by stable verified local profile identifier; no cross-profile fallback. Next: decode candidates and locate profile getter from report.

## v0.2.6 — OEM Climate Comfort Rules metadata discovery (2026-11-27)
- Implemented: one read-only diagnostic screen, three UNKNOWN rule states, manual catalog inventory capture and explicit report upload. No verified rule-value source yet; this is discovery only, not a working rule-state reader. Retain up to eight snapshots and latest candidate names. No ECU calls, SOME/IP writes, profile reads or shared Tool changes. Legacy tests retained in source but removed from runtime navigation.
- Automated-tested: first CI passed new discovery test but failed legacy manifest/UI assertions; update those assertions to enforce the intentionally read-only single screen. Full CI rerun pending. In-car verified: no. Next: inspect candidate metadata from one parked MGU capture and identify authorized rule getters before any state decoding. No engine start needed.

## v0.2.5 — Final operator-paced OEM wheel ON/OFF confirmation (2026-11-27)
- **Vehicle evidence from Diagnostics 0.2.4:** OEM ON report 20:16:57–20:17:39 UTC showed valid preflight OFF, one `SteeringWheelClimate.requestHeating({requestor:[0,0,0,0,0],heating:true})` invocation, `requestAccepted:true` (fire-and-forget no method reply), and callback `heating:true` 1.077s after start. Operator separately explicitly confirmed physical warmth, KOMBI ON, physical BMW button successfully switching wheel heating OFF, and KOMBI OFF. The test did not capture button confirmation or post-button `heating:false`; do not claim telemetry-verified OFF yet. Earlier attempts SKIPped due to missing front belt and intermittent OEM service.
- **Implemented:** Keep existing proven exactly-one OEM ON payload, mandatory fresh driver front belt gate, fresh coded+available OEM OFF state, and all prior CC controls/diagnostics unchanged. Remove all user-answer deadlines (12/15-second prompts) and the 12-second double-confirm expiry. Collect operator confirmation of KOMBI ON, physical wheel warmth, BMW hardware OFF, KOMBI OFF and explicit Finish. Add Cancel for manual prompts; Cancel never sends an OEM OFF command and UI explicitly requires physical BMW button OFF. Retain short bounded technical communications; wait up to 3s for a passive `heatingState:false` update after operator confirms BMW button. OFF callback may arrive before the UI button tap, so track OFF only after an observed post-command ON transition. Persist `offConfirmed`, `finishConfirmed`, `cancelled` in the existing sanitized four-record report, retaining existing report schema/version 0.2.0 for stored history. No automatic OFF.
- **CI:** pending. **In-car verified:** successful OEM ON and operator-confirmed BMW physical OFF under 0.2.4; new untimed confirmation workflow is not yet in-car tested. **Next:** one parked final vehicle test, then Send OEM ON report and assess both operator statements and passive OFF callback, without claiming release-ready CC integration until separately authorized.

## v0.2.4 — Bounded SOME/IP SteeringWheelClimate connection trace (2026-11-27)
- **Implemented:** Isolated foreground-only `Trace SOME/IP` for `SteeringWheelClimate` instance 1, using exactly one `signals.watch` request for the read-only `heatingState` subscription. Records watch completion time, callback count and first/last timing, whether a proxy and shutdown function are supplied, bounded parsed coded/available/heating state, errors and subscription shutdown outcome. Separates unavailable, rejected watch, null subscription, no notification, unparsed notification, valid sample and timeout; an unverified proxy boolean is not equated with service reachability. Maximum 8 seconds of observation after subscription, bounded 3-second initial watch resolution. **No `getValue`, `signals.call`, `requestHeating`, BDC/TASU read, belt preflight, or engine start.** This is a feasibility trace, not service discovery beneath `signals.watch`.
- **UI/report:** Four existing tabs unchanged. CC OEM Services gets `Trace SOME/IP` plus `Send SOME/IP trace`. Existing `Check OEM (engine OFF)`, `Start OEM ON test`, old `Read-only OEM source test`, `Send OEM source report`, `Send OEM ON report` remain available. Trace data stored privately in `cc-someip-trace-024.json` (last 4 sanitized captures), explicitly manually uploaded under `cc-someip-wheel-trace-0.2.4`.
- **Vehicle evidence:** In 0.1.99 the body service returned one valid `heatingState` while a direct getter was unsupported. Later 0.2.0 ON tests and 0.2.3 engine-off read-only check often showed service unavailable; no OEM ON call verified. Vehicle state and subscription failure root cause remain unknown.
- **Automated-tested:** Pending CI. **In-car verified:** New trace not yet tested. Safe next test: parked, ignition/MGU on, engine off, tap `Trace SOME/IP` once then `Send SOME/IP trace`; no car start, no belt, no actuator test required. Any error is useful evidence; do not loop tests or change shared Tool.

## v0.2.3 — OEM service check without starting engine (2026-11-27)
- **Implemented:** Add explicit `Check OEM (engine OFF)` action in existing CC OEM Services tab. Reuse 0.1.99 read-only ClimateMaster/SteeringWheelClimate watcher with a bounded 6-second sampling window; skip optional BDC/TASU diagnostic entirely, no belt preflight, no engine-state requirement and absolutely no OEM `requestHeating` invocation. Mark `engineOffProbe:true` in persisted four-attempt read-only report. Existing read-only test with BDC and separate guarded OEM ON activation remain unchanged.
- **Motivation / vehicle observation:** User reported `SKIP / oem-unavailable` at 19:38 in 0.2.2 while running a short test, and asked not to repeatedly start the engine merely to investigate source availability. Availability in engine-off/ignition-only mode is **unknown**; a missing sample must be reported without declaring service unsupported.
- **Offline coverage:** Adds a no-BDC/no-actuation engine-off case and verifies report flags and UI wiring. **CI:** pending. **In-car verified:** not yet.
- **Next:** With parked car, ignition/MGU awake but engine **not** started, tap `Check OEM (engine OFF)` once and `Send OEM source report`. Do not use `Start OEM ON test` for this test.

## v0.2.2 — OEM state callback regression repair (2026-11-27)
- **Vehicle evidence:** Two uploaded copies of the 0.2.0 OEM ON report (same four attempts) show three `SKIP / no-fresh-oem-state` with `refresh:Unknown method name 'get:heatingState'` and one `SKIP / oem-unavailable`. All attempts have `requestAttempted:false`, no actuator command, no OEM/BDC samples; front belt preflight passed to reach OEM watcher in these runs.
- **Root cause in new test:** Actuation code called `sub.proxy.getValue('heatingState')` immediately, but the MGU service rejects `get:heatingState`. The app prematurely concluded no fresh state before waiting for a watch callback. The prior 0.1.99 read-only probe waited six seconds for service samples.
- **Implemented targeted fix:** Remove the unsupported direct getter solely from manual OEM ON trial; wait up to six seconds for `SteeringWheelClimate.heatingState` subscription callback, require a sample no older than three seconds and `coded=true, available=true, heating=false` before sending exactly one OEM ON request. Continue observing passive callback after action and OEM hardware-button feedback. No changes to the previously successful read-only probe, shared Tool, background application, OEM command parameters, belt gate, or CC production.
- **Regression coverage:** Offline fixture checks no getter is invoked even when a proxy exposes it, delayed callback arrival, no-notification fail-closed SKIP, request count and physical OEM button feedback. **CI:** pending. **In-car verified:** fix not yet tested, OEM activation still unverified.
- **Next parked test:** Update Diagnostics to 0.2.2. Confirm belt latched, engine running, P, wheel OFF; one guided OEM ON test and manual upload. If no callback, keep fail-closed and report `no-fresh-oem-state`; do not retry writes or bypass gates.

## v0.2.1 — OEM test preflight result visibility (2026-11-27)
- **Vehicle feedback:** On 0.2.0, pressing Start, confirming, then returning to Start with no clearly apparent result. Exact exit stage not yet known (possible belt gate or OEM availability); do not infer actuation failure from this UI behavior alone.
- **Implemented regression repair:** Preserve and prominently render last recorded SKIP/FAIL/PARTIAL stage and "Test stopped – no confirmed activation" on CC OEM Services after the test returns to Start. Retain four-tab navigation, existing read-only test, OEM ON report upload, original belt gate and one-shot safety controls. No change to OEM request payload, read sequence or activation policy.
- **Automated-tested:** CI pending. **In-car verified:** Not yet. Ask for one parked retry only if necessary; existing 0.2.0 "Send OEM ON report" can report the exit stage without rerunning activation.
- **Next:** Examine recorded stage and errors; distinguish `belt-gate-*`, `oem-unavailable`, `no-fresh-oem-state`, `not-ready-off` and `request-error` before any further functional change.

## v0.2.0 — Guarded manual OEM SteeringWheelClimate ON trial (2026-11-27)
- **Implemented:** Extend existing four-tab CC OEM Services page with a deliberately double-confirmed one-shot `SteeringWheelClimate.requestHeating({requestor:[0,0,0,0,0],heating:true})` experiment. Manifest grants just this named method (no general write, no new UDS payload). Reuses verified Data Tool fresh front belt gate, requires available/coded fresh OEM `heatingState.heating=false` before the single request, never retries a potentially acted-on request and never issues OEM OFF. After request, capture fresh OEM body samples and optionally read BDC `22 D074`, collect operator KOMBI/physical warmth and explicitly instructed BMW hardware-button OFF feedback. Timeout or missing telemetry stays unverified; manual user control, not automatic shutdown, is the stop mechanism. Existing CC Controls timed BDC activation, CC Wheel OEM and source capture retained.
- **Reports:** New versioned private `cc-oem-wheel-on-0200.json` keeps last four records including SKIP/FAIL/PARTIAL; manual upload. `cc-oem-services-099.json` read-only upload remains accessible. All payloads sanitized and bounded; no VIN.
- **0.1.99 vehicle observation:** User reported diagnostic-mode engine and unlatched belt during read-only test. First OEM audit both ClimateMaster and SteeringWheelClimate unavailable, native BDC read failed with `sendTasuRequest` unavailable. Later OEM audit showed body `heatingState={functionalityCoded:true,availability:true,heating:false}`, BDC D074 OFF, ClimateMaster unavailable. This proves one read of the body status, **not** actuation permission, method reachability or OEM synchronization.
- **Automated-tested:** Data Tool test build 46050667277 SUCCESS (new OEM one-shot fixture, report persistence, complete regression, MGU preview) and Background Tool 46050667274 SUCCESS. **In-car verified:** requestHeating method and OEM post-button response NOT yet tested.
- **Parked next test:** Engine running, selector P, belt latched, wheel OEM OFF. CC OEM Services → Start OEM ON test → confirm within 12s. Observe KOMBI, feel for warmth, then press original BMW button as guided to switch heating OFF; record KOMBI and upload OEM ON report. **If new method does not respond or does not switch off physically, do not repeat or drive; use OEM controls and stop testing.** No new background CC actions.

## v0.1.99 — Focused CC diagnostics and read-only OEM service discovery (2026-11-27)
- **Implemented:** Reduce visible diagnostic tabs from nine to four: Info, CC Controls, CC Wheel OEM, CC OEM Services. Remove obsolete native Background Tool and Notification Tool footer buttons. Old diagnostic modules remain in source, not exposed by navigation; existing validated manual controls and wheel OEM sequence are preserved.
- **New read-only probe:** Isolated foreground-only `ClimateMaster.statusSteeringWheelHeating`, `ClimateMaster.statusAvailableSteeringWheelHeating`, and `SteeringWheelClimate.heatingState` candidate watch + bounded field refresh if provider supports it; one optional independent BDC `22 D0 74` read-only baseline. Store only whitelisted heating/coding/availability/LED/current values, errors, service presence and timestamps in new bounded four-attempt report, send manually. Manifest declares only read-only fields, with no `_methods` or SOME/IP setters, and the code sends no heat commands. Source candidates are derived from public `aurelmarius/bmw-apps/apps/aurelm_wheel_heat/heat.js`; compatible service availability is **not** known on this vehicle.
- **0.1.98 in-car evidence analyzed (prior release):** First attempt SKIP due to unavailable fresh Tool front-belt snapshot; next attempt FAIL because native `sendTasuRequest` service was unavailable; third completed read `D074` ON throughout, while operator recorded BMW button #1 as KOMBI activated and #2 as KOMBI deactivated. The sampled D074 fifth byte remained 00 (interpreted as LED OFF in public G21 decoding); exact semantics for this BDC remain a hypothesis. This result confirms a discrepancy between our timed diagnostic command and OEM button response; does **not** establish OEM synchronization.
- **Automated-tested:** Data Tool test build 46045289686 SUCCESS (including isolated OEM probe and report fixture, full regression, MGU preview) and Background Tool 46045289617 SUCCESS. **In-car verified:** New OEM SOME/IP probe not yet tested. No automatic CC steering action authorized.
- **Next parked test:** Open CC OEM Services, tap Run OEM source test once with OEM wheel OFF and car stationary, then Send OEM source report. A no-service/no-sample result is a valid negative observation and must not trigger unsafe writes. Existing CC Controls and CC Wheel OEM retained as regression references; do not repeat actuator tests unless explicitly needed.

## v0.1.98 — Manual OEM button response after app steering heat ON (2026-11-27)
- **Implemented:** Dedicated CC Wheel OEM diagnostic tab, deliberate double-confirm + unchanged fresh front-belt preflight. It sends exactly the previously vehicle-observed bounded one-shot `2E D0 74 3C` steering request, confirms readback using BDC `22 D0 74`, then guides user to press physical OEM button #1 and #2 with separate on-screen acknowledgments. Captures bounded timestamped raw BDC reads before/during/after both button presses, stores manually entered KOMBI response after each (activated/deactivated/none), logs failed/partial/skipped attempts, and explicitly distinguishes operator acknowledgment time from actual hardware event time. Stalls, missing acknowledgement, expiry ambiguity or read failure cannot be called full OEM synchronization. No new ECU payload, background activation, auto OFF request, or production CC change.
- **Reports:** New app-private bounded `cc-wheel-oem-098.json` retains last four attempts (including failure) and manual HTTPS report upload. Existing CC Controls, CC Sources P/R/D and guided OEM wheel baseline and their historical report files untouched.
- **Evidence prior to 0.1.98:** 0.1.97 in-car R report: `DataPowerTrain2.statusGearSelectionDrive=R` decoded R, no errors; prior P and D observed. 0.1.97 in-car CC Controls: BDC readback ON at 5/15/30/45s after existing 60s command, belt verified, user confirmed heat previously and KOMBI absent, with anomalous subsequent OEM button behavior; actual synchronized OEM state not yet established.
- **Automated-tested:** Data Tool test build 46041516203 SUCCESS (full regression, two-press OEM fixture, bounded four-attempt report, MGU preview) and Background Tool 46041516183 SUCCESS. **In-car verified:** This new two-press sequence not yet tested.
- **Parked protocol:** Engine running, P, belt latched, wheel initially OFF. CC Wheel OEM → Start OEM sequence → confirm. When prompted, physically press original BMW wheel button once, then tap `I pressed OEM button #1`, select exactly the KOMBI message observed. Repeat for #2 promptly, before 60s expiry. Send OEM sequence report. Do not drive or use another control. Operator input is not an ECU-observed click timestamp. If uncertain about KOMBI, let question time out as unknown rather than inventing message.

## v0.1.97 — Reverse selector observation (2026-11-27)
- **Implemented:** Extend isolated read-only VehicleInformation source test with manual `R` capture; preserve successful `P`/`D` capture paths and bounded per-version private report. Uses same `DataPowerTrain2.statusGearSelectionDrive` subscription and Redline-derived `R` enum decoding. Only capture current selector state while parked and stationary with brake held; no gear actuation, EGS actual-stage claim, background automation, Tool or production CC changes.
- **In-car verified (prior 0.1.96 only):** User's diagnostic report recorded raw `P` decoded `P`, raw `_1` decoded `D`, both from DataPowerTrain2; alternate statusGearboxDrive produced no sample. 0.1.96 direct guarded 60s UDS `2E D0 74 3C` steering test read ON at 5/15/30/45s, and user reported physical heating with no KOMBI message; operator later reported OEM switch interaction not equivalent to normal UI, requiring separate controlled follow-up. No basis to claim full OEM state synchronization.
- **Automated-tested:** Data Tool test build 46029017201 SUCCESS (full regression including P/R/D decode and report), Background Tool 46029017148 SUCCESS. **In-car verified:** R on 0.1.97 not yet tested.
- **Approved CC direction (not implemented):** Permit once-per-trip heat activation on P→D or P→R only when belts/RPM/temperature and other gates pass; ignore N, fail safe for missing/unknown. No automatic steering heater integration until OEM state issue is understood.
- **Parked test:** In CC Sources, select VehicleInfo gear R while holding brake with car completely stationary and safe; inspect capture, then Send source report. Repeat P and D only if diagnosing a failure. No driving required. A separate OEM-after-UDS wheel state-transition test remains future work: it must avoid confusing the existing 60s timeout with an OEM button transition.

## v0.1.96 — VehicleInformation gearbox P/D observation + steering KOMBI feedback (2026-11-27)
- **Implemented:** Isolated manual read-only selector probes in CC Sources now subscribe once to `de.bmw.infrastructure.VehicleInformation` instance 1 and collect both `statusGearboxDrive.statusActualStageDrive` and `DataPowerTrain2.statusGearSelectionDrive`, following cauliflowermossgrape/idrive7-apps Redline `kit/runtime/car.js` and manifest. Capture raw event values, decoded P/R/N/D, expected-label match/conflict, unavailable/no-sample/errors, timestamps, bounded 12s session, unsubscribed at completion. No driving gear controls, no guessed speed/rpm fallback, no Tool catalog/transport edit. Matching candidate is *not* independently verified actual EGS state; `liveStageVerified=false` remains.
- **Steering:** Existing protected CC Controls 60s UDS actuation test preserved with seatbelt preflight and double-confirmation. Add explicit human KOMBI notification feedback (`message-seen` / `no-message`) alongside existing touch feedback, persisted in bounded actuator report; no change to steering UDS write or new vehicle actuation. Existing OEM guided ON/OFF read-only test preserved for reference. Source-report 0.1.96 is in a new private file; historical 0.1.95 and CC wheel reports remain intact.
- **Vehicle evidence:** OEM-guided 0.1.95 report on 2026-11-27 captured BDC OFF → ON at ~13s, and ON → OFF at ~76s without communication errors. User observed KOMBI message during OEM button control; physical warmth not conclusively confirmed. Earlier diagnostic UDS ON readback did not prove physical heating. 0.1.94 BasicDataSet=no-sample and MDrive=DUNKELSCHALTUNG in P/D.
- **Automated-tested:** Data Tool test build 46023431525 SUCCESS (full regression suite, manifest, Redline selector fixtures, report, guided wheel compatibility); Background Tool 46023431645 SUCCESS. **In-car verified:** New VehicleInformation 0.1.96 subscriptions and KOMBI feedback not yet verified.
- **Parked tests:** (1) With engine running and car securely stationary, run VehicleInfo gear P, then optionally D with brake held, never drive or force gear. (2) In CC Controls, engine running, steering OFF, front belt latched, double-confirm 60s wheel test; record both felt-warmth and KOMBI notification outcomes, then send detailed report. Guided OEM control baseline in CC Sources does not need repetition. Keep current Data Tool and Provider; no production CC change.

## v0.1.95 — Guided OEM steering-wheel ON/OFF test (2026-11-27)
- **Implemented:** Manual read-only guided BDC D074 steering wheel test replaces the fixed-timestamp OEM trace entry in CC Sources. Requires initial confirmed OFF and hardware fitted; displays live prompts to press the original BMW ON button, waits for actual BDC ON (maximum 60 s), maintains a 60-second physical warmth observation window, then explicitly prompts OFF and waits for confirmed BDC OFF (maximum 60 s). A missing or early transition is recorded as failure, not success. No ECU write, no simulated switch press, no automatic or background actuation.
- **Preserved:** Optional read-only gear P/D source observation and all existing diagnostic pages; no changes to Data Tool, native provider, production CC, or other apps. Prior 0.1.94 reports remain intact in their historical file; 0.1.95 uses a new bounded app-private report and explicit manual upload.
- **In-car evidence from 0.1.94:** 10/10 BDC D074 read samples succeeded. OEM button changed OFF to ON between 5-10 s; no OFF occurred by 45 s because user did not turn it off, so OFF transition and warmth remain unverified. Gear BasicDataSet=no-sample and MDrive=DUNKELSCHALTUNG in both P and D; no verified EGS stage.
- **Automated-tested:** Pending CI. **In-car verified:** New guided 0.1.95 behavior not tested yet.
- **Parked test:** Wheel initially OFF, tap Guided OEM wheel ON/OFF once, obey the on-screen ON prompt, feel the wheel while it stays on, and obey the OFF prompt; do not time the sequence manually. Observe confirmed ON/OFF or a clear timeout and send source report. Gear tests need not be repeated.

## v0.1.94 — OEM wheel 45-second timeline + new MGU gear signal candidates (2026-11-27)
- **Implemented:** Isolated manual `CC Sources` tab. Read-only BDC DID D074 snapshots at 0/5/10/15/20/25/30/35/40/45 seconds, intended physical OEM heat ON near 5s and OFF near 35s; full bounded raw response bytes and changed offsets, with one bounded reinitialization only after first read failure. No ECU write or background behavior. Adds two optional app-local MGU subscriptions from the open-source `cruzen991/Cluster` reference: `de.bmw.infrastructure.analytics.BasicDataSet.basicDataSet.operationGearSelectorSwitch` and `de.bmw.infotainment.misc.MDrive.dataDisplayGearbox.displayProgramGearbox`. Reports received raw enums, whether signal arrived, errors and timestamps. All previous diagnostics and Tool/Provider unchanged.
- **Evidence:** In 0.1.93 test OEM button physically warmed wheel and D074 ON with response `62 D0 74 01 00 3F 02 01`; OFF initial read failed with `Service unavailable for call sendTasuRequest()`. Gear P/D returned source-not-verified, instance=false, ACL=false. Earlier 0.1.92 diagnostic BDC D074 ON for 45 sec but user felt no heat. Follow-up trace addresses initial unavailable service and compares state transitions.
- **Gear semantics:** The `BasicDataSet` lever enum `3` means D gate in reference app but is not independent EGS actual-stage confirmation; `0` means NA, not P. `MDrive` program enum `0` represents D-mode program, not verified engagement. Do not equate any of these with confirmed gear P/D; `liveStageVerified=false` remains. If the optional MGU services are absent, log unavailable. No VehicleInformation re-probe, Data Tool transport changes or gear control.
- **Automated-tested:** Data Tool test build run 46013306477 SUCCESS (Node 12, full regression suite, source-probe unit tests, MGU preview) and Background Tool run 46013306519 SUCCESS. **In-car verified:** No for new 0.1.94 functions; prior 0.1.93 OEM wheel warmth verified by user, diagnostic UDS heat still failed physically.
- **Parked test:** In CC Sources first run Wheel OEM 45s trace with wheel OFF; at about 5 seconds switch ON via BMW button; at 35s switch OFF. Then observe gear P while safely parked; optionally observe gear D with foot brake applied, staying stationary; do not drive or force D. Send source report. A missing candidate is a legitimate result and requires no repeated full test.

## v0.1.93 — OEM wheel and P/D read-only comparison (2026-11-27)
- **Implemented:** Additional isolated `CC Compare` manual tab with independent operator-triggered read-only captures: BDC 22 D074 before/after physically pressing the factory steering-wheel heat button; two distinct P/D-labelled gear samples from the existing Tool OAP native snapshot plus existing catalog/ACL audit, never transmitting a gear command or guessing mappings. Stores all raw wheel response bytes (max 32), timestamped response, verified sample freshness and exact byte offsets that changed; independent bounded app-private `cc-compare-093.json`, with explicit manual upload using existing HTTPS reporting. Original 0.1.92 wheel test and all established functionality preserved.
- **Evidence:** Previous in-car 0.1.92 diagnostic BDC D074 reported ON at 5/15/30/45 sec, but user independently confirmed wheel remained cold (ECU feedback PASS vs physical heat FAIL); uploaded report had `physicalFeedback=not-checked`, so physical failure is user-reported, not auto-captured. No physical heat inferred from BDC state.
- **Gear:** Existing catalog lists `statusGearboxDrive` and `DataPowerTrain2` but live instance/ACL still unverified. Captures clearly record `source-not-verified` when no valid fresh P/D sample. No new VehicleInformation signal manifest or experimental ECU probe; do not claim selector verification without a genuinely valid provider sample. D remains optional, not required for CC activation.
- **Automated-tested:** Data Tool test build run 46003667319 SUCCESS (Node 12, full regression suite, compare-unit tests and MGU preview) and Background Tool run 46003667346 SUCCESS. **In-car verified:** Only prior 0.1.92 in-car report (BDC ON but no heat); new 0.1.93 compare tests not tested in vehicle.
- **One parked session:** Capture `Wheel OFF` before using the OEM button; physically press OEM steering heat and confirm warmth, then capture `OEM Wheel ON` while it is actually warming. For gear, capture P; optionally (only if securely parked with brakes applied and allowed by car) capture D without driving or forcing selector. Send one comparison report. Do not mix with old 60s diagnostic actuation.

## v0.1.92 — focused wheel heat duration + human confirmation; passive D evidence (2026-11-27)
- **Implemented:** CC Controls displays ONLY a manual steering-wheel heating action; previously verified three seat activations are removed from the UI and from the new wheel-only report, but 0.1.91 history is left intact in its separate file. Strict two-tap foreground confirmation and existing fresh Tool front-belt preflight remain required.
- **Actuation:** Request BDC `2E D0 74 3C` (60 seconds), record exact positive/negative UDS responses and read BDC `22 D0 74` at 5, 15, 30 and 45 seconds. Fail on loss/invalid status. Duration 60 is an experimental car test, not yet vehicle-confirmed. BDC feedback PASS proves reported state, NOT felt heat or an iDrive notification.
- **Human verification:** Dedicated 'Wheel is warm'/'No heating felt' actions after the test persist a separate physicalFeedback verdict in a bounded `cc-wheel-test-092.json` report. The explicit upload sends only the wheel trace and touch verdict; no automatic sending or vehicle-identifying fields.
- **Gear/D:** Reuse the pre-existing Tool `ccNativeSnapshot` taken for the belt gate and record an optional validated `P/R/N/D` value when provided. An absent/invalid value is explicit `gearSourceVerified=false`. RPM alone does not establish D; no inferred transmission stage, manifest/ACL changes, new ECU probes or D actuation gate. Existing VehicleInformation candidate remains `instance-or-schema-unverified`; continue source research independently. D is an optional future condition, not a blocker for CC start + belt gating.
- **Automated-tested:** Data Tool test build run 45994759613 SUCCESS (Node 12, full regression suite, 60s wheel checkpoints/physical feedback, MGU preview) and Background Tool run 45994759453 SUCCESS. **In-car verified:** No for new 60s/5-45s/tactile flow. Prior 0.1.91 four native actuator read-backs succeeded in-car; wheel physical heat was not confirmed, motivating this test. Production CC and Tool 0.1.73 unchanged.
- **Test:** Keep Tool 0.1.73 and Provider 0.1.1. Install only Diagnostics 0.1.92. Stay parked in P with engine running; wheel heater OFF; driver belt latched. On CC Controls double tap wheel, touch the wheel during the 60-second command, after the test press 'Wheel is warm' or 'No heating felt', then Send detailed report and share upload ID. No gear toggling or extra RPM test needed.

## v0.1.91 — manual four-actuator OAP validation with detailed export (2026-11-27)
- **Implemented:** Diagnostics-only manual `CC Controls` tab with separate double-confirm actions: front-left seat heating, front-right seat ventilation, rear-left seat heating, steering-wheel heating. Each command is from existing CC DEV UDS sequences through the Diagnostics OAP native TASU method, NOT through Data Tool actuation. Data Tool itself remains read-only because the legacy ctl.sock is mode 0666 and native application identity is not verified; publishing a new unauthenticated Tool write API would be unsafe. `toolActuationVerified=false` is part of every report.
- **Safety:** No automatic execution, no background requests. Every action requires explicit repeated tap within 12s and fresh Tool seatbelt gate (front via OAP snapshot, rear via existing UDS 4053), plus user's manual parked/engine-running confirmation. Check target seat/wheel baseline (must be off; wheel hardware fitted), send exactly one OEM press sequence / 30-second wheel command; validate positive response and after-state; always attempt IHKA release + stop after an attempted press, even on failure. No attempts when safety evidence absent. Do not claim verified P/R/N/D, which remains unsupported.
- **Audit:** Persist sanitized bounded operation trace in app-private `cc-actuator-test-091.json`: per-test timestamps, pre/post level, exact allowlisted UDS request, reply/NRC, errors, cleanup and tool-control limitation. App shows Details pages and has an explicit manual Send detailed report action using existing HTTPS diagnostic uploader; never auto-send or include identifying vehicle metadata.
- **Automated-tested:** Data Tool test build run 45985439668 SUCCESS (Node 12, all regressions, actuator/fresh-belt tests, MGU preview) and Background Tool run 45985439674 SUCCESS. **In-car verified:** No for these four actions. This validates native actuator feasibility only, NOT Tool's ability to actuate or automatic Climate Comfort control.
- **One parked session:** Install only Diagnostics 0.1.91 with existing Tool 0.1.73 and Native Provider 0.1.1. Switch off all 4 functions manually, start engine, remain stationary in P, latch corresponding seat belts (including rear left for rear heat). Open CC Controls; double-tap each action individually, physically confirm response, and send detailed report once at the end. Share upload ID; do not assume car-side actuation until observed.

## v0.1.90 — combined gear feasibility + engine RPM diagnostic (2026-11-27)
- **Implemented:** Extend existing `Retest belts + gear` action to `Retest belts + gear + RPM`. Existing belt and catalog/ACL gear checks remain unchanged. New targeted on-demand CDS test uses Data Tool `cdsDemand`/ `cdsSnapshot`/ `cdsRelease` for pre-existing allowlisted `diagnostics-secondary` RPM signal (`statusEngineSpeed2.actualValueRPMEngineCrankshaft`), at most 12 samples roughly 0.5s apart, lease renewals every 1.5s, bounded read, and guaranteed release on failure. Reports raw, scaled rpm (0.25), valid/fresh age, worker status/error, zero versus absent, and sample range. No permanent subscription, service changes, production CC modifications or unsupported gear manifest/DID.
- **Vehicle evidence:** Data Tool 0.1.73 + Native Provider 0.1.1 + Diagnostics 0.1.89: both front belt transitions passed in the vehicle, independent fresh sample confirmed; rear belts good. Gear remained `instance-or-schema-unverified`, exact fields present but instance1/ACL/live unavailable. RPM CDS prior diagnostic result was not proven in vehicle.
- **Automated-tested:** Data Tool test build run 45982550250 SUCCESS (Node 12, full regressions, RPM failure/lease tests, MGU preview) and Background Tool run 45982550260 SUCCESS. **In-car verified:** No for new RPM test. P/R/N/D remains unverified; passive catalog or EGS status is not a gear reading.
- **One parked session:** Upgrade only Diagnostics 0.1.90, keep Tool 0.1.73 and Provider 0.1.1. Start engine at idle while vehicle stationary in P, run CC Test, then `Retest belts + gear + RPM` once. Share summary and first few Details pages (RPM/gear); no gear shifting or driving required. RPM=0 is not a successful running-engine sample.

## v0.1.89 — combined front-belt dynamic retest + passive gear feasibility (2026-11-27)
- **Implemented:** One `Retest belts + gear` action after initial CC Test. Reuses one Tool-owned `ccNativeSnapshot` request for belt transitions and the gear placeholder; uses existing explicit `ccGearSourceAudit` and `ccAccessAudit` operations for structural candidate/instance/ACL evidence, error reasons, and no-sample outcome. Shows combined results in existing Details. Existing original CC Test, Data Tool 0.1.73, Native Provider 0.1.1 and functioning UDS/CDS are unchanged.
- **Safety:** No unsupported VehicleInformation manifest, no guessed DID, no new SOME/IP proxy, no additional ECU request for gear, no gear control, no background polling. Catalog inclusion is NOT a live signal. P/R/N/D remains unavailable until a verified signal is captured.
- **Automated-tested:** Data Tool CI run 45978313453 SUCCESS (Node 12, full regressions, combined gear test, MGU preview) and Background Tool run 45978313447 SUCCESS. **In-car verified:** Single front belt Tool sample verified in Diagnostics 0.1.87; new combined test not yet verified.
- **One parked session:** Install only Diagnostics 0.1.89, run CC Test with front left latched/right unlatched, switch front belt states, wait over 3 s, tap Retest belts + gear, and photograph main CC page plus Details showing both gear audit and belt transition; no gear shifting required.

## v0.1.88 — One-shot front-belt transition retest (2026-11-27)
- **Vehicle evidence:** With Tool 0.1.73, Native Provider 0.1.1 and Diagnostics 0.1.87, a parked CC Test showed Tool OAP source `sample`, front-left `latched`, front-right `unlatched`, rear belts `unlatched/unlatched`. This is a verified-in-car single sample of the provider-to-Tool path, not proof of dynamic transitions or CC automation. P/R/N/D remained invalid; VehicleInformation candidate existed structurally but no verified instance.
- **Implemented:** Add optional `Retest belts` control on CC Test. After initial CC Test, user changes belt state and triggers one existing `ccNativeSnapshot` request only. Show original-vs-new front belt states, sampledAt freshness, changes/unchanged/invalid, with explicit cached/same-sample and failure handling. Does NOT repeat the old TASU/gear/UDS suite or modify Tool/Provider/CC. Update Diagnostics version and Provider minimum requirement to 0.1.1.
- **Automated-tested:** Data Tool CI run 45974054650 SUCCESS (Node 12, full regressions, belt transition tests, MGU preview) and Background Tool run 45974054649 SUCCESS. **In-car verified:** No for new retest function. Dynamic belt toggles must be confirmed while parked.
- **Gearbox:** Still unverified. No supported readable gear instance or sanctioned alternative source was confirmed. No new manifest, guessed ECU/DID, proxy, driving tests, or CC activation.
- **Test plan:** Install only Diagnostics 0.1.88; leave Tool 0.1.73 + Provider 0.1.1 untouched. Run CC Test once while parked, then after physically changing both front seat-belt states and waiting 3+ seconds tap Retest belts, inspect summary/Details. If `same-sample`, wait before retrying. No gear shift requested.

## v0.1.87 — OAP package security compatibility and passive gearbox candidate inventory (2026-11-26)
- **Implemented:** Requires Data Tool 0.1.73 and retains Provider 0.1.1 as companion. CC Test displays structured alternative gear field/instance candidates from locally installed catalog without activating an unsupported VehicleInformation manifest. The same test exposes distinct OAP registry/package security stages and existing front/rear values. No additional vehicle reads, CC automation, or uncontrolled gear source.
- **Vehicle evidence:** Diagnostics 0.1.86 last installed parked test returned `UNTRUSTED_PACKAGE`, both Tool OAP belts invalid, rear belts valid, gear `catalog-unverified`; direct native contact ended with NRC 13. The earlier native belt success does not prove that the new OAP provider works.
- **Automated-tested:** Data Tool CI run 45893036484 SUCCESS (Node 12, full regressions, gear candidate test, security tests, MGU preview); Background Tool run 45893036481 SUCCESS. **In-car verified:** No for 0.1.87; new code must be tested in the vehicle.
- **Test:** Upgrade only Tool and Diagnostics (Provider stays 0.1.1). Reboot HU once, one parked CC Test, provide all Details pages. Do not select P/R/N/D while driving or use gear as a CC control until verified.

## v0.1.86 — Tool-owned requests through OAP native source (2026-11-26)
- **Implemented:** One CC Test now requests Data Tool `ccNativeSnapshot`: authenticated-by-installed-package-path, pull-only OAP provider reports fresh validated front belt states and a fail-closed gear placeholder; the unverified VehicleInformation interface is not requested by the installer. Results displayed beside legacy app-native and Tool-native measurements; no ECU requests are made on Details paging. Diagnostics requires Tool 0.1.72 and Native Provider 0.1.0.
- **Automated-tested:** Data Tool build run 45851935363 SUCCESS (full regression, Node 12, OAP bridge tests and MGU previews); DPF/OSA/BG CI all PASS. **In-car verified:** No for this revision.
- **Safety:** Additional native provider cannot create a usable state until it is installed/autostarted and root-controlled registry, package metadata and dedicated private socket checks pass. No automatic CC activation or background polling is enabled. Earlier app-native front state reads remain the car-verified fallback.
- **Test plan:** Install Tool, Native Provider and Diagnostics in one batch; one HU restart if needed, one parked CC Test. Check `Tool OAP` fields and existing front/rear and gear results together.

## v0.1.85 — one-click exact gear catalog guard and preserved TASU references (2026-11-26)
- **Implemented:** CC Test requests passive Tool-side structural VehicleInformation interface/field/instance inventory; on missing/unverified layout it skips the known-failing gear generator and reports the exact evidence. BMW firmware wrapper syntax is labelled *parse-only*, not an execution pass. Existing front/rear belt, Tool TASU provider/ACL evidence, and data acquisition remain unchanged. Tool 0.1.71 required. No new app SOME/IP permissions.
- **Automated-tested:** Final Data Tool test build run 45848041399 SUCCESS (Node 12, full regressions, exact catalog fixtures and MGU preview); Background Tool run 45848041288 SUCCESS. **In-car verified:** No for 0.1.85; earlier 0.1.84 installed and showed four front/rear states (front Native L unlatched / R latched; rear L/R unlatched), Tool TASU provider unavailable and gear generator failed.
- **Limit:** This intentionally does NOT fix Tool TASU registration or decode a new gear source. It prevents another unsupported claim and makes the blocker actionable without extra ECU reads. New Tool front-belt API remains gated.
- **Next:** One combined parked CC Test only after CI; preserve all cached Details. Do not start background control based on unverified data.

## v0.1.84 — fix unsupported mandatory VehicleInformation SOME/IP installation manifest (2026-11-26)
- **Vehicle evidence:** Installation of Data Diagnostics 0.1.83 failed with unit-level message "some IPM manifest ask for what the unit does not have." New mandatory VehicleInformation requests introduced in 0.1.82 are the isolated suspect; exact unsupported field is not identified from the installer error.
- **Implemented:** Remove the new mandatory VehicleInformation attribute requests and disable its app-native gearbox watch; label result unsupported-manifest-removed rather than implying P/R/N/D works. Restore the already car-installed InternalTasu-only manifest from 0.1.81 while retaining all combined Tool-side 0.1.70 diagnostics, passive staged ACL audit and front/rear belt reference. Data Tool unchanged.
- **Automated-tested:** CI pending. **In-car verified:** Installation not yet retested.
- **Next:** Install Data Diagnostics 0.1.84 with Data Tool 0.1.70; one parked CC Test. Gear remains Tool generator failure until a catalog-verified field/instance and supported manifest can be shown.

## v0.1.83 — consolidated CC selector, TASU and Tool ACL readiness (2026-11-26)
- **Implemented:** One parked CC Test gathers previous native front/rear contacts and app-native VehicleInformation gearbox reference plus passive Tool-owned TASU/gear staged config + ACL inspection and native provider availability before/after existing service calls. Cached detail pages show each failure without new ECU calls. Added cleanup for late native gear subscription. Requires Data Tool >=0.1.70.
- **Automated-tested:** Data Tool test build run 45843189130 SUCCESS (including passive audit, delayed subscription, legacy runtime and MGU preview); Background Tool run 45843188914 SUCCESS. **In-car verified:** No for this revision.
- **Last car evidence (0.1.81):** both native front and both rear states obtained; Tool native TASU sendTasuRequest reported Service unavailable on both contacts; BMW bundle syntax-valid, gear generator failed. Actual reason for service registration not confirmed; Tool ACL remains staging-only. Selector P/D not vehicle-confirmed.
- **Next:** Install Tool 0.1.70 + Diagnostics 0.1.83 together; one parked CC Test with P and motor off, then capture cached Details pages. No ACL registration, new UDS commands, background demand, or production CC changes.

## v0.1.82 — isolated native gearbox selector reference (2026-11-26)
- **Implemented:** App-owned, manifest-declared read-only `VehicleInformation` one-shot watch on explicit CC Test only. Decode `statusGearboxDrive` and `DataPowerTrain2` to P/R/N/D, reject invalid/conflicting values and release subscription. Show Tool and Native gear separately, with cached feed details. Existing front/rear belt, Data Tool request/order, and stable CC remain unchanged. No public gear API and no climate action enabled.
- **Automated-tested:** Pending GitHub CI; positive P, contradictory fields, unavailable provider, timeout and cleanup simulated. Real MGU preview required.
- **Vehicle evidence:** Diagnostics 0.1.81 native TASU front positions and Data Tool rear positions matched user's observed four belts; Tool-native TASU `sendTasuRequest()` reports `Service unavailable` for both front contacts. The service uses a staged but not registered ACL; whether registration alone resolves access is unproven. Gear `ccGearGenerate` failed in firmware module evaluation (`undefined:3130`); catalog and BMW bundle syntax were present. Neither Data Tool service access nor selector P/D is car-verified.
- **Next parked test:** One CC Test with engine off and P selected; compare app-native gear with current Tool error and four seat belts. Do not start a separate tool service ACL registration or change ECU commands without verified supported mechanism.

## v0.1.81 — combined CC diagnostics (2026-11-26)
- **Implemented:** One CC Test invocation retains staged TASU/gear generator results and shows two read-only cached detail pages (bundle modules, catalog signal presence, gear config, native service per-contact errors, and rear reference). Details navigation never triggers another probe. Data Tool >=0.1.69 required.
- **Automated-tested:** Pending CI; explicit result formatting and existing CC test orchestration regressions.
- **In-car evidence from v0.1.80:** Native front left unlatched / right latched; rear left unlatched / right latched, user physically confirmed the observed positions. Service-native TASU returned native-read-unavailable; gear config failed; bundle syntax-valid. Front belt transitions, Tool-native service access, and selector P/D remain unverified.
- **Next test:** One parked CC Test, tap Details twice for complete output, and capture all three cached views. Do not retry until evidence reviewed.

# Data Tool Diagnostics progress

## v0.1.80 — Data Tool service-native TASU access test
- **Implemented:** CC Test invokes explicit Tool-owned `ccTasuGenerate` (staging-only) then `ccTasuProbe` to check the native worker under Data Tool system service. Displays `Service TASU` stage or front left/right values. Keeps separate app-native proven comparison, old Tool hmictl reads, rear belts and failed gear generator unchanged.
- **Automated-tested:** Data Tool test build run 45826740239 SUCCESS, including MGU preview. **In-car:** App-native 0.1.79 previously saw FL unlatched / FR latched; new Tool service permission and generated config remain unverified. Tool 0.1.68 is required.
- **Safety:** No automatic UDS reads, no ACL activation and no production CC consumers. Config or permission refusal is a valid bounded result.

## v0.1.79 — native TASU versus Tool front-belt comparison (2026-11-26)
- **Implemented:** One-shot, explicit-only `CC Test` native InternalTasu `sendTasuRequest` reading of ACSM contacts 1/2, alongside the unchanged Data Tool `hmictl` readings. Native signal and broadcast registered as optional app signals using the original CC API; test runs only on user click. Fixed `31 01 A0 D2 01/02` payload, `maxRetries:0`, bounded per-contact time and proxy shutdown. Rows report `Tool` / `Native` individually and retain the verified rear belt read.
- **Automated-tested:** Data Tool / Diagnostics CI 45821486900 PASS, including simulated latched, unlatched, NRC 13, invalid frame, unavailable native proxy, other existing regressions and MGU preview build. Vehicle behavior still unverified.
- **In-car verified:** Pending. Original production CC includes native read logic but does NOT by itself prove it succeeded in this vehicle. Compare each front row result with Tool 0.1.67. Do not migrate Data Tool to native transport without explicit evidence.
- **Scope:** No Data Tool or BG Tool code changes, no persistent subscription, no climate actuator functions, no changed gear generator.

## v0.1.78 — CC BMW gearbox source preflight
- **Implemented:** CC Test calls tool `ccGearSourceAudit` for explicit local bundle/catalog classification before the existing one-shot selector and belt test. UI displays bundle status / syntax line; no new ECU requests. Requires Data Tool >= 0.1.67.
- **Automated-tested:** Pending CI. **In-car verified:** No. Rear seat contacts already confirmed working, front contacts NRC 13 and selector gear-config unverified.
- **Next:** One parked CC Test; use reported BMW bundle class to decide whether generator can be repaired without changing shared CDS/DPF acquisition.

## 2026-11-26 — observed v0.1.65 A0D2 helper rejection
- **In-car observed:** Data Tool 0.1.65 returned `ACSM command rejected` for both front contacts, while both rear belt states remained accurate. Gear-config still failed, no selector confirmed.
- **Fix in Tool 0.1.66:** restored v0.1.64 helper framing (the extra final zero) after v0.1.65 failed before a UDS response; front sensor remains unresolved at NRC 0x13. App 0.1.77 is unchanged.

## 2026-11-26 — confirmed rear belt transitions / pending front NRC verification
- **In-car verified:** Data Tool Diagnostics 0.1.77 showed rear left `unlatched`, rear right `latched`; user confirmed real physical belt test. ACSM rear 4053 decodes both rear positions, with a confirmed state change on one seat. Front left and front right remain Unknown; each reports `ACSM NRC` and the gearbox shows `gear-config`.
- **Next:** Data Tool 0.1.64 surfaces NRC code; run one explicit parked test to distinguish ECU refusal cause. Gear generator is a separate isolated problem; no changes to working rear belt reader or main CDS flows.

## v0.1.77 — CC parked first in-car test follow-up (2026-11-26)
- **In-car observed using 0.1.76 / Data Tool 0.1.63:** engine off, selector expected P: `gear-config` FAIL (configuration/generator stage, no selector value); front left and front right Unknown, at least front left returned `ACSM NRC` (routine rejected); rear left and rear right `unlatched` decoded from ACSM 4053. Rear unlatched read is vehicle-observed; latched transition, gear P/D and front contacts remain unverified.
- **Implemented:** show actual gear generation error as a separate diagnostic line, and report both front contact error messages. No new ECU requests, generator behavior, transport, backend versions or controls changed. Tool 0.1.63 remains installed requirement.
- **Automated-tested:** Pending CI; diagnostic UI and existing regression reference.
- **Next parked test:** engine still off, request one CC diagnostic snapshot and capture Gear/Front-left/Front-right details. Do not speculate on root cause until explicit error available.

## v0.1.76 — CC parked diagnostic (2026-11-26)
- **Implemented:** Fifth CC Test tab with manually triggered four belt-contact reads and selector P/R/N/D probe through Data Tool only. No actuation or automatic monitoring. Requires Data Tool 0.1.63.
- **Automated-tested:** CI pending; orchestration regression included.
- **In-car verified:** No. Test with ignition on, parked, engine off; P does not prove D. Existing tabs unchanged.

## v0.1.75 — EGS validation
- 0.1.74 in-car 5/5 CDS, motor-only 3/3, configuration, DPF reference and release PASS in diagnostic mode with engine off. Engine-running validation remains pending.
- Add EGS named demand and sixth sample to mixed test, verify all three sessions release. CI and vehicle validation pending.


## v0.1.74 — motor CDS diagnosis
- v0.1.73 car test: 2/5 signals PASS (speed/outside), 3/5 FAIL (oil/coolant/rpm), DPF and release PASS. Add original CDS staging check, isolated motor-only test and visible errors before mixed test; BC controls unchanged. CI and retest pending.


## v0.1.73 — OSA signal validation
- Reconciled PR #98 (CI PASS) with autonomous BC notification test from PR #99. Five CDS signals and DPF reference test; vehicle validation pending.


## v0.1.72 — autonomous notification test
- v0.1.71 confirmed NT 0.2.1 in car after reinstall, 2/2 accepted/submitted, no errors, self-test PASS, 6/6 dependencies, both messages and blinking confirmed. BC restoration not separately verified.
- BT 0.1.1 status adds actual version, arming delay, service countdown and notification acceptance/error. Existing manual NT test remains intact. CI and autonomous vehicle test pending.


## v0.1.71 — Notification Tool runtime diagnosis
- In-car v0.1.70: input now responds; FAIL with Running and zero counters. Root cause not confirmed. Preserve test error detail, show actual service version, rejection count, local renderer check and dependency count. Missing legacy fields display unknown rather than zero. Stop after first rejected request. No acquisition or BT changes. CI and parked retest pending.


## v0.1.70 — notification test input fix
- In-car 0.1.69: user reported the notification test button could not be pressed. Source inspection confirmed missing tap dispatch for its visible rectangle. Bind the existing test function to the matching region; no service changes. CI and in-car retest pending.
- Approved UI cleanup: four tabs (Info, Data Tool, Background Tool, Notification Tool); obsolete snapshot, report, TASU and cache test controls removed from UI, standalone test modules retained. Native BT/NT actions plus matching canvas touch targets. BT countdown is locally estimated after successful start; unknown if app restarted mid-test. NT status shows queue and counters, not actual display acknowledgement. No tool runtime changes.


## v0.1.69 — standalone Notification Tool test
- Manual Test notification control on Diagnostics page sends two queued six-second messages (white static prefix, red slow and green fast blinking states). Queued is acceptance only, not display acknowledgement. Optional Notification Tool 0.2.0; existing BT and Data Tool operations unchanged. CI and parked vehicle test pending.


## v0.1.68 — Background Tool monitoring
- Passive status poll on existing Diagnostics page, separate socket, displays service availability, registered rule count and evaluation ticks. Optional tool, no new required dependency. Existing Data Tool diagnostic operations unchanged. CI and vehicle validation pending.

## 2026-11-25 — DEV release candidate DPF 0.1.81 / Tool 0.1.56
- PR #89 merged ae90e029, both CI PASS. DPF 0.1.80 initially no data in either mode and competing app also no data; diagnostic mode restored communication. B57 managed Overview and Detail populated, temperature updated with engine running to 80 C. User switched screens; intermittent NOT NEEDED/UNKNOWN confirmed. Root cause of initial vehicle-wide unavailability unconfirmed.
- Approved public API sample validity 3x acquisition interval (15/180 s); keep acquisition scheduler unchanged. DPF managed-only, remove source switch, comparison action and Diagnostics tab; retain cluster test and existing UI/calibration. DEV release candidate only, production repository untouched. CI and new vehicle validation pending; actual regeneration, wake/reconnect and B47 remain unverified.

## 2026-11-25 — DPF DEV 0.1.80 managed API migration
- Tool 0.1.55 / Diagnostics 0.1.67, PR #88 merged ef9af123, CI 45649080867 PASS. Two B57 120 s endurance tests PASS, 23 samples per field, REQUEST max 5.46 s / MODE 5.45 s; release PASS. Stale observations 12/14 then 15/15. User confirms other apps, competing apps, native settings and media functional during testing.
- DPF DEV uses public named demand/snapshot API by default; existing experimental setting retained as explicit native reference switch (previous saved false may require manual enable). All foreground profile fields, background REQUEST/MODE when cluster notifications enabled. No automatic native fallback in managed mode. Existing calibration and timestamps retained, reconnect bounded, no production DPF or Tool runtime changes. CI and vehicle pending.

## 2026-11-25 — Tool 0.1.55 / Diagnostics 0.1.67 scheduler timing
- PR #87 merged 227e19a4, CI 45638707936 PASS. B57 120 s endurance FAIL: REQUEST 20 samples, max 7.37 s, stale observations 40; MODE 20 samples, max 6.66 s, stale observations 43. Release PASS. Acquisition continued but timing target missed.
- API previously consumed the 1 s rate slot even on idle scheduler ticks. Apply the same global 1 s minimum to actual scheduler read starts only; eligibility remains checked every 250 ms. Existing per-field freshness, transport, serialization, leases and endurance test thresholds unchanged. Added simulated two-field timing and global-spacing regression. CI and in-car validation pending.

## 2026-11-25 — Diagnostics 0.1.66 background endurance
- PR #86 merged 9177c258, CI 45571197190 PASS. B57 v0.1.54/0.1.65 5/5 PASS in diagnostic mode and again after requested exit from diagnostic mode (mode not independently measured). Earlier engine-running 5/5 PASS. User prioritizes running engine / driving, not engine-off acquisition.
- New bounded 120 s Diagnostics client test for REQUEST/MODE using public API, 500 ms passive snapshots, 5 s lease renewal, unique sample count, max interval and stale count, explicit release. Provisional tolerance 1.5 s; no new tabs, Tool unchanged. User leaves Diagnostics and uses other apps while parked. Tests whether process continues when hidden; no claim of sleep or independent app-free acquisition. CI/car pending.

## 2026-11-25 — Diagnostics 0.1.65 first sample timing
- PR #85 merged ba4efe1d, CI 45499098416 PASS. Vehicle B57 Tool 0.1.54 / Diagnostics 0.1.64: awake engine off connection/limits PASS, FIRST_SAMPLE failure after fixed 2.5 s; subsequent checks not executed. Engine running 5/5 PASS. Cause of awake failure unknown.
- Diagnostics-only: bounded 20 s observation of passive snapshots at 500 ms, renew leases every 5 s, measure first shared valid sample latency, distinguish skipped checks, independently verify release on failure. No transport or Tool changes. CI and vehicle validation pending.

## Diagnostics v0.1.64 — API background test
- Separate API test button on existing Cache Test page; two live sessions, invalid interval rejection, shared timestamp/raw sample, wait without snapshot, repeated sample and release. Tool 0.1.54 required. Tests scheduler timer with Diagnostics process running, not MGU sleep or app suspension. CI and vehicle pending.

## Runtime API v0.1.54
- PR #84 merged 254b6ad3; both CI PASS. Experimental API protocol on existing ctl.sock; lazy DDE detection, shared timer, bounded sessions and JS client. CI and MGU background validation pending. Diagnostics version unchanged; no new UI test yet.

## Open API foundation — 2026-11-24
- Mixed B57 freshness in-car screenshot 12/12 PASS (5.36/5.55 s fast, 60.40–61.20 s slow); installed revision ambiguous. PR #83 merged 09225816, both CI runs PASS.
- User approved open local read-only API with enforced resource limits, no mandatory tokens. Offline dispatcher and draft API.md added; no runtime listener or consumer migration yet. CI pending. Background test remains next runtime milestone.

## v0.1.63 — mixed DPF freshness measurement (2026-11-24)
- Cache Test now requests fixed mixed profile, displays measured maximum interval / requested interval per field and PASS/FAIL. Existing cache/reference tests retained. Requires Tool 0.1.53. Test may take around 65–85 s; CI/car pending.


## In-car v0.1.62 — 2026-11-24
- B57 12/12 repeated sample PASS, measured 5.15–5.45 s, total 10.4 s; cache and fixed scheduler PASS. DPF DEV confirmed functional. PR #81 CI PASS and merged bd374098. Next manual DPF DEV scheduler-cache comparison; no Diagnostics version bump.


## v0.1.62 — DPF profile scheduler measurement (2026-11-24)
- Previous in-car cache and scheduler PASS, DPF DEV unaffected. Cache Test now also runs bounded full DPF profile, shows each field's repeated sample status and measured maximum sample interval in seconds. Requires Tool 0.1.51. No claims of decoded-value equivalence or production authentication. Car validation pending.


## v0.1.61 — functional scheduler test (2026-11-24)
- Cache Test manual action now runs the existing cache probe followed by a fixed internal scheduler experiment and displays its separate PASS/FAIL. Normal Run and reference ECU tests unchanged. Requires Tool 0.1.50. No production grants or authentication claim. Car verification pending.


## v0.1.60 — boundary details (2026-11-24)
- Previous in-car 0.1.59 confirmed owner equality, mode-risk and all five ECU references PASS. New seven bounded observations in one screen, previous evidence retained in report. Requires Tool 0.1.49. No identity verification claim.


## v0.1.59 — OAP owner evidence (2026-11-24)
- Prior in-car survey confirms non-root non-peer ownership without shared write and five ECU references PASS. New seven observations in one Results screen; report preserves earlier metadata. Requires Tool 0.1.48. Identity remains unverified; no additional ECU operations.


## v0.1.58 — combined package metadata (2026-11-24)
- In-car 0.1.57 showed ancestor-owner and all five reference ECU PASS. New focused Results shows seven independent metadata observations in one run; sanitized report retains prior failure reason. Requires Tool 0.1.47. No ECU changes or verified identity claim.


## v0.1.57 — precise protection failure (2026-11-24)
- In-car 0.1.56: readable view, five ECU references PASS, observed OAP layout and matching UID, stable process, source protection NO and candidate unknown; DPF DEV still has data.
- Shows first protection failure category on Results and sanitized report note. Requires Tool 0.1.46; same manual Run, no change to vehicle reads. CI and MGU validation pending at authoring.


## v0.1.56 — focused package boundary observation (2026-11-24)
- Shows Process boundary baseline plus package survey availability, OAP layout, UID match, protected source mode, candidate and stable process in the existing readable Results view. Package identity remains NOT verified. Sanitized report note includes these observations; no raw credentials, paths or identities.
- Requires Tool 0.1.45. Same manual Run and ECU reference checks. English catalog and layout tests updated. CI and MGU verification pending.


## In-car v0.1.55 result — 2026-11-24
- PR #73 pre-merge CI PASS (run 45465912842), merged at 42748be5. User screenshot confirms focused Results readable. Process boundary PASS; peer cgroup readable, separate yes, same UID no, process stat readable. DDE/EGS/IHKA/BDC/ACSM all PASS on screen. Uploaded report 18 PASS / 2 FAIL / 9 SKIP; both FAIL are missing staged CDS generator configuration, shared CDS SKIP. DDE/EGS first attempt successful. No verified installed package identity. No controls exercised.


## v0.1.55 — focused readable results (2026-11-24)
- **In-car v0.1.54:** screenshot shows Native process isolation survey PASS but overlapping/unreadable historical results; user confirms DPF DEV still has data after the test. Exact process metadata not confirmed. Package identity remains unverified.
- **Implemented:** focused Results view with Process boundary, four separate observation lines and five ECU reference statuses. Larger font/spacing; full original report and manual run, comparison, cache and export workflows unchanged. Data Tool remains 0.1.44; no ECU or scheduler changes.
- **Validation:** layout/absence/status and English catalog regressions in CI; CI and real-MGU appearance pending at authoring.


## v0.1.54 — restored manual process boundary survey (2026-11-24)
**Integration:** PR #72 merged into dev `main` at `1b4b6e12169b438bb3b61d13a12692a9ce868dcb`; Data Tool CI #258 (PR) and #259 (`main`) **PASS**, including offline native boundary roundtrip and existing Data Tool Diagnostics regression tests. **MGU in-car v0.1.44/0.1.54 not yet tested.**
- **Implemented, CI-tested, awaiting in-car proof:** restored the historical `processBoundary` diagnostic step in the existing manual Run immediately after native kernel observation, using Tool `processBoundaryProbe`. The sanitized result reports peer /proc readability, cgroup separation, same-UID flag and process-stat access, with PASS / SKIP / FAIL and explicit package identity **NOT verified**. Existing Results and uploaded sanitized notes include this one step. Tool dependency updated to 0.1.44; English release line identifies the revision.
- **Non-regression:** no new ECU read, no change to established ECU sequencing, CTS/UDS transport, before/after sleep flow, button labels, other application logic or background activity. DPF DEV and production DPF/OSA untouched.
- **Goal:** validate actual MGU process-boundary observability only. Distinguishing installed DPF DEV from another app remains an unimplemented later security step, not a PASS result here.


## v0.1.53 — isolated manual UDS cache/coalescing check (2026-11-24)
**Integration:** PR #66 merged into dev `main` at `41fac73c6f432136f36374d2412caf330592b78d`; CI #228 (PR) and #229 (`main`) **PASS**, including the new offline cache probe and MGU preview. **Cache test not yet verified in car.**
- **Observed in car (previous 0.1.43/0.1.52 baseline):** user confirmed passive UDS Read Health rendered on MGU, reported **11 successful Data Tool ECU reads** after one diagnostic Run, and independently confirmed DPF, OSA EGS, and other apps continued functioning afterward. This demonstrates one successful coexistence observation, **not** long-term stability or proven cache sharing.
- **Implemented in Diagnostics only:** seventh **Cache test** tab with an on-screen tap target. On an explicit tap, snapshot Tool UDS counters, send **two concurrent identical allowlisted IHKA 0x78 / DID 0xD8D7 reads** using the existing socket API, then immediately a third identical read and a final status snapshot. Report delta of physical ECU requests (expected 0 if already cached, else 1), coalesced requests, cache hits, success of three replies, and whether third reply was cached. No new background polling; no report upload; no raw ECU payload included in result. The existing three MGU hardware bar buttons, normal diagnostic Run/order, TASU idle probe, and DPF/OSA remain unchanged.
- **Safety / limitations:** Only test parked in diagnostic mode, and avoid concurrent TASU idle experiment. One tap launches at most one bounded attempt. An existing fresh IHKA cache entry can yield 0 new ECU reads and 3 cache hits; this is a valid reused-cache outcome. An error/failure must be reported, not hidden. Real MGU touch behavior and coexistence of repeated requests are **not yet verified**; CI is offline only.


## v0.1.52 — dev MGU Store refresh experiment (2026-11-24)
- **Problem:** user reports no available updates for Diagnostics 0.1.51 and Data Tool 0.1.42 in MGU Store, even after checking the dev source and restarting HU. Cause **not established**.
- **Publication experiment:** bump Diagnostics to 0.1.52 and its Data Tool dependency to 0.1.43; keep static three-button MGU layout, passive read-health display, TASU action, normal diagnostic Run and Send action unchanged. Visible Info/version and What's New marker updated so the installed revision can be identified.
- **Verification:** pending CI and availability in the actual MGU Store. A merge into GitHub alone does not confirm the update reached the car.


**Integration and verification:** PR #64 merged into dev `main` at `66c9cf453d78df1eeab0d963978e285a1a718aaf`. GitHub Actions #219 (PR) and #220 (`main`) **PASS**, including Tool regression and offline MGU preview. **No in-car verification of v0.1.42/v0.1.51 yet.**


## v0.1.51 — passive Tool UDS telemetry on Diagnostics page (2026-11-24)
- **Implemented:** Diagnostics page requests Tool `status` while visible (at most once per 2 seconds; **no ECU reads**), displaying success/failure counts, cache hits, last successful ECU read timestamp, sample age, fresh/stale/missing, last source and last categorized error. Unavailable service shown explicitly. Scope label states independent DPF/OSA reads are **not monitored**.
- **Preservation:** original three physical button titles remain exactly `Run before sleep`, `Open TASU (no read)`, `Send report`; no new button, read order or background ECU polling. Existing snapshot/Results/Share paths unchanged.
- **Automated validation:** translation/manifest checks and Tool telemetry regression; CI and real-car screen verification pending. This is not an independent DPF/OSA diagnostics monitor.


## v0.1.50 — static MGU TASU bar button (2026-11-24)
- **User-confirmed regression:** v0.1.48 and 0.1.49 showed the previous button labels in-car. Both attempts relied on runtime `ui.text()` changes, which did not produce the requested visible control on this MGU. CI preview was insufficient to verify the native RHMI text.
- **Correction:** set the existing middle `BTN_GEN` manifest label to **Open TASU (no read)** directly in `app.json`, and remove startup/dynamic text override for this button. Pressing the same button toggles the Data Tool 0.1.41 TASU connection and the Diagnostics page shows the connection result. There are still exactly three RHMI buttons. This is a **temporary diagnostic-test replacement** of the former Generate CDS UI action; backend CDS generation code and endpoint are preserved, but the former manual button is not available in this isolation build. Existing normal Run / Send report actions and test order unchanged.
- **Validation:** structural regression asserts the actual static manifest label and absence of the previous runtime override. CI and in-car optical verification pending. Do not claim success until the new label is observed on MGU.


**Integration:** PR #62 merged to dev `main` as `13c5faf09e0a9bdc262329b8b614a49c0387e000`. GitHub Actions Data Tool test build #213 (PR) and #214 (main) **PASS**, including offline MGU preview. Button visibility on real MGU **not yet confirmed** for Diagnostics 0.1.49.


## v0.1.49 — MGU TASU control visibility fix (2026-11-24)
- **In-car observation on previous versions:** user confirmed that DPF and OSA EGS values work after installing Data Tool 0.1.41 and Diagnostics 0.1.48, before the idle TASU probe was opened. Therefore installation alone did not reproduce the previous failure at that observation point. The new fourth `BTN_TASU` was not visible on MGU; this is a real-car UI regression despite prior passing offline preview.
- **Fix implemented:** restore the proven **three** main MGU bar buttons. On the Diagnostics tab, reuse the existing middle `BTN_GEN` slot as `Open TASU (no read)` / `Close TASU`; on all other tabs it remains `Generate CDS test`. No changes to the established Run order, read protocol, DPF/OSA or existing upload UI.
- **Verification:** automated button-layout assertion updated; CI and in-car visibility verification pending.


## v0.1.48 — manual TASU idle coexistence experiment (2026-11-24)
**Integration:** PR #61 merged to dev `main` at `b3f62eda0ffd913b3120d2fd2d5378e06f86f5d6`. GitHub Actions Data Tool test build #209 (PR) and #210 (main) **PASS**: legacy Node 12 service health, offline regressions and MGU preview. **Not verified in car**; idle TASU coexistence remains the subject of the next parked test.

- **Implemented:** a separate `Open TASU (no read)` / `Close TASU` button, showing whether the helper subscription opened or was closed. The action calls Data Tool 0.1.41 `tasuIdleProbe`; it does not initiate ECU requests. The existing before/after test, run order, results, CDS tests and upload are unchanged.
- **Test objective:** with DPF and OSA initially working, manually open the Tool's idle connection and check whether their TASU readings continue. If they stop, close the idle connection and observe whether they recover. Do **not** run the full UDS diagnostic during this test. This isolates an idle additional client from concurrent Tool read activity but cannot attribute all TASU behavior without vehicle evidence.
- **Verification:** source implemented; CI and in-car behavior pending. No claim that coexistence is safe; remain dev-only and stop if other apps lose data.


## In-car baseline retest — 2026-11-24
- **Vehicle verified for one run only:** restored Diagnostics 0.1.47 with Data Tool 0.1.40 yielded **23 PASS, 0 FAIL, 5 SKIP**. This is a positive single diagnostic run, **not** a sustained multi-app success.
- **Critical coexistence observation:** DPF and OSA did not show data following this test. Both recovered only after Data Tool and Diagnostics were uninstalled and time had elapsed. The delayed recovery is observational; causality and TASU resource lifetime are unknown.
- **Action:** suspend additional in-car Diagnostics tests and keep experimental components uninstalled while isolating lifecycle effects. No modifications to application read order or retry behavior were made for this finding.


## v0.1.47 — restore last in-car-positive v0.1.40 diagnostics workflow (2026-11-24)
- **Approved recovery:** restore `test-runner.js`, `main.js` and English catalog from historical commit `7e0a47203c69ea2b94d9b146b71d494002560230`, instead of the later cold-F150-first and repeated F150 sequence. Exact historical manual read order and results UI are restored; only version becomes 0.1.47 and dependency minimum Data Tool 0.1.40. No app controls or background polling.
- **Verification:** existing Data Tool 0.1.35 / Diagnostics 0.1.40 passed in-car; restored 0.1.47 with Tool 0.1.40 is **not yet car-verified**. GitHub Actions Data Tool test build #200 (run 45372447506) PASS; current vehicle behavior remains unverified.


## Baseline protection documented (2026-11-24; documentation-only)
- Follow [Data Tool WORKFLOW](../../tools/data-tool/WORKFLOW.md) before changing the manual before-sleep/after-wake reference test. Preserve the last in-car-successful request workflow; isolate DDE F150/TASU 0x21 experiments instead of perturbing reference measurements.
- This documentation does not restore ECU reads; existing 0/7 live ECU result remains an unresolved, not-yet-verified regression.


## v0.1.46 — distinguish ECU reads from passive PASS and trace F150 (2026-11-23)
- **In-car evidence:** the 0.1.44 screenshot showed 17 PASS / 7 FAIL / 7 SKIP. All seven live ECU UDS read checks failed even though many passive service, security and environment checks passed. Presenting aggregate PASS as readiness was misleading.
- **Implemented:** `Results` header displays validated ECU-response success as **ECU reads N/7** plus failures, rather than 31-step total PASS. The complete global results remain in `All tests` and JSON report; the seven eligible checks are cold F150, IHKA, BDC, ACSM, DDE 44BB, warm F150 and EGS. `ecuReads` is added to the sanitized report, based on actual validated UDS responses, never service/socket readiness.
- **Transport evidence:** both F150 tests now use explicitly allowlisted Data Tool 0.1.38 `readTrace`. On failure the displayed result preserves numeric TASU status 0x21 and physical retry count; no raw VIN, DDE index, or response payload is captured in results. Preserve existing manual-only diagnostic sequence and UI layout from 0.1.45.
- **Dependency:** Diagnostics 0.1.46 requires Data Tool 0.1.38. Offline mocked tests may demonstrate mechanics but are not vehicle verification; no real-car result for these versions yet.


## v0.1.45 — readable DDE-first diagnostics results (2026-11-23)
- **In-car observation:** on Diagnostics v0.1.44 the photographed 31-check results screen was unreadable due to tiny overlapping 12px details and 17 result rows forced into a 380px panel; 17 PASS, 7 FAIL, 7 SKIP were reported. Failed checks included the cold F150, IHKA, BDC, ACSM, DDE 44BB, warm F150 and EGS, with visible TASU status `0x21`. This confirms broader ECU read failures at that time; cause is unresolved.
- **Implemented:** Results tab now presents the three DDE/DPF stages in a spacious left panel with one concise diagnostic detail each; the right panel lists other failed tests and short errors. New `All tests` tab retains all 31 check statuses in two columns, exactly one row per check without overlapping second-line diagnostics. Complete unsanitized-by-UI (but still privacy-sanitized) result details remain in the existing local JSON report/upload unchanged. No diagnostic requests, backend logic, IPC security or ECU reads are modified.
- **Manifest and translations:** v0.1.45; add seven English UI catalog strings (the only supported language) and updated visible What's New.
- **Tests:** source/UI layout regression asserting the focus order, full-grid pagination-free layout, new tab and one-line rows; prior automated diagnostic tests preserved. CI and vehicle UI confirmation pending.


## v0.1.44 — cold DDE F150 as first ECU read (2026-11-23)
- **Vehicle evidence:** DPF Status 0.1.72 still fails on Data Tool `TASU_REJECTED` when identifying DDE F150. Prior Diagnostics 0.1.43 F150 PASS occurred only **after other ECU reads** and DDE 44BB. PASS did not cover a first DDE request.
- **Implemented:** manual `DDE F150 first read` step uses the unchanged Tool `{op:'read',ecu:0x12,did:0xF150}` before IHKA/BDC/ACSM and before the warm DDE 44BB/F150 checks. Strictly validate a 0x62 F1 50 response of at least 6 bytes, but never save identifying bytes. Existing 15s IPC timeout and UDS result classification remain. Runs only on user-initiated Diagnostics, not at boot or in background.
- **Scope:** diagnostics app 0.1.44 has 31 explicit checks, retains later warm F150 comparison and existing report fields. Data Tool service and transport are untouched; standalone DPF v0.1.73 change defers its native TASU session while Data Tool is enabled.
- **Testing:** mock tests verify first ECU request is F150 and all established checks remain; CI pending. **In-car first-read result not verified**.


## v0.1.43 — isolated DDE F150 identification test (2026-11-23)
- **Vehicle evidence (other repo):** DPF Status v0.1.70 (`dzooky/bmrmodz`) had TASU Ready and Data Tool status Responding but `0xF150` read failed with `TOOL_TIMEOUT` and TASU fallback `NO_MATCHING_RESPONSE`. User reported existing Data Tool Diagnostics tests all PASS; they previously exercised DDE `0x44BB`, not this exact `0xF150` identification.
- **Implemented:** add manual `ddeIdentity` step using already allowlisted `{op:'read',ecu:0x12,did:0xF150}` immediately after the successful/attempted `0x44BB` DDE step, with existing 1-second ECU settling and 15-second client timeout. Require positive UDS `62 F1 50` response with at least three identification bytes to PASS; no raw ECU data or identity values persisted in report. FAIL reports a sanitized reason. This checks the disputed DID directly; a PASS alone does not validate DPF integration or startup timing.
- **Scope:** Data Tool service, transport, security policy, DPF app, EGS/CDS tests and reporting schema unchanged. One extra read-only DDE request **only during explicitly started diagnostics**. Diagnostic run now has 30 steps; Info/What's New version updated to 0.1.43, English-only catalog key added.
- **Verification:** automated test and CI pending. In-car v0.1.43 F150 result pending.


## v0.1.42 — depend on Data Tool 0.1.37 (2026-11-23)
- **Implemented on development branch:** companion manifest now requires Data Tool 0.1.37 instead of 0.1.36; Info version and English release note updated. Existing manual diagnostic protocol and report workflow preserved.
- **Automated CI and in-car update:** unverified at time of writing. This version does not prove DPF integration or application identity.


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
