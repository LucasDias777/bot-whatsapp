import React, { useEffect, useRef, useState } from "react";
import * as agService from "../../services/agendamentosService";
import * as gruposService from "../../services/gruposService";
import * as msgsService from "../../services/mensagensService";
import * as contatosService from "../../services/contatosService";
import styles from "./Agendamentos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { FaPlus, FaTrash, FaClock, FaCalendarAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

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
  // TOAST
  const [toast, setToast] = useState(null);
  // CONFIRM
  const [confirmData, setConfirmData] = useState(null);

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
      (lista || []).map((a) => ({ ...a, dias: normalizeDias(a.dias) }))
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
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
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
      (tipo === "numero" && !numero) ||
      (tipo === "grupo" && !grupo) ||
      !horario ||
      diasSelecionados.length === 0
    ) {
      showToast("error", "Preencha todos os campos e selecione ao menos um dia!");
      return;
    }

    const mensagemTexto = mensagens.find((m) => m.id == mensagemId)?.texto;

    try {
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

      showToast("success", "Agendamento criado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("error", "Erro ao criar agendamento.");
    }
  }

  // =========================
  // REMOVER AGENDAMENTO (CONFIRM)
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

   function contatoPorNumero(num) {
    if (!num) return undefined;
    return contatos.find(
      (c) => String(c.numero) === String(num) || String(c.id) === String(num)
    );
  }

  function nomeDoGrupoPorId(id) {
    if (!id) return undefined;
    const g = grupos.find((x) => String(x.id) === String(id));
    return g ? g.nome : undefined;
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
          <select value={numero} onChange={(e) => setNumero(e.target.value)}>
            <option value="">(Escolher número)</option>
            {contatos.map((c) => (
              <option key={c.id} value={c.numero}>
                {c.nome || "Sem nome"} — {c.numero}
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
        <select value={mensagemId} onChange={(e) => setMensagemId(e.target.value)}>
          <option value="">(Selecione)</option>
          {mensagens.map((m) => (
            <option key={m.id} value={m.id}>
              {m.texto.length > 60 ? m.texto.slice(0, 60) + "..." : m.texto}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <label><FaClock /> Horário</label>
        <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
      </div>

      <div className={styles.row}>
        <label><FaCalendarAlt /> Dias</label>
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
          <FaPlus /> Criar Agendamento
        </button>
      </div>

      {/* ==== LISTA ==== */}
      <div className={styles.listaContatos} style={{ marginTop: 10 }}>
        {agendamentos.map((a) => {
          const diasTexto = (a.dias || []).map((d) => nomesDias[d]).join(", ");

          let destinoTexto = "";
          if (a.grupo) {
            const nomeGrupo = nomeDoGrupoPorId(a.grupo);
            destinoTexto = nomeGrupo ? `Grupo ${nomeGrupo}` : `Grupo ${a.grupo}`;
          } else if (a.numero) {
            const contato = contatoPorNumero(a.numero);
            destinoTexto = contato
              ? `${contato.nome || "Sem nome"} — ${contato.numero}`
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

      {/* ==== TOAST ==== */}
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
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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