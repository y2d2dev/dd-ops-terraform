-- partyカラムが存在しない場合は追加
ALTER TABLE "Contract" 
ADD COLUMN IF NOT EXISTS "party" TEXT;

-- 既存のpromisor/promiseeカラムを削除
ALTER TABLE "Contract" 
DROP COLUMN IF EXISTS "promisee",
DROP COLUMN IF EXISTS "promisor";
