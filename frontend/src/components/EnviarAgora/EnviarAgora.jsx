import React, { useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiSend, FiUsers, FiUser } from "react-icons/fi";
import { useAtualizar } from "../../context/AtualizarContexto";
import * as contatosService from "../../services/contatosService";
import * as enviarService from "../../services/enviarAgoraService";
import * as gruposService from "../../services/gruposService";
import * as mensagensService from "../../services/mensagensService";
import { getConnectedConnections, getStatus, hasConnectedConnection } from "../../services/statusService";
import styles from "./EnviarAgora.module.css";

function formatConnectionPhone(number) {
  if (!number) return "Numero nao vinculado";
  const digits = String(number).replace(/\D/g, "");
  if (!digits.startsWith("55") || digits.length < 12) return number;

  const local = digits.slice(4);
  const prefix = local.length === 9 ? local.slice(0, 5) : local.slice(0, 4);
  const suffix = local.length === 9 ? local.slice(5) : local.slice(4);

  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${prefix}-${suffix}`;
}

export default function EnviarAgora() {
  const [contatos, setContatos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState([]);
  const [numero, setNumero] = useState("");
  const [grupo, setGrupo] = useState("");
  const [mensagemId, setMensagemId] = useState("");
  const [toast, setToast] = useState(null);
  const { atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  async function carregarDados() {
    const [listaContatos, listaGrupos, listaMensagens, status] = await Promise.all([
      contatosService.listContatos(),
      gruposService.listGrupos(),
      mensagensService.listMensagens(),
      getStatus(),
    ]);

    setContatos(listaContatos || []);
    setGrupos(listaGrupos || []);
    setMensagens(listaMensagens || []);
    setConnections(getConnectedConnections(status));
  }

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), type === "error" ? 5000 : 3200);
  }

  useEffect(() => {
    carregarDados();
    return () => {
      clearInterval(pollingRef.current);
      window.clearTimeout(showToast.timeoutId);
    };
  }, [atualizarToken]);

  useEffect(() => {
    pollingRef.current = setInterval(carregarDados, 3000);
    return () => clearInterval(pollingRef.current);
  }, []);

  async function enviarAgora() {
    if (!numero && !grupo) return showToast("error", "Selecione um numero ou um grupo.");
    if (!mensagemId) return showToast("error", "Selecione uma mensagem.");

    try {
      const status = await getStatus();
      if (!hasConnectedConnection(status)) {
        return showToast("error", "Conecte o WhatsApp antes de enviar.");
      }
    } catch (error) {
      return showToast("error", "Nao foi possivel verificar a conexao.");
    }

    const mensagemTexto = mensagens.find((item) => String(item.id) === String(mensagemId))?.texto;

    try {
      await enviarService.enviarAgora({
        numero: numero || null,
        grupo_id: grupo || null,
        mensagem: mensagemTexto,
        connection_ids: selectedConnectionIds,
      });

      setNumero("");
      setGrupo("");
      setMensagemId("");
      setSelectedConnectionIds([]);
      showToast("success", "Mensagem enviada com sucesso.");
    } catch (error) {
      showToast("error", error?.message || "Erro ao enviar a mensagem.");
    }
  }

  function toggleConnection(connectionId) {
    setSelectedConnectionIds((prev) =>
      prev.includes(connectionId) ? prev.filter((item) => item !== connectionId) : [...prev, connectionId],
    );
  }

  return (
    <>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Disparo rapido</span>
            <h3 className={styles.title}>Enviar agora</h3>
          </div>
          <span className={styles.badge}>Entrega imediata</span>
        </header>

        <div className={styles.grid}>
          <article className={styles.block}>
            <label className={styles.label}>
              <span className={styles.labelIcon}><FiUser size={15} /></span>
              Numero
            </label>
            <select
              value={numero}
              disabled={grupo !== ""}
              onChange={(event) => {
                setNumero(event.target.value);
                if (event.target.value) setGrupo("");
              }}
            >
              <option value="">Escolher numero</option>
              {contatos.map((contato) => (
                <option key={contato.id} value={contato.numero}>
                  {contato.nome ? `${contato.nome} - ${contato.numero}` : contato.numero}
                </option>
              ))}
            </select>
          </article>

          <article className={styles.block}>
            <label className={styles.label}>
              <span className={styles.labelIcon}><FiUsers size={15} /></span>
              Grupo
            </label>
            <select
              value={grupo}
              disabled={numero !== ""}
              onChange={(event) => {
                setGrupo(event.target.value);
                if (event.target.value) setNumero("");
              }}
            >
              <option value="">Escolher grupo</option>
              {grupos.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </article>
        </div>

        <article className={`${styles.block} ${styles.fullWidth}`}>
          <label className={styles.label}>
            <span className={styles.labelIcon}><FiMessageSquare size={15} /></span>
            Mensagem
          </label>
          <select value={mensagemId} onChange={(event) => setMensagemId(event.target.value)}>
            <option value="">Selecione um template</option>
            {mensagens.map((mensagem) => (
              <option key={mensagem.id} value={mensagem.id}>
                {mensagem.texto.length > 110 ? `${mensagem.texto.slice(0, 110)}...` : mensagem.texto}
              </option>
            ))}
          </select>
        </article>

        <article className={`${styles.block} ${styles.fullWidth}`}>
          <label className={styles.label}>
            <span className={styles.labelIcon}><FiSend size={15} /></span>
            Enviar usando
          </label>

          {connections.length === 0 ? (
            <p className={styles.connectionHint}>Nenhum numero conectado no momento.</p>
          ) : (
            <>
              <p className={styles.connectionHint}>
                Sem selecionar nenhum numero, o envio sera feito por todos os numeros conectados.
              </p>
              <div className={styles.connectionPicker}>
                {connections.map((connection) => {
                  const selected = selectedConnectionIds.includes(connection.id);

                  return (
                    <button
                      key={connection.id}
                      type="button"
                      className={`${styles.connectionChip} ${selected ? styles.connectionChipActive : ""}`}
                      onClick={() => toggleConnection(connection.id)}
                    >
                      <strong>{connection.name}</strong>
                      <span>{formatConnectionPhone(connection.connectedNumber)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </article>

        <button type="button" className={styles.sendButton} onClick={enviarAgora}>
          <FiSend size={16} />
          Enviar mensagem agora
        </button>
      </section>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.text}
        </div>
      )}
    </>
  );
}
