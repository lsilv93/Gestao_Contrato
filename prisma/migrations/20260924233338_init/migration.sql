-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PJ', 'SPOT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'RENEWED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('CURRENT', 'RENEWED', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ManualCategory" AS ENUM ('MANUAL_BPA', 'POP', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "carrierCnpj" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carriers" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" CHAR(2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "startDate" DATE,
    "expirationDate" DATE NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_services" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "contractId" TEXT,
    "contractType" "ContractType" NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE NOT NULL,
    "paymentDate" DATE,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanitary_licenses" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "issuingBody" TEXT,
    "issueDate" DATE,
    "expirationDate" DATE NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'CURRENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "previousId" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanitary_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "good_practices_manuals" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ManualCategory" NOT NULL DEFAULT 'MANUAL_BPA',
    "version" TEXT NOT NULL,
    "reviewDate" DATE,
    "notes" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "good_practices_manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_carrierCnpj_idx" ON "users"("carrierCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "carriers_cnpj_key" ON "carriers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_fileId_key" ON "contracts"("fileId");

-- CreateIndex
CREATE INDEX "contracts_carrierId_idx" ON "contracts"("carrierId");

-- CreateIndex
CREATE INDEX "contracts_expirationDate_idx" ON "contracts"("expirationDate");

-- CreateIndex
CREATE INDEX "financial_services_dueDate_idx" ON "financial_services"("dueDate");

-- CreateIndex
CREATE INDEX "financial_services_status_idx" ON "financial_services"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_services_carrierId_invoiceNumber_key" ON "financial_services"("carrierId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sanitary_licenses_previousId_key" ON "sanitary_licenses"("previousId");

-- CreateIndex
CREATE UNIQUE INDEX "sanitary_licenses_fileId_key" ON "sanitary_licenses"("fileId");

-- CreateIndex
CREATE INDEX "sanitary_licenses_carrierId_idx" ON "sanitary_licenses"("carrierId");

-- CreateIndex
CREATE INDEX "sanitary_licenses_expirationDate_idx" ON "sanitary_licenses"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "good_practices_manuals_fileId_key" ON "good_practices_manuals"("fileId");

-- CreateIndex
CREATE INDEX "good_practices_manuals_carrierId_idx" ON "good_practices_manuals"("carrierId");

-- CreateIndex
CREATE INDEX "audit_logs_entityName_entityId_idx" ON "audit_logs"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_carrierCnpj_fkey" FOREIGN KEY ("carrierCnpj") REFERENCES "carriers"("cnpj") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_services" ADD CONSTRAINT "financial_services_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_services" ADD CONSTRAINT "financial_services_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_licenses" ADD CONSTRAINT "sanitary_licenses_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_licenses" ADD CONSTRAINT "sanitary_licenses_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "sanitary_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_licenses" ADD CONSTRAINT "sanitary_licenses_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "good_practices_manuals" ADD CONSTRAINT "good_practices_manuals_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "good_practices_manuals" ADD CONSTRAINT "good_practices_manuals_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trilha de auditoria imutável: nenhum registro pode ser alterado ou excluído.
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é imutável: % não permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_immutable();
