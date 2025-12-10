import React, { useEffect, useRef, useState } from "react";
import * as agService from "../../services/agendamentosService";
import * as gruposService from "../../services/gruposService";
import * as msgsService from "../../services/mensagensService";
import * as contatosService from "../../services/contatosService";
import styles from "./Agendamentos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { FaPlus, FaTrash, FaClock, FaCalendarAlt } from "react-icons/fa";

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
      try {
        return JSON.parse(v || "[]");
      } catch {
        return [];
      }
    }
    return v || [];
  }

  async function carregarDadosBasicos() {
    const [gs, ms, cs] = await Promise.all([
      gruposService.listGrupos(),
      msgsService.listMensagens(),
      contatosService.listContatos(),
    ]);
    setGrupos(gs || []);
    setMensagens(ms || []);
    setContatos(cs || []);
  }

  async function carregarAgendamentos() {
    const lista = await agService.listarAgendamentos();
    setAgendamentos((lista || []).map((a) => ({ ...a, dias: normalizeDias(a.dias) })));
  }

  async function refreshAll() {
    await Promise.all([carregarDadosBasicos(), carregarAgendamentos()]);
  }

  useEffect(() => {
    refreshAll();
  }, [atualizarToken]);

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
    setDiasSelecionados((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function criar() {
    if (!mensagemId) return alert("Selecione uma mensagem!");
    if (
      (tipo === "numero" && !numero) ||
      (tipo === "grupo" && !grupo) ||
      !horario ||
      diasSelecionados.length === 0
    ) {
      return alert("Preencha todos os campos e selecione ao menos um dia!");
    }

    const mensagemTexto = mensagens.find((m) => m.id == mensagemId)?.texto;

    await agService.criarAgendamento({
      numero: tipo === "numero" ? numero : null,
      grupo: tipo === "grupo" ? grupo : null,
      mensagem: mensagemTexto,
      horario,
      dias: diasSelecionados,
    });

    setNumero("");
    setGrupo("");
    setMensagemId("");
    setHorario("");
    setDiasSelecionados([]);

    await refreshAll();
    atualizar();
  }

  async function remover(id) {
    if (!confirm("Remover este agendamento?")) return;
    await agService.removerAgendamento(id);
    await refreshAll();
    atualizar();
  }

  const nomesDias = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb",
  };

  // helper: busca contato pelo número (string). Retorna objeto contato ou undefined.
  function contatoPorNumero(num) {
    if (!num) return undefined;
    return contatos.find(c => String(c.numero) === String(num) || String(c.id) === String(num));
  }

  // helper: busca nome do grupo pelo id
  function nomeDoGrupoPorId(id) {
    if (!id) return undefined;
    const g = grupos.find(x => String(x.id) === String(id));
    return g ? g.nome : undefined;
  }

  return (
    <div className={styles.container}>
      {/* ==== TOP BAR ==== */}
      <div className={styles.topBar}>
        <h5 className={styles.titulo}>Agendamentos</h5>
      </div>

      {/* ==== FORMULÁRIO ==== */}
      <div className={styles.row}>
        <label>Enviar para</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="numero">Número individual</option>
          <option value="grupo">Grupo</option>
        </select>

        {tipo === "numero" ? (
          <select value={numero} onChange={(e) => setNumero(e.target.value)}>
            <option value="">(Escolher número)</option>
            {contatos.map((c) => (
              <option key={c.id} value={c.numero}>
                {c.nome ? c.nome : "Sem nome"} — {c.numero}
              </option>
            ))}
          </select>
        ) : (
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">(Escolher grupo)</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.row}>
        <label>Mensagem</label>
        <select
          value={mensagemId}
          onChange={(e) => setMensagemId(e.target.value)}
        >
          <option value="">(Selecione)</option>
          {mensagens.map((m) => (
            <option key={m.id} value={m.id}>
              {m.texto}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <label>
          <FaClock /> Horário (HH:MM)
        </label>
        <input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
      </div>

      <div className={styles.row}>
        <label>
          <FaCalendarAlt /> Dias da semana
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={diasSelecionados.includes(d)}
                onChange={() => toggleDia(d)}
                value={d}
              />{" "}
              {nomesDias[d]}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.rowCenter}>
        <button className={styles.btn} onClick={criar}>
          <FaPlus /> Criar Agendamento
        </button>
      </div>

      {/* ==== LISTA ==== */}
      <div className={styles.listaContatos} style={{ marginTop: 10 }}>
        {agendamentos.map((a) => {
          const diasTexto = (a.dias || []).map((d) => nomesDias[d]).join(", ");

          // destino: se grupo => mostrar nome do grupo; se numero => mostrar nome + numero do contato (se encontrado)
          let destinoTexto = "";
          if (a.grupo) {
            const nomeGrupo = nomeDoGrupoPorId(a.grupo);
            destinoTexto = nomeGrupo ? `Grupo ${nomeGrupo}` : `Grupo ${a.grupo}`;
          } else if (a.numero) {
            const contato = contatoPorNumero(a.numero);
            destinoTexto = contato
              ? `${contato.nome ? contato.nome : "Sem nome"} — ${contato.numero}`
              : a.numero;
          }

          return (
            <div key={a.id} className={styles.listItem}>
              <div className={styles.spaceBetween}>
                <div>
                  <b>{destinoTexto}</b> → {a.mensagem}
                  <br />
                  ⏰ {a.horario} | 📅 {diasTexto}
                </div>

                <button
                  className={`${styles.smallBtn} ${styles.deleteButton}`}
                  onClick={() => remover(a.id)}
                >
                  <FaTrash /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}