/**
 * CNPJ normalizado: 14 caracteres, maiúsculos, sem pontuação. Desde jul/2026 a
 * Receita emite CNPJ alfanumérico (12 posições alfanuméricas + 2 dígitos verificadores).
 */
export const normalizarCnpj = (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, "");

export function formatarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const d = normalizarCnpj(cnpj);
  if (d.length !== 14) return cnpj;
  return d.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");
}

/** Dígitos verificadores do CNPJ (válido para o formato numérico e o alfanumérico). */
export function dvCnpj(base12: string): string {
  const valor = (c: string) => c.charCodeAt(0) - 48;
  const calc = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split("").reduce((acc, c, i) => acc + valor(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calc(base12);
  const d2 = calc(base12 + d1);
  return `${d1}${d2}`;
}

export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  return cnpj.endsWith(dvCnpj(cnpj.slice(0, 12)));
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatarMoeda = (v: number | string | { toString(): string } | null | undefined) =>
  moeda.format(Number(v ?? 0));

export const formatarNumero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export const formatarPercentual = (p: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(p);

/** Aceita "1.234,56", "1234,56" ou "1234.56". Retorna null se inválido. */
export function lerValor(v: string): number | null {
  const s = v.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Number(normal);
}

export function formatarBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
