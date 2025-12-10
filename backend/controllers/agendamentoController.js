const db = require("../database/database");

exports.adicionarAgendamento = (req, res) => {
  const { numero = null, grupo = null, mensagem, horario, dias } = req.body;

  db.run(
    "INSERT INTO agendamentos (numero, grupo, mensagem, horario, dias) VALUES (?, ?, ?, ?, ?)",
    [numero, grupo, mensagem, horario, JSON.stringify(dias)],
    err => res.json({ ok: !err })
  );
};

exports.listarAgendamentos = (req, res) => {
  db.all("SELECT * FROM agendamentos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    rows.forEach(r => (r.dias = JSON.parse(r.dias)));
    res.json(rows);
  });
};

exports.removerAgendamento = (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM agendamentos WHERE id = ?", [id], err => {
    res.json({ ok: !err });
  });
};