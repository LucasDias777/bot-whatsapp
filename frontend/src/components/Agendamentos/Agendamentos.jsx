import React, { useEffect, useRef, useState } from "react";
import * as agService from "../../services/agendamentosService";
import * as gruposService from "../../services/gruposService";
import * as msgsService from "../../services/mensagensService";
import * as contatosService from "../../services/contatosService";
import styles from "./Agendamentos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { FiPlus, FiTrash, FiClock, FiCalendar, FiEdit } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Agendamentos() {
  // CRIAR AGENDAMENTO
  const [tipo, setTipo] = useState("numero");
  const [contatoId, setContatoId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [mensagemId, setMensagemId] = useState("");
  const [horario, setHorario] = useState("");
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  // LISTAS
  const [agendamentos, setAgendamentos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [contatos, setContatos] = useState([]);

  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);
  // TOAST
  const [toast, setToast] = useState(null);
  // CONFIRM
  const [confirmData, setConfirmData] = useState(null);
  // EDITAR AGENDAMENTO
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [editTipo, setEditTipo] = useState("numero");
  const [editContatoId, setEditContatoId] = useState("");
  const [editGrupoId, setEditGrupoId] = useState("");
  const [editMensagemId, setEditMensagemId] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editDiasSelecionados, setEditDiasSelecionados] = useState([]);

  function showToast(type, text) {
    setToast({ type, text });
    const duration = type === "error" ? 5000 : 4000;
    setTimeout(() => setToast(null), duration);
  }

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
    setAgendamentos(
      (lista || []).map((a) => ({ ...a, dias: normalizeDias(a.dias) })),
    );
  }

  async function refreshAll() {
    await Promise.all([carregarDadosBasicos(), carregarAgendamentos()]);
  }

  useEffect(() => {
    refreshAll();
  }, [atualizarToken]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") refreshAll();
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
    pollingRef.current = setInterval(refreshAll, 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function toggleDia(v) {
    setDiasSelecionados((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  // =========================
  // CRIAR AGENDAMENTO
  // =========================
  async function criar() {
    if (!mensagemId) {
      showToast("error", "Selecione uma mensagem!");
      return;
    }

    if (
      (tipo === "numero" && !contatoId) ||
      (tipo === "grupo" && !grupoId) ||
      !horario ||
      diasSelecionados.length === 0
    ) {
      showToast(
        "error",
        "Preencha todos os campos e selecione ao menos um dia!",
      );
      return;
    }

    try {
      await agService.criarAgendamento({
        contato_id: tipo === "numero" ? contatoId : null,
        grupo_id: tipo === "grupo" ? grupoId : null,
        mensagem_id: mensagemId,
        horario,
        dias: diasSelecionados,
      });

      setContatoId("");
      setGrupoId("");
      setMensagemId("");
      setHorario("");
      setDiasSelecionados([]);

      await refreshAll();
      atualizar();

      showToast("success", "Agendamento criado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("error", "Erro ao criar agendamento.");
    }
  }

  // =========================
  // EDITAR AGENDAMENTO
  // =========================
  function abrirEditar(a) {
    setEditId(a.id);

    if (a.grupo_id) {
      setEditTipo("grupo");
      setEditGrupoId(a.grupo_id);
      setEditContatoId("");
    } else {
      setEditTipo("numero");
      setEditContatoId(a.contato_id);
      setEditGrupoId("");
    }

    setEditMensagemId(a.mensagem_id);
    setEditHorario(a.horario);
    setEditDiasSelecionados(a.dias || []);

    setEditOpen(true);
  }
  function toggleDiaEdicao(d) {
    setEditDiasSelecionados((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function salvarEdicao() {
    if (!editId) return;

    try {
      await agService.editarAgendamento(editId, {
        contato_id: editTipo === "numero" ? editContatoId : null,
        grupo_id: editTipo === "grupo" ? editGrupoId : null,
        mensagem_id: editMensagemId,
        horario: editHorario,
        dias: editDiasSelecionados,
      });

      setEditOpen(false);
      setEditId(null);

      await refreshAll();
      atualizar();

      showToast("success", "Agendamento atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("error", "Erro ao editar agendamento.");
    }
  }

  // =========================
  // REMOVER AGENDAMENTO
  // =========================
  function remover(id) {
    setConfirmData({
      title: "Remover agendamento",
      message: "Tem certeza que deseja remover este agendamento?",
      onConfirm: async () => {
        try {
          await agService.removerAgendamento(id);
          await refreshAll();
          atualizar();
          showToast("success", "Agendamento excluído com sucesso!");
        } catch (err) {
          console.error(err);
          showToast("error", "Erro ao remover agendamento.");
        } finally {
          setConfirmData(null);
        }
      },
    });
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

  return (
    <div className={styles.container}>
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
          <select
            value={contatoId}
            onChange={(e) => setContatoId(e.target.value)}
          >
            <option value="">(Escolher número)</option>
            {contatos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome || "Sem nome"} — {c.numero}
              </option>
            ))}
          </select>
        ) : (
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
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
              {m.texto.length > 60 ? m.texto.slice(0, 60) + "..." : m.texto}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <label>
          <FiClock /> Horário
        </label>
        <input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
      </div>

      <div className={styles.row}>
        <label>
          <FiCalendar /> Dias
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={diasSelecionados.includes(d)}
                onChange={() => toggleDia(d)}
              />{" "}
              {nomesDias[d]}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.rowCenter}>
        <button className={styles.btn} onClick={criar}>
          <FiPlus /> Criar Agendamento
        </button>
      </div>

      {/* ==== LISTA ==== */}
      <div className={styles.listaContatos} style={{ marginTop: 10 }}>
        {agendamentos.map((a) => {
          const diasTexto = (a.dias || []).map((d) => nomesDias[d]).join(", ");
          
          let destinoTexto = "";

          if (a.grupo_id) {
            const grupo = grupos.find(
              (g) => String(g.id) === String(a.grupo_id),
            );
            destinoTexto = grupo
              ? `Grupo ${grupo.nome}`
              : `Grupo #${a.grupo_id}`;
          } else if (a.contato_id) {
            const contato = contatos.find(
              (c) => String(c.id) === String(a.contato_id),
            );
            destinoTexto = contato
              ? `${contato.nome || "Sem nome"} — ${contato.numero}`
              : `Contato #${a.contato_id}`;
          }

          return (
            <div key={a.id} className={styles.listItem}>
              <div className={styles.spaceBetween}>
                <div>
                  <b>{destinoTexto}</b> → {a.mensagem || "Mensagem não encontrada"}
                  <br />⏰ {a.horario} | 📅 {diasTexto}
                </div>

                <div className={styles.actionButtons}>
                  <button
                    className={`${styles.smallBtn} ${styles.editButton}`}
                    onClick={() => abrirEditar(a)}
                  >
                    <FiEdit size={16} /> Editar
                  </button>

                  <button
                    className={`${styles.smallBtn} ${styles.deleteButton}`}
                    onClick={() => remover(a.id)}
                  >
                    <FiTrash size={16} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==== MODAL EDITAR ==== */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.confirmBox}
              initial={{ y: -30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
            >
              <h4>Editar Agendamento</h4>

              {/* FORM IGUAL AO DE CRIAR */}
              <div className={styles.row}>
                <label>Enviar para</label>
                <select
                  value={editTipo}
                  onChange={(e) => setEditTipo(e.target.value)}
                >
                  <option value="numero">Número individual</option>
                  <option value="grupo">Grupo</option>
                </select>

                {editTipo === "numero" ? (
                  <select
                    value={editContatoId}
                    onChange={(e) => setEditContatoId(e.target.value)}
                  >
                    <option value="">(Escolher número)</option>
                    {contatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || "Sem nome"} — {c.numero}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={editGrupoId}
                    onChange={(e) => setEditGrupoId(e.target.value)}
                  >
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
                  value={editMensagemId}
                  onChange={(e) => setEditMensagemId(e.target.value)}
                >
                  <option value="">(Selecione)</option>
                  {mensagens.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.texto.length > 60
                        ? m.texto.slice(0, 60) + "..."
                        : m.texto}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <label>
                  <FiClock /> Horário
                </label>
                <input
                  type="time"
                  value={editHorario}
                  onChange={(e) => setEditHorario(e.target.value)}
                />
              </div>

              <div className={styles.row}>
                <label>
                  <FiCalendar /> Dias
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <label key={d}>
                      <input
                        type="checkbox"
                        checked={editDiasSelecionados.includes(d)}
                        onChange={() => toggleDiaEdicao(d)}
                      />{" "}
                      {nomesDias[d]}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={() => setEditOpen(false)}
                >
                  Cancelar
                </button>
                <button className={styles.confirmDanger} onClick={salvarEdicao}>
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==== TOAST ==== */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${
              toast.type === "error" ? styles.toastError : styles.toastSuccess
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

      {/* ==== CONFIRM ==== */}
      <AnimatePresence>
        {confirmData && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.confirmBox}
              initial={{ y: -40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
            >
              <h4>{confirmData.title}</h4>
              <p>{confirmData.message}</p>

              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={() => setConfirmData(null)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.confirmDanger}
                  onClick={confirmData.onConfirm}
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}