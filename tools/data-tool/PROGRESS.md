# Data Tool progress

## v0.1.46 — source protection failure category (2026-11-24)
- **In-car 0.1.45 / Diagnostics 0.1.56:** Process boundary PASS, OAP layout yes, UID matches yes, process stable yes, source mode protected no, package candidate unknown. Five reference ECUs PASS. User confirms DPF DEV data still available. PR #75 CI 45471414040 PASS, merged d90a8e1f.
- **Implemented:** report first failing strict protection category using fixed enums (ancestor/app root/source/manifest, ownership/mode/symlink/type/stat/open/read/change). Existing fail-closed conditions unchanged; no raw paths, UID, permissions or arbitrary errors returned. No ECU transport, scheduler or production authorization change. CI and new in-car observation pending at authoring.


## v0.1.45 — manual package boundary observation (2026-11-24)
- PR #74 private scheduler gateway merged at 4830704b; PR checks Data Tool 45469962408 and DPF DEV 45469962603 PASS. No runtime gateway.
- Implemented isolated native helper obtains kernel peer credentials privately, then bounded /proc peer observation checks documented OAP cwd layout, UID suffix, stable start time/UID/cwd and root-owned non-writable source ancestry and manifest mode. Only fixed candidate names/booleans leave service. Candidate is an observation, NOT authoritative package authentication; ACL, installer registry, PID reuse and process isolation still require proof.
- Invoked only after the existing successful explicit processBoundaryProbe. Original boundary result, ECU transport, scheduler activation, queue, caching and consumer apps unchanged. No production authorization. CI and MGU verification pending.


## Private UDS demand gateway foundation (2026-11-24)
- **In-car Diagnostics 0.1.55 / Tool 0.1.44:** Process boundary PASS; peer cgroup and stat readable, distinct cgroup, different UID from service. Five ECU references PASS; DDE and EGS first attempt. Report 18 PASS / 2 FAIL / 9 SKIP; both FAIL are missing staged CDS generator JSON, not UDS or package authentication failures. Package identity still unverified.
- **Implemented, offline only:** private demand/snapshot/release dispatcher using existing fail-closed auth policy and scheduler grants. Resolves peer on every operation, rejects caller-supplied identity and unauthorized fields; snapshots passive. Revoked peer cannot renew or access; existing lease expires normally. No service/IPC registration, ECU runtime changes, version bump or installation required.
- **Remaining blocker:** actual trusted MGU package-to-process attestor is not provided by the available source. Need authoritative package ownership/boundary mapping and live process validation; UID/cgroup difference alone is insufficient. No activation until proven. CI pending at authoring.


## In-car observation — 2026-11-24
- Diagnostics 0.1.54 screenshot shows Native process isolation survey PASS; user confirms DPF DEV data available afterward. Detailed flags were not reliably readable due to overlapping rows. No package identity verification or production access. Diagnostics-only v0.1.55 improves visibility; Tool 0.1.44 and scheduler remain unchanged.


## v0.1.44 — restore manual process-boundary survey (2026-11-24)
**Integration:** PR #72 merged into dev `main` at `1b4b6e12169b438bb3b61d13a12692a9ce868dcb`; Data Tool CI #258 (PR) and #259 (`main`) **PASS**, including offline native boundary roundtrip and existing Data Tool Diagnostics regression tests. **MGU in-car v0.1.44/0.1.54 not yet tested.**
- **Implemented, CI-tested, awaiting in-car proof:** restored the original explicit `processBoundaryProbe` handler from the earlier working source layout, and bundled the existing hash-validated `native-process-boundary.js` plus `process-boundary-payload.js`. The handler is only invoked by a user-initiated Diagnostics Run; it observes SO_PEERCRED and bounded /proc access booleans without revealing raw PID/UID/GID, executable names, process metadata or package identity. It cannot grant any app data permissions.
- **Non-regression:** no change to the restored vehicle-read transport, ECU queue, retry policy, read order, cache, background scheduler or status socket permissions. The new UDS demand scheduler stays private/inactive; production apps untouched. Tool version is 0.1.44 solely to make the installed diagnostic change visible.
- **Limits:** a PASS is kernel/process observability, NOT authenticated DPF DEV identity. No installed-package attestation and no production gateway.


## Internal shared UDS demand scheduler foundation — 2026-11-24
**Integration:** PR #71 merged to dev `main` at `2b6850a6bcab6ffc0e43dd175af270e0f42f458a`. DPF DEV regression #26 (PR), #27 (`main`) **PASS**; Data Tool regression #252 (PR), #253 (`main`) **PASS**. Only offline tests: no authenticated runtime gateway, no in-car periodic Tool acquisition, and no app or Tool version bump.

- **Implemented (not activated):** `uds-demand-scheduler.js` is a private, read-only per-signal freshness/cache/lease scheduler. Its injected read callback must be the existing Tool serialized ECU queue when a future *authenticated* internal integration is activated; it does not itself open TASU connections. Each demand uses a trusted Symbol grant, validated named allowlisted ECU/DIDs and per-field desired freshness. It coalesces physical ECU/DID reads across authorized consumers, retains last validated values with timestamps, reports missing/stale data honestly, backs off after failures, and stops acquisition after all consumer leases expire. Passive snapshots do not generate ECU reads.
- **DPF DEV profile (unwired):** `dpf-demand-profile.js` lists the current B57 12 and B47 4 allowlisted DIDs. Target foreground signal freshness starts at 60s and B57 regeneration state at 5s, **only as a design input, not a measured sustainable ECU read frequency**. A corresponding DPF DEV consumer plan matches keys and target rates. No application has received a runtime capability; the scheduler is not instantiated by the running Data Tool service, and no new IPC endpoint is enabled.
- **Security/non-regression:** the experimental diagnostic socket remains unauthenticated and unchanged. No production app subscription, background polling, transport, read order, TASU connection, wake, retry, service startup or version change. Do not expose a demand handler on the legacy world-accessible diagnostic socket; app identity and authenticated gateway remain blockers for runtime integration.
- **Verification:** offline scheduler tests cover zero reads at startup, shared DID reads, cache-only snapshots, separate consumer freshness, lease expiry, invalid grants, missing/stale responses and failed read backoff. CI pending; no vehicle verification of scheduled operation. Earlier user-confirmed DPF DEV 0.1.78 manual repeated comparisons succeeded and production DPF + OSA EGS remained functional, establishing a reference to preserve.


## Vehicle baseline and next isolated test — 2026-11-24
**Integration:** PR #66 merged into dev `main` at `41fac73c6f432136f36374d2412caf330592b78d`; CI #228 (PR) and #229 (`main`) **PASS**, including the new offline cache probe and MGU preview. **Cache test not yet verified in car.**
- **In-car observation, Tool 0.1.43 + Diagnostics 0.1.52:** new passive Tool UDS health display appeared on MGU; user reported **11 successful ECU reads** after one full manual diagnostic Run, and confirmed independent DPF, OSA EGS and other applications still operated afterwards. This is one positive session, not a sustained or multi-load verification. Exact cache/coalescing rates were not reported.
- **Next experiment (Diagnostics v0.1.53 only):** on-demand pair of simultaneous existing IHKA reads, then immediate cached read, with existing Tool status counter deltas; **Tool code and version remain 0.1.43**, no change to TASU transport, request queue, caching algorithm or production applications. Verify in car after CI and MGU Store availability.


## v0.1.43 — dev MGU Store refresh experiment (2026-11-24)
- **Problem:** user reports no updates visible for Data Tool 0.1.42 / Diagnostics 0.1.51 in MGU Store; reboot of HU did not fix it. Root cause unconfirmed.
- **Experiment:** manifest version 0.1.43, same value in passive service status/report and offline health test; no transport, ECU reads, cache, queue, scheduler or other functional behavior changed. Companion Diagnostics 0.1.52 requires Tool 0.1.43.
- **Verification:** pending CI and MGU Store visibility; do not interpret merge as proof of Store publication.


**Integration and verification:** PR #64 merged into dev `main` at `66c9cf453d78df1eeab0d963978e285a1a718aaf`. GitHub Actions #219 (PR) and #220 (`main`) **PASS**, including Tool regression and offline MGU preview. **No in-car verification of v0.1.42/v0.1.51 yet.**


## v0.1.42 — passive UDS read health (2026-11-24)
- **Implemented:** `status.readHealth` reports Tool-only validated UDS successes, timeouts/errors, cache hits, timestamp of last successful ECU sample, sample age against the existing 500 ms cache window, last source (`ecu`/`cache`), and fixed-category last read error. `status` remains passive: **no ECU read, new polling, DID probing, or transport change**. Diagnostic error details are not copied from raw TASU payloads.
- **Scope:** telemetry only covers Data Tool's own UDS requests, not independent production DPF/OSA/third-party TASU clients. `fresh` refers solely to freshness of the last Tool ECU sample, not proof that another application has live data.
- **Automated validation:** regression assertions for initial missing state, successful sample, cache source, stale timestamp and no extra ECU requests. CI and in-car measurement pending.


**Integration:** PR #62 merged to dev `main` as `13c5faf09e0a9bdc262329b8b614a49c0387e000`. GitHub Actions Data Tool test build #213 (PR) and #214 (main) **PASS**, including offline MGU preview. Button visibility on real MGU **not yet confirmed** for Diagnostics 0.1.49.


## Vehicle coexistence baseline observation — 2026-11-24
- With Data Tool 0.1.41 and Diagnostics 0.1.48 installed, user confirmed functioning **DPF DDE** and **OSA EGS transmission** readings before invoking the TASU idle probe. This is a limited installation/idle baseline, **not** proof that opening a new `hmictl` subscription or issuing Tool ECU reads is safe. MGU did not show the fourth diagnostic bar button, prompting Diagnostics-only v0.1.49 UI control correction.


## v0.1.41 — isolated idle TASU connection probe (2026-11-24)
**Integration:** PR #61 merged to dev `main` at `b3f62eda0ffd913b3120d2fd2d5378e06f86f5d6`. GitHub Actions Data Tool test build #209 (PR) and #210 (main) **PASS**: legacy Node 12 service health, offline regressions and MGU preview. **Not verified in car**; idle TASU coexistence remains the subject of the next parked test.

- **Purpose:** distinguish an independently open TASU client from actual concurrent ECU requests without repeating the already failed per-read-helper teardown experiment.
- **Implemented:** explicit diagnostic-socket `{op:"tasuIdleProbe",mode:"open"|"close"}` operation. Open initializes the existing hmictl TASU subscription **without any UDS/ECU call**; close releases it. Actions serialize with the established request queue; ordinary read transport, timeouts, DID allowlist, 200 ms queue and 500 ms cache are unchanged. No background polling or application migration.
- **Offline regression:** `tools/data-tool/test.js` asserts open/close state, zero physical ECU requests and subsequent normal read; health-startup version expectation bumped. **CI and real-car coexistence verification pending** until observed separately.
- **Safety:** use only as parked, manual diagnostic isolation. A successful open confirms helper/subscription setup, **not** that other TASU clients can still read. Normal production DPF/OSA/Car Equipment are unchanged. Close the probe after observation; do not run the full diagnostics while the idle probe is deliberately open.


## In-car isolation result and code inspection — 2026-11-24
- **Vehicle observation:** restored Data Tool 0.1.40 + Diagnostics 0.1.47 reported **23 PASS / 0 FAIL / 5 SKIP** on one manual diagnostic run, but DPF and OSA then showed no data. After uninstalling both dev components, DPF and OSA recovered only after a substantial delay. The reported positive diagnostics therefore **does not prove safe multi-application coexistence**, and delayed recovery does not prove which process caused the interruption.
- **Code-confirmed mechanism:** `service.js` creates the transport lazily on an explicit read; `transport.js` starts an independent `hmictl serve` process, subscribes `0xf8a6`/`0x8001`, and retains the helper after reads. It is killed only by `close()` on service shutdown. The 200 ms serialized queue, 500 ms cache, and deduplication apply **only to Tool requests**. Existing production DPF and OSA have separate `ReadOnlyDiag` TASU paths, not shared with the Tool queue. OSA also reads native CDS signals separately.
- **Assessment:** simultaneous TASU clients are a concrete architectural overlap, **not a proven vehicle-side lock/resource leak**. Code inspection alone cannot establish whether `hmictl` retains TASU resources after an idle period or when/how MGU frees them. The earlier 0.1.39 per-read helper-close experiment failed to restore vehicle behavior, so do not reintroduce it as an assumed fix.
- **NO-GO:** leave Data Tool and Diagnostics uninstalled on the car for now. No transport, retry, timeout, ECU order, or consumer-app code changes without a discriminating test/evidence of cause. The next experiment must distinguish active-helper interference from residual MGU/TASU state and CDS readiness while preserving working apps.


## v0.1.40 — restore last in-car-positive v0.1.35 transport and UDS path (2026-11-24)
- **Approved recovery:** restore `service.js` and `transport.js` from exact commit `7e0a47203c69ea2b94d9b146b71d494002560230` (Data Tool 0.1.35 / Diagnostics 0.1.40). Preserve single 200 ms serialized queue, 500 ms success cache, identical request deduplication and historical long-lived `hmictl` helper. Remove post-baseline TASU 0x21 retries and per-read helper teardown; no speculative warm-ups, request reordering or changed delays.
- **Version/deployment:** publish as Data Tool 0.1.40 (upgrade from failed 0.1.39), retain existing component identity and dependency; historical runtime files unchanged except reported version. Diagnostics receives matching reference workflow as 0.1.47.
- **Verification:** implementation in GitHub; GitHub Actions Data Tool test build #200 (run 45372447506) PASS: Node 12 startup, offline regressions, native host checks and MGU preview. Current in-car behavior remains unverified. The original v0.1.35 + Diagnostics v0.1.40 combination previously passed real-car DDE/EGS/CDS checks, but **this new deployment is unverified**. Stop on shared ECU failures; do not repeat full diagnostics unnecessarily.


## Vehicle FAIL — Data Tool v0.1.39 (2026-11-24)
- **User-reported in-car:** after installing the dev Data Tool 0.1.39, DPF/EGS reads already FAIL before starting Diagnostics; after running Diagnostics, all tested ECU consumers remain FAIL, including DPF. The per-read hmictl session release did **not** restore vehicle functionality. Do not claim this mitigation as verified or repeat disruptive full diagnostic runs. The underlying TASU condition remains unknown and may predate v0.1.39.
- **NO-GO:** no further consumer migration or automatic retries/warm-ups. Stop in-car Diagnostics on shared ECU failures. Last documented positive baseline remains 0.1.35 paired with Diagnostics 0.1.40, not a verified fix for current conditions.

## v0.1.39 — close TASU helper after each queued read (2026-11-24)
- **Observed in car:** with the dev Data Tool installed, DPF and EGS sometimes lose live diagnostic data after repeated Diagnostics runs; independent apps previously recovered after uninstalling dev components. This suggests but does not prove helper/session interference.
- **Implemented:** close the per-read hmictl/TASU helper, awaiting child exit before the next queued physical read; preserve existing 0x21 bounded retry *inside* one request, 0x25 fail result, existing read cadence/timeouts, allowlist, shared queue, duplicate-read coalescing, cache, CDS and other APIs. No consumer app modifications.
- **Regression:** mock coverage for released helpers after positive reads, coalesced and cached requests, and rejected F150 status 0x25 with no extra retry. GitHub Actions Data Tool test build #196 (run 45369319763) PASS: Node 12 service health, regression suite, native proof checks and offline MGU preview. **In-car verification pending**.
- **Safety:** experimental only. No claim of root-cause resolution or car verification. Stop testing if other apps lose TASU values.


## Approved development workflow documented (2026-11-24; documentation-only)
- User-confirmed architecture and scope are recorded in [WORKFLOW.md](WORKFLOW.md): Tool owns acquisition and serial scheduling, consumers declare data/freshness demands, concurrent identical requests are shared, faster UI refresh uses validated cache, and new applications must not change functioning acquisition.
- Preserve last in-car-working behavior; no speculative ECU order, new warm-ups or transport rewrites; isolate experiments and choose minimal regression tests. User-approved decisions must be read before future changes.
- **State:** Documentation only. No service, transport, package version, vehicle behavior or production access changed. Current consumer gateway remains experimental and NOT verified for live multi-app operation. Root cause of observed ECU failures remains unproven.


## v0.1.38 — TASU status 0x21 read-only recovery and truthful ECU outcomes (2026-11-23)
- **In-car evidence:** Data Tool Diagnostics 0.1.44 screenshot showed 17 PASS / 7 FAIL / 7 SKIP; all seven major ECU UDS checks failed (including both DDE F150 reads, DDE 44BB, EGS, IHKA, BDC, ACSM), with TASU short-envelope status 0x21 observed. The 17 other PASS checks are mostly passive IPC/service/security operations and do NOT demonstrate vehicle ECU access. DPF 0.1.73 also failed with NO_MATCHING_RESPONSE. Vehicle root cause is unproven.
- **Implemented in Data Tool:** short TASU rejection preserves its numeric envelope status as `tasuStatus`, separate from UDS NRC. For an explicit allowlisted read returning **TASU 0x21 only**, retry up to two more times via the **same serialized transport** after 700 and 1,400 ms; on further rejection return `ok:false`, `tasuStatus:33`, never PASS. No retries for other status codes, timeouts, negative UDS, malformed replies or other operations; no background activity or new ECU commands. Error replies are never cached. Preserve 200ms shared queue, coalescing, health and all security gates. Status exposes numeric retry counter but is **not** proof of ECU readiness.
- **Real diagnostic visibility:** permit explicitly requested F150 `readTrace` and expose bounded `attempts` and `tasu21Retries` counters without raw ECU bytes/identity. Diagnostics v0.1.46 consumes this trace and displays **ECU reads x/7** separately from overall/passive counts.
- **Testing:** dedicated socket tests simulate transient status 0x21 → third valid UDS PASS; persistent 0x21 → FAIL after exactly 3 attempts; other rejection status and timeout → no retry; passive status sends no ECU requests. Native transport test checks numeric rejection code. These are simulated, not in-car verification.
- **Known:** This is a bounded recovery for a directly observed failure mode, NOT a validated solution for an unknown TASU rejection origin. Actual ECU reads remain unverified until real-car test.


## v0.1.37 — DPF read contract and name continuity (2026-11-23)
- **Implemented on development branch:** rename the Store display title from `Data Tool Feasibility` to `Data Tool`, retaining technical ID `bmrmodz-data-tool`, service unit and socket path; version 0.1.37 so it supersedes the already installed 0.1.36.
- **DPF integration compatibility:** keep the existing explicit read-only `{op:'read',ecu,did}` API used by DPF Status 0.1.68 in `dzooky/bmrmodz`. Added offline socket integration regression for positive DID echo, simultaneous read coalescing, cache use, and fail-closed getData/controls. No new ECU command, no production app authentication or background polling.
- **Preserved:** CDS engine, broker experiments, native peer probe, 0.1.36 behavior. CI and in-car installation results must be recorded separately; application identity remains NO-GO.


## v0.1.36 — native peer process boundary observability (2026-11-23)
- **In-car baseline:** Data Tool v0.1.35 / Diagnostics v0.1.40: 23 PASS, 0 FAIL, 5 SKIP (2026-11-23 21:17 UTC). Real MGU Linux x86_64 SO_PEERCRED succeeded on the existing IPC client; DDE/EGS/CDS still pass. Kernel-provided peer PID/UID/GID were NOT returned in the diagnostic report. Application identity remains NO-GO.
- **Implemented:** new *manually invoked* `processBoundaryProbe` uses a separate, hash-pinned, static libc-free Linux x86_64 executable to obtain SO_PEERCRED on the already-connected Unix FD3, and checks readability of `/proc/<kernel-peer-pid>/cgroup`, `/proc/<kernel-peer-pid>/stat`, `/proc/<kernel-peer-pid>/exe`, and service cgroup. Results are booleans only: peer process access, same UID, different cgroup and kernel peer observation. No PID/UID/GID, cgroup content, executable path, binary bytes or package names are returned. No process enumeration, background activity or ECU requests. Original `nativePeerProbe`, socket and service boot unchanged.
- **Security gates:** Distinct cgroups, readable process metadata or same/different UID are NOT installed package verification and do not supply the signed registry/binding, immutable process instance proof or trusted app isolation; these values must never select capabilities. Production data gateway stays OFF, `auth-policy.js` disconnected, and DPF/OSA/CC untouched. A test can PASS while app authentication remains NO-GO. This survey only establishes whether verified kernel peer metadata can feasibly be joined to system process information.
- **Automated:** host x86_64 executable roundtrip, source-vs-binary check, legacy Node startup, diagnostics regressions, offline MGU preview. **In-car v0.1.36 not verified.** Next after report: investigate trusted installed-package metadata and verified process-instance mapping without assuming cgroups uniquely identify packages.


## v0.1.35 — Node 8 native probe lifecycle timeout regression (2026-11-23)
- **Observed in car:** Data Tool 0.1.34 / Diagnostics 0.1.39, 22 PASS, 0 FAIL, 6 SKIP. Only `nativeKernel` skipped with `Native test unavailable: timeout`. DDE, EGS, CDS, synthetic broker and existing IPC remain functional. This is **not** evidence that the kernel lacks SO_PEERCRED.
- **Fix:** use child process `exit` plus stdout `end` rather than `close`, which can be delayed by the inherited live FD3 on older Node. Keep the same existing Unix socket, pinned ELF, exclusive temporary file, cleanup and fail-closed service. Increase bounded timeout from 1s to 2s to account for slow MGU scheduling and distinguish timeout-before-spawn / timeout-after-spawn / timeout-after-exit without exposing identity or filesystem data. Test process exit and stdout EOF with deliberately no close event, plus simulated hung child.
- **Security:** no app ID, UID/PID, production gateway or ECU traffic exposed. SO_PEERCRED kernel proof on MGU remains **unverified** pending one parked retest; DPF/OSA/CC not changed.


## v0.1.34 — bounded native SO_PEERCRED experiment on MGU existing socket (2026-11-23)
- **In-car baseline:** Data Tool 0.1.33 / Diagnostics 0.1.38: 22 PASS, 0 FAIL, 5 SKIP. Report: x86_64, ELF 64-bit, Node 8 / N-API 4, native Node peer API unavailable, broker/UDS/CDS passes. App authentication NO-GO.
- **Implemented:** static, libc-free x86_64 Linux `SO_PEERCRED` helper from `native/peercred-static-x86_64.S`, pinned compressed ELF payload embedded in `native-peer-runner.js`. The binary is unpacked **only** when an explicit `nativePeerProbe` request arrives on the existing Data Tool diagnostic Unix socket, using a verified owner-only-writable runtime directory, exclusive 0700 temporary file, SHA-256/ELF architecture checks, bounded child stdout, one-second kill timeout, safe cleanup, and inherited accepted client socket on FD 3. It never creates a second listener, reads client packets or vehicle data, and does not execute at boot. Errors (missing exec permission/noexec, spawn issues, unsupported platform) return bounded `SKIP`-capable status without affecting service health.
- **Security:** Native binary only establishes that Linux kernel answered `SO_PEERCRED` for this established IPC peer. It returns **no** UID/GID/PID, package IDs, names, paths or raw /proc records. It does **not** bind peer to DPF/OSA/CC, prove process lifetime or authorize anyone; production `getData` remains denied, secure listener off. Native result PASS means kernel API observable, NOT authenticated application.
- **CI and verification:** Node 12 boot compatibility, Node 18 test suite, actual embedded x64 helper execution on accepted socket, source/binary equivalence, offline MGU build. **In-car v0.1.34 NOT VERIFIED** until single Run + Send report with Diagnostics 0.1.39; no unnecessary ECU tests added beyond existing 28-check sequence.


## v0.1.33 — Linux SO_PEERCRED host prototype and MGU native ABI survey (2026-11-23)
- **In-car baseline:** Tool 0.1.32 / Diagnostics 0.1.37 produced 21 PASS, 0 FAIL, 5 SKIP. DDE, EGS, CDS, synthetic broker, legacy IPC and passive authentication survey passed. Report: Node `getPeerCredentials` unavailable, /proc cgroup readable, Seccomp not observed, app authentication remains NO-GO.
- **Implemented:** `native/peercred-probe.c` is a minimal Linux **host-only** `SO_PEERCRED` proof on an already accepted AF_UNIX descriptor inherited as FD 3; it returns only booleans, never actual PID/UID/GID or installed package identity, and **is not installed, executed or activated on MGU**. CI builds this using host `cc` and tests handoff from a Node socket. The service loads **only** a separate safe Node module `native-peer-feasibility.js`, which passively checks its own ELF class/machine/endian, Node ABI/N-API, process architecture, kernel major and safely reports flags. Explicit diagnostic command `nativePeerFeasibility` never executes binaries, creates sockets, enumerates processes or reads ECU data.
- **Security GO/NO-GO:** Host `SO_PEERCRED` confirms a kernel primitive on CI Linux, NOT that it works with the target MGU ABI or establishes package identity. No trusted MGU process-instance/package attestor exists. `auth-policy.js` stays isolated from Data Tool sockets and requires kernel peer + installed package + process identity + isolation. Production `getData` remains denied; secure listener off; DPF/OSA/CC unchanged.
- **Automation:** Node 12 startup + syntax, Node 18 regressions, host native build test, offline MGU preview. **v0.1.33 in-car unverified**; one manual report will provide ABI properties needed to pick a cross-compiler or N-API approach. A future MGU native binary must be built/tested separately and approved before deployment; do not assume host binary compatible.


## v0.1.32 — fail-closed application authentication feasibility stage (2026-11-23)
- **Real car baseline:** Data Tool v0.1.31 and Diagnostics v0.1.36 completed 20 PASS / 0 FAIL / 5 SKIP. The existing IPC connection and synthetic multi-consumer broker were verified in the car. The native Node peer-credential API was reported **unavailable**, so actual application identity remains unverified. No production app uses Data Tool.
- **Implemented:** explicit, read-only `authFeasibility` survey checks only whether the Data Tool process can read its own /proc status, cgroup, security label and PID namespace link, and flags Seccomp/NoNewPrivs and native peer API presence without exporting any raw process data or file contents. These flags are environmental hints, NOT proof of per-app isolation or authorization. It runs only from an explicit diagnostic request on the existing working control socket; no extra listener, native addon, permission changes or ECU reads.
- **Policy preparation:** `auth-policy.js` defines a **test-only, not wired to service** package-to-Symbol grant contract, requiring an external trusted attestor to prove kernel peer, installed package, exact process instance/lifetime and isolation boundary together. JSON-supplied UID/PID/package, service UID, shared group, filesystem DAC and self-reported app identity cannot authorize a request. Without a proven native attestor on MGU, policy and broker remain disconnected from public sockets; `getData` remains denied.
- **Automated:** mock surveys, identity spoof/revocation/cross-app denial, service health, Node 12 compatibility, all existing UDS/CDS regressions and offline MGU build. **In-car v0.1.32 NOT VERIFIED.** Native Linux SO_PEERCRED adapter is a candidate, not a proven MGU capability; first prove deployment/ABI and package-to-peer binding before enabling any production path.


## v0.1.31 — replace unreliable second IPC bind with live diagnostic peer capability survey (2026-11-23)
- **In-car evidence:** Data Tool v0.1.30 / Diagnostics v0.1.35, 2026-11-23 19:30 UTC, 19 PASS / 1 FAIL / 5 SKIP. Only broker IPC local `listen OTHER` failed; DDE, EGS, CDS and SOME/IP all passed; synthetic broker passed. Reattempting a second local socket in `/tmp` and in the existing runtime directory failed. Exact OS error is unknown, since only a coarse sanitized failure category was recorded.
- **Regression correction:** remove the second socket from the manual `brokerSelfTest` execution entirely. Observe kernel peer-credential API support on the **already established inbound ctl.sock connection** using `observePeer(client)`, report booleans for API presence and credential observation, and affirm no production gateway is enabled. The legacy socket remains 0666, diagnostic-only and NOT a secure production channel; merely observing peer credentials never authenticates package identity or grants application access. Existing `secure-peer-probe.js` remains an isolated test artifact and is no longer loaded by the normal service.
- **Automated:** original service tests updated to require no second socket; keep synthetic authorization/coalescing/CDS tests, direct secure gateway and local IPC tests in CI. Existing boot behavior, original vehicle read operations, strict report schema and three MGU buttons unchanged. **In-car v0.1.31 not yet verified**, while 0.1.30's original vehicle reads were confirmed in car.


## v0.1.30 — isolate real-MGU temporary IPC bind failure (2026-11-23)
- **In-car observation:** Data Tool v0.1.29 / Diagnostics v0.1.34, 2026-11-23 19:20 UTC, 19 PASS / 1 FAIL / 5 SKIP. All original DDE/EGS/CDS and SOME/IP tests passed; sanitized report specifically identified `Broker IPC: FAIL (local IPC listen)`. Synthetic broker phase passed. Failure is restricted to setting up a second, temporary Unix socket, not ECU access or production application authorization. The OS error code was not captured by that report, so the cause is not yet proven.
- **Targeted fix:** create a short, random, test-only Unix socket name in the **already proven service socket's own runtime directory** instead of under `os.tmpdir()`, whose path length, access or socket policy can differ on MGU. The original `ctl.sock` is never unlinked, chmodded or modified; only the unique probe socket is cleaned up. Reject unsuitable socket paths; add a strict allowlist for OS error-code categories (never disclose raw path, PID, UID or OS error messages). Production secure IPC remains off, test remains manually triggered and vehicle-traffic-free.
- **Automated:** socket probe success and invalid-directory negative test, isolated synthetic broker, original health, Node 12 syntax/startup, Node 18 regression and offline MGU build. Companion Diagnostics 0.1.35 shows the sanitized error category on failure. **In-car v0.1.30 NOT VERIFIED.** A single parked Run + Send report will check whether the runtime directory resolves the observed bind failure.


## v0.1.29 — isolate MGU broker/IPC diagnostic failure (2026-11-23)
- **Real car:** Data Tool v0.1.28 installed and Diagnostics 0.1.33 completed 19 PASS, 1 FAIL, 5 SKIP. DDE, EGS, SOME/IP and CDS passed; the only failure was new `brokerGateway` self-test. The uploaded strict-backend report exposed only overall `Broker IPC: FAIL`, so the particular subcheck remains **unknown**. No evidence of a DDE, EGS, CDS or startup regression.
- **Correction:** the one-shot local Unix socket probe now reports only a bounded failure stage (`create-temp-directory`, `listen`, `security-status`, `socket-permissions` or `unauthorized-request`). No raw errors, paths, UID/PID or credentials. Diagnostics v0.1.34 includes this stage or synthetic broker failure in the existing uploaded `notes`, preserving server compatibility. This improves diagnosis rather than falsely declaring the failure fixed. No change to vehicle traffic or production gateway state.
- **CI:** service health/Node 12/IPC and Diagnostics upload tests. **In-car v0.1.29 / Diagnostics 0.1.34 unverified.** One parked Run + Send report is required to identify whether the problem is sandbox/Unix socket environment, runtime IPC or a broker test mismatch.


## v0.1.28 — regression fix: older MGU Node service startup (2026-11-23)
- **In-car failure reported:** after v0.1.27 update the Data Tool installer displayed `is not healthy`. v0.1.27 introduced a service-level require of `broker-self-test.js` -> `data-broker.js` at process startup; the existing broker used optional chaining (`?.`), which older MGU Node versions may reject during parsing, preventing the diagnostic socket from starting. This is a **high-confidence diagnosis, not confirmed without vehicle service logs**.
- **Fix:** remove incompatible optional chaining from startup-loaded broker and preserve response timestamp using an explicit local variable. Replace `fs.rmSync` (unavailable on older Node) with test-owned socket unlink / directory rmdir. Keep the new broker security gate and synthetic test, legacy diagnostic socket protocol, no vehicle-on-boot behavior, and installed systemd unit unchanged.
- **Prevention:** add Node 12 syntax validation for all startup-loaded service modules and Node 12 actual service health/startup checks to CI, then run all existing Node 18 regressions and offline MGU build. **In-car v0.1.28 NOT VERIFIED** until the user re-installs and confirms health; DPF/OSA/CC unchanged.


## v0.1.27 — complete test-only broker gateway, IPC loopback and on-device diagnostic pack (2026-11-23)
- **Implemented:** `broker-gateway.js` dispatches only named `getData` fields to `data-broker.js` when a trusted in-process, package-aware identity resolver explicitly returns `verified:true` and an opaque Symbol capability. Client-supplied JSON UID, package and consumer labels never grant access; unauthorized and unknown requests are denied. No production resolver exists yet, so **actual secured data access remains disabled**.
- **Controlled Unix integration:** opt-in `secure-ipc.js` can accept an explicitly injected gateway for isolated test harnesses only. The default production listener (if manually enabled) remains status-only and does not expose `getData`, UDS, CDS or vehicle controls. No systemd, socket permissions or production OAP dependencies are changed.
- **MGU manual diagnostics:** new explicit `brokerSelfTest` on the existing diagnostic socket runs synthetic three-consumer DPF/OSA/CC authorization, UDS coalescing and CDS lease/freshness checks with mock samples and **zero vehicle requests**. A short-lived owner-only Unix socket is created and removed locally to test real MGU socket setup, status, native peer-credential availability and denial of forged unauthorized `getData`. Only booleans are reported; no UID/PID, VIN, credentials or vehicle values are returned. The operation is never invoked at boot and has a bounded timeout/fail-closed result.
- **Diagnostics v0.1.33:** one additional automatic test within the existing Run action; still exactly 3 hardware buttons. Displays the outcome in the 25-row Results view and sends a sanitized summary in an existing server-compatible `notes` item, without changing server schema. Existing before/after snapshots, DDE/EGS/CDS reads and secure upload remain unchanged.
- **Automated:** explicit tests cover socket default-deny, forged IDs, synthetic scoped grants, concurrent consumers, engine and gateway fallback, service startup/health and preview. **In-car status: NOT VERIFIED for this version.** This is NOT validated production application authentication; actual package identity on MGU remains a hard NO-GO for connecting DPF/OSA/Climate Comfort.
 

## v0.1.26 — internal broker foundation and multi-consumer tests (2026-11-23)
- **Implemented:** a source-grounded, internal-only named-data catalog with DPF B57/B47 soot/ash/since/average, EGS ATF, IHKA footwell temperatures, and BMW CDS engine oil/coolant/RPM values. Specific DDE/EGS F150 identities, exact UDS DID response lengths and BMW CDS conversion/sentinel rules are enforced. No speculative regeneration-state decoding; no additional ECU DIDs.
- **Broker:** `data-broker.js` accepts only per-process opaque Symbol grants mapped to a finite field allowlist. No untrusted consumer-name/UID JSON is accepted as proof of identity. Prevalidate whole requests, share in-flight identical UDS reads, retain the service's existing serialized UDS queue/cache, reject stale UDS samples, respect CDS freshness, acquire/release a shared demand-driven CDS lease across concurrent internal requests. No recurring reads, controls, session writes or changes to existing app traffic. The broker is not attached to any client socket or OAP app.
- **Passive observability:** the existing diagnostic socket gets inert `brokerPlan` returning the supported field names and `productionAccessEnabled:false`; `getData` remains denied on both diagnostic and secure sockets. The opt-in secure socket remains status-only; kernel credentials are not automatically promoted to package identity. Existing installer/service boot and Diagnostics 0.1.32 remain unchanged.
- **Automated:** new deterministic three-consumer authorization, UDS coalescing, CDS lease/freshness, invalid data and profile-decoding regressions run in CI, alongside all existing Data Tool startup/health and offline MGU preview checks. **In-car v0.1.26 NOT VERIFIED; IPC authorization remains a blocker for production migration.** Next stage: verify a supported authenticated application identity mechanism on physical MGU; only then attach a real secure, per-app data gateway and evaluate migration of each foreground application.


## v0.1.25 — passive kernel-peer capability survey on opt-in secure IPC (2026-11-23)
- **Implemented:** experimental `secure.sock` `securityStatus` now reports a limited passive `peer` object from Node's native `getPeerCredentials()` when present: kernel API availability, valid numeric kernel UID/GID/PID observation, and optional configured socket owner UID match. Missing API, throwing API, malformed credentials, spoofed request JSON identities and mismatched UID fail closed. Neither a matching UID nor peer credentials prove the requesting app's package identity; `applicationIdentityVerified:false`, `productionAccessEnabled:false` and the existing `peerIdentityVerified:false` explicitly remain. No data, CDS, raw UDS or controls can be requested through this endpoint.
- **Deployment safety:** secure endpoint remains opt-in with `BMRMODZ_SECURE_IPC_EXPERIMENT=1`; normal systemd unit and legacy `ctl.sock` unchanged. The existing no-socket default and installer health fallback remain. Repair fragmented JSON input handling, bounded to existing 4096-byte limit.
- **Automated:** deterministic tests for absent/throwing native API, valid/invalid kernel credentials, UID mismatch, spoofed JSON identity and denied data commands; existing service startup and legacy tests to verify in CI. **In-car status: NOT VERIFIED.** Do not enable experimental listener during ordinary installation or migrate production apps. Next: controlled MGU capability/status test, then design a separate authenticated per-app authorization gate before any data API.


## v0.1.24 — terminal short TASU rejection handling (2026-11-23)
- **CI correction (2026-11-23):** the first v0.1.24 post-merge run failed because transport trace test expected `TASU rejected request` while the existing generic diagnostic error wrapper emitted `TASU rejected frame`. Preserve the strictly sanitized exact short-rejection error in the transport's trace mode, matching the service handler and test; no vehicle read behavior change. Re-run CI after merge.

- **Implemented in branch:** compare with `dzooky/bmrmodz/tools/car-equipment/transport.js` (proven gateway VO ECU `0x10`/DID `0x3F06`) and correct Data Tool handling of *well-formed short* TASU `0x7F` rejection envelopes: finish current read immediately rather than discarding the event and waiting ~3.5 seconds. Accept only a consistent length and an existing status byte. The existing trace still records TASU status code (observed `0x25` on DDE `0x12` / EGS `0x18`) but does not interpret it as UDS NRC. Unknown/truncated frames still await normal bounded timeout; normal positive UDS frames unchanged. Rejection is sanitized. In diagnostics, TASU rejection is terminal and not retried; no ECU waking, extra probe or address change.
- **In-car baseline:** Diagnostics 0.1.27 / Tool 0.1.23 first manual run both DDE/EGS failed after three 3.5-second timeouts with identical short TASU reject status `0x25`; second run each passed on first request (~178 ms DDE, ~213 ms EGS). Cause of first rejection still unknown. DPF DID research records addresses but does **not** prove gateway VO routing works identically on physical DDE/EGS; device validation is still needed.
- **Automated:** synthetic immediate TASU rejection, truncated/unknown envelope, ACK and timeout regression tests; CI result to verify. **In-car v0.1.24 not yet verified.** Service IPC, CDS, data cache, production access and read allowlist unchanged.


## v0.1.23 — bounded short TASU status byte audit (2026-11-23)
- **Implemented on feature branch:** when a short TASU reject-marker envelope is observed during explicitly authorized DDE/EGS `readTrace`, record only the single legacy decoder status byte as a hex-labeled numeric code histogram (up to 8 distinct codes), plus absent/overflow counts; no raw frames, UDS bytes, VIN, response payloads or additional vehicle requests. The byte is a TASU envelope status, NOT confirmed UDS NRC or verified meaning. Production read access, CDS engine, security, 3.5s read timeout and legacy normal reads unchanged.
- **Vehicle evidence (v0.1.22 + Diagnostics v0.1.25):** first run 15 PASS/2 FAIL/5 SKIP with 3 consistent short TASU 0x7f reject-marker events and 3 timeouts each for DDE/EGS; second run 17 PASS/0 FAIL/5 SKIP, both replied in ~0.2s on first attempt. Root cause and code meaning unverified. This release has no in-car verification.
- **Automated tests:** synthetic short TASU status byte classification and existing health/transport regressions; CI verification required.


## v0.1.22 — short TASU envelope marker/length audit (2026-11-23)
- **Implemented on feature branch:** for explicit readTrace requests to existing DDE/EGS DID pairs, short-header event envelopes are further classified by the existing TASU 0x7F rejection marker versus unknown marker, declared length consistency, and length bands (0-4, 5-8 bytes). Only boolean/numeric counters are exposed. No raw byte contents, statuses, reason codes, VIN, UDS values or helper lines are persisted. A short reject marker is an observation, NOT an identified ECU response or proof of an exact TASU rejection reason. The legacy decoder and successful read path remain unchanged.
- **In-car baseline (v0.1.21 + Diagnostics v0.1.24):** first run 15 PASS / 2 FAIL / 5 SKIP: DDE and EGS each `ack 3/3`, `shortHeader 3`, timeout 3; second run 17 PASS / 0 FAIL / 5 SKIP: both responded on attempt 1. 1-second inter-ECU pause did not eliminate first-run failure. v0.1.22 has not been tested in-car.
- **Automated:** targeted synthetic short-envelope classification and existing transport/health regressions; verify CI before MGU test. Defaults, CDS/IPC, production access disabled, read gaps and ECU request counts unchanged.


## v0.1.21 — TASU malformed event classification (2026-11-23)
- **Implemented (feature branch):** retain the v0.1.20 sanitized trace API and classify previously aggregated malformed TASU event envelopes as missing, non-hex, odd hex length, short frame, short header or declared-length overflow, using counters only. No raw frames, VIN, hex contents or ECU values are retained; decoding/response acceptance is unchanged.
- **In-car baseline (v0.1.20 with Diagnostics v0.1.23):** first run DDE/EGS both FAIL after 3/3 reads with `ack 3/3`, `ecu 0`, `malformed 3`, `timeout 3` each; immediate second run both PASS on first attempt (ACK 1/1, ECU 1, malformed 0); user observed third FAIL with malformed 3. The correlation is known, root cause unverified.
- **Automated:** frame taxonomy checks added to transport trace regression. **In-car v0.1.21: not verified.** Transport read timeout, retry count, UDS allowlist, regular read and CDS engine are not changed.


## v0.1.20 — explicit sanitized DDE/EGS TASU response trace (2026-11-23)
- **Implemented on feature branch:** only explicit `readTrace` calls for existing allowlisted DDE 0x12/0x44BB and EGS 0x18/0x6000 capture boolean TASU command acknowledgement and bounded counts of matching ECU frames, other ECU frames, DID mismatches, UDS negative/pending frames, malformed frames and timeout. No raw UDS replies, VIN, payloads or helper lines are added to diagnostic reports. Trace reads bypass the 500 ms positive cache to guarantee fresh observations, retain the 200 ms serialized read gap and existing 3.5-second per-request timeout; default `read` remains unchanged. Production access remains disabled and controls are absent.
- **Vehicle evidence before change:** Diagnostics v0.1.22 showed both DDE and EGS time out after three attempts (~11.7s each) while IHKA, BDC, ACSM and CDS passed. Root cause is unknown; results do not establish ECU wake state or valid sensor decoding.
- **Automated:** isolated TASU read trace simulation and diagnostics regression tests added to CI. **In-car:** v0.1.20 not yet tested; confirm main service health, existing CDS/IPC and DDE/EGS trace results after CI success.


- **MGU report 2026-11-23 (Data Tool v0.1.19 + Diagnostics v0.1.21):** 15 PASS, 2 FAIL, 5 SKIP. Tool starts and CDS staged numeric checks/shared stream/multi-consumer test pass. DDE and EGS returned `No matching response` after ~3.5 seconds each, whereas IHKA/BDC/ACSM responded. This is a read timeout/no matching UDS reply, not a verified tool regression or decoded ECU failure. The optional DAC probe remains disabled. Preserve current read parameters pending repeat parked test with drivetrain awake. CI detected and corrected stale passive report version 0.1.18 in service (status correctly reported 0.1.19); no change to UDS transport logic.

## v0.1.19 — opt-in UID/DAC experimental status socket (2026-11-23)
- **Implemented on development branch:** optional experimental secure socket may be assigned to an explicitly configured non-root UID using `BMRMODZ_SECURE_IPC_EXPERIMENT=1` plus `BMRMODZ_SECURE_IPC_TARGET_UID`. The socket remains `0600` and **status-only**; all CDS/UDS/control operations remain denied. No target UID is hardcoded, no peer credentials are claimed, and no production API is enabled.
- Default boot and legacy diagnostic socket remain unchanged. Bad UID, failed socket ownership setup, or unavailable optional socket must not block main tool health; diagnostics keep showing production disabled. UID ownership is kernel filesystem access control, **not** proof of authenticated peers or a per-app policy. The observed app UID 12252 is not assumed stable across installations.
- **Automated:** DAC metadata checks, invalid UID, child-process health regression, and 0.1.19 version assertions. **In-car:** new opt-in socket NOT verified. Do not set experimental environment variables in production deployments; leave secure IPC disabled until an explicitly controlled parked test is designed.


- **In-car report received 2026-11-23 (v0.1.18 / Diagnostics v0.1.20):** 17 PASS / 0 FAIL / 4 SKIP; UDS responses, staged CDS samples and two-consumer lifecycle passed. Tool UID 0/GID 0, legacy socket mode 0666, app UID/GID 12252. Peer authentication and production permissions remain unverified. User-supplied diagnostic results; decoded sensor semantics and vehicle controls not verified.

## v0.1.18 — passive legacy socket exposure reporting (2026-11-23)
- **Implemented on development branch:** report the legacy diagnostic socket's access bits in the existing passive identity survey as `legacySocketWorldAccessible`, explicitly retaining `legacySocketProductionSafe:false`. No new listener, credentials claim, privilege change, or vehicle requests.
- Correct the stale passive diagnostic report version (was hardcoded `0.1.5`), with regression assertions. CDS, UDS, startup compatibility, and secure IPC disabled-by-default remain unchanged.
- **Automated:** tests included; CI status must be checked. **In-car:** not yet verified. Legacy socket accessibility is observational and does not establish client authentication.

# Data Tool feasibility progress

## v0.1.17 — passive process and socket identity survey (2026-11-23)
- **Implemented on feature branch:** new read-only `identitySurvey` command returns Data Tool's own UID/GID, legacy socket mode/owner UID/GID, Node major version and whether a `getPeerCredentials` method exists on the running Node socket prototype. **No new socket, no authentication, no /proc enumeration and no startup dependency.** `peerIdentityVerified:false` and `productionAccessEnabled:false` remain explicit.
- **In-car evidence from v0.1.16 + Diagnostics v0.1.18 (2026-11-23):** 15 PASS, 0 FAIL, 2 SKIP, including healthy service and previously validated CDS/UDS/multi-consumer lifecycle; secure IPC remains intentionally disabled. App UID/GID and peer credential support were **not previously measured in-car**.
- **Automated:** mock identity and socket metadata tests, legacy service status/regressions, Diagnostics self-observation and translation tests; verify CI separately. **v0.1.17 NOT YET VERIFIED IN CAR.**
- **Next:** install Diagnostics v0.1.19 and send manual report; compare tool/app UID/GID, socket permissions and Node API capability. Observation alone is not proof of trusted peer identity. Do not enable production app consumers before authenticated peer identity or an equivalent supported secure policy is confirmed.


## v0.1.16 — installation health regression hotfix (2026-11-23)
- **Reported in-car:** installer rejected Data Tool v0.1.15 as `Data Tool is not healthy`; no journal or exact exception was available. Root cause has **not** been proven; the only new startup dependency in v0.1.15 was the experimental secure IPC listener. Prior v0.1.14 plus Diagnostics v0.1.16 successfully completed 15 PASS / 0 FAIL / 1 SKIP.
- **Implemented on branch:** restore legacy 0.1.14-style health by disabling optional secure IPC startup by default. Only `BMRMODZ_SECURE_IPC_EXPERIMENT=1` opts into a separate owner-only fail-closed listener; synchronous setup failure falls back to disabled endpoint without stopping Data Tool. Existing `ctl.sock` diagnostics, CDS and UDS are unchanged. `securityCheck` reports `present:false` and production access disabled; no attempt to claim actual peer identity authentication.
- **Automated:** added actual child-process startup/health test with no secure listener and with deliberate ENOTDIR optional secure-listener failure; existing security endpoint tests remain. CI to verify. **v0.1.16 is NOT yet verified on MGU.**
- **Next:** install 0.1.16 / Diagnostics 0.1.18, run 17 diagnostic checks and send report. The secure IPC audit SKIP is expected, alongside staged CDS active-config SKIP. Investigate MGU journal/installer logs before claiming exact v0.1.15 failure mechanism.


## v0.1.15 — fail-closed IPC security foundation (2026-11-23)
- **Implemented on feature branch:** separate owner-only `/run/bmrmodz-data-tool/secure.sock` (0600) exposes only `securityStatus`. All requests for CDS/UDS readings, subscriptions, generation or controls are rejected at that endpoint; no process name or JSON consumer ID is trusted as authentication. The existing `ctl.sock` remains unchanged for backward-compatible experimental Diagnostics. Its current 0666 mode means production apps MUST NOT be enabled yet.
- **Security gate:** standalone Node 18 `net.Socket` has no established, deployment-verified peer-credential integration in this project. Secure endpoint explicitly reports `peerIdentityVerified:false` and `productionAccessEnabled:false`. The diagnostic `securityCheck` reports owner-only permission as readiness, not application authentication. No credential spoofing workaround, no production DPF/OSA/CC consumer IDs, no ACL or vehicle controls.
- **In-car evidence (v0.1.14 + Diagnostics v0.1.16):** 15 PASS, 0 FAIL, 1 SKIP; the two test-only CDS consumers shared one stream, survived first release, expired and restarted. This establishes CDS lifecycle only; it does NOT validate the new secure socket.
- **Automated:** 0600 socket, fail-closed operation allowlist, existing legacy API regression and diagnostic security-state assertions. Check CI separately. **v0.1.15 NOT VERIFIED IN CAR.**
- **Next:** test secure socket mode and legacy diagnostics on MGU; then research deployed app UIDs/groups and native Linux peer credentials before any production authentication or socket mode change. Do not enable production calls merely because the owner-only socket exists.


## v0.1.14 — test-only multi-consumer CDS manifest (2026-11-23)
- **Implemented on feature branch:** `data-manifest.json` declares CDS signals and two bounded diagnostic test consumers with independent 3-second leases. The one shared CDS worker continues until the last lease expires or is released. Each consumer receives only its manifest-declared fields and requires an active lease. Stopped streams clear cached values. The manifest is test-only and does **not** authorize production DPF, OSA or CC; the current world-accessible local socket is not yet an authenticated per-app interface.
- **In-car evidence from v0.1.13 + Diagnostics v0.1.15:** 14 PASS, 0 FAIL, 1 SKIP. The single-consumer streaming test confirmed repeated cache refresh and clean stop in the real vehicle. Multi-consumer concurrency and lease expiry/restart are **not yet verified in car**.
- **Automated:** independent consumer lifecycle, filtering, lease expiry, single-worker behavior, and manifest allowlist tests; CI results to verify. Companion Diagnostics v0.1.16 adds a controlled two-consumer test (no raw vehicle readings in uploads).
- **Next:** install both and run parked-car Diagnostics + Send report. Do not connect production apps or rely on consumer ID strings as authentication until caller identity and access policy are designed.


## v0.1.13 — experimental request-driven shared CDS Data Engine (2026-11-23)
- **Implemented on feature branch:** a single demand-started long-lived CDS worker creates one SOME/IP proxy subscribing to engine oil temperature, coolant temperature, and RPM. The Data Tool manages a 3-second renewable lease for the experimental `diagnostics` consumer, a 2-second freshness window, timestamped cache and update counters. Read-only `cdsDemand`, `cdsSnapshot`, `cdsRelease` operations. Snapshots/status do not renew leases; no boot-time CDS activity, automatic startup, or new ACL registration. Expired/released subscriptions stop the worker. A worker exit does not automatically restart until new demand.
- **In-car evidence from v0.1.12 / Diagnostics v0.1.14:** both staged signal samples passed finite-number checks and five ECU UDS echoes passed. The active CDS configuration path remained absent, which is expected because the tests use staged files. This does not prove sustained subscriptions or cross-application arbitration.
- **Automated:** fake process tests for on-demand startup, one shared worker, snapshot freshness, renewable lease, stop/restart and expiry; run GitHub CI. **v0.1.13 continuous engine NOT VERIFIED IN CAR.** The API currently authorizes only the diagnostic consumer, not production apps.
- **Next:** parked-car Diagnostics v0.1.15 Run diagnostics / Send report to verify streaming, freshness and shutdown before designing per-app Data Manifest and multi-consumer permissions.


## v0.1.12 — validate CDS numeric payloads (2026-11-23)
- **Implemented on feature branch:** isolated CDS worker now requires finite number values for `temperatureEngineDrive`, `temperatureEngineOilDrive` and `actualValueRPMEngineCrankshaft` before marking a sample usable. Zero is valid. Missing/NaN/Infinity/non-number fields produce `value-invalid` with field-validity flags but no raw payload. No speculative physical ranges or units are enforced.
- **In-car evidence from v0.1.11 / Diagnostics v0.1.13:** both staged CDS probes returned native samples (13 PASS, 1 FAIL due to inactive config, 0 SKIP); numeric payload correctness was not tested. Five ECU echo checks passed. Explicit ACL registration remains unverified and is not required for these successful staging samples.
- **Automated:** worker mock numeric/zero/missing-field regressions and companion report tests; verify CI separately. **v0.1.12 NOT YET VERIFIED IN CAR.**
- **Next:** install v0.1.12 and Diagnostics v0.1.14; Run diagnostics and Send report. Proceed to shared continuous data broker only after verifying usable data and operating constraints.


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
