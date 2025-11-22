import React, { useEffect, useState } from "react";
import { getStatus } from "../../services/statusService";
import styles from "./Status.module.css";

export default function Status() {
  const [status, setStatus] = useState({ conectado: false, qr: "" });

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const s = await getStatus();
        if (mounted) setStatus(s);
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className={`${styles.card} card`}>
      <h5>Status de Conexão</h5>
      <p id="status">{status.conectado ? "✅ Conectado" : "⏳ Aguardando QR"}</p>
      <div id="qrContainer" className={styles.qr}>
        {!status.conectado && status.qr ? <img src={status.qr} alt="QR Code" width="250" /> : null}
      </div>
    </div>
  );
}
