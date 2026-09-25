// Assinatura/verificação do token de sessão (compatível com o Edge runtime do middleware).
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { urlBanco } from "./banco.mjs";

export const SESSION_COOKIE = "gc_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas

export type Perfil = "ADMIN" | "CLIENT";

export type SessionPayload = {
  sub: string;
  email: string;
  nome: string;
  perfil: Perfil;
  /** CNPJ vinculado (obrigatório para CLIENT). */
  cnpj: string | null;
};

let chave: Promise<Uint8Array> | null = null;

/**
 * Chave de assinatura da sessão: AUTH_SECRET, se configurado. Sem ele, deriva
 * (SHA-256) da DATABASE_URL — também secreta — para o deploy funcionar só com
 * o banco conectado. Trocar qualquer uma das duas encerra as sessões abertas.
 */
function secret(): Promise<Uint8Array> {
  if (!chave) {
    const db = urlBanco();
    const base = process.env.AUTH_SECRET || (db ? `gc-session:${db}` : "");
    if (!base) throw new Error("AUTH_SECRET/DATABASE_URL não configurados");
    chave = process.env.AUTH_SECRET
      ? Promise.resolve(new TextEncoder().encode(base))
      : crypto.subtle.digest("SHA-256", new TextEncoder().encode(base)).then((h) => new Uint8Array(h));
  }
  return chave;
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(await secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
