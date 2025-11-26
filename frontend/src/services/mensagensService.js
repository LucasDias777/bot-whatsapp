import { apiGET, apiPOST, apiDELETE, apiPUT } from "./api";

export const listMensagens = () => apiGET("/mensagem");
export const criarMensagem = (texto) => apiPOST("/mensagem", { texto });
export const removerMensagem = (id) => apiDELETE(`/mensagem/${id}`);
export const editarMensagem = (id, texto) => apiPUT(`/mensagem/${id}`, { texto });
