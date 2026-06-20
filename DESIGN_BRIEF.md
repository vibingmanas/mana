# Mana — Design Brief (whole-application)

> Paste this into a design agent. It designs the **entire** Mana product: a used-car marketplace for India whose whole personality is **trust**. It covers four buyer-facing screens in depth **and** the full surrounding product (sell flow, dealer console, admin, shared system). Mobile-first; excellent on desktop too.

---

## 1. Product, audience & goal

Mana organizes India's fragmented used-car market by putting a **trust layer** on top of local dealers: every car is RC-verified, odometer-checked, inspected, and finance-ready. Buyers and sellers — many in **tier-2 cities, transacting online for the first time** — are anxious about being cheated on **condition, price, and paperwork**. Every screen must make them feel **safe, informed, and in control**. The product is the calm, transparent opposite of a pushy dealer lot: **transparency over persuasion**.

---

## 2. Visual direction (the "refreshing" part)

Most Indian car sites are loud and dense — bright yellows/reds, cluttered grids, banner noise. Go the other way: **calm, spacious, confident, modern**. Signature move: a deep, trustworthy **ink-indigo** paired with a **warm cream** background and a single **warm coral** accent — premium and human, deliberately avoiding both the loud automotive yellow/red and the cold corporate-blue cliché.

- **Typography:** a clean, friendly grotesk or geometric sans. Large, legible sizes; strong hierarchy; generous line spacing.
- **Layout:** lots of whitespace, soft rounded corners, gentle shadows, **real car photography** front and center (never stock illustrations or clip art). Cards feel light and tappable, not packed.
- **Tone:** reassuring and human, not corporate. Microcopy that lowers anxiety.

### Color tokens (use exactly)
| Token | Hex | Use |
|---|---|---|
| Primary / brand — ink indigo | `#1F2747` | brand, headings, most UI |
| Page background — warm cream | `#FAF6EF` | app background |
| Cards & surfaces — white | `#FFFFFF` | cards, sheets |
| Primary text — charcoal | `#1C1B19` | body |
| Secondary text — warm grey | `#6B675F` | meta, captions |
| Borders / dividers | `#ECE6DA` | hairlines, card edges |
| Accent / primary CTA — warm coral | `#EE6352` → `#D84C3C` hover/press | primary buttons & key highlights ONLY |
| Trust / verification badge | ink indigo `#1F2747` text on pale indigo `#ECEEF6` | all verification & trust badges — **not green** |

Use coral **sparingly** (primary buttons + key highlights). Everything else is indigo, cream, white, warm greys. Trust badges are **indigo-on-pale-indigo**, never green.

---

## 3. Design system (define once, reuse everywhere)

- **Type scale** (display / h1–h3 / body-lg / body / caption), buttons, inputs, selects, chips/filter-pills, tabs, segmented control.
- **Cards:** car card (multiple densities), info card, stat card, offer card, plan card.
- **Trust components** (the soul of the product): **verification badge**, **certification-tier badge**, **inspection score ring + category bars**, **odometer-check chip**, **vehicle-history rows**, **assurance badges** (warranty / return window / RC-transfer), **verified-dealer card**.
- **Patterns:** sticky bottom CTA bar (mobile), collapsible filter rail (progressive disclosure), multi-step flow with progress, bottom sheets, inline EMI calculator, OTP input, empty/loading/error states, skeleton loaders.
- **Iconography:** simple line icons, indigo. No clip art.
- **Imagery:** real car photos, soft rounded corners, consistent aspect ratio (4:3 cards, 16:9 hero/gallery), photo-count + video-walkaround indicators.
- **Motion:** subtle, calm (150–250ms ease), no bounce/flash.
- **States to design for every list/data screen:** loading (skeletons), empty (friendly + a next action), error (calm + retry), low-bandwidth (lightweight, lazy images).
- **Accessibility:** AA contrast, ≥44px tap targets, focus states, labels; English + Hindi-ready (longer strings must not break layout).

---

## 4. Screen inventory

Design **all** of these. The four buyer screens are the showcase; the rest complete the product.

### A. BUYER — public, trust-first

**A1. Homepage**
- Calm hero, single clear promise (e.g. **"Every car inspected. Every price honest."**) over real car photography.
- Prominent **simple search**: one bar + a few high-intent quick filters only — **budget, body type, brand, city**. Don't overwhelm.
- **Budget-first entry tiles** (price-sensitive market): Under ₹5L · ₹5–10L · ₹10–15L · ₹15L+. And **by body type**: hatchback, SUV, sedan, MUV.
- Header **"Sell your car"** entry + a homepage band: **"Get your car's price in 2 minutes — free, no obligation"** → sell flow.
- Short **"how it works / why trust us"** strip (icon + one line each): inspection · transparent pricing · return window · RC-transfer help.
- **Featured verified cars** row previewing the listing card.
- Footer: For Dealers, Admin (subtle), about/contact.

**A2. Search / Listings**
- **Collapsible filter rail, progressive disclosure**: common filters shown, advanced under "More". Filters: **budget + EMI range, brand/model, year, km driven, fuel, transmission, body type, owners, city.**
- Clean **card grid**. Each card: real photo with **photo-count** + **video-walkaround** indicator; year + model; key facts (km, fuel, transmission, owners); city; **price AND estimated monthly EMI**; a **verification/certification badge** (e.g. "Mana Inspected · 200 pts", or trust tier); a **deal chip** ("Great deal / Fair price / Above market" vs fair-price estimate). No sponsored clutter; if promoted, label honestly.
- **Sort:** relevance / price / year / best-deal. **Sticky, thumb-friendly filter access on mobile** (bottom-sheet filters).
- Empty state: widen search suggestion.

**A3. Car detail (the trust centerpiece)**
- Large **photo gallery** + **video-walkaround** slot.
- Headline: model, year, variant. **Price with itemized on-road breakdown** (ex-showroom, RTO, insurance, any fee) + explicit **"no hidden charges"**. **Inline EMI calculator** (down payment + tenure → monthly).
- **Inspection-report summary, visual**: overall **condition score** + category breakdowns (**engine, transmission, exterior, interior, tyres, electricals**) so buyers see exactly what was checked.
- **Vehicle-history block**: number of owners, service-history status, accident/insurance-claim status, registration/RTO details, **insurance & PUC validity**, **hypothecation (loan) status**, **pending challans**. India has no single CARFAX — present clearly and authoritatively.
- **Odometer-check** indicator (validated / flagged) — fraud reassurance.
- **Assurance badges**: warranty, money-back/return window, free RC-transfer assistance.
- **Seller/dealer card** with **verification-tier indicator** (verified dealer / trust level) + city.
- One **primary, unmissable CTA** — **"Book a free test drive"** (or "Reserve this car") — + softer secondary (save / ask a question). **Primary CTA sticky on mobile.**
- Test-drive booking: **at-dealer or doorstep**, pick a real time slot.
- "Check finance" → EMI eligibility + apply.

**A4. Buyer account (light)**
- OTP sign-in (phone). Saved cars (wishlist), my enquiries/test-drives (status), saved searches + alerts, **notifications feed** (price-drop, saved-search match), finance applications status.

### B. SELLER — sell your car (instant valuation + multi-offer)

Short, friendly, multi-step; clear progress (**Step 1 of 3**); minimise typing — prefer taps & lookups.
- **Step 1 — Identify the car:** **registration-number lookup** auto-fills make/model/year/variant (VAHAN-style), with **"enter details manually"** fallback (brand → model → year → variant → fuel → transmission).
- **Step 2 — Condition:** a few friendly questions on one screen, large tappable choices — km driven, owners, city, **overall condition (visual options, not jargon)**, any major accident/damage.
- **Step 3 — Instant estimate:** clear **price RANGE** (not one hard number) + confidence line ("based on recent sales of similar cars").
- **The differentiator:** instead of a single take-it-or-leave-it buyout, the seller **books a free doorstep inspection** then receives **multiple competitive offers from verified dealers** — a clean **comparable list** (offer amount + dealer trust tier) to pick transparently.
- Trust woven throughout: free doorstep inspection, **no obligation**, instant/secure payment on acceptance, **free RC-transfer + paperwork handled**.

### C. DEALER — the console (the paying customer)

**C1. Dealer onboarding / verification (KYC)**
- Resumable multi-step wizard with **verification tiers** shown as progress: **T0 Registered → T1 Identity → T2 Business → T3 Mana Certified**. Steps: phone (OTP) → email (OTP) → **Aadhaar (DigiLocker, consent-first, privacy-reassuring copy)** → PAN → GST → bank (penny-drop). Each step shows what it unlocks. Calm, trustworthy, compliance-aware microcopy ("we never store your full Aadhaar").

**C2. Dealer dashboard** — stat cards (live listings, new leads, upcoming test-drives, sales this month, tier), section nav, quick actions.

**C3. Inventory management** — list with status + days-in-stock; add car by reg-number (auto-fill), verify RC, set price (with **fair-price guidance**), add photos/360°/video, run **odometer check** + **AI inspection**, publish. Publish checklist (tier, RC, photo, price, odometer-ok, plan limit).

**C4. Leads / CRM** — unified inbox + **pipeline** (New → Contacted → Qualified → Appointment → Won/Lost), buyer contact, **click-to-WhatsApp**, notes.

**C5. Appointments** — availability calendar (weekly windows, doorstep toggle/radius), incoming requests, confirm / reschedule / complete (showed + outcome) / cancel.

**C6. Plans & billing** — plan cards (**Starter free / Growth / Pro**), current plan + usage (live-listing limit), subscribe/upgrade, GST invoices list.

**C7. Services** — RC-transfer cases (Form 29/30, NOC, insurance-transfer steps), finance/insurance referral leads.

### D. ADMIN — ops control plane (internal, still on-brand)
- Dashboard KPIs (dealers/vehicles by status, totals, MRR). Verification review queue (approve/reject dealers, set tier). Listing moderation (hold/remove/approve). Dealer 360 (KYC masked — **never expose Aadhaar**). Disputes. Referral/commission ledger. **Append-only audit log.** Clean data-dense tables with calm styling.

### E. SHARED / SYSTEM
- OTP sign-in sheet (phone, 6-digit). Notifications feed. Global nav (buyer + dealer + admin contexts). 404 / offline / maintenance. Loading & skeletons. To= toast/snackbar. Confirmation dialogs (reason-required for destructive admin actions).

---

## 5. Real data & feature appendix (so the design reflects the real system)

- **Verification tiers:** T0 Registered · T1 Identity (Aadhaar+PAN) · T2 Business (GST+bank) · T3 Mana Certified. Buyer-facing badge reflects dealer tier.
- **Certification tiers (per car):** Listed (self-declared) · AI-checked · **Mana Inspected** · **Mana Certified**.
- **Inspection:** overall 0–100 score + grade A–D; categories: engine, transmission, electrical, suspension/brakes, structure/body, interior, tyres, AC. Show as a **score ring + category bars**.
- **Odometer check:** LOW / MEDIUM / HIGH fraud risk with plain-language reason. HIGH = blocked/flagged.
- **Vehicle verification (VAHAN/RC):** owner, RC status, insurance validity + provider, PUC validity, **hypothecation/loan status**, **pending challans**.
- **Pricing/valuation:** fair-price band (low/fair/high) + **deal score** → "Great deal / Fair price / Above market". EMI: reducing-balance (price, down payment, tenure up to 7 yrs).
- **Lead intents:** Enquiry · Test drive · Finance. **Appointment types:** At-dealer · Doorstep.
- **Finance/insurance/RC:** loan eligibility + apply (partner NBFCs/banks), insurance quote/buy, RC-transfer assistance (Form 29/30, NOC, insurance transfer). Seller side: **multiple dealer offers** post-inspection.
- **Plans:** Starter (free, 3 listings) · Growth (25) · Pro (unlimited). GST invoices.
- **Notifications:** price-drop on saved car, saved-search match.
- **Trust assurances:** inspection, transparent on-road pricing, return window, free RC-transfer, warranty, verified dealers.

---

## 6. Principles throughout
Fast & lightweight (assume tier-2 bandwidth — lazy images, minimal payload). Thumb-reachable controls; sticky primary CTAs on mobile. Minimal steps to value. **Transparency over persuasion.** Trust signals **woven into the UI**, not bolted on as banners. Calm, human microcopy that lowers anxiety at every anxious moment (price, condition, paperwork, payment).

**Deliver:** a cohesive design system + high-fidelity designs for every screen above, mobile and desktop, with realistic Indian car data and real photography.
