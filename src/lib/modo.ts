import { urlBanco } from "./banco.mjs";

/** Sem PostgreSQL conectado o sistema roda em modo demonstração. */
export const modoDemo = () => !urlBanco();

/**
 * Diagnóstico para o modo demonstração: NOMES (nunca valores) das variáveis de
 * ambiente que parecem de banco de dados, com o tipo de URL de cada uma.
 */
export function diagnosticoBanco(): string {
  const nomes = Object.keys(process.env)
    .filter((k) => /POSTGRES|DATABASE|PRISMA|STORAGE|NEON|^PG/.test(k))
    .sort();
  if (!nomes.length) return "nenhuma variável de banco encontrada neste deploy";
  return nomes
    .map((k) => {
      const v = process.env[k] ?? "";
      const tipo = /^postgres(ql)?:\/\//.test(v) ? "postgres" : /^prisma\+postgres:\/\//.test(v) ? "prisma+postgres" : v ? "outro formato" : "vazia";
      return `${k} (${tipo})`;
    })
    .join(", ");
}
