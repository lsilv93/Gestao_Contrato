"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { lerArquivo } from "@/server/arquivos";
import { ErroNegocio } from "@/server/erros";
import { campos, concluir, dataOpcional, id, lerId, obrigatorio, opcional } from "./comum";
import { excluirArquivo, substituirArquivo } from "./documentos";
import { tratarErro, type Estado } from "./estado";

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
