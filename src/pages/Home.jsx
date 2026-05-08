import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo } from "react";
import { T, CA, MONO } from "../theme";
import { Card, TipBRL } from "../Ui";
import { fmt } from "../hooks/useSheets";
import { useActiveEmpresaId } from "../hooks/useActiveEmpresaId";
import { buildFinancialIntelligence } from "../data/financialIntelligenceDemo";
import { DataBadge, InsightCard, MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";

const go = rota => window.dispatchEvent(new CustomEvent("painel:navigate", { detail: rota }));
const pct = value => `${Number(value || 0).toFixed(1)}%`;
const moneyColor = value => value >= 0 ? T.grn : T.red;
const levelColor = level => level === "Atenção" ? T.amb : level === "Decisão" ? T.blue2 : level === "Oportunidade" ? T.grn : T.purp;

function MixedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.brd2}`, borderRadius:8, padding:"9px 12px", fontSize:11 }}>
      <div style={{ color:T.sub, fontWeight:800, marginBottom:5 }}>{label}</div>
      {payload.map(item => {
        const isPercent = String(item.dataKey || "").includes("Pct");
        return (
          <div key={item.dataKey} style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
            <span style={{ color:T.muted }}>{item.name}</span>
            <span style={{ color:item.color || T.txt, fontFamily:MONO, fontWeight:800 }}>
              {isPercent ? pct(item.value) : fmt.brl(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HealthScore({ model }) {
  const { score } = model.scoreData;
  const scoreColor = score >= 85 ? T.grn : score >= 65 ? T.blue2 : score >= 45 ? T.amb : T.red;
  const scoreLabel = score >= 85 ? "Saudável" : score >= 65 ? "Estável" : score >= 45 ? "Atenção" : "Crítico";
  return (
    <Card style={{ padding:13, display:"flex", flexDirection:"column", gap:11 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
        <DataBadge label={model.meta.source} />
        <span style={{ color:T.dim, fontSize:10 }}>{model.meta.lastUpdate}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:`conic-gradient(${scoreColor} ${score * 3.6}deg, ${T.brd} 0deg)`, display:"grid", placeItems:"center", flexShrink:0 }}>
          <div style={{ width:54, height:54, borderRadius:"50%", background:T.card, display:"grid", placeItems:"center", border:`1px solid ${scoreColor}` }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:scoreColor, fontSize:20, fontWeight:900, fontFamily:MONO, lineHeight:1 }}>{score}</div>
              <div style={{ color:scoreColor, fontSize:9, textTransform:"uppercase", fontWeight:800 }}>{scoreLabel}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ color:T.txt, fontSize:13, fontWeight:800 }}>Saúde financeira: {model.meta.healthText}.</div>
          <div style={{ color:T.sub, fontSize:11, lineHeight:1.4, marginTop:5 }}>Atenção principal em caixa semanal, ciclo financeiro e riscos de receita.</div>
        </div>
      </div>
      <button onClick={() => go("sistema-2as")} style={{ border:`1px solid ${T.brd2}`, background:T.surf, color:T.blue2, borderRadius:6, padding:"8px 10px", fontSize:11, fontWeight:800 }}>
        Abrir Metodologia 2AS
      </button>
    </Card>
  );
}

export default function Home() {
  const empresaId = useActiveEmpresaId();
  const model = useMemo(() => buildFinancialIntelligence(empresaId), [empresaId]);
  const { kpis, meses, fluxo, prioridades, planoAcao, behaviorInsights } = model;
  const latest = meses.at(-1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Resumo Executivo"
        title="Painel de controle financeiro"
        right={<HealthScore model={model} />}
      >
        Visão operacional para acompanhar liquidez, DRE, orçamento, ciclo financeiro, governança e riscos. Os cards abaixo priorizam o que precisa de decisão, sem tirar o usuário do fluxo de análise.
      </ProductHero>

      <div className="intel-grid-4">
        <MetricTile label="Saldo atual" value={fmt.brlk(kpis.saldoAtual)} sub={`Menor saldo projetado ${fmt.brlk(kpis.menorSaldo)}`} color={moneyColor(kpis.saldoAtual)} accent={T.blue2} />
        <MetricTile label="Runway" value={`${kpis.runwayDias} dias`} sub={kpis.menorSaldo < 0 ? `Ruptura projetada: ${fmt.brlk(kpis.menorSaldo)}` : "Sem ruptura no cenário base"} color={kpis.runwayDias < 30 ? T.red : kpis.runwayDias < 60 ? T.amb : T.grn} accent={T.grn} />
        <MetricTile label="EBITDA YTD" value={fmt.brlk(kpis.ebitda)} sub={`${pct(kpis.margemEbitdaPct)} da receita líquida`} color={moneyColor(kpis.ebitda)} accent={T.amb} />
        <MetricTile label="Resultado líquido" value={fmt.brlk(kpis.resultado)} sub={`${pct(kpis.margemLiquidaPct)} de margem final`} color={moneyColor(kpis.resultado)} accent={T.purp} />
      </div>

      <section>
        <SectionHeader title="Fila de Decisão" badge={`${prioridades.length} sinais ativos`} />
        <div className="intel-grid-auto">
          {prioridades.map(item => (
            <InsightCard key={item.titulo} area={item.area} nivel={item.nivel} title={item.titulo} color={levelColor(item.nivel)} onClick={() => go(item.rota)}>
              {item.texto}
            </InsightCard>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Nova inteligência: comportamento financeiro" badge={`${behaviorInsights.length} padrões mapeados`} />
        <div className="intel-grid-3">
          {behaviorInsights.map(item => (
            <InsightCard key={item.titulo} area={item.area} nivel={item.nivel} title={item.titulo} color={levelColor(item.nivel)} onClick={() => go(item.rota)}>
              <strong style={{ color:T.sub }}>Causa:</strong> {item.causa}<br />
              <strong style={{ color:T.sub }}>Impacto:</strong> {item.impacto}<br />
              <span style={{ color:T.blue2, fontWeight:800 }}>{item.acao}</span>
            </InsightCard>
          ))}
        </div>
      </section>

      <div className="intel-grid-2">
        <Card style={{ padding:15 }}>
          <SectionHeader title="Liquidez Projetada" badge="8 semanas" />
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

        <Card style={{ padding:15 }}>
          <SectionHeader title="Performance e Margem" badge={model.meta.period} />
          <div style={{ height:250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={meses} margin={{ top:8, right:12, bottom:0, left:0 }}>
                <CartesianGrid stroke={CA.grid} vertical={false} />
                <XAxis dataKey="mes" tick={{ fill:T.dim, fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="money" tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={fmt.brlk} width={62} />
                <YAxis yAxisId="pct" orientation="right" tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={38} />
                <Tooltip content={<MixedTooltip />} />
                <Bar yAxisId="money" dataKey="receitaLiquida" name="Receita líquida" fill={T.blue2} radius={[4,4,0,0]} maxBarSize={32} />
                <Line yAxisId="pct" dataKey="margemEbitdaPct" name="Margem EBITDA" stroke={T.grn} strokeWidth={2.4} dot={{ r:3, fill:T.grn }} />
                <Line yAxisId="pct" dataKey="margemLiquidaPct" name="Margem líquida" stroke={T.purp} strokeWidth={2.4} dot={{ r:3, fill:T.purp }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="intel-grid-2">
        <Card style={{ padding:16 }}>
          <SectionHeader title="Ciclo Financeiro" badge="PMR · PMP · Caixa" />
          <div className="intel-grid-3">
            <MetricTile label="PMR" value={`${kpis.pmr}d`} sub="Prazo médio de recebimento" color={T.blue2} />
            <MetricTile label="PMP" value={`${kpis.pmp}d`} sub="Prazo médio de pagamento" color={T.amb} />
            <MetricTile label="Ciclo de caixa" value={`${kpis.cicloCaixa}d`} sub={`Capital de giro: ${fmt.brlk(kpis.capitalGiro)}`} color={kpis.cicloCaixa <= 0 ? T.grn : T.red} />
          </div>
        </Card>

        <Card style={{ padding:16 }}>
          <SectionHeader title="Riscos e Governança" badge="receita protegida" />
          <div className="intel-grid-3">
            <MetricTile label="Cancelamentos" value={fmt.brlk(kpis.cancelamentos)} sub="Exposição YTD" color={T.amb} />
            <MetricTile label="Chargebacks" value={fmt.brlk(kpis.chargebacks)} sub="Disputas e reversões" color={T.red} />
            <MetricTile label="Mês atual" value={fmt.brlk(latest.cancelamentos + latest.chargebacks)} sub={`${latest.mes} em monitoramento`} color={T.purp} />
          </div>
        </Card>
      </div>

      <section>
        <SectionHeader title="Plano de Ação" badge="acompanhamento" />
        <Card style={{ overflow:"hidden" }}>
          {planoAcao.map((item, index) => (
            <div key={item.decisao} style={{ display:"grid", gridTemplateColumns:"34px 1fr 160px 130px", gap:12, alignItems:"center", padding:"13px 15px", borderBottom:index < planoAcao.length - 1 ? `1px solid ${T.brd}` : "none" }}>
              <span style={{ width:24, height:24, borderRadius:6, background:T.surf, border:`1px solid ${T.brd}`, display:"grid", placeItems:"center", color:T.blue2, fontWeight:900, fontSize:11 }}>{index + 1}</span>
              <div>
                <div style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.decisao}</div>
                <div style={{ color:T.muted, fontSize:10, marginTop:2 }}>{item.dono}</div>
              </div>
              <div style={{ color:T.sub, fontSize:11 }}>{item.impacto}</div>
              <div style={{ color:T.blue2, fontSize:11, fontWeight:800 }}>{item.prazo}</div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
