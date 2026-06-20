// @mana/db — shared Prisma client (pre-generated JS, no build step).
// Generated client lives in ./generated/client (run `pnpm db:generate`).
'use strict';

const generated = require('./generated/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__manaPrisma ||
  new generated.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__manaPrisma = prisma;
}

module.exports = { ...generated, prisma };
