# Data Tool API v1 — development contract

Open to local MGU applications regardless of repository. App ID is an informational label, not proof of identity. No installer token required. No arbitrary ECU/DID or vehicle control operations.

**Status:** experimental runtime v0.1.54, vehicle validation pending. Connect to /run/bmrmodz-data-tool/ctl.sock using newline-delimited JSON. First send an apiHello object with api:1 and appId; subsequent messages are apiRequest envelopes with a request object. One outstanding request per connection. Runtime transport and background tests precede DPF DEV migration.

A connection owns its session independently of its label. Prototype operations (JSON objects):
- `{"op":"catalog"}`: supported named fields, minimum intervals and limits for the detected B57/B47 profile.
- `{"op":"demand","fields":["dpf.b57.request"],"freshnessMs":{"dpf.b57.request":5000}}`: replace this session's demand and renew its 15-second lease.
- `{"op":"snapshot"}`: passive cache snapshot, validity, ageMs, sampledAt and unsigned raw numeric sample (null if invalid).
- `{"op":"release"}`: remove demand; disconnect removes session.

Initial conservative limits: eight sessions, twelve fields/session, ten operations/session/second, one scheduler tick/second globally, 5 s minimum for regeneration request/mode, 60 s for other DPF fields, maximum 300 s. Limits are provisional and require measured vehicle validation. No freshness guarantee under overload. Unknown fields and invalid requests are rejected. Session expiry frees capacity. No source-based restrictions.

The initial prototype uses profile-specific field names and numeric raw values. Before public runtime release, document stable engineering units and decoding, support bounded connection framing, timeouts, aggregate IPC limits, reconnect handling and fairness under overload. The same ctl.sock is used with a separate connection-scoped protocol. See public-client.js. Legacy diagnostic operations remain separate; their pre-existing limits are not a security guarantee.
