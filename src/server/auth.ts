import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { AcessoNegado } from "./erros";
import { clienteBloqueado } from "./pendencias";
import { SESSION_COOKIE, verifySession, type Perfil } from "@/lib/session";

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Transportadora vinculada (sempre presente para CLIENT). */
  carrier: { id: string; cnpj: string; nome: string } | null;
};

/**
 * Usuário logado, validado contra o banco a cada requisição: usuários (ou
 * transportadoras) inativados perdem o acesso imediatamente, e o CNPJ vale o
 * que está gravado — não o que veio no token.
 */
export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const sessao = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sessao) return null;
  return carregarUsuario(sessao.sub);
}

export async function carregarUsuario(id: string): Promise<UsuarioAtual | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    include: { carrier: { select: { id: true, cnpj: true, legalName: true, tradeName: true, active: true } } },
  });
  if (!u || !u.active) return null;
  if (u.role === "CLIENT" && (!u.carrier || !u.carrier.active)) return null;
  return {
    id: u.id,
    nome: u.name,
    email: u.email,
    perfil: u.role,
    carrier: u.carrier ? { id: u.carrier.id, cnpj: u.carrier.cnpj, nome: u.carrier.tradeName || u.carrier.legalName } : null,
  };
}

export async function requireUsuario(): Promise<UsuarioAtual> {
  const usuario = await getUsuarioAtual();
  // Token válido mas usuário inativado/sem vínculo: /sair apaga o cookie (evita laço login ↔ dashboard).
  if (!usuario) redirect("/sair");
  // Cliente com NF vencida há mais de 30 dias: acesso suspenso (só a tela de bloqueio)
  if (await clienteBloqueado(usuario)) redirect("/bloqueio");
  return usuario;
}

/** Páginas exclusivas da consultoria: clientes voltam ao dashboard. */
export async function requireAdmin(): Promise<UsuarioAtual> {
  const usuario = await requireUsuario();
  if (usuario.perfil !== "ADMIN") redirect("/");
  return usuario;
}

/** Para Server Actions de escrita: lança erro em vez de redirecionar. */
export async function exigirAdmin(): Promise<UsuarioAtual> {
  const usuario = await getUsuarioAtual();
  if (!usuario || usuario.perfil !== "ADMIN") throw new AcessoNegado();
  return usuario;
}

export const ehAdmin = (u: Pick<UsuarioAtual, "perfil">) => u.perfil === "ADMIN";
