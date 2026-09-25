import "server-only";
import type { ContractStatus, ContractType, Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { diaLocal } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, condicaoFarol, param, paramEnum, paramFarol, type Params } from "./filtros";

export type FiltroContratos = { carrierId?: string; tipo?: ContractType; status?: ContractStatus; farol?: Farol; busca?: string };

export const lerFiltroContratos = (sp: Params): FiltroContratos => ({
  carrierId: param(sp, "transportadora"),
  tipo: paramEnum(sp, "tipo", ["PJ", "SPOT"] as const),
  status: paramEnum(sp, "status", ["ACTIVE", "RENEWED", "TERMINATED"] as const),
  farol: paramFarol(sp),
  busca: param(sp, "busca"),
});

export async function listarContratos(u: UsuarioAtual, f: FiltroContratos = {}) {
  const where: Prisma.ContractWhereInput = {
    ...escopoCarrier(u, f.carrierId),
    ...(f.tipo ? { contractType: f.tipo } : {}),
    ...(f.farol ? { status: "ACTIVE", expirationDate: condicaoFarol(f.farol) } : f.status ? { status: f.status } : {}),
    ...(f.busca ? { title: { contains: f.busca, mode: "insensitive" } } : {}),
  };
  const lista = await prisma.contract.findMany({
    where,
    include: { carrier: carrierResumo, file: arquivoResumo },
    orderBy: [{ expirationDate: "asc" }],
    take: 500,
  });
  const hoje = diaLocal();
  // valores de contrato são dado financeiro: só o ADM Geral recebe
  const verValores = u.perfil === "ADMIN";
  return lista.map((c) => ({
    ...c,
    amount: verValores ? Number(c.amount) : null,
    billingAmount: verValores ? Number(c.billingAmount) : null,
    farol: farolVencimento(c.expirationDate, c.status !== "ACTIVE", hoje),
  }));
}
export type ContratoLinha = Awaited<ReturnType<typeof listarContratos>>[number];

export async function buscarContrato(u: UsuarioAtual, id: string) {
  const c = await prisma.contract.findFirst({ where: { id, ...escopoCarrier(u) }, include: { file: arquivoResumo } });
  return c ? { ...c, amount: Number(c.amount), billingAmount: Number(c.billingAmount) } : null;
}
