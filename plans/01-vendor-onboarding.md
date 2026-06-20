# Plan 01 — Vendor (Dealer) Onboarding

## Goal
Onboard a local used-car dealer onto Mana with verified identity and business credentials, so buyers can trust them and we can pay them, bill them, and gate platform access by verification tier. Verification chain: **email → phone → Aadhaar → PAN → GST → bank account.**

This is the trust foundation of the whole platform. A dealer cannot publish live listings until they reach the required verification tier.

## User stories
- As a **dealer**, I want to sign up with my phone and get verified quickly so I can start listing cars.
- As a **dealer**, I want to verify Aadhaar without handing over a photocopy that could be misused, so I feel safe.
- As a **dealer**, I want to add my GST and bank so I can receive payouts and tax-compliant invoices.
- As an **admin**, I want each verification step's result and consent logged so we're audit-ready.
- As a **buyer**, I want to see a "Verified Dealer" badge with the verification level so I trust the listing.

## Scope
**In:** Multi-step onboarding wizard; email, phone (DLT OTP), Aadhaar (DigiLocker/offline XML), PAN, GST, bank penny-drop; document upload fallback; verification tiers & badges; resume-where-left-off; admin review queue for manual/edge cases.
**Out:** Per-vehicle RC verification (see [02](./02-car-registration-listing.md)); the shared verification microservice internals (see [07](./07-verification-kyc.md)); billing/subscription (see [12](./12-monetization.md)).

## Verification tiers
| Tier | Requirements | Capabilities |
|---|---|---|
| **T0 — Registered** | Email + phone verified | Browse dealer dashboard, draft listings (not public) |
| **T1 — Identity verified** | + Aadhaar + PAN | Publish up to N listings, receive leads |
| **T2 — Business verified** | + GST + bank penny-drop | Unlimited listings, payouts, financing referral, "Verified Dealer" badge |
| **T3 — Mana Certified** | + physical premises check + agreement | Certified-tier inventory, returns/warranty eligibility, featured placement |

## Data model
```
Dealer
  id, legal_name, display_name, owner_name
  status (draft|in_review|active|suspended|rejected)
  verification_tier (T0..T3)
  city, state, address, geo (PostGIS point)
  premises_type, year_established
  created_at, updated_at

DealerKYC
  id, dealer_id
  email, email_verified_at
  phone, phone_verified_at
  aadhaar_ref (token only — full number NEVER stored here; see Aadhaar Data Vault)
  aadhaar_name_masked, aadhaar_verified_at, aadhaar_method (digilocker|offline_xml)
  pan, pan_name, pan_verified_at
  gstin, gst_legal_name, gst_status, gst_verified_at
  bank_account_ref, bank_name, bank_account_name, bank_verified_at, bank_method (penny_drop)
  consent_log_id (FK to ConsentLog)

ConsentLog            # DPDP Act + Aadhaar Act audit trail
  id, dealer_id, purpose, provider, document_type
  consented_at, ip, user_agent, expires_at (<= 6 months for Aadhaar auth data)

OnboardingProgress
  dealer_id, current_step, completed_steps[], last_active_at
```
> Aadhaar full number, if ever retained, lives only in the **Aadhaar Data Vault** (encrypted, UID-token mapped) per [07](./07-verification-kyc.md). The app DB stores only a token + masked name.

## API / endpoints
```
POST /onboarding/start                      -> create Dealer(draft) + OnboardingProgress
POST /onboarding/email/send-otp             -> email OTP/link
POST /onboarding/email/verify
POST /onboarding/phone/send-otp             -> DLT SMS OTP (MSG91)
POST /onboarding/phone/verify
POST /onboarding/aadhaar/digilocker/init    -> returns DigiLocker consent redirect URL
GET  /onboarding/aadhaar/digilocker/callback
POST /onboarding/aadhaar/offline-xml        -> upload UIDAI XML + share-code (fallback)
POST /onboarding/pan/verify                 -> name-match
POST /onboarding/gst/verify                 -> GSTIN status + legal name
POST /onboarding/bank/penny-drop            -> reverse/user-initiated penny drop
GET  /onboarding/status                      -> tier, completed steps, next step
POST /onboarding/submit                      -> move to in_review or auto-activate
```
All verification calls are async-safe (provider latency), idempotent, and write to `ConsentLog` + audit log.

## UI / screens
1. **Signup** — phone + OTP, then email + OTP.
2. **Business profile** — legal/display name, owner, city, address (map pin), premises type.
3. **Identity** — "Verify with DigiLocker" (primary CTA) → consent redirect; "Use offline Aadhaar" fallback; PAN entry + auto name-match.
4. **Business credentials** — GSTIN, bank account + IFSC → penny-drop name confirmation.
5. **Review & submit** — shows tier achieved, what each unlocks.
6. **Status dashboard** — per-step badges (verified / pending / failed), retry, support link.
- Mobile-first, vernacular, progress bar, resumable. Show *why* each step is needed (trust + payouts) to reduce drop-off.

## Integrations
- **DigiLocker** consent flow + **Offline Aadhaar XML/QR** via licensed provider (Signzy / Surepass / Cashfree / Setu / Digio).
- **PAN** name-match (~₹1.2/hit), **GST** status (sub-₹5), **bank reverse penny-drop** (₹4–9).
- **DLT-registered SMS** OTP (MSG91/Gupshup); **email** (SES/SendGrid/Resend) with optional MX validation.
- See [07](./07-verification-kyc.md) for provider abstraction.

## Edge cases & failure modes
- **Name mismatch** across Aadhaar/PAN/GST/bank → flag for manual admin review, don't hard-fail.
- **DigiLocker down / user has no DigiLocker** → offline XML fallback → manual doc upload (admin review).
- **GST not present** (small dealer below threshold) → allow T1, cap listings, prompt later; don't block onboarding.
- **Penny-drop fails** (wrong account) → retry; block payouts until resolved (can still list at T1).
- **Provider timeout** → queue + retry with backoff; show "verifying…" not error.
- **Duplicate dealer** (same PAN/GST/phone) → detect, merge or block, alert admin.
- **Aadhaar consent expiry** (6-month) → re-consent flow before reuse.

## Acceptance criteria
- A dealer can go from zero to **T2** with only phone, DigiLocker Aadhaar, PAN, GST, and bank — no physical paperwork.
- Full Aadhaar number is **never** persisted in the app DB; only token + masked name; consent is logged with expiry ≤ 6 months.
- Each verification result (pass/fail/provider/timestamp) is recorded and visible to admin.
- Onboarding is resumable; closing the browser loses no progress.
- All SMS go over a DLT-registered route; no SMS sends without template/PE ID.
- Buyer-facing badge accurately reflects current tier and revokes on suspension.

## Dependencies
[07 — Verification & KYC engine](./07-verification-kyc.md) (provider abstraction, data vault), [06 — Admin panel](./06-admin-panel.md) (review queue), [12 — Monetization](./12-monetization.md) (tier→capability gating, billing).
