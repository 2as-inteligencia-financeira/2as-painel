import { T, MONO } from "../theme";

export default function ExecutiveAlerts({ items = [] }) {
  const visible = items.filter(Boolean).slice(0, 2);
  if (!visible.length) return null;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:10 }}>
      {visible.map((item, index) => {
        const color = item.color || T.blue2;
        return (
          <div key={`${item.title}-${index}`}
            style={{ padding:"12px 14px", borderRadius:8, border:`1px solid ${color}44`, borderLeft:`3px solid ${color}`, background:item.bg || `${color}12` }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:9, color, textTransform:"uppercase", fontWeight:700 }}>{item.status || "sinal"}</span>
              {item.value && <span style={{ fontSize:12, color, fontFamily:MONO, fontWeight:700 }}>{item.value}</span>}
            </div>
            <div style={{ fontSize:13, color:T.txt, fontWeight:700, lineHeight:1.25 }}>{item.title}</div>
            {item.text && <div style={{ fontSize:11, color:T.sub, marginTop:5, lineHeight:1.4 }}>{item.text}</div>}
          </div>
        );
      })}
    </div>
  );
}
