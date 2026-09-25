import Link from "next/link";
import { History, Plus } from "lucide-react";
import { excluirContrato, salvarContrato } from "@/actions/contratos";
import { BotaoEditar, BotaoExcluir } from "@/components/Acoes";
import { AreaTexto, Campo, CampoArquivo, LinkArquivo, Selecao, Voltar } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora, opcoesSelect } from "@/components/FiltroTransportadora";
import { FormAcao } from "@/components/FormAcao";
import { LinhaClicavel } from "@/components/LinhaClicavel";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, FarolBadge, LegendaFarol, Painel, StatusBadge, Tabela, Vazio } from "@/components/ui";
import { textoPrazo } from "@/domain/farol";
import { rotuloStatusContrato } from "@/domain/status";
import { diaDe, formatarData } from "@/lib/datas";
import { formatarCnpj, formatarMoeda } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { buscarContrato, lerFiltroContratos, listarContratos } from "@/server/consultas/contratos";
import { nomeCarrier, param, type Params } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Contratos" };
const BASE = "/contratos";

export default async function ContratosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const filtro = lerFiltroContratos(sp);
  const editarId = admin ? param(sp, "editar") : undefined;
  const novo = admin && param(sp, "novo") === "1";
  const [lista, transportadoras, editando] = await Promise.all([
    listarContratos(usuario, filtro),
    admin ? opcoesTransportadoras() : [],
    editarId ? buscarContrato(usuario, editarId) : null,
  ]);
  const aqui = urlCom(BASE, sp);
  const total = lista.reduce((a, c) => a + (c.status === "ACTIVE" ? (c.amount ?? 0) : 0), 0);

  return (
    <>
      <Cabecalho titulo="Contratos" descricao={admin ? "Contratos PJ e SPOT com farol de vencimento e o documento assinado para download." : "Seus contratos, a validade de cada um e o documento para download."}>
        {admin && (
          <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
            <Plus className="h-4 w-4" /> Novo contrato
          </Link>
        )}
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      <FormFiltro>
        {admin && <FiltroTransportadora opcoes={transportadoras} valor={filtro.carrierId} />}
        <Selecao prefixo="filtro" nome="tipo" rotulo="Tipo" valor={filtro.tipo} vazio="Todos" opcoes={[{ valor: "PJ", rotulo: "PJ" }, { valor: "SPOT", rotulo: "SPOT" }]} />
        <Selecao prefixo="filtro" nome="status" rotulo="Status" valor={filtro.status} vazio="Todos" opcoes={Object.entries(rotuloStatusContrato).map(([valor, rotulo]) => ({ valor, rotulo }))} />
        <Selecao
          nome="farol"
          rotulo="Farol"
          valor={filtro.farol}
          vazio="Todos"
          opcoes={[
            { valor: "VERMELHO", rotulo: "Vermelho — vencidos" },
            { valor: "AMARELO", rotulo: "Amarelo — vence hoje/amanhã" },
            { valor: "VERDE", rotulo: "Verde — em dia" },
          ]}
        />
        <Campo prefixo="filtro" nome="busca" rotulo="Buscar descrição" valor={filtro.busca} placeholder="Enter para buscar" />
      </FormFiltro>

      <Painel
        titulo={`Contratos (${lista.length})`}
        acoes={admin && <span className="text-[11px] text-t3">Vigentes na lista: <span className="num font-semibold text-t1">{formatarMoeda(total)}</span></span>}
      >
        {lista.length === 0 ? (
          <Vazio>Nenhum contrato encontrado com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Farol</th>
                  <th>Transportadora</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  {admin && <th className="!text-right">Valor</th>}
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Documento</th>
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <LinhaClicavel key={c.id} href={admin ? urlCom(BASE, sp, { editar: c.id }) : undefined} titulo="Clique para editar">
                    <td><FarolBadge farol={c.farol} rotuloResolvido={rotuloStatusContrato[c.status]} /></td>
                    <td>
                      <p className="font-medium text-t1">{nomeCarrier(c.carrier)}</p>
                      <p className="num text-[10px] text-t4">{formatarCnpj(c.carrier.cnpj)}</p>
                    </td>
                    <td className="max-w-[280px] truncate" title={c.title}>{c.title}</td>
                    <td><StatusBadge status={c.contractType} rotulo={c.contractType} /></td>
                    {admin && <td className="num text-right text-t1">{formatarMoeda(c.amount)}</td>}
                    <td>
                      <p className="num">{formatarData(c.expirationDate)}</p>
                      {c.farol && <p className="text-[10px] text-t4">{textoPrazo(c.expirationDate)}</p>}
                    </td>
                    <td><StatusBadge status={c.status} rotulo={rotuloStatusContrato[c.status]} /></td>
                    <td><LinkArquivo arquivo={c.file} compacto /></td>
                    {admin && (
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <BotaoEditar href={urlCom(BASE, sp, { editar: c.id })} />
                          <Link href={`/auditoria?entidade=Contract&registro=${c.id}`} className="btn-secondary btn-sm" title="Trilha de auditoria">
                            <History className="h-3.5 w-3.5" />
                          </Link>
                          <BotaoExcluir acao={excluirContrato} id={c.id} voltar={aqui} descricao={`o contrato "${c.title}"`} />
                        </div>
                      </td>
                    )}
                  </LinhaClicavel>
                ))}
              </tbody>
            </table>
          </Tabela>
        )}
        <LegendaFarol />
      </Painel>

      {(novo || editando) && (
        <Modal titulo={editando ? "Editar contrato" : "Novo contrato"} fecharHref={aqui} largo>
          <FormAcao acao={salvarContrato} botao={editando ? "Salvar alterações" : "Cadastrar contrato"} limpar={false} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <Selecao nome="carrierId" rotulo="Transportadora" valor={editando?.carrierId ?? filtro.carrierId} obrigatorio vazio="Selecione..." opcoes={opcoesSelect(transportadoras)} className="sm:col-span-2" />
            <Campo nome="title" rotulo="Descrição do contrato" valor={editando?.title} obrigatorio maxLength={200} className="sm:col-span-2" placeholder="Ex.: Contrato de consultoria regulatória 2026" />
            <Selecao nome="contractType" rotulo="Tipo de contrato" valor={editando?.contractType ?? "PJ"} obrigatorio opcoes={[{ valor: "PJ", rotulo: "PJ" }, { valor: "SPOT", rotulo: "SPOT" }]} />
            <Campo nome="amount" rotulo="Valor (R$)" valor={editando ? editando.amount.toFixed(2).replace(".", ",") : ""} obrigatorio inputMode="decimal" placeholder="0,00" />
            <Campo nome="startDate" rotulo="Início da vigência" type="date" valor={editando?.startDate ? diaDe(editando.startDate) : ""} />
            <Campo nome="expirationDate" rotulo="Data de vencimento" type="date" valor={editando ? diaDe(editando.expirationDate) : ""} obrigatorio />
            <Selecao nome="status" rotulo="Status" valor={editando?.status ?? "ACTIVE"} obrigatorio opcoes={Object.entries(rotuloStatusContrato).map(([valor, rotulo]) => ({ valor, rotulo }))} />
            <CampoArquivo rotulo="Contrato (PDF ou Word, até 4 MB)" obrigatorio={!editando} atual={editando?.file} />
            <AreaTexto nome="notes" rotulo="Observações" valor={editando?.notes} className="sm:col-span-2" />
          </FormAcao>
        </Modal>
      )}
    </>
  );
}
