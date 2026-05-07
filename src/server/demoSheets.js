const DEMO_COMPANY_IDS = new Set(["luniq-demo", "luniq-inteligencia-financeira"]);

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows) {
  return rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

function emptyCsv(key) {
  if (key.includes("contas") || key.includes("despesas")) return "DATA_VENCIMENTO\n";
  return "label,value\n";
}

function contasHeader(meta = []) {
  return csv([
    ["Metrica", "Valor"],
    ...meta,
    ["DATA_VENCIMENTO", "FORNECEDOR", "DESCRICAO", "CATEGORIA", "VALOR_BRUTO", "VALOR_DEDUCOES", "VALOR_LIQUIDO"],
  ]);
}

function demoContasPagar() {
  return `${contasHeader([
    ["TOTAL_7D", 186500],
    ["TOTAL_30D", 482900],
    ["TOTAL_60D", 738400],
  ])}
${csv([
  ["2026-04-24", "Cloud Alpha Ltda.", "Infraestrutura cloud mensal", "Tecnologia / Cloud", 38200, 0, 38200],
  ["2026-04-27", "Equipe Produto", "Folha e encargos - produto", "Pessoas / Produto", 96500, 0, 96500],
  ["2026-04-30", "Nexa Ads", "Campanhas de aquisição", "Marketing / Performance", 52100, 0, 52100],
  ["2026-05-04", "Studio Norte", "Produção de conteúdo", "Operação / Conteúdo", 34800, 0, 34800],
  ["2026-05-12", "DataBridge", "Licenças BI e dados", "Tecnologia / Dados", 42800, 0, 42800],
  ["2026-05-22", "Luniq Office", "Coworking e facilities", "Administrativo / Facilities", 28900, 0, 28900],
  ["2026-06-08", "Beta Bank", "Parcela de financiamento", "Financeiro / Dívida", 65500, 0, 65500],
])}`;
}

function demoDespesasHistorico() {
  return `${csv([["DATA_PAGAMENTO", "FORNECEDOR", "DESCRICAO", "CATEGORIA", "VALOR_BRUTO", "VALOR_DEDUCOES", "VALOR_LIQUIDO"]])}
${csv([
  ["2026-04-22", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 36100, 0, 36100],
  ["2026-04-18", "Nexa Ads", "Campanhas pagas", "Marketing / Performance", 48700, 0, 48700],
  ["2026-04-15", "Equipe Produto", "Folha quinzenal", "Pessoas / Produto", 91200, 0, 91200],
  ["2026-04-10", "DataBridge", "Stack de dados", "Tecnologia / Dados", 39800, 0, 39800],
  ["2026-03-28", "Studio Norte", "Conteúdo institucional", "Operação / Conteúdo", 30400, 0, 30400],
  ["2026-03-18", "Beta Bank", "Serviços financeiros", "Financeiro / Tarifas", 18400, 0, 18400],
])}`;
}

function demoTabelaResumo() {
  const rows = [["DATA", "TOTAL DE ENTRADAS", "PAGAMENTOS", "PROVISOES ENDIVIDAMENTO", "SALDO FINAL"]];
  let saldo = 326750;
  for (let i = 0; i < 60; i += 1) {
    const date = new Date(2026, 3, 27 + i);
    const iso = date.toISOString().slice(0, 10);
    const entradas = i % 5 === 0 ? 84000 : i % 3 === 0 ? 28500 : 0;
    const pagamentos = i % 7 === 0 ? 96500 : i % 4 === 0 ? 38200 : 6200;
    const provisoes = i % 15 === 0 ? 18000 : 0;
    saldo += entradas - pagamentos - provisoes;
    rows.push([iso, entradas, pagamentos, provisoes, saldo]);
  }
  return csv(rows);
}

function demoHistorico() {
  return csv([
    ["DATA", "SALDO_INICIAL", "ENTRADAS", "SAIDAS", "SALDO_FINAL", "APORTES SOCIOS", "DESPESAS SOCIOS"],
    ["2026-04-24", 318200, 48600, 40050, 326750, 0, 0],
    ["2026-04-23", 300900, 35200, 17900, 318200, 0, 0],
    ["2026-04-22", 296500, 42100, 37700, 300900, 0, 0],
    ["2026-04-21", 289400, 26800, 19700, 296500, 0, 0],
    ["2026-04-20", 274100, 31200, 15900, 289400, 0, 0],
    ["2026-03-31", 248300, 391000, 364200, 275100, 0, 0],
    ["2026-02-28", 215500, 366400, 333600, 248300, 0, 0],
    ["2026-01-31", 180200, 342800, 307500, 215500, 0, 0],
  ]);
}

function demoDre2026() {
  const rows = [
    ["STATUS", ...MESES],
    ["CONTA", ...MESES],
  ];
  const values = {
    "RECEITA OPERACIONAL BRUTA": [342800, 366400, 391000, 418600],
    "(-) DEDUCOES DA RECEITA": [-24400, -26800, -29100, -30700],
    "(=) RECEITA LIQUIDA": [318400, 339600, 361900, 387900],
    "(-) CUSTOS DOS SERVICOS": [-116500, -121300, -128600, -136200],
    "(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO": [201900, 218300, 233300, 251700],
    "(-) DESPESAS OPERACIONAIS": [-164300, -170200, -176900, -184100],
    "(=) EBITDA": [37600, 48100, 56400, 67600],
    "(-) RESULTADO FINANCEIRO": [-9800, -10400, -11200, -11800],
    "(=) RESULTADO LIQUIDO": [27800, 37700, 45200, 55800],
  };
  Object.entries(values).forEach(([conta, nums]) => rows.push([conta, ...nums, ...Array(8).fill(0)]));
  return csv(rows);
}

function demoOrcBase() {
  const rows = [["ID", "MES", "TRIMESTRE", "CONTA", "PACOTE", "AREA", "LINHA_DE_RECEITA/CUSTO", "CENARIO", "VALOR"]];
  const areas = [
    ["FATURAMENTO", "Receita recorrente", 380000],
    ["PESSOAS", "Time e encargos", 138000],
    ["TECNOLOGIA", "Cloud, dados e ferramentas", 72500],
    ["MARKETING", "Aquisição e marca", 61200],
    ["OPERACAO", "Entrega e suporte", 48600],
    ["ADMINISTRATIVO", "Estrutura e backoffice", 29400],
  ];
  MESES.slice(0, 4).forEach((mes, idx) => {
    areas.forEach(([area, linha, base], areaIdx) => {
      const real = Math.round(base * (1 + idx * 0.035 + (areaIdx % 2 ? 0.04 : -0.015)));
      const orcado = Math.round(base * (1 + idx * 0.03));
      rows.push([`${mes}-${area}-R`, mes, idx < 3 ? "T1" : "T2", linha, "Demo", area, linha, "REALIZADO", real]);
      rows.push([`${mes}-${area}-O`, mes, idx < 3 ? "T1" : "T2", linha, "Demo", area, linha, "ORCADO", orcado]);
    });
  });
  return csv(rows);
}

function demoCancelamentos() {
  return csv([
    ["Carimbo de data/hora", "Nome Completo do Aluno", "E-mail", "Nº do Pedido", "Data da Compra", "Nome do Curso ou Pacote", "Tipo de Reembolso", "Status", "Dias", "Dias em atraso", "Valor do Reembolso"],
    ["18/04/2026 10:12:00", "Cliente Demo 01", "cliente01@exemplo.com", "LD-1001", "05/04/2026", "Plano CFO Light", "PIX", "Em análise", 9, 2, 980],
    ["12/04/2026 14:33:00", "Cliente Demo 02", "cliente02@exemplo.com", "LD-1002", "26/03/2026", "Implantação Financeira", "Estorno cartão", "Aguardando adquirente", 15, 0, 2450],
    ["03/03/2026 09:40:00", "Cliente Demo 03", "cliente03@exemplo.com", "LD-0968", "18/02/2026", "Mentoria de Caixa", "Estorno cartão", "Concluído", 32, 0, 1590],
  ]);
}

function demoChargebacks() {
  return csv([
    ["Data do Chargeback", "Cliente", "Pedido", "Tipo", "Status", "Valor"],
    ["2026-04-19", "Cliente Demo 04", "LD-1007", "Contestação", "Em disputa", 1290],
    ["2026-04-08", "Cliente Demo 05", "LD-0988", "Fraude", "Ganho", 890],
    ["2026-03-21", "Cliente Demo 06", "LD-0951", "Desacordo comercial", "Em disputa", 2100],
  ]);
}

function demoChargebackIndicadores() {
  return csv([
    ["Periodo", "Qtde de chargebacks", "Valor", "Taxa de chargeback", "Taxa de Sucesso"],
    ["03/2026", 3, 4280, 0.42, 0.67],
    ["04/2026", 2, 3390, 0.31, 0.5],
  ]);
}

function demoProfessoresLancamentos() {
  return csv([
    ["PROFESSOR", "PERIODO", "TIPO DE LANCAMENTO", "CATEGORIA", "DESCRICAO", "VALOR"],
    ["Consultora Ana Lima", "04/2026", "FIXO", "Consultoria financeira", "Retainer mensal de planejamento", 18500],
    ["Consultor Bruno Reis", "04/2026", "HORA AULA", "Treinamento executivo", "Workshop de fluxo de caixa", 7200],
    ["Especialista Clara Nunes", "04/2026", "PDF TEORIA", "Conteúdo técnico", "Guia de indicadores financeiros", 4600],
    ["Consultora Ana Lima", "03/2026", "GRAVACAO AULA", "Conteúdo gravado", "Aula de orçamento matricial", 5200],
  ]);
}

function demoAcademicoVideo() {
  return csv([
    ["MES", "DATA", "PROFESSOR", "DESCRICAO", "DURACAO PREVISTA", "VALOR PREVISTO", "TEMPO EFETIVO", "REMUNERACAO", "ORCAMENTO", "CLASSIFICACAO"],
    ["04/2026", "2026-04-08", "Consultora Ana Lima", "Diagnóstico financeiro para PMEs", "2h", 3600, "2h", 3600, "ACADEMICO", "GESTAO DE CONTEUDO"],
    ["04/2026", "2026-04-12", "Consultor Bruno Reis", "Rotina de fechamento semanal", "1.5h", 2400, "1.5h", 2400, "MARKETING", "MARKETING"],
    ["03/2026", "2026-03-19", "Especialista Clara Nunes", "Modelo de DRE gerencial", "2h", 3200, "2h", 3200, "ACADEMICO", "EXCLUSIVOS"],
  ]);
}

function demoAcademicoEscrito() {
  return csv([
    ["PROFESSOR", "DISCIPLINA", "ASSUNTO", "PRAZO PARA ENVIO", "VALOR PREVISTO", "STATUS", "DATA ENTREGA", "TOTAL A PAGAR"],
    ["Consultora Ana Lima", "Finanças", "Checklist de fechamento mensal", "2026-04-18", 2800, "Entregue", "2026-04-17", 2800],
    ["Consultor Bruno Reis", "Operações", "Roteiro de comitê de caixa", "2026-04-24", 2200, "Em revisão", "", 2200],
    ["Especialista Clara Nunes", "Controladoria", "Template de orçamento por centro de custo", "2026-03-28", 3100, "Entregue", "2026-03-27", 3100],
  ]);
}

function demoAcademicoResultado(tipo) {
  return csv([
    ["MÊS LANÇAMENTO", "DESPESA PREVISTA", "DESPESA REALIZADA", "DIFERENÇA", "META DESPESA", "DIFERENÇA DA META"],
    ["03/2026", 18400, 17300, -1100, 19000, -1700],
    ["04/2026", tipo === "material" ? 5000 : 9200, tipo === "material" ? 5000 : 8400, tipo === "material" ? 0 : -800, tipo === "material" ? 6200 : 10000, tipo === "material" ? -1200 : -1600],
  ]);
}

const DEMO_SHEETS = {
  saldos: () => csv([["label", "value"], ["Conta Principal", 286750], ["Reserva", 40000], ["TOTAL", 326750]]),
  runway: () => csv([["label", "value"], ["RUNWAY DIAS", 37], ["RUNWAY DATA", "2026-06-03"]]),
  tabela_auxiliar: () => csv([["janela", "saldo"], ["30d", 118900], ["60d", -82400]]),
  entradas10d: () => csv([["DATA", "VALOR"], ["2026-04-27", 24500], ["2026-04-28", 0], ["2026-04-29", 38700], ["2026-04-30", 51200]]),
  tabela_resumo: demoTabelaResumo,
  historico: demoHistorico,
  fechamento_semanal: demoHistorico,
  contas_pagar: demoContasPagar,
  contas_pagar_composicao: demoContasPagar,
  contas_vencidas: () => `${contasHeader([["TOTAL_VENCIDO", 38200]])}\n${csv([["2026-04-24", "Cloud Alpha Ltda.", "Infraestrutura cloud mensal", "Tecnologia / Cloud", 38200, 0, 38200]])}`,
  despesas_historico: demoDespesasHistorico,
  faturas_historico: demoDespesasHistorico,
  orc_base: demoOrcBase,
  base_dre: demoDre2026,
  dre_2026: demoDre2026,
  dre_2024_2025: demoDre2026,
  cancelamentos_solicitacoes: demoCancelamentos,
  cancelamentos_vendas: () => csv([["Período", "Faturamento", "Cancelamentos", "% Vendas Canceladas"], ["03/2026", 391000, 12400, 3.17], ["04/2026", 418600, 5020, 1.2]]),
  cancelamentos_competencia: () => csv([["Período", "Cancelamentos"], ["03/2026", 12400], ["04/2026", 5020]]),
  chargebacks: demoChargebacks,
  chargebacks_indicadores: demoChargebackIndicadores,
  professores_lancamentos: demoProfessoresLancamentos,
  professores_lancamentos_2025: demoProfessoresLancamentos,
  professores_lancamentos_2024: demoProfessoresLancamentos,
  academico_video: demoAcademicoVideo,
  academico_video_2025: demoAcademicoVideo,
  academico_video_2024: demoAcademicoVideo,
  academico_video_marketing: demoAcademicoVideo,
  academico_material_escrito: demoAcademicoEscrito,
  academico_material_escrito_2025: demoAcademicoEscrito,
  academico_material_escrito_2024: demoAcademicoEscrito,
  academico_resultado_material: () => demoAcademicoResultado("material"),
  academico_resultado_gestao: () => demoAcademicoResultado("gestao"),
  academico_resultado_exclusivos: () => demoAcademicoResultado("exclusivos"),
  academico_franquia_2024: demoAcademicoVideo,
  aportes_mario: () => csv([["APORTE TOTAL", "APORTE REALIZADO", "APORTE A REALIZAR", "ABR-DEZ"], [0, 0, 0, 0]]),
};

export function isDemoCompany(companyId = "") {
  return DEMO_COMPANY_IDS.has(String(companyId || "").trim());
}

export function getDemoSheetCsv(key, companyId = "") {
  if (!isDemoCompany(companyId)) return null;
  return DEMO_SHEETS[key]?.() ?? emptyCsv(key);
}
