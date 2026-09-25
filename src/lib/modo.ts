import { urlBanco } from "./banco.mjs";

/** Sem PostgreSQL conectado o sistema roda em modo demonstração. */
export const modoDemo = () => !urlBanco();
