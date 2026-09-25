/** Texto legível dos filtros aplicados (tela e cabeçalho do Excel). */
export function descreverFiltros(f: { de?: string; ate?: string; transportadoras: string[]; status?: string }, nomes: { status?: string; transportadoras?: string }) {
  const br = (d: string) => d.split("-").reverse().join("/");
  const partes = [
    f.de || f.ate ? `Período: ${f.de ? br(f.de) : "início"} a ${f.ate ? br(f.ate) : "hoje"}` : "Período: todos",
    `Transportadoras: ${nomes.transportadoras ?? "todas"}`,
    `Status: ${nomes.status ?? "todos"}`,
  ];
  return partes.join(" · ");
}
