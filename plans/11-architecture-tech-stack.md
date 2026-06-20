# Plan 11 — Architecture & Tech Stack

## Goal
Define the system architecture, tech choices, data model, and infrastructure for Mana — optimized for India (mobile-first, tier-2/3, low bandwidth, vernacular), trust/compliance, and asset-light scale.

## Stack (decision: Next.js + Node + Postgres)
| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js (App Router)** | SSR/ISR for SEO on public listings (organic discovery is huge for used cars); one framework for public site, dealer dashboard, admin panel |
| **Mobile** | PWA first; **React Native** later (inspector + dealer apps) | Reuse JS; offline inspector app |
| **Backend** | **Node.js + NestJS** | Modular, typed, good for a service-oriented monolith → services |
| **API** | REST + tRPC (internal) / OpenAPI | Typed contracts |
| **DB** | **PostgreSQL** (+ **PostGIS**) | Relational core; geo for search/doorstep |
| **Cache/queue** | **Redis** + **BullMQ** | Sessions, rate-limit, async verification/notifications |
| **Search** | **OpenSearch/Elasticsearch** | Faceted, geo, fast |
| **Storage** | **S3-compatible** + CDN | Media (photos/360/video), reports |
| **AI** | Vision models (inspection/odometer), valuation ML service, Claude (Opus/Sonnet) for assist/copy/support | Trust + pricing + ops |
| **Infra** | Containers (Docker) on a cloud (AWS/GCP) in an **India region** (data residency) | DPDP/data residency |
| **IaC/CI** | Terraform + GitHub Actions | Reproducible |
| **Observability** | OpenTelemetry, logs/metrics/traces, Sentry | Reliability |

## High-level architecture
```
        Next.js (public site / dealer dashboard / admin)
                         |  (REST/tRPC, auth)
                 API Gateway / NestJS app
   ┌──────────┬──────────┬───────────┬───────────┬─────────────┐
   │ Auth/RBAC│ Listings │ Inventory │ Bookings  │ Notifications│
   │ Verify   │ Search   │ Finance   │ Inspection│ Payments     │  (modular services)
   └────┬─────┴────┬─────┴─────┬─────┴─────┬─────┴──────┬──────┘
        │          │           │           │            │
   PostgreSQL   OpenSearch    Redis     S3/CDN    External APIs
   (+PostGIS)                +BullMQ              (KYC/VAHAN/SMS/WhatsApp/
   Aadhaar Vault (separate, KMS-encrypted)        payments/NBFC/insurer)
```
Start as a **modular monolith** (NestJS modules with clear boundaries), extract high-load/compliance-sensitive parts (Verification/Aadhaar vault, Search, Notifications) into services as needed.

## Consolidated data model (entities across plans)
```
User (base: id, role, phone, email, status)
 ├─ Buyer            (plan 03)
 ├─ DealerStaff      (plan 05)  ── belongs to Dealer
 ├─ Inspector        (plan 08)
 └─ AdminUser        (plan 06)

Dealer ── DealerKYC, OnboardingProgress, Subscription, Payout, DealerStaff[]   (01,12)
Vehicle ── VehicleVerification, MediaAsset[], Inspection, OdometerCheck,
           VehicleHistory, Certification, Valuation, PriceHistory               (02,08,10)
Lead ── Conversation ── Message                                                 (03,05)
Appointment ── AppointmentFeedback                                              (04)
FinanceApplication / InsurancePolicy / RCTransferCase / FloorPlanFacility /
   ReferralCommission                                                           (09)
Subscription / Invoice / PaymentLink / Payout                                   (05,12)
SavedSearch / Wishlist / PriceAlert / DealerReview                              (03,10)
VerificationRequest / ConsentLog / AadhaarVaultEntry                            (07)
AdminAction(audit) / ReviewQueueItem / Dispute / Blocklist / FeatureFlag        (06)
Notification                                                                    (cross)
```

## Cross-cutting concerns
- **Auth:** phone-OTP first; JWT/session; refresh tokens; device binding for dealers. **RBAC** (Buyer/Dealer/Staff/Inspector/Admin roles) enforced server-side.
- **Compliance:** Aadhaar Data Vault (separate store + KMS), PII masking, DPDP consent logging, retention/purge jobs, India data residency. See [07](./07-verification-kyc.md).
- **Notifications:** unified service → WhatsApp Business API (primary), DLT SMS (MSG91), email (SES), push. Template/consent aware.
- **Payments:** Razorpay/Cashfree — subscriptions, payment links, payouts to dealers.
- **i18n:** English + Hindi + launch-state vernacular; right-from-the-start string externalization.
- **Performance:** ISR/CDN for listings, image optimization (responsive, AVIF/WebP, EXIF-GPS strip), lazy 360°, low-bandwidth mode.
- **Security:** rate limiting, WAF, secrets in vault/KMS, least-privilege IAM, audit logging, dependency scanning, pen-test before launch.
- **Reliability:** idempotent external calls, retries/backoff, circuit breakers on providers, graceful degradation, backups + PITR.

## Environments & rollout
- `dev` → `staging` → `prod`; feature flags for gradual rollout; per-city launch toggles via CMS (plan 06).

## Edge cases & failure modes
- **Provider outages** (KYC/VAHAN/WhatsApp) → failover + queue + degrade, never hard-block UX.
- **Search/DB divergence** → reconcile jobs, DB as source of truth.
- **Media abuse / large uploads** → size/type limits, virus scan, async processing.
- **Scaling reads** (listings) → read replicas, CDN, cache.
- **Data residency** → keep PII in India region; vendor DPAs.

## Acceptance criteria
- Public listings are server-rendered/ISR and SEO-indexable; pass Core Web Vitals on mid-range Android over 3G/4G.
- Aadhaar/PII stored per [07](./07-verification-kyc.md) (vault, masked, India region); retention jobs run.
- All external provider calls are idempotent, retried, and circuit-broken; an outage degrades gracefully.
- RBAC and audit logging are enforced server-side across all roles.
- One notification service handles WhatsApp/SMS/email/push with consent + template compliance.

## Dependencies
Foundation for all plans; tightest coupling to [07](./07-verification-kyc.md) (vault/compliance), [10](./10-search-discovery.md) (search), [05](./05-inventory-management.md) (WhatsApp/payments).
