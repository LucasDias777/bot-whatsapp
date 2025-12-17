import React, { useEffect, useState } from "react";
import * as contatosService from "../../services/contatosService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Contatos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";
import { motion, AnimatePresence } from "framer-motion";
import { getStatus } from "../../services/statusService";

export default function Contatos() {
  const [lista, setLista] = useState([]);
  const [rawNumero, setRawNumero] = useState("");
  const [nome, setNome] = useState("");

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const { atualizar } = useAtualizar();
  const [editNome, setEditNome] = useState("");
  const [editRawNumero, setEditRawNumero] = useState("");
  // TOAST
  const [toast, setToast] = useState(null);
  // { type: "success" | "error", text: string }
  const [confirmData, setConfirmData] = useState(null);
  // { title, message, onConfirm }

  function showToast(type, text) {
    setToast({ type, text });

    const duration = type === "error" ? 5000 : 4000;
    setTimeout(() => {
      setToast(null);
    }, duration);
  }

  async function carregar() {
    try {
      const r = await contatosService.listContatos();
      setLista(r || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function formatarNumeroBRParaInput(digits) {
    if (!digits) return "";
    let v = String(digits).replace(/\D/g, "");

    if (v.length > 11) v = v.slice(0, 11);

    if (v.length <= 2) return `(${v}`;
    if (v.length <= 7) return `(${v.slice(0, 2)})${v.slice(2)}`;
    return `(${v.slice(0, 2)})${v.slice(2, 7)}-${v.slice(7)}`;
  }

  function formatarParaLista(numeroCom55) {
    if (!numeroCom55) return "";
    let s = String(numeroCom55).replace(/\D/g, "");
    if (s.startsWith("55")) s = s.slice(2);
    if (s.length > 11) s = s.slice(0, 11);

    if (s.length <= 2) return `+55 (${s}`;
    if (s.length <= 7) return `+55 (${s.slice(0, 2)})${s.slice(2)}`;
    return `+55 (${s.slice(0, 2)})${s.slice(2, 7)}-${s.slice(7)}`;
  }

  function limparNumeroParaEnviarDeRaw(valorRaw) {
    let v = String(valorRaw || "").replace(/\D/g, "");

    if (v.length > 11 && v.startsWith("55")) {
      v = v.slice(2);
    }

    return "55" + v;
  }

  // =========================
  // SALVAR CONTATO
  // =========================
  async function salvarContato() {
    if (!nome.trim()) {
      showToast("error", "Digite um nome!");
      return;
    }

    if (!rawNumero.trim()) {
      showToast("error", "Digite um número válido!");
      return;
    }

    const numeroLimpo = limparNumeroParaEnviarDeRaw(rawNumero);

    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      showToast("error", "Número inválido. Use: (44) 99999-9999");
      return;
    }

    const jaExiste = lista.some((c) => String(c.numero) === numeroLimpo);
    if (jaExiste) {
      const display = formatarParaLista(numeroLimpo);
      showToast("error", `Número já cadastrado: ${display}`);
      return;
    }

    // 🔒 VERIFICA STATUS DO WHATSAPP
    let statusInfo;
    try {
      statusInfo = await getStatus();
    } catch {
      showToast("error", "Não foi possível verificar o status do WhatsApp.");
      return;
    }

    if (statusInfo.status !== "connected") {
      showToast(
        "error",
        "WhatsApp desconectado. Conecte antes de criar o contato.",
      );
      return;
    }

    // ✅ CRIAR CONTATO
    try {
      const r = await contatosService.criarContato(nome.trim(), numeroLimpo);

      if (!r || r.ok !== true) {
        showToast("error", r?.erro || "Falha ao criar contato.");
        return;
      }

      showToast("success", "Contato criado com sucesso!");

      setNome("");
      setRawNumero("");
      await carregar();
      atualizar();
    } catch (e) {
      console.error(e);
      showToast("error", "Número não encontrado no WhatsApp.");
    }
  }

 function removerContato(id) {
  setConfirmData({
    title: "Remover contato",
    message: "Tem certeza que deseja remover este contato?",
    onConfirm: async () => {
      try {
        await contatosService.removerContato(id);
        await carregar();
        atualizar();
        showToast("success", "Contato removido com sucesso!");

      } catch (err) {
        console.error(err);
        showToast("error", "Erro ao remover contato.");
      } finally {
        setConfirmData(null);
      }
    },
  });
}

  function abrirModalEditar(contato) {
    setEditId(contato.id);
    const num = contato.numero ? String(contato.numero).replace(/^55/, "") : "";
    setEditNome(contato.nome || "");
    setEditRawNumero(num);
    setIsModalOpen(true);
  }

  function fecharModal() {
    setIsModalOpen(false);
    setEditId(null);
    setEditNome("");
    setEditRawNumero("");
  }

  async function salvarEdicao() {
    if (!editNome.trim()) {
      showToast("error", "Digite um nome!");
      return;
    }

    if (!editRawNumero.trim()) {
      showToast("error", "Digite um número!");
      return;
    }

    const numeroLimpo = limparNumeroParaEnviarDeRaw(editRawNumero);

    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      showToast("error", "Número inválido. Use (44) 99999-9999");
      return;
    }

    const existsOther = lista.some(
      (c) => String(c.numero) === numeroLimpo && c.id !== editId,
    );
    if (existsOther) {
      const display = formatarParaLista(numeroLimpo);
      showToast("error", `Número já cadastrado: ${display}`);
      return;
    }

    try {
      const res = await contatosService.editarContato(
        editId,
        editNome.trim(),
        numeroLimpo,
      );

      if (!res || res.ok !== true) {
        showToast("error", res?.erro || "Falha ao editar.");
        return;
      }

      showToast("success", "Contato atualizado com sucesso!");

      await carregar();
      fecharModal();
      atualizar();
    } catch (err) {
      console.error(err);
      showToast("error", "Número não encontrado no WhatsApp.");
    }
  }

  const listaFiltrada = lista.filter((c) => {
    const nomeVal = (c.nome || "").toLowerCase();
    const numeroVal = (c.numero || "").toLowerCase();
    return (
      nomeVal.includes(filtroNome.toLowerCase()) &&
      numeroVal.includes(filtroNumero.toLowerCase())
    );
  });

  function handleNumeroChange(e) {
    const v = String(e.target.value).replace(/\D/g, "");
    let raw = v;

    if (raw.length > 11 && raw.startsWith("55")) raw = raw.slice(2);
    setRawNumero(raw.slice(0, 11));
  }

  function handleEditNumeroChange(e) {
    const v = String(e.target.value).replace(/\D/g, "");
    let raw = v;

    if (raw.length > 11 && raw.startsWith("55")) raw = raw.slice(2);
    setEditRawNumero(raw.slice(0, 11));
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h2 className={styles.titulo}>Contatos</h2>
      </div>

      <div className={styles.row}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do contato"
        />

        <input
          value={formatarNumeroBRParaInput(rawNumero)}
          onChange={handleNumeroChange}
          placeholder="(44) 99999-9999"
        />

        <button
          className={`${styles.btn} ${styles.addButton}`}
          onClick={salvarContato}
        >
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      <div className={styles.filtersBlock}>
        <div className={styles.filtersLabel}>Filtros:</div>
        <div className={styles.filtersRow}>
          <input
            placeholder="Filtrar por nome..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
          />

          <input
            placeholder="Filtrar por número..."
            value={filtroNumero}
            onChange={(e) => setFiltroNumero(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Número</th>
              <th style={{ width: 140 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {listaFiltrada.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{formatarParaLista(String(c.numero || ""))}</td>

                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={`${styles.smallBtn} ${styles.editButton}`}
                      onClick={() => abrirModalEditar(c)}
                      title="Editar"
                    >
                      <FiEdit size={16} />
                    </button>

                    <button
                      className={`${styles.smallBtn} ${styles.deleteButton}`}
                      onClick={() => removerContato(c.id)}
                      title="Excluir"
                    >
                      <FiTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyRow}>
                  Nenhum contato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onMouseDown={fecharModal}>
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Editar Contato</h3>

            <label className={styles.inputLabel}>Nome:</label>
            <input
              className={styles.modalInput}
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Nome do contato"
            />

            <label className={styles.inputLabel}>Número:</label>
            <input
              className={styles.modalInput}
              value={formatarNumeroBRParaInput(editRawNumero)}
              onChange={handleEditNumeroChange}
              placeholder="(44) 99999-9999"
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
                onClick={fecharModal}
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