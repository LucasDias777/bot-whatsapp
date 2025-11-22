import React, { useEffect, useRef, useState } from "react";
import * as contatosService from "../../services/contatosService";
import * as gruposService from "../../services/gruposService";
import * as mensagensService from "../../services/mensagensService";
import * as enviarService from "../../services/enviarAgoraService";
import styles from "./EnviarAgora.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";

export default function EnviarAgora() {
  const [contatos, setContatos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);

  const [numero, setNumero] = useState("");
  const [grupo, setGrupo] = useState("");
  const [mensagemId, setMensagemId] = useState("");

  // Contexto de atualização global
  const { atualizarToken } = useAtualizar();

  const pollingRef = useRef(null);

  async function carregarDados() {
    const [cs, gs, ms] = await Promise.all([
      contatosService.listContatos(),
      gruposService.listGrupos(),
      mensagensService.listMensagens()
    ]);
    setContatos(cs);
    setGrupos(gs);
    setMensagens(ms);
  }

  // Carrega inicialmente e toda vez que houver atualização global
  useEffect(() => {
    carregarDados();
  }, [atualizarToken]);

  // Atualiza ao recuperar foco (ex.: alternou para Mensagens, criou nova, voltou)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") carregarDados();
    }
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () => window.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Polling leve para garantir atualização mesmo sem disparar contexto (ex.: outro componente não chama atualizar())
  useEffect(() => {
    // evita múltiplos intervalos
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      carregarDados();
    }, 1000); // a cada 3s
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function bloquearGrupoOuNumero(tipo) {
    if (tipo === "numero" && numero) {
      setGrupo("");
    } else if (tipo === "grupo" && grupo) {
      setNumero("");
    }
  }

  async function enviarAgora() {
    if (!mensagemId) return alert("Selecione uma mensagem!");
    const mensagemTexto = mensagens.find(m => m.id == mensagemId)?.texto;
    if (!numero && !grupo) return alert("Selecione um número ou grupo!");

    await enviarService.enviarAgora({
      numero: numero || null,
      grupo_id: grupo || null,
      mensagem: mensagemTexto
    });

    alert("✅ Mensagem enviada!");

    // Opcional: resetar seleção após enviar
    setNumero("");
    setGrupo("");
    setMensagemId("");

    // Recarrega após envio (mantém tudo sincronizado)
    await carregarDados();
  }

  return (
    <div className={`card ${styles.container}`}>
      <h5>Enviar Agora</h5>
      <div className="row">
        <label>Número</label>
        <select
          value={numero}
          onChange={e => {
            setNumero(e.target.value);
            bloquearGrupoOuNumero("numero");
          }}
        >
          <option value="">(Escolher número)</option>
          {contatos.map(c => (
            <option key={c.id} value={c.numero}>{c.numero}</option>
          ))}
        </select>

        <label>Ou selecionar Grupo</label>
        <select
          value={grupo}
          onChange={e => {
            setGrupo(e.target.value);
            bloquearGrupoOuNumero("grupo");
          }}
        >
          <option value="">(Nenhum)</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <label>Mensagem</label>
        <select
          value={mensagemId}
          onChange={e => setMensagemId(e.target.value)}
        >
          <option value="">(Selecione)</option>
          {mensagens.map(m => (
            <option key={m.id} value={m.id}>{m.texto}</option>
          ))}
        </select>
      </div>

      <div>
        <button className="btn" onClick={enviarAgora}>Enviar Mensagem</button>
      </div>
    </div>
  );
}
