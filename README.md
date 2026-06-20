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

## Compliance note

Aadhaar/KYC handling is regulated. See [`plans/07-verification-kyc.md`](./plans/07-verification-kyc.md): DigiLocker-first, masking, Aadhaar Data Vault, DPDP consent logging, DLT for SMS. Get legal sign-off before going live.

## Contributing workflow

Feature branches → PR → review → merge. One PR per feature plan (see `/plans`).
