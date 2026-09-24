import "server-only";
import type { AuditAction, Prisma } from "@prisma/client";
import { diaValido, paraData, somarDias } from "@/lib/datas";
import { prisma } from "../prisma";
import { param, paramEnum, type Params } from "./filtros";

export const rotuloEntidade: Record<string, string> = {
  User: "Usuário",
  Carrier: "Transportadora",
  Contract: "Contrato",
  FinancialService: "Serviço / NF",
  SanitaryLicense: "Licença Sanitária",
  GoodPracticesManual: "Manual / POP",
  StoredFile: "Arquivo",
};

export const rotuloAcao: Record<AuditAction, string> = { CREATE: "Inclusão", UPDATE: "Edição", DELETE: "Exclusão" };

export const POR_PAGINA = 100;

export function lerFiltroAuditoria(sp: Params) {
  const de = param(sp, "de");
  const ate = param(sp, "ate");
  return {
    entidade: param(sp, "entidade"),
    registro: param(sp, "registro"),
    acao: paramEnum(sp, "acao", ["CREATE", "UPDATE", "DELETE"] as const),
    usuarioId: param(sp, "usuario"),
    de: de && diaValido(de) ? de : undefined,
    ate: ate && diaValido(ate) ? ate : undefined,
    pagina: Math.max(1, Number(param(sp, "pagina")) || 1),
  };
}
export type FiltroAuditoria = ReturnType<typeof lerFiltroAuditoria>;

/** Somente ADMIN (a rota e a API já barram CLIENT no middleware). */
export async function listarAuditoria(f: FiltroAuditoria) {
  // datas no fuso de São Paulo (UTC-3)
  const inicio = f.de ? new Date(paraData(f.de).getTime() + 3 * 3600_000) : undefined;
  const fim = f.ate ? new Date(somarDias(paraData(f.ate), 1).getTime() + 3 * 3600_000) : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(f.entidade ? { entityName: f.entidade } : {}),
    ...(f.registro ? { entityId: f.registro } : {}),
    ...(f.acao ? { action: f.acao } : {}),
    ...(f.usuarioId ? { userId: f.usuarioId } : {}),
    ...(inicio || fim ? { timestamp: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lt: fim } : {}) } } : {}),
  };
  const [total, itens] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { timestamp: "desc" }, skip: (f.pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
  ]);
  return { total, itens, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
