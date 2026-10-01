"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { gravarArquivo, lerArquivo, lerArquivos } from "@/server/arquivos";
import { revalidatePath } from "next/cache";
import { ErroNegocio } from "@/server/erros";
import { campos, concluir, dataOpcional, id, lerId, obrigatorio, opcional } from "./comum";
import { excluirArquivo, substituirArquivo } from "./documentos";
import { sucesso, tratarErro, type Estado } from "./estado";

const BASE = "/manuais";

const schema = z.object({
  carrierId: id,
  title: obrigatorio("o título"),
  category: z.enum(["MANUAL_BPA", "POP", "OTHER"]),
  version: obrigatorio("a versão (ex.: v1.0)", 30),
  reviewDate: dataOpcional,
  notes: opcional(2000),
});

export async function salvarManual(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form);
    const d = schema.parse(campos(form));
    const arquivo = await lerArquivo(form);
    const removerArquivo = form.get("removerArquivo") === "on";
    if (!idAtual && !arquivo) throw new ErroNegocio("Anexe o arquivo do manual (PDF ou Word).");
    const m = await prisma.$transaction(async (tx) => {
      const antes = idAtual ? await tx.goodPracticesManual.findUniqueOrThrow({ where: { id: idAtual } }) : null;
      // novo arquivo substitui (e exclui) o anterior; sem novo arquivo, "remover" só exclui o atual
      const fileId = await substituirArquivo(tx, arquivo, u, antes?.fileId);
      const remover = !fileId && removerArquivo && antes?.fileId;
      const dados = { ...d, ...(fileId ? { fileId } : remover ? { fileId: null } : {}) };
      const m = idAtual
        ? await tx.goodPracticesManual.update({ where: { id: idAtual }, data: dados })
        : await tx.goodPracticesManual.create({ data: dados });
      if (remover) await excluirArquivo(tx, antes.fileId!, u);
      await auditar(tx, { usuario: u, action: idAtual ? "UPDATE" : "CREATE", entityName: "GoodPracticesManual", entityId: m.id, details: antes ? { antes, depois: m, arquivoRemovido: !!remover } : m });
      return m;
    });
    msg = `Documento "${m.title}" ${idAtual ? "atualizado" : "cadastrado"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

const schemaLote = schema.extend({
  // no lote o título é opcional: cada documento recebe o nome do próprio arquivo
  title: opcional(200),
  lote: z.string().max(40).optional(),
});

/** Nome do arquivo sem extensão, legível ("POP_07-higienizacao.pdf" → "POP 07-higienizacao"). */
const nomeDoArquivo = (nome: string) => nome.replace(/\.[^.]+$/, "").replace(/_+/g, " ").trim().slice(0, 160) || "Documento";

/**
 * Upload em lote: cada arquivo do campo `arquivos` vira um documento com os
 * MESMOS metadados do formulário (transportadora/CNPJ, categoria, versão e
 * próxima revisão). Tudo numa transação, com AuditLog para cada arquivo e para
 * cada documento criado. O navegador divide lotes grandes em pacotes de até
 * 4 MB (limite por requisição da Vercel) e chama esta ação para cada pacote.
 */
export async function cadastrarManuaisLote(_: Estado, form: FormData): Promise<Estado> {
  try {
    const u = await exigirAdmin();
    const d = schemaLote.parse(campos(form));
    const arquivos = await lerArquivos(form);
    if (!arquivos.length) throw new ErroNegocio("Selecione ao menos um arquivo (PDF ou Word).");
    if (!(await prisma.carrier.findUnique({ where: { id: d.carrierId }, select: { id: true } }))) throw new ErroNegocio("Transportadora não encontrada.");
    const { lote, ...meta } = d;
    const criados = await prisma.$transaction(
      async (tx) => {
        const nomes: string[] = [];
        for (const arquivo of arquivos) {
          const titulo = arquivos.length === 1 && meta.title ? meta.title : meta.title ? `${meta.title} — ${nomeDoArquivo(arquivo.fileName)}` : nomeDoArquivo(arquivo.fileName);
          const f = await gravarArquivo(tx, arquivo, u.id);
          await auditar(tx, { usuario: u, action: "CREATE", entityName: "StoredFile", entityId: f.id, details: { ...f, lote } });
          const m = await tx.goodPracticesManual.create({ data: { ...meta, title: titulo, fileId: f.id } });
          await auditar(tx, { usuario: u, action: "CREATE", entityName: "GoodPracticesManual", entityId: m.id, details: { ...m, operacao: "Upload em lote", lote, arquivo: arquivo.fileName } });
          nomes.push(m.title);
        }
        return nomes;
      },
      { timeout: 30_000 },
    );
    revalidatePath("/", "layout");
    return sucesso(`${criados.length} documento(s) cadastrado(s).`);
  } catch (e) {
    return tratarErro(e);
  }
}

export async function excluirManual(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const m = await prisma.$transaction(async (tx) => {
      const m = await tx.goodPracticesManual.delete({ where: { id: idAtual } });
      await auditar(tx, { usuario: u, action: "DELETE", entityName: "GoodPracticesManual", entityId: m.id, details: m });
      if (m.fileId) await excluirArquivo(tx, m.fileId, u);
      return m;
    });
    msg = `Documento "${m.title}" excluído.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
