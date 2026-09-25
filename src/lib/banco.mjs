// Descobre a URL do PostgreSQL mesmo quando a integração da Vercel usa outro
// nome (ex.: POSTGRES_URL, POSTGRES_PRISMA_URL ou um prefixo como STORAGE_URL).
// Arquivo .mjs puro: usado pelo build, pelo seed, pelo Prisma e pelo middleware.

const ehPostgres = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);

function procurar(nomes, sufixos) {
  for (const n of nomes) if (ehPostgres(process.env[n])) return process.env[n];
  const chaves = Object.keys(process.env).sort();
  for (const s of sufixos) {
    const k = chaves.find((c) => c.endsWith(s) && ehPostgres(process.env[c]));
    if (k) return process.env[k];
  }
  return undefined;
}

/** URL "pooled" usada pela aplicação. */
export function urlBanco() {
  return procurar(
    ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"],
    ["_DATABASE_URL", "_POSTGRES_PRISMA_URL", "_POSTGRES_URL", "_URL"],
  );
}

/** URL direta usada pelas migrações (cai na pooled se não houver). */
export function urlBancoDireta() {
  return (
    procurar(
      ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"],
      ["_DATABASE_URL_UNPOOLED", "_URL_UNPOOLED", "_POSTGRES_URL_NON_POOLING", "_URL_NON_POOLING"],
    ) ?? urlBanco()
  );
}
