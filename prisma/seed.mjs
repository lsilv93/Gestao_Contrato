// Seed idempotente: cria o administrador inicial apenas se o banco ainda não
// tiver nenhum usuário. Executado automaticamente no build da Vercel.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { urlBanco } from "../src/lib/banco.mjs";

const prisma = new PrismaClient({ datasourceUrl: urlBanco() });

async function main() {
  const total = await prisma.user.count();
  if (total > 0) {
    console.log(`[seed] ${total} usuário(s) já cadastrado(s) — nada a fazer.`);
    return;
  }
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@consultoria.com.br").toLowerCase();
  const senha = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const admin = await prisma.user.create({
    data: { name: "Administrador", email, passwordHash: await bcrypt.hash(senha, 10), role: "ADMIN" },
  });
  await prisma.auditLog.create({
    data: { action: "CREATE", entityName: "User", entityId: admin.id, details: { origem: "seed", email } },
  });
  console.log(`[seed] Administrador "${email}" criado. Altere a senha após o primeiro acesso.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
