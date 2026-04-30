function formatarMensagemWhatsApp(texto) {
  if (!texto) return "";

  let msg = String(texto);

  msg = msg.replace(/\\n/g, "\n");
  msg = msg.replace(/\u00A0/g, " ");
  msg = msg.replace(/\n{3,}/g, "\n\n");
  msg = msg.trim();

  return msg;
}

function normalizarNumero(rawNumero) {
  return String(rawNumero || "").replace(/\D/g, "");
}

async function resolverChatId(client, numero) {
  const candidatos = [numero, `${numero}@c.us`];

  for (const candidato of candidatos) {
    const numberDetails = await client.getNumberId(candidato);
    if (numberDetails?._serialized) {
      return numberDetails._serialized;
    }
  }

  return null;
}

async function sendMessageToNumber(client, rawNumero, mensagem) {
  if (!mensagem || !client) {
    return {
      ok: false,
      reason: "client_unavailable",
      error: "Cliente WhatsApp indisponivel.",
    };
  }

  const numero = normalizarNumero(rawNumero);

  try {
    const chatId = await resolverChatId(client, numero);

    if (!chatId) {
      console.log(`Numero ${numero} nao possui WhatsApp`);
      return {
        ok: false,
        reason: "number_not_found",
        error: `Numero ${numero} nao possui WhatsApp.`,
      };
    }

    const mensagemFormatada = formatarMensagemWhatsApp(mensagem);

    await client.sendMessage(chatId, mensagemFormatada, {
      sendSeen: false,
      waitUntilMsgSent: true,
    });

    console.log(`Mensagem enviada para ${numero}`);
    return { ok: true, chatId };
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err?.message || err);
    return {
      ok: false,
      reason: "send_failed",
      error: err?.message || "Falha ao enviar mensagem.",
    };
  }
}

module.exports = { sendMessageToNumber };
