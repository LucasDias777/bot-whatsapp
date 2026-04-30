const db = require("../database/database");
const { normalizeConnectionIds } = require("../services/connectionRegistry");

exports.adicionarAgendamento = (req, res) => {
  const { contato_id = null, grupo_id = null, mensagem_id, horario, dias, connection_ids = [] } = req.body;
  const connectionIds = normalizeConnectionIds(connection_ids);

  db.run(
    `
    INSERT INTO agendamentos
    (contato_id, grupo_id, mensagem_id, horario, dias, connection_ids)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [contato_id, grupo_id, mensagem_id, horario, JSON.stringify(dias), JSON.stringify(connectionIds)],
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
      m.texto AS mensagem,
      a.connection_ids
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
        r.connection_ids = normalizeConnectionIds(r.connection_ids);
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
  const { contato_id = null, grupo_id = null, mensagem_id, horario, dias, connection_ids = [] } = req.body;
  const connectionIds = normalizeConnectionIds(connection_ids);

  db.run(
    `
    UPDATE agendamentos
    SET
      contato_id = ?,
      grupo_id = ?,
      mensagem_id = ?,
      horario = ?,
      dias = ?,
      connection_ids = ?
    WHERE id = ?
    `,
    [contato_id, grupo_id, mensagem_id, horario, JSON.stringify(dias), JSON.stringify(connectionIds), id],
    (err) => {
      if (err) {
        return res.status(500).json({ ok: false, err: err.message });
      }
      res.json({ ok: true });
    },
  );
};
