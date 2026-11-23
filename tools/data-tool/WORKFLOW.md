# Data Tool — approved workflow and development guardrails

**Scope:** Only `bmrmodz-data-tool` and its companion Data Tool Diagnostics app in `dzooky/bmrmodzdev`. This is an agreed **target workflow**, not a claim that all features are implemented or verified. Read this file before changing Data Tool, its transport, its diagnostics, or connecting a consumer app. Do not apply these requirements as a mandate to refactor DPF, OSA, CC or any other functioning app.

## Non-negotiable development rules

1. **Preserve what works in the vehicle.** Do not silently replace or redesign an in-car-verified transport, protocol, polling strategy, source, or workflow to fix an unrelated defect. First inspect GitHub history and the last vehicle-verified baseline. A different implementation requires the user's explicit approval.
2. **One problem, one targeted change.** Identify the demonstrated failure and its earliest code change before choosing a fix. Never stack speculative warm-ups, reordered ECU reads, retry schemes, new timeouts, or alternate transports on a previously successful path. Evidence is required for each intervention.
3. **Experiments are isolated.** New ECU/DID probes, diagnostic order experiments, security/IPC feasibility, and data-provider experiments must not change the established baseline run. Report unknowns as unknown; do not call a hypothesis a root cause.
4. **Regression protection is proportional.** Test the touched read or function plus one previously successful reference read; verify existing clients were not disturbed. Run broader transport-level tests only if the shared transport changes; full-system/in-car retesting only for major architecture changes or a release requiring it. Do not repeatedly ask for full car test runs for minor changes.
5. **Never equate CI or service health to ECU success.** Report *actual validated ECU responses* separately from passive/service/security PASS and from SKIP. Track implementation, offline automated tests, and explicit in-car verification separately.
6. **Review approved workflow before proposing redesign.** Avoid reopening decisions already made unless new evidence demonstrates a concrete conflict. If a requested fix would affect the stable path, explain the impact and obtain approval before changing it.
7. **Do not modify the source of consumer applications while working on this tool** unless the user explicitly authorizes a separate app change. Preserve original app read paths until a tool migration is independently validated.

## Approved consumer data workflow (target architecture)

- **Data Tool owns acquisition.** The Tool schedules, serializes and performs ECU/signal acquisition, controls transport lifecycle, manages subscriptions, deduplicates concurrent requests, and maintains last validated values with timestamps and freshness status. Application code must not dictate the underlying acquisition order or bypass the scheduler when using Tool data.
- **Applications declare demand; they do not drive transport.** A new consumer declares its required signals/DIDs and freshness requirements. The Tool incorporates *only genuinely new demand* into its managed workload without changing existing supported reads or clients. An added application must not disturb established acquisition.
- **Shared reads and cache.** Multiple consumers needing the same field share the result; do not duplicate ECU requests. A faster UI refresh reads the latest cached value when nothing newer has arrived, without creating a new physical ECU request on every render.
- **Three independent rates:** (1) requested data freshness, (2) actually sustainable measured data-acquisition rate, and (3) UI refresh rate. Never assume a 333 ms UI refresh requires or proves 333 ms ECU acquisition.
- **Freshness and error honesty.** Cache entries include sample time/age and validity; stale, missing and failed values must be identified explicitly, not reported as fresh successes. A consumer receives the last valid value only subject to an explicitly defined freshness policy.
- **No speculative ECU ordering policy.** A serialized queue is agreed, but there is *no established proof* that successful reads require a fixed cross-ECU order. Do not add or impose order dependencies from assumptions. Preserve the last successful diagnostic baseline until evidence warrants a specific change.
- **Background demand is distinct from foreground display.** The Tool should acquire only the minimum data justified by active consumer needs, including any approved background-only signals. Do not infer that all app screens or functions need continuous high-rate polling. Detailed background scheduling is still subject to verification.
- **Consumer isolation and access control.** Only approved demands may affect the Tool. Keep existing fail-closed service/authentication gates; no production app-data gateway until app identity and access controls are proven. A conceptual consumer contract does not authorize exposing unauthenticated data endpoints.

## Adding an application / signal: compact acceptance workflow

1. Inspect latest `AGENTS.md`, this workflow, both Tool/Diagnostics `PROGRESS.md` files, relevant implementation and the most recent *in-car successful* baseline.
2. Record which data are already produced versus new, expected freshness, UI refresh frequency, and whether cache is acceptable. Avoid changing already-supported reads.
3. Validate **only** new/affected acquisition and compare with a small previously working reference. Measure actual achievable update frequency and impact on existing clients rather than assuming performance.
4. If the reference breaks, stop the migration and restore the previous working path. Isolate investigation in a separate experiment. Do not compensate by redesigning established acquisition.
5. Update PROGRESS with implemented / CI-tested / in-car-verified status and concrete remaining unknowns. Do not claim deployment readiness from unit tests.

## Current implementation reality (2026-11-24, source of truth: GitHub)

- **Implemented, offline-tested:** read-only allowlisted UDS `read` API, one serial service queue with 200 ms spacing, concurrent request coalescing, and short 500 ms successful-read cache in `service.js`; request-driven CDS engine with leases and freshness information in `cds-engine.js`.
- **Experimental / not production consumer integration:** `data-broker.js` is an internal foundation and has **no public authenticated per-app socket handler**. Current CDS `data-manifest.json` lists `diagnostics` consumers, not a validated DPF/OSA/CC subscription workflow. A cross-app demand/freshness scheduler and long-lived cross-consumer cache per agreed target still require design/verification.
- **Latest vehicle outcome:** Diagnostics 0.1.44 had **0/7 real ECU UDS reads PASS** (17 other PASS were mostly passive checks); TASU envelope 0x21 observed. Tool 0.1.38 / Diagnostics 0.1.46 recovery and trace changes are implemented and CI-tested but *not verified in car*. Last recorded positive reference was Tool 0.1.35 + Diagnostics 0.1.40 with 23 PASS / 0 FAIL / 5 SKIP, including successful DDE/EGS/CDS checks. The exact cause of later ECU failures is **unproven**.
- **Next priority:** restore and isolate the known successful before-sleep/after-wake diagnostic acquisition as the reference, without adding new transport, ordering, polling or recovery experiments. Observe and compare a minimally scoped real-car result before reconnecting consumer apps. No code fix or vehicle verification is implied by this document.

## Where to maintain decisions

Keep this workflow as the approved contract. Log version-specific progress and observed regressions in `tools/data-tool/PROGRESS.md` and `apps/data-diagnostics/PROGRESS.md`. If the user changes the workflow, update this document first; do not quietly override it in code.
