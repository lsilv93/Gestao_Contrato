import { Download } from "lucide-react";
import clsx from "clsx";
import { formatarData, paraData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formatos";
import type { Pendencia } from "@/server/pendencias";

/** Tabela de pendências (NF, valor, vencimento, dias em atraso, download da NF). */
export function TabelaPendencias({ itens }: { itens: Pendencia[] }) {
  return (
    <div className="poco overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>NF</th>
            <th className="!text-right">Valor</th>
            <th>Vencimento</th>
            <th>Atraso</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.id}>
              <td className="num font-semibold text-t1">{p.invoiceNumber}</td>
              <td className="num text-right text-t1">{formatarMoeda(p.amount)}</td>
              <td className="num">{formatarData(paraData(p.dueDate))}</td>
              <td className={clsx("num font-semibold", p.diasAtraso > 30 ? "text-erro" : p.diasAtraso > 0 ? "text-ouro" : "text-t3")}>
                {p.diasAtraso > 0 ? `${p.diasAtraso} dia(s)` : "no prazo"}
              </td>
              <td className="text-right">
                {p.arquivo ? (
                  <a href={`/api/arquivos/${p.arquivo.id}`} className="btn-primary btn-sm" download={p.arquivo.fileName}>
                    <Download className="h-3.5 w-3.5" /> Baixar NF
                  </a>
                ) : (
                  <span className="text-[11px] text-t4">PDF não anexado</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
