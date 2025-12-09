const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { iniciarAgendamentos } = require("../services/agenda");
const { inicializarContadorDiario, incrementarContador } = require("../services/contadorDiario");

// Estado interno
let clientInstance = null;
let isDestroying = false;
let currentQR = "";
let status = "idle"; // 'idle' | 'waiting' | 'qr' | 'connected' | 'disconnecting'
let connectedNumber = null;
let lastQRCodeTime = null;

let cpuMonitorInterval = null;
let cpuCDPSession = null;

// LocalAuth paths (padrões)
const CLIENT_ID = "session-bot";
const AUTH_DIR = path.join(process.cwd(), ".wwebjs_auth");
const SESSION_DIR = path.join(AUTH_DIR, `LocalAuth_${CLIENT_ID}`);
const CACHE_DIR = path.join(process.cwd(), ".wwebjs_cache");

// Helpers para retornar estado ao frontend
function getQR(req, res) {
  res.json({
    status,
    qr: currentQR,
    connectedNumber,
    lastQRCodeTime,
  });
}

// Monitor CPU via CDP — tentará aguardar pupPage e então abrir sessão CDP.
// Mantém global.cpuUsage e global.__lastPerfMetrics como antes.
async function iniciarMonitorCPU(client) {
  try {
    const waitUntil = Date.now() + 15_000;
    while (!client?.pupPage) {
      if (Date.now() > waitUntil) {
        console.warn("iniciarMonitorCPU: pupPage não disponível (timeout).");
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // limpar intervalo anterior
    if (cpuMonitorInterval) {
      clearInterval(cpuMonitorInterval);
      cpuMonitorInterval = null;
    }

    try {
      cpuCDPSession = await client.pupPage.target().createCDPSession();
      await cpuCDPSession.send("Performance.enable");
    } catch (e) {
      console.warn(
        "iniciarMonitorCPU: não foi possível criar CDP session:",
        e?.message || e,
      );
      cpuCDPSession = null;
      return;
    }

    console.log("🖥️ Iniciando monitoramento de CPU (CDP)");
    cpuMonitorInterval = setInterval(async () => {
      try {
        if (!cpuCDPSession) return;
        const perf = await cpuCDPSession.send("Performance.getMetrics");
        const map = {};
        for (const m of perf.metrics) map[m.name] = m.value;

        if (map.RecategorizedCPUUsage != null) {
          global.cpuUsage = Number(map.RecategorizedCPUUsage.toFixed(1));
        } else if (global.__lastPerfMetrics) {
          const last = global.__lastPerfMetrics;
          const scriptDiff =
            (map.ScriptDuration || 0) - (last.ScriptDuration || 0);
          const layoutDiff =
            (map.LayoutDuration || 0) - (last.LayoutDuration || 0);
          const taskDiff = (map.TaskDuration || 0) - (last.TaskDuration || 0);
          const total = scriptDiff + layoutDiff + taskDiff;
          const percent = Math.min(100, Number((total * 100).toFixed(1)));
          global.cpuUsage = percent;
        }
        global.__lastPerfMetrics = map;
      } catch (e) {
        // debug apenas — não deixar morrer
        //console.debug("Erro ao obter métricas CDP (monitor):", e?.message || e);
      }
    }, 1000);
  } catch (e) {
    console.error("Erro ao iniciar monitor CPU:", e?.message || e);
  }
}

// Cria o cliente e configura handlers
async function createClient() {
  if (clientInstance) return clientInstance;

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // QR gerado
  client.on("qr", async (qr) => {
    try {
      currentQR = await QRCode.toDataURL(qr);
      status = "qr";
      lastQRCodeTime = Date.now();
      global.lastQRCodeTime = lastQRCodeTime;
      console.log("📱 QR gerado — enviar ao frontend");
      try {
        global.atualizar?.();
      } catch (e) {}
    } catch (e) {
      console.error("Erro ao gerar DataURL do QR:", e);
    }
  });

  // Ready (conectado)
  client.on("ready", async () => {
    try {
      status = "connected";
      global.whatsappStartTime = Date.now();
      global.whatsappClients = global.whatsappClients || [];
      global.whatsappClients.push(client);
      global.client = client;

      // tenta recuperar número logado
      let foundNumber = null;
      try {
        if (client.info && client.info.me && client.info.me.user)
          foundNumber = client.info.me.user;
        else if (client.info && client.info.wid && client.info.wid.user)
          foundNumber = client.info.wid.user;
      } catch (e) {}

      if (!foundNumber && typeof client.getNumberId === "function") {
        try {
          const numId = await client.getNumberId();
          if (numId && numId._serialized)
            foundNumber = String(numId._serialized).replace("@c.us", "");
        } catch (e) {}
      }

      if (!foundNumber && client.info && client.info.pushname)
        foundNumber = client.info.pushname;

      connectedNumber = foundNumber || null;
      currentQR = "";

      console.log("✅ Bot conectado!", connectedNumber);

      // inicializa serviços que precisam do client
      try {
        inicializarContadorDiario();
      } catch (e) {
        console.warn("Falha ao inicializar contador diário:", e?.message || e);
      }
      try {
        iniciarAgendamentos(client);
      } catch (e) {
        console.warn("Falha ao iniciar agendamentos:", e?.message || e);
      }

      // iniciar monitor CPU (assíncrono)
      iniciarMonitorCPU(client);

      try {
        global.atualizar?.();
      } catch (e) {}
    } catch (e) {
      console.error("Erro no handler ready:", e);
    }
  });

  // Mensagens recebidas
  client.on("message", (msg) => {
    try {
      if (msg.fromMe) return;
      if (global.whatsappStartTime && msg.timestamp) {
        const msgMs = msg.timestamp * 1000;
        const allowance = 60 * 1000;
        if (msgMs < global.whatsappStartTime - allowance) return;
      }
      try {
        incrementarContador();
      } catch (e) {
        console.warn("Falha ao incrementar contador diário:", e?.message || e);
      }
    } catch (e) {
      console.error("Erro no handler de message:", e);
    }
  });

  // Mudança de estado (reconexões)
  client.on("change_state", (state) => {
    try {
      if (state === "CONNECTING") {
        global.reconnectCount = (global.reconnectCount || 0) + 1;
      }
      if (state === "CONFLICT" || state === "UNPAIRED") {
        console.log("Estado alterado:", state);
      }
    } catch (e) {
      console.error("Erro em change_state handler:", e);
    }
  });

  // Auth failure
  client.on("auth_failure", (msg) => {
    console.error("Falha de autenticação:", msg);
  });

  // disconnected: apenas atualiza estado — NÃO destrói tudo aqui (evita double cleanup)
  client.on("disconnected", (reason) => {
    try {
      console.log("⚠️ Cliente desconectado (evento):", reason);
      status = "idle";
      currentQR = "";
      connectedNumber = null;
      try {
        global.whatsappClients = (global.whatsappClients || []).filter(
          (c) => c !== client,
        );
      } catch (e) {}
      try {
        global.client = null;
      } catch (e) {}
      try {
        global.atualizar?.();
      } catch (e) {}
    } catch (e) {
      console.error("Erro no handler disconnected:", e);
    }
  });

  clientInstance = client;
  return client;
}

// Conectar (iniciado pelo front)
async function connect(req, res) {
  try {
    // se já existe um client em algum estado que não idle, responder adequadamente
    if (clientInstance && status !== "idle") {
      return res.status(202).json({ status, message: "Já em andamento" });
    }

    status = "waiting";
    currentQR = "";
    connectedNumber = null;

    const client = await createClient();

    // Inicializa; o fluxo de eventos cuidará de qr -> ready
    client.initialize();

    return res.status(202).json({ status, message: "Inicializando cliente" });
  } catch (e) {
    clientInstance = null;
    status = "idle";
    currentQR = "";
    connectedNumber = null;
    return res
      .status(500)
      .json({
        status: "idle",
        message: "Erro ao iniciar",
        error: e?.message || String(e),
      });
  }
}

// Cleanup seguro (idempotente) — fecha tudo e APÓS FECHAR remove arquivos (com pequeno delay)
async function cleanupAfterDisconnect(removeSessionFiles = true) {
  if (isDestroying) return;
  isDestroying = true;

  try {
    // Marca estado imediatamente (frontend verá desconexão)
    status = "idle";
    currentQR = "";
    connectedNumber = null;
  
    global.whatsappStartTime = null;
    global.client = null;
    global.cpuUsage = 0;
    global.__lastPerfMetrics = null;


    // parar monitor de CPU
    try {
      if (cpuMonitorInterval) {
        clearInterval(cpuMonitorInterval);
        cpuMonitorInterval = null;
      }
      if (cpuCDPSession) {
        try {
          await cpuCDPSession.detach();
        } catch (e) {}
        cpuCDPSession = null;
      }
    } catch (e) {
      // ignore
    }

    // capture e zere referência para evitar race conditions
    const client = clientInstance;
    clientInstance = null;

    // remover listeners e destruir client com segurança
    if (client) {
      try {
        // evita que eventos disparem enquanto fechamos
        client.removeAllListeners();
      } catch (e) {}

      // fechar browser/pupBrowser se disponível
      try {
        if (
          client.pupBrowser &&
          typeof client.pupBrowser.close === "function"
        ) {
          await client.pupBrowser.close().catch(() => {});
        }
      } catch (e) {}

      // destroy do client (aguardar)
      try {
        if (typeof client.destroy === "function") {
          await client.destroy().catch(() => {});
        }
      } catch (e) {
        // ignore — o objetivo é tentar fechar tudo sem deixar exceptions subirem
      }
    }

    // Atualiza arrays globais
    try {
      global.whatsappClients = (global.whatsappClients || []).filter(
        (c) => c !== client,
      );
    } catch (e) {}

    // Remover arquivos de sessão SOMENTE DEPOIS de destruir (com delay para evitar race)
    if (removeSessionFiles) {
      setTimeout(() => {
        try {
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            console.log("🗑️ Sessão AUTH removida:", AUTH_DIR);
          }
        } catch (e) {
          console.warn("Falha ao remover AUTH_DIR:", e.message);
        }

        try {
          if (fs.existsSync(CACHE_DIR)) {
            fs.rmSync(CACHE_DIR, { recursive: true, force: true });
            console.log("🗑️ Cache removido:", CACHE_DIR);
          }
        } catch (e) {
          console.warn("Falha ao remover CACHE_DIR:", e.message);
        }
      }, 1500);
    }
  } finally {
    isDestroying = false;
  }
}

// Endpoint desconectar (usado pelo front)
async function disconnect(req, res) {
  try {
    // marca estado e informa frontend
    status = "disconnecting";
    try {
      global.atualizar?.();
    } catch (e) {}

    // se não há client, faz cleanup simples (apaga pastas se quiser)
    if (!clientInstance) {
      await cleanupAfterDisconnect(true);
      try {
        global.atualizar?.();
      } catch (e) {}
      return res.json({ status: "idle", message: "Nenhuma sessão ativa" });
    }

    // Não chamar logout() — causa instabilidade em alguns ambientes.
    // Apenas executar cleanup seguro e aguardar.
    await cleanupAfterDisconnect(true);

    try {
      global.atualizar?.();
    } catch (e) {}

    return res.json({ status: "idle", message: "Desconectado com sucesso" });
  } catch (e) {
    console.error("Erro crítico no disconnect:", e);
    // garantir cleanup
    try {
      await cleanupAfterDisconnect(true);
    } catch (_) {}
    return res
      .status(500)
      .json({
        status: "idle",
        message: "Erro ao desconectar",
        error: e?.message || String(e),
      });
  }
}

module.exports = { getQR, connect, disconnect };