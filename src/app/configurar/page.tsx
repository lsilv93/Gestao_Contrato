import type { Metadata } from "next";
import { Database, ShieldCheck } from "lucide-react";
import { BotaoTema } from "@/components/BotaoTema";

export const metadata: Metadata = { title: "Configuração" };
export const dynamic = "force-dynamic";

const passos = [
  <>Abra o projeto <b>gestao-contrato</b> na Vercel e clique em <b>Storage</b> (Armazenar) no menu da esquerda.</>,
  <>Clique em <b>Create Database</b> (Criar banco de dados), escolha <b>Prisma Postgres</b> (ou <b>Neon</b>) e confirme com as opções padrão.</>,
  <>Na tela de conexão, deixe marcados <b>Production</b> e <b>Preview</b> e clique em <b>Connect</b>.</>,
  <>Vá em <b>Deployments</b> (Implantações), clique nos <b>⋯</b> do deploy mais recente e em <b>Redeploy</b> (Reimplantar).</>,
  <>Quando ficar <b>Ready</b>, recarregue esta página e entre com <b>admin@consultoria.com.br</b> / <b>admin123</b>.</>,
];

/** Exibida enquanto o projeto não tem um PostgreSQL conectado. */
export default function ConfigurarPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-[14px]">
      <div className="absolute right-[14px] top-[14px]">
        <BotaoTema />
      </div>
      <div className="card entrada w-full max-w-xl p-7 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="fill-acento flex h-12 w-12 flex-none items-center justify-center rounded-2xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-t1">Gestão de Contratos</h1>
            <p className="text-[12px] text-t3">O sistema foi publicado, falta só conectar o banco de dados.</p>
          </div>
        </div>
        <div className="poco-ouro mb-6 flex items-start gap-3 p-4 text-[12px] text-t2">
          <Database className="mt-0.5 h-4 w-4 flex-none text-ouro" />
          <span>Nenhum banco PostgreSQL está conectado a este projeto da Vercel. Use um banco <b>novo</b>, separado do Control Tower Pallet.</span>
        </div>
        <ol className="space-y-3">
          {passos.map((p, i) => (
            <li key={i} className="poco flex items-start gap-3 p-4 text-[12px] leading-relaxed text-t2">
              <span className="fill-acento flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
