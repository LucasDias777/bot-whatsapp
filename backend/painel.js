const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ========================================================
// ROTAS API
// ========================================================
app.use("/qr", require("./routes/qrRoutes"));
app.use("/contato", require("./routes/contatoRoutes"));
app.use("/mensagem", require("./routes/mensagemRoutes"));
app.use("/agendamento", require("./routes/agendamentoRoutes"));
app.use("/grupo", require("./routes/grupoRoutes"));
app.use("/enviar-agora", require("./routes/envioRoutes"));
app.use("/dashboard", require("./routes/dashboardRoutes"));

// ========================================================
// FRONTEND (SPA)
// ========================================================
app.use(express.static(path.join(__dirname, "../frontend")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

module.exports = { app };