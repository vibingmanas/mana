# Plans Overview

This directory holds one plan per feature/area for **Mana** — the platform that organizes India's unorganized used-car dealer market. Read the top-level [`../PROJECT_REPORT.md`](../PROJECT_REPORT.md) first for context, thesis, and market data.

## How these plans are structured

Each plan follows the same shape so they're easy to scan and hand to engineers:

1. **Goal** — what this feature achieves and why it matters.
2. **User stories** — role-based "As a … I want … so that …".
3. **Scope** — in-scope vs explicitly out-of-scope.
4. **Data model** — key tables/entities and important fields.
5. **API / endpoints** — main backend operations.
6. **UI / screens** — primary screens and states.
7. **Integrations** — third-party services.
8. **Edge cases & failure modes.**
9. **Acceptance criteria** — testable "done" conditions.
10. **Dependencies** — other plans this relies on.

## Index

| # | Plan | Area |
|---|---|---|
| 01 | [Vendor onboarding](./01-vendor-onboarding.md) | Dealer signup + email/phone/Aadhaar/PAN/GST/bank verification |
| 02 | [Car registration & listing](./02-car-registration-listing.md) | RC/VAHAN verify, media, listing lifecycle |
| 03 | [Customer / buyer](./03-customer-buyer.md) | Search, compare, save, lead, account |
| 04 | [Appointment booking](./04-appointment-booking.md) | Test drives & dealer visits |
| 05 | [Inventory management (DMS)](./05-inventory-management.md) | Dealer stock, pricing, CRM, syndication |
| 06 | [Admin panel](./06-admin-panel.md) | Ops, moderation, approvals, disputes |
| 07 | [Verification & KYC engine](./07-verification-kyc.md) | Shared verification service + compliance |
| 08 | [Trust, inspection & fraud](./08-trust-inspection.md) | Inspection, certification, odometer/history |
| 09 | [Financing, insurance & RC transfer](./09-financing-insurance.md) | Embedded loans, insurance, paperwork |
| 10 | [Search, discovery & valuation](./10-search-discovery.md) | Search infra, AI pricing, alerts |
| 11 | [Architecture & tech stack](./11-architecture-tech-stack.md) | System design, data model, infra |
| 12 | [Monetization](./12-monetization.md) | Revenue model, billing |
| 13 | [Market research](./13-market-research.md) | Sized opportunity, competitors, sources |

## Cross-cutting conventions

- **Stack:** Next.js (App Router) + Node.js (NestJS) + PostgreSQL + Redis + OpenSearch + S3-compatible storage. Detail in [11](./11-architecture-tech-stack.md).
- **Auth:** OTP-first (phone), session/JWT, RBAC across roles (Dealer, Buyer, Admin, Inspector).
- **Compliance:** All PII/Aadhaar handling per [07](./07-verification-kyc.md) — DigiLocker-first, masking, data vault, DPDP consent logging.
- **i18n:** All buyer/dealer surfaces multi-language (English + Hindi at minimum; vernacular for launch states).
- **Audit:** Every state change on verification, listing status, payout, and admin action is written to an immutable audit log.
