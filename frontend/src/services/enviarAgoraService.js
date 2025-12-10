import { apiPOST } from "./api";

export const enviarAgora = ({ numero = null, grupo_id = null, mensagem }) =>
  apiPOST("/enviar-agora", { numero, grupo_id, mensagem });