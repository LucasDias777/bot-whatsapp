import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        return "⏳ Carregando status";
      case "checking":
        return "🔍 Verificando Conexão";
      case "qr":
        return "📱 Escaneie o QR Code";
      case "connected":
        return "✅ Conectado";
      case "disconnecting":
        return "🔴 Desconectando";
      case "remote_disconnected":
        return "🔒 Sessão desconectada remotamente";
      default:
        return "ℹ️ Aguardando";
    }
  }

  const statusWithDots = ["loading", "checking", "disconnecting"];

  // ====================================
  // Animações (linguagem Apple-like)
  // ====================================
  const sceneVariants = {
    initial: {
      opacity: 0,
      y: 24,
      scale: 0.97,
      filter: "blur(4px)"
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -16,
      scale: 0.98,
      filter: "blur(6px)",
      transition: {
        duration: 0.35,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

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
    <motion.div
      layout
      className={[
        styles.dashboardCard,
        effectiveStatus === "disconnecting" && styles.disconnecting,
        effectiveStatus === "checking" && styles.checking
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h5
        className={[
          styles.titulo,
          effectiveStatus === "disconnecting" && styles.tituloDisconnecting
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Status de Conexão
      </h5>

      {/* ====================================
          CENA PRINCIPAL (STATUS)
         ==================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={effectiveStatus}
          variants={sceneVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
          className={styles.scene}
        >
          <p className={styles.statusText}>
            {statusMessage()}
            {statusWithDots.includes(effectiveStatus) && (
              <span className={styles.dots}>
                <i />
                <i />
                <i />
              </span>
            )}
          </p>

          {(effectiveStatus === "loading" ||
            effectiveStatus === "checking" ||
            effectiveStatus === "disconnecting") && (
            <div className={styles.spinner} />
          )}

          {effectiveStatus === "connected" && info.connectedNumber && (
            <motion.p
              layout
              className={styles.connectedNumber}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              📞 Número: <strong>{formatPhone(info.connectedNumber)}</strong>
            </motion.p>
          )}

          {effectiveStatus === "qr" && info.qr && (
            <motion.div
              layout
              className={styles.qr}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <img src={info.qr} alt="QR Code" width="260" />
            </motion.div>
          )}

          {effectiveStatus === "connected" && (
            <motion.button
              layout
              className={styles.disconnectBtn}
              onClick={() => setShowConfirm(true)}
              disabled={loadingAction}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Desconectar
            </motion.button>
          )}

          {error && (
            <motion.p
              className={styles.error}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ====================================
          MODAL
         ==================================== */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}