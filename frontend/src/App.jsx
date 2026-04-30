import React from "react";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard";
import { AtualizarProvider } from "./context/AtualizarContexto";
import AgendamentosPage from "./pages/AgendamentosPage";
import ContatosPage from "./pages/ContatosPage";
import EnviarAgoraPage from "./pages/EnviarAgoraPage";
import GruposPage from "./pages/GruposPage";
import MensagensPage from "./pages/MensagensPage";
import StatusPage from "./pages/StatusPage";

export default function App() {
  return (
    <AtualizarProvider>
      <Routes>
        <Route path="/" element={<Dashboard />}>
          <Route index element={null} />
          <Route path="sessoes" element={<StatusPage />} />
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
