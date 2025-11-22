const express = require("express");
const app = express();
const db = require("./database/database.js");
const { sendMessageToNumber } = require("./envio");
let qrCodeAtual = "";
let conectado = false;

const cors = require("cors");
app.use(cors());

const path = require("path");

app.use(express.json());


// ===============================
// 🔍 STATUS + QR (API PRECISA VIR ANTES DO FRONT)
// ===============================
app.get("/qr", (req, res) => {
  res.json({ qr: qrCodeAtual, conectado });
});


// ===============================
// ✅ CONTATOS
// ===============================
// Adicionar contato
app.post("/contato", (req, res) => {
  const { numero } = req.body;
  db.run("INSERT INTO contatos (numero) VALUES (?)", [numero], err => {
    res.json({ ok: !err });
  });
});

// Listar contatos
app.get("/contatos", (req, res) => {
  db.all("SELECT * FROM contatos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
});

// Remover contato
app.delete("/contato/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM contatos WHERE id = ?", [id], err => {
    db.run("DELETE FROM grupo_contatos WHERE contato_id = ?", [id], () => {
      res.json({ ok: !err });
    });
  });
});


// ===============================
// ✅ MENSAGENS
// ===============================
// Adicionar mensagem
app.post("/mensagem", (req, res) => {
  db.run("INSERT INTO mensagens (texto) VALUES (?)", [req.body.texto], err => {
    res.json({ ok: !err });
  });
});

// Listar mensagens
app.get("/mensagens", (req, res) => {
  db.all("SELECT * FROM mensagens", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
});

// Remover mensagem
app.delete("/mensagem/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM mensagens WHERE id = ?", [id], err => {
    res.json({ ok: !err });
  });
});


// ===============================
// ✅ AGENDAMENTOS
// ===============================
// Adicionar agendamentos
app.post("/agendar", (req, res) => {
  const { numero = null, grupo = null, mensagem, horario, dias } = req.body;

  db.run(
    "INSERT INTO agendamentos (numero, grupo, mensagem, horario, dias) VALUES (? , ? , ? , ? , ?)",
    [numero, grupo, mensagem, horario, JSON.stringify(dias)],
    err => res.json({ ok: !err })
  );
});

// Listar agendamentos
app.get("/agendamentos", (req, res) => {
  db.all("SELECT * FROM agendamentos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    rows.forEach(r => (r.dias = JSON.parse(r.dias)));
    res.json(rows);
  });
});

// Remover agendamento
app.delete("/agendamento/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM agendamentos WHERE id = ?", [id], err => {
    res.json({ ok: !err });
  });
});


// ===============================
// ✅ GRUPOS
// ===============================

// Criar grupo
app.post("/grupo", (req, res) => {
  const { nome } = req.body;
  db.run("INSERT INTO grupos (nome) VALUES (?)", [nome], function(err) {
    if (err) return res.json({ ok: false, err: err.message });
    res.json({ ok: true, id: this.lastID });
  });
});

// Listar grupos
app.get("/grupos", (req, res) => {
  db.all("SELECT * FROM grupos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
});

// Deletar grupo
app.delete("/grupo/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM grupos WHERE id = ?", [id], err => {
    if (err) return res.json({ ok: false, err: err.message });

    db.run("DELETE FROM grupo_contatos WHERE grupo_id = ?", [id], () => {
      db.run("UPDATE contatos SET grupo = NULL WHERE grupo = ?", [id], () => {
        res.json({ ok: true });
      });
    });
  });
});

// Listar contatos do grupo
app.get("/grupo/:id/contatos", (req, res) => {
  const grupo_id = req.params.id;
  db.all(
    `SELECT c.id, c.numero
     FROM grupo_contatos gc
     JOIN contatos c ON gc.contato_id = c.id
     WHERE gc.grupo_id = ?`,
    [grupo_id],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, err: err.message });
      res.json(rows);
    }
  );
});

// Adicionar contato ao grupo
app.post("/grupo/:id/adicionar", (req, res) => {
  const grupo_id = req.params.id;
  const { contato_id } = req.body;

  db.run(
    "INSERT OR IGNORE INTO grupo_contatos (grupo_id, contato_id) VALUES (?, ?)",
    [grupo_id, contato_id],
    err => {
      if (err) return res.json({ ok: false, err: err.message });

      db.run(
        "UPDATE contatos SET grupo = ? WHERE id = ?",
        [grupo_id, contato_id],
        uErr => res.json({ ok: !uErr })
      );
    }
  );
});

// Remover contato do grupo
app.delete("/grupo/:id/remover/:contatoId", (req, res) => {
  const grupo_id = req.params.id;
  const contato_id = req.params.contatoId;

  db.run(
    "DELETE FROM grupo_contatos WHERE grupo_id = ? AND contato_id = ?",
    [grupo_id, contato_id],
    err => {
      if (err) return res.json({ ok: false, err: err.message });

      db.run("UPDATE contatos SET grupo = NULL WHERE id = ?", [contato_id], uErr => {
        res.json({ ok: !uErr });
      });
    }
  );
});


// ===============================
// ✅ ENVIAR AGORA
// ===============================
app.post("/enviar-agora", (req, res) => {
  const { numero = null, grupo_id = null, mensagem } = req.body;

  if (grupo_id) {
    db.all(
      `SELECT c.numero FROM grupo_contatos gc
       JOIN contatos c ON gc.contato_id = c.id
       WHERE gc.grupo_id = ?`,
      [grupo_id],
      (err, rows) => {
        if (err) return res.status(500).json({ ok: false, err: err.message });
        rows.forEach(r =>
          sendMessageToNumber(global.client, r.numero, mensagem)
        );
        res.json({ ok: true, enviados: rows.length });
      }
    );
  } else if (numero) {
    sendMessageToNumber(global.client, numero, mensagem);
    res.json({ ok: true, enviados: 1 });
  } else {
    res.status(400).json({ ok: false, error: "Nenhum número ou grupo especificado" });
  }
});

// ===============================
// SERVE FRONTEND
// ===============================
app.use(express.static(path.join(__dirname, "../frontend")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ===============================
// VARIÁVEIS DO WHATSAPP
// ===============================
function setQR(v) {
  qrCodeAtual = v;
}

function setConectado(v) {
  conectado = v;
}

module.exports = { app, setQR, setConectado };
