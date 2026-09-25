import type { Metadata } from "next";
import { entrar } from "@/actions/auth";
import { BotaoTema } from "@/components/BotaoTema";
import { CaminhaoAnimado } from "@/components/CaminhaoAnimado";
import { MarcaLK } from "@/components/Logo";
import { FormAcao } from "@/components/FormAcao";
import { diagnosticoBanco, modoDemo } from "@/lib/modo";

export const metadata: Metadata = { title: "Entrar" };

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demo = modoDemo();
  return (
    <main className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-[14px] top-[14px] z-10">
        <BotaoTema />
      </div>
      <div className="entrada grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        {/* banner: marca + caminhão em rota */}
        <section className="card flex flex-col justify-between gap-6 p-6 sm:p-8" aria-label="L&K Assessoria Farmacêutica">
          <MarcaLK tamanho="lg" complemento={<span className="text-t3">Assessoria Farmacêutica</span>} />
          <div className="poco overflow-hidden px-4 pb-2 pt-4 sm:px-6">
            <CaminhaoAnimado className="mx-auto max-w-[340px]" titulo="Caminhão farmacêutico L&K em rota" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-semibold leading-snug text-t1">Compliance regulatório para o transporte de medicamentos e produtos para a saúde.</p>
            <p className="mt-2 text-[12px] leading-relaxed text-t3">Contratos, licenças sanitárias ANVISA, manuais de boas práticas e POPs da sua transportadora em um só lugar.</p>
          </div>
        </section>

        <div className="card p-7 sm:p-8">
          <div className="mb-7 flex flex-col items-center pt-2 text-center">
            <h1 className="text-[20px] font-semibold text-t1">L&amp;K Assessoria Farmacêutica</h1>
            <p className="secao mt-1.5">Gestão de Contratos · Compliance</p>
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
          <FormAcao acao={entrar} botao="Entrar" classeBotao="btn-primary w-full" limpar={false}>
            <div>
              <label className="label" htmlFor="email">Usuário ou e-mail</label>
              <input id="email" name="email" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="senha">Senha</label>
              <input id="senha" name="senha" type="password" className="input" autoComplete="current-password" required />
            </div>
          </FormAcao>
        </div>
      </div>
    </main>
  );
}
