import React, { useEffect, useState, useRef } from "react";
import { getStatus, connect, disconnect } from "../../services/statusService";
import styles from "./Status.module.css";

export default function Status() {
  const [info, setInfo] = useState({
    status: "idle",
    qr: "",
    connectedNumber: null,
    lastQRCodeTime: null
  });

  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const pollingRef = useRef(null);

  // ------------------------------------------------------
  // POLLING CONTROLADO
  // ------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const s = await getStatus();
        if (!mounted) return;

        setInfo(s);

        if (s.status === "connected" && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        if (s.status !== "connected" && !pollingRef.current) {
          pollingRef.current = setInterval(fetchStatus, 1500);
        }
      } catch {}
    }

    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 1500);

    return () => {
      mounted = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------
  // STATUS TEXT
  // ------------------------------------------------------
  function statusMessage() {
    switch (info.status) {
      case "idle":
        return "🔌 Desconectado";
      case "waiting":
        return "⏳ Aguardando inicialização...";
      case "qr":
        return "📱 Escaneie o QR Code!";
      case "connected":
        return "✅ Conectado";
      case "disconnecting":
        return "⚠️ Desconectando...";
      default:
        return "ℹ️ Desconhecido";
    }
  }

  // ------------------------------------------------------
  // QR EXPIRADO (60s)
  // ------------------------------------------------------
  const qrExpired =
    info.lastQRCodeTime &&
    Date.now() - info.lastQRCodeTime > 60_000 &&
    info.status === "qr";

  // ------------------------------------------------------
  // ACTIONS
  // ------------------------------------------------------
  async function handleConnect() {
    setError(null);
    setLoadingAction(true);
    try {
      await connect();
    } catch {
      setError("Erro ao iniciar conexão.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function confirmDisconnect() {
    setShowConfirm(false);
    setError(null);
    setLoadingAction(true);
    try {
      await disconnect();
      setInfo({
        status: "idle",
        qr: "",
        connectedNumber: null,
        lastQRCodeTime: null
      });

      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          const s = await getStatus();
          setInfo(s);
        }, 1500);
      }
    } catch {
      setError("Erro ao desconectar.");
    } finally {
      setLoadingAction(false);
    }
  }

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------
  return (
    <div className={styles.dashboardCard}>
      <h5 className={styles.titulo}>Status de Conexão</h5>

      <p
        className={`${styles.statusText} ${
          info.status === "connected"
            ? styles.statusOk
            : styles.statusWait
        }`}
      >
        {statusMessage()}
      </p>

      {info.status === "connected" && info.connectedNumber && (
        <p className={styles.connectedNumber}>
          📞 Número: <strong>{info.connectedNumber}</strong>
        </p>
      )}

      <div className={styles.qr}>
        {!info.connectedNumber && info.qr && (
          <img src={info.qr} alt="QR Code" width="250" />
        )}
      </div>

      {qrExpired && (
        <p className={styles.warning}>
          ⏱️ QR Code expirado. Clique em conectar novamente.
        </p>
      )}

      <div className={styles.actions}>
        {info.status === "connected" ? (
          <button
            className={styles.disconnectBtn}
            onClick={() => setShowConfirm(true)}
            disabled={loadingAction}
          >
            Desconectar
          </button>
        ) : (
          <button
            className={styles.connectBtn}
            onClick={handleConnect}
            disabled={
              loadingAction ||
              info.status === "waiting" ||
              info.status === "qr"
            }
          >
            {loadingAction ? "Conectando..." : "Conectar"}
          </button>
        )}
      </div>

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