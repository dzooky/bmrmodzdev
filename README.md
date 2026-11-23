# BMRMODZ DEV

Isolated temporary MGU Store repository for testing **Data Tool Diagnostics v0.1.2** and **BMRMODZ Data Tool v0.1.5**.

Add source in MGU Store: `dzooky/bmrmodzdev` (default branch `main`).

This source intentionally includes only the experimental diagnostic app, the Data Tool, and the required MGU App Kit runtime/build files. It is not a replacement for `dzooky/bmrmodz`.

The diagnostic app sends sanitized read-only reports manually via HTTP to `192.168.0.10/bmrmodz.php` on the isolated home LAN. No token or public endpoint. No functionality is verified in a real vehicle until tested.

**Safety:** Keep the vehicle parked. This experimental tool should not be used while driving.
