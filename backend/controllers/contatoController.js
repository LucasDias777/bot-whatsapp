const db = require("../database/database");

function validarNumeroBR(numero) {
  if (!numero) return false;
  let apenasDigitos = String(numero).replace(/\D/g, "");

  if (apenasDigitos.startsWith("55")) {
    const restante = apenasDigitos.slice(2);
    
    if (/^\d{11}$/.test(restante) && /^9\d{8}$/.test(restante.slice(2))) {
      return apenasDigitos;
    }
  }

  if (/^\d{11}$/.test(apenasDigitos)) {
    return "55" + apenasDigitos;
  }
  return false;
}

async function validarWhatsApp(numeroCom55) {
  try {
    const client = global.client;
    if (!client) {
      return false;
    }

    const id = await client.getNumberId(numeroCom55);
    return !!id;
  } catch (err) {
    console.error(
      "Erro ao checar WhatsApp:",
      err && err.message ? err.message : err,
    );
    return false;
  }
}

exports.adicionarContato = async (req, res) => {
  try {
    let { numero, nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ ok: false, erro: "Nome obrigatório." });
    }

    const numeroNormalizado = validarNumeroBR(numero);
    if (!numeroNormalizado) {
      return res.status(400).json({
        ok: false,
        erro: "Número inválido. Formato esperado: DDD + 9XXXXXXXX (ex: (44) 99999-9999).",
      });
    }

    db.get(
      "SELECT id FROM contatos WHERE numero = ?",
      [numeroNormalizado],
      async (err, row) => {
        if (err) {
          console.error("Erro DB ao checar duplicado:", err);
          return res.status(500).json({ ok: false, erro: err.message });
        }

        if (row) {
          const display = `+${numeroNormalizado.slice(0, 2)} (${numeroNormalizado.slice(2, 4)})${numeroNormalizado.slice(4, 9)}-${numeroNormalizado.slice(9)}`;
          return res
            .status(400)
            .json({ ok: false, erro: `Número já cadastrado: ${display}` });
        }

        const temWhats = await validarWhatsApp(numeroNormalizado);
        if (!temWhats) {
          return res.status(400).json({
            ok: false,
            erro: "Número não encontrado no WhatsApp.",
          });
        }

        db.run(
          "INSERT INTO contatos (numero, nome) VALUES (?, ?)",
          [numeroNormalizado, nome.trim()],
          (err) => {
            if (err)
              return res.status(500).json({ ok: false, erro: err.message });
            return res.json({ ok: true });
          },
        );
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, erro: "Erro interno." });
  }
};

exports.listarContatos = (req, res) => {
  db.all("SELECT * FROM contatos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, err: err.message });
    res.json(rows);
  });
};

exports.removerContato = (req, res) => {
  const id = req.params.id;

  const sqlVerificaAgendamento = `
    SELECT 1 FROM agendamentos WHERE contato_id = ?
    UNION
    SELECT 1
    FROM agendamentos a
    JOIN grupo_contatos gc ON a.grupo_id = gc.grupo_id
    WHERE gc.contato_id = ?
    LIMIT 1
  `;

  db.get(sqlVerificaAgendamento, [id, id], (err, row) => {
    if (err) {
      console.error("Erro verificação:", err);
      return res.status(500).json({ ok: false });
    }

    if (row) {
      return res.status(400).json({ ok: false });
    }

    db.run("DELETE FROM grupo_contatos WHERE contato_id = ?", [id], (err) => {
      if (err) {
        console.error("Erro grupo_contatos:", err);
        return res.status(500).json({ ok: false });
      }

      db.run("DELETE FROM contatos WHERE id = ?", [id], (err) => {
        if (err) {
          console.error("Erro contatos:", err);
          return res.status(500).json({ ok: false });
        }

        return res.status(200).json({ ok: true });
      });
    });
  });
};

exports.editarContato = async (req, res) => {
  try {
    const id = req.params.id;
    let { numero, nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ ok: false, erro: "Nome obrigatório." });
    }

    const numeroNormalizado = validarNumeroBR(numero);
    if (!numeroNormalizado) {
      return res.status(400).json({
        ok: false,
        erro: "Número inválido. Formato esperado: DDD + 9XXXXXXXX (ex: (44) 99999-9999).",
      });
    }

    db.get(
      "SELECT id FROM contatos WHERE numero = ? AND id != ?",
      [numeroNormalizado, id],
      async (err, row) => {
        if (err) {
          console.error("Erro DB ao checar duplicado (editar):", err);
          return res.status(500).json({ ok: false, erro: err.message });
        }

        if (row) {
          const display = `+${numeroNormalizado.slice(0, 2)} (${numeroNormalizado.slice(2, 4)})${numeroNormalizado.slice(4, 9)}-${numeroNormalizado.slice(9)}`;
          return res
            .status(400)
            .json({ ok: false, erro: `Número já cadastrado: ${display}` });
        }

        const temWhats = await validarWhatsApp(numeroNormalizado);
        if (!temWhats) {
          return res.status(400).json({
            ok: false,
            erro: "Número não encontrado no WhatsApp.",
          });
        }

        db.run(
          "UPDATE contatos SET numero = ?, nome = ? WHERE id = ?",
          [numeroNormalizado, nome.trim(), id],
          function (err) {
            if (err)
              return res.status(500).json({ ok: false, erro: err.message });
            res.json({ ok: true, changes: this.changes });
          },
        );
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, erro: "Erro interno." });
  }
};