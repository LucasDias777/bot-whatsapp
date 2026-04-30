import React, { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPhone, FiPlus, FiSearch, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { useAtualizar } from "../../context/AtualizarContexto";
import * as contatosService from "../../services/contatosService";
import { getStatus, hasConnectedConnection } from "../../services/statusService";
import styles from "./Contatos.module.css";

function formatarNumeroBRParaInput(digits) {
  if (!digits) return "";
  let value = String(digits).replace(/\D/g, "");
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length <= 2) return `(${value}`;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

function formatarParaLista(numeroCom55) {
  if (!numeroCom55) return "";
  let value = String(numeroCom55).replace(/\D/g, "");
  if (value.startsWith("55")) value = value.slice(2);
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length <= 2) return `+55 (${value}`;
  if (value.length <= 7) return `+55 (${value.slice(0, 2)}) ${value.slice(2)}`;
  return `+55 (${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

function limparNumeroParaEnviar(raw) {
  let value = String(raw || "").replace(/\D/g, "");
  if (value.length > 11 && value.startsWith("55")) value = value.slice(2);
  return `55${value}`;
}

function getInitial(nome) {
  return (nome || "?").trim().charAt(0).toUpperCase();
}

export default function Contatos() {
  const [lista, setLista] = useState([]);
  const [nome, setNome] = useState("");
  const [rawNumero, setRawNumero] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [toast, setToast] = useState(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editRawNumero, setEditRawNumero] = useState("");
  const [confirmData, setConfirmData] = useState(null);
  const { atualizar } = useAtualizar();

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), type === "error" ? 5000 : 3500);
  }

  async function carregar() {
    try {
      const response = await contatosService.listContatos();
      setLista(response || []);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    carregar();
    return () => window.clearTimeout(showToast.timeoutId);
  }, []);

  function handleNumeroChange(event, setter) {
    let value = String(event.target.value).replace(/\D/g, "");
    if (value.length > 11 && value.startsWith("55")) value = value.slice(2);
    setter(value.slice(0, 11));
  }

  async function salvarContato() {
    if (!nome.trim()) return showToast("error", "Digite um nome.");
    if (!rawNumero.trim()) return showToast("error", "Digite um numero valido.");

    const numeroLimpo = limparNumeroParaEnviar(rawNumero);
    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      return showToast("error", "Use um numero no formato (44) 99999-9999.");
    }

    if (lista.some((contato) => String(contato.numero) === numeroLimpo)) {
      return showToast("error", "Esse numero ja esta cadastrado.");
    }

    try {
      const status = await getStatus();
      if (!hasConnectedConnection(status)) {
        return showToast("error", "Conecte o WhatsApp antes de criar um contato.");
      }
    } catch (error) {
      return showToast("error", "Nao foi possivel validar o status do WhatsApp.");
    }

    setLoadingAdd(true);
    try {
      const response = await contatosService.criarContato(nome.trim(), numeroLimpo);
      if (!response?.ok) {
        return showToast("error", response?.erro || "Falha ao criar o contato.");
      }

      setNome("");
      setRawNumero("");
      setCreateOpen(false);
      await carregar();
      atualizar();
      showToast("success", "Contato criado com sucesso.");
    } catch (error) {
      showToast("error", error?.message || "Falha ao criar o contato.");
    } finally {
      setLoadingAdd(false);
    }
  }

  function abrirModalEditar(contato) {
    setEditId(contato.id);
    setEditNome(contato.nome || "");
    setEditRawNumero(String(contato.numero || "").replace(/^55/, ""));
    setIsModalOpen(true);
  }

  function fecharModal() {
    setIsModalOpen(false);
    setEditId(null);
    setEditNome("");
    setEditRawNumero("");
  }

  function fecharModalCriacao() {
    setCreateOpen(false);
    setNome("");
    setRawNumero("");
  }

  async function salvarEdicao() {
    if (!editNome.trim()) return showToast("error", "Digite um nome.");
    if (!editRawNumero.trim()) return showToast("error", "Digite um numero.");

    const numeroLimpo = limparNumeroParaEnviar(editRawNumero);
    if (!/^55\d{2}9\d{8}$/.test(numeroLimpo)) {
      return showToast("error", "Use um numero no formato (44) 99999-9999.");
    }

    if (lista.some((contato) => String(contato.numero) === numeroLimpo && contato.id !== editId)) {
      return showToast("error", "Esse numero ja esta cadastrado em outro contato.");
    }

    setLoadingEdit(true);
    try {
      const response = await contatosService.editarContato(editId, editNome.trim(), numeroLimpo);
      if (!response?.ok) {
        return showToast("error", response?.erro || "Falha ao editar o contato.");
      }

      await carregar();
      atualizar();
      fecharModal();
      showToast("success", "Contato atualizado com sucesso.");
    } catch (error) {
      showToast("error", error?.message || "Falha ao editar o contato.");
    } finally {
      setLoadingEdit(false);
    }
  }

  function removerContato(id) {
    setConfirmData({
      title: "Remover contato",
      message: "Essa acao nao pode ser desfeita e pode afetar agendamentos existentes.",
      onConfirm: async () => {
        try {
          await contatosService.removerContato(id);
          await carregar();
          atualizar();
          showToast("success", "Contato removido com sucesso.");
        } catch (error) {
          if (error?.status === 400) {
            showToast("error", "Esse contato possui agendamento ativo.");
          } else {
            showToast("error", "Erro ao remover o contato.");
          }
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  const listaFiltrada = useMemo(() => {
    return lista.filter((contato) => {
      return (
        (contato.nome || "").toLowerCase().includes(filtroNome.toLowerCase()) &&
        String(contato.numero || "").includes(filtroNumero.replace(/\D/g, ""))
      );
    });
  }, [filtroNome, filtroNumero, lista]);

  return (
    <>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Base ativa</span>
            <h3 className={styles.title}>Contatos</h3>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.counter}>{lista.length} registros</span>
            <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <FiPlus size={16} />
              Adicionar contato
            </button>
          </div>
        </header>

        <div className={styles.filters}>
          <div className={styles.inputWrap}>
            <FiSearch size={15} />
            <input
              value={filtroNome}
              onChange={(event) => setFiltroNome(event.target.value)}
              placeholder="Buscar por nome"
            />
          </div>

          <div className={styles.inputWrap}>
            <FiSearch size={15} />
            <input
              value={filtroNumero}
              onChange={(event) => setFiltroNumero(event.target.value)}
              placeholder="Buscar por numero"
            />
          </div>

          {(filtroNome || filtroNumero) && (
            <button type="button" className={styles.ghostButton} onClick={() => { setFiltroNome(""); setFiltroNumero(""); }}>
              <FiX size={14} />
              Limpar
            </button>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contato</th>
                <th>Numero</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((contato) => (
                <tr key={contato.id}>
                  <td>
                    <div className={styles.person}>
                      <span className={styles.avatar}>{getInitial(contato.nome)}</span>
                      <div>
                        <strong>{contato.nome}</strong>
                        <span>Disponivel para disparo</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.mono}>{formatarParaLista(String(contato.numero || ""))}</td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.iconButton} onClick={() => abrirModalEditar(contato)}>
                        <FiEdit2 size={15} />
                      </button>
                      <button type="button" className={`${styles.iconButton} ${styles.iconDanger}`} onClick={() => removerContato(contato.id)}>
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {listaFiltrada.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Nenhum contato encontrado</strong>
              <span>Revise os filtros ou adicione um novo contato acima.</span>
            </div>
          )}
        </div>
      </section>

      {createOpen && (
        <div className={styles.overlay} role="presentation" onClick={fecharModalCriacao}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Adicionar contato</h4>

            <div className={styles.modalField}>
              <label>Nome</label>
              <div className={styles.inputWrap}>
                <FiUser size={15} />
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && salvarContato()}
                  placeholder="Nome do contato"
                />
              </div>
            </div>

            <div className={styles.modalField}>
              <label>Numero</label>
              <div className={styles.inputWrap}>
                <FiPhone size={15} />
                <input
                  value={formatarNumeroBRParaInput(rawNumero)}
                  onChange={(event) => handleNumeroChange(event, setRawNumero)}
                  onKeyDown={(event) => event.key === "Enter" && salvarContato()}
                  placeholder="(44) 99999-9999"
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={fecharModalCriacao}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryButton} onClick={salvarContato} disabled={loadingAdd}>
                <FiPlus size={16} />
                {loadingAdd ? "Adicionando..." : "Adicionar contato"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className={styles.overlay} role="presentation" onClick={fecharModal}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Editar contato</h4>

            <div className={styles.modalField}>
              <label>Nome</label>
              <div className={styles.inputWrap}>
                <FiUser size={15} />
                <input value={editNome} onChange={(event) => setEditNome(event.target.value)} />
              </div>
            </div>

            <div className={styles.modalField}>
              <label>Numero</label>
              <div className={styles.inputWrap}>
                <FiPhone size={15} />
                <input
                  value={formatarNumeroBRParaInput(editRawNumero)}
                  onChange={(event) => handleNumeroChange(event, setEditRawNumero)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={fecharModal}>Cancelar</button>
              <button type="button" className={styles.primaryButton} onClick={salvarEdicao} disabled={loadingEdit}>
                {loadingEdit ? "Salvando..." : "Salvar"}
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
