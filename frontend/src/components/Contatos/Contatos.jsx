import React, { useEffect, useState } from "react";
import * as contatosService from "../../services/contatosService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Contatos.module.css";

export default function Contatos() {
  const [lista, setLista] = useState([]);
  const [rawNumero, setRawNumero] = useState(""); 
  const [nome, setNome] = useState("");

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editRawNumero, setEditRawNumero] = useState("");

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

  // FORMATAÇÃO PASSIVA (permite apagar hífen sem travar)
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
    if (s.length <= 7) return `+55 (${s.slice(0,2)})${s.slice(2)}`;
    return `+55 (${s.slice(0,2)})${s.slice(2,7)}-${s.slice(7)}`;
  }

  function limparNumeroParaEnviarDeRaw(valorRaw) {
    let v = String(valorRaw || "").replace(/\D/g, "");

    // só removemos 55 AUTOMATICAMENTE se ultrapassar 11 dígitos
    if (v.length > 11 && v.startsWith("55")) {
      v = v.slice(2);
    }

    return "55" + v;
  }

  async function salvarContato() {
    if (!nome.trim()) return alert("Digite um nome!");
    if (!rawNumero.trim()) return alert("Digite um número válido!");

    const numeroLimpo = limparNumeroParaEnviarDeRaw(rawNumero);

    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      return alert("Número inválido. Use: (44) 99999-9999");
    }

    const jaExiste = lista.some(c => String(c.numero) === numeroLimpo);
    if (jaExiste) {
      const display = formatarParaLista(numeroLimpo);
      return alert(`Número já cadastrado: ${display}`);
    }

    try {
      const r = await contatosService.criarContato(nome.trim(), numeroLimpo);
      if (!r.ok) return alert(r.erro || "Falha ao criar contato");

      setNome("");
      setRawNumero("");
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Número não encontrado no WhatsApp.");
    }
  }

  async function removerContato(id) {
    if (!confirm("Remover este contato?")) return;
    await contatosService.removerContato(id);
    await carregar();
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
    if (!editNome.trim()) return alert("Digite um nome!");
    if (!editRawNumero.trim()) return alert("Digite um número!");

    const numeroLimpo = limparNumeroParaEnviarDeRaw(editRawNumero);

    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      return alert("Número inválido. Use (44) 99999-9999");
    }

    const existsOther = lista.some(
      c => String(c.numero) === numeroLimpo && c.id !== editId
    );
    if (existsOther) {
      const display = formatarParaLista(numeroLimpo);
      return alert(`Número já cadastrado: ${display}`);
    }

    try {
      const res = await contatosService.editarContato(
        editId,
        editNome.trim(),
        numeroLimpo
      );

      if (!res || res.ok !== true) {
        alert(res?.erro || "Falha ao editar.");
        return;
      }

      await carregar();
      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Número não encontrado no WhatsApp.");
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

  // ✔ NÃO REMOVE MAIS O 55 ENQUANTO VOCÊ DIGITA O DDD
  function handleNumeroChange(e) {
    const v = String(e.target.value).replace(/\D/g, "");

    // não interferir no "55" enquanto DIGITA
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
    </div>
  );
}
