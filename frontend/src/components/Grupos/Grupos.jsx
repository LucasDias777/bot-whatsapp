import React, { useEffect, useRef, useState } from "react";
import * as gruposService from "../../services/gruposService";
import * as contatosService from "../../services/contatosService";
import styles from "./Grupos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { FiPlus, FiTrash, FiX, FiEdit } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [novoGrupo, setNovoGrupo] = useState("");

  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);
  // TOAST
  const [toast, setToast] = useState(null);
  // { type: "success" | "error", text }
  // CONFIRM
  const [confirmData, setConfirmData] = useState(null);
  // { title, message, onConfirm }

  function showToast(type, text) {
    setToast({ type, text });
    const duration = type === "error" ? 5000 : 4000;
    setTimeout(() => setToast(null), duration);
  }

  async function carregar() {
    const [gs, cs] = await Promise.all([
      gruposService.listGrupos(),
      contatosService.listContatos(),
    ]);
    setGrupos(gs);
    setContatos(cs);
  }

  useEffect(() => {
    carregar();
  }, [atualizarToken]);

  useEffect(() => {
    function refreshOnFocus() {
      if (document.visibilityState === "visible") carregar();
    }
    window.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => carregar(), 3000);
    return () => pollingRef.current && clearInterval(pollingRef.current);
  }, []);

  async function criarGrupo() {
    if (!novoGrupo.trim()) {
      showToast("error", "Digite um nome de grupo!");
      return;
    }

    await gruposService.criarGrupo(novoGrupo.trim());
    setNovoGrupo("");
    await carregar();
    atualizar();
    showToast("success", "Grupo criado com sucesso!");
  }

  function removerGrupo(id) {
    setConfirmData({
      title: "Remover grupo",
      message: "Tem certeza que deseja remover este grupo?",
      onConfirm: async () => {
        await gruposService.removerGrupo(id);
        await carregar();
        atualizar();
        showToast("success", "Grupo excluído com sucesso!");
        setConfirmData(null);
      },
    });
  }

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.topBar}>
        <h5 className={styles.titulo}>Grupos</h5>
      </div>

      <div className={styles.row}>
        <input
          value={novoGrupo}
          onChange={(e) => setNovoGrupo(e.target.value)}
          placeholder="Nome do grupo"
        />
        <button
          className={`${styles.btn} ${styles.addButton}`}
          onClick={criarGrupo}
        >
          <FiPlus size={18} />
          Criar Grupo
        </button>
      </div>

      <div id="listaGrupos">
        {grupos.map((g) => (
          <GroupCard
            key={`${g.id}-${atualizarToken}-${contatos.length}`}
            grupo={g}
            contatos={contatos}
            onRemoveGroup={() => removerGrupo(g.id)}
            onUpdated={() => {
              carregar();
              atualizar();
            }}
            showToast={showToast}
            setConfirmData={setConfirmData}
          />
        ))}
      </div>

      {/* =========================
          TOAST
         ========================= */}
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

      {/* =========================
          CONFIRM
         ========================= */}
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
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupCard({ grupo, contatos, onRemoveGroup, onUpdated, showToast, setConfirmData}) {
  const [membros, setMembros] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const { atualizar, atualizarToken } = useAtualizar();
  const debounceRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");

  async function carregarMembros() {
    const data = await gruposService.listarContatosDoGrupo(grupo.id, {
      t: Date.now(),
    });
    setMembros(data);
  }

  useEffect(() => {
    carregarMembros();
  }, [grupo.id, atualizarToken]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => carregarMembros(), 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [contatos]);

  async function adicionarContatoAoGrupo(contatoId) {
    if (!contatoId) {
      showToast("error", "Selecione um contato para adicionar.");
      return;
    }
    await gruposService.adicionarContatoAoGrupo(grupo.id, parseInt(contatoId));
    setSelectedToAdd("");
    await carregarMembros();
    atualizar();
    onUpdated && onUpdated();
    showToast("success", "Contato adicionado ao grupo!");
  }

  function removerContatoDoGrupo(contatoId) {
    setConfirmData({
      title: "Remover contato",
      message: "Deseja remover este contato do grupo?",
      onConfirm: async () => {
        await gruposService.removerContatoDoGrupo(grupo.id, contatoId);
        await carregarMembros();
        atualizar();
        onUpdated && onUpdated();
        showToast("success", "Contato removido do grupo!");
        setConfirmData(null);
      },
    });
  }

  function abrirModalEditarGrupo() {
    setEditGroupName(grupo.nome || "");
    setIsEditModalOpen(true);
  }

  function fecharModalEditarGrupo() {
    setIsEditModalOpen(false);
    setEditGroupName("");
  }

  async function salvarEdicaoGrupo() {
    const novo = (editGroupName || "").trim();
    if (!novo) {
      showToast("error", "Digite um nome válido!");
      return;
    }

    await gruposService.editarGrupo(grupo.id, novo);
    fecharModalEditarGrupo();
    atualizar();
    onUpdated && onUpdated();
    showToast("success", "Grupo editado com sucesso!");
  }

  const idsNoGrupo = membros.map((m) => m.id);
  const opcoesAdd = contatos.filter((c) => !idsNoGrupo.includes(c.id));

  return (
    <div className={styles.listItem}>
      <div className={styles.spaceBetween}>
        <strong>{grupo.nome}</strong>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={`${styles.smallBtn} ${styles.editButton}`}
            onClick={abrirModalEditarGrupo}
          >
            <FiEdit size={16} />
            Editar
          </button>

          <button
            className={`${styles.smallBtn} ${styles.deleteButton}`}
            onClick={onRemoveGroup}
          >
            <FiTrash size={16} />
            Excluir
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {membros.length ? (
          membros.map((m) => (
            <div key={m.id} className={styles.memberRow}>
              <span>
                {m.nome || "Sem nome"}
                {m.numero ? ` — ${m.numero}` : ""}
              </span>

              <button
                onClick={() => removerContatoDoGrupo(m.id)}
                className={`${styles.smallBtn} ${styles.deleteButton}`}
              >
                <FiX size={16} />
                Remover
              </button>
            </div>
          ))
        ) : (
          <small>Nenhum contato neste grupo.</small>
        )}
      </div>

      <div className={styles.row} style={{ marginTop: 10 }}>
        <select
          value={selectedToAdd}
          onChange={(e) => setSelectedToAdd(e.target.value)}
        >
          <option value="">Adicionar contato...</option>
          {opcoesAdd.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome || "Sem nome"} — {o.numero}
            </option>
          ))}
        </select>

        <button
          className={`${styles.smallBtn} ${styles.addButton}`}
          onClick={() => adicionarContatoAoGrupo(selectedToAdd)}
        >
          <FiPlus size={16} />
          Adicionar
        </button>
      </div>

      {isEditModalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={fecharModalEditarGrupo}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Editar Grupo</h3>

            <label className={styles.inputLabel}>Nome do Grupo:</label>
            <input
              className={styles.modalInput}
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              autoFocus
            />

            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.addButton}`}
                onClick={salvarEdicaoGrupo}
              >
                Salvar
              </button>
              <button
                className={`${styles.btn} ${styles.secondaryBtn}`}
                onClick={fecharModalEditarGrupo}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}