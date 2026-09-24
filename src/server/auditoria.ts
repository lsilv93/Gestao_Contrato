import "server-only";
import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";
import type { UsuarioAtual } from "./auth";

type Db = Prisma.TransactionClient | PrismaClient;

export type Entidade = "User" | "Carrier" | "Contract" | "FinancialService" | "SanitaryLicense" | "GoodPracticesManual" | "StoredFile";

/** Converte Decimal/Date/Bytes em valores serializáveis para o JSON do log. */
function serializar(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(v ?? {}, (k, val) => {
      if (k === "passwordHash" || k === "data") return undefined; // nunca grava hash nem bytes de arquivo
      return val;
    }),
  );
}

/**
 * Grava um registro imutável na trilha de auditoria (ID da ação, usuário,
 * data/hora e tipo de operação). Deve rodar na MESMA transação da alteração.
 */
export async function auditar(
  db: Db,
  p: { usuario: Pick<UsuarioAtual, "id" | "nome"> | null; action: AuditAction; entityName: Entidade; entityId?: string | null; details?: unknown },
) {
  await db.auditLog.create({
    data: {
      userId: p.usuario?.id ?? null,
      userName: p.usuario?.nome ?? null,
      action: p.action,
      entityName: p.entityName,
      entityId: p.entityId ?? null,
      details: p.details === undefined ? undefined : serializar(p.details),
    },
  });
}
