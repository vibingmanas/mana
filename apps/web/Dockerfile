# Mana web (Next.js) — built from the monorepo root as Docker context.
FROM node:22-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* must be present at build time (baked into the client bundle).
# Render passes service env vars as build args automatically.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Cap the heap so V8 GCs before the free-tier 512MB cgroup OOM-kills the build,
# and skip telemetry. (A `next build` OOM is the usual cause of a stuck deploy.)
ENV NEXT_TELEMETRY_DISABLED=1
RUN NODE_OPTIONS=--max-old-space-size=448 pnpm --filter @mana/web build

ENV NODE_ENV=production
# Render injects PORT; web start script honours it.
CMD ["pnpm", "--filter", "@mana/web", "start"]
