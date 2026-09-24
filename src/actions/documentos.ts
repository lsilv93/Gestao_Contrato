import "server-only";
import type { Prisma } from "@prisma/client";
import type { UsuarioAtual } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { gravarArquivo, type ArquivoEnviado } from "@/server/arquivos";

/**
 * Anexa um novo PDF/Word (substituindo o anterior, que é excluído).
 * Retorna o novo fileId, ou undefined se nenhum arquivo foi enviado.
 */
export async function substituirArquivo(
  tx: Prisma.TransactionClient,
  arquivo: ArquivoEnviado | null,
  usuario: UsuarioAtual,
  anteriorId: string | null | undefined,
  { manterAnterior = false } = {},
): Promise<string | undefined> {
  if (!arquivo) return undefined;
  const novo = await gravarArquivo(tx, arquivo, usuario.id);
  await auditar(tx, { usuario, action: "CREATE", entityName: "StoredFile", entityId: novo.id, details: novo });
  if (anteriorId && !manterAnterior) await excluirArquivo(tx, anteriorId, usuario);
  return novo.id;
}

export async function excluirArquivo(tx: Prisma.TransactionClient, fileId: string, usuario: UsuarioAtual) {
  const f = await tx.storedFile.delete({ where: { id: fileId }, select: { id: true, fileName: true, size: true } });
  await auditar(tx, { usuario, action: "DELETE", entityName: "StoredFile", entityId: f.id, details: f });
}
