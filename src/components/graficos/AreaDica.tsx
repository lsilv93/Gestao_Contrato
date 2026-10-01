"use client";

import { useRef, useState } from "react";

/** Conteúdo de uma dica (tooltip): título + linhas "rótulo · valor" com a cor da série. */
export type Dica = { t: string; l: [rotulo: string, valor: string, cor?: string][] };

/**
 * Camada de hover/foco dos gráficos: qualquer elemento com `data-dica` (JSON de
 * `Dica`) mostra a dica ao passar o mouse ou focar pelo teclado. Os gráficos em
 * si são renderizados no servidor (leves); só esta camada roda no navegador.
 */
export function AreaDica({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dica, setDica] = useState<(Dica & { x: number; y: number }) | null>(null);

  function mostrar(alvo: EventTarget | null, x?: number, y?: number) {
    const el = (alvo as Element | null)?.closest?.("[data-dica]") as HTMLElement | null;
    const caixa = ref.current?.getBoundingClientRect();
    if (!el || !caixa) return setDica(null);
    let d: Dica;
    try {
      d = JSON.parse(el.dataset.dica ?? "");
    } catch {
      return setDica(null);
    }
    const r = el.getBoundingClientRect();
    setDica({ ...d, x: (x ?? r.left + r.width / 2) - caixa.left, y: (y ?? r.top) - caixa.top });
  }

  const largura = ref.current?.clientWidth ?? 0;
  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onPointerMove={(e) => mostrar(e.target, e.clientX, e.clientY)}
      onPointerLeave={() => setDica(null)}
      onFocus={(e) => mostrar(e.target)}
      onBlur={() => setDica(null)}
    >
      {children}
      {dica && (
        <div
          role="tooltip"
          className="dica-grafico pointer-events-none absolute z-20 min-w-[150px] px-3 py-2"
          style={{
            left: Math.min(Math.max(dica.x + 14, 4), Math.max(4, largura - 190)),
            top: Math.max(dica.y - 12, 0),
            transform: "translateY(-100%)",
          }}
        >
          <p className="mb-1 text-[11px] font-semibold text-t2">{dica.t}</p>
          {dica.l.map(([rotulo, valor, cor]) => (
            <p key={rotulo} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-t3">
                {cor && <span className="inline-block h-[2px] w-3 rounded" style={{ background: cor }} />}
                {rotulo}
              </span>
              <b className="num text-t1">{valor}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
