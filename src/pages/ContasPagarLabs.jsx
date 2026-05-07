import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { getAuthHeaders } from "../auth";
import { useSheets, getByLabel, toNum, fmt } from "../hooks/useSheets";
import { T, CA, MONO } from "../theme";
import { buildOperationalReportHtml, downloadHtml, downloadPdf } from "../utils/operationalReport";
import ReportActions from "../components/ReportActions";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";
import { useActiveEmpresaId } from "../hooks/useActiveEmpresaId";

function useGranatumLabs(modo) {
  const empresaId = useActiveEmpresaId();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const endpoint = modo === "vencidas" ? "/api/granatum/contas-vencidas-labs" : "/api/granatum/contas-pagar-labs";
        const params = new URLSearchParams({ cb: String(Date.now()), empresa: empresaId });
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          cache: "no-store",
          headers: getAuthHeaders(),
        });
        if (response.status === 401) throw new Error("Sessão expirada");
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
        if (!active) return;
        setState({
          data: json,
          loading: false,
          error: null,
          lastUpdate: new Date(),
        });
      } catch (error) {
        if (!active) return;
        setState(prev => ({
          ...prev,
          loading: false,
          error: error?.message || "Erro ao carregar API Sistema",
        }));
      }
    };
    fetchData();
    return () => { active = false; };
  }, [modo, refreshKey, empresaId]);

  return {
    ...state,
    refresh: () => setRefreshKey(value => value + 1),
  };
}

function diffDias(date, base = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((d - b) / 86400000);
}

function parseIsoDate(value) {
  const raw = String(value || "").slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function faixaPagar(dias) {
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoje";
  if (dias <= 7) return "7d";
  if (dias <= 15) return "15d";
  if (dias <= 30) return "30d";
  return "60d";
}

function faixaVencidas(dias) {
  if (dias <= 7) return "7d";
  if (dias <= 30) return "30d";
  if (dias <= 90) return "90d";
  return "90+";
}

function statusPagar(dias) {
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Vence hoje";
  if (dias <= 7) return "1-7 dias";
  if (dias <= 15) return "8-15 dias";
  if (dias <= 30) return "16-30 dias";
  return "31+ dias";
}

function statusVencidas(dias) {
  if (dias <= 7) return "Até 7 dias";
  if (dias <= 30) return "Até 30 dias";
  if (dias <= 90) return "31-90 dias";
  return "Acima 90 dias";
}

function corStatus(status) {
  return (
    FAIXAS_PAGAR.find(f => f.label === status)?.cor ||
    FAIXAS_VENCIDAS.find(f => f.label === status)?.cor ||
    T.muted
  );
}

function parseInputDate(value, endOfDay = false) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toInputDate(d);
}

function buildPresets(modo) {
  const hoje = new Date();
  const ontem = addDays(hoje, -1);
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const fimP = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
  if (modo === "vencidas") {
    return [
      { label: "Ontem", ini: toInputDate(ontem), fim: toInputDate(ontem) },
      { label: "7 dias", ini: toInputDate(addDays(hoje, -7)), fim: toInputDate(ontem) },
      { label: "30 dias", ini: toInputDate(addDays(hoje, -30)), fim: toInputDate(ontem) },
      { label: "Este mês", ini: toInputDate(ini), fim: toInputDate(fim) },
    ];
  }
  return [
    { label: "Hoje", ini: toInputDate(hoje), fim: toInputDate(hoje) },
    { label: "7 dias", ini: toInputDate(hoje), fim: toInputDate(addDays(hoje, 7)) },
    { label: "30 dias", ini: toInputDate(hoje), fim: toInputDate(addDays(hoje, 30)) },
    { label: "60 dias", ini: toInputDate(hoje), fim: toInputDate(addDays(hoje, 60)) },
    { label: "Este mês", ini: toInputDate(ini), fim: toInputDate(fim) },
    { label: "Próximo mês", ini: toInputDate(prox), fim: toInputDate(fimP) },
  ];
}

function inDateRange(date, inicio, fim) {
  if (!date) return false;
  const ini = parseInputDate(inicio);
  const end = parseInputDate(fim, true);
  if (ini && date < ini) return false;
  if (end && date > end) return false;
  return true;
}

const FAIXAS_PAGAR = [
  { id: "todos", label: "Todos", cor: T.blue2 },
  { id: "hoje", label: "Vence hoje", cor: T.amb },
  { id: "7d", label: "1-7 dias", cor: T.grn },
  { id: "15d", label: "8-15 dias", cor: T.purp },
  { id: "30d", label: "16-30 dias", cor: T.sub },
  { id: "60d", label: "31+ dias", cor: T.muted },
];

const FAIXAS_VENCIDAS = [
  { id: "todos", label: "Todos", cor: T.blue2 },
  { id: "7d", label: "Até 7 dias", cor: T.amb },
  { id: "30d", label: "Até 30 dias", cor: T.red },
  { id: "90d", label: "31-90 dias", cor: T.purp },
  { id: "90+", label: "Acima 90 dias", cor: T.muted },
];

function extrairContasLabs(rows, modo) {
  return (rows || [])
    .map(r => {
      const vencDate = parseIsoDate(r.DATA_VENCIMENTO);
      const valorBruto = Math.abs(toNum(r.VALOR_BRUTO ?? r.VALOR_LIQUIDO ?? 0));
      const deducoes = Math.abs(toNum(r.VALOR_DEDUCOES ?? r.DEDUCOES ?? 0));
      const liquidoRaw = toNum(r.VALOR_LIQUIDO ?? null);
      const valor = Math.abs(Number.isFinite(liquidoRaw) && liquidoRaw !== 0 ? liquidoRaw : valorBruto - deducoes);
      const dias = modo === "vencidas"
        ? toNum(r.DIAS_EM_ATRASO)
        : (vencDate ? diffDias(vencDate) : null);
      return {
        id: (r.ID || "").toString().trim(),
        vencDate,
        venc: vencDate ? vencDate.toLocaleDateString("pt-BR") : "-",
        dias,
        faixa: modo === "vencidas" ? faixaVencidas(dias) : faixaPagar(dias),
        status: modo === "vencidas" ? statusVencidas(dias) : statusPagar(dias),
        fornecedor: (r.FORNECEDOR || "").toString().trim() || "Sem fornecedor",
        categoria: (r.CATEGORIA || r.CATEGORIA_ID || "-").toString().trim(),
        descricao: (r.DESCRICAO || r.DESCRIÇÃO || "").toString().trim(),
        valorBruto,
        deducoes,
        valor,
      };
    })
    .filter(r => r.vencDate && (r.valor > 0 || r.deducoes > 0))
    .sort((a, b) => a.vencDate - b.vencDate || b.valor - a.valor);
}

function normalizarChave(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function descricaoSubGrupo(descricao) {
  if (!descricao) return "";
  const u = String(descricao).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.startsWith("INSS")) return "inss";
  if (u.startsWith("IRRF")) return "irrf";
  if (u.startsWith("FGTS")) return "fgts";
  if (u.startsWith("E-CONSIG") || u.startsWith("E CONSIG")) return "e-consignado";
  if (u.startsWith("DARF")) return "darf";
  if (u.startsWith("GPS")) return "gps";
  if (u.startsWith("CSLL")) return "csll";
  if (u.startsWith("PIS") || u.startsWith("COFINS")) return "pis-cofins";
  return "";
}

function chaveGrupoGranatum(c) {
  const sub = descricaoSubGrupo(c.descricao || "");
  return [c.venc, normalizarChave(c.fornecedor), sub].join("||");
}

function agrupar(rows, key, limit = 8) {
  const mapa = new Map();
  rows.forEach(r => mapa.set(r[key], (mapa.get(r[key]) || 0) + r.valor));
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}

function Card({ children, style = {} }) {
  return <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: 8, ...style }}>{children}</div>;
}

function Kpi({ label, value, sub, cor = T.txt }) {
  return (
    <Card style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cor }} />
      <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 0, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, color: cor, fontFamily: MONO, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{sub}</div>}
    </Card>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: 8, padding: "10px 12px", fontSize: 11 }}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontFamily: MONO }}>{fmt.brl(p.value)}</div>)}
    </div>
  );
}

function GranatumGrupoPagar({ grupo, expanded, onToggle }) {
  const { head, rows, total } = grupo;
  const cor = corStatus(head.status);
  const isMulti = rows.length > 1;
  const subTipo = isMulti ? descricaoSubGrupo(head.descricao || "") : "";
  const COLS = "28px 92px 112px minmax(340px,1.3fr) minmax(320px,1fr) 128px";

  return (
    <div>
      <div
        onClick={isMulti ? onToggle : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          padding: "9px 14px",
          alignItems: "center",
          cursor: isMulti ? "pointer" : "default",
          borderBottom: `1px solid rgba(148,163,184,0.12)`,
          background: "transparent",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ color: T.muted, fontSize: 10, textAlign: "center", userSelect: "none" }}>
          {isMulti ? (expanded ? "▼" : "▶") : ""}
        </div>
        <div style={{ fontSize: 11, color: cor, fontFamily: MONO, fontWeight: 600 }}>{head.venc}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
          <span style={{ padding: "2px 7px", borderRadius: 4, background: `${cor}22`, color: cor, fontSize: 9, fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
            {head.status}
          </span>
          {isMulti && (
            <span style={{ padding: "2px 6px", borderRadius: 4, background: `${T.blue2}22`, color: T.blue2, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
              {rows.length}x
            </span>
          )}
        </div>
        <div style={{ paddingLeft: 8, overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: isMulti ? T.blue2 : T.txt, fontWeight: isMulti ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {head.fornecedor}
            {subTipo && (
              <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 3, background: "rgba(148,163,184,0.15)", color: T.muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", verticalAlign: "middle" }}>
                {subTipo}
              </span>
            )}
          </div>
          {head.descricao && (
            <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {head.descricao}
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={head.categoria}>
          {head.categoria}
        </div>
        <div style={{ fontSize: 13, color: T.red, fontFamily: MONO, fontWeight: 700, textAlign: "right" }}>
          {fmt.brl(isMulti ? total : head.valor)}
        </div>
      </div>

      {expanded && isMulti && (
        <div style={{ background: "rgba(255,255,255,0.018)", borderBottom: `1px solid rgba(148,163,184,0.12)` }}>
          {rows.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: COLS, padding: "5px 14px 5px 50px", alignItems: "center", borderBottom: i < rows.length - 1 ? `1px solid rgba(148,163,184,0.07)` : "none" }}>
              <div /><div /><div />
              <div style={{ paddingLeft: 8, overflow: "hidden" }}>
                <div style={{ fontSize: 11, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.descricao || c.fornecedor}
                </div>
              </div>
              <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.categoria}>
                {c.categoria}
              </div>
              <div style={{ fontSize: 11, color: T.red, fontFamily: MONO, fontWeight: 600, textAlign: "right" }}>
                {fmt.brl(c.valor)}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "5px 14px 6px", borderTop: `1px solid rgba(148,163,184,0.07)` }}>
            <span style={{ fontSize: 10, color: T.muted }}>Total</span>
            <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: T.red }}>{fmt.brl(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function compareIds(scriptRows, granatumRows) {
  const scriptIds = new Set(scriptRows.map(row => String(row.id || "").trim()).filter(Boolean));
  const granatumIds = new Set(granatumRows.map(row => String(row.id || "").trim()).filter(Boolean));
  return {
    comuns: [...granatumIds].filter(id => scriptIds.has(id)).length,
    soGranatum: [...granatumIds].filter(id => !scriptIds.has(id)).length,
    soScript: [...scriptIds].filter(id => !granatumIds.has(id)).length,
  };
}

function metaValue(meta, label) {
  return toNum(getByLabel(meta, label));
}

function formatWindow(granatumData) {
  if (!granatumData?.interval) return "Sem janela";
  return `${granatumData.interval.inicio} ate ${granatumData.interval.fim}`;
}

export default function ContasPagarLabs() {
  const [modoFonte, setModoFonte] = useState("pagar");
  const [faixa, setFaixa] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [calendarView, setCalendarView] = useState("diario");
  const [modoVisao, setModoVisao] = useState("Executivo");
  const [pagina, setPagina] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [expandidos, setExpandidos] = useState(new Set());
  const toggleExpandido = key => setExpandidos(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const POR_PAG = 30;

  const granatum = useGranatumLabs(modoFonte);
  const sheets = useSheets(["contas_pagar", "contas_vencidas", "saldos"]);
  const isVencidas = modoFonte === "vencidas";
  const faixas = isVencidas ? FAIXAS_VENCIDAS : FAIXAS_PAGAR;
  const PRESETS = useMemo(() => buildPresets(modoFonte), [modoFonte]);
  const sheetKey = isVencidas ? "contas_vencidas" : "contas_pagar";

  const granatumRows = useMemo(() => extrairContasLabs(granatum.data?.rows || [], modoFonte), [granatum.data, modoFonte]);
  const scriptRows = useMemo(() => {
    const rows = sheets[sheetKey].data?.data || [];
    return rows.map(r => {
      const base = extrairContasLabs([{
        DATA_VENCIMENTO: r.DATA_VENCIMENTO,
        FORNECEDOR: r.FORNECEDOR,
        DESCRICAO: r.DESCRICAO || r.DESCRIÇÃO,
        CATEGORIA: r.CATEGORIA || r.CATEGORIA_ID,
        VALOR_BRUTO: r.VALOR_BRUTO,
        VALOR_DEDUCOES: r.VALOR_DEDUCOES,
        VALOR_LIQUIDO: r.VALOR_LIQUIDO,
        ID: r.ID,
        DIAS_EM_ATRASO: r.DIAS_EM_ATRASO,
      }], modoFonte)[0];
      return base;
    }).filter(Boolean);
  }, [modoFonte, sheetKey, sheets]);

  const scriptMeta = sheets[sheetKey].data?.meta || [];
  const granatumMeta = granatum.data?.meta || [];
  const comparativo = useMemo(() => compareIds(scriptRows, granatumRows), [granatumRows, scriptRows]);

  const saldoAtual = Array.isArray(sheets.saldos.data)
    ? toNum(getByLabel(sheets.saldos.data, "TOTAL"))
    : 0;

  const periodoLabel = dataIni || dataFim
    ? `${dataIni ? parseInputDate(dataIni).toLocaleDateString("pt-BR") : "inicio"} ate ${dataFim ? parseInputDate(dataFim).toLocaleDateString("pt-BR") : "fim"}`
    : "Todo o periodo";

  const termoBusca = busca.trim().toLowerCase();
  const baseRows = granatumRows.filter(c => {
    const passaPeriodo = inDateRange(c.vencDate, dataIni, dataFim);
    const passaBusca = !termoBusca ||
      c.fornecedor.toLowerCase().includes(termoBusca) ||
      c.categoria.toLowerCase().includes(termoBusca) ||
      c.descricao.toLowerCase().includes(termoBusca) ||
      c.status.toLowerCase().includes(termoBusca) ||
      c.venc.includes(busca.trim());
    return passaPeriodo && passaBusca;
  });

  const resumo = faixas.filter(f => f.id !== "todos").map(f => {
    const rows = baseRows.filter(c => c.faixa === f.id);
    return { ...f, qtd: rows.length, valor: rows.reduce((a, c) => a + c.valor, 0) };
  });

  const filtradasBase = baseRows.filter(c => faixa === "todos" || c.faixa === faixa);
  const gruposGranatum = useMemo(() => {
    const seen = new Map();
    filtradasBase.forEach(c => {
      const key = chaveGrupoGranatum(c);
      if (!seen.has(key)) seen.set(key, { key, head: c, rows: [], total: 0 });
      const g = seen.get(key);
      g.rows.push(c);
      g.total += c.valor;
    });
    return [...seen.values()]
      .map(g => ({ ...g, rows: [...g.rows].sort((a, b) => b.valor - a.valor) }))
      .sort((a, b) =>
        (a.head.vencDate - b.head.vencDate) ||
        (b.total - a.total) ||
        a.head.fornecedor.localeCompare(b.head.fornecedor)
      );
  }, [filtradasBase]);

  const totalPaginas = Math.max(1, Math.ceil(gruposGranatum.length / POR_PAG));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const paginaGrupos = gruposGranatum.slice(paginaAtual * POR_PAG, (paginaAtual + 1) * POR_PAG);

  const total = filtradasBase.reduce((a, c) => a + c.valor, 0);
  const total7d = filtradasBase.filter(c => (isVencidas ? c.dias <= 7 : c.dias >= 0 && c.dias <= 7)).reduce((a, c) => a + c.valor, 0);
  const fornecedores = agrupar(filtradasBase, "fornecedor", 10);
  const categorias = agrupar(filtradasBase, "categoria", 8);
  const porDia = agrupar(filtradasBase.map(c => ({ ...c, dia: c.venc })), "dia", 31).sort((a, b) => {
    const [da, ma, aa] = a.label.split("/").map(Number);
    const [db, mb, ab] = b.label.split("/").map(Number);
    return new Date(aa, ma - 1, da) - new Date(ab, mb - 1, db);
  });
  const porSemana = useMemo(() => {
    const map = new Map();
    filtradasBase.forEach(c => {
      if (!c.vencDate) return;
      const ws = getWeekStart(c.vencDate);
      const [, m, d] = ws.split("-").map(Number);
      const label = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
      const cur = map.get(ws) || { label, sort: ws, valor: 0 };
      cur.valor += c.valor;
      map.set(ws, cur);
    });
    return [...map.values()].sort((a, b) => a.sort.localeCompare(b.sort));
  }, [filtradasBase]);
  const porMes = useMemo(() => {
    const map = new Map();
    filtradasBase.forEach(c => {
      if (!c.vencDate) return;
      const key = `${c.vencDate.getFullYear()}-${String(c.vencDate.getMonth() + 1).padStart(2, "0")}`;
      const label = c.vencDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const cur = map.get(key) || { label, sort: key, valor: 0 };
      cur.valor += c.valor;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => a.sort.localeCompare(b.sort));
  }, [filtradasBase]);
  const porCalendario = calendarView === "semanal" ? porSemana : calendarView === "mensal" ? porMes : porDia;

  const pauta = [
    !isVencidas && total7d > saldoAtual && { cor: T.red, texto: `Compromissos até 7 dias somam ${fmt.brl(total7d)}, acima do saldo atual.` },
    isVencidas && total > 0 && { cor: T.red, texto: `A base vencida filtrada soma ${fmt.brl(total)} e merece acompanhamento direto.` },
    fornecedores[0] && { cor: T.amb, texto: `Maior concentração no filtro: ${fornecedores[0].label}, com ${fmt.brl(fornecedores[0].valor)}.` },
    categorias[0] && { cor: T.sub, texto: `Categoria mais relevante: ${categorias[0].label}, com ${fmt.brl(categorias[0].valor)}.` },
  ].filter(Boolean);

  const alertasExecutivos = [
    !isVencidas && total7d > saldoAtual && {
      status: "atencao",
      title: "Pressão de caixa nos próximos 7 dias",
      value: fmt.brlk(total7d),
      text: `Compromissos de curto prazo equivalem a ${saldoAtual ? (total7d / Math.abs(saldoAtual)).toFixed(1) : "0"}x o saldo atual.`,
      color: T.red,
    },
    isVencidas && total > 0 && {
      status: "vencidos",
      title: "Carteira vencida monitorada",
      value: fmt.brlk(total),
      text: `${filtradasBase.length} lançamentos no filtro atual.`,
      color: T.red,
    },
    fornecedores[0] && {
      status: "concentracao",
      title: "Maior fornecedor no recorte",
      value: fmt.brlk(fornecedores[0].valor),
      text: fornecedores[0].label,
      color: T.amb,
    },
  ];

  const totalScript = metaValue(scriptMeta, isVencidas ? "TOTAL_VENCIDO" : "TOTAL_60D") || scriptRows.reduce((sum, row) => sum + row.valor, 0);
  const totalGranatum = metaValue(granatumMeta, isVencidas ? "TOTAL_VENCIDO" : "TOTAL_60D") || granatumRows.reduce((sum, row) => sum + row.valor, 0);

  const gerarHtml = () => buildOperationalReportHtml({
    title: isVencidas ? "Contas Vencidas - API Sistema" : "Contas a Pagar - API Sistema",
    subtitle: "Visão operacional via API do sistema conforme filtros aplicados.",
    filters: [
      { label: "Aging", value: faixas.find(f => f.id === faixa)?.label || "Todos" },
      { label: "Período", value: periodoLabel },
      { label: "Busca", value: busca.trim() || "Sem filtro" },
      { label: "Janela", value: formatWindow(granatum.data) },
    ],
    kpis: [
      { label: "Total filtrado", value: fmt.brl(total), sub: `${filtradasBase.length} lançamentos` },
      { label: "Total Script Sheets", value: fmt.brl(totalScript), sub: "auditoria" },
      { label: "Total API Sistema", value: fmt.brl(totalGranatum), sub: "fonte principal" },
      { label: "Delta", value: fmt.brl(totalGranatum - totalScript), sub: `${comparativo.soGranatum}/${comparativo.soScript} IDs` },
    ],
    totalLabel: "Total no filtro",
    totalValue: total,
    sections: [
      {
        title: "Aging",
        rows: resumo,
        columns: [
          { label: "Faixa", key: "label" },
          { label: "Lançamentos", key: "qtd", num: true },
          { label: "Valor", key: "valor", num: true, money: true },
        ],
      },
      {
        title: "Ranking por fornecedor",
        rows: fornecedores,
        columns: [
          { label: "Fornecedor", key: "label" },
          { label: "Valor", key: "valor", num: true, money: true },
        ],
      },
      {
        title: "Ranking por categoria",
        rows: categorias,
        columns: [
          { label: "Categoria", key: "label" },
          { label: "Valor", key: "valor", num: true, money: true },
        ],
      },
    ],
    rows: filtradasBase,
    columns: [
      { label: "Vencimento", key: "venc" },
      { label: "Fornecedor", key: "fornecedor" },
      { label: "Categoria", key: "categoria" },
      { label: "Status", key: "status" },
      { label: "Descrição", key: "descricao" },
      { label: "Líquido", key: "valor", num: true, money: true },
    ],
  });

  const exportarHtml = () => {
    const html = gerarHtml();
    downloadHtml(`contas-${modoFonte}-api-sistema-${new Date().toISOString().slice(0, 10)}.html`, html);
  };

  const exportarPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(`contas-${modoFonte}-api-sistema-${new Date().toISOString().slice(0, 10)}.pdf`, gerarHtml());
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    setFaixa("todos");
    setBusca("");
    setDataIni("");
    setDataFim("");
    setPagina(0);
    setExpandidos(new Set());
  }, [modoFonte]);

  const loading = granatum.loading || sheets[sheetKey].loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 48 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <Kpi label="Total filtrado" value={fmt.brlk(total)} sub={`${filtradasBase.length} lançamentos`} cor={T.red} />
        <Kpi
          label={isVencidas ? "Base vencida curta" : "Até 7 dias"}
          value={fmt.brlk(total7d)}
          sub={isVencidas ? "atraso curto" : `${saldoAtual ? (total7d / Math.abs(saldoAtual)).toFixed(1) : "0"}x saldo atual`}
          cor={T.amb}
        />
        <Kpi label="Delta Script Sheets vs API Sistema" value={fmt.brlk(totalGranatum - totalScript)} sub={`${comparativo.soGranatum}/${comparativo.soScript} IDs`} cor={Math.abs(totalGranatum - totalScript) < 0.005 ? T.grn : T.blue2} />
        <Kpi label="Maior fornecedor" value={fornecedores[0] ? fmt.brlk(fornecedores[0].valor) : "-"} sub={fornecedores[0]?.label} cor={T.blue2} />
      </div>

      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[{ id: "pagar", label: "Contas a Pagar" }, { id: "vencidas", label: "Contas Vencidas" }].map(item => {
                const active = modoFonte === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setModoFonte(item.id)}
                    style={{ padding: "6px 11px", borderRadius: 6, border: `1px solid ${active ? T.blue : T.brd}`, background: active ? "rgba(245,158,11,0.13)" : "transparent", color: active ? T.blue2 : T.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <ViewModeToggle value={modoVisao} onChange={setModoVisao} />
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>API Sistema</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {PRESETS.map(p => {
              const ativo = dataIni === p.ini && dataFim === p.fim;
              return (
                <button
                  key={p.label}
                  onClick={() => { setDataIni(p.ini); setDataFim(p.fim); setPagina(0); }}
                  style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${ativo ? T.blue : T.brd}`, background: ativo ? "rgba(245,158,11,0.13)" : "transparent", color: ativo ? T.blue2 : T.muted, fontSize: 11, fontWeight: ativo ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="date"
              value={dataIni}
              onChange={e => { setDataIni(e.target.value); setPagina(0); }}
              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, outline: "none", fontSize: 12 }}
            />
            <input
              type="date"
              value={dataFim}
              onChange={e => { setDataFim(e.target.value); setPagina(0); }}
              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, outline: "none", fontSize: 12 }}
            />
            {(dataIni || dataFim) && (
              <button
                onClick={() => { setDataIni(""); setDataFim(""); setPagina(0); }}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: T.muted, fontSize: 12 }}
              >
                Limpar período
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Buscar fornecedor, categoria, status..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPagina(0); }}
              style={{ minWidth: 260, padding: "7px 11px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, outline: "none", fontSize: 12 }}
            />
            <button
              onClick={granatum.refresh}
              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: T.sub, fontSize: 12 }}
            >
              Atualizar leitura
            </button>
            <ReportActions onHtml={exportarHtml} onPdf={exportarPdf} pdfLoading={pdfLoading} />
          </div>
        </div>

        <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
          Fonte principal: <strong style={{ color: T.sub }}>API Sistema</strong>. Comparativo com Script Sheets mantido em paralelo para auditoria. Janela: {formatWindow(granatum.data)}{granatum.data?.updatedAt ? ` • atualizado em ${granatum.data.updatedAt}` : ""}.
        </div>

        {granatum.error && <div style={{ marginBottom: 12, fontSize: 11, color: T.red }}>Erro API Sistema: {granatum.error}</div>}
        {loading && <div style={{ marginBottom: 12, fontSize: 11, color: T.muted }}>Carregando leitura… na primeira leitura pode levar alguns segundos.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
          {[{ id: "todos", label: "Todos", cor: T.blue2, qtd: baseRows.length, valor: baseRows.reduce((a, c) => a + c.valor, 0) }, ...resumo].map(f => (
            <button
              key={f.id}
              onClick={() => { setFaixa(f.id); setPagina(0); }}
              style={{ textAlign: "left", padding: "12px 13px", borderRadius: 8, border: `1px solid ${faixa === f.id ? f.cor : T.brd}`, background: faixa === f.id ? "rgba(245,158,11,0.07)" : T.surf, cursor: "pointer" }}
            >
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 15, color: f.cor, fontFamily: MONO, fontWeight: 600, marginTop: 4 }}>{fmt.brlk(f.valor)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{f.qtd} lançamentos</div>
            </button>
          ))}
        </div>
      </Card>

      {modoVisao === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {modoVisao === "Executivo" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>Calendário financeiro</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["diario", "semanal", "mensal"].map(v => (
                  <button
                    key={v}
                    onClick={() => setCalendarView(v)}
                    style={{ padding: "3px 10px", borderRadius: 5, border: `1px solid ${calendarView === v ? T.blue : T.brd}`, background: calendarView === v ? "rgba(245,158,11,0.13)" : "transparent", color: calendarView === v ? T.blue2 : T.muted, fontSize: 10, fontWeight: calendarView === v ? 600 : 400, cursor: "pointer" }}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={porCalendario} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval={calendarView === "diario" ? Math.max(Math.floor(porCalendario.length / 12), 0) : 0} />
                <YAxis tickFormatter={fmt.brlk} tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="valor" name="Vencimentos" radius={[3, 3, 0, 0]} maxBarSize={calendarView === "mensal" ? 40 : 28}>
                  {porCalendario.map((d, i) => <Cell key={i} fill={i < 4 && calendarView === "diario" ? T.red : T.amb} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Pauta financeira</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {pauta.map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "8px 1fr", gap: 9, alignItems: "start", padding: "9px 10px", border: `1px solid ${T.brd}`, borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.cor, marginTop: 4 }} />
                  <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.45 }}>{p.texto}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {modoVisao === "Executivo" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Ranking por fornecedor</div>
            {fornecedores.map(f => (
              <div key={f.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "8px 0", borderBottom: `1px solid ${T.brd}` }}>
                <span style={{ fontSize: 12, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
                <span style={{ fontSize: 12, color: T.red, fontFamily: MONO, fontWeight: 600 }}>{fmt.brlk(f.valor)}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Ranking por categoria</div>
            {categorias.map(f => (
              <div key={f.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "8px 0", borderBottom: `1px solid ${T.brd}` }}>
                <span style={{ fontSize: 12, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
                <span style={{ fontSize: 12, color: T.red, fontFamily: MONO, fontWeight: 600 }}>{fmt.brlk(f.valor)}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Auditoria Script x Granatum</div>
            {[
              { label: "Total Script", value: totalScript, cor: T.blue2 },
              { label: "Total Granatum", value: totalGranatum, cor: T.amb },
              { label: "Delta", value: totalGranatum - totalScript, cor: Math.abs(totalGranatum - totalScript) < 0.005 ? T.grn : T.red },
            ].map(item => (
              <div key={item.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "8px 0", borderBottom: `1px solid ${T.brd}` }}>
                <span style={{ fontSize: 12, color: T.sub }}>{item.label}</span>
                <span style={{ fontSize: 12, color: item.cor, fontFamily: MONO, fontWeight: 600 }}>{fmt.brl(item.value)}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 12, color: T.sub }}>IDs divergentes</span>
              <span style={{ fontSize: 12, color: T.red, fontFamily: MONO, fontWeight: 600 }}>{comparativo.soGranatum}/{comparativo.soScript}</span>
            </div>
          </Card>
        </div>
      )}

      {modoVisao === "Analítico" && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderBottom: `1px solid ${T.brd}` }}>
            <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>{gruposGranatum.length} lançamentos</span>
            <span style={{ fontSize: 13, color: T.red, fontFamily: MONO, fontWeight: 600 }}>{fmt.brl(total)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "28px 92px 112px minmax(340px,1.3fr) minmax(320px,1fr) 128px", padding: "7px 14px", background: T.surf, borderBottom: `1px solid ${T.brd}` }}>
            {["", "Vencimento", "Status", "Fornecedor / Descrição", "Categoria", "Líquido"].map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, textAlign: i === 5 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {paginaGrupos.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>Nenhum lançamento encontrado para os filtros aplicados.</div>
          )}
          {paginaGrupos.map(grupo => (
            <GranatumGrupoPagar
              key={grupo.key}
              grupo={grupo}
              expanded={expandidos.has(grupo.key)}
              onToggle={() => toggleExpandido(grupo.key)}
            />
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderTop: `1px solid ${T.brd}`, background: T.surf }}>
            <div style={{ fontSize: 12, color: T.muted }}>
              {gruposGranatum.length > 0 && `${paginaAtual * POR_PAG + 1}-${Math.min((paginaAtual + 1) * POR_PAG, gruposGranatum.length)} de ${gruposGranatum.length}`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={paginaAtual === 0}
                style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: paginaAtual === 0 ? T.dim : T.muted, fontSize: 11 }}
              >
                {"< Anterior"}
              </button>
              <span style={{ fontSize: 11, color: T.muted }}>Página {paginaAtual + 1} de {totalPaginas}</span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaAtual >= totalPaginas - 1}
                style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: paginaAtual >= totalPaginas - 1 ? T.dim : T.muted, fontSize: 11 }}
              >
                {"Próxima >"}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
