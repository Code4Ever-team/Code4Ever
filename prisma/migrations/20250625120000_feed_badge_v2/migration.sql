-- Feed E2EE media fields
ALTER TABLE "Feed" ADD COLUMN IF NOT EXISTS "mediaNonce" TEXT;
ALTER TABLE "Feed" ADD COLUMN IF NOT EXISTS "mediaKey" TEXT;
ALTER TABLE "Feed" ADD COLUMN IF NOT EXISTS "mediaMimeType" TEXT;

-- Badge system v2 (drops legacy BadgeType columns if present)
DO $$ BEGIN
  CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Recreate Badge table structure when migrating from legacy schema
ALTER TABLE "Badge" DROP CONSTRAINT IF EXISTS "Badge_type_name_key";

ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "name_tr" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "description_tr" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON';

-- Backfill slug from legacy name if needed
UPDATE "Badge" SET "slug" = LOWER(REPLACE(COALESCE("name", 'badge-' || "id"), ' ', '-'))
WHERE "slug" IS NULL;

UPDATE "Badge" SET "name_en" = COALESCE("name", 'Badge') WHERE "name_en" IS NULL;
UPDATE "Badge" SET "name_tr" = COALESCE("name", 'Rozet') WHERE "name_tr" IS NULL;
UPDATE "Badge" SET "description_en" = '' WHERE "description_en" IS NULL;
UPDATE "Badge" SET "description_tr" = '' WHERE "description_tr" IS NULL;
UPDATE "Badge" SET "icon" = COALESCE("svgIcon", '⭐') WHERE "icon" IS NULL;

ALTER TABLE "Badge" DROP COLUMN IF EXISTS "name";
ALTER TABLE "Badge" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Badge" DROP COLUMN IF EXISTS "svgIcon";

ALTER TABLE "Badge" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Badge" ALTER COLUMN "name_en" SET NOT NULL;
ALTER TABLE "Badge" ALTER COLUMN "name_tr" SET NOT NULL;
ALTER TABLE "Badge" ALTER COLUMN "description_en" SET NOT NULL;
ALTER TABLE "Badge" ALTER COLUMN "description_tr" SET NOT NULL;
ALTER TABLE "Badge" ALTER COLUMN "icon" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_slug_key" ON "Badge"("slug");

DROP TYPE IF EXISTS "BadgeType";
