const db = require("../database/database");

exports.adicionarMensagem = (req, res) => {
  db.run("INSERT INTO mensagens (texto) VALUES (?)", [req.body.texto], err => {
    res.json({ ok: !err });
  });
};

exports.listarMensagens = (req, res) => {
  db.all("SELECT * FROM mensagens", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
};

exports.removerMensagem = (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM mensagens WHERE id = ?", [id], err => {
    res.json({ ok: !err });
  });
};
