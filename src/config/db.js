const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL || '';

// If using Supabase pooler (6543) or postgresql, ensure pgbouncer=true is appended to disable prepared statements on pooler
if (url && !url.includes('pgbouncer=true')) {
  url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
}

const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

module.exports = prisma;
