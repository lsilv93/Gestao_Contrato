import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { Farol } from "@/domain/farol";

export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-t1">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-t3">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/** Card saliente (nível externo). */
export function Painel({
  titulo,
  acoes,
  children,
  className,
}: {
  titulo?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("card min-w-0 p-5 sm:p-[22px]", className)}>
      {(titulo || acoes) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-t1">{titulo}</h2>
          {acoes}
        </div>
      )}
      {children}
    </section>
  );
}

/** Painel afundado para tabelas dentro de um card. */
export function Tabela({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("poco overflow-x-auto", className)}>{children}</div>;
}

const coresIndicador = {
  acento: "text-acento",
  ok: "text-ok",
  ouro: "text-ouro",
  erro: "text-erro",
  neutro: "text-t2",
} as const;
export type CorIndicador = keyof typeof coresIndicador;

/** KPI: rótulo maiúsculo espaçado, valor mono; ícone em poço afundado. Com `href`, vira link. */
export function Indicador({
  titulo,
  valor,
  detalhe,
  icone,
  cor = "acento",
  href,
}: {
  titulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  icone?: React.ReactNode;
  cor?: CorIndicador;
  href?: string;
}) {
  const conteudo = (
    <>
      {icone && <div className={clsx("poco flex h-11 w-11 flex-none items-center justify-center !rounded-2xl", coresIndicador[cor])}>{icone}</div>}
      <div className="min-w-0">
        <p className="label !mb-1">{titulo}</p>
        <p className="num break-words text-[19px] font-semibold leading-tight text-t1">{valor}</p>
        {detalhe && <p className="mt-1 text-[11px] leading-snug text-t3">{detalhe}</p>}
      </div>
    </>
  );
  const classe = "card-sm flex min-w-0 items-start gap-4 p-5";
  return href ? (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

// ---------------- Faróis ----------------
export const estiloFarol: Record<Farol, { cor: string; fundo: string; rotulo: string; descricao: string }> = {
  VERMELHO: { cor: "text-erro", fundo: "bg-erro/10", rotulo: "Vencido", descricao: "Atrasado / vencido" },
  AMARELO: { cor: "text-ouro", fundo: "bg-ouro/10", rotulo: "Crítico", descricao: "Vence hoje ou amanhã" },
  VERDE: { cor: "text-ok", fundo: "bg-ok/10", rotulo: "Em dia", descricao: "Mais de 1 dia para vencer" },
};

export function Ponto({ farol, pulsante }: { farol: Farol; pulsante?: boolean }) {
  return (
    <span
      className={clsx("ponto", estiloFarol[farol].cor, pulsante && "ponto-pulsante")}
      style={pulsante ? { animationName: farol === "VERMELHO" ? "pulso-erro" : "pulso" } : undefined}
      aria-hidden
    />
  );
}

/** Badge do farol. Sem farol (registro resolvido) mostra o `rotuloResolvido`. */
export function FarolBadge({ farol, rotulo, rotuloResolvido = "Concluído" }: { farol: Farol | null; rotulo?: string; rotuloResolvido?: string }) {
  if (!farol) {
    return (
      <span className="pill bg-t4/10 text-t3">
        <span className="ponto" />
        {rotulo ?? rotuloResolvido}
      </span>
    );
  }
  const e = estiloFarol[farol];
  return (
    <span className={clsx("pill", e.cor, e.fundo)} title={e.descricao}>
      <span className={clsx("ponto", farol === "VERMELHO" && "ponto-pulsante")} style={farol === "VERMELHO" ? { animationName: "pulso-erro" } : undefined} />
      {rotulo ?? e.rotulo}
    </span>
  );
}

/** Contadores de farol clicáveis (navegam para a listagem filtrada). */
export function ContadoresFarol({ farois, href }: { farois: Record<Farol, number>; href: (f: Farol) => string }) {
  const icones = { VERMELHO: AlertTriangle, AMARELO: Clock3, VERDE: CheckCircle2 };
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["VERMELHO", "AMARELO", "VERDE"] as const).map((f) => {
        const Icone = icones[f];
        return (
          <Link key={f} href={href(f)} className={clsx("poco flex flex-col items-center gap-1 px-2 py-3 transition-transform hover:-translate-y-0.5", estiloFarol[f].cor)}>
            <Icone className="h-4 w-4" />
            <span className="num text-[20px] font-semibold leading-none">{farois[f]}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-t3">{estiloFarol[f].rotulo}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function LegendaFarol() {
  return (
    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-t3">
      {(["VERDE", "AMARELO", "VERMELHO"] as const).map((f) => (
        <span key={f} className="inline-flex items-center gap-1.5">
          <Ponto farol={f} /> {estiloFarol[f].rotulo}: {estiloFarol[f].descricao.toLowerCase()}
        </span>
      ))}
    </p>
  );
}

const estiloStatus: Record<string, string> = {
  // faturamento
  PENDING: "text-ouro bg-ouro/10",
  OVERDUE: "text-erro bg-erro/10",
  PAID: "text-ok bg-ok/10",
  CANCELED: "text-t4 bg-t4/10",
  // contratos / licenças
  ACTIVE: "text-ok bg-ok/10",
  CURRENT: "text-ok bg-ok/10",
  ATIVA: "text-ok bg-ok/10",
  PROXIMA: "text-ouro bg-ouro/10",
  VENCIDA: "text-erro bg-erro/10",
  RENEWED: "text-acento bg-acento/10",
  SUSPENDED: "text-ouro bg-ouro/10",
  TERMINATED: "text-t4 bg-t4/10",
  CLOSED: "text-t4 bg-t4/10",
  // tipo de contrato
  PJ: "text-acento bg-acento/10",
  SPOT: "text-ouro bg-ouro/10",
  // genéricos
  SIM: "text-ok bg-ok/10",
  NAO: "text-t4 bg-t4/10",
  ADMIN: "text-acento bg-acento/10",
  CLIENT: "text-t2 bg-t2/10",
  CREATE: "text-ok bg-ok/10",
  UPDATE: "text-ouro bg-ouro/10",
  DELETE: "text-erro bg-erro/10",
};

export function StatusBadge({ status, rotulo }: { status: string; rotulo: string }) {
  return (
    <span className={clsx("pill", estiloStatus[status] ?? "text-t2")}>
      <span className="ponto" />
      {rotulo}
    </span>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="poco px-5 py-8 text-center text-[12px] text-t3">{children}</p>;
}

export function BannerOk({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <div role="status" className="poco mb-5 flex items-center gap-2.5 px-5 py-4 text-[12px] font-medium text-acento">
      <span className="ponto" /> {mensagem}
    </div>
  );
}

/** Barra horizontal de proporção (ex.: PJ x SPOT). */
export function Barra({ partes }: { partes: { rotulo: string; valor: number; classe: string }[] }) {
  const total = partes.reduce((a, p) => a + p.valor, 0);
  return (
    <div className="poco flex h-4 overflow-hidden !rounded-full p-[3px]" role="img" aria-label={partes.map((p) => `${p.rotulo}: ${total ? Math.round((p.valor / total) * 100) : 0}%`).join(", ")}>
      {total === 0 ? (
        <div className="h-full w-full rounded-full bg-t4/15" />
      ) : (
        partes.map((p) =>
          p.valor > 0 ? <div key={p.rotulo} className={clsx("h-full rounded-full first:rounded-l-full", p.classe)} style={{ width: `${(p.valor / total) * 100}%` }} /> : null,
        )
      )}
    </div>
  );
}
