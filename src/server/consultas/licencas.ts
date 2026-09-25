import "server-only";
import type { LicenseStatus, Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { situacaoLicenca } from "@/domain/status";
import { diaLocal } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, condicaoFarol, param, paramEnum, paramFarol, type Params } from "./filtros";

export type FiltroLicencas = { carrierId?: string; status?: LicenseStatus; farol?: Farol; historico?: boolean; busca?: string };

export const lerFiltroLicencas = (sp: Params): FiltroLicencas => ({
  carrierId: param(sp, "transportadora"),
  status: paramEnum(sp, "status", ["CURRENT", "RENEWED", "SUSPENDED", "CANCELED", "CLOSED"] as const),
  farol: paramFarol(sp),
  historico: param(sp, "historico") === "1",
  busca: param(sp, "busca"),
});

/** Por padrão mostra só a versão mais recente de cada licença; `historico` inclui as renovadas. */
export async function listarLicencas(u: UsuarioAtual, f: FiltroLicencas = {}) {
  const where: Prisma.SanitaryLicenseWhereInput = {
    ...escopoCarrier(u, f.carrierId),
    ...(f.farol ? { status: "CURRENT", expirationDate: condicaoFarol(f.farol) } : f.status ? { status: f.status } : {}),
    ...(!f.historico && !f.status ? { next: { is: null } } : {}),
    ...(f.busca ? { licenseNumber: { contains: f.busca, mode: "insensitive" } } : {}),
  };
  const lista = await prisma.sanitaryLicense.findMany({
    where,
    include: { carrier: carrierResumo, file: arquivoResumo, next: { select: { id: true } } },
    orderBy: [{ expirationDate: "asc" }],
    take: 500,
  });
  const hoje = diaLocal();
  return lista.map((l) => ({
    ...l,
    situacao: situacaoLicenca(l, hoje),
    farol: farolVencimento(l.expirationDate, l.status !== "CURRENT", hoje),
  }));
}
export type LicencaLinha = Awaited<ReturnType<typeof listarLicencas>>[number];

/** Contadores de situação das licenças vigentes (Ativa / Próxima de Vencer / Vencida). */
export async function contarSituacoes(u: UsuarioAtual, carrierId?: string) {
  const base = { ...escopoCarrier(u, carrierId), status: "CURRENT" as const };
  const [VERDE, AMARELO, VERMELHO] = await Promise.all(
    (["VERDE", "AMARELO", "VERMELHO"] as const).map((f) => prisma.sanitaryLicense.count({ where: { ...base, expirationDate: condicaoFarol(f) } })),
  );
  return { VERDE, AMARELO, VERMELHO };
}

export async function buscarLicenca(u: UsuarioAtual, id: string) {
  return prisma.sanitaryLicense.findFirst({
    where: { id, ...escopoCarrier(u) },
    include: { carrier: carrierResumo, file: arquivoResumo, next: { select: { id: true } } },
  });
}

/** Todas as versões (da mais recente para a mais antiga) a partir de uma licença. */
export async function historicoLicenca(u: UsuarioAtual, id: string) {
  const versoes = [];
  let atual = await buscarLicenca(u, id);
  // sobe até a versão mais recente
  while (atual?.next) atual = await buscarLicenca(u, atual.next.id);
  while (atual && versoes.length < 50) {
    versoes.push(atual);
    atual = atual.previousId ? await buscarLicenca(u, atual.previousId) : null;
  }
  return versoes;
}
