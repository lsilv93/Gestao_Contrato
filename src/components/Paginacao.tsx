import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatarNumero } from "@/lib/formatos";
import { urlCom } from "@/lib/url";

type Params = Record<string, string | string[] | undefined>;

/** Navegação entre páginas de uma listagem (mantém os filtros da URL). */
export function Paginacao({
  base,
  sp,
  pagina,
  paginas,
  total,
  porPagina,
}: {
  base: string;
  sp: Params;
  pagina: number;
  paginas: number;
  total: number;
  porPagina: number;
}) {
  if (total === 0) return null;
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(total, pagina * porPagina);
  const href = (p: number) => urlCom(base, sp, { pagina: p > 1 ? String(p) : null });
  // 1 … 4 5 6 … 20
  const numeros = [...new Set([1, pagina - 1, pagina, pagina + 1, paginas])].filter((p) => p >= 1 && p <= paginas).sort((a, b) => a - b);
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-t3" aria-label="Paginação">
      <span>
        Mostrando <b className="num text-t1">{formatarNumero(de)}–{formatarNumero(ate)}</b> de <b className="num text-t1">{formatarNumero(total)}</b>
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-1.5">
          {pagina > 1 && (
            <Link href={href(pagina - 1)} className="btn-secondary btn-sm" aria-label="Página anterior" scroll={false}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Link>
          )}
          {numeros.map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && p - numeros[i - 1] > 1 && <span className="px-1 text-t4">…</span>}
              {p === pagina ? (
                <span className="btn-primary btn-sm num" aria-current="page">{p}</span>
              ) : (
                <Link href={href(p)} className="btn-secondary btn-sm num" scroll={false}>
                  {p}
                </Link>
              )}
            </span>
          ))}
          {pagina < paginas && (
            <Link href={href(pagina + 1)} className="btn-secondary btn-sm" aria-label="Próxima página" scroll={false}>
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
