import { apiGET, apiPOST, apiDELETE, apiPUT } from "./api";


export const listContatos = () => apiGET("/contato");
export const criarContato = (numero) => apiPOST("/contato", { numero });
export const removerContato = (id) => apiDELETE(`/contato/${id}`);
export const editarContato = (id, numero) => apiPUT(`/contato/${id}`, { numero });
