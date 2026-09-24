// Datas no fuso de operação (America/Sao_Paulo, UTC-3 sem horário de verão).
//
// Vencimentos são gravados como @db.Date (meia-noite UTC do dia). Para comparar,
// usamos sempre o "dia" ISO (YYYY-MM-DD): o do vencimento em UTC e o de hoje em
// São Paulo.
export const TZ = "America/Sao_Paulo";
const DIA_MS = 24 * 60 * 60 * 1000;
const reDia = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" de hoje (ou da data informada) no fuso de São Paulo. */
export function diaLocal(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "YYYY-MM-DD" de um campo @db.Date. */
export const diaDe = (d: Date) => d.toISOString().slice(0, 10);

/** Converte "YYYY-MM-DD" para o valor gravado em campos @db.Date. */
export function paraData(dia: string): Date {
  if (!reDia.test(dia)) throw new Error(`Data inválida: ${dia}`);
  return new Date(`${dia}T00:00:00.000Z`);
}

export const diaValido = (v: string) => reDia.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

/** Hoje como valor @db.Date (para filtros no banco). */
export const hojeData = () => paraData(diaLocal());

/** Dias corridos de hoje até o dia do vencimento (negativo = vencido). */
export function diasAte(vencimento: Date, hoje: string = diaLocal()): number {
  return Math.round((paraData(diaDe(vencimento)).getTime() - paraData(hoje).getTime()) / DIA_MS);
}

/** Soma dias a um valor @db.Date. */
export const somarDias = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA_MS);

/** Primeiro dia do mês e primeiro dia do mês seguinte ("YYYY-MM"). */
export function limitesDoMes(mes: string): { inicio: Date; fim: Date } {
  const [a, m] = mes.split("-").map(Number);
  return { inicio: new Date(Date.UTC(a, m - 1, 1)), fim: new Date(Date.UTC(a, m, 1)) };
}

/** Formata um campo @db.Date (dd/mm/aaaa). */
export function formatarData(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "short" }).format(d);
}

/** Formata um instante (timestamp) no fuso de São Paulo. */
export function formatarDataHora(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "medium" }).format(d);
}

const nomesMes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${nomesMes[m - 1]}/${a}`;
}
