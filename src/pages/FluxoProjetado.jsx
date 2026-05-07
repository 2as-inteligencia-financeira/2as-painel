import { useState, useMemo, useEffect } from "react";
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, LabelList,
} from "recharts";
import { T, CA, MONO } from "../theme";
import { useSheets, getByLabel, toNum, fmtCurta, fmtLonga, parseDate, fmt } from "../hooks/useSheets";
import { resolveCategory } from "../utils/categoryResolver";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";

// --- HELPERS -----------------------------------------------------------------

const corV = (v) => v >= 0 ? T.grn : T.red;

function diffDias(date, base = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((d - b) / 86400000);
}

function statusConta(vencDate) {
  if (!vencDate) return { label:"Sem data", cor:T.muted, dias:null };
  const dias = diffDias(vencDate);
  if (dias < 0) return { label:"Vencido", cor:T.red, dias };
  if (dias === 0) return { label:"Vence hoje", cor:T.amb, dias };
  return { label:"A vencer", cor:T.grn, dias };
}

function montarAgingContas(contas = []) {
  const faixas = [
    { id:"vencido", label:"Vencido", cor:T.red, teste:d => d < 0 },
    { id:"hoje", label:"Vence hoje", cor:T.amb, teste:d => d === 0 },
    { id:"7d", label:"1-7 dias", cor:T.grn, teste:d => d >= 1 && d <= 7 },
    { id:"15d", label:"8-15 dias", cor:T.purp, teste:d => d >= 8 && d <= 15 },
    { id:"30d", label:"16-30 dias", cor:T.sub, teste:d => d >= 16 && d <= 30 },
    { id:"60d", label:"31-60 dias", cor:T.muted, teste:d => d >= 31 && d <= 60 },
  ];
  return faixas.map(f => {
    const rows = contas.filter(c => f.teste(c.dias));
    return { ...f, qtd: rows.length, valor: rows.reduce((a,c) => a + Math.abs(c.valor), 0) };
  });
}

function matchAging(id, dias) {
  if (id === "todos") return true;
  if (id === "vencido") return dias < 0;
  if (id === "hoje") return dias === 0;
  if (id === "7d") return dias >= 1 && dias <= 7;
  if (id === "15d") return dias >= 8 && dias <= 15;
  if (id === "30d") return dias >= 16 && dias <= 30;
  if (id === "60d") return dias >= 31 && dias <= 60;
  return true;
}

function normalizarChave(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function chaveComposicao(venc, fornecedor, descricao) {
  return [venc, fornecedor, descricao].map(normalizarChave).join("||");
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
    atual.itens.push({
      tipo,
      label: (row["DESCRICAO_ITEM"] || row["DESCRICAO_LANCAMENTO"] || row["CATEGORIA"] || row["DESCRICAO"] || "").toString().trim() || (tipo.includes("DEDU") ? "Dedução" : "Provento"),
      valor,
    });
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
        descricao: c.composicao.descricao || c.descricao,
        valorBruto: c.composicao.bruto || c.valorBruto,
        deducoes: c.composicao.deducoes || c.deducoes,
        valor: -Math.abs(c.composicao.liquido || Math.abs(c.valor)),
      };
    })
    .filter(Boolean);
}

function valorFluxoPagar(c) {
  if (c?.composicao?.liquido) return -Math.abs(c.composicao.liquido);
  return c?.valor || 0;
}

function agruparGranatumPagar(rows) {
  const keyFor = (c) => c.composicao?.key
    ? `composto||${c.composicao.key}`
    : c.composicao?.idComposto
    ? `composto||${c.composicao.idComposto}`
    : chaveGrupoGranatum(c);
  const seen = new Map();
  rows.forEach(c => {
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
      (Math.abs(b.total) - Math.abs(a.total)) ||
      a.head.fornecedor.localeCompare(b.head.fornecedor) ||
      keyFor(a.head).localeCompare(keyFor(b.head))
    );
}

function GranatumGrupoPagarFluxo({ grupo, expanded, onToggle }) {
  const { head, rows, total } = grupo;
  const isComposto = !!head.composicao?.itens?.length;
  const isMulti = rows.length > 1;
  const temDetalhe = isComposto || isMulti;
  const cor = head.statusCor || T.muted;
  const liquido = valorFluxoPagar(head);
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
            <span style={{ fontSize:12, fontFamily:MONO, fontWeight:700, color:T.red }}>{fmt.brl(liquido)}</span>
          </div>
        </div>
      )}

      {expanded && isMulti && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.12)` }}>
          {rows.map((c, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
              padding:"5px 14px 5px 50px", alignItems:"center",
              borderBottom:i<rows.length-1?`1px solid rgba(148,163,184,0.07)`:"none" }}>
              <div /><div /><div />
              <div style={{ paddingLeft:8, overflow:"hidden" }}>
                <div style={{ fontSize:11, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.descricao || c.fornecedor}
                </div>
              </div>
              <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.categoria}>
                {c.categoria}
              </div>
              <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>
                {fmt.brl(c.valor)}
              </div>
            </div>
          ))}
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

// --- RUNWAY ------------------------------------------------------------------

function calcRunway(projecao, saldoAtual) {
  if (!projecao?.length) return { runwayDias: 0, idxQuebra: 0 };
  let s = saldoAtual, dias = 0;
  for (let i = 0; i < projecao.length; i++) {
    s += projecao[i].rec + projecao[i].pag + projecao[i].prov;
    if (s < 0) return { runwayDias: dias, idxQuebra: i };
    dias++;
  }
  return { runwayDias: dias, idxQuebra: -1 };
}

// --- EXTRAÇÕES ---------------------------------------------------------------

function extrairPosicao(sheets, projecao) {
  const { saldos, runway, tabela_auxiliar, entradas10d, contas_pagar } = sheets;

  const saldoAtual = Array.isArray(saldos.data) && saldos.data.length
    ? toNum(getByLabel(saldos.data, "TOTAL"))
    : 0;
  let runwayDias   = toNum(getByLabel(runway.data, "RUNWAY DIAS")) || 0;
  let dataQuebra   = fmtLonga(getByLabel(runway.data, "RUNWAY DATA")) || "-";
  let projetado30d = -494946.03;
  let projetado60d = -859938.92;

  if (projecao?.length >= 5) {
    const { runwayDias: rd, idxQuebra } = calcRunway(projecao, saldoAtual);
    runwayDias = rd;
    dataQuebra = idxQuebra >= 0 ? (projecao[idxQuebra]?.dataLonga || "-") : "Sem quebra";
    projetado30d = projecao[Math.min(29, projecao.length - 1)]?.saldo ?? projetado30d;
    projetado60d = projecao[Math.min(59, projecao.length - 1)]?.saldo ?? projetado60d;
  }

  const aux  = tabela_auxiliar.data;
  const r30  = aux?.find(r => Object.values(r)[0]?.toString().trim() === "30d");
  const r60  = aux?.find(r => Object.values(r)[0]?.toString().trim() === "60d");
  // A aba contas_pagar usa cabeçalho dinâmico: KPIs ficam em meta e lançamentos em data.
  // Usar meta aqui mantém os cards alinhados ao Looker/Granatum consolidado.
  const cpData = Array.isArray(contas_pagar.data?.meta)
    ? contas_pagar.data.meta
    : Array.isArray(contas_pagar.data)
      ? contas_pagar.data
      : [];
  const ent10  = entradas10d.data;
  const ultima = ent10?.[ent10.length - 1];

  // Compromissos lidos da planilha (Granatum já agrega — labels TOTAL_7D, TOTAL_30D, TOTAL_60D)
  const cp7d  = toNum(getByLabel(cpData, "TOTAL_7D"))  || toNum(getByLabel(cpData, "COMPROMISSOS_7D"))
             || toNum(getByLabel(cpData, "CONTAS A PAGAR (7 DIAS)")) || toNum(getByLabel(cpData, "COMPROMISSOS 7 DIAS"))
             || toNum(getByLabel(cpData, "7D")) || toNum(getByLabel(cpData, "7 DIAS")) || 0;
  const cp30d = toNum(getByLabel(cpData, "TOTAL_30D")) || toNum(getByLabel(cpData, "COMPROMISSOS_30D"))
             || toNum(getByLabel(cpData, "CONTAS A PAGAR (30 DIAS)")) || toNum(getByLabel(cpData, "COMPROMISSOS 30 DIAS"))
             || toNum(getByLabel(cpData, "30D")) || toNum(getByLabel(cpData, "30 DIAS")) || 0;
  const cp60d = toNum(getByLabel(cpData, "TOTAL_60D")) || toNum(getByLabel(cpData, "COMPROMISSOS_60D"))
             || toNum(getByLabel(cpData, "CONTAS A PAGAR (60 DIAS)")) || toNum(getByLabel(cpData, "COMPROMISSOS 60 DIAS"))
             || toNum(getByLabel(cpData, "60D")) || toNum(getByLabel(cpData, "60 DIAS")) || 0;
  const br7d  = toNum(getByLabel(cpData, "BURN_RATE_7D"))  || toNum(getByLabel(cpData, "BURN RATE 7D"))
             || toNum(getByLabel(cpData, "BURN RATE DIARIO (7D)")) || toNum(getByLabel(cpData, "BURN RATE DIÁRIO (7D)")) || 0;
  const br30d = toNum(getByLabel(cpData, "BURN_RATE_30D")) || toNum(getByLabel(cpData, "BURN RATE 30D"))
             || toNum(getByLabel(cpData, "BURN RATE DIARIO (30D)")) || toNum(getByLabel(cpData, "BURN RATE DIÁRIO (30D)")) || 0;
  const br60d = toNum(getByLabel(cpData, "BURN_RATE_60D")) || toNum(getByLabel(cpData, "BURN RATE 60D"))
             || toNum(getByLabel(cpData, "BURN RATE DIARIO (60D)")) || toNum(getByLabel(cpData, "BURN RATE DIÁRIO (60D)")) || 0;

  return {
    saldoAtual, runwayDias, dataQuebra,
    projetado30d: projecao?.length ? projetado30d : ((r30 && toNum(Object.values(r30)[1]) !== 0) ? toNum(Object.values(r30)[1]) : -494946.03),
    projetado60d: projecao?.length ? projetado60d : ((r60 && toNum(Object.values(r60)[1]) !== 0) ? toNum(Object.values(r60)[1]) : -859938.92),
    entradas10d: Math.max(toNum(Object.values(ultima || {})[2]) - saldoAtual, 0) || 16322.77,
    contasPagar7d:  cp7d,
    contasPagar30d: cp30d,
    contasPagar60d: cp60d,
    // burnRate = compromissos / janela (calculado no componente usando lista real se planilha não tiver)
    burnRate7d:  br7d  || (cp7d  > 0 ? cp7d  / 7  : 0),
    burnRate30d: br30d || (cp30d > 0 ? cp30d / 30 : 0),
    burnRate60d: br60d || (cp60d > 0 ? cp60d / 60 : 0),
  };
}

function agruparContasPorData(contas = []) {
  return contas.reduce((acc, c) => {
    acc[c.venc] = (acc[c.venc] || 0) + c.valor;
    return acc;
  }, {});
}

function extrairProjecao(data, saldoInicial = 0, contas = []) {
  if (!data?.length) return null;
  const contasPorData = agruparContasPorData(contas);
  const rows = data
    .filter(r => {
      const d = r["DATA"] ?? Object.values(r)[0];
      return d && d.toString().trim() !== "" && d.toString() !== "DATA";
    })
    .map(r => {
      const raw = r["DATA"] ?? Object.values(r)[0];
      const dataLonga = fmtLonga(raw);
      const recebimentos = Math.abs(toNum(r["RECEBIMENTOS"] ?? 0));
      const metaRecebimentos = Math.abs(
        toNum(
          r["META RECEBIMENTOS"] ??
          r["META_RECEBIMENTOS"] ??
          r["META DE RECEBIMENTOS"] ??
          0
        )
      );
      const totalEntradasBase = Math.abs(toNum(r["TOTAL DE ENTRADAS"] ?? 0));
      const rec = totalEntradasBase || (recebimentos + metaRecebimentos);
      const pagPlanilha = -Math.abs(toNum(r["PAGAMENTOS"] ?? 0));
      const pagContas = contasPorData[dataLonga] || 0;
      const pag = Math.abs(pagContas) > Math.abs(pagPlanilha) ? pagContas : pagPlanilha;
      const prov = -Math.abs(toNum(r["PROVISOES ENDIVIDAMENTO"] ?? 0));
      const saidas = pag + prov;

      return {
        data: fmtCurta(raw),
        dataLonga,
        recebimentos,
        metaRecebimentos,
        totalEntradas: rec,
        rec,
        pag,
        prov,
        saldoOriginal: toNum(r["SALDO FINAL"] ?? 0),
        saidas,
      };
    })
    .filter(r => r.data?.length >= 5);

  if (rows.length < 10) return null;

  let s = saldoInicial;
  return rows.map(r => {
    s = Math.round((s + r.rec + r.pag + r.prov) * 100) / 100;
    return { ...r, saldo: s };
  });
}

function extrairContas(data, composicoes) {
  const linhas = data?.data || [];
  const rows = linhas
    .filter(r => {
      const d = parseDate(r["DATA_VENCIMENTO"]);
      return d && d.getFullYear() >= 2026;
    })
    .map(r => {
      const d = parseDate(r["DATA_VENCIMENTO"]);
      const status = statusConta(d);
      return {
        id: (r["ID"] || "").toString().trim(),
        venc: d.toLocaleDateString("pt-BR"),
        vencDate: d,
        fornecedor: (r["FORNECEDOR"] || "").toString().trim(),
        descricao: (r["DESCRICAO"] || "").toString().trim(),
        categoria: resolveCategory(r),
        status: status.label,
        statusCor: status.cor,
        dias: status.dias,
        valorBruto: Math.abs(toNum(r["VALOR_BRUTO"] ?? r["VALOR_LIQUIDO"] ?? 0)),
        deducoes: Math.abs(toNum(r["VALOR_DEDUCOES"] ?? r["DEDUCOES"] ?? r["DEDUÇÕES"] ?? 0)),
        valor: -Math.abs(toNum(r["VALOR_LIQUIDO"] ?? r["VALOR_BRUTO"] ?? 0)),
      };
    })
    .map(c => ({
      ...c,
      composicao: composicoes?.byId.get(c.id) ||
        composicoes?.byNatural.get(chaveComposicao(c.venc, c.fornecedor, c.descricao)),
    }));
  return compactarCompostos(rows)
    .filter(r => r.valor !== 0)
    .sort((a, b) => a.vencDate - b.vencDate);
}

function calcCenario(dados, saldo, fator, fatorSaidas = 1) {
  let s = saldo;
  return dados.map(d => {
    s += d.rec * fator + (d.pag + d.prov) * fatorSaidas;
    return { data: d.data, saldo: Math.round(s) };
  });
}

function calcCenarioManual(dados, saldo, tipoReceita, valorReceita, tipoSaidas, valorSaidas) {
  const receitaPercentual = Math.max(0, valorReceita) / 100;
  const saidasPercentual = Math.max(0, valorSaidas) / 100;
  if (tipoReceita === "valor") {
    let s = saldo;
    return dados.map(d => {
      const saidas = tipoSaidas === "valor" ? -Math.abs(valorSaidas) : (d.pag + d.prov) * saidasPercentual;
      s += Math.max(0, valorReceita) + saidas;
      return { data: d.data, saldo: Math.round(s) };
    });
  }
  let s = saldo;
  return dados.map(d => {
    const saidas = tipoSaidas === "valor" ? -Math.abs(valorSaidas) : (d.pag + d.prov) * saidasPercentual;
    s += d.rec * receitaPercentual + saidas;
    return { data: d.data, saldo: Math.round(s) };
  });
}

function calcEixoFinanceiro(vals, stepMin = 50000) {
  const nums = vals.filter(Number.isFinite);
  const min = Math.min(0, ...nums);
  const max = Math.max(0, ...nums);
  const range = Math.max(max - min, stepMin);
  const rawStep = range / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const nice = [1, 2, 5, 10].find(m => rawStep <= m * magnitude) || 10;
  const step = Math.max(stepMin, nice * magnitude);
  const domainMin = Math.floor(min / step) * step;
  const domainMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = domainMin; v <= domainMax; v += step) ticks.push(v);
  return { domain: [domainMin, domainMax], ticks };
}

// --- FALLBACK PROJEÇÃO --------------------------------------------------------

const PROJ_FB = [
  {data:"11/04",dataLonga:"11/04/2026",rec:0,     pag:0,         prov:0,     saldo:125.33,     saidas:0          },
  {data:"13/04",dataLonga:"13/04/2026",rec:18000, pag:0,         prov:0,     saldo:18125.33,   saidas:0          },
  {data:"14/04",dataLonga:"14/04/2026",rec:18000, pag:-62578.20, prov:0,     saldo:-26452.87,  saidas:-62578.20  },
  {data:"15/04",dataLonga:"15/04/2026",rec:9000,  pag:-45289.89, prov:-25000,saldo:-87742.76,  saidas:-70289.89  },
  {data:"17/04",dataLonga:"17/04/2026",rec:9000,  pag:-108121.81,prov:0,     saldo:-177864.57, saidas:-108121.81 },
  {data:"20/04",dataLonga:"20/04/2026",rec:18000, pag:-22382.06, prov:0,     saldo:-182246.63, saidas:-22382.06  },
  {data:"22/04",dataLonga:"22/04/2026",rec:9000,  pag:0,         prov:-25000,saldo:-180246.63, saidas:-25000     },
  {data:"24/04",dataLonga:"24/04/2026",rec:9000,  pag:-180028.28,prov:0,     saldo:-342274.91, saidas:-180028.28 },
  {data:"30/04",dataLonga:"30/04/2026",rec:9000,  pag:-61775.95, prov:0,     saldo:-375050.86, saidas:-61775.95  },
  {data:"07/05",dataLonga:"07/05/2026",rec:9000,  pag:-78835.44, prov:0,     saldo:-503275.40, saidas:-78835.44  },
  {data:"11/05",dataLonga:"11/05/2026",rec:18000, pag:-162936.34,prov:0,     saldo:-639211.74, saidas:-162936.34 },
  {data:"22/05",dataLonga:"22/05/2026",rec:9000,  pag:-119270.72,prov:0,     saldo:-734001.20, saidas:-119270.72 },
  {data:"06/06",dataLonga:"06/06/2026",rec:9000,  pag:-151365.58,prov:0,     saldo:-850939.42, saidas:-151365.58 },
  {data:"09/06",dataLonga:"09/06/2026",rec:18000, pag:-2841.04,  prov:0,     saldo:-844109.33, saidas:-2841.04   },
  {data:"15/06",dataLonga:"15/06/2026",rec:9000,  pag:-70000,    prov:0,     saldo:-905109.33, saidas:-70000     },
  {data:"22/06",dataLonga:"22/06/2026",rec:9000,  pag:-100000,   prov:-25000,saldo:-1021109.33,saidas:-125000    },
  {data:"30/06",dataLonga:"30/06/2026",rec:18000, pag:-50000,    prov:0,     saldo:-1053109.33,saidas:-50000     },
  {data:"07/07",dataLonga:"07/07/2026",rec:9000,  pag:-80000,    prov:0,     saldo:-1124109.33,saidas:-80000     },
  {data:"14/07",dataLonga:"14/07/2026",rec:9000,  pag:-60000,    prov:-25000,saldo:-1200109.33,saidas:-85000     },
];

// --- COMPONENTES -------------------------------------------------------------

const Card = ({ children, style = {} }) => (
  <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius:8, ...style }}>{children}</div>
);

const Label = ({ children, style = {} }) => (
  <div style={{ fontSize: 10, fontWeight:600, color:T.muted, textTransform: "uppercase", letterSpacing:"0", marginBottom: 14, ...style }}>{children}</div>
);

const KPICard = ({ label, value, sub, cor = T.blue, size = 20, urgent, loading }) => (
  <div style={{ background: urgent ? "rgba(239,68,68,0.07)" : T.card, border: `1px solid ${urgent ? "rgba(239,68,68,0.35)" : T.brd}`, borderRadius:8, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cor }} />
    <div style={{ fontSize: 10, color:T.muted, textTransform: "uppercase", letterSpacing:"0", fontWeight: 600, marginBottom: 5, lineHeight: 1.4 }}>{label}</div>
    {loading ? <div style={{ height: 26, width: "60%", background: T.brd, borderRadius: 4, animation: "pulse 1.5s infinite" }} />
      : <div style={{ fontSize: size, fontWeight:600, color: cor, fontFamily:MONO, lineHeight: 1.1 }}>{value}</div>}
    {sub && !loading && <div style={{ fontSize: 10, color:T.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Btn = ({ label, ativo, onClick }) => (
  <button onClick={onClick} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${ativo ? T.blue : T.brd}`, background: ativo ? "rgba(245,158,11,0.15)" : "transparent", color: ativo ? T.blue2 : T.muted, fontSize: 11, fontWeight: ativo ? 600 : 400, cursor: "pointer" }}>
    {label}
  </button>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.brd2}`, borderRadius: 6, padding: "10px 14px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
      <div style={{ color: T.sub, marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {payload.filter(p => p.value !== null && p.value !== undefined && p.value !== 0).map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: p.color || T.txt, margin: "2px 0" }}>
          <span>{p.name}</span>
          <span style={{ fontFamily:MONO, fontWeight: 600 }}>{fmt.brlk(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Label customizado para saldo negativo no grafico
const SaldoLabel = ({ x, y, value, index, data }) => {
  if (!value || Math.abs(value) < 1000) return null;
  // Mostra rotulo apenas nos primeiros 3 dias com saldo muito negativo
  const prevSaldo = index > 0 ? data[index - 1]?.saldo : null;
  const isPicoQueda = prevSaldo !== null && value < prevSaldo - 50000;
  if (!isPicoQueda) return null;
  return (
    <text x={x} y={y - 6} textAnchor="middle" fill={value < 0 ? T.red : T.grn} fontSize={8} fontFamily="Lato" fontWeight={600}>
      {fmt.brlk(value)}
    </text>
  );
};

// --- COMPONENTE PRINCIPAL -----------------------------------------------------

export default function FluxoProjetado() {
  const sheets = useSheets(["saldos", "runway", "tabela_auxiliar", "entradas10d", "contas_pagar", "contas_pagar_composicao", "tabela_resumo"]);

  const saldoAtualBruto = Array.isArray(sheets.saldos.data) && sheets.saldos.data.length
    ? toNum(getByLabel(sheets.saldos.data, "TOTAL"))
    : 0;
  const composicoes = useMemo(() => indexarComposicoes(sheets.contas_pagar_composicao.data), [sheets.contas_pagar_composicao.data]);
  const contasList  = useMemo(() => extrairContas(sheets.contas_pagar.data, composicoes), [sheets.contas_pagar.data, composicoes]);
  const projecaoRaw = extrairProjecao(sheets.tabela_resumo.data, saldoAtualBruto, contasList);
  const projecao    = projecaoRaw ?? PROJ_FB;

  const loading     = sheets.saldos.loading || sheets.runway.loading;
  const posicao     = extrairPosicao(sheets, projecao);

  // Contas vencendo HOJE (exibição separada, como Looker "PAGAS HOJE")
  const compromissosHoje = useMemo(() =>
    contasList.filter(c => c.dias === 0).reduce((s,c) => s + Math.abs(c.valor), 0),
    [contasList]);

  // Listas calculadas com dias > 0 (exclui hoje — alinhado ao Looker 7D/30D)
  const cp7dLista  = useMemo(() => contasList.filter(c => c.dias !== null && c.dias > 0 && c.dias <= 7).reduce((s,c)=>s+Math.abs(c.valor),0),  [contasList]);
  const cp30dLista = useMemo(() => contasList.filter(c => c.dias !== null && c.dias > 0 && c.dias <= 30).reduce((s,c)=>s+Math.abs(c.valor),0), [contasList]);
  const cp60dLista = useMemo(() => contasList.filter(c => c.dias !== null && c.dias > 0 && c.dias <= 60).reduce((s,c)=>s+Math.abs(c.valor),0), [contasList]);

  // Planilha tem prioridade (Looker agrega direto do Granatum), lista é fallback
  const compromissos7d  = posicao.contasPagar7d  || cp7dLista;
  const compromissos30d = posicao.contasPagar30d || cp30dLista;
  const compromissos60d = posicao.contasPagar60d || cp60dLista;

  // Burn rate diário derivado do mesmo total exibido nos KPIs de compromissos.
  // Evita divergência de centavos quando a planilha já traz um burn arredondado.
  const burnRate7d  = compromissos7d  > 0 ? compromissos7d  / 7  : 0;
  const burnRate30d = compromissos30d > 0 ? compromissos30d / 30 : 0;
  const burnRate60d = compromissos60d > 0 ? compromissos60d / 60 : 0;

  const [janela,   setJanela]   = useState(30);
  const [busca,    setBusca]    = useState("");
  const [paginaC,  setPaginaC]  = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [buscaDiaria, setBuscaDiaria] = useState("");
  const [autoRefreshTick, setAutoRefreshTick] = useState(0);
  const [chartMode, setChartMode] = useState("completo");
  const [modo, setModo] = useState("Executivo");
  const [fatorManual, setFatorManual] = useState(100);
  const [fatorSaidasManual, setFatorSaidasManual] = useState(100);
  const [cenarioManualTipo, setCenarioManualTipo] = useState("percentual");
  const [cenarioSaidasTipo, setCenarioSaidasTipo] = useState("percentual");
  const [agingAtivo, setAgingAtivo] = useState("todos");
  const [expandidosContas, setExpandidosContas] = useState(new Set());
  const toggleExpandidoConta = key => setExpandidosContas(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const POR_PAG = 12;

  useEffect(() => {
    const id = window.setInterval(() => {
      setAutoRefreshTick((v) => v + 1);
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const dadosJ          = useMemo(() => projecao.slice(0, janela), [projecao, janela, autoRefreshTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dadosJFiltrado  = dadosJ.filter(d => d.rec > 0 || d.pag < 0 || d.prov < 0 || Math.abs(d.saldo) > 0.1);
  const dadosJGrafico = dadosJFiltrado.map(d => ({
    ...d,
    saidasPos: Math.abs((d.pag || 0) + (d.prov || 0)),
    saldoPos: d.saldo >= 0 ? d.saldo : null,
    saldoNeg: d.saldo < 0 ? d.saldo : null,
  }));

  const cenarios = useMemo(() => ({
    pessimista:  calcCenario(dadosJ, posicao.saldoAtual, 0),
    conservador: calcCenario(dadosJ, posicao.saldoAtual, 0.5),
    base:        calcCenario(dadosJ, posicao.saldoAtual, 1.0),
    otimista:    calcCenario(dadosJ, posicao.saldoAtual, 1.5),
    manual:      calcCenarioManual(dadosJ, posicao.saldoAtual, cenarioManualTipo, fatorManual, cenarioSaidasTipo, fatorSaidasManual),
  }), [dadosJ, posicao.saldoAtual, cenarioManualTipo, fatorManual, cenarioSaidasTipo, fatorSaidasManual]);

  const totalPag = dadosJ.reduce((a, d) => a + d.pag, 0);
  const totalProv = dadosJ.reduce((a, d) => a + d.prov, 0);
  const totalSai = totalPag + totalProv;
  const totalRec = dadosJ.reduce((a, d) => a + d.rec, 0);
  const resumoFluxo = [
    { label: "Entradas", value: totalRec, cor: T.grn, tipo: chartMode === "linha" ? "line" : "bar" },
    { label: "Total de Saídas", value: Math.abs(totalSai), cor: T.red, tipo: "line" },
    { label: "Saldo Final", value: dadosJ[dadosJ.length - 1]?.saldo || 0, cor: corV(dadosJ[dadosJ.length - 1]?.saldo || 0), tipo: "line" },
  ];
  const dadosDiariosFiltrados = useMemo(() => {
    const termo = buscaDiaria.trim().toLowerCase();
    if (!termo) return dadosJ;
    return dadosJ.filter((row) => {
      const saldoFmt = fmt.brl(row.saldo).toLowerCase();
      const recFmt = row.rec ? fmt.brl(row.rec).toLowerCase() : "";
      const pagFmt = row.pag ? fmt.brl(row.pag).toLowerCase() : "";
      const provFmt = row.prov ? fmt.brl(row.prov).toLowerCase() : "";
      return (
        row.data.toLowerCase().includes(termo) ||
        saldoFmt.includes(termo) ||
        recFmt.includes(termo) ||
        pagFmt.includes(termo) ||
        provFmt.includes(termo)
      );
    });
  }, [buscaDiaria, dadosJ]);

  // Eixo Y: cobre barras E saldo (incluindo negativo)
  const allVals = dadosJGrafico.flatMap(d => [d.rec, d.saidasPos, d.saldo]).filter(isFinite);
  const eixoFluxo = calcEixoFinanceiro(allVals, 50000);
  const renderSaidasLabel = ({ x, y, value }) => {
    if (!value || Math.abs(value) < 1000) return null;
    return (
      <text x={x} y={y - 8} textAnchor="middle" fill={T.red} fontSize={8} fontFamily="Lato" fontWeight={700}>
        {fmt.brlk(value).replace("R$", "").trim()}
      </text>
    );
  };
  const renderSaldoLabel = ({ x, y, value, index }) => {
    if (value === null || value === undefined) return null;
    const prev = dadosJGrafico[index - 1]?.saldo;
    const isRuptura = prev !== null && prev !== undefined && value < 0 && prev >= 0;
    const isPicoBaixo = prev !== null && value < prev - 60000 && value < 0;
    if (!isRuptura && !isPicoBaixo) return null;
    return (
      <text x={x} y={y - 8} textAnchor="middle" fill={value < 0 ? T.red : T.grn} fontSize={8} fontFamily="Lato" fontWeight={700}>
        {fmt.brlk(value)}
      </text>
    );
  };

  const contasFiltradas = useMemo(() =>
    modo !== "Analítico" ? [] : contasList.filter(c => {
      const termo = busca.trim().toLowerCase();
      const passaBusca = termo === "" ||
      c.fornecedor.toLowerCase().includes(termo) ||
      c.categoria.toLowerCase().includes(termo) ||
      c.status.toLowerCase().includes(termo) ||
      c.venc.includes(busca.trim());
      return passaBusca && matchAging(agingAtivo, c.dias);
    }), [busca, agingAtivo, contasList, modo]
  );
  const gruposContasGranatum = useMemo(() => agruparGranatumPagar(contasFiltradas), [contasFiltradas]);
  const totalPaginasContas = Math.max(1, Math.ceil(gruposContasGranatum.length / POR_PAG));
  const paginaCAtual = Math.min(paginaC, totalPaginasContas - 1);
  const contasPag    = gruposContasGranatum.slice(paginaCAtual * POR_PAG, (paginaCAtual + 1) * POR_PAG);
  const totalContas  = contasFiltradas.reduce((a, c) => a + c.valor, 0);
  const agingContas = useMemo(() => montarAgingContas(contasList), [contasList]);
  const totalAging = agingContas.reduce((a,f) => a + f.valor, 0);
  const manualReceitaLabel = cenarioManualTipo === "valor" ? `${fmt.brlk(fatorManual)}/d` : `${fatorManual}%`;
  const manualSaidasLabel = cenarioSaidasTipo === "valor" ? `${fmt.brlk(fatorSaidasManual)}/d` : `${fatorSaidasManual}%`;

  const lastUpdate = sheets.saldos.lastUpdate;
  const projAoVivo = !!sheets.tabela_resumo.lastUpdate;
  const runwayCor  = posicao.runwayDias <= 3 ? T.red : posicao.runwayDias <= 14 ? T.amb : T.grn;
  const alertasExecutivos = [
    {
      status:posicao.runwayDias <= 7 ? "crítico" : posicao.runwayDias <= 14 ? "atenção" : "estável",
      title:"Runway de caixa",
      value:`${posicao.runwayDias}d`,
      text:`Quebra projetada: ${posicao.dataQuebra}. Saldo 30d: ${fmt.brl(posicao.projetado30d)}.`,
      color:runwayCor,
    },
    compromissos7d > 0 && {
      status:"curto prazo",
      title:"Compromissos dos próximos 7 dias",
      value:fmt.brlk(compromissos7d),
      text:`Burn rate 7d estimado em ${fmt.brl(burnRate7d)} por dia.`,
      color:compromissos7d > posicao.saldoAtual ? T.red : T.amb,
    },
  ];
  const projecaoDiariaSection = (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <Label style={{ marginBottom: 0 }}>Projeção Diária</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[30, 60, 90].map(j => <Btn key={j} label={`${j}d`} ativo={janela === j} onClick={() => setJanela(j)} />)}
          </div>
          <input
            placeholder="Pesquisar data ou valor..."
            value={buscaDiaria}
            onChange={e => setBuscaDiaria(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none", minWidth: 220 }}
          />
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "9px 16px", borderBottom: `1px solid ${T.brd}`, background: T.surf }}>
          {["Data", "Recebimentos", "Meta Recebimentos", "Total de Entradas", "Pagamentos", "Provisões Endividamento", "Total de Saídas", "Saldo Final"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, color:T.muted, fontWeight:600, textTransform: "uppercase", letterSpacing:"0", textAlign: i > 0 ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {dadosDiariosFiltrados.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color:T.muted, fontSize: 13 }}>
              Nenhum lançamento encontrado para o filtro informado.
            </div>
          )}
          {dadosDiariosFiltrados.map((row, idx) => (
            <div key={`${row.data}-${idx}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "7px 16px", borderBottom: `1px solid ${T.brd}`, background: row.saldo < 0 ? "rgba(239,68,68,0.08)" : T.card, transition: "background-color 0.15s ease" }}
              onMouseEnter={e => e.currentTarget.style.background = row.saldo < 0 ? "rgba(239,68,68,0.13)" : "rgba(255,255,255,0.025)"}
              onMouseLeave={e => e.currentTarget.style.background = row.saldo < 0 ? "rgba(239,68,68,0.08)" : T.card}>
              <div style={{ fontSize: 11, color: T.sub }}>{row.dataLonga}</div>
              <div style={{ fontSize: 11, color: row.recebimentos > 0 ? T.sub : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.recebimentos > 0 ? fmt.brl(row.recebimentos) : "-"}</div>
              <div style={{ fontSize: 11, color: row.metaRecebimentos > 0 ? T.sub : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.metaRecebimentos > 0 ? fmt.brl(row.metaRecebimentos) : "-"}</div>
              <div style={{ fontSize: 11, color: row.totalEntradas > 0 ? T.grn : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.totalEntradas > 0 ? fmt.brl(row.totalEntradas) : "-"}</div>
              <div style={{ fontSize: 11, color: row.pag < 0 ? T.red : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.pag < 0 ? fmt.brl(row.pag) : "-"}</div>
              <div style={{ fontSize: 11, color: row.prov < 0 ? T.amb : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.prov < 0 ? fmt.brl(row.prov) : "-"}</div>
              <div style={{ fontSize: 11, color: row.saidas < 0 ? T.red : T.dim, fontFamily:MONO, textAlign: "right", fontWeight: 400 }}>{row.saidas < 0 ? fmt.brl(row.saidas) : "-"}</div>
              <div style={{ fontSize: 11, color: corV(row.saldo), fontFamily:MONO, fontWeight: 600, textAlign: "right" }}>{fmt.brl(row.saldo)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "9px 16px", borderTop: `1px solid ${T.brd}`, background: T.surf }}>
          <div style={{ fontSize: 10, color: T.sub, fontWeight:600, textTransform: "uppercase" }}>Total</div>
          <div style={{ fontSize: 11, color: T.sub, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ.reduce((a,d)=>a+(d.recebimentos||0),0))}</div>
          <div style={{ fontSize: 11, color: T.sub, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ.reduce((a,d)=>a+(d.metaRecebimentos||0),0))}</div>
          <div style={{ fontSize: 11, color: T.grn, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(totalRec)}</div>
          <div style={{ fontSize: 11, color: T.red, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ.reduce((a,d)=>a+d.pag,0))}</div>
          <div style={{ fontSize: 11, color: T.amb, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ.reduce((a,d)=>a+d.prov,0))}</div>
          <div style={{ fontSize: 11, color: T.red, fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ.reduce((a,d)=>a+d.saidas,0))}</div>
          <div style={{ fontSize: 11, color: corV(dadosJ[dadosJ.length-1]?.saldo||0), fontFamily:MONO, fontWeight:600, textAlign: "right" }}>{fmt.brlk(dadosJ[dadosJ.length-1]?.saldo||0)}</div>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>

	      {lastUpdate && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color:T.muted }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.grn }} />
          Dados ao vivo • {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {projAoVivo && <span style={{ marginLeft: 6, color: T.grn }}>• projeção em tempo real</span>}
        </div>
	      )}

	      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
	        <ViewModeToggle value={modo} onChange={setModo} />
	        <div style={{ fontSize:11, color:T.muted, fontFamily:MONO }}>
	          {modo === "Executivo" ? `Janela ${janela}d · saldo final ${fmt.brlk(dadosJ[dadosJ.length - 1]?.saldo || 0)}` : `${contasList.length} contas no motor de projeção`}
	        </div>
	      </div>

      {/* Alerta */}
      {posicao.runwayDias <= 7 && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius:8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.red, flexShrink: 0, animation: "pulse 1.5s infinite" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight:600, color: T.red, marginBottom: 2 }}>
              Alerta de Caixa - Runway: {posicao.runwayDias} {posicao.runwayDias === 1 ? "dia" : "dias"}
            </div>
            <div style={{ fontSize: 12, color: "#ef4444" }}>
              Saldo: {fmt.brl(posicao.saldoAtual)} • Quebra: {posicao.dataQuebra} • Projetado 30d: {fmt.brl(posicao.projetado30d)}
            </div>
          </div>
        </div>
	      )}

	      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

	      {/* KPIs - Posição */}
      <div>
        <Label>Posição Atual</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <KPICard label="Saldo Atual"            value={fmt.brl(posicao.saldoAtual)}    cor={corV(posicao.saldoAtual)} size={19} loading={loading} />
          <KPICard label="Runway"                 value={`${posicao.runwayDias} ${posicao.runwayDias === 1 ? "dia" : "dias"}`} cor={runwayCor} size={22} sub={`Quebra: ${posicao.dataQuebra}`} urgent={posicao.runwayDias <= 7} loading={loading} />
          <KPICard label="Projetado 30d"          value={fmt.brlk(posicao.projetado30d)}  cor={corV(posicao.projetado30d)} size={18} loading={loading} />
          <KPICard label="Projetado 60d"          value={fmt.brlk(posicao.projetado60d)}  cor={corV(posicao.projetado60d)} size={18} loading={loading} />
          <KPICard label="Entradas Previstas 10d" value={fmt.brlk(posicao.entradas10d)}   cor={T.grn} size={18} loading={loading} />
        </div>
      </div>

      {/* KPIs - Compromissos e Burn Rate */}
      <div>
        <Label>Compromissos e Burn Rate</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
          <KPICard label="Compromissos Hoje" value={fmt.brlk(compromissosHoje)} cor={T.amb} size={17} sub="vence hoje" loading={loading} />
          <KPICard label="Compromissos 7d"   value={fmt.brlk(compromissos7d)}   cor={T.red} size={17} sub="próximos 7 dias (excl. hoje)" loading={loading} />
          <KPICard label="Compromissos 30d"  value={fmt.brlk(compromissos30d)}  cor={T.red} size={17} sub="próximos 30 dias (excl. hoje)" loading={loading} />
          <KPICard label="Compromissos 60d"  value={fmt.brlk(compromissos60d)}  cor={T.red} size={17} sub="próximos 60 dias (excl. hoje)" loading={loading} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { l: "Burn Rate Diário (7d)",  v: burnRate7d },
            { l: "Burn Rate Diário (30d)", v: burnRate30d },
            { l: "Burn Rate Diário (60d)", v: burnRate60d },
          ].map(({ l, v }) => (
            <Card key={l} style={{ padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color:T.muted, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing:"0" }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight:600, color: T.amb, fontFamily:MONO }}>{fmt.brl(v)}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* -- GRAFICO PRINCIPAL ----------------------------------------------- */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Label style={{ marginBottom: 0 }}>
            Fluxo de Caixa Projetado - {janela} dias
            {projAoVivo && <span style={{ color: T.grn, marginLeft: 8, fontSize: 10, fontWeight: 400, textTransform: "none" }}>• ao vivo</span>}
          </Label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { id: "completo", label: "Barras + Linha" },
                { id: "linha", label: "Linha" },
              ].map(m => <Btn key={m.id} label={m.label} ativo={chartMode === m.id} onClick={() => setChartMode(m.id)} />)}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[30, 60, 90].map(j => <Btn key={j} label={`${j}d`} ativo={janela === j} onClick={() => setJanela(j)} />)}
            </div>
          </div>
        </div>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 16, flexWrap: "wrap" }}>
            {resumoFluxo.map(({ label, value, cor, tipo }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {tipo === "bar"
                  ? <div style={{ width: 10, height: 10, borderRadius: 2, background: cor }} />
                  : <div style={{
                    width: 24,
                    height: 0,
                    borderTop: label === "Saldo Final" ? `2px dashed ${cor}` : `2px solid ${cor}`,
                  }} />
                }
                <span style={{ fontSize: 11, color: T.sub }}>{label}:</span>
                <span style={{ fontSize: 12, fontFamily:MONO, fontWeight:600, color: cor }}>
                  {fmt.brlk(value)}
                </span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={dadosJGrafico} margin={{ top: 22, right: 10, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="1 5" stroke={CA.grid} vertical />
              <XAxis dataKey="data"
                tick={{ fill:T.muted, fontSize: 9 }}
                axisLine={false} tickLine={false}
                interval={Math.max(Math.floor(dadosJFiltrado.length / 10), 0)} />
              {/* Eixo unico com domain explicito: garante que saldo negativo apareca */}
              <YAxis
                tickFormatter={fmt.brlk}
                tick={{ fill:T.muted, fontSize: 9 }}
                axisLine={false} tickLine={false}
                width={66}
                domain={eixoFluxo.domain}
                ticks={eixoFluxo.ticks}
                allowDataOverflow={false}
              />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={0} stroke={T.muted} strokeWidth={1.1} />
              {chartMode !== "linha" && (
                <Bar dataKey="rec" name="Total de Entradas" fill={T.grn} opacity={0.9} radius={[2,2,0,0]} maxBarSize={20} />
              )}
              {chartMode === "linha" && (
                <Line type="monotone" dataKey="rec" name="Total de Entradas" stroke={T.grn} strokeWidth={1.9} dot={false} activeDot={{ r: 4 }} />
              )}
              <Line type="monotone" dataKey="saidasPos" name="Total de Saídas"
                stroke={T.red} strokeWidth={1.6}
                dot={false}
                activeDot={{ r: 4, fill: T.red, strokeWidth: 0 }}>
                <LabelList dataKey="saidasPos" content={renderSaidasLabel} />
              </Line>
              <Line type="monotone" dataKey="saldoPos" name="Saldo Final positivo"
                stroke={T.grn} strokeWidth={1.6} strokeDasharray="7 4"
                dot={false}
                activeDot={{ r: 4, fill: T.grn, strokeWidth: 0 }}>
                <LabelList dataKey="saldoPos" content={renderSaldoLabel} />
              </Line>
              <Line type="monotone" dataKey="saldoNeg" name="Saldo Final negativo"
                stroke="#fca5a5" strokeWidth={1.6} strokeDasharray="7 4"
                dot={false}
                activeDot={{ r: 4, fill: "#fca5a5", strokeWidth: 0 }}>
                <LabelList dataKey="saldoNeg" content={renderSaldoLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

	      {modo === "Analítico" && projecaoDiariaSection}

	      {/* Contas a pagar */}
	      {modo === "Analítico" && (
	      <div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:8 }}>
            <Label style={{ marginBottom:0 }}>Aging de Contas a Pagar</Label>
            {agingAtivo !== "todos" && (
              <button
                onClick={() => { setAgingAtivo("todos"); setPaginaC(0); }}
                style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.muted, fontSize:10 }}>
                limpar filtro
              </button>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
            {agingContas.map(f => (
              <button
                key={f.id}
                onClick={() => { setAgingAtivo(agingAtivo === f.id ? "todos" : f.id); setPaginaC(0); }}
                style={{
                  padding:0,
                  border:"none",
                  background:"transparent",
                  textAlign:"left",
                  cursor:"pointer",
                }}>
              <Card style={{
                padding:"12px 14px",
                borderColor: agingAtivo === f.id ? f.cor : T.brd,
                boxShadow: agingAtivo === f.id ? `0 0 0 1px ${f.cor}55` : "none",
                opacity: agingAtivo !== "todos" && agingAtivo !== f.id ? 0.62 : 1,
              }}>
                <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:"0", fontWeight:600, marginBottom:5 }}>{f.label}</div>
                <div style={{ fontSize:15, color:f.cor, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(f.valor)}</div>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", marginTop:6 }}>
                  <span style={{ fontSize:10, color:T.muted }}>{f.qtd} lançamentos</span>
                  <span style={{ fontSize:10, color:T.sub, fontFamily:MONO }}>{totalAging ? ((f.valor / totalAging) * 100).toFixed(0) : 0}%</span>
                </div>
              </Card>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div>
            <Label style={{ marginBottom: 0 }}>Relação de Contas a Pagar (60d)</Label>
            <div style={{ fontSize: 11, color:T.muted, marginTop: 2 }}>
              {sheets.contas_pagar.loading ? "Carregando..." : `${gruposContasGranatum.length} lançamentos`}
              {agingAtivo !== "todos" && <span style={{ color: T.blue2, marginLeft: 8 }}>• filtro: {agingContas.find(f => f.id === agingAtivo)?.label}</span>}
              {sheets.contas_pagar.lastUpdate && <span style={{ color: T.grn, marginLeft: 8 }}>• ao vivo</span>}
            </div>
          </div>
          <input placeholder="Buscar fornecedor, categoria ou data..."
            value={busca} onChange={e => { setBusca(e.target.value); setPaginaC(0); }}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none", minWidth: 260 }} />
        </div>

        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "rgba(239,68,68,0.08)", borderBottom: `1px solid ${T.brd}` }}>
            <span style={{ fontSize: 11, fontWeight:600, color: "#fca5a5" }}>Total do Período (60d) - {gruposContasGranatum.length} lançamentos</span>
            <span style={{ fontSize: 14, fontWeight:600, color: T.red, fontFamily:MONO }}>{fmt.brl(totalContas)}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "28px 92px 112px minmax(340px,1.3fr) minmax(320px,1fr) 128px", padding: "7px 14px", borderBottom: `1px solid ${T.brd}`, background: T.surf }}>
            {["","Vencimento","Status","Fornecedor / Descrição","Categoria","Valor"].map((h, i) => (
              <div key={h || i} style={{ fontSize: 10, color:T.muted, fontWeight:600, textTransform: "uppercase", letterSpacing:"0", textAlign: i === 5 ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {sheets.contas_pagar.loading
            ? <div style={{ padding: 32, textAlign: "center", color:T.muted, fontSize: 13 }}>Carregando dados do Granatum...</div>
            : contasPag.length === 0
              ? <div style={{ padding: 32, textAlign: "center", color:T.muted, fontSize: 13 }}>Nenhum resultado encontrado</div>
              : contasPag.map(grupo => (
                <GranatumGrupoPagarFluxo
                  key={grupo.key}
                  grupo={grupo}
                  expanded={expandidosContas.has(grupo.key)}
                  onToggle={() => toggleExpandidoConta(grupo.key)}
                />
              ))
          }

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderTop: `1px solid ${T.brd}`, background: T.surf }}>
            <div style={{ fontSize: 12, color:T.muted }}>
              {gruposContasGranatum.length > 0 && `${paginaCAtual * POR_PAG + 1}-${Math.min((paginaCAtual + 1) * POR_PAG, gruposContasGranatum.length)} de ${gruposContasGranatum.length}`}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPaginaC(p => Math.max(0, p - 1))} disabled={paginaCAtual === 0}
                style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: paginaCAtual === 0 ? T.dim : T.muted, fontSize: 11, cursor: paginaCAtual === 0 ? "not-allowed" : "pointer" }}>
                {"< Anterior"}
              </button>
              <button onClick={() => setPaginaC(p => Math.min(totalPaginasContas - 1, p + 1))} disabled={paginaCAtual >= totalPaginasContas - 1}
                style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${T.brd}`, background: "transparent", color: paginaCAtual >= totalPaginasContas - 1 ? T.dim : T.muted, fontSize: 11, cursor: paginaCAtual >= totalPaginasContas - 1 ? "not-allowed" : "pointer" }}>
                {"Próxima >"}
              </button>
            </div>
          </div>
        </Card>
	      </div>
	      )}

	      {/* Cenários */}
	      {modo === "Analítico" && (
	      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Label style={{ marginBottom: 0 }}>Análise de Cenários - Sensibilidade de Receita e Saídas</Label>
          <button onClick={() => setShowInfo(!showInfo)}
            style={{ padding: "2px 8px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.blue2, fontSize: 10, cursor: "pointer" }}>
            {showInfo ? "ocultar" : "como funciona?"}
          </button>
	      </div>
	        {showInfo && (
          <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", borderRadius:8, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: T.sub, lineHeight: 1.65 }}>
            <strong>Como ler:</strong> todos os cenários partem do saldo atual ({fmt.brl(posicao.saldoAtual)}) e recalculam o saldo diário com diferentes premissas de entrada. O manual permite testar receita e saídas em percentual da projeção ou valor fixo por dia.
            <div style={{ marginTop:6, color:T.muted }}>
              Pessimista: 0% das entradas · Conservador: 50% · Base: 100% · Otimista: 150%.
            </div>
          </div>
        )}

        <Card style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", flexDirection:"column", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", whiteSpace:"nowrap", overflowX:"auto", paddingBottom:2 }}>
              {[
                { label: "Pes. 0%",   cor: T.red, key: "pessimista" },
                { label: "Cons. 50%", cor: T.amb, key: "conservador" },
                { label: "Base 100%", cor: T.purp, key: "base" },
                { label: "Otim. 150%", cor: T.grn, key: "otimista" },
                { label: `Manual ${manualReceitaLabel} rec. / ${manualSaidasLabel} saídas`, cor: "#7c3aed", key: "manual" },
              ].map(({ label, cor, key }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, flex:"0 0 auto" }}>
                  <div style={{ width: 14, height: 2, background: cor, borderRadius: 1 }} />
                  <span style={{ fontSize: 10, color: T.sub }}>{label}</span>
                  <span style={{ fontSize: 11, color: cor, fontFamily:MONO, fontWeight:600 }}>
                    {fmt.brlk(cenarios[key][cenarios[key].length - 1]?.saldo || 0)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:12, alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.sub }}>
              Receita manual
              <select
                value={cenarioManualTipo}
                onChange={e => setCenarioManualTipo(e.target.value)}
                style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none" }}>
                <option value="percentual">%</option>
                <option value="valor">R$ por dia</option>
              </select>
              <input
                type="number"
                min="0"
                step={cenarioManualTipo === "valor" ? "1000" : "5"}
                value={fatorManual}
                onChange={e => setFatorManual(Number(e.target.value) || 0)}
                style={{ width: cenarioManualTipo === "valor" ? 110 : 74, padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none", fontFamily:MONO }}
              />
              {cenarioManualTipo === "percentual" ? "%" : ""}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.sub }}>
              Saídas
              <select
                value={cenarioSaidasTipo}
                onChange={e => setCenarioSaidasTipo(e.target.value)}
                style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none" }}>
                <option value="percentual">%</option>
                <option value="valor">R$ por dia</option>
              </select>
              <input
                type="number"
                min="0"
                step={cenarioSaidasTipo === "valor" ? "1000" : "5"}
                value={fatorSaidasManual}
                onChange={e => setFatorSaidasManual(Number(e.target.value) || 0)}
                style={{ width: cenarioSaidasTipo === "valor" ? 110 : 74, padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.brd}`, background: T.surf, color: T.txt, fontSize: 12, outline: "none", fontFamily:MONO }}
              />
              {cenarioSaidasTipo === "percentual" ? "%" : ""}
            </label>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={dadosJ.map((d, i) => ({
                data: d.data,
                pessimista:  cenarios.pessimista[i]?.saldo  ?? 0,
                conservador: cenarios.conservador[i]?.saldo ?? 0,
                base:        cenarios.base[i]?.saldo        ?? 0,
                otimista:    cenarios.otimista[i]?.saldo    ?? 0,
                manual:      cenarios.manual[i]?.saldo      ?? 0,
              }))}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
              <XAxis dataKey="data" tick={{ fill:T.muted, fontSize: 9 }} axisLine={false} tickLine={false}
                interval={Math.max(Math.floor(dadosJ.length / 8), 1)} />
              <YAxis tickFormatter={fmt.brlk} tick={{ fill:T.muted, fontSize: 9 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={0} stroke="#fca5a5" strokeDasharray="4 4" />
              {[
                { key: "pessimista", cor: T.red, nome: "Pessimista" },
                { key: "conservador", cor: T.amb, nome: "Conservador" },
                { key: "base", cor: T.purp, nome: "Base" },
                { key: "otimista", cor: T.grn, nome: "Otimista" },
                { key: "manual", cor: "#7c3aed", nome: "Manual" },
              ].map(({ key, cor, nome }) => (
                <Area key={key} type="monotone" dataKey={key} name={nome}
                  stroke={cor} strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 4 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
	        </Card>
	      </div>
	      )}

	      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
