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
    admin ? carregarFinanceiro(escopo, mes, hoje, f.mes) : null,
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
    /** gráficos financeiros (null para o Cliente / Transportador) */
    graficos: financeiro?.graficos ?? null,
    cobrancas: { aVencer: abertas.filter((s) => s.dueDate >= hoje).length, emAtraso: abertas.filter((s) => s.dueDate < hoje).length },
    alertas: {
      janelaDias: JANELA_ALERTA_DIAS,
      contratos: {
        farois: contar(contratos.map((c) => c.expirationDate)),
        itens: alertar(contratos, (c) => c.expirationDate).map((c) => ({ ...c, amount: Number(c.amount), farol: farol(c.expirationDate) })),
      },
      /** Documentos Regulatórios */
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
async function carregarFinanceiro(escopo: { carrierId?: string }, mes: { inicio: Date; fim: Date } | null, hoje: Date, mesTxt?: string) {
  const whereContratos: Prisma.ContractWhereInput = mes
    ? {
        ...escopo,
        status: { not: "TERMINATED" },
        expirationDate: { gte: mes.inicio },
        OR: [{ startDate: null }, { startDate: { lt: mes.fim } }],
      }
    : { ...escopo, status: "ACTIVE" };
  // 12 meses terminando no mês filtrado (ou no mês atual)
  const [anoRef, mesRef] = (mesTxt ?? diaDe(hoje).slice(0, 7)).split("-").map(Number);
  const fimSerie = new Date(Date.UTC(anoRef, mesRef, 1));
  const inicioSerie = new Date(Date.UTC(anoRef, mesRef - 12, 1));
  const filtroCarrier = escopo.carrierId ? Prisma.sql`AND s."carrierId" = ${escopo.carrierId}` : Prisma.empty;

  // contratos, NFs, série mensal e maiores devedores em paralelo (4 consultas agregadas)
  const [porTipo, linhas, mensal, devedores] = await Promise.all([
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
    prisma.$queryRaw<{ mes: string; pago: string | null; aVencer: string | null; vencido: string | null }[]>`
      SELECT to_char(date_trunc('month', s."dueDate"), 'YYYY-MM') AS mes,
             SUM(s."amount") FILTER (WHERE s."status"::text = 'PAID') AS pago,
             SUM(s."amount") FILTER (WHERE s."status"::text = 'PENDING' AND s."dueDate" >= ${diaDe(hoje)}::date) AS "aVencer",
             SUM(s."amount") FILTER (WHERE s."status"::text = 'PENDING' AND s."dueDate" < ${diaDe(hoje)}::date) AS vencido
        FROM "financial_services" s
       WHERE s."status"::text IN ('PAID', 'PENDING')
         AND s."dueDate" >= ${diaDe(inicioSerie)}::date AND s."dueDate" < ${diaDe(fimSerie)}::date
         ${filtroCarrier}
       GROUP BY 1`,
    prisma.$queryRaw<{ id: string; nome: string; vencido: string | null; aVencer: string | null }[]>`
      SELECT c."id", COALESCE(c."tradeName", c."legalName") AS nome,
             SUM(s."amount") FILTER (WHERE s."dueDate" < ${diaDe(hoje)}::date) AS vencido,
             SUM(s."amount") FILTER (WHERE s."dueDate" >= ${diaDe(hoje)}::date) AS "aVencer"
        FROM "financial_services" s JOIN "carriers" c ON c."id" = s."carrierId"
       WHERE s."status"::text = 'PENDING' ${filtroCarrier}
       GROUP BY c."id", nome
       ORDER BY SUM(s."amount") DESC
       LIMIT 6`,
  ]);
  const n = (v: string | number | null | undefined) => Number(v ?? 0);
  const porMes = new Map(mensal.map((m) => [m.mes, m]));
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(anoRef, mesRef - 12 + i, 1));
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const m = porMes.get(chave);
    return { mes: chave, pago: n(m?.pago), aVencer: n(m?.aVencer), vencido: n(m?.vencido) };
  });
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
    graficos: {
      /** faturamento por mês de vencimento (12 meses): recebido x a vencer x vencido */
      mensal: meses,
      /** transportadoras com mais valor em aberto */
      devedores: devedores.map((d) => ({ id: d.id, nome: d.nome, vencido: n(d.vencido), aVencer: n(d.aVencer) })),
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
