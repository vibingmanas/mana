# Plan 07 — Verification & KYC Engine (shared service)

## Goal
A single, compliant, provider-agnostic verification service used by dealer onboarding ([01](./01-vendor-onboarding.md)) and car listing ([02](./02-car-registration-listing.md)). It abstracts KYC/verification providers, enforces Aadhaar/DPDP compliance (masking, data vault, consent, retention), and exposes a clean async API. **Compliance is the reason this is its own service** — get it wrong and penalties reach ₹1 crore+.

> Not legal advice. A fintech/data-protection lawyer must sign off before launch.

## What it verifies
| Check | Method | Provider(s) | Public cost ref |
|---|---|---|---|
| Email | Link/code + optional MX | SES/SendGrid/Resend; ZeroBounce | — |
| Phone | OTP over **DLT** route | MSG91, Gupshup | ₹0.15–0.17/SMS |
| Aadhaar | **DigiLocker consent** (primary), **Offline XML/QR** (fallback) | Signzy, Surepass, Cashfree, Setu, Digio | sales-contact |
| PAN | Name-match | Cashfree, Surepass, Karza | ~₹1.2/hit |
| GST | GSTIN status + legal name | Cashfree, Surepass, Signzy | sub-₹5 |
| Bank | **Reverse/user-initiated penny-drop** | Cashfree, RazorpayX, Karza | ₹4–9 |
| RC/VAHAN | Owner, make/model, insurance, PUC, hypothecation | Surepass, Signzy, Karza | sales-contact |
| Challan | Pending challans by RC | Surepass | sales-contact |

## Compliance rules (hard requirements)
- **Aadhaar:** Section 57 (private contractual use) struck down (2018). The 2025 MeitY private-authentication route is a **discretionary approval** — do **not** depend on it. **Default DigiLocker** (digitally-signed docs, IT-Act-recognized) + **Offline Aadhaar XML/QR** fallback via a **licensed provider**. Never operate as an unlicensed AUA/KUA calling UIDAI OTP/biometric eKYC.
- **Masking:** mask first 8 digits of any Aadhaar number/QR everywhere.
- **Aadhaar Data Vault:** if a full Aadhaar number is ever retained, store it **only** in an encrypted vault keyed by a UID token; never in the app DB. Demographics outside the vault must not be mapped to the number.
- **Retention:** purge Aadhaar authentication data within **6 months**; re-consent after expiry.
- **Consent (DPDP Act 2023):** log purpose, provider, doc type, timestamp, IP/UA, expiry for every verification.
- **DLT:** no SMS without registered PE ID + sender header + approved template.
- **Penalties to avoid:** civil up to ₹1 crore/contravention + ₹10 lakh/day; unauthorized disclosure 3 yr jail + ₹1 lakh (company).

## Architecture
```
                +------------------------+
  callers  -->  |  Verification Service  |  --> Provider Adapters (pluggable)
 (01, 02)       |  - request orchestration|       - DigiLocker adapter
                |  - idempotency keys     |       - PAN/GST/Bank adapter (Cashfree/Setu)
                |  - retry/backoff queue  |       - VAHAN/Challan adapter (Surepass/Signzy)
                |  - consent logging      |       - SMS adapter (MSG91)  - Email adapter
                |  - result normalization |
                +-----------+------------+
                            |
                  +---------+----------+
                  | Aadhaar Data Vault | (encrypted, UID-token; separate store/KMS)
                  +--------------------+
```
- **Provider abstraction:** each check has an interface (`verify(input) -> NormalizedResult`) with ≥2 swappable providers for resilience & price negotiation.
- **Async + idempotent:** all calls queued (BullMQ), retried with backoff; idempotency keys prevent double-charge.
- **Normalized results:** uniform `{status, fields, confidence, raw_ref, provider, verified_at}` regardless of provider.
- **Webhooks** for async provider callbacks (DigiLocker, penny-drop).

## Data model
```
VerificationRequest
  id, subject_type (dealer|vehicle), subject_id, check_type
  provider, status (pending|success|failed|manual_review)
  idempotency_key, normalized_result(json), raw_response_ref, confidence
  consent_log_id, created_at, completed_at

ConsentLog
  id, subject_id, purpose, provider, document_type
  consented_at, ip, user_agent, expires_at

AadhaarVaultEntry            # separate encrypted store
  uid_token, encrypted_aadhaar, created_at, purge_after  -- never joined to app PII tables
```

## API / endpoints (internal)
```
POST /verify/email | /verify/phone | /verify/aadhaar/digilocker
POST /verify/aadhaar/offline-xml | /verify/pan | /verify/gst | /verify/bank
POST /verify/vehicle/rc | /verify/vehicle/challan
GET  /verify/:requestId                 -> normalized status/result
POST /webhooks/:provider                -> async provider callbacks
```

## Edge cases & failure modes
- **Provider outage** → failover to secondary provider; if all down, queue + "verifying…" state, alert ops.
- **Name mismatch** across docs → `manual_review`, route to admin (plan 06), never silent pass.
- **Partial data from VAHAN** (state coverage gaps) → return partial + low confidence, allow "unverified" label.
- **Webhook never arrives** → reconciliation job polls provider; timeout → manual review.
- **Double submission** → idempotency key dedupes.
- **Consent expired** → block reuse, trigger re-consent.
- **Provider returns full Aadhaar** → immediately vault + mask before any persistence/logging.

## Acceptance criteria
- A full Aadhaar number never appears in app DB, logs, analytics, or admin views (masked everywhere; vault-only if retained).
- Every verification writes a consent log with purpose + expiry; Aadhaar auth data is purged at ≤6 months.
- Each check type has at least two configured providers and fails over automatically.
- All provider calls are idempotent, retried with backoff, and normalized to one result schema.
- No SMS is sent outside a DLT-registered template/route.

## Dependencies
Consumed by [01](./01-vendor-onboarding.md), [02](./02-car-registration-listing.md); surfaces manual cases to [06](./06-admin-panel.md); infra in [11](./11-architecture-tech-stack.md). Requires legal counsel sign-off.
