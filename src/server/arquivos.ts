import "server-only";
import type { Prisma } from "@prisma/client";
import { ErroNegocio } from "./erros";

/** Limite por arquivo (a Vercel aceita até 4,5 MB por requisição). */
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  pdf: "application/pdf",
  xml: "application/xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type ArquivoEnviado = { fileName: string; mimeType: string; size: number; data: Uint8Array<ArrayBuffer> };

/** Lê o arquivo PDF/Word enviado no formulário (null se nenhum foi escolhido). */
export async function lerArquivo(form: FormData, campo = "arquivo", aceitos: string[] = ["pdf", "doc", "docx"]): Promise<ArquivoEnviado | null> {
  const f = form.get(campo);
  if (!(f instanceof File) || f.size === 0) return null;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = aceitos.includes(ext) ? TIPOS[ext] : undefined;
  if (!mimeType) throw new ErroNegocio(`Envie um arquivo ${aceitos.map((a) => "." + a).join(", ")}.`);
  if (f.size > TAMANHO_MAXIMO) throw new ErroNegocio("O arquivo deve ter no máximo 4 MB.");
  return { fileName: f.name.slice(0, 200), mimeType, size: f.size, data: new Uint8Array(await f.arrayBuffer()) };
}

export async function gravarArquivo(tx: Prisma.TransactionClient, arquivo: ArquivoEnviado, usuarioId: string) {
  return tx.storedFile.create({ data: { ...arquivo, uploadedById: usuarioId }, select: { id: true, fileName: true, size: true } });
}
