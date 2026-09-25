// Tipos de documento do módulo "Licenças e Documentos" (regras puras, sem I/O).
//
// Cada tipo pertence a uma categoria do dashboard e diz se a validade é
// obrigatória. AFE/AE são concedidas por prazo indeterminado: a data de
// validade é opcional e, vazia, aparece como "Sem Validade / Indeterminado".
import type { DocumentType } from "@prisma/client";

export type CategoriaDocumento = "LICENCA" | "DOCUMENTO";

export const rotuloCategoriaDocumento: Record<CategoriaDocumento, string> = {
  LICENCA: "Licença Sanitária & Regulatória",
  DOCUMENTO: "Documentos Operacionais & Técnicos",
};

type Definicao = { rotulo: string; categoria: CategoriaDocumento; validadeOpcional: boolean };

/** Ordem de exibição do dropdown (a mesma da especificação). */
export const TIPOS_DOCUMENTO: Record<DocumentType, Definicao> = {
  CRF: { rotulo: "CERTIDÃO DE REGULARIDADE (CRF)", categoria: "LICENCA", validadeOpcional: false },
  AFE_COSMETICOS: { rotulo: "AFE COSMÉTICOS", categoria: "LICENCA", validadeOpcional: true },
  AFE_CORRELATOS: { rotulo: "AFE CORRELATOS", categoria: "LICENCA", validadeOpcional: true },
  AFE_MEDICAMENTOS: { rotulo: "AFE MEDICAMENTOS", categoria: "LICENCA", validadeOpcional: true },
  AFE_SANEANTES: { rotulo: "AFE SANEANTES", categoria: "LICENCA", validadeOpcional: true },
  AE_MEDICAMENTOS_CONTROLADOS: { rotulo: "AE MEDICAMENTOS CONTROLADOS", categoria: "LICENCA", validadeOpcional: true },
  CLI: { rotulo: "CLI", categoria: "LICENCA", validadeOpcional: false },
  AVCB: { rotulo: "AVCB", categoria: "LICENCA", validadeOpcional: false },
  LICENCA_POLICIA_FEDERAL: { rotulo: "LICENÇA POLÍCIA FEDERAL", categoria: "LICENCA", validadeOpcional: false },
  LICENCA_POLICIA_CIVIL: { rotulo: "LICENÇA POLÍCIA CIVIL", categoria: "LICENCA", validadeOpcional: false },
  PGR: { rotulo: "PGR", categoria: "DOCUMENTO", validadeOpcional: false },
  PCMSO: { rotulo: "PCMSO", categoria: "DOCUMENTO", validadeOpcional: false },
  LIMPEZA_CAIXA_DAGUA: { rotulo: "CERTIFICADO DE LIMPEZA DE CAIXA D’ÁGUA", categoria: "DOCUMENTO", validadeOpcional: false },
  CONTROLE_PRAGAS_EMPRESA: { rotulo: "CONTROLE DE PRAGAS EMPRESA", categoria: "DOCUMENTO", validadeOpcional: false },
  CONTROLE_PRAGAS_VEICULOS: { rotulo: "CONTROLE DE PRAGAS VEÍCULOS", categoria: "DOCUMENTO", validadeOpcional: false },
};

export const LISTA_TIPOS_DOCUMENTO = Object.keys(TIPOS_DOCUMENTO) as DocumentType[];

export const ehTipoDocumento = (v: unknown): v is DocumentType => typeof v === "string" && v in TIPOS_DOCUMENTO;

/** Tipos com validade opcional (AFE / AE). */
export const TIPOS_VALIDADE_OPCIONAL = LISTA_TIPOS_DOCUMENTO.filter((t) => TIPOS_DOCUMENTO[t].validadeOpcional);

export const validadeOpcional = (t: DocumentType | null | undefined) => !!t && TIPOS_DOCUMENTO[t].validadeOpcional;

export const tiposDaCategoria = (c: CategoriaDocumento) => LISTA_TIPOS_DOCUMENTO.filter((t) => TIPOS_DOCUMENTO[t].categoria === c);

/**
 * Categoria de um registro. Registros anteriores à classificação (sem tipo)
 * eram todos licenças sanitárias: ficam em LICENCA até serem classificados.
 */
export const categoriaDoTipo = (t: DocumentType | null | undefined): CategoriaDocumento => (t ? TIPOS_DOCUMENTO[t].categoria : "LICENCA");

export const rotuloTipoDocumento = (t: DocumentType | null | undefined) => (t ? TIPOS_DOCUMENTO[t].rotulo : "NÃO CLASSIFICADO");

export const SEM_VALIDADE = "Sem Validade / Indeterminado";
