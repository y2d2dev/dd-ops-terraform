-- AlterTable
ALTER TABLE "WorkSpace" ADD COLUMN "accessable_ips" TEXT[] DEFAULT ARRAY[]::TEXT[];