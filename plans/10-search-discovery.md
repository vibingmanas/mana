# Plan 10 — Search, Discovery & Valuation

## Goal
Help buyers find the right car fast and trust its price. Provide fast, geo-aware, faceted search across aggregated dealer inventory, plus an **AI valuation engine** that powers fair-price badges, dealer pricing intelligence, and price-drop alerts. Pricing opacity is a top buyer complaint — objective valuation is a trust lever for both sides.

## User stories
- As a **buyer**, I want fast, relevant, location-aware search with rich filters.
- As a **buyer**, I want to know if a price is fair ("great deal" / "above market").
- As a **buyer**, I want price-drop and new-match alerts.
- As a **dealer**, I want pricing guidance to price for faster turns (thin 2.9–7.5% margins).

## Scope
**In:** Search index & query API, faceted filters, geo/distance ranking, relevance ranking, autocomplete, similar/recommended cars, AI valuation engine (fair-price band), dealer pricing intelligence, price-drop & saved-search alerts, SEO for listings.
**Out:** Buyer UI shell (see [03](./03-customer-buyer.md)); listing data model (see [02](./02-car-registration-listing.md)); notification transport (see [11](./11-architecture-tech-stack.md)).

## Search
- **Engine:** OpenSearch/Elasticsearch; listings indexed on publish/update; PostGIS for precise geo, geo-distance sort.
- **Facets:** price band (highlight ₹3–5L — 43% of market), make/model/variant, year, km, fuel, transmission, body, owners, color, **seller verification tier**, **inspection grade**, certification tier, distance.
- **Ranking signals:** relevance to query + recency + distance + listing quality (media completeness, inspection) + dealer tier + (de-prioritize stale/aging). Featured/promoted slots clearly labeled (monetization, plan 12).
- **Extras:** autocomplete, typo tolerance, "similar cars," "cars you viewed," vernacular synonyms.

## Valuation engine
- **Model:** predicts fair-price band (`low / fair / high`) from make/model/variant, year, km, fuel, owners, location, condition/inspection grade, seasonality, and observed market comps (our listings + external signals like OBV-style references where available).
- **Outputs:**
  - Buyer **fair-price badge** on listing ("Great deal" / "Fair price" / "Above market").
  - Dealer **price recommendation** + "X% above/below market" + suggested price for target turn days.
  - Inputs to **price-drop alerts**.
- **Confidence:** show band + confidence; degrade gracefully for rare cars.

## Data model
```
ListingIndexDoc  (denormalized for search)
  vehicle_id, make, model, variant, year, km, fuel, transmission, body
  price, valuation_fair, deal_score, city, geo, dealer_tier
  inspection_grade, certification_tier, media_count, has_360
  listed_at, status, boost_score

Valuation
  id, vehicle_id, valuation_low, valuation_fair, valuation_high
  deal_score (-1..1), confidence, model_version, computed_at

PriceHistory
  id, vehicle_id, price, changed_at

(SavedSearch / PriceAlert defined in plan 03)
```

## API / endpoints
```
GET  /search                      -> faceted, geo-ranked results + facet counts
GET  /search/autocomplete
GET  /vehicles/:id/valuation      -> fair-price band + deal score
GET  /vehicles/:id/similar
POST /valuation/recompute         -> internal (on listing change / nightly)
(alerts created via plan 03 saved-searches; matcher job here)
```

## Jobs
- **Index sync** on listing create/update/status change.
- **Valuation recompute** on listing change + nightly batch.
- **Alert matcher** — on new/changed listings, match saved searches & price thresholds → enqueue notifications.

## Edge cases & failure modes
- **Thin inventory / rare car** → low valuation confidence; widen comps; label estimate.
- **Index lag** → near-real-time sync; fall back to DB for critical reads.
- **Price manipulation** (dealer games deal-score) → valuation independent of dealer input; anomaly flags to fraud console (plan 06).
- **Geo missing** (buyer denies location) → city-level fallback.
- **Stale listings** in index → status propagation + TTL cleanup.
- **Alert spam** → batching, frequency caps, opt-in (DLT/WhatsApp policy).

## Acceptance criteria
- Search returns relevant, geo-ranked results with working facets and sub-second latency at expected scale.
- Every live listing has a valuation band + deal score; buyers see a fair-price badge, dealers see a recommendation.
- Saved-search and price-drop alerts fire correctly and respect opt-in/frequency caps.
- Listing status changes reflect in search within seconds.
- Promoted/featured results are clearly labeled.

## Dependencies
[02](./02-car-registration-listing.md) (listings), [03](./03-customer-buyer.md) (buyer UI/alerts), [05](./05-inventory-management.md) (dealer pricing insights), [08](./08-trust-inspection.md) (inspection grade as a signal), [11](./11-architecture-tech-stack.md) (search/queue infra), [12](./12-monetization.md) (promoted listings).
