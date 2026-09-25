import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { urlBanco } from "@/lib/banco.mjs";

/** Rotas exclusivas da consultoria (ADMIN). */
const SOMENTE_ADMIN = ["/transportadoras", "/usuarios", "/auditoria", "/api/v1/transportadoras", "/api/v1/auditoria"];

const casa = (path: string, prefixo: string) => path === prefixo || path.startsWith(`${prefixo}/`);

/**
 * 1ª barreira do RBAC:
 *  - toda rota exige sessão válida (exceto /login);
 *  - CLIENT não acessa rotas administrativas;
 *  - CLIENT só pode LER pela API (GET/HEAD).
 * A 2ª barreira (filtro por CNPJ em cada consulta e checagem de ADMIN em cada
 * Server Action) fica no servidor: src/server/escopo.ts e src/server/auth.ts.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Sem banco conectado: tudo leva à tela de configuração.
  if (!urlBanco()) {
    if (pathname === "/configurar") return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "Banco de dados não configurado" }, { status: 503 });
    return NextResponse.redirect(new URL("/configurar", req.url));
  }
  if (pathname === "/configurar") return NextResponse.redirect(new URL("/", req.url));
  const sessao = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const naLogin = pathname === "/login";
  if (pathname === "/sair") return NextResponse.next();
  const api = pathname.startsWith("/api/");

  if (!sessao) {
    if (naLogin) return NextResponse.next();
    if (api) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (naLogin) return NextResponse.redirect(new URL("/", req.url));

  if (sessao.perfil === "CLIENT") {
    const proibida = SOMENTE_ADMIN.some((p) => casa(pathname, p));
    const escrita = api && !["GET", "HEAD"].includes(req.method);
    if (proibida || escrita) {
      if (api) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
