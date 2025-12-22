const db = require("../database/database");

exports.adicionarMensagem = (req, res) => {
  const texto = req.body.texto?.trim();

  if (!texto) {
    return res.status(400).json({ ok: false, erro: "Texto inválido." });
  }

  db.get(
    "SELECT id FROM mensagens WHERE texto = ?",
    [texto],
    (err, row) => {
      if (err) {
        console.error("Erro verificação mensagem duplicada:", err);
        return res.status(500).json({ ok: false });
      }

      if (row) {
        return res.status(400).json({
          ok: false,
          erro: "Mensagem igual já criada.",
        });
      }

      db.run(
        "INSERT INTO mensagens (texto) VALUES (?)",
        [texto],
        err => {
          if (err) {
            console.error("Erro ao criar mensagem:", err);
            return res.status(500).json({ ok: false });
          }

          return res.json({ ok: true });
        }
      );
    }
  );
};

exports.listarMensagens = (req, res) => {
  db.all("SELECT * FROM mensagens", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
};

exports.removerMensagem = (req, res) => {
  const id = req.params.id;

  db.get(
    "SELECT 1 FROM agendamentos WHERE mensagem_id = ? LIMIT 1",
    [id],
    (err, row) => {
      if (err) {
        console.error("Erro verificação agendamento mensagem:", err);
        return res.status(500).json({ ok: false });
      }

      if (row) {
        return res.status(400).json({
          ok: false,
          erro: "Mensagem possui agendamento",
        });
      }

      db.run("DELETE FROM mensagens WHERE id = ?", [id], err => {
        if (err) {
          console.error("Erro ao deletar mensagem:", err);
          return res.status(500).json({ ok: false });
        }

        return res.json({ ok: true });
      });
    }
  );
};

exports.editarMensagem = (req, res) => {
  const id = req.params.id;
  const texto = req.body.texto?.trim();

  if (!texto) {
    return res.status(400).json({ ok: false, erro: "Texto inválido." });
  }

  db.get(
    "SELECT id FROM mensagens WHERE texto = ? AND id != ?",
    [texto, id],
    (err, row) => {
      if (err) {
        console.error("Erro verificação duplicidade editar:", err);
        return res.status(500).json({ ok: false });
      }

      if (row) {
        return res.status(400).json({
          ok: false,
          erro: "Mensagem igual já criada.",
        });
      }

      db.run(
        "UPDATE mensagens SET texto = ? WHERE id = ?",
        [texto, id],
        err => {
          if (err) {
            console.error("Erro ao editar mensagem:", err);
            return res.status(500).json({ ok: false });
          }

          return res.json({ ok: true });
        }
      );
    }
  );
};