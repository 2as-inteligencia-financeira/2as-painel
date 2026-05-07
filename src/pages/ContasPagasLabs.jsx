import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "../auth";
import { fmt, parseDate, toNum, useSheets } from "../hooks/useSheets";
import { T, MONO } from "../theme";
import { resolveCategory } from "../utils/categoryResolver";
import { useActiveEmpresaId } from "../hooks/useActiveEmpresaId";

function Card({ children, style = {} }) {
  return <div style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:8, ...style }}>{children}</div>;
}

function Kpi({ label, value, sub, color = T.txt }) {
  return (
    <Card style={{ padding:"14px 16px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:color }} />
      <div style={{ fontSize:9, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:18, color, fontFamily:MONO, fontWeight:600 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>{sub}</div>}
    </Card>
  );
}

function toInputDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfYear() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function sortByDateThenValue(rows = [], field = "DATA_PAGAMENTO") {
  return [...rows].sort((a, b) => {
    const da = String(a[field] || "");
    const db = String(b[field] || "");
    if (da !== db) return db.localeCompare(da);
    return (Number(b.VALOR_LIQUIDO || b.valor) || 0) - (Number(a.VALOR_LIQUIDO || a.valor) || 0);
  });
}

function metaValue(meta = [], label) {
  return toNum(meta.find(item => item.label === label)?.value);
}

function extractScriptRows(data, dataInicio, dataFim) {
  const ini = parseDate(dataInicio);
  const fim = parseDate(dataFim);
  const rows = (data?.data || [])
    .map(row => {
      const pago = parseDate(row["DATA_PAGAMENTO"] ?? row["PAGAMENTO"] ?? row["DATA"]);
      if (!pago) return null;
      return {
        DATA_PAGAMENTO: toInputDate(pago),
        FORNECEDOR: (row["FORNECEDOR"] || row["BANCO_ORIGEM"] || row["NOME"] || "Sem fornecedor").toString().trim(),
        CATEGORIA: resolveCategory(row),
        DESCRICAO: (row["DESCRICAO"] || row["DESCRIÇÃO"] || row["HISTORICO"] || "").toString().trim(),
        VALOR_LIQUIDO: Math.abs(toNum(row["VALOR_LIQUIDO"] ?? row["VALOR_BRUTO"] ?? row["VALOR"] ?? row["VALOR_PAGO"] ?? 0)),
        ID: String(row["ID"] || ""),
      };
    })
    .filter(Boolean)
    .filter(row => {
      const pago = parseDate(row.DATA_PAGAMENTO);
      if (!pago) return false;
      if (ini && pago < ini) return false;
      if (fim && pago > fim) return false;
      return row.VALOR_LIQUIDO > 0;
    });

  return sortByDateThenValue(rows);
}

function useGranatumContasPagasLabs(dataInicio, dataFim) {
  const empresaId = useActiveEmpresaId();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const params = new URLSearchParams({
          cb: String(Date.now()),
          dataInicio,
          dataFim,
          empresa: empresaId,
        });
        const response = await fetch(`/api/granatum/contas-pagas-labs?${params.toString()}`, {
          cache: "no-store",
          headers: getAuthHeaders(),
        });
        if (response.status === 401) throw new Error("Sessão expirada");
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
        if (!active) return;
        setState({ data: json, loading: false, error: null });
      } catch (error) {
        if (!active) return;
        setState(prev => ({ ...prev, loading: false, error: error?.message || "Erro ao carregar API Sistema" }));
      }
    };

    fetchData();
    return () => { active = false; };
  }, [dataFim, dataInicio, refreshKey, empresaId]);

  return {
    ...state,
    refresh: () => setRefreshKey(value => value + 1),
  };
}

function DiffLine({ label, scriptValue, granatumValue, money = true }) {
  const diff = granatumValue - scriptValue;
  const color = Math.abs(diff) < 0.005 ? T.grn : diff > 0 ? T.amb : T.red;
  const format = money ? fmt.brl : (value => String(value));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.brd}` }}>
      <span style={{ fontSize:11, color:T.sub }}>{label}</span>
      <span style={{ fontSize:11, color:T.muted, fontFamily:MONO }}>{format(scriptValue)}</span>
      <span style={{ fontSize:11, color:T.txt, fontFamily:MONO }}>{format(granatumValue)}</span>
      <span style={{ fontSize:11, color, fontFamily:MONO, fontWeight:600 }}>{format(diff)}</span>
    </div>
  );
}

export default function ContasPagasLabs() {
  const [dataInicio, setDataInicio] = useState(() => toInputDate(startOfYear()));
  const [dataFim, setDataFim] = useState(() => toInputDate(new Date()));
  const sheets = useSheets(["despesas_historico"]);
  const granatum = useGranatumContasPagasLabs(dataInicio, dataFim);

  const scriptRows = useMemo(
    () => extractScriptRows(sheets.despesas_historico.data, dataInicio, dataFim),
    [dataFim, dataInicio, sheets.despesas_historico.data]
  );

  const granatumRows = useMemo(
    () => sortByDateThenValue(granatum.data?.rows || []),
    [granatum.data]
  );

  const scriptTotal = useMemo(() => scriptRows.reduce((sum, row) => sum + toNum(row.VALOR_LIQUIDO), 0), [scriptRows]);
  const granatumTotal = useMemo(() => metaValue(granatum.data?.meta, "TOTAL_PAGO"), [granatum.data]);
  const scriptIds = useMemo(() => new Set(scriptRows.map(row => String(row.ID || "").trim()).filter(Boolean)), [scriptRows]);
  const granatumIds = useMemo(() => new Set(granatumRows.map(row => String(row.ID || "").trim()).filter(Boolean)), [granatumRows]);

  const comparativo = useMemo(() => {
    const comuns = [...granatumIds].filter(id => scriptIds.has(id)).length;
    const soGranatum = [...granatumIds].filter(id => !scriptIds.has(id)).length;
    const soScript = [...scriptIds].filter(id => !granatumIds.has(id)).length;
    return { comuns, soGranatum, soScript };
  }, [granatumIds, scriptIds]);

  const loading = sheets.despesas_historico.loading || granatum.loading;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, paddingBottom:48 }}>
      <Card style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
          />
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:T.surf, color:T.txt, outline:"none", fontSize:12 }}
          />
          <button
            onClick={() => { setDataInicio(toInputDate(startOfYear())); setDataFim(toInputDate(new Date())); }}
            style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:T.muted, fontSize:12, cursor:"pointer" }}
          >
            YTD
          </button>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:12 }}>
        <Kpi label="Script — Total" value={fmt.brl(scriptTotal)} sub={`${scriptRows.length} linhas`} color={T.blue2} />
        <Kpi label="Granatum — Total" value={fmt.brl(granatumTotal)} sub={granatum.data?.updatedAt || "sem leitura"} color={T.amb} />
        <Kpi label="IDs em comum" value={String(comparativo.comuns)} sub="comparação por ID" color={T.grn} />
        <Kpi label="Divergência de IDs" value={`${comparativo.soGranatum}/${comparativo.soScript}`} sub="Granatum / Script" color={T.red} />
      </div>

      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.txt, marginBottom:10 }}>Contas Pagas via API Sistema</div>
        <div style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>
          Essa visão compara a aba oficial de <strong style={{ color:T.sub }}>despesas_historico</strong> com a leitura direta da API do sistema
          usando apenas as contas pagadoras operacionais.
        </div>
        {granatum.data?.interval && (
          <div style={{ marginTop:10, fontSize:11, color:T.dim }}>
            Janela lida na API Sistema: {granatum.data.interval.inicio} até {granatum.data.interval.fim}
          </div>
        )}
        {loading && <div style={{ marginTop:10, fontSize:11, color:T.muted }}>Carregando comparação… na primeira leitura pode levar alguns segundos.</div>}
        {granatum.error && <div style={{ marginTop:10, fontSize:11, color:T.red }}>Erro API Sistema: {granatum.error}</div>}
        <div style={{ marginTop:12 }}>
          <button
            onClick={granatum.refresh}
            style={{ padding:"6px 10px", borderRadius:6, border:`1px solid ${T.brd}`, background:"transparent", color:T.sub, fontSize:11, cursor:"pointer" }}
          >
            Atualizar leitura
          </button>
        </div>
      </Card>

      <Card style={{ padding:"16px 18px" }}>
        <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Comparação de KPIs</div>
        <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:12, paddingBottom:8, borderBottom:`1px solid ${T.brd}` }}>
          {["Indicador", "Script Sheets", "API Sistema", "Diferença"].map(label => (
            <div key={label} style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600 }}>{label}</div>
          ))}
        </div>
        <DiffLine label="Total pago" scriptValue={scriptTotal} granatumValue={granatumTotal} />
        <DiffLine label="Qtd linhas" scriptValue={scriptRows.length} granatumValue={granatumRows.length} money={false} />
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card style={{ overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.blue2 }}>Script Sheets</span>
            <span style={{ fontSize:13, fontWeight:600, fontFamily:MONO, color:T.blue2 }}>{fmt.brl(scriptTotal)}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"96px minmax(200px,1fr) minmax(200px,1fr) 120px", gap:12, padding:"8px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            {["Pagamento", "Fornecedor", "Categoria", "Líquido"].map((h, i) => (
              <div key={h} style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, textAlign:i === 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {scriptRows.slice(0, 12).map((row, index) => (
            <div key={`${row.ID || index}`} style={{ display:"grid", gridTemplateColumns:"96px minmax(200px,1fr) minmax(200px,1fr) 120px", gap:12, padding:"9px 16px", borderBottom:`1px solid ${T.brd}` }}>
              <div style={{ fontSize:11, color:T.sub }}>{row.DATA_PAGAMENTO}</div>
              <div style={{ fontSize:11, color:T.txt }}>{row.FORNECEDOR || "Sem fornecedor"}</div>
              <div style={{ fontSize:11, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={row.CATEGORIA || ""}>{row.CATEGORIA || "-"}</div>
              <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>{fmt.brl(toNum(row.VALOR_LIQUIDO))}</div>
            </div>
          ))}
        </Card>

        <Card style={{ overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.amb }}>API Sistema</span>
            <span style={{ fontSize:13, fontWeight:600, fontFamily:MONO, color:T.amb }}>{fmt.brl(granatumTotal)}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"96px minmax(200px,1fr) minmax(200px,1fr) 120px", gap:12, padding:"8px 16px", borderBottom:`1px solid ${T.brd}`, background:T.surf }}>
            {["Pagamento", "Fornecedor", "Categoria", "Líquido"].map((h, i) => (
              <div key={h} style={{ fontSize:10, color:T.muted, textTransform:"uppercase", fontWeight:600, textAlign:i === 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {granatumRows.slice(0, 12).map((row, index) => (
            <div key={`${row.ID || index}`} style={{ display:"grid", gridTemplateColumns:"96px minmax(200px,1fr) minmax(200px,1fr) 120px", gap:12, padding:"9px 16px", borderBottom:`1px solid ${T.brd}` }}>
              <div style={{ fontSize:11, color:T.sub }}>{row.DATA_PAGAMENTO}</div>
              <div style={{ fontSize:11, color:T.txt }}>{row.FORNECEDOR || "Sem fornecedor"}</div>
              <div style={{ fontSize:11, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={row.CATEGORIA || row.CATEGORIA_ID || ""}>{row.CATEGORIA || row.CATEGORIA_ID || "-"}</div>
              <div style={{ fontSize:11, color:T.red, fontFamily:MONO, fontWeight:600, textAlign:"right" }}>{fmt.brl(toNum(row.VALOR_LIQUIDO))}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
