const { app } = require("./painel");
const { createClient } = require("./controllers/qrController");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Backend rodando em http://localhost:${PORT}`);

  // 🔥 AUTO INICIALIZA WHATSAPP
  createClient();

  // 🔥 BACKEND PRONTO
  global.backendReady = true;
  console.log("✅ Backend totalmente pronto");
});