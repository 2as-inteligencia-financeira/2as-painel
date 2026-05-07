const CONNECTOR_SYNC_LOG = new Map();
const MAX_HISTORY = 20;

function nowIso() {
  return new Date().toISOString();
}

export function registerConnectorSync(provider, status, details = {}) {
  const history = CONNECTOR_SYNC_LOG.get(provider) || [];
  history.unshift({
    provider,
    status,
    timestamp: nowIso(),
    details,
  });
  CONNECTOR_SYNC_LOG.set(provider, history.slice(0, MAX_HISTORY));
}

export function connectorHealth(provider) {
  const history = CONNECTOR_SYNC_LOG.get(provider) || [];
  const last = history[0] || null;
  return {
    provider,
    lastStatus: last?.status || "unknown",
    lastSyncAt: last?.timestamp || null,
    recentErrors: history.filter(item => item.status === "error").slice(0, 5),
  };
}
