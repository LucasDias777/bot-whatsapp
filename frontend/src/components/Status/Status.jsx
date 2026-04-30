import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiLoader,
  FiLogOut,
  FiPlay,
  FiPlus,
  FiRefreshCcw,
  FiSmartphone,
  FiTrash2,
  FiWifi,
} from "react-icons/fi";
import {
  addConnection,
  deleteConnection,
  disconnect,
  disconnectConnection,
  getStatus,
  requestConnectionQr,
} from "../../services/statusService";
import styles from "./Status.module.css";

const statusMeta = {
  loading: {
    label: "Carregando",
    tone: "neutral",
    description: "Buscando o estado atual do cliente WhatsApp.",
  },
  checking: {
    label: "Verificando",
    tone: "neutral",
    description: "Conferindo a sessao antes de liberar o painel.",
  },
  connecting: {
    label: "Conectando",
    tone: "info",
    description: "O cliente esta negociando a sessao com o WhatsApp.",
  },
  qr: {
    label: "QR pronto",
    tone: "warning",
    description: "Escaneie o QR Code para autenticar esta estacao.",
  },
  connected: {
    label: "Conectado",
    tone: "success",
    description: "Sessao ativa e pronta para enviar mensagens.",
  },
  disconnected: {
    label: "Desconectado",
    tone: "neutral",
    description: "Sessao parada. Clique em gerar QR Code quando quiser conectar novamente.",
  },
  disconnecting: {
    label: "Desconectando",
    tone: "danger",
    description: "Encerrando a sessao atual do cliente.",
  },
  remote_disconnected: {
    label: "Sessao encerrada",
    tone: "danger",
    description: "A sessao foi finalizada remotamente e precisa de novo QR.",
  },
};

function formatPhone(number) {
  if (!number) return "";
  const digits = String(number).replace(/\D/g, "");
  if (!digits.startsWith("55") || digits.length < 12) return number;

  const local = digits.slice(4);
  const prefix = local.length === 9 ? local.slice(0, 5) : local.slice(0, 4);
  const suffix = local.length === 9 ? local.slice(5) : local.slice(4);

  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${prefix}-${suffix}`;
}

function normalizePollingInterval(value, fallback = 2000) {
  const interval = Number(value);

  if (!Number.isFinite(interval) || interval < 500) {
    return fallback;
  }

  return interval;
}

function formatPollingIntervalLabel(value) {
  const pollingMs = normalizePollingInterval(value, 1000);
  const seconds = pollingMs <= 1500 ? 1 : Math.round(pollingMs / 1000);
  return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}

function buildProcessSteps(info) {
  const restoreFlow = info.connectionMode === "restore";
  const remoteRecovery = Boolean(info.awaitingReauth);

  const steps = [
    {
      id: "auth",
      label: restoreFlow ? "Sessao salva" : remoteRecovery ? "Novo QR" : "QR Code",
      description: restoreFlow
        ? "Cliente encontrou uma sessao persistida para reaproveitar."
        : remoteRecovery
          ? "A sessao anterior caiu e precisa de uma nova leitura no celular."
          : "Escaneie o codigo para autenticar esta estacao.",
    },
    {
      id: "connect",
      label: restoreFlow ? "Reconexão" : "Conexao",
      description: restoreFlow
        ? "Restabelecendo o vinculo automaticamente."
        : "Finalizando a autenticacao com o WhatsApp.",
    },
    {
      id: "ready",
      label: "Conectado",
      description: "Painel pronto para enviar mensagens.",
    },
  ];

  let currentStep = 0;

  if (info.status === "connected") {
    currentStep = 2;
  } else if (info.status === "connecting") {
    currentStep = 1;
  } else if (restoreFlow && info.status === "checking") {
    currentStep = 1;
  }

  return steps.map((step, index) => ({
    ...step,
    marker: index < currentStep ? "OK" : `0${index + 1}`,
    state: index < currentStep ? "done" : index === currentStep ? "current" : "upcoming",
  }));
}

function getProcessSummary(info) {
  if (info.connectionMode === "restore" && ["checking", "connecting"].includes(info.status)) {
    return {
      eyebrow: "Reconexão automatica",
      title: "Sessao valida encontrada",
      text: "O servidor reaproveitou a autenticacao salva e esta religando o cliente sem exigir novo QR.",
    };
  }

  if (info.awaitingReauth) {
    if (info.status === "qr") {
      return {
        eyebrow: "Reautenticacao",
        title: "Novo QR disponivel",
        text: "Use o celular para autorizar novamente esta estacao e concluir a reconexão.",
      };
    }

    return {
      eyebrow: "Sessao recuperando",
      title: "Desconexao remota detectada",
      text: "A aplicacao invalidou a sessao antiga e esta conduzindo a volta segura ate um novo QR.",
    };
  }

  if (info.status === "connected") {
    return {
      eyebrow: "Sessao ativa",
      title: "Tudo pronto para uso",
      text: "Cliente autenticado, monitorado em tempo real e pronto para enviar mensagens.",
    };
  }

  if (info.status === "connecting") {
    return {
      eyebrow: "Conexao em andamento",
      title: "Validando o acesso",
      text: "O QR ja foi lido e o WhatsApp esta finalizando a vinculacao desta sessao.",
    };
  }

  if (info.status === "qr") {
    return {
      eyebrow: "Autenticacao",
      title: "Aguardando leitura do QR",
      text: "Use o WhatsApp no celular para concluir a autenticacao desta estacao.",
    };
  }

  return {
    eyebrow: "Fluxo ao vivo",
    title: "Acompanhando a sessao",
    text: "O painel esta atualizando sozinho para refletir cada transicao do cliente.",
  };
}

function getProcessHint(info) {
  if (info.connectionMode === "restore" && ["checking", "connecting"].includes(info.status)) {
    return "Se a sessao ainda for valida no WhatsApp, o painel volta para conectado sozinho em alguns segundos.";
  }

  if (info.awaitingReauth && info.status !== "qr") {
    return "Assim que o cliente terminar de reinicializar, este painel trocara automaticamente para o novo QR.";
  }

  if (info.status === "connecting") {
    return "Depois da leitura do QR, essa etapa costuma durar apenas alguns segundos.";
  }

  if (info.status === "connected") {
    return "O monitoramento continua ativo e qualquer queda de sessao sera refletida aqui automaticamente.";
  }

  if (info.status === "disconnecting") {
    return "Ao finalizar a sessao atual, um novo QR sera exigido para entrar novamente.";
  }

  return "Os estados abaixo mostram em tempo real em que etapa a sessao do WhatsApp se encontra.";
}

function SingleStatusLegacy() {
  const [info, setInfo] = useState({ status: "loading" });
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pollingMs, setPollingMs] = useState(1000);

  useEffect(() => {
    let active = true;
    let timeoutId = null;

    async function loadStatus() {
      try {
        const response = await getStatus();
        if (!active) return;

        const nextPollingMs = normalizePollingInterval(response?.pollingIntervalMs, 1000);
        setInfo(response);
        setError("");
        setPollingMs(nextPollingMs);
        timeoutId = window.setTimeout(loadStatus, nextPollingMs);
      } catch (requestError) {
        if (!active) return;

        const fallbackPollingMs = 2000;
        setError("Nao foi possivel consultar o status do WhatsApp.");
        setPollingMs(fallbackPollingMs);
        timeoutId = window.setTimeout(loadStatus, fallbackPollingMs);
      }
    }

    loadStatus();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("modal-open", confirmOpen);
    return () => document.body.classList.remove("modal-open");
  }, [confirmOpen]);

  useEffect(() => {
    if (info.status !== "connected" && confirmOpen) {
      setConfirmOpen(false);
    }
  }, [confirmOpen, info.status]);

  const meta = useMemo(() => {
    if (info.connectionMode === "restore" && ["checking", "connecting"].includes(info.status)) {
      return {
        label: "Reconectando",
        tone: "info",
        description: "Restaurando a sessao valida salva anteriormente.",
      };
    }

    if (info.awaitingReauth && info.status === "checking") {
      return {
        label: "Gerando novo QR",
        tone: "danger",
        description: "A sessao foi desconectada pelo celular. Estamos preparando uma nova autenticacao.",
      };
    }

    if (info.awaitingReauth && info.status === "qr") {
      return {
        label: "Novo QR pronto",
        tone: "warning",
        description: "A sessao caiu remotamente. Escaneie o novo QR Code para reconectar.",
      };
    }
    return statusMeta[info.status] || {
      label: "Aguardando",
      tone: "neutral",
      description: "O painel ainda nao recebeu um status detalhado.",
    };
  }, [info.awaitingReauth, info.connectionMode, info.status]);

  const remoteNotice = useMemo(() => {
    if (info.connectionMode === "restore" && ["checking", "connecting"].includes(info.status)) {
      return "Sessao valida encontrada. O cliente esta restabelecendo a conexao automaticamente.";
    }

    if (!info.awaitingReauth) return "";

    if (info.status === "remote_disconnected") {
      return "Sessao encerrada no celular. O sistema ja iniciou a recuperacao para gerar um novo QR Code.";
    }

    if (info.status === "checking") {
      return "Desconexao remota detectada. O cliente esta reinicializando a sessao para exibir um novo QR.";
    }

    if (info.status === "qr") {
      return "Novo QR Code gerado. Abra o WhatsApp no celular e escaneie para reconectar a sessao.";
    }

    if (info.status === "connecting") {
      return "Novo QR lido. A sessao esta terminando de reconectar com o WhatsApp.";
    }

    return "";
  }, [info.awaitingReauth, info.connectionMode, info.status]);

  const noticeTone = useMemo(() => {
    if (info.connectionMode === "restore" && ["checking", "connecting"].includes(info.status)) {
      return "info";
    }

    if (info.awaitingReauth) {
      return "danger";
    }

    return "neutral";
  }, [info.awaitingReauth, info.connectionMode, info.status]);

  const processSteps = useMemo(
    () => buildProcessSteps(info),
    [info.awaitingReauth, info.connectionMode, info.status]
  );

  const processSummary = useMemo(
    () => getProcessSummary(info),
    [info.awaitingReauth, info.connectionMode, info.status]
  );

  const processHint = useMemo(
    () => getProcessHint(info),
    [info.awaitingReauth, info.connectionMode, info.status]
  );

  async function confirmDisconnect() {
    setLoadingAction(true);
    setError("");

    try {
      await disconnect();
      setConfirmOpen(false);
    } catch (disconnectError) {
      setError("Erro ao desconectar a sessao atual.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <>
      <article className={styles.card}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Status</span>
            <h2 className={styles.title}>Conexao do WhatsApp</h2>
          </div>
          <span className={`${styles.badge} ${styles[`badge${meta.tone}`]}`}>
            <FiWifi size={14} />
            {meta.label}
          </span>
        </div>

        <div className={styles.content}>
          <div className={styles.mainColumn}>
            <div className={`${styles.infoBox} ${styles[`infoBox${meta.tone}`]}`}>
              <div className={`${styles.statusIcon} ${styles[`icon${meta.tone}`]}`}>
                {["loading", "checking", "connecting", "disconnecting"].includes(info.status) ? (
                  <FiLoader size={18} className={styles.spinner} />
                ) : info.status === "connected" ? (
                  <FiSmartphone size={18} />
                ) : info.status === "remote_disconnected" ? (
                  <FiAlertTriangle size={18} />
                ) : info.status === "qr" ? (
                  <FiWifi size={18} />
                ) : (
                  <FiRefreshCcw size={18} />
                )}
              </div>

              <div>
                <strong className={styles.statusTitle}>{meta.label}</strong>
                <p className={styles.statusText}>{meta.description}</p>
                {info.connectedNumber && (
                  <div className={styles.numberLine}>
                    <FiSmartphone size={14} />
                    <span>{formatPhone(info.connectedNumber)}</span>
                  </div>
                )}
              </div>
            </div>

            {remoteNotice && (
              <div className={`${styles.remoteNotice} ${styles[`notice${noticeTone}`]}`}>
                {noticeTone === "info" ? (
                  <FiRefreshCcw size={16} className={styles.noticeIcon} />
                ) : (
                  <FiAlertTriangle size={16} className={styles.noticeIcon} />
                )}
                <span>{remoteNotice}</span>
              </div>
            )}
          </div>

          <aside className={`${styles.processPanel} ${styles[`processPanel${meta.tone}`]}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>{processSummary.eyebrow}</span>
              <strong className={styles.panelTitle}>{processSummary.title}</strong>
              <p className={styles.panelText}>{processSummary.text}</p>
            </div>

            <div className={styles.stepList}>
              {processSteps.map((step) => (
                <div key={step.id} className={`${styles.stepItem} ${styles[`step${step.state}`]}`}>
                  <span className={styles.stepMarker}>{step.marker}</span>
                  <div className={styles.stepContent}>
                    <strong className={styles.stepLabel}>{step.label}</strong>
                    <p className={styles.stepText}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {info.status === "qr" && info.qr ? (
              <div className={styles.qrPanel}>
                <img src={info.qr} alt="QR Code do WhatsApp" className={styles.qrImage} />
                <p className={styles.qrText}>
                  Abra o WhatsApp, va em aparelhos conectados e escaneie este QR.
                </p>
              </div>
            ) : (
              <div className={styles.processHintBox}>
                <span className={styles.processHintLabel}>
                  {info.connectionMode === "restore"
                    ? "Reconexao automatica"
                    : info.awaitingReauth
                      ? "Reautenticacao guiada"
                      : "Monitoramento ativo"}
                </span>
                <p className={styles.processHintText}>{processHint}</p>
              </div>
            )}
          </aside>
        </div>

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            O polling do status consulta a API automaticamente a cada {formatPollingIntervalLabel(pollingMs)}.
          </span>

          {info.status === "connected" && (
            <button
              type="button"
              className={styles.disconnectButton}
              onClick={() => setConfirmOpen(true)}
              disabled={loadingAction}
            >
              <FiLogOut size={15} />
              Desconectar
            </button>
          )}
        </div>

        {error && (
          <div className={styles.errorBox}>
            <FiAlertTriangle size={15} />
            {error}
          </div>
        )}
      </article>

      {confirmOpen && (
        <div className={styles.overlay} role="presentation" onClick={() => setConfirmOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>Encerrar a sessao atual?</h3>
            <p className={styles.modalText}>
              O cliente vai exigir um novo QR Code para conectar novamente.
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={confirmDisconnect}
                disabled={loadingAction}
              >
                {loadingAction ? "Desconectando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function normalizeStatusPayload(response = {}) {
  if (Array.isArray(response.connections)) {
    return {
      connections: response.connections,
      maxConnections: Number(response.maxConnections || 5),
      connectedCount: Number(response.connectedCount || 0),
      pollingIntervalMs: normalizePollingInterval(response.pollingIntervalMs, 1000),
    };
  }

  const legacyConnection = {
    id: "session-bot",
    name: "Conexao principal",
    status: response.status || "loading",
    qr: response.qr || "",
    connectedNumber: response.connectedNumber || null,
    lastQRCodeTime: response.lastQRCodeTime || null,
    disconnectReason: response.disconnectReason || null,
    awaitingReauth: Boolean(response.awaitingReauth),
    connectionMode: response.connectionMode || "pairing",
    reconnectCount: Number(response.reconnectCount || 0),
    connectedForMs: Number(response.connectedForMs || 0),
  };

  return {
    connections: [legacyConnection],
    maxConnections: 5,
    connectedCount: legacyConnection.status === "connected" ? 1 : 0,
    pollingIntervalMs: normalizePollingInterval(response.pollingIntervalMs, 1000),
  };
}

function getConnectionMeta(connection) {
  if (connection.connectionMode === "restore" && ["checking", "connecting"].includes(connection.status)) {
    return {
      label: "Reconectando",
      tone: "info",
      description: "Sessao salva encontrada. O cliente esta voltando automaticamente.",
    };
  }

  if (connection.awaitingReauth && connection.status === "checking") {
    return {
      label: "Gerando novo QR",
      tone: "danger",
      description: "Desconexao remota detectada. Preparando uma nova autenticacao.",
    };
  }

  if (connection.awaitingReauth && connection.status === "remote_disconnected") {
    return {
      label: "QR pendente",
      tone: "danger",
      description: "A sessao foi encerrada pelo celular. Gere um novo QR Code quando quiser reconectar.",
    };
  }

  if (connection.awaitingReauth && connection.status === "qr") {
    return {
      label: "Novo QR pronto",
      tone: "warning",
      description: "Escaneie o novo QR Code para reconectar esta sessao.",
    };
  }

  return statusMeta[connection.status] || {
    label: "Aguardando",
    tone: "neutral",
    description: "Esta conexao ainda nao informou um status detalhado.",
  };
}

function getConnectionNotice(connection) {
  if (connection.connectionMode === "restore" && ["checking", "connecting"].includes(connection.status)) {
    return {
      tone: "info",
      text: "Sessao valida encontrada. Esta conexao esta tentando voltar sozinha sem pedir novo QR.",
    };
  }

  if (!connection.awaitingReauth) return null;

  if (connection.disconnectReason === "manual_disconnect") {
    return {
      tone: "info",
      text: "Sessao encerrada pela aplicacao. Clique em gerar QR Code para conectar este numero novamente.",
    };
  }

  if (connection.status === "qr") {
    return {
      tone: "danger",
      text: "Novo QR gerado apos desconexao remota. Escaneie para reativar este numero.",
    };
  }

  if (connection.status === "connecting") {
    return {
      tone: "danger",
      text: "QR lido. O WhatsApp esta finalizando a reautenticacao desta conexao.",
    };
  }

  return {
    tone: "danger",
    text: "Sessao encerrada pelo celular. Clique em gerar QR Code para iniciar uma nova autenticacao.",
  };
}

function getConnectionIcon(status) {
  if (["loading", "checking", "connecting", "disconnecting"].includes(status)) {
    return <FiLoader size={18} className={styles.spinner} />;
  }

  if (status === "connected") {
    return <FiCheckCircle size={18} />;
  }

  if (status === "remote_disconnected") {
    return <FiAlertTriangle size={18} />;
  }

  if (status === "qr") {
    return <FiWifi size={18} />;
  }

  return <FiRefreshCcw size={18} />;
}

function formatConnectedDuration(ms) {
  if (!ms || ms < 1000) return "menos de 1 min";

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours <= 0) {
    return `${minutes} ${minutes === 1 ? "min" : "mins"}`;
  }

  return `${hours}h ${String(restMinutes).padStart(2, "0")}min`;
}

export default function Status() {
  const [info, setInfo] = useState({ connections: [], maxConnections: 5, connectedCount: 0, pollingIntervalMs: 1000 });
  const [error, setError] = useState("");
  const [pollingMs, setPollingMs] = useState(1000);
  const [addOpen, setAddOpen] = useState(false);
  const [connectionName, setConnectionName] = useState("");
  const [confirmConnection, setConfirmConnection] = useState(null);
  const [deleteConfirmConnection, setDeleteConfirmConnection] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    let active = true;
    let timeoutId = null;

    async function loadStatus() {
      try {
        const response = await getStatus();
        if (!active) return;

        const nextInfo = normalizeStatusPayload(response);
        setInfo(nextInfo);
        setPollingMs(nextInfo.pollingIntervalMs);
        setError("");
        timeoutId = window.setTimeout(loadStatus, nextInfo.pollingIntervalMs);
      } catch {
        if (!active) return;

        const fallbackPollingMs = 2000;
        setError("Nao foi possivel consultar as sessões do WhatsApp.");
        setPollingMs(fallbackPollingMs);
        timeoutId = window.setTimeout(loadStatus, fallbackPollingMs);
      }
    }

    loadStatus();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const modalOpen = addOpen || Boolean(confirmConnection) || Boolean(deleteConfirmConnection);
    document.body.classList.toggle("modal-open", modalOpen);
    return () => document.body.classList.remove("modal-open");
  }, [addOpen, confirmConnection, deleteConfirmConnection]);

  const canAddConnection = info.connections.length < info.maxConnections;

  const sortedConnections = useMemo(() => {
    return [...info.connections].sort((left, right) => {
      if (left.status === "connected" && right.status !== "connected") return -1;
      if (left.status !== "connected" && right.status === "connected") return 1;
      return String(left.createdAt || left.name).localeCompare(String(right.createdAt || right.name));
    });
  }, [info.connections]);

  async function handleCreateConnection(event) {
    event.preventDefault();

    const name = connectionName.trim();
    if (!name) {
      setError("Informe um nome para identificar a conexao.");
      return;
    }

    setLoadingAction(true);
    setError("");

    try {
      const response = await addConnection(name);
      setInfo(normalizeStatusPayload(response));
      setConnectionName("");
      setAddOpen(false);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || "Nao foi possivel criar a conexao.";
      setError(message);
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleDisconnectConnection() {
    if (!confirmConnection) return;

    setLoadingAction(true);
    setError("");

    try {
      const response = await disconnectConnection(confirmConnection.id);
      setInfo(normalizeStatusPayload(response));
      setConfirmConnection(null);
    } catch {
      setError("Erro ao desconectar esta conexao.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleRequestQr(connection) {
    setLoadingAction(true);
    setError("");

    try {
      const response = await requestConnectionQr(connection.id);
      setInfo(normalizeStatusPayload(response));
    } catch {
      setError("Nao foi possivel gerar o QR Code desta conexao.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleDeleteConnection() {
    if (!deleteConfirmConnection) return;

    setLoadingAction(true);
    setError("");

    try {
      const response = await deleteConnection(deleteConfirmConnection.id);
      setInfo(normalizeStatusPayload(response));
      setDeleteConfirmConnection(null);
    } catch {
      setError("Nao foi possivel excluir esta conexao.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <>
      <article className={styles.multiCard}>
        <div className={styles.multiHeader}>
          <div>
            <span className={styles.eyebrow}>Status</span>
            <h2 className={styles.title}>Sessões do WhatsApp</h2>
            <p className={styles.subtitle}>
              Gerencie ate {info.maxConnections} numeros, cada um com sua propria sessao e QR Code.
            </p>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.counterBadge}>
              {info.connectedCount}/{info.maxConnections} conectadas
            </span>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setAddOpen(true)}
              disabled={!canAddConnection}
            >
              <FiPlus size={16} />
              Adicionar Conexão
            </button>
          </div>
        </div>

        {!canAddConnection && (
          <div className={`${styles.remoteNotice} ${styles.noticeinfo}`}>
            <FiAlertTriangle size={16} className={styles.noticeIcon} />
            <span>Limite de {info.maxConnections} conexoes atingido. Desconecte uma sessao antes de adicionar outra.</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <FiAlertTriangle size={15} />
            {error}
          </div>
        )}

        {sortedConnections.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FiWifi size={22} />
            </div>
            <strong>Nenhuma conexao cadastrada ainda</strong>
            <p>Use o botao acima para criar uma conexão, gerar o QR Code e vincular o primeiro numero.</p>
          </div>
        ) : (
          <div className={styles.connectionList}>
            {sortedConnections.map((connection) => {
              const meta = getConnectionMeta(connection);
              const notice = getConnectionNotice(connection);
              const steps = buildProcessSteps(connection);
              const canDisconnect = ["connected", "connecting", "qr"].includes(connection.status);
              const canRequestQr = ["disconnected", "remote_disconnected"].includes(connection.status) && !connection.qr;

              return (
                <article key={connection.id} className={`${styles.connectionCard} ${styles[`connection${meta.tone}`]}`}>
                  <div className={styles.connectionTop}>
                    <div className={styles.connectionIdentity}>
                      <span className={`${styles.statusIcon} ${styles[`icon${meta.tone}`]}`}>
                        {getConnectionIcon(connection.status)}
                      </span>
                      <div>
                        <h3 className={styles.connectionName}>{connection.name}</h3>
                        <span className={styles.connectionNumber}>
                          {connection.connectedNumber ? formatPhone(connection.connectedNumber) : "Numero ainda nao vinculado"}
                        </span>
                      </div>
                    </div>

                    <span className={`${styles.miniBadge} ${styles[`miniBadge${meta.tone}`]}`}>
                      {meta.label}
                    </span>
                  </div>

                  <p className={styles.connectionDescription}>{meta.description}</p>

                  {notice && (
                    <div className={`${styles.connectionNotice} ${styles[`connectionNotice${notice.tone}`]}`}>
                      {notice.tone === "info" ? <FiRefreshCcw size={15} /> : <FiAlertTriangle size={15} />}
                      <span>{notice.text}</span>
                    </div>
                  )}

                  <div className={styles.connectionBody}>
                    <div className={styles.compactSteps}>
                      {steps.map((step) => (
                        <div key={step.id} className={`${styles.compactStep} ${styles[`compactStep${step.state}`]}`}>
                          <span>{step.marker}</span>
                          <strong>{step.label}</strong>
                        </div>
                      ))}
                    </div>

                    {connection.status === "qr" && connection.qr ? (
                      <div className={styles.connectionQr}>
                        <img src={connection.qr} alt={`QR Code da conexao ${connection.name}`} />
                        <p>Abra o WhatsApp, va em aparelhos conectados e escaneie este código.</p>
                      </div>
                    ) : (
                      <div className={styles.connectionFacts}>
                        <div>
                          <span>Modo</span>
                          <strong>{connection.connectionMode === "restore" ? "Reconexao" : "Pareamento"}</strong>
                        </div>
                        <div>
                          <span>Tempo conectado</span>
                          <strong>{formatConnectedDuration(connection.connectedForMs)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.connectionFooter}>
                    <span>Atualizacao automatica a cada {formatPollingIntervalLabel(pollingMs)}.</span>
                    <div className={styles.connectionActions}>
                      {canRequestQr && (
                        <button
                          type="button"
                          className={styles.generateButton}
                          onClick={() => handleRequestQr(connection)}
                          disabled={loadingAction}
                        >
                          <FiPlay size={15} />
                          Gerar QR Code
                        </button>
                      )}
                      {canDisconnect && (
                        <button
                          type="button"
                          className={styles.disconnectButton}
                          onClick={() => setConfirmConnection(connection)}
                          disabled={loadingAction}
                        >
                          <FiLogOut size={15} />
                          Desconectar
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => setDeleteConfirmConnection(connection)}
                        disabled={loadingAction}
                      >
                        <FiTrash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>

      {addOpen && (
        <div className={styles.overlay} role="presentation" onClick={() => setAddOpen(false)}>
          <form className={styles.modal} role="dialog" aria-modal="true" onSubmit={handleCreateConnection} onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>Adicionar Conexão</h3>
            <p className={styles.modalText}>
              Dê um nome para identificar este numero. Depois disso o sistema vai gerar o QR Code desta sessao.
            </p>

            <label className={styles.modalField}>
              <span>Nome da conexao</span>
              <input
                type="text"
                value={connectionName}
                onChange={(event) => setConnectionName(event.target.value)}
                placeholder="Ex: Comercial, Suporte, Vendas"
                autoFocus
              />
            </label>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setAddOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={loadingAction}>
                {loadingAction ? "Criando..." : "Gerar QR Code"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmConnection && (
        <div className={styles.overlay} role="presentation" onClick={() => setConfirmConnection(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>Desconectar {confirmConnection.name}?</h3>
            <p className={styles.modalText}>
              Esta sessao sera encerrada e um novo QR Code sera exigido para conectar este numero novamente.
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmConnection(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDisconnectConnection}
                disabled={loadingAction}
              >
                {loadingAction ? "Desconectando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmConnection && (
        <div className={styles.overlay} role="presentation" onClick={() => setDeleteConfirmConnection(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>Excluir {deleteConfirmConnection.name}?</h3>
            <p className={styles.modalText}>
              {deleteConfirmConnection.status === "connected"
                ? "Essa conexao esta conectada. Se voce excluir, a sessao vai parar e nao sera mais possivel enviar mensagens por esse numero ate cadastrar e conectar novamente."
                : "A conexao sera removida da lista e a pasta de sessao dela sera apagada."}
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleteConfirmConnection(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDeleteConnection}
                disabled={loadingAction}
              >
                {loadingAction ? "Excluindo..." : "Excluir conexao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
