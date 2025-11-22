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
    } catch (e) {
      console.error(e);
    }
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
    <div className={`card ${styles.container}`}>
      <h5>Contatos</h5>

      <div className={styles.row}>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="+55 4499999999"
        />

        <button
          className={`${styles.btn}`}
          onClick={salvarContato}
        >
          <FiPlus size={18} />
          Adicionar
        </button>
      </div>

      <div className={styles.listaContatos}>
        {lista.map((c) => (
          <div key={c.id} className={styles.listItem}>
            <div className={styles.spaceBetween}>
              <span>
                {c.numero}
              </span>

              <div>
                <button
                  className={styles.smallBtn}
                  onClick={() => {
                    const novo = prompt("Editar número:", c.numero);
                    if (!novo) return;
                    alert("Implementar rota de edição no backend.");
                  }}
                >
                  <FiEdit size={16} />
                  Editar
                </button>

                <button
                  className={styles.smallBtn}
                  onClick={() => removerContato(c.id)}
                  style={{ marginLeft: 8 }}
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
