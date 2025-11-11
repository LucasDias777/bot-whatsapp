const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { app, setQR, setConectado } = require("./painel");
const { iniciarAgendamentos } = require("./agenda");
const { sendMessageToNumber } = require("./envio");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "session-bot" }),
});

global.client = client;

// Recebe QR e envia para o painel
client.on("qr", async qr => {
  console.log("📱 Escaneie o QR Code!");
  
  // Gera QR Code em base64 (imagem)
  const qrCodeDataURL = await QRCode.toDataURL(qr);

  // Envia imagem para painel
  setQR(qrCodeDataURL);
  setConectado(false);
});


// Quando conectar
client.on("ready", () => {
  console.log("✅ Bot conectado!");
  setConectado(true);

  iniciarAgendamentos(client);
});

client.initialize();

app.listen(3000, () => {
  console.log("🌐 Painel rodando em http://localhost:3000");
});
