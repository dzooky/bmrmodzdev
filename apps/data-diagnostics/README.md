# BMRMODZ Data Tool Diagnostics v0.1.8

Development-only MGU OAP application, installed alongside experimental Data Tool v0.1.6. Since application v0.1.5, its manifest sets `mguInternet: true`, matching Spritmonitor's MGU Store internet-access declaration; MGU network reachability still requires real-car verification. This application never opens TASU or CDS connections itself. It uses the local Unix socket provided by the systemd tool.

In v0.1.6, failed manual uploads show HTTP status, response content type, a short sanitized error excerpt, and preserve a 4 KB maximum response size. No upload is automatic. In v0.1.7 the corrected BMR endpoint is used and upload feedback is shown in a separate footer beneath results, with totals at the top.

## Operation
1. Park securely. Install **both** components from an approved test build, not merely a draft GitHub PR.
2. Open the app. The first tab is Info with the required development notice.
3. Select Diagnostics and press **Run diagnostics**. This runs passive SOME/IP setup checks (presence of generator/catalog, tool manifest/config, UID and unverified ACL status) and allowlisted read-only operations against Data Tool and checks the app process's network interfaces, route table and TCP connectivity to dzooky.eu:443. Network checks also run if the Data Tool is unavailable. Nothing runs automatically.
4. On Results, review individual PASS/FAIL/SKIP states. Missing tool, module or configuration produces an explicit failure or skip.
5. Press **Send report** to POST the sanitized JSON over HTTPS to `https://dzooky.eu/bmrmodz.php`. The receiver should return an anonymous report ID. This button never sends automatically. Currently no upload token is sent. An MGU internet route, TLS trust and an adapted receiver are necessary.
6. Press **Export report** to save the sanitized JSON in the app data folder and show a QR code carrying a compact summary. Scan it on a phone and paste the summary into the development chat. No internet connection or SSH is needed to share the compact summary. Full JSON is only available from the app data directory by a separately supported file-transfer method.

## Temporary public HTTPS receiver

Deploy `server/bmrmodz.php` as `https://dzooky.eu/bmrmodz.php`. It is compatible with v0.1.4's manual HTTPS POST and requires no upload token. The server creates a sibling `bmrmodz_reports` directory if PHP has permissions; otherwise create it manually, writable by the webserver PHP user. It enforces 30 accepted reports/hour and a total of 500 reports.

Stored reports are named `<24-hex-id>.php` (not `.json`), with an executable HTTP-404 guard on the first line and the JSON beginning on the second line. **Verify on the real host** that requesting one report by direct URL returns 404, and that PHP code is always executed within the report folder. If the server ever serves PHP files as static source, it will expose stored reports. Do not use this public-webroot approach for production: storage outside the document root and real authentication are strongly preferred. The endpoint is currently unauthenticated and susceptible to anonymous uploads within the configured quotas; use it only for temporary testing and remove or restrict it afterward. The script rejects requests unless PHP reports HTTPS; on TLS-terminating reverse proxies, ensure the PHP environment is configured correctly rather than trusting arbitrary `X-Forwarded-Proto` headers.

Local validation only: PHP lint succeeded, test POST returned HTTP 201 and direct access returned HTTP 404 under a simulated HTTPS PHP server. No successful upload from the vehicle or the public hosting provider is yet confirmed.

## Test coverage
- Service startup and socket API.
- Passive SOME/IP module/catalog/config checks, isolated module load.
- DDE `22 44BB`, EGS `22 6000`, IHKA `22 D8D7`, BDC `22 D074`, ACSM `22 4053`.
- CDS `statusEngineTemperature` and `statusEngineSpeed2` via the isolated service worker.
- App-process IPv4 interfaces, read-only `/proc/net/route` availability and TCP connect to `dzooky.eu:443` (4-second timeout). The resulting three PASS/FAIL entries appear in Results and the sanitized JSON report; these checks do not send a report.
- No write/routine controls. CC 0x31 and 0x2E are intentionally **not** triggered.
- No autonomous background polling. This is a **first-stage smoke test**, not full coverage of every DID or signal.

## Interpretation
A PASS means a matching response was seen, not that the decoded vehicle value is correct. The report contains no raw UDS bytes, VIN, VO/FA, GPS coordinates or secrets. Actual vehicle operation and optical display require explicit in-car confirmation. Tests should run only while stationary; driving concurrency tests are future work.
