const db = require("../database/database");

exports.adicionarAgendamento = (req, res) => {
  const { contato_id = null, grupo_id = null, mensagem_id, horario, dias } = req.body;

  db.run(
    `
    INSERT INTO agendamentos
    (contato_id, grupo_id, mensagem_id, horario, dias)
    VALUES (?, ?, ?, ?, ?)
    `,
    [contato_id, grupo_id, mensagem_id, horario, JSON.stringify(dias)],
    (err) => {
      if (err) {
        return res.status(500).json({ ok: false, err: err.message });
      }
      res.json({ ok: true });
    },
  );
};

exports.listarAgendamentos = (req, res) => {
  db.all(
    `
    SELECT
      a.id,
      a.horario,
      a.dias,
      c.id AS contato_id,
      c.numero,
      c.nome,
      g.id AS grupo_id,
      g.nome AS grupo_nome,
      m.id AS mensagem_id,
      m.texto AS mensagem
    FROM agendamentos a
    LEFT JOIN contatos c ON a.contato_id = c.id
    LEFT JOIN grupos g ON a.grupo_id = g.id
    JOIN mensagens m ON a.mensagem_id = m.id
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ ok: false, err: err.message });
      }

      rows.forEach((r) => {
        r.dias = JSON.parse(r.dias);
      });

      res.json(rows);
    },
  );
};

exports.removerAgendamento = (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM agendamentos WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ ok: false, err: err.message });
    }
    res.json({ ok: true });
  });
};

exports.editarAgendamento = (req, res) => {
  const id = req.params.id;
  const { contato_id = null, grupo_id = null, mensagem_id, horario, dias } = req.body;

  db.run(
    `
    UPDATE agendamentos
    SET
      contato_id = ?,
      grupo_id = ?,
      mensagem_id = ?,
      horario = ?,
      dias = ?
    WHERE id = ?
    `,
    [contato_id, grupo_id, mensagem_id, horario, JSON.stringify(dias), id],
    (err) => {
      if (err) {
        return res.status(500).json({ ok: false, err: err.message });
      }
      res.json({ ok: true });
    },
  );
};