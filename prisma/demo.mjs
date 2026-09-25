// Popula um banco PostgreSQL com dados de demonstração (só se ainda não houver transportadoras).
// Acesso Cliente criado: cliente@translog.com.br / cliente123 (vinculado à TransLog).
import { PrismaClient } from "@prisma/client";
import { popularDemo } from "./dados-demo.mjs";

const prisma = new PrismaClient();

popularDemo(prisma)
  .then((criou) =>
    console.log(criou ? "[demo] Dados criados. Acesso Cliente: cliente@translog.com.br / cliente123" : "[demo] Já existem transportadoras — nada a fazer."),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
