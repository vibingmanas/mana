# Plan 06 — Admin Panel

## Goal
Give Mana ops/staff a single control plane to run the marketplace: approve verifications, moderate listings & reviews, manage inspections, resolve disputes, oversee finance/payouts, configure the platform, and monitor health — with strict RBAC and a full audit trail.

## User stories
- As an **ops admin**, I want a queue of dealers/cars needing manual review so nothing slips through.
- As a **moderator**, I want to flag/remove fraudulent listings and abusive reviews fast.
- As a **finance ops**, I want to oversee payouts, subscriptions, and finance/insurance referrals.
- As a **support agent**, I want to see a dealer's/buyer's full context to resolve tickets.
- As a **superadmin**, I want to manage staff roles, feature flags, and platform config, with every action audited.

## Scope
**In:** Admin auth + RBAC, dashboards, verification review queues, listing/media/review moderation, inspection ops management, dispute/ticket management, dealer & buyer 360 views, finance/payout/subscription oversight, content/CMS (categories, banners, cities), feature flags & config, fraud/risk console, full audit log, analytics/reporting, bulk ops, impersonation (audited).
**Out:** End-user verification flows (see [01](./01-vendor-onboarding.md)/[07](./07-verification-kyc.md)); the inspection app itself (see [08](./08-trust-inspection.md)); billing engine internals (see [12](./12-monetization.md)).

## Roles (RBAC)
`superadmin`, `ops_admin`, `moderator`, `verification_reviewer`, `finance_ops`, `inspection_ops`, `support_agent`, `read_only_analyst`. Permissions are server-enforced; least-privilege by default.

## Modules
1. **Dashboard** — KPIs (active dealers, live listings, leads, bookings, GMV facilitated, revenue, fraud flags, SLA breaches).
2. **Verification review** — queue of dealer KYC edge cases (name mismatches, doc fallbacks, duplicates); approve/reject/request-more with reason; sets dealer tier.
3. **Listing moderation** — flagged/new listings, media review, high odometer-fraud-risk cars, hypothecation disclosures; approve/hold/remove.
4. **Inspection ops** — schedule/assign inspectors, review reports, certification decisions (plan 08).
5. **Disputes & support** — tickets, dealer↔buyer disputes, refunds/returns (certified tier), SLA tracking.
6. **Dealer 360** — profile, tier, KYC status, inventory, leads, performance, payments, flags.
7. **Buyer 360** — activity, leads, bookings, reviews, fraud signals.
8. **Finance ops** — payouts queue, subscription/billing status, finance & insurance referral tracking, floor-plan exposure (plan 09).
9. **Fraud/risk console** — rules, flags, blocklists (PAN/GST/phone/reg-number), review actions.
10. **CMS/config** — cities/launch geos, categories, homepage banners, pricing plans, notification templates.
11. **Feature flags** — gradual rollout, kill switches.
12. **Audit log** — immutable, searchable record of every admin action (who/what/when/before-after).
13. **Analytics/reports** — funnel, cohort, geo, revenue; export.

## Data model
```
AdminUser
  id, name, email, role, permissions(json), status, last_login_at, mfa_enabled

AdminAction  (audit log)
  id, admin_user_id, action, entity_type, entity_id
  before(json), after(json), reason, ip, created_at  -- append-only

ReviewQueueItem
  id, type (dealer_kyc|listing|review|inspection|dispute), entity_id
  status (pending|approved|rejected|escalated), assigned_to, sla_due_at, resolution(json)

Dispute
  id, raised_by, against, vehicle_id?, type, status, messages[], resolution, created_at

Blocklist
  id, kind (pan|gstin|phone|reg_number|device), value, reason, created_by, created_at

FeatureFlag
  key, enabled, rollout(json), updated_by, updated_at
```

## API / endpoints
```
GET  /admin/dashboard
GET  /admin/queues/:type            -> review queue items
POST /admin/queues/:id/resolve      -> approve|reject|escalate (+reason) [audited]
GET  /admin/dealers/:id             -> dealer 360
POST /admin/dealers/:id/tier        -> set/override tier [audited]
POST /admin/listings/:id/moderate   -> hold|remove|approve [audited]
GET  /admin/disputes  + resolve
GET  /admin/finance/payouts  + approve/release
POST /admin/blocklist  + manage
PUT  /admin/feature-flags/:key
POST /admin/impersonate/:userId     -> scoped, time-boxed, [audited]
GET  /admin/audit-log               -> searchable
```

## UI / screens
Left-nav app: Dashboard, Queues, Dealers, Buyers, Listings, Inspections, Disputes, Finance, Fraud, CMS, Flags, Audit, Reports. Tables with filters/bulk actions, detail drawers, reason-required action modals, SLA timers, role-scoped visibility.

## Edge cases & failure modes
- **Privilege escalation** → server-side RBAC, deny-by-default, no client-trust.
- **Destructive actions** (remove dealer, release payout) → confirm + reason + audit; reversible where possible.
- **Impersonation abuse** → time-boxed, banner-visible, fully audited, restricted role.
- **SLA breaches** → escalation + alerts.
- **Bulk action mistakes** → preview + undo window.
- **PII exposure** → mask Aadhaar/sensitive fields even from admins (least-privilege; reveal is itself audited).

## Acceptance criteria
- Every admin action is recorded append-only with actor, before/after, reason, timestamp.
- RBAC is enforced server-side; a support agent cannot release payouts or change tiers.
- Verification, listing, inspection, and dispute queues each have SLA timers and resolution flows.
- Aadhaar/sensitive PII is masked in admin views; any reveal is gated and audited.
- Impersonation is time-boxed, visibly flagged, and audited.

## Dependencies
All other plans feed the admin panel; tightly coupled to [01](./01-vendor-onboarding.md), [02](./02-car-registration-listing.md), [07](./07-verification-kyc.md), [08](./08-trust-inspection.md), [09](./09-financing-insurance.md), [12](./12-monetization.md).
