import React, { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiMessageSquare, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import * as mensagensService from "../../services/mensagensService";
import styles from "./Mensagens.module.css";

const MAX_CHARS = 1000;
const filters = [
  { value: "all", label: "Todas" },
  { value: "short", label: "Curtas" },
  { value: "medium", label: "Medias" },
  { value: "long", label: "Longas" },
];

export default function Mensagens() {
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmData, setConfirmData] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), type === "error" ? 5000 : 3200);
  }

  async function carregar() {
    const response = await mensagensService.listMensagens();
    setLista(response || []);
  }

  useEffect(() => {
    carregar();
    return () => window.clearTimeout(showToast.timeoutId);
  }, []);

  async function salvarMensagem() {
    if (!texto.trim()) return showToast("error", "Digite uma mensagem.");

    try {
      await mensagensService.criarMensagem(texto.trim());
      setTexto("");
      setCreateOpen(false);
      await carregar();
      showToast("success", "Mensagem criada com sucesso.");
    } catch (error) {
      if (error?.status === 400) showToast("error", "Ja existe uma mensagem igual.");
      else showToast("error", "Erro ao criar mensagem.");
    }
  }

  function abrirModalEditar(mensagem) {
    setEditId(mensagem.id);
    setEditTexto(mensagem.texto || "");
  }

  async function salvarEdicao() {
    if (!editTexto.trim()) return showToast("error", "O texto nao pode ficar vazio.");

    try {
      await mensagensService.editarMensagem(editId, editTexto.trim());
      await carregar();
      setEditId(null);
      setEditTexto("");
      showToast("success", "Mensagem editada com sucesso.");
    } catch (error) {
      if (error?.status === 400) showToast("error", "Ja existe uma mensagem igual.");
      else showToast("error", "Erro ao editar mensagem.");
    }
  }

  function removerMensagem(id) {
    setConfirmData({
      title: "Excluir mensagem",
      message: "Essa mensagem pode estar vinculada a um agendamento em andamento.",
      onConfirm: async () => {
        try {
          await mensagensService.removerMensagem(id);
          await carregar();
          showToast("success", "Mensagem removida com sucesso.");
        } catch (error) {
          if (error?.status === 400) showToast("error", "Essa mensagem possui um agendamento ativo.");
          else showToast("error", "Erro ao excluir mensagem.");
        } finally {
          setConfirmData(null);
        }
      },
    });
  }

  const progress = useMemo(() => Math.min((texto.length / MAX_CHARS) * 100, 100), [texto.length]);
  const editProgress = useMemo(() => Math.min((editTexto.length / MAX_CHARS) * 100, 100), [editTexto.length]);
  const filteredLista = useMemo(() => {
    const term = search.trim().toLowerCase();

    return lista.filter((mensagem) => {
      const messageText = mensagem.texto || "";
      const length = messageText.length;
      const matchesSearch = !term || messageText.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "short" && length <= 160) ||
        (filter === "medium" && length > 160 && length <= 500) ||
        (filter === "long" && length > 500);

      return matchesSearch && matchesFilter;
    });
  }, [filter, lista, search]);

  function closeCreateModal() {
    setCreateOpen(false);
    setTexto("");
  }

  return (
    <>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Templates</span>
            <h3 className={styles.title}>Mensagens</h3>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.counter}>{lista.length} salvas</span>
            <button type="button" className={`${styles.primaryButton} ${styles.headerButton}`} onClick={() => setCreateOpen(true)}>
              <FiPlus size={16} />
              Adicionar mensagem
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
              placeholder="Procurar mensagem"
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filtrar mensagens por tamanho">
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterButton} ${filter === option.value ? styles.filterButtonActive : ""}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.list}>
          {lista.length === 0 && (
            <div className={styles.emptyState}>
              <FiMessageSquare size={26} />
              <strong>Nenhuma mensagem cadastrada</strong>
              <span>Adicione a primeira mensagem para reutilizar nos disparos.</span>
            </div>
          )}

          {lista.length > 0 && filteredLista.length === 0 && (
            <div className={styles.emptyState}>
              <FiSearch size={26} />
              <strong>Nenhuma mensagem encontrada</strong>
              <span>Ajuste a busca ou troque o filtro para ver outros resultados.</span>
            </div>
          )}

          {filteredLista.map((mensagem) => (
            <article key={mensagem.id} className={styles.item}>
              <p>{mensagem.texto}</p>
              <footer className={styles.itemFooter}>
                <span>{(mensagem.texto || "").length} caracteres</span>
                <div className={styles.actions}>
                  <button type="button" className={styles.iconButton} onClick={() => abrirModalEditar(mensagem)}>
                    <FiEdit2 size={15} />
                  </button>
                  <button type="button" className={`${styles.iconButton} ${styles.iconDanger}`} onClick={() => removerMensagem(mensagem.id)}>
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {createOpen && (
        <div className={styles.overlay} role="presentation" onClick={closeCreateModal}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Adicionar mensagem</h4>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === "Enter") {
                  event.preventDefault();
                  salvarMensagem();
                }
              }}
              className={styles.modalTextarea}
              placeholder="Digite o texto da mensagem. Use {nome} se quiser personalizar depois."
            />
            <div className={styles.composerMeta}>
              <span>Ctrl+Enter tambem funciona</span>
              <strong>{texto.length}/{MAX_CHARS}</strong>
            </div>
            <div className={styles.progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={closeCreateModal}>Cancelar</button>
              <button type="button" className={styles.primaryButton} onClick={salvarMensagem}>
                <FiPlus size={16} />
                Adicionar mensagem
              </button>
            </div>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className={styles.overlay} role="presentation" onClick={() => { setEditId(null); setEditTexto(""); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.modalTitle}>Editar mensagem</h4>
            <textarea
              value={editTexto}
              onChange={(event) => setEditTexto(event.target.value.slice(0, MAX_CHARS))}
              className={styles.modalTextarea}
            />
            <div className={styles.composerMeta}>
              <span>Revise o texto antes de salvar</span>
              <strong>{editTexto.length}/{MAX_CHARS}</strong>
            </div>
            <div className={styles.progress}>
              <span style={{ width: `${editProgress}%` }} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => { setEditId(null); setEditTexto(""); }}>Cancelar</button>
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
              <button type="button" className={styles.dangerButton} onClick={confirmData.onConfirm}>Excluir</button>
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
