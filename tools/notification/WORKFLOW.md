# Notification Tool — approved DEV workflow

- Preserve the existing single KOMBI panel at x=745, y=539, 430x76 and renderer protocol. No HUD or additional panel in this stage. Factory BC coexistence remains unverified.
- Applications supply localized text, color, per-segment blink interval (milliseconds between visibility changes; zero is solid), and total duration. Support 1–8 segments. Hidden segments retain their layout width.
- Background Tool forwards declarative automatic notifications; apps may send manual tests directly. Notification Tool owns rasterization, scheduling, FIFO, bounded input/queue, deduplication and expiry. Keep transport metadata separate from message content.
- Use a versioned local JSON API; retain the legacy RGBA API. Separate renderer from scheduling and keep future output adapters possible. No app-specific rendering rules, priorities, HUD or speculative vehicle changes in this stage.
- Recover safely after service errors; do not replay stale messages after restart. Distinguish accepted, queued, renderer submission, failure and expiry; renderer submission is not actual display confirmation.
- First validate independent text rendering outside OAP on the parked MGU. Preserve the current production path and test legacy compatibility. Do not migrate apps until independent rendering and Background Tool integration have been verified in the car.
- Record implementation, CI and actual vehicle verification separately in PROGRESS.md.
