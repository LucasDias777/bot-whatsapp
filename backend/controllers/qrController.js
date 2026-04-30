const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const db = require("../database/database");
const { iniciarAgendamentos, pararAgendamentos } = require("../services/agenda");
const { inicializarContadorDiario, incrementarContador, getDiaAtual } = require("../services/contadorDiario");

const MAX_CONNECTIONS = 5;
const LEGACY_CONNECTION_ID = "session-bot";
const BACKEND_ROOT = path.resolve(__dirname, "..");
const AUTH_DIR = path.join(BACKEND_ROOT, ".wwebjs_auth");
const CACHE_DIR = path.join(BACKEND_ROOT, ".wwebjs_cache");

const connections = new Map();
let initialized = false;
let initializingPromise = null;
let isShuttingDown = false;
let activeAgendaConnectionId = null;

global.client = global.client || null;
global.connectionClients = global.connectionClients || new Map();
global.connectedConnections = [];
global.currentConnectionId = null;
global.cpuUsage = 0;
global.reconnectCount = global.reconnectCount || 0;
global.whatsappStartTime = null;
global.lastQRCodeTime = null;
global.isDisconnecting = false;

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirSafe(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Erro ao remover ${dirPath}:`, error?.message || error);
  }
}

function sessionDir(connectionId) {
  return path.join(AUTH_DIR, `session-${connectionId}`);
}

function cacheDir(connectionId) {
  return path.join(CACHE_DIR, connectionId);
}

function hasPersistedSession(connectionId) {
  try {
    const dir = sessionDir(connectionId);
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function normalizeDisconnectReason(reason) {
  const value = String(reason || "").toLowerCase();

  if (!value) return null;
  if (value.includes("target closed")) return "target_closed";
  if (value.includes("logout")) return "logout";
  if (value.includes("auth")) return "auth_failure";
  if (value.includes("navigation")) return "navigation";

  return value;
}

function getErrorMessage(error) {
  return String(error?.message || error?.originalMessage || error || "");
}

function isPuppeteerTargetClosedError(error) {
  const details = `${getErrorMessage(error)}\n${String(error?.stack || "")}`.toLowerCase();

  return (
    details.includes("target closed") ||
    details.includes("session closed") ||
    details.includes("connection closed") ||
    details.includes("browser has disconnected") ||
    details.includes("protocol error (runtime.callfunctionon)")
  );
}

function isLocalAuthFileBusyError(error) {
  const details = `${getErrorMessage(error)}\n${String(error?.stack || "")}`.toLowerCase();

  return (
    details.includes("ebusy") &&
    details.includes("resource busy or locked") &&
    details.includes("localauth") &&
    details.includes("logout")
  );
}

function isRecoverableRemoteSessionError(error) {
  return isPuppeteerTargetClosedError(error) || isLocalAuthFileBusyError(error);
}

function createEventLogState() {
  return {
    qrLogged: false,
    authenticatedHandled: false,
    readyLogged: false,
    remoteDisconnectLogged: false,
    manualDisconnectLogged: false,
    remoteRecreateLogged: false,
    targetClosedRecoveryLogged: false,
  };
}

function createConnectionState(record) {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.created_at || null,
    client: null,
    status: "checking",
    currentQR: "",
    connectedNumber: record.connected_number || null,
    lastQRCodeTime: null,
    awaitingRemoteReauth: false,
    lastDisconnectReason: null,
    sessionReady: false,
    isCreating: false,
    isDisconnecting: false,
    isDestroying: false,
    servicesBootstrapped: false,
    readyMessageBoundary: null,
    connectingStateSince: null,
    connectionMode: hasPersistedSession(record.id) ? "restore" : "pairing",
    reconnectCount: 0,
    recreateTimeout: null,
    runtimeSyncInterval: null,
    remoteRecoveryInProgress: false,
    processedMessageIds: new Set(),
    logs: createEventLogState(),
  };
}

function getRuntimeConnectedNumber(state) {
  return state.client?.info?.wid?.user || state.client?.info?.me?.user || null;
}

function clearRemoteReauthState(state) {
  state.awaitingRemoteReauth = false;
  state.lastDisconnectReason = null;
}

function hasConnectedSessionContext(state) {
  return Boolean(state.sessionReady || state.connectedNumber || state.readyMessageBoundary || state.status === "connected");
}

function resetRuntimeState(state) {
  state.sessionReady = false;
  state.readyMessageBoundary = null;
  state.connectedNumber = null;
  state.currentQR = "";
  state.lastQRCodeTime = null;
  state.connectingStateSince = null;
  state.connectionMode = "pairing";
  state.servicesBootstrapped = false;
  state.processedMessageIds.clear();

  if (state.runtimeSyncInterval) {
    clearInterval(state.runtimeSyncInterval);
    state.runtimeSyncInterval = null;
  }
}

function markSessionAsDisconnected(state, reason, nextStatus = "remote_disconnected") {
  state.awaitingRemoteReauth = true;
  state.lastDisconnectReason = normalizeDisconnectReason(reason);
  state.sessionReady = false;
  state.readyMessageBoundary = null;
  state.connectedNumber = null;
  state.currentQR = "";
  state.lastQRCodeTime = null;
  state.servicesBootstrapped = false;
  state.processedMessageIds.clear();
  state.status = nextStatus;
  state.logs.authenticatedHandled = false;
  state.logs.readyLogged = false;
  state.logs.qrLogged = false;

  if (global.currentConnectionId === state.id) {
    updateDefaultClient();
  }
}

function markSessionWaitingForQrRequest(state, reason, nextStatus = "disconnected") {
  markSessionAsDisconnected(state, reason, nextStatus);
  state.currentQR = "";
  state.lastQRCodeTime = null;
  state.connectionMode = "pairing";
  state.isCreating = false;
  state.isDisconnecting = false;
  state.isDestroying = false;
  updateConnectionRecord(state);
}

function getSuggestedPollingInterval() {
  const states = [...connections.values()];
  if (states.some((state) => ["checking", "connecting", "disconnecting", "remote_disconnected"].includes(state.status))) {
    return 1000;
  }
  if (states.some((state) => state.status === "qr")) {
    return 1500;
  }
  return 5000;
}

function canLeaveConnectingState(state) {
  if (!state.connectingStateSince) return true;
  return Date.now() - state.connectingStateSince >= 900;
}

function promoteRuntimeSessionToConnected(state, runtimeNumber) {
  if (!runtimeNumber || state.currentQR || state.isDestroying || state.isDisconnecting) return false;
  if (!["checking", "connecting"].includes(state.status)) return false;
  if (!canLeaveConnectingState(state)) return false;

  state.connectedNumber = runtimeNumber;
  state.sessionReady = true;
  clearRemoteReauthState(state);
  state.status = "connected";
  state.connectingStateSince = null;
  state.currentQR = "";
  state.lastQRCodeTime = null;
  bootstrapConnectedServices(state);
  return true;
}

function syncStatusFromRuntime(state) {
  const runtimeNumber = getRuntimeConnectedNumber(state);

  if (runtimeNumber && state.sessionReady) {
    state.connectedNumber = runtimeNumber;
    global.connectionClients.set(state.id, state.client);
  }

  if (promoteRuntimeSessionToConnected(state, runtimeNumber)) {
    return;
  }

  if (state.sessionReady && !state.isDestroying && !state.isDisconnecting) {
    clearRemoteReauthState(state);
    state.status = "connected";
    state.currentQR = "";
    state.lastQRCodeTime = null;
    bootstrapConnectedServices(state);
    return;
  }

  if (state.status === "connected" && !runtimeNumber && !state.sessionReady) {
    state.status = "checking";
  }
}

function startRuntimeSyncWatch(state) {
  if (state.runtimeSyncInterval) return;

  state.runtimeSyncInterval = setInterval(() => {
    if (!state.client || state.isDestroying || state.isDisconnecting) return;
    syncStatusFromRuntime(state);
    updateDefaultClient();
  }, 2000);
}

async function updateConnectionRecord(state) {
  try {
    await dbRun(
      "UPDATE whatsapp_connections SET name = ?, connected_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [state.name, state.connectedNumber || null, state.id],
    );
  } catch (error) {
    console.warn("Erro ao atualizar conexao no banco:", error?.message || error);
  }
}

function getConnectedStates() {
  return [...connections.values()].filter((state) => state.status === "connected" && state.sessionReady && state.client);
}

function updateDefaultClient() {
  const connectedStates = getConnectedStates().sort((a, b) => {
    const left = a.readyMessageBoundary || Number.MAX_SAFE_INTEGER;
    const right = b.readyMessageBoundary || Number.MAX_SAFE_INTEGER;
    return left - right;
  });
  const selected = connectedStates[0] || null;

  global.connectedConnections = connectedStates.map((state) => ({
    id: state.id,
    name: state.name,
    connectedNumber: state.connectedNumber,
    status: state.status,
  }));

  if (!selected) {
    global.client = null;
    global.currentConnectionId = null;
    global.whatsappStartTime = null;
    pararAgendamentos?.();
    activeAgendaConnectionId = null;
    return;
  }

  global.client = selected.client;
  global.currentConnectionId = selected.id;
  global.whatsappStartTime = selected.readyMessageBoundary;

  if (activeAgendaConnectionId !== selected.id) {
    pararAgendamentos?.();
    iniciarAgendamentos(selected.client);
    activeAgendaConnectionId = selected.id;
  }
}

function bootstrapConnectedServices(state) {
  if (!state.client || !state.connectedNumber || state.servicesBootstrapped) return;

  if (!state.readyMessageBoundary) {
    state.readyMessageBoundary = Date.now();
  }

  global.connectionClients.set(state.id, state.client);
  inicializarContadorDiario(state.connectedNumber);
  state.servicesBootstrapped = true;
  state.isCreating = false;
  updateConnectionRecord(state);
  updateDefaultClient();
}

async function destroyClientSafely(state) {
  if (!state.client) return;

  state.isDestroying = true;
  const activeClient = state.client;

  try {
    await Promise.race([
      activeClient.destroy(),
      sleep(12000).then(() => {
        throw new Error("Timeout ao encerrar o cliente WhatsApp");
      }),
    ]);
  } catch (error) {
    console.warn(`[${state.name}] Erro ao destruir cliente:`, error?.message || error);
  } finally {
    if (state.client === activeClient) {
      state.client = null;
      global.connectionClients.delete(state.id);
    }

    state.isDestroying = false;
    updateDefaultClient();
  }
}

function scheduleClientAfterRemoteDisconnect(state, delayMs = 1200) {
  if (state.recreateTimeout) return;

  state.recreateTimeout = setTimeout(() => {
    state.recreateTimeout = null;

    void (async () => {
      try {
        if (state.client || state.isCreating || state.isDestroying) {
          state.remoteRecoveryInProgress = false;
          return;
        }

        if (!state.logs.remoteRecreateLogged) {
          console.log(`[${state.name}] Recriando client apos logout remoto`);
          state.logs.remoteRecreateLogged = true;
        }

        state.status = "checking";
        state.isDisconnecting = false;
        global.isDisconnecting = false;
        await sleep(0);
        startClient(state);
        state.remoteRecoveryInProgress = false;
      } catch (error) {
        console.warn(`[${state.name}] Erro ao recriar client apos logout remoto:`, getErrorMessage(error));
        state.isDisconnecting = false;
        state.isCreating = false;
        state.isDestroying = false;
        state.remoteRecoveryInProgress = false;
        global.isDisconnecting = false;
      }
    })();
  }, delayMs);
}

function getSnapshot(state) {
  syncStatusFromRuntime(state);

  return {
    id: state.id,
    name: state.name,
    status: state.status,
    qr: state.currentQR,
    connectedNumber: state.connectedNumber,
    lastQRCodeTime: state.lastQRCodeTime,
    disconnectReason: state.lastDisconnectReason,
    awaitingReauth: state.awaitingRemoteReauth,
    connectionMode: state.connectionMode,
    reconnectCount: state.reconnectCount,
    createdAt: state.createdAt,
    connectedForMs: state.readyMessageBoundary && state.status === "connected" ? Date.now() - state.readyMessageBoundary : 0,
    hasPersistedSession: hasPersistedSession(state.id),
  };
}

function getConnectionsSnapshot() {
  const snapshots = [...connections.values()].map(getSnapshot);
  const connectedCount = snapshots.filter((item) => item.status === "connected").length;

  return {
    connections: snapshots,
    maxConnections: MAX_CONNECTIONS,
    connectedCount,
    pollingIntervalMs: getSuggestedPollingInterval(),
  };
}

function isTransientInitializationError(error) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("execution context was destroyed") ||
    message.includes("cannot find context with specified id") ||
    message.includes("most likely because of a navigation") ||
    message.includes("protocol error (runtime.callfunctionon)") ||
    message.includes("target closed")
  );
}

function startClient(state) {
  if (!state || state.client || state.isCreating || state.isDestroying) return;

  state.isCreating = true;
  state.logs = createEventLogState();
  state.connectionMode = hasPersistedSession(state.id) && !state.awaitingRemoteReauth ? "restore" : "pairing";
  state.status = state.connectionMode === "restore" ? "connecting" : "checking";
  state.connectingStateSince = state.connectionMode === "restore" ? Date.now() : null;
  state.currentQR = "";
  state.lastQRCodeTime = null;
  state.connectedNumber = null;
  state.sessionReady = false;
  state.servicesBootstrapped = false;

  ensureDir(AUTH_DIR);
  ensureDir(cacheDir(state.id));
  startRuntimeSyncWatch(state);

  console.log(`[${state.name}] Inicializando WhatsApp Client`);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: state.id, dataPath: AUTH_DIR }),
    webVersionCache: {
      type: "local",
      path: cacheDir(state.id),
    },
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  state.client = client;

  client.on("qr", async (qr) => {
    const wasConnected = hasConnectedSessionContext(state) && !state.awaitingRemoteReauth;

    if (wasConnected) {
      if (!state.logs.remoteDisconnectLogged) {
        console.warn(`[${state.name}] Sessao desconectada remotamente. Aguardando solicitacao de novo QR Code.`);
        state.logs.remoteDisconnectLogged = true;
      }

      markSessionWaitingForQrRequest(state, "remote_logout", "remote_disconnected");
      state.isDisconnecting = true;
      await destroyClientSafely(state);
      state.isDisconnecting = false;
      removeDirSafe(cacheDir(state.id));
      return;
    }

    state.logs.authenticatedHandled = false;

    if (!state.logs.qrLogged) {
      console.log(`[${state.name}] Gerando QR Code`);
      state.logs.qrLogged = true;
    }

    state.connectionMode = "pairing";
    state.currentQR = await QRCode.toDataURL(qr);
    state.lastQRCodeTime = Date.now();
    global.lastQRCodeTime = state.lastQRCodeTime;
    state.status = "qr";
  });

  client.on("authenticated", () => {
    if (state.logs.authenticatedHandled) return;

    state.logs.authenticatedHandled = true;
    console.log(`[${state.name}] Sinal de autenticacao recebido. Aguardando sessao ficar pronta.`);

    state.status = "connecting";
    state.connectingStateSince = Date.now();
    state.currentQR = "";
    state.lastQRCodeTime = null;
  });

  client.on("ready", async () => {
    if (state.sessionReady) return;

    state.sessionReady = true;
    clearRemoteReauthState(state);

    state.status = "connecting";
    if (!state.connectingStateSince) {
      state.connectingStateSince = Date.now();
    }
    state.currentQR = "";
    state.lastQRCodeTime = null;

    const elapsedConnectingMs = Date.now() - state.connectingStateSince;
    if (elapsedConnectingMs < 900) {
      await sleep(900 - elapsedConnectingMs);
    }

    if (!state.logs.readyLogged) {
      console.log(`[${state.name}] WhatsApp conectado`);
      state.logs.readyLogged = true;
    }

    state.status = "connected";
    state.connectingStateSince = null;
    state.connectedNumber = getRuntimeConnectedNumber(state);
    state.processedMessageIds.clear();
    state.readyMessageBoundary = Date.now();
    bootstrapConnectedServices(state);
  });

  client.on("message_create", (msg) => {
    try {
      if (state.status !== "connected") return;
      if (msg.fromMe) return;
      if (!msg.id?._serialized) return;
      if (!msg.timestamp) return;

      const msgId = msg.id._serialized;
      if (state.processedMessageIds.has(msgId)) return;

      state.processedMessageIds.add(msgId);

      const msgMs = msg.timestamp * 1000;
      if (!state.readyMessageBoundary || msgMs < state.readyMessageBoundary) return;

      const diaMsg = new Date(msgMs).toLocaleDateString("en-CA");
      const hoje = getDiaAtual();
      if (diaMsg !== hoje) return;

      incrementarContador(state.connectedNumber);
    } catch (error) {
      console.warn(`[${state.name}] Erro contador diario:`, error?.message || error);
    }
  });

  client.on("change_state", (clientState) => {
    if (clientState === "CONNECTING") {
      state.reconnectCount += 1;
      global.reconnectCount += 1;
    }
  });

  client.on("disconnected", async (reason) => {
    if (state.isDisconnecting) return;

    state.isDisconnecting = true;
    state.isCreating = false;
    global.isDisconnecting = true;

    if (!state.logs.remoteDisconnectLogged) {
      console.warn(`[${state.name}] WhatsApp desconectado:`, reason);
      state.logs.remoteDisconnectLogged = true;
    }

    markSessionWaitingForQrRequest(state, reason, "remote_disconnected");

    if (state.recreateTimeout) {
      clearTimeout(state.recreateTimeout);
      state.recreateTimeout = null;
    }

    await destroyClientSafely(state);
    removeDirSafe(cacheDir(state.id));
    state.isDisconnecting = false;
    global.isDisconnecting = false;
  });

  client.on("auth_failure", async (msg) => {
    state.sessionReady = false;
    state.isCreating = false;
    console.error(`[${state.name}] Falha de autenticacao:`, msg);

    state.awaitingRemoteReauth = true;
    state.lastDisconnectReason = "auth_failure";
    state.status = "remote_disconnected";
    await destroyClientSafely(state);
    removeDirSafe(sessionDir(state.id));
    removeDirSafe(cacheDir(state.id));
    markSessionWaitingForQrRequest(state, "auth_failure", "remote_disconnected");
  });

  client.initialize().catch(async (error) => {
    const transientError = isTransientInitializationError(error);

    console.error(`[${state.name}] Erro ao inicializar cliente WhatsApp:`, getErrorMessage(error));
    state.isCreating = false;
    state.sessionReady = false;

    await destroyClientSafely(state);

    if (transientError || hasPersistedSession(state.id)) {
      state.status = "checking";
      removeDirSafe(cacheDir(state.id));
      ensureDir(cacheDir(state.id));
      await sleep(2000);
      startClient(state);
      return;
    }

    markSessionWaitingForQrRequest(state, "initialization_failure", "remote_disconnected");
  });
}

async function disconnectConnection(state) {
  if (!state || state.isDisconnecting || state.isDestroying) return;

  state.isDisconnecting = true;
  state.isDestroying = true;
  state.status = "disconnecting";
  state.sessionReady = false;
  clearRemoteReauthState(state);

  if (!state.logs.manualDisconnectLogged) {
    console.log(`[${state.name}] Desconectando manualmente`);
    state.logs.manualDisconnectLogged = true;
  }

  if (state.recreateTimeout) {
    clearTimeout(state.recreateTimeout);
    state.recreateTimeout = null;
  }

  resetRuntimeState(state);
  await destroyClientSafely(state);

  removeDirSafe(sessionDir(state.id));
  removeDirSafe(cacheDir(state.id));

  state.isCreating = false;
  state.isDestroying = false;
  state.isDisconnecting = false;
  state.awaitingRemoteReauth = true;
  state.lastDisconnectReason = "manual_disconnect";
  state.connectionMode = "pairing";
  state.status = "disconnected";
  state.logs = createEventLogState();

  updateDefaultClient();
  updateConnectionRecord(state);
}

async function ensureConnectionsTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      connected_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedLegacyConnectionIfNeeded() {
  const row = await dbGet("SELECT COUNT(*) AS total FROM whatsapp_connections");
  if (Number(row?.total || 0) > 0) return;
  if (!hasPersistedSession(LEGACY_CONNECTION_ID)) return;

  await dbRun(
    "INSERT INTO whatsapp_connections (id, name) VALUES (?, ?)",
    [LEGACY_CONNECTION_ID, "Conexao principal"],
  );
}

async function loadConnectionsFromDatabase() {
  await ensureConnectionsTable();
  await seedLegacyConnectionIfNeeded();

  const rows = await dbAll("SELECT * FROM whatsapp_connections ORDER BY created_at ASC");
  connections.clear();

  for (const row of rows.slice(0, MAX_CONNECTIONS)) {
    connections.set(row.id, createConnectionState(row));
  }
}

async function initializeConnections() {
  if (initialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    ensureDir(AUTH_DIR);
    ensureDir(CACHE_DIR);
    await loadConnectionsFromDatabase();

    for (const state of connections.values()) {
      if (hasPersistedSession(state.id)) {
        startClient(state);
      } else {
        state.status = "disconnected";
        state.connectionMode = "pairing";
      }
    }

    initialized = true;
  })();

  return initializingPromise;
}

async function getQR(req, res) {
  await initializeConnections();

  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });

  res.json(getConnectionsSnapshot());
}

function createConnectionId() {
  if (!connections.has(LEGACY_CONNECTION_ID) && !fs.existsSync(sessionDir(LEGACY_CONNECTION_ID))) {
    return LEGACY_CONNECTION_ID;
  }

  return `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function addConnection(req, res) {
  await initializeConnections();

  if (connections.size >= MAX_CONNECTIONS) {
    return res.status(400).json({
      ok: false,
      error: "connection_limit",
      message: `Limite de ${MAX_CONNECTIONS} conexoes atingido.`,
    });
  }

  const name = String(req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ ok: false, error: "name_required", message: "Informe um nome para a conexao." });
  }

  const id = createConnectionId();
  await dbRun("INSERT INTO whatsapp_connections (id, name) VALUES (?, ?)", [id, name]);

  const row = await dbGet("SELECT * FROM whatsapp_connections WHERE id = ?", [id]);
  const state = createConnectionState(row);
  connections.set(id, state);
  startClient(state);

  return res.status(201).json({ ok: true, connection: getSnapshot(state), ...getConnectionsSnapshot() });
}

async function startConnection(req, res) {
  await initializeConnections();

  const id = req.params.id || req.body?.id || req.query?.id;
  const state = connections.get(id);

  if (!state) {
    return res.status(404).json({ ok: false, error: "connection_not_found" });
  }

  if (state.status === "connected" || state.status === "connecting" || state.status === "qr" || state.isCreating) {
    return res.json({ ok: true, connection: getSnapshot(state), ...getConnectionsSnapshot() });
  }

  if (state.recreateTimeout) {
    clearTimeout(state.recreateTimeout);
    state.recreateTimeout = null;
  }

  removeDirSafe(sessionDir(state.id));
  removeDirSafe(cacheDir(state.id));

  state.awaitingRemoteReauth = true;
  state.lastDisconnectReason = state.lastDisconnectReason || "qr_requested";
  state.connectionMode = "pairing";
  state.status = "checking";
  state.logs = createEventLogState();
  startClient(state);

  return res.json({ ok: true, connection: getSnapshot(state), ...getConnectionsSnapshot() });
}

async function deleteConnection(req, res) {
  await initializeConnections();

  const id = req.params.id || req.body?.id || req.query?.id;
  const state = connections.get(id);

  if (!state) {
    return res.status(404).json({ ok: false, error: "connection_not_found" });
  }

  try {
    if (state.recreateTimeout) {
      clearTimeout(state.recreateTimeout);
      state.recreateTimeout = null;
    }

    state.isDisconnecting = true;
    state.status = "disconnecting";
    resetRuntimeState(state);
    await destroyClientSafely(state);
    removeDirSafe(sessionDir(state.id));
    removeDirSafe(cacheDir(state.id));
    await dbRun("DELETE FROM whatsapp_connections WHERE id = ?", [state.id]);
    connections.delete(state.id);
    updateDefaultClient();

    return res.json({ ok: true, ...getConnectionsSnapshot() });
  } catch (error) {
    console.error(`[${state.name}] Erro ao excluir conexao:`, error);
    state.isDisconnecting = false;
    state.isDestroying = false;
    return res.status(500).json({ ok: false, error: "Erro ao excluir conexao" });
  }
}

async function disconnect(req, res) {
  await initializeConnections();

  const id = req.params.id || req.body?.id || req.query?.id || [...connections.keys()][0];
  const state = connections.get(id);

  if (!state) {
    return res.status(404).json({ ok: false, error: "connection_not_found" });
  }

  try {
    await disconnectConnection(state);
    return res.json({ ok: true, connection: getSnapshot(state), ...getConnectionsSnapshot() });
  } catch (error) {
    console.error(`[${state.name}] Erro ao desconectar:`, error);
    state.isDisconnecting = false;
    state.isDestroying = false;
    return res.status(500).json({ ok: false, error: "Erro ao desconectar" });
  }
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Recebido ${signal}. Encerrando conexoes com seguranca`);

  try {
    pararAgendamentos?.();

    for (const state of connections.values()) {
      if (state.recreateTimeout) {
        clearTimeout(state.recreateTimeout);
        state.recreateTimeout = null;
      }

      resetRuntimeState(state);
      await destroyClientSafely(state);
    }

    console.log("WhatsApp Clients encerrados corretamente");
  } finally {
    process.exit(0);
  }
}

function recoverFromRemoteSessionError(source, reason) {
  if (isShuttingDown) return true;
  if (!isRecoverableRemoteSessionError(reason)) return false;

  console.warn(`${source}: erro transitorio do WhatsApp Web durante troca de sessao. Backend mantido ativo.`);
  return true;
}

process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.once("SIGHUP", () => void gracefulShutdown("SIGHUP"));
process.on("uncaughtException", (error) => {
  if (recoverFromRemoteSessionError("uncaughtException", error)) return;

  console.error("uncaughtException:", error);
  void gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  if (recoverFromRemoteSessionError("unhandledRejection", reason)) return;

  console.error("unhandledRejection:", reason);
  void gracefulShutdown("unhandledRejection");
});

module.exports = {
  getQR,
  createClient: initializeConnections,
  addConnection,
  startConnection,
  deleteConnection,
  disconnect,
  getConnectionsSnapshot,
};
