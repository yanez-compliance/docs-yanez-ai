# Environments

Every Yanez product uses the same two environments. Build and certify against
Test, and send live traffic to Production.

## Base URLs

| Environment | Base URL | Use for |
| --- | --- | --- |
| Test | `https://ptest.yanez.ai` | All development and certification work. |
| Production | `https://yid.yanez.ai` | Live traffic. |

The YID partner backend API and the Pulse agent authorization routes both use
these base URLs. YID partners go live after the
[production checklist](../yid/production-checklist.md).

## Receipt Issuer

Pulse receipts carry an `iss` claim naming the environment that minted them.
Configure your verifier's expected issuer with the value for the environment you
are verifying against — a Test receipt checked against the Production issuer
fails as `bad_signature`.

| Environment | Issuer |
| --- | --- |
| Test | `https://ptest.yanez.ai` |
| Production | `https://yid.yanez.ai` |

The issuer is deployment configuration that happens to match the base URL today;
treat it as a separate setting. See [Receipts](../pulse/receipts.md).

## Deep Link Base

YID partner deep links append a signed query string to a per-environment HTTPS
base. See [Deep Link Signing](../yid/deep-link-signing.md#url-format).

| Environment | `DEEP_LINK_BASE` |
| --- | --- |
| Production | `https://yid.yanez.ai/open` |
| Partner test (ptest) | `https://ptest.yanez.ai/open` |

## Registration QR Codes

Registering in the YID app requires scanning a QR code. Generate one from the site
for your environment, or from a partner's site:

| Environment | QR code source |
| --- | --- |
| Test | `https://qrcode-ptest.yanezcompliance.com`, or a partner test site (Skylo, dFusion) |
| Production | `https://qrcode.yanezcompliance.net`, or a partner production site (Skylo, dFusion) |
