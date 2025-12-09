import { apiGET, apiPOST } from "./api";

export async function getStatus() {
  return apiGET("/qr");
}

export async function connect() {
  return apiPOST("/qr/connect", {});
}

export async function disconnect() {
  return apiPOST("/qr/disconnect", {});
}