import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, LogOut, Phone, RefreshCw } from "lucide-react";
import { BotaoTema } from "@/components/BotaoTema";
import { CaminhaoAnimado } from "@/components/CaminhaoAnimado";
import { TabelaPendencias } from "@/components/Pendencias";
import { formatarCnpj } from "@/lib/formatos";
import { getUsuarioAtual } from "@/server/auth";
import { contatoConsultoria, pendenciasCliente } from "@/server/pendencias";

export const metadata: Metadata = { title: "Acesso suspenso" };
export const dynamic = "force-dynamic";

/** Tela bloqueante: cliente com NF vencida há mais de 30 dias. */
export default async function BloqueioPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/sair");
  const p = await pendenciasCliente(usuario);
  if (!p.bloqueado) redirect("/"); // NF paga → acesso restaurado automaticamente

  return (
    <main className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-[14px] top-[14px]">
        <BotaoTema />
      </div>
      <div className="card entrada w-full max-w-3xl p-6 sm:p-8">
        <div className="poco mb-6 overflow-hidden px-6 pb-2 pt-4">
          <CaminhaoAnimado modo="parado" className="mx-auto max-w-[280px]" titulo="Caminhão parado para manutenção" />
        </div>
        <div className="mb-6 flex items-start gap-4">
          <span className="poco-erro flex h-12 w-12 flex-none items-center justify-center !rounded-2xl text-erro">
            <Lock className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-t1">Acesso temporariamente suspenso devido a pendência financeira superior a 30 dias.</h1>
            <p className="mt-1.5 text-[12px] text-t3">
              {usuario.carrier?.nome} · CNPJ {formatarCnpj(usuario.carrier?.cnpj)}
            </p>
          </div>
        </div>

        <h2 className="secao mb-3">Pendências que motivaram a suspensão</h2>
        <TabelaPendencias itens={p.bloqueantes} />

        {p.avisos.length > 0 && (
          <>
            <h2 className="secao mb-3 mt-6">Outras notas em aberto</h2>
            <TabelaPendencias itens={p.avisos} />
          </>
        )}

        <div className="poco-ouro mt-6 flex items-start gap-3 p-4 text-[12px] leading-relaxed text-t2">
          <Phone className="mt-0.5 h-4 w-4 flex-none text-ouro" />
          <div>
            <p className="font-semibold text-t1">Como regularizar</p>
            <p>
              Baixe a(s) NF(s) acima, efetue o pagamento e envie o comprovante à consultoria. Assim que o pagamento for baixado no sistema, o acesso é
              liberado automaticamente.
            </p>
            <p className="mt-1 font-semibold text-t1">{contatoConsultoria()}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" prefetch={false} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Já regularizei — verificar novamente
          </Link>
          <a href="/sair" className="btn-secondary">
            <LogOut className="h-4 w-4" /> Sair
          </a>
        </div>
      </div>
    </main>
  );
}
