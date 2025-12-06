const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { app, setQR, setConectado } = require("./painel");
const { iniciarAgendamentos } = require("./services/agenda");
const { inicializarContadorDiario, incrementarContador } = require("./services/contadorDiario");

// ========================================================
// VARIÁVEIS GLOBAIS
// ========================================================
global.whatsappClients = [];
global.whatsappStartTime = null;
global.lastQRCodeTime = null;
global.reconnectCount = 0;

// CPU REAL DA ABA WHATSAPP (DevTools)
global.cpuUsage = 0;
global.__lastPerfMetrics = null;

// ========================================================
// CRIA CLIENTE WPPWEB
// ========================================================
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "session-bot" })
});

global.client = client;

// ========================================================
// EVENTO: QR GERADO
// ========================================================
client.on("qr", async (qr) => {
  console.log("📱 Escaneie o QR Code!");

  global.lastQRCodeTime = Date.now();

  const qrCodeDataURL = await QRCode.toDataURL(qr);
  setQR(qrCodeDataURL);
  setConectado(false);

  global.atualizar?.();
});

// ========================================================
// EVENTO: CLIENTE CONECTADO
// ========================================================
client.on("ready", () => {
  console.log("✅ Bot conectado!");

  global.whatsappStartTime = Date.now();
  global.whatsappClients.push(client);
  setConectado(true);

  global.atualizar?.();

  inicializarContadorDiario();
  iniciarAgendamentos(client);
});

// ========================================================
// EVENTO: RECONEXÃO
// ========================================================
client.on("change_state", (state) => {
  if (state === "CONNECTING") {
    global.reconnectCount++;
  }
});

// ========================================================
// EVENTO: MENSAGEM RECEBIDA
// ========================================================
client.on("message", (msg) => {
  if (!msg.fromMe) incrementarContador();
});

// ========================================================
// EVENTO: DESCONEXÃO
// ========================================================
client.on("disconnected", () => {
  global.whatsappClients = global.whatsappClients.filter(c => c !== client);
  setConectado(false);
  global.atualizar?.();
});

// ========================================================
// INICIALIZA CLIENTE
// ========================================================
client.initialize();

// ====================================================================
// 🔥 MONITORAR CPU REAL DA ABA VIA DEVTOOLS PROTOCOL (CDP)
// ====================================================================
async function iniciarMonitorCPU() {
  while (!client.pupPage) {
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("🖥️ Iniciando monitoramento de CPU");

  const session = await client.pupPage.target().createCDPSession();
  await session.send("Performance.enable");

  setInterval(async () => {
    try {
      const perf = await session.send("Performance.getMetrics");

      const map = {};
      for (const m of perf.metrics) map[m.name] = m.value;

      // Chrome 121+ => métrica REAL já calculada
      if (map.RecategorizedCPUUsage) {
        global.cpuUsage = Number(map.RecategorizedCPUUsage.toFixed(1));
        return;
      }

      // Fallback: cálculo manual do delta
      if (global.__lastPerfMetrics) {
        const last = global.__lastPerfMetrics;

        const scriptDiff = map.ScriptDuration - last.ScriptDuration;
        const layoutDiff = map.LayoutDuration - last.LayoutDuration;
        const taskDiff = map.TaskDuration - last.TaskDuration;

        const total = scriptDiff + layoutDiff + taskDiff;

        const percent = Math.min(100, Number((total * 100).toFixed(1)));
        global.cpuUsage = percent;
      }

      // Salvar para o próximo cálculo
      global.__lastPerfMetrics = map;

    } catch (e) {
      console.error("Erro ao medir CPU via CDP:", e);
    }
  }, 1000);
}

iniciarMonitorCPU();

// ========================================================
// INICIA SERVIDOR EXPRESS
// ========================================================
app.listen(3000, () => {
  console.log("🌐 Backend rodando em http://localhost:3000");
});