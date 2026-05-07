function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toCanonicalPayableRows(rows = []) {
  return rows.map((row) => ({
    sourceId: String(row.ID || row.id || ""),
    dueDate: String(row.DATA_VENCIMENTO || row.data_vencimento || ""),
    paymentDate: String(row.DATA_PAGAMENTO || row.data_pagamento || ""),
    account: String(row.CONTA || row.conta || ""),
    category: String(row.CATEGORIA || row.categoria || ""),
    supplier: String(row.FORNECEDOR || row.fornecedor || ""),
    description: String(row.DESCRICAO || row.descricao || ""),
    grossValue: toNumber(row.VALOR_BRUTO || row.valor_bruto),
    netValue: toNumber(row.VALOR_LIQUIDO || row.valor_liquido),
    deductions: toNumber(row.VALOR_DEDUCOES || row.valor_deducoes),
    status: String(row.STATUS || row.status || ""),
  }));
}

export function normalizeIntegrationPayload(provider, payload = {}, entity = "payables") {
  const rawRows = payload.rows || [];
  return {
    provider,
    entity,
    syncedAt: new Date().toISOString(),
    sourceUpdatedAt: payload.updatedAt || null,
    interval: payload.interval || null,
    meta: Array.isArray(payload.meta) ? payload.meta : [],
    // `rows` mantém contrato legado para evitar regressões no frontend atual.
    rows: rawRows,
    canonicalRows: entity === "payables" ? toCanonicalPayableRows(rawRows) : rawRows,
    raw: payload,
  };
}
