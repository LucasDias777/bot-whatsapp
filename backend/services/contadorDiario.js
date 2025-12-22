const db = require("../database/database");

// DATA NO FORMATO YYYY-MM-DD (LOCAL)
function getDiaAtual() {
  return new Date().toLocaleDateString("en-CA");
}

function inicializarContadorDiario(numero) {
  const hoje = getDiaAtual();

  db.serialize(() => {
    db.run(
      `
      INSERT OR IGNORE INTO mensagens_diarias (numero, dia, contador)
      VALUES (?, ?, 0)
      `,
      [numero, hoje]
    );

    db.run(
      `
      UPDATE mensagens_diarias
      SET contador = 0,
          dia = ?
      WHERE numero = ?
        AND dia <> ?
      `,
      [hoje, numero, hoje]
    );
  });
}

function incrementarContador(numero) {
  const hoje = getDiaAtual();

  db.run(
    `
    UPDATE mensagens_diarias
    SET contador = CASE
      WHEN dia = ? THEN contador + 1
      ELSE 1
    END,
    dia = ?
    WHERE numero = ?
    `,
    [hoje, hoje, numero],
    function (err) {
      if (err) {
        console.error("Erro ao incrementar contador diário:", err);
      }
    }
  );
}

function getContadorHoje(numero) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT contador
      FROM mensagens_diarias
      WHERE numero = ?
      `,
      [numero],
      (err, row) => {
        if (err) return reject(err);
        resolve(row?.contador ?? 0);
      }
    );
  });
}

module.exports = { inicializarContadorDiario, incrementarContador, getContadorHoje, getDiaAtual };