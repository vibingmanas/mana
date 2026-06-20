# Plan 09 — Financing, Insurance & RC Transfer

## Goal
Capture the **highest-margin layer** of the used-car market — embedded **buyer financing**, **insurance**, **RC-transfer assistance**, and **dealer floor-plan financing** — via partner referrals (asset-light). Research is unambiguous: used-car finance penetration is only **~23–35%** (vs ~80%+ new), NBFCs already take ~51% of it, and the incumbents pivoted to lending for survival. **The money is in the lending layer, not the inventory layer.**

## User stories
- As a **buyer**, I want to check my EMI and loan eligibility on a listing without leaving the flow.
- As a **buyer**, I want help with RC transfer and insurance so the paperwork isn't a nightmare.
- As a **dealer**, I want floor-plan/inventory financing so I can stock more cars.
- As **Mana**, I want referral commission on every loan and policy facilitated.

## Scope
**In:** EMI calculator, buyer loan eligibility & application (referral to NBFC/bank partners), insurance quote & purchase (referral), RC-transfer assistance service, challan-payment service, **dealer floor-plan financing** (referral/marketplace), commission tracking.
**Out:** Becoming/owning an NBFC (future; start as referral marketplace); core KYC (see [07](./07-verification-kyc.md)); subscription billing (see [12](./12-monetization.md)).

## Sub-features

### A. Buyer financing
- **EMI calculator** (price, down payment, rate, tenure up to 7 yrs) on every listing.
- **Eligibility pre-check** (soft) → **loan application** routed to partner NBFC/bank APIs; status tracking; disbursal handoff.
- Partners: NBFCs (Cholamandalam, Mahindra Finance, Poonawalla, Shriram), banks (HDFC, Kotak, ICICI, IDFC First), and aggregator lending APIs.
- **Tier-2 focus:** tier-2 buyers finance more (~58%) — surface finance prominently there.

### B. Insurance
- **Quote** comparison + **purchase**/transfer referral; reminder that policy must transfer within **14 days** of sale.
- Partners: insurer/aggregator APIs (e.g., InsuranceDekho-style, Turtlemint, Policybazaar APIs).

### C. RC transfer & paperwork assistance
- Guided **Form 29/30** flow, NOC (inter-state / hypothecation), insurance transfer, status tracking; partner/agent fulfilment. Top buyer pain + strong differentiator.

### D. Challan payment
- Surface pending challans (from [07](./07-verification-kyc.md)) and offer pay-through service.

### E. Dealer floor-plan financing
- Working-capital/inventory credit for dealers (referral to lenders; later own product). Wide-open, high-margin; deepens dealer lock-in.

## Data model
```
FinanceApplication
  id, buyer_id, vehicle_id, dealer_id
  amount, down_payment, tenure_months, partner_id
  status (eligibility|applied|approved|rejected|disbursed)
  partner_ref, commission_amount, created_at

InsuranceQuote / InsurancePolicy
  id, buyer_id, vehicle_id, partner_id, premium, coverage(json)
  status (quoted|purchased|transferred), commission_amount

RCTransferCase
  id, vehicle_id, buyer_id, dealer_id
  steps(json: form29,form30,noc,insurance_transfer), status, agent_id, fee, created_at

ChallanPayment
  id, vehicle_id, challan_ref, amount, status, partner_ref

FloorPlanFacility
  id, dealer_id, partner_id, limit, utilized, status, terms(json)

ReferralCommission
  id, source_type (finance|insurance|rc|floorplan), source_id
  partner_id, amount, status (accrued|invoiced|paid), created_at
```

## API / endpoints
```
GET  /finance/emi-calc?price&dp&rate&tenure
POST /finance/eligibility            -> soft check
POST /finance/applications           -> submit to partner
GET  /finance/applications/:id       -> status
POST /insurance/quotes  + /purchase
POST /rc-transfer/cases  + status updates
POST /challan/pay
POST /dealer/floor-plan/apply  + status
GET  /admin/referrals                -> commission tracking (plan 06)
```

## UI / screens
- **Listing:** EMI widget + "Check eligibility" + "Insure this car."
- **Buyer:** finance application wizard, status tracker; insurance quote/compare; RC-transfer tracker.
- **Dealer:** floor-plan application & utilization; finance/insurance leads from their cars.
- **Ops (plan 06):** referral/commission ledger, RC-transfer case management, payout reconciliation.

## Integrations
- NBFC/bank lending APIs, insurer/aggregator APIs, **VAHAN/challan** ([07](./07-verification-kyc.md)), payment gateway, eSign/eStamp (Digio) for agreements.

## Edge cases & failure modes
- **Loan rejected** → suggest alternative partners/down-payment; don't dead-end.
- **Active hypothecation on the car** → must clear (NOC) before transfer/finance; block certified sale until cleared.
- **Insurance lapse** at sale → flag, expedite transfer within 14-day rule.
- **Commission disputes** with partners → reconciliation ledger + audit.
- **Regulatory:** lending/insurance distribution may need RBI/IRDAI-compliant partnerships or licenses (corporate agent/broker) — legal sign-off; start as referral, not lender of record.
- **Floor-plan default risk** → partner underwrites; Mana is referrer initially.

## Acceptance criteria
- Every listing shows an EMI estimate; a buyer can run eligibility and submit a loan application to a partner with status tracking.
- Insurance quote/purchase and RC-transfer assistance are available and tracked end-to-end.
- Every facilitated loan/policy/transfer accrues a tracked referral commission visible in admin.
- Cars with active hypothecation cannot reach certified sale until NOC is recorded.
- Dealers can apply for floor-plan financing and see utilization.

## Dependencies
[02](./02-car-registration-listing.md)/[07](./07-verification-kyc.md) (RC/hypothecation/challan), [03](./03-customer-buyer.md) (buyer flow), [05](./05-inventory-management.md) (dealer leads/floor-plan), [06](./06-admin-panel.md) (commission ops), [12](./12-monetization.md) (revenue). Requires RBI/IRDAI-aware legal structuring.
