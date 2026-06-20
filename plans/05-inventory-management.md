# Plan 05 — Dealer Inventory Management (DMS)

## Goal
Give the dealer a cloud DMS that is genuinely better than their current WhatsApp + paper workflow — managing stock, pricing, leads (WhatsApp-native CRM), appointments, and performance in one place. This is the *real product* we sell to dealers; buyer features exist to feed it. It's the primary lock-in and subscription justification.

## User stories
- As a **dealer**, I want all my cars, their status, and days-in-stock in one dashboard.
- As a **dealer**, I want every lead (web, WhatsApp, call) in one inbox with fast-reply tools, because fast reply ≈ 3× conversion.
- As a **dealer**, I want pricing guidance so I price for faster turns on thin margins.
- As a **dealer**, I want to push one inventory feed to the platform, my WhatsApp catalog, and social.
- As a **dealer**, I want simple performance numbers (views, leads, test drives, sales, aging stock).

## Scope
**In:** Inventory dashboard (CRUD via plan 02), bulk upload, stock aging & turn metrics, pricing intelligence surface, **WhatsApp-native lead inbox/CRM**, lead pipeline (kanban), appointment integration, syndication (WhatsApp catalog/social/feed), payment-link collection, multi-user (staff roles), basic accounting hooks.
**Out:** Listing creation/verification internals (see [02](./02-car-registration-listing.md)); floor-plan financing product (see [09](./09-financing-insurance.md)); billing of the dealer's own subscription (see [12](./12-monetization.md)).

## Data model
```
InventoryItem  (view over Vehicle + dealer ops fields)
  vehicle_id, dealer_id, cost_price, asking_price, floor_price
  acquired_at, days_in_stock, turn_target_days, status
  consignment(bool), consignor_info(json)

Lead  (extends plan 03 Lead with CRM fields)
  ...+ assigned_to (staff user), pipeline_stage, next_action_at, notes[], source

Conversation
  id, dealer_id, buyer_id, lead_id, channel (whatsapp|sms|inapp)
  wa_thread_ref, last_message_at, unread_count

Message
  id, conversation_id, direction (in|out), body, media_ref, template_id?, sent_at, status

DealerStaff
  id, dealer_id, user_id, role (owner|manager|sales), permissions(json)

SyndicationTarget
  id, dealer_id, channel (wa_catalog|facebook|instagram|olx_export|feed)
  config(json), last_synced_at, status

PaymentLink
  id, dealer_id, vehicle_id, buyer_id, amount, purpose (token|booking|full)
  gateway_ref, status (created|paid|expired), created_at
```

## API / endpoints
```
GET  /dealer/inventory                 -> list + filters (status, aging, price)
POST /dealer/inventory/bulk            -> CSV/Excel bulk upload
GET  /dealer/inventory/:id/insights    -> views, leads, aging, price recommendation
GET  /dealer/leads                     -> inbox + pipeline
PATCH /dealer/leads/:id                -> stage, assignee, notes, next action
GET  /dealer/conversations             -> WhatsApp/SMS threads
POST /dealer/conversations/:id/reply   -> send (templated/free within WA window)
PUT  /dealer/staff                     -> manage staff & roles
POST /dealer/syndication               -> configure/sync a channel
POST /dealer/payment-links             -> create UPI/WA payment link
GET  /dealer/analytics                 -> funnel + performance dashboard
```

## UI / screens
1. **Dashboard** — live stock count, aging buckets, leads needing action, today's appointments, this-month sales.
2. **Inventory** — table/grid, status & aging highlight, per-car insight drawer (views/leads + **price recommendation**), quick price edit, bulk actions, bulk upload.
3. **Leads / CRM** — unified inbox (WhatsApp first), kanban pipeline (new→contacted→qualified→appointment→won/lost), quick replies & templates, assign to staff, reminders.
4. **Appointments** — embedded calendar (plan 04).
5. **Syndication** — toggle channels, sync status, WhatsApp catalog manager.
6. **Payments** — create/track payment links.
7. **Analytics** — funnel (views→leads→test drives→sales), avg days-in-stock, conversion, staff performance.
8. **Staff** — invite, roles, permissions.

## Integrations
- **WhatsApp Business API** (Meta) — inbox, templates, catalog; respect 24h session window & template approval.
- **Payment gateway** (Razorpay/Cashfree) — UPI payment links.
- **Pricing engine** (plan 10), **search** (listing views feed insights).
- **Social/feed export** (Facebook/Instagram catalog, OLX-style export).

## Edge cases & failure modes
- **WhatsApp 24h window** expired → must use approved template to re-open; UI enforces.
- **Bulk upload errors** → row-level validation report, partial import, fix-and-reupload.
- **Consignment cars** (dealer doesn't own) → flag, restrict payout/finance accordingly.
- **Staff permission leaks** → RBAC enforced server-side, not just UI.
- **Lead duplication** across channels (same buyer WA + web) → merge by phone.
- **Syndication conflicts** (sold car still live elsewhere) → propagate status changes; mark sold everywhere.
- **Stale aging metrics** → recompute nightly + on status change.

## Acceptance criteria
- A dealer sees all inventory with accurate status and days-in-stock, and can bulk upload.
- Every lead from web/WhatsApp/call lands in one inbox and pipeline; replies send via WhatsApp within policy.
- Each car shows a price recommendation and its view/lead performance.
- A dealer can create a UPI payment link and see it marked paid.
- Staff roles gate actions server-side; selling a car marks it sold across all syndicated channels.

## Dependencies
[02](./02-car-registration-listing.md) (vehicles), [03](./03-customer-buyer.md)/[04](./04-appointment-booking.md) (leads/appointments), [10](./10-search-discovery.md) (pricing/insights), [09](./09-financing-insurance.md) (floor-plan, finance leads), [11](./11-architecture-tech-stack.md) (WhatsApp/payments infra), [12](./12-monetization.md) (subscription gating).
