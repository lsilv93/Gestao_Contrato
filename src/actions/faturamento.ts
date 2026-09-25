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
      if (antes?.status === "PENDING_EMISSION") throw new ErroNegocio("Esta NF ainda não foi emitida: use Emitir NF.");
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
      if (antes.status === "PENDING_EMISSION") throw new ErroNegocio("Emita e anexe a NF antes de dar baixa no pagamento.");
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
    // Pendência gerada pelo ciclo: "dispensar" (cancelada) em vez de excluir,
    // senão a geração diária criaria a mesma competência de novo.
    const atual = await prisma.financialService.findUniqueOrThrow({ where: { id: idAtual } });
    if (atual.status === "PENDING_EMISSION") {
      await prisma.$transaction(async (tx) => {
        await tx.financialService.update({ where: { id: idAtual }, data: { status: "CANCELED" } });
        await auditar(tx, {
          usuario: u,
          action: "UPDATE",
          entityName: "FinancialService",
          entityId: idAtual,
          details: { operacao: "Pendência de emissão dispensada (não faturar nesta competência)", competencia: atual.competence, status: { de: "PENDING_EMISSION", para: "CANCELED" } },
        });
      });
      msg = `Emissão da competência ${atual.competence ?? ""} dispensada.`;
    } else {
      const s = await prisma.$transaction(async (tx) => {
        const s = await tx.financialService.delete({ where: { id: idAtual } });
        await auditar(tx, { usuario: u, action: "DELETE", entityName: "FinancialService", entityId: s.id, details: s });
        if (s.fileId) await excluirArquivo(tx, s.fileId, u);
        return s;
      });
      msg = `NF ${s.invoiceNumber} excluída.`;
    }
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

const schemaEmissao = z.object({
  invoiceNumber: obrigatorio("o número da NF", 40),
  amount: valor("o valor da NF"),
  dueDate: data("o vencimento do pagamento"),
});

/**
 * Confirmação da emissão: o ADM anexa a NF (PDF ou XML) e confirma o lançamento.
 * A pendência de emissão é resolvida e o registro passa automaticamente para
 * "Aguardando pagamento" (PENDING), entrando nos faróis de cobrança.
 */
export async function confirmarEmissao(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const d = schemaEmissao.parse(campos(form));
    const arquivo = await lerArquivo(form, "arquivo", ["pdf", "xml"]);
    if (!arquivo) throw new ErroNegocio("Anexe o arquivo da NF (PDF ou XML) para confirmar a emissão.");
    const s = await prisma.$transaction(async (tx) => {
      const antes = await tx.financialService.findUniqueOrThrow({ where: { id: idAtual } });
      if (antes.status !== "PENDING_EMISSION") throw new ErroNegocio("Esta NF já foi emitida.");
      const dup = await tx.financialService.findFirst({ where: { carrierId: antes.carrierId, invoiceNumber: d.invoiceNumber, NOT: { id: idAtual } } });
      if (dup) throw new ErroNegocio(`A NF ${d.invoiceNumber} já está lançada para esta transportadora.`);
      const fileId = await substituirArquivo(tx, arquivo, u, antes.fileId);
      const s = await tx.financialService.update({
        where: { id: idAtual },
        data: { ...d, fileId, status: "PENDING" },
      });
      await auditar(tx, {
        usuario: u,
        action: "UPDATE",
        entityName: "FinancialService",
        entityId: s.id,
        details: {
          operacao: "Emissão de NF confirmada",
          competencia: antes.competence,
          status: { de: "PENDING_EMISSION", para: "PENDING" },
          invoiceNumber: d.invoiceNumber,
          valor: { previsto: Number(antes.amount), emitido: d.amount },
          vencimento: diaDe(d.dueDate),
        },
      });
      return s;
    });
    msg = `NF ${s.invoiceNumber} emitida e anexada. Agora aguardando pagamento.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
