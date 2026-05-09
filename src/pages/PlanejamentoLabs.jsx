import { useMemo, useState } from "react";
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
  budgetPlans,
  scenarios,
  getAccountRows,
  getDreRows,
  getMonthlyTotals,
  getPlanningSummary,
  getScenarioComparison,
} from "../data/planningBudgetDemo";

const tabs = ["Resumo", "Plano de Contas", "Plano Orçamentário", "Realizado", "DRE / Forecast", "Cenários"];
const money = fmt.brl0;
const pct = value => `${Number(value || 0).toFixed(1)}%`;
const axis = { fill:CA.tick, fontSize:9, fontFamily:MONO };
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

function Summary({ scenarioId }) {
  const summary = useMemo(() => getPlanningSummary(scenarioId), [scenarioId]);
  const monthly = useMemo(() => getMonthlyTotals(scenarioId), [scenarioId]);
  const scenario = scenarios.find(item => item.id === scenarioId);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="intel-grid-4">
        <MetricTile label="Receita líquida prevista" value={money(summary.revenue)} sub={budgetPlans[0].name} color={T.grn} accent={T.grn} />
        <MetricTile label="EBITDA previsto" value={money(summary.ebitda)} sub={`Margem ${pct(summary.ebitdaMargin)}`} color={summary.ebitda >= 0 ? T.grn : T.red} accent={T.purp} />
        <MetricTile label="Resultado previsto" value={money(summary.result)} sub={scenario?.label || "Base"} color={summary.result >= 0 ? T.grn : T.red} accent={T.blue2} />
        <MetricTile label="Plano de contas" value={`${summary.leafAccounts}/${summary.accounts}`} sub="contas operacionais / total" accent={T.amb} />
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

function AccountPlan() {
  const rows = [...accountPlan].sort((a, b) => a.budgetOrder - b.budgetOrder);
  return (
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:860 }}>
          <thead>
            <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
              {["Código", "Conta", "Tipo", "Sinal", "Ordem orçamento", "Ordem DRE", "Status"].map((header, index) => (
                <th key={header} style={{ textAlign:index <= 2 ? "left" : "right", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom:`1px solid ${T.brd}`, background:row.isSummary ? T.surf : "transparent" }}>
                <td style={{ padding:"8px 11px", color:T.dim, fontFamily:MONO, fontSize:11 }}>{row.code}</td>
                <td style={{ padding:"8px 11px", color:row.isSummary ? T.txt : T.sub, fontSize:12, fontWeight:row.isSummary ? 900 : 600, paddingLeft:row.parentId ? 28 : 11 }}>{row.name}</td>
                <td style={{ padding:"8px 11px" }}><MiniBadge color={typeColor(row.type)}>{accountTypes[row.type]}</MiniBadge></td>
                <td style={{ padding:"8px 11px", color:row.sign > 0 ? T.grn : T.red, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.sign > 0 ? "+" : "-"}</td>
                <td style={{ padding:"8px 11px", color:T.sub, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.budgetOrder}</td>
                <td style={{ padding:"8px 11px", color:T.sub, textAlign:"right", fontFamily:MONO, fontSize:11 }}>{row.dreOrder}</td>
                <td style={{ padding:"8px 11px", textAlign:"right" }}><MiniBadge color={T.grn}>Ativo</MiniBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BudgetGrid({ scenarioId, source = "budget" }) {
  const rows = useMemo(() => getAccountRows(scenarioId, source), [scenarioId, source]);
  const visibleMonths = source === "actual" ? MONTHS.slice(0, 5) : MONTHS;
  return (
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:source === "actual" ? 880 : 1280 }}>
          <thead>
            <tr style={{ background:T.surf, borderBottom:`1px solid ${T.brd}` }}>
              <th style={{ textAlign:"left", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em", width:260 }}>Conta</th>
              {visibleMonths.map(month => (
                <th key={month} style={{ textAlign:"right", padding:"8px 9px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>{month}</th>
              ))}
              <th style={{ textAlign:"right", padding:"8px 11px", fontSize:9, color:T.muted, textTransform:"uppercase", letterSpacing:".12em" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom:`1px solid ${T.brd}`, background:row.isSummary ? T.surf : "transparent" }}>
                <td style={{ padding:"7px 11px", color:row.isSummary ? T.txt : T.sub, fontSize:11, fontWeight:row.isSummary ? 900 : 600, whiteSpace:"nowrap", paddingLeft:row.parentId ? 28 : 11 }}>
                  <span style={{ color:T.dim, fontFamily:MONO, marginRight:8 }}>{row.code}</span>{row.name}
                </td>
                {visibleMonths.map(month => (
                  <td key={month} style={{ padding:"7px 9px", textAlign:"right", color:row.months[month] < 0 ? T.red : T.txt, fontFamily:MONO, fontSize:10 }}>
                    {money(row.months[month])}
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

function DreForecast({ scenarioId }) {
  const rows = useMemo(() => getDreRows(scenarioId), [scenarioId]);
  const chartRows = rows.filter(row => ["total", "subtotal", "result"].includes(row.type));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <Card style={{ padding:16 }}>
        <SectionHeader title="P&L / Forecast vs DRE Gerencial" badge="mesmo plano de contas" />
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
              {rows.map(row => {
                const variance = row.actual - row.planned;
                const progress = row.planned ? (row.actual / row.planned) * 100 : 0;
                const color = rowTone(row.type);
                return (
                  <tr key={row.key} style={{ borderBottom:`1px solid ${T.brd}`, background:["subtotal", "result"].includes(row.type) ? T.surf : "transparent" }}>
                    <td style={{ padding:"8px 11px", color:["subtotal", "result", "total"].includes(row.type) ? T.txt : T.sub, fontSize:12, fontWeight:["subtotal", "result", "total"].includes(row.type) ? 900 : 600 }}>
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

function Scenarios({ scenarioId, setScenarioId }) {
  const comparison = useMemo(() => getScenarioComparison(), []);
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
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];

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

      <Card>
        <TabBar tabs={tabs} ativo={activeTab} onChange={setActiveTab} />
        <div style={{ padding:14 }}>
          {activeTab === "Resumo" && <Summary scenarioId={scenarioId} />}
          {activeTab === "Plano de Contas" && <AccountPlan />}
          {activeTab === "Plano Orçamentário" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <SectionHeader title="Grade mensal do orçamento" badge={scenario.name} />
              <BudgetGrid scenarioId={scenarioId} />
            </div>
          )}
          {activeTab === "Realizado" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <SectionHeader title="Realizado lançado na mesma estrutura" badge="JAN-MAI demo" />
              <BudgetGrid scenarioId={scenarioId} source="actual" />
            </div>
          )}
          {activeTab === "DRE / Forecast" && <DreForecast scenarioId={scenarioId} />}
          {activeTab === "Cenários" && <Scenarios scenarioId={scenarioId} setScenarioId={setScenarioId} />}
        </div>
      </Card>
    </div>
  );
}
