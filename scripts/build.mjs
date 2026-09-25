// Build usado na Vercel: aplica as migrações, cria o admin inicial e gera o Next.js.
// Integrações como o Prisma Postgres criam apenas DATABASE_URL; nesse caso a
// conexão direta das migrações (DATABASE_URL_UNPOOLED) usa a mesma URL.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { urlBanco, urlBancoDireta } from "../src/lib/banco.mjs";

// Local: lê o .env (na Vercel as variáveis já vêm no ambiente).
if (existsSync(".env")) process.loadEnvFile(".env");

const url = urlBanco();
let comandos = ["prisma generate", "prisma migrate deploy", "prisma db seed", "next build"];
if (url) {
  // o Prisma (schema, migrações e seed) lê estes dois nomes
  process.env.DATABASE_URL = url;
  process.env.DATABASE_URL_UNPOOLED = urlBancoDireta();
  console.log("[build] Banco de dados encontrado.");
} else {
  // Sem banco: publica mesmo assim; o site mostra a tela /configurar com o passo a passo.
  const nomes = Object.keys(process.env).filter((k) => /POSTGRES|DATABASE|PRISMA|STORAGE|NEON|^PG/.test(k));
  console.warn(
    "\n[build] ATENÇÃO: nenhum banco PostgreSQL conectado — o site vai abrir a tela de configuração.\n" +
      `Variáveis relacionadas encontradas: ${nomes.length ? nomes.join(", ") : "nenhuma"}\n` +
      "Na Vercel: projeto → Storage → Create Database → Prisma Postgres (ou Neon) → Connect\n" +
      "(marque Production e Preview) e depois Deployments → ⋯ → Redeploy.\n",
  );
  comandos = ["prisma generate", "next build"];
}

for (const cmd of comandos) {
  console.log(`\n> ${cmd}`);
  execSync(`npx ${cmd}`, { stdio: "inherit", env: process.env });
}
