import { memo, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ComposedChart, Line } from "recharts";
import { useSheets } from "../../hooks/useSheets";
import { buildChargebacks } from "../../utils/operationalData";
import { T } from "../../theme";
import { Card, Kpi, Sec, Table, TipBRL, PeriodBtn } from "../../Ui";
import { SimpleBar, LoadingState } from "./Shared";
import { money, AX, GRD } from "./sharedPrimitives";
import ViewModeToggle from "../../components/ViewModeToggle";
import ExecutiveAlerts from "../../components/ExecutiveAlerts";

// ─── STATUS DE CHARGEBACK ─────────────────────────────────────────────────────
function statusCorChargeback(status) {
  if (status === "Ganho")       return T.grn;
  if (status === "Perdido")     return T.red;
  if (status === "Em disputa")  return T.amb;
  if (status === "Pendente")    return T.purp;
  if (status === "Estornado")   return T.blue;
  return T.muted;
}
const ChbBadge = ({ status }) => {
  const cor = statusCorChargeback(status);
  return (
    <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:600,
      background:`${cor}22`, color:cor, border:`1px solid ${cor}44`, whiteSpace:"nowrap" }}>
      {status || "-"}
    </span>
  );
};

const NOMES_MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const periodoSortValue = periodo => {
  const [mes, ano] = String(periodo || "").split("/").map(Number);
  return (ano || 0) * 100 + (mes || 0);
};

const periodoLabel = periodo => {
  const [mes, ano] = String(periodo || "").split("/");
  const nomeMes = NOMES_MESES[(Number(mes) || 1) - 1] || mes;
  return `${nomeMes}/${String(ano || "").slice(-2)}`;
};

const ChargebackTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.brd2}`, borderRadius:6, padding:"9px 13px", fontSize:11, boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
      <div style={{ color:T.sub, marginBottom:5, fontWeight:600, fontSize:10 }}>{periodoLabel(label)}</div>
      {payload.map((p, i) => {
        const isQtd = p.dataKey === "qtd";
        return (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:18, margin:"2px 0" }}>
            <span style={{ color:T.muted }}>{p.name}</span>
            <span style={{ color:p.color || T.txt }}>{isQtd ? String(p.value) : money(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── CHARGEBACKS VIEW ─────────────────────────────────────────────────────────
const ChargebacksView = memo(function ChargebacksView({ data }) {
  const [anoFiltro,  setAnoFiltro]  = useState(String(new Date().getFullYear()));
  const [mesFiltro,  setMesFiltro]  = useState(null);
  const [statusFiltro, setStatusFiltro] = useState(null);
  const [busca,      setBusca]      = useState("");
  const [modo,       setModo]       = useState("Executivo");

  const anosDisp = data.anosDisp || [];
  const anoAtualStr = String(new Date().getFullYear());

  const mesesDoAno = useMemo(() => {
    if (!anoFiltro) return [];
    return (data.todosPerios || [])
      .filter(p => p.endsWith(`/${anoFiltro}`))
      .sort((a, b) => periodoSortValue(a) - periodoSortValue(b));
  }, [anoFiltro, data.todosPerios]);

  const selecionarAno = (ano) => { setAnoFiltro(ano); setMesFiltro(null); };

  const fd = useMemo(() => {
    let rows = data.rows || [];
    if (anoFiltro) rows = rows.filter(r => r.periodo?.endsWith(`/${anoFiltro}`));
    if (mesFiltro) rows = rows.filter(r => r.periodo === mesFiltro);
    if (statusFiltro) rows = rows.filter(r => r.status === statusFiltro);
    const t = busca.trim().toLowerCase();
    if (t) rows = rows.filter(r =>
      r.aluno?.toLowerCase().includes(t) ||
      r.curso?.toLowerCase().includes(t) ||
      r.motivo?.toLowerCase().includes(t) ||
      r.banco?.toLowerCase().includes(t) ||
      r.pedido?.toLowerCase().includes(t)
    );

    let valorTotal=0, valorPerdido=0, valorDisputa=0, valorGanho=0;
    const statusMap = {}, motivosMap = {};
    rows.forEach(r => {
      valorTotal += r.valor;
      if (r.status === "Perdido")    valorPerdido  += r.valor;
      if (r.status === "Em disputa") valorDisputa  += r.valor;
      if (r.status === "Ganho")      valorGanho    += r.valor;
      statusMap[r.status]  = (statusMap[r.status] || 0) + 1;
      motivosMap[r.motivo] = (motivosMap[r.motivo] || 0) + 1;
    });
    const statusResume = Object.entries(statusMap)
      .map(([label,qtd])=>({label,qtd})).sort((a,b)=>b.qtd-a.qtd);
    const motivosTop = Object.entries(motivosMap)
      .map(([label,qtd])=>({label,qtd})).sort((a,b)=>b.qtd-a.qtd).slice(0,8);
    return { rows, valorTotal, valorPerdido, valorDisputa, valorGanho, statusResume, motivosTop, total: rows.length };
  }, [data.rows, anoFiltro, mesFiltro, statusFiltro, busca]);

  const tituloFiltro = [anoFiltro, mesFiltro].filter(Boolean).join(" › ") || "Todos os períodos";

  const indicadoresFiltrados = useMemo(() => {
    let rows = data.kpisIndicadores || [];
    if (anoFiltro) rows = rows.filter(r => String(r.periodo || "").endsWith(`/${anoFiltro}`));
    if (mesFiltro) rows = rows.filter(r => r.periodo === mesFiltro);
    return [...rows].sort((a, b) => periodoSortValue(a.periodo) - periodoSortValue(b.periodo));
  }, [data.kpisIndicadores, anoFiltro, mesFiltro]);

  const kpiInd = useMemo(() => {
    if (!indicadoresFiltrados.length) return data.ultimoIndicador || {};
    if (mesFiltro) return indicadoresFiltrados[indicadoresFiltrados.length - 1];

    const acc = indicadoresFiltrados.reduce((sum, r) => ({
      pedidos: sum.pedidos + (r.pedidos || 0),
      total: sum.total + (r.total || 0),
      valor: sum.valor + (r.valor || 0),
      comCancelamento: sum.comCancelamento + (r.comCancelamento || 0),
      valorReavido: sum.valorReavido + (r.valorReavido || 0),
      ganhos: sum.ganhos + (r.ganhos || 0),
      valorPerdido: sum.valorPerdido + (r.valorPerdido || 0),
      periodo: r.periodo,
    }), {
      pedidos: 0,
      total: 0,
      valor: 0,
      comCancelamento: 0,
      valorReavido: 0,
      ganhos: 0,
      valorPerdido: 0,
      periodo: indicadoresFiltrados[indicadoresFiltrados.length - 1]?.periodo || "",
    });

    const taxa = acc.pedidos > 0 ? acc.total / acc.pedidos : 0;
    const pctCancelamento = acc.total > 0 ? acc.comCancelamento / acc.total : 0;
    const taxaSucesso = acc.total > 0 ? acc.ganhos / acc.total : 0;

    return { ...acc, taxa, pctCancelamento, taxaSucesso };
  }, [indicadoresFiltrados, data.ultimoIndicador, mesFiltro]);

  const taxaChb = kpiInd.taxa ? `${(kpiInd.taxa > 1 ? kpiInd.taxa : kpiInd.taxa * 100).toFixed(2)}%` : "—";

  const statusLabels = ["Em disputa","Pendente","Perdido","Ganho","Estornado"];
  const qtdDisputa = fd.statusResume.find(s=>s.label==="Em disputa")?.qtd || 0;
  const alertasExecutivos = [
    qtdDisputa > 0 && {
      status:"disputa",
      title:"Chargebacks em disputa",
      value:String(qtdDisputa),
      text:`Valor em disputa no filtro: ${money(fd.valorDisputa)}.`,
      color:T.amb,
    },
    fd.valorPerdido > 0 && {
      status:"perda",
      title:"Valor perdido no período",
      value:money(fd.valorPerdido),
      text:`Taxa de sucesso atual: ${kpiInd.taxaSucesso ? `${(kpiInd.taxaSucesso * 100).toFixed(2)}%` : "sem leitura"}.`,
      color:T.red,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Filtros */}
      <Card style={{ padding:"9px 13px" }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center", marginBottom: anoFiltro ? 8 : 0 }}>
          <ViewModeToggle value={modo} onChange={setModo} />
          <div style={{ width:1, height:18, background:T.brd, margin:"0 6px" }} />
          <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", marginRight:4 }}>Ano</span>
          <PeriodBtn label="Todos" ativo={!anoFiltro} onClick={() => selecionarAno(null)} />
          {anosDisp.map(ano => (
            <PeriodBtn key={ano}
              label={ano === anoAtualStr ? `${ano} (YTD)` : ano}
              ativo={anoFiltro === ano}
              onClick={() => selecionarAno(anoFiltro === ano ? null : ano)} />
          ))}
          <div style={{ width:1, height:14, background:T.brd, margin:"0 6px" }} />
          <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", marginRight:4 }}>Status</span>
          <PeriodBtn label="Todos" ativo={!statusFiltro} onClick={() => setStatusFiltro(null)} />
          {statusLabels.map(s => (
            <PeriodBtn key={s} label={s} ativo={statusFiltro===s} onClick={() => setStatusFiltro(statusFiltro===s?null:s)} />
          ))}
        </div>
        {anoFiltro && mesesDoAno.length > 0 && (
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:9, fontWeight:600, color:T.dim, textTransform:"uppercase", marginRight:4 }}>Mês</span>
            <PeriodBtn label="Todos" ativo={!mesFiltro} onClick={() => setMesFiltro(null)} />
            {mesesDoAno.map(p => (
              <PeriodBtn key={p} label={periodoLabel(p)} ativo={mesFiltro===p} onClick={() => setMesFiltro(mesFiltro===p?null:p)} />
            ))}
          </div>
        )}
      </Card>

      {modo === "Executivo" && <ExecutiveAlerts items={alertasExecutivos} />}

      {/* KPIs — linha 1: volume e valores */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, minmax(0,1fr))", gap:12 }}>
        <Kpi label={`Total chargebacks`}     value={fd.total}             sub={tituloFiltro} />
        <Kpi label="Em disputa"              value={fd.statusResume.find(s=>s.label==="Em disputa")?.qtd||0}  cor={T.amb}  urgent={(fd.statusResume.find(s=>s.label==="Em disputa")?.qtd||0)>0} />
        <Kpi label="Pendentes"               value={fd.statusResume.find(s=>s.label==="Pendente")?.qtd||0}    cor={T.purp} />
        <Kpi label="Valor em disputa"        value={money(fd.valorDisputa)} cor={T.amb} />
        <Kpi label="Valor perdido"           value={money(fd.valorPerdido)} cor={T.red} urgent={fd.valorPerdido>0} />
      </div>

      {/* KPIs — linha 2: resultados */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:12 }}>
        <Kpi label="Valor total envolvido"   value={money(fd.valorTotal)} />
        <Kpi label="Valor reavido" value={money(kpiInd.valorReavido || fd.valorGanho)} cor={T.grn} />
        <Kpi label="Taxa de chargeback"      value={taxaChb}              sub={kpiInd.periodo||"último período"} cor={T.red} />
        <Kpi label="Taxa de sucesso"         value={kpiInd.taxaSucesso ? `${(kpiInd.taxaSucesso * 100).toFixed(2)}%` : "—"} cor={T.grn} />
      </div>

      {/* KPIs da aba indicadores (se houver) */}
      {indicadoresFiltrados?.length > 0 && (
        <Sec title="Histórico — Indicadores (aba INDICADORES CHARGEBACKS)">
          <Table compact
            headers={[
              "Período",
              {label:"Pedidos",right:true,mono:true},
              {label:"Total",right:true,mono:true},
              {label:"Volume total",right:true,mono:true},
              {label:"Taxa %",right:true,mono:true},
              {label:"Com cancel.",right:true,mono:true},
              {label:"% cancel.",right:true,mono:true},
              {label:"Valor reavido",right:true,mono:true},
              {label:"Taxa sucesso",right:true,mono:true},
              {label:"Valor perdido",right:true,mono:true},
            ]}
            rows={indicadoresFiltrados.map(r=>[
              r.periodo,
              String(r.pedidos||0),
              String(r.total||0),
              r.valor ? money(r.valor) : "-",
              r.taxa ? `${(r.taxa*100).toFixed(2)}%` : "-",
              String(r.comCancelamento||0),
              r.pctCancelamento ? `${(r.pctCancelamento*100).toFixed(2)}%` : "-",
              r.valorReavido ? money(r.valorReavido) : "-",
              r.taxaSucesso ? `${(r.taxaSucesso*100).toFixed(2)}%` : "-",
              r.valorPerdido ? money(r.valorPerdido) : "-",
            ])}
            scrollMax={300}
          />
        </Sec>
      )}

      {/* Distribuição por status + motivos */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Sec title="Distribuição por status">
          <Card style={{ padding:"15px 16px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fd.statusResume} margin={{ top:8, right:4, bottom:0, left:0 }}>
                {GRD}
                <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<TipBRL formatter={v=>String(v)} />} />
                <Bar dataKey="qtd" radius={[3,3,0,0]} maxBarSize={40}>
                  {fd.statusResume.map((r, i) => (
                    <Cell key={i} fill={statusCorChargeback(r.label)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Sec>
        <Sec title="Top motivos">
          <SimpleBar data={fd.motivosTop} dataKey="qtd" color={T.purp} formatter={v=>String(v)} height={180} />
        </Sec>
      </div>

      {/* Evolução mensal */}
      {data.mesesSerie?.length > 1 && (
        <Sec title="Evolução mensal — volume e valor">
          <Card style={{ padding:"15px 16px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={data.mesesSerie} margin={{ top:8, right:4, bottom:0, left:0 }}>
                {GRD}
                <XAxis dataKey="periodo" tick={AX} axisLine={false} tickLine={false} tickFormatter={periodoLabel} />
                <YAxis yAxisId="qtd" tick={AX} axisLine={false} tickLine={false} width={28} />
                <YAxis yAxisId="valor" orientation="right" tickFormatter={money} tick={AX} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<ChargebackTooltip />} />
                <Bar yAxisId="qtd" dataKey="qtd" fill={T.amb} radius={[3,3,0,0]} maxBarSize={28} name="Qtd" />
                <Line yAxisId="valor" type="monotone" dataKey="valor" stroke={T.red} strokeWidth={2} dot={{ r:3 }} name="Valor" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Sec>
      )}

      {/* Analítico */}
      {modo === "Analítico" && (
      <Sec title={`Chargebacks — analítico — ${tituloFiltro} (${fd.total})`}>
        <input
          placeholder="Filtrar por cliente, produto, pedido, banco ou motivo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ width:"100%", padding:"7px 11px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:11, marginBottom:8, boxSizing:"border-box" }}
        />
        <Table compact
          headers={[
            "Data",
            "Cliente",
            "Nº Pedido",
            "Produto",
            "Banco",
            "Motivo",
            {label:"Valor",right:true,mono:true},
            {label:"Status",render:v=><ChbBadge status={v} />},
            "Cancel.",
          ]}
          rows={fd.rows.map(r=>[r.data,r.aluno,r.pedido,r.curso,r.banco,r.motivo,r.valor,r.status,r.solicitouCancelamento])}
          footer={fd.rows.length>0 ? ["Total","","","","","",fd.rows.reduce((s,r)=>s+r.valor,0),"",""] : undefined}
          emptyMsg="Nenhum chargeback encontrado"
          scrollMax={520}
        />
      </Sec>
      )}
    </div>
  );
});

export default function ChargebacksPage() {
  const sheets = useSheets(["chargebacks", "chargebacks_indicadores"]);
  const data = useMemo(() => buildChargebacks(
    sheets.chargebacks?.data || [],
    sheets.chargebacks_indicadores?.data || []
  ), [
    sheets.chargebacks?.data,
    sheets.chargebacks_indicadores?.data,
  ]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <LoadingState sheets={sheets} />
      <ChargebacksView data={data} />
    </div>
  );
}
