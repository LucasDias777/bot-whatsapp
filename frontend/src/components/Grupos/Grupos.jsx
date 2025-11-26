import React, { useEffect, useRef, useState } from "react";
import * as gruposService from "../../services/gruposService";
import * as contatosService from "../../services/contatosService";
import styles from "./Grupos.module.css";
import { useAtualizar } from "../../context/AtualizarContexto";

import { FiPlus, FiTrash, FiX, FiEdit } from "react-icons/fi";

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [novoGrupo, setNovoGrupo] = useState("");

  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  async function carregar() {
    const [gs, cs] = await Promise.all([
      gruposService.listGrupos(),
      contatosService.listContatos()
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
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function criarGrupo() {
    if (!novoGrupo.trim()) return alert("Digite um nome de grupo!");
    await gruposService.criarGrupo(novoGrupo.trim());
    setNovoGrupo("");
    await carregar();
    atualizar();
  }

  async function removerGrupo(id) {
    if (!confirm("Remover este grupo?")) return;
    await gruposService.removerGrupo(id);
    await carregar();
    atualizar();
  }

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.topBar}>
        <h5 className={styles.titulo}>Grupos</h5>
      </div>

      <div className={styles.row}>
        <input
          value={novoGrupo}
          onChange={e => setNovoGrupo(e.target.value)}
          placeholder="Nome do grupo"
        />
        <button className={`${styles.btn} ${styles.addButton}`} onClick={criarGrupo}>
          <FiPlus size={18} />
          Criar Grupo
        </button>
      </div>

      <div id="listaGrupos">
        {grupos.map(g => (
          <GroupCard
            key={`${g.id}-${atualizarToken}-${contatos.length}`}
            grupo={g}
            contatos={contatos}
            onRemoveGroup={() => removerGrupo(g.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ grupo, contatos, onRemoveGroup }) {
  const [membros, setMembros] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const { atualizar, atualizarToken } = useAtualizar();
  const debounceRef = useRef(null);

  async function carregarMembros() {
    try {
      const data = await gruposService.listarContatosDoGrupo(grupo.id, { t: Date.now() });
      setMembros(data);
    } catch (err) {
      console.error("Erro ao carregar contatos do grupo", err);
    }
  }

  useEffect(() => {
    carregarMembros();
  }, [grupo.id]);

  useEffect(() => {
    carregarMembros();
  }, [atualizarToken]);

  useEffect(() => {
    setMembros(prev => prev.filter(m => contatos.some(c => c.id === m.id)));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => carregarMembros(), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [contatos]);

  async function adicionarContatoAoGrupo(contatoId) {
    if (!contatoId) return alert("Selecione um contato para adicionar.");
    await gruposService.adicionarContatoAoGrupo(grupo.id, parseInt(contatoId));
    setSelectedToAdd("");
    await carregarMembros();
    atualizar();
  }

  async function removerContatoDoGrupo(contatoId) {
    if (!confirm("Remover esse contato do grupo?")) return;
    await gruposService.removerContatoDoGrupo(grupo.id, contatoId);
    await carregarMembros();
    atualizar();
  }

  const idsNoGrupo = membros.map(m => m.id);
  const opcoesAdd = contatos.filter(c => !idsNoGrupo.includes(c.id));

  return (
    <div className={styles.listItem}>
      <div className={styles.spaceBetween}>
        <strong>{grupo.nome}</strong>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className={`${styles.smallBtn} ${styles.editButton}`}>
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
        {membros.length ? membros.map(m => (
          <div key={m.id} className={styles.memberRow}>
            <span>{m.numero}</span>

            <div style={{ display: "flex", gap: "8px" }}>
              {/* APENAS O BOTÃO DE REMOVER — removido o botão Editar */}
              <button
                onClick={() => removerContatoDoGrupo(m.id)}
                className={`${styles.smallBtn} ${styles.deleteButton}`}
              >
                <FiX size={16} />
                Remover
              </button>
            </div>
          </div>
        )) : <small>Nenhum contato neste grupo.</small>}
      </div>

      <div className={styles.row} style={{ marginTop: 10 }}>
        <select
          value={selectedToAdd}
          onChange={e => setSelectedToAdd(e.target.value)}
        >
          <option value="">Adicionar contato...</option>
          {opcoesAdd.map(o => (
            <option key={o.id} value={o.id}>{o.numero}</option>
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
    </div>
  );
}
