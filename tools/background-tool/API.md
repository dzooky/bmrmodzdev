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
