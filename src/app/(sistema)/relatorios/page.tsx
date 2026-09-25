import Link from "next/link";
import clsx from "clsx";
import { FileSpreadsheet, ShieldCheck, ReceiptText } from "lucide-react";
import { Campo, Selecao } from "@/components/Campos";
import { FormFiltro } from "@/components/Filtros";
import { Cabecalho, Painel, Tabela, Vazio } from "@/components/ui";
import { formatarData } from "@/lib/datas";
import { descreverFiltros } from "@/lib/filtroRelatorio";
import { formatarCnpj, formatarMoeda, formatarNumero } from "@/lib/formatos";
import { ehAdmin, requireUsuario } from "@/server/auth";
import type { Params } from "@/server/consultas/filtros";
import { opcoesTransportadoras } from "@/server/consultas/transportadoras";
import { corStatus, gerarRelatorio, lerFiltroRelatorio, STATUS, tiposPermitidos, type Coluna, type Valor } from "@/server/relatorios";

export const metadata = { title: "Relatórios" };
const LIMITE_TELA = 300;

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requireUsuario();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;
  const f = lerFiltroRelatorio(sp, usuario);
  const [r, transportadoras] = await Promise.all([gerarRelatorio(usuario, f), admin ? opcoesTransportadoras({ inativas: true }) : []]);
  const tipos = tiposPermitidos(usuario);

  // mesmos filtros na URL de exportação
  const q = new URLSearchParams();
  q.set("tipo", f.tipo);
  if (f.de) q.set("de", f.de);
  if (f.ate) q.set("ate", f.ate);
  if (f.status) q.set("status", f.status);
  f.transportadoras.forEach((t) => q.append("transportadora", t));
  const nomesSel = transportadoras.filter((t) => f.transportadoras.includes(t.id)).map((t) => t.tradeName || t.legalName);

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        descricao={admin ? "Monte o relatório com os filtros e exporte para Excel exatamente o que está na tela." : `Relatórios de ${usuario.carrier?.nome}. Exporte para Excel exatamente o que está na tela.`}
      >
        <a href={`/api/relatorios/exportar?${q.toString()}`} className="btn-primary">
          <FileSpreadsheet className="h-4 w-4" /> Exportar para Excel (.xlsx)
        </a>
      </Cabecalho>

      {/* modelos principais */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {[
          { tipo: "COMPLIANCE", icone: ShieldCheck, titulo: "Relatório Geral de Compliance Sanitário", texto: "Licença ANVISA, validade e versão do Manual de Boas Práticas por transportadora." },
          { tipo: "FINANCEIRO", icone: ReceiptText, titulo: admin ? "Relatório de Faturamento & Cobranças" : "Relatório de Cobranças em Aberto", texto: admin ? "NF, tipo de contrato, valor, vencimento, pagamento, status e dias em atraso." : "NFs em aberto ou em atraso, com vencimento e dias em atraso." },
        ].map((m) => (
          <Link key={m.tipo} href={`/relatorios?tipo=${m.tipo}`} className={clsx("card-sm flex items-start gap-4 p-5", f.tipo === m.tipo && "ring-2 ring-acento/60")}>
            <span className="poco flex h-11 w-11 flex-none items-center justify-center !rounded-2xl text-acento">
              <m.icone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-t1">{m.titulo}</span>
              <span className="mt-1 block text-[11px] leading-snug text-t3">{m.texto}</span>
            </span>
          </Link>
        ))}
      </div>

      <FormFiltro className="card mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Selecao prefixo="filtro" nome="tipo" rotulo="Tipo de relatório" valor={f.tipo} opcoes={tipos.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))} />
        <Campo prefixo="filtro" nome="de" rotulo="Data inicial" type="date" valor={f.de} />
        <Campo prefixo="filtro" nome="ate" rotulo="Data final" type="date" valor={f.ate} />
        <Selecao prefixo="filtro" nome="status" rotulo="Status" valor={f.status} vazio="Todos" opcoes={STATUS.filter((s) => admin || s.valor !== "PAGO").map((s) => ({ valor: s.valor, rotulo: s.rotulo }))} />
        {admin && (
          <fieldset className="sm:col-span-2 lg:col-span-4">
            <legend className="label">Transportadoras (nenhuma marcada = todas)</legend>
            <div className="poco grid max-h-48 gap-1 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
              {transportadoras.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-acento/5">
                  <input type="checkbox" name="transportadora" value={t.id} defaultChecked={f.transportadoras.includes(t.id)} />
                  <span className="min-w-0 text-[12px] text-t2">
                    <span className="block truncate font-medium text-t1">{t.tradeName || t.legalName}</span>
                    <span className="num text-[10px] text-t4">{formatarCnpj(t.cnpj)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button className="btn-secondary">Aplicar filtros</button>
          <Link href={`/relatorios?tipo=${f.tipo}`} className="btn-secondary">Limpar filtros</Link>
          <p className="text-[11px] text-t3">{descreverFiltros(f, { transportadoras: admin ? nomesSel.join(", ") || undefined : usuario.carrier?.nome, status: STATUS.find((s) => s.valor === f.status)?.rotulo })}</p>
        </div>
      </FormFiltro>

      <Painel titulo={`${r.titulo} (${formatarNumero(r.linhas.length)})`}>
        {r.avisos.map((a) => (
          <p key={a} className="poco-ouro mb-4 px-4 py-3 text-[12px] text-t2">{a}</p>
        ))}
        {r.linhas.length === 0 ? (
          <Vazio>Nenhum registro encontrado com os filtros atuais.</Vazio>
        ) : (
          <Tabela>
            <table className="tabela">
              <thead>
                <tr>
                  {r.colunas.map((c) => (
                    <th key={c.chave} className={clsx((c.tipo === "moeda" || c.tipo === "numero") && "!text-right")}>{c.titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.linhas.slice(0, LIMITE_TELA).map((l, i) => (
                  <tr key={i}>
                    {r.colunas.map((c) => (
                      <Celula key={c.chave} coluna={c} valor={l[c.chave]} />
                    ))}
                  </tr>
                ))}
                {r.totais && (
                  <tr className="font-semibold">
                    {r.colunas.map((c) => (
                      <Celula key={c.chave} coluna={c} valor={r.totais![c.chave] ?? null} total />
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </Tabela>
        )}
        {r.linhas.length > LIMITE_TELA && (
          <p className="mt-3 text-[11px] text-t3">Mostrando {LIMITE_TELA} de {formatarNumero(r.linhas.length)} linhas na tela — o Excel traz todas.</p>
        )}
      </Painel>
    </>
  );
}

function Celula({ coluna, valor, total }: { coluna: Coluna; valor: Valor | undefined; total?: boolean }) {
  const v = valor ?? null;
  const direita = coluna.tipo === "moeda" || coluna.tipo === "numero";
  let texto: string;
  if (v === null || v === "") texto = total ? "" : "—";
  else if (coluna.tipo === "moeda") texto = formatarMoeda(Number(v));
  else if (coluna.tipo === "data") texto = formatarData(v as Date);
  else if (coluna.tipo === "numero") texto = formatarNumero(Number(v));
  else texto = String(v);
  const cor = coluna.tipo === "status" ? corStatus(v) : null;
  return (
    <td className={clsx(direita && "num text-right", coluna.tipo === "data" && "num", total && "text-t1", cor === "erro" && "font-semibold text-erro", cor === "ouro" && "font-semibold text-ouro", cor === "ok" && "font-semibold text-ok")}>
      {texto}
    </td>
  );
}
