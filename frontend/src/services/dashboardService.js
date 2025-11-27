import { apiGET } from "./api";

export function getDashboardData() {
  return apiGET("/dashboard");
}
