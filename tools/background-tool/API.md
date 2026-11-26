# Background Tool API v1 — open local registration

Socket: /run/bmrmodz-background-tool/ctl.sock. UTF-8 newline-delimited JSON, one request per connection. No tokens; appId is a voluntary namespace, not authentication. Any local client can impersonate another app. Never expose this socket over a network. Reserved namespaces: diagnostics and background-test.

Operations: register, update, unregister, status. All require api:1 and appId (lowercase ASCII, 1–32 characters). Register/update are idempotent upserts: identical rule preserves state, changed rule resets it. Rules survive UI exit and service restart. Unregister removes demand when no other rule needs it. Status with appId returns scoped rule states; status without appId returns global health. Existing diagnostic testStart/testStop remain unchanged.

Example:
```json
{"api":1,"op":"register","appId":"example","rule":{"api":1,"appId":"example","ruleId":"reference","fields":[{"name":"dpf.b57.request","freshnessMs":5000}],"condition":{"field":"dpf.b57.request","op":"gte","value":0},"trigger":"once","actions":[{"type":"notification","name":"kombi","payload":{"durationMs":6000,"ttlMs":10000,"segments":[{"text":"Reference OK","color":"#00FF00","blinkMs":0}]}}]}}
```
```json
{"api":1,"op":"status","appId":"example"}
{"api":1,"op":"unregister","appId":"example","ruleId":"reference"}
```
Only named Data Tool catalog fields are evaluated; unsupported fields cannot trigger. Comparisons use raw numeric values, eq/ne/gt/gte/lt/lte and nested all/any. Freshness 5000–300000 ms; last valid sample usable at most 3x requested interval. Once means registration lifetime, not drive cycle; rising fires on initial true or false-to-true. Invalid samples do not reset state. State committed before dispatch, no automatic retry after ambiguous failure.

Only KOMBI notification actions enabled; no arbitrary shell, actuator or vehicle write. App provides localized text, color, duration 500–15000 ms, TTL 1000–60000 ms, 1–8 segments, total 90 characters, blink 0 or 125–3000 ms. Notification Tool owns rendering. Limits: 64 rules globally, 8 per app, 11 distinct public fields (one diagnostic slot), 4 actions/rule, 20 KB request, 8 concurrent connections. Queue acceptance is not visual confirmation. Open API is experimental, not yet verified in car.


v0.1.3: CDS fields use decoded engineering values (e.g. engine.oilTemperature in °C); DPF comparisons retain raw numeric values. Independent demand sessions are combined for rule evaluation; unavailable scope does not suppress rules using valid samples from another scope.


v0.1.4: optional `rearm` condition for rising triggers. Once fired, the rule remains latched until a valid sample satisfies rearm; invalid data never re-arms. Existing rules without rearm are unchanged.


v0.1.5: `trigger: state` with up to eight ordered states `{id,condition,actions,from?,repeat?}`. First matching state wins; `from` restricts entry actions to listed previous state IDs. `repeat:{delayMs,intervalMs,actions}` runs only while matching that state; missed intervals are not replayed. State ID and next repeat are persisted. All declared samples must be valid. `bitSet`/`bitClear` compare unsigned 32-bit masks. Existing rising/once rules unchanged. All state and repeat actions remain notification-only on the public API.

## IHKA temperature inputs (v0.1.6)

Background Tool accepts the following Data Tool public-scope fields **only when an application registers a rule using them**: `climate.frontLeftFootwell`, `climate.frontRightFootwell`, `climate.rearLeftFootwell`, `climate.rearRightFootwell`. Specify `freshnessMs >= 5000`. Each uses the decoded °C `value`, never the UDS raw integer, and fails closed on missing/invalid/stale data. Scope `ihka` is independent of existing CDS and DPF demand. **Notification-only actions remain enforced; no climate control commands are enabled.**
