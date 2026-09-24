import { rotaApi } from "@/server/api";
import { listarTransportadoras } from "@/server/consultas/transportadoras";

/** Somente ADMIN. */
export const GET = rotaApi(() => listarTransportadoras(), { somenteAdmin: true });
