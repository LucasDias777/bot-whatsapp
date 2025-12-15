const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { iniciarAgendamentos, pararAgendamentos } = require("../services/agenda");
const { inicializarContadorDiario, incrementarContador } = require("../services/contadorDiario");

/* ======================================================
   ESTADO GLOBAL ÚNICO (CONEXÃO INTACTA)
====================================================== */
let client = null;
let status = "checking"; // checking | qr | connected | disconnecting
let currentQR = "";
let connectedNumber = null;
let lastQRCodeTime = null;
let isShuttingDown = false;

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
            (map.ScriptDuration || 0) - (last.ScriptDuration || 0) +
            (map.LayoutDuration || 0) - (last.LayoutDuration || 0) +
            (map.TaskDuration || 0) - (last.TaskDuration || 0);

          global.cpuUsage = Math.min(100, Number((total * 100).toFixed(1)));
        }

        global.__lastPerfMetrics = map;
      } catch {
        /* silencioso */
      }
    }, 1000);
  } catch {
    /* silencioso */
  }
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
   CREATE CLIENT (CONEXÃO INTACTA)
====================================================== */
function createClient() {
  if (client) return;

  console.log("🚀 Inicializando WhatsApp Client...");

  status = "checking";
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
    currentQR = await QRCode.toDataURL(qr);
    lastQRCodeTime = Date.now();
    global.lastQRCodeTime = lastQRCodeTime;
    status = "qr";
    global.atualizar?.();
  });

  /* ===================== READY ===================== */
  client.on("ready", () => {
    console.log("✅ WhatsApp conectado");

    status = "connected";
    currentQR = "";
    lastQRCodeTime = null;

    connectedNumber =
      client.info?.wid?.user ||
      client.info?.me?.user ||
      null;

    global.client = client;
    global.whatsappStartTime = Date.now();

    inicializarContadorDiario();
    iniciarAgendamentos(client);
    iniciarMonitorCPU(client);

    global.atualizar?.();
  });

  /* ===================== MENSAGENS ===================== */
  client.on("message", (msg) => {
    try {
      if (msg.fromMe) return;

      if (global.whatsappStartTime && msg.timestamp) {
        const msgMs = msg.timestamp * 1000;
        const tolerance = 60 * 1000;
        if (msgMs < global.whatsappStartTime - tolerance) return;
      }

      incrementarContador();
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

  /* ===================== DISCONNECTED ===================== */
  client.on("disconnected", (reason) => {
    console.warn("⚠️ WhatsApp desconectado:", reason);

    status = "checking";
    connectedNumber = null;
    currentQR = "";

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    global.atualizar?.();
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Falha de autenticação:", msg);
    status = "checking";
  });

  client.initialize();
}

/* ======================================================
   DISCONNECT MANUAL
====================================================== */
async function disconnect(req, res) {
  try {
    console.log("🧨 Desconectando manualmente...");

    status = "disconnecting";
    global.atualizar?.();

    pararAgendamentos?.();
    pararMonitorCPU();

    global.whatsappStartTime = null;
    global.cpuUsage = 0;

    if (client) {
      await client.destroy();
      client = null;
      global.client = null;
    }

    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });

    createClient();

    return res.json({ status: "qr" });
  } catch (err) {
    console.error("Erro ao desconectar:", err);
    return res.status(500).json({ error: "Erro ao desconectar" });
  }
}

/* ======================================================
   GRACEFUL SHUTDOWN
====================================================== */
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`🛑 Recebido ${signal}. Encerrando com segurança...`);

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