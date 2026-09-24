// Regra de Farol de Vencimento (Contratos, Licenças, Manuais e Faturamento).
//
//   VERDE    — em dia: mais de DIAS_ALERTA dia(s) para o vencimento
//   AMARELO  — alerta crítico: falta DIAS_ALERTA dia ou vence hoje
//   VERMELHO — vencido/atrasado: hoje > vencimento e não pago/renovado
//
// Registros já resolvidos (pagos, renovados, encerrados) não têm farol.
import { diaLocal, diasAte } from "@/lib/datas";

export type Farol = "VERDE" | "AMARELO" | "VERMELHO";

/** Antecedência (em dias) do alerta amarelo. */
export const DIAS_ALERTA = 1;

export function farolPorDias(dias: number): Farol {
  if (dias < 0) return "VERMELHO";
  if (dias <= DIAS_ALERTA) return "AMARELO";
  return "VERDE";
}

/** Farol de um vencimento. `resolvido` = pago/renovado/encerrado → sem farol. */
export function farolVencimento(vencimento: Date | null | undefined, resolvido = false, hoje: string = diaLocal()): Farol | null {
  if (resolvido || !vencimento) return null;
  return farolPorDias(diasAte(vencimento, hoje));
}

const ordem: Record<Farol, number> = { VERMELHO: 0, AMARELO: 1, VERDE: 2 };
export const compararFarol = (a: Farol | null, b: Farol | null) => (a ? ordem[a] : 3) - (b ? ordem[b] : 3);

export const FAROIS: Farol[] = ["VERMELHO", "AMARELO", "VERDE"];
export const ehFarol = (v: unknown): v is Farol => typeof v === "string" && (FAROIS as string[]).includes(v);

/** Texto curto: "vence hoje", "vence amanhã", "vence em 12 dias", "vencido há 3 dias". */
export function textoPrazo(vencimento: Date, hoje: string = diaLocal()): string {
  const d = diasAte(vencimento, hoje);
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d > 1) return `vence em ${d} dias`;
  if (d === -1) return "venceu ontem";
  return `vencido há ${-d} dias`;
}
