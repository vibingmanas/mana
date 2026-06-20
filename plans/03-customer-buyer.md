# Plan 03 — Customer / Buyer Experience

## Goal
Give buyers a trustworthy, low-friction way to discover, compare, and act on used cars from local dealers — turning the unorganized market's biggest weakness (low trust) into Mana's strength via verified listings, transparent pricing, and easy lead/booking/finance flows.

## User stories
- As a **buyer**, I want to search and filter cars near me by budget, make, fuel, etc.
- As a **buyer**, I want to trust the listing — see verification badges, inspection score, and a fair-price reference.
- As a **buyer**, I want to compare cars side by side and save favorites.
- As a **buyer**, I want to book a test drive or chat on WhatsApp without friction.
- As a **buyer**, I want price-drop alerts and to check my EMI/finance eligibility.

## Scope
**In:** Buyer account (lightweight, OTP), search/browse/filter, listing detail, compare, save/wishlist, lead creation, WhatsApp/chat handoff, price-drop & saved-search alerts, EMI calculator entry, reviews of dealers.
**Out:** Search infra & ranking internals (see [10](./10-search-discovery.md)); booking engine (see [04](./04-appointment-booking.md)); finance application backend (see [09](./09-financing-insurance.md)).

## Data model
```
Buyer
  id, phone, phone_verified_at, email?, name?, city, geo
  preferences(json), created_at

SavedSearch
  id, buyer_id, query(json filters), alert_channel (push|whatsapp|email), created_at

Wishlist
  id, buyer_id, vehicle_id, created_at

Lead
  id, buyer_id, vehicle_id, dealer_id
  channel (web|whatsapp|call), intent (enquiry|test_drive|finance)
  status (new|contacted|qualified|appointment|won|lost), created_at

PriceAlert
  id, buyer_id, vehicle_id|saved_search_id, threshold, last_notified_at

DealerReview
  id, buyer_id, dealer_id, rating, text, verified_purchase(bool), created_at
```

## API / endpoints
```
POST /buyer/auth/otp + /verify
GET  /search?filters...                  -> paginated listings (plan 10)
GET  /listings/:slug                      -> listing detail
POST /wishlist / DELETE /wishlist/:id
POST /saved-searches  + alert config
POST /leads                               -> create lead (enquiry/test-drive/finance)
POST /leads/:id/whatsapp                  -> deep-link / start WhatsApp conversation
GET  /compare?ids=a,b,c                   -> comparison view
POST /reviews                             -> dealer review (verified purchase gated)
GET  /buyer/me                            -> profile, wishlist, leads, alerts
```

## UI / screens
1. **Home / search** — location-aware, popular filters (budget band ₹3–5L is 43% of market → prominent), make/model, fuel, body, year, km, transmission, owners, seller verification level.
2. **Results** — cards with photo/360°, price + **fair-price badge** ("fair" / "great deal" / "above market"), inspection score, verified-dealer badge, distance. Sort by relevance/price/recency/distance.
3. **Listing detail** — gallery/360°/video, full specs, **trust panel** (RC verified, insurance valid, no active hypothecation, inspection report link, odometer-check status), price context, EMI estimate, dealer card, CTAs: *Book test drive*, *Chat on WhatsApp*, *Check finance*, *Save*, *Share*.
4. **Compare** — up to 4 cars, spec + price + trust matrix.
5. **Wishlist & saved searches** — with alert toggles.
6. **My activity** — leads/enquiries, booked appointments, finance status.
- Mobile-first, vernacular, fast on low bandwidth, shareable listing links (WhatsApp-friendly OG cards).

## Integrations
- **Search** (plan 10), **valuation** (plan 10), **WhatsApp Business API** for chat handoff and alerts, **push/email** notifications, **EMI calculator** (plan 09).

## Edge cases & failure modes
- **Listing goes off-market** while buyer views it → graceful "no longer available" + similar cars.
- **Buyer in a city with thin inventory** → widen radius, show "notify me," capture demand signal for dealer acquisition.
- **Spam/fake leads** → rate-limit, OTP-gate lead creation, fraud scoring.
- **Review abuse** → verified-purchase gating, moderation queue (plan 06).
- **Price changed** between list and detail → always show live price.
- **WhatsApp opt-in/consent** → respect DLT/WhatsApp policy, explicit opt-in for alerts.

## Acceptance criteria
- A buyer can search, filter, open a listing, and create a test-drive lead with only an OTP login.
- Every listing detail shows live verification/trust signals and a fair-price reference.
- Saved searches and price-drop alerts fire via the chosen channel and respect opt-in.
- Leads route to the correct dealer's CRM (plan 05) in real time.
- Reviews can only be left by buyers with a verified interaction/purchase.

## Dependencies
[10](./10-search-discovery.md) (search/valuation), [04](./04-appointment-booking.md) (booking), [09](./09-financing-insurance.md) (EMI/finance), [05](./05-inventory-management.md) (lead delivery), [06](./06-admin-panel.md) (review moderation).
