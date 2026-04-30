import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUserPlus, FiUsers, FiX } from "react-icons/fi";
import { useAtualizar } from "../../context/AtualizarContexto";
import * as contatosService from "../../services/contatosService";
import * as gruposService from "../../services/gruposService";
import styles from "./Grupos.module.css";

function getInitial(nome) {
  return (nome || "?").trim().charAt(0).toUpperCase();
}

const memberFilters = [
  { value: "all", label: "Todos" },
  { value: "empty", label: "Vazios" },
  { value: "with_members", label: "Com membros" },
  { value: "large", label: "5+ membros" },
];

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [novoGrupo, setNovoGrupo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [memberCounts, setMemberCounts] = useState({});
  const [toast, setToast] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), type === "error" ? 5000 : 3200);
  }

  async function carregar() {
    const [listaGrupos, listaContatos] = await Promise.all([
      gruposService.listGrupos(),
      contatosService.listContatos(),
    ]);

    setGrupos(listaGrupos || []);
    setContatos(listaContatos || []);
  }

  useEffect(() => {
    carregar();
    return () => {
      clearInterval(pollingRef.current);
      window.clearTimeout(showToast.timeoutId);
    };
  }, [atualizarToken]);

  useEffect(() => {
    pollingRef.current = setInterval(carregar, 4000);
    return () => clearInterval(pollingRef.current);
  }, []);

  async function criarGrupo() {
    if (!novoGrupo.trim()) return showToast("error", "Digite um nome para o grupo.");

    try {
      await gruposService.criarGrupo(novoGrupo.trim());
      setNovoGrupo("");
      setCreateOpen(false);
      await carregar();
      atualizar();
      showToast("success", "Grupo criado com sucesso.");
    } catch (error) {
      showToast("error", "Erro ao criar grupo.");
    }
  }

  function fecharModalCriacao() {
    setCreateOpen(false);
    setNovoGrupo("");
  }

  function removerGrupo(id) {
    setConfirmData({
      title: "Remover grupo",
      message: "Todos os membros vinculados serao removidos deste agrupamento.",
      onConfirm: async () => {
        try {
          await gruposService.removerGrupo(id);
          await carregar();
          atualizar();
          showToast("success", "Grupo removido com sucesso.");
        } catch (error) {
          if (error?.status === 400) showToast("error", "Esse grupo possui agendamento ativo.");
          else showToast("error", "Erro ao remover grupo.");
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  function atualizarQuantidadeMembros(grupoId, count) {
    setMemberCounts((prev) => {
      if (prev[grupoId] === count) return prev;
      return { ...prev, [grupoId]: count };
    });
  }

  const gruposFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return grupos.filter((grupo) => {
      const nome = String(grupo.nome || "").toLowerCase();
      const totalMembros = Number(
        memberCounts[grupo.id] ??
          grupo.total_membros ??
          grupo.totalMembros ??
          grupo.membrosCount ??
          grupo.membros?.length ??
          0,
      );

      const matchesSearch = !term || nome.includes(term);
      const matchesMembers =
        memberFilter === "all" ||
        (memberFilter === "empty" && totalMembros === 0) ||
        (memberFilter === "with_members" && totalMembros > 0) ||
        (memberFilter === "large" && totalMembros >= 5);

      return matchesSearch && matchesMembers;
    });
  }, [grupos, memberCounts, memberFilter, search]);

  return (
    <>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Equipe</span>
            <h3 className={styles.title}>Grupos</h3>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.counter}>{grupos.length} grupos</span>
            <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <FiPlus size={16} />
              Adicionar grupo
            </button>
          </div>
        </header>

        <div className={styles.filters}>
          <label className={styles.searchWrap}>
            <FiSearch size={15} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Procurar grupo"
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filtrar grupos por membros">
            {memberFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterButton} ${memberFilter === option.value ? styles.filterButtonActive : ""}`}
                onClick={() => setMemberFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.list}>
          {grupos.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Nenhum grupo criado</strong>
              <span>Adicione o primeiro grupo para organizar envios em lote.</span>
            </div>
          )}

          {grupos.length > 0 && gruposFiltrados.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Nenhum grupo encontrado</strong>
              <span>Ajuste a busca ou troque o filtro para ver outros grupos.</span>
            </div>
          )}

          {gruposFiltrados.map((grupo) => (
            <GroupCard
              key={`${grupo.id}-${atualizarToken}`}
              grupo={grupo}
              contatos={contatos}
              onUpdated={() => {
                carregar();
                atualizar();
              }}
              onRemoveGroup={() => removerGrupo(grupo.id)}
              onMemberCountChange={atualizarQuantidadeMembros}
              showToast={showToast}
              setConfirmData={setConfirmData}
            />
          ))}
        </div>
      </section>

      {createOpen && (
        <div className={styles.overlay} role="presentation" onClick={fecharModalCriacao}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Adicionar grupo</h4>
            <div className={styles.inputWrap}>
              <FiUsers size={15} />
              <input
                value={novoGrupo}
                onChange={(event) => setNovoGrupo(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && criarGrupo()}
                placeholder="Nome do novo grupo"
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={fecharModalCriacao}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryButton} onClick={criarGrupo}>
                <FiPlus size={16} />
                Adicionar grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div className={styles.overlay} role="presentation" onClick={() => setConfirmData(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>{confirmData.title}</h4>
            <p className={styles.modalText}>{confirmData.message}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmData(null)}>Cancelar</button>
              <button type="button" className={styles.dangerButton} onClick={confirmData.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.text}
        </div>
      )}
    </>
  );
}

function GroupCard({ grupo, contatos, onRemoveGroup, onUpdated, onMemberCountChange, showToast, setConfirmData }) {
  const [membros, setMembros] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState(grupo.nome || "");
  const { atualizarToken } = useAtualizar();

  async function carregarMembros() {
    const data = await gruposService.listarContatosDoGrupo(grupo.id, { t: Date.now() });
    const nextMembros = data || [];
    setMembros(nextMembros);
    onMemberCountChange?.(grupo.id, nextMembros.length);
  }

  useEffect(() => {
    carregarMembros();
  }, [grupo.id, atualizarToken]);

  async function adicionarContatoAoGrupo(contatoId) {
    if (!contatoId) return showToast("error", "Selecione um contato.");

    try {
      await gruposService.adicionarContatoAoGrupo(grupo.id, Number(contatoId));
      setSelectedToAdd("");
      await carregarMembros();
      onUpdated?.();
      showToast("success", "Contato adicionado ao grupo.");
    } catch (error) {
      showToast("error", "Erro ao adicionar contato.");
    }
  }

  function removerContatoDoGrupo(contatoId) {
    setConfirmData({
      title: "Remover contato",
      message: "Esse contato saira do grupo atual, mas continuara cadastrado na base.",
      onConfirm: async () => {
        try {
          await gruposService.removerContatoDoGrupo(grupo.id, contatoId);
          await carregarMembros();
          onUpdated?.();
          showToast("success", "Contato removido do grupo.");
        } catch (error) {
          showToast("error", "Erro ao remover contato do grupo.");
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  async function salvarEdicaoGrupo() {
    const nome = editGroupName.trim();
    if (!nome) return showToast("error", "Digite um nome valido.");

    try {
      await gruposService.editarGrupo(grupo.id, nome);
      setEditOpen(false);
      onUpdated?.();
      showToast("success", "Grupo editado com sucesso.");
    } catch (error) {
      showToast("error", "Erro ao editar grupo.");
    }
  }

  const idsNoGrupo = membros.map((membro) => membro.id);
  const opcoesAdd = contatos.filter((contato) => !idsNoGrupo.includes(contato.id));

  return (
    <>
      <article className={styles.groupCard}>
        <button type="button" className={styles.groupHeader} onClick={() => setExpanded((prev) => !prev)}>
          <div className={styles.groupIdentity}>
            <span className={styles.groupIcon}><FiUsers size={17} /></span>
            <div>
              <strong>{grupo.nome}</strong>
              <span>{membros.length} membro(s)</span>
            </div>
          </div>
          <span className={styles.chevron}>{expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</span>
        </button>

        {expanded && (
          <div className={styles.groupBody}>
            <div className={styles.groupActions}>
              <button type="button" className={styles.iconButton} onClick={() => setEditOpen(true)}>
                <FiEdit2 size={15} />
              </button>
              <button type="button" className={`${styles.iconButton} ${styles.iconDanger}`} onClick={onRemoveGroup}>
                <FiTrash2 size={15} />
              </button>
            </div>

            {membros.length === 0 ? (
              <div className={styles.memberEmpty}>Grupo vazio. Adicione contatos abaixo.</div>
            ) : (
              <div className={styles.memberList}>
                {membros.map((membro) => (
                  <div key={membro.id} className={styles.memberRow}>
                    <div className={styles.memberIdentity}>
                      <span className={styles.memberAvatar}>{getInitial(membro.nome)}</span>
                      <div>
                        <strong>{membro.nome || "Sem nome"}</strong>
                        <span>{membro.numero || "Sem numero"}</span>
                      </div>
                    </div>
                    <button type="button" className={`${styles.iconButton} ${styles.iconDanger}`} onClick={() => removerContatoDoGrupo(membro.id)}>
                      <FiX size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.addRow}>
              <div className={styles.selectWrap}>
                <select value={selectedToAdd} onChange={(event) => setSelectedToAdd(event.target.value)}>
                  <option value="">Adicionar contato ao grupo</option>
                  {opcoesAdd.map((contato) => (
                    <option key={contato.id} value={contato.id}>
                      {contato.nome || "Sem nome"} - {contato.numero}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className={styles.primaryButton} onClick={() => adicionarContatoAoGrupo(selectedToAdd)}>
                <FiUserPlus size={16} />
                Adicionar
              </button>
            </div>
          </div>
        )}
      </article>

      {editOpen && (
        <div className={styles.overlay} role="presentation" onClick={() => setEditOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Editar grupo</h4>
            <div className={styles.inputWrap}>
              <FiUsers size={15} />
              <input value={editGroupName} onChange={(event) => setEditGroupName(event.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setEditOpen(false)}>Cancelar</button>
              <button type="button" className={styles.primaryButton} onClick={salvarEdicaoGrupo}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
