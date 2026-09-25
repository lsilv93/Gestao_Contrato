import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { entrar } from "@/actions/auth";
import { BotaoTema } from "@/components/BotaoTema";
import { FormAcao } from "@/components/FormAcao";
import { modoDemo } from "@/lib/modo";

export const metadata: Metadata = { title: "Entrar" };

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demo = modoDemo();
  return (
    <main className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-[14px] top-[14px]">
        <BotaoTema />
      </div>
      <div className="card entrada w-full max-w-sm p-7 sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="fill-acento mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-[20px] font-semibold text-t1">Gestão de Contratos</h1>
          <p className="secao mt-1.5">Contratos · Licenças ANVISA · Boas Práticas</p>
        </div>
        {demo && (
          <div className="poco-ouro mb-5 p-4 text-[11px] leading-relaxed text-t2">
            <p className="mb-1 font-semibold text-ouro">Modo demonstração</p>
            Administrador: <b className="text-t1">admin@consultoria.com.br</b> / <b className="text-t1">admin123</b>
            <br />
            Cliente: <b className="text-t1">cliente@translog.com.br</b> / <b className="text-t1">cliente123</b>
          </div>
        )}
        <FormAcao acao={entrar} botao="Entrar" classeBotao="btn-primary w-full" limpar={false}>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" className="input" autoComplete="current-password" required />
          </div>
        </FormAcao>
      </div>
    </main>
  );
}
