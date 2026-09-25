import { NextResponse, type NextRequest } from "next/server";
import { gerarPendenciasEmissao } from "@/server/cicloFaturamento";

export const dynamic = "force-dynamic";

/**
 * Cron diário (vercel.json) que gera as pendências "NF pendente de emissão".
 * Com a variável CRON_SECRET configurada, a Vercel envia "Authorization: Bearer <segredo>"
 * e chamadas sem ele são recusadas. A geração é idempotente e só devolve contagens.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const r = await gerarPendenciasEmissao();
  return NextResponse.json({ ok: true, ...r, executadoEm: new Date().toISOString() });
}
