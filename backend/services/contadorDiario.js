const db = require("../database/database");

// Retorna a data atual no formato AAAA-MM-DD
// USANDO HORÁRIO LOCAL (NÃO UTC)

function getDiaAtual() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs)
    .toISOString()
    .slice(0, 10);
}

// Garante que existe a linha do contador
// e que ela está consistente com o dia atual.
// ✔ Roda no boot
// ✔ Não depende do estado anterior
// ✔ Não quebra se já existir

function inicializarContadorDiario() {
  const hoje = getDiaAtual();

  db.run(
    `
    INSERT INTO mensagens_diarias (id, dia, contador)
    VALUES (1, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      dia = excluded.dia,
      contador = CASE
        WHEN mensagens_diarias.dia = excluded.dia
          THEN mensagens_diarias.contador
        ELSE 0
      END
    `,
    [hoje],
    (err) => {
      if (err) {
        console.error("Erro ao inicializar contador diário:", err);
      }
    }
  );
}

// Incrementa o contador diário com proteção total
// ✔ Sempre valida o dia
// ✔ Reseta automaticamente ao virar
// ✔ Primeira mensagem do dia = 1
// ✔ Funciona mesmo se o app ficou dias desligado

function incrementarContador() {
  const hoje = getDiaAtual();

  db.serialize(() => {
    db.get(
      `SELECT dia FROM mensagens_diarias WHERE id = 1`,
      (err, row) => {
        if (err || !row) {
          console.error("Erro ao ler contador diário:", err);
          return;
        }

        // Dia virou → reset e começa em 1
        if (row.dia !== hoje) {
          db.run(
            `UPDATE mensagens_diarias SET dia = ?, contador = 1 WHERE id = 1`,
            [hoje],
            (err) => {
              if (err) {
                console.error("Erro ao resetar contador diário:", err);
              }
            }
          );
        } 
        // Mesmo dia → incrementa
        else {
          db.run(
            `UPDATE mensagens_diarias SET contador = contador + 1 WHERE id = 1`,
            (err) => {
              if (err) {
                console.error("Erro ao incrementar contador diário:", err);
              }
            }
          );
        }
      }
    );
  });
}

// Retorna o valor atual do contador do dia

function getContadorHoje() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT contador FROM mensagens_diarias WHERE id = 1`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.contador || 0);
      }
    );
  });
}

module.exports = {
  inicializarContadorDiario,
  incrementarContador,
  getContadorHoje
};