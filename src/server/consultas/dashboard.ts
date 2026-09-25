import "server-only";
import type { Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { situacaoLicenca } from "@/domain/status";
import { diaLocal, hojeData, limitesDoMes, somarDias } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { carrierResumo, condicaoFarol, param, type Params } from "./filtros";

/** Janela das listas de alerta (vencidos + próximos N dias). */
const JANELA_ALERTA_DIAS = 60;

export type FiltroDashboard = { mes?: string; carrierId?: string };

export function lerFiltroDashboard(sp: Params): FiltroDashboard {
  const mes = param(sp, "mes");
  return { mes: mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : undefined, carrierId: param(sp, "transportadora") };
}

type Contagem = Record<Farol, number>;

async function contarFarois(contar: (farol: Farol) => Promise<number>): Promise<Contagem> {
  const [VERMELHO, AMARELO, VERDE] = await Promise.all((["VERMELHO", "AMARELO", "VERDE"] as const).map(contar));
  return { VERMELHO, AMARELO, VERDE };
}

/**
 * Métricas do dashboard.
 *  - Mês/Ano: contratos vigentes em algum dia do mês e NFs com vencimento no mês.
 *  - Visão geral: todos os contratos vigentes e todas as NFs.
 * Os painéis de alerta mostram sempre a situação atual (hoje).
 */
export async function carregarDashboard(u: UsuarioAtual, f: FiltroDashboard) {
  const escopo = escopoCarrier(u, f.carrierId);
  const hoje = hojeData();
  const hojeTxt = diaLocal();
  const janela = somarDias(hoje, JANELA_ALERTA_DIAS);
  const mes = f.mes ? limitesDoMes(f.mes) : null;

  // Dados financeiros (valores de contratos e faturamento consolidado): somente ADM Geral.
  const admin = u.perfil === "ADMIN";
  const [financeiro, cobrancas] = await Promise.all([
    admin ? carregarFinanceiro(escopo, mes, hoje) : null,
    // cobranças em aberto (sem valores) — visão de conferência de todos os perfis
    Promise.all([
      prisma.financialService.count({ where: { ...escopo, status: "PENDING", dueDate: { gte: hoje } } }),
      prisma.financialService.count({ where: { ...escopo, status: "PENDING", dueDate: { lt: hoje } } }),
    ]).then(([aVencer, emAtraso]) => ({ aVencer, emAtraso })),
  ]);

  // ---------------- alertas de vencimento (hoje) ----------------
  const [farolContratos, farolLicencas, farolManuais, alertaContratos, alertaLicencas, alertaManuais] = await Promise.all([
    contarFarois((fa) => prisma.contract.count({ where: { ...escopo, status: "ACTIVE", expirationDate: condicaoFarol(fa) } })),
    contarFarois((fa) => prisma.sanitaryLicense.count({ where: { ...escopo, status: "CURRENT", expirationDate: condicaoFarol(fa) } })),
    contarFarois((fa) => prisma.goodPracticesManual.count({ where: { ...escopo, reviewDate: condicaoFarol(fa) } })),
    prisma.contract.findMany({
      where: { ...escopo, status: "ACTIVE", expirationDate: { lte: janela } },
      include: { carrier: carrierResumo },
      orderBy: { expirationDate: "asc" },
      take: 8,
    }),
    prisma.sanitaryLicense.findMany({
      where: { ...escopo, status: "CURRENT", expirationDate: { lte: janela } },
      include: { carrier: carrierResumo },
      orderBy: { expirationDate: "asc" },
      take: 8,
    }),
    prisma.goodPracticesManual.findMany({
      where: { ...escopo, reviewDate: { lte: janela } },
      include: { carrier: carrierResumo },
      orderBy: { reviewDate: "asc" },
      take: 8,
    }),
  ]);

  return {
    /** null para o Cliente / Transportador */
    contratos: financeiro?.contratos ?? null,
    /** null para o Cliente / Transportador */
    faturamento: financeiro?.faturamento ?? null,
    cobrancas,
    alertas: {
      janelaDias: JANELA_ALERTA_DIAS,
      contratos: {
        farois: farolContratos,
        itens: alertaContratos.map((c) => ({ ...c, amount: Number(c.amount), farol: farolVencimento(c.expirationDate, false, hojeTxt)! })),
      },
      licencas: {
        farois: farolLicencas,
        itens: alertaLicencas.map((l) => ({ ...l, farol: farolVencimento(l.expirationDate, false, hojeTxt)!, situacao: situacaoLicenca(l, hojeTxt) })),
      },
      manuais: {
        farois: farolManuais,
        itens: alertaManuais.map((m) => ({ ...m, farol: farolVencimento(m.reviewDate, false, hojeTxt)! })),
      },
    },
  };
}
export type Dashboard = Awaited<ReturnType<typeof carregarDashboard>>;

/** Métricas financeiras do dashboard (somente ADM Geral). */
async function carregarFinanceiro(escopo: { carrierId?: string }, mes: { inicio: Date; fim: Date } | null, hoje: Date) {
  const whereContratos: Prisma.ContractWhereInput = mes
    ? {
        ...escopo,
        status: { not: "TERMINATED" },
        expirationDate: { gte: mes.inicio },
        OR: [{ startDate: null }, { startDate: { lt: mes.fim } }],
      }
    : { ...escopo, status: "ACTIVE" };
  const porTipo = await prisma.contract.groupBy({ by: ["contractType"], where: whereContratos, _sum: { amount: true }, _count: true });
  const tipo = (t: "PJ" | "SPOT") => {
    const g = porTipo.find((p) => p.contractType === t);
    return { valor: Number(g?._sum.amount ?? 0), quantidade: g?._count ?? 0 };
  };
  const pj = tipo("PJ");
  const spot = tipo("SPOT");
  const totalContratos = pj.valor + spot.valor;

  // ---------------- faturamento ----------------
  const baseNF: Prisma.FinancialServiceWhereInput = { ...escopo, status: { notIn: ["CANCELED", "PENDING_EMISSION"] }, ...(mes ? { dueDate: { gte: mes.inicio, lt: mes.fim } } : {}) };
  const somaNF = (where: Prisma.FinancialServiceWhereInput) =>
    prisma.financialService.aggregate({ where: { ...baseNF, ...where }, _sum: { amount: true }, _count: true });
  const [emitidas, pagas, vencidas, pendentes, nfPorTipo] = await Promise.all([
    somaNF({}),
    somaNF({ status: "PAID" }),
    somaNF({ status: "PENDING", dueDate: { ...(mes ? { gte: mes.inicio } : {}), lt: mes && mes.fim < hoje ? mes.fim : hoje } }),
    somaNF({ status: "PENDING", dueDate: { gte: mes && mes.inicio > hoje ? mes.inicio : hoje, ...(mes ? { lt: mes.fim } : {}) } }),
    prisma.financialService.groupBy({ by: ["contractType"], where: baseNF, _sum: { amount: true }, _count: true }),
  ]);
  const nf = (a: typeof emitidas) => ({ quantidade: a._count, valor: Number(a._sum.amount ?? 0) });
  const nfTipo = (t: "PJ" | "SPOT") => {
    const g = nfPorTipo.find((p) => p.contractType === t);
    return { quantidade: g?._count ?? 0, valor: Number(g?._sum.amount ?? 0) };
  };

  return {
    contratos: {
      total: totalContratos,
      quantidade: pj.quantidade + spot.quantidade,
      pj: { ...pj, percentual: totalContratos ? pj.valor / totalContratos : 0 },
      spot: { ...spot, percentual: totalContratos ? spot.valor / totalContratos : 0 },
    },
    faturamento: {
      emitidas: nf(emitidas),
      pagas: nf(pagas),
      vencidas: nf(vencidas),
      pendentes: nf(pendentes),
      pj: nfTipo("PJ"),
      spot: nfTipo("SPOT"),
    },
  };
}
