const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// caminho do arquivo de agendamentos
const AGENDAMENTOS_FILE = path.join(__dirname, "agendamentos.json");

// ====== CLIENTE COM SESSÃO SALVA ======
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "session-amazonas" }),
});

// ====== MOSTRA QR CODE SOMENTE SE NÃO HOUVER SESSÃO ======
let precisaQR = true;

client.on("authenticated", () => {
  precisaQR = false;
  console.log("🔑 Sessão autenticada com sucesso!");
});

client.on("qr", (qr) => {
  if (!precisaQR) return;
  console.clear();
  console.log("📱 Escaneie o QR Code abaixo com o WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("auth_failure", () =>
  console.log("❌ Falha na autenticação. Exclua a pasta .wwebjs_auth e tente novamente.")
);

// ========== FUNÇÕES AUXILIARES ==========
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const normalizeNumber = (raw) => (raw ? raw.toString().replace(/\D/g, "") : "");

// mantém tarefas agendadas
let scheduledTasks = [];

// ========== FUNÇÃO PRINCIPAL ==========
async function performSend(destinatarios, mensagem) {
  const me = client.info.wid._serialized;
  const contatos = await client.getContacts();

  for (const dest of destinatarios) {
    if (dest.numero === me) {
      console.log(`⏭️ Ignorado: '${dest.nome}' é o próprio número do bot.`);
      continue;
    }

    try {
      // tenta achar contato salvo
      let contato = contatos.find(
        (c) =>
          c.name === dest.nome ||
          c.pushname === dest.nome ||
          c.shortName === dest.nome
      );

      if (contato) {
        await client.sendMessage(contato.id._serialized, mensagem);
        console.log(`✅ Mensagem enviada para contato salvo: ${dest.nome}`);
      } else {
        await client.sendMessage(`${dest.numero}@c.us`, mensagem);
        console.log(`📞 '${dest.nome}' não salvo — enviado via número direto.`);
      }
    } catch (erro) {
      console.error(`❌ Erro ao enviar para ${dest.nome}:`, erro);
    }
  }

  console.log("📨 Envio finalizado! ✅");
}

// ========== CARREGA E AGENDA ==========
async function loadAndSchedule() {
  // cancela tarefas antigas
  for (const t of scheduledTasks) {
    try { t.stop(); } catch {}
  }
  scheduledTasks = [];

  let raw;
  try {
    raw = fs.readFileSync(AGENDAMENTOS_FILE, "utf8");
  } catch (err) {
    console.error("❌ Erro ao ler agendamentos.json:", err.message);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("❌ agendamentos.json inválido (JSON parse). Corrija e salve.", err.message);
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.log("ℹ️ agendamentos.json vazio — adicione objetos de agendamento.");
    return;
  }

  for (const ag of parsed) {
    if (!ag.hora || !ag.mensagem || !Array.isArray(ag.destinatarios)) {
      console.warn("⚠️ Agendamento inválido:", ag);
      continue;
    }

    const [hh, mm] = ag.hora.split(":").map((n) => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      console.warn("⚠️ Hora inválida:", ag.hora);
      continue;
    }

    const cronExpr = `${mm} ${hh} * * *`; // envia todos os dias no mesmo horário

    console.log(`🕒 Agendando: ${ag.hora} — "${ag.mensagem.slice(0, 40)}..."`);

    const task = cron.schedule(
      cronExpr,
      async () => {
        console.log(`\n⏱️ ${ag.hora} — iniciando envio programado...`);
        await performSend(ag.destinatarios, ag.mensagem);
      },
      { scheduled: true }
    );

    scheduledTasks.push(task);
  }

  console.log(`✅ ${scheduledTasks.length} agendamento(s) ativo(s).`);
}

// observa o arquivo e recarrega ao salvar
let reloadTimeout = null;
fs.watchFile(AGENDAMENTOS_FILE, { interval: 2000 }, (curr, prev) => {
  if (curr.mtimeMs === prev.mtimeMs) return;
  if (reloadTimeout) clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    console.log("🔁 agendamentos.json alterado — recarregando agendamentos...");
    loadAndSchedule();
  }, 500);
});

// ====== QUANDO CONECTAR ======
client.on("ready", async () => {
  console.log("✅ WhatsApp conectado com sucesso!");
  await loadAndSchedule();
});

// ====== INICIALIZA ======
client.initialize();
