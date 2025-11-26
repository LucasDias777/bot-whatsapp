const db = require("../database/database");

exports.criarGrupo = (req, res) => {
  const { nome } = req.body;
  db.run("INSERT INTO grupos (nome) VALUES (?)", [nome], function (err) {
    if (err) return res.json({ ok: false, err: err.message });
    res.json({ ok: true, id: this.lastID });
  });
};

exports.listarGrupos = (req, res) => {
  db.all("SELECT * FROM grupos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
};

exports.editarGrupo = (req, res) => {
  const id = req.params.id;
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.json({ ok: false, err: "Nome inválido" });
  }

  db.run(
    "UPDATE grupos SET nome = ? WHERE id = ?",
    [nome.trim(), id],
    function (err) {
      if (err) return res.json({ ok: false, err: err.message });
      res.json({ ok: true });
    }
  );
};


exports.deletarGrupo = (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM grupos WHERE id = ?", [id], err => {
    if (err) return res.json({ ok: false, err: err.message });

    db.run("DELETE FROM grupo_contatos WHERE grupo_id = ?", [id], () => {
      db.run("UPDATE contatos SET grupo = NULL WHERE grupo = ?", [id], () => {
        res.json({ ok: true });
      });
    });
  });
};

exports.listarContatosDoGrupo = (req, res) => {
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
};

exports.adicionarContatoAoGrupo = (req, res) => {
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
};

exports.removerContatoDoGrupo = (req, res) => {
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
};
