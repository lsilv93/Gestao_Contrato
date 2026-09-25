// Status de negócio derivados (o que é calculado a partir de datas não é gravado).
import type { ContractStatus, ContractType, FinancialStatus, LicenseStatus, ManualCategory } from "@prisma/client";
import { diaDe, diaLocal } from "@/lib/datas";
import { farolVencimento, type Farol } from "./farol";

export const rotuloTipoContrato: Record<ContractType, string> = { PJ: "PJ", SPOT: "SPOT" };

export const rotuloStatusContrato: Record<ContractStatus, string> = {
  ACTIVE: "Vigente",
  RENEWED: "Renovado",
  TERMINATED: "Encerrado",
};

// ---------------- Faturamento ----------------
export type StatusFaturamento = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
export const rotuloStatusFaturamento: Record<StatusFaturamento, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
};

/** Pendente com vencimento anterior a hoje = Atrasado. */
export function statusFaturamento(s: { status: FinancialStatus; dueDate: Date }, hoje: string = diaLocal()): StatusFaturamento {
  if (s.status !== "PENDING") return s.status;
  return diaDe(s.dueDate) < hoje ? "OVERDUE" : "PENDING";
}

// ---------------- Licenças ----------------
export const rotuloStatusLicenca: Record<LicenseStatus, string> = {
  CURRENT: "Vigente",
  RENEWED: "Renovada",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
  CLOSED: "Encerrada",
};

export type SituacaoLicenca = "ATIVA" | "PROXIMA" | "VENCIDA" | LicenseStatus;
const situacaoPorFarol: Record<Farol, SituacaoLicenca> = { VERDE: "ATIVA", AMARELO: "PROXIMA", VERMELHO: "VENCIDA" };
export const rotuloSituacaoLicenca: Record<SituacaoLicenca, string> = {
  ATIVA: "Ativa",
  PROXIMA: "Próxima de Vencer",
  VENCIDA: "Vencida",
  ...rotuloStatusLicenca,
};

/** Ativa / Próxima de Vencer / Vencida para licenças vigentes; senão o status gravado. */
export function situacaoLicenca(l: { status: LicenseStatus; expirationDate: Date }, hoje: string = diaLocal()): SituacaoLicenca {
  const farol = farolVencimento(l.expirationDate, l.status !== "CURRENT", hoje);
  return farol ? situacaoPorFarol[farol] : l.status;
}

// ---------------- Manuais ----------------
export const rotuloCategoriaManual: Record<ManualCategory, string> = {
  MANUAL_BPA: "Manual de Boas Práticas",
  POP: "POP",
  OTHER: "Outro",
};
