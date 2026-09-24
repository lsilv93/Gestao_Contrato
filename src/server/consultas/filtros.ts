import "server-only";
import { DIAS_ALERTA, ehFarol, type Farol } from "@/domain/farol";
import { hojeData, somarDias } from "@/lib/datas";

export type Params = Record<string, string | string[] | undefined>;

/** Lê um parâmetro de busca como string simples. */
export const param = (sp: Params, nome: string): string | undefined => {
  const v = sp[nome];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
};

export const paramEnum = <T extends string>(sp: Params, nome: string, valores: readonly T[]): T | undefined => {
  const v = param(sp, nome);
  return v && (valores as readonly string[]).includes(v) ? (v as T) : undefined;
};

export const paramFarol = (sp: Params): Farol | undefined => {
  const v = param(sp, "farol");
  return ehFarol(v) ? v : undefined;
};

/** Condição de data equivalente ao farol (para filtrar no banco). */
export function condicaoFarol(farol: Farol) {
  const hoje = hojeData();
  const limite = somarDias(hoje, DIAS_ALERTA);
  if (farol === "VERMELHO") return { lt: hoje };
  if (farol === "AMARELO") return { gte: hoje, lte: limite };
  return { gt: limite };
}

export const arquivoResumo = { select: { id: true, fileName: true, size: true, mimeType: true } } as const;
export const carrierResumo = { select: { id: true, cnpj: true, legalName: true, tradeName: true } } as const;

export const nomeCarrier = (c: { legalName: string; tradeName: string | null }) => c.tradeName || c.legalName;
