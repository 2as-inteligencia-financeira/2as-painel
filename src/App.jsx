import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { initSessionFromUrl, clearAuth, onAuthChange } from "./auth";
import { DEFAULT_EMPRESA_ID, EMPRESAS, GRUPO_PRINCIPAL, getEmpresaById } from "./empresas/luniq-inteligencia-financeira/empresas";
import { getActiveEmpresaId, hasSelectedEmpresa, onActiveEmpresaChange, setActiveEmpresaId } from "./empresas/luniq-inteligencia-financeira/empresaAtiva";
import { prefetchSheets } from "./hooks/useSheets";
import { applyThemeMode, getInitialThemeMode, T } from "./theme";
import SidebarRouteItem from "./components/SidebarRouteItem.jsx";

const SIDEBAR_W = 246;

function LogoLuniq({ size = 40, minimal = false, onlyL = false }) {
  const light = T.mode === "light";
  const uniqColor = light ? "#0a0a0a" : "#ffffff";
  const wm = { fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", fontSize:size, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 };
  if (onlyL) return <span style={{ ...wm, color:"#f59e0b" }}>L</span>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap: size * 0.16 }}>
      <div style={{ display:"flex", alignItems:"baseline", lineHeight:1 }}>
        <span style={{ ...wm, color:"#f59e0b" }}>L</span>
        <span style={{ ...wm, color: uniqColor }}>UNIQ</span>
      </div>
      {!minimal && <div style={{ height:".75px", background: light ? "#d8d8d2" : "#1c1c1c", width:"100%" }} />}
      {!minimal && <span style={{ fontFamily:"'DM Mono',monospace", fontSize: size * 0.175, letterSpacing:".22em", color: light ? "#aaaaaa" : "#444444", textTransform:"uppercase" }}>INTELIGENCIA FINANCEIRA</span>}
    </div>
  );
}

const lazyWithPreload = (loader) => {
  const Component = lazy(loader);
  Component.preload = loader;
  return Component;
};

const Home                 = lazyWithPreload(() => import("./pages/Home"));
const SistemaLuniq         = lazyWithPreload(() => import("./pages/SistemaLuniq"));
const ConexoesFinanceiras  = lazyWithPreload(() => import("./pages/ConexoesFinanceiras"));
const CicloFinanceiro      = lazyWithPreload(() => import("./pages/CicloFinanceiro"));
const FluxoHistorico       = lazyWithPreload(() => import("./pages/FluxoHistorico"));
const FluxoProjetado       = lazyWithPreload(() => import("./pages/FluxoProjetado"));
const FluxoProjetadoLabs   = lazyWithPreload(() => import("./pages/FluxoProjetadoLabs"));
const ContasPagar          = lazyWithPreload(() => import("./pages/ContasPagar"));
const ContasPagarLabs      = lazyWithPreload(() => import("./pages/ContasPagarLabs"));
const ContasPagas          = lazyWithPreload(() => import("./pages/ContasPagas"));
const ContasPagasLabs      = lazyWithPreload(() => import("./pages/ContasPagasLabs"));
const Orcamento            = lazyWithPreload(() => import("./pages/Orcamento"));
const DRE                  = lazyWithPreload(() => import("./pages/Dre"));
const CancelamentosPage    = lazyWithPreload(() => import("./pages/operacional/Cancelamentos"));
const ChargebacksPage      = lazyWithPreload(() => import("./pages/operacional/Chargebacks"));
const Relatorio            = lazyWithPreload(() => import("./pages/Relatorio"));

// ─── ESTRUTURA CONCEITUAL LUNIQ ────────────────────────────────────────────────
// Seções representam a jornada de inteligência financeira do painel.
const SECOES = [
  {
    id:    "executivo",
    label: "Executivo",
    desc:  "Leitura executiva e prioridades",
    rotas: [
      { id:"home",          label:"Resumo Executivo", icon:"⌂", Component:Home },
    ],
  },
  {
    id:    "inteligencia-luniq",
    label: "Inteligência Luniq",
    desc:  "Metodologia, explicadores e benchmark",
    rotas: [
      { id:"sistema-luniq", label:"Metodologia Luniq",  icon:"◎", Component:SistemaLuniq },
    ],
  },
  {
    id:    "integracoes",
    label: "Integrações",
    desc:  "Fontes, conectores e pré-configurações",
    rotas: [
      { id:"conexoes-financeiras", label:"Conexões Financeiras", source:"Pré-config", icon:"◇", Component:ConexoesFinanceiras },
    ],
  },
  {
    id:    "liquidez",
    label: "Liquidez",
    desc:  "Monitoramento de caixa e fluxo",
    rotas: [
      { id:"fluxo-projetado", label:"Fluxo Projetado", source:"Conectado", icon:"↗", Component:FluxoProjetado },
      { id:"fluxo-projetado-labs", label:"Fluxo API", source:"Integração", icon:"⋯", Component:FluxoProjetadoLabs },
      { id:"fluxo-historico", label:"Fluxo Histórico",  icon:"≋", Component:FluxoHistorico },
    ],
  },
  {
    id:    "performance",
    label: "Performance",
    desc:  "Resultado, orçamento e margem",
    rotas: [
      { id:"orcamento", label:"Orçamento", icon:"◫", Component:Orcamento },
      { id:"dre",       label:"DRE",       icon:"Σ", Component:DRE },
    ],
  },
  {
    id:    "ciclo-financeiro",
    label: "Ciclo Financeiro",
    desc:  "PMR, PMP e capital de giro",
    rotas: [
      { id:"ciclo-financeiro", label:"Ciclo Financeiro", icon:"◌", Component:CicloFinanceiro },
    ],
  },
  {
    id:    "governanca",
    label: "Governança",
    desc:  "Controle, obrigações e recorrência",
    rotas: [
      { id:"contas-pagar",  label:"Contas a Pagar", source:"Conectado", icon:"!", Component:ContasPagar },
      { id:"contas-pagar-labs", label:"Contas API", source:"Integração", icon:"⋯", Component:ContasPagarLabs },
      { id:"contas-pagas",  label:"Contas Pagas", source:"Conectado", icon:"✓", Component:ContasPagas },
      { id:"contas-pagas-labs",  label:"Pagas API", source:"Integração", icon:"⋯", Component:ContasPagasLabs },
    ],
  },
  {
    id:    "operacao",
    label: "Riscos Operacionais",
    desc:  "Receita protegida e disputas",
    rotas: [
      { id:"op-cancelamentos", label:"Cancelamentos", icon:"↩", Component:CancelamentosPage, sheetKeys:["cancelamentos_solicitacoes", "cancelamentos_vendas", "cancelamentos_competencia"] },
      { id:"op-chargebacks",   label:"Chargebacks",   icon:"⚡", Component:ChargebacksPage, sheetKeys:["chargebacks", "chargebacks_indicadores"] },
    ],
  },
  {
    id:    "relatorios",
    label: "Relatórios",
    desc:  "Consolidação executiva e relatórios",
    rotas: [
      { id:"relatorio", label:"Relatório Financeiro", icon:"□", Component:Relatorio },
    ],
  },
];

// Lista plana derivada das seções
const ROTAS = SECOES.flatMap(s => s.rotas);
const DEFAULT_FAVORITES = ["home", "sistema-luniq", "conexoes-financeiras", "fluxo-projetado", "ciclo-financeiro", "relatorio"];

const normalizeSearch = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const readStoredList = (key, fallback = []) => {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(id => ROTAS.some(r => r.id === id)) : fallback;
  } catch {
    return fallback;
  }
};

const readStoredObject = (key, fallback = {}) => {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const routeSearchText = route => normalizeSearch(`${route.label} ${route.source || ""} ${route.id}`);
const DEFAULT_ROUTE = "home";

function getRouteFromUrl() {
  if (typeof window === "undefined") return DEFAULT_ROUTE;
  const url = new URL(window.location.href);
  const route = (url.searchParams.get("view") || "").trim();
  return route || DEFAULT_ROUTE;
}

function ensureKnownRoute(route) {
  return ROTAS.some(r => r.id === route) ? route : DEFAULT_ROUTE;
}

function syncRouteInUrl(route) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("view", route);
  window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

function PageLoader() {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.brd}`, borderRadius:4, padding:18, color:T.muted, fontSize:12 }}>
      Carregando painel...
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError("E-mail ou senha inválidos."); return; }
      onLogin(data.session);
    } catch {
      setError("Não foi possível validar o acesso agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.txt, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <form onSubmit={submit} style={{ width:"100%", maxWidth:360, background:T.surf, border:`1px solid ${T.brd}`, borderRadius:4, padding:24, boxShadow:"0 18px 50px rgba(0,0,0,0.22)" }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ marginBottom:18 }}>
            <LogoLuniq size={36} />
          </div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:"0 0 6px", color:T.txt }}>{GRUPO_PRINCIPAL.nome}</h1>
          <p style={{ fontSize:12, color:T.muted, margin:0, lineHeight:1.45 }}>Acesso restrito ao painel de inteligência financeira.</p>
        </div>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.sub, marginBottom:7 }}>E-mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username"
          style={{ width:"100%", boxSizing:"border-box", height:40, borderRadius:4, border:`1px solid ${T.brd2}`, background:T.card, color:T.txt, padding:"0 11px", fontFamily:"inherit", fontSize:13, marginBottom:14 }} />
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.sub, marginBottom:7 }}>Senha</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password"
          style={{ width:"100%", boxSizing:"border-box", height:40, borderRadius:4, border:`1px solid ${T.brd2}`, background:T.card, color:T.txt, padding:"0 11px", fontFamily:"inherit", fontSize:13, marginBottom:12 }} />
        {error && <div style={{ color:T.red, fontSize:12, marginBottom:12 }}>{error}</div>}
        <button type="submit" disabled={loading || !email.trim() || !password}
          style={{ width:"100%", height:40, border:0, borderRadius:4, background:loading ? T.brd : T.blue, color: loading ? T.muted : "#0a0a0a", fontFamily:"inherit", fontSize:13, fontWeight:800, letterSpacing:".03em", cursor:loading ? "wait" : "pointer" }}>
          {loading ? "Validando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function EmpresaSelector({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.txt, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:760 }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ marginBottom:20 }}><LogoLuniq size={48} /></div>
          <div style={{ fontSize:10, color:T.blue2, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{GRUPO_PRINCIPAL.subtitulo}</div>
          <h1 style={{ fontSize:24, fontWeight:700, margin:"0 0 6px", color:T.txt }}>{GRUPO_PRINCIPAL.nome}</h1>
          <p style={{ fontSize:13, color:T.muted, margin:0 }}>Selecione o ambiente de análise que deseja acessar.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:12 }}>
          {EMPRESAS.map(empresa => (
            <button
              key={empresa.id}
              type="button"
              onClick={() => onSelect(empresa.id)}
              style={{ textAlign:"left", background:T.surf, border:`1px solid ${T.brd}`, borderRadius:4, padding:16, cursor:"pointer", color:T.txt, fontFamily:"inherit", boxShadow:"0 14px 34px rgba(0,0,0,0.16)" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:38, height:38, borderRadius:4, background:empresa.gradiente, border:`1px solid ${T.brd2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{empresa.apelido}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:T.txt, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{empresa.nome}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{empresa.descricao}</div>
                </div>
              </div>
              {empresa.resumoPainel && (
                <div style={{ fontSize:11, color:T.sub, lineHeight:1.5, marginBottom:12 }}>
                  {empresa.resumoPainel}
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${T.brd}`, paddingTop:10, fontSize:10, color:empresa.cor || T.dim, textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:700 }}>
                <span>{empresa.status}</span>
                <span style={{ color:T.dim, fontWeight:500 }}>Acessar →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [auth,          setAuth]          = useState(undefined); // undefined = carregando
  const [empresaId,     setEmpresaId]     = useState(() => hasSelectedEmpresa() ? getActiveEmpresaId() : null);
  const [rota,          setRota]          = useState(() => ensureKnownRoute(getRouteFromUrl()));
  const [sidebar,       setSidebar]       = useState(() => window.localStorage.getItem("painel-sidebar") !== "closed");
  const [tema,          setTema]          = useState(() => applyThemeMode(getInitialThemeMode()));
  const [menuBusca,     setMenuBusca]     = useState("");
  const [favoritos,     setFavoritos]     = useState(() => readStoredList("painel-menu-favorites", DEFAULT_FAVORITES));
  const [secoesAbertas, setSecoesAbertas] = useState(() => readStoredObject("painel-menu-sections", {}));

  const rotaAtiva = ROTAS.find(r => r.id === rota) || ROTAS[0];
  const secaoAtiva = SECOES.find(s => s.rotas.some(r => r.id === rota)) || SECOES[0];
  const empresaAtiva = empresaId ? getEmpresaById(empresaId) : null;
  const ActivePage = rotaAtiva.Component;
  const menuBuscaNorm = normalizeSearch(menuBusca);
  const rotasFiltradas = menuBuscaNorm
    ? ROTAS.filter(r => routeSearchText(r).includes(menuBuscaNorm))
    : [];
  const rotasFavoritas = favoritos.map(id => ROTAS.find(r => r.id === id)).filter(Boolean);
  // Função central de navegação
  const navigate = useCallback((id) => {
    if (!ROTAS.some(r => r.id === id)) return;
    setRota(id);
  }, []);

  const preloadRoute = useCallback((r) => {
    r.Component.preload?.();
    if (r.sheetKeys?.length) prefetchSheets(r.sheetKeys);
  }, []);

  // Inicializa sessão Supabase (inclui tokens vindos do hub via URL)
  useEffect(() => {
    initSessionFromUrl().then(() => {
      supabase.auth.getSession().then(({ data: { session } }) => setAuth(session))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session)
    })
    return () => subscription.unsubscribe()
  }, []);
  useEffect(() => onAuthChange(() => {}), []);
  useEffect(() => onActiveEmpresaChange(setEmpresaId), []);

  useEffect(() => {
    const handler = (e) => navigate(e.detail);
    window.addEventListener("painel:navigate", handler);
    return () => window.removeEventListener("painel:navigate", handler);
  }, [navigate]);

  useEffect(() => {
    syncRouteInUrl(rota);
  }, [rota]);

  const alternarTema = () => {
    const next = applyThemeMode(tema === "dark" ? "light" : "dark");
    window.localStorage.setItem("painel-theme", next);
    setTema(next);
  };

  const alternarSidebar = () => {
    setSidebar(prev => {
      const next = !prev;
      window.localStorage.setItem("painel-sidebar", next ? "open" : "closed");
      return next;
    });
  };

  const toggleFavorito = useCallback((id) => {
    setFavoritos(prev => {
      const next = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [id, ...prev].slice(0, 8);
      window.localStorage.setItem("painel-menu-favorites", JSON.stringify(next));
      return next;
    });
  }, []);

  const isSecaoAberta = useCallback((secao) => {
    if (secoesAbertas[secao.id] !== undefined) return secoesAbertas[secao.id] !== false;
    return true;
  }, [secoesAbertas]);

  const toggleSecao = useCallback((id) => {
    setSecoesAbertas(prev => {
      const next = { ...prev, [id]: prev[id] === false };
      window.localStorage.setItem("painel-menu-sections", JSON.stringify(next));
      return next;
    });
  }, []);

  const renderRouteItem = (r, { compact = false } = {}) => (
    <SidebarRouteItem
      key={r.id}
      r={r}
      ativo={rota === r.id}
      sidebar={sidebar}
      tema={tema}
      compact={compact}
      isFavorite={favoritos.includes(r.id)}
      onNavigate={navigate}
      onPreload={preloadRoute}
      onToggleFavorite={toggleFavorito}
    />
  );

  if (auth === undefined) return null; // carregando sessão
  if (!auth) return <Login onLogin={session => { setAuth(session); setEmpresaId(null); }} />;
  if (!empresaAtiva) return <EmpresaSelector onSelect={id => setEmpresaId(setActiveEmpresaId(id))} />;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.txt, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", display:"flex", flexDirection:"column" }}>

      {/* ── Topbar ── */}
      <div style={{ height:56, background:T.surf, borderBottom:`1px solid ${T.brd}`, display:"flex", alignItems:"center", padding:"0 20px", gap:16, position:"sticky", top:0, zIndex:200, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", minWidth: sidebar ? SIDEBAR_W : 48, overflow:"hidden", transition:"min-width 0.2s ease", flexShrink:0 }}>
          {sidebar
            ? <LogoLuniq size={22} minimal />
            : <LogoLuniq size={20} onlyL />
          }
        </div>

        <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, overflow:"hidden" }}>
          <span style={{ fontSize:9, color:T.blue2, textTransform:"uppercase", fontWeight:700, flexShrink:0, letterSpacing:".18em", fontFamily:"'DM Mono',monospace" }}>
            {secaoAtiva.label}
          </span>
          <span style={{ color:T.brd2, flexShrink:0 }}>·</span>
          <span style={{ fontSize:12, fontWeight:600, color:T.sub, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
            {rotaAtiva.label}
          </span>
        </div>

        <button onClick={alternarTema}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:4, border:`1px solid ${T.brd}`, background: tema === "light" ? "rgba(217,119,6,0.08)" : "rgba(245,158,11,0.10)", color:T.blue2, fontSize:11, fontWeight:700, letterSpacing:".04em", fontFamily:"inherit", whiteSpace:"nowrap", cursor:"pointer" }}>
          {tema === "dark" ? "☀ Claro" : "◑ Escuro"}
        </button>

        <select
          value={empresaAtiva.id}
          onChange={event => setEmpresaId(setActiveEmpresaId(event.target.value))}
          aria-label="Selecionar empresa"
          style={{ height:32, borderRadius:4, border:`1px solid ${T.brd}`, background:T.card, color:T.sub, padding:"0 8px", fontFamily:"inherit", fontSize:11, fontWeight:600, maxWidth:190 }}
        >
          {EMPRESAS.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
        </select>

        <div style={{ fontSize:10, color:"#555", fontFamily:"'DM Mono', monospace", letterSpacing:".08em", whiteSpace:"nowrap" }}>
          {new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" })}
        </div>

        <button onClick={clearAuth}
          style={{ border:`1px solid ${T.brd}`, background:"transparent", color:T.muted, borderRadius:4, padding:"6px 10px", fontFamily:"inherit", fontSize:11, letterSpacing:".04em", cursor:"pointer" }}>
          Sair
        </button>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Sidebar com seções F1 ── */}
        <div style={{ width: sidebar ? SIDEBAR_W : 48, background:T.surf, borderRight:`1px solid ${T.brd}`, display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.18s ease", overflow:"hidden" }}>
          {/* Toggle collapse */}
          <button type="button" onClick={alternarSidebar}
            title={sidebar ? "Recolher painel lateral" : "Expandir painel lateral"}
            aria-label={sidebar ? "Recolher painel lateral" : "Expandir painel lateral"}
            style={{
              background: sidebar ? T.card : "transparent",
              border:"none",
              borderBottom:`1px solid ${T.brd}`,
              color:T.dim,
              padding: sidebar ? "10px 12px" : "11px 0",
              textAlign: sidebar ? "left" : "center",
              fontSize:11,
              fontWeight:600,
              flexShrink:0,
              cursor:"pointer",
              display:"flex",
              alignItems:"center",
              justifyContent: sidebar ? "space-between" : "center",
              gap:10,
              fontFamily:"inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.background = sidebar ? (tema === "light" ? "rgba(217,119,6,0.07)" : "rgba(255,255,255,0.04)") : "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.dim; e.currentTarget.style.background = sidebar ? T.card : "transparent"; }}>
            {sidebar ? (
              <>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
                    <rect x="4" y="5" width="6" height="14" rx="1" />
                    <rect x="14" y="5" width="6" height="10" rx="1" />
                  </svg>
                  <span>Menu</span>
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:T.dim, letterSpacing:"0.06em" }}>RECOLHER</span>
              </>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
                <rect x="4" y="5" width="6" height="14" rx="1" />
                <rect x="14" y="5" width="6" height="10" rx="1" />
              </svg>
            )}
          </button>

          <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
            {sidebar && (
              <div style={{ padding:"8px 10px 6px" }}>
                <input
                  type="search"
                  value={menuBusca}
                  onChange={e => setMenuBusca(e.target.value)}
                  placeholder="Buscar tela..."
                  style={{
                    width:"100%",
                    height:30,
                    borderRadius:4,
                    border:`1px solid ${T.brd}`,
                    background:T.card,
                    color:T.txt,
                    padding:"0 9px",
                    fontSize:11,
                    fontFamily:"inherit",
                    outline:"none",
                  }}
                />
              </div>
            )}

            {sidebar && menuBuscaNorm && (
              <div>
                <div style={{ padding:"6px 12px 4px", fontSize:8, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Resultados
                </div>
                {rotasFiltradas.length
                  ? rotasFiltradas.map(r => renderRouteItem(r, { compact:true }))
                  : <div style={{ padding:"10px 14px", fontSize:11, color:T.dim }}>Nenhuma tela encontrada.</div>}
              </div>
            )}

            {sidebar && !menuBuscaNorm && rotasFavoritas.length > 0 && (
              <div>
                <div style={{ padding:"6px 12px 4px", display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:8, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Favoritos</span>
                  <div style={{ flex:1, height:1, background:T.brd }} />
                </div>
                {rotasFavoritas.map(r => renderRouteItem(r, { compact:true }))}
              </div>
            )}

            {!menuBuscaNorm && SECOES.map(secao => {
              const aberta = isSecaoAberta(secao);
              return (
              <div key={secao.id}>
                {sidebar && (
                  <button
                    type="button"
                    onClick={() => toggleSecao(secao.id)}
                    aria-expanded={aberta}
                    title={aberta ? `Recolher: ${secao.label}` : `Expandir: ${secao.label}`}
                    style={{
                      width:"calc(100% - 16px)",
                      margin:"2px 8px 0",
                      padding:"8px 8px 8px 6px",
                      display:"flex",
                      alignItems:"center",
                      gap:8,
                      border:`1px solid ${aberta ? T.brd2 : "transparent"}`,
                      borderRadius:4,
                      background: aberta ? (tema === "light" ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.03)") : "transparent",
                      color:T.dim,
                      cursor:"pointer",
                      fontFamily:"inherit",
                      boxSizing:"border-box",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.brd2; }}
                    onMouseLeave={e => { e.currentTarget.style.color = T.dim; e.currentTarget.style.borderColor = aberta ? T.brd2 : "transparent"; }}
                  >
                    <span style={{
                      flexShrink:0, width:22, height:22, borderRadius:3,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background: tema === "light" ? "rgba(217,119,6,0.1)" : T.card,
                      border:`1px solid ${T.brd}`,
                      color:T.blue2, fontSize:11, fontWeight:700,
                    }}>{aberta ? "−" : "+"}</span>
                    <span style={{ flex:1, minWidth:0, textAlign:"left" }}>
                      <span style={{ display:"block", fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:T.dim }}>
                        {aberta ? "Recolher" : "Expandir"}
                      </span>
                      <span style={{ display:"block", fontSize:10, fontWeight:700, color:T.sub, marginTop:2, lineHeight:1.2 }}>
                        {secao.label}
                      </span>
                    </span>
                  </button>
                )}
                {!sidebar && secao !== SECOES[0] && (
                  <div style={{ height:1, background:T.brd, margin:"6px 10px" }} />
                )}

                {(!sidebar || aberta) && secao.rotas.map(r => renderRouteItem(r))}
              </div>
              );
            })}
          </div>

          {/* Rodapé da sidebar */}
          {sidebar && (
            <div style={{ padding:"8px 12px", borderTop:`1px solid ${T.brd}`, flexShrink:0 }}>
              <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:"'DM Mono',monospace" }}>
                {GRUPO_PRINCIPAL.nome} · {empresaAtiva.anoBase}
              </div>
            </div>
          )}
        </div>

        {/* ── Conteúdo principal ── */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
          <div key={rotaAtiva.id}
            style={{
              padding:"24px 28px",
              minHeight:"100%",
            }}>
            {/* Cabeçalho da página */}
            <div style={{ marginBottom:22, paddingBottom:18, borderBottom:`1px solid ${T.brd}` }}>
              <h1 style={{ fontSize:20, fontWeight:800, margin:0, color:T.txt, letterSpacing:"-.025em", lineHeight:1.15 }}>{rotaAtiva.label}</h1>
              <p style={{ fontSize:10, color:"#555", marginTop:5, fontFamily:"'DM Mono',monospace", letterSpacing:".1em", textTransform:"uppercase" }}>
                {secaoAtiva.label} · {empresaAtiva.nome} · {empresaAtiva.anoBase}
              </p>
            </div>
            <Suspense fallback={<PageLoader />}>
              <ActivePage />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
