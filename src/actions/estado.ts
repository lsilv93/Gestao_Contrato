import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ErroNegocio } from "@/server/erros";

export type Estado = { ok: boolean; mensagem: string; ts: number } | null;

export const sucesso = (mensagem: string): Estado => ({ ok: true, mensagem, ts: Date.now() });
export const falha = (mensagem: string): Estado => ({ ok: false, mensagem, ts: Date.now() });

/** Converte exceções conhecidas em mensagens amigáveis para o formulário. */
export function tratarErro(e: unknown): Estado {
  if (e instanceof ErroNegocio) return falha(e.message);
  if (e instanceof ZodError) return falha(e.issues[0]?.message ?? "Dados inválidos.");
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return falha("Já existe um registro com estes dados (valor duplicado).");
    if (e.code === "P2003") return falha("Não é possível excluir: existem registros vinculados. Inative em vez de excluir.");
    if (e.code === "P2025") return falha("Registro não encontrado (pode ter sido excluído).");
  }
  console.error(e);
  return falha("Erro inesperado ao processar a operação. Tente novamente.");
}
