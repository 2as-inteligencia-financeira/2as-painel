import { useState, useEffect, useCallback, useRef } from "react";

const REFRESH_MS = 60 * 1000;

export const URLS = {
  historico:          "/api/sheets/historico",
  fechamento_semanal: "/api/sheets/fechamento_semanal",
  entradas10d:        "/api/sheets/entradas10d",
  contas_pagar:       "/api/sheets/contas_pagar",
  contas_vencidas:    "/api/sheets/contas_vencidas",
  faturas_historico:  "/api/sheets/faturas_historico",
  runway:             "/api/sheets/runway",
  saldos:             "/api/sheets/saldos",
  tabela_auxiliar:    "/api/sheets/tabela_auxiliar",
  tabela_resumo:      "/api/sheets/tabela_resumo",
  orc_areas:          "/api/sheets/orc_areas",
  orc_base:           "/api/sheets/orc_base",
  despesas_historico: "/api/sheets/despesas_historico",
  aportes_mario:      "/api/sheets/aportes_mario",
  base_dre:           "/api/sheets/base_dre",
  dre_2026:           "/api/sheets/dre_2026",
};

// ─── FORMATAÇÃO CENTRALIZADA (padrão 2 casas decimais) ───────────────────────
export const fmt = {
  brl:  (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
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

function splitLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
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
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1)
    .map(line => {
      const vals = splitLine(line).map(v => v.replace(/^"|"$/g, "").trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = limparNum(vals[i] ?? ""); });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== null && v !== ""));
}

// Para abas com metadados no topo (contas_pagar, faturas_historico)
export function parseCSVWithDynamicHeader(text, headerCellMarker) {
  const lines = text.trim().split("\n");
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes(headerCellMarker.toLowerCase())
  );
  if (headerIdx < 0) return { meta: [], data: parseCSV(text) };

  const metaLines = lines.slice(0, headerIdx);
  const dataLines = lines.slice(headerIdx);
  if (dataLines.length < 2) return { meta: [], data: [] };

  const headers = splitLine(dataLines[0]).map(h => h.replace(/^"|"$/g, "").trim());
  const data = dataLines.slice(1)
    .map(line => {
      const vals = splitLine(line).map(v => v.replace(/^"|"$/g, "").trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = limparNum(vals[i] ?? ""); });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== null && v !== ""));

  // Meta: array de {label, value}
  const meta = metaLines.slice(1)
    .map(line => {
      const parts = splitLine(line).map(v => v.replace(/^"|"$/g, "").trim());
      return { label: parts[0] || "", value: limparNum(parts[1] ?? "") };
    })
    .filter(r => r.label);

  return { meta, data };
}

export function parseDREWideCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 3) return [];

  const status = splitLine(lines[0]).map(v => v.replace(/^"|"$/g, "").trim());
  const meses = splitLine(lines[1]).map(v => v.replace(/^"|"$/g, "").trim().toUpperCase());
  const rows = [];

  lines.slice(2).forEach(line => {
    const vals = splitLine(line).map(v => v.replace(/^"|"$/g, "").trim());
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

// ─── HOOKS ───────────────────────────────────────────────────────────────────

const DYNAMIC_HEADER_KEYS = new Set(["contas_pagar", "faturas_historico", "despesas_historico"]);
const DYNAMIC_HEADER_MARKER = { contas_pagar: "DATA_VENCIMENTO", faturas_historico: "DATA_PAGAMENTO", despesas_historico: "DATA_PAGAMENTO" };
const WIDE_DRE_KEYS = new Set(["dre_2026"]);

export function useSheet(key) {
  const url = URLS[key] || "";
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(!!url);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    try {
      setLoading(true);
      const bust = `cb=${Date.now()}`;
      const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}${bust}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = DYNAMIC_HEADER_KEYS.has(key)
        ? parseCSVWithDynamicHeader(text, DYNAMIC_HEADER_MARKER[key])
        : WIDE_DRE_KEYS.has(key)
          ? parseDREWideCSV(text)
        : parseCSV(text);
      setData(parsed);
      setLastUpdate(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url, key]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  return { data, loading, error, lastUpdate, refetch: fetchData };
}

export function useSheets(keys) {
  const keysKey = keys.join("|");
  const [state, setState] = useState(
    Object.fromEntries(keys.map(k => [k, { data: null, loading: !!URLS[k], error: null, lastUpdate: null }]))
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const activeKeys = keysKey.split("|").filter(Boolean);
    activeKeys.forEach(key => {
      const url = URLS[key];
      if (!url) { setState(s => ({ ...s, [key]: { ...s[key], loading: false } })); return; }
      fetch(`${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`, { cache: "no-store" })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then(text => {
          if (!mounted.current) return;
          const parsed = DYNAMIC_HEADER_KEYS.has(key)
            ? parseCSVWithDynamicHeader(text, DYNAMIC_HEADER_MARKER[key])
            : WIDE_DRE_KEYS.has(key)
              ? parseDREWideCSV(text)
            : parseCSV(text);
          setState(s => ({ ...s, [key]: { data: parsed, loading: false, error: null, lastUpdate: new Date() } }));
        })
        .catch(e => {
          if (!mounted.current) return;
          setState(s => ({ ...s, [key]: { data: null, loading: false, error: e.message, lastUpdate: null } }));
        });
    });
    return () => { mounted.current = false; };
  }, [keysKey]);

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
