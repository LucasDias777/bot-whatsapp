import { apiGET, apiPOST, apiDELETE } from "./api";

export const listContatos = () => apiGET("/contatos");
export const criarContato = (numero) => apiPOST("/contato", { numero });
export const removerContato = (id) => apiDELETE(`/contato/${id}`);
