const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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
app.use("/dashboard", require("./routes/dashboardRoutes"));
app.use("/backend", require("./routes/backend"));

const frontendDistDir = path.join(__dirname, "../frontend/dist");
const frontendDistIndex = path.join(frontendDistDir, "index.html");
const frontendDevUrl = process.env.FRONTEND_DEV_URL || "";
const hasBuiltFrontend = fs.existsSync(frontendDistIndex);

// FRONTEND
if (frontendDevUrl) {
  app.get(/.*/, (req, res) => {
    res.redirect(`${frontendDevUrl}${req.originalUrl}`);
  });
} else if (hasBuiltFrontend) {
  app.use(express.static(frontendDistDir));

  app.get(/.*/, (req, res) => {
    res.sendFile(frontendDistIndex);
  });
} else {
  app.get(/.*/, (req, res) => {
    res.status(503).json({
      error: "frontend_unavailable",
      message: "Frontend build not found. Run the frontend dev server or build the frontend first.",
    });
  });
}

module.exports = { app };
