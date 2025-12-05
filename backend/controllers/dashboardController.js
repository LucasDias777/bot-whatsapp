const db = require("../database/database");
const { getContadorHoje } = require("../services/contadorDiario");

/**
 * Retorna lista de chats (id, isGroup, name opcional) usando window.Store.
 */
async function getAllChats(client) {
  try {
    return await client.pupPage.evaluate(() => {
      if (!window.Store || !window.Store.Chat || !window.Store.Chat.getModelsArray) return [];

      return window.Store.Chat.getModelsArray()
        .filter(chat => {
          try {
            if (!chat?.id?._serialized) return false;
            if (chat.isBroadcast) return false;
            if (chat.isNewsletter) return false;
            return true;
          } catch (e) {
            return false;
          }
        })
        .map(chat => ({
          id: chat.id._serialized,
          isGroup: chat.id._serialized.endsWith("@g.us"),
          formattedName: (chat.__x_formattedTitle || chat.name || (chat.contact && chat.contact.formattedName) || null)
        }));
    });
  } catch (err) {
    console.error("Erro getAllChats:", err);
    return [];
  }
}

/**
 * Controller do Dashboard
 */
async function getDashboard(req, res) {
  try {
    // total de números no banco
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

    if (client?.info?.wid && client.pupPage) {
      // Pegar chats
      const chats = await getAllChats(client);

      chatsAtivos = chats.length;
      chatsGrupos = chats.filter(c => c.isGroup).length;
      chatsIndividuais = chats.filter(c => !c.isGroup).length;

      /**
       * 📌 **NOVO** — Mensagens do dia usando o contador otimizado
       */
      mensagensHoje = await getContadorHoje();

      /**
       * 📌 CONTATOS ONLINE — mantido igual
       */
      try {
        contatosOnline = await client.pupPage.evaluate(() => {
          const chats = window.Store?.Chat?.getModelsArray?.() || [];

          const onlineCount = chats.reduce((acc, chat) => {
            try {
              const isGroup = chat.id?._serialized?.endsWith("@g.us");
              if (isGroup) return acc;

              if (chat?.presence?.isOnline) return acc + 1;

              if (chat?.presences && typeof chat.presences === "object") {
                const values = Object.values(chat.presences);
                if (values.some(p => p?.isOnline === true)) return acc + 1;
              }

              if (chat?.isOnline === true) return acc + 1;

              return acc;
            } catch (e) {
              return acc;
            }
          }, 0);

          return onlineCount;
        });
      } catch (err) {
        console.error("Erro ao recuperar contatosOnline:", err);
        contatosOnline = 0;
      }
    }

    // Resposta para o frontend
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