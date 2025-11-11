const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  // === CONTATOS ===
  db.run(`
    CREATE TABLE IF NOT EXISTS contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL,
      grupo TEXT
    );
  `);

  // === MENSAGENS ===
  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL
    );
  `);

  // === AGENDAMENTOS ===
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT,
      grupo TEXT,
      mensagem TEXT NOT NULL,
      horario TEXT NOT NULL,
      dias TEXT NOT NULL
    );
  `);

  // === GRUPOS ===
  db.run(`
    CREATE TABLE IF NOT EXISTS grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    );
  `);

  // === RELAÇÃO GRUPO_CONTATOS ===
  db.run(`
    CREATE TABLE IF NOT EXISTS grupo_contatos (
      grupo_id INTEGER,
      contato_id INTEGER,
      PRIMARY KEY (grupo_id, contato_id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id),
      FOREIGN KEY (contato_id) REFERENCES contatos(id)
    );
  `);
});

module.exports = db;
