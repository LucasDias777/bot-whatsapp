import { apiGET, apiPOST, apiDELETE, apiPUT } from "./api";

export const criarAgendamento = (payload) =>
  apiPOST("/agendamento", payload);

export const listarAgendamentos = () =>
  apiGET("/agendamento");

export const removerAgendamento = (id) =>
  apiDELETE(`/agendamento/${id}`);

export const editarAgendamento = (id, payload) =>
  apiPUT(`/agendamento/${id}`, payload);