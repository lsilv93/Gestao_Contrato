"use client";

import { useState } from "react";
import type { DocumentType } from "@prisma/client";
import { Infinity as Indeterminado } from "lucide-react";
import { SEM_VALIDADE, TIPOS_DOCUMENTO, rotuloCategoriaDocumento, tiposDaCategoria, validadeOpcional } from "@/domain/tiposDocumento";

/**
 * Tipo do documento + data de validade com validação dinâmica:
 * AFE / AE → validade opcional ("Sem Validade / Indeterminado" quando vazia);
 * demais tipos → validade obrigatória. O servidor repete a mesma regra
 * (src/actions/licencas.ts) e o banco tem um CHECK equivalente.
 */
export function CamposDocumento({
  tipo,
  validade,
  rotuloValidade = "Data de validade",
}: {
  tipo?: DocumentType | null;
  validade?: string;
  rotuloValidade?: string;
}) {
  const [atual, setAtual] = useState<DocumentType | "">(tipo ?? "");
  const [data, setData] = useState(validade ?? "");
  const opcional = validadeOpcional(atual || null);
  const obrigatoria = !!atual && !opcional;

  return (
    <>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="campo-documentType">
          Tipo de documento *
        </label>
        <select
          id="campo-documentType"
          name="documentType"
          required
          className="input"
          value={atual}
          onChange={(e) => setAtual(e.target.value as DocumentType | "")}
        >
          <option value="">Selecione...</option>
          {(["LICENCA", "DOCUMENTO"] as const).map((c) => (
            <optgroup key={c} label={rotuloCategoriaDocumento[c].toUpperCase()}>
              {tiposDaCategoria(c).map((t) => (
                <option key={t} value={t}>
                  {TIPOS_DOCUMENTO[t].rotulo}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {tipo === null && <p className="mt-1.5 text-[11px] text-ouro">Registro sem tipo: classifique o documento para salvar.</p>}
      </div>
      <div>
        <label className="label" htmlFor="campo-expirationDate">
          {rotuloValidade}
          {obrigatoria && " *"}
          {opcional && <span className="font-normal normal-case text-t4"> (opcional)</span>}
        </label>
        <input
          id="campo-expirationDate"
          name="expirationDate"
          type="date"
          className="input"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required={!opcional}
          aria-describedby="ajuda-validade"
        />
        <p id="ajuda-validade" className="mt-1.5 text-[11px] text-t3">
          {opcional ? (
            data ? (
              "Validade informada: o farol de vencimento será acompanhado."
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-acento">
                <Indeterminado className="h-3.5 w-3.5" /> {SEM_VALIDADE}
              </span>
            )
          ) : atual ? (
            "Obrigatória: aciona os faróis de vencimento."
          ) : (
            "Obrigatória, exceto para AFE e AE (prazo indeterminado)."
          )}
        </p>
      </div>
    </>
  );
}
