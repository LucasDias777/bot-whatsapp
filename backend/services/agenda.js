const cron = require("node-cron");
const db = require("../database/database.js");
const { sendMessageToNumber } = require("./envio.js");

function iniciarAgendamentos(client) {
  cron.schedule("* * * * *", () => {
    const agora = new Date();
    const horaAtual = agora.toTimeString().slice(0, 5);
    const diaSemana = agora.getDay();

    db.all(
      `
      SELECT
        a.id,
        a.contato_id,
        a.grupo_id,
        a.horario,
        a.dias,
        m.texto AS mensagem
      FROM agendamentos a
      JOIN mensagens m ON a.mensagem_id = m.id
      WHERE a.horario = ?
      `,
      [horaAtual],
      (err, rows) => {
        if (err) {
          console.error("Erro ao buscar agendamentos:", err.message);
          return;
        }

        rows.forEach((ag) => {
          try {
            const dias = JSON.parse(ag.dias);
            if (!Array.isArray(dias)) return;
            if (!dias.includes(diaSemana)) return;

            // ✅ ENVIO PARA GRUPO
            if (ag.grupo_id) {
              db.all(
                `
                SELECT c.numero
                FROM grupo_contatos gc
                JOIN contatos c ON gc.contato_id = c.id
                WHERE gc.grupo_id = ?
                `,
                [ag.grupo_id],
                (gErr, contatos) => {
                  if (gErr) {
                    console.error("Erro buscando contatos do grupo:", gErr.message);
                    return;
                  }

                  contatos.forEach((c) => {
                    sendMessageToNumber(client, c.numero, ag.mensagem);
                  });
                }
              );
              return;
            }

            // ✅ ENVIO PARA CONTATO INDIVIDUAL
            if (ag.contato_id) {
              db.get(
                `SELECT numero FROM contatos WHERE id = ?`,
                [ag.contato_id],
                (cErr, contato) => {
                  if (cErr || !contato) {
                    console.error("Erro buscando contato:", cErr?.message);
                    return;
                  }

                  sendMessageToNumber(client, contato.numero, ag.mensagem);
                }
              );
              return;
            }
            console.warn("Agendamento sem contato nem grupo:", ag);
          } catch (e) {
            console.error("Erro processando agendamento:", e.message);
          }
        });
      }
    );
  });
}

module.exports = { iniciarAgendamentos };