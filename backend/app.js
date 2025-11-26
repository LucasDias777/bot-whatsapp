const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { app, setQR, setConectado } = require("./painel");
const { iniciarAgendamentos } = require("./services/agenda");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "session-bot" }),
});

global.client = client;

client.on("qr", async qr => {
  console.log("📱 Escaneie o QR Code!");

  const qrCodeDataURL = await QRCode.toDataURL(qr);

  setQR(qrCodeDataURL);
  setConectado(false);
});

client.on("ready", () => {
  console.log("✅ Bot conectado!");
  setConectado(true);

  iniciarAgendamentos(client);
});

client.initialize();

app.listen(3000, () => {
  console.log("🌐 Painel rodando em http://localhost:3000");
});
