const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { app, setQR, setConectado } = require("./painel");
const { iniciarAgendamentos } = require("./services/agenda");
const { inicializarContadorDiario, incrementarContador } = require("./services/contadorDiario");

// Lista global de clientes ativos
if (!global.whatsappClients) global.whatsappClients = [];

// =========================================
// MÉTRICAS DO SISTEMA WHATSAPP WEB
// =========================================

// horário do último ready (para uptime)
global.whatsappStartTime = null;

// horário do último qr code
global.lastQRCodeTime = null;

// contador de reconexões automáticas
global.reconnectCount = 0;

// uso de CPU calculado periodicamente
global.cpuUsage = 0;

// controle interno para cálculo de CPU
global.__cpuLastCheck = Date.now();
global.__cpuLastUsage = process.cpuUsage();

// =========================================
// CRIA O CLIENTE WHATSAPP
// =========================================
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "session-bot" }),
});

global.client = client;

// =========================================
// EVENTO — QR CODE GERADO
// =========================================
client.on("qr", async (qr) => {
  console.log("📱 Escaneie o QR Code!");

  global.lastQRCodeTime = Date.now(); // 🔥 registra horário do QR

  const qrCodeDataURL = await QRCode.toDataURL(qr);

  setQR(qrCodeDataURL);
  setConectado(false);

  global.atualizar?.();
});

// =========================================
// EVENTO — PRONTO / CONECTADO
// =========================================
client.on("ready", () => {
  console.log("✅ Bot conectado!");

  global.whatsappStartTime = Date.now(); // 🔥 início do uptime
  setConectado(true);

  // Armazena cliente ativo
  global.whatsappClients.push(client);
  global.atualizar?.();

  inicializarContadorDiario();
  iniciarAgendamentos(client);
});

// =========================================
// EVENTO — RECONEXÕES
// =========================================
client.on("change_state", (state) => {
  if (state === "CONNECTING") {
    global.reconnectCount++; // 🔥 soma reconexão automática
  }
});

// =========================================
// EVENTO — CONTAR MENSAGENS RECEBIDAS
// =========================================
client.on("message", (msg) => {
  if (msg.fromMe) return;
  incrementarContador();
});

// =========================================
// EVENTO — DESCONECTADO
// =========================================
client.on("disconnected", () => {
  console.log("❌ Cliente desconectado, removido da lista");

  global.whatsappClients = global.whatsappClients.filter((c) => c !== client);

  setConectado(false);
  global.atualizar?.();
});

// =========================================
// INICIALIZA CLIENTE
// =========================================
client.initialize();

// ====================================================================
// MONITORAR USO DE CPU DO WHATSAPP-WEB via Puppeteer
// ====================================================================
setInterval(async () => {
  try {
    if (!client.pupPage) return;

    const metrics = await client.pupPage.metrics();

    // TaskDuration é em segundos — multiplicamos para simular % CPU
    global.cpuUsage = Math.min(
      100,
      Number((metrics.TaskDuration * 10).toFixed(1))
    );
  } catch (e) {
    // silencioso
  }
}, 2000);

// =========================================
// SERVIDOR EXPRESS
// =========================================
app.listen(3000, () => {
  console.log("🌐 Backend rodando em http://localhost:3000");
});