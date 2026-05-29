import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("OK: Database connection successful.");
  process.exit(0);
} catch (error) {
  console.error("FAIL: Database connection failed.");
  console.error(error instanceof Error ? error.message : error);
  console.error("\nSupabase kullanıyorsan DATABASE_URL icin Transaction Pooler (port 6543) kullan.");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
