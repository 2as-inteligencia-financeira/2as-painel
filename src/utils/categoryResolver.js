export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function isCategoryCode(value) {
  return /^\d+([.,]\d+)?$/.test(String(value ?? "").trim());
}

export function hasCategoryName(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "Sem categoria") return false;
  const normalized = normalizeText(text);
  if (normalized === "SEM CATEGORIA" || normalized === "CATEGORIA NAO MAPEADA" || normalized === "NAO MAPEADA") return false;
  if (isCategoryCode(text)) return false;
  if (/^ID:\s*\d+$/i.test(text)) return false;
  return true;
}

export function inferCategoryFromContext(context = {}) {
  const text = normalizeText(`${context.fornecedor || ""} ${context.descricao || ""} ${context.categoria || ""}`);
  if (!text) return "";

  if (/FGTS/.test(text)) {
    if (/ACADEMICO/.test(text)) return "OPEX/ACADEMICO/FGTS";
    if (/REVENUE OPS/.test(text)) return "OPEX/REVENUE OPS/FGTS";
    if (/TECNOLOGIA|TECH/.test(text)) return "OPEX/TECH/FGTS";
    return "OPEX/ADMINISTRATIVO/FGTS";
  }

  if (/TOTAL\s*PASS|TOTALPASS/.test(text)) {
    if (/ACADEMICO/.test(text)) return "OPEX/ACADEMICO/OUTROS BENEFICIOS";
    if (/TECNOLOGIA|TECH/.test(text)) return "OPEX/TECH/OUTROS BENEFICIOS";
    if (/OPERACOES|FINANCEIRO|ADMINISTRATIVO/.test(text)) return "OPEX/ADMINISTRATIVO/OUTROS BENEFICIOS";
    return "OPEX/REVENUE OPS/OUTROS BENEFICIOS";
  }

  if (/HONORARIO|ADVOCAT|CUSTAS|PROCESSUA|AUTO DE INFRACAO|INFRACAO|SP\s*TJ|TJ\b/.test(text)) {
    return "OPEX/DESPESAS ADMINISTRATIVAS/HONORARIOS ADVOCATICIOS";
  }

  if (/MARKETING|AGENCIA DE MARKETING|BCJ DIGITAL/.test(text)) {
    return "OPEX/REVENUE OPS/PRESTACAO DE SERVICOS (PJ)";
  }

  if (/SERVICOS PRESTADOS|PRESTACAO DE SERVICOS|PGTO DE SERVICOS/.test(text)) {
    if (/ACADEMICO/.test(text)) return "OPEX/ACADEMICO/PRESTACAO DE SERVICOS (PJ)";
    if (/TECNOLOGIA|TECH/.test(text)) return "OPEX/TECH/PRESTACAO DE SERVICOS (PJ)";
    return "OPEX/REVENUE OPS/PRESTACAO DE SERVICOS (PJ)";
  }

  return "";
}

export function resolveCategory(row = {}, context = {}) {
  const candidates = [
    row.CATEGORIA_NOME,
    row.NOME_CATEGORIA,
    row["NOME CATEGORIA"],
    row.CATEGORIA_DESCRICAO,
    row["CATEGORIA DESCRICAO"],
    row["CATEGORIA_DESCRIÇÃO"],
    row["CATEGORIA DESCRIÇÃO"],
    row.DESCRICAO_CATEGORIA,
    row["DESCRICAO CATEGORIA"],
    row["DESCRIÇÃO_CATEGORIA"],
    row["DESCRIÇÃO CATEGORIA"],
    row.CATEGORIA,
    row.CC_DESTINO,
    row.AREA,
    row.CENTRO_CUSTO,
  ];

  const named = candidates.find(hasCategoryName);
  if (named) return String(named).trim();

  const inferred = inferCategoryFromContext({
    fornecedor: context.fornecedor ?? row.FORNECEDOR ?? row.BANCO_ORIGEM ?? row.NOME,
    descricao: context.descricao ?? row.DESCRICAO ?? row["DESCRIÇÃO"] ?? row.HISTORICO ?? row["HISTÓRICO"],
    categoria: context.categoria ?? row.CATEGORIA,
  });

  return inferred || "Sem categoria";
}
