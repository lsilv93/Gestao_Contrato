import { NextResponse, type NextRequest } from "next/server";
import { getUsuarioAtual } from "@/server/auth";
import { podeVer } from "@/server/escopo";
import { prisma } from "@/server/prisma";

/**
 * Download de PDF/Word. O cliente só baixa arquivos de documentos do próprio
 * CNPJ; arquivos órfãos (sem documento vinculado) são exclusivos do ADMIN.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUsuarioAtual();
  if (!u) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const f = await prisma.storedFile.findUnique({
    where: { id },
    include: {
      contract: { select: { carrierId: true } },
      license: { select: { carrierId: true } },
      manual: { select: { carrierId: true } },
    },
  });
  const carrierId = f?.contract?.carrierId ?? f?.license?.carrierId ?? f?.manual?.carrierId;
  const permitido = f && (u.perfil === "ADMIN" || (carrierId && podeVer(u, carrierId)));
  // 404 também quando não é permitido: não revela a existência do arquivo
  if (!f || !permitido) return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });

  const nome = encodeURIComponent(f.fileName);
  return new NextResponse(Buffer.from(f.data), {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Length": String(f.size),
      // PDF abre no navegador; Word baixa
      "Content-Disposition": `${f.mimeType === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${nome}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
