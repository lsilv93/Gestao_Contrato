type Params = Record<string, string | string[] | undefined>;

/** Parâmetros que abrem modais ou mensagens: nunca são herdados por links nem pelo "voltar" após salvar. */
export const PARAMS_MODAIS = ["ok", "novo", "editar", "pagar", "emitir", "renovar", "alterar", "excluir", "versoes"];

/** Monta "base?a=1&b=2" a partir dos parâmetros atuais, aplicando alterações (null remove). */
export function urlCom(base: string, atuais: Params, mudancas: Record<string, string | null | undefined> = {}): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(atuais)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s && !PARAMS_MODAIS.includes(k)) u.set(k, s);
  }
  for (const [k, v] of Object.entries(mudancas)) {
    if (v === null || v === undefined || v === "") u.delete(k);
    else u.set(k, v);
  }
  const q = u.toString();
  return q ? `${base}?${q}` : base;
}
