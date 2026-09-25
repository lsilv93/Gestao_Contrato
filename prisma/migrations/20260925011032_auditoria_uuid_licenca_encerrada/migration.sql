-- Licença: status "Encerrada"
ALTER TYPE "LicenseStatus" ADD VALUE 'CLOSED';

-- Auditoria: ID da ação em UUID gerado pelo banco; data/hora com fuso (valores antigos já estavam em UTC).
-- Alterar a estrutura (DDL) não dispara o trigger de imutabilidade: nenhum registro é editado.
ALTER TABLE "audit_logs"
  ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
  ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMPTZ(3) USING "timestamp" AT TIME ZONE 'UTC';
