import { apiGET, apiPOST, apiDELETE } from "./api";

export const criarAgendamento = (payload) => apiPOST("/agendamento", payload);
export const listarAgendamentos = () => apiGET("/agendamento");
export const removerAgendamento = (id) => apiDELETE(`/agendamento/${id}`);