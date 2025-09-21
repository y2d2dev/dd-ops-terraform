-- Add missing columns
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetCompany" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "reportGeneratedAt" TIMESTAMP(3);

-- CreateExtension for updatedAt trigger if not exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for Contract.updatedAt if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_contract') THEN
    CREATE TRIGGER set_timestamp_contract
    BEFORE UPDATE ON "Contract"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;