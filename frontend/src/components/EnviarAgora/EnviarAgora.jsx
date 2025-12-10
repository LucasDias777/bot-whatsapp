import React, { useEffect, useRef, useState } from "react";
import * as contatosService from "../../services/contatosService";
import * as gruposService from "../../services/gruposService";
import * as mensagensService from "../../services/mensagensService";
import * as enviarService from "../../services/enviarAgoraService";
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

  async function enviarAgora() {
    // NOVA ORDEM DE VALIDAÇÃO
    if (!numero && !grupo) return alert("Selecione um número ou grupo!");
    if (!mensagemId) return alert("Selecione uma mensagem!");

    const mensagemTexto = mensagens.find((m) => m.id == mensagemId)?.texto;

    await enviarService.enviarAgora({
      numero: numero || null,
      grupo_id: grupo || null,
      mensagem: mensagemTexto,
    });

    alert("✅ Mensagem enviada!");

    setNumero("");
    setGrupo("");
    setMensagemId("");

    await carregarDados();
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
    </div>
  );
}