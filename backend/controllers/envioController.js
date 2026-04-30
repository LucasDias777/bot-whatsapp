const db = require("../database/database");
const { getConnectedConnectionEntries, normalizeConnectionIds } = require("../services/connectionRegistry");
const { sendMessageToNumber } = require("../services/envio");

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

exports.enviarAgora = async (req, res) => {
  try {
    const { numero = null, grupo_id = null, mensagem, connection_ids = [] } = req.body;
    const selectedConnectionIds = normalizeConnectionIds(connection_ids);
    const connections = getConnectedConnectionEntries(selectedConnectionIds);

    if (!connections.length) {
      return res.status(503).json({
        ok: false,
        erro: selectedConnectionIds.length
          ? "Nenhuma das conexoes selecionadas esta conectada."
          : "Nenhuma conexao WhatsApp esta conectada no momento.",
      });
    }

    if (!mensagem || !String(mensagem).trim()) {
      return res.status(400).json({
        ok: false,
        erro: "Nenhuma mensagem foi informada para envio.",
      });
    }

    if (grupo_id) {
      const rows = await dbAll(
        `SELECT c.numero
         FROM grupo_contatos gc
         JOIN contatos c ON gc.contato_id = c.id
         WHERE gc.grupo_id = ?`,
        [grupo_id],
      );

      if (!rows.length) {
        return res.status(400).json({
          ok: false,
          erro: "O grupo selecionado nao possui contatos para envio.",
        });
      }

      const resultados = await Promise.all(
        connections.flatMap((connection) =>
          rows.map((row) =>
            sendMessageToNumber(connection.client, row.numero, mensagem).then((resultado) => ({
              ...resultado,
              connectionId: connection.id,
              connectionName: connection.name,
            })),
          ),
        ),
      );
      const falhas = resultados.filter((item) => !item.ok);

      if (falhas.length > 0) {
        return res.status(502).json({
          ok: false,
          erro: falhas[0].error || "Falha ao enviar para um ou mais contatos do grupo.",
          enviados: resultados.length - falhas.length,
          falhas: falhas.length,
        });
      }

      return res.json({ ok: true, enviados: resultados.length, conexoes: connections.length });
    }

    if (numero) {
      const resultados = await Promise.all(
        connections.map((connection) =>
          sendMessageToNumber(connection.client, numero, mensagem).then((resultado) => ({
            ...resultado,
            connectionId: connection.id,
            connectionName: connection.name,
          })),
        ),
      );
      const falhas = resultados.filter((item) => !item.ok);

      if (falhas.length > 0) {
        return res.status(502).json({
          ok: false,
          erro: falhas[0].error || "Falha ao enviar a mensagem.",
          enviados: resultados.length - falhas.length,
          falhas: falhas.length,
        });
      }

      return res.json({ ok: true, enviados: resultados.length, conexoes: connections.length });
    }

    return res.status(400).json({
      ok: false,
      erro: "Nenhum numero ou grupo especificado.",
    });
  } catch (err) {
    console.error("Erro no envio imediato:", err);
    return res.status(500).json({
      ok: false,
      erro: err?.message || "Erro interno ao enviar mensagem.",
    });
  }
};
