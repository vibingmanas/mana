# Mana

Platform organizing India's **unorganized second-hand car dealer market** — verification, inspection, trust, and financing for local dealers, without owning inventory.

> Strategy, market research, and per-feature specs: [`PROJECT_REPORT.md`](./PROJECT_REPORT.md) and [`/plans`](./plans).

## Monorepo layout

```
apps/
  api/        NestJS API (REST, /api prefix)
  web/        Next.js (App Router) — public site, dealer dashboard, admin
packages/
  db/         Prisma schema + shared client (@mana/db)
plans/        Feature plans (01–13)
docker-compose.yml   Postgres (PostGIS) + Redis
```

**Stack:** Next.js · NestJS · PostgreSQL (PostGIS) · Prisma · Redis · pnpm workspaces.

## Prerequisites

- Node >= 20 (tested on 23)
- pnpm 10
- Docker (for Postgres + Redis)

## Quick start

```bash
# 1. install
pnpm install

# 2. env
cp .env.example .env

# 3. infra (postgres + redis)
pnpm infra:up

# 4. db: generate client, push schema, seed
pnpm db:generate
pnpm db:push
pnpm db:seed

# 5. run everything (api on :4000, web on :3000)
pnpm dev
```

Open http://localhost:3000 — the homepage shows live API + DB status from `GET /api/health`.

## Common scripts

| Command | What |
|---|---|
| `pnpm dev` | Run api + web in parallel |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm test` | Run all tests |
| `pnpm format` | Prettier write |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm infra:up` / `infra:down` | Start/stop Docker services |

## Implemented features

All feature plans (`/plans`) are built, each with API + web + Postgres-backed e2e. CI runs on every PR.

| Area | API modules | Web routes |
|---|---|---|
| Auth, RBAC, verification engine (mock providers) | `auth`, `verification`, `dealers`, `notifications` | — |
| Dealer onboarding (email→phone→Aadhaar→PAN→GST→bank, tiers T0–T3) | `onboarding` | `/dealer/onboarding` |
| Car registration + listing (VAHAN/RC, lifecycle) | `vehicles` | `/listings`, `/listings/[id]`, `/dealer/cars` |
| Buyer leads, wishlist, saved searches, valuation | `buyers`, `vehicles` (valuation) | `/listings/[id]` (buyer actions) |
| Appointments (test drives, doorstep) | `appointments` | `/dealer/appointments` |
| Dealer DMS — CRM pipeline + dashboard | `dms` | `/dealer`, `/dealer/leads` |
| Admin panel + audit log | `admin` | `/admin` |
| Inspection, odometer-fraud, certification | `inspections` | listing/dealer-cars badges & actions |
| Financing, insurance, RC transfer (referral) | `finance` | listing EMI |
| Search sort, price alerts, notifications | `alerts` | `/buyer/notifications`, listings sort |
| Monetization — subscriptions + billing | `billing` | `/dealer/billing` |

**Demo flow:** seed creates an admin (`+919000000001`). In dev (mock mode) every OTP request returns a `devCode` in the response, so you can drive the whole flow from the UI: onboard a dealer → list & verify a car → publish → browse as a buyer → book a test drive → manage leads → moderate in `/admin`.

### Not yet wired (production integration)
Everything runs on **mock** providers (`VERIFY_PROVIDER_MODE=mock`). For production, integrate: DigiLocker/Surepass/Signzy (KYC + VAHAN), MSG91/Gupshup over DLT (SMS), SES/Resend (email), Razorpay/Cashfree (payments), NBFC/insurer APIs, WhatsApp Business API, S3 media uploads, and OpenSearch (search at scale). Inspector scheduling app, dealer floor-plan financing, staff RBAC, syndication, and disputes/feature-flags/impersonation are also deferred (noted per plan).

## Compliance note

Aadhaar/KYC handling is regulated. See [`plans/07-verification-kyc.md`](./plans/07-verification-kyc.md): DigiLocker-first, masking, Aadhaar Data Vault, DPDP consent logging, DLT for SMS. Get legal sign-off before going live.

## Contributing workflow

Feature branches → PR (CI: format + typecheck + test) → review → merge. One PR per feature plan (see `/plans`).
