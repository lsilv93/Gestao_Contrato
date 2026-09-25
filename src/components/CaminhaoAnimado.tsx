import clsx from "clsx";

/**
 * Ilustração animada (SVG + CSS, sem GIF/Lottie): caminhão moderno —
 * cavalo mecânico aerodinâmico com semirreboque e faixa em acento.
 *  - "rota": rodando (rodas girando, faixa da estrada correndo, farol aceso, leve balanço);
 *  - "parado": parado para manutenção (pisca-alerta, cone e chave).
 * As cores vêm das variáveis do tema (claro/escuro). Animações param com "reduzir movimento".
 */
export function CaminhaoAnimado({ modo = "rota", className, titulo }: { modo?: "rota" | "parado"; className?: string; titulo?: string }) {
  const rota = modo === "rota";
  const Roda = ({ x }: { x: number }) => (
    <g>
      <g className={clsx(rota && "cam-roda")}>
        <circle cx={x} cy="86" r="12" fill="#06121D" />
        <circle cx={x} cy="86" r="7.2" fill="rgb(var(--c-t3))" />
        {[0, 90, 180, 270].map((a) => (
          <circle key={a} cx={x + 4.3 * Math.cos((a * Math.PI) / 180)} cy={86 + 4.3 * Math.sin((a * Math.PI) / 180)} r="1.3" fill="#06121D" />
        ))}
      </g>
      <circle cx={x} cy="86" r="2" fill="rgb(var(--c-t1))" opacity=".8" />
    </g>
  );

  return (
    <svg viewBox="0 0 280 112" className={clsx("block h-auto w-full", className)} role="img" aria-label={titulo ?? (rota ? "Caminhão em rota" : "Caminhão parado para manutenção")}>
      <defs>
        <linearGradient id="cam-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--c-t2))" />
          <stop offset="1" stopColor="rgb(var(--c-t3))" />
        </linearGradient>
        <linearGradient id="cam-cabine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--c-t1))" />
          <stop offset="1" stopColor="rgb(var(--c-t2))" />
        </linearGradient>
        <linearGradient id="cam-faixa-acento" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9E113" />
          <stop offset="1" stopColor="#D0FF45" />
        </linearGradient>
        <linearGradient id="cam-luz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF6C8" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFF6C8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cam-vidro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B3446" />
          <stop offset="1" stopColor="#06121D" />
        </linearGradient>
      </defs>

      {/* estrada */}
      <line x1="0" y1="100" x2="280" y2="100" stroke="rgb(var(--c-t4))" strokeOpacity=".35" strokeWidth="1.5" />
      <line x1="-30" y1="107" x2="310" y2="107" stroke="rgb(var(--c-t4))" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="18 14" className={clsx(rota && "cam-faixa")} />

      {/* linhas de velocidade */}
      {rota && (
        <g stroke="rgb(var(--c-acento))" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="40" x2="24" y2="40" className="cam-vento" />
          <line x1="0" y1="54" x2="20" y2="54" className="cam-vento cam-vento-2" />
          <line x1="8" y1="68" x2="24" y2="68" className="cam-vento cam-vento-3" />
        </g>
      )}

      <g transform="translate(24 0)">
        {/* sombra no chão */}
        <ellipse cx="124" cy="99" rx="112" ry="3.2" fill="#000" opacity=".35" />

        <g className={clsx(rota && "cam-balanco")}>
          {/* farol (feixe) */}
          {rota && <path d="M227 54.5 L276 46 V70 L227 58.5 Z" fill="url(#cam-luz)" className="cam-farol" />}

          {/* semirreboque */}
          <rect x="6" y="20" width="140" height="58" rx="8" fill="url(#cam-metal)" />
          <rect x="6" y="20" width="140" height="3" rx="1.5" fill="#fff" opacity=".18" />
          {[26, 46, 66, 86, 106, 126].map((x) => (
            <line key={x} x1={x} y1="28" x2={x} y2="58" stroke="#000E19" strokeOpacity=".09" strokeWidth="2" />
          ))}
          <rect x="6" y="62" width="140" height="5" fill="url(#cam-faixa-acento)" />
          <rect x="6" y="67" width="4" height="8" rx="1.5" fill="rgb(var(--c-erro))" />

          {/* chassi */}
          <rect x="4" y="77" width="224" height="6" rx="3" fill="#0A1B29" />

          {/* cavalo mecânico (cabine aerodinâmica) */}
          <path d="M152 80V40q0-10.5 10.5-12.6l27-4.6q6.4-1 9.8 4.2L212 48h10q6 0 6 6v26z" fill="url(#cam-cabine)" />
          {/* grade frontal */}
          <path d="M224.5 60v8M227 60v8" stroke="#000E19" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
          {/* para-brisa e janela */}
          <path d="M194.5 29.6q3.5-.6 5.6 2.4l10.2 15q1.2 2-1.3 2H195q-2.8 0-2.8-2.8V32.4q0-2.4 2.3-2.8z" fill="url(#cam-vidro)" />
          <path d="M197 33.5l6.5 9.5" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
          <rect x="167" y="33" width="20" height="16" rx="3.5" fill="url(#cam-vidro)" />
          {/* faixa, porta, farol e para-choque */}
          <rect x="152" y="62" width="76" height="5" fill="url(#cam-faixa-acento)" />
          <path d="M163 53v24M191 53v24" stroke="#000E19" strokeOpacity=".14" strokeWidth="1.5" />
          <rect x="218" y="54" width="9" height="4.5" rx="2" fill="#FFF6C8" />
          <rect x="214" y="76" width="16" height="7" rx="3.5" fill="#0A1B29" />

          {/* pisca-alerta (parado) */}
          {!rota && (
            <g className="cam-pisca" fill="rgb(var(--c-ouro))">
              <rect x="172" y="21" width="8" height="4" rx="2" />
              <rect x="218" y="54" width="9" height="4.5" rx="2" />
              <rect x="6" y="67" width="4" height="8" rx="1.5" />
            </g>
          )}
        </g>

        <Roda x={34} />
        <Roda x={62} />
        <Roda x={172} />
        <Roda x={208} />
      </g>

      {/* manutenção: cone e chave */}
      {!rota && (
        <>
          <g transform="translate(268 74)">
            <path d="M-8 24h16L2 0h-4z" fill="rgb(var(--c-ouro))" />
            <path d="M-4.6 14h9.2M-2.6 7h5.2" stroke="#000E19" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="-11" y="23" width="22" height="3.5" rx="1.5" fill="rgb(var(--c-ouro))" />
          </g>
          <g transform="translate(236 4)">
            <g className="cam-chave">
              <path d="M1 8a7 7 0 0 0 9.4 8.7l7.8 7.8a2.2 2.2 0 0 0 3.1-3.1l-7.8-7.8A7 7 0 0 0 4.8 4l4.2 4.2-2.8 2.8z" fill="rgb(var(--c-t2))" />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}
