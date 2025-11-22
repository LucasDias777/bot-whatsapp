import { apiGET, apiPOST, apiDELETE } from "./api";

export const listMensagens = () => apiGET("/mensagens");
export const criarMensagem = (texto) => apiPOST("/mensagem", { texto });
export const removerMensagem = (id) => apiDELETE(`/mensagem/${id}`);
