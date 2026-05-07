import { useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend, PieChart, Pie,
} from "recharts";
import { T, CA, MONO } from "../theme";
import { useSheets, toNum, parseDate, fmt } from "../hooks/useSheets";
import { resolveCategory } from "../utils/categoryResolver";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";
import { getActiveEmpresaId } from "../empresas/luniq-inteligencia-financeira/empresaAtiva";

// --- DADOS HISTORICOS ---------------------------------------------------------
const TODOS_MESES = [
  { ano:2025,mes:1, label:"Jan/25",diasNo:31,entradas:905012.90, saidas:888092.33  },
  { ano:2025,mes:2, label:"Fev/25",diasNo:28,entradas:936735.93, saidas:907311.79  },
  { ano:2025,mes:3, label:"Mar/25",diasNo:31,entradas:636249.50, saidas:638741.77  },
  { ano:2025,mes:4, label:"Abr/25",diasNo:30,entradas:712907.17, saidas:709914.68  },
  { ano:2025,mes:5, label:"Mai/25",diasNo:31,entradas:941036.98, saidas:869081.35  },
  { ano:2025,mes:6, label:"Jun/25",diasNo:30,entradas:707717.75, saidas:757054.87  },
  { ano:2025,mes:7, label:"Jul/25",diasNo:31,entradas:561116.63, saidas:623846.16  },
  { ano:2025,mes:8, label:"Ago/25",diasNo:31,entradas:397681.74, saidas:403494.93  },
  { ano:2025,mes:9, label:"Set/25",diasNo:30,entradas:518971.45, saidas:465827.19  },
  { ano:2025,mes:10,label:"Out/25",diasNo:31,entradas:514147.43, saidas:506096.16  },
  { ano:2025,mes:11,label:"Nov/25",diasNo:30,entradas:576631.49, saidas:635455.55  },
  { ano:2025,mes:12,label:"Dez/25",diasNo:31,entradas:330765.28, saidas:310100.78  },
  { ano:2026,mes:1, label:"Jan/26",diasNo:31,entradas:596712.39, saidas:478095.10  },
  { ano:2026,mes:2, label:"Fev/26",diasNo:28,entradas:224318.84, saidas:269246.43  },
  { ano:2026,mes:3, label:"Mar/26",diasNo:31,entradas:346351.86, saidas:383773.56  },
  { ano:2026,mes:4, label:"Abr/26",diasNo:11,entradas: 78667.92, saidas: 91311.11  },
];

const TODOS_TRIM = [
  { label:"T1/25",ano:2025,trim:1,entradas:2477987.33,saidas:2434145.89},
  { label:"T2/25",ano:2025,trim:2,entradas:2361661.90,saidas:2336050.90},
  { label:"T3/25",ano:2025,trim:3,entradas:1477769.82,saidas:1493168.28},
  { label:"T4/25",ano:2025,trim:4,entradas:1421544.20,saidas:1451652.49},
  { label:"T1/26",ano:2026,trim:1,entradas:1167383.09,saidas:1131115.09},
  { label:"T2/26",ano:2026,trim:2,entradas:  78667.92,saidas:  91311.11},
];

const TODOS_ANOS = [
  { label:"2025",ano:2025,entradas:7738963.25,saidas:7715017.56},
  { label:"2026",ano:2026,entradas:1246051.01,saidas:1222426.20},
];

const DETALHE = [
  { data:"10/04/26",ano:2026,mes:4,saldo_ini: 47570.50,entradas: 3836.88,saidas:52142.26,saldo_fin: -734.88   },
  { data:"09/04/26",ano:2026,mes:4,saldo_ini: 41961.63,entradas: 5608.87,saidas:    0.00,saldo_fin:47570.50   },
  { data:"08/04/26",ano:2026,mes:4,saldo_ini: 34281.38,entradas: 7680.25,saidas:    0.00,saldo_fin:41961.63   },
  { data:"07/04/26",ano:2026,mes:4,saldo_ini: 20941.34,entradas:13340.04,saidas:    0.00,saldo_fin:34281.38   },
  { data:"06/04/26",ano:2026,mes:4,saldo_ini: 70245.99,entradas:20837.74,saidas:70142.39,saldo_fin:20941.34   },
  { data:"02/04/26",ano:2026,mes:4,saldo_ini: 55010.61,entradas:15944.61,saidas:  709.43,saldo_fin:70245.79   },
  { data:"01/04/26",ano:2026,mes:4,saldo_ini: 60213.69,entradas:15256.21,saidas:20459.29,saldo_fin:55010.61   },
  { data:"31/03/26",ano:2026,mes:3,saldo_ini: 39666.22,entradas:20547.47,saidas:    0.00,saldo_fin:60213.69   },
  { data:"30/03/26",ano:2026,mes:3,saldo_ini: 15260.59,entradas:24764.63,saidas:  359.00,saldo_fin:39666.22   },
  { data:"27/03/26",ano:2026,mes:3,saldo_ini: 30110.05,entradas:12580.89,saidas:27430.35,saldo_fin:15260.59   },
  { data:"25/03/26",ano:2026,mes:3,saldo_ini: 64132.67,entradas:19246.16,saidas:66860.13,saldo_fin:16518.70   },
  { data:"24/03/26",ano:2026,mes:3,saldo_ini: 32699.09,entradas:31433.58,saidas:    0.00,saldo_fin:64132.67   },
  { data:"23/03/26",ano:2026,mes:3,saldo_ini: 19029.25,entradas:13669.84,saidas:    0.00,saldo_fin:32699.09   },
  { data:"20/03/26",ano:2026,mes:3,saldo_ini: 67203.30,entradas: 7276.54,saidas:55450.61,saldo_fin:19029.23   },
  { data:"19/03/26",ano:2026,mes:3,saldo_ini: 62423.83,entradas: 4779.47,saidas:    0.00,saldo_fin:67203.30   },
  { data:"18/03/26",ano:2026,mes:3,saldo_ini: 48776.83,entradas:13647.00,saidas:    0.00,saldo_fin:62423.83   },
  { data:"17/03/26",ano:2026,mes:3,saldo_ini: 31331.11,entradas:17445.72,saidas:    0.00,saldo_fin:48776.83   },
];

const ATALHOS = [
  { label:"3m",meses:3 }, { label:"6m",meses:6 }, { label:"12m",meses:12 },
  { label:"Este ano",anoAtual:true }, { label:"Tudo",tudo:true },
];
const ML = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CAT_CORES = [T.red,T.purp,T.amb];

function grupoFinanceiro(categoria = "") {
  const c = categoria.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/(FINEX|JUROS|TARIFA|IOF|FINANC|EMPREST|BANCO|ANTECIP|CREDITO|CARTAO)/.test(c)) return "FINEX";
  if (/(CAPEX|INVEST|IMOBILIZ|EQUIP|NOTEBOOK|COMPUTADOR|SOFTWARE|LICENCA|INFRA)/.test(c)) return "CAPEX";
  return "OPEX";
}

function normalizarFornecedor(fornecedor = "") {
  const f = fornecedor.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/TOTAL.?PASS|TOTALPASS/.test(f)) return "Total Pass";
  if (/^CAJU|CAJU\s/.test(f)) return "Caju";
  if (/GOVERNO.?FEDERAL|RECEITA.?FEDERAL|^INSS$|^IRRF?$/.test(f)) return "Governo Federal";
  if (/FGTS/.test(f)) return "FGTS";
  return fornecedor.trim();
}

function chaveLancamentoPago(c) {
  return [c.data, normalizarFornecedor(c.fornecedor)].join("||").toLowerCase();
}

function ordenarPorTotalLancamento(rows) {
  const totais = new Map();
  rows.forEach(c => {
    const key = chaveLancamentoPago(c);
    totais.set(key, (totais.get(key) || 0) + c.valor);
  });
  return [...rows].sort((a, b) => {
    const dateDiff = b.dataObj - a.dataObj;
    if (dateDiff) return dateDiff;
    const totalDiff = (totais.get(chaveLancamentoPago(b)) || 0) - (totais.get(chaveLancamentoPago(a)) || 0);
    return totalDiff || a.fornecedor.localeCompare(b.fornecedor) || b.valor - a.valor;
  });
}

function agruparGranatumPagas(rows) {
  const ordered = ordenarPorTotalLancamento(rows);
  const result = [];
  const seen = new Map();
  ordered.forEach(c => {
    const key = chaveLancamentoPago(c);
    if (!seen.has(key)) {
      const g = { key, head: c, rows: [], total: 0 };
      seen.set(key, g);
      result.push(g);
    }
    const g = seen.get(key);
    g.rows.push(c);
    g.total += c.valor;
  });
  return result;
}

function GranatumGrupoPagasFluxo({ grupo, expanded, onToggle }) {
  const { head, rows, total } = grupo;
  const isMulti = rows.length > 1;
  const isComposto = !isMulti && (head.deducoes || 0) > 0;
  const temDetalhe = isMulti || isComposto;
  const nomePrincipal = isMulti ? normalizarFornecedor(head.fornecedor) : head.fornecedor;
  const mesCurto = head.dataObj
    ? head.dataObj.toLocaleDateString("pt-BR", { month:"short", year:"2-digit" }).replace(" de ", "/").replace(".", "")
    : head.mes;
  const COLS = "28px 94px minmax(320px,1.25fr) minmax(300px,1fr) 72px 128px";

  return (
    <div>
      <div
        onClick={temDetalhe ? onToggle : undefined}
        style={{ display:"grid", gridTemplateColumns:COLS, padding:"9px 16px", alignItems:"center",
          cursor:temDetalhe?"pointer":"default", borderBottom:`1px solid rgba(148,163,184,0.1)`,
          background:"transparent", transition:"background 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
        <div style={{ color:T.muted, fontSize:10, textAlign:"center", userSelect:"none", lineHeight:1 }}>
          {temDetalhe ? (expanded ? "▼" : "▶") : ""}
        </div>
        <div style={{ fontSize:11, color:T.sub, fontFamily:MONO, fontWeight:600 }}>{head.data}</div>
        <div style={{ paddingLeft:4, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, overflow:"hidden" }}>
            {isMulti && (
              <span style={{ padding:"1px 7px", borderRadius:4, background:`${T.blue2}1a`, color:T.blue2,
                fontSize:9, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
                {rows.length}×
              </span>
            )}
            <span style={{ fontSize:12, color:isMulti||isComposto?T.blue2:T.txt,
              fontWeight:isMulti||isComposto?600:400,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {nomePrincipal}
            </span>
          </div>
          {!isMulti && head.descricao && head.descricao !== "-" && (
            <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap", marginTop:2 }}>
              {head.descricao}
            </div>
          )}
        </div>
        <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
          title={head.categoria}>{head.categoria}</div>
        <div style={{ fontSize:10, color:T.muted, textAlign:"center" }}>{mesCurto}</div>
        <div style={{ fontSize:13, color:T.red, fontFamily:MONO, fontWeight:700, textAlign:"right" }}>
          -{fmt.brl(isMulti ? total : head.valor)}
        </div>
      </div>

      {expanded && isComposto && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.1)` }}>
          {[
            { label:"Bruto", valor:head.valorBruto, negative:false, color:T.sub, bold:false },
            { label:"Deduções", value:head.deducoes, negative:true, color:T.amb, bold:false },
            { label:"Líquido", value:head.valor, negative:false, color:T.txt, bold:true },
          ].map((line, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
              padding:"5px 16px 5px 52px", alignItems:"center",
              borderBottom:i<2?`1px solid rgba(148,163,184,0.06)`:"none" }}>
              <div /><div />
              <div style={{ paddingLeft:4, fontSize:11, color:line.color, fontWeight:line.bold?700:400 }}>
                {line.label}
              </div>
              <div /><div />
              <div style={{ fontSize:11, fontFamily:MONO, fontWeight:line.bold?700:600,
                textAlign:"right", color:line.color }}>
                {line.negative ? "−" : ""}{fmt.brl(line.value ?? line.valor)}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && isMulti && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.1)` }}>
          {rows.map((c, i) => {
            const subMes = c.dataObj
              ? c.dataObj.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).replace(" de ","/").replace(".","")
              : c.mes;
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
                padding:"5px 16px 5px 52px", alignItems:"center",
                borderBottom:i<rows.length-1?`1px solid rgba(148,163,184,0.06)`:"none" }}>
                <div />
                <div style={{ fontSize:10, color:T.muted, fontFamily:MONO }}>{c.data}</div>
                <div style={{ paddingLeft:4, overflow:"hidden" }}>
                  <div style={{ fontSize:11, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.descricao && c.descricao !== "-" ? c.descricao : c.categoria}
                  </div>
                </div>
                <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.categoria}</div>
                <div style={{ fontSize:10, color:T.muted, textAlign:"center" }}>{subMes}</div>
                <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>
                  -{fmt.brl(c.valor)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- HELPERS -----------------------------------------------------------------

const corR = (v) => v >= 0 ? T.grn : T.red;

function mesesAtras(n, ultimo) {
  let { ano, mes } = ultimo;
  mes -= (n - 1);
  while (mes <= 0) { mes += 12; ano--; }
  return { ano, mes };
}

function pick(row, names) {
  const entries = Object.entries(row);
  const norm = s => s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/_+$/,"").toUpperCase();
  for (const name of names) {
    const found = entries.find(([k]) => norm(k) === norm(name));
    if (found) return found[1];
  }
  return undefined;
}

function montarHistoricoFluxo(data) {
  if (!data?.length) return null;
  const detalhe = data
    .map(r => {
      const dataObj = parseDate(pick(r, ["DATA"]));
      if (!dataObj) return null;
      const entradas = toNum(pick(r, ["ENTRADAS"]));
      const saidas = Math.abs(toNum(pick(r, ["SAIDAS", "SAÍDAS"])));
      const aportesMario = toNum(pick(r, ["APORTES SOCIOS", "APORTES_SÓCIOS", "APORTES SOCIOS", "APORTES MARIO", "APORTES_MARIO", "APORTES MÁRIO"]));
      const cartaoMario = toNum(pick(r, ["DESPESAS SOCIOS", "DESPESAS_SÓCIOS", "DESPESAS CARTAO SOCIOS", "DESPESAS_CARTAO_SOCIOS", "DESPESAS CARTAO MARIO", "DESPESAS_CARTAO_MARIO", "DESPESAS CARTÃO MÁRIO", "DESPESAS CARTÃO MARIO"]));
      return {
        data: dataObj.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit" }),
        dataObj,
        ano: dataObj.getFullYear(),
        mes: dataObj.getMonth() + 1,
        saldo_ini: toNum(pick(r, ["SALDO_INICIAL", "SALDO INICIAL"])),
        entradas,
        saidas,
        aportesMario,
        cartaoMario,
        saldo_fin: toNum(pick(r, ["SALDO_FINAL", "SALDO FINAL"])),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.dataObj - a.dataObj);

  if (!detalhe.length) return null;

  const porMes = new Map();
  detalhe.forEach(d => {
    const key = `${d.ano}-${String(d.mes).padStart(2,"0")}`;
    const atual = porMes.get(key) || { ano:d.ano, mes:d.mes, label:`${ML[d.mes-1]}/${String(d.ano).slice(2)}`, diasNo:0, entradas:0, saidas:0, aportesMario:0, cartaoMario:0 };
    atual.diasNo += 1;
    atual.entradas += d.entradas;
    atual.saidas += d.saidas;
    atual.aportesMario += d.aportesMario;
    atual.cartaoMario += d.cartaoMario;
    porMes.set(key, atual);
  });

  const meses = [...porMes.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const porTrim = new Map();
  meses.forEach(m => {
    const trim = Math.ceil(m.mes / 3);
    const key = `${m.ano}-T${trim}`;
    const atual = porTrim.get(key) || { label:`T${trim}/${String(m.ano).slice(2)}`, ano:m.ano, trim, entradas:0, saidas:0, aportesMario:0, cartaoMario:0 };
    atual.entradas += m.entradas;
    atual.saidas += m.saidas;
    atual.aportesMario += m.aportesMario;
    atual.cartaoMario += m.cartaoMario;
    porTrim.set(key, atual);
  });

  const porAno = new Map();
  meses.forEach(m => {
    const atual = porAno.get(m.ano) || { label:String(m.ano), ano:m.ano, entradas:0, saidas:0, aportesMario:0, cartaoMario:0 };
    atual.entradas += m.entradas;
    atual.saidas += m.saidas;
    atual.aportesMario += m.aportesMario;
    atual.cartaoMario += m.cartaoMario;
    porAno.set(m.ano, atual);
  });

  return {
    meses,
    trims: [...porTrim.values()].sort((a, b) => a.ano - b.ano || a.trim - b.trim),
    anos: [...porAno.values()].sort((a, b) => a.ano - b.ano),
    detalhe,
  };
}

// Extrai contas pagas da aba faturas_historico
function extrairContasPagas(data) {
  const linhas = data?.data || [];
  return linhas
    .filter(r => {
      const d = parseDate(r["DATA_PAGAMENTO"]);
      return d && d.getFullYear() >= 2025;
    })
    .map(r => {
      const d = parseDate(r["DATA_PAGAMENTO"]);
      return {
        data:       d.toLocaleDateString("pt-BR"),
        dataObj:    d,
        fornecedor: (r["FORNECEDOR"]   || r["BANCO_ORIGEM"] || "").toString().trim(),
        categoria:  resolveCategory(r),
        descricao:  (r["DESCRICAO"] || r["DESCRIÇÃO"] || r["HISTORICO"] || r["HISTÓRICO"] || "").toString().trim(),
        valor: Math.abs(toNum(r["VALOR"] ?? r["VALOR_LIQUIDO"] ?? r["VALOR_BRUTO"] ?? 0)),
      };
    })
    .filter(r => r.valor > 0)
    .sort((a, b) => b.dataObj - a.dataObj);
}

// --- COMPONENTES -------------------------------------------------------------

const Card = ({ children, style = {} }) => (
  <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius:8, ...style }}>{children}</div>
);

const Label = ({ children, style = {} }) => (
  <div style={{ fontSize: 10, fontWeight:600, color:T.muted, textTransform: "uppercase", letterSpacing:"0", marginBottom: 14, ...style }}>{children}</div>
);

const pesoNumero = 450;

const KPI = ({ label, value, cor = T.txt, size = 16 }) => (
  <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius:8, padding: "13px 14px", position: "relative", overflow: "hidden", minWidth: 0 }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cor }} />
    <div style={{ fontSize: 10, color:T.muted, textTransform: "uppercase", letterSpacing:"0", fontWeight: 500, marginBottom: 6, lineHeight: 1.35 }}>{label}</div>
    <div style={{ fontSize: typeof size === "number" ? Math.min(size, 15) : size, fontWeight: pesoNumero, color: cor, fontFamily:MONO, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
  </div>
);

function extrairAportePendenteSocios(data, realizadoHistorico = 0) {
  if (!data) return { valor: 0, blocked: false };
  if (!Array.isArray(data)) {
    if (data.blocked) return { valor: 0, blocked: true };
    const total = toNum(data.total);
    const realizado = toNum(data.realizado);
    const pendente = toNum(data.pendente ?? data.value);
    const abrDez = toNum(data.abrDez);
    if (total > 0 && realizado <= 0 && realizadoHistorico > 0) {
      return { valor: Math.max(total - realizadoHistorico + abrDez, 0), blocked: false };
    }
    return { valor: pendente, blocked: false };
  }
  const row = data.find(r => Object.values(r).some(v => v !== null && v !== ""));
  return { valor: toNum(row?.value ?? Object.values(row || {})[1] ?? Object.values(row || {})[0]), blocked: false };
}

function rankingPagamentos(rows, campo, limite = 8) {
  const mapa = new Map();
  rows.forEach(c => mapa.set(c[campo] || "Sem informação", (mapa.get(c[campo] || "Sem informação") || 0) + c.valor));
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a,b) => b.valor - a.valor)
    .slice(0, limite);
}

const Btn = ({ label, ativo, onClick }) => (
  <button onClick={onClick} style={{ padding: "5px 13px", borderRadius: 6, border: `1px solid ${ativo ? T.blue : T.brd}`, background: ativo ? "rgba(245,158,11,0.15)" : "transparent", color: ativo ? T.blue2 : T.muted, fontSize: 12, fontWeight: ativo ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
    {label}
  </button>
);

const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ background: T.surf, border: `1px solid ${T.brd}`, borderRadius: 6, color: T.sub, fontSize: 12, padding: "5px 28px 5px 10px", cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238d8379' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const temPilhas = payload.some(p => ["entradas","aportesMario","saidas","cartaoMario"].includes(p.dataKey));
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.brd2}`, borderRadius: 6, padding: "10px 14px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
      <div style={{ color: T.sub, marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {temPilhas && (
        <div style={{ display:"flex", flexDirection:"column", gap:2, paddingBottom:6, marginBottom:6, borderBottom:`1px solid ${T.brd}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:18, color:T.grn }}>
            <span>Entradas Caixa</span>
            <span style={{ fontFamily:MONO, fontWeight:500 }}>{fmt.brlk(row.entradas || 0)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", gap:18, color:"#ef4444" }}>
            <span>Saídas Caixa</span>
            <span style={{ fontFamily:MONO, fontWeight:500 }}>{fmt.brlk(row.saidas || 0)}</span>
          </div>
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: p.color, margin: "2px 0" }}>
          <span>{p.name}</span>
          <span style={{ fontFamily:MONO, fontWeight: pesoNumero }}>{fmt.brlk(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL -----------------------------------------------------

export default function FluxoHistorico() {
  const sheets = useSheets(["historico", "despesas_historico", "aportes_mario"]);
  const isDemo = getActiveEmpresaId() === "luniq-demo";
  const aporteLabel = isDemo ? "Aportes Sócios" : "Aportes Mário";
  const despesaSociosLabel = isDemo ? "Despesas Sócios" : "Despesas Mário";
  const aportePendenteLabel = isDemo ? "Aporte Pendente Sócios" : "Aporte Pendente Mário";

  const [atalho,    setAtalho]    = useState("Tudo");
  const [iniCustom, setIniCustom] = useState("2025-01");
  const [fimCustom, setFimCustom] = useState("2026-04");
  const [viewChart, setViewChart] = useState("mensal");
  const [paginaDet, setPaginaDet] = useState(0);
  const [paginaPag, setPaginaPag] = useState(0);
  const [buscaPag, setBuscaPag] = useState("");
  const [expandidosPag, setExpandidosPag] = useState(new Set());
  const [modo, setModo] = useState("Executivo");
  const toggleExpandidoPag = key => setExpandidosPag(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const POR_PAG = 10;

  const fluxoVivo = useMemo(() => montarHistoricoFluxo(sheets.historico.data), [sheets.historico.data]);
  const mesesFonte = fluxoVivo?.meses || TODOS_MESES;
  const trimsFonte = fluxoVivo?.trims || TODOS_TRIM;
  const anosFonte = fluxoVivo?.anos || TODOS_ANOS;
  const detalheFonte = fluxoVivo?.detalhe || DETALHE;
  const ultimo = useMemo(() => mesesFonte[mesesFonte.length - 1] || { ano:2026, mes:4 }, [mesesFonte]);
  const opcoesMes = useMemo(() => mesesFonte.map(m => ({
    value: `${m.ano}-${String(m.mes).padStart(2,"0")}`, label: m.label, ano: m.ano, mes: m.mes,
  })), [mesesFonte]);

  const { anoIni, mesIni, anoFim, mesFim } = useMemo(() => {
    if (atalho !== "custom") {
      const cfg = ATALHOS.find(a => a.label === atalho);
      const primeiro = mesesFonte[0] || { ano:2025, mes:1 };
      if (cfg?.tudo)     return { anoIni:primeiro.ano, mesIni:primeiro.mes, anoFim:ultimo.ano, mesFim:ultimo.mes };
      if (cfg?.anoAtual) return { anoIni:ultimo.ano, mesIni:1, anoFim:ultimo.ano, mesFim:ultimo.mes };
      if (cfg?.meses)    { const i = mesesAtras(cfg.meses, ultimo); return { anoIni:i.ano,mesIni:i.mes,anoFim:ultimo.ano,mesFim:ultimo.mes }; }
    }
    const [ai,mi] = iniCustom.split("-").map(Number);
    const [af,mf] = fimCustom.split("-").map(Number);
    return { anoIni:ai,mesIni:mi,anoFim:af,mesFim:mf };
  }, [atalho, iniCustom, fimCustom, mesesFonte, ultimo]);

  const dentro = useCallback((ano, mes) =>
    (ano > anoIni || (ano === anoIni && mes >= mesIni)) &&
    (ano < anoFim || (ano === anoFim && mes <= mesFim)), [anoIni, mesIni, anoFim, mesFim]);

  const meses   = useMemo(() => mesesFonte.filter(m => dentro(m.ano, m.mes)), [mesesFonte, dentro]);
  const trims   = useMemo(() => trimsFonte.filter(t => dentro(t.ano,(t.trim-1)*3+1) || dentro(t.ano,t.trim*3)), [trimsFonte, dentro]);
  const anos    = useMemo(() => anosFonte.filter(a => dentro(a.ano,1)||dentro(a.ano,12)), [anosFonte, dentro]);
  const detalhe = useMemo(() => detalheFonte.filter(d => dentro(d.ano,d.mes)), [detalheFonte, dentro]);
  const detPag  = detalhe.slice(paginaDet*POR_PAG, (paginaDet+1)*POR_PAG);

  const calcResultado = (d) => (d.entradas || 0) - (d.saidas || 0);
  const dadosChart = viewChart === "anual"      ? anos.map(a => ({ ...a, resultado: calcResultado(a) }))
                   : viewChart === "trimestral" ? trims.map(t => ({ ...t, resultado: calcResultado(t) }))
                   : meses.map(m => ({ ...m, resultado: calcResultado(m) }));

  // --- KPIs calculados dinamicamente do período filtrado -------------------
  const kpis = useMemo(() => {
    const ent = meses.reduce((a,m) => a+m.entradas,0);
    const sai = meses.reduce((a,m) => a+m.saidas,0);
    const aportesMario = meses.reduce((a,m) => a+(m.aportesMario || 0),0);
    const cartaoMario = meses.reduce((a,m) => a+(m.cartaoMario || 0),0);
    const totalDias = meses.reduce((a,m) => a+m.diasNo,0);
    return {
      ent, sai, aportesMario, cartaoMario,
      resultado: ent - sai,
      qtd: meses.length,
      totalDias,
      burnRateDia:    totalDias > 0 ? sai / totalDias : 0,
      mediaEntradasDia: totalDias > 0 ? ent / totalDias : 0,
    };
  }, [meses]);
  const realizadoMarioHistorico = useMemo(() => {
    const aporte = detalheFonte.reduce((a,d) => a + Math.abs(d.aportesMario || 0), 0);
    const despesa = detalheFonte.reduce((a,d) => a + Math.abs(d.cartaoMario || 0), 0);
    return Math.max(aporte, despesa);
  }, [detalheFonte]);
  const aportePendenteMario = useMemo(
    () => extrairAportePendenteSocios(sheets.aportes_mario.data, realizadoMarioHistorico),
    [sheets.aportes_mario.data, realizadoMarioHistorico]
  );

  // Contas pagas ao vivo
  const contasPagas = useMemo(() => extrairContasPagas(sheets.despesas_historico.data), [sheets.despesas_historico.data]);
  const contasPagFiltradas = useMemo(() => {
    if (modo !== "Analítico") return [];
    return contasPagas.filter(c => {
      const d = c.dataObj;
      if (!d) return false;
      const ano = d.getFullYear(), mes = d.getMonth() + 1;
      if (!dentro(ano, mes)) return false;
      const termo = buscaPag.trim().toLowerCase();
      if (!termo) return true;
      return (
        c.data.toLowerCase().includes(termo) ||
        c.fornecedor.toLowerCase().includes(termo) ||
        c.categoria.toLowerCase().includes(termo) ||
        c.descricao.toLowerCase().includes(termo) ||
        fmt.brl(c.valor).toLowerCase().includes(termo)
      );
    });
  }, [contasPagas, dentro, buscaPag, modo]);
  const gruposPagasGranatum = useMemo(() => agruparGranatumPagas(contasPagFiltradas), [contasPagFiltradas]);
  const totalPaginasPagas = Math.max(1, Math.ceil(gruposPagasGranatum.length / POR_PAG));
  const paginaPagAtual = Math.min(paginaPag, totalPaginasPagas - 1);
  const cpPag = gruposPagasGranatum.slice(paginaPagAtual*POR_PAG,(paginaPagAtual+1)*POR_PAG);
  const totalPago = contasPagFiltradas.reduce((a,c) => a+c.valor,0);
  const fornecedoresPagos = useMemo(() => rankingPagamentos(contasPagFiltradas, "fornecedor", 8), [contasPagFiltradas]);
  const mesesPagos = useMemo(() => {
    const mapa = new Map();
    contasPagFiltradas.forEach(c => {
      const key = `${ML[c.dataObj.getMonth()]}/${String(c.dataObj.getFullYear()).slice(2)}`;
      mapa.set(key, (mapa.get(key) || 0) + c.valor);
    });
    return [...mapa.entries()].map(([label, valor]) => ({ label, valor })).slice(0, 8);
  }, [contasPagFiltradas]);
  const pagoPorCategoria = useMemo(() => {
    const mapa = new Map();
    contasPagFiltradas.forEach(c => {
      const categoria = grupoFinanceiro(c.categoria || "Sem categoria");
      mapa.set(categoria, (mapa.get(categoria) || 0) + c.valor);
    });
    const ordem = { OPEX: 0, CAPEX: 1, FINEX: 2 };
    return [...mapa.entries()]
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a,b) => ordem[a.categoria] - ordem[b.categoria]);
  }, [contasPagFiltradas]);

  const periodoLabel = atalho !== "custom" ? atalho
    : `${opcoesMes.find(o=>o.value===iniCustom)?.label} > ${opcoesMes.find(o=>o.value===fimCustom)?.label}`;
  const alertasExecutivos = [
    kpis.resultado < 0 && {
      status:"resultado",
      title:"Saídas superam entradas",
      value:fmt.brlk(kpis.resultado),
      text:`Burn rate médio de ${fmt.brl(kpis.burnRateDia)}/dia no período.`,
      color:T.red,
    },
    kpis.aportesMario > 0 && {
      status:"aporte",
      title:`${aporteLabel} no período`,
      value:fmt.brlk(kpis.aportesMario),
      text:aportePendenteMario.blocked ? "Pendente aguardando acesso à base." : `Pendente estimado: ${fmt.brl(aportePendenteMario.valor)}.`,
      color:T.purp,
    },
    kpis.resultado >= 0 && {
      status:"caixa",
      title:"Variação líquida positiva",
      value:fmt.brlk(kpis.resultado),
      text:`Entradas médias de ${fmt.brl(kpis.mediaEntradasDia)}/dia.`,
      color:T.grn,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, paddingBottom:48 }}>

      {/* Seletor */}
      <Card style={{ padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <ViewModeToggle value={modo} onChange={setModo} />
          <div style={{ width:1, height:22, background:T.brd, margin:"0 4px", flexShrink:0 }} />
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {ATALHOS.map(a => (
              <Btn key={a.label} label={a.label} ativo={atalho===a.label}
                onClick={() => { setAtalho(a.label); setPaginaDet(0); setPaginaPag(0); }} />
            ))}
          </div>
          <div style={{ width:1, height:22, background:T.brd, margin:"0 4px", flexShrink:0 }} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, color:T.muted }}>De</span>
            <Sel value={iniCustom} onChange={v=>{setIniCustom(v);setAtalho("custom");setPaginaDet(0);setPaginaPag(0);}} options={opcoesMes} />
            <span style={{ fontSize:11, color:T.muted }}>até</span>
            <Sel value={fimCustom} onChange={v=>{setFimCustom(v);setAtalho("custom");setPaginaDet(0);setPaginaPag(0);}} options={opcoesMes} />
          </div>
          <div style={{ marginLeft:"auto", fontSize:11, color:T.blue, fontWeight:600, background:"rgba(245,158,11,0.10)", padding:"4px 10px", borderRadius:6 }}>
            {periodoLabel} • {kpis.qtd} {kpis.qtd===1?"mês":"meses"} • {kpis.totalDias} dias
          </div>
        </div>
      </Card>

      {/* KPIs - todos com 2 casas decimais via fmt.brl */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(165px, 1fr))", gap:10 }}>
        <KPI label="Entradas Caixa"       value={fmt.brlk(kpis.ent)}              cor={T.grn} />
        <KPI label={aporteLabel}          value={fmt.brlk(kpis.aportesMario)}     cor={T.purp} />
        <KPI label="Saídas Caixa"         value={fmt.brlk(kpis.sai)}              cor={T.red} />
        <KPI label={despesaSociosLabel}   value={fmt.brlk(kpis.cartaoMario)}      cor={T.amb} />
        <KPI label={aportePendenteLabel}  value={aportePendenteMario.blocked ? "Aguardando acesso" : fmt.brlk(aportePendenteMario.valor)} cor={aportePendenteMario.blocked ? T.amb : T.amb} />
        <KPI label="Variação Líquida"     value={fmt.brlk(kpis.resultado)}        cor={kpis.resultado>=0?T.grn:T.red} />
        <KPI label="Burn Rate Médio/Dia"  value={fmt.brlk(kpis.burnRateDia)}      cor={T.red} />
        <KPI label="Média Entradas/Dia"   value={fmt.brlk(kpis.mediaEntradasDia)} cor={T.grn} />
      </div>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {/* Graficos */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:8, flexWrap:"wrap" }}>
          <Label style={{ marginBottom:0 }}>Entradas vs Saídas</Label>
          <div style={{ display:"flex", gap:4 }}>
            {[{id:"mensal",l:"Mensal"},{id:"trimestral",l:"Trimestral"},{id:"anual",l:"Anual"}].map(({id,l}) => (
              <Btn key={id} label={l} ativo={viewChart===id} onClick={() => setViewChart(id)} />
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card style={{ padding:"18px 22px" }}>
            <div style={{ fontSize:10, color:T.muted, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:"0" }}>{periodoLabel}</div>
            {dadosChart.length > 0
              ? (
                <ResponsiveContainer width="100%" height={viewChart==="mensal"?260:220}>
                  <BarChart data={dadosChart} barGap={3} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false}
                      interval={0} angle={dadosChart.length>7?-35:0} textAnchor={dadosChart.length>7?"end":"middle"}
                      height={dadosChart.length>7?46:24} />
                    <YAxis tickFormatter={fmt.brlk} tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:T.muted, paddingTop:8 }} />
                    <Bar dataKey="entradas" name="Entradas Caixa" stackId="entradas" fill={T.grn} radius={[3,3,0,0]} />
                    <Bar dataKey="aportesMario" name={aporteLabel} stackId="entradas" fill={T.purp} radius={[3,3,0,0]} />
                    <Bar dataKey="saidas" name="Saídas Caixa" stackId="saidas" fill="#ef4444" radius={[3,3,0,0]} />
                    <Bar dataKey="cartaoMario" name={despesaSociosLabel} stackId="saidas" fill={T.amb} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
              : <div style={{ textAlign:"center", padding:32, color:T.muted, fontSize:13 }}>Sem dados para o período</div>
            }
          </Card>

          <Card style={{ padding:"18px 22px" }}>
            <div style={{ fontSize:10, color:T.muted, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:"0" }}>Resultado Líquido</div>
            {dadosChart.length > 0 && (
              <ResponsiveContainer width="100%" height={viewChart==="mensal"?160:140}>
                <BarChart data={dadosChart} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false}
                    interval={0} angle={dadosChart.length>7?-35:0} textAnchor={dadosChart.length>7?"end":"middle"}
                    height={dadosChart.length>7?46:24} />
                  <YAxis tickFormatter={fmt.brlk} tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTip />} />
                  <ReferenceLine y={0} stroke={T.brd} strokeWidth={1.5} />
                  <Bar dataKey="resultado" name="Resultado" radius={[3,3,0,0]}>
                    {dadosChart.map((e,i) => <Cell key={i} fill={corR(e.resultado)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* Visão consolidada */}
      <div>
        <Label>Visão Consolidada</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { titulo:"Por Ano", data:anos.map(a=>({...a,resultado:calcResultado(a)})) },
            { titulo:"Por Trimestre", data:trims.map(t=>({...t,resultado:calcResultado(t)})) },
          ].map(({ titulo, data }) => (
            <Card key={titulo} style={{ padding:"16px 20px" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:"0" }}>{titulo}</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} barGap={3} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt.brlk} tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize:10, color:T.muted, paddingTop:6 }} />
                  <Bar dataKey="entradas" name="Entradas Caixa" stackId="entradas" fill={T.grn} radius={[3,3,0,0]} />
                  <Bar dataKey="aportesMario" name={aporteLabel} stackId="entradas" fill={T.purp} radius={[3,3,0,0]} />
                  <Bar dataKey="saidas" name="Saídas Caixa" stackId="saidas" fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="cartaoMario" name={despesaSociosLabel} stackId="saidas" fill={T.amb} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ))}
        </div>
      </div>

      {modo === "Analítico" && <>
      {/* Detalhe diário */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <Label style={{ marginBottom:0 }}>Detalhe Diário</Label>
          <div style={{ fontSize:11, color:T.muted }}>
            {detalhe.length > 0 ? `${paginaDet*POR_PAG+1}-${Math.min((paginaDet+1)*POR_PAG,detalhe.length)} de ${detalhe.length}` : "Sem registros"}
          </div>
        </div>
        <Card style={{ overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"100px repeat(6,1fr)", padding:"10px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            {["Data","Saldo Inicial","Entradas","Saídas",aporteLabel,despesaSociosLabel,"Saldo Final"].map((h,i) => (
              <div key={h} style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", textAlign:i>0?"right":"left" }}>{h}</div>
            ))}
          </div>
          {detPag.length === 0
            ? <div style={{ padding:32, textAlign:"center", color:T.muted, fontSize:13 }}>Sem registros para o período</div>
            : detPag.map((row,idx) => (
              <div key={idx} style={{ display:"grid", gridTemplateColumns:"100px repeat(6,1fr)", padding:"10px 16px", borderBottom:`1px solid ${T.brd}`, background:T.card }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.035)"}
                onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                <div style={{ fontSize:12, color:T.sub, fontFamily:MONO }}>{row.data}</div>
                <div style={{ fontSize:12, color:T.muted, fontFamily:MONO, textAlign:"right" }}>{fmt.brl(row.saldo_ini)}</div>
                <div style={{ fontSize:12, color:row.entradas>0.1?T.grn:T.sub, fontFamily:MONO, textAlign:"right", fontWeight:row.entradas>0.1?600:400 }}>
                  {row.entradas>0.1 ? fmt.brl(row.entradas) : "-"}
                </div>
                <div style={{ fontSize:12, color:row.saidas>0?T.red:T.sub, fontFamily:MONO, textAlign:"right", fontWeight:row.saidas>0?600:400 }}>
                  {row.saidas>0 ? fmt.brl(row.saidas) : "-"}
                </div>
                <div style={{ fontSize:12, color:row.aportesMario!==0?(row.aportesMario>0?T.purp:T.red):T.sub, fontFamily:MONO, textAlign:"right", fontWeight:row.aportesMario!==0?600:400 }}>
                  {row.aportesMario!==0 ? fmt.brl(row.aportesMario) : "-"}
                </div>
                <div style={{ fontSize:12, color:row.cartaoMario!==0?(row.cartaoMario>0?T.amb:T.grn):T.sub, fontFamily:MONO, textAlign:"right", fontWeight:row.cartaoMario!==0?600:400 }}>
                  {row.cartaoMario!==0 ? fmt.brl(row.cartaoMario) : "-"}
                </div>
                <div style={{ fontSize:12, color:corR(row.saldo_fin-row.saldo_ini), fontFamily:MONO, fontWeight:500, textAlign:"right" }}>
                  {fmt.brl(row.saldo_fin)}
                </div>
              </div>
            ))
          }
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"12px 16px", borderTop:`1px solid ${T.brd}` }}>
            <button onClick={()=>setPaginaDet(p=>Math.max(0,p-1))} disabled={paginaDet===0}
              style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaDet===0?T.dim:T.muted, fontSize:12, cursor:paginaDet===0?"not-allowed":"pointer" }}>
              {"< Anterior"}
            </button>
            <span style={{ fontSize:11, color:T.muted, alignSelf:"center" }}>Página {paginaDet+1}</span>
            <button onClick={()=>setPaginaDet(p=>p+1)} disabled={(paginaDet+1)*POR_PAG>=detalhe.length}
              style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:(paginaDet+1)*POR_PAG>=detalhe.length?T.dim:T.muted, fontSize:12, cursor:(paginaDet+1)*POR_PAG>=detalhe.length?"not-allowed":"pointer" }}>
              {"Próxima >"}
            </button>
          </div>
        </Card>
      </div>

      {/* Contas Pagas */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:12, flexWrap:"wrap" }}>
          <div>
            <Label style={{ marginBottom:0 }}>Contas Pagas</Label>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
              {sheets.despesas_historico.loading ? "Carregando..."
                : `${contasPagFiltradas.length} lançamentos no período`}
              {sheets.historico.lastUpdate && <span style={{ color:T.grn, marginLeft:8 }}>• fluxo atualizado {sheets.historico.lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
          </div>
          <input
            placeholder="Buscar data, fornecedor, categoria ou valor..."
            value={buscaPag}
            onChange={e => { setBuscaPag(e.target.value); setPaginaPag(0); }}
            style={{ padding:"6px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, fontSize:12, outline:"none", minWidth:280 }}
          />
        </div>

        {pagoPorCategoria.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:12, marginBottom:12 }}>
            <Card style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Pago por Categoria</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Tooltip content={<ChartTip />} />
                  <Pie
                    data={pagoPorCategoria}
                    dataKey="valor"
                    nameKey="categoria"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={1}
                    labelLine={false}
                    label={({ name, percent }) => percent >= 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
                  >
                    {pagoPorCategoria.map((_, i) => <Cell key={i} fill={CAT_CORES[i % CAT_CORES.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Categorias - Tabela</div>
              <div style={{ maxHeight:220, overflowY:"auto", paddingRight:4 }}>
                {pagoPorCategoria.map((cat, i) => (
                  <div key={cat.categoria} style={{ display:"grid", gridTemplateColumns:"10px 1fr auto", alignItems:"center", gap:8, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:CAT_CORES[i % CAT_CORES.length] }} />
                    <span style={{ fontSize:11, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat.categoria}</span>
                  <span style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:pesoNumero }}>{fmt.brl(cat.valor)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {contasPagFiltradas.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Card style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Maiores fornecedores pagos</div>
              {fornecedoresPagos.map(f => (
                <div key={f.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
                  <span style={{ fontSize:11, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.label}>{f.label}</span>
                  <span style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:pesoNumero }}>{fmt.brlk(f.valor)}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Pagamentos por mês</div>
              {mesesPagos.map(f => (
                <div key={f.label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:T.sub }}>{f.label}</span>
                    <span style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:pesoNumero }}>{fmt.brlk(f.valor)}</span>
                  </div>
                  <div style={{ height:5, background:T.bg, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(100, totalPago ? (f.valor / totalPago) * 100 : 0)}%`, background:T.red }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        <Card style={{ overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.red }}>Total Pago no Período — {gruposPagasGranatum.length} lançamentos</span>
            <span style={{ fontSize:14, fontWeight:500, color:T.red, fontFamily:MONO }}>{fmt.brl(totalPago)}</span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"28px 94px minmax(320px,1.25fr) minmax(300px,1fr) 72px 128px", padding:"7px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            {["","Data","Fornecedor / Descrição","Categoria","Mês","Valor"].map((h,i) => (
              <div key={i} style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0", textAlign:i===4?"center":i===5?"right":"left" }}>{h}</div>
            ))}
          </div>

          {sheets.despesas_historico.loading
            ? <div style={{ padding:32, textAlign:"center", color:T.muted, fontSize:13 }}>Carregando dados do Granatum...</div>
            : cpPag.length === 0
              ? <div style={{ padding:32, textAlign:"center", color:T.muted, fontSize:13 }}>Nenhum lançamento no período selecionado</div>
              : cpPag.map(grupo => (
                <GranatumGrupoPagasFluxo
                  key={grupo.key}
                  grupo={grupo}
                  expanded={expandidosPag.has(grupo.key)}
                  onToggle={() => toggleExpandidoPag(grupo.key)}
                />
              ))
          }

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", borderTop:`1px solid ${T.brd}`, background:T.surf }}>
            <div style={{ fontSize:12, color:T.muted }}>
              {gruposPagasGranatum.length > 0 && `${paginaPagAtual*POR_PAG+1}-${Math.min((paginaPagAtual+1)*POR_PAG,gruposPagasGranatum.length)} de ${gruposPagasGranatum.length}`}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setPaginaPag(p=>Math.max(0,p-1))} disabled={paginaPagAtual===0}
                style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaPagAtual===0?T.dim:T.muted, fontSize:11, cursor:paginaPagAtual===0?"not-allowed":"pointer" }}>
                {"< Anterior"}
              </button>
              <button onClick={()=>setPaginaPag(p=>Math.min(totalPaginasPagas-1,p+1))} disabled={paginaPagAtual>=totalPaginasPagas-1}
                style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaPagAtual>=totalPaginasPagas-1?T.dim:T.muted, fontSize:11, cursor:paginaPagAtual>=totalPaginasPagas-1?"not-allowed":"pointer" }}>
                {"Próxima >"}
              </button>
            </div>
          </div>
        </Card>
      </div>
      </>}
    </div>
  );
}
