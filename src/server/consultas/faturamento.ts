import "server-only";
import type { ContractType, Prisma } from "@prisma/client";
import { farolVencimento } from "@/domain/farol";
import { farolEmissao } from "@/domain/cicloFaturamento";
import { statusFaturamento, type StatusFaturamento } from "@/domain/status";
import { diaLocal, hojeData } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { AcessoNegado } from "../erros";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, param, paramEnum, type Params } from "./filtros";

export type FiltroFaturamento = { carrierId?: string; tipo?: ContractType; status?: StatusFaturamento; nf?: string };

export const lerFiltroFaturamento = (sp: Params): FiltroFaturamento => ({
  carrierId: param(sp, "transportadora"),
  tipo: paramEnum(sp, "tipo", ["PJ", "SPOT"] as const),
  status: paramEnum(sp, "status", ["PENDING_EMISSION", "PENDING", "PAID", "OVERDUE", "CANCELED"] as const),
  nf: param(sp, "nf"),
});

/** "Atrasado" e "Pendente" são separados pela data de vencimento. */
function condicaoStatus(status: StatusFaturamento): Prisma.FinancialServiceWhereInput {
  const hoje = hojeData();
  if (status === "OVERDUE") return { status: "PENDING", dueDate: { lt: hoje } };
  if (status === "PENDING") return { status: "PENDING", dueDate: { gte: hoje } };
  return { status };
}

/** Faturamento completo (valores, pagamentos, histórico): somente ADM Geral. */
export async function listarServicos(u: UsuarioAtual, f: FiltroFaturamento = {}) {
  if (u.perfil !== "ADMIN") throw new AcessoNegado();
  const where: Prisma.FinancialServiceWhereInput = {
    ...escopoCarrier(u, f.carrierId),
    ...(f.tipo ? { contractType: f.tipo } : {}),
    ...(f.status ? condicaoStatus(f.status) : {}),
    ...(f.nf ? { invoiceNumber: { contains: f.nf, mode: "insensitive" } } : {}),
  };
  const lista = await prisma.financialService.findMany({
    where,
    include: { carrier: carrierResumo, contract: { select: { id: true, title: true } }, file: arquivoResumo },
    orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
    take: 1000,
  });
  const hoje = diaLocal();
  return lista.map((s) => ({
    ...s,
    amount: Number(s.amount),
    situacao: statusFaturamento(s, hoje),
    // pendente de emissão usa o farol de EMISSÃO; aguardando pagamento, o farol de vencimento
    farol:
      s.status === "PENDING_EMISSION"
        ? farolEmissao(s.emissionDate ?? s.dueDate, hoje)
        : farolVencimento(s.dueDate, s.status !== "PENDING", hoje),
  }));
}
export type ServicoLinha = Awaited<ReturnType<typeof listarServicos>>[number];

// ---------------- visão do Cliente / Transportador ----------------
export type SituacaoCobranca = "PENDING" | "OVERDUE";
export const rotuloCobranca: Record<SituacaoCobranca, string> = { PENDING: "A vencer", OVERDUE: "Em atraso" };

/**
 * Cobranças do cliente: SOMENTE lançamentos em aberto ou em atraso do próprio
 * CNPJ, sem valores nem histórico de pagamentos. O filtro e a projeção são
 * feitos no banco — valores e NFs pagas nunca saem do servidor para o cliente.
 */
export async function listarCobrancasCliente(u: UsuarioAtual, f: { situacao?: SituacaoCobranca; nf?: string } = {}) {
  const hoje = hojeData();
  const lista = await prisma.financialService.findMany({
    where: {
      ...escopoCarrier(u),
      status: "PENDING",
      ...(f.situacao === "OVERDUE" ? { dueDate: { lt: hoje } } : f.situacao === "PENDING" ? { dueDate: { gte: hoje } } : {}),
      ...(f.nf ? { invoiceNumber: { contains: f.nf, mode: "insensitive" } } : {}),
    },
    select: { id: true, invoiceNumber: true, contractType: true, dueDate: true, file: arquivoResumo },
    orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
    take: 500,
  });
  const dia = diaLocal();
  return lista.map((s) => {
    const farol = farolVencimento(s.dueDate, false, dia)!;
    return { ...s, farol, situacao: (farol === "VERMELHO" ? "OVERDUE" : "PENDING") as SituacaoCobranca };
  });
}
export type CobrancaCliente = Awaited<ReturnType<typeof listarCobrancasCliente>>[number];

export const lerFiltroCobrancas = (sp: Params) => ({
  situacao: paramEnum(sp, "status", ["PENDING", "OVERDUE"] as const),
  nf: param(sp, "nf"),
});

export async function buscarServico(u: UsuarioAtual, id: string) {
  if (u.perfil !== "ADMIN") return null;
  const s = await prisma.financialService.findFirst({ where: { id, ...escopoCarrier(u) }, include: { carrier: carrierResumo, file: arquivoResumo } });
  return s ? { ...s, amount: Number(s.amount) } : null;
}
