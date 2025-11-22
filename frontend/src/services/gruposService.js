import { apiGET, apiPOST, apiDELETE } from "./api";

export const listGrupos = () => apiGET("/grupos");
export const criarGrupo = (nome) => apiPOST("/grupo", { nome });
export const removerGrupo = (id) => apiDELETE(`/grupo/${id}`);
export const listarContatosDoGrupo = (id) => apiGET(`/grupo/${id}/contatos`);
export const adicionarContatoAoGrupo = (grupoId, contato_id) => apiPOST(`/grupo/${grupoId}/adicionar`, { contato_id });
export const removerContatoDoGrupo = (grupoId, contatoId) => apiDELETE(`/grupo/${grupoId}/remover/${contatoId}`);
