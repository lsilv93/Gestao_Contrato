import clsx from "clsx";

/**
 * Ilustração animada (SVG + CSS, sem GIF/Lottie): caminhão-baú farmacêutico L&K.
 *  - "rota": rodando na estrada (rodas girando, faixa correndo, leve balanço);
 *  - "parado": parado para manutenção (pisca-alerta, cone e chave balançando).
 * As animações param quando o sistema pede "reduzir movimento".
 */
export function CaminhaoAnimado({ modo = "rota", className, titulo }: { modo?: "rota" | "parado"; className?: string; titulo?: string }) {
  const rota = modo === "rota";
  const Roda = ({ x }: { x: number }) => (
    <g className={clsx(rota && "cam-roda")}>
      <circle cx={x} cy="72" r="10" fill="#06121D" stroke="rgb(var(--c-t3))" strokeWidth="2" />
      <circle cx={x} cy="72" r="3.6" fill="rgb(var(--c-t2))" />
      <path d={`M${x} 64.5v15M${x - 7.5} 72h15`} stroke="rgb(var(--c-t3))" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 240 110" className={clsx("block h-auto w-full", className)} role="img" aria-label={titulo ?? (rota ? "Caminhão em rota" : "Caminhão parado para manutenção")}>
      <defs>
        <linearGradient id="cam-bau" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D0FF45" />
          <stop offset="1" stopColor="#A9E113" />
        </linearGradient>
      </defs>

      {/* estrada */}
      <line x1="0" y1="93" x2="240" y2="93" stroke="rgb(var(--c-t4))" strokeOpacity=".45" strokeWidth="2" />
      <line x1="-30" y1="102" x2="270" y2="102" stroke="rgb(var(--c-t4))" strokeOpacity=".6" strokeWidth="2.5" strokeLinecap="round" className={clsx(rota && "cam-faixa")} strokeDasharray="16 14" />

      {/* linhas de velocidade */}
      {rota && (
        <g stroke="rgb(var(--c-acento))" strokeWidth="2" strokeLinecap="round">
          <line x1="14" y1="44" x2="38" y2="44" className="cam-vento" />
          <line x1="4" y1="58" x2="34" y2="58" className="cam-vento cam-vento-2" />
          <line x1="18" y1="72" x2="40" y2="72" className="cam-vento cam-vento-3" />
        </g>
      )}

      {/* caminhão */}
      <g transform="translate(56 18)">
        <g className={clsx(rota && "cam-balanco")}>
          {/* baú com a cruz farmacêutica e a marca */}
          <rect x="0" y="6" width="100" height="56" rx="8" fill="url(#cam-bau)" />
          <path d="M28 22v26M15 35h26" stroke="#000E19" strokeWidth="7" strokeLinecap="round" />
          <text x="72" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fill="#000E19" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
            L&amp;K
          </text>
          {/* cabine */}
          <path d="M102 24h22q5 0 7.5 4l9 14q1.5 2.5 1.5 5.5V62h-40z" fill="rgb(var(--c-t2))" />
          <path d="M108 30h14l8 12h-22z" fill="#0A1B29" opacity=".85" />
          <rect x="138" y="52" width="4" height="5" rx="1.5" fill="rgb(var(--c-ouro))" />
          {!rota && <rect x="112" y="18" width="10" height="5" rx="2" fill="rgb(var(--c-ouro))" className="cam-pisca" />}
          {/* chassi */}
          <rect x="-2" y="60" width="146" height="5" rx="2.5" fill="#0A1B29" />
        </g>
        <g transform="translate(0 -6)">
          <Roda x={24} />
          <Roda x={78} />
          <Roda x={124} />
        </g>
      </g>

      {/* manutenção: cone e chave */}
      {!rota && (
        <>
          <g transform="translate(212 70)">
            <path d="M-9 22h18L2-2h-4z" fill="rgb(var(--c-ouro))" />
            <path d="M-5.5 12h11M-3.2 5h6.4" stroke="#000E19" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="-12" y="21" width="24" height="3.5" rx="1.5" fill="rgb(var(--c-ouro))" />
          </g>
          <g className="cam-chave">
            <path
              d="M189 22a7 7 0 0 0 9.4 8.7l7.8 7.8a2.2 2.2 0 0 0 3.1-3.1l-7.8-7.8A7 7 0 0 0 192.8 18l4.2 4.2-2.8 2.8z"
              fill="rgb(var(--c-t2))"
            />
          </g>
        </>
      )}
    </svg>
  );
}
