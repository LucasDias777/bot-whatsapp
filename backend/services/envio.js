function formatarMensagemWhatsApp(texto) {
  if (!texto) return "";

  let msg = String(texto);

  msg = msg.replace(/\\n/g, "\n");
  msg = msg.replace(/[•●◦]/g, "•");
  msg = msg.replace(/\u00A0/g, " ");
  msg = msg.replace(/\n{3,}/g, "\n\n");
  msg = msg.trim();

  return msg;
}

async function sendMessageToNumber(client, rawNumero, mensagem) {
  try {
    if (!mensagem || !client) return;

    const numero = String(rawNumero).replace(/\D/g, "");

    const numberDetails = await client.getNumberId(numero);
    if (!numberDetails) {
      console.log(`❌ O número ${numero} não possui WhatsApp`);
      return;
    }
    const chatId = numberDetails._serialized;

    const mensagemFormatada = formatarMensagemWhatsApp(mensagem);

    await client.sendMessage(chatId, mensagemFormatada);

    console.log(`✅ Mensagem enviada para ${numero}`);
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err.message);
  }
}

module.exports = { sendMessageToNumber };