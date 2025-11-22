import { apiGET } from "./api";

export async function getStatus() {
  return apiGET("/qr");
}
