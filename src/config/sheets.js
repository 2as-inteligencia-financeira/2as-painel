export const SHEET_KEYS = Object.freeze([
  "historico",
  "fechamento_semanal",
  "entradas10d",
  "contas_pagar",
  "contas_pagar_composicao",
  "contas_vencidas",
  "faturas_historico",
  "runway",
  "saldos",
  "tabela_auxiliar",
  "tabela_resumo",
  "orc_areas",
  "despesas_historico",
  "aportes_mario",
  "orc_base",
  "base_dre",
  "dre_2026",
  "dre_2024_2025",
  "cancelamentos_solicitacoes",
  "cancelamentos_vendas",
  "cancelamentos_competencia",
  "professores_lancamentos",
  "academico_video",
  "academico_material_escrito",
  "academico_resultado_material",
  "academico_resultado_gestao",
  "academico_resultado_exclusivos",
  "academico_video_marketing",
  "academico_video_2025",
  "academico_material_escrito_2025",
  "academico_video_2024",
  "academico_material_escrito_2024",
  "professores_lancamentos_2025",
  "professores_lancamentos_2024",
  "chargebacks",
  "chargebacks_indicadores",
  "academico_franquia_2024",
]);

export const OPTIONAL_SHEET_KEYS = new Set([
  "contas_pagar_composicao",
  "academico_video_marketing",
  "academico_video_2025",
  "academico_material_escrito_2025",
  "academico_material_escrito_2024",
  "academico_franquia_2024",
  "professores_lancamentos_2025",
  "professores_lancamentos_2024",
  "chargebacks",
  "chargebacks_indicadores",
  "dre_2024_2025",
]);

export const DYNAMIC_HEADER_MARKER = Object.freeze({
  contas_pagar: "DATA_VENCIMENTO",
  contas_pagar_composicao: "DATA_VENCIMENTO",
  contas_vencidas: "DATA_VENCIMENTO",
  faturas_historico: "DATA_PAGAMENTO",
  despesas_historico: "DATA_PAGAMENTO",
});

export const DYNAMIC_HEADER_KEYS = new Set(Object.keys(DYNAMIC_HEADER_MARKER));
export const WIDE_DRE_KEYS = new Set(["dre_2026", "dre_2024_2025"]);
export const CLIENT_OPTIONAL_SHEETS = new Set(["chargebacks", "chargebacks_indicadores", "dre_2024_2025"]);

export const URLS = Object.freeze(
  SHEET_KEYS.reduce((acc, key) => {
    acc[key] = `/api/sheets/${key}`;
    return acc;
  }, {})
);
