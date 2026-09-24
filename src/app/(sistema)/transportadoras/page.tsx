import Link from "next/link";
import { History, Plus } from "lucide-react";
import { alternarTransportadora, excluirTransportadora, salvarTransportadora } from "@/actions/transportadoras";
import { BotaoEditar, BotaoExcluir } from "@/components/Acoes";
import { Campo, Voltar } from "@/components/Campos";
import { FormAcao } from "@/components/FormAcao";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, Painel, StatusBadge, Tabela, Vazio } from "@/components/ui";
import { formatarData } from "@/lib/datas";
import { formatarCnpj } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { requireAdmin } from "@/server/auth";
import { param, type Params } from "@/server/consultas/filtros";
import { listarTransportadoras } from "@/server/consultas/transportadoras";
import { prisma } from "@/server/prisma";

export const metadata = { title: "Transportadoras" };
const BASE = "/transportadoras";

export default async function TransportadorasPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const sp = await searchParams;
  const editarId = param(sp, "editar");
  const novo = param(sp, "novo") === "1";
  const [lista, editando] = await Promise.all([listarTransportadoras(), editarId ? prisma.carrier.findUnique({ where: { id: editarId } }) : null]);
  const aqui = urlCom(BASE, sp);

  return (
    <>
      <Cabecalho titulo="Transportadoras" descricao="Clientes da consultoria. O CNPJ é a chave que amarra os usuários Cliente aos seus documentos.">
        <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
          <Plus className="h-4 w-4" /> Nova transportadora
        </Link>
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      <Painel titulo={`Transportadoras (${lista.length})`}>
        {lista.length === 0 ? (
          <Vazio>Nenhuma transportadora cadastrada ainda.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Razão social / Fantasia</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Cidade/UF</th>
                  <th>Documentos</th>
                  <th>Usuários</th>
                  <th>Situação</th>
                  <th>Cadastro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((t) => {
                  const docs = t._count.contracts + t._count.licenses + t._count.manuals + t._count.services;
                  return (
                    <tr key={t.id} className={t.active ? undefined : "opacity-60"}>
                      <td>
                        <p className="font-medium text-t1">{t.legalName}</p>
                        {t.tradeName && <p className="text-[10px] text-t4">{t.tradeName}</p>}
                      </td>
                      <td className="num">{formatarCnpj(t.cnpj)}</td>
                      <td>
                        <p>{t.contactName ?? "—"}</p>
                        <p className="text-[10px] text-t4">{[t.contactEmail, t.contactPhone].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td>{t.city ? `${t.city}/${t.state ?? ""}` : "—"}</td>
                      <td className="num">{docs}</td>
                      <td className="num">{t._count.users}</td>
                      <td><StatusBadge status={t.active ? "SIM" : "NAO"} rotulo={t.active ? "Ativa" : "Inativa"} /></td>
                      <td className="num">{formatarData(t.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <BotaoEditar href={urlCom(BASE, sp, { editar: t.id })} />
                          <FormAcao acao={alternarTransportadora} className="inline" botao={t.active ? "Inativar" : "Ativar"} classeBotao={t.active ? "btn-danger btn-sm" : "btn-secondary btn-sm"} confirmar={t.active ? `Inativar ${t.legalName}? Os usuários dela perdem o acesso.` : undefined}>
                            <input type="hidden" name="id" value={t.id} />
                            <Voltar href={aqui} />
                          </FormAcao>
                          <Link href={`/auditoria?entidade=Carrier&registro=${t.id}`} className="btn-secondary btn-sm" title="Trilha de auditoria">
                            <History className="h-3.5 w-3.5" />
                          </Link>
                          {docs + t._count.users === 0 && <BotaoExcluir acao={excluirTransportadora} id={t.id} voltar={aqui} descricao={`a transportadora ${t.legalName}`} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Tabela>
        )}
      </Painel>

      {(novo || editando) && (
        <Modal titulo={editando ? `Editar ${editando.legalName}` : "Nova transportadora"} fecharHref={aqui} largo>
          <FormAcao acao={salvarTransportadora} botao={editando ? "Salvar alterações" : "Cadastrar transportadora"} limpar={false} className="grid gap-4 sm:grid-cols-6">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <p className="secao sm:col-span-6">Identificação</p>
            <Campo nome="cnpj" rotulo="CNPJ" valor={editando ? formatarCnpj(editando.cnpj) : ""} obrigatorio maxLength={18} placeholder="00.000.000/0000-00" className="sm:col-span-2" ajuda="Numérico ou alfanumérico." />
            <Campo nome="legalName" rotulo="Razão social" valor={editando?.legalName} obrigatorio maxLength={200} className="sm:col-span-4" />
            <Campo nome="tradeName" rotulo="Nome fantasia" valor={editando?.tradeName} maxLength={200} className="sm:col-span-6" />
            <p className="secao sm:col-span-6">Contato</p>
            <Campo nome="contactName" rotulo="Nome" valor={editando?.contactName} maxLength={120} className="sm:col-span-2" />
            <Campo nome="contactEmail" rotulo="E-mail" type="email" valor={editando?.contactEmail} maxLength={160} className="sm:col-span-2" />
            <Campo nome="contactPhone" rotulo="Telefone" valor={editando?.contactPhone} maxLength={40} className="sm:col-span-2" />
            <p className="secao sm:col-span-6">Endereço</p>
            <Campo nome="zipCode" rotulo="CEP" valor={editando?.zipCode} maxLength={9} className="sm:col-span-2" />
            <Campo nome="street" rotulo="Logradouro" valor={editando?.street} maxLength={200} className="sm:col-span-3" />
            <Campo nome="number" rotulo="Número" valor={editando?.number} maxLength={20} className="sm:col-span-1" />
            <Campo nome="complement" rotulo="Complemento" valor={editando?.complement} maxLength={100} className="sm:col-span-2" />
            <Campo nome="district" rotulo="Bairro" valor={editando?.district} maxLength={100} className="sm:col-span-2" />
            <Campo nome="city" rotulo="Cidade" valor={editando?.city} maxLength={120} className="sm:col-span-1" />
            <Campo nome="state" rotulo="UF" valor={editando?.state} maxLength={2} className="sm:col-span-1" />
          </FormAcao>
        </Modal>
      )}
    </>
  );
}
