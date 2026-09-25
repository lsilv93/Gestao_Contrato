// Build usado na Vercel: aplica as migrações, cria o admin inicial e gera o Next.js.
// Integrações como o Prisma Postgres criam apenas DATABASE_URL; nesse caso a
// conexão direta das migrações (DATABASE_URL_UNPOOLED) usa a mesma URL.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { urlBanco, urlBancoDireta } from "../src/lib/banco.mjs";

// Local: lê o .env (na Vercel as variáveis já vêm no ambiente).
if (existsSync(".env")) process.loadEnvFile(".env");

const url = urlBanco();
if (!url) {
  const nomes = Object.keys(process.env).filter((k) => /POSTGRES|DATABASE|PRISMA|STORAGE|NEON|^PG/.test(k));
  console.error(
    "\n[build] Nenhuma URL de PostgreSQL encontrada nas variáveis de ambiente.\n" +
      `Variáveis relacionadas encontradas: ${nomes.length ? nomes.join(", ") : "nenhuma"}\n` +
      "Na Vercel: abra o projeto → Storage → Create Database → Prisma Postgres (ou Neon) → Connect,\n" +
      "marcando Production e Preview. Depois clique em Redeploy.\n",
  );
  process.exit(1);
}
// o Prisma (schema, migrações e seed) lê estes dois nomes
process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = urlBancoDireta();
console.log("[build] Banco de dados encontrado.");

for (const cmd of ["prisma generate", "prisma migrate deploy", "prisma db seed", "next build"]) {
  console.log(`\n> ${cmd}`);
  execSync(`npx ${cmd}`, { stdio: "inherit", env: process.env });
}
