import { memo, useDeferredValue, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from "recharts";
import { useSheets } from "../../hooks/useSheets";
import { buildCancelamentos } from "../../utils/operationalData";
import { T, CA, MONO } from "../../theme";
import { Card, Kpi, Sec, Table, TipBRL, PeriodBtn } from "../../Ui";
import { SimpleBar, LoadingState } from "./Shared";
import { money, AX, GRD } from "./sharedPrimitives";
import ViewModeToggle from "../../components/ViewModeToggle";
import ExecutiveAlerts from "../../components/ExecutiveAlerts";

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusCorCancelamento(status) {
  const s = String(status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (/CONCLU|APROVADO|FINALIZ|PAGO/.test(s)) return T.grn;
  if (/ATRASADO|VENCIDO|ATRASO/.test(s))       return T.red;
  if (/ANALISE|ANDAMENTO|PROCESSANDO/.test(s))  return T.purp;
  if (/PENDENTE|AGUARDANDO|SOLICITADO|ABERTO/.test(s)) return T.amb;
  if (/ARQUIVADO|CANCELADO|RECUSADO/.test(s))   return T.muted;
  return T.sub;
}
const StatusBadge = ({ status }) => {
  const cor = statusCorCancelamento(status);
  return (
    <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:600,
      background:`${cor}22`, color:cor, border:`1px solid ${cor}44`, whiteSpace:"nowrap" }}>
      {status || "-"}
    </span>
  );
};

// Custom XAxis tick para gráfico de cursos — mostra label só nos 3 primeiros
function TickCursoTop3({ x, y, payload, index, topN = 3 }) {
  if ((index ?? 999) >= topN) return null;
  const label = String(payload?.value || "");
  return (
    <text x={x} y={y + 10} textAnchor="middle" fill={CA.tick} fontSize={8} fontFamily={MONO}>
      {label.length > 13 ? label.slice(0, 12) + "…" : label}
    </text>
  );
}

const NOMES_MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ANO_MINIMO_CANCELAMENTOS = 2024;
const TABLE_INITIAL_LIMIT = 180;

const periodoSortValue = periodo => {
  const [mes, ano] = String(periodo || "").split("/").map(Number);
  return (ano || 0) * 100 + (mes || 0);
};

const anoCancelamentoValido = ano => {
  const n = Number(ano);
  return Number.isFinite(n) && n >= ANO_MINIMO_CANCELAMENTOS;
};

const periodoLabel = periodo => {
  const [mes, ano] = String(periodo || "").split("/");
  const nomeMes = NOMES_MESES[(Number(mes) || 1) - 1] || mes;
  return `${nomeMes}/${String(ano || "").slice(-2)}`;
};

// ─── CANCELAMENTOS VIEW ───────────────────────────────────────────────────────
const CancelamentosView = memo(function CancelamentosView({ data }) {
  const [anoFiltro,     setAnoFiltro]     = useState(String(new Date().getFullYear()));
  const [mesFiltro,     setMesFiltro]     = useState(null);
  const [vendasAgrup,   setVendasAgrup]   = useState("competencia");
  const [cursosMetrica, setCursosMetrica] = useState("qtd");
  const [mostrarTodos,  setMostrarTodos]  = useState(false);
  const [buscaCancel,   setBuscaCancel]   = useState("");
  const [limiteTabela,  setLimiteTabela]  = useState(TABLE_INITIAL_LIMIT);
  const [modo,          setModo]          = useState("Executivo");
  const buscaDeferred = useDeferredValue(buscaCancel);
  const resetTabela = () => setLimiteTabela(TABLE_INITIAL_LIMIT);

  const anosValidos = useMemo(() =>
    (data.anos || []).filter(anoCancelamentoValido),
    [data.anos]
  );

  // Períodos do mês disponíveis para o ano selecionado
  const mesesDoAno = useMemo(() => {
    if (!anoFiltro) return [];
    const fontePeriodos = (data.todosPeriodos || data.periodos || []);
    return fontePeriodos
      .filter(p => p.endsWith(`/${anoFiltro}`) && anoCancelamentoValido(p.slice(-4)))
      .sort((a, b) => periodoSortValue(a) - periodoSortValue(b));
  }, [anoFiltro, data.todosPeriodos, data.periodos]);

  // Ao trocar o ano, limpar mês
  const selecionarAno = (ano) => { setAnoFiltro(ano); setMesFiltro(null); resetTabela(); };

  // Período efetivo: se mês selecionado → usa mês; se só ano → usa todos do ano
  const anoFiltroAtivo = anoFiltro;

  const anoAtualStr = String(new Date().getFullYear());

  const fd = useMemo(() => {
    const todasPeriodo = (data.todasEnriched || []).filter(r => {
      if (anoFiltroAtivo && !r.periodo?.endsWith(`/${anoFiltroAtivo}`)) return false;
      if (mesFiltro && r.periodo !== mesFiltro) return false;
      return true;
    });

    const sourceRaw = mostrarTodos ? todasPeriodo : (data.abertasRaw || []);
    let rows = sourceRaw;
    if (anoFiltroAtivo) rows = rows.filter(r => r.periodo?.endsWith(`/${anoFiltroAtivo}`));
    if (mesFiltro)      rows = rows.filter(r => r.periodo === mesFiltro);
    const isFiltered = !!(anoFiltroAtivo || mesFiltro || mostrarTodos);
    if (!isFiltered) return data;
    const aging = { "0-7":0, "8-15":0, "16-30":0, "31-45":0, "45+":0 };
    const agingV = { "0-7":0, "8-15":0, "16-30":0, "31-45":0, "45+":0 };
    let valorAberto=0, pix7=0, estorno3145=0, estorno45=0, emAtraso=0;
    const cursosMap={}, cursosValorMap={};
    const bkt = d => d<=7?"0-7":d<=15?"8-15":d<=30?"16-30":d<=45?"31-45":"45+";
    rows.forEach(r => {
      const b = bkt(r.dias||0);
      aging[b]+=1; agingV[b]+=(r.valor||0); valorAberto+=(r.valor||0);
      if (r.isPix && (r.dias||0)>7) pix7+=1;
      if (!r.isPix && (r.dias||0)>30 && (r.dias||0)<=45) estorno3145+=1;
      if (!r.isPix && (r.dias||0)>45) estorno45+=1;
      if ((r.diasEmAtraso||0)>0) emAtraso+=1;
      const c = r.curso||"Sem curso";
      cursosMap[c]=(cursosMap[c]||0)+1;
      cursosValorMap[c]=(cursosValorMap[c]||0)+(r.valor||0);
    });
    const cursosChart = Object.entries(cursosMap)
      .map(([label,qtd]) => ({ label, qtd, valor: cursosValorMap[label]||0 }))
      .sort((a,b) => b.qtd-a.qtd).slice(0,20);
    return {
      ...data,
      abertas: rows.length, emAtraso, valorAberto, pix7, estorno3145, estorno45,
      totalSolicitacoes: todasPeriodo.length,
      valorSolicitacoes: todasPeriodo.reduce((s, r) => s + (r.valor || 0), 0),
      aging: Object.entries(aging).map(([label,qtd]) => ({ label, qtd, valor:agingV[label] })),
      cursosChart, abertasRaw: rows,
    };
  }, [data, anoFiltroAtivo, mesFiltro, mostrarTodos]);

  const cursosGrafico = useMemo(() =>
    [...(fd.cursosChart||[])].sort((a,b)=>b[cursosMetrica]-a[cursosMetrica]).slice(0,20),
    [fd.cursosChart, cursosMetrica]
  );

  const sortedAbertas = useMemo(() => {
    const t = buscaDeferred.trim().toLowerCase();
    const all = [...(fd.abertasRaw||[])].sort((a,b)=>(b.dias||0)-(a.dias||0));
    if (!t) return all;
    return all.filter(r =>
      (r.aluno||"").toLowerCase().includes(t) ||
      (r.email||"").toLowerCase().includes(t) ||
      (r.pedido||"").toLowerCase().includes(t) ||
      (r.curso||"").toLowerCase().includes(t)
    );
  }, [fd.abertasRaw, buscaDeferred]);

  const visibleAbertas = useMemo(
    () => sortedAbertas.slice(0, limiteTabela),
    [sortedAbertas, limiteTabela]
  );
  const hasHiddenRows = visibleAbertas.length < sortedAbertas.length;

  // Série de vendas filtrada pelo ano (gráficos de tendência)
  const vendasSerieBase = useMemo(() => {
    const fonte = vendasAgrup === "competencia"
      ? (data.vendasPorCompetencia || [])
      : vendasAgrup === "estorno"
        ? (data.vendasPorEstorno || [])
      : vendasAgrup === "compra"
        ? (data.vendasPorCompra || [])
        : (data.vendasSerie || []);
    if (!anoFiltro) return fonte;
    return fonte.filter(r => r.periodo?.endsWith(`/${anoFiltro}`));
  }, [data.vendasSerie, data.vendasPorCompra, data.vendasPorEstorno, data.vendasPorCompetencia, vendasAgrup, anoFiltro]);

  const churnSerieBase = useMemo(() => {
    const fonte = data.vendasSerie||[];
    if (!anoFiltro) return fonte;
    return fonte.filter(r => r.periodo?.endsWith(`/${anoFiltro}`));
  }, [data.vendasSerie, anoFiltro]);

  // Último período do ano selecionado (para os KPIs de "último período")
  const vendaDoAno = useMemo(() => {
    const fonte = data.vendasSerie||[];
    const filtrada = anoFiltro ? fonte.filter(r => r.periodo?.endsWith(`/${anoFiltro}`)) : fonte;
    if (mesFiltro) return filtrada.find(r => r.periodo === mesFiltro) || {};
    return filtrada[filtrada.length - 1] || data.vendaAtual || {};
  }, [data.vendasSerie, data.vendaAtual, anoFiltro, mesFiltro]);

  const churnAtual  = vendaDoAno?.pct || 0;
  const churnSerie  = churnSerieBase.map(r => ({ label:r.periodo, value:r.pct||0 }));
  const vendasSerie = vendasSerieBase.map(r => ({ label:r.periodo, value:r.cancelamentos }));

  const tituloAberto = mostrarTodos ? "Todos" : "Em aberto";
  const tituloFiltro = [anoFiltro, mesFiltro].filter(Boolean).join(" › ") || "";
  const alertasExecutivos = [
    fd.emAtraso > 0 && {
      status:"atraso",
      title:"Solicitações em atraso",
      value:String(fd.emAtraso),
      text:`Priorizar casos do recorte ${tituloFiltro || "atual"}.`,
      color:T.red,
    },
    (fd.pix7 > 0 || fd.estorno45 > 0) && {
      status:"prazo",
      title:"Pontos fora do SLA",
      value:`${fd.pix7 + fd.estorno45}`,
      text:`PIX 7+ dias: ${fd.pix7}; estorno 45+ dias: ${fd.estorno45}.`,
      color:T.amb,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Filtros: ano → mês + toggle Em aberto/Todos */}
      <Card style={{ padding:"9px 13px" }}>
        {/* Linha 1: seletor de ano */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center", marginBottom: anoFiltro ? 8 : 0 }}>
          <ViewModeToggle value={modo} onChange={setModo} />
          <div style={{ width:1, height:18, background:T.brd, margin:"0 6px" }} />
          <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", marginRight:4 }}>Ano</span>
          <PeriodBtn label="Todos" ativo={!anoFiltro} onClick={() => selecionarAno(null)} />
          {anosValidos.map(ano => (
            <PeriodBtn
              key={ano}
              label={ano === anoAtualStr ? `${ano} (YTD)` : ano}
              ativo={anoFiltro===ano}
              onClick={() => selecionarAno(anoFiltro===ano ? null : ano)}
            />
          ))}
          <div style={{ width:1, height:14, background:T.brd, margin:"0 6px" }} />
          {[{v:false,label:"Em aberto"},{v:true,label:"Todos"}].map(o=>(
            <button key={String(o.v)} onClick={()=>{ setMostrarTodos(o.v); resetTabela(); }}
              style={{ padding:"3px 9px", borderRadius:4, border:`1px solid ${mostrarTodos===o.v?T.blue:T.brd}`,
                background:mostrarTodos===o.v?"rgba(245,158,11,0.13)":"transparent",
                color:mostrarTodos===o.v?T.blue2:T.muted, fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {o.label}
            </button>
          ))}
        </div>
        {/* Linha 2: sub-filtro de mês (apenas quando um ano está selecionado) */}
        {anoFiltro && mesesDoAno.length > 0 && (
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", marginRight:4 }}>Mês</span>
            <PeriodBtn label="Todos" ativo={!mesFiltro} onClick={() => setMesFiltro(null)} />
            {mesesDoAno.map(p => (
            <PeriodBtn key={p} label={periodoLabel(p)} ativo={mesFiltro===p} onClick={() => { setMesFiltro(mesFiltro===p?null:p); resetTabela(); }} />
            ))}
          </div>
        )}
      </Card>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {/* KPIs linha 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, minmax(0,1fr))", gap:12 }}>
        <Kpi label="Total solicitações" value={fd.totalSolicitacoes ?? data.total} sub={tituloFiltro || "a partir de 2024"} />
        <Kpi label={tituloAberto} value={fd.abertas} sub={mostrarTodos?"todas as solicitações":"excl. concluídos/arquivados"} />
        <Kpi label="Em atraso" value={fd.emAtraso} cor={fd.emAtraso?T.amb:T.grn} urgent={fd.emAtraso>0} />
        <Kpi label="Valor total" value={money(fd.valorAberto)} cor={T.red} />
        <Kpi label="% Vendas Canceladas" value={`${(churnAtual*100||0).toFixed(1)}%`} sub={vendaDoAno?.periodo||"último período"} cor={T.red} />
      </div>

      {/* KPIs linha 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:12 }}>
        <Kpi label="PIX 7+ dias" value={fd.pix7} cor={fd.pix7?T.red:T.grn} urgent={fd.pix7>0} />
        <Kpi label="Estorno 31-45 dias" value={fd.estorno3145} cor={T.amb} />
        <Kpi label="Estorno 45+ dias" value={fd.estorno45} cor={fd.estorno45?T.red:T.grn} urgent={fd.estorno45>0} />
        <Kpi label="Vendas canceladas" value={money(vendaDoAno?.cancelamentos||0)} sub={vendaDoAno?.periodo||"último período"} cor={T.red} />
      </div>

      {/* Aging + Vendas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Sec title="Aging de solicitações abertas">
          <SimpleBar data={fd.aging} dataKey="qtd"
            color={[T.grn,T.blue,T.amb,"#f97316",T.red]} formatter={v=>String(v)} />
        </Sec>
        <Sec
          title="Vendas canceladas — últimos períodos"
          badge={
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              {[
                { v:"competencia",label:"Competência"},
                { v:"solicitacao",label:"Data Solicit."},
                { v:"estorno",label:"Data Estorno"},
                { v:"compra",label:"Data Compra"},
              ].map(o=>(
                <button key={o.v} onClick={()=>setVendasAgrup(o.v)}
                  style={{ padding:"2px 7px", borderRadius:4, border:`1px solid ${vendasAgrup===o.v?T.blue:T.brd}`,
                    background:vendasAgrup===o.v?"rgba(245,158,11,0.13)":"transparent",
                    color:vendasAgrup===o.v?T.blue2:T.muted, fontSize:9, fontWeight:600, cursor:"pointer" }}>
                  {o.label}
                </button>
              ))}
            </div>
          }
        >
          <SimpleBar data={vendasSerie} color={T.red} xTickFormatter={periodoLabel} />
        </Sec>
      </div>

      {/* % Vendas Canceladas — evolução */}
      <Sec title="Evolução % Vendas Canceladas (cancelamentos / faturamento)">
        <Card style={{ padding:"15px 16px" }}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={churnSerie} margin={{ top:8, right:8, bottom:0, left:0 }}>
              {GRD}
              <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} tickFormatter={periodoLabel} />
              <YAxis tickFormatter={v=>`${(v*100).toFixed(1)}%`} tick={AX} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<TipBRL formatter={v=>`${(v*100||0).toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="value" name="% Vendas Canceladas" stroke={T.red}
                strokeWidth={2} dot={{ r:3, fill:T.red }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Sec>

      {/* Cancelamentos por produto — top-3 com labels, demais só tooltip */}
      <Sec
        title={`Cancelamentos ${tituloAberto.toLowerCase()} por produto/pacote`}
        badge={
          <div style={{ display:"flex", gap:4 }}>
            {[{v:"qtd",label:"Qtd"},{v:"valor",label:"R$"}].map(o=>(
              <button key={o.v} onClick={()=>setCursosMetrica(o.v)}
                style={{ padding:"2px 7px", borderRadius:4, border:`1px solid ${cursosMetrica===o.v?T.blue:T.brd}`,
                  background:cursosMetrica===o.v?"rgba(245,158,11,0.13)":"transparent",
                  color:cursosMetrica===o.v?T.blue2:T.muted, fontSize:9, fontWeight:600, cursor:"pointer" }}>
                {o.label}
              </button>
            ))}
          </div>
        }
      >
        <Card style={{ padding:"15px 16px" }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cursosGrafico} margin={{ top:8, right:4, bottom:16, left:0 }}>
              {GRD}
              <XAxis dataKey="label" tick={<TickCursoTop3 topN={3} />} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={cursosMetrica==="valor"?money:v=>String(v)} tick={AX} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<TipBRL formatter={cursosMetrica==="valor"?money:v=>String(v)} />} />
              <Bar dataKey={cursosMetrica} radius={[3,3,0,0]} maxBarSize={34}>
                {cursosGrafico.map((_, i) => <Cell key={i} fill={T.purp} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Sec>

      {/* Tabela auxiliar completa de produtos */}
      {modo === "Analítico" && (fd.cursosChart||[]).length > 0 && (
        <Sec title={`Produtos ${tituloAberto.toLowerCase()} (${fd.cursosChart.length})`}>
          <Table
            compact
            headers={["Produto/Pacote",{label:"Qtd",right:true,mono:true},{label:"Valor total",right:true,mono:true}]}
            rows={[...(fd.cursosChart||[])].sort((a,b)=>b[cursosMetrica]-a[cursosMetrica]).map(r=>[r.label,String(r.qtd),r.valor])}
            footer={["Total",String((fd.cursosChart||[]).reduce((s,r)=>s+r.qtd,0)),(fd.cursosChart||[]).reduce((s,r)=>s+r.valor,0)]}
            scrollMax={320}
          />
        </Sec>
      )}

      {/* Tabela de solicitações */}
      {modo === "Analítico" && (
      <Sec title={`Solicitações — ${tituloAberto}${tituloFiltro?` — ${tituloFiltro}`:""} (${sortedAbertas.length}/${fd.abertas})`}>
        <input
          type="search"
          placeholder="Buscar por cliente, e-mail, pedido ou produto…"
          value={buscaCancel}
          onChange={e => { setBuscaCancel(e.target.value); resetTabela(); }}
          style={{
            width:"100%", boxSizing:"border-box",
            padding:"6px 10px", marginBottom:8,
            background:T.card, border:`1px solid ${T.brd}`,
            borderRadius:6, color:T.text, fontSize:12, outline:"none",
          }}
        />
        <Table
          compact
          headers={[
            "Data Solicit.",
            "Cliente",
            "E-mail",
            "Nº Pedido",
            "Produto/Pacote",
            "Data Compra",
            "Tipo",
            {label:"Valor",right:true,mono:true},
            {label:"Dias",right:true,mono:true},
            {label:"Atraso",right:true,mono:true},
            {label:"Status",render:(v)=><StatusBadge status={v} />},
          ]}
          rows={visibleAbertas.map(r=>[
            r.dataSolicitacao||"-",
            r.aluno||"-",
            r.email||"-",
            r.pedido||"-",
            r.curso||"-",
            r.dataCompra||"-",
            r.tipo||"-",
            r.valor||0,
            String(r.dias||0),
            String(r.diasEmAtraso||0),
            r.status||"-",
          ])}
          footer={sortedAbertas.length > 0 ? [
            "Total", "", "", "", "", "", "",
            sortedAbertas.reduce((s,r)=>s+(r.valor||0), 0),
            "", "", "",
          ] : undefined}
          emptyMsg="Nenhuma solicitação encontrada"
          scrollMax={520}
        />
        {hasHiddenRows && (
          <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
            <button
              type="button"
              onClick={() => setLimiteTabela(v => Math.min(v + 300, sortedAbertas.length))}
              style={{
                padding:"6px 12px",
                borderRadius:6,
                border:`1px solid ${T.brd2}`,
                background:T.surf,
                color:T.blue2,
                fontSize:11,
                fontWeight:600,
                fontFamily:"inherit",
              }}
            >
              Mostrar mais {Math.min(300, sortedAbertas.length - visibleAbertas.length)} de {sortedAbertas.length}
            </button>
          </div>
        )}
      </Sec>
      )}
    </div>
  );
});

export default function CancelamentosPage() {
  const sheets = useSheets(["cancelamentos_solicitacoes", "cancelamentos_vendas", "cancelamentos_competencia"]);
  const data = useMemo(() => buildCancelamentos(
    sheets.cancelamentos_solicitacoes?.data || [],
    sheets.cancelamentos_vendas?.data || [],
    sheets.cancelamentos_competencia?.data || []
  ), [
    sheets.cancelamentos_solicitacoes?.data,
    sheets.cancelamentos_vendas?.data,
    sheets.cancelamentos_competencia?.data,
  ]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <LoadingState sheets={sheets} />
      <CancelamentosView data={data} />
    </div>
  );
}
