import React, { useEffect, useState } from "react";
import * as contatosService from "../../services/contatosService";
import { FiPlus, FiEdit, FiTrash } from "react-icons/fi";
import styles from "./Contatos.module.css";

export default function Contatos() {
  const [lista, setLista] = useState([]);
  const [numero, setNumero] = useState("");

  async function carregar() {
    try {
      const r = await contatosService.listContatos();
      setLista(r);
    } catch (e) {}
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarContato() {
    if (!numero.trim()) return alert("Digite um número válido!");
    await contatosService.criarContato(numero.trim());
    setNumero("");
    await carregar();
  }

  async function removerContato(id) {
    if (!confirm("Remover este número?")) return;
    await contatosService.removerContato(id);
    await carregar();
  }

  return (
    <div className={styles.container}>

      {/* Barra Superior */}
      <div className={styles.topBar}>
        <h2 className={styles.titulo}>Contatos</h2>
      </div>

      {/* Formulário */}
      <div className={styles.row}>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="+55 4499999999"
        />

        <button
          className={`${styles.btn} ${styles.addButton}`}
          onClick={salvarContato}
        >
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      {/* Lista */}
      <div className={styles.listaContatos}>
        {lista.map((c) => (
          <div key={c.id} className={styles.listItem}>
            <div className={styles.spaceBetween}>
              <span>{c.numero}</span>

              <div style={{ display: "flex", gap: 8 }}>
                {/* Botão Editar */}
                <button
                  className={`${styles.smallBtn} ${styles.editButton}`}
                  onClick={async () => {
                    const novo = prompt("Editar número:", c.numero);
                    if (!novo || !novo.trim()) return;

                    try {
                      const res = await contatosService.editarContato(
                        c.id,
                        novo.trim()
                      );

                      if (!res || res.ok !== true) {
                        alert("Falha ao editar.");
                        return;
                      }

                      if (res.changes === 0)
                        alert("Nenhuma linha atualizada — verifique o id.");

                      await carregar();
                    } catch (err) {
                      alert("Erro ao editar.");
                    }
                  }}
                >
                  <FiEdit size={16} />
                  Editar
                </button>

                {/* Botão Excluir */}
                <button
                  className={`${styles.smallBtn} ${styles.deleteButton}`}
                  onClick={() => removerContato(c.id)}
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
