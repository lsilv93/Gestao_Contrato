import "server-only";
import type { DocumentType, LicenseStatus, Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { situacaoLicenca } from "@/domain/status";
import { LISTA_TIPOS_DOCUMENTO, tiposDaCategoria, type CategoriaDocumento } from "@/domain/tiposDocumento";
import { diaLocal } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { arquivoResumo, carrierResumo, condicaoFarol, paginar, param, paramEnum, paramFarol, type Faixa, type Params } from "./filtros";

export type FiltroLicencas = {
  carrierId?: string;
  status?: LicenseStatus;
  farol?: Farol;
  historico?: boolean;
  busca?: string;
  categoria?: CategoriaDocumento;
  tipo?: DocumentType;
  /** só os vigentes sem data de validade (AFE / AE indeterminadas) */
  semValidade?: boolean;
};

export const lerFiltroLicencas = (sp: Params): FiltroLicencas => ({
  carrierId: param(sp, "transportadora"),
  status: paramEnum(sp, "status", ["CURRENT", "RENEWED", "SUSPENDED", "CANCELED", "CLOSED"] as const),
  farol: paramFarol(sp),
  historico: param(sp, "historico") === "1",
  busca: param(sp, "busca"),
  categoria: paramEnum(sp, "categoria", ["LICENCA", "DOCUMENTO"] as const),
  tipo: paramEnum(sp, "tipo", LISTA_TIPOS_DOCUMENTO),
  semValidade: param(sp, "validade") === "INDETERMINADA",
});

/**
 * Filtro de categoria. Registros sem tipo (anteriores à classificação) contam
 * como Licença Sanitária & Regulatória.
 */
export function condicaoCategoria(c: CategoriaDocumento | undefined): Prisma.SanitaryLicenseWhereInput {
  if (!c) return {};
  const tipos = { documentType: { in: tiposDaCategoria(c) } };
  return c === "LICENCA" ? { OR: [tipos, { documentType: null }] } : tipos;
}

function whereLicencas(u: UsuarioAtual, f: FiltroLicencas): Prisma.SanitaryLicenseWhereInput {
  return {
    ...escopoCarrier(u, f.carrierId),
    ...(f.farol ? { status: "CURRENT", expirationDate: condicaoFarol(f.farol) } : f.status ? { status: f.status } : {}),
    ...(f.semValidade ? { status: "CURRENT", expirationDate: null } : {}),
    ...(!f.historico && !f.status ? { next: { is: null } } : {}),
    ...(f.busca ? { licenseNumber: { contains: f.busca, mode: "insensitive" } } : {}),
    ...(f.tipo ? { documentType: f.tipo } : {}),
    ...condicaoCategoria(f.categoria),
  };
}

/** Página da listagem (vencidas e próximas primeiro). */
export const paginaLicencas = (u: UsuarioAtual, f: FiltroLicencas, pagina: number) =>
  paginar(pagina, () => prisma.sanitaryLicense.count({ where: whereLicencas(u, f) }), (faixa) => listarLicencas(u, f, faixa));

/** Por padrão mostra só a versão mais recente de cada documento; `historico` inclui as renovadas. */
export async function listarLicencas(u: UsuarioAtual, f: FiltroLicencas = {}, faixa: Faixa = { skip: 0, take: 500 }) {
  const lista = await prisma.sanitaryLicense.findMany({
    where: whereLicencas(u, f),
    include: { carrier: carrierResumo, file: arquivoResumo, next: { select: { id: true } } },
    orderBy: [{ expirationDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    ...faixa,
  });
  const hoje = diaLocal();
  return lista.map((l) => ({
    ...l,
    situacao: situacaoLicenca(l, hoje),
    farol: farolVencimento(l.expirationDate, l.status !== "CURRENT", hoje),
  }));
}
export type LicencaLinha = Awaited<ReturnType<typeof listarLicencas>>[number];

/** Contadores dos vigentes: Ativa / Próxima de Vencer / Vencida e Sem Validade (indeterminada). */
export async function contarSituacoes(u: UsuarioAtual, f: Pick<FiltroLicencas, "carrierId" | "categoria" | "tipo"> = {}) {
  const base: Prisma.SanitaryLicenseWhereInput = {
    ...escopoCarrier(u, f.carrierId),
    status: "CURRENT",
    ...(f.tipo ? { documentType: f.tipo } : {}),
    ...condicaoCategoria(f.categoria),
  };
  // uma consulta (só as datas) e a contagem em memória, em vez de 4 COUNT separados
  const datas = await prisma.sanitaryLicense.findMany({ where: base, select: { expirationDate: true } });
  const hoje = diaLocal();
  const total = { VERDE: 0, AMARELO: 0, VERMELHO: 0, INDETERMINADA: 0 };
  for (const { expirationDate } of datas) total[expirationDate ? farolVencimento(expirationDate, false, hoje)! : "INDETERMINADA"]++;
  return total;
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
