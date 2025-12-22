const API_URL = "http://localhost:3000";

async function apiGET(path) {
  const res = await fetch(API_URL + path);

  if (!res.ok) {
    const error = new Error("Erro na requisição");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function apiPOST(path, body) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = new Error("Erro na requisição");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function apiPUT(path, body) {
  const res = await fetch(API_URL + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = new Error("Erro na requisição");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function apiDELETE(path) {
  const res = await fetch(API_URL + path, { method: "DELETE" });

  if (!res.ok) {
    const error = new Error("Erro na requisição");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export { apiGET, apiPOST, apiPUT, apiDELETE };