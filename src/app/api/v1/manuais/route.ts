import { rotaApi } from "@/server/api";
import { lerFiltroManuais, listarManuais } from "@/server/consultas/manuais";

/** ?transportadora= &categoria=MANUAL_BPA|POP|OTHER &farol= &busca= */
export const GET = rotaApi((u, sp) => listarManuais(u, lerFiltroManuais(sp)));
