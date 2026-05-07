export const GRUPO_PRINCIPAL = {
  id: "luniq-inteligencia-financeira",
  nome: "Luniq Inteligência Financeira",
  subtitulo: "Inteligência financeira para decisões de caixa, resultado e crescimento",
};

export const EMPRESAS = [
  {
    id: "luniq-demo",
    nome: "Empresa Demo",
    apelido: "LI",
    descricao: "Portal consultivo de inteligência financeira Luniq",
    status: "Demo",
    cor: "#2fb7c6",
    gradiente: "linear-gradient(135deg,#17191f,#f59e0b)",
    anoBase: 2026,
  },
  {
    id: "cliente-growth",
    nome: "Cliente Growth",
    apelido: "CG",
    descricao: "Ambiente genérico para simulação comercial",
    status: "Demo",
    cor: "#f59e0b",
    gradiente: "linear-gradient(135deg,#17191f,#f59e0b)",
    anoBase: 2026,
  },
];

export const DEFAULT_EMPRESA_ID = EMPRESAS[0].id;

export function getEmpresaById(id) {
  return EMPRESAS.find(empresa => empresa.id === id) || EMPRESAS[0];
}
