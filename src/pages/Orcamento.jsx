import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Cell, Legend, Tooltip, LabelList,
} from "recharts";
import { useSheet, fmt } from "../hooks/useSheets";
import { T, CA, MONO } from "../theme";
import { Card, Kpi, Sec, PeriodSelector, PeriodBtn, TabBar, TipBRL, Table, LiveBadge } from "../Ui";
import ViewModeToggle from "../components/ViewModeToggle";
import ExecutiveAlerts from "../components/ExecutiveAlerts";

const MESES  = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const TRIMS  = { JAN:"T1",FEV:"T1",MAR:"T1",ABR:"T2",MAI:"T2",JUN:"T2",JUL:"T3",AGO:"T3",SET:"T3",OUT:"T4",NOV:"T4",DEZ:"T4" };
const VIEWS  = ["Ano/Mês","Trimestral","Por Área","Por Linha"];
const ACORES = ["#f59e0b","#22c55e","#2fb7c6","#ffc247","#0891b2","#ef4444","#e879f9","#10b981"];

function parseBR(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  const s = raw.toString().trim().replace(/R\$\s*/g,"").replace(/\s/g,"");
  if (!s) return 0;
  const neg = s.match(/^\(([0-9.,]+)\)$/);
  if (neg) return -(parseFloat(neg[1].replace(/\./g,"").replace(",",".")) || 0);
  if (s.includes(",")) return parseFloat(s.replace(/\./g,"").replace(",",".")) || 0;
  return parseFloat(s) || 0;
}

function parseOrc(data) {
  if (!data?.length) return [];
  return data.map(r => ({
    mes:    (r["MES"]      ?? Object.values(r)[1] ?? "").toString().trim(),
    trim:   (r["TRIMESTRE"]?? Object.values(r)[2] ?? "").toString().trim(),
    area:   (r["AREA"]     ?? Object.values(r)[5] ?? "").toString().trim().toUpperCase(),
    linha:  (r["LINHA_DE_RECEITA/CUSTO"] ?? Object.values(r)[6] ?? "").toString().trim(),
    cenario:(r["CENARIO"]  ?? Object.values(r)[7] ?? "").toString().trim(),
    valor:  Math.abs(parseBR(r["VALOR"] ?? Object.values(r)[8] ?? 0)),
    isRec:  (r["AREA"]     ?? Object.values(r)[5] ?? "").toString().trim().toUpperCase() === "FATURAMENTO",
  })).filter(r => r.mes && (r.cenario === "REALIZADO" || r.cenario === "ORCADO"));
}

function soma(rows, f = {}) {
  return rows.filter(r =>
    (!f.cenario  || r.cenario === f.cenario) &&
    (!f.mes      || r.mes     === f.mes) &&
    (!f.trim     || r.trim    === f.trim) &&
    (!f.area     || r.area    === f.area) &&
    (!f.linha    || r.linha   === f.linha) &&
    (!f.excArea  || r.area    !== f.excArea) &&
    (f.soRec === undefined || r.isRec === f.soRec)
  ).reduce((a,r) => a + r.valor, 0);
}

const pct  = (real, orc) => orc > 0 ? (real / orc) * 100 : 0;
const money = fmt.brl0;

// - Shared chart props ---------------------------------------------------------
const AX  = { fill:CA.tick, fontSize:9, fontFamily:MONO };
const GRD = <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />;

// - Progress bar row -----------------------------------------------------------
const BarRow = ({ label, orc, real, cor }) => {
  const p = pct(real, orc);
  const w = Math.min(p, 100);
  return (
    <div style={{ marginBottom:13 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:12, color:T.sub }}>{label}</span>
        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          <span style={{ fontSize:11, fontFamily:MONO, color:T.muted }}>{money(orc)}</span>
          <span style={{ fontSize:12, fontFamily:MONO, color:cor, fontWeight:600 }}>{money(real)}</span>
          <span style={{ fontSize:11, fontFamily:MONO, color:cor, minWidth:42, textAlign:"right" }}>{p.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ height:5, background:T.brd, borderRadius:3 }}>
        <div style={{ height:"100%", width:`${w}%`, background:cor, borderRadius:3, transition:"width 0.4s" }} />
      </div>
    </div>
  );
};

// - Execution table ------------------------------------------------------------
const TabelaExec = ({ dados, colunaLabel="Item", onClickRow }) => {
  const total = { orc: dados.reduce((a,d)=>a+d.orc,0), real: dados.reduce((a,d)=>a+d.real,0) };
  const totalPct = pct(total.real, total.orc);
  const totalDelta = total.real - total.orc;
  const totalIsRec = dados.every(d => d.isRec);
  const totalDeltaCor = totalIsRec
    ? (totalDelta >= 0 ? T.grn : T.red)
    : (totalDelta <= 0 ? T.grn : T.red);
  return (
    <Card>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
            {[colunaLabel,"Orçado","Realizado","Δ","% Exec",""].map((h,i) => (
              <th key={i} style={{ textAlign:i===0?"left":"right", padding:"7px 11px", fontSize:9, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((d,i) => {
            const p2 = pct(d.real, d.orc);
            const delta = d.real - d.orc;
            const cor = d.isRec
              ? (p2 >= 80 ? T.grn : T.red)
              : (p2 <= 100 ? T.grn : T.red);
            const deltaCor = d.isRec
              ? (delta >= 0 ? T.grn : T.red)
              : (delta <= 0 ? T.grn : T.red);
            return (
              <tr key={i} style={{ borderBottom:`1px solid ${T.brd}`, cursor:onClickRow?"pointer":"default" }}
                onClick={()=>onClickRow && onClickRow(d)}
                onMouseEnter={e=>e.currentTarget.style.background=T.mode === "light" ? "rgba(23,25,31,0.025)" : "rgba(255,255,255,0.025)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"7px 11px", fontSize:12, color:T.sub }}>
                  {d.cor && <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:d.cor, marginRight:8, verticalAlign:"middle" }} />}
                  {d.label}
                </td>
                <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, color:T.dim, textAlign:"right" }}>{money(d.orc)}</td>
                <td style={{ padding:"7px 11px", fontSize:12, fontFamily:MONO, color:d.isRec?T.grn:T.red, textAlign:"right" }}>{money(d.real)}</td>
                <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, color:deltaCor, textAlign:"right" }}>{delta >= 0 ? "+" : ""}{money(delta)}</td>
                <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, color:cor, textAlign:"right" }}>{p2.toFixed(1)}%</td>
                <td style={{ padding:"7px 14px 7px 8px", width:140 }}>
                  <div style={{ height:4, background:T.brd, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${Math.min(p2,100)}%`, background:cor, borderRadius:2 }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {dados.length > 1 && (
          <tfoot>
            <tr style={{ borderTop:`1px solid ${T.brd2}`, background:T.surf }}>
              <td style={{ padding:"7px 11px", fontSize:11, fontWeight:600, color:T.sub }}>TOTAL</td>
              <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, color:T.dim, textAlign:"right" }}>{money(total.orc)}</td>
              <td style={{ padding:"7px 11px", fontSize:12, fontFamily:MONO, fontWeight:600, color:totalIsRec?T.grn:T.red, textAlign:"right" }}>{money(total.real)}</td>
              <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, fontWeight:600, color:totalDeltaCor, textAlign:"right" }}>{totalDelta >= 0 ? "+" : ""}{money(totalDelta)}</td>
              <td style={{ padding:"7px 11px", fontSize:11, fontFamily:MONO, color:totalIsRec ? T.corRec(totalPct) : T.corDesp(totalPct), textAlign:"right" }}>{totalPct.toFixed(1)}%</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
};

// - VIEWS ---------------------------------------------------------------------

function ViewAnoMes({ rows, mesesAtivos, mesesRealizados }) {
  const dadosMes = mesesAtivos.map(mes => ({
    mes,
    recOrc:   soma(rows,{cenario:"ORCADO",   mes,soRec:true}),
    recReal:  soma(rows,{cenario:"REALIZADO",mes,soRec:true}),
    despOrc:  soma(rows,{cenario:"ORCADO",   mes,excArea:"FATURAMENTO"}),
    despReal: soma(rows,{cenario:"REALIZADO",mes,excArea:"FATURAMENTO"}),
    real: mesesRealizados.includes(mes),
  }));

  const recVsDesp = mesesAtivos.filter(m => mesesRealizados.includes(m)).map(m => {
    const d = dadosMes.find(x=>x.mes===m);
    return { mes:m, Receita:d?.recReal||0, Despesa:d?.despReal||0 };
  });

  const tDesp = mesesAtivos.map(m => {
    const d = dadosMes.find(x=>x.mes===m);
    return { label:m, orc:d?.despOrc||0, real:d?.despReal||0, isRec:false };
  });
  const tRec = mesesAtivos.map(m => {
    const d = dadosMes.find(x=>x.mes===m);
    return { label:m, orc:d?.recOrc||0, real:d?.recReal||0, isRec:true };
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* RECEITA primeiro */}
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Receita - Orçado vs Realizado</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dadosMes} barGap={2} margin={{top:4,right:4,bottom:0,left:0}}>
            {GRD}
            <XAxis dataKey="mes" tick={AX} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={74} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}
              formatter={v => <span style={{ color:v==="Realizado" ? T.grn : T.sub }}>{v}</span>} />
            <Bar dataKey="recOrc"  name="Orçado"    fill={T.orc} radius={[3,3,0,0]} maxBarSize={20} />
            <Bar dataKey="recReal" name="Realizado"  radius={[3,3,0,0]} maxBarSize={20}>
              {dadosMes.map((m,i) => <Cell key={i} fill={!m.real ? T.brd : T.grn} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* DESPESA segundo */}
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Despesas - Orçado vs Realizado</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dadosMes} barGap={2} margin={{top:4,right:4,bottom:0,left:0}}>
            {GRD}
            <XAxis dataKey="mes" tick={AX} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={74} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}
              formatter={v => <span style={{ color:v==="Realizado" ? T.red : T.sub }}>{v}</span>} />
            <Bar dataKey="despOrc"  name="Orçado"    fill={T.orc} radius={[3,3,0,0]} maxBarSize={20} />
            <Bar dataKey="despReal" name="Realizado"  radius={[3,3,0,0]} maxBarSize={20}>
              {dadosMes.map((m,i) => <Cell key={i} fill={!m.real ? T.brd : T.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Receita vs Despesa */}
      {recVsDesp.length > 0 && (
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Receita vs Despesa - Realizado</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={recVsDesp} barGap={3} margin={{top:4,right:4,bottom:0,left:0}}>
              {GRD}
              <XAxis dataKey="mes" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={74} />
              <Tooltip content={<TipBRL formatter={money} />} />
              <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}
                formatter={v => <span style={{ color: v==="Receita" ? T.grn : T.red }}>{v}</span>} />
              <Bar dataKey="Receita" fill={T.grn} radius={[3,3,0,0]} maxBarSize={22} opacity={0.9} />
              <Bar dataKey="Despesa" fill={T.red}  radius={[3,3,0,0]} maxBarSize={22} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Sec title="Tabela - Receitas"><TabelaExec dados={tRec} colunaLabel="Mês" /></Sec>
        <Sec title="Tabela - Despesas"><TabelaExec dados={tDesp} colunaLabel="Mês" /></Sec>
      </div>
    </div>
  );
}

function ViewTrimestral({ rows }) {
  const trims = [...new Set(rows.map(r => r.trim).filter(Boolean))];
  const d = trims.map(t => ({
    label:t,
    recOrc:  soma(rows,{cenario:"ORCADO",   trim:t,soRec:true}),
    recReal: soma(rows,{cenario:"REALIZADO",trim:t,soRec:true}),
    despOrc: soma(rows,{cenario:"ORCADO",   trim:t,excArea:"FATURAMENTO"}),
    despReal:soma(rows,{cenario:"REALIZADO",trim:t,excArea:"FATURAMENTO"}),
  }));

  const mkChart = (orc, real, titulo, isRec) => (
    <Card style={{ padding:"14px 16px" }}>
      <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:10 }}>{titulo}</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={d} barGap={4} margin={{top:4,right:4,bottom:0,left:0}}>
          {GRD}
          <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={74} />
          <Tooltip content={<TipBRL formatter={money} />} />
          <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}
            formatter={v => <span style={{ color:v==="Realizado" ? (isRec ? T.grn : T.red) : T.sub }}>{v}</span>} />
          <Bar dataKey={orc}  name="Orçado"    fill={T.orc} radius={[3,3,0,0]} maxBarSize={28} />
          <Bar dataKey={real} name="Realizado" radius={[3,3,0,0]} maxBarSize={28}>
            {d.map((_,i) => <Cell key={i} fill={isRec ? T.grn : T.red} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {mkChart("recOrc","recReal","Receita por Trimestre",true)}
        {mkChart("despOrc","despReal","Despesas por Trimestre",false)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Sec title="Receita"><TabelaExec dados={d.map(x=>({label:x.label,orc:x.recOrc,real:x.recReal,isRec:true}))} colunaLabel="Trimestre" /></Sec>
        <Sec title="Despesas"><TabelaExec dados={d.map(x=>({label:x.label,orc:x.despOrc,real:x.despReal,isRec:false}))} colunaLabel="Trimestre" /></Sec>
      </div>
    </div>
  );
}

function ViewArea({ rows, onDrill }) {
  const areas = [...new Set(rows.filter(r=>!r.isRec).map(r=>r.area))];
  const dados = areas.map((area,i) => ({
    label: area,
    orc:   soma(rows,{cenario:"ORCADO",   excArea:"FATURAMENTO",area}),
    real:  soma(rows,{cenario:"REALIZADO",excArea:"FATURAMENTO",area}),
    isRec: false,
    cor:   ACORES[i%ACORES.length],
  })).map(d => ({ ...d, realPct: d.orc > 0 ? (d.real / d.orc) * 100 : 0 }))
    .filter(d=>d.orc>0||d.real>0).sort((a,b)=>b.real-a.real);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Orçado vs Realizado por Área</div>
        <ResponsiveContainer width="100%" height={Math.max(dados.length*28+50, 180)}>
          <BarChart data={dados} layout="vertical" margin={{top:0,right:60,bottom:0,left:110}}>
            {GRD}
            <XAxis type="number" tickFormatter={money} tick={AX} axisLine={false} tickLine={false} />
            <YAxis dataKey="label" type="category" tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}
              formatter={v => <span style={{ color:T.sub }}>{v}</span>} />
            <Bar dataKey="orc"  name="Orçado"    fill={T.orc} radius={[0,3,3,0]} maxBarSize={10} />
            <Bar dataKey="real" name="Realizado" fill={T.red} radius={[0,3,3,0]} maxBarSize={10}>
              <LabelList dataKey="realPct" position="right" fill={T.sub} fontSize={9} fontFamily={MONO} formatter={v => `${v.toFixed(0)}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Sec title="Clique em uma área para ver detalhamento por linha">
        <TabelaExec dados={dados} colunaLabel="Área" onClickRow={d=>onDrill(d.label)} />
      </Sec>
    </div>
  );
}

function ViewLinha({ rows, areaFiltro, setAreaFiltro }) {
  const areas = [...new Set(rows.filter(r=>!r.isRec).map(r=>r.area))];
  const area  = areaFiltro || areas[0] || "";
  const linhas= [...new Set(rows.filter(r=>r.area===area).map(r=>r.linha))];
  const dados = linhas.map((linha,i) => ({
    label: linha,
    orc:   soma(rows,{cenario:"ORCADO",   area,linha}),
    real:  soma(rows,{cenario:"REALIZADO",area,linha}),
    isRec: false,
    cor:   ACORES[i%ACORES.length],
  })).map(d => ({ ...d, realPct: d.orc > 0 ? (d.real / d.orc) * 100 : 0 }))
    .filter(d=>d.orc>0||d.real>0).sort((a,b)=>b.real-a.real);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card style={{ padding:"10px 13px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
          <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", letterSpacing:"0", marginRight:4 }}>Área</span>
          {areas.map(a => (
            <PeriodBtn key={a} label={a.length>16?a.slice(0,16)+"...":a} ativo={area===a} onClick={()=>setAreaFiltro(a)} />
          ))}
        </div>
      </Card>
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>{area} - Por Linha de Custo</div>
        <ResponsiveContainer width="100%" height={Math.max(dados.length*26+50,160)}>
          <BarChart data={dados} layout="vertical" margin={{top:0,right:60,bottom:0,left:140}}>
            {GRD}
            <XAxis type="number" tickFormatter={money} tick={AX} axisLine={false} tickLine={false} />
            <YAxis dataKey="label" type="category" tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false} width={140} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Bar dataKey="orc"  name="Orçado"    fill={T.orc} radius={[0,3,3,0]} maxBarSize={8} />
            <Bar dataKey="real" name="Realizado" fill={T.red} radius={[0,3,3,0]} maxBarSize={8}>
              <LabelList dataKey="realPct" position="right" fill={T.sub} fontSize={9} fontFamily={MONO} formatter={v => `${v.toFixed(0)}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <TabelaExec dados={dados} colunaLabel="Linha de Custo" />
    </div>
  );
}

// - MAIN ----------------------------------------------------------------------
export default function Orcamento() {
  const { data: rawData, loading, lastUpdate } = useSheet("orc_base");

  const [view,       setView]       = useState("Ano/Mês");
  const [filtro,     setFiltro]     = useState("YTD");
  const [areaFiltro, setAreaFiltro] = useState("");
  const [modo,       setModo]       = useState("Executivo");

  const rows = useMemo(() => parseOrc(rawData), [rawData]);

  const mesesRealizados = useMemo(() => {
    if (!rows.length) return ["JAN","FEV","MAR","ABR"];
    return MESES.filter(m => soma(rows,{cenario:"REALIZADO",mes:m,excArea:"FATURAMENTO"}) > 0);
  }, [rows]);

  const mesesAtivos = useMemo(() => {
    if (filtro==="YTD") return mesesRealizados;
    if (filtro==="ANO") return MESES;
    if (filtro.startsWith("T")) return MESES.filter(m=>TRIMS[m]===filtro);
    return [filtro];
  }, [filtro, mesesRealizados]);

  const rowsPeriodo = useMemo(() => rows.filter(r => mesesAtivos.includes(r.mes)), [rows, mesesAtivos]);

  const kpis = useMemo(() => {
    const recReal  = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"REALIZADO",mes:m,soRec:true}),0);
    const recOrc   = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"ORCADO",   mes:m,soRec:true}),0);
    const despReal = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"REALIZADO",mes:m,excArea:"FATURAMENTO"}),0);
    const despOrc  = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"ORCADO",   mes:m,excArea:"FATURAMENTO"}),0);
    const pRec  = pct(recReal, recOrc);
    const pDesp = pct(despReal, despOrc);
    const gapOrc  = recOrc  - despOrc;   // GAP orçado
    const gapReal = recReal - despReal;  // GAP realizado
    // Meses restantes: do ano que ainda não são realizados e não são o mês atual
    const mesAtualIdx = new Date().getMonth(); // 0-11
    const mesAtualStr = MESES[mesAtualIdx];
    const mesesRestantes = MESES.filter(m => !mesesRealizados.includes(m) && m !== mesAtualStr);
    const adicional = gapReal < 0 && mesesRestantes.length > 0
      ? Math.abs(gapReal) / mesesRestantes.length
      : 0;
    return { recReal, recOrc, despReal, despOrc, pRec, pDesp, resultado: recReal-despReal, gapOrc, gapReal, adicional, mesesRestantes: mesesRestantes.length };
  }, [rows, mesesAtivos, mesesRealizados]);

  const desvios = useMemo(() => {
    const base = [...new Set(rows.filter(r => !r.isRec).map(r => `${r.area}||${r.linha || "Sem linha"}`))]
      .map(chave => {
        const [area, linha] = chave.split("||");
        const orc = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"ORCADO", mes:m, area, linha}),0);
        const real = mesesAtivos.reduce((a,m)=>a+soma(rows,{cenario:"REALIZADO", mes:m, area, linha}),0);
        const delta = real - orc;
        return { area, linha, orc, real, delta, pct:pct(real, orc) };
      })
      .filter(d => d.orc > 0 || d.real > 0);
    return {
      estouros: base.filter(d => d.delta > 0).sort((a,b) => b.delta - a.delta).slice(0, 6),
      folgas: base.filter(d => d.delta < 0).sort((a,b) => a.delta - b.delta).slice(0, 6),
    };
  }, [rows, mesesAtivos]);

  const handleDrill = (area) => { setAreaFiltro(area); setView("Por Linha"); };
  const principalEstouro = desvios.estouros[0];
  const alertasExecutivos = [
    kpis.pDesp > 100 && {
      status:"despesa",
      title:"Despesa acima do orçamento",
      value:`${kpis.pDesp.toFixed(1)}%`,
      text:`Realizado ${money(kpis.despReal)} contra orçamento de ${money(kpis.despOrc)}.`,
      color:T.red,
    },
    kpis.gapReal < 0 && {
      status:"gap",
      title:"Resultado realizado abaixo de zero",
      value:money(kpis.gapReal),
      text:kpis.adicional > 0 ? `Necessidade estimada: ${money(kpis.adicional)}/mês.` : "Acompanhar recomposição de receita e despesas.",
      color:T.amb,
    },
    principalEstouro && {
      status:"desvio",
      title:"Maior estouro para explicar",
      value:`+${money(principalEstouro.delta)}`,
      text:`${principalEstouro.area} · ${principalEstouro.linha}`,
      color:T.red,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:48 }}>

      {lastUpdate && <LiveBadge time={lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} />}

      <PeriodSelector filtro={filtro} setFiltro={setFiltro} mesesRealizados={mesesRealizados} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <ViewModeToggle value={modo} onChange={setModo} />
        <div style={{ fontSize:11, color:T.muted, fontFamily:MONO }}>{filtro} · {mesesAtivos.join(", ")}</div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
        <Kpi label="Receita Realizada"   value={money(kpis.recReal)}     cor={T.grn} accent={T.grn} sub={"Orç: " + money(kpis.recOrc)} delta={kpis.recReal-kpis.recOrc} deltaFormatter={money} />
        <Kpi label="% Receita do Orç."   value={kpis.pRec.toFixed(1)+"%"} cor={T.corRec(kpis.pRec)} accent={T.corRec(kpis.pRec)} />
        <Kpi label="Despesa Realizada"   value={money(kpis.despReal)}    cor={T.red} accent={T.red} sub={"Orç: " + money(kpis.despOrc)} delta={kpis.despReal-kpis.despOrc} deltaGood="down" deltaFormatter={money} />
        <Kpi label="% Despesa do Orç."   value={kpis.pDesp.toFixed(1)+"%"} cor={T.corDesp(kpis.pDesp)} accent={T.corDesp(kpis.pDesp)} />
        <Kpi label="Resultado (Rec−Desp)" value={money(kpis.resultado)} cor={T.corV(kpis.resultado)} accent={T.corV(kpis.resultado)} />
        <Kpi label="GAP Orçado (Rec−Desp)"   value={money(kpis.gapOrc)}  cor={T.corV(kpis.gapOrc)}  accent={T.corV(kpis.gapOrc)}  sub="receita orç − despesa orç" />
        <Kpi label="GAP Realizado (Rec−Desp)" value={money(kpis.gapReal)} cor={T.corV(kpis.gapReal)} accent={T.corV(kpis.gapReal)} sub="receita real − despesa real" />
        {kpis.adicional > 0 && (
          <Kpi label={`Adicional/mês (${kpis.mesesRestantes}m rest.)`} value={money(kpis.adicional)} cor={T.amb} accent={T.amb} sub="para cobrir o gap restante" urgent />
        )}
      </div>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {/* Execution summary bars */}
      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:14 }}>Execução Orçamentária YTD</div>
        <BarRow label="Receita"  orc={kpis.recOrc}  real={kpis.recReal}  cor={T.grn} />
        <BarRow label="Despesas" orc={kpis.despOrc} real={kpis.despReal} cor={T.red} />
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Maiores desvios para explicar</div>
          {desvios.estouros.length === 0 ? (
            <div style={{ fontSize:12, color:T.grn }}>Sem estouros relevantes no filtro atual.</div>
          ) : desvios.estouros.map(d => (
            <div key={`${d.area}-${d.linha}`} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <div>
                <div style={{ fontSize:12, color:T.sub }}>{d.linha}</div>
                <div style={{ fontSize:10, color:T.muted }}>{d.area} · {d.pct.toFixed(1)}% do orçamento</div>
              </div>
              <div style={{ fontSize:12, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>+{money(d.delta)}</div>
            </div>
          ))}
        </Card>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0", marginBottom:12 }}>Folgas orçamentárias</div>
          {desvios.folgas.length === 0 ? (
            <div style={{ fontSize:12, color:T.muted }}>Sem folgas relevantes no filtro atual.</div>
          ) : desvios.folgas.map(d => (
            <div key={`${d.area}-${d.linha}`} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
              <div>
                <div style={{ fontSize:12, color:T.sub }}>{d.linha}</div>
                <div style={{ fontSize:10, color:T.muted }}>{d.area} · {d.pct.toFixed(1)}% do orçamento</div>
              </div>
              <div style={{ fontSize:12, color:T.grn, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>{money(d.delta)}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Tabs */}
      {modo === "Analítico" && <Card><TabBar tabs={VIEWS} ativo={view} onChange={setView} /></Card>}

      {modo === "Analítico" && (loading
        ? <div style={{ padding:40, textAlign:"center", color:T.muted }}>Carregando...</div>
        : rows.length === 0
          ? <div style={{ padding:40, textAlign:"center", color:T.dim }}>Sem dados</div>
          : view==="Ano/Mês"    ? <ViewAnoMes     rows={rows} mesesAtivos={mesesAtivos} mesesRealizados={mesesRealizados} />
          : view==="Trimestral" ? <ViewTrimestral  rows={rowsPeriodo} />
          : view==="Por Área"   ? <ViewArea        rows={rowsPeriodo} onDrill={handleDrill} />
          : <ViewLinha rows={rowsPeriodo} areaFiltro={areaFiltro} setAreaFiltro={setAreaFiltro} />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
