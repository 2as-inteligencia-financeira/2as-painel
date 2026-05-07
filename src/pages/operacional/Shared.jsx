import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { CLIENT_OPTIONAL_SHEETS } from "../../config/sheets";
import { T } from "../../theme";
import { Card, TipBRL } from "../../Ui";
import { money, AX, GRD } from "./sharedPrimitives";

// Sheets opcionais — erros nessas abas não bloqueiam a exibição do painel
export const OPTIONAL_SHEETS_CLIENT = CLIENT_OPTIONAL_SHEETS;

// ─── ESTADO DE CARREGAMENTO ───────────────────────────────────────────────────
export function LoadingState({ sheets }) {
  const loading = Object.values(sheets).some(s => s?.loading);
  const allErrors = Object.entries(sheets).filter(([, s]) => s?.error);
  const criticalErrors  = allErrors.filter(([k]) => !OPTIONAL_SHEETS_CLIENT.has(k));
  const optionalErrors  = allErrors.filter(([k]) =>  OPTIONAL_SHEETS_CLIENT.has(k));

  if (!loading && !criticalErrors.length && !optionalErrors.length) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {loading && !criticalErrors.length && (
        <Card style={{ padding:"8px 12px" }}>
          <div style={{ fontSize:11, color:T.muted }}>Carregando bases operacionais…</div>
        </Card>
      )}
      {criticalErrors.length > 0 && (
        <Card style={{ padding:"8px 12px", border:`1px solid ${T.red}44` }}>
          <div style={{ fontSize:11, color:T.red, fontWeight:600 }}>
            Falha ao carregar: {criticalErrors.map(([k]) => k).join(", ")}
          </div>
          <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>
            Verifique SHEETS_PRIVATE_SOURCES_JSON ou SHEET_ID_{criticalErrors[0]?.[0]?.toUpperCase()}.
          </div>
        </Card>
      )}
      {optionalErrors.length > 0 && (
        <Card style={{ padding:"7px 12px", border:`1px solid ${T.amb}33` }}>
          <div style={{ fontSize:10, color:T.amb }}>
            {optionalErrors.length} planilha{optionalErrors.length > 1 ? "s" : ""} histórica{optionalErrors.length > 1 ? "s" : ""} não carregada{optionalErrors.length > 1 ? "s" : ""} ({optionalErrors.map(([k]) => k).join(", ")}).
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── BAR SIMPLES ──────────────────────────────────────────────────────────────
export function SimpleBar({
  data,
  dataKey = "value",
  color = T.blue,
  height = 200,
  formatter = money,
  bottom = 0,
  xTickAngle = 0,
  xInterval,
  xTickFormatter,
}) {
  if (!data?.length)
    return <Card style={{ padding:24, textAlign:"center", fontSize:12, color:T.dim }}>Sem dados</Card>;
  const interval = xInterval ?? Math.max(Math.floor(data.length / 14), 0);
  return (
    <Card style={{ padding:"15px 16px" }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top:8, right:4, bottom, left:0 }}>
          {GRD}
          <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false}
            interval={interval}
            angle={xTickAngle}
            textAnchor={xTickAngle ? "end" : "middle"}
            height={xTickAngle ? bottom : undefined}
            tickFormatter={xTickFormatter} />
          <YAxis tickFormatter={formatter} tick={AX} axisLine={false} tickLine={false} width={72} />
          <Tooltip content={<TipBRL formatter={formatter} />} />
          <Bar dataKey={dataKey} radius={[3,3,0,0]} maxBarSize={34}>
            {data.map((_, i) => <Cell key={i} fill={Array.isArray(color) ? color[i % color.length] : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
