import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { diaValido, paraData } from "@/lib/datas";
import { cnpjValido, lerValor, normalizarCnpj } from "@/lib/formatos";

// ---------------- validações reutilizáveis (Zod) ----------------
/** Texto opcional: string vazia vira null. */
export const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const obrigatorio = (rotulo: string, max = 200) => z.string().trim().min(1, `Informe ${rotulo}.`).max(max);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "E-mail inválido.");

export const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .optional()
  .transform((v) => v || null)
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "E-mail inválido.");

export const cnpj = z
  .string()
  .refine(cnpjValido, "CNPJ inválido.")
  .transform((v) => normalizarCnpj(v));

export const data = (rotulo: string) =>
  z
    .string({ error: `Informe ${rotulo}.` })
    .refine(diaValido, `Informe ${rotulo}.`)
    .transform(paraData);

export const dataOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => !v || diaValido(v), "Data inválida.")
  .transform((v) => (v ? paraData(v) : null));

export const valor = (rotulo: string) =>
  z
    .string()
    .transform((v, ctx) => {
      const n = lerValor(v);
      if (n === null || n < 0) {
        ctx.addIssue({ code: "custom", message: `Informe ${rotulo} válido (ex.: 1.500,00).` });
        return z.NEVER;
      }
      return n;
    });

export const id = z.string().min(1, "Registro não informado.");

export function lerId(form: FormData): string | null {
  const v = String(form.get("id") ?? "");
  return v || null;
}

/** Campos do formulário como objeto (ignora arquivos). */
export function campos(form: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") obj[k] = v;
  });
  return obj;
}

/**
 * Após salvar: volta para a listagem (mantendo os filtros de `voltar`, se forem
 * do mesmo módulo) com a mensagem de confirmação no topo.
 */
export function concluir(form: FormData, base: string, mensagem: string, extra?: Record<string, string>): never {
  revalidatePath("/", "layout");
  const voltar = String(form.get("voltar") ?? "");
  const url = new URL(voltar.startsWith(base) ? voltar : base, "http://x");
  for (const p of ["novo", "editar", "pagar", "renovar", "alterar", "ok"]) url.searchParams.delete(p);
  url.searchParams.set("ok", mensagem);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}
