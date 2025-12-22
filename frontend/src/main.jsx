import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import { backendReady } from "./services/backend";

// ========================================================
// AGUARDA BACKEND ESTAR 100% PRONTO
// ========================================================
async function waitBackendReady() {
  while (true) {
    try {
      const data = await backendReady();

      if (data.backendReady === true) {
        console.log("✅ Backend pronto, iniciando frontend");
        return;
      }
    } catch (err) {
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
// ========================================================
// BOOT CONTROLADO DO FRONTEND
// ========================================================
(async function bootstrap() {
  await waitBackendReady();

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Elemento #root não encontrado");
    return;
  }

  createRoot(rootElement).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
})();