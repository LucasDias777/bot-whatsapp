import { apiGET, apiPOST, apiDELETE } from "./api";

export const criarAgendamento = (payload) => apiPOST("/agendar", payload);
export const listarAgendamentos = () => apiGET("/agendamentos");
export const removerAgendamento = (id) => apiDELETE(`/agendamento/${id}`);
