-- AlterTable
ALTER TABLE "financial_services" ADD COLUMN     "fileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "financial_services_fileId_key" ON "financial_services"("fileId");

-- AddForeignKey
ALTER TABLE "financial_services" ADD CONSTRAINT "financial_services_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

