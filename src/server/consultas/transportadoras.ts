import "server-only";
import { prisma } from "../prisma";

/** Opções para selects/filtros (somente ADMIN usa). */
export async function opcoesTransportadoras({ inativas = false } = {}) {
  return prisma.carrier.findMany({
    where: inativas ? {} : { active: true },
    select: { id: true, cnpj: true, legalName: true, tradeName: true, active: true },
    orderBy: { legalName: "asc" },
  });
}
export type OpcaoTransportadora = Awaited<ReturnType<typeof opcoesTransportadoras>>[number];

export async function listarTransportadoras() {
  return prisma.carrier.findMany({
    include: { _count: { select: { users: true, contracts: true, licenses: true, manuals: true, services: true } } },
    orderBy: [{ active: "desc" }, { legalName: "asc" }],
  });
}
