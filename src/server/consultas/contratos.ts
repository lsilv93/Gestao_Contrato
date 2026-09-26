import "server-only";
import type { ContractStatus, ContractType, Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { diaLocal } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, condicaoFarol, paginar, param, paramEnum, paramFarol, type Faixa, type Params } from "./filtros";

export type FiltroContratos = { carrierId?: string; tipo?: ContractType; status?: ContractStatus; farol?: Farol; busca?: string };

export const lerFiltroContratos = (sp: Params): FiltroContratos => ({
  carrierId: param(sp, "transportadora"),
  tipo: paramEnum(sp, "tipo", ["PJ", "SPOT"] as const),
  status: paramEnum(sp, "status", ["ACTIVE", "RENEWED", "TERMINATED"] as const),
  farol: paramFarol(sp),
  busca: param(sp, "busca"),
});

const whereContratos = (u: UsuarioAtual, f: FiltroContratos): Prisma.ContractWhereInput => ({
  ...escopoCarrier(u, f.carrierId),
  ...(f.tipo ? { contractType: f.tipo } : {}),
  ...(f.farol ? { status: "ACTIVE", expirationDate: condicaoFarol(f.farol) } : f.status ? { status: f.status } : {}),
  ...(f.busca ? { title: { contains: f.busca, mode: "insensitive" } } : {}),
});

export const paginaContratos = (u: UsuarioAtual, f: FiltroContratos, pagina: number) =>
  paginar(pagina, () => prisma.contract.count({ where: whereContratos(u, f) }), (faixa) => listarContratos(u, f, faixa));

/** Soma dos contratos vigentes com os filtros atuais (somente ADM Geral). */
export async function totalVigentes(u: UsuarioAtual, f: FiltroContratos) {
  const r = await prisma.contract.aggregate({ where: { AND: [whereContratos(u, f), { status: "ACTIVE" }] }, _sum: { amount: true } });
  return Number(r._sum.amount ?? 0);
}

export async function listarContratos(u: UsuarioAtual, f: FiltroContratos = {}, faixa: Faixa = { skip: 0, take: 500 }) {
  const lista = await prisma.contract.findMany({
    where: whereContratos(u, f),
    include: { carrier: carrierResumo, file: arquivoResumo },
    orderBy: [{ expirationDate: "asc" }, { id: "asc" }],
    ...faixa,
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
