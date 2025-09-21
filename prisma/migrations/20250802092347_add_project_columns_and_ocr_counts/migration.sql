-- AlterTable: Add user_id and deleted_at to Project
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateTable: Create OcrPageCount table
CREATE TABLE IF NOT EXISTS "OcrPageCount" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrPageCount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OcrPageCount"
ADD CONSTRAINT "OcrPageCount_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OcrPageCount_projectId_idx" ON "OcrPageCount"("projectId");