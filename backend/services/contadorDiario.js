const db = require("../database/database");

// Retorna "AAAA-MM-DD" com base no horário local
function getDiaAtual() {
  return new Date().toISOString().slice(0, 10);
}

// Garante que existe uma linha com id=1
function inicializarContadorDiario() {
  const hoje = getDiaAtual();

  db.get(`SELECT * FROM mensagens_diarias WHERE id = 1`, (err, row) => {
    if (err) return console.error("Erro ao verificar contador diário:", err);

    // Se não existe → cria
    if (!row) {
      db.run(
        `INSERT INTO mensagens_diarias (id, dia, contador) VALUES (1, ?, 0)`,
        [hoje],
        err => err && console.error("Erro ao criar linha mensagens_diarias:", err)
      );
      return;
    }

    // Se o dia mudou → reset
    if (row.dia !== hoje) {
      db.run(
        `UPDATE mensagens_diarias SET dia = ?, contador = 0 WHERE id = 1`,
        [hoje],
        err => err && console.error("Erro ao resetar contador diário:", err)
      );
    }
  });
}

// Incrementa o contador corretamente
function incrementarContador() {
  const hoje = getDiaAtual();

  db.get(`SELECT * FROM mensagens_diarias WHERE id = 1`, (err, row) => {
    if (err || !row) return;

    // Se virou o dia → zera e seta 1
    if (row.dia !== hoje) {
      db.run(
        `UPDATE mensagens_diarias SET dia = ?, contador = 1 WHERE id = 1`,
        [hoje],
        err => err && console.error("Erro ao reset diário:", err)
      );
    } else {
      // Mesmo dia → soma +1
      db.run(
        `UPDATE mensagens_diarias SET contador = contador + 1 WHERE id = 1`,
        err => err && console.error("Erro ao incrementar contador diário:", err)
      );
    }
  });
}

// Consulta o valor atual do contador
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