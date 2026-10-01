// Gráficos do dashboard em HTML/CSS puro (renderizados no servidor): leves,
// nítidos em qualquer largura e com as cores do tema (variáveis --viz-*).
// Regras: barras finas (<= 24px) com ponta arredondada de 4px e base reta,
// 2px de espaço entre segmentos, grade em linha fina, legenda sempre que há
// 2+ séries, rótulos diretos só onde importam e tabela de dados para acessibilidade.
import Link from "next/link";
import clsx from "clsx";
import { AreaDica, type Dica } from "./AreaDica";

export type Serie = { chave: string; rotulo: string; cor: string };

/** Cores validadas (daltonismo, contraste) nos dois temas — definidas em globals.css. */
export const COR = {
  ok: "var(--viz-ok)",
  alerta: "var(--viz-alerta)",
  critico: "var(--viz-critico)",
  serie: "var(--viz-serie)",
} as const;

const dica = (d: Dica) => JSON.stringify(d);

/** Topo "redondo" da escala e 4 marcações (0, 25%, 50%, 75%, 100%). */
function escala(max: number) {
  if (max <= 0) return { topo: 1, marcas: [0] };
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot;
  return { topo: passo * 4, marcas: [0, 1, 2, 3, 4].map((i) => i * passo) };
}

export function Legenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null; // série única: o título já diz o que é
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-t3" aria-label="Legenda">
      {series.map((s) => (
        <li key={s.chave} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.cor }} />
          {s.rotulo}
        </li>
      ))}
    </ul>
  );
}

/** Tabela com os mesmos números do gráfico (acesso sem mouse/cor). */
function TabelaDados({ cabecalho, linhas }: { cabecalho: string[]; linhas: (string | number)[][] }) {
  return (
    <details className="mt-3 text-[11px] text-t3">
      <summary className="cursor-pointer select-none hover:text-t1">Ver tabela</summary>
      <div className="poco mt-2 overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              {cabecalho.map((c, i) => (
                <th key={c} className={i ? "!text-right" : undefined}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={String(l[0])}>
                {l.map((v, i) => (
                  <td key={i} className={i ? "num text-right" : undefined}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Colunas empilhadas no tempo (ex.: faturamento mensal por situação).
 * A coluna inteira é o alvo do hover/foco; a dica lista todas as séries do mês.
 */
export function ColunasEmpilhadas({
  categorias,
  series,
  valores,
  formatar,
  formatarEixo,
  altura = 180,
  destaque,
}: {
  /** rótulo curto no eixo (ex.: "Out"), ano opcional numa 2ª linha e o texto completo da dica */
  categorias: { chave: string; rotulo: string; ano?: string; detalhe: string }[];
  series: Serie[];
  /** valores[i][s] = valor da série s na categoria i */
  valores: number[][];
  formatar: (n: number) => string;
  formatarEixo: (n: number) => string;
  altura?: number;
  /** índice da coluna com rótulo direto do total (ex.: mês atual) */
  destaque?: number;
}) {
  const totais = valores.map((v) => v.reduce((a, b) => a + b, 0));
  const { topo, marcas } = escala(Math.max(...totais, 0));
  const px = (v: number) => (v / topo) * altura;
  return (
    <div>
      <Legenda series={series} />
      {/* espaço acima da escala: o rótulo do topo não encosta na legenda */}
      <AreaDica className="mt-7">
        <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-x-2">
          {/* eixo Y */}
          <div className="relative text-right" style={{ height: altura }} aria-hidden>
            {marcas.map((m) => (
              <span key={m} className="num absolute right-0 -translate-y-1/2 whitespace-nowrap text-[10px] text-t4" style={{ bottom: px(m) }}>
                {formatarEixo(m)}
              </span>
            ))}
          </div>
          {/* área do gráfico */}
          <div className="relative" style={{ height: altura }}>
            {marcas.map((m) => (
              <div key={m} className="absolute inset-x-0 border-t" style={{ bottom: px(m), borderColor: "var(--viz-grade)" }} aria-hidden />
            ))}
            <div className="absolute inset-0 flex items-end">
              {categorias.map((c, i) => {
                const segs = series.map((s, j) => ({ s, v: valores[i][j] })).filter((x) => x.v > 0);
                return (
                  <div
                    key={c.chave}
                    tabIndex={0}
                    role="img"
                    aria-label={`${c.detalhe}: ${series.map((s, j) => `${s.rotulo} ${formatar(valores[i][j])}`).join(", ")}`}
                    data-dica={dica({ t: c.detalhe, l: [...series.map((s, j) => [s.rotulo, formatar(valores[i][j]), s.cor] as [string, string, string]), ["Total", formatar(totais[i])]] })}
                    className="coluna-grafico relative flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none"
                  >
                    {destaque === i && totais[i] > 0 && (
                      <span className="num mb-1 whitespace-nowrap text-[10px] font-semibold text-t2">{formatarEixo(totais[i])}</span>
                    )}
                    {/* empilha de baixo para cima: 1ª série na base */}
                    <div className="flex w-[60%] max-w-[24px] flex-col-reverse">
                      {segs.map(({ s, v }, k) => (
                        <div
                          key={s.chave}
                          className={clsx(k === segs.length - 1 && "rounded-t-[4px]")}
                          style={{ height: Math.max(1, px(v) - (k ? 2 : 0)), marginBottom: k ? 2 : 0, background: s.cor }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* eixo X */}
          <div />
          <div className="mt-1.5 flex" aria-hidden>
            {categorias.map((c) => (
              <span key={c.chave} className="min-w-0 flex-1 whitespace-nowrap text-center text-[10px] leading-tight text-t4">
                {c.rotulo}
                {c.ano && <span className="block text-[9px]">{c.ano}</span>}
              </span>
            ))}
          </div>
        </div>
      </AreaDica>
      <TabelaDados
        cabecalho={["Período", ...series.map((s) => s.rotulo), "Total"]}
        linhas={categorias.map((c, i) => [c.detalhe, ...valores[i].map(formatar), formatar(totais[i])])}
      />
    </div>
  );
}

/**
 * Barras horizontais empilhadas — uma linha por item (ex.: conformidade por
 * área, em % do total; ou valor em aberto por transportadora, em R$).
 */
export function BarrasEmpilhadas({
  linhas,
  series,
  formatar,
  modo = "percentual",
  resumo,
  vazio = "Sem dados",
}: {
  linhas: { chave: string; rotulo: string; sub?: string; valores: number[]; href?: string }[];
  series: Serie[];
  formatar: (n: number) => string;
  /** percentual: cada linha soma 100%; valor: escala comum (maior total = 100%) */
  modo?: "percentual" | "valor";
  /** texto à direita de cada linha (ex.: "75% em dia") */
  resumo?: (valores: number[], total: number) => string;
  vazio?: string;
}) {
  const totais = linhas.map((l) => l.valores.reduce((a, b) => a + b, 0));
  const maior = Math.max(...totais, 0);
  return (
    <div>
      <Legenda series={series} />
      <AreaDica className="mt-4 space-y-3.5">
        {linhas.map((l, i) => {
          const total = totais[i];
          const base = modo === "percentual" ? total : maior;
          const segs = series.map((s, j) => ({ s, v: l.valores[j] })).filter((x) => x.v > 0);
          const conteudo = (
            <>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[12px] font-medium text-t1">
                  {l.rotulo}
                  {l.sub && <span className="ml-1.5 text-[10px] font-normal text-t4">{l.sub}</span>}
                </span>
                <span className="num flex-none text-[11px] text-t2">{total ? (resumo ? resumo(l.valores, total) : formatar(total)) : vazio}</span>
              </div>
              <div className="flex h-[14px] w-full gap-[2px] overflow-hidden rounded-r-[4px]" style={{ background: total ? undefined : "var(--viz-grade)" }}>
                {segs.map(({ s, v }, k) => (
                  <div
                    key={s.chave}
                    className={clsx("h-full", k === segs.length - 1 && "rounded-r-[4px]")}
                    style={{ width: `${(v / (base || 1)) * 100}%`, minWidth: 3, background: s.cor }}
                  />
                ))}
              </div>
            </>
          );
          const props = {
            tabIndex: l.href ? undefined : 0,
            "data-dica": dica({
              t: l.rotulo,
              l: [
                ...series.map((s, j) => [s.rotulo, modo === "percentual" ? `${l.valores[j]} (${total ? Math.round((l.valores[j] / total) * 100) : 0}%)` : formatar(l.valores[j]), s.cor] as [string, string, string]),
                ["Total", modo === "percentual" ? String(total) : formatar(total)],
              ],
            }),
            className: "barra-grafico block rounded-xl px-2 py-1.5 -mx-2 outline-none",
          };
          return l.href ? (
            <Link key={l.chave} href={l.href} {...props}>
              {conteudo}
            </Link>
          ) : (
            <div key={l.chave} {...props}>
              {conteudo}
            </div>
          );
        })}
      </AreaDica>
      <TabelaDados
        cabecalho={["", ...series.map((s) => s.rotulo), "Total"]}
        linhas={linhas.map((l, i) => [l.rotulo, ...l.valores.map((v) => (modo === "percentual" ? v : formatar(v))), modo === "percentual" ? totais[i] : formatar(totais[i])])}
      />
    </div>
  );
}

/** Medidor simples (meta x realizado) com a trilha num tom mais claro da mesma cor. */
export function Medidor({ valor, cor = COR.ok, rotulo }: { valor: number; cor?: string; rotulo: string }) {
  const pct = Math.max(0, Math.min(1, valor));
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={rotulo} className="relative mt-2 h-[6px] w-full overflow-hidden rounded-full">
      <div className="absolute inset-0 opacity-20" style={{ background: cor }} />
      <div className="absolute inset-y-0 left-0 rounded-r-full" style={{ width: `${pct * 100}%`, background: cor }} />
    </div>
  );
}
