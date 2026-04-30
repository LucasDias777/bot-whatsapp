const db = require("../database/database");

function validarNumeroBR(numero) {
  if (!numero) return false;

  const apenasDigitos = String(numero).replace(/\D/g, "");

  if (apenasDigitos.startsWith("55")) {
    const restante = apenasDigitos.slice(2);

    if (/^\d{11}$/.test(restante) && /^9\d{8}$/.test(restante.slice(2))) {
      return apenasDigitos;
    }
  }

  if (/^\d{11}$/.test(apenasDigitos)) {
    return `55${apenasDigitos}`;
  }

  return false;
}

function formatarNumero(numeroCom55) {
  return `+${numeroCom55.slice(0, 2)} (${numeroCom55.slice(2, 4)}) ${numeroCom55.slice(4, 9)}-${numeroCom55.slice(9)}`;
}

async function validarWhatsApp(numeroCom55) {
  const candidatos = [numeroCom55, `${numeroCom55}@c.us`];

  try {
    const client = global.client;

    if (!client || !client.pupPage) {
      return { ok: false, reason: "client_unavailable" };
    }

    for (const candidato of candidatos) {
      const id = await client.getNumberId(candidato);
      if (id) {
        return { ok: true, jid: id._serialized || candidato };
      }
    }

    return { ok: false, reason: "not_found" };
  } catch (err) {
    console.error("Erro ao checar WhatsApp:", err?.message || err);
    return { ok: false, reason: "validation_error" };
  }
}

function responderFalhaValidacaoWhatsApp(res, validacao) {
  if (validacao.reason === "client_unavailable") {
    return res.status(503).json({
      ok: false,
      erro: "O WhatsApp ainda esta sincronizando. Tente novamente em alguns segundos.",
    });
  }

  if (validacao.reason === "validation_error") {
    return res.status(503).json({
      ok: false,
      erro: "Nao foi possivel validar o numero no WhatsApp agora. Tente novamente em alguns segundos.",
    });
  }

  return res.status(400).json({
    ok: false,
    erro: "Numero nao encontrado no WhatsApp.",
  });
}

exports.adicionarContato = async (req, res) => {
  try {
    const { numero, nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ ok: false, erro: "Nome obrigatorio." });
    }

    const numeroNormalizado = validarNumeroBR(numero);
    if (!numeroNormalizado) {
      return res.status(400).json({
        ok: false,
        erro: "Numero invalido. Formato esperado: DDD + 9XXXXXXXX (ex: (44) 99999-9999).",
      });
    }

    db.get("SELECT id FROM contatos WHERE numero = ?", [numeroNormalizado], async (err, row) => {
      if (err) {
        console.error("Erro DB ao checar duplicado:", err);
        return res.status(500).json({ ok: false, erro: err.message });
      }

      if (row) {
        return res.status(400).json({
          ok: false,
          erro: `Numero ja cadastrado: ${formatarNumero(numeroNormalizado)}`,
        });
      }

      const validacao = await validarWhatsApp(numeroNormalizado);
      if (!validacao.ok) {
        return responderFalhaValidacaoWhatsApp(res, validacao);
      }

      db.run(
        "INSERT INTO contatos (numero, nome) VALUES (?, ?)",
        [numeroNormalizado, nome.trim()],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ ok: false, erro: insertErr.message });
          }

          return res.json({ ok: true });
        },
      );
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, erro: "Erro interno." });
  }
};

exports.listarContatos = (req, res) => {
  db.all("SELECT * FROM contatos", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, err: err.message });
    }

    return res.json(rows);
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
      console.error("Erro verificacao:", err);
      return res.status(500).json({ ok: false });
    }

    if (row) {
      return res.status(400).json({ ok: false });
    }

    db.run("DELETE FROM grupo_contatos WHERE contato_id = ?", [id], (deleteGroupErr) => {
      if (deleteGroupErr) {
        console.error("Erro grupo_contatos:", deleteGroupErr);
        return res.status(500).json({ ok: false });
      }

      db.run("DELETE FROM contatos WHERE id = ?", [id], (deleteContatoErr) => {
        if (deleteContatoErr) {
          console.error("Erro contatos:", deleteContatoErr);
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
    const { numero, nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ ok: false, erro: "Nome obrigatorio." });
    }

    const numeroNormalizado = validarNumeroBR(numero);
    if (!numeroNormalizado) {
      return res.status(400).json({
        ok: false,
        erro: "Numero invalido. Formato esperado: DDD + 9XXXXXXXX (ex: (44) 99999-9999).",
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
          return res.status(400).json({
            ok: false,
            erro: `Numero ja cadastrado: ${formatarNumero(numeroNormalizado)}`,
          });
        }

        const validacao = await validarWhatsApp(numeroNormalizado);
        if (!validacao.ok) {
          return responderFalhaValidacaoWhatsApp(res, validacao);
        }

        db.run(
          "UPDATE contatos SET numero = ?, nome = ? WHERE id = ?",
          [numeroNormalizado, nome.trim(), id],
          function onUpdate(updateErr) {
            if (updateErr) {
              return res.status(500).json({ ok: false, erro: updateErr.message });
            }

            return res.json({ ok: true, changes: this.changes });
          },
        );
      },
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, erro: "Erro interno." });
  }
};
