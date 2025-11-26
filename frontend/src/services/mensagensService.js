import { apiGET, apiPOST, apiDELETE } from "./api";

export const listMensagens = () => apiGET("/mensagem");
export const criarMensagem = (texto) => apiPOST("/mensagem", { texto });
export const removerMensagem = (id) => apiDELETE(`/mensagem/${id}`);
