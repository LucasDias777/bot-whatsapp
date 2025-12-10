import { apiGET, apiPOST, apiDELETE, apiPUT } from "./api";

export const listContatos = () => apiGET("/contato");
export const criarContato = (nome, numero) => apiPOST("/contato", { nome, numero });
export const removerContato = (id) => apiDELETE(`/contato/${id}`);
export const editarContato = (id, nome, numero) => apiPUT(`/contato/${id}`, { nome, numero });