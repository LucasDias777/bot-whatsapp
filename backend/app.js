const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { app, setQR, setConectado } = require("./painel");
const { iniciarAgendamentos } = require("./services/agenda");

// Lista global de clientes ativos
if (!global.whatsappClients) global.whatsappClients = [];

const client = new Client({
authStrategy: new LocalAuth({ clientId: "session-bot" }),
});

global.client = client;

client.on("qr", async (qr) => {
console.log("📱 Escaneie o QR Code!");

const qrCodeDataURL = await QRCode.toDataURL(qr);

setQR(qrCodeDataURL);
setConectado(false);

global.atualizar?.();
});

client.on("ready", () => {
console.log("✅ Bot conectado!");
setConectado(true);

// Armazena cliente ativo
global.whatsappClients.push(client);

global.atualizar?.();

iniciarAgendamentos(client);
});

client.on("disconnected", () => {
console.log("❌ Cliente desconectado, removido da lista");

global.whatsappClients = global.whatsappClients.filter((c) => c !== client);

setConectado(false);
global.atualizar?.();
});

client.initialize();

app.listen(3000, () => {
console.log("🌐 Backend rodando em http://localhost:3000");
});