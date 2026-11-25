# Data Tool API v1 — development contract

Open to local MGU applications regardless of repository. App ID is an informational label, not proof of identity. No installer token required. No arbitrary ECU/DID or vehicle control operations.

**Status:** experimental runtime v0.1.57, vehicle validation pending. Connect to /run/bmrmodz-data-tool/ctl.sock using newline-delimited JSON. First send an apiHello object with api:1 and appId; subsequent messages are apiRequest envelopes with a request object. One outstanding request per connection. Runtime transport and background tests precede DPF DEV migration.

A connection owns its session independently of its label. Prototype operations (JSON objects):
- `{"op":"catalog"}`: supported named fields, minimum intervals and limits for the detected B57/B47 profile.
- `{"op":"demand","fields":["dpf.b57.request"],"freshnessMs":{"dpf.b57.request":5000}}`: replace this session's demand and renew its 15-second lease.
- `{"op":"snapshot"}`: passive cache snapshot, validity, validityMs (three times requested freshnessMs), ageMs, sampledAt and unsigned raw numeric sample (null if invalid).
- `{"op":"release"}`: remove demand; disconnect removes session.

Initial conservative limits: eight sessions, twelve fields/session, ten operations/session/second, one physical scheduler read start/second globally; idle eligibility checks every 250 ms, 5 s minimum for regeneration request/mode, 60 s for other DPF fields, maximum 300 s. Limits are provisional and require measured vehicle validation. No freshness guarantee under overload. Unknown fields and invalid requests are rejected. Session expiry frees capacity. No source-based restrictions.

The initial prototype uses profile-specific field names and numeric raw values. Before public runtime release, document stable engineering units and decoding, support bounded connection framing, timeouts, aggregate IPC limits, reconnect handling and fairness under overload. The same ctl.sock is used with a separate connection-scoped protocol. See public-client.js. Legacy diagnostic operations remain separate; their pre-existing limits are not a security guarantee.

## CDS scope (DEV)
Send hello with an additional `scope: "cds"` property (client connect third argument). No DDE identification is performed. Fields: engine.oilTemperature, engine.coolantTemperature, engine.rpm; minimum requested interval 1000 ms. Snapshot includes raw, decoded value, unit, sample timestamp and three-times-requested validity. The existing CDS worker still acquires both signal groups at its original cadence. CDS and UDS use separate connections; mixed demand on one connection is not supported. Vehicle validation pending.
