import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import { T, CA } from "../theme";
import { Card, TipBRL } from "../Ui";
import { fmt } from "../hooks/useSheets";
import { useActiveEmpresaId } from "../hooks/useActiveEmpresaId";
import { buildFinancialIntelligence } from "../data/financialIntelligenceDemo";
import { MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";

const pct = value => `${Number(value || 0).toFixed(1)}%`;

function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.brd2}`, borderRadius:8, padding:"9px 12px", fontSize:11 }}>
      <div style={{ color:T.sub, fontWeight:800, marginBottom:5 }}>{label}</div>
      {payload.map(item => (
        <div key={item.dataKey} style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
          <span style={{ color:T.muted }}>{item.name}</span>
          <span style={{ color:item.color || T.txt, fontWeight:800 }}>{Math.round(item.value)}d</span>
        </div>
      ))}
    </div>
  );
}

export default function CicloFinanceiro() {
  const empresaId = useActiveEmpresaId();
  const model = useMemo(() => buildFinancialIntelligence(empresaId), [empresaId]);
  const { kpis, meses, fluxo } = model;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Ciclo Financeiro"
        title="Capital de giro, prazos e liquidez conectados ao resultado."
        right={
          <Card style={{ padding:16 }}>
            <SectionHeader title="Diagnóstico" badge="demo" />
            <div style={{ color:T.sub, fontSize:12, lineHeight:1.55 }}>
              O ciclo de caixa está positivo em {kpis.cicloCaixa} dias. A prioridade é encurtar recebimento, alongar pagamento saudável e proteger runway sem comprometer margem.
            </div>
          </Card>
        }
      >
        Esta visão mostra como PMR, PMP, caixa e capital de giro se comportam mês a mês, permitindo transformar prazo financeiro em decisão de crescimento.
      </ProductHero>

      <div className="intel-grid-4">
        <MetricTile label="PMR médio" value={`${kpis.pmr}d`} sub="Recebimento médio" color={T.blue2} />
        <MetricTile label="PMP médio" value={`${kpis.pmp}d`} sub="Pagamento médio" color={T.amb} />
        <MetricTile label="Ciclo de caixa" value={`${kpis.cicloCaixa}d`} sub="PMR - PMP" color={kpis.cicloCaixa <= 0 ? T.grn : T.red} />
        <MetricTile label="Capital de giro" value={fmt.brlk(kpis.capitalGiro)} sub="Necessidade estimada" color={T.purp} />
      </div>

      <div className="intel-grid-2">
        <Card style={{ padding:15 }}>
          <SectionHeader title="PMR, PMP e Ciclo de Caixa" badge={model.meta.period} />
          <div style={{ height:280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={meses} margin={{ top:8, right:12, bottom:0, left:0 }}>
                <CartesianGrid stroke={CA.grid} vertical={false} />
                <XAxis dataKey="mes" tick={{ fill:T.dim, fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} width={38} />
                <Tooltip content={<DayTooltip />} />
                <Line dataKey="pmr" name="PMR" stroke={T.blue2} strokeWidth={2.4} dot={{ r:3, fill:T.blue2 }} />
                <Line dataKey="pmp" name="PMP" stroke={T.amb} strokeWidth={2.4} dot={{ r:3, fill:T.amb }} />
                <Area dataKey="cicloCaixa" name="Ciclo de caixa" stroke={T.purp} fill="rgba(47,183,198,0.14)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ padding:15 }}>
          <SectionHeader title="Efeito no Caixa Projetado" badge="runway" />
          <div style={{ height:280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxo} margin={{ top:8, right:12, bottom:0, left:0 }}>
                <CartesianGrid stroke={CA.grid} vertical={false} />
                <XAxis dataKey="periodo" tick={{ fill:T.dim, fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:T.dim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={fmt.brlk} width={62} />
                <Tooltip content={<TipBRL />} />
                <Area dataKey="saldo" name="Saldo projetado" stroke={T.blue2} fill="rgba(245,158,11,0.16)" strokeWidth={2.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card style={{ padding:16 }}>
        <SectionHeader title="Alavancas de Decisão" badge="padrão de mercado" />
        <div className="intel-grid-3">
          <MetricTile label="Cobrança" value="-3d PMR" sub="Régua ativa e priorização de clientes com maior saldo." color={T.grn} />
          <MetricTile label="Fornecedores" value="+2d PMP" sub="Negociação sem gerar vencidos críticos." color={T.amb} />
          <MetricTile label="Runway" value={pct(11.8)} sub="Ganho potencial no caixa projetado de 60 dias." color={T.purp} />
        </div>
      </Card>
    </div>
  );
}
