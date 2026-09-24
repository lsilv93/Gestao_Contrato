import { formatarCnpj } from "@/lib/formatos";
import type { OpcaoTransportadora } from "@/server/consultas/transportadoras";

/** Select de transportadora nos filtros (somente ADMIN). */
export function FiltroTransportadora({ opcoes, valor }: { opcoes: OpcaoTransportadora[]; valor?: string }) {
  return (
    <div>
      <label className="label" htmlFor="filtro-transportadora">Transportadora</label>
      <select id="filtro-transportadora" name="transportadora" defaultValue={valor ?? ""} className="input">
        <option value="">Todas</option>
        {opcoes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.tradeName || t.legalName} — {formatarCnpj(t.cnpj)}
          </option>
        ))}
      </select>
    </div>
  );
}

export const opcoesSelect = (opcoes: OpcaoTransportadora[]) =>
  opcoes.map((t) => ({ valor: t.id, rotulo: `${t.tradeName || t.legalName} — ${formatarCnpj(t.cnpj)}` }));
