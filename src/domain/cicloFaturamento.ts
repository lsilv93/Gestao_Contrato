// Ciclo de faturamento recorrente dos contratos (regras puras, sem I/O).
//
//   Contrato (dia de emissão, dia de vencimento, valor previsto, antecedência)
//     → todo mês: pendência "NF pendente de emissão" (PENDING_EMISSION)
//     → ADM anexa a NF (PDF/XML) e confirma → "Aguardando pagamento" (PENDING)
//     → faróis de pagamento já existentes → Pago (PAID)
import { diasAte, paraData, somarDias } from "@/lib/datas";
import type { Farol } from "./farol";

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes 1–12

/** Data do "dia X" num mês (dia 31 em fevereiro = último dia do mês). */
export function diaNoMes(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, Math.min(dia, ultimoDia(ano, mes))));
}

export const competencia = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;

/** Mês anterior de uma competência. */
export function mesAnterior(ano: number, mes: number): [number, number] {
  return mes === 1 ? [ano - 1, 12] : [ano, mes - 1];
}

export type RegraFaturamento = { invoiceDay: number; dueDay: number; emissionLeadDays: number };

/**
 * Datas de uma competência: emissão no dia de emissão do mês; vencimento no dia
 * de vencimento do MESMO mês se for depois da emissão, senão no mês seguinte.
 * A pendência passa a existir `emissionLeadDays` dias antes da emissão.
 */
export function datasDoCiclo(regra: RegraFaturamento, ano: number, mes: number) {
  const emissao = diaNoMes(ano, mes, regra.invoiceDay);
  const [anoV, mesV] = regra.dueDay > regra.invoiceDay ? [ano, mes] : mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  const vencimento = diaNoMes(anoV, mesV, regra.dueDay);
  const geracao = somarDias(emissao, -regra.emissionLeadDays);
  return { competencia: competencia(ano, mes), emissao, vencimento, geracao };
}

/**
 * Farol da EMISSÃO (diferente do farol de pagamento):
 *  - AMARELO: hoje é o dia de emitir;
 *  - VERMELHO: passou do dia e a NF não foi anexada/confirmada;
 *  - VERDE: pendência antecipada (ainda antes do dia de emissão).
 */
export function farolEmissao(dataEmissao: Date, hoje: string): Farol {
  const d = diasAte(dataEmissao, hoje);
  if (d < 0) return "VERMELHO";
  if (d === 0) return "AMARELO";
  return "VERDE";
}

export function textoEmissao(dataEmissao: Date, hoje: string): string {
  const d = diasAte(dataEmissao, hoje);
  if (d === 0) return "emitir hoje";
  if (d > 0) return d === 1 ? "emitir amanhã" : `emitir em ${d} dias`;
  return d === -1 ? "atrasada 1 dia" : `atrasada ${-d} dias`;
}

export const hojeComoData = (hoje: string) => paraData(hoje);
