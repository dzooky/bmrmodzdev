# BMRMODZ Data Tool Diagnostics v0.1.4

Development-only MGU OAP application, installed alongside experimental Data Tool v0.1.5. This application never opens TASU or CDS connections itself. It uses the local Unix socket provided by the systemd tool.

## Operation
1. Park securely. Install **both** components from an approved test build, not merely a draft GitHub PR.
2. Open the app. The first tab is Info with the required development notice.
3. Select Diagnostics and press **Run diagnostics**. This runs allowlisted read-only operations against Data Tool and checks the app process's network interfaces, route table and TCP connectivity to dzooky.eu:443. Network checks also run if the Data Tool is unavailable. Nothing runs automatically.
4. On Results, review individual PASS/FAIL/SKIP states. Missing tool, module or configuration produces an explicit failure or skip.
5. Press **Send report** to POST the sanitized JSON over HTTPS to `https://dzooky.eu/brmmodz.php`. The receiver should return an anonymous report ID. This button never sends automatically. Currently no upload token is sent. An MGU internet route, TLS trust and an adapted receiver are necessary.
6. Press **Export report** to save the sanitized JSON in the app data folder and show a QR code carrying a compact summary. Scan it on a phone and paste the summary into the development chat. No internet connection or SSH is needed to share the compact summary. Full JSON is only available from the app data directory by a separately supported file-transfer method.

## Public HTTPS receiver deployment (not yet verified)

The prior PHP receiver in `server/bmrmodz.php` was designed for the isolated home LAN. Copying it unchanged to `dzooky.eu/brmmodz.php` will reject public client addresses with HTTP 403 because it restricts `REMOTE_ADDR` to `192.168.0.x`. It may also be unsafe to store JSON files inside a publicly accessible web root: random names and `index.html` are NOT access controls. Before enabling the public receiver, configure restrictive upload authorization or other abuse controls, preserve schema/size/redaction checks, and prohibit HTTP retrieval of saved JSON reports (prefer storage outside the document root). The receiving server should require HTTPS. None of these hosting changes can be inferred from an MGU-side code change. The test application currently sends no authentication token, so it cannot satisfy a token-based receiver until explicitly configured.

MGU client upload and public endpoint communication are **NOT verified**. The user observed `ENETUNREACH` to the old LAN endpoint; switching to a public DNS name does not by itself repair a missing network route.

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
