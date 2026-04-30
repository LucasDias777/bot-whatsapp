const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// CAMINHO ABSOLUTO DO ARQUIVO
const dbPath = path.resolve(__dirname, "database.db");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL,
      nome TEXT,
      grupo TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS grupo_contatos (
      grupo_id INTEGER,
      contato_id INTEGER,
      PRIMARY KEY (grupo_id, contato_id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id),
      FOREIGN KEY (contato_id) REFERENCES contatos(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contato_id INTEGER,
      grupo_id INTEGER,
      mensagem_id INTEGER NOT NULL,
      horario TEXT NOT NULL,
      dias TEXT NOT NULL,
      connection_ids TEXT,
      FOREIGN KEY (contato_id) REFERENCES contatos(id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id),
      FOREIGN KEY (mensagem_id) REFERENCES mensagens(id)
    );
  `);

  db.all("PRAGMA table_info(agendamentos)", [], (err, columns = []) => {
    if (err) {
      console.error("Erro ao verificar colunas de agendamentos:", err.message);
      return;
    }

    const hasConnectionIds = columns.some((column) => column.name === "connection_ids");
    if (!hasConnectionIds) {
      db.run("ALTER TABLE agendamentos ADD COLUMN connection_ids TEXT");
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens_diarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      dia TEXT NOT NULL,
      contador INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      connected_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

module.exports = db;
