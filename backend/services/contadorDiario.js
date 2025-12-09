const db = require("../database/database");

// Retorna a data atual no formato AAAA-MM-DD usando representação local
function getDiaAtual() {
  // Formato 'en-CA' produz YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA');
}

// Variante para obter dia a partir de um Date (se precisar)
function getDiaAtualFromDate(d = new Date()) {
  return d.toLocaleDateString('en-CA');
}

// Garante que existe a linha do contador (id = 1)
function inicializarContadorDiario() {
  const hoje = getDiaAtual();

  // Inserir se não existir; caso exista não altera contador (apenas garante dia correto)
  db.run(
    `INSERT OR IGNORE INTO mensagens_diarias (id, dia, contador) VALUES (1, ?, 0)`,
    [hoje],
    (err) => {
      if (err) {
        console.error("Erro ao inserir linha inicial do contador diário:", err);
        return;
      }

      // Se a linha já existia mas dia está diferente, resetamos aqui.
      db.run(
        `UPDATE mensagens_diarias
         SET dia = ?, contador = CASE WHEN dia = ? THEN contador ELSE 0 END
         WHERE id = 1`,
        [hoje, hoje],
        (err2) => {
          if (err2) {
            console.error("Erro ao ajustar dia do contador diário:", err2);
          }
        }
      );
    }
  );
}

// Incrementa o contador diário de forma atômica.
// Se a linha não existir, insere com contador = 1.
function incrementarContador() {
  const hoje = getDiaAtual();

  db.serialize(() => {
    // Tenta fazer update atômico: se dia igual -> contador+1, senão -> contador = 1 e atualiza dia
    db.run(
      `UPDATE mensagens_diarias
       SET contador = CASE WHEN dia = ? THEN contador + 1 ELSE 1 END,
           dia = ?
       WHERE id = 1`,
      [hoje, hoje],
      function (err) {
        if (err) {
          console.error("Erro ao executar update do contador diário:", err);
          return;
        }

        // Se nenhuma linha foi atualizada (não existia), inserir a linha com contador = 1
        if (this.changes === 0) {
          db.run(
            `INSERT INTO mensagens_diarias (id, dia, contador) VALUES (1, ?, 1)`,
            [hoje],
            (err2) => {
              if (err2) {
                console.error("Erro ao inserir contador diário inicial:", err2);
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
        if (err) return reject(err);
        resolve(row?.contador ?? 0);
      }
    );
  });
}

module.exports = {
  inicializarContadorDiario,
  incrementarContador,
  getContadorHoje,
  getDiaAtual,          
  getDiaAtualFromDate
};