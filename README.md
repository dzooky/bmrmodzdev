# BMRMODZ DEV

Isolated temporary MGU Store repository for testing **Data Tool Diagnostics v0.1.5** and **BMRMODZ Data Tool v0.1.5**.

Add source in MGU Store: `dzooky/bmrmodzdev` (default branch `main`).

This source intentionally includes only the experimental diagnostic app, the Data Tool, and the required MGU App Kit runtime/build files. It is not a replacement for `dzooky/bmrmodz`.

The diagnostic app sends sanitized read-only reports only manually via HTTPS to `https://dzooky.eu/brmmodz.php`. The receiver requires a separate public-server configuration and security controls; the prior LAN-only PHP file is not directly compatible. No token is currently sent by the app. No functionality is verified in a real vehicle until tested.

**Safety:** Keep the vehicle parked. This experimental tool should not be used while driving.
