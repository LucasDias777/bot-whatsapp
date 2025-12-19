const db = require("../database/database");

// Data no formato YYYY-MM-DD (local)
function getDiaAtual() {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Garante que o número conectado tenha uma linha válida.
 * - Se não existir → cria
 * - Se existir e o dia for diferente → zera contador
 */
function inicializarContadorDiario(numero) {
  const hoje = getDiaAtual();

  db.serialize(() => {
    // Cria registro se não existir
    db.run(
      `
      INSERT OR IGNORE INTO mensagens_diarias (numero, dia, contador)
      VALUES (?, ?, 0)
      `,
      [numero, hoje]
    );

    // Se dia mudou, zera contador
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

/**
 * Incrementa contador APENAS do número conectado
 */
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

/**
 * Retorna contador atual do número conectado
 */
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