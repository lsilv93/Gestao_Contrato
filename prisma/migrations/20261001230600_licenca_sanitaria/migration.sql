-- Novo tipo "LICENÇA SANITÁRIA" (grupo Documentos Regulatórios, validade obrigatória).
-- Só acrescenta o valor ao enum: nenhum registro existente é alterado ou removido.
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'LICENCA_SANITARIA' BEFORE 'CRF';
