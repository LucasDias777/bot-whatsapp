const cron = require("node-cron");
const db = require("../database/database.js");
const { getConnectedConnectionEntries, normalizeConnectionIds } = require("./connectionRegistry.js");
const { sendMessageToNumber } = require("./envio.js");

let agendamentoTask = null;
const execucoesRecentes = new Set();

function getMinuteKey(date = new Date()) {
  return date.toISOString().slice(0, 16);
}

function getHoraAtual(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function getDiaSemanaAtual(date = new Date()) {
  return date.getDay();
}

function normalizarDias(diasRaw) {
  try {
    const dias = JSON.parse(diasRaw || "[]");
    if (!Array.isArray(dias)) return [];
    return dias.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  } catch {
    return [];
  }
}

function limparExecucoesAntigas(currentMinuteKey) {
  for (const key of execucoesRecentes) {
    if (!key.endsWith(currentMinuteKey)) {
      execucoesRecentes.delete(key);
    }
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function processarAgendamento(agendamento, minuteKey) {
  const dias = normalizarDias(agendamento.dias);
  const diaSemana = getDiaSemanaAtual();

  if (!dias.includes(diaSemana)) {
    return;
  }

  const connectionIds = normalizeConnectionIds(agendamento.connection_ids);
  const connections = getConnectedConnectionEntries(connectionIds);

  if (!connections.length) {
    console.warn(`Agendamento #${agendamento.id} sem conexoes WhatsApp disponiveis.`);
    return;
  }

  if (agendamento.grupo_id) {
    const contatos = await runQuery(
      `
      SELECT c.numero
      FROM grupo_contatos gc
      JOIN contatos c ON gc.contato_id = c.id
      WHERE gc.grupo_id = ?
      `,
      [agendamento.grupo_id],
    );

    if (!contatos.length) {
      console.warn(`Agendamento #${agendamento.id} sem contatos no grupo.`);
      return;
    }

    for (const connection of connections) {
      const executionKey = `${agendamento.id}:${connection.id}:${minuteKey}`;
      if (execucoesRecentes.has(executionKey)) continue;

      execucoesRecentes.add(executionKey);
      console.log(`Processando agendamento #${agendamento.id} via ${connection.name || connection.id}`);

      const resultados = await Promise.all(
        contatos.map((contato) => sendMessageToNumber(connection.client, contato.numero, agendamento.mensagem)),
      );

      const falhas = resultados.filter((resultado) => !resultado.ok);
      if (falhas.length) {
        console.warn(`Agendamento #${agendamento.id} teve ${falhas.length} falha(s) no envio para grupo via ${connection.name || connection.id}.`);
      }
    }

    return;
  }

  if (agendamento.contato_id) {
    const contato = await runGet("SELECT numero FROM contatos WHERE id = ?", [agendamento.contato_id]);

    if (!contato?.numero) {
      console.warn(`Agendamento #${agendamento.id} sem contato valido.`);
      return;
    }

    for (const connection of connections) {
      const executionKey = `${agendamento.id}:${connection.id}:${minuteKey}`;
      if (execucoesRecentes.has(executionKey)) continue;

      execucoesRecentes.add(executionKey);
      console.log(`Processando agendamento #${agendamento.id} via ${connection.name || connection.id}`);

      const resultado = await sendMessageToNumber(connection.client, contato.numero, agendamento.mensagem);
      if (!resultado.ok) {
        console.warn(`Agendamento #${agendamento.id} falhou via ${connection.name || connection.id}: ${resultado.error}`);
      }
    }
    return;
  }

  console.warn(`Agendamento #${agendamento.id} sem contato nem grupo.`);
}

async function verificarAgendamentos() {
  const agora = new Date();
  const horaAtual = getHoraAtual(agora);
  const minuteKey = getMinuteKey(agora);

  limparExecucoesAntigas(minuteKey);

  try {
    const rows = await runQuery(
      `
      SELECT
        a.id,
        a.contato_id,
        a.grupo_id,
        a.horario,
        a.dias,
        a.connection_ids,
        m.texto AS mensagem
      FROM agendamentos a
      JOIN mensagens m ON a.mensagem_id = m.id
      WHERE a.horario = ?
      `,
      [horaAtual],
    );

    if (!rows.length) {
      return;
    }

    for (const agendamento of rows) {
      try {
        await processarAgendamento(agendamento, minuteKey);
      } catch (error) {
        console.error(`Erro processando agendamento #${agendamento.id}:`, error?.message || error);
      }
    }
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error?.message || error);
  }
}

function iniciarAgendamentos() {
  pararAgendamentos();

  agendamentoTask = cron.schedule("*/10 * * * * *", () => {
    void verificarAgendamentos();
  });

  console.log("Agendador iniciado");
}

function pararAgendamentos() {
  if (agendamentoTask) {
    agendamentoTask.stop();
    agendamentoTask.destroy();
    agendamentoTask = null;
  }

  execucoesRecentes.clear();
}

module.exports = { iniciarAgendamentos, pararAgendamentos };
