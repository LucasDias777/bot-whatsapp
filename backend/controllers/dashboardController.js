const db = require("../database/database"); // ajuste se o caminho for diferente

async function getDashboard(req, res) {
  try {
    /** ===============================
     * Usuários Ativos (WhatsApp)
     * =============================== */
    let usuariosAtivos = 0;

    if (global.client) {
      const contacts = await global.client.getContacts();
      const contatosFiltrados = contacts.filter(
        c => !c.isGroup && c.id?.user
    );

      usuariosAtivos = contatosFiltrados.length;
    }

    /** ===============================
     * Total de números cadastrados
     * =============================== */
    const totalNumeros = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM contatos`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    res.json({
  usuariosAtivos,
  grafico: {
    totalNumeros,
  }
});


  } catch (error) {
    console.error("Erro dashboard:", error);
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
}

module.exports = { getDashboard };
