import { useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmt } from "../hooks/useSheets";
import { T, CA, MONO } from "../theme";
import { Card, TabBar, TipBRL } from "../Ui";
import { DataBadge, MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";
import {
  MONTHS,
  accountPlan,
  accountTypes,
  financialAreas,
  budgetPlans,
  scenarios,
  taxRegimes,
  getAreaBudgetRows,
  getAccountRows,
  getBudgetComparisonRows,
  getDreRows,
  getDreMargins,
  getMonthlyTotals,
  getPlanningSummary,
  getScenarioComparison,
} from "../data/planningBudgetDemo";

const tabs = ["Resumo", "Plano de Contas", "Plano Orçamentário", "Realizado", "DRE / Forecast", "Cenários"];
const money = fmt.brl0;
const pct = value => `${Number(value || 0).toFixed(1)}%`;
const axis = { fill:CA.tick, fontSize:9, fontFamily:MONO };
const inputStyle = {
  width:"100%",
  height:30,
  borderRadius:4,
  border:`1px solid ${T.brd2}`,
  background:T.card,
  color:T.txt,
  padding:"0 8px",
  fontFamily:"inherit",
  fontSize:11,
};
const typeColor = type => ({
  revenue:T.grn,
  deduction:T.amb,
  cost:T.red,
  expense:T.red,
  investment:T.purp,
  financial:T.blue2,
  tax:T.amb,
  result:T.txt,
}[type] || T.sub);
const rowTone = type => type === "result" ? T.blue2 : type === "subtotal" ? T.purp : type === "deduction" ? T.red : T.grn;
const areaName = areaId => financialAreas.find(area => area.id === areaId)?.name || "Sem área";

function MiniBadge({ children, color = T.blue2 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 6px", border:`1px solid ${color}44`, borderRadius:4, color, background:`${color}10`, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function ScenarioPicker({ scenarioId, setScenarioId }) {
  return (
    <Card style={{ padding:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:T.muted, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".14em", marginBottom:4 }}>Cenário ativo</div>
          <div style={{ color:T.sub, fontSize:11 }}>A troca recalcula orçamento, DRE P&L e comparativos da tela.</div>
        </div>
        <select
          value={scenarioId}
          onChange={event => setScenarioId(event.target.value)}
          style={{ height:34, minWidth:230, borderRadius:4, border:`1px solid ${T.brd2}`, background:T.card, color:T.txt, padding:"0 10px", fontFamily:"inherit", fontSize:12, fontWeight:700 }}
        >
          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
        </select>
      </div>
    </Card>
  );
}

function Summary({ scenarioId, modelOptions }) {
  const summary = useMemo(() => getPlanningSummary(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const monthly = useMemo(() => getMonthlyTotals(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const areaRows = useMemo(() => getAreaBudgetRows(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const scenario = scenarios.find(item => item.id === scenarioId);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="intel-grid-4">
        <MetricTile label="Receita líquida prevista" value={money(summary.revenue)} sub={budgetPlans[0].name} color={T.grn} accent={T.grn} />
        <MetricTile label="EBITDA previsto" value={money(summary.ebitda)} sub={`Margem ${pct(summary.ebitdaMargin)}`} color={summary.ebitda >= 0 ? T.grn : T.red} accent={T.purp} />
        <MetricTile label="Resultado previsto" value={money(summary.result)} sub={scenario?.label || "Base"} color={summary.result >= 0 ? T.grn : T.red} accent={T.blue2} />
        <MetricTile label="Tributos" value={summary.taxRegime.label} sub={summary.taxRegime.note} accent={T.amb} />
      </div>

      <Card style={{ padding:16 }}>
        <SectionHeader title="P&L mensal do cenário" badge={scenario?.label} />
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={monthly} margin={{ top:8, right:12, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
            <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={money} tick={axis} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Bar dataKey="receitaLiquida" name="Receita líquida" fill={T.grn} radius={[3,3,0,0]} maxBarSize={22} />
            <Bar dataKey="despesas" name="Despesas operacionais" fill={T.red} radius={[3,3,0,0]} maxBarSize={22} />
            <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke={T.purp} strokeWidth={2} dot={{ r:2 }} />
            <Line type="monotone" dataKey="resultado" name="Resultado" stroke={T.blue2} strokeWidth={2} dot={{ r:2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ padding:16 }}>
        <SectionHeader title="Orçamento por área" badge="dimensão gerencial" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
          {areaRows.map(row => (
            <div key={row.id} style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:4, padding:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:8 }}>
                <div>
                  <div style={{ color:T.txt, fontWeight:900, fontSize:12 }}>{row.name}</div>
                  <div style={{ color:T.dim, fontSize:9 }}>{row.owner}</div>
                </div>
                <MiniBadge color={row.variance <= 0 ? T.grn : T.red}>{row.variance >= 0 ? "+" : ""}{money(row.variance)}</MiniBadge>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <MetricTile label="Previsto" value={money(row.planned)} />
                <MetricTile label="Realizado" value={money(row.actual)} color={row.actual <= row.planned ? T.grn : T.red} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="intel-grid-3">
        <Card style={{ padding:15 }}>
          <SectionHeader title="Modelo do MVP" badge="nativo" />
          <p style={{ color:T.sub, fontSize:11, lineHeight:1.5, margin:0 }}>
            Plano de contas, orçamento, realizado e DRE deixam de depender da planilha. A demo usa dados locais, mas a estrutura já representa as futuras tabelas da plataforma.
          </p>
        </Card>
        <Card style={{ padding:15 }}>
          <SectionHeader title="Realizado" badge={`${summary.actualMonths.length} meses`} />
          <p style={{ color:T.sub, fontSize:11, lineHeight:1.5, margin:0 }}>
            O realizado parcial é lançado contra as mesmas contas do orçamento, permitindo comparação sem reclassificar a DRE.
          </p>
        </Card>
        <Card style={{ padding:15 }}>
          <SectionHeader title="Turnaround" badge="cenários" />
          <p style={{ color:T.sub, fontSize:11, lineHeight:1.5, margin:0 }}>
            As variações aplicam ajustes por conta e período sobre uma base, sem duplicar o orçamento inteiro.
          </p>
        </Card>
      </div>
    </div>
  );
}

function AccountPlan({ accounts, setAccounts }) {
  const [selectedId, setSelectedId] = useState("marketing");
  const [newAccountName, setNewAccountName] = useState("");
  const newAccountCounter = useRef(1);
  const rows = useMemo(() => [...accounts].sort((a, b) => a.budgetOrder - b.budgetOrder), [accounts]);
  const selected = accounts.find(account => account.id === selectedId) || accounts.find(account => !account.isSummary);
  const groups = accounts.filter(account => account.isSummary);

  const updateAccount = (id, patch) => {
    setAccounts(prev => prev.map(account => account.id === id ? { ...account, ...patch } : account));
  };

  const addAccount = () => {
    const parent = groups.find(group => group.id === selected?.parentId) || groups[0];
    const siblings = accounts.filter(account => account.parentId === parent.id);
    const nextNumber = String(siblings.length + 1).padStart(2, "0");
    const id = `demo-${newAccountCounter.current}`;
    newAccountCounter.current += 1;
    const newAccount = {
      id,
      code:`${parent.code}.${nextNumber}`,
      name:newAccountName.trim() || "Nova conta orçamentária",
      type:parent.type,
      areaId:parent.areaId,
      parentId:parent.id,
      sign:parent.sign,
      budgetOrder:parent.budgetOrder + siblings.length + 1,
      dreOrder:parent.dreOrder + siblings.length + 1,
    };
    setAccounts(prev => [...prev, newAccount]);
    setSelectedId(id);
    setNewAccountName("");
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.3fr) minmax(300px,0.7fr)", gap:12 }}>
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:980 }}>
            <thead>
              <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
                {["Código", "Conta", "Área", "Tipo", "Sinal", "Ordem orçamento", "Ordem DRE"].map((header, index) => (
                  <th key={header} style={{ textAlign:index <= 3 ? "left" : "right", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} onClick={() => !row.isSummary && setSelectedId(row.id)} style={{ borderBottom:`1px solid ${T.brd}`, background:row.id === selected?.id ? "rgba(245,158,11,0.10)" : row.isSummary ? T.surf : "transparent", cursor:row.isSummary ? "default" : "pointer" }}>
                  <td style={{ padding:"8px 11px", color:T.dim, fontFamily:MONO, fontSize:11 }}>{row.code}</td>
                  <td style={{ padding:"8px 11px", color:row.isSummary ? T.txt : T.sub, fontSize:12, fontWeight:row.isSummary ? 900 : 600, paddingLeft:row.parentId ? 28 : 11 }}>{row.name}</td>
                  <td style={{ padding:"8px 11px" }}><MiniBadge color={T.purp}>{areaName(row.areaId)}</MiniBadge></td>
                  <td style={{ padding:"8px 11px" }}><MiniBadge color={typeColor(row.type)}>{accountTypes[row.type]}</MiniBadge></td>
                  <td style={{ padding:"8px 11px", color:row.sign > 0 ? T.grn : T.red, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.sign > 0 ? "+" : "-"}</td>
                  <td style={{ padding:"8px 11px", color:T.sub, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.budgetOrder}</td>
                  <td style={{ padding:"8px 11px", color:T.sub, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.dreOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Card style={{ padding:14 }}>
          <SectionHeader title="Editar conta" badge="demo local" />
          {selected && (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <label style={{ color:T.muted, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>Nome</label>
              <input value={selected.name} onChange={event => updateAccount(selected.id, { name:event.target.value })} style={inputStyle} />
              <label style={{ color:T.muted, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>Área orçamentária</label>
              <select value={selected.areaId} onChange={event => updateAccount(selected.id, { areaId:event.target.value })} style={inputStyle}>
                {financialAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
              <label style={{ color:T.muted, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>Grupo</label>
              <select value={selected.parentId} onChange={event => updateAccount(selected.id, { parentId:event.target.value })} style={inputStyle}>
                {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          )}
        </Card>

        <Card style={{ padding:14 }}>
          <SectionHeader title="Incluir no grupo" badge="nova conta" />
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <input value={newAccountName} onChange={event => setNewAccountName(event.target.value)} placeholder="Ex.: Customer Success" style={inputStyle} />
            <button type="button" onClick={addAccount} style={{ height:34, border:0, borderRadius:4, background:T.blue, color:"#0a0a0a", fontWeight:900, fontSize:12 }}>
              Adicionar conta
            </button>
          </div>
        </Card>

        <Card style={{ padding:14 }}>
          <SectionHeader title="Sugestão de modelagem" badge="orçamento" />
          <p style={{ color:T.sub, fontSize:11, lineHeight:1.5, margin:0 }}>
            Minha sugestão: manter plano de contas como natureza da DRE e criar uma dimensão obrigatória de área/responsável no orçamento. Assim Marketing continua sendo despesa operacional na DRE, mas pode ser planejado, aprovado e cobrado dentro da área Go-to-market.
          </p>
        </Card>
      </div>
    </div>
  );
}

function EditableMoney({ value, onChange }) {
  return (
    <input
      type="number"
      value={value || 0}
      onChange={event => onChange(event.target.value)}
      style={{ width:82, height:26, borderRadius:4, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, textAlign:"right", fontFamily:MONO, fontSize:10, padding:"0 6px" }}
    />
  );
}

function BudgetGrid({ scenarioId, source = "budget", modelOptions, onEdit, areaFilter = "all" }) {
  const rows = useMemo(() => getAccountRows(scenarioId, source, modelOptions), [scenarioId, source, modelOptions]);
  const visibleMonths = source === "actual" ? MONTHS.slice(0, 5) : MONTHS;
  const filteredRows = rows.filter(row => areaFilter === "all" || row.areaId === areaFilter || row.isSummary);
  const editMap = source === "actual" ? modelOptions.actualEdits : modelOptions.budgetEdits;
  return (
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:source === "actual" ? 980 : 1380 }}>
          <thead>
            <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
              <th style={{ textAlign:"left", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em", width:260 }}>Conta</th>
              <th style={{ textAlign:"left", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>Área</th>
              {visibleMonths.map(month => (
                <th key={month} style={{ textAlign:"right", padding:"8px 9px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>{month}</th>
              ))}
              <th style={{ textAlign:"right", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => (
              <tr key={row.id} style={{ borderBottom:`1px solid ${T.brd}`, background:row.isSummary ? T.surf : "transparent" }}>
                <td style={{ padding:"7px 11px", color:row.isSummary ? T.txt : T.sub, fontSize:11, fontWeight:row.isSummary ? 900 : 600, whiteSpace:"nowrap", paddingLeft:row.parentId ? 28 : 11 }}>
                  <span style={{ color:T.dim, fontFamily:MONO, marginRight:8 }}>{row.code}</span>{row.name}
                </td>
                <td style={{ padding:"7px 11px" }}><MiniBadge color={T.purp}>{areaName(row.areaId)}</MiniBadge></td>
                {visibleMonths.map(month => (
                  <td key={month} style={{ padding:"7px 9px", textAlign:"right", color:row.months[month] < 0 ? T.red : T.txt, fontFamily:MONO, fontSize:10 }}>
                    {!row.isSummary && !row.calculated ? (
                      <EditableMoney
                        value={editMap?.[`${row.id}:${month}`] ?? Math.abs(row.months[month])}
                        onChange={value => onEdit(source, row.id, month, value)}
                      />
                    ) : money(row.months[month])}
                  </td>
                ))}
                <td style={{ padding:"7px 11px", textAlign:"right", color:row.total < 0 ? T.red : T.blue2, fontFamily:MONO, fontSize:10, fontWeight:800 }}>
                  {source === "actual" ? money(visibleMonths.reduce((acc, month) => acc + row.months[month], 0)) : money(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BudgetComparison({ scenarioId, modelOptions }) {
  const rows = useMemo(() => getBudgetComparisonRows(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const leafRows = rows.filter(row => !row.isSummary);
  const totals = leafRows.reduce((acc, row) => ({
    planned:acc.planned + row.plannedTotal,
    actual:acc.actual + row.actualTotal,
  }), { planned:0, actual:0 });
  return (
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:920 }}>
          <thead>
            <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
              {["Conta", "Área", "Previsto", "Realizado", "Diferença", "% Exec."].map((header, index) => (
                <th key={header} style={{ textAlign:index < 2 ? "left" : "right", padding:"8px 11px", color:T.muted, fontSize:9, textTransform:"uppercase", letterSpacing:".12em" }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leafRows.map(row => {
              const good = row.sign > 0 ? row.variance >= 0 : row.variance <= 0;
              return (
                <tr key={row.id} style={{ borderBottom:`1px solid ${T.brd}` }}>
                  <td style={{ padding:"8px 11px", color:T.sub, fontSize:12, fontWeight:700 }}>{row.name}</td>
                  <td style={{ padding:"8px 11px" }}><MiniBadge color={T.purp}>{areaName(row.areaId)}</MiniBadge></td>
                  <td style={{ padding:"8px 11px", textAlign:"right", color:T.txt, fontFamily:MONO, fontSize:11 }}>{money(row.plannedTotal)}</td>
                  <td style={{ padding:"8px 11px", textAlign:"right", color:T.txt, fontFamily:MONO, fontSize:11 }}>{money(row.actualTotal)}</td>
                  <td style={{ padding:"8px 11px", textAlign:"right", color:good ? T.grn : T.red, fontFamily:MONO, fontSize:11 }}>{row.variance >= 0 ? "+" : ""}{money(row.variance)}</td>
                  <td style={{ padding:"8px 11px", textAlign:"right", color:T.sub, fontFamily:MONO, fontSize:11 }}>{pct(row.progress)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:T.surf, borderTop:`1px solid ${T.brd2}` }}>
              <td style={{ padding:"8px 11px", color:T.txt, fontWeight:900 }}>TOTAL</td>
              <td />
              <td style={{ padding:"8px 11px", textAlign:"right", color:T.blue2, fontFamily:MONO, fontWeight:900 }}>{money(totals.planned)}</td>
              <td style={{ padding:"8px 11px", textAlign:"right", color:T.blue2, fontFamily:MONO, fontWeight:900 }}>{money(totals.actual)}</td>
              <td style={{ padding:"8px 11px", textAlign:"right", color:totals.actual - totals.planned <= 0 ? T.grn : T.red, fontFamily:MONO, fontWeight:900 }}>{totals.actual - totals.planned >= 0 ? "+" : ""}{money(totals.actual - totals.planned)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function DreForecast({ scenarioId, modelOptions }) {
  const [view, setView] = useState("Sintética");
  const rows = useMemo(() => getDreRows(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const margins = useMemo(() => getDreMargins(scenarioId, modelOptions), [scenarioId, modelOptions]);
  const visibleRows = view === "Sintética" ? rows.filter(row => row.type !== "detail") : rows;
  const chartRows = rows.filter(row => ["total", "subtotal", "result"].includes(row.type));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <Card style={{ padding:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:12 }}>
          <SectionHeader title="P&L / Forecast vs DRE Gerencial" badge={view.toLowerCase()} />
          <div style={{ display:"flex", gap:6 }}>
            {["Sintética", "Analítica"].map(item => (
              <button key={item} type="button" onClick={() => setView(item)} style={{ height:30, padding:"0 10px", borderRadius:4, border:`1px solid ${view === item ? T.blue2 : T.brd}`, background:view === item ? "rgba(245,158,11,0.12)" : T.surf, color:view === item ? T.blue2 : T.muted, fontWeight:800, fontSize:11 }}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="intel-grid-3" style={{ marginBottom:14 }}>
          <MetricTile label="Margem bruta prevista" value={pct(margins.planned.gross)} sub={`Realizada ${pct(margins.actual.gross)}`} color={T.grn} />
          <MetricTile label="Margem EBITDA prevista" value={pct(margins.planned.ebitda)} sub={`Realizada ${pct(margins.actual.ebitda)}`} color={margins.planned.ebitda >= 0 ? T.grn : T.red} />
          <MetricTile label="Margem líquida prevista" value={pct(margins.planned.net)} sub={`Realizada ${pct(margins.actual.net)}`} color={margins.planned.net >= 0 ? T.grn : T.red} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartRows} margin={{ top:8, right:12, bottom:42, left:0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={62} />
            <YAxis tickFormatter={money} tick={axis} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<TipBRL formatter={money} />} />
            <Bar dataKey="planned" name="Previsto / Forecast" fill={T.blue2} radius={[3,3,0,0]} maxBarSize={28} />
            <Bar dataKey="actual" name="Realizado" radius={[3,3,0,0]} maxBarSize={28}>
              {chartRows.map(row => <Cell key={row.key} fill={row.actual >= 0 ? T.grn : T.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:860 }}>
            <thead>
              <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
                {["Linha DRE", "Previsto / Forecast", "Realizado", "Variação", "% Realizado"].map((header, index) => (
                  <th key={header} style={{ textAlign:index === 0 ? "left" : "right", padding:"8px 11px", color:T.muted, fontSize:9, textTransform:"uppercase", letterSpacing:".12em" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => {
                const variance = row.actual - row.planned;
                const progress = row.planned ? (row.actual / row.planned) * 100 : 0;
                const color = rowTone(row.type);
                return (
                  <tr key={row.key} style={{ borderBottom:`1px solid ${T.brd}`, background:["subtotal", "result"].includes(row.type) ? T.surf : "transparent" }}>
                    <td style={{ padding:"8px 11px", color:["subtotal", "result", "total"].includes(row.type) ? T.txt : T.sub, fontSize:12, fontWeight:["subtotal", "result", "total"].includes(row.type) ? 900 : 600, paddingLeft:row.type === "detail" ? 30 : 11 }}>
                      <span style={{ display:"inline-block", width:7, height:7, background:color, borderRadius:"50%", marginRight:8 }} />
                      {row.label}
                    </td>
                    <td style={{ padding:"8px 11px", textAlign:"right", color:row.planned < 0 ? T.red : T.txt, fontFamily:MONO, fontSize:11 }}>{money(row.planned)}</td>
                    <td style={{ padding:"8px 11px", textAlign:"right", color:row.actual < 0 ? T.red : T.grn, fontFamily:MONO, fontSize:11 }}>{money(row.actual)}</td>
                    <td style={{ padding:"8px 11px", textAlign:"right", color:variance >= 0 ? T.grn : T.red, fontFamily:MONO, fontSize:11 }}>{variance >= 0 ? "+" : ""}{money(variance)}</td>
                    <td style={{ padding:"8px 11px", textAlign:"right", color:T.sub, fontFamily:MONO, fontSize:11 }}>{pct(progress)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Scenarios({ scenarioId, setScenarioId, modelOptions }) {
  const comparison = useMemo(() => getScenarioComparison(modelOptions), [modelOptions]);
  const base = comparison.find(item => item.id === "base");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="intel-grid-2">
        {comparison.map(item => {
          const resultDelta = item.result - (base?.result || 0);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenarioId(item.id)}
              style={{ textAlign:"left", border:`1px solid ${scenarioId === item.id ? T.blue2 : T.brd}`, background:T.card, color:T.txt, borderRadius:4, padding:15, fontFamily:"inherit" }}
            >
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ color:T.txt, fontSize:14, fontWeight:900 }}>{item.name}</div>
                  <div style={{ color:T.muted, fontSize:10, marginTop:3 }}>{item.description}</div>
                </div>
                <DataBadge label={scenarioId === item.id ? "ativo" : item.label} tone={scenarioId === item.id ? "green" : "blue"} />
              </div>
              <div className="intel-grid-3">
                <MetricTile label="EBITDA" value={money(item.ebitda)} sub={`Margem ${pct(item.ebitdaMargin)}`} color={item.ebitda >= 0 ? T.grn : T.red} />
                <MetricTile label="Resultado" value={money(item.result)} color={item.result >= 0 ? T.grn : T.red} />
                <MetricTile label="Δ vs Base" value={`${resultDelta >= 0 ? "+" : ""}${money(resultDelta)}`} color={resultDelta >= 0 ? T.grn : T.red} />
              </div>
            </button>
          );
        })}
      </div>

      <Card style={{ padding:16 }}>
        <SectionHeader title="Subvariações do cenário ativo" badge="ajustes por conta e período" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:10 }}>
          {(scenarios.find(item => item.id === scenarioId)?.adjustments || []).length ? (
            scenarios.find(item => item.id === scenarioId).adjustments.map((adjustment, index) => {
              const account = accountPlan.find(item => item.id === adjustment.accountId);
              return (
                <div key={`${adjustment.accountId}-${index}`} style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:4, padding:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:8 }}>
                    <div style={{ color:T.txt, fontSize:12, fontWeight:900 }}>{account?.name}</div>
                    <MiniBadge color={adjustment.pct >= 0 ? T.grn : T.red}>{adjustment.pct >= 0 ? "+" : ""}{pct(adjustment.pct * 100)}</MiniBadge>
                  </div>
                  <div style={{ color:T.muted, fontSize:10, lineHeight:1.45 }}>{adjustment.fromMonth} a {adjustment.toMonth} · {adjustment.note}</div>
                </div>
              );
            })
          ) : (
            <div style={{ color:T.muted, fontSize:12 }}>O cenário base não possui subvariações.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function PlanejamentoLabs() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [scenarioId, setScenarioId] = useState("base");
  const [accounts, setAccounts] = useState(accountPlan);
  const [budgetEdits, setBudgetEdits] = useState({});
  const [actualEdits, setActualEdits] = useState({});
  const [areaFilter, setAreaFilter] = useState("all");
  const [taxRegime, setTaxRegime] = useState("simples");
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const modelOptions = useMemo(() => ({ accounts, budgetEdits, actualEdits, taxRegime }), [accounts, budgetEdits, actualEdits, taxRegime]);

  const handleBudgetEdit = (source, accountId, month, value) => {
    const setter = source === "actual" ? setActualEdits : setBudgetEdits;
    setter(prev => ({ ...prev, [`${accountId}:${month}`]: value }));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Planejamento Financeiro 2AS"
        title="Motor orçamentário nativo"
        right={
          <Card style={{ padding:14 }}>
            <SectionHeader title="Status do MVP" badge="demo" />
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <DataBadge label="Plano padrão cadastrado" tone="green" />
              <DataBadge label="Orçamento e realizado demo" tone="blue" />
              <DataBadge label="DRE / Forecast calculada" tone="cyan" />
            </div>
          </Card>
        }
      >
        Protótipo do novo módulo para criar plano de contas, estruturar orçamento mensal, lançar realizado, comparar DRE gerencial e modelar cenários de forecast ou turnaround sem depender do Sheets.
      </ProductHero>

      <ScenarioPicker scenarioId={scenarioId} setScenarioId={setScenarioId} />

      <Card style={{ padding:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:T.muted, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".14em", marginBottom:4 }}>Parâmetros do orçamento</div>
            <div style={{ color:T.sub, fontSize:11 }}>Área controla aprovação/responsável; regime tributário pré-calcula a linha de tributos.</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <select value={areaFilter} onChange={event => setAreaFilter(event.target.value)} style={{ ...inputStyle, width:210 }}>
              <option value="all">Todas as áreas</option>
              {financialAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
            <select value={taxRegime} onChange={event => setTaxRegime(event.target.value)} style={{ ...inputStyle, width:210 }}>
              {Object.entries(taxRegimes).map(([key, regime]) => <option key={key} value={key}>{regime.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <TabBar tabs={tabs} ativo={activeTab} onChange={setActiveTab} />
        <div style={{ padding:14 }}>
          {activeTab === "Resumo" && <Summary scenarioId={scenarioId} modelOptions={modelOptions} />}
          {activeTab === "Plano de Contas" && <AccountPlan accounts={accounts} setAccounts={setAccounts} />}
          {activeTab === "Plano Orçamentário" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <SectionHeader title="Grade mensal do orçamento" badge={scenario.name} />
              <BudgetGrid scenarioId={scenarioId} modelOptions={modelOptions} onEdit={handleBudgetEdit} areaFilter={areaFilter} />
              <SectionHeader title="Previsto x Realizado x Diferença" badge="por conta" />
              <BudgetComparison scenarioId={scenarioId} modelOptions={modelOptions} />
            </div>
          )}
          {activeTab === "Realizado" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <SectionHeader title="Realizado lançado na mesma estrutura" badge="JAN-MAI demo" />
              <BudgetGrid scenarioId={scenarioId} source="actual" modelOptions={modelOptions} onEdit={handleBudgetEdit} areaFilter={areaFilter} />
            </div>
          )}
          {activeTab === "DRE / Forecast" && <DreForecast scenarioId={scenarioId} modelOptions={modelOptions} />}
          {activeTab === "Cenários" && <Scenarios scenarioId={scenarioId} setScenarioId={setScenarioId} modelOptions={modelOptions} />}
        </div>
      </Card>
    </div>
  );
}
