# Plan 12 — Monetization

## Goal
Build a layered, asset-light revenue model that avoids the incumbents' inventory cash-burn trap. Base = **dealer subscription**; highest margin = **financing/insurance referral**; complemented by **value-added services**, **leads**, and **ads**. Transaction commission is optional, not relied upon (hard to enforce in low-trust offline-closing markets).

## Why this model (research-backed)
- IndiaMART-style **free-buyer / paid-seller subscription** is the proven Indian B2B marketplace architecture; fits dealer budgets and avoids conflict-of-interest incentives.
- **Lending is the profit pool** — used-car finance penetration only ~23–35%; NBFCs take ~51%; Cars24/Spinny pivoted to NBFC arms for survival. Referral commission captures it asset-light.
- **Commission-only fails** here — buyers/dealers close offline; ~51% of marketplaces use commission but it's leaky without lock-in. So subscription is the base, commission a bonus where enforceable.

## Revenue streams
| Stream | Mechanism | Margin | Notes |
|---|---|---|---|
| **1. Dealer subscription** *(primary)* | Monthly/annual tiers gating listings, leads, DMS, CRM, badge | High | Predictable; the core. |
| **2. Financing referral** | Commission per facilitated loan (partner NBFC/bank) | Highest | Biggest pool; embed in buyer flow. |
| **3. Insurance referral** | Commission per policy sold/transferred | High | Bundled at purchase. |
| **4. Value-added services** | Inspection, certification, warranty, RC transfer, photography, **floor-plan financing** | Mixed | Monetize both sides; raise switching cost. |
| **5. Lead fees** | Pay-per-qualified-lead (overage above plan) | Medium | Used-car lead value is high. |
| **6. Featured/promoted listings** | Dealers pay for placement (labeled) | High | Low-effort incremental. |
| **7. Transaction commission** *(optional)* | % on facilitated/escrowed sales | Medium | Only where enforceable (e.g., payment runs through us). |

## Subscription tiers (illustrative — validate via dealer interviews)
| Tier | Price (TBD) | Includes |
|---|---|---|
| **Starter** | low / freemium | Few live listings, basic DMS, web leads |
| **Growth** | mid | More listings, WhatsApp CRM, syndication, pricing intelligence, verified badge |
| **Pro** | high | Unlimited listings, priority placement, advanced analytics, multi-staff, floor-plan eligibility |
| **Certified add-on** | per-car / premium | Mana Certified inspection + returns/warranty eligibility + featured |

> Pricing must be validated with real dealers in launch cities; tier→capability gating ties to verification tiers (plan 01).

## Data model
```
SubscriptionPlan
  id, name, price, interval, features(json), listing_limit, lead_limit

Subscription
  id, dealer_id, plan_id, status (trialing|active|past_due|cancelled)
  current_period_start/end, gateway_ref

Invoice
  id, dealer_id, amount, gst_amount, status, line_items(json), issued_at, paid_at

UsageMeter
  dealer_id, period, listings_used, leads_used, overage(json)

Payout
  id, dealer_id, amount, status, bank_ref, period   # if/when we hold transaction funds

ReferralCommission  (see plan 09)
PromotedPlacement
  id, dealer_id, vehicle_id, slot, amount, starts_at, ends_at, status
```

## API / endpoints
```
GET  /billing/plans
POST /billing/subscribe / change / cancel
GET  /billing/subscription / invoices
POST /webhooks/payments              -> gateway events (renewals, failures)
POST /promotions/featured            -> buy promoted slot
GET  /admin/revenue                  -> MRR, ARPU, attach rates, churn (plan 06)
```

## UI / screens
- **Dealer:** plan picker, current plan & usage, upgrade/downgrade, invoices (GST-compliant), buy featured slots, VAS purchases.
- **Buyer:** finance/insurance are free to use (we earn referral); no buyer paywall.
- **Admin (plan 06):** revenue dashboard (MRR, ARPU, attach/take rates, churn), referral ledger, promo management.

## Integrations
- **Payment gateway** (Razorpay/Cashfree) — subscriptions, mandates/auto-debit, payment links, payouts.
- **GST-compliant invoicing**; finance/insurance partner commission reconciliation (plan 09).

## Edge cases & failure modes
- **Off-platform leakage** (dealer+buyer transact offline to skip fees) → subscription base (not commission) makes this OK; lock value in CRM/finance/badge/payment rails.
- **Failed renewal / past_due** → grace period, dunning, then downgrade (hide premium listings) not hard delete.
- **GST invoicing** correctness → automated, audited.
- **Commission disputes** with partners → reconciliation ledger.
- **Refunds/chargebacks** → policy + admin flow.
- **Plan gaming** (exceed limits) → usage metering + soft/hard caps + overage.

## Acceptance criteria
- Dealers can subscribe, upgrade/downgrade, and receive GST-compliant invoices; renewals auto-charge with dunning on failure.
- Subscription tier gates listing/lead/feature limits server-side (tied to verification tier).
- Every financing/insurance/VAS transaction accrues tracked revenue/commission visible in the admin revenue dashboard.
- Promoted listings are billed and clearly labeled in search.
- Past-due accounts degrade gracefully (no data loss) and recover on payment.

## Dependencies
[01](./01-vendor-onboarding.md) (tier gating), [05](./05-inventory-management.md) (DMS/limits), [09](./09-financing-insurance.md) (referral commission), [10](./10-search-discovery.md) (promoted listings), [06](./06-admin-panel.md) (revenue ops), [11](./11-architecture-tech-stack.md) (payments infra).
