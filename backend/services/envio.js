async function sendMessageToNumber(client, rawNumero, mensagem) {
  try {
    // Remove caracteres não numéricos
    const numero = rawNumero.replace(/\D/g, "");

    // Verifica se o número é válido e obtém o ID completo
    const numberDetails = await client.getNumberId(numero);

    if (!numberDetails) {
      console.log(`❌ O número ${numero} não tem WhatsApp.`);
      return;
    }

    // Usa o _serialized correto (ex: 5544999999999@c.us)
    const chatId = numberDetails._serialized;

    // Envia a mensagem
    await client.sendMessage(chatId, mensagem);
    console.log(`✅ Mensagem enviada para ${numero}`);

  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err.message);
  }
}

module.exports = { sendMessageToNumber };