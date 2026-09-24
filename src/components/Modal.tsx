"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";

/**
 * Modal controlado pela URL (?novo=1, ?editar=id, ?pagar=id, ?renovar=id...):
 * o servidor decide se ele aparece; fechar volta para `fecharHref`.
 */
export function Modal({
  titulo,
  descricao,
  fecharHref,
  largo,
  children,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  fecharHref: string;
  largo?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const fechar = () => router.replace(fecharHref, { scroll: false });

  return (
    <dialog
      ref={ref}
      className={clsx("modal", largo && "modal-largo")}
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) fechar(); // clique no fundo
      }}
    >
      <div className="max-h-[calc(100vh-28px)] overflow-y-auto p-6 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-t1">{titulo}</h2>
            {descricao && <p className="mt-1 text-[12px] leading-relaxed text-t3">{descricao}</p>}
          </div>
          <button type="button" className="btn-icone flex-none" onClick={fechar} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
