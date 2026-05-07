/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useMemo, Fragment } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from "recharts";
import { useSheets, toNum, fmt } from "../hooks/useSheets";
import { T, CA, MONO } from "../theme";
import { Card, Kpi, PeriodSelector, TabBar, TipBRL, TipPct } from "../Ui";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";

// - Fallback verificado (Python jan-abr 2026) ---------------------------------
const FB_TABELA = {
  "RECEITA OPERACIONAL BRUTA":                    { JAN:760449.14,  FEV:270278.64,  MAR:395412.46,  ABR: 73618.11  },
  "ASSINATURAS":                                  { JAN:505390.07,  FEV:194614.34,  MAR:288047.78,  ABR: 10338.81  },
  "CURSOS":                                       { JAN:236335.28,  FEV: 68007.67,  MAR: 97286.12,  ABR: 57555.51  },
  "MODULOS":                                      { JAN: 18723.79,  FEV:  7656.63,  MAR: 10078.56,  ABR:  5723.79  },
  "(-) DEDUCOES DA RECEITA":                      { JAN: 29558.28,  FEV: 55820.71,  MAR: 47488.07,  ABR: 19208.33  },
  "(=) RECEITA OPERACIONAL LIQUIDA":              { JAN:730890.86,  FEV:214457.93,  MAR:347924.39,  ABR: 54409.78  },
  "(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO": { JAN:289558.28,  FEV:202157.93,  MAR:194593.28,  ABR: 29660.00  },
  "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO":     { JAN:470891.36,  FEV: 68300.00,  MAR:200819.46,  ABR: 43957.78  },
  "(-) DESPESAS OPERACIONAIS":                    { JAN:350126.11,  FEV:296601.42,  MAR:351865.10,  ABR: 16044.14  },
  "(=) EBITDA":                                   { JAN:120764.69,  FEV:-228301.17, MAR:-151046.51, ABR: 27913.97  },
  "(-) INVESTIMENTOS":                            { JAN:  8000.00,  FEV:  6666.67,  MAR:  8666.67,  ABR:  5580.34  },
  "(-) FINEX":                                    { JAN: 83958.44,  FEV: 26534.23,  MAR: 28608.90,  ABR:  6696.24  },
  "(=) RESULTADO ANTES DOS TRIBUTOS":             { JAN: 28806.25,  FEV:-261502.07, MAR:-188322.08, ABR: 15637.39  },
  "(-) TRIBUTOS":                                 { JAN: 73085.42,  FEV: 37732.67,  MAR: 57682.45,  ABR: 15672.17  },
  "(=) RESULTADO LIQUIDO":                        { JAN: -44279.18, FEV:-299234.75, MAR:-238944.60, ABR: 21904.32  },
};
const FB_MESES = ["JAN","FEV","MAR","ABR"];
const money = fmt.brl0;

const ESTRUTURA = [
  { conta:"RECEITA OPERACIONAL BRUTA",                    label:"RECEITA OPERACIONAL BRUTA",       tipo:"total",   indent:0 },
  { conta:"ASSINATURAS",                                  label:"ASSINATURAS",                     tipo:"item",    indent:1 },
  { conta:"CURSOS",                                       label:"CURSOS",                          tipo:"item",    indent:1 },
  { conta:"MODULOS",                                      label:"MODULOS",                         tipo:"item",    indent:1 },
  { sep:true },
  { conta:"(-) DEDUCOES DA RECEITA",                     label:"(-) DEDUCOES DA RECEITA",          tipo:"deducao", indent:0 },
  { conta:"(=) RECEITA OPERACIONAL LIQUIDA",             label:"(=) RECEITA OPERACIONAL LIQUIDA",  tipo:"sub",     indent:0 },
  { sep:true },
  { conta:"(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO",label:"(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO", tipo:"deducao", indent:0 },
  { conta:"(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",   label:"(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO", tipo:"sub", indent:0 },
  { sep:true },
  { conta:"(-) DESPESAS OPERACIONAIS",                   label:"(-) DESPESAS OPERACIONAIS",        tipo:"deducao", indent:0 },
  { conta:"(=) EBITDA",                                  label:"(=) EBITDA",                       tipo:"sub",     indent:0 },
  { sep:true },
  { conta:"(-) INVESTIMENTOS",                           label:"(-) INVESTIMENTOS",                tipo:"deducao", indent:0 },
  { conta:"(-) FINEX",                                   label:"(-) FINEX",                        tipo:"deducao", indent:0 },
  { conta:"(=) RESULTADO ANTES DOS TRIBUTOS",            label:"(=) RESULTADO ANTES DOS TRIBUTOS", tipo:"sub",     indent:0 },
  { conta:"(-) TRIBUTOS",                                label:"(-) TRIBUTOS",                     tipo:"deducao", indent:0 },
  { sep:true },
  { conta:"(=) RESULTADO LIQUIDO",                       label:"(=) RESULTADO LIQUIDO",            tipo:"result",  indent:0 },
];

// Sintéticas em comum para comparativo anual
const SINTETICAS_COMP = [
  { conta:"RECEITA OPERACIONAL BRUTA",                   label:"Receita Bruta",          tipo:"total"  },
  { conta:"(-) DEDUCOES DA RECEITA",                     label:"(-) Deduções",           tipo:"deducao"},
  { conta:"(=) RECEITA OPERACIONAL LIQUIDA",             label:"Receita Líquida",        tipo:"sub"    },
  { conta:"(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO",label:"(-) Custos de Produção", tipo:"deducao"},
  { conta:"(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",   label:"Lucro Bruto",            tipo:"sub"    },
  { conta:"(-) DESPESAS OPERACIONAIS",                   label:"(-) Despesas Oper.",     tipo:"deducao"},
  { conta:"(=) EBITDA",                                  label:"EBITDA",                 tipo:"sub"    },
  { conta:"(-) INVESTIMENTOS",                           label:"(-) Investimentos",      tipo:"deducao"},
  { conta:"(-) FINEX",                                   label:"(-) FINEX",              tipo:"deducao"},
  { conta:"(=) RESULTADO ANTES DOS TRIBUTOS",            label:"Res. Antes Tributos",    tipo:"sub"    },
  { conta:"(-) TRIBUTOS",                                label:"(-) Tributos",           tipo:"deducao"},
  { conta:"(=) RESULTADO LIQUIDO",                       label:"Resultado Líquido",      tipo:"result" },
];

const DISPLAY_LABELS = [
  "RECEITA OPERACIONAL BRUTA",
  "ASSINATURAS",
  "CURSOS",
  "MODULOS",
  "(-) DEDUCOES DA RECEITA",
  "CANCELAMENTOS",
  "(=) RECEITA OPERACIONAL LIQUIDA",
  "(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO",
  "PROFESSORES",
  "ROYALTIES - CURSOS",
  "ROYALTIES - ASSINATURAS",
  "MENTORES",
  "PROGRAMA PASSE",
  "FIXO",
  "FORUM DE DUVIDAS",
  "ELABORACAO DE RECURSOS",
  "CORRECAO DISCURSIVAS",
  "TECNOLOGIA",
  "CTO",
  "PESSOAS",
  "BENEFICIOS",
  "FERRAMENTAS",
  "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",
  "(-) DESPESAS OPERACIONAIS",
  "REVENUE OPS",
  "CRO",
  "MARKETING",
  "JORNALISMO",
  "SUPORTE",
  "VENDAS",
  "AUDIOVISUAL",
  "MIDIA",
  "DIVERSOS",
  "AFILIADOS",
  "ACADEMICO",
  "OPERACOES & FINANCEIRO",
  "INFRAESTRUTURA E DESPESAS ADMINISTRATIVAS",
  "ESTRUTURA",
  "SERVICOS PROFISSIONAIS",
  "(=) EBITDA",
  "(-) INVESTIMENTOS",
  "PRODUÇÃO DE CONTEÚDO",
  "AULAS EXCLUSIVAS",
  "(-) FINEX",
  "TAXA DE ANTECIPACAO",
  "TAXA DE OPERACAO",
  "BANCOS",
  "(=) RESULTADO ANTES DOS TRIBUTOS",
  "(-) TRIBUTOS",
  "IRPJ",
  "CSLL",
  "(=) RESULTADO LIQUIDO",
].reduce((acc, label) => {
  acc[normalizarConta(label)] = label;
  return acc;
}, {});

const SINTETICA_CONTAS = new Set([
  "RECEITA OPERACIONAL BRUTA",
  "(-) DEDUCOES DA RECEITA",
  "(=) RECEITA OPERACIONAL LIQUIDA",
  "(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO",
  "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",
  "(-) DESPESAS OPERACIONAIS",
  "(=) EBITDA",
  "(-) INVESTIMENTOS",
  "(-) FINEX",
  "(=) RESULTADO ANTES DOS TRIBUTOS",
  "(-) TRIBUTOS",
  "(=) RESULTADO LIQUIDO",
]);

const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const TRIMS = { JAN:"T1",FEV:"T1",MAR:"T1",ABR:"T2",MAI:"T2",JUN:"T2",JUL:"T3",AGO:"T3",SET:"T3",OUT:"T4",NOV:"T4",DEZ:"T4" };
const ML    = { JAN:"Jan",FEV:"Fev",MAR:"Mar",ABR:"Abr",MAI:"Mai",JUN:"Jun",JUL:"Jul",AGO:"Ago",SET:"Set",OUT:"Out",NOV:"Nov",DEZ:"Dez" };

function normalizarConta(text = "") {
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function extrairDRE(data) {
  if (!data?.length) return null;
  const norm = s => s?.toString().toUpperCase().replace(/\s+/g," ").trim() || "";
  const estruturaMap = new Map(ESTRUTURA.filter(l=>l.conta).map(l => [norm(l.conta), l]));
  const get  = (conta, mes) => {
    const r = data.find(r => norm(r["CONTA"]??Object.values(r)[0])===norm(conta) && norm(r["MES"]??Object.values(r)[1])===mes);
    return r ? toNum(r["VALOR"]??Object.values(r)[2]) : null;
  };
  const mesReal = MESES.filter(m => { const v=get("RECEITA OPERACIONAL BRUTA",m); return v!==null && v>0; });
  if (mesReal.length < 1) return null;
  const tabela = {};
  const contasOrdenadas = [];

  data.forEach(row => {
    const contaRaw = (row["CONTA"] ?? Object.values(row)[0] ?? "").toString().trim();
    const contaNorm = norm(contaRaw);
    if (!contaNorm || contasOrdenadas.some(l => norm(l.conta) === contaNorm)) return;
    const conhecida = estruturaMap.get(contaNorm);
    const isResultado = contaNorm.startsWith("(=)");
    const isDeducao = contaNorm.startsWith("(-)");
    contasOrdenadas.push(conhecida || {
      conta: contaRaw,
      label: contaRaw.charAt(0) + contaRaw.slice(1).toLowerCase(),
      tipo: isResultado ? (contaNorm.includes("RESULTADO") ? "result" : "sub") : isDeducao ? "deducao" : "item",
      indent: isResultado || isDeducao ? 0 : 1,
    });
  });

  contasOrdenadas.filter(l=>l.conta).forEach(({conta}) => {
    tabela[conta] = {};
    MESES.forEach(m => { tabela[conta][m] = get(conta,m) ?? 0; });
  });
  return { tabela, mesesRealizados: mesReal, contasOrdenadas };
}

// Extrai DRE com dados de múltiplos anos (sheet dre_2024_2025)
// Suporta formatos:
//   - "JAN/2024", "JAN 2024", "JAN24" → mensal (mês real)
//   - "TOTAL/2024"                     → total anual (gerado pelo servidor ao detectar colunas de ano)
function extrairDREMultiAno(data) {
  if (!data?.length) return {};
  const detectarAno = mes => {
    const m = String(mes || "").trim();
    const slash4 = m.match(/\/(\d{4})$/);
    if (slash4) return slash4[1];
    const slash2 = m.match(/\/(\d{2})$/);
    if (slash2) return `20${slash2[1]}`;
    const space4 = m.match(/\s(\d{4})$/);
    if (space4) return space4[1];
    const inline2 = m.match(/[A-Z]{3}(\d{2})$/);
    if (inline2) return `20${inline2[1]}`;
    return null;
  };
  const limparMes = mes => {
    return String(mes || "")
      .replace(/\/\d{2,4}$/, "")
      .replace(/\s\d{4}$/, "")
      .replace(/([A-Z]{3})\d{2}$/, "$1")
      .trim()
      .toUpperCase()
      .slice(0, 3);
  };

  const ANO_MINIMO_DRE = 2024;

  // Detecta se é formato anual total (TOTAL/2024) — vem do servidor quando a planilha tem anos como colunas
  const isTotalAnual = data.some(row => {
    const mesRaw = String(row["MES"] ?? Object.values(row)[1] ?? "").trim().toUpperCase();
    return mesRaw.startsWith("TOTAL/");
  });

  if (isTotalAnual) {
    // Formato horizontal transposto: MES="TOTAL/YYYY", VALOR = total anual.
    // Mapeia nomes da planilha para chaves canônicas de SINTETICAS_COMP.
    const normConta = c => c.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

    // Retorna a chave canônica ou null (para pular sub-itens)
    const canonicalizarContaHist = (c) => {
      if (/RECEITA OPERACIONAL BRUTA/.test(c))                       return "RECEITA OPERACIONAL BRUTA";
      if (/DEDUCOES.+RECEITA/.test(c))                               return "(-) DEDUCOES DA RECEITA";
      if (/RECEITA OPERACIONAL LIQUIDA/.test(c))                     return "(=) RECEITA OPERACIONAL LIQUIDA";
      if (/CUSTOS.+PRODUCAO.+ENSINO/.test(c))                        return "(-) CUSTOS DE PRODUCAO DE MATERIAL DE ENSINO";
      if (/LUCRO BRUTO.+MARGEM/.test(c))                             return "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO";
      // Três linhas que somam em DESPESAS OPERACIONAIS
      if (/DESPESAS COM MARKETING/.test(c))                          return "(-) DESPESAS OPERACIONAIS";
      if (/DESPESAS GERAIS E ADMIN/.test(c))                         return "(-) DESPESAS OPERACIONAIS";
      if (/OUTRAS DESPESAS OPERACIONAIS/.test(c))                    return "(-) DESPESAS OPERACIONAIS";
      // EBITDA: somente a linha de total operacional
      if (/LUCRO OU PREJUIZO OPERACIONAL/.test(c))                   return "(=) EBITDA";
      // Investimentos: somente o total (não sub-itens como "Direitos Autorais")
      if (/INVESTIMENTOS$/.test(c) && !/DIREITOS|OUTROS|IMOBIL/.test(c)) return "(-) INVESTIMENTOS";
      // FINEX: total das despesas financeiras
      if (/DESPESAS FINANCEIRAS$/.test(c))                           return "(-) FINEX";
      // Resultado antes tributos: linha EBIT (Lucro/Prejuízo Líquido antes tributos)
      if (/EBIT$/.test(c) || /LUCRO OU PREJUIZO LIQUIDO/.test(c))   return "(=) RESULTADO ANTES DOS TRIBUTOS";
      if (/TRIBUTOS$/.test(c))                                       return "(-) TRIBUTOS";
      if (/RESULTADO LIQUIDO$/.test(c))                              return "(=) RESULTADO LIQUIDO";
      return null; // sub-item — pula
    };

    const porAno = new Map();
    data.forEach(row => {
      const contaRaw = (row["CONTA"] ?? Object.values(row)[0] ?? "").toString().trim();
      const conta = normConta(contaRaw);
      const mesRaw = String(row["MES"] ?? Object.values(row)[1] ?? "").trim().toUpperCase();
      const valor = toNum(row["VALOR"] ?? Object.values(row)[2]);
      if (!conta || !mesRaw.startsWith("TOTAL/")) return;
      const ano = mesRaw.slice("TOTAL/".length);
      if (!ano || isNaN(parseInt(ano, 10))) return;
      if (parseInt(ano, 10) < ANO_MINIMO_DRE) return;
      const canonical = canonicalizarContaHist(conta);
      if (!canonical) return; // sub-item — pula
      if (!porAno.has(ano)) porAno.set(ano, new Map());
      // Acumula (agrega sub-linhas no mesmo canonical, ex: despesas operacionais)
      porAno.get(ano).set(canonical, (porAno.get(ano).get(canonical) ?? 0) + valor);
    });

    const resultado = {};
    porAno.forEach((contaMap, ano) => {
      if (contaMap.size === 0) return;
      // Tabela com JAN = total anual; calcYTD somará todos os meses → YTD = total anual ✓
      const tabela = {};
      const contasOrdenadas = [];
      contaMap.forEach((valor, conta) => {
        tabela[conta] = Object.fromEntries(MESES.map(m => [m, m === "JAN" ? valor : 0]));
        contasOrdenadas.push({ conta, label: conta, tipo: "item", indent: 1 });
      });
      resultado[ano] = { tabela, mesesRealizados: ["JAN"], contasOrdenadas };
    });
    return resultado;
  }

  // Agrupar rows por ano detectado (formato mensal normal)
  const porAno = new Map();
  data.forEach(row => {
    const conta = (row["CONTA"] ?? Object.values(row)[0] ?? "").toString().trim();
    const mesRaw = String(row["MES"] ?? Object.values(row)[1] ?? "").trim();
    const valor = toNum(row["VALOR"] ?? Object.values(row)[2]);
    if (!conta || !mesRaw) return;
    const ano = detectarAno(mesRaw);
    const mes = limparMes(mesRaw);
    if (!ano || !mes || !MESES.includes(mes)) return;
    if (parseInt(ano, 10) < ANO_MINIMO_DRE) return; // ignora anos anteriores a 2024
    if (!porAno.has(ano)) porAno.set(ano, []);
    porAno.get(ano).push({ CONTA: conta, MES: mes, VALOR: valor });
  });

  // Se nenhum ano detectado, tenta tratar como um único ano (fallback)
  if (porAno.size === 0 && data.length > 0) {
    const contasMeses = new Map();
    data.forEach(row => {
      const conta = (row["CONTA"] ?? Object.values(row)[0] ?? "").toString().trim();
      const mesRaw = String(row["MES"] ?? Object.values(row)[1] ?? "").trim().toUpperCase().slice(0, 3);
      if (!conta || !MESES.includes(mesRaw)) return;
      if (!contasMeses.has(conta)) contasMeses.set(conta, []);
      contasMeses.get(conta).push({ mes: mesRaw, valor: toNum(row["VALOR"] ?? Object.values(row)[2]) });
    });
    const primeirasConta = [...contasMeses.values()][0] || [];
    const mesesUnicos = [...new Set(primeirasConta.map(r => r.mes))];
    const repeticoes = mesesUnicos.length > 0 ? Math.floor(primeirasConta.length / mesesUnicos.length) : 1;
    if (repeticoes >= 2) {
      for (let a = 0; a < repeticoes; a++) {
        const ano = String(2026 - repeticoes + a);
        porAno.set(ano, []);
      }
      contasMeses.forEach((linhas, conta) => {
        linhas.forEach((r, idx) => {
          const anoIdx = Math.floor(idx / 12);
          const ano = String(2026 - repeticoes + anoIdx);
          if (porAno.has(ano)) porAno.get(ano).push({ CONTA: conta, MES: r.mes, VALOR: r.valor });
        });
      });
    }
  }

  const resultado = {};
  porAno.forEach((rows, ano) => {
    const dre = extrairDRE(rows);
    if (dre) resultado[ano] = dre;
  });
  return resultado;
}

function calcYTD(tabela, meses) {
  const t = {};
  Object.keys(tabela).forEach(k => {
    t[k] = { ...tabela[k] };
    t[k].YTD = meses.reduce((a,m) => a + (tabela[k][m]??0), 0);
  });
  return t;
}

function formatContaLabel(conta = "", label = "") {
  const raw = (conta || label).toString().replace(/\s+/g, " ").trim();
  return DISPLAY_LABELS[normalizarConta(raw)] || raw.toUpperCase();
}

function naturezaLinha(conta = "", tipo = "item") {
  const c = normalizarConta(conta);
  if (tipo === "deducao") return "despesa";
  if (tipo === "result" || tipo === "sub") return "resultado";
  if (tipo === "total" || c.includes("RECEITA") || ["ASSINATURAS", "CURSOS", "MODULOS"].includes(c)) return "receita";
  return "despesa";
}

function metaNatureza(natureza) {
  if (natureza === "receita") {
    return { label:"Receita", cor:T.grn, bg:`${T.grn}18`, brd:`${T.grn}40` };
  }
  if (natureza === "despesa") {
    return { label:"Despesa", cor:T.red, bg:`${T.red}16`, brd:`${T.red}40` };
  }
  return { label:"Resultado", cor:T.amb, bg:`${T.amb}16`, brd:`${T.amb}40` };
}

// Delta formatado com sinal
function fmtDelta(v) {
  if (v === 0) return <span style={{ color:T.dim }}>—</span>;
  const cor = v > 0 ? T.grn : T.red;
  return <span style={{ color:cor, fontFamily:MONO, fontSize:11 }}>{v > 0 ? "+" : ""}{money(v)}</span>;
}
function fmtPct(v) {
  if (!isFinite(v) || v === 0) return <span style={{ color:T.dim }}>—</span>;
  const cor = v > 0 ? T.grn : T.red;
  return <span style={{ color:cor, fontFamily:MONO, fontSize:10 }}>{v > 0 ? "+" : ""}{v.toFixed(1)}%</span>;
}

// - Cell formatter -------------------------------------------------------------
function CelVal({ v, tipo }) {
  if (v === 0) return <span style={{ color:T.dim }}>-</span>;
  if (tipo === "deducao") return <span style={{ fontFamily:MONO, fontSize:11, color:T.red, fontWeight:500 }}>{money(v)}</span>;
  const signed = tipo==="result"||tipo==="sub"||tipo==="total";
  const cor = signed ? T.corV(v) : T.txt;
  return <span style={{ fontFamily:MONO, fontSize:11, color:cor, fontWeight:tipo==="item"?400:500 }}>{money(v)}</span>;
}

// - MAIN ----------------------------------------------------------------------
export default function DRE() {
  const sheets = useSheets(["dre_2026", "dre_2024_2025"]);
  const { data, loading, lastUpdate } = sheets.dre_2026 || {};
  const { data: dataHist, loading: loadingHist, error: errorHist } = sheets.dre_2024_2025 || {};

  const [view,   setView]   = useState("Sintética");
  const [filtro, setFiltro] = useState("YTD");
  const [modo,   setModo]   = useState("Executivo");

  const dreVivo = extrairDRE(data);
  const dreHist = extrairDREMultiAno(Array.isArray(dataHist) ? dataHist : []);

  const tabelaBase      = dreVivo?.tabela      || FB_TABELA;
  const mesesRealizados = dreVivo?.mesesRealizados || FB_MESES;
  const aoVivo          = !!dreVivo;

  const mesesAtivos = useMemo(() => {
    if (filtro==="YTD") return mesesRealizados;
    if (filtro==="ANO") return MESES;
    if (filtro.startsWith("T")) return MESES.filter(m=>TRIMS[m]===filtro);
    return [filtro];
  }, [filtro, mesesRealizados]);

  const tf = useMemo(() => calcYTD(tabelaBase, mesesAtivos), [tabelaBase, mesesAtivos]);

  // Paleta dinâmica (recalculada a cada render após mudança de tema)
  const ytdBg     = `${T.purp}12`;
  const ytdBgHead = `${T.purp}18`;
  const rowHover  = T.mode === "light" ? "rgba(23,25,31,0.025)" : "rgba(255,255,255,0.03)";
  const subBg     = T.mode === "light" ? "rgba(23,25,31,0.018)" : "rgba(255,255,255,0.02)";
  const resultBg  = `${T.red}0a`;
  const totalBg   = `${T.blue}0d`;

  const colunas = mesesAtivos.length===1 ? mesesAtivos : [...mesesAtivos,"YTD"];
  const linhasDre = useMemo(() => {
    const estruturaAnalitica = dreVivo?.contasOrdenadas?.length
      ? dreVivo.contasOrdenadas
      : ESTRUTURA;
    const base = view === "Analítica"
      ? estruturaAnalitica
      : ESTRUTURA.filter(linha => !linha.conta || SINTETICA_CONTAS.has(linha.conta));
    return base.filter((linha, idx, arr) => {
      if (!linha.sep) return true;
      const prev = arr[idx - 1];
      const next = arr[idx + 1];
      return prev && next && !prev.sep && !next.sep;
    });
  }, [view, dreVivo]);

  const g = c => tf[c]?.YTD ?? 0;
  const rb = g("RECEITA OPERACIONAL BRUTA");
  const lb = g("(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO");
  const eb = g("(=) EBITDA");
  const rs = g("(=) RESULTADO LIQUIDO");
  const linhasMargem = [
    { label: "Margem Bruta",   conta: "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO", cor: T.grn  },
    { label: "Margem EBITDA",  conta: "(=) EBITDA",                               cor: T.amb  },
    { label: "Margem Líquida", conta: "(=) RESULTADO LIQUIDO",                    cor: T.purp },
  ];

  const dadosMargem = mesesRealizados.map(m => {
    const r = tabelaBase["RECEITA OPERACIONAL BRUTA"]?.[m] || 0;
    return {
      mes: ML[m]||m,
      "Margem Bruta":   r>0?(tabelaBase["(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO"]?.[m]||0)/r*100:0,
      "Margem EBITDA":  r>0?(tabelaBase["(=) EBITDA"]?.[m]||0)/r*100:0,
      "Margem Líquida": r>0?(tabelaBase["(=) RESULTADO LIQUIDO"]?.[m]||0)/r*100:0,
    };
  });

  const dadosBarras = mesesRealizados.map(m => ({
    mes: ML[m]||m,
    Receita:      tabelaBase["RECEITA OPERACIONAL BRUTA"]?.[m] || 0,
    "Lucro Bruto": tabelaBase["(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO"]?.[m] || 0,
    Resultado:    tabelaBase["(=) RESULTADO LIQUIDO"]?.[m] || 0,
  }));
  const ultimoMes   = mesesRealizados[mesesRealizados.length - 1];
  const mesAnterior = mesesRealizados[mesesRealizados.length - 2];

  const drivers = useMemo(() => {
    const contas = dreVivo?.contasOrdenadas?.filter(l => l.conta && l.tipo === "item") || [];
    const todasLinhas = contas.map(l => {
      const valor = tabelaBase[l.conta]?.YTD ?? tf[l.conta]?.YTD ?? 0;
      const natureza = naturezaLinha(l.conta, l.tipo);
      return {
        label: formatContaLabel(l.conta, l.label),
        valor: Math.abs(valor),
        natureza,
        delta: (tabelaBase[l.conta]?.[ultimoMes] || 0) - (tabelaBase[l.conta]?.[mesAnterior] || 0),
      };
    }).filter(d => d.valor > 0);
    const receitas = todasLinhas.filter(d => d.natureza === "receita").sort((a,b) => b.valor-a.valor).slice(0,3);
    const despesas = todasLinhas.filter(d => d.natureza === "despesa").sort((a,b) => b.valor-a.valor).slice(0,3);
    const linhasPeso = [...receitas, ...despesas];
    const margemEbitda = rb > 0 ? (eb / rb) * 100 : 0;
    return {
      margemEbitda,
      leitura: margemEbitda < 0
        ? `EBITDA negativo em ${margemEbitda.toFixed(1)}%, exigindo foco em recomposição de receita e pressão de custos.`
        : `EBITDA positivo em ${margemEbitda.toFixed(1)}%, com espaço para acompanhar a sustentação mensal.`,
      linhasPeso,
    };
  }, [dreVivo, tabelaBase, tf, ultimoMes, mesAnterior, rb, eb]);

  const AX = { fill:CA.tick, fontSize:9, fontFamily:MONO };

  // ── Comparativo anual: anos históricos + 2026 YTD ──────────────────────────
  const anosHist    = useMemo(() => Object.keys(dreHist).sort(), [dreHist]);
  const anosComp    = [...anosHist, "2026"];
  const tabelasComp = (() => {
    const result = {};
    anosHist.forEach(ano => {
      const dre = dreHist[ano];
      if (dre) result[ano] = calcYTD(dre.tabela, MESES); // ano completo
    });
    result["2026"] = calcYTD(tabelaBase, mesesRealizados); // YTD atual
    return result;
  })();

  const getComp = (ano, conta) => tabelasComp[ano]?.[conta]?.YTD ?? 0;
  const margemEbitda = rb > 0 ? (eb / rb) * 100 : 0;
  const margemLiquida = rb > 0 ? (rs / rb) * 100 : 0;
  const alertasExecutivos = [
    eb < 0 && {
      status:"margem",
      title:"EBITDA negativo no período",
      value:`${margemEbitda.toFixed(1)}%`,
      text:`Resultado operacional acumulado em ${money(eb)}.`,
      color:T.red,
    },
    rs < 0 && {
      status:"resultado",
      title:"Resultado líquido negativo",
      value:money(rs),
      text:`Margem líquida de ${margemLiquida.toFixed(1)}% no filtro atual.`,
      color:T.red,
    },
    eb >= 0 && {
      status:"estável",
      title:"EBITDA positivo",
      value:money(eb),
      text:`Margem EBITDA de ${margemEbitda.toFixed(1)}%.`,
      color:T.grn,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:48 }}>

      {/* Status + filtro de período 2026 */}
      <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, flexWrap:"wrap" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background: aoVivo?T.grn:T.amb }} />
        <span style={{ color:T.muted }}>{aoVivo?"Dados ao vivo · 2026":"Fallback verificado · 2026"}</span>
        {lastUpdate && <span style={{ color:T.dim }}>• {lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
        <span style={{ color:T.dim }}>· {mesesRealizados.length} meses realizados ({mesesRealizados.join(", ")})</span>
      </div>

      <PeriodSelector filtro={filtro} setFiltro={setFiltro} mesesRealizados={mesesRealizados} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <ViewModeToggle value={modo} onChange={setModo} />
        <div style={{ fontSize:11, color:T.muted, fontFamily:MONO }}>{filtro} · {mesesAtivos.join(", ")}</div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))", gap:10 }}>
        <Kpi label="Receita Bruta"     value={money(rb)}      cor={T.grn}       accent={T.grn} />
        <Kpi label="Lucro Bruto"       value={money(lb)}      cor={T.grn}       accent={T.grn} sub={rb>0 ? "Margem: "+((lb/rb)*100).toFixed(1)+"%" : undefined} />
        <Kpi label="EBITDA"            value={money(eb)}      cor={T.corV(eb)}  accent={T.corV(eb)} sub={rb>0 ? "Margem: "+((eb/rb)*100).toFixed(1)+"%" : undefined} />
        <Kpi label="Resultado Líquido" value={money(rs)}      cor={T.corV(rs)}  accent={T.corV(rs)} sub={rb>0 ? "Margem: "+((rs/rb)*100).toFixed(1)+"%" : undefined} />
      </div>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:10 }}>Diagnóstico executivo</div>
          <div style={{ fontSize:13, color:T.sub, lineHeight:1.55 }}>{drivers.leitura}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:14 }}>
            {[
              { label:"Bruta",   val:`${rb>0?((lb/rb)*100).toFixed(1):"0.0"}%`, cor:T.grn },
              { label:"EBITDA",  val:`${drivers.margemEbitda.toFixed(1)}%`,     cor:T.corV(eb) },
              { label:"Líquida", val:`${rb>0?((rs/rb)*100).toFixed(1):"0.0"}%`, cor:T.corV(rs) },
            ].map(({ label, val, cor }) => (
              <div key={label}>
                <div style={{ fontSize:9, color:T.muted, textTransform:"uppercase" }}>{label}</div>
                <div style={{ fontSize:14, color:cor, fontFamily:MONO, fontWeight:600 }}>{val}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:12 }}>Linhas que mais pesam no YTD</div>
          {drivers.linhasPeso.map(d => {
            const meta = metaNatureza(d.natureza);
            return (
              <div key={d.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"7px 0", borderBottom:`1px solid ${T.brd}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                  <span style={{ fontSize:9, color:meta.cor, background:meta.bg, border:`1px solid ${meta.brd}`, borderRadius:5, padding:"1px 6px", fontWeight:600, flexShrink:0 }}>{meta.label}</span>
                  <span style={{ fontSize:12, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
                </div>
                <span style={{ fontSize:12, color:meta.cor, fontFamily:MONO, fontWeight:600 }}>{money(d.valor)}</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Sparklines de margem */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {linhasMargem.map(({ label, cor }) => (
          <Card key={label} style={{ padding:"13px 15px" }}>
            <div style={{ fontSize:9, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
            <ResponsiveContainer width="100%" height={86}>
              <LineChart data={dadosMargem} margin={{top:6,right:6,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
                <XAxis dataKey="mes" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} width={34} tickFormatter={v=>v.toFixed(0)+"%"} />
                <ReferenceLine y={0} stroke={T.red} strokeDasharray="3 3" opacity={0.4} />
                <Tooltip content={<TipPct />} />
                <Line type="monotone" dataKey={label} stroke={cor} strokeWidth={2}
                  dot={{ r:3, fill:cor, strokeWidth:0 }}
                  label={{ position:"top", fontSize:8, fill:cor, formatter:v=>v.toFixed(1)+"%" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      {/* Barras receita vs resultado */}
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:12 }}>Receita vs Resultado por Mês — 2026</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dadosBarras} barGap={3} margin={{top:4,right:4,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
            <XAxis dataKey="mes" tick={AX} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={74} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <ReferenceLine y={0} stroke={T.dim} strokeWidth={1} />
            <Bar dataKey="Receita"      fill={T.grn}  radius={[3,3,0,0]} maxBarSize={28} opacity={0.9} />
            <Bar dataKey="Lucro Bruto"  fill={T.purp} radius={[3,3,0,0]} maxBarSize={28} opacity={0.85} />
            <Bar dataKey="Resultado"    radius={[3,3,0,0]} maxBarSize={28}>
              {dadosBarras.map((d,i) => <Cell key={i} fill={d.Resultado>=0?T.grn:T.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tab selector */}
      {modo === "Analítico" && <Card><TabBar tabs={["Sintética","Analítica","Análise","Comparativo"]} ativo={view} onChange={setView} /></Card>}
      {(view === "Sintética" || view === "Analítica") && (
        modo === "Analítico" && <div style={{ marginTop:-10, color:T.muted, fontSize:11, lineHeight:1.5 }}>
          {view === "Sintética"
            ? "Visão Sintética: principais agrupamentos e resultados da DRE."
            : "Visão Analítica: abertura por linhas disponíveis na base integrada."}
        </div>
      )}

      {/* DRE TABLE — Sintética / Analítica */}
      {modo === "Analítico" && (view === "Sintética" || view === "Analítica") && (
        <Card>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:300+colunas.length*115 }}>
              <thead>
                <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
                  <th style={{ textAlign:"left", padding:"9px 14px", fontSize:9, fontWeight:600, color:T.muted, textTransform:"uppercase", width:260 }}>Conta</th>
                  {colunas.map(col => (
                    <th key={col} style={{ textAlign:"right", padding:"9px 12px", fontSize:9, fontWeight:600, color:col==="YTD"?T.purp:T.muted, textTransform:"uppercase", minWidth:110, background:col==="YTD"?ytdBgHead:undefined }}>
                      {col==="YTD"?"YTD 2026":ML[col]||col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(loading && !aoVivo)
                  ? <tr><td colSpan={colunas.length+1} style={{ padding:32, textAlign:"center", color:T.muted }}>Carregando...</td></tr>
                  : linhasDre.map((linha,i) => {
                    if (linha.sep) return (
                      <tr key={"s"+i}>
                        <td colSpan={colunas.length+1} style={{ height:1, background:T.brd, padding:0 }} />
                      </tr>
                    );
                    const { conta, label, tipo, indent } = linha;
                    const vals = tf[conta] || {};
                    const rowBg = tipo==="result" ? resultBg
                                : tipo==="sub"    ? subBg
                                : tipo==="total"  ? totalBg
                                : "transparent";
                    return (
                      <Fragment key={conta}>
                        <tr style={{ background:rowBg, borderBottom:`1px solid ${T.brd}` }}
                          onMouseEnter={e=>{ if(rowBg==="transparent") e.currentTarget.style.background=rowHover; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background=rowBg; }}>
                          <td style={{ padding:`7px 14px 7px ${14+indent*14}px`, fontSize:12, color:tipo==="item"?T.sub:T.txt, fontWeight:tipo==="item"?400:600 }}>
                            {formatContaLabel(conta, label)}
                          </td>
                          {colunas.map(col => (
                            <td key={col} style={{ textAlign:"right", padding:"7px 12px", background:col==="YTD"?ytdBg:undefined }}>
                              <CelVal v={vals[col]??0} tipo={tipo} />
                            </td>
                          ))}
                        </tr>
                        {conta === "(=) RESULTADO LIQUIDO" && linhasMargem.map(m => (
                          <tr key={`${conta}-${m.label}`} style={{ background:subBg, borderBottom:`1px solid ${T.brd}` }}>
                            <td style={{ padding:"7px 14px 7px 28px", fontSize:11, color:T.muted, fontWeight:500 }}>{m.label}</td>
                            {colunas.map(col => {
                              const receita = col === "YTD" ? rb : (tabelaBase["RECEITA OPERACIONAL BRUTA"]?.[col] || 0);
                              const valor   = col === "YTD" ? g(m.conta) : (tabelaBase[m.conta]?.[col] || 0);
                              const margem  = receita > 0 ? (valor / receita) * 100 : 0;
                              return (
                                <td key={col} style={{ textAlign:"right", padding:"7px 12px", background:col==="YTD"?ytdBg:undefined }}>
                                  <span style={{ fontFamily:MONO, fontSize:11, color:m.cor, fontWeight:500 }}>{margem.toFixed(1)}%</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ANÁLISE */}
      {modo === "Analítico" && view === "Análise" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:14 }}>Composição - Receita Bruta</div>
            {["ASSINATURAS","CURSOS","MODULOS"].map((conta,i) => {
              const v = tf[conta]?.YTD || 0;
              const p = rb>0?(v/rb)*100:0;
              const cors=[T.blue,T.grn,T.purp];
              return (
                <div key={conta} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:T.sub }}>{conta.charAt(0)+conta.slice(1).toLowerCase()}</span>
                    <div style={{ display:"flex", gap:14 }}>
                      <span style={{ fontSize:11, fontFamily:MONO, color:T.muted }}>{money(v)}</span>
                      <span style={{ fontSize:11, fontFamily:MONO, color:cors[i], fontWeight:600 }}>{p.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ height:4, background:T.brd, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${p}%`, background:cors[i], borderRadius:2 }} />
                  </div>
                </div>
              );
            })}
          </Card>
          <Card style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", marginBottom:14 }}>Análise Vertical, Horizontal e Deltas</div>
            <div style={{ display:"grid", gridTemplateColumns:"1.3fr repeat(4,1fr)", padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              {["Linha","YTD","Vertical","Último mês","Delta mês"].map((h,i) => (
                <div key={h} style={{ textAlign:i===0?"left":"right", fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase" }}>{h}</div>
              ))}
            </div>
            {[
              ["Receita Bruta","RECEITA OPERACIONAL BRUTA",T.grn],
              ["Receita Líquida","(=) RECEITA OPERACIONAL LIQUIDA",T.sub],
              ["Lucro Bruto","(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",T.grn],
              ["EBITDA","(=) EBITDA",T.amb],
              ["Resultado Líquido","(=) RESULTADO LIQUIDO",T.blue],
            ].map(([label, conta, cor]) => {
              const ytd = g(conta);
              const ult = tabelaBase[conta]?.[ultimoMes] || 0;
              const ant = tabelaBase[conta]?.[mesAnterior] || 0;
              const delta = ult - ant;
              return (
                <div key={conta} style={{ display:"grid", gridTemplateColumns:"1.3fr repeat(4,1fr)", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${T.brd}` }}>
                  <div style={{ fontSize:12, color:T.sub }}>{label}</div>
                  <div style={{ textAlign:"right", fontSize:12, fontFamily:MONO, color:cor }}>{money(ytd)}</div>
                  <div style={{ textAlign:"right", fontSize:12, fontFamily:MONO, color:T.muted }}>{rb>0 ? ((ytd/rb)*100).toFixed(1)+"%" : "-"}</div>
                  <div style={{ textAlign:"right", fontSize:12, fontFamily:MONO, color:T.sub }}>{money(ult)}</div>
                  <div style={{ textAlign:"right", fontSize:12, fontFamily:MONO, color:T.corV(delta) }}>{(delta>=0?"+":"")+money(delta)}</div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* COMPARATIVO ANUAL */}
      {modo === "Analítico" && view === "Comparativo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {loadingHist ? (
            <Card style={{ padding:28, textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.muted }}>Carregando dados históricos…</div>
            </Card>
          ) : anosHist.length === 0 ? (
            <Card style={{ padding:28, textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.muted, marginBottom:6 }}>
                {errorHist ? "Erro ao carregar dados históricos." : "Dados históricos não encontrados."}
              </div>
              <div style={{ fontSize:11, color:T.dim, lineHeight:1.6 }}>
                Verifique:<br/>
                1) A planilha está compartilhada com a conta de serviço configurada no servidor<br/>
                2) A aba <em>Comparativo Anual</em> existe e tem anos como colunas (ex: 2024, 2025).<br/>
                {errorHist && <span style={{ color:T.red }}>Erro: {String(errorHist).slice(0, 200)}</span>}
              </div>
            </Card>
          ) : (
            <>
              {/* Nota informativa */}
              <div style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>
                {anosHist.map(a => `${a}: ano completo`).join(" · ")} · 2026: YTD ({mesesRealizados.length} meses)
              </div>

              {/* Tabela comparativo: sintéticas em comum */}
              <Card>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
                        <th style={{ textAlign:"left", padding:"9px 14px", fontSize:9, fontWeight:600, color:T.muted, textTransform:"uppercase", width:220 }}>Conta</th>
	                        {anosComp.map((ano) => (
                          <th key={ano} style={{ textAlign:"right", padding:"9px 12px", fontSize:9, fontWeight:600, minWidth:110,
                            color: ano==="2026" ? T.purp : T.muted,
                            background: ano==="2026" ? ytdBgHead : undefined }}>
                            {ano}{ano==="2026"?" (YTD)":""}
                          </th>
                        ))}
                        {anosComp.length >= 2 && (
                          <>
                            <th style={{ textAlign:"right", padding:"9px 12px", fontSize:9, fontWeight:600, color:T.muted, minWidth:90 }}>Δ Valor</th>
                            <th style={{ textAlign:"right", padding:"9px 12px", fontSize:9, fontWeight:600, color:T.muted, minWidth:72 }}>Δ %</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
	                      {SINTETICAS_COMP.map((linha) => {
                        const { conta, label, tipo } = linha;
                        const rowBg = tipo==="result" ? resultBg : tipo==="sub" ? subBg : tipo==="total" ? totalBg : "transparent";
                        const vals = anosComp.map(ano => getComp(ano, conta));
                        const penultimo = vals[vals.length - 2] ?? 0;
                        const ultimo    = vals[vals.length - 1] ?? 0;
                        const delta     = ultimo - penultimo;
                        const deltaPct  = penultimo !== 0 ? (delta / Math.abs(penultimo)) * 100 : 0;
                        return (
                          <tr key={conta} style={{ background:rowBg, borderBottom:`1px solid ${T.brd}` }}
                            onMouseEnter={e=>{ if(rowBg==="transparent") e.currentTarget.style.background=rowHover; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background=rowBg; }}>
                            <td style={{ padding:"7px 14px", fontSize:12, color:tipo==="deducao"?T.muted:T.txt, fontWeight:tipo==="item"?400:600 }}>{label}</td>
                            {anosComp.map((ano, ai) => (
                              <td key={ano} style={{ textAlign:"right", padding:"7px 12px", background:ano==="2026"?ytdBg:undefined }}>
                                <CelVal v={vals[ai]} tipo={tipo} />
                              </td>
                            ))}
                            {anosComp.length >= 2 && (
                              <>
                                <td style={{ textAlign:"right", padding:"7px 12px" }}>{fmtDelta(delta)}</td>
                                <td style={{ textAlign:"right", padding:"7px 12px" }}>{fmtPct(deltaPct)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Cards de variação YoY para KPIs principais */}
              {anosComp.length >= 2 && (() => {
                const anoRef  = anosComp[anosComp.length - 2];
                const anoAtual = anosComp[anosComp.length - 1];
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
                    {[
                      { label:"Receita Bruta",    conta:"RECEITA OPERACIONAL BRUTA",                   cor:T.grn  },
                      { label:"Lucro Bruto",       conta:"(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO",   cor:T.grn  },
                      { label:"EBITDA",            conta:"(=) EBITDA",                                 cor:T.amb  },
                      { label:"Resultado Líquido", conta:"(=) RESULTADO LIQUIDO",                      cor:T.purp },
                    ].map(({ label, conta, cor }) => {
                      const vRef  = getComp(anoRef, conta);
                      const vAtual = getComp(anoAtual, conta);
                      const delta  = vAtual - vRef;
                      const deltaPct = vRef !== 0 ? (delta / Math.abs(vRef)) * 100 : 0;
                      return (
                        <Card key={conta} style={{ padding:"14px 16px" }}>
                          <div style={{ fontSize:9, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                          <div style={{ fontSize:16, fontFamily:MONO, color:cor, fontWeight:700, marginBottom:4 }}>{money(vAtual)}</div>
                          <div style={{ fontSize:10, color:T.muted }}>{anoAtual} vs {anoRef}</div>
                          <div style={{ marginTop:6, display:"flex", gap:8 }}>
                            <span style={{ fontSize:11, fontFamily:MONO, color:T.corV(delta) }}>{delta>=0?"+":""}{money(delta)}</span>
                            <span style={{ fontSize:10, fontFamily:MONO, color:T.corV(deltaPct) }}>{deltaPct>=0?"+":""}{deltaPct.toFixed(1)}%</span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
