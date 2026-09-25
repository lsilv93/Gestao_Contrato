import { NextResponse, type NextRequest } from "next/server";
import { descreverFiltros } from "@/lib/filtroRelatorio";
import { diaLocal } from "@/lib/datas";
import { getUsuarioAtual } from "@/server/auth";
import { gerarExcel } from "@/server/excel";
import { clienteBloqueado } from "@/server/pendencias";
import { prisma } from "@/server/prisma";
import { gerarRelatorio, lerFiltroRelatorio, STATUS } from "@/server/relatorios";

/**
 * Exporta para Excel (.xlsx) o relatório com os MESMOS filtros da tela
 * (?tipo= &de= &ate= &transportadora= (repetível) &status=). Cliente: só o próprio CNPJ.
 */
export async function GET(req: NextRequest) {
  const u = await getUsuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  if (await clienteBloqueado(u)) return NextResponse.json({ erro: "Acesso suspenso", bloqueado: true }, { status: 403 });

  const sp: Record<string, string | string[]> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    const atual = sp[k];
    sp[k] = atual === undefined ? v : ([] as string[]).concat(atual, v);
  });
  const f = lerFiltroRelatorio(sp, u);
  const r = await gerarRelatorio(u, f);
  const nomes = f.transportadoras.length
    ? (await prisma.carrier.findMany({ where: { id: { in: f.transportadoras } }, select: { legalName: true, tradeName: true } }))
        .map((c) => c.tradeName || c.legalName)
        .join(", ")
    : u.perfil === "CLIENT"
      ? u.carrier?.nome
      : undefined;
  const buffer = await gerarExcel(r, {
    usuario: u.nome,
    filtros: descreverFiltros(f, { transportadoras: nomes, status: STATUS.find((s) => s.valor === f.status)?.rotulo }),
  });
  const nome = `relatorio-${f.tipo.toLowerCase()}-${diaLocal()}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
