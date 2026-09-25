import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_AVISO, SESSION_COOKIE } from "@/lib/session";

/** Encerra a sessão (apaga o cookie) e volta ao login. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(COOKIE_AVISO);
  return res;
}
