import { PrismaClient } from "@prisma/client";

const password = process.env.DB_PASSWORD;
const ref = process.env.DB_REF ?? "anzgmjwcjcpdefwtgpwe";

if (!password) {
  console.error("Set DB_PASSWORD env var (do not commit).");
  process.exit(1);
}

const regions = [
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-west-1",
  "ap-southeast-1",
];

const variants = [];

for (const region of regions) {
  for (const prefix of ["aws-0", "aws-1"]) {
    variants.push(
      `postgresql://postgres.${ref}:${password}@${prefix}-${region}.pooler.supabase.com:5432/postgres`
    );
    variants.push(
      `postgresql://postgres.${ref}:${password}@${prefix}-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`
    );
  }
}

variants.push(
  `postgresql://postgres:${password}@db.${ref}.supabase.co:6543/postgres?pgbouncer=true`
);

for (const url of variants) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("OK", url.replace(password, "***"));
    await prisma.$disconnect();
    process.exit(0);
  } catch {
    await prisma.$disconnect();
  }
}

console.error("No working pooler URL found. Use Supabase SQL Editor with prisma/supabase-init.sql");
process.exit(1);
