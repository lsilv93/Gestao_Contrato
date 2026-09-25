import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { popularDemo } from "../../prisma/dados-demo.mjs";

/**
 * Modo demonstração: quando nenhum PostgreSQL está conectado, o sistema roda
 * com um PostgreSQL embutido (PGlite, em memória) já com as migrações e os
 * dados de exemplo. Os dados são temporários: voltam ao estado inicial quando
 * o servidor reinicia.
 */
export function criarBancoDemo(): PrismaClient {
  const pg = new PGlite();
  // o adaptador tipa com uma versão anterior do driver-adapter-utils (compatível em execução)
  const adapter = new PrismaPGlite(pg) as unknown as ConstructorParameters<typeof PrismaClient>[0] extends infer O ? (O extends { adapter?: infer A } ? A : never) : never;
  const base = new PrismaClient({ adapter });

  const pronto = (async () => {
    await pg.waitReady;
    const dir = path.join(process.cwd(), "prisma", "migrations");
    for (const m of readdirSync(dir).filter((d) => /^\d/.test(d)).sort()) {
      await pg.exec(readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
    }
    await popularDemo(base, { criarAdmin: true });
  })();
  pronto.catch((e) => console.error("[demo] falha ao preparar o banco de demonstração", e));

  // toda consulta espera o banco embutido ficar pronto
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        await pronto;
        return query(args);
      },
    },
  }) as unknown as PrismaClient;
}
