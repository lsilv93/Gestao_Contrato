import Link from "next/link";
import { Plus } from "lucide-react";
import { alternarUsuario, salvarUsuario } from "@/actions/usuarios";
import { BotaoEditar } from "@/components/Acoes";
import { Campo, Selecao, Voltar } from "@/components/Campos";
import { FormAcao } from "@/components/FormAcao";
import { Modal } from "@/components/Modal";
import { BannerOk, Cabecalho, Painel, StatusBadge, Tabela } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { formatarCnpj } from "@/lib/formatos";
import { urlCom } from "@/lib/url";
import { requireAdmin } from "@/server/auth";
import { nomeCarrier, param, type Params } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";
import { prisma } from "@/server/prisma";

export const metadata = { title: "Usuários & Acessos" };
const BASE = "/usuarios";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const editarId = param(sp, "editar");
  const novo = param(sp, "novo") === "1";
  const [lista, transportadoras, editando] = await Promise.all([
    prisma.user.findMany({ include: { carrier: { select: { legalName: true, tradeName: true, cnpj: true } } }, orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] }),
    opcoesTransportadoras(),
    editarId ? prisma.user.findUnique({ where: { id: editarId } }) : null,
  ]);
  const aqui = urlCom(BASE, sp);

  return (
    <>
      <Cabecalho titulo="Usuários & Acessos" descricao="Administradores da consultoria e acessos de clientes (somente leitura, restritos ao CNPJ vinculado).">
        <Link href={urlCom(BASE, sp, { novo: "1" })} className="btn-primary" scroll={false}>
          <Plus className="h-4 w-4" /> Novo acesso
        </Link>
      </Cabecalho>
      <BannerOk mensagem={param(sp, "ok")} />

      <Painel titulo={`Usuários (${lista.length})`}>
        <Tabela>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>CNPJ vinculado</th>
                <th>Situação</th>
                <th>Criado em</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className={u.active ? undefined : "opacity-60"}>
                  <td className="font-medium text-t1">{u.name}</td>
                  <td>{u.email}</td>
                  <td><StatusBadge status={u.role} rotulo={u.role === "ADMIN" ? "Administrador" : "Cliente"} /></td>
                  <td>
                    {u.carrier ? (
                      <>
                        <p className="num">{formatarCnpj(u.carrier.cnpj)}</p>
                        <p className="text-[10px] text-t4">{nomeCarrier(u.carrier)}</p>
                      </>
                    ) : (
                      <span className="text-t4">—</span>
                    )}
                  </td>
                  <td><StatusBadge status={u.active ? "SIM" : "NAO"} rotulo={u.active ? "Ativo" : "Inativo"} /></td>
                  <td className="num">{formatarDataHora(u.createdAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <BotaoEditar href={urlCom(BASE, sp, { editar: u.id })} />
                      {u.id !== admin.id && (
                        <FormAcao acao={alternarUsuario} className="inline" botao={u.active ? "Inativar" : "Ativar"} classeBotao={u.active ? "btn-danger btn-sm" : "btn-secondary btn-sm"}>
                          <input type="hidden" name="id" value={u.id} />
                          <Voltar href={aqui} />
                        </FormAcao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabela>
      </Painel>

      {(novo || editando) && (
        <Modal titulo={editando ? `Editar ${editando.email}` : "Novo acesso"} descricao="Clientes enxergam somente os contratos, licenças, manuais e NFs do CNPJ vinculado, sem poder alterar nada." fecharHref={aqui}>
          <FormAcao acao={salvarUsuario} botao={editando ? "Salvar alterações" : "Criar acesso"} limpar={false}>
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Voltar href={aqui} />
            <Campo nome="name" rotulo="Nome completo" valor={editando?.name} obrigatorio maxLength={120} />
            <Campo nome="email" rotulo="E-mail (login)" type="email" valor={editando?.email} obrigatorio maxLength={160} autoComplete="off" />
            <Selecao
              nome="role"
              rotulo="Perfil"
              valor={editando?.role ?? "CLIENT"}
              obrigatorio
              opcoes={[
                { valor: "CLIENT", rotulo: "Cliente (Transportadora) — somente leitura" },
                { valor: "ADMIN", rotulo: "Administrador (Consultoria) — acesso total" },
              ]}
            />
            <Selecao
              nome="carrierCnpj"
              rotulo="CNPJ vinculado"
              valor={editando?.carrierCnpj}
              vazio="Nenhum (somente Administrador)"
              opcoes={transportadoras.map((t) => ({ valor: t.cnpj, rotulo: `${formatarCnpj(t.cnpj)} — ${nomeCarrier(t)}` }))}
              ajuda="Obrigatório para Cliente."
            />
            <Campo nome="senha" rotulo={editando ? "Nova senha (em branco mantém a atual)" : "Senha inicial"} obrigatorio={!editando} type="password" minLength={6} autoComplete="new-password" />
          </FormAcao>
        </Modal>
      )}
    </>
  );
}
