import { apiDELETE, apiGET, apiPOST } from "./api";

export async function getStatus() {
  return apiGET("/qr");
}

export async function addConnection(name) {
  return apiPOST("/qr/connections", { name });
}

export async function disconnectConnection(id) {
  return apiPOST(`/qr/${id}/disconnect`, {});
}

export async function requestConnectionQr(id) {
  return apiPOST(`/qr/${id}/start`, {});
}

export async function deleteConnection(id) {
  return apiDELETE(`/qr/${id}`);
}

export async function disconnect(id) {
  if (id) {
    return disconnectConnection(id);
  }

  return apiPOST("/qr/disconnect", {});
}

export function hasConnectedConnection(status) {
  if (status?.status === "connected") {
    return true;
  }

  if (Number(status?.connectedCount || 0) > 0) {
    return true;
  }

  return Array.isArray(status?.connections) && status.connections.some((connection) => connection.status === "connected");
}

export function getConnectedConnections(status) {
  if (!Array.isArray(status?.connections)) return [];

  return status.connections.filter((connection) => connection.status === "connected");
}
