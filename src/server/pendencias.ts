import "server-only";
import { diaDe, diaLocal, diasAte, hojeData, somarDias } from "@/lib/datas";
import type { UsuarioAtual } from "./auth";
import { escopoCarrier } from "./escopo";
import { prisma } from "./prisma";

/**
 * Regra de inadimplência do Cliente / Transportador:
 *  - NF pendente ou vencida há ATÉ 30 dias → aviso (pop-up) ao entrar no sistema;
 *  - NF vencida há MAIS de 30 dias      → acesso bloqueado até a NF ser marcada como Paga.
 * O bloqueio é verificado a cada requisição: basta o ADM dar baixa na NF para liberar.
 */
export const DIAS_BLOQUEIO = 30;

/** Data a partir da qual o atraso passa de DIAS_BLOQUEIO dias. */
const limiteBloqueio = () => somarDias(hojeData(), -DIAS_BLOQUEIO);

export async function clienteBloqueado(u: UsuarioAtual): Promise<boolean> {
  if (u.perfil !== "CLIENT") return false;
  const n = await prisma.financialService.count({
    where: { ...escopoCarrier(u), status: "PENDING", dueDate: { lt: limiteBloqueio() } },
  });
  return n > 0;
}

export type Pendencia = {
  id: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  diasAtraso: number; // 0 = ainda no prazo
  arquivo: { id: string; fileName: string; size: number } | null;
};

/** Pendências do CNPJ do cliente, separadas em bloqueantes (> 30 dias) e avisos (até 30 dias / a vencer). */
export async function pendenciasCliente(u: UsuarioAtual) {
  if (u.perfil !== "CLIENT") return { bloqueado: false, bloqueantes: [] as Pendencia[], avisos: [] as Pendencia[] };
  const lista = await prisma.financialService.findMany({
    where: { ...escopoCarrier(u), status: "PENDING" },
    select: { id: true, invoiceNumber: true, amount: true, dueDate: true, file: { select: { id: true, fileName: true, size: true } } },
    orderBy: { dueDate: "asc" },
  });
  const hoje = diaLocal();
  const itens: Pendencia[] = lista.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    amount: Number(s.amount),
    dueDate: diaDe(s.dueDate),
    diasAtraso: Math.max(0, -diasAte(s.dueDate, hoje)),
    arquivo: s.file,
  }));
  const bloqueantes = itens.filter((p) => p.diasAtraso > DIAS_BLOQUEIO);
  return { bloqueado: bloqueantes.length > 0, bloqueantes, avisos: itens.filter((p) => p.diasAtraso <= DIAS_BLOQUEIO) };
}

/** Contato exibido na tela de bloqueio (variável CONSULTORIA_CONTATO na Vercel). */
export const contatoConsultoria = () =>
  process.env.CONSULTORIA_CONTATO || "Entre em contato com a consultoria (financeiro) para regularizar e informar o pagamento.";
