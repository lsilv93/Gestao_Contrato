import { Menu } from "@/components/Menu";
import { requireUsuario } from "@/server/auth";
import { formatarCnpj } from "@/lib/formatos";
import { modoDemo } from "@/lib/modo";
import { cookies } from "next/headers";
import { AvisoPendencias } from "@/components/AvisoPendencias";
import { TabelaPendencias } from "@/components/Pendencias";
import { COOKIE_AVISO } from "@/lib/session";
import { pendenciasCliente } from "@/server/pendencias";

export const dynamic = "force-dynamic";

export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await requireUsuario();
  // Cliente: aviso de pendências (até 30 dias) uma vez por login
  const mostrarAviso = usuario.perfil === "CLIENT" && (await cookies()).get(COOKIE_AVISO)?.value === "1";
  const avisos = mostrarAviso ? (await pendenciasCliente(usuario)).avisos : [];
  return (
    <div className="min-h-screen">
      <Menu usuario={usuario} cnpjFormatado={usuario.carrier ? formatarCnpj(usuario.carrier.cnpj) : null} />
      <main className="lg:pl-[268px]">
        <div className="entrada mx-auto max-w-7xl px-[14px] py-6 sm:px-6 lg:px-8 lg:py-8">
          {modoDemo() && (
            <div role="note" className="poco-ouro mb-6 px-5 py-3 text-[12px] text-t2">
              <b className="text-ouro">Modo demonstração:</b> os dados são de exemplo e voltam ao estado inicial quando o servidor reinicia. Para gravar
              definitivamente, conecte um banco em Vercel → Storage → Create Database → Prisma Postgres → Connect e faça Redeploy.
            </div>
          )}
          {children}
        </div>
      </main>
      {avisos.length > 0 && (
        <AvisoPendencias>
          <TabelaPendencias itens={avisos} />
        </AvisoPendencias>
      )}
    </div>
  );
}
