import { apiGET } from "./api";

export async function backendReady() {
  return apiGET("/backend/ready");
}
