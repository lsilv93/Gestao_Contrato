import "server-only";
import ExcelJS from "exceljs";
import { formatarDataHora } from "@/lib/datas";
import { corStatus, type Relatorio } from "./relatorios";

const CORES = { erro: "FFC62828", ouro: "FF8A6D00", ok: "FF3F6B00" } as const;

/** Planilha .xlsx formatada a partir de um relatório (mesmos dados da tela). */
export async function gerarExcel(r: Relatorio, info: { usuario: string; filtros: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "L&K Assessoria Farmacêutica";
  wb.created = new Date();
  const ws = wb.addWorksheet(r.titulo.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
  const n = r.colunas.length;

  // título e informações
  ws.mergeCells(1, 1, 1, n);
  ws.getCell(1, 1).value = r.titulo;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF0A1B29" } };
  ws.mergeCells(2, 1, 2, n);
  ws.getCell(2, 1).value = `Gerado em ${formatarDataHora(new Date())} por ${info.usuario} · ${info.filtros}`;
  ws.getCell(2, 1).font = { size: 9, color: { argb: "FF5A6B7B" } };

  // cabeçalho
  const cab = ws.getRow(4);
  r.colunas.forEach((c, i) => {
    const cel = cab.getCell(i + 1);
    cel.value = c.titulo;
    cel.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E2434" } };
    cel.alignment = { vertical: "middle", horizontal: c.tipo === "moeda" || c.tipo === "numero" ? "right" : "left", wrapText: true };
    cel.border = { bottom: { style: "thin", color: { argb: "FFBEF91B" } } };
    ws.getColumn(i + 1).width = c.largura;
  });
  cab.height = 30;

  // dados
  const escrever = (linha: Record<string, unknown>, negrito = false) => {
    const row = ws.addRow(r.colunas.map((c) => linha[c.chave] ?? null));
    r.colunas.forEach((c, i) => {
      const cel = row.getCell(i + 1);
      if (c.tipo === "moeda") cel.numFmt = '"R$" #,##0.00';
      if (c.tipo === "data") cel.numFmt = "dd/mm/yyyy";
      if (c.tipo === "numero") cel.numFmt = "0";
      const cor = c.tipo === "status" ? corStatus(cel.value as string) : null;
      cel.font = { bold: negrito || !!cor, ...(cor ? { color: { argb: CORES[cor] } } : {}) };
      cel.border = { bottom: { style: "hair", color: { argb: "FFD0D8E0" } } };
    });
    return row;
  };
  r.linhas.forEach((l) => escrever(l));
  if (r.totais) {
    const row = escrever(r.totais, true);
    row.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF3F8" } }));
  }
  if (r.linhas.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + r.linhas.length, column: n } };
  if (!r.linhas.length) ws.addRow(["Nenhum registro encontrado com os filtros aplicados."]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
