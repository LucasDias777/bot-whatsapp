function formatarMensagemWhatsApp(texto) {
  if (!texto) return "";

  let msg = String(texto);

  // ✅ Converte \n literal em quebra real
  msg = msg.replace(/\\n/g, "\n");

  // ✅ Normaliza bullets estranhos
  msg = msg.replace(/[•●◦]/g, "•");

  // ✅ Remove espaços invisíveis quebrados
  msg = msg.replace(/\u00A0/g, " ");

  // ✅ Remove linhas excessivas (mais de 2 vazias)
  msg = msg.replace(/\n{3,}/g, "\n\n");

  // ✅ Trim geral
  msg = msg.trim();

  return msg;
}

async function sendMessageToNumber(client, rawNumero, mensagem) {
  try {
    if (!mensagem || !client) return;

    // ✅ Limpa número
    const numero = String(rawNumero).replace(/\D/g, "");

    // ✅ Valida se tem WhatsApp
    const numberDetails = await client.getNumberId(numero);
    if (!numberDetails) {
      console.log(`❌ O número ${numero} não possui WhatsApp`);
      return;
    }
    const chatId = numberDetails._serialized;

    // ✅ FORMATAÇÃO CENTRALIZADA AQUI
    const mensagemFormatada = formatarMensagemWhatsApp(mensagem);

    await client.sendMessage(chatId, mensagemFormatada);

    console.log(`✅ Mensagem enviada para ${numero}`);
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err.message);
  }
}

module.exports = { sendMessageToNumber };