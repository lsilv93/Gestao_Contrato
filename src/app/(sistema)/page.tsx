import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, FileUp, FileWarning, BookOpenCheck, Clock3, ClipboardList, FileSignature, Infinity as Indeterminado, ShieldPlus } from "lucide-react";
import { BarrasEmpilhadas, ColunasEmpilhadas, COR, Medidor, type Serie } from "@/components/graficos/Graficos";
import { rotuloCategoriaDocumento, rotuloTipoDocumento, type CategoriaDocumento } from "@/domain/tiposDocumento";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora } from "@/components/FiltroTransportadora";
import { Cabecalho, ContadoresFarol, FarolBadge, Indicador, LegendaFarol, Painel, Vazio } from "@/components/ui";
import type { Farol } from "@/domain/farol";
import { textoPrazo } from "@/domain/farol";
import { rotuloCategoriaManual, rotuloSituacaoLicenca } from "@/domain/status";
import { diaLocal, formatarData, rotuloMes } from "@/lib/datas";
import { formatarCnpj, formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { carregarDashboard, lerFiltroDashboard, type Dashboard } from "@/server/consultas/dashboard";
import { garantirPendenciasEmissao, listarPendenciasEmissao, type PendenciaEmissao } from "@/server/cicloFaturamento";
import { textoEmissao } from "@/domain/cicloFaturamento";
import type { Params } from "@/server/consultas/filtros";
import { nomeCarrier } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const filtro = lerFiltroDashboard(sp);
  const [d, transportadoras, emissoes] = await Promise.all([
    carregarDashboard(usuario, filtro),
    admin ? opcoesTransportadoras() : [],
    // ciclo mensal de NF (idempotente) antes de listar as pendências
    admin ? garantirPendenciasEmissao().then(() => listarPendenciasEmissao()) : [],
  ]);

  // links dos faróis levam o filtro de transportadora junto
  const comTransp = (base: string, extra: Record<string, string>) => urlCom(base, filtro.carrierId ? { transportadora: filtro.carrierId } : {}, extra);
  const periodo = filtro.mes ? rotuloMes(filtro.mes) : "Visão geral";

  return (
    <>
      <Cabecalho
        titulo="Dashboard"
        descricao={admin ? "Visão consolidada de contratos, faturamento e vencimentos de todas as transportadoras." : `Situação de contratos, licenças e manuais de ${usuario.carrier?.nome}.`}
      />

      {admin && <PendenciasEmissao itens={emissoes} />}

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

      {d.contratos && d.faturamento && d.graficos ? (
        <Gerencial d={d} contratos={d.contratos} faturamento={d.faturamento} graficos={d.graficos} filtroMes={filtro.mes} periodo={periodo} comTransp={comTransp} />
      ) : (
        <>
          {/* Cliente / Transportador: cobranças em aberto (sem valores) + conformidade dos documentos */}
          <h2 className="secao mb-3">Resumo — situação hoje</h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Indicador titulo="Cobranças em atraso" valor={formatarNumero(d.cobrancas.emAtraso)} detalhe="NFs vencidas aguardando pagamento" icone={<AlertTriangle className="h-5 w-5" />} cor="erro" href="/faturamento?status=OVERDUE" />
            <Indicador titulo="Cobranças a vencer" valor={formatarNumero(d.cobrancas.aVencer)} detalhe="NFs em aberto dentro do prazo" icone={<Clock3 className="h-5 w-5" />} cor="ouro" href="/faturamento?status=PENDING" />
            <TileConformidade d={d} />
          </div>
          <Painel titulo={<><ShieldPlus className="h-4 w-4 text-acento" /> Conformidade dos seus documentos</>} className="mb-8">
            <GraficoConformidade d={d} comTransp={comTransp} />
          </Painel>
        </>
      )}

      {/* ---------------- licenças x documentos: contadores segregados ---------------- */}
      <h2 className="secao mb-3">Licenças e Documentos — situação hoje</h2>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ResumoCategoria categoria="LICENCA" dados={d.alertas.licencas} icone={<ShieldPlus className="h-5 w-5" />} comTransp={comTransp} />
        <ResumoCategoria categoria="DOCUMENTO" dados={d.alertas.documentos} icone={<ClipboardList className="h-5 w-5" />} comTransp={comTransp} />
      </div>

      {/* ---------------- alertas de vencimento ---------------- */}
      <h2 className="secao mb-3">Alertas de vencimento — situação hoje</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            ["LICENCA", d.alertas.licencas, <ShieldPlus key="l" className="h-4 w-4 text-acento" />, "Nenhuma licença sanitária ou regulatória vencida ou a vencer nos próximos 60 dias."],
            ["DOCUMENTO", d.alertas.documentos, <ClipboardList key="d" className="h-4 w-4 text-acento" />, "Nenhum documento operacional ou técnico vencido ou a vencer nos próximos 60 dias."],
          ] as const
        ).map(([categoria, dados, icone, vazio]) => (
          <PainelAlerta
            key={categoria}
            titulo={rotuloCategoriaDocumento[categoria]}
            icone={icone}
            farois={dados.farois}
            verTodas={comTransp("/licencas", { categoria })}
            href={(fa) => comTransp("/licencas", { categoria, farol: fa })}
            vazio={vazio}
            itens={dados.itens.map((l) => ({
              id: l.id,
              href: comTransp("/licencas", { categoria, farol: l.farol }),
              titulo: `${rotuloTipoDocumento(l.documentType)} · ${l.licenseNumber}`,
              sub: `${nomeCarrier(l.carrier)} · ${rotuloSituacaoLicenca[l.situacao]}`,
              data: l.expirationDate,
              farol: l.farol,
            }))}
          />
        ))}
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
          titulo="Manuais & POPs"
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

/** Card de contadores de uma categoria (Licenças Sanitárias x Documentos Operacionais). */
function ResumoCategoria({
  categoria,
  dados,
  icone,
  comTransp,
}: {
  categoria: CategoriaDocumento;
  dados: Dashboard["alertas"]["licencas"];
  icone: React.ReactNode;
  comTransp: (base: string, extra: Record<string, string>) => string;
}) {
  const itens: { rotulo: string; valor: number; cor: string; extra: Record<string, string> }[] = [
    { rotulo: "Vencidos", valor: dados.farois.VERMELHO, cor: "text-erro", extra: { farol: "VERMELHO" } },
    { rotulo: "Próximos de vencer", valor: dados.farois.AMARELO, cor: "text-ouro", extra: { farol: "AMARELO" } },
    { rotulo: "Ativos", valor: dados.farois.VERDE, cor: "text-ok", extra: { farol: "VERDE" } },
    ...(categoria === "LICENCA" ? [{ rotulo: "Sem validade", valor: dados.semValidade, cor: "text-acento", extra: { validade: "INDETERMINADA" } }] : []),
  ];
  return (
    <section className="card p-5" aria-label={rotuloCategoriaDocumento[categoria]}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="poco flex h-10 w-10 flex-none items-center justify-center !rounded-2xl text-acento">{icone}</span>
          <div>
            <p className="text-[13px] font-semibold text-t1">{rotuloCategoriaDocumento[categoria]}</p>
            <p className="text-[11px] text-t3">{formatarNumero(dados.total)} vigente(s)</p>
          </div>
        </div>
        <Link href={comTransp("/licencas", { categoria })} className="btn-secondary btn-sm" aria-label={`Ver todos: ${rotuloCategoriaDocumento[categoria]}`}>
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className={`grid gap-2 ${itens.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {itens.map((i) => (
          <Link key={i.rotulo} href={comTransp("/licencas", { categoria, ...i.extra })} className="poco px-3 py-3 transition-colors hover:bg-acento/5">
            <p className={`num text-[20px] font-semibold ${i.cor}`}>{formatarNumero(i.valor)}</p>
            <p className="flex items-center gap-1 text-[10px] text-t3">
              {i.rotulo === "Sem validade" && <Indeterminado className="h-3 w-3" />}
              {i.rotulo}
            </p>
          </Link>
        ))}
      </div>
    </section>
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

// ---------------- painel gerencial ----------------
const SERIES_FATURAMENTO: Serie[] = [
  { chave: "pago", rotulo: "Recebido", cor: COR.ok },
  { chave: "aVencer", rotulo: "A vencer", cor: COR.alerta },
  { chave: "vencido", rotulo: "Vencido", cor: COR.critico },
];
const SERIES_CONFORMIDADE: Serie[] = [
  { chave: "vencido", rotulo: "Vencido", cor: COR.critico },
  { chave: "critico", rotulo: "Vence hoje/amanhã", cor: COR.alerta },
  { chave: "emDia", rotulo: "Em dia", cor: COR.ok },
];
const SERIES_ABERTO: Serie[] = [
  { chave: "vencido", rotulo: "Vencido", cor: COR.critico },
  { chave: "aVencer", rotulo: "A vencer", cor: COR.alerta },
];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const moedaCurta = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const eixoMoeda = (n: number) => (n ? moedaCurta.format(n) : "R$ 0");

/** Linhas do gráfico de conformidade (contagens de itens vigentes por farol). */
function linhasConformidade(d: Dashboard, comTransp: (base: string, extra: Record<string, string>) => string) {
  const linha = (chave: string, rotulo: string, f: Record<Farol, number>, href: string, semValidade = 0) => ({
    chave,
    rotulo,
    sub: semValidade ? `+${semValidade} sem validade (em dia)` : undefined,
    valores: [f.VERMELHO, f.AMARELO, f.VERDE + semValidade],
    href,
  });
  return [
    linha("contratos", "Contratos", d.alertas.contratos.farois, comTransp("/contratos", { status: "ACTIVE" })),
    linha("regulatorios", rotuloCategoriaDocumento.LICENCA, d.alertas.licencas.farois, comTransp("/licencas", { categoria: "LICENCA" }), d.alertas.licencas.semValidade),
    linha("operacionais", rotuloCategoriaDocumento.DOCUMENTO, d.alertas.documentos.farois, comTransp("/licencas", { categoria: "DOCUMENTO" })),
    linha("manuais", "Manuais & POPs", d.alertas.manuais.farois, comTransp("/manuais", {})),
  ];
}

function indiceConformidade(d: Dashboard) {
  const linhas = linhasConformidade(d, (b) => b);
  const total = linhas.reduce((a, l) => a + l.valores.reduce((x, y) => x + y, 0), 0);
  const emDia = linhas.reduce((a, l) => a + l.valores[2], 0);
  const vencidos = linhas.reduce((a, l) => a + l.valores[0], 0);
  return { total, emDia, vencidos, pct: total ? emDia / total : 1 };
}

function GraficoConformidade({ d, comTransp }: { d: Dashboard; comTransp: (base: string, extra: Record<string, string>) => string }) {
  return (
    <BarrasEmpilhadas
      linhas={linhasConformidade(d, comTransp)}
      series={SERIES_CONFORMIDADE}
      formatar={formatarNumero}
      resumo={(v, total) => `${total} · ${Math.round((v[2] / total) * 100)}% em dia`}
      vazio="Nenhum item com validade"
    />
  );
}

/** Tile de KPI do resumo gerencial: valor em fonte proporcional (não quebra), medidor opcional. */
function Kpi({ titulo, valor, detalhe, href, medidor }: { titulo: string; valor: string; detalhe: string; href: string; medidor?: { valor: number; cor?: string; rotulo: string } }) {
  return (
    <Link href={href} className="card-sm block min-w-0 p-5">
      <p className="label !mb-1">{titulo}</p>
      <p className="whitespace-nowrap text-[clamp(17px,1.5vw,21px)] font-semibold leading-tight text-t1">{valor}</p>
      {medidor && <Medidor {...medidor} />}
      <p className="mt-2 text-[11px] leading-snug text-t3">{detalhe}</p>
    </Link>
  );
}

function TileConformidade({ d }: { d: Dashboard }) {
  const c = indiceConformidade(d);
  return (
    <div className="card-sm min-w-0 p-5">
      <p className="label !mb-1">Conformidade documental</p>
      <p className="whitespace-nowrap text-[clamp(17px,1.5vw,21px)] font-semibold leading-tight text-t1">{formatarPercentual(c.pct)}</p>
      <Medidor valor={c.pct} cor={c.pct >= 0.9 ? COR.ok : c.pct >= 0.7 ? COR.alerta : COR.critico} rotulo="Itens em dia" />
      <p className="mt-2 text-[11px] text-t3">
        {formatarNumero(c.emDia)} de {formatarNumero(c.total)} itens em dia{c.vencidos ? ` · ${c.vencidos} vencido(s)` : ""}
      </p>
    </div>
  );
}

/** Visão gerencial do ADM Geral: KPIs, gráficos de faturamento, conformidade e carteira em aberto. */
function Gerencial({
  d,
  contratos,
  faturamento: f,
  graficos: g,
  filtroMes,
  periodo,
  comTransp,
}: {
  d: Dashboard;
  contratos: NonNullable<Dashboard["contratos"]>;
  faturamento: NonNullable<Dashboard["faturamento"]>;
  graficos: NonNullable<Dashboard["graficos"]>;
  filtroMes?: string;
  periodo: string;
  comTransp: (base: string, extra: Record<string, string>) => string;
}) {
  const aberto = f.pendentes.valor + f.vencidas.valor;
  const recebidoPct = f.emitidas.valor ? f.pagas.valor / f.emitidas.valor : 0;
  const inadimplencia = aberto ? f.vencidas.valor / aberto : 0;
  const categorias = g.mensal.map((m, i) => {
    const [a, mm] = m.mes.split("-").map(Number);
    return { chave: m.mes, rotulo: MESES[mm - 1], ano: i === 0 || mm === 1 ? String(a) : undefined, detalhe: rotuloMes(m.mes) };
  });
  return (
    <>
      {/* ---------------- KPIs ---------------- */}
      <h2 className="secao mb-3">Resumo gerencial {filtroMes ? `— NFs com vencimento em ${periodo}` : "— todas as NFs"}</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi titulo="Faturado" valor={formatarMoeda(f.emitidas.valor)} detalhe={`${formatarNumero(f.emitidas.quantidade)} NF(s) emitida(s)`} href={comTransp("/faturamento", {})} />
        <Kpi
          titulo="Recebido"
          valor={formatarMoeda(f.pagas.valor)}
          medidor={{ valor: recebidoPct, rotulo: "Recebido sobre o faturado" }}
          detalhe={`${formatarPercentual(recebidoPct)} do faturado · ${formatarNumero(f.pagas.quantidade)} NF(s)`}
          href={comTransp("/faturamento", { status: "PAID" })}
        />
        <Kpi titulo="A receber" valor={formatarMoeda(f.pendentes.valor)} detalhe={`${formatarNumero(f.pendentes.quantidade)} NF(s) dentro do prazo`} href={comTransp("/faturamento", { status: "PENDING" })} />
        <Kpi
          titulo="Inadimplência"
          valor={formatarMoeda(f.vencidas.valor)}
          medidor={{ valor: inadimplencia, cor: COR.critico, rotulo: "Vencido sobre o total em aberto" }}
          detalhe={`${formatarPercentual(inadimplencia)} do que está em aberto · ${formatarNumero(f.vencidas.quantidade)} NF(s)`}
          href={comTransp("/faturamento", { status: "OVERDUE" })}
        />
        <TileConformidade d={d} />
      </div>

      {/* ---------------- gráficos ---------------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <Painel titulo={<><BarChart3 className="h-4 w-4 text-acento" /> Faturamento mensal — últimos 12 meses</>} className="lg:col-span-3">
          <p className="-mt-2 mb-3 text-[11px] text-t3">Valor das NFs por mês de vencimento e situação do pagamento.</p>
          <ColunasEmpilhadas
            categorias={categorias}
            series={SERIES_FATURAMENTO}
            valores={g.mensal.map((m) => [m.pago, m.aVencer, m.vencido])}
            formatar={formatarMoeda}
            formatarEixo={eixoMoeda}
            destaque={g.mensal.length - 1}
          />
        </Painel>
        <Painel titulo={<><ShieldPlus className="h-4 w-4 text-acento" /> Conformidade por área</>} className="lg:col-span-2">
          <p className="-mt-2 mb-3 text-[11px] text-t3">Itens vigentes por situação de validade. Clique numa área para ver a lista.</p>
          <GraficoConformidade d={d} comTransp={comTransp} />
        </Painel>
        <Painel titulo={<><AlertTriangle className="h-4 w-4 text-acento" /> Maiores valores em aberto por transportadora</>} className="lg:col-span-3">
          {g.devedores.length === 0 ? (
            <Vazio>Nenhuma NF em aberto.</Vazio>
          ) : (
            <BarrasEmpilhadas
              modo="valor"
              linhas={g.devedores.map((x) => ({ chave: x.id, rotulo: x.nome, valores: [x.vencido, x.aVencer], href: urlCom("/faturamento", { transportadora: x.id }) }))}
              series={SERIES_ABERTO}
              formatar={formatarMoeda}
            />
          )}
        </Painel>
        <Painel titulo={<><FileSignature className="h-4 w-4 text-acento" /> Contratos {filtroMes ? `vigentes em ${periodo}` : "vigentes"}</>} className="lg:col-span-2">
          <Link href={comTransp("/contratos", { status: "ACTIVE" })} className="block">
            <p className="label !mb-1">Valor total</p>
            <p className="text-[24px] font-semibold leading-tight text-t1">{formatarMoeda(contratos.total)}</p>
            <p className="mt-1 text-[11px] text-t3">{formatarNumero(contratos.quantidade)} contrato(s)</p>
          </Link>
          <div className="mt-5">
            <BarrasEmpilhadas
              modo="valor"
              linhas={[
                { chave: "PJ", rotulo: "PJ", sub: `${contratos.pj.quantidade} contrato(s)`, valores: [contratos.pj.valor], href: comTransp("/contratos", { tipo: "PJ" }) },
                { chave: "SPOT", rotulo: "SPOT", sub: `${contratos.spot.quantidade} contrato(s)`, valores: [contratos.spot.valor], href: comTransp("/contratos", { tipo: "SPOT" }) },
              ]}
              series={[{ chave: "valor", rotulo: "Valor dos contratos", cor: COR.serie }]}
              formatar={formatarMoeda}
              resumo={(_, total) => `${formatarMoeda(total)} · ${formatarPercentual(contratos.total ? total / contratos.total : 0)}`}
            />
          </div>
        </Painel>
      </div>
    </>
  );
}

const rotuloEmissao = { VERDE: "A emitir", AMARELO: "Emitir hoje", VERMELHO: "Atrasada" } as const;

/** Card de destaque do ADM: NFs pendentes de emissão do ciclo mensal dos contratos. */
function PendenciasEmissao({ itens }: { itens: PendenciaEmissao[] }) {
  const atrasadas = itens.filter((i) => i.farol === "VERMELHO").length;
  const hoje = diaLocal();
  return (
    <Painel
      className={itens.length ? "mb-6" : "mb-6 !py-4"}
      titulo={
        <>
          <FileWarning className={itens.length ? (atrasadas ? "h-4 w-4 text-erro" : "h-4 w-4 text-ouro") : "h-4 w-4 text-acento"} />
          Notas Fiscais Pendentes de Emissão
          {itens.length > 0 && (
            <span className={`pill ${atrasadas ? "bg-erro/10 text-erro" : "bg-ouro/10 text-ouro"}`}>
              {itens.length}
              {atrasadas ? ` · ${atrasadas} atrasada(s)` : ""}
            </span>
          )}
        </>
      }
      acoes={
        itens.length > 0 && (
          <Link href="/faturamento?status=PENDING_EMISSION" className="btn-secondary btn-sm">
            Ver no faturamento <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )
      }
    >
      {itens.length === 0 ? (
        <p className="text-[12px] text-t3">Nenhuma NF pendente de emissão. Os alertas aparecem aqui automaticamente no dia de emissão de cada contrato.</p>
      ) : (
        <div className="space-y-2">
          {itens.map((i) => (
            <div key={i.id} className="poco grid items-center gap-3 px-4 py-3 sm:grid-cols-[130px_minmax(0,1.4fr)_minmax(0,1fr)_120px_auto]">
              <FarolBadge farol={i.farol} rotulo={rotuloEmissao[i.farol]} pulsar />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-t1">{i.transportadora}</p>
                <p className="num truncate text-[10px] text-t4">{formatarCnpj(i.cnpj)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-t3">Data limite para emissão</p>
                <p className="num text-[12px] text-t1">
                  {formatarData(i.emissao)} <span className="text-[10px] text-t4">· {textoEmissao(i.emissao, hoje)}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-t3">Valor previsto</p>
                <p className="num text-[12px] font-semibold text-t1">{formatarMoeda(i.valor)}</p>
              </div>
              <Link href={`/faturamento?emitir=${i.id}`} className="btn-primary btn-sm justify-self-start sm:justify-self-end">
                <FileUp className="h-3.5 w-3.5" /> Emitir NF
              </Link>
            </div>
          ))}
        </div>
      )}
    </Painel>
  );
}
