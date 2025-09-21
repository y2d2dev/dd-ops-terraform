-- Add riskId column to ContractRisk (nullable)
ALTER TABLE "ContractRisk" ADD COLUMN "riskId" INTEGER;

-- Backfill: if ContractRisk.type stores numeric Risk.id, copy it
UPDATE "ContractRisk" cr
SET "riskId" = CAST(cr."type" AS INTEGER)
FROM "Risk" r
WHERE cr."riskId" IS NULL
  AND cr."type" ~ '^[0-9]+$'
  AND CAST(cr."type" AS INTEGER) = r."id";

-- Index and FK
CREATE INDEX IF NOT EXISTS "ContractRisk_riskId_idx" ON "ContractRisk" ("riskId");

ALTER TABLE "ContractRisk"
  ADD CONSTRAINT "ContractRisk_riskId_fkey"
  FOREIGN KEY ("riskId") REFERENCES "Risk"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

