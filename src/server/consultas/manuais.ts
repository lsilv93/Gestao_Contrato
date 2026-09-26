import "server-only";
import type { ManualCategory, Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { diaLocal } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, condicaoFarol, paginar, param, paramEnum, paramFarol, type Faixa, type Params } from "./filtros";

export type FiltroManuais = { carrierId?: string; categoria?: ManualCategory; farol?: Farol; busca?: string };

export const lerFiltroManuais = (sp: Params): FiltroManuais => ({
  carrierId: param(sp, "transportadora"),
  categoria: paramEnum(sp, "categoria", ["MANUAL_BPA", "POP", "OTHER"] as const),
  farol: paramFarol(sp),
  busca: param(sp, "busca"),
});

const whereManuais = (u: UsuarioAtual, f: FiltroManuais): Prisma.GoodPracticesManualWhereInput => ({
  ...escopoCarrier(u, f.carrierId),
  ...(f.categoria ? { category: f.categoria } : {}),
  ...(f.farol ? { reviewDate: condicaoFarol(f.farol) } : {}),
  ...(f.busca ? { title: { contains: f.busca, mode: "insensitive" } } : {}),
});

export const paginaManuais = (u: UsuarioAtual, f: FiltroManuais, pagina: number) =>
  paginar(pagina, () => prisma.goodPracticesManual.count({ where: whereManuais(u, f) }), (faixa) => listarManuais(u, f, faixa));

export async function listarManuais(u: UsuarioAtual, f: FiltroManuais = {}, faixa: Faixa = { skip: 0, take: 500 }) {
  const lista = await prisma.goodPracticesManual.findMany({
    where: whereManuais(u, f),
    include: { carrier: carrierResumo, file: arquivoResumo },
    orderBy: [{ carrier: { legalName: "asc" } }, { title: "asc" }, { id: "asc" }],
    ...faixa,
  });
  const hoje = diaLocal();
  return lista.map((m) => ({ ...m, farol: farolVencimento(m.reviewDate, false, hoje) }));
}
export type ManualLinha = Awaited<ReturnType<typeof listarManuais>>[number];

export async function buscarManual(u: UsuarioAtual, id: string) {
  return prisma.goodPracticesManual.findFirst({ where: { id, ...escopoCarrier(u) }, include: { file: arquivoResumo } });
}
