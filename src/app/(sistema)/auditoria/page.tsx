import Link from "next/link";
import { Campo, Selecao } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { Cabecalho, Painel, StatusBadge, Tabela, Vazio } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { urlCom } from "@/lib/url";
import { requireAdmin } from "@/server/auth";
import { lerFiltroAuditoria, listarAuditoria, rotuloAcao, rotuloEntidade } from "@/server/consultas/auditoria";
import type { Params } from "@/server/consultas/filtros";
import { prisma } from "@/server/prisma";

export const metadata = { title: "Trilha de Auditoria" };
const BASE = "/auditoria";

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filtro = lerFiltroAuditoria(sp);
  const [{ total, itens, paginas }, usuarios] = await Promise.all([
    listarAuditoria(filtro),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Trilha de Auditoria"
        descricao="Registro imutável de toda inclusão, edição e exclusão: ID da ação (UUID), ID e nome do usuário, data/hora exata (ISO 8601), tipo de operação, entidade e ID afetado. O banco de dados bloqueia qualquer alteração ou exclusão destes registros."
      />

      <FormFiltro className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Selecao prefixo="filtro" nome="entidade" rotulo="Módulo" valor={filtro.entidade} vazio="Todos" opcoes={Object.entries(rotuloEntidade).map(([valor, rotulo]) => ({ valor, rotulo }))} />
        <Selecao prefixo="filtro" nome="acao" rotulo="Operação" valor={filtro.acao} vazio="Todas" opcoes={Object.entries(rotuloAcao).map(([valor, rotulo]) => ({ valor, rotulo }))} />
        <Selecao prefixo="filtro" nome="usuario" rotulo="Usuário" valor={filtro.usuarioId} vazio="Todos" opcoes={usuarios.map((u) => ({ valor: u.id, rotulo: `${u.name} (${u.email})` }))} />
        <Campo prefixo="filtro" nome="de" rotulo="De" type="date" valor={filtro.de} />
        <Campo prefixo="filtro" nome="ate" rotulo="Até" type="date" valor={filtro.ate} />
        <Campo prefixo="filtro" nome="registro" rotulo="ID do registro" valor={filtro.registro} placeholder="Enter para buscar" />
        <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
          <button className="btn-secondary btn-sm">Aplicar datas</button>
          <Link href={BASE} className="btn-secondary btn-sm">Limpar filtros</Link>
        </div>
      </FormFiltro>

      <Painel titulo={`Registros (${total})`} acoes={paginas > 1 && <Paginacao pagina={filtro.pagina} paginas={paginas} sp={sp} />}>
        {itens.length === 0 ? (
          <Vazio>Nenhum registro com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>ID da ação (UUID)</th>
                  <th>Usuário</th>
                  <th>Operação</th>
                  <th>Módulo</th>
                  <th>Registro</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td>
                      <p className="num">{formatarDataHora(a.timestamp)}</p>
                      <p className="num text-[10px] text-t4" title="Timestamp ISO 8601 (UTC)">{a.timestamp.toISOString()}</p>
                    </td>
                    <td className="num text-[10px] text-t4">{a.id}</td>
                    <td>
                      <p>{a.userName ?? <span className="text-t4">Sistema</span>}</p>
                      {a.userId && <p className="num text-[10px] text-t4">{a.userId}</p>}
                    </td>
                    <td><StatusBadge status={a.action} rotulo={rotuloAcao[a.action]} /></td>
                    <td>{rotuloEntidade[a.entityName] ?? a.entityName}</td>
                    <td>
                      {a.entityId ? (
                        <Link href={urlCom(BASE, {}, { entidade: a.entityName, registro: a.entityId })} className="num text-[10px] text-acento hover:underline">
                          {a.entityId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="!whitespace-normal">
                      {a.details ? (
                        <details>
                          <summary className="cursor-pointer text-[11px] text-acento">ver dados</summary>
                          <pre className="poco mt-2 max-h-72 max-w-[520px] overflow-auto whitespace-pre-wrap break-all p-3 text-[10px] text-t2">{JSON.stringify(a.details, null, 2)}</pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tabela>
        )}
      </Painel>
    </>
  );
}

function Paginacao({ pagina, paginas, sp }: { pagina: number; paginas: number; sp: Params }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-t3">
      {pagina > 1 && <Link className="btn-secondary btn-sm" href={urlCom(BASE, sp, { pagina: String(pagina - 1) })}>Anterior</Link>}
      Página {pagina} de {paginas}
      {pagina < paginas && <Link className="btn-secondary btn-sm" href={urlCom(BASE, sp, { pagina: String(pagina + 1) })}>Próxima</Link>}
    </div>
  );
}
