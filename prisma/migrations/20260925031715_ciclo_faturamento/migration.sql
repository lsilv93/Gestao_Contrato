-- Ciclo de faturamento: status "NF pendente de emissão"
ALTER TYPE "FinancialStatus" ADD VALUE 'PENDING_EMISSION' BEFORE 'PENDING';

-- Contrato: regras de recorrência (contratos existentes recebem emissão dia 5 / vencimento dia 10
-- e o valor previsto por NF = valor do contrato; ajuste depois na tela de Contratos)
ALTER TABLE "contracts"
  ADD COLUMN "invoiceDay" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "dueDay" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "emissionLeadDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "billingAmount" DECIMAL(14,2);
UPDATE "contracts" SET "billingAmount" = "amount" WHERE "billingAmount" IS NULL;
ALTER TABLE "contracts" ALTER COLUMN "billingAmount" SET NOT NULL;
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_invoiceDay_check" CHECK ("invoiceDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "contracts_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "contracts_emissionLeadDays_check" CHECK ("emissionLeadDays" BETWEEN 0 AND 20);

-- Faturas: NF ainda sem número enquanto pendente de emissão; competência e data limite de emissão
ALTER TABLE "financial_services"
  ADD COLUMN "competence" TEXT,
  ADD COLUMN "emissionDate" DATE,
  ALTER COLUMN "invoiceNumber" DROP NOT NULL;

-- Idempotência da geração automática: uma pendência por contrato e mês
CREATE UNIQUE INDEX "financial_services_contractId_competence_key" ON "financial_services"("contractId", "competence");
