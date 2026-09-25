import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { entrar } from "@/actions/auth";
import { BotaoTema } from "@/components/BotaoTema";
import { CamposLogin } from "@/components/CamposLogin";
import { FormAcao } from "@/components/FormAcao";
import { AssinaturaLK, SimboloLK } from "@/components/Logo";
import { diagnosticoBanco, modoDemo } from "@/lib/modo";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demo = modoDemo();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-[14px]">
      {/* marca-d'água: monograma L&K ao fundo */}
      <SimboloLK
        tinta="currentColor"
        className="pointer-events-none absolute -bottom-[12vh] -right-[8vw] h-[70vh] w-[70vh] text-t1 opacity-[0.045]"
      />
      <div className="absolute right-[14px] top-[14px]">
        <BotaoTema />
      </div>
      <div className="entrada relative w-full max-w-[440px]">
        <div className="card p-7 sm:p-9">
          <div className="mb-8">
            <AssinaturaLK />
          </div>

          {demo && (
            <div className="poco-ouro mb-5 p-4 text-[11px] leading-relaxed text-t2">
              <p className="mb-1 font-semibold text-ouro">Modo demonstração</p>
              Administrador: <b className="text-t1">admin@consultoria.com.br</b> / <b className="text-t1">admin123</b>
              <br />
              Cliente: <b className="text-t1">cliente@translog.com.br</b> / <b className="text-t1">cliente123</b>
              <p className="mt-2 break-words text-[10px] text-t3">Banco: {diagnosticoBanco()}</p>
            </div>
          )}

          <FormAcao
            acao={entrar}
            botao={
              <>
                Entrar <ArrowRight className="h-4 w-4" />
              </>
            }
            classeBotao="btn-primary w-full !min-h-[48px] text-[13px]"
            limpar={false}
          >
            <CamposLogin />
          </FormAcao>

          <div className="sulco my-6" />
          <p className="flex items-center justify-center gap-2 text-[11px] text-t4">
            <ShieldCheck className="h-3.5 w-3.5 text-acento" /> Acesso seguro e auditado
          </p>
        </div>
        <p className="mt-5 text-center font-marca text-[10px] uppercase tracking-[0.2em] text-t4">© {new Date().getFullYear()} L&amp;K Assessoria Farmacêutica</p>
      </div>
    </main>
  );
}
