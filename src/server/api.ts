import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getUsuarioAtual, type UsuarioAtual } from "./auth";
import type { Params } from "./consultas/filtros";

/**
 * Envolve um handler GET da API: exige usuário ativo (validado no banco),
 * opcionalmente ADMIN, e converte a query string em Params.
 */
export function rotaApi(handler: (u: UsuarioAtual, sp: Params, req: NextRequest) => Promise<unknown>, { somenteAdmin = false } = {}) {
  return async (req: NextRequest) => {
    const u = await getUsuarioAtual();
    if (!u) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    if (somenteAdmin && u.perfil !== "ADMIN") return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    try {
      const dados = await handler(u, Object.fromEntries(req.nextUrl.searchParams), req);
      return NextResponse.json({ dados });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
    }
  };
}
