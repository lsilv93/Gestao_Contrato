"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { confirmarAviso } from "@/actions/auth";

/**
 * Pop-up de aviso de pendência financeira (exibido após o login do cliente).
 * Só fecha pelo botão "OK / Ciente", que libera o uso normal (somente leitura).
 */
export function AvisoPendencias({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal modal-largo" aria-labelledby="aviso-titulo" onCancel={(e) => e.preventDefault()}>
      <div className="max-h-[calc(100vh-28px)] overflow-y-auto p-6 sm:p-7">
        <div className="mb-5 flex items-start gap-4">
          <span className="poco flex h-11 w-11 flex-none items-center justify-center !rounded-2xl text-ouro">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 id="aviso-titulo" className="text-[16px] font-semibold text-t1">Aviso de pendência financeira</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-t3">
              Há notas fiscais em aberto para a sua empresa. Faturas vencidas há mais de 30 dias suspendem o acesso ao sistema.
            </p>
          </div>
        </div>
        {children}
        <form action={confirmarAviso} className="mt-5">
          <button className="btn-primary w-full">OK / Ciente</button>
        </form>
      </div>
    </dialog>
  );
}
