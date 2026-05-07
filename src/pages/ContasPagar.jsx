import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { T, CA, MONO } from "../theme";
import { useSheets, getByLabel, toNum, parseDate, fmt } from "../hooks/useSheets";
import { buildOperationalReportHtml, downloadHtml, downloadPdf } from "../utils/operationalReport";
import { hasCategoryName, resolveCategory } from "../utils/categoryResolver";
import { consumeDrilldownIntent } from "../utils/drilldown";
import ReportActions from "../components/ReportActions";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";

function diffDias(date, base = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((d - b) / 86400000);
}

function faixaAging(dias) {
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoje";
  if (dias <= 7) return "7d";
  if (dias <= 15) return "15d";
  if (dias <= 30) return "30d";
  return "60d";
}

function statusPorVencimento(vencDate, dias) {
  if (!vencDate) return "Sem data";
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Vence hoje";
  if (dias <= 7) return "1-7 dias";
  if (dias <= 15) return "8-15 dias";
  if (dias <= 30) return "16-30 dias";
  return "31+ dias";
}

function corStatus(status) {
  return FAIXAS.find(f => f.label === status)?.cor || T.muted;
}

function parseInputDate(value, endOfDay = false) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function toInputDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // retrocede ao domingo
  return toInputDate(d);
}

function buildPresets() {
  const hoje = new Date();
  const ontem = addDays(hoje, -1);
  const ini  = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim  = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const fimP = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
  return [
    { label:"Ontem",        ini: toInputDate(ontem), fim: toInputDate(ontem) },
    { label:"Hoje",         ini: toInputDate(hoje),  fim: toInputDate(hoje)  },
    { label:"7 dias",       ini: toInputDate(hoje),  fim: toInputDate(addDays(hoje, 7))  },
    { label:"30 dias",      ini: toInputDate(hoje),  fim: toInputDate(addDays(hoje, 30)) },
    { label:"60 dias",      ini: toInputDate(hoje),  fim: toInputDate(addDays(hoje, 60)) },
    { label:"Este mês",     ini: toInputDate(ini),   fim: toInputDate(fim)   },
    { label:"Próximo mês",  ini: toInputDate(prox),  fim: toInputDate(fimP)  },
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

const FAIXAS = [
  { id:"todos", label:"Todos", cor:T.blue2 },
  { id:"vencido", label:"Vencido", cor:T.red },
  { id:"hoje", label:"Vence hoje", cor:T.amb },
  { id:"7d", label:"1-7 dias", cor:T.grn },
  { id:"15d", label:"8-15 dias", cor:T.purp },
  { id:"30d", label:"16-30 dias", cor:T.sub },
  { id:"60d", label:"31+ dias", cor:T.muted },
];

function extrairContas(data, origem = "atual") {
  const hoje = new Date();
  return (data?.data || [])
    .map(r => {
      const vencDate = parseDate(r["DATA_VENCIMENTO"]);
      const valorBruto = Math.abs(toNum(r["VALOR_BRUTO"] ?? r["VALOR_LIQUIDO"] ?? 0));
      const deducoes = Math.abs(toNum(r["VALOR_DEDUCOES"] ?? r["DEDUCOES"] ?? r["DEDUÇÕES"] ?? 0));
      const liquidoRaw = toNum(r["VALOR_LIQUIDO"] ?? null);
      const valor = Math.abs(Number.isFinite(liquidoRaw) && liquidoRaw !== 0
        ? liquidoRaw
        : valorBruto - deducoes);
      const dias = vencDate ? diffDias(vencDate, hoje) : null;
      return {
        id: (r["ID"] || "").toString().trim(),
        origem,
        vencDate,
        venc: vencDate ? vencDate.toLocaleDateString("pt-BR") : "-",
        dias,
        faixa: vencDate ? faixaAging(dias) : "60d",
        status: statusPorVencimento(vencDate, dias),
        fornecedor: (r["FORNECEDOR"] || "").toString().trim() || "Sem fornecedor",
        categoria: resolveCategory(r),
        descricao: (r["DESCRICAO"] || r["DESCRIÇÃO"] || "").toString().trim(),
        valorBruto,
        deducoes,
        valor,
      };
    })
    .filter(r => (r.valor > 0 || r.deducoes > 0) && r.vencDate)
    .sort((a,b) => a.vencDate - b.vencDate || b.valor - a.valor);
}

function dedupeContas(contas) {
  const map = new Map();
  contas.forEach(c => {
    const key = c.id || `${c.venc}|${c.fornecedor}|${c.descricao}|${c.valor}`;
    const atual = map.get(key);
    if (!atual || (atual.origem !== "vencidas" && c.origem === "vencidas")) map.set(key, c);
  });
  return [...map.values()].sort((a,b) => a.vencDate - b.vencDate || b.valor - a.valor);
}

function chaveLancamento(c) {
  if (c?.composicao?.key) return `composto||${c.composicao.key}`;
  if (c?.composicao?.idComposto) return `composto||${c.composicao.idComposto}`;
  if (c?.id) return `id||${c.id}`;
  return [
    c.venc,
    c.fornecedor,
    c.descricao,
    c.categoria,
    c.valor,
  ].map(normalizarChave).join("||");
}

function normalizarChave(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Detecta o "tipo de tributo/encargo" da descrição para sub-agrupar dentro do mesmo fornecedor.
// Ex: GOVERNO FEDERAL pode ter INSS, IRRF e E-CONSIGNADO → 3 grupos separados.
function descricaoSubGrupo(descricao) {
  if (!descricao) return "";
  const u = String(descricao).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.startsWith("INSS"))                                   return "inss";
  if (u.startsWith("IRRF"))                                   return "irrf";
  if (u.startsWith("FGTS"))                                   return "fgts";
  if (u.startsWith("E-CONSIG") || u.startsWith("E CONSIG"))  return "e-consignado";
  if (u.startsWith("DARF"))                                   return "darf";
  if (u.startsWith("GPS"))                                    return "gps";
  if (u.startsWith("CSLL"))                                   return "csll";
  if (u.startsWith("PIS") || u.startsWith("COFINS"))         return "pis-cofins";
  return ""; // demais: sem sub-grupo, agrupa apenas por venc + fornecedor
}

// Chave para AGRUPAMENTO visual Granatum: venc + fornecedor [+ tipo de tributo se aplicável]
function chaveGrupoGranatum(c) {
  const sub = descricaoSubGrupo(c.descricao || "");
  return [c.venc, normalizarChave(c.fornecedor), sub].join("||");
}

function chaveComposicao(venc, fornecedor, descricao) {
  return [venc, fornecedor, descricao].map(normalizarChave).join("||");
}

function indexarComposicoes(raw) {
  const rows = raw?.data || [];
  const grupos = new Map();
  rows.forEach(row => {
    const vencDate = parseDate(row["DATA_VENCIMENTO"]);
    const venc = vencDate ? vencDate.toLocaleDateString("pt-BR") : String(row["DATA_VENCIMENTO"] || "");
    const fornecedor = (row["FORNECEDOR"] || "").toString().trim();
    const descricaoLancamento = (row["DESCRICAO_GRUPO"] || row["DESCRICAO_LANCAMENTO"] || row["DESCRICAO"] || "").toString().trim();
    const idComposto = (row["ID_COMPOSTO"] || row["LANCAMENTO_COMPOSTO_ID"] || "").toString().trim();
    const idPai = (row["ID_LANCAMENTO_PAI"] || row["ID_PAI"] || row["ID_LANCAMENTO"] || "").toString().trim();
    const naturalKey = chaveComposicao(venc, fornecedor, descricaoLancamento);
    const key = idComposto || naturalKey;
    const tipo = (row["TIPO_ITEM"] || "").toString().trim().toUpperCase();
    const valorBase = Math.abs(toNum(row["VALOR_ASSINADO"] ?? row["VALOR_ITEM"] ?? row["VALOR_ORIGINAL"] ?? 0));
    const valor = tipo === "DEDUCAO" || tipo === "DEDUÇÃO" ? -valorBase : valorBase;
    const item = {
      tipo,
      label: (row["DESCRICAO_ITEM"] || row["DESCRICAO_LANCAMENTO"] || row["CATEGORIA"] || row["DESCRICAO"] || "").toString().trim() || (tipo.includes("DEDU") ? "Dedução" : "Provento"),
      categoria: hasCategoryName(row["CATEGORIA"]) ? row["CATEGORIA"].toString().trim() : "",
      valor,
    };
    const atual = grupos.get(key) || {
      idComposto,
      key,
      venc,
      fornecedor,
      descricao: descricaoLancamento,
      naturalKey,
      idsPais: new Set(),
      itens: [],
      bruto: Math.abs(toNum(row["VALOR_BRUTO_GRUPO"] ?? 0)),
      deducoes: Math.abs(toNum(row["VALOR_DEDUCOES_GRUPO"] ?? 0)),
      liquido: Math.abs(toNum(row["VALOR_LIQUIDO_GRUPO"] ?? 0)),
    };
    if (idPai && !tipo.includes("DEDU")) atual.idsPais.add(idPai);
    atual.itens.push(item);
    if (!atual.bruto) atual.bruto = atual.itens.filter(i => i.valor > 0).reduce((s, i) => s + i.valor, 0);
    if (!atual.deducoes) atual.deducoes = Math.abs(atual.itens.filter(i => i.valor < 0).reduce((s, i) => s + i.valor, 0));
    if (!atual.liquido) atual.liquido = atual.bruto - atual.deducoes;
    grupos.set(key, atual);
  });

  const byId = new Map();
  const byNatural = new Map();
  [...grupos.values()].forEach(grupo => {
    grupo.itens.sort((a, b) => (b.valor > 0) - (a.valor > 0) || Math.abs(b.valor) - Math.abs(a.valor));
    grupo.idsPais.forEach(id => byId.set(id, grupo));
    byNatural.set(grupo.naturalKey, grupo);
  });
  return { byId, byNatural };
}

function compactarCompostos(rows) {
  const vistos = new Set();
  return rows
    .map(c => {
      if (!c?.composicao?.itens?.length) return c;
      const key = c.composicao.key || c.composicao.idComposto || c.composicao.naturalKey;
      if (vistos.has(key)) return null;
      vistos.add(key);
      return {
        ...c,
        categoria: c.categoria || "Composto",
        descricao: c.composicao.descricao || c.descricao,
        valorBruto: c.composicao.bruto || c.valorBruto,
        deducoes: c.composicao.deducoes || c.deducoes,
        valor: c.composicao.liquido || c.valor,
      };
    })
    .filter(Boolean);
}

function ordenarPorTotalLancamento(rows) {
  const totais = new Map();
  rows.forEach(c => {
    const key = chaveLancamento(c);
    totais.set(key, (totais.get(key) || 0) + c.valor);
  });
  return [...rows].sort((a, b) => {
    const dateDiff = a.vencDate - b.vencDate;
    if (dateDiff) return dateDiff;
    const totalDiff = (totais.get(chaveLancamento(b)) || 0) - (totais.get(chaveLancamento(a)) || 0);
    return totalDiff || a.fornecedor.localeCompare(b.fornecedor) || b.valor - a.valor;
  });
}

function prepararExibicaoLancamentos(rows) {
  const grupos = new Map();
  rows.forEach(c => {
    const key = chaveLancamento(c);
    const atual = grupos.get(key) || { total:0, qtd:0 };
    atual.total += c.valor;
    atual.qtd += 1;
    grupos.set(key, atual);
  });
  const vistos = new Set();
  return rows.map(c => {
    const key = chaveLancamento(c);
    const grupo = grupos.get(key);
    const primeiraLinha = !vistos.has(key);
    vistos.add(key);
    const temDetalhe = (grupo?.qtd || 0) > 1;
    return {
      ...c,
      primeiraLinhaLancamento: primeiraLinha,
      totalLancamento: grupo?.total || c.valor,
      fornecedorRelatorio: primeiraLinha
        ? `${c.fornecedor}${temDetalhe ? ` | Total: ${fmt.brl(grupo.total)}` : ""}`
        : "",
    };
  });
}

function composicaoPagamentoTexto(c) {
  if (!c?.primeiraLinhaLancamento) return "";
  if (c?.composicao?.itens?.length) {
    const deducoes = c.composicao.itens.filter(item => item.valor < 0);
    return [`Líquido ${fmt.brl(valorLinhaTabela(c))}`]
      .concat([`Bruto ${fmt.brl(c.composicao.bruto || c.valorBruto || valorLinhaTabela(c))}`])
      .concat(deducoes.map(item => `- ${item.label} ${fmt.brl(Math.abs(item.valor))}`))
      .join(" | ");
  }
  if (!c?.deducoes) return fmt.brl(c?.valor || 0);
  return `Líquido ${fmt.brl(c.valor)} | Bruto +${fmt.brl(c.valorBruto || c.valor + c.deducoes)} | Deduções Granatum -${fmt.brl(c.deducoes)}`;
}

function valorLinhaTabela(c) {
  if (c?.primeiraLinhaLancamento && c?.composicao?.liquido) return c.composicao.liquido;
  return c?.valor || 0;
}

function ComposicaoPagamento({ conta }) {
  if (!conta?.primeiraLinhaLancamento) return null;
  if (conta?.composicao?.itens?.length) {
    const liquido = valorLinhaTabela(conta);
    const deducoes = conta.composicao.itens.filter(item => item.valor < 0);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:2, fontFamily:MONO, fontSize:10, lineHeight:1.25 }}>
        <span style={{ color:T.txt, fontWeight:700 }}>Líquido {fmt.brl(liquido)}</span>
        <span style={{ color:T.sub }}>Bruto {fmt.brl(conta.composicao.bruto || conta.valorBruto || liquido)}</span>
        {deducoes.map((item, idx) => (
          <span key={`${item.label}-${idx}`} style={{ color:T.amb }}>
            - {item.label} {fmt.brl(Math.abs(item.valor))}
          </span>
        ))}
      </div>
    );
  }
  if (!conta?.deducoes) {
    return <span style={{ color:T.muted, fontFamily:MONO }}>{fmt.brl(conta?.valor || 0)}</span>;
  }
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2, fontFamily:MONO, fontSize:10, lineHeight:1.25 }}>
      <span style={{ color:T.sub }}>+ Bruto {fmt.brl(conta.valorBruto || conta.valor + conta.deducoes)}</span>
      <span style={{ color:T.amb }}>- Deduções Granatum {fmt.brl(conta.deducoes)}</span>
      <span style={{ color:T.txt, fontWeight:600 }}>= Líquido {fmt.brl(conta.valor)}</span>
    </div>
  );
}

function GranatumGrupoPagar({ grupo, expanded, onToggle }) {
  const { head, rows, total } = grupo;
  const isComposto = !!head.composicao?.itens?.length;
  const isMulti = rows.length > 1;
  const temDetalhe = isComposto || isMulti;
  const cor = corStatus(head.status);
  const liquido = isComposto ? (head.composicao.liquido || head.valor) : head.valor;
  // Sub-tipo do grupo (ex: "inss", "irrf", "e-consignado") para mostrar no label
  const subTipo = isMulti ? descricaoSubGrupo(head.descricao || "") : "";
  const COLS = "28px 92px 112px minmax(340px,1.3fr) minmax(320px,1fr) 128px";
  return (
    <div>
      <div
        onClick={temDetalhe ? onToggle : undefined}
        style={{ display:"grid", gridTemplateColumns:COLS, padding:"9px 14px", alignItems:"center",
          cursor:temDetalhe?"pointer":"default", borderBottom:`1px solid rgba(148,163,184,0.12)`,
          background:"transparent", transition:"background 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
        <div style={{ color:T.muted, fontSize:10, textAlign:"center", userSelect:"none" }}>
          {temDetalhe ? (expanded ? "▼" : "▶") : ""}
        </div>
        <div style={{ fontSize:11, color:cor, fontFamily:MONO, fontWeight:600 }}>{head.venc}</div>
        <div style={{ display:"flex", alignItems:"center", gap:4, overflow:"hidden" }}>
          <span style={{ padding:"2px 7px", borderRadius:4, background:`${cor}22`, color:cor,
            fontSize:9, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap", flexShrink:0 }}>
            {head.status}
          </span>
          {isMulti && (
            <span style={{ padding:"2px 6px", borderRadius:4, background:`${T.blue2}22`, color:T.blue2,
              fontSize:9, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
              {rows.length}×
            </span>
          )}
        </div>
        <div style={{ paddingLeft:8, overflow:"hidden" }}>
          <div style={{ fontSize:12, color:isComposto||isMulti?T.blue2:T.txt,
            fontWeight:isComposto||isMulti?600:400,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {isComposto ? (head.composicao.descricao || head.fornecedor) : head.fornecedor}
            {/* Badge do sub-tipo (INSS, IRRF, E-CONSIGNADO...) quando é grupo */}
            {subTipo && (
              <span style={{ marginLeft:8, padding:"1px 6px", borderRadius:3,
                background:"rgba(148,163,184,0.15)", color:T.muted,
                fontSize:9, fontWeight:700, textTransform:"uppercase", verticalAlign:"middle" }}>
                {subTipo}
              </span>
            )}
          </div>
          {!isMulti && head.descricao && (
            <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {head.descricao}
            </div>
          )}
        </div>
        <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
          title={head.categoria}>{head.categoria}</div>
        <div style={{ fontSize:13, color:T.red, fontFamily:MONO, fontWeight:700, textAlign:"right" }}>
          {fmt.brl(isMulti ? total : liquido)}
        </div>
      </div>

      {/* Expanded: composition items — só quando NÃO é grupo multi-row */}
      {expanded && isComposto && !isMulti && head.composicao.itens?.length > 0 && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.12)` }}>
          {head.composicao.itens.map((item, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
              padding:"5px 14px 5px 50px", alignItems:"center",
              borderBottom:i<head.composicao.itens.length-1?`1px solid rgba(148,163,184,0.07)`:"none" }}>
              <div /><div />
              <div>
                <span style={{ padding:"1px 6px", borderRadius:3,
                  background:item.valor<0?`${T.amb}22`:`${T.grn}22`,
                  color:item.valor<0?T.amb:T.grn,
                  fontSize:8, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                  {item.tipo || (item.valor < 0 ? "DEDUÇÃO" : "PROVENTO")}
                </span>
              </div>
              <div style={{ paddingLeft:8, fontSize:11, color:T.sub,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {item.label}
              </div>
              <div />
              <div style={{ fontSize:11, fontFamily:MONO, fontWeight:600, textAlign:"right",
                color:item.valor<0?T.amb:T.sub }}>
                {item.valor < 0 ? "−" : "+"}{fmt.brl(Math.abs(item.valor))}
              </div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:8,
            padding:"5px 14px 7px", borderTop:`1px solid rgba(148,163,184,0.07)` }}>
            <span style={{ fontSize:10, color:T.muted }}>Líquido</span>
            <span style={{ fontSize:12, fontFamily:MONO, fontWeight:700, color:T.txt }}>{fmt.brl(liquido)}</span>
          </div>
        </div>
      )}

      {/* Expanded: múltiplos lançamentos — layout simplificado (data/status já no pai) */}
      {expanded && isMulti && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.12)` }}>
          {rows.map((c, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
              padding:"5px 14px 5px 50px", alignItems:"center",
              borderBottom:i<rows.length-1?`1px solid rgba(148,163,184,0.07)`:"none" }}>
              <div /><div /><div />
              <div style={{ paddingLeft:8, overflow:"hidden" }}>
                <div style={{ fontSize:11, color:T.sub,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.descricao || c.fornecedor}
                </div>
              </div>
              <div style={{ fontSize:10, color:T.muted, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.categoria}>
                {c.categoria}
              </div>
              <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>
                {fmt.brl(c.valor)}
              </div>
            </div>
          ))}
          {/* Rodapé com total do grupo */}
          <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:8,
            padding:"5px 14px 6px", borderTop:`1px solid rgba(148,163,184,0.07)` }}>
            <span style={{ fontSize:10, color:T.muted }}>Total</span>
            <span style={{ fontSize:12, fontFamily:MONO, fontWeight:700, color:T.red }}>{fmt.brl(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function agrupar(rows, key, limit = 8) {
  const mapa = new Map();
  rows.forEach(r => mapa.set(r[key], (mapa.get(r[key]) || 0) + r.valor));
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a,b) => b.valor - a.valor)
    .slice(0, limit);
}

function Card({ children, style = {} }) {
  return <div style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:8, ...style }}>{children}</div>;
}

function Kpi({ label, value, sub, cor = T.txt }) {
  return (
    <Card style={{ padding:"14px 16px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:cor }} />
      <div style={{ fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:0, fontWeight:600, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:18, color:cor, fontFamily:MONO, fontWeight:600 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>{sub}</div>}
    </Card>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:8, padding:"10px 12px", fontSize:11 }}>
      <div style={{ color:T.sub, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontFamily:MONO }}>{fmt.brl(p.value)}</div>)}
    </div>
  );
}

export default function ContasPagar() {
  const sheets = useSheets(["contas_pagar", "contas_pagar_composicao", "contas_vencidas", "saldos"]);
  const [faixa, setFaixa] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [calendarView, setCalendarView] = useState("diario"); // "diario" | "semanal" | "mensal"
  const [modo, setModo] = useState("Executivo");
  const [pagina, setPagina] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [drilldown, setDrilldown] = useState(null);
  const [expandidos, setExpandidos] = useState(new Set());
  const toggleExpandido = key => setExpandidos(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });
  const POR_PAG = 30;
  const PRESETS = buildPresets();

  useEffect(() => {
    const intent = consumeDrilldownIntent("contas-pagar");
    if (!intent) return;
    if (typeof intent.busca === "string") setBusca(intent.busca);
    if (FAIXAS.some(f => f.id === intent.faixa)) setFaixa(intent.faixa);
    if (typeof intent.dataIni === "string") setDataIni(intent.dataIni);
    if (typeof intent.dataFim === "string") setDataFim(intent.dataFim);
    setPagina(0);
    setDrilldown({
      label: intent.label || intent.busca || "Filtro aplicado pela Home",
      origem: intent.origem || "Cockpit",
    });
  }, []);

  const composicoes = useMemo(() => indexarComposicoes(sheets.contas_pagar_composicao.data), [sheets.contas_pagar_composicao.data]);
  const contas = useMemo(() => dedupeContas([
    ...extrairContas(sheets.contas_vencidas.data, "vencidas"),
    ...extrairContas(sheets.contas_pagar.data, "atual"),
  ]).map(conta => ({
    ...conta,
    composicao: composicoes.byId.get(conta.id) ||
      composicoes.byNatural.get(chaveComposicao(conta.venc, conta.fornecedor, conta.descricao)),
  })), [sheets.contas_pagar.data, sheets.contas_vencidas.data, composicoes]);
  const periodoLabel = dataIni || dataFim
    ? `${dataIni ? parseInputDate(dataIni).toLocaleDateString("pt-BR") : "início"} até ${dataFim ? parseInputDate(dataFim).toLocaleDateString("pt-BR") : "fim"}`
    : "Todo o período";
  const saldoAtual = Array.isArray(sheets.saldos.data)
    ? toNum(getByLabel(sheets.saldos.data, "TOTAL"))
    : 0;

  const termoBusca = busca.trim().toLowerCase();
  const baseAging = contas.filter(c => {
    const passaPeriodo = inDateRange(c.vencDate, dataIni, dataFim);
    const passaBusca = !termoBusca ||
      c.fornecedor.toLowerCase().includes(termoBusca) ||
      c.categoria.toLowerCase().includes(termoBusca) ||
      c.descricao.toLowerCase().includes(termoBusca) ||
      c.status.toLowerCase().includes(termoBusca) ||
      c.venc.includes(busca.trim());
    return passaPeriodo && passaBusca;
  });
  const baseOperacional = useMemo(() => compactarCompostos(baseAging), [baseAging]);

  const resumo = FAIXAS.filter(f => f.id !== "todos").map(f => {
    const rows = baseOperacional.filter(c => c.faixa === f.id);
    return { ...f, qtd: rows.length, valor: rows.reduce((a,c) => a + c.valor, 0) };
  });

  const filtradasBase = baseOperacional.filter(c => {
    const passaFaixa = faixa === "todos" || c.faixa === faixa;
    return passaFaixa;
  });
  const filtradas = useMemo(() => prepararExibicaoLancamentos(ordenarPorTotalLancamento(filtradasBase)), [filtradasBase]);
  const gruposGranatum = useMemo(() => {
    if (modo !== "Analítico") return [];
    const keyFor = (c) => c.composicao?.key
      ? `composto||${c.composicao.key}`
      : c.composicao?.idComposto
      ? `composto||${c.composicao.idComposto}`
      : chaveGrupoGranatum(c);
    const seen = new Map();
    filtradasBase.forEach(c => {
      const key = keyFor(c);
      if (!seen.has(key)) {
        const g = { key, head: c, rows: [], total: 0 };
        seen.set(key, g);
      }
      const g = seen.get(key);
      g.rows.push(c);
      g.total += c.valor;
    });
    return [...seen.values()]
      .map(g => ({ ...g, rows: [...g.rows].sort((a, b) => b.valor - a.valor) }))
      .sort((a, b) =>
        (a.head.vencDate - b.head.vencDate) ||
        (b.total - a.total) ||
        a.head.fornecedor.localeCompare(b.head.fornecedor) ||
        keyFor(a.head).localeCompare(keyFor(b.head))
      );
  }, [filtradasBase, modo]);
  const totalPaginas = Math.max(1, Math.ceil(gruposGranatum.length / POR_PAG));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const paginaGrupos = gruposGranatum.slice(paginaAtual * POR_PAG, (paginaAtual + 1) * POR_PAG);

  const total = filtradas.reduce((a,c) => a + c.valor, 0);
  const total7d = baseOperacional.filter(c => c.dias >= 0 && c.dias <= 7).reduce((a,c) => a + c.valor, 0);
  const fornecedores = agrupar(filtradas, "fornecedor", 10);
  const categorias = agrupar(filtradas, "categoria", 8);
  const porDia = agrupar(filtradas.map(c => ({ ...c, dia:c.venc })), "dia", 31).sort((a,b) => {
    const [da,ma,aa] = a.label.split("/").map(Number);
    const [db,mb,ab] = b.label.split("/").map(Number);
    return new Date(aa,ma-1,da) - new Date(ab,mb-1,db);
  });

  // Calendário semanal (domingo como início) e mensal
  const porSemana = useMemo(() => {
    const map = new Map();
    filtradas.forEach(c => {
      if (!c.vencDate) return;
      const ws = getWeekStart(c.vencDate);
      const [,m,d] = ws.split("-").map(Number);
      const label = `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}`;
      const cur = map.get(ws) || { label, sort: ws, valor: 0 };
      cur.valor += c.valor;
      map.set(ws, cur);
    });
    return [...map.values()].sort((a,b) => a.sort.localeCompare(b.sort));
  }, [filtradas]);

  const porMes = useMemo(() => {
    const map = new Map();
    filtradas.forEach(c => {
      if (!c.vencDate) return;
      const key = `${c.vencDate.getFullYear()}-${String(c.vencDate.getMonth()+1).padStart(2,"0")}`;
      const label = c.vencDate.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"});
      const cur = map.get(key) || { label, sort: key, valor: 0 };
      cur.valor += c.valor;
      map.set(key, cur);
    });
    return [...map.values()].sort((a,b) => a.sort.localeCompare(b.sort));
  }, [filtradas]);

  const porCalendario = calendarView === "semanal" ? porSemana : calendarView === "mensal" ? porMes : porDia;

  const pauta = [
    total7d > saldoAtual && { cor:T.red, texto:`Compromissos até 7 dias somam ${fmt.brl(total7d)}, acima do saldo atual.` },
    resumo.find(f => f.id === "vencido")?.valor > 0 && { cor:T.red, texto:`Há ${fmt.brl(resumo.find(f => f.id === "vencido").valor)} em contas vencidas na base atual.` },
    fornecedores[0] && { cor:T.amb, texto:`Maior concentração no filtro: ${fornecedores[0].label}, com ${fmt.brl(fornecedores[0].valor)}.` },
    categorias[0] && { cor:T.sub, texto:`Categoria mais relevante: ${categorias[0].label}, com ${fmt.brl(categorias[0].valor)}.` },
  ].filter(Boolean);
  const vencidoValor = resumo.find(f => f.id === "vencido")?.valor || 0;
  const alertasExecutivos = [
    total7d > saldoAtual && {
      status:"atenção",
      title:"Pressão de caixa nos próximos 7 dias",
      value:fmt.brlk(total7d),
      text:`Compromissos de curto prazo equivalem a ${saldoAtual ? (total7d / Math.abs(saldoAtual)).toFixed(1) : "0"}x o saldo atual.`,
      color:T.red,
    },
    vencidoValor > 0 && {
      status:"vencidos",
      title:"Regularizar contas vencidas",
      value:fmt.brlk(vencidoValor),
      text:`Há ${resumo.find(f => f.id === "vencido")?.qtd || 0} lançamentos vencidos no filtro atual.`,
      color:T.red,
    },
    fornecedores[0] && {
      status:"concentração",
      title:"Maior fornecedor no recorte",
      value:fmt.brlk(fornecedores[0].valor),
      text:fornecedores[0].label,
      color:T.amb,
    },
  ];
  const faixaLabel = FAIXAS.find(f => f.id === faixa)?.label || "Todos";
  const resumoExport = faixa === "todos" ? resumo : resumo.filter(f => f.id === faixa);
  const kpisExport = faixa === "todos"
    ? [
        { label:"Total filtrado", value:fmt.brl(total), sub:`${filtradas.length} lançamentos` },
        { label:"Até 7 dias", value:fmt.brl(total7d), sub:saldoAtual ? `${(total7d / Math.abs(saldoAtual)).toFixed(1)}x saldo atual` : undefined },
        { label:"Vencidos", value:fmt.brl(resumo.find(f => f.id === "vencido")?.valor || 0), sub:`${resumo.find(f => f.id === "vencido")?.qtd || 0} lançamentos` },
        { label:"Maior fornecedor", value:fornecedores[0] ? fmt.brl(fornecedores[0].valor) : "-", sub:fornecedores[0]?.label },
      ]
    : [
        { label:`Total ${faixaLabel.toLowerCase()}`, value:fmt.brl(total), sub:`${filtradas.length} lançamentos` },
        { label:"Faixa selecionada", value:faixaLabel, sub:periodoLabel },
        { label:"Maior fornecedor", value:fornecedores[0] ? fmt.brl(fornecedores[0].valor) : "-", sub:fornecedores[0]?.label },
        { label:"Maior categoria", value:categorias[0] ? fmt.brl(categorias[0].valor) : "-", sub:categorias[0]?.label },
      ];

  const gerarHtml = () => buildOperationalReportHtml({
      title: "Contas a Pagar",
      subtitle: "Visão operacional conforme filtros aplicados no painel.",
      filters: [
        { label:"Aging", value:faixaLabel },
        { label:"Período", value:periodoLabel },
        { label:"Busca", value:busca.trim() || "Sem filtro" },
      ],
      kpis: kpisExport,
      totalLabel: "Total a pagar no filtro",
      totalValue: total,
      sections: [
        {
          title:"Aging",
          rows: resumoExport,
          columns: [
            { label:"Faixa", key:"label" },
            { label:"Lançamentos", key:"qtd", num:true },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
        {
          title:"Ranking por fornecedor",
          rows: fornecedores,
          columns: [
            { label:"Fornecedor", key:"label" },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
        {
          title:"Ranking por categoria",
          rows: categorias,
          columns: [
            { label:"Categoria", key:"label" },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
      ],
      rows: filtradas,
      columns: [
        { label:"Vencimento", key:"venc" },
        { label:"Fornecedor", key:"fornecedorRelatorio" },
        { label:"Categoria", key:"categoria" },
        { label:"Status", key:"status" },
        { label:"Descrição", key:"descricao" },
        { label:"Composição", value:composicaoPagamentoTexto },
        { label:"Líquido", key:"valor", num:true, money:true },
      ],
    });

  const exportarHtml = () => {
    const html = gerarHtml();
    downloadHtml(`contas-a-pagar-${faixa}-${new Date().toISOString().slice(0,10)}.html`, html);
  };

  const exportarPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(`contas-a-pagar-${faixa}-${new Date().toISOString().slice(0,10)}.pdf`, gerarHtml());
    } finally {
      setPdfLoading(false);
    }
  };

  const limparDrilldown = () => {
    setBusca("");
    setFaixa("todos");
    setDataIni("");
    setDataFim("");
    setPagina(0);
    setDrilldown(null);
  };
  const limparContextoManual = () => setDrilldown(null);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:48 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:10 }}>
        <Kpi label="Total filtrado" value={fmt.brlk(total)} sub={`${filtradas.length} lançamentos`} cor={T.red} />
        <Kpi label="Até 7 dias" value={fmt.brlk(total7d)} sub={`${saldoAtual ? (total7d / Math.abs(saldoAtual)).toFixed(1) : "0"}x saldo atual`} cor={total7d > saldoAtual ? T.red : T.amb} />
        <Kpi label="Vencidos" value={fmt.brlk(resumo.find(f => f.id === "vencido")?.valor || 0)} sub={`${resumo.find(f => f.id === "vencido")?.qtd || 0} lançamentos`} cor={T.red} />
        <Kpi label="Maior fornecedor" value={fornecedores[0] ? fmt.brlk(fornecedores[0].valor) : "-"} sub={fornecedores[0]?.label} cor={T.blue2} />
      </div>

      <Card style={{ padding:"14px 16px" }}>
        {drilldown && (
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:12, padding:"9px 11px", borderRadius:8, border:`1px solid ${T.blue}44`, background:"rgba(59,130,246,0.08)" }}>
            <div>
              <div style={{ fontSize:10, color:T.blue2, textTransform:"uppercase", fontWeight:700 }}>{drilldown.origem}</div>
              <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>Filtro aplicado: {drilldown.label}. Exportações usam esta mesma leitura filtrada.</div>
            </div>
            <button onClick={limparDrilldown}
              style={{ padding:"6px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.muted, fontSize:11, fontWeight:600 }}>
              Limpar contexto
            </button>
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <ViewModeToggle value={modo} onChange={setModo} />
            <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600 }}>Filtros de período</div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {PRESETS.map(p => {
              const ativo = dataIni === p.ini && dataFim === p.fim;
              return (
                <button key={p.label}
                  onClick={() => { setDataIni(p.ini); setDataFim(p.fim); setPagina(0); limparContextoManual(); }}
                  style={{ padding:"5px 11px", borderRadius:6, border:`1px solid ${ativo ? T.blue : T.brd}`, background: ativo ? "rgba(245,158,11,0.13)" : "transparent", color: ativo ? T.blue2 : T.muted, fontSize:11, fontWeight: ativo ? 600 : 400, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <input
              type="date"
              value={dataIni}
              onChange={e => { setDataIni(e.target.value); setPagina(0); limparContextoManual(); }}
              title="Data inicial de vencimento"
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
            />
            <input
              type="date"
              value={dataFim}
              onChange={e => { setDataFim(e.target.value); setPagina(0); limparContextoManual(); }}
              title="Data final de vencimento"
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
            />
            {(dataIni || dataFim) && (
              <button onClick={() => { setDataIni(""); setDataFim(""); setPagina(0); limparContextoManual(); }}
                style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:T.muted, fontSize:12 }}>
                Limpar período
              </button>
            )}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <input
              placeholder="Buscar fornecedor, categoria, status..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPagina(0); limparContextoManual(); }}
              style={{ minWidth:260, padding:"7px 11px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
            />
            <ReportActions onHtml={exportarHtml} onPdf={exportarPdf} pdfLoading={pdfLoading} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:10 }}>
          {[{ id:"todos", label:"Todos", cor:T.blue2, qtd:baseOperacional.length, valor:baseOperacional.reduce((a,c)=>a+c.valor,0) }, ...resumo].map(f => (
            <button key={f.id} onClick={() => { setFaixa(f.id); setPagina(0); limparContextoManual(); }}
              style={{ textAlign:"left", padding:"12px 13px", borderRadius:8, border:`1px solid ${faixa === f.id ? f.cor : T.brd}`, background:faixa === f.id ? "rgba(245,158,11,0.07)" : T.surf, cursor:"pointer" }}>
              <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600 }}>{f.label}</div>
              <div style={{ fontSize:15, color:f.cor, fontFamily:MONO, fontWeight:600, marginTop:4 }}>{fmt.brlk(f.valor)}</div>
              <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>{f.qtd} lançamentos</div>
            </button>
          ))}
        </div>
      </Card>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {modo === "Executivo" && (
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600 }}>Calendário financeiro</div>
            <div style={{ display:"flex", gap:4 }}>
              {["diario","semanal","mensal"].map(v => (
                <button key={v} onClick={() => setCalendarView(v)}
                  style={{ padding:"3px 10px", borderRadius:5, border:`1px solid ${calendarView===v ? T.blue : T.brd}`, background: calendarView===v ? "rgba(245,158,11,0.13)" : "transparent", color: calendarView===v ? T.blue2 : T.muted, fontSize:10, fontWeight: calendarView===v ? 600 : 400, cursor:"pointer" }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={porCalendario} margin={{ top:4, right:8, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false}
                interval={calendarView === "diario" ? Math.max(Math.floor(porCalendario.length / 12), 0) : 0} />
              <YAxis tickFormatter={fmt.brlk} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="valor" name="Vencimentos" radius={[3,3,0,0]} maxBarSize={calendarView === "mensal" ? 40 : 28}>
                {porCalendario.map((d,i) => <Cell key={i} fill={i < 4 && calendarView==="diario" ? T.red : T.amb} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Pauta financeira</div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {pauta.map((p,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"8px 1fr", gap:9, alignItems:"start", padding:"9px 10px", border:`1px solid ${T.brd}`, borderRadius:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:p.cor, marginTop:4 }} />
                <div style={{ fontSize:12, color:T.sub, lineHeight:1.45 }}>{p.texto}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}

      {modo === "Executivo" && (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Ranking por fornecedor</div>
          {fornecedores.map(f => (
            <div key={f.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <span style={{ fontSize:12, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.label}</span>
              <span style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(f.valor)}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Ranking por categoria</div>
          {categorias.map(f => (
            <div key={f.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <span style={{ fontSize:12, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.label}</span>
              <span style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(f.valor)}</span>
            </div>
          ))}
        </Card>
      </div>
      )}

      {modo === "Analítico" && (
      <Card style={{ overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"rgba(239,68,68,0.08)", borderBottom:`1px solid ${T.brd}` }}>
          <span style={{ fontSize:11, color:T.red, fontWeight:600 }}>{gruposGranatum.length} lançamentos</span>
          <span style={{ fontSize:13, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brl(total)}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"28px 92px 112px minmax(340px,1.3fr) minmax(320px,1fr) 128px", padding:"7px 14px", background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
          {["","Vencimento","Status","Fornecedor / Descrição","Categoria","Líquido"].map((h,i) => (
            <div key={i} style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, textAlign:i===5?"right":"left" }}>{h}</div>
          ))}
        </div>
        {paginaGrupos.length === 0 && (
          <div style={{ padding:24, textAlign:"center", color:T.muted, fontSize:12 }}>Nenhum lançamento encontrado para os filtros aplicados.</div>
        )}
        {paginaGrupos.map(grupo => (
          <GranatumGrupoPagar
            key={grupo.key}
            grupo={grupo}
            expanded={expandidos.has(grupo.key)}
            onToggle={() => toggleExpandido(grupo.key)}
          />
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", borderTop:`1px solid ${T.brd}`, background:T.surf }}>
          <div style={{ fontSize:12, color:T.muted }}>
            {gruposGranatum.length > 0 && `${paginaAtual * POR_PAG + 1}–${Math.min((paginaAtual + 1) * POR_PAG, gruposGranatum.length)} de ${gruposGranatum.length}`}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={paginaAtual === 0}
              style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaAtual === 0 ? T.dim : T.muted, fontSize:11 }}>
              {"< Anterior"}
            </button>
            <span style={{ fontSize:11, color:T.muted }}>Página {paginaAtual + 1} de {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaAtual >= totalPaginas - 1}
              style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaAtual >= totalPaginas - 1 ? T.dim : T.muted, fontSize:11 }}>
              {"Próxima >"}
            </button>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
