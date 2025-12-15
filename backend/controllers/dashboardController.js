const db = require("../database/database");
const { getContadorHoje } = require("../services/contadorDiario");

// -----------------------------
// Função para retornar todos os chats
// -----------------------------
async function getAllChats(client) {
  if (!client || global.isDisconnecting || !client.pupPage) {
    return [];
  }

  try {
    return await client.pupPage.evaluate(() => {
      if (!window.Store || !window.Store.Chat || !window.Store.Chat.getModelsArray)
        return [];

      return window.Store.Chat.getModelsArray()
        .filter(chat => {
          try {
            if (!chat?.id?._serialized) return false;
            if (chat.isBroadcast) return false;
            if (chat.isNewsletter) return false;
            return true;
          } catch {
            return false;
          }
        })
        .map(chat => ({
          id: chat.id._serialized,
          isGroup: chat.id._serialized.endsWith("@g.us"),
          formattedName:
            chat.__x_formattedTitle ||
            chat.name ||
            (chat.contact && chat.contact.formattedName) ||
            null
        }));
    });
  } catch {
    // 🔇 SILENCIOSO DE VERDADE (produção)
    return [];
  }
}
// -----------------------------
// CONTROLLER DO DASHBOARD
// -----------------------------
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

    if (client?.info?.wid && client.pupPage) {

      // 🟦 PEGAR LISTA DE CHATS
      const chats = await getAllChats(client);

      chatsAtivos = chats.length;
      chatsGrupos = chats.filter(c => c.isGroup).length;
      chatsIndividuais = chats.filter(c => !c.isGroup).length;

      // 🟩 MENSAGENS DO DIA
      mensagensHoje = await getContadorHoje();
    }

    // -----------------------------
    // NOVAS MÉTRICAS
    // -----------------------------
    const cpuUso = global.cpuUsage ?? 0;

    const tempoConexao = global.whatsappStartTime
      ? Date.now() - global.whatsappStartTime
      : 0;

    const tempoUltimoQR = global.lastQRCodeTime
      ? Date.now() - global.lastQRCodeTime
      : 0;

    const reconexoes = global.reconnectCount ?? 0;

    // -----------------------------
    // JSON FINAL ENVIADO AO DASHBOARD
    // -----------------------------
    res.json({
      grafico: { totalNumeros },
      metricas: {
        chatsAtivos,
        chatsIndividuais,
        chatsGrupos,
        mensagensHoje,
        cpuUso,
        tempoConexao,
        tempoUltimoQR,
        reconexoes
      }
    });

  } catch (error) {
    console.error("Erro dashboard:", error);
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
}

module.exports = { getDashboard };