import clsx from "clsx";

/** Cores da marca L&K (azul-petróleo e verde-menta). */
export const MARCA = { petroleo: "#0B3A4A", menta: "#2EDCB0", claro: "#EAF7F4" } as const;

/**
 * Monograma L&K: L baixo + K alto; o topo das duas letras desenha a diagonal
 * que sobe para a direita (triângulo oculto: consultoria, cliente e ANVISA),
 * com o "+" farmacêutico dentro e os braços do K avançando como movimento.
 * `mono`: tudo em currentColor (ex.: dentro de botões).
 */
export function SimboloLK({ className, tinta = MARCA.claro, mono = false, style }: { className?: string; tinta?: string; mono?: boolean; style?: React.CSSProperties }) {
  const menta = mono ? "currentColor" : MARCA.menta;
  const traco = mono ? "currentColor" : tinta;
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden fill="none">
      {!mono && <path d="M16 96V50L66 18V96Z" fill={MARCA.menta} opacity=".2" />}
      <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={mono ? 12 : 10}>
        <path d="M16 50V96H50M66 18V96" stroke={traco} />
        <path d="M66 62L98 30M77 73L98 96" stroke={menta} />
      </g>
      {!mono && <path d="M36 64v14M29 71h14" stroke={menta} strokeWidth="5" strokeLinecap="round" />}
    </svg>
  );
}

/** Selo azul-petróleo com o monograma nas cores da marca. */
export function SeloLK({ tamanho = "md", className }: { tamanho?: "sm" | "md" | "lg"; className?: string }) {
  const t = {
    sm: "h-9 w-9 rounded-xl [&_svg]:h-6 [&_svg]:w-6",
    md: "h-11 w-11 rounded-2xl [&_svg]:h-7 [&_svg]:w-7",
    lg: "h-[72px] w-[72px] rounded-[22px] [&_svg]:h-12 [&_svg]:w-12",
  }[tamanho];
  return (
    <span
      className={clsx("flex flex-none items-center justify-center", t, className)}
      style={{ background: "linear-gradient(150deg, #0F4A5D 0%, #082C38 100%)", boxShadow: "var(--sombra-xs)" }}
    >
      <SimboloLK className="translate-x-[1px]" />
    </span>
  );
}

/** Logotipo "L&K" (Montserrat 800) com o "&" em menta. */
export function LogotipoLK({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-baseline font-marca font-extrabold leading-none tracking-[0.045em] text-t1", className)}>
      L<span style={{ color: MARCA.menta }}>&amp;</span>K
    </span>
  );
}

/** Assinatura completa (login): selo + L&K ASSESSORIA FARMACÊUTICA + fio + subtítulo. */
export function AssinaturaLK() {
  return (
    <div className="flex flex-col items-center text-center">
      <SeloLK tamanho="lg" />
      <p className="mt-6 whitespace-nowrap font-marca text-[17px] font-semibold uppercase tracking-[0.07em] text-t1 sm:text-[19px]">
        <LogotipoLK className="mr-[0.4em] tracking-[0.045em]" />
        Assessoria Farmacêutica
      </p>
      <span className="my-3.5 h-[3px] w-12 rounded-full" style={{ background: MARCA.menta }} aria-hidden />
      <p className="font-marca text-[10px] font-medium uppercase tracking-[0.3em] text-t3 sm:text-[11px]">Compliance &amp; Logística Sanitária</p>
    </div>
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
