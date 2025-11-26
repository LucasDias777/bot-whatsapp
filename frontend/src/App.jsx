import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard";

import ContatosPage from "./pages/ContatosPage";
import GruposPage from "./pages/GruposPage";
import MensagensPage from "./pages/MensagensPage";
import AgendamentosPage from "./pages/AgendamentosPage";
import EnviarAgoraPage from "./pages/EnviarAgoraPage";

import { AtualizarProvider } from "./context/AtualizarContexto";

export default function App() {
  return (
    <AtualizarProvider>
      <Routes>
        <Route path="/" element={<Dashboard />}>

          {/* 🔥 Removido StatusPage para evitar duplicação */}
          <Route index element={null} />

          <Route path="contatos" element={<ContatosPage />} />
          <Route path="grupos" element={<GruposPage />} />
          <Route path="mensagens" element={<MensagensPage />} />
          <Route path="agendamentos" element={<AgendamentosPage />} />
          <Route path="enviar-agora" element={<EnviarAgoraPage />} />
        </Route>
      </Routes>
    </AtualizarProvider>
  );
}
