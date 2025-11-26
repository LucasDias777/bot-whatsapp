const db = require("../database/database");

exports.adicionarContato = (req, res) => {
  const { numero } = req.body;
  db.run("INSERT INTO contatos (numero) VALUES (?)", [numero], err => {
    res.json({ ok: !err });
  });
};

exports.listarContatos = (req, res) => {
  db.all("SELECT * FROM contatos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
};

exports.removerContato = (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM contatos WHERE id = ?", [id], err => {
    db.run("DELETE FROM grupo_contatos WHERE contato_id = ?", [id], () => {
      res.json({ ok: !err });
    });
  });
};

exports.editarContato = (req, res) => {
  const id = req.params.id;
  const { numero } = req.body;

  db.run(
    "UPDATE contatos SET numero = ? WHERE id = ?",
    [numero, id],
    function (err) {
      if (err) {
        return res.status(500).json({ ok: false, err: err.message });
      }

      res.json({ ok: true, changes: this.changes });
    }
  );
};
