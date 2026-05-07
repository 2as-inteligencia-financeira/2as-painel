import { useEffect, useState } from "react";
import { connectorReadiness, connectorStatus, financialConnectors } from "../data/connectorsCatalog";
import { T, MONO } from "../theme";
import { Card } from "../Ui";
import { DataBadge, MetricTile, ProductHero, SectionHeader } from "../components/IntelligenceProduct";

const statusTone = status => connectorStatus[status]?.tone || "blue";
const statusLabel = status => connectorStatus[status]?.label || "Mapeado";

function PillList({ title, items, tone = T.blue2 }) {
  return (
    <div>
      <div style={{ color:T.muted, fontSize:9, fontWeight:800, textTransform:"uppercase", marginBottom:7 }}>{title}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
        {items.map(item => (
          <span key={item} style={{ color:T.sub, border:`1px solid ${T.brd}`, background:T.surf, borderRadius:5, padding:"4px 7px", fontSize:10, lineHeight:1.2 }}>
            {item}
          </span>
        ))}
      </div>
      <div style={{ height:2, width:36, background:tone, borderRadius:2, marginTop:10, opacity:0.8 }} />
    </div>
  );
}

function ConnectorCard({ connector }) {
  const isConnected = connector.status === "connected";
  const accent = isConnected ? T.grn : T.blue2;

  return (
    <Card style={{ padding:15, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ width:32, height:32, borderRadius:7, background:T.surf, border:`1px solid ${T.brd2}`, display:"grid", placeItems:"center", overflow:"hidden", flexShrink:0 }}>
              <img
                src={connector.logoUrl}
                alt=""
                loading="lazy"
                style={{ width:22, height:22, objectFit:"contain", borderRadius:4 }}
              />
            </span>
            <div>
              <h3 style={{ margin:0, color:T.txt, fontSize:14, fontWeight:900 }}>{connector.name}</h3>
              <div style={{ color:T.dim, fontSize:10 }}>{connector.mode}</div>
            </div>
          </div>
          <p style={{ color:T.sub, fontSize:11, lineHeight:1.45, margin:0 }}>{connector.description}</p>
        </div>
        <DataBadge label={statusLabel(connector.status)} tone={statusTone(connector.status)} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:14 }}>
        <PillList title="Dados lidos" items={connector.entities} tone={accent} />
        <PillList title="Insights liberados" items={connector.insights} tone={T.purp} />
      </div>

      <div style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:7, padding:11 }}>
        <div style={{ color:T.muted, fontSize:9, fontWeight:800, textTransform:"uppercase", marginBottom:7 }}>Configuração prevista</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {connector.credentials.map(field => (
            <span key={field} style={{ color:T.blue2, background:"rgba(245,158,11,0.10)", border:`1px solid ${T.blue2}33`, borderRadius:5, padding:"4px 7px", fontSize:10, fontFamily:MONO }}>
              {field}
            </span>
          ))}
        </div>
      </div>

      {connector.templateMap && (
        <div style={{ background:"rgba(47,183,198,0.07)", border:`1px solid ${T.purp}33`, borderRadius:7, padding:11 }}>
          <div style={{ color:T.purp, fontSize:9, fontWeight:800, textTransform:"uppercase", marginBottom:8 }}>Mapeamento para planilha modelo</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {connector.templateMap.map(item => (
              <div key={item} style={{ display:"grid", gridTemplateColumns:"8px 1fr", gap:8, color:T.sub, fontSize:10, lineHeight:1.4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:T.purp, marginTop:5 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {connector.limitations.map(item => (
          <div key={item} style={{ display:"grid", gridTemplateColumns:"8px 1fr", gap:8, color:T.muted, fontSize:10, lineHeight:1.4 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:T.dim, marginTop:5 }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <a
        href={connector.docsUrl}
        target="_blank"
        rel="noreferrer"
        style={{ color:T.blue2, fontSize:10, fontWeight:800, textDecoration:"none", marginTop:"auto" }}
      >
        Documentação oficial
      </a>
    </Card>
  );
}

export default function ConexoesFinanceiras() {
  const [healthSummary, setHealthSummary] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(`/api/integrations/status?cb=${Date.now()}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(payload => {
        if (!mounted || !payload?.status) return;
        const connected = payload.status.filter(item => item.lastStatus === "success").length;
        setHealthSummary(`${connected}/${payload.status.length} conectores com sincronização recente`);
      })
      .catch(() => {
        if (!mounted) return;
        setHealthSummary("");
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:42 }}>
      <ProductHero
        eyebrow="Fontes de Dados"
        title="Conexões financeiras plugáveis"
        right={
          <Card style={{ padding:15 }}>
            <SectionHeader title="Contrato Luniq" badge="read-only" />
            <div style={{ color:T.sub, fontSize:11, lineHeight:1.45 }}>
              Cada ERP entra por um adapter, mas todos alimentam a mesma camada de inteligência: caixa, DRE, governança, comportamento e benchmark.
            </div>
          </Card>
        }
      >
        Escolha o sistema financeiro, veja quais dados a Luniq usará e quais análises serão liberadas. Nesta etapa, Granatum e Google Sheets API estão funcionais; Conta Azul, Omie e Nibo ficam mapeados para conexão futura.
      </ProductHero>

      <div className="intel-grid-3">
        {connectorReadiness.map(item => (
          <MetricTile key={item.label} label={item.label} value={item.value} sub={item.text} accent={T.blue2} color={item.value === "1" ? T.grn : T.txt} />
        ))}
      </div>
      {healthSummary && (
        <Card style={{ padding:"10px 14px" }}>
          <div style={{ fontSize:11, color:T.sub }}>
            Saúde de integrações: <strong>{healthSummary}</strong>
          </div>
        </Card>
      )}

      <section>
        <SectionHeader title="Sistemas mapeados" badge={`${financialConnectors.length} fontes`} />
        <div className="intel-grid-2">
          {financialConnectors.map(connector => (
            <ConnectorCard key={connector.id} connector={connector} />
          ))}
        </div>
      </section>
    </div>
  );
}
