import React, { useEffect, useRef, useState } from "react";
import * as agService from "../../services/agendamentosService";
import * as gruposService from "../../services/gruposService";
import * as msgsService from "../../services/mensagensService";
import * as contatosService from "../../services/contatosService";
import styles from "./Agendamentos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";

export default function Agendamentos() {
  const [tipo, setTipo] = useState("numero");
  const [numero, setNumero] = useState("");
  const [grupo, setGrupo] = useState("");
  const [mensagemId, setMensagemId] = useState("");
  const [horario, setHorario] = useState("");
  const [diasSelecionados, setDiasSelecionados] = useState([]);

  const [agendamentos, setAgendamentos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [contatos, setContatos] = useState([]);

  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  function normalizeDias(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { return JSON.parse(v || "[]"); } catch { return []; }
    }
    return v || [];
  }

  async function carregarDadosBasicos() {
    const [gs, ms, cs] = await Promise.all([
      gruposService.listGrupos(),
      msgsService.listMensagens(),
      contatosService.listContatos()
    ]);
    setGrupos(gs);
    setMensagens(ms);
    setContatos(cs);
  }

  async function carregarAgendamentos() {
    const lista = await agService.listarAgendamentos();
    setAgendamentos(lista.map(a => ({ ...a, dias: normalizeDias(a.dias) })));
  }

  async function refreshAll() {
    await Promise.all([carregarDadosBasicos(), carregarAgendamentos()]);
  }

  // Inicial + sempre que houver atualização global
  useEffect(() => {
    refreshAll();
  }, [atualizarToken]);

  // Atualiza ao recuperar foco (se mudou algo em outro componente)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    }
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

  // Polling leve como fallback (alinha com EnviarAgora)
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      refreshAll();
    }, 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function toggleDia(v) {
    setDiasSelecionados(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function criar() {
    if (!mensagemId) return alert("Selecione uma mensagem!");
    if ((tipo === "numero" && !numero) || (tipo === "grupo" && !grupo) || !horario || diasSelecionados.length === 0) {
      return alert("Preencha todos os campos e selecione ao menos um dia!");
    }

    const mensagemTexto = mensagens.find(m => m.id == mensagemId)?.texto;
    await agService.criarAgendamento({
      numero: tipo === "numero" ? numero : null,
      grupo: tipo === "grupo" ? grupo : null,
      mensagem: mensagemTexto,
      horario,
      dias: diasSelecionados
    });

    // limpa campos
    setNumero("");
    setGrupo("");
    setMensagemId("");
    setHorario("");
    setDiasSelecionados([]);

    // recarrega e notifica globalmente
    await refreshAll();
    atualizar();
  }

  async function remover(id) {
    if (!confirm("Remover este agendamento?")) return;
    await agService.removerAgendamento(id);
    await refreshAll();
    atualizar();
  }

  const nomesDias = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

  return (
    <div className={`card ${styles.container}`}>
      <h5>Agendamentos</h5>

      <div className="row">
        <label>Enviar para</label>
        <select value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="numero">Número individual</option>
          <option value="grupo">Grupo</option>
        </select>

        {tipo === "numero" ? (
          <select value={numero} onChange={e => setNumero(e.target.value)}>
            <option value="">(Escolher número)</option>
            {contatos.map(c => <option key={c.id} value={c.numero}>{c.numero}</option>)}
          </select>
        ) : (
          <select value={grupo} onChange={e => setGrupo(e.target.value)}>
            <option value="">(Escolher grupo)</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        )}
      </div>

      <div className="row">
        <label>Mensagem</label>
        <select value={mensagemId} onChange={e => setMensagemId(e.target.value)}>
          <option value="">(Selecione)</option>
          {mensagens.map(m => <option key={m.id} value={m.id}>{m.texto}</option>)}
        </select>
      </div>

      <div>
        <label>Horário (HH:MM)</label>
        <input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
      </div>

      <div>
        <label>Dias da semana</label>
        <div className="row">
          {[1, 2, 3, 4, 5, 6, 0].map(d => (
            <label key={d}>
              <input
                type="checkbox"
                checked={diasSelecionados.includes(d)}
                onChange={() => toggleDia(d)}
                value={d}
              /> {nomesDias[d]}
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={criar}>Criar Agendamento</button>
      </div>

      <div id="listaAgendamentos" style={{ marginTop: 10 }}>
        {agendamentos.map(a => {
          const diasTexto = (a.dias || []).map(d => nomesDias[d]).join(", ");
          const destinoTexto = a.grupo ? `Grupo ${a.grupo}` : a.numero;
          return (
            <div key={a.id} className="list-item">
              <div className="space-between">
                <div>
                  <b>{destinoTexto}</b> → {a.mensagem}<br />
                  ⏰ {a.horario} | 📅 {diasTexto}
                </div>
                <div>
                  <button className="small-btn" onClick={() => remover(a.id)}>Excluir</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
