import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as contatosService from "../../services/contatosService";
import * as gruposService from "../../services/gruposService";
import * as mensagensService from "../../services/mensagensService";
import * as enviarService from "../../services/enviarAgoraService";
import { getStatus } from "../../services/statusService";
import styles from "./EnviarAgora.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { FaPaperPlane, FaUsers, FaUser, FaCommentDots } from "react-icons/fa";

export default function EnviarAgora() {
  const [contatos, setContatos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);

  const [numero, setNumero] = useState("");
  const [grupo, setGrupo] = useState("");
  const [mensagemId, setMensagemId] = useState("");

  const [toast, setToast] = useState(null);

  const { atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  async function carregarDados() {
    const [cs, gs, ms] = await Promise.all([
      contatosService.listContatos(),
      gruposService.listGrupos(),
      mensagensService.listMensagens(),
    ]);
    setContatos(cs);
    setGrupos(gs);
    setMensagens(ms);
  }

  useEffect(() => {
    carregarDados();
  }, [atualizarToken]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") carregarDados();
    }
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      window.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      carregarDados();
    }, 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function bloquearGrupoOuNumero(tipo) {
    if (tipo === "numero") {
      if (numero) setGrupo("");
    } else if (tipo === "grupo") {
      if (grupo) setNumero("");
    }
  }

 function showToast(type, text) {
  setToast({ type, text });

  const duration = type === "error" ? 5000 : 4000;

  setTimeout(() => {
    setToast(null);
  }, duration);
}

  async function enviarAgora() {
    if (!numero && !grupo) {
      showToast("error", "Selecione um número ou grupo.");
      return;
    }

    if (!mensagemId) {
      showToast("error", "Selecione uma mensagem.");
      return;
    }

    // 🔒 VERIFICAÇÃO REAL DO STATUS DO WHATSAPP
    let statusInfo;
    try {
      statusInfo = await getStatus();
    } catch {
      showToast(
        "error",
        "Não foi possível verificar o status do WhatsApp."
      );
      return;
    }

    if (statusInfo.status !== "connected") {
      showToast(
        "error",
        "WhatsApp desconectado. Conecte antes de enviar a mensagem."
      );
      return;
    }

    const mensagemTexto = mensagens.find((m) => m.id == mensagemId)?.texto;

    try {
      await enviarService.enviarAgora({
        numero: numero || null,
        grupo_id: grupo || null,
        mensagem: mensagemTexto,
      });

      showToast("success", "Mensagem enviada com sucesso!");

      setNumero("");
      setGrupo("");
      setMensagemId("");

      await carregarDados();
    } catch {
      showToast("error", "Erro ao enviar mensagem.");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h5 className={styles.titulo}>Enviar Agora</h5>
      </div>

      {/* === SELECIONAR NÚMERO OU GRUPO === */}
      <div className={styles.row}>
        <label>
          <FaUser /> Número
        </label>
        <select
          className={styles.select}
          value={numero}
          disabled={grupo !== ""}
          onChange={(e) => {
            setNumero(e.target.value);
            bloquearGrupoOuNumero("numero");
          }}
        >
          <option value="">(Escolher número)</option>
          {contatos.map((c) => (
            <option key={c.id} value={c.numero}>
              {c.nome ? `${c.nome} – ${c.numero}` : c.numero}
            </option>
          ))}
        </select>

        <label>
          <FaUsers /> Grupo
        </label>
        <select
          className={styles.select}
          value={grupo}
          disabled={numero !== ""}
          onChange={(e) => {
            setGrupo(e.target.value);
            bloquearGrupoOuNumero("grupo");
          }}
        >
          <option value="">(Nenhum)</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      {/* === SELECIONAR MENSAGEM === */}
      <div className={styles.row}>
        <label>
          <FaCommentDots /> Mensagem
        </label>
        <select
          className={styles.select}
          value={mensagemId}
          onChange={(e) => setMensagemId(e.target.value)}
        >
          <option value="">(Selecione)</option>
          {mensagens.map((m) => (
            <option key={m.id} value={m.id}>
              {m.texto.length > 60 ? m.texto.slice(0, 60) + "..." : m.texto}
            </option>
          ))}
        </select>
      </div>

      {/* === BOTÃO === */}
      <div className={styles.row}>
        <button className={styles.btn} onClick={enviarAgora}>
          <FaPaperPlane /> Enviar Mensagem
        </button>
      </div>

      {/* === TOAST === */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${
              toast.type === "error"
                ? styles.toastError
                : styles.toastSuccess
            }`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {toast.type === "success" ? "✅" : "⚠️"} {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}