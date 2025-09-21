-- AlterTable
ALTER TABLE "ContractRisk" ADD COLUMN     "isSave" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectExtractionStatus" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "extractionKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectExtractionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectExtractionStatus_projectId_key" ON "ProjectExtractionStatus"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectExtractionStatus" ADD CONSTRAINT "ProjectExtractionStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
