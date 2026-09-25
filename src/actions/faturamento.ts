"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { ErroNegocio } from "@/server/erros";
import { lerArquivo } from "@/server/arquivos";
import { excluirArquivo, substituirArquivo } from "./documentos";
import { diaDe, diaLocal } from "@/lib/datas";
import { campos, concluir, data, dataOpcional, id, lerId, obrigatorio, opcional, valor } from "./comum";
import { tratarErro, type Estado } from "./estado";

const BASE = "/faturamento";

const schema = z
  .object({
    carrierId: id,
    contractId: z
      .string()
      .optional()
      .transform((v) => v || null),
    contractType: z.enum(["PJ", "SPOT"], { error: "Selecione o tipo de contrato." }),
    invoiceNumber: obrigatorio("o número da NF", 40),
    description: opcional(500),
    dueDate: data("o vencimento"),
    amount: valor("o valor"),
    status: z.enum(["PENDING", "PAID", "CANCELED"]).default("PENDING"),
    paymentDate: dataOpcional,
  })
  .refine((d) => d.status !== "PAID" || !!d.paymentDate, { message: "Informe a data de pagamento." })
  .transform((d) => ({ ...d, paymentDate: d.status === "PAID" ? d.paymentDate : null }));

export async function salvarServico(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form);
    const d = schema.parse(campos(form));
    if (d.contractId) {
      const c = await prisma.contract.findUnique({ where: { id: d.contractId } });
      if (!c || c.carrierId !== d.carrierId) throw new ErroNegocio("O contrato escolhido não pertence a esta transportadora.");
    }
    const arquivo = await lerArquivo(form);
    const s = await prisma.$transaction(async (tx) => {
      const antes = idAtual ? await tx.financialService.findUniqueOrThrow({ where: { id: idAtual } }) : null;
      // PDF da NF (opcional): um novo arquivo substitui o anterior
      const fileId = await substituirArquivo(tx, arquivo, u, antes?.fileId);
      const dados = { ...d, ...(fileId ? { fileId } : {}) };
      const s = idAtual ? await tx.financialService.update({ where: { id: idAtual }, data: dados }) : await tx.financialService.create({ data: dados });
      await auditar(tx, { usuario: u, action: idAtual ? "UPDATE" : "CREATE", entityName: "FinancialService", entityId: s.id, details: antes ? { antes, depois: s } : s });
      return s;
    });
    msg = `NF ${s.invoiceNumber} ${idAtual ? "atualizada" : "lançada"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

/** Quick action: baixa a NF como paga na data informada. */
export async function marcarPago(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const paymentDate = data("a data de pagamento").parse(String(form.get("paymentDate") ?? ""));
    if (diaDe(paymentDate) > diaLocal()) throw new ErroNegocio("A data de pagamento não pode ser futura.");
    const s = await prisma.$transaction(async (tx) => {
      const antes = await tx.financialService.findUniqueOrThrow({ where: { id: idAtual } });
      if (antes.status === "PAID") throw new ErroNegocio(`A NF ${antes.invoiceNumber} já está paga.`);
      const s = await tx.financialService.update({ where: { id: idAtual }, data: { status: "PAID", paymentDate } });
      await auditar(tx, {
        usuario: u,
        action: "UPDATE",
        entityName: "FinancialService",
        entityId: s.id,
        details: { operacao: "Baixa de pagamento", status: { de: antes.status, para: "PAID" }, paymentDate: diaDe(paymentDate) },
      });
      return s;
    });
    msg = `NF ${s.invoiceNumber} marcada como paga.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

export async function excluirServico(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const s = await prisma.$transaction(async (tx) => {
      const s = await tx.financialService.delete({ where: { id: idAtual } });
      await auditar(tx, { usuario: u, action: "DELETE", entityName: "FinancialService", entityId: s.id, details: s });
      if (s.fileId) await excluirArquivo(tx, s.fileId, u);
      return s;
    });
    msg = `NF ${s.invoiceNumber} excluída.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
