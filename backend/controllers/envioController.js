const db = require("../database/database");
const { sendMessageToNumber } = require("../services/envio");

exports.enviarAgora = (req, res) => {
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
};