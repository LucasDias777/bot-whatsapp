import React, { useEffect, useState } from "react";
import * as mensagensService from "../../services/mensagensService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Mensagens.module.css";
import { motion, AnimatePresence } from "framer-motion";

export default function Mensagens() {
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState("");

  const [toast, setToast] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
 
  function showToast(type, text) {
    setToast({ type, text });

    const duration = type === "error" ? 5000 : 4000;
    setTimeout(() => setToast(null), duration);
  }

  async function carregar() {
    const r = await mensagensService.listMensagens();
    setLista(r || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  // =========================
  // CRIAR MENSAGEM
  // =========================
  async function salvarMensagem() {
    if (!texto.trim()) {
      showToast("error", "Digite uma mensagem!");
      return;
    }

    try {
      await mensagensService.criarMensagem(texto.trim());
      setTexto("");
      await carregar();
      showToast("success", "Mensagem criada com sucesso!");
    } catch (err) {
      console.error("Erro ao criar mensagem:", err);

      if (err?.status === 400) {
        showToast("error", "Mensagem igual já criada.");
      } else {
        showToast("error", "Erro ao criar mensagem.");
      }
    }
  }

  // =========================
  // REMOVER MENSAGEM
  // =========================
  function removerMensagem(id) {
    setConfirmData({
      title: "Excluir mensagem",
      message: "Tem certeza que deseja excluir esta mensagem?",
      onConfirm: async () => {
        try {
          await mensagensService.removerMensagem(id);
          await carregar();
          showToast("success", "Mensagem excluída com sucesso!");
        } catch (err) {
          console.error("Erro ao excluir mensagem:", err);

          if (err?.status === 400) {
            showToast(
              "error",
              "Essa mensagem possui um agendamento criado. Exclusão não permitida.",
            );
          } else {
            showToast("error", "Erro ao excluir mensagem.");
          }
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  // =========================
  // EDITAR
  // =========================
  function abrirModalEditar(m) {
    setEditId(m.id);
    setEditTexto(m.texto || "");
    setIsEditModalOpen(true);
  }

  function fecharModalEditar() {
    setIsEditModalOpen(false);
    setEditId(null);
    setEditTexto("");
  }

  async function salvarEdicao() {
    if (!editTexto.trim()) {
      showToast("error", "O texto não pode estar vazio!");
      return;
    }

    try {
      await mensagensService.editarMensagem(editId, editTexto.trim());
      await carregar();
      fecharModalEditar();
      showToast("success", "Mensagem editada com sucesso!");
    } catch (err) {
      console.error("Erro ao editar mensagem:", err);

      if (err?.status === 400) {
        showToast("error", "Mensagem igual já criada.");
      } else {
        showToast("error", "Erro ao editar mensagem.");
      }
    }
  }

  return (
    <div className={styles.container}>
      {/* BARRA SUPERIOR */}
      <div className={styles.topBar}>
        <h2 className={styles.titulo}>Mensagens</h2>
      </div>

      {/* FORMULARIO */}
      <div className={styles.row}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite a mensagem..."
          className={styles.textarea}
        />

        <button
          className={`${styles.btn} ${styles.addButton}`}
          onClick={salvarMensagem}
        >
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      {/* LISTA */}
      <div className={styles.listaContatos}>
        {lista.map((m) => (
          <div key={m.id} className={styles.listItem}>
            <div className={styles.spaceBetween}>
              <span className={styles.messageText}>{m.texto}</span>

              <div className={styles.actionButtons}>
                <button
                  className={`${styles.smallBtn} ${styles.editButton}`}
                  onClick={() => abrirModalEditar(m)}
                >
                  <FiEdit size={16} />
                  Editar
                </button>

                <button
                  className={`${styles.smallBtn} ${styles.deleteButton}`}
                  onClick={() => removerMensagem(m.id)}
                >
                  <FiTrash size={16} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDIÇÃO */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay} onMouseDown={fecharModalEditar}>
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Editar Mensagem</h3>

            <label className={styles.inputLabel}>Mensagem:</label>
            <textarea
              className={styles.modalTextarea}
              value={editTexto}
              onChange={(e) => setEditTexto(e.target.value)}
              placeholder="Texto da mensagem"
            />

            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.addButton}`}
                onClick={salvarEdicao}
              >
                Salvar
              </button>
              <button
                className={`${styles.btn} ${styles.secondaryBtn}`}
                onClick={fecharModalEditar}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          TOAST ANIMADO
         ========================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${
              toast.type === "error" ? styles.toastError : styles.toastSuccess
            }`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {toast.type === "success" ? "✅" : "⚠️"} {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================
          CONFIRM ANIMADO
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
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
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
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}