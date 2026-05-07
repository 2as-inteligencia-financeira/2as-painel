import { T, MONO } from "../theme";
import { Card } from "../Ui";
import { fmt } from "../hooks/useSheets";
import { buildFinancialIntelligence } from "../data/financialIntelligenceDemo";
import { DataBadge, MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";

const model = buildFinancialIntelligence();
const pct = value => `${Number(value || 0).toFixed(1)}%`;
const statusColor = status => status === "Concluído" ? T.grn : status === "Em andamento" ? T.amb : T.blue2;

export default function Relatorio() {
  const { kpis, prioridades, planoAcao } = model;
  const blocosRelatorio = [
    { nome:"Resumo Executivo", status:"Concluído", desc:"Leitura do caixa, resultado, riscos e decisões prioritárias." },
    { nome:"Diagnóstico de Liquidez", status:"Concluído", desc:"Runway, picos de saída, menor saldo e proteção de caixa." },
    { nome:"DRE Gerencial", status:"Concluído", desc:"Receita, margem de contribuição, EBITDA e resultado líquido." },
    { nome:"Orçamento vs Realizado", status:"Em andamento", desc:"Principais desvios e plano de correção por alavanca." },
    { nome:"Plano de Ação", status:"Concluído", desc:"Responsáveis, decisões, impacto esperado e prazo de acompanhamento." },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Relatório Financeiro"
        title="Resumo técnico da posição financeira."
        right={
          <Card style={{ padding:16 }}>
            <SectionHeader title="Status do Relatório" badge="rotina" />
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <DataBadge label="Base demo" />
              <div style={{ color:T.sub, fontSize:12, lineHeight:1.5 }}>
                Consolidação para reunião de gestão, fechamento mensal e acompanhamento de ações.
              </div>
            </div>
          </Card>
        }
      >
        Consolida os principais números, sinais de atenção e ações abertas. A tela funciona como saída do sistema, não como página comercial.
      </ProductHero>

      <div className="intel-grid-4">
        <MetricTile label="Receita líquida" value={fmt.brlk(kpis.receitaLiquida)} sub={model.meta.period} />
        <MetricTile label="EBITDA" value={fmt.brlk(kpis.ebitda)} sub={pct(kpis.margemEbitdaPct)} color={kpis.ebitda >= 0 ? T.grn : T.red} />
        <MetricTile label="Runway" value={`${kpis.runwayDias} dias`} sub={`Saldo ${fmt.brlk(kpis.saldoAtual)}`} color={T.grn} />
        <MetricTile label="Risco operacional" value={fmt.brlk(kpis.riscoOperacional)} sub="Cancelamentos + chargebacks" color={T.amb} />
      </div>

      <div className="intel-grid-2">
        <Card style={{ padding:16 }}>
          <SectionHeader title="Leitura Executiva" badge="para reunião" />
          <div style={{ color:T.sub, fontSize:13, lineHeight:1.65 }}>
            A empresa apresenta receita acima do orçamento e EBITDA positivo, mas ainda precisa reduzir pressão de capital de giro e proteger receita líquida contra cancelamentos e chargebacks. O acompanhamento deve priorizar liquidez, performance e governança em uma rotina única de decisão.
          </div>
          <div style={{ display:"grid", gap:8, marginTop:14 }}>
            {prioridades.map(item => (
              <div key={item.titulo} style={{ padding:"10px 11px", border:`1px solid ${T.brd}`, borderRadius:8, background:T.surf }}>
                <div style={{ color:T.blue2, fontSize:9, fontWeight:900, textTransform:"uppercase" }}>{item.area}</div>
                <div style={{ color:T.txt, fontSize:12, fontWeight:800, marginTop:3 }}>{item.titulo}</div>
                <div style={{ color:T.muted, fontSize:10, marginTop:3 }}>{item.texto}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding:16 }}>
          <SectionHeader title="Blocos do Relatório" badge="estrutura" />
          <div style={{ display:"grid", gap:9 }}>
            {blocosRelatorio.map(item => (
              <div key={item.nome} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, padding:"11px 12px", borderRadius:8, border:`1px solid ${T.brd}`, background:T.surf }}>
                <div>
                  <div style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.nome}</div>
                  <div style={{ color:T.muted, fontSize:10, lineHeight:1.4, marginTop:3 }}>{item.desc}</div>
                </div>
                <span style={{ color:statusColor(item.status), fontSize:10, fontWeight:900, whiteSpace:"nowrap" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.brd}` }}>
          <SectionHeader title="Plano de Ação" badge="acompanhamento" />
        </div>
        {planoAcao.map((item, index) => (
          <div key={item.decisao} style={{ display:"grid", gridTemplateColumns:"42px 1fr 180px 140px", gap:12, alignItems:"center", padding:"13px 16px", borderBottom:index < planoAcao.length - 1 ? `1px solid ${T.brd}` : "none" }}>
            <span style={{ color:T.blue2, fontFamily:MONO, fontWeight:900 }}>0{index + 1}</span>
            <div>
              <div style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.decisao}</div>
              <div style={{ color:T.muted, fontSize:10 }}>{item.dono}</div>
            </div>
            <div style={{ color:T.sub, fontSize:11 }}>{item.impacto}</div>
            <div style={{ color:T.blue2, fontSize:11, fontWeight:800 }}>{item.prazo}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
