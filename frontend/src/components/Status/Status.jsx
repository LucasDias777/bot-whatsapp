import React, { useEffect, useState } from "react";
import { getStatus, disconnect } from "../../services/statusService";
import styles from "./Status.module.css";

export default function Status() {
  const [info, setInfo] = useState({ status: "loading" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);

  // ====================================
  // Polling do status
  // ====================================
  useEffect(() => {
    async function loadStatus() {
      const s = await getStatus();
      setInfo(s);
    }

    loadStatus();

    const timer = setInterval(async () => {
      const s = await getStatus();
      setInfo(s);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const effectiveStatus = info.status;

  // ====================================
  // FORMATAÇÃO DO NUMERO
  // ====================================
  function formatPhone(number) {
    if (!number) return "";

    const digits = number.replace(/\D/g, "");

    if (digits.length < 12) return number;

    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, 8);
    const last = digits.slice(8);

    return `+${ddi} (${ddd}) ${first}-${last}`;
  }

  // ====================================
  // Mensagem de status
  // ====================================
  function statusMessage() {
    switch (effectiveStatus) {
      case "loading":
        return "⏳ Carregando status...";
      case "checking":
        return "🔍 Verificando conexão...";
      case "qr":
        return "📱 Escaneie o QR Code";
      case "connected":
        return "✅ Conectado";
      case "disconnecting":
        return "🔴 Desconectando...";
      case "remote_disconnected":
        return "🔒 Sessão desconectada remotamente";
      default:
        return "ℹ️ Aguardando...";
    }
  }

  // ====================================
  // Desconectar manual
  // ====================================
  async function confirmDisconnect() {
    setShowConfirm(false);
    setError(null);
    setLoadingAction(true);

    try {
      await disconnect();
    } catch {
      setError("Erro ao desconectar.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div
      className={[
        styles.dashboardCard,
        effectiveStatus === "disconnecting" && styles.disconnecting,
        effectiveStatus === "checking" && styles.checking,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h5
        className={[
          styles.titulo,
          effectiveStatus === "disconnecting" && styles.tituloDisconnecting,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Status de Conexão
      </h5>

      <p className={styles.statusText}>{statusMessage()}</p>

      {(effectiveStatus === "loading" ||
        effectiveStatus === "checking" ||
        effectiveStatus === "disconnecting") && (
        <div className={styles.spinner} />
      )}

      {effectiveStatus === "connected" && info.connectedNumber && (
        <p className={styles.connectedNumber}>
          📞 Número: <strong>{formatPhone(info.connectedNumber)}</strong>
        </p>
      )}

      {effectiveStatus === "qr" && info.qr && (
        <div className={styles.qr}>
          <img src={info.qr} alt="QR Code" width="260" />
        </div>
      )}

      {effectiveStatus === "connected" && (
        <button
          className={styles.disconnectBtn}
          onClick={() => setShowConfirm(true)}
          disabled={loadingAction}
        >
          Desconectar
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {showConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h4>Desconectar WhatsApp?</h4>
            <p>
              Essa ação encerrará a sessão atual e exigirá um novo QR Code para
              conectar novamente.
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </button>

              <button
                className={styles.confirmBtn}
                onClick={confirmDisconnect}
                disabled={loadingAction}
              >
                {loadingAction ? "Desconectando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}