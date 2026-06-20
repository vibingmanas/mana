# Plan 08 — Trust, Inspection & Fraud Detection

## Goal
Port organized-player trust (standardized inspection, certification, fraud detection) onto third-party dealer inventory — **without owning the cars**. This is Mana's core differentiation: a uniform, public inspection report + odometer/history fraud flags that make a local dealer's car as trustworthy as a Cars24-Assured one.

## User stories
- As a **buyer**, I want a standardized inspection report so I can compare cars across different dealers objectively.
- As a **buyer**, I want to know if the odometer was likely tampered (1 in 5 cars are) before I buy.
- As a **dealer**, I want a "Mana Inspected/Certified" badge to win buyer trust and sell faster.
- As **inspection ops**, I want to schedule inspectors and review reports efficiently.

## Scope
**In:** Standardized inspection template (200–300 point), inspector app/PWA, inspection scheduling & assignment, AI photo-based pre-inspection, odometer-fraud detection, vehicle history report, certification tiers, public report rendering, structural/underbody flags.
**Out:** RC/VAHAN raw verification (see [07](./07-verification-kyc.md)); returns/warranty product mechanics (see [12](./12-monetization.md)/[09](./09-financing-insurance.md)); listing media capture (see [02](./02-car-registration-listing.md)).

## Inspection model
- **Standardized template:** sections (Engine/Transmission, Electrical, Suspension/Brakes, Structure/Body, Interior, Tyres, AC, Road test, Documents). Each point scored; section scores roll up to an overall grade (e.g., 0–100 + A/B/C). Same template for all dealers → comparability.
- **Inspection types:** (a) **Physical** by Mana/partner inspector; (b) **AI photo-based pre-inspection** (condition estimate from dealer-uploaded photos — cheap, scalable across distributed inventory); (c) **Self-declared** (lowest trust, labeled).
- **Certification tiers:** `Self-declared` < `AI-checked` < `Mana Inspected` (physical) < `Mana Certified` (physical + clean title + returns/warranty eligible).

## Fraud detection
- **Odometer fraud:** cross-check declared km vs signals — VAHAN/insurance/PUC history, prior listing snapshots, service records, wear from photos, age-vs-km plausibility. Output `fraud_risk: low|med|high` + signals. High risk → block publish or force disclosure + admin review (plan 06).
- **Vehicle history report:** ownership count, accident/flood indicators, hypothecation, challan, insurance claim history (where available).
- **Structural/underbody flags:** detect cosmetic fraud (fresh paint, replaced panels) hiding accident/flood/corrosion.
- **Legal note:** odometer tampering is prosecutable under **BNS §318 (cheating)**; surfacing risk also limits Mana's Consumer-Protection-Act exposure.

## Data model
```
Inspection
  id, vehicle_id, inspector_id?, type (physical|ai_photo|self)
  template_version, status (scheduled|in_progress|completed|failed)
  overall_score, grade, section_scores(json), points(json[])
  report_url, completed_at

Inspector
  id, user_id, name, region, partner?(bool), rating, active

OdometerCheck
  id, vehicle_id, declared_km, estimated_km, fraud_risk, signals(json), checked_at

VehicleHistory
  id, vehicle_id, owners_count, accident_flags(json), flood_flag
  insurance_claims(json), hypothecation_active, sources(json), generated_at

Certification
  id, vehicle_id, tier, issued_at, expires_at, conditions(json)
```

## API / endpoints
```
POST /inspections                         -> request/schedule (vehicle, type)
POST /inspections/:id/assign              -> assign inspector (ops)
PUT  /inspections/:id/points              -> inspector submits scored points (offline-capable)
POST /inspections/:id/complete            -> compute score/grade, generate report
GET  /inspections/:id/report              -> public report
POST /vehicles/:id/odometer-check         -> run fraud detection
GET  /vehicles/:id/history                -> vehicle history report
POST /vehicles/:id/certify                -> issue/upgrade certification (ops/auto)
```

## UI / screens
**Inspector app (PWA, offline-capable):** assigned jobs, guided checklist per section, photo capture per point, score entry, road-test notes, submit (syncs when online).
**Dealer:** request inspection, see status, view report, certification badge & what it unlocks.
**Buyer (listing):** inspection score/grade badge → expandable **public report** (section scores, photos, flagged issues), **odometer-check status**, history highlights, certification tier.
**Ops (plan 06):** scheduling board, report review, certification decisions, fraud-flag queue.

## Integrations
- **AI vision** for photo-based condition + structural/odometer signals.
- **VAHAN/insurance/PUC** history via [07](./07-verification-kyc.md).
- **Media pipeline** ([02](./02-car-registration-listing.md)).

## Edge cases & failure modes
- **Inspector offline** in field → offline-first app, sync later; conflict resolution.
- **Dealer disputes report** → re-inspection flow, ops arbitration (plan 06).
- **AI confidence low** → label "AI estimate," recommend physical inspection; don't over-claim.
- **History data unavailable** for state/car → partial report, clearly labeled gaps.
- **Certification gaming** (dealer swaps car after inspection) → tie certification to reg_number + VIN + photos + expiry; re-verify on material change.
- **Stale certification** → expiry + re-inspection prompts.

## Acceptance criteria
- All inspections use one versioned template; scores are comparable across dealers and rendered in a public report.
- Every car gets at least an AI photo pre-inspection; physical inspection upgrades the tier.
- Odometer fraud risk is computed and high-risk cars are blocked from publish or force disclosure.
- Certification is bound to vehicle identity + expiry and revoked on material change.
- Buyers can view the full inspection report and odometer/history status from the listing.

## Dependencies
[02](./02-car-registration-listing.md) (vehicle/media), [07](./07-verification-kyc.md) (VAHAN/history), [06](./06-admin-panel.md) (ops/review), [09](./09-financing-insurance.md)/[12](./12-monetization.md) (returns/warranty on certified tier).
