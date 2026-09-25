-- Licenças e Documentos: tipo do documento e validade opcional para AFE/AE.
CREATE TYPE "DocumentType" AS ENUM (
  'CRF', 'AFE_COSMETICOS', 'AFE_CORRELATOS', 'AFE_MEDICAMENTOS', 'AFE_SANEANTES',
  'AE_MEDICAMENTOS_CONTROLADOS', 'CLI', 'AVCB', 'LICENCA_POLICIA_FEDERAL', 'LICENCA_POLICIA_CIVIL',
  'PGR', 'PCMSO', 'LIMPEZA_CAIXA_DAGUA', 'CONTROLE_PRAGAS_EMPRESA', 'CONTROLE_PRAGAS_VEICULOS'
);

-- registros existentes ficam sem tipo ("NÃO CLASSIFICADO") até o ADM classificar
ALTER TABLE "sanitary_licenses" ADD COLUMN "documentType" "DocumentType";
ALTER TABLE "sanitary_licenses" ALTER COLUMN "expirationDate" DROP NOT NULL;

-- regra de negócio também no banco: sem validade só para AFE / AE
ALTER TABLE "sanitary_licenses" ADD CONSTRAINT "sanitary_licenses_validade_obrigatoria"
  CHECK ("expirationDate" IS NOT NULL OR "documentType" IN ('AFE_COSMETICOS', 'AFE_CORRELATOS', 'AFE_MEDICAMENTOS', 'AFE_SANEANTES', 'AE_MEDICAMENTOS_CONTROLADOS'));

CREATE INDEX "sanitary_licenses_documentType_idx" ON "sanitary_licenses"("documentType");
