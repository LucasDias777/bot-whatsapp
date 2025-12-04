const db = require("../database/database");

async function getAllChats(client) {
  try {
    return await client.pupPage.evaluate(() => {
      if (!window.Store || !window.Store.Chat) return [];

      return window.Store.Chat.getModelsArray()
        .filter(chat => {
          if (!chat?.id?._serialized) return false;
          if (chat.isBroadcast) return false;
          if (chat.isNewsletter) return false;
          return true;
        })
        .map(chat => ({
          id: chat.id._serialized,
          // ✅ REGRA CORRETA
          isGroup: chat.id._serialized.endsWith("@g.us")
        }));
    });
  } catch (err) {
    console.error("Erro getAllChats:", err);
    return [];
  }
}

// Controller do Dashboard
async function getDashboard(req, res) {
  try {
    const totalNumeros = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) AS total FROM contatos`, (err, row) => {
        if (err) reject(err);
        else resolve(row?.total ?? 0);
      });
    });

    const client = global.client;

    let chatsAtivos = 0;
    let chatsIndividuais = 0;
    let chatsGrupos = 0;
    let mensagensHoje = 0;
    let contatosOnline = 0;

    if (client?.info?.wid) {
      const chats = await getAllChats(client);

      chatsAtivos = chats.length;
      chatsGrupos = chats.filter(c => c.isGroup).length;
      chatsIndividuais = chats.filter(c => !c.isGroup).length;

      /* ================================
         📌 MENSAGENS ENVIADAS HOJE
      ================================= */
      try {
        mensagensHoje = await client.pupPage.evaluate(() => {
          const msgs = window.Store?.Msg?.getModelsArray?.() || [];
          const inicioDoDia = new Date();
          inicioDoDia.setHours(0, 0, 0, 0);
          const inicioTimestamp = Math.floor(inicioDoDia.getTime() / 1000); // WhatsApp usa segundos

          return msgs.filter(msg =>
            msg?.id?.fromMe &&
            Number(msg?.t) >= inicioTimestamp
          ).length;
        });
      } catch (err) {
        console.error("Erro ao recuperar mensagensHoje:", err);
        mensagensHoje = 0;
      }

      /* ================================
         📌 CONTATOS ONLINE AGORA
      ================================= */
      try {
        contatosOnline = await client.pupPage.evaluate(() => {
          const chats = window.Store?.Chat?.getModelsArray?.() || [];

          return chats.filter(chat =>
            chat?.presence?.isOnline === true
          ).length;
        });
      } catch (err) {
        console.error("Erro ao recuperar contatosOnline:", err);
        contatosOnline = 0;
      }
    }

    res.json({
      grafico: { totalNumeros },
      metricas: {
        chatsAtivos,
        chatsIndividuais,
        chatsGrupos,
        mensagensHoje,
        contatosOnline
      }
    });

  } catch (error) {
    console.error("Erro dashboard:", error);
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
}

module.exports = { getDashboard };