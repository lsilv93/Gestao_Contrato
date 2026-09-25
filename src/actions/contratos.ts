"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { lerArquivo } from "@/server/arquivos";
import { gerarPendenciasEmissao } from "@/server/cicloFaturamento";
import { ErroNegocio } from "@/server/erros";
import { campos, concluir, data, dataOpcional, id, lerId, obrigatorio, opcional, valor } from "./comum";
import { excluirArquivo, substituirArquivo } from "./documentos";
import { tratarErro, type Estado } from "./estado";

const BASE = "/contratos";

const dia = (rotulo: string) =>
  z.coerce.number({ error: `Informe ${rotulo}.` }).int(`Informe ${rotulo} (1 a 31).`).min(1, `Informe ${rotulo} (1 a 31).`).max(31, `Informe ${rotulo} (1 a 31).`);

const schema = z
  .object({
    carrierId: id,
    contractType: z.enum(["PJ", "SPOT"], { error: "Selecione o tipo de contrato." }),
    title: obrigatorio("a descrição do contrato"),
    amount: valor("o valor"),
    startDate: dataOpcional,
    expirationDate: data("a data de vencimento"),
    status: z.enum(["ACTIVE", "RENEWED", "TERMINATED"]).default("ACTIVE"),
    notes: opcional(2000),
    // ciclo de faturamento (obrigatório)
    invoiceDay: dia("o dia de emissão da NF"),
    dueDay: dia("o dia de vencimento do pagamento"),
    billingAmount: valor("o valor previsto por NF"),
    emissionLeadDays: z.coerce
      .number({ error: "Antecedência inválida." })
      .int()
      .min(0, "A antecedência vai de 0 a 20 dias.")
      .max(20, "A antecedência vai de 0 a 20 dias.")
      .default(0),
  })
  .refine((d) => !d.startDate || d.startDate <= d.expirationDate, { message: "O início não pode ser depois do vencimento." });

export async function salvarContrato(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form);
    const d = schema.parse(campos(form));
    const arquivo = await lerArquivo(form);
    if (!idAtual && !arquivo) throw new ErroNegocio("Anexe o PDF do contrato.");
    const c = await prisma.$transaction(async (tx) => {
      const antes = idAtual ? await tx.contract.findUniqueOrThrow({ where: { id: idAtual } }) : null;
      const fileId = await substituirArquivo(tx, arquivo, u, antes?.fileId);
      const dados = { ...d, ...(fileId ? { fileId } : {}) };
      const c = idAtual ? await tx.contract.update({ where: { id: idAtual }, data: dados }) : await tx.contract.create({ data: dados });
      await auditar(tx, { usuario: u, action: idAtual ? "UPDATE" : "CREATE", entityName: "Contract", entityId: c.id, details: antes ? { antes, depois: c } : c });
      return c;
    });
    // regra de faturamento pode ter mudado: gera já a pendência de emissão, se for o dia
    await gerarPendenciasEmissao().catch((e) => console.error("[ciclo] geração após salvar contrato", e));
    msg = `Contrato "${c.title}" ${idAtual ? "atualizado" : "cadastrado"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

export async function excluirContrato(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const c = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.delete({ where: { id: idAtual } });
      await auditar(tx, { usuario: u, action: "DELETE", entityName: "Contract", entityId: c.id, details: c });
      if (c.fileId) await excluirArquivo(tx, c.fileId, u);
      return c;
    });
    msg = `Contrato "${c.title}" excluído.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
