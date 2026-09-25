import "server-only";
import { Prisma } from "@prisma/client";
import { competencia, datasDoCiclo, farolEmissao, mesAnterior, mesSeguinte } from "@/domain/cicloFaturamento";
import { diaDe, diaLocal, hojeData } from "@/lib/datas";
import { auditar } from "./auditoria";
import { carrierResumo, nomeCarrier } from "./consultas/filtros";
import { prisma } from "./prisma";

/**
 * Gera as pendências "NF pendente de emissão" do ciclo mensal (idempotente).
 *
 * Para cada contrato VIGENTE, avalia a competência do mês atual, a do mês
 * anterior (para não perder um ciclo se a verificação não rodou na virada do mês)
 * e a do mês seguinte (antecedência que cruza a virada: emissão dia 2 com 5 dias
 * de antecedência nasce no fim do mês anterior):
 *  - a pendência nasce `emissionLeadDays` antes do dia de emissão;
 *  - o contrato precisa estar vigente na data de emissão;
 *  - o mês anterior só é gerado se o contrato já estava cadastrado naquela data
 *    (contratos novos não criam atrasados retroativos).
 * O índice único (contractId, competence) garante no máximo uma pendência por
 * contrato e mês, mesmo com o cron e a verificação rodando ao mesmo tempo.
 */
export async function gerarPendenciasEmissao(hoje: string = diaLocal()): Promise<{ geradas: number; avaliadas: number }> {
  const [ano, mes] = hoje.split("-").map(Number);
  const competencias: [number, number, "atual" | "anterior" | "seguinte"][] = [
    [ano, mes, "atual"],
    [...mesAnterior(ano, mes), "anterior"],
    [...mesSeguinte(ano, mes), "seguinte"],
  ];
  const contratos = await prisma.contract.findMany({
    where: { status: "ACTIVE", carrier: { active: true } },
    select: {
      id: true, carrierId: true, contractType: true, title: true, invoiceDay: true, dueDay: true,
      emissionLeadDays: true, billingAmount: true, startDate: true, expirationDate: true, createdAt: true,
    },
  });
  // competências já geradas (qualquer status): não tenta inserir de novo
  const existentes = new Set(
    (
      await prisma.financialService.findMany({
        where: { contractId: { in: contratos.map((c) => c.id) }, competence: { in: competencias.map(([a, m]) => competencia(a, m)) } },
        select: { contractId: true, competence: true },
      })
    ).map((s) => `${s.contractId}|${s.competence}`),
  );
  let geradas = 0;
  for (const c of contratos) {
    for (const [a, m, qual] of competencias) {
      const ciclo = datasDoCiclo(c, a, m);
      if (existentes.has(`${c.id}|${ciclo.competencia}`)) continue;
      if (diaDe(ciclo.geracao) > hoje) continue; // ainda não é hora
      if (c.expirationDate < ciclo.emissao || (c.startDate && c.startDate > ciclo.emissao)) continue; // fora da vigência
      if (qual === "anterior" && diaDe(ciclo.emissao) < diaLocal(c.createdAt)) continue; // sem retroativo
      try {
        await prisma.$transaction(async (tx) => {
          const s = await tx.financialService.create({
            data: {
              carrierId: c.carrierId,
              contractId: c.id,
              contractType: c.contractType,
              status: "PENDING_EMISSION",
              competence: ciclo.competencia,
              emissionDate: ciclo.emissao,
              dueDate: ciclo.vencimento,
              amount: c.billingAmount,
              description: `${c.title} — competência ${ciclo.competencia.split("-").reverse().join("/")}`,
            },
          });
          await auditar(tx, {
            usuario: null,
            sistema: "Sistema (ciclo automático)",
            action: "CREATE",
            entityName: "FinancialService",
            entityId: s.id,
            details: { operacao: "Pendência de emissão gerada automaticamente", contrato: c.id, competencia: ciclo.competencia, emissao: diaDe(ciclo.emissao) },
          });
        });
        geradas++;
      } catch (e) {
        // gerada ao mesmo tempo por outra execução (unique contractId+competence): nada a fazer
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }
  return { geradas, avaliadas: contratos.length };
}

// Verificação automática ao abrir o sistema (além do cron diário): no máximo a
// cada 10 minutos por instância, compartilhando a execução em andamento.
let ultima = 0;
let emAndamento: Promise<unknown> | null = null;
export async function garantirPendenciasEmissao() {
  if (emAndamento) return emAndamento;
  if (Date.now() - ultima < 10 * 60_000) return;
  emAndamento = gerarPendenciasEmissao()
    .catch((e) => console.error("[ciclo] falha ao gerar pendências de emissão", e))
    .finally(() => {
      ultima = Date.now();
      emAndamento = null;
    });
  return emAndamento;
}

/** Pendências de emissão em aberto (dashboard, cabeçalho e faturamento do ADM). */
export async function listarPendenciasEmissao() {
  const lista = await prisma.financialService.findMany({
    where: { status: "PENDING_EMISSION" },
    include: { carrier: carrierResumo, contract: { select: { id: true, title: true } } },
    orderBy: [{ emissionDate: "asc" }],
  });
  const hoje = diaLocal();
  return lista.map((s) => ({
    id: s.id,
    transportadora: nomeCarrier(s.carrier),
    cnpj: s.carrier.cnpj,
    contrato: s.contract?.title ?? s.description ?? "—",
    competencia: s.competence,
    emissao: s.emissionDate ?? s.dueDate,
    vencimento: s.dueDate,
    valor: Number(s.amount),
    farol: farolEmissao(s.emissionDate ?? s.dueDate, hoje),
  }));
}
export type PendenciaEmissao = Awaited<ReturnType<typeof listarPendenciasEmissao>>[number];

/** Contagem para o notificador do cabeçalho. */
export async function contarPendenciasEmissao() {
  const hoje = hojeData();
  const [total, atrasadas] = await Promise.all([
    prisma.financialService.count({ where: { status: "PENDING_EMISSION" } }),
    prisma.financialService.count({ where: { status: "PENDING_EMISSION", emissionDate: { lt: hoje } } }),
  ]);
  return { total, atrasadas };
}
