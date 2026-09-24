import "server-only";
import type { ContractType, Prisma } from "@prisma/client";
import { farolVencimento } from "@/domain/farol";
import { statusFaturamento, type StatusFaturamento } from "@/domain/status";
import { diaLocal, hojeData } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { carrierResumo, param, paramEnum, type Params } from "./filtros";

export type FiltroFaturamento = { carrierId?: string; tipo?: ContractType; status?: StatusFaturamento; nf?: string };

export const lerFiltroFaturamento = (sp: Params): FiltroFaturamento => ({
  carrierId: param(sp, "transportadora"),
  tipo: paramEnum(sp, "tipo", ["PJ", "SPOT"] as const),
  status: paramEnum(sp, "status", ["PENDING", "PAID", "OVERDUE", "CANCELED"] as const),
  nf: param(sp, "nf"),
});

/** "Atrasado" e "Pendente" são separados pela data de vencimento. */
function condicaoStatus(status: StatusFaturamento): Prisma.FinancialServiceWhereInput {
  const hoje = hojeData();
  if (status === "OVERDUE") return { status: "PENDING", dueDate: { lt: hoje } };
  if (status === "PENDING") return { status: "PENDING", dueDate: { gte: hoje } };
  return { status };
}

export async function listarServicos(u: UsuarioAtual, f: FiltroFaturamento = {}) {
  const where: Prisma.FinancialServiceWhereInput = {
    ...escopoCarrier(u, f.carrierId),
    ...(f.tipo ? { contractType: f.tipo } : {}),
    ...(f.status ? condicaoStatus(f.status) : {}),
    ...(f.nf ? { invoiceNumber: { contains: f.nf, mode: "insensitive" } } : {}),
  };
  const lista = await prisma.financialService.findMany({
    where,
    include: { carrier: carrierResumo, contract: { select: { id: true, title: true } } },
    orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
    take: 1000,
  });
  const hoje = diaLocal();
  return lista.map((s) => ({
    ...s,
    amount: Number(s.amount),
    situacao: statusFaturamento(s, hoje),
    farol: farolVencimento(s.dueDate, s.status !== "PENDING", hoje),
  }));
}
export type ServicoLinha = Awaited<ReturnType<typeof listarServicos>>[number];

export async function buscarServico(u: UsuarioAtual, id: string) {
  const s = await prisma.financialService.findFirst({ where: { id, ...escopoCarrier(u) }, include: { carrier: carrierResumo } });
  return s ? { ...s, amount: Number(s.amount) } : null;
}
