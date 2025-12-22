import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AtualizarContexto = createContext();

export function useAtualizar() {
  return useContext(AtualizarContexto);
}

export function AtualizarProvider({ children }) {
  const [atualizarToken, setAtualizarToken] = useState(Date.now());

  const canal = useMemo(() => {
    try {
      return new BroadcastChannel("bot-whatsapp-atualizacoes");
    } catch {
      return null;
    }
  }, []);

  function atualizar() {
    const novoToken = Date.now();
    setAtualizarToken(novoToken);

    window.dispatchEvent(
      new CustomEvent("atualizar-dados", { detail: { token: novoToken } }),
    );
    if (canal) canal.postMessage({ type: "atualizar", token: novoToken });

    window.atualizarDashboard = atualizar;
  }

  useEffect(() => {
    function onAtualizar() {
      setAtualizarToken(Date.now());
    }

    window.addEventListener("atualizar-dados", onAtualizar);
    if (canal) {
      canal.onmessage = (msg) => {
        if (msg?.data?.type === "atualizar")
          setAtualizarToken(msg.data.token || Date.now());
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