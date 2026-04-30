import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiClock, FiEdit2, FiPlus, FiSearch, FiSmartphone, FiTrash2, FiX } from "react-icons/fi";
import { useAtualizar } from "../../context/AtualizarContexto";
import * as agService from "../../services/agendamentosService";
import * as contatosService from "../../services/contatosService";
import * as gruposService from "../../services/gruposService";
import * as msgsService from "../../services/mensagensService";
import { getConnectedConnections, getStatus } from "../../services/statusService";
import styles from "./Agendamentos.module.css";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMES_DIAS = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sab" };
const filtrosTipo = [
  { value: "all", label: "Todos" },
  { value: "numero", label: "Numeros" },
  { value: "grupo", label: "Grupos" },
];

function normalizeDias(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value || "[]");
    } catch {
      return [];
    }
  }
  return [];
}

function formatConnectionPhone(number) {
  if (!number) return "Numero nao vinculado";
  const digits = String(number).replace(/\D/g, "");
  if (!digits.startsWith("55") || digits.length < 12) return number;

  const local = digits.slice(4);
  const prefix = local.length === 9 ? local.slice(0, 5) : local.slice(0, 4);
  const suffix = local.length === 9 ? local.slice(5) : local.slice(4);

  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${prefix}-${suffix}`;
}

function DayPicker({ selected, onToggle }) {
  return (
    <div className={styles.dayPicker}>
      {ORDEM_DIAS.map((dia) => (
        <button
          key={dia}
          type="button"
          className={`${styles.dayButton} ${selected.includes(dia) ? styles.dayButtonActive : ""}`}
          onClick={() => onToggle(dia)}
        >
          {NOMES_DIAS[dia]}
        </button>
      ))}
    </div>
  );
}

export default function Agendamentos() {
  const [tipo, setTipo] = useState("numero");
  const [contatoId, setContatoId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [mensagemId, setMensagemId] = useState("");
  const [horario, setHorario] = useState("");
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroDia, setFiltroDia] = useState("all");
  const [toast, setToast] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const { atualizar, atualizarToken } = useAtualizar();
  const pollingRef = useRef(null);

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), type === "error" ? 5000 : 3200);
  }

  async function carregarDadosBasicos() {
    const [listaGrupos, listaMensagens, listaContatos, status] = await Promise.all([
      gruposService.listGrupos(),
      msgsService.listMensagens(),
      contatosService.listContatos(),
      getStatus(),
    ]);

    setGrupos(listaGrupos || []);
    setMensagens(listaMensagens || []);
    setContatos(listaContatos || []);
    setConnections(getConnectedConnections(status));
  }

  async function carregarAgendamentos() {
    const lista = await agService.listarAgendamentos();
    setAgendamentos((lista || []).map((item) => ({ ...item, dias: normalizeDias(item.dias) })));
  }

  async function refreshAll() {
    await Promise.all([carregarDadosBasicos(), carregarAgendamentos()]);
  }

  useEffect(() => {
    refreshAll();
    return () => {
      clearInterval(pollingRef.current);
      window.clearTimeout(showToast.timeoutId);
    };
  }, [atualizarToken]);

  useEffect(() => {
    pollingRef.current = setInterval(refreshAll, 3000);
    return () => clearInterval(pollingRef.current);
  }, []);

  function toggleDia(value) {
    setDiasSelecionados((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function toggleDiaEdicao(value) {
    setEditData((prev) => ({
      ...prev,
      dias: prev.dias.includes(value) ? prev.dias.filter((item) => item !== value) : [...prev.dias, value],
    }));
  }

  async function criar() {
    if (!mensagemId) return showToast("error", "Selecione uma mensagem.");
    if ((tipo === "numero" && !contatoId) || (tipo === "grupo" && !grupoId) || !horario || diasSelecionados.length === 0) {
      return showToast("error", "Preencha os campos e selecione ao menos um dia.");
    }

    try {
      await agService.criarAgendamento({
        contato_id: tipo === "numero" ? contatoId : null,
        grupo_id: tipo === "grupo" ? grupoId : null,
        mensagem_id: mensagemId,
        horario,
        dias: [...diasSelecionados].sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b)),
        connection_ids: selectedConnectionIds,
      });

      setContatoId("");
      setGrupoId("");
      setMensagemId("");
      setHorario("");
      setDiasSelecionados([]);
      setSelectedConnectionIds([]);
      setCreateOpen(false);
      await refreshAll();
      atualizar();
      showToast("success", "Agendamento criado com sucesso.");
    } catch (error) {
      showToast("error", "Erro ao criar agendamento.");
    }
  }

  function fecharModalCriacao() {
    setCreateOpen(false);
    setContatoId("");
    setGrupoId("");
    setMensagemId("");
    setHorario("");
    setDiasSelecionados([]);
    setSelectedConnectionIds([]);
  }

  function abrirEdicao(item) {
    setEditData({
      id: item.id,
      tipo: item.grupo_id ? "grupo" : "numero",
      contato_id: item.contato_id || "",
      grupo_id: item.grupo_id || "",
      mensagem_id: item.mensagem_id || "",
      horario: item.horario || "",
      dias: item.dias || [],
      connection_ids: item.connection_ids || [],
    });
    setEditOpen(true);
  }

  async function salvarEdicao() {
    try {
      await agService.editarAgendamento(editData.id, {
        contato_id: editData.tipo === "numero" ? editData.contato_id : null,
        grupo_id: editData.tipo === "grupo" ? editData.grupo_id : null,
        mensagem_id: editData.mensagem_id,
        horario: editData.horario,
        dias: [...editData.dias].sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b)),
        connection_ids: editData.connection_ids || [],
      });

      setEditOpen(false);
      setEditData(null);
      await refreshAll();
      atualizar();
      showToast("success", "Agendamento atualizado com sucesso.");
    } catch (error) {
      showToast("error", "Erro ao editar agendamento.");
    }
  }

  function remover(id) {
    setConfirmData({
      title: "Remover agendamento",
      message: "Essa automacao sera retirada da fila de disparo.",
      onConfirm: async () => {
        try {
          await agService.removerAgendamento(id);
          await refreshAll();
          atualizar();
          showToast("success", "Agendamento removido com sucesso.");
        } catch (error) {
          showToast("error", "Erro ao remover agendamento.");
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  const agendamentosRender = useMemo(() => {
    return agendamentos.map((item) => {
      const diasTexto = [...(item.dias || [])]
        .sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b))
        .map((dia) => NOMES_DIAS[dia])
        .join(", ");

      let destino = "";
      if (item.grupo_id) {
        const grupo = grupos.find((entry) => String(entry.id) === String(item.grupo_id));
        destino = grupo ? `Grupo ${grupo.nome}` : `Grupo #${item.grupo_id}`;
      } else {
        const contato = contatos.find((entry) => String(entry.id) === String(item.contato_id));
        destino = contato ? `${contato.nome || "Sem nome"} - ${contato.numero}` : `Contato #${item.contato_id}`;
      }

      const connectionIds = Array.isArray(item.connection_ids) ? item.connection_ids : [];
      const remetentes = connectionIds.length === 0
        ? "Todos os numeros conectados"
        : connectionIds
          .map((id) => connections.find((connection) => connection.id === id)?.name || `Conexao ${id}`)
          .join(", ");

      return {
        ...item,
        destino,
        diasTexto,
        remetentes,
      };
    });
  }, [agendamentos, connections, contatos, grupos]);

  const agendamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return agendamentosRender.filter((item) => {
      const tipoItem = item.grupo_id ? "grupo" : "numero";
      const textoBusca = `${item.destino || ""} ${item.mensagem || ""} ${item.horario || ""} ${item.diasTexto || ""} ${item.remetentes || ""}`.toLowerCase();
      const matchesBusca = !termo || textoBusca.includes(termo);
      const matchesTipo = filtroTipo === "all" || tipoItem === filtroTipo;
      const matchesDia = filtroDia === "all" || (item.dias || []).includes(Number(filtroDia));

      return matchesBusca && matchesTipo && matchesDia;
    });
  }, [agendamentosRender, busca, filtroDia, filtroTipo]);

  function renderDestinoSelect(tipoAtual, onTipo, contatoAtual, onContato, grupoAtual, onGrupo) {
    return (
      <div className={styles.destinoRow}>
        <select value={tipoAtual} onChange={(event) => onTipo(event.target.value)}>
          <option value="numero">Numero individual</option>
          <option value="grupo">Grupo</option>
        </select>

        {tipoAtual === "numero" ? (
          <select value={contatoAtual} onChange={(event) => onContato(event.target.value)}>
            <option value="">Escolher numero</option>
            {contatos.map((contato) => (
              <option key={contato.id} value={contato.id}>
                {contato.nome || "Sem nome"} - {contato.numero}
              </option>
            ))}
          </select>
        ) : (
          <select value={grupoAtual} onChange={(event) => onGrupo(event.target.value)}>
            <option value="">Escolher grupo</option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  function toggleConnection(connectionId) {
    setSelectedConnectionIds((prev) =>
      prev.includes(connectionId) ? prev.filter((item) => item !== connectionId) : [...prev, connectionId],
    );
  }

  function toggleEditConnection(connectionId) {
    setEditData((prev) => {
      const current = prev.connection_ids || [];
      return {
        ...prev,
        connection_ids: current.includes(connectionId)
          ? current.filter((item) => item !== connectionId)
          : [...current, connectionId],
      };
    });
  }

  function renderConnectionPicker(selectedIds, onToggle) {
    if (connections.length === 0) {
      return <p className={styles.connectionHint}>Nenhum numero conectado no momento.</p>;
    }

    return (
      <>
        <p className={styles.connectionHint}>
          Se nenhum numero for selecionado, o agendamento sera enviado por todos os numeros conectados.
        </p>
        <div className={styles.connectionPicker}>
          {connections.map((connection) => {
            const selected = selectedIds.includes(connection.id);

            return (
              <button
                key={connection.id}
                type="button"
                className={`${styles.connectionChip} ${selected ? styles.connectionChipActive : ""}`}
                onClick={() => onToggle(connection.id)}
              >
                <strong>{connection.name}</strong>
                <span>{formatConnectionPhone(connection.connectedNumber)}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Automacao</span>
            <h3 className={styles.title}>Agendamentos</h3>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.counter}>{agendamentos.length} ativos</span>
            <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <FiPlus size={16} />
              Criar agendamento
            </button>
          </div>
        </header>

        <div className={styles.filters}>
          <label className={styles.searchWrap}>
            <FiSearch size={15} />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Procurar agendamento"
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filtrar agendamentos por destino">
            {filtrosTipo.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterButton} ${filtroTipo === option.value ? styles.filterButtonActive : ""}`}
                onClick={() => setFiltroTipo(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select className={styles.filterSelect} value={filtroDia} onChange={(event) => setFiltroDia(event.target.value)}>
            <option value="all">Todos os dias</option>
            {ORDEM_DIAS.map((dia) => (
              <option key={dia} value={dia}>{NOMES_DIAS[dia]}</option>
            ))}
          </select>

          {(busca || filtroTipo !== "all" || filtroDia !== "all") && (
            <button type="button" className={styles.ghostButton} onClick={() => { setBusca(""); setFiltroTipo("all"); setFiltroDia("all"); }}>
              <FiX size={14} />
              Limpar
            </button>
          )}
        </div>

        <div className={styles.list}>
          {agendamentosRender.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Nenhum agendamento criado</strong>
              <span>Monte a primeira automacao para aparecer aqui.</span>
            </div>
          )}

          {agendamentosRender.length > 0 && agendamentosFiltrados.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Nenhum agendamento encontrado</strong>
              <span>Ajuste a busca ou troque os filtros para ver outros agendamentos.</span>
            </div>
          )}

          {agendamentosFiltrados.map((item) => (
            <article key={item.id} className={styles.item}>
              <div>
                <strong>{item.destino}</strong>
                <p>{item.mensagem || "Mensagem nao encontrada"}</p>
                <div className={styles.tags}>
                  <span><FiClock size={13} /> {item.horario}</span>
                  <span><FiCalendar size={13} /> {item.diasTexto}</span>
                  <span><FiSmartphone size={13} /> {item.remetentes}</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.iconButton} onClick={() => abrirEdicao(item)}>
                  <FiEdit2 size={15} />
                </button>
                <button type="button" className={`${styles.iconButton} ${styles.iconDanger}`} onClick={() => remover(item.id)}>
                  <FiTrash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {createOpen && (
        <div className={styles.overlay} role="presentation" onClick={fecharModalCriacao}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Criar agendamento</h4>

            <div className={styles.modalField}>
              <label>Enviar para</label>
              {renderDestinoSelect(tipo, setTipo, contatoId, setContatoId, grupoId, setGrupoId)}
            </div>

            <div className={styles.modalField}>
              <label>Mensagem</label>
              <select value={mensagemId} onChange={(event) => setMensagemId(event.target.value)}>
                <option value="">Selecione uma mensagem</option>
                {mensagens.map((mensagem) => (
                  <option key={mensagem.id} value={mensagem.id}>
                    {mensagem.texto.length > 90 ? `${mensagem.texto.slice(0, 90)}...` : mensagem.texto}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalField}>
              <label>Horario</label>
              <input type="time" value={horario} onChange={(event) => setHorario(event.target.value)} />
            </div>

            <div className={styles.modalField}>
              <label>Dias</label>
              <DayPicker selected={diasSelecionados} onToggle={toggleDia} />
            </div>

            <div className={styles.modalField}>
              <label>Enviar usando</label>
              {renderConnectionPicker(selectedConnectionIds, toggleConnection)}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={fecharModalCriacao}>Cancelar</button>
              <button type="button" className={styles.primaryButton} onClick={criar}>
                <FiPlus size={16} />
                Criar agendamento
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editData && (
        <div className={styles.overlay} role="presentation" onClick={() => { setEditOpen(false); setEditData(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Editar agendamento</h4>

            <div className={styles.modalField}>
              <label>Enviar para</label>
              {renderDestinoSelect(
                editData.tipo,
                (value) => setEditData((prev) => ({ ...prev, tipo: value })),
                editData.contato_id,
                (value) => setEditData((prev) => ({ ...prev, contato_id: value })),
                editData.grupo_id,
                (value) => setEditData((prev) => ({ ...prev, grupo_id: value })),
              )}
            </div>

            <div className={styles.modalField}>
              <label>Mensagem</label>
              <select
                value={editData.mensagem_id}
                onChange={(event) => setEditData((prev) => ({ ...prev, mensagem_id: event.target.value }))}
              >
                <option value="">Selecione uma mensagem</option>
                {mensagens.map((mensagem) => (
                  <option key={mensagem.id} value={mensagem.id}>
                    {mensagem.texto.length > 90 ? `${mensagem.texto.slice(0, 90)}...` : mensagem.texto}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalField}>
              <label>Horario</label>
              <input
                type="time"
                value={editData.horario}
                onChange={(event) => setEditData((prev) => ({ ...prev, horario: event.target.value }))}
              />
            </div>

            <div className={styles.modalField}>
              <label>Dias</label>
              <DayPicker selected={editData.dias} onToggle={toggleDiaEdicao} />
            </div>

            <div className={styles.modalField}>
              <label>Enviar usando</label>
              {renderConnectionPicker(editData.connection_ids || [], toggleEditConnection)}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => { setEditOpen(false); setEditData(null); }}>Cancelar</button>
              <button type="button" className={styles.primaryButton} onClick={salvarEdicao}>Salvar</button>
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
              <button type="button" className={styles.dangerButton} onClick={confirmData.onConfirm}>Remover</button>
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
