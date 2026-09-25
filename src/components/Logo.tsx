import clsx from "clsx";

/**
 * Símbolo L&K: caminhão-baú com a cruz farmacêutica na carroceria
 * (transporte + saúde), em tinta #000E19 sobre o selo lima.
 */
export function SimboloLK({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      {/* carroceria (baú) */}
      <rect x="3" y="8.5" width="16" height="12.5" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* cruz farmacêutica */}
      <path d="M11 11.6v6.4M7.8 14.8h6.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* cabine */}
      <path d="M19 12.5h4.6c.6 0 1.1.3 1.4.8l2.3 3.6c.2.3.2.6.2.9V21H19" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M21.5 14.8h2.3l1.5 2.4h-3.8z" fill="currentColor" />
      {/* rodas */}
      <circle cx="8.5" cy="23.2" r="2.3" fill="currentColor" />
      <circle cx="23" cy="23.2" r="2.3" fill="currentColor" />
    </svg>
  );
}

/** Selo (quadrado arredondado lima) com o símbolo. */
export function SeloLK({ tamanho = "md", className }: { tamanho?: "sm" | "md" | "lg"; className?: string }) {
  const t = { sm: "h-9 w-9 rounded-2xl [&_svg]:h-5 [&_svg]:w-5", md: "h-10 w-10 rounded-2xl [&_svg]:h-6 [&_svg]:w-6", lg: "h-16 w-16 rounded-[20px] [&_svg]:h-9 [&_svg]:w-9" }[tamanho];
  return (
    <span className={clsx("fill-acento flex flex-none items-center justify-center", t, className)}>
      <SimboloLK />
    </span>
  );
}

/** Marca completa: selo + "L&K" em destaque + complemento. */
export function MarcaLK({ complemento, tamanho = "md" }: { complemento: React.ReactNode; tamanho?: "md" | "lg" }) {
  return (
    <div className={clsx("flex items-center", tamanho === "lg" ? "gap-4" : "gap-3")}>
      <SeloLK tamanho={tamanho === "lg" ? "lg" : "md"} />
      <div className="min-w-0 text-left">
        <p className={clsx("font-bold leading-none tracking-tight text-acento", tamanho === "lg" ? "text-[26px]" : "text-[15px]")}>
          L<span className="text-t1">&amp;</span>K
        </p>
        <div className={clsx("mt-1 leading-tight", tamanho === "lg" ? "text-[13px]" : "text-[11px]")}>{complemento}</div>
      </div>
    </div>
  );
}
