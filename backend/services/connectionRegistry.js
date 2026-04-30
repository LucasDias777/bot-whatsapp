function normalizeConnectionIds(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeConnectionIds(parsed);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function getConnectedConnectionEntries(connectionIds = []) {
  const selectedIds = new Set(normalizeConnectionIds(connectionIds));
  const connectedConnections = Array.isArray(global.connectedConnections) ? global.connectedConnections : [];
  const clients = global.connectionClients instanceof Map ? global.connectionClients : new Map();

  return connectedConnections
    .filter((connection) => connection?.id && connection.status === "connected")
    .filter((connection) => selectedIds.size === 0 || selectedIds.has(connection.id))
    .map((connection) => ({
      ...connection,
      client: clients.get(connection.id),
    }))
    .filter((connection) => connection.client);
}

module.exports = {
  getConnectedConnectionEntries,
  normalizeConnectionIds,
};
