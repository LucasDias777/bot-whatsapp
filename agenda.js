const cron = require("node-cron");
const db = require("./database");
const { sendMessageToNumber } = require("./envio");

function iniciarAgendamentos(client) {
  // roda a cada minuto
  cron.schedule("* * * * *", () => {
    const agora = new Date();
    const horaAtual = agora.toTimeString().slice(0, 5); // "HH:MM"
    const diaSemana = agora.getDay(); // 0 domingo, 1 seg...

    db.all("SELECT * FROM agendamentos WHERE horario = ?", [horaAtual], (err, rows) => {
      if (err) {
        console.error("Erro ao buscar agendamentos:", err.message);
        return;
      }

      rows.forEach(ag => {
        try {
          const dias = JSON.parse(ag.dias);
          if (!Array.isArray(dias)) return;

          if (dias.includes(diaSemana)) {
            if (ag.grupo) {
              // se ag.grupo está preenchido, buscar contatos do grupo e enviar para todos
              db.all(
                `SELECT c.numero FROM grupo_contatos gc
                 JOIN contatos c ON gc.contato_id = c.id
                 WHERE gc.grupo_id = ?`,
                [ag.grupo],
                (gErr, contatos) => {
                  if (gErr) {
                    console.error("Erro buscando contatos do grupo:", gErr.message);
                    return;
                  }
                  contatos.forEach(c => {
                    sendMessageToNumber(client, c.numero, ag.mensagem);
                  });
                }
              );
            } else if (ag.numero) {
              // envio para número individual
              sendMessageToNumber(client, ag.numero, ag.mensagem);
            } else {
              console.warn("Agendamento sem número nem grupo:", ag);
            }
          }
        } catch (e) {
          console.error("Erro processando agendamento:", e.message);
        }
      });
    });
  });
}

module.exports = { iniciarAgendamentos };
