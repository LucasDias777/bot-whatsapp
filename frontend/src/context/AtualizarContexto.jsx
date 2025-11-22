import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// Cria o contexto
const AtualizarContexto = createContext();

// Hook para usar o contexto
export function useAtualizar() {
  return useContext(AtualizarContexto);
}

// Provider que envolve a aplicação
export function AtualizarProvider({ children }) {
  const [atualizarToken, setAtualizarToken] = useState(Date.now());

  // BroadcastChannel para atualizações entre componentes/abas (opcional, mas ajuda)
  const canal = useMemo(() => {
    try {
      return new BroadcastChannel("bot-whatsapp-atualizacoes");
    } catch {
      return null;
    }
  }, []);

  // Função que força atualização global
  function atualizar() {
    const novoToken = Date.now();
    setAtualizarToken(novoToken);

    // dispara eventos no ambiente para quem quiser escutar sem importar o contexto
    window.dispatchEvent(new CustomEvent("atualizar-dados", { detail: { token: novoToken } }));
    if (canal) canal.postMessage({ type: "atualizar", token: novoToken });
  }

  // Ouve eventos externos e reflete no contexto
  useEffect(() => {
    function onAtualizar() {
      setAtualizarToken(Date.now());
    }
    window.addEventListener("atualizar-dados", onAtualizar);
    if (canal) {
      canal.onmessage = (msg) => {
        if (msg?.data?.type === "atualizar") setAtualizarToken(msg.data.token || Date.now());
      };
    }
    return () => {
      window.removeEventListener("atualizar-dados", onAtualizar);
      if (canal) canal.close?.();
    };
  }, [canal]);

  return (
    <AtualizarContexto.Provider value={{ atualizar, atualizarToken }}>
      {children}
    </AtualizarContexto.Provider>
  );
}
