import "server-only";
import { Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { situacaoLicenca } from "@/domain/status";
import { diaDe, diaLocal, hojeData, limitesDoMes, somarDias } from "@/lib/datas";
import type { UsuarioAtual } from "../auth";
import { escopoCarrier } from "../escopo";
import { prisma } from "../prisma";
import { carrierResumo, param, type Params } from "./filtros";
import { categoriaDoTipo, type CategoriaDocumento } from "@/domain/tiposDocumento";

/** Janela das listas de alerta (vencidos + próximos N dias). */
const JANELA_ALERTA_DIAS = 60;

export type FiltroDashboard = { mes?: string; carrierId?: string };

export function lerFiltroDashboard(sp: Params): FiltroDashboard {
  const mes = param(sp, "mes");
  return { mes: mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : undefined, carrierId: param(sp, "transportadora") };
}

type Contagem = Record<Farol, number>;

/**
 * Métricas do dashboard.
 *  - Mês/Ano: contratos vigentes em algum dia do mês e NFs com vencimento no mês.
 *  - Visão geral: todos os contratos vigentes e todas as NFs.
 * Os painéis de alerta mostram sempre a situação atual (hoje).
 *
 * Desempenho: cada entidade é lida UMA vez (só os vigentes, com poucos campos) e
 * os faróis/contadores são calculados em memória — antes eram ~40 consultas
 * COUNT separadas, cada uma com a latência de ida e volta ao banco.
 */
export async function carregarDashboard(u: UsuarioAtual, f: FiltroDashboard) {
  const escopo = escopoCarrier(u, f.carrierId);
  const hoje = hojeData();
  const hojeTxt = diaLocal();
  const janela = somarDias(hoje, JANELA_ALERTA_DIAS);
  const mes = f.mes ? limitesDoMes(f.mes) : null;
  const farol = (d: Date) => farolVencimento(d, false, hojeTxt)!;

  // Dados financeiros (valores de contratos e faturamento consolidado): somente ADM Geral.
  const admin = u.perfil === "ADMIN";
  const [financeiro, abertas, contratos, documentos, manuais] = await Promise.all([
    admin ? carregarFinanceiro(escopo, mes, hoje) : null,
    // cobranças em aberto (sem valores) — visão de conferência de todos os perfis
    prisma.financialService.findMany({ where: { ...escopo, status: "PENDING" }, select: { dueDate: true } }),
    prisma.contract.findMany({
      where: { ...escopo, status: "ACTIVE" },
      select: { id: true, title: true, contractType: true, amount: true, expirationDate: true, carrier: carrierResumo },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.sanitaryLicense.findMany({
      where: { ...escopo, status: "CURRENT" },
      select: { id: true, status: true, documentType: true, licenseNumber: true, expirationDate: true, carrier: carrierResumo },
      orderBy: { expirationDate: { sort: "asc", nulls: "last" } },
    }),
    prisma.goodPracticesManual.findMany({
      where: { ...escopo, reviewDate: { not: null } },
      select: { id: true, title: true, category: true, version: true, reviewDate: true, carrier: carrierResumo },
      orderBy: { reviewDate: "asc" },
    }),
  ]);

  const contar = (datas: Date[]): Contagem => {
    const c: Contagem = { VERMELHO: 0, AMARELO: 0, VERDE: 0 };
    for (const d of datas) c[farol(d)]++;
    return c;
  };
  const alertar = <T,>(lista: T[], data: (x: T) => Date) => lista.filter((x) => data(x) <= janela).slice(0, 8);

  const porCategoria = (categoria: CategoriaDocumento) => {
    const lista = documentos.filter((l) => categoriaDoTipo(l.documentType) === categoria);
    const comValidade = lista.filter((l): l is typeof l & { expirationDate: Date } => !!l.expirationDate);
    return {
      farois: contar(comValidade.map((l) => l.expirationDate)),
      /** documentos vigentes da categoria */
      total: lista.length,
      semValidade: lista.length - comValidade.length,
      itens: alertar(comValidade, (l) => l.expirationDate).map((l) => ({ ...l, farol: farol(l.expirationDate), situacao: situacaoLicenca(l, hojeTxt) })),
    };
  };
  const manuaisComData = manuais.filter((m): m is typeof m & { reviewDate: Date } => !!m.reviewDate);

  return {
    /** null para o Cliente / Transportador */
    contratos: financeiro?.contratos ?? null,
    /** null para o Cliente / Transportador */
    faturamento: financeiro?.faturamento ?? null,
    cobrancas: { aVencer: abertas.filter((s) => s.dueDate >= hoje).length, emAtraso: abertas.filter((s) => s.dueDate < hoje).length },
    alertas: {
      janelaDias: JANELA_ALERTA_DIAS,
      contratos: {
        farois: contar(contratos.map((c) => c.expirationDate)),
        itens: alertar(contratos, (c) => c.expirationDate).map((c) => ({ ...c, amount: Number(c.amount), farol: farol(c.expirationDate) })),
      },
      /** Licença Sanitária & Regulatória */
      licencas: porCategoria("LICENCA"),
      /** Documentos Operacionais & Técnicos */
      documentos: porCategoria("DOCUMENTO"),
      manuais: {
        farois: contar(manuaisComData.map((m) => m.reviewDate)),
        itens: alertar(manuaisComData, (m) => m.reviewDate).map((m) => ({ ...m, farol: farol(m.reviewDate) })),
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
  // contratos e NFs em paralelo: duas consultas agregadas
  const [porTipo, linhas] = await Promise.all([
    prisma.contract.groupBy({ by: ["contractType"], where: whereContratos, _sum: { amount: true }, _count: true }),
    // faturamento: tipo × status × vencida (datas como texto → ::date, sem depender do fuso da sessão)
    prisma.$queryRaw<{ tipo: "PJ" | "SPOT"; status: string; vencida: boolean; quantidade: number; valor: string | number }[]>`
      SELECT "contractType"::text AS tipo, "status"::text AS status, ("dueDate" < ${diaDe(hoje)}::date) AS vencida,
             COUNT(*)::int AS quantidade, COALESCE(SUM("amount"), 0) AS valor
        FROM "financial_services"
       WHERE "status"::text NOT IN ('CANCELED', 'PENDING_EMISSION')
         ${escopo.carrierId ? Prisma.sql`AND "carrierId" = ${escopo.carrierId}` : Prisma.empty}
         ${mes ? Prisma.sql`AND "dueDate" >= ${diaDe(mes.inicio)}::date AND "dueDate" < ${diaDe(mes.fim)}::date` : Prisma.empty}
       GROUP BY 1, 2, 3`,
  ]);
  const tipo = (t: "PJ" | "SPOT") => {
    const g = porTipo.find((p) => p.contractType === t);
    return { valor: Number(g?._sum.amount ?? 0), quantidade: g?._count ?? 0 };
  };
  const pj = tipo("PJ");
  const spot = tipo("SPOT");
  const totalContratos = pj.valor + spot.valor;

  const somar = (filtro: (l: (typeof linhas)[number]) => boolean) =>
    linhas.filter(filtro).reduce((a, l) => ({ quantidade: a.quantidade + Number(l.quantidade), valor: a.valor + Number(l.valor) }), { quantidade: 0, valor: 0 });
  const nfTipo = (t: "PJ" | "SPOT") => somar((l) => l.tipo === t);

  return {
    contratos: {
      total: totalContratos,
      quantidade: pj.quantidade + spot.quantidade,
      pj: { ...pj, percentual: totalContratos ? pj.valor / totalContratos : 0 },
      spot: { ...spot, percentual: totalContratos ? spot.valor / totalContratos : 0 },
    },
    faturamento: {
      emitidas: somar(() => true),
      pagas: somar((l) => l.status === "PAID"),
      vencidas: somar((l) => l.status === "PENDING" && l.vencida),
      pendentes: somar((l) => l.status === "PENDING" && !l.vencida),
      pj: nfTipo("PJ"),
      spot: nfTipo("SPOT"),
    },
  };
}
