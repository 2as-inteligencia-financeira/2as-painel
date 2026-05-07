import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { T, CA, MONO } from "../theme";
import { Card, TipBRL, TipPct } from "../Ui";
import { fmt } from "../hooks/useSheets";
import { buildFinancialIntelligence } from "../data/financialIntelligenceDemo";
import { DataBadge, MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";

const model = buildFinancialIntelligence();
const pct = value => `${Number(value || 0).toFixed(1)}%`;
const valueColor = value => value >= 0 ? T.grn : T.red;
const levelColor = level => level === "Atenção" ? T.amb : level === "Investigação" ? T.purp : level === "Monitorar" ? T.blue2 : T.grn;
const rowColor = type => type === "deduction" ? T.red : type === "result" ? T.purp : type === "subtotal" ? T.blue2 : T.grn;
const dimColor = (pontos, max) => {
  const r = max > 0 ? pontos / max : 0;
  return r >= 0.9 ? T.grn : r >= 0.6 ? T.blue2 : r >= 0.3 ? T.amb : T.red;
};

function CriterioScore() {
  const { score, dims } = model.scoreData;
  const scoreColor = score >= 85 ? T.grn : score >= 65 ? T.blue2 : score >= 45 ? T.amb : T.red;
  const scoreLabel = score >= 85 ? "Saudável" : score >= 65 ? "Estável" : score >= 45 ? "Atenção" : "Crítico";
  return (
    <Card style={{ padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:9, color:T.blue2, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Critério do Score</div>
          <h3 style={{ margin:0, color:T.txt, fontSize:13, fontWeight:900 }}>Como a Luniq mede a saúde financeira</h3>
          <p style={{ margin:"5px 0 0", color:T.muted, fontSize:11, lineHeight:1.45, maxWidth:520 }}>
            Score calculado automaticamente a partir de cinco dimensões. Cada uma tem peso definido por relevância operacional — sem opinião, sem estimativa.
          </p>
        </div>
        <div style={{ flexShrink:0, textAlign:"center", background:T.card, border:`1px solid ${T.brd}`, borderRadius:10, padding:"14px 20px", minWidth:88 }}>
          <div style={{ color:scoreColor, fontFamily:"'DM Mono',monospace", fontSize:32, fontWeight:900, lineHeight:1 }}>{score}</div>
          <div style={{ color:scoreColor, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:4 }}>{scoreLabel}</div>
          <div style={{ color:T.dim, fontSize:8, marginTop:2 }}>de 100 pts</div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column" }}>
        {dims.map((d, i) => {
          const color = dimColor(d.pontos, d.max);
          return (
            <div key={d.label} style={{ display:"grid", gridTemplateColumns:"3px 1fr auto", gap:13, padding:"13px 0", borderBottom: i < dims.length - 1 ? `1px solid ${T.brd}` : "none", alignItems:"start" }}>
              <div style={{ background:color, borderRadius:2, alignSelf:"stretch" }} />
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ color:T.txt, fontSize:11, fontWeight:800 }}>{d.label}</span>
                  <span style={{ fontSize:8, color:T.dim, border:`1px solid ${T.brd}`, borderRadius:4, padding:"1px 5px", fontFamily:"'DM Mono',monospace" }}>{d.peso} pts</span>
                </div>
                <div style={{ color:T.muted, fontSize:10, lineHeight:1.45, marginBottom:7 }}>{d.desc}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {d.criterios.map(c => (
                    <span key={c} style={{ fontSize:9, color:T.dim, border:`1px solid ${T.brd}`, borderRadius:4, padding:"2px 6px", fontFamily:"'DM Mono',monospace" }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, paddingTop:1 }}>
                <div style={{ color, fontFamily:"'DM Mono',monospace", fontWeight:900, fontSize:20, lineHeight:1 }}>{d.pontos}</div>
                <div style={{ color:T.dim, fontSize:9, marginTop:3 }}>de {d.max}</div>
                <div style={{ width:48, height:3, background:T.brd, borderRadius:2, marginTop:6, overflow:"hidden" }}>
                  <div style={{ width:`${(d.pontos/d.max)*100}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.4s" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DreCascade() {
  return (
    <Card style={{ padding:15 }}>
      <SectionHeader title="Menu em Cascata da DRE" badge={model.meta.period} />
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {model.dreRows.map((row, index) => {
          const color = rowColor(row.type);
          const symbol = row.type === "deduction" ? "-" : row.type === "total" ? "+" : "=";
          return (
            <div key={row.label} style={{ display:"grid", gridTemplateColumns:"22px 1fr auto", gap:8, alignItems:"center", padding:"7px 0", borderBottom:index < model.dreRows.length - 1 ? `1px solid ${T.brd}` : "none" }}>
              <span style={{ width:20, height:20, borderRadius:6, border:`1px solid ${color}`, color, display:"grid", placeItems:"center", fontWeight:900, fontSize:11 }}>{symbol}</span>
              <span style={{ color:row.type === "result" ? T.txt : T.sub, fontSize:11, fontWeight:row.type === "deduction" ? 600 : 800 }}>{row.label}</span>
              <span style={{ color, fontFamily:MONO, fontWeight:900, fontSize:11 }}>{fmt.brlk(row.value)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ScenarioCards() {
  return (
    <div className="intel-grid-3">
      {model.cenarios.map(cenario => (
        <Card key={cenario.label} style={{ padding:15, background:T.surf }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:7 }}>
            <div style={{ color:T.txt, fontWeight:900, fontSize:13 }}>{cenario.label}</div>
            <DataBadge label={`${cenario.runwayDias}d`} tone={cenario.runwayDias < 30 ? "amber" : "green"} />
          </div>
          <div style={{ color:T.muted, fontSize:10, minHeight:16 }}>{cenario.desc}</div>
          <div style={{ marginTop:13, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <MetricTile label="Saldo final" value={fmt.brlk(cenario.saldoFinal)} color={valueColor(cenario.saldoFinal)} />
            <MetricTile label="Runway" value={`${cenario.runwayDias}d`} color={cenario.runwayDias < 30 ? T.amb : T.grn} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function MethodologyGuide() {
  const steps = [
    {
      label: "1",
      title: "Diagnosticar",
      text: "Mede a saúde financeira e mostra onde existe atenção: liquidez, margem, orçamento, ciclo e riscos.",
      color: T.blue2,
    },
    {
      label: "2",
      title: "Explicar",
      text: "Transforma os números em narrativa: por que caixa, DRE, orçamento e ciclo estão se comportando assim.",
      color: T.grn,
    },
    {
      label: "3",
      title: "Comparar",
      text: "Compara a empresa com referências internas Luniq e destaca o que está acima, abaixo ou incompleto.",
      color: T.purp,
    },
    {
      label: "4",
      title: "Simular",
      text: "Projeta cenários para antecipar risco de caixa, pressão de fornecedores e necessidade de decisão.",
      color: T.amb,
    },
  ];

  return (
    <Card style={{ padding:16 }}>
      <SectionHeader title="Como ler esta página" badge="guia rápido" />
      <div style={{ color:T.sub, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        Esta tela não é um relatório operacional. Ela mostra a metodologia que a Luniq aplica em cima do Painel Base para sair de dados soltos e chegar em leitura executiva.
      </div>
      <div className="intel-grid-4">
        {steps.map(step => (
          <div key={step.title} style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:8, padding:13, minHeight:112 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:step.color, color:"#0a0a0a", display:"grid", placeItems:"center", fontWeight:900, fontSize:11, marginBottom:9 }}>
              {step.label}
            </div>
            <div style={{ color:T.txt, fontSize:12, fontWeight:900, marginBottom:5 }}>{step.title}</div>
            <div style={{ color:T.muted, fontSize:10.5, lineHeight:1.45 }}>{step.text}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FinancialExplainer({ explainer }) {
  return (
    <Card style={{ padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
        <div>
          <SectionHeader title={explainer.title} badge="explicador" />
          <p style={{ color:T.sub, fontSize:12, lineHeight:1.55, margin:0 }}>{explainer.summary}</p>
        </div>
        <DataBadge label={`Confiança ${explainer.confidence}`} tone="green" />
      </div>
      <div className="intel-grid-2">
        <div style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:8, padding:12 }}>
          <div style={{ color:T.blue2, fontSize:9, fontWeight:800, textTransform:"uppercase", marginBottom:8 }}>Principais causas</div>
          {explainer.drivers.map(item => (
            <div key={item} style={{ display:"grid", gridTemplateColumns:"8px 1fr", gap:8, color:T.sub, fontSize:11, lineHeight:1.45, marginBottom:7 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:T.blue2, marginTop:5 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:8, padding:12 }}>
          <div style={{ color:T.amb, fontSize:9, fontWeight:800, textTransform:"uppercase", marginBottom:8 }}>Riscos de leitura</div>
          {explainer.dataRisks.map(item => (
            <div key={item} style={{ display:"grid", gridTemplateColumns:"8px 1fr", gap:8, color:T.sub, fontSize:11, lineHeight:1.45, marginBottom:7 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:T.amb, marginTop:5 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BenchmarkTable({ rows }) {
  return (
    <Card style={{ padding:16 }}>
      <SectionHeader title="Benchmark Interno Luniq" badge="simulado" />
      <div style={{ display:"flex", flexDirection:"column" }}>
        {rows.map((row, index) => {
          const color = row.status === "Acima" || row.status === "Dentro" || row.status === "Favorável" ? T.grn : row.status === "Parcial" ? T.amb : T.red;
          return (
            <div key={row.metric} className="benchmark-row" style={{ display:"grid", gap:12, alignItems:"center", padding:"11px 0", borderBottom:index < rows.length - 1 ? `1px solid ${T.brd}` : "none" }}>
              <div>
                <div style={{ color:T.txt, fontSize:12, fontWeight:900 }}>{row.metric}</div>
                <div style={{ color:T.muted, fontSize:10, lineHeight:1.35 }}>{row.reading}</div>
              </div>
              <div>
                <div style={{ color:T.dim, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>Empresa</div>
                <div style={{ color:T.txt, fontFamily:MONO, fontWeight:900, fontSize:13 }}>{row.company}</div>
              </div>
              <div>
                <div style={{ color:T.dim, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>Referência</div>
                <div style={{ color:T.sub, fontFamily:MONO, fontWeight:900, fontSize:13 }}>{row.benchmark}</div>
              </div>
              <DataBadge label={row.status} tone={color === T.grn ? "green" : color === T.amb ? "amber" : "red"} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MethodologySummary({ kpis }) {
  const items = [
    { label:"Saúde financeira", value:"Score e dimensões", text:"Resume se a operação está saudável, estável ou exigindo ação." },
    { label:"Narrativa", value:"Causa e impacto", text:"Explica a leitura para reunião sem exigir que o usuário monte a história." },
    { label:"Padrões", value:"Comportamento", text:"Procura movimentos que não aparecem olhando só uma tabela isolada." },
    { label:"Referência", value:"Benchmark", text:"Compara com parâmetros internos Luniq e aponta distância da referência." },
  ];

  return (
    <div className="intel-grid-4">
      {items.map(item => (
        <MetricTile key={item.label} label={item.label} value={item.value} sub={item.text} accent={T.blue2} />
      ))}
      <MetricTile label="Exemplo numérico" value={`${kpis.runwayDias} dias`} sub="Runway usado nas simulações abaixo" color={kpis.runwayDias < 30 ? T.amb : T.grn} accent={T.grn} />
    </div>
  );
}

export default function SistemaLuniq() {
  const { kpis, meses, dreRows, fluxo, financialExplainer, benchmarkInsights, behaviorInsights } = model;
  const [modoTela, setModoTela] = useState("operacional");
  const prioridades = useMemo(() => behaviorInsights.slice(0, 3), [behaviorInsights]);
  const benchmarkCritico = useMemo(
    () => benchmarkInsights.filter(item => !["Acima", "Dentro", "Favorável"].includes(item.status)).slice(0, 3),
    [benchmarkInsights]
  );

  const navegar = (rota) => window.dispatchEvent(new CustomEvent("painel:navigate", { detail: rota }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Inteligência Luniq"
        title="Metodologia de análise financeira"
        right={
          <Card style={{ padding:16 }}>
            <SectionHeader title="Camadas da metodologia" badge="demo" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:8 }}>
              <DataBadge label="Score" />
              <DataBadge label="Explicador" tone="green" />
              <DataBadge label="Benchmark" tone="cyan" />
            </div>
            <div style={{ color:T.muted, fontSize:10, lineHeight:1.4, marginTop:10 }}>
              Mostra como a Luniq transforma dados do painel em leitura, diagnóstico e decisão.
            </div>
          </Card>
        }
      >
        Esta página explica a metodologia por trás do Painel Base Luniq: score, explicador financeiro, comportamento, benchmark e cruzamentos gerenciais. As páginas operacionais continuam separadas em liquidez, performance, ciclo, governança e riscos.
      </ProductHero>

      <Card style={{ padding:"10px 12px" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[{ id:"operacional", label:"Modo Operacional" }, { id:"branding", label:"Modo Branding" }].map(opcao => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setModoTela(opcao.id)}
              style={{
                padding:"6px 10px",
                borderRadius:6,
                border:`1px solid ${modoTela === opcao.id ? T.blue2 : T.brd}`,
                background:modoTela === opcao.id ? "rgba(245,158,11,0.13)" : "transparent",
                color:modoTela === opcao.id ? T.blue2 : T.muted,
                fontSize:11,
                fontWeight:700,
                cursor:"pointer",
                fontFamily:"inherit",
              }}
            >
              {opcao.label}
            </button>
          ))}
        </div>
      </Card>

      {modoTela === "operacional" && (
        <>
          <Card style={{ padding:16 }}>
            <SectionHeader title="Como esta página te ajuda no trabalho" badge="foco prático" />
            <div className="intel-grid-3">
              <MetricTile label="Priorizar agora" value="3 frentes críticas" sub="Destaca os pontos que mais pressionam resultado e caixa." accent={T.red} />
              <MetricTile label="Direcionar rota" value="Navegação guiada" sub="Leva você direto para Liquidez, DRE e Governança." accent={T.blue2} />
              <MetricTile label="Fechar plano" value="Ação por área" sub="Traduz leitura em plano objetivo para reunião de gestão." accent={T.grn} />
            </div>
          </Card>

          <div className="intel-grid-2">
            <Card style={{ padding:16 }}>
              <SectionHeader title="Prioridades operacionais da semana" badge="ação" />
              {prioridades.map((item, idx) => (
                <div key={item.titulo} style={{ display:"grid", gridTemplateColumns:"20px 1fr", gap:10, borderBottom: idx < prioridades.length - 1 ? `1px solid ${T.brd}` : "none", padding:"10px 0" }}>
                  <span style={{ color:T.blue2, fontFamily:MONO, fontWeight:700 }}>{idx + 1}</span>
                  <div>
                    <div style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.titulo}</div>
                    <div style={{ color:T.muted, fontSize:11, marginTop:3 }}>{item.impacto}</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card style={{ padding:16 }}>
              <SectionHeader title="Desvio versus referência" badge="benchmark" />
              {benchmarkCritico.length ? benchmarkCritico.map((item, idx) => (
                <div key={item.metric} style={{ borderBottom: idx < benchmarkCritico.length - 1 ? `1px solid ${T.brd}` : "none", padding:"10px 0" }}>
                  <div style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.metric}</div>
                  <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>{item.reading}</div>
                </div>
              )) : <div style={{ color:T.muted, fontSize:11 }}>Sem desvios críticos no benchmark.</div>}
            </Card>
          </div>

          <Card style={{ padding:16 }}>
            <SectionHeader title="Atalhos operacionais" badge="navegação" />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button type="button" onClick={() => navegar("fluxo-projetado")} style={{ padding:"8px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.sub, fontSize:11, fontWeight:700, cursor:"pointer" }}>Ir para Fluxo Projetado</button>
              <button type="button" onClick={() => navegar("dre")} style={{ padding:"8px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.sub, fontSize:11, fontWeight:700, cursor:"pointer" }}>Ir para DRE</button>
              <button type="button" onClick={() => navegar("contas-pagar")} style={{ padding:"8px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.sub, fontSize:11, fontWeight:700, cursor:"pointer" }}>Ir para Contas a Pagar</button>
              <button type="button" onClick={() => navegar("relatorio")} style={{ padding:"8px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.sub, fontSize:11, fontWeight:700, cursor:"pointer" }}>Ir para Relatório</button>
            </div>
          </Card>
        </>
      )}

      {modoTela === "branding" && (
        <>
          <MethodologyGuide />
          <MethodologySummary kpis={kpis} />
          <CriterioScore />

          <FinancialExplainer explainer={financialExplainer} />

          <div className="intel-grid-2">
            <Card style={{ padding:16 }}>
              <SectionHeader title="Análise de Comportamento Financeiro" badge="novo" />
              <div style={{ display:"flex", flexDirection:"column" }}>
                {behaviorInsights.map((item, index) => (
                  <div key={item.titulo} style={{ display:"grid", gridTemplateColumns:"3px 1fr", gap:12, padding:"11px 0", borderBottom:index < behaviorInsights.length - 1 ? `1px solid ${T.brd}` : "none" }}>
                    <div style={{ background:levelColor(item.nivel), borderRadius:2 }} />
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:4 }}>
                        <span style={{ color:T.txt, fontSize:12, fontWeight:900 }}>{item.titulo}</span>
                        <span style={{ color:levelColor(item.nivel), fontSize:10, fontWeight:800 }}>{item.nivel}</span>
                      </div>
                      <div style={{ color:T.muted, fontSize:11, lineHeight:1.45 }}>{item.causa}</div>
                      <div style={{ color:T.sub, fontSize:10, lineHeight:1.45, marginTop:4 }}>{item.impacto}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <BenchmarkTable rows={benchmarkInsights} />
          </div>

          <section>
            <SectionHeader title="Simulação aplicada" badge="cenários de caixa" />
            <ScenarioCards />
          </section>

          <section>
            <SectionHeader title="Exemplos numéricos da metodologia" badge="detalhe" />
            <div className="intel-grid-4">
              <MetricTile label="Receita líquida" value={fmt.brlk(kpis.receitaLiquida)} sub={`Receita bruta ${fmt.brlk(kpis.receita)}`} accent={T.blue2} />
              <MetricTile label="Margem contribuição" value={pct(kpis.margemContribuicaoPct)} sub={fmt.brlk(kpis.margemContribuicao)} color={T.grn} />
              <MetricTile label="EBITDA" value={fmt.brlk(kpis.ebitda)} sub={pct(kpis.margemEbitdaPct)} color={valueColor(kpis.ebitda)} accent={T.amb} />
              <MetricTile label="Resultado final" value={fmt.brlk(kpis.resultado)} sub={pct(kpis.margemLiquidaPct)} color={valueColor(kpis.resultado)} accent={T.purp} />
            </div>
          </section>

          <div className="intel-grid-2">
            <DreCascade />
            <Card style={{ padding:15 }}>
              <SectionHeader title="DRE em Cascata" badge="YTD" />
              <div style={{ height:300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dreRows} margin={{ top:8, right:12, bottom:44, left:8 }}>
                    <CartesianGrid stroke={CA.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} angle={-24} textAnchor="end" interval={0} height={72} />
                    <YAxis tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={fmt.brlk} width={62} />
                    <Tooltip content={<TipBRL />} />
                    <Bar dataKey="value" name="Valor" radius={[4,4,0,0]} maxBarSize={34}>
                      {dreRows.map(row => <Cell key={row.label} fill={rowColor(row.type)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="intel-grid-2">
            <Card style={{ padding:15 }}>
              <SectionHeader title="Margem, EBITDA e Resultado" badge="mensal" />
              <div style={{ height:250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={meses} margin={{ top:8, right:12, bottom:0, left:0 }}>
                    <CartesianGrid stroke={CA.grid} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill:T.dim, fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={38} />
                    <Tooltip content={<TipPct />} />
                    <Line dataKey="margemContribuicaoPct" name="Margem contribuição" stroke={T.grn} strokeWidth={2.4} dot={{ r:3, fill:T.grn }} />
                    <Line dataKey="margemEbitdaPct" name="Margem EBITDA" stroke={T.amb} strokeWidth={2.4} dot={{ r:3, fill:T.amb }} />
                    <Line dataKey="margemLiquidaPct" name="Margem final" stroke={T.purp} strokeWidth={2.4} dot={{ r:3, fill:T.purp }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card style={{ padding:15 }}>
              <SectionHeader title="Fluxo de Caixa Projetado" badge="8 semanas" />
              <div style={{ height:250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fluxo} margin={{ top:8, right:12, bottom:0, left:0 }}>
                    <CartesianGrid stroke={CA.grid} vertical={false} />
                    <XAxis dataKey="periodo" tick={{ fill:T.dim, fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={fmt.brlk} width={62} />
                    <Tooltip content={<TipBRL />} />
                    <Area dataKey="saldo" name="Saldo projetado" stroke={T.blue2} fill="rgba(245,158,11,0.16)" strokeWidth={2.4} />
                    <Line dataKey="entradas" name="Entradas" stroke={T.grn} strokeWidth={1.7} dot={false} />
                    <Line dataKey="saidas" name="Saídas" stroke={T.red} strokeWidth={1.7} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card style={{ padding:16 }}>
            <SectionHeader title="Orçamento e Ciclo Financeiro" badge="controle" />
            <div className="intel-grid-4">
              <MetricTile label="Receita vs orçamento" value={pct(kpis.variacaoReceita)} sub="Acima do plano acumulado" color={kpis.variacaoReceita >= 0 ? T.grn : T.red} />
              <MetricTile label="Despesas vs orçamento" value={pct(kpis.variacaoDespesa)} sub="Monitorar expansão de custo fixo" color={kpis.variacaoDespesa <= 0 ? T.grn : T.amb} />
              <MetricTile label="Ciclo de caixa" value={`${kpis.cicloCaixa}d`} sub={`PMR ${kpis.pmr}d · PMP ${kpis.pmp}d`} color={kpis.cicloCaixa <= 0 ? T.grn : T.red} />
              <MetricTile label="Capital de giro" value={fmt.brlk(kpis.capitalGiro)} sub="Potencial preso no ciclo" color={T.purp} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
