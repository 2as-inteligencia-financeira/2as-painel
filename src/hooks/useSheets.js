import { useState, useEffect, useCallback, useRef } from "react";
import { clearAuth, getAuthHeaders } from "../auth";
import { getActiveEmpresaId, onActiveEmpresaChange } from "../empresas/2as-inteligencia-financeira/empresaAtiva";
import { URLS, DYNAMIC_HEADER_KEYS, DYNAMIC_HEADER_MARKER, WIDE_DRE_KEYS } from "../config/sheets";

const REFRESH_MS = 60 * 1000;
const SHEET_CACHE = new Map();
const SHEET_INFLIGHT = new Map();

// ─── FORMATAÇÃO CENTRALIZADA ─────────────────────────────────────────────────
const inteiroMoeda = (v) => {
  const n = Number(v) || 0;
  return n < 0 ? Math.ceil(n) : Math.floor(n);
};

export const fmt = {
  brl:  (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
  brl0: (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(inteiroMoeda(v)),
  brlk: (v) => {
    const a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e6) return `${s}R$${(a/1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}R$${(a/1e3).toFixed(2)}k`;
    return fmt.brl(v);
  },
  pct:  (v, d = 1) => `${v.toFixed(d)}%`,
  num:  (v, d = 2) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
};

// ─── PARSER CSV ───────────────────────────────────────────────────────────────

function parseCSVRows(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQ && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cur);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }

  row.push(cur);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  return rows;
}

// ─── limparNum CORRIGIDO ───────────────────────────────────────────────────────
// Bug: parseFloat("64.061.409 SAMUEL BORGHESAN") = 64.061 (parse parcial)
// Fix: regex estrita — só converte se a string INTEIRA for numérica
export function limparNum(raw) {
  if (raw === null || raw === undefined) return null;
  const s = raw.toString().trim().replace(/^"|"$/g, "");
  if (!s || s === "-" || s === "—" || s === "#REF!" || s === "#N/A") return null;

  // Datas → string (não número)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(s)) return s;

  let clean = s.replace(/R\$\s*/g, "").replace(/%$/, "").trim();

  // Notação contábil: "(1.234,56)" ou "(1234.56)" → negativo
  const parens = clean.match(/^\(([0-9.,]+)\)$/);
  if (parens) {
    let inner = parens[1];
    if (inner.includes(",")) inner = inner.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(inner);
    return isNaN(n) ? s : -n;
  }

  // Formato BR: "1.234,56" → "1234.56"
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }

  // STRICT: só parseia se for inteiramente um número válido
  // "-44279.17" ✓ | "64.061.409 SAMUEL" ✗ | "JAN" ✗ | "(=) EBITDA" ✗
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return s;

  const n = parseFloat(clean);
  return isNaN(n) ? s : n;
}

export function parseCSV(text) {
  const rows = parseCSVRows(text.trim());
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.replace(/^"|"$/g, "").trim());
  return rows.slice(1)
    .map(row => {
      const vals = row.map(v => v.replace(/^"|"$/g, "").trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = limparNum(vals[i] ?? ""); });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== null && v !== ""));
}

// Para abas com metadados no topo (contas_pagar, faturas_historico)
export function parseCSVWithDynamicHeader(text, headerCellMarker) {
  const rows = parseCSVRows(text.trim());
  const headerIdx = rows.findIndex(row =>
    row.some(cell => cell.toLowerCase().includes(headerCellMarker.toLowerCase()))
  );
  if (headerIdx < 0) return { meta: [], data: parseCSV(text) };

  const metaRows = rows.slice(0, headerIdx);
  const dataRows = rows.slice(headerIdx);
  if (dataRows.length < 2) return { meta: [], data: [] };

  const headers = dataRows[0].map(h => h.replace(/^"|"$/g, "").trim());
  const data = dataRows.slice(1)
    .map(row => {
      const vals = row.map(v => v.replace(/^"|"$/g, "").trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = limparNum(vals[i] ?? ""); });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== null && v !== ""));

  // Meta: array de {label, value}
  const meta = metaRows.slice(1)
    .map(row => {
      const parts = row.map(v => v.replace(/^"|"$/g, "").trim());
      return { label: parts[0] || "", value: limparNum(parts[1] ?? "") };
    })
    .filter(r => r.label);

  return { meta, data };
}

export function parseDREWideCSV(text) {
  const lines = parseCSVRows(text.trim());
  if (lines.length < 3) return [];

  const status = lines[0].map(v => v.replace(/^"|"$/g, "").trim());
  const meses = lines[1].map(v => v.replace(/^"|"$/g, "").trim().toUpperCase());
  const rows = [];

  lines.slice(2).forEach(line => {
    const vals = line.map(v => v.replace(/^"|"$/g, "").trim());
    const conta = vals[0]?.trim();
    if (!conta || conta.startsWith("MARGEM") || vals.every(v => !v)) return;

    meses.forEach((mes, idx) => {
      if (!mes || mes === "TOTAL") return;
      const valor = limparNum(vals[idx] ?? "");
      rows.push({
        CONTA: conta,
        MES: mes,
        VALOR: typeof valor === "number" ? valor : 0,
        STATUS: status[idx] || "",
      });
    });
  });

  return rows;
}

export function parseAportesMarioCSV(text) {
  if (/<!doctype html|<html/i.test(text)) return { blocked: true, label: "TOTAL DE APORTE PENDENTE SOCIOS", value: 0 };
  const cells = parseCSVRows(text.trim()).map(line => line.map(v => v.replace(/^"|"$/g, "").trim()));
  const headers = cells[0] || [];
  const totals = cells.find((row, idx) => idx > 0 && row.some(Boolean)) || [];
  const findValue = label => {
    const idx = headers.findIndex(header =>
      header.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() === label
    );
    return idx >= 0 ? toNum(totals[idx]) : 0;
  };
  const pendente = findValue("APORTE A REALIZAR");
  return {
    blocked: false,
    label: "TOTAL DE APORTE PENDENTE SOCIOS",
    value: pendente,
    total: findValue("APORTE TOTAL"),
    realizado: findValue("APORTE REALIZADO"),
    pendente,
    abrDez: findValue("ABR-DEZ"),
  };
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────

function parseSheetText(key, text) {
  return DYNAMIC_HEADER_KEYS.has(key)
    ? parseCSVWithDynamicHeader(text, DYNAMIC_HEADER_MARKER[key])
    : key === "aportes_mario"
      ? parseAportesMarioCSV(text)
    : WIDE_DRE_KEYS.has(key)
      ? parseDREWideCSV(text)
    : parseCSV(text);
}

function rowValueByHeader(row, labels) {
  const norm = s => s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/_+$/,"").toUpperCase();
  const entry = Object.entries(row || {}).find(([key]) => labels.some(label => norm(key) === norm(label)));
  return entry?.[1];
}

function hasMarioValues(rows = []) {
  return Array.isArray(rows) && rows.some(row =>
    Math.abs(toNum(rowValueByHeader(row, ["APORTES SOCIOS", "APORTES_SÓCIOS", "APORTES MARIO", "APORTES_MARIO"]))) > 0 ||
    Math.abs(toNum(rowValueByHeader(row, ["DESPESAS SOCIOS", "DESPESAS_SÓCIOS", "DESPESAS CARTAO SOCIOS", "DESPESAS_CARTAO_SOCIOS", "DESPESAS CARTAO MARIO", "DESPESAS_CARTAO_MARIO", "DESPESAS CARTÃO MÁRIO"]))) > 0
  );
}

function mergeHistoricoMario(previous, next) {
  if (!hasMarioValues(previous) || hasMarioValues(next)) return next;
  const byDate = new Map(previous.map(row => [String(rowValueByHeader(row, ["DATA"]) || "").trim(), row]));
  return next.map(row => {
    const old = byDate.get(String(rowValueByHeader(row, ["DATA"]) || "").trim());
    if (!old) return row;
    return {
      ...row,
      "APORTES SOCIOS": rowValueByHeader(old, ["APORTES SOCIOS", "APORTES_SÓCIOS", "APORTES MARIO", "APORTES_MARIO"]) ?? row["APORTES SOCIOS"] ?? row["APORTES MARIO"],
      "DESPESAS SOCIOS": rowValueByHeader(old, ["DESPESAS SOCIOS", "DESPESAS_SÓCIOS", "DESPESAS CARTAO SOCIOS", "DESPESAS_CARTAO_SOCIOS", "DESPESAS CARTAO MARIO", "DESPESAS_CARTAO_MARIO", "DESPESAS CARTÃO MÁRIO"]) ?? row["DESPESAS SOCIOS"] ?? row["DESPESAS CARTAO MARIO"],
    };
  });
}

function withEmpresaParams(url, empresaId) {
  const params = new URLSearchParams({ empresa: empresaId, cb: Date.now().toString() });
  return `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;
}

function sheetCacheKey(empresaId, key) {
  return `${empresaId}:${key}`;
}

function fetchSheetCached(key, url, empresaId = getActiveEmpresaId()) {
  const cacheKey = sheetCacheKey(empresaId, key);
  if (SHEET_INFLIGHT.has(cacheKey)) return SHEET_INFLIGHT.get(cacheKey);
  const req = Promise.resolve()
    .then(async () => fetch(withEmpresaParams(url, empresaId), {
      cache: "no-store",
      headers: await getAuthHeaders(),
    }))
    .then(r => {
      if (r.status === 401) {
        clearAuth();
        throw new Error("Sessão expirada");
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(text => {
      const previous = SHEET_CACHE.get(cacheKey)?.data;
      const parsedRaw = parseSheetText(key, text);
      const parsed = key === "historico" ? mergeHistoricoMario(previous, parsedRaw) : parsedRaw;
      const payload = { data: parsed, loading: false, error: null, lastUpdate: new Date() };
      SHEET_CACHE.set(cacheKey, payload);
      return payload;
    })
    .finally(() => SHEET_INFLIGHT.delete(cacheKey));
  SHEET_INFLIGHT.set(cacheKey, req);
  return req;
}

export function prefetchSheets(keys = []) {
  const empresaId = getActiveEmpresaId();
  keys.forEach(key => {
    const url = URLS[key];
    if (url && !SHEET_CACHE.has(sheetCacheKey(empresaId, key))) fetchSheetCached(key, url, empresaId).catch(() => {});
  });
}

export function useSheet(key) {
  const url = URLS[key] || "";
  const [empresaId, setEmpresaId] = useState(() => getActiveEmpresaId());
  const cached = SHEET_CACHE.get(sheetCacheKey(empresaId, key));
  const [data, setData]             = useState(cached?.data ?? null);
  const [loading, setLoading]       = useState(!!url && !cached);
  const [error, setError]           = useState(cached?.error ?? null);
  const [lastUpdate, setLastUpdate] = useState(cached?.lastUpdate ?? null);

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    try {
      setLoading(!SHEET_CACHE.has(sheetCacheKey(empresaId, key)));
      const payload = await fetchSheetCached(key, url, empresaId);
      setData(payload.data);
      setError(payload.error);
      setLastUpdate(payload.lastUpdate);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url, key, empresaId]);

  useEffect(() => onActiveEmpresaChange(setEmpresaId), []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  return { data, loading, error, lastUpdate, refetch: fetchData };
}

export function useSheets(keys) {
  const keysKey = keys.join("|");
  const [empresaId, setEmpresaId] = useState(() => getActiveEmpresaId());
  const [state, setState] = useState(
    Object.fromEntries(keys.map(k => [
      k,
      SHEET_CACHE.get(sheetCacheKey(empresaId, k)) || { data: null, loading: !!URLS[k], error: null, lastUpdate: null },
    ]))
  );
  const mounted = useRef(true);

  useEffect(() => onActiveEmpresaChange(setEmpresaId), []);

  useEffect(() => {
    mounted.current = true;
    const activeKeys = keysKey.split("|").filter(Boolean);
    const initialState = Object.fromEntries(activeKeys.map(k => [
      k,
      SHEET_CACHE.get(sheetCacheKey(empresaId, k)) || { data: null, loading: !!URLS[k], error: null, lastUpdate: null },
    ]));
    queueMicrotask(() => {
      if (mounted.current) setState(initialState);
    });
    const fetchAll = () => {
      const cachedState = {};
      activeKeys.forEach(key => {
        const url = URLS[key];
        if (!url) {
          cachedState[key] = { data: null, loading: false, error: null, lastUpdate: null };
          return;
        }
        const cached = SHEET_CACHE.get(sheetCacheKey(empresaId, key));
        if (cached) cachedState[key] = cached;
        fetchSheetCached(key, url, empresaId)
          .then(payload => {
            if (!mounted.current) return;
            setState(s => ({ ...s, [key]: payload }));
          })
          .catch(e => {
            if (!mounted.current) return;
            setState(s => ({
              ...s,
              [key]: { ...(SHEET_CACHE.get(sheetCacheKey(empresaId, key)) || cached || s[key] || { data: null, lastUpdate: null }), loading: false, error: e.message },
            }));
          });
      });

      if (Object.keys(cachedState).length) {
        setState(s => ({ ...s, ...cachedState }));
      }
    };
    fetchAll();
    const t = setInterval(fetchAll, REFRESH_MS);
    return () => { mounted.current = false; clearInterval(t); };
  }, [keysKey, empresaId]);

  return state;
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

export function getByLabel(data, label) {
  if (!Array.isArray(data) || !data.length) return null;
  const norm = s => s?.toString().toUpperCase().trim() || "";
  const row  = data.find(r => norm(r.label ?? Object.values(r)[0]) === norm(label));
  return row ? (row.value ?? Object.values(row)[1] ?? null) : null;
}

export function toNum(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = limparNum(v.toString());
  return typeof n === "number" ? n : 0;
}

export function parseDate(v) {
  if (!v) return null;
  const s = v.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.slice(0, 10).split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

export function fmtCurta(v) {
  const d = parseDate(v);
  if (d) return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  return v?.toString().slice(0, 5) || "";
}

export function fmtLonga(v) {
  const d = parseDate(v);
  return d ? d.toLocaleDateString("pt-BR") : v?.toString().slice(0, 10) || "";
}
