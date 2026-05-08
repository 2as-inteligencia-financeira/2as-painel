export const GRUPO_PRINCIPAL = {
  id: "luniq-inteligencia-financeira",
  nome: "2AS Inteligência Financeira",
  subtitulo: "Inteligência financeira para decisões de caixa, resultado e crescimento",
};

export const EMPRESAS = [
  {
    id: "demo-saudavel",
    nome: "Demo · Saúde Financeira",
    apelido: "S+",
    descricao: "Empresa rentável, runway confortável e operação sob controle",
    status: "Demo · Saudável",
    cor: "#22c55e",
    gradiente: "linear-gradient(135deg,#0f3a23,#22c55e)",
    anoBase: 2026,
    demo: true,
    perfilDemo: "saudavel",
    resumoPainel: "Runway acima de 120 dias, EBITDA crescente e margens estáveis.",
  },
  {
    id: "demo-atencao",
    nome: "Demo · Ponto de Atenção",
    apelido: "A!",
    descricao: "Sinais de pressão no caixa, margens encolhendo e vencidos crescendo",
    status: "Demo · Atenção",
    cor: "#f59e0b",
    gradiente: "linear-gradient(135deg,#3a2a08,#f59e0b)",
    anoBase: 2026,
    demo: true,
    perfilDemo: "atencao",
    resumoPainel: "Runway próximo de 45 dias, margem caindo e vencidos em alta.",
  },
  {
    id: "demo-crise",
    nome: "Demo · Crise Financeira",
    apelido: "C!",
    descricao: "Caixa crítico, vencidos acumulados e EBITDA negativo",
    status: "Demo · Crise",
    cor: "#ef4444",
    gradiente: "linear-gradient(135deg,#3a0e0e,#ef4444)",
    anoBase: 2026,
    demo: true,
    perfilDemo: "crise",
    resumoPainel: "Runway abaixo de 20 dias, prejuízo recorrente e dívida vencida elevada.",
  },
];

export const DEFAULT_EMPRESA_ID = EMPRESAS[0].id;

const EMPRESAS_INDEX = new Map(EMPRESAS.map(empresa => [empresa.id, empresa]));

const LEGACY_ALIASES = Object.freeze({
  "luniq-demo": "demo-saudavel",
  "luniq-inteligencia-financeira": "demo-saudavel",
  "cliente-growth": "demo-atencao",
});

export function resolveEmpresaId(id) {
  if (!id) return DEFAULT_EMPRESA_ID;
  const trimmed = String(id).trim();
  if (EMPRESAS_INDEX.has(trimmed)) return trimmed;
  return LEGACY_ALIASES[trimmed] || DEFAULT_EMPRESA_ID;
}

export function getEmpresaById(id) {
  const resolved = resolveEmpresaId(id);
  return EMPRESAS_INDEX.get(resolved) || EMPRESAS[0];
}

export function isEmpresaDemo(empresaOrId) {
  if (!empresaOrId) return false;
  const empresa = typeof empresaOrId === "string" ? getEmpresaById(empresaOrId) : empresaOrId;
  return Boolean(empresa?.demo);
}

export function getPerfilDemo(empresaOrId) {
  if (!empresaOrId) return null;
  const empresa = typeof empresaOrId === "string" ? getEmpresaById(empresaOrId) : empresaOrId;
  return empresa?.perfilDemo || null;
}
