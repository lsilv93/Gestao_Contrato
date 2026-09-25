import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, BookOpenCheck, CircleDollarSign, Clock3, FileSignature, ReceiptText, ShieldPlus } from "lucide-react";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora } from "@/components/FiltroTransportadora";
import { Barra, Cabecalho, ContadoresFarol, FarolBadge, Indicador, LegendaFarol, Painel, Vazio } from "@/components/ui";
import type { Farol } from "@/domain/farol";
import { textoPrazo } from "@/domain/farol";
import { rotuloCategoriaManual, rotuloSituacaoLicenca } from "@/domain/status";
import { diaLocal, formatarData, rotuloMes } from "@/lib/datas";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { carregarDashboard, lerFiltroDashboard, type Dashboard } from "@/server/consultas/dashboard";
import type { Params } from "@/server/consultas/filtros";
import { nomeCarrier } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const filtro = lerFiltroDashboard(sp);
  const [d, transportadoras] = await Promise.all([carregarDashboard(usuario, filtro), admin ? opcoesTransportadoras() : []]);

  // links dos faróis levam o filtro de transportadora junto
  const comTransp = (base: string, extra: Record<string, string>) => urlCom(base, filtro.carrierId ? { transportadora: filtro.carrierId } : {}, extra);
  const periodo = filtro.mes ? rotuloMes(filtro.mes) : "Visão geral";

  return (
    <>
      <Cabecalho
        titulo="Dashboard"
        descricao={admin ? "Visão consolidada de contratos, faturamento e vencimentos de todas as transportadoras." : `Situação de contratos, licenças e manuais de ${usuario.carrier?.nome}.`}
      />

      {/* período e transportadora só afetam as métricas financeiras (ADM Geral) */}
      {admin && (
      <FormFiltro className="card mb-6 grid items-end gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="filtro-mes">Mês / Ano</label>
          <input id="filtro-mes" name="mes" type="month" defaultValue={filtro.mes ?? ""} className="input" />
        </div>
        {admin && <FiltroTransportadora opcoes={transportadoras} valor={filtro.carrierId} />}
        <div className="flex gap-2">
          <Link href={urlCom("/", sp, { mes: null })} className={filtro.mes ? "btn-secondary" : "btn-primary"}>
            Visão geral
          </Link>
          <Link href={urlCom("/", sp, { mes: diaLocal().slice(0, 7) })} className="btn-secondary">
            Mês atual
          </Link>
        </div>
        <p className="text-[11px] text-t3 lg:text-right">
          Período: <span className="font-semibold text-t1">{periodo}</span>
        </p>
      </FormFiltro>
      )}

      {d.contratos && d.faturamento ? (
        <Financeiro contratos={d.contratos} faturamento={d.faturamento} filtroMes={!!filtro.mes} periodo={periodo} comTransp={comTransp} />
      ) : (
        <>
          {/* Cliente / Transportador: só a conferência de cobranças em aberto, sem valores */}
          <h2 className="secao mb-3">Cobranças em aberto</h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Indicador titulo="Em atraso" valor={formatarNumero(d.cobrancas.emAtraso)} detalhe="NFs vencidas aguardando pagamento" icone={<AlertTriangle className="h-5 w-5" />} cor="erro" href="/faturamento?status=OVERDUE" />
            <Indicador titulo="A vencer" valor={formatarNumero(d.cobrancas.aVencer)} detalhe="NFs em aberto dentro do prazo" icone={<Clock3 className="h-5 w-5" />} cor="ouro" href="/faturamento?status=PENDING" />
          </div>
        </>
      )}

      {/* ---------------- alertas de vencimento ---------------- */}
      <h2 className="secao mb-3">Alertas de vencimento — situação hoje</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <PainelAlerta
          titulo="Contratos"
          icone={<FileSignature className="h-4 w-4 text-acento" />}
          farois={d.alertas.contratos.farois}
          verTodas={comTransp("/contratos", {})}
          href={(fa) => comTransp("/contratos", { farol: fa })}
          vazio="Nenhum contrato vencido ou a vencer nos próximos 60 dias."
          itens={d.alertas.contratos.itens.map((c) => ({
            id: c.id,
            href: comTransp("/contratos", { farol: c.farol }),
            titulo: c.title,
            sub: `${nomeCarrier(c.carrier)} · ${c.contractType}`,
            data: c.expirationDate,
            farol: c.farol,
          }))}
        />
        <PainelAlerta
          titulo="Licenças Sanitárias"
          icone={<ShieldPlus className="h-4 w-4 text-acento" />}
          farois={d.alertas.licencas.farois}
          verTodas={comTransp("/licencas", {})}
          href={(fa) => comTransp("/licencas", { farol: fa })}
          vazio="Nenhuma licença vencida ou a vencer nos próximos 60 dias."
          itens={d.alertas.licencas.itens.map((l) => ({
            id: l.id,
            href: comTransp("/licencas", { farol: l.farol }),
            titulo: `Licença ${l.licenseNumber}`,
            sub: `${nomeCarrier(l.carrier)} · ${rotuloSituacaoLicenca[l.situacao]}`,
            data: l.expirationDate,
            farol: l.farol,
          }))}
        />
        <PainelAlerta
          titulo="Manuais de Boas Práticas"
          icone={<BookOpenCheck className="h-4 w-4 text-acento" />}
          farois={d.alertas.manuais.farois}
          verTodas={comTransp("/manuais", {})}
          href={(fa) => comTransp("/manuais", { farol: fa })}
          vazio="Nenhum manual com revisão vencida ou prevista para os próximos 60 dias."
          itens={d.alertas.manuais.itens.map((m) => ({
            id: m.id,
            href: comTransp("/manuais", { farol: m.farol }),
            titulo: m.title,
            sub: `${nomeCarrier(m.carrier)} · ${rotuloCategoriaManual[m.category]} ${/^v/i.test(m.version) ? m.version : `v${m.version}`}`,
            data: m.reviewDate!,
            farol: m.farol,
          }))}
        />
      </div>
      <LegendaFarol />
    </>
  );
}

function PainelAlerta({
  titulo,
  icone,
  farois,
  verTodas,
  href,
  itens,
  vazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  verTodas: string;
  farois: Record<Farol, number>;
  href: (f: Farol) => string;
  itens: { id: string; href: string; titulo: string; sub: string; data: Date; farol: Farol }[];
  vazio: string;
}) {
  return (
    <Painel
      titulo={<>{icone} {titulo}</>}
      acoes={
        <Link href={verTodas} className="btn-secondary btn-sm" aria-label={`Ver todos: ${titulo}`}>
          Ver todas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <ContadoresFarol farois={farois} href={href} />
      <div className="mt-4 space-y-2">
        {itens.length === 0 ? (
          <Vazio>{vazio}</Vazio>
        ) : (
          itens.map((i) => (
            <Link key={i.id} href={i.href} className="poco flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-acento/5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-t1">{i.titulo}</p>
                <p className="truncate text-[11px] text-t3">{i.sub}</p>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <FarolBadge farol={i.farol} />
                <span className="num text-[10px] text-t3" title={formatarData(i.data)}>
                  {textoPrazo(i.data)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Painel>
  );
}

/** Métricas financeiras: valores de contratos e faturamento consolidado (somente ADM Geral). */
function Financeiro({
  contratos,
  faturamento: f,
  filtroMes,
  periodo,
  comTransp,
}: {
  contratos: NonNullable<Dashboard["contratos"]>;
  faturamento: NonNullable<Dashboard["faturamento"]>;
  filtroMes: boolean;
  periodo: string;
  comTransp: (base: string, extra: Record<string, string>) => string;
}) {
  return (
    <>
      <h2 className="secao mb-3">Contratos {filtroMes ? `vigentes em ${periodo}` : "vigentes"}</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Valor total de contratos" valor={formatarMoeda(contratos.total)} detalhe={`${formatarNumero(contratos.quantidade)} contrato(s)`} icone={<CircleDollarSign className="h-5 w-5" />} href={comTransp("/contratos", { status: "ACTIVE" })} />
        <Indicador titulo="Contratos PJ" valor={formatarMoeda(contratos.pj.valor)} detalhe={`${formatarPercentual(contratos.pj.percentual)} do total · ${contratos.pj.quantidade} contrato(s)`} icone={<FileSignature className="h-5 w-5" />} href={comTransp("/contratos", { tipo: "PJ" })} />
        <Indicador titulo="Contratos SPOT" valor={formatarMoeda(contratos.spot.valor)} detalhe={`${formatarPercentual(contratos.spot.percentual)} do total · ${contratos.spot.quantidade} contrato(s)`} icone={<FileSignature className="h-5 w-5" />} cor="ouro" href={comTransp("/contratos", { tipo: "SPOT" })} />
        <div className="card-sm flex flex-col justify-center gap-3 p-5">
          <p className="label !mb-0">PJ x SPOT</p>
          <Barra
            partes={[
              { rotulo: "PJ", valor: contratos.pj.valor, classe: "bg-acento" },
              { rotulo: "SPOT", valor: contratos.spot.valor, classe: "bg-ouro" },
            ]}
          />
          <div className="flex justify-between text-[11px] text-t3">
            <span className="inline-flex items-center gap-1.5"><span className="ponto text-acento" /> PJ {formatarPercentual(contratos.pj.percentual)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="ponto text-ouro" /> SPOT {formatarPercentual(contratos.spot.percentual)}</span>
          </div>
        </div>
      </div>

      {/* ---------------- métricas de faturamento ---------------- */}
      <h2 className="secao mb-3">Faturamento {filtroMes ? `— NFs com vencimento em ${periodo}` : "— todas as NFs"}</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="NFs emitidas" valor={formatarNumero(f.emitidas.quantidade)} detalhe={formatarMoeda(f.emitidas.valor)} icone={<ReceiptText className="h-5 w-5" />} cor="neutro" href={comTransp("/faturamento", {})} />
        <Indicador titulo="Pagas" valor={formatarNumero(f.pagas.quantidade)} detalhe={formatarMoeda(f.pagas.valor)} icone={<BadgeCheck className="h-5 w-5" />} cor="ok" href={comTransp("/faturamento", { status: "PAID" })} />
        <Indicador titulo="Vencidas" valor={formatarNumero(f.vencidas.quantidade)} detalhe={formatarMoeda(f.vencidas.valor)} icone={<AlertTriangle className="h-5 w-5" />} cor="erro" href={comTransp("/faturamento", { status: "OVERDUE" })} />
        <Indicador titulo="Pendentes (a vencer)" valor={formatarNumero(f.pendentes.quantidade)} detalhe={formatarMoeda(f.pendentes.valor)} icone={<Clock3 className="h-5 w-5" />} cor="ouro" href={comTransp("/faturamento", { status: "PENDING" })} />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {(["PJ", "SPOT"] as const).map((t) => {
          const v = t === "PJ" ? f.pj : f.spot;
          const pct = f.emitidas.valor ? v.valor / f.emitidas.valor : 0;
          return (
            <Link key={t} href={comTransp("/faturamento", { tipo: t })} className="card-sm flex items-center justify-between gap-4 p-5">
              <div>
                <p className="label !mb-1">Faturamento {t}</p>
                <p className="num text-[18px] font-semibold text-t1">{formatarMoeda(v.valor)}</p>
              </div>
              <p className="text-right text-[11px] text-t3">
                {formatarNumero(v.quantidade)} NF(s)
                <br />
                {formatarPercentual(pct)} do faturado
              </p>
            </Link>
          );
        })}
      </div>

    </>
  );
}
