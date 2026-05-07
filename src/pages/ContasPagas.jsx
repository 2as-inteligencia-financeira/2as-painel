import { useMemo, useState } from "react";
import { ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { T, CA, MONO } from "../theme";
import { useSheets, toNum, parseDate, fmt } from "../hooks/useSheets";
import { buildOperationalReportHtml, downloadHtml, downloadPdf } from "../utils/operationalReport";
import { resolveCategory } from "../utils/categoryResolver";
import ReportActions from "../components/ReportActions";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";

const CORES = [T.red, T.amb, T.purp, T.grn, T.blue2, T.sub];

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

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function buildPresets() {
  const hoje = new Date();
  const ini7   = addDays(hoje, -7);
  const ini30  = addDays(hoje, -30);
  const ini90  = addDays(hoje, -90);
  const ini180 = addDays(hoje, -180);
  const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const iniAno = new Date(hoje.getFullYear(), 0, 1);
  return [
    { label:"Últimos 7d",   ini: toInputDate(ini7),   fim: toInputDate(hoje) },
    { label:"Últimos 30d",  ini: toInputDate(ini30),  fim: toInputDate(hoje) },
    { label:"Últimos 90d",  ini: toInputDate(ini90),  fim: toInputDate(hoje) },
    { label:"Últimos 180d", ini: toInputDate(ini180), fim: toInputDate(hoje) },
    { label:"Este mês",     ini: toInputDate(iniMes), fim: toInputDate(fimMes) },
    { label:"Este ano",     ini: toInputDate(iniAno), fim: toInputDate(hoje)   },
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

function grupoFinanceiro(categoria = "") {
  const c = categoria.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/(FINEX|JUROS|TARIFA|IOF|FINANC|EMPREST|BANCO|ANTECIP|CREDITO|CARTAO)/.test(c)) return "FINEX";
  if (/(CAPEX|INVEST|IMOBILIZ|EQUIP|NOTEBOOK|COMPUTADOR|SOFTWARE|LICENCA|INFRA)/.test(c)) return "CAPEX";
  return "OPEX";
}

function extrairContasPagas(data) {
  return (data?.data || [])
    .map(r => {
      const d = parseDate(r["DATA_PAGAMENTO"] ?? r["PAGAMENTO"] ?? r["DATA"]);
      const valorBruto = Math.abs(toNum(r["VALOR_BRUTO"] ?? r["VALOR_LIQUIDO"] ?? r["VALOR"] ?? r["VALOR_PAGO"] ?? 0));
      const deducoes   = Math.abs(toNum(r["VALOR_DEDUCOES"] ?? r["DEDUCOES"] ?? r["DEDUÇÕES"] ?? 0));
      const liquidoRaw = toNum(r["VALOR_LIQUIDO"] ?? null);
      const valor = Math.abs(Number.isFinite(liquidoRaw) && liquidoRaw !== 0
        ? liquidoRaw
        : valorBruto - deducoes > 0 ? valorBruto - deducoes : valorBruto);
      return {
        dataObj: d,
        data: d ? d.toLocaleDateString("pt-BR") : "-",
        mesKey: d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "",
        mes: d ? d.toLocaleDateString("pt-BR", { month:"short", year:"2-digit" }) : "-",
        fornecedor: (r["FORNECEDOR"] || r["BANCO_ORIGEM"] || r["NOME"] || "Sem fornecedor").toString().trim(),
        categoria: resolveCategory(r),
        descricao: (r["DESCRICAO"] || r["DESCRIÇÃO"] || r["HISTORICO"] || "").toString().trim(),
        valorBruto,
        deducoes,
        valor,
      };
    })
    .filter(r => r.dataObj && r.valor > 0)
    .sort((a,b) => b.dataObj - a.dataObj || b.valor - a.valor);
}

/** Normaliza o fornecedor para agrupar lançamentos compostos (Caju, FGTS, etc.) */
function normalizarFornecedor(fornecedor = "") {
  const f = fornecedor.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/TOTAL.?PASS|TOTALPASS/.test(f))                                        return "Total Pass";
  if (/^CAJU|CAJU\s/.test(f))                                                 return "Caju";
  if (/GOVERNO.?FEDERAL|RECEITA.?FEDERAL|^INSS$|^IRRF?$/.test(f))            return "Governo Federal";
  if (/FGTS/.test(f))                                                         return "FGTS";
  return fornecedor.trim();
}

function chaveLancamento(c) {
  // Agrupamos por data + fornecedor normalizado (sem descrição),
  // para que lançamentos compostos e parcelas do mesmo pagamento fiquem juntos.
  return [c.data, normalizarFornecedor(c.fornecedor)].join("||").toLowerCase();
}

function ordenarPorTotalLancamento(rows) {
  const totais = new Map();
  rows.forEach(c => {
    const key = chaveLancamento(c);
    totais.set(key, (totais.get(key) || 0) + c.valor);
  });
  return [...rows].sort((a, b) => {
    const dateDiff = b.dataObj - a.dataObj;
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
    // Para grupos compostos usa o nome normalizado (pai) na primeira linha
    const nomePai = normalizarFornecedor(c.fornecedor);
    const nomeExibicao = temDetalhe ? nomePai : c.fornecedor;
    return {
      ...c,
      primeiraLinhaLancamento: primeiraLinha,
      totalLancamento: grupo?.total || c.valor,
      nomeExibicao,
      fornecedorRelatorio: primeiraLinha
        ? `${nomeExibicao}${temDetalhe ? ` | Total: ${fmt.brl(grupo.total)}` : ""}`
        : "",
    };
  });
}

function GranatumGrupoPagas({ grupo, expanded, onToggle }) {
  const { head, rows, total } = grupo;
  const isMulti = rows.length > 1;
  const isComposto = !isMulti && (head.deducoes || 0) > 0;
  const temDetalhe = isMulti || isComposto;
  const nomePrincipal = isMulti ? normalizarFornecedor(head.fornecedor) : head.fornecedor;
  const COLS = "28px 94px minmax(360px,1.35fr) minmax(380px,1.1fr) 128px";
  return (
    <div>
      {/* Linha pai */}
      <div
        onClick={temDetalhe ? onToggle : undefined}
        style={{ display:"grid", gridTemplateColumns:COLS, padding:"9px 16px", alignItems:"center",
          cursor:temDetalhe?"pointer":"default", borderBottom:`1px solid rgba(148,163,184,0.1)`,
          background:"transparent", transition:"background 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
        onMouseLeave={e => e.currentTarget.style.background="transparent"}>

        {/* Chevron */}
        <div style={{ color:T.muted, fontSize:10, textAlign:"center", userSelect:"none", lineHeight:1 }}>
          {temDetalhe ? (expanded ? "▼" : "▶") : ""}
        </div>

        {/* Data */}
        <div style={{ fontSize:11, color:T.sub, fontFamily:MONO, fontWeight:600 }}>{head.data}</div>

        {/* Fornecedor / Descrição */}
        <div style={{ paddingLeft:4, overflow:"hidden" }}>
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            overflow:"hidden",
          }}>
            {isMulti && (
              <span style={{ padding:"1px 7px", borderRadius:4, background:`${T.blue2}1a`, color:T.blue2,
                fontSize:9, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
                {rows.length}×
              </span>
            )}
            <span style={{
              fontSize:12, color:isMulti||isComposto?T.blue2:T.txt,
              fontWeight:isMulti||isComposto?600:400,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
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

        {/* Categoria */}
        <div style={{ fontSize:10, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
          title={head.categoria}>{head.categoria}</div>

        {/* Valor */}
        <div style={{ fontSize:13, color:T.red, fontFamily:MONO, fontWeight:700, textAlign:"right" }}>
          {fmt.brl(isMulti ? total : head.valor)}
        </div>
      </div>

      {/* Expandido: bruto / deduções / líquido */}
      {expanded && isComposto && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.1)` }}>
          {[
            { label:"Bruto",   valor:head.valorBruto, negative:false, color:T.sub,  bold:false },
            { label:"Deduções",valor:head.deducoes,   negative:true,  color:T.amb,  bold:false },
            { label:"Líquido", valor:head.valor,       negative:false, color:T.txt,  bold:true  },
          ].map((line, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
              padding:"5px 16px 5px 52px", alignItems:"center",
              borderBottom:i<2?`1px solid rgba(148,163,184,0.06)`:"none" }}>
              <div /><div />
              <div style={{ paddingLeft:4, fontSize:11, color:line.color, fontWeight:line.bold?700:400 }}>
                {line.label}
              </div>
              <div />
              <div style={{ fontSize:11, fontFamily:MONO, fontWeight:line.bold?700:600,
                textAlign:"right", color:line.color }}>
                {line.negative ? "−" : ""}{fmt.brl(line.valor)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expandido: múltiplos pagamentos individuais */}
      {expanded && isMulti && (
        <div style={{ background:"rgba(255,255,255,0.018)", borderBottom:`1px solid rgba(148,163,184,0.1)` }}>
          {rows.map((c, i) => {
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:COLS,
                padding:"5px 16px 5px 52px", alignItems:"center",
                borderBottom:i<rows.length-1?`1px solid rgba(148,163,184,0.06)`:"none" }}>
                <div />
                <div style={{ fontSize:10, color:T.muted, fontFamily:MONO }}>{c.data}</div>
                <div style={{ paddingLeft:4, overflow:"hidden" }}>
                  <div style={{ fontSize:11, color:T.sub,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.descricao && c.descricao !== "-" ? c.descricao : c.categoria}
                  </div>
                </div>
                <div style={{ fontSize:10, color:T.muted, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.categoria}</div>
                <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>
                  {fmt.brl(c.valor)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function agrupar(rows, campo, limite = 10) {
  const mapa = new Map();
  rows.forEach(r => mapa.set(r[campo] || "Sem informação", (mapa.get(r[campo] || "Sem informação") || 0) + r.valor));
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a,b) => b.valor - a.valor)
    .slice(0, limite);
}

function agruparMes(rows) {
  const mapa = new Map();
  rows.forEach(r => {
    const atual = mapa.get(r.mesKey) || { label:r.mes, key:r.mesKey, valor:0, qtd:0 };
    atual.valor += r.valor;
    atual.qtd += 1;
    mapa.set(r.mesKey, atual);
  });
  return [...mapa.values()].sort((a,b) => a.key.localeCompare(b.key));
}

function ultimosMeses(rows, limite = 8) {
  return [...agruparMes(rows)].sort((a, b) => b.key.localeCompare(a.key)).slice(0, limite);
}

// Exibe bruto / deduções / líquido quando há retenções
function ComposicaoPagamentoPagas({ conta }) {
  if (!conta?.primeiraLinhaLancamento) return null;
  if (!conta?.deducoes || conta.deducoes === 0) {
    return <span style={{ color:T.red, fontFamily:MONO, fontWeight:600, fontSize:12 }}>{fmt.brl(conta?.valor || 0)}</span>;
  }
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:1, fontFamily:MONO, fontSize:10, lineHeight:1.3, textAlign:"right" }}>
      <span style={{ color:T.sub }}>+ Bruto {fmt.brl(conta.valorBruto)}</span>
      <span style={{ color:T.amb }}>- Deduções {fmt.brl(conta.deducoes)}</span>
      <span style={{ color:T.red, fontWeight:700, fontSize:11 }}>= Líq. {fmt.brl(conta.valor)}</span>
    </div>
  );
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
      {sub && <div style={{ fontSize:10, color:T.muted, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
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

export default function ContasPagas() {
  const sheets = useSheets(["despesas_historico"]);
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modo, setModo] = useState("Executivo");
  const [pagina, setPagina] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [expandidos, setExpandidos] = useState(new Set());
  const toggleExpandido = key => setExpandidos(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });
  const POR_PAG = 25;
  const PRESETS = buildPresets();

  const contas = useMemo(() => extrairContasPagas(sheets.despesas_historico.data), [sheets.despesas_historico.data]);
  const periodoLabel = dataIni || dataFim
    ? `${dataIni ? parseInputDate(dataIni).toLocaleDateString("pt-BR") : "início"} até ${dataFim ? parseInputDate(dataFim).toLocaleDateString("pt-BR") : "fim"}`
    : "Todo o período";
  const filtradasBase = contas.filter(c => {
    const termo = busca.trim().toLowerCase();
    const passaGrupo = grupo === "todos" || grupoFinanceiro(c.categoria) === grupo;
    const passaPeriodo = inDateRange(c.dataObj, dataIni, dataFim);
    const passaBusca = !termo ||
      c.data.includes(busca.trim()) ||
      c.fornecedor.toLowerCase().includes(termo) ||
      c.categoria.toLowerCase().includes(termo) ||
      c.descricao.toLowerCase().includes(termo) ||
      fmt.brl(c.valor).toLowerCase().includes(termo);
    return passaGrupo && passaPeriodo && passaBusca;
  });
  const filtradas = useMemo(() => prepararExibicaoLancamentos(ordenarPorTotalLancamento(filtradasBase)), [filtradasBase]);
  const gruposGranatum = useMemo(() => {
    if (modo !== "Analítico") return [];
    const ordered = ordenarPorTotalLancamento(filtradasBase);
    const result = [];
    const seen = new Map();
    ordered.forEach(c => {
      const key = chaveLancamento(c);
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
  }, [filtradasBase, modo]);

  const total = filtradas.reduce((a,c) => a + c.valor, 0);
  const fornecedores = agrupar(filtradas, "fornecedor", 10);
  const categorias = agrupar(filtradas, "categoria", 10);
  const meses = agruparMes(filtradas);
  const mesesRecentes = ultimosMeses(filtradas, 8);
  const grupos = ["OPEX", "FINEX", "CAPEX"].map(label => {
    const rows = filtradas.filter(c => grupoFinanceiro(c.categoria) === label);
    return { label, valor: rows.reduce((a,c) => a + c.valor, 0), qtd: rows.length };
  }).filter(g => g.valor > 0);
  const totalPaginas = Math.max(1, Math.ceil(gruposGranatum.length / POR_PAG));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const paginaGrupos = gruposGranatum.slice(paginaAtual * POR_PAG, (paginaAtual + 1) * POR_PAG);
  const maiorFornecedor = fornecedores[0];
  const ticketMedio = filtradas.length ? total / filtradas.length : 0;
  const grupoLabel = grupo === "todos" ? "Todos" : grupo;
  const maiorGrupo = grupos[0];
  const alertasExecutivos = [
    maiorFornecedor && {
      status:"concentração",
      title:"Maior fornecedor pago",
      value:fmt.brlk(maiorFornecedor.valor),
      text:maiorFornecedor.label,
      color:T.red,
    },
    maiorGrupo && {
      status:"mix de despesa",
      title:`Grupo dominante: ${maiorGrupo.label}`,
      value:fmt.brlk(maiorGrupo.valor),
      text:`${maiorGrupo.qtd} lançamentos no filtro atual.`,
      color:T.amb,
    },
  ];

  const gerarHtml = () => buildOperationalReportHtml({
      title: "Contas Pagas",
      subtitle: "Visão operacional conforme filtros aplicados no painel.",
      filters: [
        { label:"Grupo", value:grupoLabel },
        { label:"Período", value:periodoLabel },
        { label:"Busca", value:busca.trim() || "Sem filtro" },
      ],
      kpis: [
        { label:"Total pago", value:fmt.brl(total), sub:`${filtradas.length} lançamentos` },
        { label:"Ticket médio", value:fmt.brl(ticketMedio), sub:"por lançamento" },
        { label:"Maior fornecedor", value:maiorFornecedor ? fmt.brl(maiorFornecedor.valor) : "-", sub:maiorFornecedor?.label },
        { label:"Meses com pagamento", value:String(meses.length), sub:meses.at(-1)?.label },
      ],
      totalLabel: "Total pago no filtro",
      totalValue: total,
      sections: [
        {
          title:"OPEX, FINEX e CAPEX",
          rows: grupos,
          columns: [
            { label:"Grupo", key:"label" },
            { label:"Lançamentos", key:"qtd", num:true },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
        {
          title:"Pagamentos por mês",
          rows: meses,
          columns: [
            { label:"Mês", key:"label" },
            { label:"Lançamentos", key:"qtd", num:true },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
        {
          title:"Maiores fornecedores pagos",
          rows: fornecedores,
          columns: [
            { label:"Fornecedor", key:"label" },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
        {
          title:"Maiores categorias pagas",
          rows: categorias,
          columns: [
            { label:"Categoria", key:"label" },
            { label:"Valor", key:"valor", num:true, money:true },
          ],
        },
      ],
      rows: filtradas,
      columns: [
        { label:"Data", key:"data" },
        { label:"Fornecedor", key:"fornecedorRelatorio" },
        { label:"Categoria", key:"categoria" },
        { label:"Descrição", key:"descricao" },
        { label:"Valor", key:"valor", num:true, money:true },
      ],
    });

  const exportarHtml = () => {
    const html = gerarHtml();
    downloadHtml(`contas-pagas-${grupo}-${new Date().toISOString().slice(0,10)}.html`, html);
  };

  const exportarPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(`contas-pagas-${grupo}-${new Date().toISOString().slice(0,10)}.pdf`, gerarHtml());
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:48 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:10 }}>
        <Kpi label="Total pago" value={fmt.brlk(total)} sub={`${filtradas.length} lançamentos`} cor={T.red} />
        <Kpi label="Ticket médio" value={fmt.brlk(ticketMedio)} sub="por lançamento" cor={T.amb} />
        <Kpi label="Maior fornecedor" value={maiorFornecedor ? fmt.brlk(maiorFornecedor.valor) : "-"} sub={maiorFornecedor?.label} cor={T.blue2} />
        <Kpi label="Meses com pagamento" value={String(meses.length)} sub={meses.at(-1)?.label} cor={T.sub} />
      </div>

      <Card style={{ padding:"14px 16px" }}>
        {/* Linha 1: grupo + presets */}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <ViewModeToggle value={modo} onChange={setModo} />
            {[{ id:"todos", label:"Todos" }, { id:"OPEX", label:"OPEX" }, { id:"FINEX", label:"FINEX" }, { id:"CAPEX", label:"CAPEX" }].map(g => (
              <button key={g.id} onClick={() => { setGrupo(g.id); setPagina(0); }}
                style={{ padding:"5px 11px", borderRadius:6, border:`1px solid ${grupo === g.id ? T.blue : T.brd}`, background:grupo === g.id ? "rgba(245,158,11,0.13)" : T.surf, color:grupo === g.id ? T.blue2 : T.muted, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                {g.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {PRESETS.map(p => {
              const ativo = dataIni === p.ini && dataFim === p.fim;
              return (
                <button key={p.label}
                  onClick={() => { setDataIni(p.ini); setDataFim(p.fim); setPagina(0); }}
                  style={{ padding:"5px 11px", borderRadius:6, border:`1px solid ${ativo ? T.blue : T.brd}`, background: ativo ? "rgba(245,158,11,0.13)" : "transparent", color: ativo ? T.blue2 : T.muted, fontSize:11, fontWeight: ativo ? 600 : 400, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Linha 2: datas manuais + busca + exports */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <input
            type="date"
            value={dataIni}
            onChange={e => { setDataIni(e.target.value); setPagina(0); }}
            title="Data inicial de pagamento"
            style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
          />
          <input
            type="date"
            value={dataFim}
            onChange={e => { setDataFim(e.target.value); setPagina(0); }}
            title="Data final de pagamento"
            style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
          />
          {(dataIni || dataFim) && (
            <button onClick={() => { setDataIni(""); setDataFim(""); setPagina(0); }}
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:T.muted, fontSize:12, cursor:"pointer" }}>
              Limpar período
            </button>
          )}
          <input
            placeholder="Buscar fornecedor, categoria, descrição ou valor..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(0); }}
            style={{ flex:1, minWidth:240, padding:"7px 11px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
          />
          <ReportActions onHtml={exportarHtml} onPdf={exportarPdf} pdfLoading={pdfLoading} />
        </div>
      </Card>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {modo === "Executivo" && (
      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Pagamentos por mês</div>
          <div>
            {mesesRecentes.map(item => (
              <div key={item.key} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:T.sub }}>{item.label}</span>
                  <span style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(item.valor)}</span>
                </div>
                <div style={{ height:5, background:T.bg, borderRadius:99, overflow:"hidden" }}>
                  <div
                    style={{
                      height:"100%",
                      width:`${Math.min(100, total ? (item.valor / total) * 100 : 0)}%`,
                      background:T.red,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>OPEX, FINEX e CAPEX pagos</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Tooltip content={<Tip />} />
              <Pie data={grupos} dataKey="valor" nameKey="label" innerRadius={56} outerRadius={90} paddingAngle={1}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {grupos.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      )}

      {modo === "Executivo" && (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Maiores fornecedores pagos</div>
          {fornecedores.map(f => (
            <div key={f.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <span style={{ fontSize:12, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.label}>{f.label}</span>
              <span style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(f.valor)}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Maiores categorias pagas</div>
          {categorias.map(f => (
            <div key={f.label} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <span style={{ fontSize:12, color:T.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.label}>{f.label}</span>
              <span style={{ fontSize:12, color:T.amb, fontFamily:MONO, fontWeight:600 }}>{fmt.brlk(f.valor)}</span>
            </div>
          ))}
        </Card>
      </div>
      )}

      {modo === "Analítico" && (
      <Card style={{ overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
          <span style={{ fontSize:11, fontWeight:600, color:T.red }}>Relação de contas pagas — {gruposGranatum.length} lançamentos</span>
          <span style={{ fontSize:14, color:T.red, fontFamily:MONO, fontWeight:600 }}>{fmt.brl(total)}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"28px 94px minmax(360px,1.35fr) minmax(380px,1.1fr) 128px", padding:"7px 16px", background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
          {["","Data","Fornecedor / Descrição","Categoria","Valor"].map((h,i) => (
            <div key={i} style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, textAlign:i===4?"right":"left" }}>{h}</div>
          ))}
        </div>
        {paginaGrupos.length === 0 && (
          <div style={{ padding:24, textAlign:"center", color:T.dim, fontSize:12 }}>
            Sem lançamentos no período selecionado
          </div>
        )}
        {paginaGrupos.map(grupo => (
          <GranatumGrupoPagas
            key={grupo.key}
            grupo={grupo}
            expanded={expandidos.has(grupo.key)}
            onToggle={() => toggleExpandido(grupo.key)}
          />
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", borderTop:`1px solid ${T.brd}`, background:T.surf }}>
          <div style={{ fontSize:12, color:T.muted }}>
            {gruposGranatum.length > 0 && `${paginaAtual * POR_PAG + 1}–${Math.min((paginaAtual + 1) * POR_PAG, gruposGranatum.length)} de ${gruposGranatum.length}`}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={paginaAtual === 0}
              style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaAtual === 0 ? T.dim : T.muted, fontSize:11, cursor:"pointer" }}>
              {"< Anterior"}
            </button>
            <span style={{ fontSize:11, color:T.muted, alignSelf:"center" }}>
              Página {paginaAtual + 1} de {totalPaginas}
            </span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaAtual >= totalPaginas - 1}
              style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:paginaAtual >= totalPaginas - 1 ? T.dim : T.muted, fontSize:11, cursor:"pointer" }}>
              {"Próxima >"}
            </button>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
