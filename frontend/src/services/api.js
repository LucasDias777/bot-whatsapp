const API_URL = (() => {
  const hostname = window.location.hostname || "localhost";
  const sameOriginPorts = new Set(["3000", ""]);

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (sameOriginPorts.has(window.location.port)) {
    return window.location.origin;
  }

  return `${window.location.protocol}//${hostname}:3000`;
})();

async function createHttpError(res) {
  let message = "Erro na requisicao";

  try {
    const data = await res.clone().json();
    if (data?.erro) {
      message = data.erro;
    } else if (data?.message) {
      message = data.message;
    }
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {}
  }

  const error = new Error(message);
  error.status = res.status;
  return error;
}

async function apiGET(path) {
  const res = await fetch(API_URL + path);

  if (!res.ok) {
    throw await createHttpError(res);
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
    throw await createHttpError(res);
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
    throw await createHttpError(res);
  }

  return res.json();
}

async function apiDELETE(path) {
  const res = await fetch(API_URL + path, { method: "DELETE" });

  if (!res.ok) {
    throw await createHttpError(res);
  }

  return res.json();
}

export { apiGET, apiPOST, apiPUT, apiDELETE };
