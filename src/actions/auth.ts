"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { carregarUsuario, requireUsuario } from "@/server/auth";
import { auditar } from "@/server/auditoria";
import { clienteBloqueado } from "@/server/pendencias";
import { COOKIE_AVISO, SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { falha, sucesso, tratarErro, type Estado } from "./estado";

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return falha("Informe usuário/e-mail e senha.");

  const registro = await prisma.user.findUnique({ where: { email } });
  const valido = registro && (await bcrypt.compare(senha, registro.passwordHash));
  const usuario = valido ? await carregarUsuario(registro.id) : null;
  if (!usuario) return falha("Usuário/e-mail ou senha inválidos, ou acesso inativo.");

  const token = await signSession({
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil,
    cnpj: usuario.carrier?.cnpj ?? null,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  if (usuario.perfil === "CLIENT") {
    // Inadimplência > 30 dias: vai direto para a tela de bloqueio
    if (await clienteBloqueado(usuario)) redirect("/bloqueio");
    // Pendências de até 30 dias: o aviso (pop-up) aparece uma vez por login
    (await cookies()).set(COOKIE_AVISO, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
  }
  redirect("/");
}

/** "OK / Ciente" do aviso de pendência: fecha o pop-up até o próximo login. */
export async function confirmarAviso() {
  (await cookies()).delete(COOKIE_AVISO);
  revalidatePath("/", "layout");
}

export async function sair() {
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(COOKIE_AVISO);
  redirect("/login");
}

const schemaSenha = z
  .object({
    atual: z.string().min(1, "Informe a senha atual."),
    nova: z.string().min(6, "A nova senha deve ter ao menos 6 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { message: "A confirmação não confere com a nova senha." });

export async function alterarSenha(_: Estado, form: FormData): Promise<Estado> {
  try {
    const u = await requireUsuario();
    const d = schemaSenha.parse(Object.fromEntries(form));
    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    if (!(await bcrypt.compare(d.atual, usuario.passwordHash))) return falha("Senha atual incorreta.");
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(d.nova, 10) } });
      await auditar(tx, { usuario: u, action: "UPDATE", entityName: "User", entityId: u.id, details: { alteracao: "Troca da própria senha" } });
    });
    return sucesso("Senha alterada com sucesso.");
  } catch (e) {
    return tratarErro(e);
  }
}
