const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { iniciarAgendamentos, pararAgendamentos } = require("../services/agenda");
const { inicializarContadorDiario, incrementarContador, getDiaAtual } = require("../services/contadorDiario");

/* ======================================================
   ESTADOS GLOBAIS
====================================================== */
let client = null;
let status = "checking"; // checking | qr | connected | disconnecting | remote_disconnected
let currentQR = "";
let connectedNumber = null;
let lastQRCodeTime = null;
let isShuttingDown = false;
let remoteLogoutTimeout = null;
let clientCreating = false;
let sessionReady = false;
let isDisconnecting = false;
let clientDestroying = false;
let recreatingAfterManualDisconnect = false;
let readyMessageBoundary = null;
let processedMessageIds = new Set();

/* ======================================================
   MÉTRICAS GLOBAIS (DASHBOARD)
====================================================== */
global.cpuUsage = 0;
global.reconnectCount = 0;
global.whatsappStartTime = null;
global.lastQRCodeTime = null;

/* ======================================================
   CPU MONITOR
====================================================== */
let cpuMonitorInterval = null;
let cpuCDPSession = null;

/* ======================================================
   CONSTANTES
====================================================== */
const CLIENT_ID = "session-bot";
const AUTH_DIR = path.join(process.cwd(), ".wwebjs_auth");
const CACHE_DIR = path.join(process.cwd(), ".wwebjs_cache");

/* ======================================================
   STATUS API
====================================================== */
function getQR(req, res) {
  res.json({
    status,
    qr: currentQR,
    connectedNumber,
    lastQRCodeTime,
  });
}

/* ======================================================
   MONITORAMENTO DE CPU
====================================================== */
async function iniciarMonitorCPU(clientInstance) {
  try {
    const timeout = Date.now() + 15000;

    while (!clientInstance?.pupPage) {
      if (Date.now() > timeout) return;
      await new Promise((r) => setTimeout(r, 300));
    }

    cpuCDPSession = await clientInstance.pupPage
      .target()
      .createCDPSession()
      .catch(() => null);

    if (!cpuCDPSession) return;

    await cpuCDPSession.send("Performance.enable");

    cpuMonitorInterval = setInterval(async () => {
      try {
        const perf = await cpuCDPSession.send("Performance.getMetrics");
        const map = {};
        for (const m of perf.metrics) map[m.name] = m.value;

        if (map.RecategorizedCPUUsage != null) {
          global.cpuUsage = Number(map.RecategorizedCPUUsage.toFixed(1));
        } else if (global.__lastPerfMetrics) {
          const last = global.__lastPerfMetrics;
          const total =
            (map.ScriptDuration || 0) -
            (last.ScriptDuration || 0) +
            (map.LayoutDuration || 0) -
            (last.LayoutDuration || 0) +
            (map.TaskDuration || 0) -
            (last.TaskDuration || 0);

          global.cpuUsage = Math.min(100, Number((total * 100).toFixed(1)));
        }

        global.__lastPerfMetrics = map;
      } catch {}
    }, 1000);
  } catch {}
}

function pararMonitorCPU() {
  if (cpuMonitorInterval) {
    clearInterval(cpuMonitorInterval);
    cpuMonitorInterval = null;
  }

  if (cpuCDPSession) {
    cpuCDPSession.detach().catch(() => {});
    cpuCDPSession = null;
    global.cpuUsage = 0;
    global.__lastPerfMetrics = null;
  }
}

/* ======================================================
   RESET COMPLETO DE SESSÃO
====================================================== */
async function resetarSessao() {
  try {
    pararAgendamentos?.();
    pararMonitorCPU();

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    if (client) {
      clientDestroying = true;
      try {
        await client.destroy();
      } catch {}
      client = null;
      global.client = null;
      clientDestroying = false;
    }

    setTimeout(() => {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      } catch (e) {
        console.warn("Erro ao remover auth/cache:", e.message);
      }
    }, 1000);
  } catch (e) {
    console.warn("Erro ao resetar sessão:", e?.message);
  }
}

/* ======================================================
   CREATE CLIENT
====================================================== */
function createClient() {
  if (client || clientCreating || clientDestroying) return;

  clientCreating = true;

  console.log("🚀 Inicializando WhatsApp Client");

  // 🔒 segurança extra
  const isManualFlow = recreatingAfterManualDisconnect;

  if (!isManualFlow) {
    status = "checking";
  }
  currentQR = "";
  connectedNumber = null;
  lastQRCodeTime = null;

  client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  /* ===================== QR ===================== */
  client.on("qr", async (qr) => {
    if (sessionReady) return;
    console.log("📸 Gerando QR Code");
    recreatingAfterManualDisconnect = false; // 🔓 libera fluxo
    currentQR = await QRCode.toDataURL(qr);
    lastQRCodeTime = Date.now();
    global.lastQRCodeTime = lastQRCodeTime;
    status = "qr";
    global.atualizar?.();
  });

  /* ===================== READY ===================== */
  client.on("ready", () => {
    if (sessionReady) return;
    sessionReady = true;

    console.log("✅ WhatsApp conectado");

    status = "connected";
    currentQR = "";
    lastQRCodeTime = null;

    connectedNumber = client.info?.wid?.user || client.info?.me?.user || null;

    global.client = client;

    readyMessageBoundary = Date.now();
    global.whatsappStartTime = readyMessageBoundary;
    processedMessageIds.clear();

    inicializarContadorDiario(connectedNumber);
    iniciarAgendamentos(client);
    iniciarMonitorCPU(client);

    global.atualizar?.();

    clientCreating = false;
  });

  /* ===================== MENSAGENS ===================== */
  client.on("message_create", (msg) => {
    try {
      if (status !== "connected") return;
      if (msg.fromMe) return;
      if (!msg.id?._serialized) return;
      if (!msg.timestamp) return;

      const msgId = msg.id._serialized;

      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);

      const msgMs = msg.timestamp * 1000;

      // ⛔ Mensagens criadas antes do ready NÃO contam
      if (!readyMessageBoundary || msgMs < readyMessageBoundary) return;

      // ⛔ Garante que é do dia atual
      const diaMsg = new Date(msgMs).toLocaleDateString("en-CA");
      const hoje = getDiaAtual();
      if (diaMsg !== hoje) return;

      incrementarContador(connectedNumber);
    } catch (e) {
      console.warn("Erro contador diário:", e?.message);
    }
  });

  /* ===================== RECONEXÕES ===================== */
  client.on("change_state", (state) => {
    if (state === "CONNECTING") {
      global.reconnectCount++;
    }
  });

  /* ===================== DISCONNECTED (LOGOUT REMOTO) ===================== */
  client.on("disconnected", async (reason) => {
    recreatingAfterManualDisconnect = false;

    if (isDisconnecting) return;
    isDisconnecting = true;
    clientCreating = false;
    sessionReady = false;
    readyMessageBoundary = null;

    console.warn("⚠️ WhatsApp desconectado:", reason);

    status = "remote_disconnected";
    connectedNumber = null;
    currentQR = "";

    pararAgendamentos?.();
    pararMonitorCPU();

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    global.atualizar?.();

    if (remoteLogoutTimeout) clearTimeout(remoteLogoutTimeout);

    if (client) {
      clientDestroying = true;
      try {
        await client.destroy();
      } catch {}
      client = null;
      global.client = null;
      clientDestroying = false;
    }

    remoteLogoutTimeout = setTimeout(async () => {
      console.log("🔄 Recriando client após logout remoto");
      await new Promise((r) => setTimeout(r, 0));
      createClient();
      isDisconnecting = false;
    }, 3000);
  });

  /* ===================== AUTH FAILURE ===================== */
  client.on("auth_failure", async (msg) => {
    sessionReady = false;
    console.error("❌ Falha de autenticação:", msg);
    status = "remote_disconnected";
    await resetarSessao();
    clientCreating = false;
    createClient();
  });

  client.initialize();
}

/* ======================================================
   DISCONNECT MANUAL
====================================================== */
async function disconnect(req, res) {
  if (isDisconnecting || clientDestroying) {
    return res.json({ status: "disconnecting" });
  }

  isDisconnecting = true;
  clientDestroying = true;
  sessionReady = false;

  try {
    console.log("🧨 Desconectando manualmente");

    status = "disconnecting";
    global.atualizar?.();

    pararAgendamentos?.();
    pararMonitorCPU();

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    if (client) {
      try {
        await client.destroy();
      } catch {}
      client = null;
      global.client = null;
    }

    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });

    clientCreating = false;
    clientDestroying = false;
    isDisconnecting = false;

    // 🔑 MARCA FLUXO MANUAL
    recreatingAfterManualDisconnect = true;

    sessionReady = false;
    readyMessageBoundary = null;
    connectedNumber = null;

    createClient();

    return res.json({ status: "disconnecting" });
  } catch (err) {
    console.error("Erro ao desconectar:", err);
    clientDestroying = false;
    isDisconnecting = false;
    return res.status(500).json({ error: "Erro ao desconectar" });
  }
}

/* ======================================================
   GRACEFUL SHUTDOWN
====================================================== */
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`🛑 Recebido ${signal}. Encerrando com segurança`);

  try {
    pararAgendamentos?.();
    pararMonitorCPU();

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    if (client) {
      await client.destroy();
      client = null;
    }

    console.log("✅ WhatsApp Client encerrado corretamente");
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

/* ======================================================
   EXPORTS
====================================================== */
module.exports = { getQR, createClient, disconnect };