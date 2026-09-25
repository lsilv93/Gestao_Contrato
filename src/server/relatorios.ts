import "server-only";
import type { Prisma } from "@prisma/client";
import { farolVencimento, type Farol } from "@/domain/farol";
import { rotuloCategoriaManual, rotuloSituacaoLicenca, situacaoLicenca } from "@/domain/status";
import { diaDe, diaLocal, diasAte, diaValido, hojeData, paraData, somarDias } from "@/lib/datas";
import type { UsuarioAtual } from "./auth";
import { condicaoFarol, nomeCarrier, param, type Params } from "./consultas/filtros";
import { escopoCarrier } from "./escopo";
import { DIAS_BLOQUEIO } from "./pendencias";
import { prisma } from "./prisma";

// ---------------- tipos ----------------
export type TipoRelatorio = "COMPLIANCE" | "FINANCEIRO" | "LICENCAS" | "MANUAIS" | "EXECUTIVO";
export type StatusRelatorio = "EM_DIA" | "A_VENCER" | "VENCIDO" | "PAGO" | "PENDENTE";

export const TIPOS: { valor: TipoRelatorio; rotulo: string; descricao: string; admin?: boolean }[] = [
  { valor: "COMPLIANCE", rotulo: "Relatório Geral de Compliance Sanitário", descricao: "Por transportadora: licença ANVISA vigente, situação, validade e versão do Manual de Boas Práticas." },
  { valor: "FINANCEIRO", rotulo: "Faturamento & Cobranças", descricao: "NFs com tipo de contrato, valor, vencimento, pagamento, status e dias em atraso." },
  { valor: "LICENCAS", rotulo: "Licenças Sanitárias", descricao: "Licenças (versão mais recente) com órgão emissor, validade e situação." },
  { valor: "MANUAIS", rotulo: "Manuais de Boas Práticas / POPs", descricao: "Documentos com categoria, versão e próxima revisão." },
  { valor: "EXECUTIVO", rotulo: "Visão Geral Executiva", descricao: "Consolidado por transportadora: contratos, faturamento em aberto e vencido, licença e acesso.", admin: true },
];

export const STATUS: { valor: StatusRelatorio; rotulo: string }[] = [
  { valor: "EM_DIA", rotulo: "Em dia (verde)" },
  { valor: "A_VENCER", rotulo: "A vencer — hoje/amanhã (amarelo)" },
  { valor: "VENCIDO", rotulo: "Vencido (vermelho)" },
  { valor: "PAGO", rotulo: "Pago" },
  { valor: "PENDENTE", rotulo: "Pendente (todas em aberto)" },
];
const farolDoStatus: Partial<Record<StatusRelatorio, Farol>> = { EM_DIA: "VERDE", A_VENCER: "AMARELO", VENCIDO: "VERMELHO" };
const rotuloFarol: Record<Farol, string> = { VERDE: "Em dia", AMARELO: "A vencer", VERMELHO: "Vencido" };

export type TipoColuna = "texto" | "data" | "moeda" | "numero" | "status";
export type Coluna = { chave: string; titulo: string; tipo: TipoColuna; largura: number };
export type Valor = string | number | Date | null;
export type Linha = Record<string, Valor>;
export type Relatorio = {
  titulo: string;
  colunas: Coluna[];
  linhas: Linha[];
  totais?: Linha;
  /** Observações sobre filtros não aplicáveis a este tipo. */
  avisos: string[];
};

export type FiltroRelatorio = {
  tipo: TipoRelatorio;
  de?: string;
  ate?: string;
  transportadoras: string[];
  status?: StatusRelatorio;
};

// ---------------- filtros ----------------
export function lerFiltroRelatorio(sp: Params, u: UsuarioAtual): FiltroRelatorio {
  const tipoPedido = param(sp, "tipo") as TipoRelatorio | undefined;
  const permitidos = tiposPermitidos(u).map((t) => t.valor);
  const tipo = tipoPedido && permitidos.includes(tipoPedido) ? tipoPedido : "COMPLIANCE";
  const bruto = sp.transportadora;
  const transportadoras = (Array.isArray(bruto) ? bruto : bruto ? [bruto] : []).filter(Boolean);
  const status = param(sp, "status") as StatusRelatorio | undefined;
  const de = param(sp, "de");
  const ate = param(sp, "ate");
  return {
    tipo,
    de: de && diaValido(de) ? de : undefined,
    ate: ate && diaValido(ate) ? ate : undefined,
    // Cliente: sempre e só o próprio CNPJ (filtro enviado é ignorado)
    transportadoras: u.perfil === "ADMIN" ? transportadoras : [],
    status: STATUS.some((s) => s.valor === status) ? status : undefined,
  };
}

export const tiposPermitidos = (u: UsuarioAtual) => TIPOS.filter((t) => !t.admin || u.perfil === "ADMIN");

/** Escopo de transportadoras: CNPJ do cliente, ou a seleção (múltipla) do ADM. */
function escopo(u: UsuarioAtual, f: FiltroRelatorio): { carrierId?: string | { in: string[] } } {
  if (u.perfil === "CLIENT") return escopoCarrier(u);
  return f.transportadoras.length ? { carrierId: { in: f.transportadoras } } : {};
}
function escopoCarrierTabela(u: UsuarioAtual, f: FiltroRelatorio): Prisma.CarrierWhereInput {
  if (u.perfil === "CLIENT") return { id: u.carrier?.id ?? "__sem_vinculo__" };
  return f.transportadoras.length ? { id: { in: f.transportadoras } } : { active: true };
}

function periodo(f: FiltroRelatorio) {
  if (!f.de && !f.ate) return undefined;
  return { ...(f.de ? { gte: paraData(f.de) } : {}), ...(f.ate ? { lte: paraData(f.ate) } : {}) };
}

const COL = {
  transportadora: { chave: "transportadora", titulo: "Transportadora", tipo: "texto", largura: 30 },
  cnpj: { chave: "cnpj", titulo: "CNPJ", tipo: "texto", largura: 20 },
} satisfies Record<string, Coluna>;

const cnpjFmt = (c: string) => c.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");

// ---------------- geração ----------------
export async function gerarRelatorio(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  switch (f.tipo) {
    case "FINANCEIRO":
      return financeiro(u, f);
    case "LICENCAS":
      return licencas(u, f);
    case "MANUAIS":
      return manuais(u, f);
    case "EXECUTIVO":
      if (u.perfil !== "ADMIN") return compliance(u, f);
      return executivo(u, f);
    default:
      return compliance(u, f);
  }
}

/** Relatório de Faturamento & Cobranças. Cliente: só em aberto/atraso e sem valores. */
async function financeiro(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  const admin = u.perfil === "ADMIN";
  const avisos: string[] = [];
  let where: Prisma.FinancialServiceWhereInput = { ...escopo(u, f), status: { not: "CANCELED" } };
  const venc = periodo(f);
  if (venc) where.dueDate = venc;
  const farol = f.status && farolDoStatus[f.status];
  if (farol) where = { ...where, status: "PENDING", AND: [{ dueDate: condicaoFarol(farol) }] };
  else if (f.status === "PAGO") where.status = "PAID";
  else if (f.status === "PENDENTE") where.status = "PENDING";
  if (!admin) {
    // regra do cliente: nunca mostra cobranças pagas nem valores
    if (f.status === "PAGO") avisos.push("Cobranças pagas não são exibidas para o perfil Cliente.");
    where = { ...where, status: "PENDING" };
  }

  const lista = await prisma.financialService.findMany({
    where,
    include: { carrier: { select: { cnpj: true, legalName: true, tradeName: true } } },
    orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
    take: 5000,
  });
  const dia = diaLocal();
  const linhas: Linha[] = lista.map((s) => {
    const fa = farolVencimento(s.dueDate, s.status !== "PENDING", dia);
    const atraso =
      s.status === "PENDING" ? Math.max(0, -diasAte(s.dueDate, dia)) : s.paymentDate ? Math.max(0, -diasAte(s.dueDate, diaDe(s.paymentDate))) : 0;
    return {
      transportadora: nomeCarrier(s.carrier),
      cnpj: cnpjFmt(s.carrier.cnpj),
      nf: s.invoiceNumber ?? "—",
      tipo: s.contractType,
      valor: Number(s.amount),
      vencimento: s.dueDate,
      pagamento: s.paymentDate,
      status: s.status === "PAID" ? "Pago" : s.status === "PENDING_EMISSION" ? "Pendente de emissão" : fa ? rotuloFarol[fa] : "—",
      atraso,
    };
  });
  const colunas: Coluna[] = [
    COL.transportadora,
    COL.cnpj,
    { chave: "nf", titulo: "Número NF", tipo: "texto", largura: 16 },
    { chave: "tipo", titulo: "Tipo de Contrato", tipo: "texto", largura: 14 },
    ...(admin ? [{ chave: "valor", titulo: "Valor (R$)", tipo: "moeda", largura: 16 } as Coluna] : []),
    { chave: "vencimento", titulo: "Data Vencimento", tipo: "data", largura: 16 },
    ...(admin ? [{ chave: "pagamento", titulo: "Data Pagamento", tipo: "data", largura: 16 } as Coluna] : []),
    { chave: "status", titulo: "Status", tipo: "status", largura: 12 },
    { chave: "atraso", titulo: "Dias em Atraso", tipo: "numero", largura: 14 },
  ];
  return {
    titulo: admin ? "Relatório de Faturamento & Cobranças" : "Relatório de Cobranças em Aberto",
    colunas,
    linhas,
    totais: admin ? { transportadora: `Total (${linhas.length} NFs)`, valor: linhas.reduce((a, l) => a + Number(l.valor), 0) } : undefined,
    avisos,
  };
}

/** Relatório Geral de Compliance Sanitário (uma linha por transportadora). */
async function compliance(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  const avisos: string[] = [];
  if (f.status === "PAGO" || f.status === "PENDENTE") avisos.push("Status Pago/Pendente não se aplica a este relatório (ignorado).");
  const carriers = await prisma.carrier.findMany({
    where: escopoCarrierTabela(u, f),
    include: {
      licenses: { where: { next: { is: null } }, orderBy: { expirationDate: "desc" } },
      manuals: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { legalName: "asc" },
  });
  const dia = diaLocal();
  const venc = periodo(f);
  const farolFiltro = f.status && farolDoStatus[f.status];
  const linhas: Linha[] = [];
  for (const c of carriers) {
    const lic = c.licenses.find((l) => l.status === "CURRENT") ?? c.licenses[0] ?? null;
    const sit = lic ? situacaoLicenca(lic, dia) : null;
    const fa = lic ? farolVencimento(lic.expirationDate, lic.status !== "CURRENT", dia) : null;
    if (farolFiltro && fa !== farolFiltro) continue;
    if (venc && (!lic || (venc.gte && lic.expirationDate < venc.gte) || (venc.lte && lic.expirationDate > venc.lte))) continue;
    const bpa = c.manuals.find((m) => m.category === "MANUAL_BPA") ?? null;
    linhas.push({
      transportadora: nomeCarrier(c),
      cnpj: cnpjFmt(c.cnpj),
      licenca: lic?.licenseNumber ?? "Sem licença cadastrada",
      statusLicenca: sit ? rotuloSituacaoLicenca[sit] : "—",
      validade: lic?.expirationDate ?? null,
      diasValidade: lic ? diasAte(lic.expirationDate, dia) : null,
      manual: bpa ? bpa.version : "Sem manual",
      revisao: bpa?.reviewDate ?? null,
      pops: c.manuals.filter((m) => m.category === "POP").length,
    });
  }
  return {
    titulo: "Relatório Geral de Compliance Sanitário",
    colunas: [
      COL.transportadora,
      COL.cnpj,
      { chave: "licenca", titulo: "Licença ANVISA", tipo: "texto", largura: 22 },
      { chave: "statusLicenca", titulo: "Status da Licença", tipo: "status", largura: 18 },
      { chave: "validade", titulo: "Data de Validade", tipo: "data", largura: 16 },
      { chave: "diasValidade", titulo: "Dias p/ Vencer", tipo: "numero", largura: 14 },
      { chave: "manual", titulo: "Versão Manual BPA", tipo: "texto", largura: 18 },
      { chave: "revisao", titulo: "Próx. Revisão Manual", tipo: "data", largura: 18 },
      { chave: "pops", titulo: "POPs", tipo: "numero", largura: 8 },
    ],
    linhas,
    avisos,
  };
}

async function licencas(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  const avisos: string[] = [];
  if (f.status === "PAGO" || f.status === "PENDENTE") avisos.push("Status Pago/Pendente não se aplica a licenças (ignorado).");
  const farol = f.status && farolDoStatus[f.status];
  const venc = periodo(f);
  const lista = await prisma.sanitaryLicense.findMany({
    where: {
      ...escopo(u, f),
      next: { is: null },
      ...(farol ? { status: "CURRENT", AND: [{ expirationDate: condicaoFarol(farol) }] } : {}),
      ...(venc ? { expirationDate: venc } : {}),
    },
    include: { carrier: { select: { cnpj: true, legalName: true, tradeName: true } } },
    orderBy: { expirationDate: "asc" },
  });
  const dia = diaLocal();
  return {
    titulo: "Relatório de Licenças Sanitárias",
    colunas: [
      COL.transportadora,
      COL.cnpj,
      { chave: "numero", titulo: "Nº da Licença", tipo: "texto", largura: 20 },
      { chave: "orgao", titulo: "Órgão Emissor", tipo: "texto", largura: 24 },
      { chave: "emissao", titulo: "Emissão", tipo: "data", largura: 14 },
      { chave: "validade", titulo: "Validade", tipo: "data", largura: 14 },
      { chave: "versao", titulo: "Versão", tipo: "numero", largura: 9 },
      { chave: "situacao", titulo: "Situação", tipo: "status", largura: 18 },
      { chave: "dias", titulo: "Dias p/ Vencer", tipo: "numero", largura: 14 },
    ],
    linhas: lista.map((l) => ({
      transportadora: nomeCarrier(l.carrier),
      cnpj: cnpjFmt(l.carrier.cnpj),
      numero: l.licenseNumber,
      orgao: l.issuingBody,
      emissao: l.issueDate,
      validade: l.expirationDate,
      versao: l.version,
      situacao: rotuloSituacaoLicenca[situacaoLicenca(l, dia)],
      dias: diasAte(l.expirationDate, dia),
    })),
    avisos,
  };
}

async function manuais(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  const avisos: string[] = [];
  if (f.status === "PAGO" || f.status === "PENDENTE") avisos.push("Status Pago/Pendente não se aplica a manuais (ignorado).");
  const farol = f.status && farolDoStatus[f.status];
  const venc = periodo(f);
  const lista = await prisma.goodPracticesManual.findMany({
    where: {
      ...escopo(u, f),
      ...(farol ? { AND: [{ reviewDate: condicaoFarol(farol) }] } : {}),
      ...(venc ? { reviewDate: venc } : {}),
    },
    include: { carrier: { select: { cnpj: true, legalName: true, tradeName: true } }, file: { select: { fileName: true } } },
    orderBy: [{ carrier: { legalName: "asc" } }, { title: "asc" }],
  });
  const dia = diaLocal();
  return {
    titulo: "Relatório de Manuais de Boas Práticas / POPs",
    colunas: [
      COL.transportadora,
      COL.cnpj,
      { chave: "titulo", titulo: "Título", tipo: "texto", largura: 40 },
      { chave: "categoria", titulo: "Categoria", tipo: "texto", largura: 24 },
      { chave: "versao", titulo: "Versão", tipo: "texto", largura: 10 },
      { chave: "revisao", titulo: "Próxima Revisão", tipo: "data", largura: 16 },
      { chave: "situacao", titulo: "Situação", tipo: "status", largura: 12 },
      { chave: "arquivo", titulo: "Arquivo", tipo: "texto", largura: 32 },
    ],
    linhas: lista.map((m) => {
      const fa = farolVencimento(m.reviewDate, false, dia);
      return {
        transportadora: nomeCarrier(m.carrier),
        cnpj: cnpjFmt(m.carrier.cnpj),
        titulo: m.title,
        categoria: rotuloCategoriaManual[m.category],
        versao: m.version,
        revisao: m.reviewDate,
        situacao: fa ? rotuloFarol[fa] : "Sem prazo",
        arquivo: m.file?.fileName ?? "—",
      };
    }),
    avisos,
  };
}

/** Visão Geral Executiva (somente ADM Geral). */
async function executivo(u: UsuarioAtual, f: FiltroRelatorio): Promise<Relatorio> {
  const avisos: string[] = [];
  if (f.status) avisos.push("O filtro de status não se aplica à visão executiva (ignorado).");
  const venc = periodo(f);
  const hoje = hojeData();
  const limiteBloqueio = somarDias(hoje, -DIAS_BLOQUEIO);
  const carriers = await prisma.carrier.findMany({
    where: escopoCarrierTabela(u, f),
    include: {
      contracts: { where: { status: "ACTIVE" }, select: { amount: true } },
      services: { where: { status: "PENDING", ...(venc ? { dueDate: venc } : {}) }, select: { amount: true, dueDate: true } },
      licenses: { where: { status: "CURRENT" }, orderBy: { expirationDate: "asc" }, take: 1 },
      _count: { select: { manuals: true } },
    },
    orderBy: { legalName: "asc" },
  });
  const dia = diaLocal();
  const soma = (xs: { amount: unknown }[]) => xs.reduce((a, x) => a + Number(x.amount), 0);
  const linhas: Linha[] = carriers.map((c) => {
    const vencidas = c.services.filter((s) => s.dueDate < hoje);
    const lic = c.licenses[0];
    const maiorAtraso = vencidas.reduce((m, s) => Math.max(m, -diasAte(s.dueDate, dia)), 0);
    return {
      transportadora: nomeCarrier(c),
      cnpj: cnpjFmt(c.cnpj),
      contratos: c.contracts.length,
      valorContratos: soma(c.contracts),
      nfsAbertas: c.services.length,
      valorAberto: soma(c.services),
      nfsVencidas: vencidas.length,
      valorVencido: soma(vencidas),
      maiorAtraso,
      licenca: lic ? rotuloSituacaoLicenca[situacaoLicenca(lic, dia)] : "Sem licença vigente",
      validade: lic?.expirationDate ?? null,
      manuais: c._count.manuals,
      acesso: c.services.some((s) => s.dueDate < limiteBloqueio) ? "Bloqueado" : "Liberado",
    };
  });
  const total = (k: string) => linhas.reduce((a, l) => a + Number(l[k] ?? 0), 0);
  return {
    titulo: "Visão Geral Executiva",
    colunas: [
      COL.transportadora,
      COL.cnpj,
      { chave: "contratos", titulo: "Contratos Vigentes", tipo: "numero", largura: 12 },
      { chave: "valorContratos", titulo: "Valor Contratos (R$)", tipo: "moeda", largura: 18 },
      { chave: "nfsAbertas", titulo: "NFs em Aberto", tipo: "numero", largura: 12 },
      { chave: "valorAberto", titulo: "Valor em Aberto (R$)", tipo: "moeda", largura: 18 },
      { chave: "nfsVencidas", titulo: "NFs Vencidas", tipo: "numero", largura: 12 },
      { chave: "valorVencido", titulo: "Valor Vencido (R$)", tipo: "moeda", largura: 18 },
      { chave: "maiorAtraso", titulo: "Maior Atraso (dias)", tipo: "numero", largura: 14 },
      { chave: "licenca", titulo: "Licença ANVISA", tipo: "status", largura: 18 },
      { chave: "validade", titulo: "Validade Licença", tipo: "data", largura: 16 },
      { chave: "manuais", titulo: "Manuais/POPs", tipo: "numero", largura: 12 },
      { chave: "acesso", titulo: "Acesso do Cliente", tipo: "status", largura: 14 },
    ],
    linhas,
    totais: {
      transportadora: `Total (${linhas.length} transportadoras)`,
      contratos: total("contratos"),
      valorContratos: total("valorContratos"),
      nfsAbertas: total("nfsAbertas"),
      valorAberto: total("valorAberto"),
      nfsVencidas: total("nfsVencidas"),
      valorVencido: total("valorVencido"),
      manuais: total("manuais"),
    },
    avisos,
  };
}

/** Cor do status (tela e Excel). */
export function corStatus(v: Valor): "erro" | "ouro" | "ok" | null {
  const s = String(v ?? "");
  if (/Vencid|Bloquead|atraso|Cancelad|Suspens|Encerrad/i.test(s)) return "erro";
  if (/A vencer|Próxima/i.test(s)) return "ouro";
  if (/Em dia|Ativa|Pago|Liberado/i.test(s)) return "ok";
  return null;
}
