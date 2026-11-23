# Data Tool Diagnostics progress

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
