import Link from "next/link";
import { History, Plus } from "lucide-react";
import { excluirManual, salvarManual } from "@/actions/manuais";
import { BotaoEditar, BotaoExcluir } from "@/components/Acoes";
import { AreaTexto, Campo, CampoArquivo, LinkArquivo, Selecao, Voltar } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { FiltroTransportadora, opcoesSelect } from "@/components/FiltroTransportadora";
import { FormAcao } from "@/components/FormAcao";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, FarolBadge, LegendaFarol, Painel, Tabela, Vazio } from "@/components/ui";
import { textoPrazo } from "@/domain/farol";
import { rotuloCategoriaManual } from "@/domain/status";
import { diaDe, formatarData } from "@/lib/datas";
import { formatarCnpj } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { ehAdmin, requireUsuario } from "@/server/auth";
import { nomeCarrier, param, type Params } from "@/server/consultas/filtros";
import { buscarManual, lerFiltroManuais, listarManuais } from "@/server/consultas/manuais";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";

export const metadata = { title: "Manuais & POPs" };
const BASE = "/manuais";
const categorias = Object.entries(rotuloCategoriaManual).map(([valor, rotulo]) => ({ valor, rotulo }));

export default async function ManuaisPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const filtro = lerFiltroManuais(sp);
  const novo = admin && param(sp, "novo") === "1";
  const editarId = admin ? param(sp, "editar") : undefined;
  const [lista, transportadoras, editando] = await Promise.all([
    listarManuais(usuario, filtro),
    admin ? opcoesTransportadoras() : [],
    editarId ? buscarManual(usuario, editarId) : null,
  ]);
  const aqui = urlCom(BASE, sp);

  return (
    <>
      <Cabecalho titulo="Manuais de Boas Práticas & POPs" descricao="Manuais de Boas Práticas de Armazenagem e Transporte, POPs e demais documentos regulatórios, em PDF ou Word.">
        {admin && (
          <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
            <Plus className="h-4 w-4" /> Novo documento
          </Link>
        )}
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      <FormFiltro>
        {admin && <FiltroTransportadora opcoes={transportadoras} valor={filtro.carrierId} />}
        <Selecao prefixo="filtro" nome="categoria" rotulo="Categoria" valor={filtro.categoria} vazio="Todas" opcoes={categorias} />
        <Selecao
          nome="farol"
          rotulo="Revisão"
          valor={filtro.farol}
          vazio="Todas"
          opcoes={[
            { valor: "VERMELHO", rotulo: "Vermelho — revisão vencida" },
            { valor: "AMARELO", rotulo: "Amarelo — revisão hoje/amanhã" },
            { valor: "VERDE", rotulo: "Verde — em dia" },
          ]}
        />
        <Campo prefixo="filtro" nome="busca" rotulo="Buscar título" valor={filtro.busca} placeholder="Enter para buscar" />
      </FormFiltro>

      <Painel titulo={`Documentos (${lista.length})`}>
        {lista.length === 0 ? (
          <Vazio>Nenhum documento encontrado com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Revisão</th>
                  <th>Transportadora</th>
                  <th>Título</th>
                  <th>Categoria</th>
                  <th>Versão</th>
                  <th>Próxima revisão</th>
                  <th>Publicado em</th>
                  <th>Arquivo</th>
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id}>
                    <td><FarolBadge farol={m.farol} rotuloResolvido="Sem prazo" /></td>
                    <td>
                      <p className="font-medium text-t1">{nomeCarrier(m.carrier)}</p>
                      <p className="num text-[10px] text-t4">{formatarCnpj(m.carrier.cnpj)}</p>
                    </td>
                    <td className="max-w-[280px] truncate font-medium text-t1" title={m.title}>{m.title}</td>
                    <td>{rotuloCategoriaManual[m.category]}</td>
                    <td className="num">{m.version}</td>
                    <td>
                      <p className="num">{formatarData(m.reviewDate)}</p>
                      {m.reviewDate && <p className="text-[10px] text-t4">{textoPrazo(m.reviewDate)}</p>}
                    </td>
                    <td className="num">{formatarData(m.createdAt)}</td>
                    <td><LinkArquivo arquivo={m.file} compacto /></td>
                    {admin && (
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <BotaoEditar href={urlCom(BASE, sp, { editar: m.id })} />
                          <Link href={`/auditoria?entidade=GoodPracticesManual&registro=${m.id}`} className="btn-secondary btn-sm" title="Trilha de auditoria">
                            <History className="h-3.5 w-3.5" />
                          </Link>
                          <BotaoExcluir acao={excluirManual} id={m.id} voltar={aqui} descricao={`o documento "${m.title}"`} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Tabela>
        )}
        <LegendaFarol />
      </Painel>

      {(novo || editando) && (
        <Modal titulo={editando ? "Editar documento" : "Novo manual / POP"} fecharHref={aqui} largo>
          <FormAcao acao={salvarManual} botao={editando ? "Salvar alterações" : "Cadastrar documento"} limpar={false} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <Selecao nome="carrierId" rotulo="Transportadora" valor={editando?.carrierId ?? filtro.carrierId} obrigatorio vazio="Selecione..." opcoes={opcoesSelect(transportadoras)} className="sm:col-span-2" />
            <Campo nome="title" rotulo="Título" valor={editando?.title} obrigatorio maxLength={200} className="sm:col-span-2" placeholder="Ex.: Manual de Boas Práticas de Transporte de Medicamentos" />
            <Selecao nome="category" rotulo="Categoria" valor={editando?.category ?? "MANUAL_BPA"} obrigatorio opcoes={categorias} />
            <Campo nome="version" rotulo="Versão" valor={editando?.version} obrigatorio maxLength={30} placeholder="Ex.: 3.0" />
            <Campo nome="reviewDate" rotulo="Próxima revisão" type="date" valor={editando?.reviewDate ? diaDe(editando.reviewDate) : ""} ajuda="Usada pelo farol de vencimento." />
            <CampoArquivo obrigatorio={!editando} atual={editando?.file} />
            <AreaTexto nome="notes" rotulo="Observações" valor={editando?.notes} className="sm:col-span-2" />
          </FormAcao>
        </Modal>
      )}
    </>
  );
}
