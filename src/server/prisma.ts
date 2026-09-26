import { PrismaClient } from "@prisma/client";
import { urlBanco } from "@/lib/banco.mjs";
// Com banco no build, o next.config troca o PGlite por um módulo vazio (o modo
// demonstração nunca roda nesse caso) — funções menores, inicialização mais rápida.
import { criarBancoDemo } from "./bancoDemo";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Com PostgreSQL conectado usa o banco real; sem ele, o modo demonstração. */
function criar() {
  const url = urlBanco();
  return url ? new PrismaClient({ datasourceUrl: url }) : criarBancoDemo();
}

export const prisma = globalForPrisma.prisma ?? criar();

globalForPrisma.prisma = prisma;
