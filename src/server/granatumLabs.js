/* global process */

import { getDemoProfile, getDemoSheetCsv, isDemoCompany } from "./demoSheets.js";

const FUSO = "America/Sao_Paulo";
const TERMOS_DEDUCAO = ["ISS", "INSS", "IRRF", "IR ", "ASSISTENCIA MEDICA", "RESSARCIMENTO"];
const LABS_CACHE_TTL_MS = 5 * 60 * 1000;
const PERFIL_FLUXO_AJUSTADO = [
  "BANCO BRADESCO",
  "BANCO BTG -  DIRECAO EDITORA",
  "BANCO BTG - VEMAR EDITORA",
  "BANCO ITAU",
  "LIA (RECEBIDOS)",
  "PAGAR ME - DIRECAO EDITORA - RECEBIDOS",
  "PAGAR ME - RECEBEDOR DIRECAO EDITORA - (CONTA VEMAR)",
  "PAGAR ME - ERICK DOS SANTOS ALVES",
  "PAGAR ME 2.0 - RECEBIDOS",
  "PAGAR ME - ANDERSON ALMEIDA DE SANTANA",
];
const CONTAS_SAIDA = [
  "BANCO BTG -  DIRECAO EDITORA",
  "BANCO BTG - VEMAR EDITORA",
  "BANCO ITAU",
  "BANCO BRADESCO",
];

function parseDemoRows(text = "") {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQ && next === '"') { cur += '"'; i += 1; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      row.push(cur); cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cur);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = []; cur = "";
    } else {
      cur += ch;
    }
  }
  row.push(cur);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

function parseDemoCsv(text = "") {
  const rows = parseDemoRows(text);
  const headers = rows[0] || [];
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

function parseDemoContasCsv(text = "") {
  const rows = parseDemoRows(text);
  const headerIndex = rows.findIndex(row => row.includes("DATA_VENCIMENTO") || row.includes("DATA_PAGAMENTO"));
  const headers = rows[headerIndex] || rows[0] || [];
  return rows.slice(headerIndex + 1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

const toDemoNumber = value => Number(String(value || "0").replace(/\./g, "").replace(",", ".")) || 0;

function demoContasPayload(kind, companyId) {
  const key = kind === "pagas" ? "despesas_historico" : kind === "vencidas" ? "contas_vencidas" : "contas_pagar";
  const profile = getDemoProfile(companyId);
  const contaLabel = profile?.label ? `Demo · ${profile.label}` : "Luniq Demo";
  const rows = parseDemoContasCsv(getDemoSheetCsv(key, companyId)).map((row, index) => ({
    ...row,
    VALOR_BRUTO: toDemoNumber(row.VALOR_BRUTO),
    VALOR_DEDUCOES: toDemoNumber(row.VALOR_DEDUCOES),
    VALOR_LIQUIDO: toDemoNumber(row.VALOR_LIQUIDO || row.VALOR_BRUTO),
    ID: row.ID || `DEMO-${kind}-${index + 1}`,
    CONTA: contaLabel,
    DEDUCOES: [],
  }));
  const total = rows.reduce((sum, row) => sum + Math.abs(row.VALOR_LIQUIDO), 0);
  // Quando o perfil declara metas explícitas (TOTAL_7D/30D/60D ou TOTAL_VENCIDO),
  // priorizamos esses valores para que cada cenário demo conte uma história coerente.
  const metaPagar = profile?.contasPagar?.meta;
  const total7d = kind === "pagar" && metaPagar?.total7d != null
    ? metaPagar.total7d
    : rows.slice(0, 3).reduce((sum, row) => sum + Math.abs(row.VALOR_LIQUIDO), 0);
  const total30d = kind === "pagar" && metaPagar?.total30d != null
    ? metaPagar.total30d
    : rows.slice(0, 6).reduce((sum, row) => sum + Math.abs(row.VALOR_LIQUIDO), 0);
  const total60d = kind === "pagar" && metaPagar?.total60d != null
    ? metaPagar.total60d
    : total;
  const totalVencido = kind === "vencidas" && profile?.contasVencidas?.meta?.total != null
    ? profile.contasVencidas.meta.total
    : total;
  return {
    source: "demo_api",
    profile: profile?.label ? `LUNIQ_DEMO_${profile.label.toUpperCase()}` : "LUNIQ_DEMO",
    updatedAt: toBRDate(new Date()),
    interval: { inicio: rows[0]?.DATA_VENCIMENTO || rows[0]?.DATA_PAGAMENTO || "", fim: rows.at(-1)?.DATA_VENCIMENTO || rows.at(-1)?.DATA_PAGAMENTO || "" },
    meta: [
      { label: kind === "pagas" ? "TOTAL_PAGO" : kind === "vencidas" ? "TOTAL_VENCIDO" : "TOTAL_60D", value: kind === "pagar" ? total60d : kind === "vencidas" ? totalVencido : total },
      { label: "TOTAL_7D", value: total7d },
      { label: "TOTAL_30D", value: total30d },
      { label: "QTD_LANCAMENTOS", value: rows.length },
      { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
    ],
    rows,
    compositionSummary: { grupos: rows.length, comDeducoes: 0, itensDeducao: 0 },
  };
}
const HIST_CATEGORIAS_RECEITA = [
  "OUTRAS RECEITAS",
  "RENDIMENTO DE INVESTIMENTOS",
  "INTEGRALIZACAO DE CAPITAL",
  "MUTUO",
];
const HIST_SALDO_2024 = 0;
const HIST_SALDO_INI_2026 = 23945.69;

let contasPagarLabsCache = null;
let contasPagarLabsInflight = null;
const contasPagasLabsCache = new Map();
const contasPagasLabsInflight = new Map();
let contasVencidasLabsCache = null;
let contasVencidasLabsInflight = null;
let fluxoProjetadoLabsCache = null;
let fluxoProjetadoLabsInflight = null;

function getGranatumToken() {
  const token = String(process.env.GRANATUM_TOKEN || "").trim();
  if (!token) throw new Error("Missing GRANATUM_TOKEN");
  return token;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function granatumUrl(route, params = {}) {
  const token = getGranatumToken();
  const qs = new URLSearchParams({ access_token: token });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") qs.set(key, String(value));
  });
  return `https://api.granatum.com.br/v1/${route}?${qs.toString()}`;
}

async function fetchGranatum(route, params = {}) {
  const response = await fetch(granatumUrl(route, params), {
    headers: { "User-Agent": "Luniq-Painel/1.0" },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!response.ok) {
    throw new Error(json?.error?.message || text || `Granatum HTTP ${response.status}`);
  }
  return json;
}

async function fetchAllPages(route, params = {}) {
  let start = 0;
  let rows = [];
  while (true) {
    const page = await fetchGranatum(route, { ...params, limit: 500, start });
    const chunk = Array.isArray(page) ? page : [];
    rows = rows.concat(chunk);
    if (chunk.length < 500) break;
    start += 500;
  }
  return rows;
}

async function resolverContasFluxoAjustado() {
  const contas = await fetchGranatum("contas");
  const includes = PERFIL_FLUXO_AJUSTADO.map(normalizeText);
  return (Array.isArray(contas) ? contas : []).filter(conta =>
    includes.includes(normalizeText(conta.id)) ||
    includes.includes(normalizeText(conta.descricao))
  );
}

async function resolverContasPorNomes(nomes = []) {
  const contas = await fetchGranatum("contas");
  const includes = nomes.map(normalizeText);
  return (Array.isArray(contas) ? contas : []).filter(conta =>
    includes.includes(normalizeText(conta.id)) ||
    includes.includes(normalizeText(conta.descricao))
  );
}

async function getMapaCategorias() {
  const cats = await fetchGranatum("categorias", { tipo_view: "children" });
  const map = {};
  (Array.isArray(cats) ? cats : []).forEach(cat => {
    map[cat.id] = cat.descricao || "";
  });
  return map;
}

async function getMapaFornecedores() {
  const fornecedores = await fetchGranatum("fornecedores", { considerar_inativos: "true" });
  const map = {};
  (Array.isArray(fornecedores) ? fornecedores : []).forEach(f => {
    map[f.id] = {
      nome: f.nome || "",
      nomeFantasia: f.nome_fantasia || "",
    };
  });
  return map;
}

function categoriaContem(nomeCategoria, termos) {
  const nome = String(nomeCategoria || "").toUpperCase();
  return termos.some(term => nome.includes(term.toUpperCase()));
}

function nomeFornecedorLancamento(lancamento, mapaFornecedores) {
  const direto = lancamento?.fornecedor || lancamento?.pessoa || lancamento?.cliente_fornecedor;
  if (direto && typeof direto === "object") {
    return direto.nome_fantasia || direto.nome || direto.razao_social || direto.descricao || "";
  }
  if (typeof direto === "string") return direto;

  const camposTexto = [
    lancamento?.fornecedor_nome,
    lancamento?.nome_fornecedor,
    lancamento?.pessoa_nome,
    lancamento?.nome_pessoa,
  ];
  const porCampo = camposTexto.find(value => value && String(value).trim());
  if (porCampo) return String(porCampo).trim();

  const pessoaId = lancamento?.pessoa_id || lancamento?.fornecedor_id;
  const fornecedor = pessoaId ? mapaFornecedores[pessoaId] : null;
  return fornecedor?.nomeFantasia || fornecedor?.nome || "";
}

function agruparPorComposto(lancamentos, mapaCategorias) {
  const compostos = {};
  const simples = [];

  lancamentos.forEach(lancamento => {
    const cid = lancamento.lancamento_composto_id;
    const tipo = lancamento.tipo_lancamento_id;
    if (cid) {
      if (!compostos[cid]) compostos[cid] = [];
      compostos[cid].push(lancamento);
    } else if (tipo === 1) {
      if (lancamento.lancamento_transferencia_id) return;
      simples.push(lancamento);
    }
  });

  const grupos = [];

  Object.values(compostos).forEach(grupo => {
    const pais = grupo.filter(l =>
      l.tipo_lancamento_id === 1 &&
      Number.parseFloat(l.valor) < 0 &&
      !l.lancamento_transferencia_id
    );
    if (!pais.length) return;

    const deducoes = [];
    grupo.forEach(l => {
      if (l.tipo_lancamento_id !== 2) return;
      const valor = Number.parseFloat(l.valor) || 0;
      if (valor <= 0) return;
      const categoria = mapaCategorias[l.categoria_id] || "";
      if (categoriaContem(categoria, TERMOS_DEDUCAO)) {
        deducoes.push({
          id: l.id || "",
          descricao: l.descricao || "",
          categoriaId: l.categoria_id || "",
          categoria,
          valor,
        });
      }
    });

    const totalDeducoes = deducoes.reduce((sum, item) => sum + item.valor, 0);
    if (pais.length === 1) {
      const pai = pais[0];
      const bruto = Math.abs(Number.parseFloat(pai.valor) || 0);
      grupos.push({
        pai,
        bruto,
        totalDeducoes,
        liquido: bruto - totalDeducoes,
        deducoes,
        contaNome: pai._conta_nome || "",
        idComposto: pai.lancamento_composto_id || "",
      });
      return;
    }

    const totalBrutoPais = pais.reduce((sum, pai) => sum + Math.abs(Number.parseFloat(pai.valor) || 0), 0);
    pais.forEach(pai => {
      const bruto = Math.abs(Number.parseFloat(pai.valor) || 0);
      const proporcao = totalBrutoPais > 0 ? bruto / totalBrutoPais : 0;
      const dedProp = totalDeducoes * proporcao;
      grupos.push({
        pai,
        bruto,
        totalDeducoes: dedProp,
        liquido: bruto - dedProp,
        deducoes,
        contaNome: pai._conta_nome || "",
        idComposto: pai.lancamento_composto_id || "",
      });
    });
  });

  simples.forEach(l => {
    if ((Number.parseFloat(l.valor) || 0) >= 0) return;
    const bruto = Math.abs(Number.parseFloat(l.valor) || 0);
    grupos.push({
      pai: l,
      bruto,
      totalDeducoes: 0,
      liquido: bruto,
      deducoes: [],
      contaNome: l._conta_nome || "",
      idComposto: "",
    });
  });

  return grupos;
}

function somarPeriodoGrupos(grupos, ref, dias) {
  const limite = new Date(ref);
  limite.setDate(limite.getDate() + dias);
  return grupos
    .filter(grupo => {
      const venc = new Date(`${grupo.pai.data_vencimento || "9999-12-31"}T00:00:00`);
      return venc >= ref && venc <= limite;
    })
    .reduce((sum, grupo) => sum + grupo.liquido, 0);
}

function buildStatus(vencimento, referencia) {
  const venc = new Date(`${vencimento || "9999-12-31"}T00:00:00`);
  const dias = Math.round((venc - referencia) / 86400000);
  const status =
    dias < 0 ? "VENCIDO" :
    dias === 0 ? "VENCE_HOJE" :
    dias <= 7 ? "ESTA_SEMANA" :
    dias <= 30 ? "PROXIMO_MES" :
    "FUTURO";
  return { dias, status };
}

function toBRDate(date) {
  return new Date(date).toLocaleString("pt-BR", { timeZone: FUSO });
}

function toISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createCacheKey(parts = []) {
  return parts.map(part => String(part || "")).join("|");
}

function sumByDate(rows = [], fieldDate, fieldValue) {
  return rows.reduce((acc, row) => {
    const date = String(row[fieldDate] || "").slice(0, 10);
    if (!date) return acc;
    acc[date] = (acc[date] || 0) + (Number.parseFloat(row[fieldValue]) || 0);
    return acc;
  }, {});
}

export async function fetchGranatumContasPagarLabs(companyId = "") {
  if (isDemoCompany(companyId)) return demoContasPayload("pagar", companyId);
  const now = Date.now();
  if (contasPagarLabsCache && now - contasPagarLabsCache.ts < LABS_CACHE_TTL_MS) {
    return contasPagarLabsCache.payload;
  }

  if (contasPagarLabsInflight) return contasPagarLabsInflight;

  contasPagarLabsInflight = (async () => {
  const [contas, mapaCategorias, mapaFornecedores] = await Promise.all([
    resolverContasFluxoAjustado(),
    getMapaCategorias(),
    getMapaFornecedores(),
  ]);

  if (!contas.length) throw new Error("Nenhuma conta encontrada para o perfil FLUXO_AJUSTADO.");

  const agora = new Date();
  const dataFim = new Date(agora);
  dataFim.setDate(dataFim.getDate() + 60);
  const inicio = agora.toISOString().slice(0, 10);
  const fim = dataFim.toISOString().slice(0, 10);

  const lotes = await Promise.all(
    contas.map(async conta => {
      const rows = await fetchAllPages("lancamentos", {
        conta_id: conta.id,
        data_inicio: inicio,
        data_fim: fim,
        regime: "caixa",
        tipo_view: "detail",
      });
      return rows.map(l => ({
        ...l,
        _conta_nome: conta.descricao,
        _conta_id: conta.id,
      }));
    })
  );

  const vistos = new Set();
  const semDup = lotes.flat().filter(l => {
    if (vistos.has(l.id)) return false;
    vistos.add(l.id);
    return true;
  });

  const grupos = agruparPorComposto(semDup, mapaCategorias).sort((a, b) =>
    new Date(`${a.pai.data_vencimento || "9999-12-31"}T00:00:00`) -
    new Date(`${b.pai.data_vencimento || "9999-12-31"}T00:00:00`)
  );

  const total7d = somarPeriodoGrupos(grupos, agora, 7);
  const total30d = somarPeriodoGrupos(grupos, agora, 30);
  const total60d = grupos.reduce((sum, grupo) => sum + grupo.liquido, 0);

  const rows = grupos.map(grupo => {
    const { dias, status } = buildStatus(grupo.pai.data_vencimento, agora);
    return {
      DATA_VENCIMENTO: grupo.pai.data_vencimento || "",
      CONTA: grupo.contaNome,
      DESCRICAO: grupo.pai.descricao || "",
      CATEGORIA_ID: String(grupo.pai.categoria_id || ""),
      CATEGORIA: mapaCategorias[grupo.pai.categoria_id] || "",
      VALOR_BRUTO: grupo.bruto,
      VALOR_DEDUCOES: grupo.totalDeducoes,
      VALOR_LIQUIDO: grupo.liquido,
      DIAS_ATE_VENC: dias,
      STATUS: status,
      FORNECEDOR: nomeFornecedorLancamento(grupo.pai, mapaFornecedores) || "Sem fornecedor",
      ID: String(grupo.pai.id || ""),
      ID_COMPOSTO: String(grupo.idComposto || ""),
      DEDUCOES: grupo.deducoes,
    };
  });

  const withDeductions = rows.filter(row => row.VALOR_DEDUCOES > 0).length;
  const payload = {
    source: "granatum_direct",
    profile: "FLUXO_AJUSTADO",
    updatedAt: toBRDate(new Date()),
    interval: { inicio, fim },
    meta: [
      { label: "TOTAL_7D", value: total7d },
      { label: "TOTAL_30D", value: total30d },
      { label: "TOTAL_60D", value: total60d },
      { label: "QTD_LANCAMENTOS", value: rows.length },
      { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
    ],
    rows,
    compositionSummary: {
      grupos: rows.length,
      comDeducoes: withDeductions,
      itensDeducao: rows.reduce((sum, row) => sum + (row.DEDUCOES?.length || 0), 0),
    },
  };
    contasPagarLabsCache = { ts: Date.now(), payload };
    return payload;
  })();

  try {
    return await contasPagarLabsInflight;
  } finally {
    contasPagarLabsInflight = null;
  }
}

export async function fetchGranatumContasVencidasLabs(companyId = "") {
  if (isDemoCompany(companyId)) return demoContasPayload("vencidas", companyId);
  const now = Date.now();
  if (contasVencidasLabsCache && now - contasVencidasLabsCache.ts < LABS_CACHE_TTL_MS) {
    return contasVencidasLabsCache.payload;
  }

  if (contasVencidasLabsInflight) return contasVencidasLabsInflight;

  contasVencidasLabsInflight = (async () => {
    const [contas, mapaCategorias, mapaFornecedores] = await Promise.all([
      resolverContasFluxoAjustado(),
      getMapaCategorias(),
      getMapaFornecedores(),
    ]);

    if (!contas.length) throw new Error("Nenhuma conta encontrada para o perfil FLUXO_AJUSTADO.");

    const agora = new Date();
    const lotes = await Promise.all(
      contas.map(async conta => {
        const rows = await fetchAllPages("lancamentos", {
          conta_id: conta.id,
          tipo: "PA",
          tipo_view: "detail",
        });
        return rows.map(l => ({
          ...l,
          _conta_nome: conta.descricao,
          _conta_id: conta.id,
        }));
      })
    );

    const vistos = new Set();
    const semDup = lotes.flat().filter(l => {
      if (vistos.has(l.id)) return false;
      vistos.add(l.id);
      return true;
    });

    const grupos = agruparPorComposto(semDup, mapaCategorias).sort((a, b) =>
      new Date(`${a.pai.data_vencimento || "9999-12-31"}T00:00:00`) -
      new Date(`${b.pai.data_vencimento || "9999-12-31"}T00:00:00`)
    );

    const rows = grupos.map(grupo => {
      const venc = new Date(`${grupo.pai.data_vencimento || "1900-01-01"}T00:00:00`);
      const diasAtraso = Math.round((agora - venc) / 86400000);
      const status =
        diasAtraso <= 0 ? "VENCEU_HOJE" :
        diasAtraso <= 7 ? "ATÉ_7_DIAS" :
        diasAtraso <= 30 ? "ATÉ_30_DIAS" :
        diasAtraso <= 90 ? "ATÉ_90_DIAS" :
        "ACIMA_90_DIAS";

      return {
        DATA_VENCIMENTO: grupo.pai.data_vencimento || "",
        CONTA: grupo.contaNome,
        DESCRICAO: grupo.pai.descricao || "",
        CATEGORIA_ID: String(grupo.pai.categoria_id || ""),
        CATEGORIA: mapaCategorias[grupo.pai.categoria_id] || "",
        VALOR_BRUTO: grupo.bruto,
        VALOR_DEDUCOES: grupo.totalDeducoes,
        VALOR_LIQUIDO: grupo.liquido,
        DIAS_EM_ATRASO: diasAtraso,
        STATUS: status,
        FORNECEDOR: nomeFornecedorLancamento(grupo.pai, mapaFornecedores) || "Sem fornecedor",
        ID: String(grupo.pai.id || ""),
        ID_COMPOSTO: String(grupo.idComposto || ""),
        DEDUCOES: grupo.deducoes,
      };
    });

    const totalVencido = rows.reduce((sum, row) => sum + row.VALOR_LIQUIDO, 0);
    const payload = {
      source: "granatum_direct",
      profile: "FLUXO_AJUSTADO",
      updatedAt: toBRDate(new Date()),
      meta: [
        { label: "TOTAL_VENCIDO", value: totalVencido },
        { label: "QTD_LANCAMENTOS", value: rows.length },
        { label: "TOTAL_ATE_7_DIAS", value: rows.filter(r => r.DIAS_EM_ATRASO > 0 && r.DIAS_EM_ATRASO <= 7).reduce((sum, row) => sum + row.VALOR_LIQUIDO, 0) },
        { label: "TOTAL_ATE_30_DIAS", value: rows.filter(r => r.DIAS_EM_ATRASO > 0 && r.DIAS_EM_ATRASO <= 30).reduce((sum, row) => sum + row.VALOR_LIQUIDO, 0) },
        { label: "TOTAL_ACIMA_30_DIAS", value: rows.filter(r => r.DIAS_EM_ATRASO > 30).reduce((sum, row) => sum + row.VALOR_LIQUIDO, 0) },
        { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
      ],
      rows,
      compositionSummary: {
        grupos: rows.length,
        comDeducoes: rows.filter(row => row.VALOR_DEDUCOES > 0).length,
        itensDeducao: rows.reduce((sum, row) => sum + (row.DEDUCOES?.length || 0), 0),
      },
    };

    contasVencidasLabsCache = { ts: Date.now(), payload };
    return payload;
  })();

  try {
    return await contasVencidasLabsInflight;
  } finally {
    contasVencidasLabsInflight = null;
  }
}

export async function fetchGranatumContasPagasLabs({
  dataInicio,
  dataFim,
  companyId = "",
} = {}) {
  if (isDemoCompany(companyId)) return demoContasPayload("pagas", companyId);
  const hoje = new Date();
  const inicio = dataInicio || `${hoje.getFullYear()}-01-01`;
  const fim = dataFim || toISODate(hoje);
  const cacheKey = createCacheKey(["contas-pagas", inicio, fim]);
  const cached = contasPagasLabsCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.ts < LABS_CACHE_TTL_MS) return cached.payload;
  if (contasPagasLabsInflight.has(cacheKey)) return contasPagasLabsInflight.get(cacheKey);

  const inflight = (async () => {
    const [contas, mapaCategorias, mapaFornecedores] = await Promise.all([
      resolverContasPorNomes(CONTAS_SAIDA),
      getMapaCategorias(),
      getMapaFornecedores(),
    ]);

    if (!contas.length) throw new Error("Nenhuma conta encontrada para o conjunto de contas pagadoras.");

    const lotes = await Promise.all(
      contas.map(async conta => {
        const rows = await fetchAllPages("lancamentos", {
          conta_id: conta.id,
          data_inicio: inicio,
          data_fim: fim,
          regime: "caixa",
          tipo_view: "detail",
        });
        return rows.map(l => ({
          ...l,
          _conta_nome: conta.descricao,
          _conta_id: conta.id,
        }));
      })
    );

    const vistos = new Set();
    const semDup = lotes.flat().filter(l => {
      if (vistos.has(l.id)) return false;
      vistos.add(l.id);
      return true;
    });

    const pagos = semDup.filter(l => Boolean(l.data_pagamento));

    const grupos = agruparPorComposto(pagos, mapaCategorias).sort((a, b) =>
      new Date(`${b.pai.data_pagamento || "1900-01-01"}T00:00:00`) -
      new Date(`${a.pai.data_pagamento || "1900-01-01"}T00:00:00`) ||
      b.liquido - a.liquido
    );

    const rows = grupos.map(grupo => ({
      DATA_PAGAMENTO: grupo.pai.data_pagamento || "",
      CONTA: grupo.contaNome,
      DESCRICAO: grupo.pai.descricao || "",
      CATEGORIA_ID: String(grupo.pai.categoria_id || ""),
      CATEGORIA: mapaCategorias[grupo.pai.categoria_id] || "",
      VALOR_BRUTO: grupo.bruto,
      VALOR_DEDUCOES: grupo.totalDeducoes,
      VALOR_LIQUIDO: grupo.liquido,
      FORNECEDOR: nomeFornecedorLancamento(grupo.pai, mapaFornecedores) || "Sem fornecedor",
      ID: String(grupo.pai.id || ""),
      ID_COMPOSTO: String(grupo.idComposto || ""),
      DEDUCOES: grupo.deducoes,
    }));

    const payload = {
      source: "granatum_direct",
      profile: "CONTAS_SAIDA",
      updatedAt: toBRDate(new Date()),
      interval: { inicio, fim },
      meta: [
        { label: "TOTAL_PAGO", value: rows.reduce((sum, row) => sum + row.VALOR_LIQUIDO, 0) },
        { label: "QTD_LANCAMENTOS", value: rows.length },
        { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
      ],
      rows,
      compositionSummary: {
        grupos: rows.length,
        comDeducoes: rows.filter(row => row.VALOR_DEDUCOES > 0).length,
        itensDeducao: rows.reduce((sum, row) => sum + (row.DEDUCOES?.length || 0), 0),
      },
    };

    contasPagasLabsCache.set(cacheKey, { ts: Date.now(), payload });
    return payload;
  })();

  contasPagasLabsInflight.set(cacheKey, inflight);

  try {
    return await inflight;
  } finally {
    contasPagasLabsInflight.delete(cacheKey);
  }
}

export async function fetchGranatumFluxoProjetadoLabs(companyId = "") {
  if (isDemoCompany(companyId)) {
    const contasPagar = demoContasPayload("pagar", companyId);
    const profile = getDemoProfile(companyId);
    const saldos = parseDemoCsv(getDemoSheetCsv("saldos", companyId)).map(row => ({
      CONTA_ID: row.label,
      CONTA: row.label,
      SALDO: toDemoNumber(row.value),
    }));
    const saldoAtual = saldos.find(row => String(row.CONTA).toUpperCase() === "TOTAL")?.SALDO
      ?? saldos.reduce((sum, row) => sum + row.SALDO, 0);
    return {
      source: "demo_api",
      profile: profile?.label ? `LUNIQ_DEMO_${profile.label.toUpperCase()}` : "LUNIQ_DEMO",
      updatedAt: toBRDate(new Date()),
      interval: contasPagar.interval,
      meta: [
        { label: "SALDO_ATUAL", value: saldoAtual },
        { label: "TOTAL_7D", value: metaFromPayload(contasPagar.meta, "TOTAL_7D") },
        { label: "TOTAL_30D", value: metaFromPayload(contasPagar.meta, "TOTAL_30D") },
        { label: "TOTAL_60D", value: metaFromPayload(contasPagar.meta, "TOTAL_60D") },
        { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
      ],
      saldos,
      pagamentosPorDia: contasPagar.rows.map(row => ({ DATA: row.DATA_VENCIMENTO, PAGAMENTOS: row.VALOR_LIQUIDO })),
      rows: contasPagar.rows,
    };
  }
  const now = Date.now();
  if (fluxoProjetadoLabsCache && now - fluxoProjetadoLabsCache.ts < LABS_CACHE_TTL_MS) {
    return fluxoProjetadoLabsCache.payload;
  }
  if (fluxoProjetadoLabsInflight) return fluxoProjetadoLabsInflight;

  fluxoProjetadoLabsInflight = (async () => {
    const [contas, contasPagar] = await Promise.all([
      resolverContasPorNomes(CONTAS_SAIDA),
      fetchGranatumContasPagarLabs(),
    ]);

    const saldos = contas
      .map(conta => ({
        CONTA_ID: String(conta.id || ""),
        CONTA: conta.descricao || "",
        SALDO: Number.parseFloat(conta.saldo) || 0,
      }))
      .sort((a, b) => b.SALDO - a.SALDO);

    const saldoAtual = saldos.reduce((sum, row) => sum + row.SALDO, 0);
    const pagamentosPorDia = Object.entries(sumByDate(contasPagar.rows, "DATA_VENCIMENTO", "VALOR_LIQUIDO"))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, valor]) => ({
        DATA: data,
        PAGAMENTOS: valor,
      }));

    const payload = {
      source: "granatum_direct",
      profile: "CONTAS_SAIDA + CONTAS_PAGAR",
      updatedAt: toBRDate(new Date()),
      interval: contasPagar.interval,
      meta: [
        { label: "SALDO_ATUAL", value: saldoAtual },
        { label: "TOTAL_7D", value: metaFromPayload(contasPagar.meta, "TOTAL_7D") },
        { label: "TOTAL_30D", value: metaFromPayload(contasPagar.meta, "TOTAL_30D") },
        { label: "TOTAL_60D", value: metaFromPayload(contasPagar.meta, "TOTAL_60D") },
        { label: "BURN_RATE_7D", value: metaFromPayload(contasPagar.meta, "TOTAL_7D") / 7 || 0 },
        { label: "BURN_RATE_30D", value: metaFromPayload(contasPagar.meta, "TOTAL_30D") / 30 || 0 },
        { label: "BURN_RATE_60D", value: metaFromPayload(contasPagar.meta, "TOTAL_60D") / 60 || 0 },
        { label: "ATUALIZADO_EM", value: toBRDate(new Date()) },
      ],
      saldos,
      pagamentosPorDia,
      rows: contasPagar.rows,
    };

    fluxoProjetadoLabsCache = { ts: Date.now(), payload };
    return payload;
  })();

  try {
    return await fluxoProjetadoLabsInflight;
  } finally {
    fluxoProjetadoLabsInflight = null;
  }
}

function metaFromPayload(meta = [], label) {
  return Number.parseFloat(meta.find(item => item.label === label)?.value) || 0;
}
