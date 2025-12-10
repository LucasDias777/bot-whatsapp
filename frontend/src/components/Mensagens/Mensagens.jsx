import React, { useEffect, useState } from "react";
import * as mensagensService from "../../services/mensagensService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Mensagens.module.css";

export default function Mensagens() {
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState("");

  // Modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState("");

  async function carregar() {
    const r = await mensagensService.listMensagens();
    setLista(r || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarMensagem() {
    if (!texto.trim()) return alert("Digite uma mensagem!");
    await mensagensService.criarMensagem(texto.trim());
    setTexto("");
    await carregar();
  }

  async function removerMensagem(id) {
    if (!confirm("Tem certeza que deseja excluir esta mensagem?")) return;
    await mensagensService.removerMensagem(id);
    await carregar();
  }

  // Abre modal preenchendo campos
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
    if (!editTexto.trim()) return alert("O texto não pode estar vazio!");
    try {
      await mensagensService.editarMensagem(editId, editTexto.trim());
      await carregar();
      fecharModalEditar();
    } catch (err) {
      console.error("Erro ao editar mensagem:", err);
      alert("Erro ao editar mensagem.");
    }
  }

  return (
    <div className={styles.container}>

      {/* Barra Superior */}
      <div className={styles.topBar}>
        <h2 className={styles.titulo}>Mensagens</h2>
      </div>

      {/* Formulário */}
      <div className={styles.row}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite a mensagem..."
          className={styles.textarea}
        />

        <button className={`${styles.btn} ${styles.addButton}`} onClick={salvarMensagem}>
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      {/* Lista */}
      <div className={styles.listaContatos}>
        {lista.map((m) => (
          <div key={m.id} className={styles.listItem}>
            <div className={styles.spaceBetween}>
              <span className={styles.messageText}>{m.texto}</span>

              <div className={styles.actionButtons}>


                {/* Botão Editar (abre modal) */}
                <button
                  className={`${styles.smallBtn} ${styles.editButton}`}
                  onClick={() => abrirModalEditar(m)}
                >
                  <FiEdit size={16} />
                  Editar
                </button>

                {/* Botão Excluir */}
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

      {/* MODAL DE EDIÇÃO */}
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
              <button className={`${styles.btn} ${styles.addButton}`} onClick={salvarEdicao}>
                Salvar
              </button>
               <button className={`${styles.btn} ${styles.secondaryBtn}`} onClick={fecharModalEditar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
