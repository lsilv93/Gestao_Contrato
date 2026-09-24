import { rotaApi } from "@/server/api";
import { lerFiltroContratos, listarContratos } from "@/server/consultas/contratos";

/** ?transportadora= &tipo=PJ|SPOT &status=ACTIVE|RENEWED|TERMINATED &farol=VERDE|AMARELO|VERMELHO &busca= */
export const GET = rotaApi((u, sp) => listarContratos(u, lerFiltroContratos(sp)));
