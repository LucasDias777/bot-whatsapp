const express = require("express");
const cors = require("cors");
const path = require("path");

const { setQR, setConectado } = require("./controllers/qrController");

const app = express();
app.use(cors());
app.use(express.json());

// ROTAS API
app.use("/qr", require("./routes/qrRoutes"));
app.use("/contato", require("./routes/contatoRoutes"));
app.use("/mensagem", require("./routes/mensagemRoutes"));
app.use("/agendamento", require("./routes/agendamentoRoutes"));
app.use("/grupo", require("./routes/grupoRoutes"));
app.use("/enviar-agora", require("./routes/envioRoutes"));

// FRONTEND
app.use(express.static(path.join(__dirname, "../frontend")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

module.exports = { app, setQR, setConectado };
