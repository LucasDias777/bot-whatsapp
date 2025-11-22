import React, { useEffect, useState } from "react";
import * as mensagensService from "../../services/mensagensService";
import styles from "./Mensagens.module.css";


export default function Mensagens() {
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState("");

  async function carregar() {
    const r = await mensagensService.listMensagens();
    setLista(r);
  }

  useEffect(() => { carregar(); }, []);

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

  return (
    <div className={`card ${styles.container}`}>
      <h5>Mensagens</h5>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="Digite a mensagem..." />
      <div className="row">
        <button className="btn" onClick={salvarMensagem}>Salvar Mensagem</button>
      </div>

      <div id="listaMensagens" style={{marginTop:10}}>
        {lista.map(m => (
          <div key={m.id} className="list-item">
            <div className="space-between">
              <span>{m.texto}</span>
              <button className="small-btn" onClick={() => removerMensagem(m.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
