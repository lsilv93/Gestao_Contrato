import clsx from "clsx";

/**
 * Símbolo L&K: cápsula farmacêutica inclinada (metade cheia, metade contorno)
 * com linhas de movimento — farmácia + logística, em traço único (currentColor).
 */
export function SimboloLK({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <g transform="rotate(-35 17 14)">
        <path d="M17 9h-5.5a5 5 0 0 0 0 10H17z" fill="currentColor" />
        <path d="M17 9h5.5a5 5 0 0 1 0 10H17" stroke="currentColor" strokeWidth="2" />
        <path d="M17 8.4v11.2" stroke="currentColor" strokeWidth="1.2" />
      </g>
      <path d="M2.5 24.5h6M5 28.5h7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

/** Selo lima com o símbolo em tinta escura. */
export function SeloLK({ tamanho = "md", className }: { tamanho?: "sm" | "md" | "lg"; className?: string }) {
  const t = {
    sm: "h-9 w-9 rounded-2xl [&_svg]:h-5 [&_svg]:w-5",
    md: "h-11 w-11 rounded-2xl [&_svg]:h-6 [&_svg]:w-6",
    lg: "h-16 w-16 rounded-[22px] [&_svg]:h-9 [&_svg]:w-9",
  }[tamanho];
  return (
    <span className={clsx("fill-acento flex flex-none items-center justify-center", t, className)}>
      <SimboloLK />
    </span>
  );
}

/** Logotipo "L&K": letras firmes com o "&" leve em acento. */
export function LogotipoLK({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-baseline font-extrabold leading-none tracking-[-0.04em] text-t1", className)}>
      L<span className="mx-[0.04em] font-light text-acento">&amp;</span>K
    </span>
  );
}

/** Marca completa: selo + logotipo + complemento. */
export function MarcaLK({ complemento }: { complemento: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <SeloLK />
      <div className="min-w-0">
        <LogotipoLK className="text-[19px]" />
        <div className="mt-1 leading-tight">{complemento}</div>
      </div>
    </div>
  );
}
