import Link from "next/link";
import { CheckCircle2, FileUp, History, Plus } from "lucide-react";
import { confirmarEmissao, excluirServico, marcarPago, salvarServico } from "@/actions/faturamento";
import { textoEmissao } from "@/domain/cicloFaturamento";
import { garantirPendenciasEmissao } from "@/server/cicloFaturamento";
import { BotaoEditar, BotaoExcluir } from "@/components/Acoes";
import { Campo, CampoArquivo, LinkArquivo, Selecao, Voltar } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora, opcoesSelect } from "@/components/FiltroTransportadora";
import { FormAcao } from "@/components/FormAcao";
import { LinhaClicavel } from "@/components/LinhaClicavel";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, FarolBadge, LegendaFarol, Painel, StatusBadge, Tabela, Vazio } from "@/components/ui";
import { textoPrazo } from "@/domain/farol";
import { rotuloStatusFaturamento, statusFaturamento, type StatusFaturamento } from "@/domain/status";
import { diaDe, diaLocal, formatarData } from "@/lib/datas";
import { formatarCnpj, formatarMoeda } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { listarContratos } from "@/server/consultas/contratos";
import {
  buscarServico,
  lerFiltroCobrancas,
  lerFiltroFaturamento,
  listarCobrancasCliente,
  listarServicos,
  rotuloCobranca,
  type SituacaoCobranca,
} from "@/server/consultas/faturamento";
import type { UsuarioAtual } from "@/server/auth";
import { nomeCarrier, param, type Params } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Faturamento" };
const BASE = "/faturamento";

export default async function FaturamentoPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  // Cliente / Transportador: visão restrita de cobranças em aberto (sem valores nem histórico pago)
  if (!admin) return <CobrancasCliente usuario={usuario} sp={sp} />;
  const filtro = lerFiltroFaturamento(sp);
  const editarId = admin ? param(sp, "editar") : undefined;
  const pagarId = admin ? param(sp, "pagar") : undefined;
  const emitirId = admin ? param(sp, "emitir") : undefined;
  await garantirPendenciasEmissao(); // ciclo mensal: gera as pendências de emissão do dia
  const novo = admin && param(sp, "novo") === "1";
  const [lista, transportadoras, editando, pagando, contratos, emitindo] = await Promise.all([
    listarServicos(usuario, filtro),
    admin ? opcoesTransportadoras() : [],
    editarId ? buscarServico(usuario, editarId) : null,
    pagarId ? buscarServico(usuario, pagarId) : null,
    admin && (novo || editarId) ? listarContratos(usuario, { status: "ACTIVE" }) : [],
    emitirId ? buscarServico(usuario, emitirId) : null,
  ]);
  const aqui = urlCom(BASE, sp);

  const somar = (s: StatusFaturamento) => lista.filter((x) => x.situacao === s).reduce((a, x) => a + x.amount, 0);
  const statusOpcoes = (Object.keys(rotuloStatusFaturamento) as StatusFaturamento[]).map((valor) => ({ valor, rotulo: rotuloStatusFaturamento[valor] }));

  return (
    <>
      <Cabecalho titulo="Serviços & Faturamento" descricao="Notas fiscais de serviço por transportadora. Clique numa NF pendente para dar baixa como paga.">
        {admin && (
          <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
            <Plus className="h-4 w-4" /> Lançar NF
          </Link>
        )}
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      <FormFiltro>
        <Campo prefixo="filtro" nome="nf" rotulo="Número da NF" valor={filtro.nf} placeholder="Enter para buscar" />
        <Selecao prefixo="filtro" nome="tipo" rotulo="Tipo de contrato" valor={filtro.tipo} vazio="Todos" opcoes={[{ valor: "PJ", rotulo: "PJ" }, { valor: "SPOT", rotulo: "SPOT" }]} />
        {admin && <FiltroTransportadora opcoes={transportadoras} valor={filtro.carrierId} />}
        <Selecao prefixo="filtro" nome="status" rotulo="Status" valor={filtro.status} vazio="Todos" opcoes={statusOpcoes} />
      </FormFiltro>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(["OVERDUE", "PENDING", "PAID"] as const).map((s) => (
          <Link key={s} href={urlCom(BASE, sp, { status: filtro.status === s ? null : s })} className="card-sm flex items-center justify-between gap-3 p-5">
            <StatusBadge status={s} rotulo={rotuloStatusFaturamento[s]} />
            <span className="num text-[16px] font-semibold text-t1">{formatarMoeda(somar(s))}</span>
          </Link>
        ))}
      </div>

      <Painel titulo={`Notas fiscais (${lista.length})`}>
        {lista.length === 0 ? (
          <Vazio>Nenhuma NF encontrada com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Farol</th>
                  <th>NF</th>
                  <th>Transportadora</th>
                  <th>Tipo</th>
                  <th>Vencimento</th>
                  <th className="!text-right">Valor</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>NF (PDF)</th>
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => {
                  const pendente = s.status === "PENDING";
                  const aEmitir = s.status === "PENDING_EMISSION";
                  const acaoLinha = aEmitir ? { emitir: s.id } : pendente ? { pagar: s.id } : null;
                  return (
                    <LinhaClicavel key={s.id} href={admin && acaoLinha ? urlCom(BASE, sp, acaoLinha) : undefined} titulo={aEmitir ? "Clique para emitir a NF" : "Clique para marcar como pago"}>
                      <td>
                        <FarolBadge farol={s.farol} rotulo={aEmitir && s.farol ? { VERDE: "A emitir", AMARELO: "Emitir hoje", VERMELHO: "Emissão atrasada" }[s.farol] : undefined} rotuloResolvido={rotuloStatusFaturamento[s.situacao]} />
                      </td>
                      <td>
                        <p className="num font-semibold text-t1">{s.invoiceNumber ?? <span className="font-sans text-[11px] font-medium text-ouro">NF a emitir</span>}</p>
                        {aEmitir && s.emissionDate && <p className="text-[10px] text-t4">Emitir até {formatarData(s.emissionDate)} · {textoEmissao(s.emissionDate, diaLocal())}</p>}
                        {s.description && <p className="max-w-[220px] truncate text-[10px] text-t4" title={s.description}>{s.description}</p>}
                      </td>
                      <td>
                        <p className="font-medium text-t1">{nomeCarrier(s.carrier)}</p>
                        <p className="num text-[10px] text-t4">{formatarCnpj(s.carrier.cnpj)}</p>
                      </td>
                      <td><StatusBadge status={s.contractType} rotulo={s.contractType} /></td>
                      <td>
                        <p className="num">{formatarData(s.dueDate)}</p>
                        {s.farol && <p className="text-[10px] text-t4">{textoPrazo(s.dueDate)}</p>}
                      </td>
                      <td className="num text-right text-t1">{formatarMoeda(s.amount)}</td>
                      <td className="num">{formatarData(s.paymentDate)}</td>
                      <td><StatusBadge status={s.situacao} rotulo={rotuloStatusFaturamento[s.situacao]} /></td>
                      <td><LinkArquivo arquivo={s.file} compacto /></td>
                      {admin && (
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            {pendente && (
                              <Link href={urlCom(BASE, sp, { pagar: s.id })} className="btn-primary btn-sm" scroll={false}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                              </Link>
                            )}
                            {aEmitir ? (
                              <Link href={urlCom(BASE, sp, { emitir: s.id })} className="btn-primary btn-sm" scroll={false}>
                                <FileUp className="h-3.5 w-3.5" /> Emitir NF
                              </Link>
                            ) : (
                              <BotaoEditar href={urlCom(BASE, sp, { editar: s.id })} />
                            )}
                            <Link href={`/auditoria?entidade=FinancialService&registro=${s.id}`} className="btn-secondary btn-sm" title="Trilha de auditoria">
                              <History className="h-3.5 w-3.5" />
                            </Link>
                            {aEmitir ? (
                              <BotaoExcluir
                                acao={excluirServico}
                                id={s.id}
                                voltar={aqui}
                                rotulo="Dispensar"
                                descricao=""
                                confirmacao={`Dispensar a emissão da competência ${s.competence ?? ""} (não faturar este mês)? Fica registrado na auditoria.`}
                              />
                            ) : (
                              <BotaoExcluir acao={excluirServico} id={s.id} voltar={aqui} descricao={`a NF ${s.invoiceNumber}`} />
                            )}
                          </div>
                        </td>
                      )}
                    </LinhaClicavel>
                  );
                })}
              </tbody>
            </table>
          </Tabela>
        )}
        <LegendaFarol />
      </Painel>

      {emitindo && (
        <Modal
          titulo="Emitir NF e enviar para cobrança"
          descricao={`${nomeCarrier(emitindo.carrier)} · CNPJ ${formatarCnpj(emitindo.carrier.cnpj)} · competência ${emitindo.competence ?? "—"}`}
          fecharHref={aqui}
          largo
        >
          {emitindo.status !== "PENDING_EMISSION" ? (
            <Vazio>Esta NF já foi emitida.</Vazio>
          ) : (
            <FormAcao acao={confirmarEmissao} botao={<><FileUp className="h-4 w-4" /> Confirmar emissão e enviar para cobrança</>} classeBotao="btn-primary w-full" limpar={false} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={emitindo.id} />
              <Voltar href={aqui} />
              <div className="poco p-4 text-[12px] leading-relaxed text-t2 sm:col-span-2">
                Data limite de emissão: <b className="num text-t1">{formatarData(emitindo.emissionDate)}</b> · valor previsto <b className="num text-t1">{formatarMoeda(emitindo.amount)}</b>.
                <br />
                Ao confirmar, o alerta de emissão é resolvido e a fatura passa para <b className="text-t1">Aguardando pagamento</b>, com os faróis de vencimento.
              </div>
              <Campo nome="invoiceNumber" rotulo="Número da NF" obrigatorio maxLength={40} autoFocus />
              <Campo nome="amount" rotulo="Valor da NF (R$)" valor={emitindo.amount.toFixed(2).replace(".", ",")} obrigatorio inputMode="decimal" />
              <Campo nome="dueDate" rotulo="Vencimento do pagamento" type="date" valor={diaDe(emitindo.dueDate)} obrigatorio />
              <div>
                <label className="label" htmlFor="campo-arquivo">Arquivo da NF (PDF ou XML) *</label>
                <input id="campo-arquivo" name="arquivo" type="file" required accept=".pdf,.xml,application/pdf,application/xml,text/xml" className="input file:mr-3 file:rounded-full file:border-0 file:bg-acento/15 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-acento" />
              </div>
            </FormAcao>
          )}
        </Modal>
      )}

      {pagando && (
        <Modal titulo={`Marcar NF ${pagando.invoiceNumber} como paga`} descricao={`${nomeCarrier(pagando.carrier)} · vencimento ${formatarData(pagando.dueDate)} · ${formatarMoeda(pagando.amount)}`} fecharHref={aqui}>
          {pagando.status === "PAID" ? (
            <Vazio>Esta NF já está paga ({formatarData(pagando.paymentDate)}).</Vazio>
          ) : (
            <FormAcao acao={marcarPago} botao={<><CheckCircle2 className="h-4 w-4" /> Confirmar pagamento</>} classeBotao="btn-primary w-full" limpar={false} confirmar={`Confirmar a baixa da NF ${pagando.invoiceNumber} como PAGA?`}>
              <input type="hidden" name="id" value={pagando.id} />
              <Voltar href={aqui} />
              <div className="poco p-4 text-[12px] text-t2">
                Situação atual: <StatusBadge status={statusFaturamento(pagando)} rotulo={rotuloStatusFaturamento[statusFaturamento(pagando)]} />
              </div>
              <Campo nome="paymentDate" rotulo="Data do pagamento" type="date" valor={diaLocal()} max={diaLocal()} obrigatorio />
            </FormAcao>
          )}
        </Modal>
      )}

      {(novo || editando) && (
        <Modal titulo={editando ? `Editar NF ${editando.invoiceNumber}` : "Lançar NF de serviço"} fecharHref={aqui} largo>
          <FormAcao acao={salvarServico} botao={editando ? "Salvar alterações" : "Lançar NF"} limpar={false} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <Selecao nome="carrierId" rotulo="Transportadora" valor={editando?.carrierId ?? filtro.carrierId} obrigatorio vazio="Selecione..." opcoes={opcoesSelect(transportadoras)} className="sm:col-span-2" />
            <Selecao
              nome="contractId"
              rotulo="Contrato vinculado (opcional)"
              valor={editando?.contractId}
              vazio="Sem vínculo"
              opcoes={contratos.map((c) => ({ valor: c.id, rotulo: `${nomeCarrier(c.carrier)} — ${c.title} (${c.contractType})` }))}
              className="sm:col-span-2"
            />
            <Selecao nome="contractType" rotulo="Tipo de contrato" valor={editando?.contractType ?? "PJ"} obrigatorio opcoes={[{ valor: "PJ", rotulo: "PJ" }, { valor: "SPOT", rotulo: "SPOT" }]} />
            <Campo nome="invoiceNumber" rotulo="Número da NF" valor={editando?.invoiceNumber} obrigatorio maxLength={40} />
            <Campo nome="description" rotulo="Descrição do serviço" valor={editando?.description} maxLength={500} className="sm:col-span-2" />
            <Campo nome="amount" rotulo="Valor (R$)" valor={editando ? editando.amount.toFixed(2).replace(".", ",") : ""} obrigatorio inputMode="decimal" placeholder="0,00" />
            <Campo nome="dueDate" rotulo="Vencimento" type="date" valor={editando ? diaDe(editando.dueDate) : ""} obrigatorio />
            <Selecao
              nome="status"
              rotulo="Status"
              valor={editando?.status ?? "PENDING"}
              obrigatorio
              opcoes={[
                { valor: "PENDING", rotulo: "Pendente (vira Atrasado após o vencimento)" },
                { valor: "PAID", rotulo: "Pago" },
                { valor: "CANCELED", rotulo: "Cancelado" },
              ]}
            />
            <Campo nome="paymentDate" rotulo="Data de pagamento (se pago)" type="date" valor={editando?.paymentDate ? diaDe(editando.paymentDate) : ""} />
            <CampoArquivo rotulo="PDF da Nota Fiscal (opcional, até 4 MB)" atual={editando?.file} className="sm:col-span-2" />
          </FormAcao>
        </Modal>
      )}
    </>
  );
}

/**
 * Visão do Cliente / Transportador: apenas lançamentos EM ABERTO ou EM ATRASO do
 * próprio CNPJ — número da NF, vencimento e farol. Sem valores, sem pagas, sem totais.
 */
async function CobrancasCliente({ usuario, sp }: { usuario: UsuarioAtual; sp: Params }) {
  const filtro = lerFiltroCobrancas(sp);
  const [lista, todas] = await Promise.all([listarCobrancasCliente(usuario, filtro), listarCobrancasCliente(usuario)]);
  const contar = (s: SituacaoCobranca) => todas.filter((c) => c.situacao === s).length;

  return (
    <>
      <Cabecalho titulo="Cobranças em aberto" descricao="Notas fiscais em aberto ou em atraso da sua empresa, para conferência. Notas já pagas não aparecem aqui." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {(["OVERDUE", "PENDING"] as const).map((s) => (
          <Link
            key={s}
            href={urlCom(BASE, sp, { status: filtro.situacao === s ? null : s })}
            aria-current={filtro.situacao === s ? "true" : undefined}
            className={`card-sm flex items-center justify-between gap-3 p-5 ${filtro.situacao === s ? "ring-2 ring-acento/60" : ""}`}
          >
            <StatusBadge status={s} rotulo={rotuloCobranca[s]} />
            <span className="num text-[22px] font-semibold text-t1">{contar(s)}</span>
          </Link>
        ))}
      </div>

      <FormFiltro className="mb-5 grid gap-3 sm:grid-cols-2">
        <Campo prefixo="filtro" nome="nf" rotulo="Número da NF" valor={filtro.nf} placeholder="Enter para buscar" />
        <Selecao
          prefixo="filtro"
          nome="status"
          rotulo="Situação"
          valor={filtro.situacao}
          vazio="Em aberto e em atraso"
          opcoes={(["PENDING", "OVERDUE"] as const).map((v) => ({ valor: v, rotulo: rotuloCobranca[v] }))}
        />
      </FormFiltro>

      <Painel titulo={`Cobranças (${lista.length})`}>
        {lista.length === 0 ? (
          <Vazio>Nenhuma cobrança em aberto. Tudo em dia!</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Farol</th>
                  <th>NF / Fatura</th>
                  <th>Tipo</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>NF (PDF)</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td><FarolBadge farol={c.farol} /></td>
                    <td className="num font-semibold text-t1">{c.invoiceNumber}</td>
                    <td><StatusBadge status={c.contractType} rotulo={c.contractType} /></td>
                    <td>
                      <p className="num">{formatarData(c.dueDate)}</p>
                      <p className="text-[10px] text-t4">{textoPrazo(c.dueDate)}</p>
                    </td>
                    <td><StatusBadge status={c.situacao} rotulo={rotuloCobranca[c.situacao]} /></td>
                    <td><LinkArquivo arquivo={c.file} compacto /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tabela>
        )}
        <LegendaFarol />
      </Painel>
    </>
  );
}
