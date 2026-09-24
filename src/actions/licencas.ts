"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { lerArquivo } from "@/server/arquivos";
import { ErroNegocio } from "@/server/erros";
import { diaDe, diaLocal } from "@/lib/datas";
import { rotuloStatusLicenca } from "@/domain/status";
import { campos, concluir, data, dataOpcional, id, lerId, obrigatorio, opcional } from "./comum";
import { excluirArquivo, substituirArquivo } from "./documentos";
import { tratarErro, type Estado } from "./estado";

const BASE = "/licencas";

const camposLicenca = {
  licenseNumber: obrigatorio("o número da licença", 60),
  issuingBody: opcional(120),
  issueDate: dataOpcional,
  expirationDate: data("a data de validade"),
  notes: opcional(2000),
};

const schemaNova = z.object({ carrierId: id, ...camposLicenca });

/** Cadastro inicial ou correção de dados (a renovação tem fluxo próprio). */
export async function salvarLicenca(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form);
    const d = schemaNova.parse(campos(form));
    const arquivo = await lerArquivo(form);
    if (!idAtual && !arquivo) throw new ErroNegocio("Anexe o PDF da licença sanitária.");
    const l = await prisma.$transaction(async (tx) => {
      const antes = idAtual ? await tx.sanitaryLicense.findUniqueOrThrow({ where: { id: idAtual } }) : null;
      if (antes && antes.carrierId !== d.carrierId && antes.previousId) {
        throw new ErroNegocio("Não é possível trocar a transportadora de uma licença com histórico de renovações.");
      }
      const fileId = await substituirArquivo(tx, arquivo, u, antes?.fileId);
      const dados = { ...d, ...(fileId ? { fileId } : {}) };
      const l = idAtual ? await tx.sanitaryLicense.update({ where: { id: idAtual }, data: dados }) : await tx.sanitaryLicense.create({ data: dados });
      await auditar(tx, { usuario: u, action: idAtual ? "UPDATE" : "CREATE", entityName: "SanitaryLicense", entityId: l.id, details: antes ? { antes, depois: l } : l });
      return l;
    });
    msg = `Licença ${l.licenseNumber} ${idAtual ? "atualizada" : "cadastrada"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

const schemaStatus = z.object({
  status: z.enum(["CURRENT", "SUSPENDED", "CANCELED"]),
  motivo: opcional(500),
});

/**
 * Altera o status da licença guardando o histórico no log. Se a licença deixa
 * de estar vigente, a tela de renovação (novo documento + nova validade) abre
 * automaticamente em seguida.
 */
export async function alterarStatusLicenca(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  let abrirRenovacao = false;
  let idAtual = "";
  try {
    const u = await exigirAdmin();
    idAtual = lerId(form) ?? "";
    const d = schemaStatus.parse(campos(form));
    await prisma.$transaction(async (tx) => {
      const antes = await tx.sanitaryLicense.findUniqueOrThrow({ where: { id: idAtual }, include: { next: { select: { id: true } } } });
      if (antes.next) throw new ErroNegocio("Esta versão já foi renovada; altere a versão mais recente.");
      if (antes.status === d.status) throw new ErroNegocio("A licença já está com este status.");
      const { next: _n, ...historico } = antes;
      void _n;
      await tx.sanitaryLicense.update({ where: { id: idAtual }, data: { status: d.status } });
      await auditar(tx, {
        usuario: u,
        action: "UPDATE",
        entityName: "SanitaryLicense",
        entityId: idAtual,
        details: { operacao: "Alteração de status", status: { de: antes.status, para: d.status }, motivo: d.motivo, historico },
      });
    });
    abrirRenovacao = d.status !== "CURRENT";
    msg = `Status alterado para ${rotuloStatusLicenca[d.status]}.${abrirRenovacao ? " Inclua agora o novo documento da licença." : ""}`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg, abrirRenovacao ? { renovar: idAtual } : undefined);
}

const schemaRenovacao = z.object(camposLicenca);

/**
 * Renovação: a versão atual vira "Renovada" (com o snapshot completo no log) e
 * uma nova versão é criada com o novo documento e a nova validade.
 */
export async function renovarLicenca(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAnterior = lerId(form) ?? "";
    const d = schemaRenovacao.parse(campos(form));
    if (diaDe(d.expirationDate) <= diaLocal()) throw new ErroNegocio("A nova validade deve ser posterior a hoje.");
    const arquivo = await lerArquivo(form);
    if (!arquivo) throw new ErroNegocio("Anexe o PDF da licença renovada.");
    const nova = await prisma.$transaction(async (tx) => {
      const anterior = await tx.sanitaryLicense.findUniqueOrThrow({ where: { id: idAnterior }, include: { next: { select: { id: true } } } });
      if (anterior.next) throw new ErroNegocio("Esta licença já foi renovada.");
      const { next: _n, ...historico } = anterior;
      void _n;
      await tx.sanitaryLicense.update({ where: { id: anterior.id }, data: { status: "RENEWED" } });
      await auditar(tx, {
        usuario: u,
        action: "UPDATE",
        entityName: "SanitaryLicense",
        entityId: anterior.id,
        details: { operacao: "Renovação — versão arquivada", status: { de: anterior.status, para: "RENEWED" }, historico },
      });
      // mantém o PDF da versão anterior no histórico
      const fileId = await substituirArquivo(tx, arquivo, u, null);
      const nova = await tx.sanitaryLicense.create({
        data: { ...d, carrierId: anterior.carrierId, version: anterior.version + 1, previousId: anterior.id, fileId },
      });
      await auditar(tx, {
        usuario: u,
        action: "CREATE",
        entityName: "SanitaryLicense",
        entityId: nova.id,
        details: { operacao: "Renovação — nova versão", versaoAnterior: anterior.id, nova },
      });
      return nova;
    });
    msg = `Licença renovada: ${nova.licenseNumber} (versão ${nova.version}).`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

/** Exclui a versão mais recente; a versão anterior (se houver) volta a ser a vigente. */
export async function excluirLicenca(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const idAtual = lerId(form) ?? "";
    const l = await prisma.$transaction(async (tx) => {
      const l = await tx.sanitaryLicense.findUniqueOrThrow({ where: { id: idAtual }, include: { next: { select: { id: true } } } });
      if (l.next) throw new ErroNegocio("Só é possível excluir a versão mais recente da licença.");
      await tx.sanitaryLicense.delete({ where: { id: idAtual } });
      const { next: _n, ...snapshot } = l;
      void _n;
      await auditar(tx, { usuario: u, action: "DELETE", entityName: "SanitaryLicense", entityId: l.id, details: snapshot });
      if (l.fileId) await excluirArquivo(tx, l.fileId, u);
      if (l.previousId) {
        await tx.sanitaryLicense.update({ where: { id: l.previousId }, data: { status: "CURRENT" } });
        await auditar(tx, {
          usuario: u,
          action: "UPDATE",
          entityName: "SanitaryLicense",
          entityId: l.previousId,
          details: { operacao: "Versão restaurada após exclusão da renovação", status: { de: "RENEWED", para: "CURRENT" } },
        });
      }
      return l;
    });
    msg = `Licença ${l.licenseNumber} (versão ${l.version}) excluída.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
