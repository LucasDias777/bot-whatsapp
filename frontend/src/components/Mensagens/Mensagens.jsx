import React, { useEffect, useState } from "react";
import * as mensagensService from "../../services/mensagensService";

import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";

import styles from "./Mensagens.module.css";

export default function Mensagens() {
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState("");

  async function carregar() {
    const r = await mensagensService.listMensagens();
    setLista(r);
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

  // ➤ EDITAR VIA PROMPT
  async function editarMensagem(m) {
    const novoTexto = prompt("Editar mensagem:", m.texto);

    if (novoTexto === null) return; // cancelou

    if (!novoTexto.trim()) {
      alert("O texto não pode estar vazio!");
      return;
    }

    await mensagensService.editarMensagem(m.id, novoTexto.trim());
    await carregar();
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
              <span>{m.texto}</span>

              <div style={{ display: "flex", gap: 8 }}>

                {/* Botão Editar */}
                <button
                  className={`${styles.smallBtn} ${styles.editButton}`}
                  onClick={() => editarMensagem(m)}
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

    </div>
  );
}
