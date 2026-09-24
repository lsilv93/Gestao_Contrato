import { rotaApi } from "@/server/api";
import { lerFiltroLicencas, listarLicencas } from "@/server/consultas/licencas";

/** ?transportadora= &status= &farol= &historico=1 &busca= */
export const GET = rotaApi((u, sp) => listarLicencas(u, lerFiltroLicencas(sp)));
