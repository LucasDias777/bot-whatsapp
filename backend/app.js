const { app } = require("./painel");

// ========================================================
// VARIÁVEIS GLOBAIS (mantidas para compatibilidade)
// ========================================================
global.whatsappClients = [];
global.whatsappStartTime = null;
global.lastQRCodeTime = null;
global.reconnectCount = 0;

// CPU REAL DA ABA WHATSAPP (pode ser atualizado pelo controller)
global.cpuUsage = 0;
global.__lastPerfMetrics = null;

// ========================================================
// START SERVER
// ========================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Backend rodando em http://localhost:${PORT}`);
});