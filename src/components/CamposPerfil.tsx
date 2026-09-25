"use client";

import { useState } from "react";

type Opcao = { cnpj: string; rotulo: string };

/**
 * Perfil do usuário + vínculo de CNPJ. Para "Cliente / Transportador" o
 * vínculo é obrigatório; para "ADM Geral" o campo some (acesso irrestrito).
 */
export function CamposPerfil({ perfil, cnpj, opcoes }: { perfil: "ADMIN" | "CLIENT"; cnpj?: string | null; opcoes: Opcao[] }) {
  const [atual, setAtual] = useState(perfil);
  return (
    <>
      <div>
        <label className="label" htmlFor="campo-role">Perfil de acesso *</label>
        <select id="campo-role" name="role" className="input" value={atual} onChange={(e) => setAtual(e.target.value as "ADMIN" | "CLIENT")}>
          <option value="CLIENT">Cliente / Transportador — somente leitura do próprio CNPJ</option>
          <option value="ADMIN">ADM Geral — acesso irrestrito</option>
        </select>
      </div>
      {atual === "CLIENT" ? (
        <div>
          <label className="label" htmlFor="campo-carrierCnpj">Transportador / CNPJ vinculado *</label>
          <select id="campo-carrierCnpj" name="carrierCnpj" className="input" defaultValue={cnpj ?? ""} required>
            <option value="" disabled>
              Selecione o transportador...
            </option>
            {opcoes.map((o) => (
              <option key={o.cnpj} value={o.cnpj}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-t3">O usuário verá somente os documentos e cobranças em aberto deste CNPJ, sem poder alterar nada.</p>
        </div>
      ) : (
        <p className="poco px-4 py-3 text-[11px] text-t3">ADM Geral: acesso a todos os transportadores, cadastros, edição e dados financeiros completos.</p>
      )}
    </>
  );
}
