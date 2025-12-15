import React, { useEffect, useState } from "react";
import { getStatus, disconnect } from "../../services/statusService";
import styles from "./Status.module.css";

export default function Status() {
  // ====================================
  // Estado inicial ajustado para evitar flicker
  // ====================================
  const [info, setInfo] = useState({ status: "loading" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);

  // ====================================
  // Polling do status com primeira chamada imediata
  // ====================================
  useEffect(() => {
    async function loadStatus() {
      const s = await getStatus();
      setInfo(s);
    }

    loadStatus(); // primeira chamada imediata

    const timer = setInterval(async () => {
      const s = await getStatus();
      setInfo(s);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  // ====================================
  // Mensagem de status
  // ====================================
  function statusMessage() {
    switch (info.status) {
      case "loading":
        return "⏳ Carregando status...";
      case "checking":
        return "🔍 Verificando conexão...";
      case "qr":
        return "📱 Escaneie o QR Code";
      case "connected":
        return "✅ Conectado";
      case "disconnecting":
        return "⚠️ Desconectando...";
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
      setInfo({ status: "loading" });
    } catch {
      setError("Erro ao desconectar.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className={styles.dashboardCard}>
      <h5 className={styles.titulo}>Status de Conexão</h5>

      <p className={styles.statusText}>{statusMessage()}</p>

      {info.status === "connected" && info.connectedNumber && (
        <p className={styles.connectedNumber}>
          📞 Número: <strong>{info.connectedNumber}</strong>
        </p>
      )}

      {info.status === "qr" && info.qr && (
        <img src={info.qr} alt="QR Code" width="260" />
      )}

      {info.status === "connected" && (
        <button
          className={styles.disconnectBtn}
          onClick={() => setShowConfirm(true)}
          disabled={loadingAction}
        >
          Desconectar
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* ================= CONFIRMAÇÃO ================= */}
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