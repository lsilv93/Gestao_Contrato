"use server";

import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { ErroNegocio } from "@/server/erros";
import { campos, cnpj, concluir, emailOpcional, lerId, obrigatorio, opcional } from "./comum";
import { tratarErro, type Estado } from "./estado";

const BASE = "/transportadoras";

const schema = z.object({
  cnpj,
  legalName: obrigatorio("a razão social"),
  tradeName: opcional(200),
  contactName: opcional(120),
  contactEmail: emailOpcional,
  contactPhone: opcional(40),
  zipCode: opcional(9),
  street: opcional(200),
  number: opcional(20),
  complement: opcional(100),
  district: opcional(100),
  city: opcional(120),
  state: opcional(2).transform((v) => (v ? v.toUpperCase() : null)),
});

export async function salvarTransportadora(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const id = lerId(form);
    const d = schema.parse(campos(form));
    const dup = await prisma.carrier.findUnique({ where: { cnpj: d.cnpj } });
    if (dup && dup.id !== id) throw new ErroNegocio(`CNPJ já cadastrado para ${dup.legalName}.`);
    const c = await prisma.$transaction(async (tx) => {
      const antes = id ? await tx.carrier.findUniqueOrThrow({ where: { id } }) : null;
      const c = id ? await tx.carrier.update({ where: { id }, data: d }) : await tx.carrier.create({ data: d });
      await auditar(tx, { usuario: u, action: id ? "UPDATE" : "CREATE", entityName: "Carrier", entityId: c.id, details: antes ? { antes, depois: c } : c });
      return c;
    });
    msg = `Transportadora ${c.legalName} ${id ? "atualizada" : "cadastrada"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

export async function alternarTransportadora(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const id = lerId(form) ?? "";
    const c = await prisma.$transaction(async (tx) => {
      const atual = await tx.carrier.findUniqueOrThrow({ where: { id } });
      const c = await tx.carrier.update({ where: { id }, data: { active: !atual.active } });
      await auditar(tx, { usuario: u, action: "UPDATE", entityName: "Carrier", entityId: id, details: { active: { de: atual.active, para: c.active } } });
      return c;
    });
    msg = `Transportadora ${c.legalName} ${c.active ? "ativada" : "inativada (os acessos dos usuários dela foram bloqueados)"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

export async function excluirTransportadora(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const u = await exigirAdmin();
    const id = lerId(form) ?? "";
    const c = await prisma.$transaction(async (tx) => {
      const c = await tx.carrier.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { users: true, contracts: true, services: true, licenses: true, manuals: true } } },
      });
      const vinculos = Object.values(c._count).reduce((a, b) => a + b, 0);
      if (vinculos > 0) throw new ErroNegocio("Esta transportadora tem usuários ou documentos vinculados. Use Inativar.");
      await tx.carrier.delete({ where: { id } });
      await auditar(tx, { usuario: u, action: "DELETE", entityName: "Carrier", entityId: id, details: c });
      return c;
    });
    msg = `Transportadora ${c.legalName} excluída.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
