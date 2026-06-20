# Plan 02 — Car Registration & Listing

## Goal
Let a verified dealer register a car and publish a trustworthy public listing in minutes. Every car is verified against **VAHAN/RC** (owner, make/model, insurance, PUC, hypothecation, challan) and enriched with standardized media and an inspection so buyers can compare apples to apples across dealers.

## User stories
- As a **dealer**, I want to add a car by entering its registration number and have details auto-filled, so listing is fast.
- As a **dealer**, I want assisted photo/360° capture so my listing looks as good as Cars24's.
- As a **buyer**, I want to see verified RC status, insurance/PUC validity, and any hypothecation/challan flags so I know the car is clean.
- As an **admin**, I want to catch forged RC / odometer fraud before a listing goes live.

## Scope
**In:** Car registration flow, RC/VAHAN verification, hypothecation/challan/insurance/PUC checks, media management (photos, 360°, video), spec auto-fill, pricing input + valuation hint, listing lifecycle/states, public listing page data.
**Out:** Inspection mechanics & certification (see [08](./08-trust-inspection.md)); buyer search (see [03](./03-customer-buyer.md)/[10](./10-search-discovery.md)); inventory bulk ops (see [05](./05-inventory-management.md)).

## Listing lifecycle
```
draft -> rc_verifying -> rc_verified -> inspection_pending -> ready -> live
                                     \-> rc_failed (manual review)
live -> reserved -> sold | live -> paused | live -> expired | * -> removed
```

## Data model
```
Vehicle
  id, dealer_id
  reg_number, reg_state, reg_year
  make, model, variant, fuel_type, transmission, body_type
  manufacture_year, odometer_km, owners_count, color
  price, price_negotiable, valuation_low, valuation_high, valuation_fair
  status (see lifecycle), listed_at, sold_at
  city, geo (PostGIS), created_at, updated_at

VehicleVerification
  id, vehicle_id, source (vahan|provider)
  rc_owner_name, rc_status, rc_make_model, rc_fuel
  insurance_valid_till, insurance_provider
  puc_valid_till
  hypothecation_active (bool), financer_name
  challan_count, challan_total_amount, challan_details(json)
  blacklist_flags(json)
  verified_at, raw_response_ref, confidence

MediaAsset
  id, vehicle_id, type (photo|threesixty|video|doc)
  url, thumbnail_url, position, ai_tags(json), captured_via (app|upload)

OdometerCheck            # see plan 08
  id, vehicle_id, declared_km, estimated_km, fraud_risk (low|med|high), signals(json)
```

## API / endpoints
```
POST /vehicles                          -> create draft (reg_number, dealer_id)
POST /vehicles/:id/verify-rc            -> async VAHAN/RC + challan + insurance + hypothecation
GET  /vehicles/:id/verification         -> verification result
PATCH /vehicles/:id                     -> edit specs/price
POST /vehicles/:id/media                -> upload/attach media (presigned S3)
POST /vehicles/:id/media/360            -> 360 capture session
GET  /vehicles/:id/valuation            -> AI fair-price band (see plan 10)
POST /vehicles/:id/submit               -> -> inspection_pending / ready
POST /vehicles/:id/publish              -> -> live (requires tier + checks pass)
POST /vehicles/:id/status               -> pause/reserve/sold/remove
GET  /listings/:slug                    -> public listing (buyer)
```

## UI / screens
**Dealer:**
1. **Add car** — enter reg number → "Verifying…" → auto-filled specs (editable).
2. **Verification results card** — RC ✓, insurance valid till, PUC, **hypothecation flag**, **challan flag** (with amount), each green/amber/red.
3. **Media** — guided photo checklist (exterior angles, interior, odometer, engine, tyres, docs), 360° capture, video, auto-quality hints; AI auto-tags & ordering.
4. **Pricing** — price input with **AI fair-price band** + "X% above/below market" nudge.
5. **Inspection** — request/attach inspection (plan 08).
6. **Publish** — preview, then go live.

**Buyer (public listing):** gallery/360°, specs, **verified badges** (RC clean, insurance valid, no active hypothecation, inspection score), price + fair-price context, dealer card with verification tier, CTA (book test drive / chat / check finance).

## Integrations
- **VAHAN/Parivahan** RC + challan + insurance/PUC + hypothecation (Surepass / Signzy / Karza) via [07](./07-verification-kyc.md).
- **S3-compatible storage** + image pipeline (resize, strip EXIF GPS, AI tagging); 360° capture SDK.
- **Valuation** engine (plan 10).

## Edge cases & failure modes
- **RC name ≠ dealer name** — normal (dealer is reseller, may be consignment); show "ownership pending transfer," not an error. Surface to buyer transparently.
- **Active hypothecation** — must be disclosed prominently; block "certified" tier until NOC; allow listing with red flag + "loan to be cleared."
- **Pending challans** — disclose amount; offer challan-payment service (plan 09).
- **Odometer fraud risk high** (plan 08) — block publish or force disclosure + admin review.
- **VAHAN data stale/unavailable for state** — degrade gracefully, allow manual entry + "unverified" label, queue re-check.
- **Duplicate reg_number** across dealers — only one live listing per car; detect & resolve (car moved dealers? fraud?).
- **Media missing required angles** — block publish with checklist.

## Acceptance criteria
- Entering a reg number auto-fills make/model/year/fuel from VAHAN within the verification SLA.
- Hypothecation, challan, insurance, and PUC status are fetched and displayed (dealer + buyer).
- A listing cannot go **live** without: dealer ≥ T1, RC verified (or explicit unverified label), required media present, fraud risk not "high."
- EXIF GPS is stripped from uploaded photos.
- Public listing shows accurate verification badges that update if status changes (e.g., insurance expires).

## Dependencies
[01](./01-vendor-onboarding.md) (dealer must be verified), [07](./07-verification-kyc.md) (RC/VAHAN), [08](./08-trust-inspection.md) (inspection/odometer), [10](./10-search-discovery.md) (valuation/search), [05](./05-inventory-management.md) (inventory views).
