-- AlterTable
ALTER TABLE "IdempotencyRecord" ADD COLUMN     "dataSubjectId" UUID;

-- CreateIndex
CREATE INDEX "IdempotencyRecord_dataSubjectId_idx" ON "IdempotencyRecord"("dataSubjectId");
