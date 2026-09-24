"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { exigirAdmin } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { ErroNegocio } from "@/server/erros";
import { normalizarCnpj } from "@/lib/formatos";
import { campos, concluir, email, lerId, obrigatorio } from "./comum";
import { tratarErro, type Estado } from "./estado";

const BASE = "/usuarios";

const schema = z
  .object({
    name: obrigatorio("o nome", 120),
    email,
    role: z.enum(["ADMIN", "CLIENT"]),
    carrierCnpj: z
      .string()
      .optional()
      .transform((v) => (v ? normalizarCnpj(v) : null)),
    senha: z.string().optional(),
  })
  .refine((d) => d.role === "ADMIN" || !!d.carrierCnpj, { message: "Usuário Cliente precisa estar vinculado ao CNPJ de uma transportadora." });

export async function salvarUsuario(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const admin = await exigirAdmin();
    const id = lerId(form);
    const { senha = "", ...d } = schema.parse(campos(form));
    if ((!id || senha) && senha.length < 6) throw new ErroNegocio("A senha deve ter ao menos 6 caracteres.");
    if (id === admin.id && d.role !== "ADMIN") throw new ErroNegocio("Você não pode remover o próprio perfil de administrador.");
    if (d.carrierCnpj && !(await prisma.carrier.findUnique({ where: { cnpj: d.carrierCnpj } }))) {
      throw new ErroNegocio("CNPJ não encontrado entre as transportadoras cadastradas.");
    }
    const dup = await prisma.user.findUnique({ where: { email: d.email } });
    if (dup && dup.id !== id) throw new ErroNegocio(`O e-mail ${d.email} já está em uso.`);

    const dados = { ...d, ...(senha ? { passwordHash: await bcrypt.hash(senha, 10) } : {}) };
    const usuario = await prisma.$transaction(async (tx) => {
      const antes = id ? await tx.user.findUniqueOrThrow({ where: { id } }) : null;
      const usuario = id
        ? await tx.user.update({ where: { id }, data: dados })
        : await tx.user.create({ data: { ...dados, passwordHash: dados.passwordHash! } });
      await auditar(tx, {
        usuario: admin,
        action: id ? "UPDATE" : "CREATE",
        entityName: "User",
        entityId: usuario.id,
        details: { antes, depois: usuario, senhaAlterada: !!senha },
      });
      return usuario;
    });
    msg = `Usuário ${usuario.email} ${id ? "atualizado" : "criado"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}

export async function alternarUsuario(_: Estado, form: FormData): Promise<Estado> {
  let msg: string;
  try {
    const admin = await exigirAdmin();
    const id = lerId(form) ?? "";
    if (id === admin.id) throw new ErroNegocio("Você não pode inativar o próprio acesso.");
    const u = await prisma.$transaction(async (tx) => {
      const atual = await tx.user.findUniqueOrThrow({ where: { id } });
      const u = await tx.user.update({ where: { id }, data: { active: !atual.active } });
      await auditar(tx, { usuario: admin, action: "UPDATE", entityName: "User", entityId: id, details: { active: { de: atual.active, para: u.active } } });
      return u;
    });
    msg = `Acesso de ${u.email} ${u.active ? "reativado" : "inativado"}.`;
  } catch (e) {
    return tratarErro(e);
  }
  concluir(form, BASE, msg);
}
