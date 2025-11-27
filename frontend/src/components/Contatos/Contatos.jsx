import React, { useEffect, useState } from "react";
import * as contatosService from "../../services/contatosService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Contatos.module.css";

export default function Contatos() {
  const [lista, setLista] = useState([]);
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");

  // filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");

  // modal de edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editNumero, setEditNumero] = useState("");

  async function carregar() {
    try {
      const r = await contatosService.listContatos();
      setLista(r);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarContato() {
    if (!nome.trim()) return alert("Digite um nome!");
    if (!numero.trim()) return alert("Digite um número válido!");

    await contatosService.criarContato(nome.trim(), numero.trim());
    setNome("");
    setNumero("");
    await carregar();
  }

  async function removerContato(id) {
    if (!confirm("Remover este contato?")) return;
    await contatosService.removerContato(id);
    await carregar();
  }

  // abrir modal preenchendo campos
  function abrirModalEditar(contato) {
    setEditId(contato.id);
    setEditNome(contato.nome || "");
    setEditNumero(contato.numero || "");
    setIsModalOpen(true);
  }

  // fechar modal
  function fecharModal() {
    setIsModalOpen(false);
    setEditId(null);
    setEditNome("");
    setEditNumero("");
  }

  // salvar edição
  async function salvarEdicao() {
    if (!editNome.trim()) return alert("Digite um nome!");
    if (!editNumero.trim()) return alert("Digite um número!");

    try {
      const res = await contatosService.editarContato(
        editId,
        editNome.trim(),
        editNumero.trim()
      );

      if (!res || res.ok !== true) {
        alert("Falha ao editar.");
        return;
      }

      await carregar();
      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao editar.");
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

  return (
    <div className={styles.container}>
      {/* Barra Superior */}
      <div className={styles.topBar}>
        <h2 className={styles.titulo}>Contatos</h2>
      </div>

      {/* Formulário */}
      <div className={styles.row}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do contato"
        />

        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="+55 (44)99999-9999"
        />

        <button
          className={`${styles.btn} ${styles.addButton}`}
          onClick={salvarContato}
        >
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      {/* Filtros (centralizados no bloco com label "Filtros:") */}
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

      {/* TABELA */}
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
                <td>{c.numero}</td>

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

      {/* MODAL DE EDIÇÃO */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onMouseDown={fecharModal}>
          <div
            className={styles.modal}
            onMouseDown={(e) => {
              // impedir que clique no modal feche por bubbledown
              e.stopPropagation();
            }}
          >
            <h3 className={styles.modalTitle}>Editar Contato</h3>

            <label className={styles.inputLabel}>Nome</label>
            <input
              className={styles.modalInput}
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Nome do contato"
            />

            <label className={styles.inputLabel}>Número</label>
            <input
              className={styles.modalInput}
              value={editNumero}
              onChange={(e) => setEditNumero(e.target.value)}
              placeholder="+55 (44)99999-9999"
            />

            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.addButton}`} onClick={salvarEdicao}>
                Salvar
              </button>

              <button className={`${styles.btn} ${styles.secondaryBtn}`} onClick={fecharModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
