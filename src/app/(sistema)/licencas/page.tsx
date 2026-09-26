import Link from "next/link";
import { formatarNumero } from "@/lib/formatos";
import type { DocumentType } from "@prisma/client";
import { History, Layers, Plus, RefreshCw, ToggleRight } from "lucide-react";
import { alterarStatusLicenca, excluirLicenca, renovarLicenca, salvarLicenca } from "@/actions/licencas";
import { BotaoEditar, BotaoExcluir } from "@/components/Acoes";
import { AreaTexto, Campo, CampoArquivo, LinkArquivo, Selecao, Voltar } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora, opcoesSelect } from "@/components/FiltroTransportadora";
import { FormAcao } from "@/components/FormAcao";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, FarolBadge, LegendaFarol, Painel, StatusBadge, Tabela, Vazio, estiloFarol } from "@/components/ui";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Clock3, Infinity as Indeterminado } from "lucide-react";
import { CamposDocumento } from "@/components/CamposDocumento";
import { LISTA_TIPOS_DOCUMENTO, SEM_VALIDADE, TIPOS_DOCUMENTO, categoriaDoTipo, rotuloCategoriaDocumento, rotuloTipoDocumento, tiposDaCategoria } from "@/domain/tiposDocumento";
import { textoPrazo } from "@/domain/farol";
import { rotuloSituacaoLicenca, rotuloStatusLicenca, situacaoLicenca } from "@/domain/status";
import { diaDe, formatarData } from "@/lib/datas";
import { formatarCnpj } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { nomeCarrier, param, type Params } from "@/server/consultas/filtros";
import { buscarLicenca, contarSituacoes, historicoLicenca, lerFiltroLicencas, paginaLicencas } from "@/server/consultas/licencas";
import { lerPagina } from "@/server/consultas/filtros";
import { Paginacao } from "@/components/Paginacao";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Licenças e Documentos" };
const BASE = "/licencas";

export default async function LicencasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const filtro = lerFiltroLicencas(sp);
  const novo = admin && param(sp, "novo") === "1";
  const editarId = admin ? param(sp, "editar") : undefined;
  const renovarId = admin ? param(sp, "renovar") : undefined;
  const alterarId = admin ? param(sp, "alterar") : undefined;
  const versoesId = param(sp, "versoes");
  const [{ itens: lista, ...pag }, transportadoras, editando, renovando, alterando, versoes, situacoes] = await Promise.all([
    paginaLicencas(usuario, filtro, lerPagina(sp)),
    admin ? opcoesTransportadoras() : [],
    editarId ? buscarLicenca(usuario, editarId) : null,
    renovarId ? buscarLicenca(usuario, renovarId) : null,
    alterarId ? buscarLicenca(usuario, alterarId) : null,
    versoesId ? historicoLicenca(usuario, versoesId) : [],
    contarSituacoes(usuario, filtro),
  ]);
  const aqui = urlCom(BASE, sp);

  return (
    <>
      <Cabecalho titulo="Licenças e Documentos" descricao="Licenças sanitárias e regulatórias e documentos operacionais e técnicos, com controle de validade, renovação e histórico de versões.">
        {admin && (
          <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
            <Plus className="h-4 w-4" /> Novo documento
          </Link>
        )}
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      {/* categoria: Licença Sanitária & Regulatória x Documentos Operacionais & Técnicos */}
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Categoria">
        {([[undefined, "Todos"], ["LICENCA", rotuloCategoriaDocumento.LICENCA], ["DOCUMENTO", rotuloCategoriaDocumento.DOCUMENTO]] as const).map(([c, rotulo]) => (
          <Link
            key={rotulo}
            href={urlCom(BASE, sp, { categoria: c ?? null, tipo: null })}
            aria-current={filtro.categoria === c ? "page" : undefined}
            className={filtro.categoria === c ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {/* visão geral por situação: clique para filtrar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["VERDE", "Ativas", CheckCircle2],
            ["AMARELO", "Próximas de Vencer", Clock3],
            ["VERMELHO", "Vencidas", AlertTriangle],
          ] as const
        ).map(([f, rotulo, Icone]) => (
          <Link
            key={f}
            href={urlCom(BASE, sp, { farol: filtro.farol === f ? null : f, status: null, validade: null })}
            aria-current={filtro.farol === f ? "true" : undefined}
            className={clsx("card-sm flex items-center gap-4 p-5", filtro.farol === f && "ring-2 ring-acento/60")}
          >
            <span className={clsx("poco flex h-11 w-11 flex-none items-center justify-center !rounded-2xl", estiloFarol[f].cor)}>
              <Icone className="h-5 w-5" />
            </span>
            <span>
              <span className="label !mb-1 block">{rotulo}</span>
              <span className="num text-[22px] font-semibold text-t1">{situacoes[f]}</span>
            </span>
          </Link>
        ))}
        <Link
          href={urlCom(BASE, sp, { validade: filtro.semValidade ? null : "INDETERMINADA", farol: null, status: null })}
          aria-current={filtro.semValidade ? "true" : undefined}
          className={clsx("card-sm flex items-center gap-4 p-5", filtro.semValidade && "ring-2 ring-acento/60")}
        >
          <span className="poco flex h-11 w-11 flex-none items-center justify-center !rounded-2xl text-acento">
            <Indeterminado className="h-5 w-5" />
          </span>
          <span>
            <span className="label !mb-1 block">Sem validade (AFE / AE)</span>
            <span className="num text-[22px] font-semibold text-t1">{situacoes.INDETERMINADA}</span>
          </span>
        </Link>
      </div>

      <FormFiltro>
        {filtro.categoria && <input type="hidden" name="categoria" value={filtro.categoria} />}
        {admin && <FiltroTransportadora opcoes={transportadoras} valor={filtro.carrierId} />}
        <Selecao
          prefixo="filtro"
          nome="tipo"
          rotulo="Tipo de documento"
          valor={filtro.tipo}
          vazio="Todos"
          opcoes={(filtro.categoria ? tiposDaCategoria(filtro.categoria) : LISTA_TIPOS_DOCUMENTO).map((t) => ({ valor: t, rotulo: TIPOS_DOCUMENTO[t].rotulo }))}
        />
        <Selecao
          nome="farol"
          rotulo="Situação"
          valor={filtro.farol}
          vazio="Todas"
          opcoes={[
            { valor: "VERDE", rotulo: "Ativa" },
            { valor: "AMARELO", rotulo: "Próxima de Vencer" },
            { valor: "VERMELHO", rotulo: "Vencida" },
          ]}
        />
        <Selecao prefixo="filtro" nome="status" rotulo="Status" valor={filtro.status} vazio="Todos" opcoes={Object.entries(rotuloStatusLicenca).map(([valor, rotulo]) => ({ valor, rotulo }))} />
        <Campo prefixo="filtro" nome="busca" rotulo="Número do documento" valor={filtro.busca} placeholder="Enter para buscar" />
        <label className="poco flex cursor-pointer items-center gap-3 self-end px-4 py-3">
          <input type="checkbox" name="historico" value="1" defaultChecked={filtro.historico} />
          <span className="text-[12px] text-t2">Mostrar versões renovadas</span>
        </label>
      </FormFiltro>

      <Painel titulo={`${filtro.categoria ? rotuloCategoriaDocumento[filtro.categoria] : "Licenças e Documentos"} (${formatarNumero(pag.total)})`}>
        {lista.length === 0 ? (
          <Vazio>Nenhum documento encontrado com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>Tipo</th>
                  <th>Transportadora</th>
                  <th>Nº do documento</th>
                  <th>Órgão emissor</th>
                  <th>Validade</th>
                  <th>Versão</th>
                  <th>Documento</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((l) => {
                  const ultima = !l.next;
                  return (
                    <tr key={l.id} className={l.status === "RENEWED" ? "opacity-60" : undefined}>
                      <td>
                        {l.situacao === "INDETERMINADA" ? (
                          <StatusBadge status={l.situacao} rotulo={rotuloSituacaoLicenca[l.situacao]} />
                        ) : (
                          <FarolBadge farol={l.farol} rotulo={rotuloSituacaoLicenca[l.situacao]} />
                        )}
                      </td>
                      <td>
                        <p className={clsx("text-[11px] font-semibold", l.documentType ? "text-t1" : "text-ouro")}>{rotuloTipoDocumento(l.documentType)}</p>
                        <p className="text-[10px] text-t4">{rotuloCategoriaDocumento[categoriaDoTipo(l.documentType)]}</p>
                      </td>
                      <td>
                        <p className="font-medium text-t1">{nomeCarrier(l.carrier)}</p>
                        <p className="num text-[10px] text-t4">{formatarCnpj(l.carrier.cnpj)}</p>
                      </td>
                      <td className="num font-semibold text-t1">{l.licenseNumber}</td>
                      <td>{l.issuingBody ?? "—"}</td>
                      <td>
                        {l.expirationDate ? (
                          <>
                            <p className="num">{formatarData(l.expirationDate)}</p>
                            {l.farol && <p className="text-[10px] text-t4">{textoPrazo(l.expirationDate)}</p>}
                          </>
                        ) : (
                          <p className="inline-flex items-center gap-1 text-[11px] font-medium text-acento">
                            <Indeterminado className="h-3.5 w-3.5" /> {SEM_VALIDADE}
                          </p>
                        )}
                      </td>
                      <td>
                        <Link href={urlCom(BASE, sp, { versoes: l.id })} className="inline-flex items-center gap-1 text-acento hover:underline" scroll={false} title="Ver histórico de versões">
                          <Layers className="h-3.5 w-3.5" /> v{l.version}
                        </Link>
                      </td>
                      <td><LinkArquivo arquivo={l.file} compacto /></td>
                      <td>
                        {admin && (
                          <div className="flex items-center justify-end gap-2">
                            {ultima && (
                              <>
                                <Link href={urlCom(BASE, sp, { renovar: l.id })} className="btn-primary btn-sm" scroll={false}>
                                  <RefreshCw className="h-3.5 w-3.5" /> Renovar
                                </Link>
                                <Link href={urlCom(BASE, sp, { alterar: l.id })} className="btn-secondary btn-sm" scroll={false} title="Alterar status ou encerrar">
                                  <ToggleRight className="h-3.5 w-3.5" /> Status / Encerrar
                                </Link>
                              </>
                            )}
                            <BotaoEditar href={urlCom(BASE, sp, { editar: l.id })} />
                            <Link href={`/auditoria?entidade=SanitaryLicense&registro=${l.id}`} className="btn-secondary btn-sm" title="Trilha de auditoria">
                              <History className="h-3.5 w-3.5" />
                            </Link>
                            {ultima && <BotaoExcluir acao={excluirLicenca} id={l.id} voltar={aqui} descricao={`o documento ${rotuloTipoDocumento(l.documentType)} ${l.licenseNumber} (v${l.version})`} />}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Tabela>
        )}
        <p className="mt-4 text-[11px] text-t3">
          <span className="font-semibold text-t2">Ativa</span> = mais de 1 dia para o vencimento · <span className="font-semibold text-t2">Próxima de Vencer</span> = vence hoje ou amanhã ·{" "}
          <span className="font-semibold text-t2">Vencida</span> = validade expirada sem renovação ·{" "}
          <span className="font-semibold text-t2">{SEM_VALIDADE}</span> = AFE / AE sem data de validade (fora dos faróis).
        </p>
        <LegendaFarol />
        <Paginacao base={BASE} sp={sp} {...pag} />
      </Painel>

      {/* ---------- cadastro / edição ---------- */}
      {(novo || editando) && (
        <Modal titulo={editando ? `Editar ${rotuloTipoDocumento(editando.documentType)} ${editando.licenseNumber}` : "Novo documento / licença"} descricao={editando ? "Use para corrigir dados. Para uma nova validade, use Renovar (mantém o histórico)." : undefined} fecharHref={aqui} largo>
          <FormAcao acao={salvarLicenca} botao={editando ? "Salvar alterações" : "Cadastrar documento"} limpar={false} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <Selecao nome="carrierId" rotulo="Transportadora" valor={editando?.carrierId ?? filtro.carrierId} obrigatorio vazio="Selecione..." opcoes={opcoesSelect(transportadoras)} className="sm:col-span-2" />
            <CamposLicenca valores={editando} />
            <CampoArquivo rotulo="Documento (PDF, até 4 MB)" obrigatorio={!editando} atual={editando?.file} className="sm:col-span-2" />
            <AreaTexto nome="notes" rotulo="Observações" valor={editando?.notes} className="sm:col-span-2" />
          </FormAcao>
        </Modal>
      )}

      {/* ---------- alteração de status ---------- */}
      {alterando && (
        <Modal
          titulo={`Alterar status / encerrar ${rotuloTipoDocumento(alterando.documentType)} ${alterando.licenseNumber}`}
          descricao="O status anterior e os dados atuais da licença ficam gravados na trilha de auditoria. Ao suspender, cancelar ou encerrar, a tela de lançamento da nova licença (novo PDF e nova validade) abre automaticamente em seguida."
          fecharHref={aqui}
        >
          <FormAcao acao={alterarStatusLicenca} botao="Salvar status" classeBotao="btn-primary w-full" limpar={false}>
            <input type="hidden" name="id" value={alterando.id} />
            <Voltar href={aqui} />
            <div className="poco p-4 text-[12px] text-t2">
              Situação atual: <StatusBadge status={situacaoLicenca(alterando)} rotulo={rotuloSituacaoLicenca[situacaoLicenca(alterando)]} /> · validade {alterando.expirationDate ? formatarData(alterando.expirationDate) : SEM_VALIDADE}
            </div>
            <Selecao
              nome="status"
              rotulo="Novo status"
              obrigatorio
              valor={alterando.status === "CURRENT" ? "SUSPENDED" : "CURRENT"}
              opcoes={(["CURRENT", "SUSPENDED", "CANCELED", "CLOSED"] as const).filter((s) => s !== alterando.status).map((s) => ({ valor: s, rotulo: rotuloStatusLicenca[s] }))}
            />
            <Campo nome="motivo" rotulo="Motivo" maxLength={500} placeholder="Ex.: licença suspensa pela VISA municipal" />
          </FormAcao>
        </Modal>
      )}

      {/* ---------- renovação (abre automaticamente após troca de status) ---------- */}
      {renovando && (
        <Modal
          titulo={`Renovar ${rotuloTipoDocumento(renovando.documentType)} ${renovando.licenseNumber}`}
          descricao={`${nomeCarrier(renovando.carrier)} · versão atual v${renovando.version}, validade ${renovando.expirationDate ? formatarData(renovando.expirationDate) : SEM_VALIDADE}. A versão atual será arquivada no histórico e uma nova versão (v${renovando.version + 1}) será criada.`}
          fecharHref={aqui}
          largo
        >
          {renovando.next ? (
            <Vazio>Este documento já foi renovado.</Vazio>
          ) : (
            <FormAcao acao={renovarLicenca} botao={<><RefreshCw className="h-4 w-4" /> Registrar renovação</>} limpar={false} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={renovando.id} />
              <Voltar href={aqui} />
              <CamposLicenca valores={{ documentType: renovando.documentType, licenseNumber: renovando.licenseNumber, issuingBody: renovando.issuingBody }} rotuloValidade="Nova data de validade" />
              <CampoArquivo rotulo="Novo documento (PDF, até 4 MB)" obrigatorio className="sm:col-span-2" />
              <AreaTexto nome="notes" rotulo="Observações" className="sm:col-span-2" />
            </FormAcao>
          )}
        </Modal>
      )}

      {/* ---------- histórico de versões ---------- */}
      {versoesId && (
        <Modal titulo="Histórico de versões do documento" fecharHref={aqui} largo>
          {versoes.length === 0 ? (
            <Vazio>Documento não encontrado.</Vazio>
          ) : (
            <ol className="space-y-3">
              {versoes.map((v) => {
                const s = situacaoLicenca(v);
                return (
                  <li key={v.id} className="poco flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-[13px] font-semibold text-t1">
                        v{v.version} · {rotuloTipoDocumento(v.documentType)} <span className="num">{v.licenseNumber}</span>
                      </p>
                      <p className="text-[11px] text-t3">
                        {v.issuingBody ?? "Órgão não informado"} · emissão {formatarData(v.issueDate)} · validade {v.expirationDate ? formatarData(v.expirationDate) : SEM_VALIDADE} · cadastrada em {formatarData(v.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s} rotulo={rotuloSituacaoLicenca[s]} />
                      <LinkArquivo arquivo={v.file} compacto />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Modal>
      )}
    </>
  );
}

function CamposLicenca({
  valores,
  rotuloValidade = "Data de validade",
}: {
  valores?: { documentType?: DocumentType | null; licenseNumber?: string; issuingBody?: string | null; issueDate?: Date | null; expirationDate?: Date | null } | null;
  rotuloValidade?: string;
}) {
  return (
    <>
      <CamposDocumento tipo={valores ? valores.documentType ?? null : undefined} validade={valores?.expirationDate ? diaDe(valores.expirationDate) : ""} rotuloValidade={rotuloValidade} />
      <Campo nome="licenseNumber" rotulo="Número do documento" valor={valores?.licenseNumber} obrigatorio maxLength={60} />
      <Campo nome="issuingBody" rotulo="Órgão emissor" valor={valores?.issuingBody} maxLength={120} placeholder="Ex.: ANVISA / VISA / Polícia Federal" />
      <Campo nome="issueDate" rotulo="Data de emissão" type="date" valor={valores?.issueDate ? diaDe(valores.issueDate) : ""} />
    </>
  );
}
