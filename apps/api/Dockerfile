# Mana API (NestJS) — built from the monorepo root as Docker context.
FROM node:22-slim

# Prisma needs openssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# Install all workspace deps (devDeps included — needed to compile).
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mana/db generate
RUN pnpm --filter @mana/api build

ENV NODE_ENV=production
# Sync the schema (this project manages schema with `db push`, like CI + local;
# changes are additive so this is non-destructive), then start the server.
# Render injects PORT.
CMD ["sh", "-lc", "cd packages/db && pnpm exec prisma db push --skip-generate && cd /app && node apps/api/dist/main.js"]
