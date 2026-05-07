import { T, MONO } from "../theme";

export const DataBadge = ({ label = "Base demo", tone = "blue" }) => {
  const colors = { blue:T.blue2, green:T.grn, amber:T.amb, red:T.red, cyan:T.purp };
  const color = colors[tone] || T.blue2;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 8px", border:`1px solid ${color}55`, borderRadius:3, color, background:`${color}14`, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:color }} />
      {label}
    </span>
  );
};

export const ProductHero = ({ eyebrow, title, children, right }) => (
  <section className="product-hero" style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:4, padding:14 }}>
    <div style={{ minWidth:0 }}>
      <div style={{ color:T.blue2, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".2em", marginBottom:6 }}>{eyebrow}</div>
      <h2 style={{ color:T.txt, fontSize:18, lineHeight:1.2, margin:"0 0 6px", fontWeight:800, letterSpacing:"-.02em" }}>{title}</h2>
      <p style={{ color:T.sub, fontSize:12, lineHeight:1.45, margin:0, maxWidth:860 }}>{children}</p>
    </div>
    {right}
  </section>
);

export const MetricTile = ({ label, value, sub, color = T.txt, accent = color }) => (
  <div style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:4, padding:"12px 13px", position:"relative", overflow:"hidden", minHeight:78 }}>
    <div style={{ position:"absolute", inset:"0 auto 0 0", width:3, background:accent }} />
    <div style={{ fontSize:9, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em", marginBottom:5 }}>{label}</div>
    <div style={{ color, fontFamily:MONO, fontWeight:800, fontSize:17, lineHeight:1.05 }}>{value}</div>
    {sub && <div style={{ color:"#777", fontSize:10, marginTop:5, lineHeight:1.3 }}>{sub}</div>}
  </div>
);

export const InsightCard = ({ area, nivel, title, children, color = T.blue2, onClick }) => {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        width:"100%",
        minHeight:112,
        background:T.card,
        border:`1px solid ${T.brd}`,
        borderLeft:`3px solid ${color}`,
        borderRadius:4,
        padding:"12px 13px",
        textAlign:"left",
        color:T.txt,
        fontFamily:"inherit",
        cursor:onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:7 }}>
        <span style={{ color, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em" }}>{area}</span>
        <span style={{ color:"#777", fontSize:10 }}>{nivel}</span>
      </div>
      <div style={{ color:T.txt, fontSize:12, fontWeight:800, lineHeight:1.3 }}>{title}</div>
      <div style={{ color:T.sub, fontSize:11, lineHeight:1.4, marginTop:6 }}>{children}</div>
    </Component>
  );
};

export const SectionHeader = ({ title, badge }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:10 }}>
    <h3 style={{ margin:0, color:T.txt, fontSize:13, fontWeight:800, letterSpacing:"-.015em" }}>{title}</h3>
    {badge && <span style={{ color:"#666", fontSize:9, fontFamily:MONO, letterSpacing:".1em", textTransform:"uppercase" }}>{badge}</span>}
  </div>
);

export const SourcePanel = ({ items }) => (
  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
    {items.map((item, index) => (
      <div key={item.label} style={{ background:T.surf, border:`1px solid ${T.brd}`, borderRadius:4, padding:"11px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
          <span style={{ width:20, height:20, borderRadius:3, background:index === 0 ? T.blue : index === 1 ? T.purp : T.grn, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900 }}>{index + 1}</span>
          <span style={{ color:T.txt, fontSize:12, fontWeight:800 }}>{item.label}</span>
        </div>
        <div style={{ color:T.muted, fontSize:10, lineHeight:1.4 }}>{item.text}</div>
      </div>
    ))}
  </div>
);
