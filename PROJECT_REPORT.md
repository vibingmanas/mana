# Mana — Comprehensive Project Report

> **Working name:** *Mana* (placeholder — see naming note in §13)
> **One line:** A trust-and-tooling platform that organizes India's unorganized second-hand car dealer market — aggregating local dealers' inventory, verifying them and their cars, and connecting buyers, instead of buying and reselling cars ourselves.
> **Document status:** v1 — full product vision (no MVP phasing, per scope decision).
> **Last updated:** 2026-06-19

---

## 1. Executive summary

India sells **~5.9–6.1 million used cars per year** (FY25), already **1.4–1.5× the new-car market** and widening toward **2:1 by ~2028**. The market is worth **~USD 36 billion (2025)**, growing **~11–15% CAGR** toward **USD 68–83 billion by 2030**.

The decisive fact: **~70–75% of that volume flows through *unorganized* local dealers and C2C** — roughly **4.8 million of 6 million transactions are informal and undigitized.** The funded incumbents (Cars24, Spinny) attacked this market by *buying, refurbishing and reselling* cars themselves. That model makes **procurement ~82% of cost**, and after **$1bn+ burned**, neither leader is profitable.

**Mana's thesis:** don't out-Cars24 Cars24 on inventory. Instead, **digitize, verify, finance and add trust to the unorganized dealer long tail** — an **asset-light aggregator** that equips existing local dealers with the tooling and trust signals organized players have, without taking on inventory risk. We make money on **dealer subscriptions + financing/insurance referral + value-added services**, not on the buy/sell spread.

This report covers the full product: vendor (dealer) onboarding with email/phone/Aadhaar verification, car registration & verification, the customer/buyer experience, appointment booking, dealer inventory management, an admin panel, and a market-researched feature set. Detailed per-feature plans live in [`/plans`](./plans/).

---

## 2. Problem & opportunity

### 2.1 The buyer's problem
Buying from a local used-car dealer in India is a low-trust experience:
- **No standardized condition assessment** — buyers can't tell a good car from a lemon.
- **Fraud is rampant** — ~1 in 5 used cars has a **tampered odometer**; forged RCs, concealed active **hypothecation** (loan not cleared), and undisclosed accident/flood damage are common.
- **Opaque pricing** — no objective "fair price" reference across fragmented dealers.
- **Painful paperwork** — RC transfer, Form 29/30, NOC, insurance transfer take 7–21 days and confuse buyers.
- **Thin financing** — only **~23–35%** of used-car buyers get formal credit (vs ~80%+ for new cars).

### 2.2 The dealer's problem
The local dealer is capital-starved and under-tooled:
- **No good inventory/lead software** — most run on WhatsApp, paper, and memory.
- **Poor reach** — limited to walk-ins and local word of mouth.
- **Floor-plan / working-capital constraints** — most don't own inventory outright.
- **No trust signal** — can't credibly compete with Cars24/Spinny's "Assured" branding.

### 2.3 Why incumbents leave this open
- Cars24/Spinny **compete with** dealers (buy inventory) rather than **enable** them.
- Their inventory model is **capital-intensive and unprofitable**; OLX Autos' managed C2B model was **shut down (Oct 2023)** for bad unit economics.
- **CarArth** is the closest pure-play (trust-ranked aggregator) but **does not handle transactions or enable dealer operations**.
- **CarTrade Used Auto** (2025) is the real strategic threat — a unified asset-light portal targeting ₹1.2 lakh crore GMV — but it's **broad and shallow per dealer**; it won't deeply solve a small dealer's daily operations.

### 2.4 The opportunity
Be the **"Shopify + trust layer + lender" for the local used-car dealer.** Capture the **trust and financing economics** (the profitable layers) without owning inventory, in the **tier-2/3 geography (62% of sales)** where incumbents have weak physical density and local dealers are dense.

Full market data and sourcing: [`/plans/13-market-research.md`](./plans/13-market-research.md).

---

## 3. Product vision & principles

**Vision:** Every local used-car dealer in India runs their business on Mana, and every buyer trusts a Mana listing as much as a Cars24-Assured one.

**Principles:**
1. **Asset-light.** We never own cars. We enable the people who do.
2. **Trust is the product.** Verification (dealer + car), inspection, and transparency are the core, not afterthoughts.
3. **Dealer-first.** The dealer is our paying customer; buyer features exist to drive dealer success.
4. **Compliant by design.** Aadhaar/KYC, DLT SMS, DPDP Act — built in, not bolted on (see §7).
5. **WhatsApp-native.** India's used-car funnel lives on WhatsApp; we meet dealers and buyers there.
6. **Tier-2/3 ready.** Mobile-first, low-bandwidth, vernacular-capable.

---

## 4. User roles

| Role | Description | Primary surface |
|---|---|---|
| **Vendor (Dealer)** | Local used-car dealer — onboards, lists & manages inventory, handles leads & appointments. | Dealer web dashboard + mobile, WhatsApp |
| **Customer (Buyer)** | Consumer searching, comparing, booking test drives, applying for finance. | Public web/mobile site, WhatsApp |
| **Admin / Ops** | Mana staff — verification approvals, moderation, dispute resolution, inspection ops, finance ops. | Admin panel |
| **Inspector** *(field/partner)* | Conducts standardized inspections; can be Mana staff or partner. | Inspector mobile app/PWA |
| **Finance/Insurance partner** *(API)* | NBFC/bank/insurer integrations for embedded lending & insurance. | Partner APIs |

---

## 5. Feature map

Each links to its detailed plan in [`/plans`](./plans/).

| # | Feature | Plan |
|---|---|---|
| Core | Vendor onboarding (email + phone + Aadhaar + PAN + GST + bank) | [`01-vendor-onboarding.md`](./plans/01-vendor-onboarding.md) |
| Core | Car registration & listing (VAHAN/RC, photos, 360°) | [`02-car-registration-listing.md`](./plans/02-car-registration-listing.md) |
| Core | Customer / buyer experience (search, compare, lead) | [`03-customer-buyer.md`](./plans/03-customer-buyer.md) |
| Core | Appointment booking (test drives & visits) | [`04-appointment-booking.md`](./plans/04-appointment-booking.md) |
| Core | Dealer inventory management (DMS) | [`05-inventory-management.md`](./plans/05-inventory-management.md) |
| Core | Admin panel | [`06-admin-panel.md`](./plans/06-admin-panel.md) |
| Cross | Verification & KYC engine | [`07-verification-kyc.md`](./plans/07-verification-kyc.md) |
| Trust | Inspection, certification & fraud detection | [`08-trust-inspection.md`](./plans/08-trust-inspection.md) |
| Growth | Financing, insurance & RC transfer services | [`09-financing-insurance.md`](./plans/09-financing-insurance.md) |
| Growth | Search, discovery & valuation | [`10-search-discovery.md`](./plans/10-search-discovery.md) |
| Foundation | Architecture & tech stack | [`11-architecture-tech-stack.md`](./plans/11-architecture-tech-stack.md) |
| Business | Monetization | [`12-monetization.md`](./plans/12-monetization.md) |
| Reference | Market research | [`13-market-research.md`](./plans/13-market-research.md) |

---

## 6. Market-researched feature recommendations

Distilled from live research (full detail + sources in [`/plans/13-market-research.md`](./plans/13-market-research.md)). Features marked ★ are the differentiating wedge.

### Buyer-facing
- ★ **Standardized inspection report (200–300 point), public per listing** — table-stakes for organized players; the unifying trust layer over heterogeneous dealer inventory.
- ★ **AI odometer-fraud flag + vehicle history report** — Cars24 launched an AI odometer tool (Sept 2025); ~1 in 5 cars tampered. Platform-level fraud scoring is a powerful trust signal.
- **Money-back / 5–7 day return window** — removes the "what if it's a lemon" objection (offered via partnered/certified inventory).
- **Warranty (up to 1–3 yr)** — converts one-time sale into trust; reduces post-sale disputes.
- **Doorstep / home test drive** — high-conversion; removes friction of visiting scattered lots.
- **Integrated financing + EMI calculator** — embedded loans address the #1 budget-buyer gate.
- **RC transfer / paperwork assistance** — top buyer pain; strong differentiator vs raw classifieds.
- **360°/video walkarounds** — expected before visiting a remote dealer lot.
- **Price-drop alerts + AI "fair price" valuation badge** — fixes pricing opacity.
- **Insurance bundling + buy-back / exchange** — raises lifetime value.

### Dealer-facing
- ★ **WhatsApp-native CRM / lead management** — 48% of buyers contact dealers via WhatsApp; fast reply ≈ 3× conversion. The single highest-leverage dealer tool in India.
- **Cloud inventory management (DMS)** — the spine of dealer ops.
- **Photography / 360° listing-creation assistance** — small dealers lack good media; directly lifts conversion.
- **Pricing intelligence for dealers** — helps thin-margin dealers (2.9–7.5%) price for faster turns.
- **Listing syndication** — one feed → platform + WhatsApp catalog + social.
- ★ **Dealer / floor-plan (inventory) financing** — wide-open, high-margin; incumbents only finance *consumers*.
- **Payment collection (UPI/WhatsApp payment links)** — speeds dealer cash cycle.

### Trust & verification
- **Verified-dealer badging / KYC tiers** (IndiaMART model — and itself a paid tier).
- **Hypothecation / loan-clearance & RC-authenticity checks** at listing time.
- **Structural/underbody inspection flags** (catches cosmetic fraud hiding accident/flood damage).

### 2025+ trends to ride
- **AI inspection from photos** (inspect distributed dealer inventory cheaply at scale).
- **AI dynamic valuation/pricing.**
- **WhatsApp conversational commerce** (catalog → 360° → lead → payment link).
- **Used-EV/hybrid segment** (growing ~21.7% CAGR; needs **battery-health verification** — a future trust feature).
- **Omnichannel** (online discovery + central inspection + offline delivery/handover hubs).
- **Platform-certified pre-owned tier** layered over local dealers.

---

## 7. Compliance & legal (India)

> Not legal advice — a fintech/data-protection lawyer must sign off before launch. Detail in [`/plans/07-verification-kyc.md`](./plans/07-verification-kyc.md).

- **Aadhaar:** Section 57 (private contractual use) was **struck down (2018)**. A 2025 MeitY rule reopened direct UIDAI authentication to private entities via a **discretionary government approval** — too slow/uncertain to depend on. **Default to consent-based DigiLocker** (digitally-signed, tamper-evident docs) with **Offline Aadhaar XML/QR** as fallback, accessed via a **licensed KYC provider** (Signzy / Surepass / Cashfree / Setu / Digio). **Never** call UIDAI OTP/biometric eKYC as an unlicensed AUA/KUA.
  - **Handling rules:** mask first 8 digits; store full Aadhaar only in an **Aadhaar Data Vault** (encrypted, UID-token) if at all; **purge auth data within 6 months**; log consent (DPDP Act 2023).
  - **Penalties:** civil up to **₹1 crore** per contravention + **₹10 lakh/day**; unauthorized disclosure **3 yr jail + ₹1 lakh** (company).
- **Phone OTP:** **TRAI DLT registration is mandatory** for all commercial SMS incl. OTP — register PE ID + sender header + templates. Use MSG91/Gupshup (~₹0.15–0.17/SMS).
- **Car/RC:** Verify via **VAHAN/Parivahan** APIs (Surepass/Signzy/Karza) — owner, make/model, **insurance & PUC validity**, **hypothecation/financer**, **pending challans**. RC transfer uses **Form 29/30**, NOC only for inter-state, insurance transfer within **14 days**.
- **Dealer KYC:** PAN (~₹1.2/hit), GST (sub-₹5), bank **reverse penny-drop** (₹4–9).
- **Consumer Protection Act 2019** + **BNS §318 (cheating, ex-IPC 420)** apply to misrepresentation/odometer fraud — surfacing hypothecation/challan/insurance status limits platform liability.
- **No central used-car dealer licence** exists; dealers need GST, trade certificate (Forms 16/17), Shops & Establishments registration.

**Recommended onboarding check order:** Email → Phone (DLT OTP) → Aadhaar (DigiLocker) → PAN → GST → Bank (penny-drop) → per-vehicle RC/VAHAN + hypothecation + challan + insurance.

---

## 8. Architecture (summary)

Full detail in [`/plans/11-architecture-tech-stack.md`](./plans/11-architecture-tech-stack.md).

- **Frontend:** Next.js (App Router) — public marketplace (SSR/ISR for SEO on listings), dealer dashboard, admin panel. React Native/PWA for inspector & dealer mobile later.
- **Backend:** Node.js (NestJS) REST/tRPC API, modular services (auth, KYC, listings, bookings, inventory, payments, notifications).
- **DB:** PostgreSQL (primary, PostGIS for geo), Redis (cache/queues/rate-limit), object storage (S3-compatible) for media, OpenSearch/Elastic for listing search.
- **Async:** BullMQ/SQS for verification calls, image processing, notifications.
- **Integrations:** KYC aggregators (DigiLocker/PAN/GST/bank/VAHAN), DLT SMS (MSG91), email (SES), WhatsApp Business API, payment gateway (Razorpay/Cashfree), NBFC/insurer APIs, maps.
- **Cross-cutting:** RBAC, audit log, Aadhaar Data Vault, observability, feature flags, multi-language (i18n) for vernacular.

---

## 9. Data model (high-level)

Core entities (detailed per-plan): `User`, `Dealer` (vendor), `DealerKYC`, `Vehicle/Listing`, `VehicleVerification` (RC/challan/hypothecation), `Inspection`, `MediaAsset`, `Appointment`, `Lead`, `Conversation` (WhatsApp), `FinanceApplication`, `InsuranceQuote`, `RCTransferCase`, `Subscription/Invoice`, `Payout`, `AdminAction/AuditLog`, `Review/Rating`, `Notification`.

A consolidated ER overview lives in [`/plans/11-architecture-tech-stack.md`](./plans/11-architecture-tech-stack.md).

---

## 10. Monetization

Layered, asset-light (detail in [`/plans/12-monetization.md`](./plans/12-monetization.md)):
1. **Dealer subscription** (verified listings + lead access + DMS) — **primary**, avoids transaction-conflict incentives, fits dealer budgets.
2. **Financing & insurance referral commission** — **highest margin**; the layer incumbents pivoted to for survival.
3. **Value-added services** — inspection, warranty, RC transfer, photography, **floor-plan financing**.
4. **Lead fees** (pay-per-qualified-lead) and **featured-placement ads** — complementary.
5. **Transaction commission** — optional/where enforceable; paired with subscription, not relied on.

---

## 11. Key risks & mitigations

| Risk | Mitigation |
|---|---|
| **Aadhaar/KYC non-compliance** (₹1cr+ penalties) | DigiLocker/offline only via licensed provider; data vault; 6-month purge; legal sign-off |
| **Off-platform leakage** (dealer + buyer transact offline, skip our fee) | Subscription (not commission) base; lock value in CRM, financing, trust badge, payment rails |
| **CarTrade Used Auto** out-scales us | Go deep on dealer *operations* + financing, not just listings; own tier-2/3 density |
| **Trust failure** (a fraud slips through, brand damage) | Multi-source verification, inspection, returns on certified tier, dispute ops, insurance |
| **Dealer adoption friction** (low digital literacy) | WhatsApp-native, vernacular, field onboarding, assisted listing |
| **Two-sided cold start** | Seed supply (dealers) first in 1–2 cities; demand follows verified inventory |
| **Data quality of VAHAN/valuation** | Multiple providers, confidence scoring, human review in admin |

---

## 12. Success metrics (North Star + supporting)

- **North Star:** *Verified dealer transactions facilitated / month* (listing → lead → booking → sale).
- Supply: active verified dealers, listings live, listing quality score.
- Demand: MAU buyers, lead volume, lead→appointment→sale conversion.
- Trust: % listings inspected, fraud-flag catch rate, dispute rate, return rate (certified).
- Money: paying dealers, ARPU, financing/insurance attach rate, take rate, gross margin.
- Ops: verification turnaround, inspection SLA, support resolution time.

---

## 13. Naming note

Folder/working name is **"Mana."** Validate trademark + `.in`/`.com` domain availability before committing. Alternatives to test: a Hindi/trust-anchored name (e.g., *Bharosa*, *Saaf*, *PakkaCar*) given the trust-first positioning. Decide before brand build.

---

## 14. Open questions for founder

1. **Geography:** which 1–2 launch cities (tier-2 with dense dealers)?
2. **Inspection ops:** in-house inspectors vs partner (e.g., Adroit-style) vs AI-photo-first?
3. **Lending:** own NBFC eventually, or pure referral to bank/NBFC partners at start?
4. **Certified tier:** do we offer returns/warranty on a "Mana Certified" subset, taking some risk for trust?
5. **Pricing:** dealer subscription tiers & price points (needs dealer interviews).

---

*Detailed feature plans: [`/plans`](./plans/). Market research with sources: [`/plans/13-market-research.md`](./plans/13-market-research.md).*
