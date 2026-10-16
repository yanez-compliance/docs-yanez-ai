# Callback Verification

After the user completes a Yanez flow, YanezYID POSTs the signed result
directly to the partner backend's callback URL — not through the client. The
callback may arrive from a different device (cross-device QR scan).

The callback endpoint is **not** authenticated by the user's session. Its trust
comes entirely from the single-use challenge: the `request_id` must map to a
pending, unexpired challenge that the backend issued, and the signed bytes must
equal that challenge exactly.

## Callback Payload

This section and [Verification Steps](#verification-steps) describe links
without `terms`. For a link with `terms`, see [Signed Decisions](#signed-decisions).

YanezYID POSTs `application/json`:

```json
{
  "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "yid": "<stable unique yid>",
  "message": "<the exact base64url message from the deep link>",
  "keys": [
    { "threshold_tier": "low",    "group_public_key": "0x<48-byte G1 hex>", "eth_address": "0x<EIP-55>" },
    { "threshold_tier": "medium", "group_public_key": "0x<48-byte G1 hex>", "eth_address": "0x<EIP-55>" },
    { "threshold_tier": "high",   "group_public_key": "0x<48-byte G1 hex>", "eth_address": "0x<EIP-55>" }
  ],
  "matched_tier": "high",
  "signature": "0x<96-byte G2 hex>"
}
```

| Field | Notes |
| --- | --- |
| `request_id` | Correlates the callback to the challenge the backend issued. |
| `yid` | Stable unique Yanez ID for the user. |
| `message` | The exact `message` value from the deep link, base64url-encoded. |
| `keys` | One entry per threshold tier. The app always sends **all** registered tiers (enrollment and step-up alike); for step-up only the `matched_tier` entry is strictly required to verify. |
| `matched_tier` | The tier whose key produced `signature`. |
| `signature` | A single BLS12-381 G2 signature (96 bytes), produced by the matched tier's key. |

Successful callbacks include both `matched_tier` and `signature`. In `redirect`
mode, parse them as optional query parameters: if either is absent, the callback
cannot pass [Verification Steps](#verification-steps) 3–4.

The callback carries no verification-status flag. **The backend MUST
independently verify the BLS signature (see [Verification
Steps](#verification-steps)) and never trust any client-asserted "verified"
state.**

## Delivery Modes

The deep link's `method` parameter selects how YanezYID returns the result:

| `method` | Delivery |
| --- | --- |
| `post` | The payload above is sent as an `application/json` POST body to the `callback` URL. |
| `redirect` | The same fields are returned as query parameters appended to the `callback` URL (`keys` is serialized as a JSON string parameter). |

There is no callback-domain allowlist on either platform: `post` delivers to
whatever URL the signed link carries. Use an HTTPS endpoint on your own backend
that is reachable from the public internet — the request comes from the user's
phone, not from Yanez servers.

**Respond to a `post` callback with `2xx`.** YanezYID treats any `2xx` as
delivered. Any other status is shown to the user as a failed signing — a
`STATUS · TITLE` header over the message — and is never retried, so the user
must start a new signing. The app maps statuses to messages as follows; return
the specific ones deliberately or not at all:

| Your response | Return it when | What the user sees |
| --- | --- | --- |
| `2xx` | Every [verification step](#verification-steps) passes. | Success — the app dismisses silently. |
| `400` | The payload can't be parsed: missing fields, bad encoding, or an invalid `matched_tier` (step 3). | `400 · BAD REQUEST` — "Partner rejected the request." |
| `401` | The signature, keys, or message fail verification (steps 2, 4–7, or 9). | `401 · SIGNATURE REJECTED` — "Partner rejected the signature." |
| `403` | Step-up: `matched_tier` is below `required_tier` (step 8), or your policy denies the action. | `403 · STEP-UP REQUIRED` — "Additional verification required or denied." |
| `404` | `request_id` is unknown (step 1). | `404 · CHALLENGE NOT FOUND` — "Unknown or expired signing request." |
| `409` | `request_id` was already consumed — a duplicate or replayed delivery (step 1). | `409 · ALREADY USED` — "This request was already signed or is a duplicate." |
| `410` | `request_id` has expired (step 1). | `410 · CHALLENGE EXPIRED` — "This signing request has expired." |
| `5xx` | Your backend failed before it could verify. | `5xx · PARTNER ERROR` — "The partner service had an error." |
| other `4xx` | Anything else. | `4xx · REJECTED` — "Partner rejected the delivery." |

If the phone gets no HTTP response at all, the user sees `CONNECTION FAILED` —
"Couldn't reach the partner. Please try again." — which also isn't retried.

The verification steps below are identical for both modes — always verify the
signature over the decoded `message` bytes regardless of how the result arrived.

## Verification Steps

These steps apply to links without `terms`. For a link with `terms`, follow
[Verifying a Signed Decision](#verifying-a-signed-decision) instead: the
callback carries a signed envelope rather than your `message`, and you mark the
request used only after a callback passes.

All of the following must hold before the callback is accepted. Mark the
challenge consumed on first receipt, regardless of outcome — challenges are
single-use even if verification fails.

1. `request_id` maps to a stored challenge that is **not expired** and **not consumed**.
   Mark it consumed immediately.
2. Decoded `message` bytes are **byte-for-byte equal** to the canonical challenge
   the backend issued for this `request_id`.
3. `matched_tier` is a valid tier and is present in `keys`.
4. The matched key's `group_public_key` is 48 bytes; `signature` is 96 bytes.
5. **BLS verifies** `signature` against the matched `group_public_key` over the
   decoded `message` bytes.
6. For each entry in `keys`, `eth_address` equals `derive_address(group_public_key)`.
   Store the server-derived address — do not trust the client-supplied value.
7. **Enrollment only:** all tiers in `keys` pass step 6; store the full key set
   with deduplication.
8. **Step-up only:** `matched_tier ≥ required_tier`, and the matched
   `group_public_key` equals the key stored for this user and tier at enrollment.
9. *(Recommended)* Call `POST /api/partners/records/validate` to confirm the
   `(yid, group_public_key)` pair against the Yanez registry.

## BLS Verification

The signature scheme is BLS12-381 G2Basic with DST
`BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_`.

```python
from py_ecc.bls import G2Basic

PUBKEY_LEN, SIG_LEN = 48, 96

def verify_bls(pubkey_g1: bytes, message: bytes, signature_g2: bytes) -> bool:
    if len(pubkey_g1) != PUBKEY_LEN or len(signature_g2) != SIG_LEN:
        return False
    try:
        return bool(G2Basic.Verify(pubkey_g1, message, signature_g2))
    except Exception:
        return False
```

`message` is the decoded (raw bytes) value of the `message` field — the same
bytes YanezYID signed verbatim.

## Signed Decisions

When your link includes [`terms`](deep-link-signing.md#approval-terms),
YanezYID sends a signed decision instead of signing your `message` directly.
The user approves or declines with a face scan, and either way you receive a
callback.

### Decision Callback Payload

The callback has the usual fields plus two more:

| Field | Contents |
| --- | --- |
| `message` | Base64url of the exact signed envelope bytes (see below). |
| `signature` | BLS signature over those bytes, made with the decision domain tag. |
| `keys`, `matched_tier`, `request_id`, `yid` | Same as in [Callback Payload](#callback-payload). |
| `decision` | `approve` or `reject`, copied from the envelope. |
| `terms` | Your `terms`, copied from the envelope. |

Act only on values inside the verified envelope. `decision` and `terms` are
copies for convenience.

### The Envelope

The decoded `message` is a JSON object:

```json
{
  "action": "partner_signing.decision",
  "app_id": "ptr_416582cd9ea9bb6c3750de1c",
  "assurance_tier": "high",
  "decision": "approve",
  "message": "<your message value, unchanged>",
  "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "signed_at": 1791234567,
  "terms": { "title": "…", "summary": "…", "details": [] },
  "version": 1,
  "yid": "<stable unique yid>"
}
```

Parse the bytes you received. Don't re-encode the JSON before verifying.

### Domain Tag

A domain tag is a fixed label mixed into a BLS signature, so a signature made
under one tag never verifies under another. Signed decisions use:

```
YANEZ_PARTNER_DECISION_V1_BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_
```

Links without `terms` keep the tag in [BLS Verification](#bls-verification).
The separate tag means a signature from an ordinary link can never pass as a
signed decision.

```python
from py_ecc.bls import G2Basic

class DecisionBLS(G2Basic):
    DST = b"YANEZ_PARTNER_DECISION_V1_BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_"

def verify_decision_signature(pubkey_g1: bytes, envelope: bytes, signature_g2: bytes) -> bool:
    if len(pubkey_g1) != 48 or len(signature_g2) != 96:
        return False
    try:
        return bool(DecisionBLS.Verify(pubkey_g1, envelope, signature_g2))
    except Exception:
        return False
```

### Verifying a Signed Decision

The callback isn't authenticated, so anyone who learns a `request_id` can send
one. Ignore any callback that fails these checks, and mark the request used
only after one passes. A failed callback must leave the request open, so the
user's real callback still gets through.

1. `request_id` maps to a request you issued that isn't expired or already
   decided. Don't mark it used yet.
2. Check that `matched_tier` is `low`, `medium`, or `high`. Then decode
   `message` and verify `signature` over those exact bytes with the `keys`
   entry whose `threshold_tier` equals `matched_tier`, using the decision
   domain tag.
3. Parse the envelope and check that:
    - `version` is `1` and `action` is `partner_signing.decision`.
    - `decision` is `approve` or `reject`.
    - `app_id` is your `partner_id`.
    - `request_id` equals the callback's `request_id`.
    - `yid` is the user you sent the request to.
    - `assurance_tier` equals `matched_tier`.
    - `message` equals the `message` you put in the link.
    - `terms` has the same keys and values as the `terms` you sent.
    - `signed_at` falls within the request's lifetime.
4. **Required:** call [`POST /api/partners/records/validate`](api/backend-api.md#validate-a-record)
   with the `yid` and the matched `group_public_key`, and require both results
   to be `true`. The callback reports its own keys, so without this check a
   forged callback could carry someone else's key.
5. If you require a minimum tier, compare the matched key with the per-tier
   keys you stored at enrollment, as in step 8 of
   [Verification Steps](#verification-steps). `records/validate` confirms the
   key belongs to the `yid`, not which tier it is.
6. In one atomic step, mark the request decided and record `decision`. If a
   valid callback already decided it, ignore this one.
7. Act on the recorded `decision`. Perform the requested action only for
   `approve`; treat `reject` as the user declining.

Respond `2xx` to every callback that passes these checks, including a valid
decline. YanezYID shows any other status to the user as a failed delivery.

A callback whose `message` isn't an envelope, after you sent `terms`, came
from an older YanezYID. Ignore it; if the request expires without a valid
callback, treat it as not approved.

## Address Derivation

```python
from eth_utils import keccak, to_checksum_address

def derive_address(pubkey_g1: bytes) -> str:
    # EIP-55 checksum address derived from the BLS G1 public key.
    # This is a stable identifier — it is NOT a usable Ethereum address.
    return to_checksum_address(keccak(pubkey_g1)[-20:])
```

## Client Result Delivery

The client learns the outcome by polling a status endpoint or via push (SSE) —
never as a direct reply to the signing hop. Correlate by `request_id`.
