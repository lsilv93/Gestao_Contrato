import type { PrismaClient } from "@prisma/client";
export function popularDemo(prisma: PrismaClient, opcoes?: { criarAdmin?: boolean }): Promise<boolean>;
