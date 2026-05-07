const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

// Mapeia IDs de empresa (atuais e legados) para o perfil demo correspondente.
// Mantemos os legados para não quebrar localStorage de instalações anteriores.
const COMPANY_PROFILE_MAP = Object.freeze({
  "demo-saudavel": "saudavel",
  "demo-atencao": "atencao",
  "demo-crise": "crise",
  "luniq-demo": "saudavel",
  "luniq-inteligencia-financeira": "saudavel",
  "cliente-growth": "atencao",
});

const PROFILES = {
  saudavel: {
    label: "Saudável",
    saldos: { principal: 845200, reserva: 215000 },
    runway: { dias: 124, data: "2026-08-30" },
    auxiliar: { d30: 268500, d60: 510800 },
    entradas10d: [
      ["2026-04-27", 82500],
      ["2026-04-28", 0],
      ["2026-04-29", 67800],
      ["2026-04-30", 95400],
    ],
    historico: {
      saldoAbertura: 612000,
      saldoFinal: 845200,
      meses: [
        ["2026-01-31", 612000, 482900, 421300, 673600, 0, 0],
        ["2026-02-28", 673600, 511400, 438100, 746900, 0, 0],
        ["2026-03-31", 746900, 538200, 448600, 836500, 0, 0],
        ["2026-04-20", 836500, 96800, 84200, 849100, 0, 0],
        ["2026-04-21", 849100, 38700, 27200, 860600, 0, 0],
        ["2026-04-22", 860600, 52400, 41100, 871900, 0, 0],
        ["2026-04-23", 871900, 47800, 36100, 883600, 0, 0],
        ["2026-04-24", 883600, 41200, 79600, 845200, 0, 0],
      ],
    },
    fluxoFuturo: {
      saldoInicial: 845200,
      entradasPorDia: idx => (idx % 4 === 0 ? 96000 : idx % 3 === 0 ? 42000 : idx % 2 === 0 ? 18000 : 0),
      pagamentosPorDia: idx => (idx % 7 === 0 ? 88000 : idx % 4 === 0 ? 32000 : 4800),
      provisoesPorDia: idx => (idx % 30 === 0 ? 12000 : 0),
    },
    contasPagar: {
      meta: { total7d: 32500, total30d: 254700, total60d: 314700 },
      linhas: [
        ["2026-04-30", "Cloud Alpha Ltda.", "Infraestrutura cloud mensal", "Tecnologia / Cloud", 32500],
        ["2026-05-04", "Equipe Produto", "Folha e encargos", "Pessoas / Produto", 88200],
        ["2026-05-08", "Nexa Ads", "Campanhas de aquisição", "Marketing / Performance", 24600],
        ["2026-05-15", "Studio Norte", "Produção de conteúdo", "Operação / Conteúdo", 28400],
        ["2026-05-20", "DataBridge", "Licenças BI e dados", "Tecnologia / Dados", 38900],
        ["2026-05-25", "Beta Bank", "Parcela de financiamento", "Financeiro / Dívida", 42100],
        ["2026-06-05", "Luniq Office", "Coworking e facilities", "Administrativo / Facilities", 24800],
        ["2026-06-12", "Receita Federal", "Tributos federais", "Tributos / Mensal", 35200],
      ],
    },
    contasVencidas: {
      meta: { total: 6800 },
      linhas: [
        ["2026-04-22", "Studio Norte", "Reembolso pendente", "Operação / Ajuste", 6800],
      ],
    },
    despesasHistorico: [
      ["2026-04-22", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 31800],
      ["2026-04-18", "Nexa Ads", "Campanhas pagas", "Marketing / Performance", 23900],
      ["2026-04-15", "Equipe Produto", "Folha quinzenal", "Pessoas / Produto", 84600],
      ["2026-04-10", "DataBridge", "Stack de dados", "Tecnologia / Dados", 36400],
      ["2026-03-28", "Studio Norte", "Conteúdo institucional", "Operação / Conteúdo", 27600],
      ["2026-03-18", "Beta Bank", "Serviços financeiros", "Financeiro / Tarifas", 12200],
    ],
    dre: {
      receitaBase: 412000,
      crescimento: [1.0, 1.045, 1.092, 1.142],
      deducoesPct: 0.064,
      custosPct: 0.34,
      despesasPct: 0.40,
      financPct: -0.022,
    },
    cancelamentos: {
      solicitacoes: [
        ["10/04/2026 09:30:00", "Cliente Demo 01", "cliente01@exemplo.com", "LD-1101", "30/03/2026", "Plano CFO Light", "PIX", "Concluído", 11, 0, 980],
      ],
      vendas: [
        ["03/2026", 538200, 4800, 0.89],
        ["04/2026", 561900, 2900, 0.52],
      ],
      competencia: [
        ["03/2026", 4800],
        ["04/2026", 2900],
      ],
    },
    chargebacks: {
      casos: [
        ["2026-04-12", "Cliente Demo 04", "LD-1107", "Contestação", "Ganho", 480],
      ],
      indicadores: [
        ["03/2026", 1, 480, 0.09, 1.0],
        ["04/2026", 1, 920, 0.16, 0.5],
      ],
    },
    aportes: { total: 0, realizado: 0, pendente: 0, abrDez: 0 },
  },

  atencao: {
    label: "Atenção",
    saldos: { principal: 286750, reserva: 40000 },
    runway: { dias: 42, data: "2026-06-08" },
    auxiliar: { d30: -28500, d60: -142300 },
    entradas10d: [
      ["2026-04-27", 24500],
      ["2026-04-28", 0],
      ["2026-04-29", 38700],
      ["2026-04-30", 51200],
    ],
    historico: {
      saldoAbertura: 215500,
      saldoFinal: 326750,
      meses: [
        ["2026-01-31", 180200, 342800, 307500, 215500, 0, 0],
        ["2026-02-28", 215500, 366400, 333600, 248300, 0, 0],
        ["2026-03-31", 248300, 391000, 364200, 275100, 0, 0],
        ["2026-04-20", 274100, 31200, 15900, 289400, 0, 0],
        ["2026-04-21", 289400, 26800, 19700, 296500, 0, 0],
        ["2026-04-22", 296500, 42100, 37700, 300900, 0, 0],
        ["2026-04-23", 300900, 35200, 17900, 318200, 0, 0],
        ["2026-04-24", 318200, 48600, 40050, 326750, 0, 0],
      ],
    },
    fluxoFuturo: {
      saldoInicial: 326750,
      entradasPorDia: idx => (idx % 5 === 0 ? 84000 : idx % 3 === 0 ? 28500 : 0),
      pagamentosPorDia: idx => (idx % 7 === 0 ? 96500 : idx % 4 === 0 ? 38200 : 6200),
      provisoesPorDia: idx => (idx % 15 === 0 ? 18000 : 0),
    },
    contasPagar: {
      meta: { total7d: 186500, total30d: 482900, total60d: 738400 },
      linhas: [
        ["2026-04-24", "Cloud Alpha Ltda.", "Infraestrutura cloud mensal", "Tecnologia / Cloud", 38200],
        ["2026-04-27", "Equipe Produto", "Folha e encargos - produto", "Pessoas / Produto", 96500],
        ["2026-04-30", "Nexa Ads", "Campanhas de aquisição", "Marketing / Performance", 52100],
        ["2026-05-04", "Studio Norte", "Produção de conteúdo", "Operação / Conteúdo", 34800],
        ["2026-05-12", "DataBridge", "Licenças BI e dados", "Tecnologia / Dados", 42800],
        ["2026-05-22", "Luniq Office", "Coworking e facilities", "Administrativo / Facilities", 28900],
        ["2026-06-08", "Beta Bank", "Parcela de financiamento", "Financeiro / Dívida", 65500],
      ],
    },
    contasVencidas: {
      meta: { total: 38200 },
      linhas: [
        ["2026-04-19", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 12800],
        ["2026-04-15", "Studio Norte", "Conteúdo extra", "Operação / Conteúdo", 9600],
        ["2026-04-08", "DataBridge", "Licenças adicionais", "Tecnologia / Dados", 15800],
      ],
    },
    despesasHistorico: [
      ["2026-04-22", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 36100],
      ["2026-04-18", "Nexa Ads", "Campanhas pagas", "Marketing / Performance", 48700],
      ["2026-04-15", "Equipe Produto", "Folha quinzenal", "Pessoas / Produto", 91200],
      ["2026-04-10", "DataBridge", "Stack de dados", "Tecnologia / Dados", 39800],
      ["2026-03-28", "Studio Norte", "Conteúdo institucional", "Operação / Conteúdo", 30400],
      ["2026-03-18", "Beta Bank", "Serviços financeiros", "Financeiro / Tarifas", 18400],
    ],
    dre: {
      receitaBase: 342800,
      crescimento: [1.0, 1.069, 1.140, 1.221],
      deducoesPct: 0.073,
      custosPct: 0.34,
      despesasPct: 0.475,
      financPct: -0.030,
    },
    cancelamentos: {
      solicitacoes: [
        ["18/04/2026 10:12:00", "Cliente Demo 01", "cliente01@exemplo.com", "LD-1001", "05/04/2026", "Plano CFO Light", "PIX", "Em análise", 9, 2, 980],
        ["12/04/2026 14:33:00", "Cliente Demo 02", "cliente02@exemplo.com", "LD-1002", "26/03/2026", "Implantação Financeira", "Estorno cartão", "Aguardando adquirente", 15, 0, 2450],
        ["03/03/2026 09:40:00", "Cliente Demo 03", "cliente03@exemplo.com", "LD-0968", "18/02/2026", "Mentoria de Caixa", "Estorno cartão", "Concluído", 32, 0, 1590],
      ],
      vendas: [
        ["03/2026", 391000, 12400, 3.17],
        ["04/2026", 418600, 5020, 1.20],
      ],
      competencia: [
        ["03/2026", 12400],
        ["04/2026", 5020],
      ],
    },
    chargebacks: {
      casos: [
        ["2026-04-19", "Cliente Demo 04", "LD-1007", "Contestação", "Em disputa", 1290],
        ["2026-04-08", "Cliente Demo 05", "LD-0988", "Fraude", "Ganho", 890],
        ["2026-03-21", "Cliente Demo 06", "LD-0951", "Desacordo comercial", "Em disputa", 2100],
      ],
      indicadores: [
        ["03/2026", 3, 4280, 0.42, 0.67],
        ["04/2026", 2, 3390, 0.31, 0.50],
      ],
    },
    aportes: { total: 0, realizado: 0, pendente: 0, abrDez: 0 },
  },

  crise: {
    label: "Crise",
    saldos: { principal: 92400, reserva: 0 },
    runway: { dias: 14, data: "2026-05-12" },
    auxiliar: { d30: -178000, d60: -412000 },
    entradas10d: [
      ["2026-04-27", 12400],
      ["2026-04-28", 0],
      ["2026-04-29", 8500],
      ["2026-04-30", 0],
    ],
    historico: {
      saldoAbertura: 184000,
      saldoFinal: 92400,
      meses: [
        ["2026-01-31", 184000, 286400, 311800, 158600, 0, 0],
        ["2026-02-28", 158600, 268900, 297400, 130100, 0, 0],
        ["2026-03-31", 130100, 254300, 281800, 102600, 50000, 0],
        ["2026-04-20", 102600, 18200, 28900, 91900, 0, 0],
        ["2026-04-21", 91900, 8400, 12600, 87700, 0, 0],
        ["2026-04-22", 87700, 14800, 22300, 80200, 0, 0],
        ["2026-04-23", 80200, 6900, 14200, 72900, 0, 0],
        ["2026-04-24", 72900, 11300, 41800, 92400, 50000, 0],
      ],
    },
    fluxoFuturo: {
      saldoInicial: 92400,
      entradasPorDia: idx => (idx % 6 === 0 ? 18000 : idx % 4 === 0 ? 5800 : 0),
      pagamentosPorDia: idx => (idx % 5 === 0 ? 84000 : idx % 3 === 0 ? 22000 : 4200),
      provisoesPorDia: idx => (idx % 10 === 0 ? 24000 : 0),
    },
    contasPagar: {
      meta: { total7d: 248600, total30d: 612400, total60d: 894200 },
      linhas: [
        ["2026-04-22", "Receita Federal", "DAS Simples Nacional", "Tributos / Vencido", 48200],
        ["2026-04-24", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 38600],
        ["2026-04-25", "Equipe Produto", "Folha de abril", "Pessoas / Produto", 112400],
        ["2026-04-29", "Beta Bank", "Capital de giro", "Financeiro / Dívida", 49400],
        ["2026-05-02", "Studio Norte", "Produção em atraso", "Operação / Conteúdo", 41200],
        ["2026-05-09", "Nexa Ads", "Saldo devedor mídia", "Marketing / Performance", 62800],
        ["2026-05-16", "DataBridge", "Licenças vencidas", "Tecnologia / Dados", 48200],
        ["2026-05-23", "Equipe Produto", "13º proporcional / FGTS", "Pessoas / Encargos", 96400],
        ["2026-05-30", "Beta Bank", "Parcela renegociação", "Financeiro / Dívida", 88600],
        ["2026-06-12", "Receita Estadual", "ICMS atrasado", "Tributos / Mensal", 124200],
      ],
    },
    contasVencidas: {
      meta: { total: 218200 },
      linhas: [
        ["2026-03-15", "Receita Federal", "DARF atrasado", "Tributos / Vencido", 64800],
        ["2026-03-22", "Equipe Produto", "Folha em atraso", "Pessoas / Produto", 52600],
        ["2026-04-02", "Beta Bank", "Parcela em atraso", "Financeiro / Dívida", 38200],
        ["2026-04-08", "Studio Norte", "Conteúdo entregue", "Operação / Conteúdo", 28900],
        ["2026-04-12", "DataBridge", "Licença suspensa", "Tecnologia / Dados", 33700],
      ],
    },
    despesasHistorico: [
      ["2026-04-20", "Beta Bank", "Encargos por atraso", "Financeiro / Multas", 12800],
      ["2026-04-12", "Cloud Alpha Ltda.", "Infraestrutura cloud", "Tecnologia / Cloud", 36400],
      ["2026-04-08", "Equipe Produto", "Folha parcial", "Pessoas / Produto", 78600],
      ["2026-03-28", "Studio Norte", "Produção", "Operação / Conteúdo", 32100],
      ["2026-03-22", "Receita Federal", "Pagamento parcial", "Tributos / Mensal", 24400],
      ["2026-03-12", "Beta Bank", "Renegociação inicial", "Financeiro / Dívida", 41600],
    ],
    dre: {
      receitaBase: 318400,
      crescimento: [1.0, 0.952, 0.918, 0.871],
      deducoesPct: 0.082,
      custosPct: 0.42,
      despesasPct: 0.66,
      financPct: -0.078,
    },
    cancelamentos: {
      solicitacoes: [
        ["20/04/2026 11:05:00", "Cliente Demo 11", "cliente11@exemplo.com", "LD-2001", "01/04/2026", "Plano CFO Light", "PIX", "Em análise", 19, 5, 1980],
        ["18/04/2026 09:14:00", "Cliente Demo 12", "cliente12@exemplo.com", "LD-2002", "30/03/2026", "Implantação Financeira", "Estorno cartão", "Aguardando adquirente", 19, 4, 4900],
        ["12/04/2026 16:30:00", "Cliente Demo 13", "cliente13@exemplo.com", "LD-2003", "22/03/2026", "Mentoria de Caixa", "Estorno cartão", "Concluído", 21, 1, 3180],
        ["05/04/2026 08:45:00", "Cliente Demo 14", "cliente14@exemplo.com", "LD-2004", "14/03/2026", "Plano CFO Light", "Estorno cartão", "Concluído", 22, 0, 1980],
        ["02/04/2026 17:50:00", "Cliente Demo 15", "cliente15@exemplo.com", "LD-2005", "12/03/2026", "BPO Financeiro", "PIX", "Em análise", 21, 9, 6450],
      ],
      vendas: [
        ["02/2026", 268900, 21400, 7.96],
        ["03/2026", 254300, 28800, 11.32],
        ["04/2026", 232100, 32600, 14.04],
      ],
      competencia: [
        ["02/2026", 21400],
        ["03/2026", 28800],
        ["04/2026", 32600],
      ],
    },
    chargebacks: {
      casos: [
        ["2026-04-22", "Cliente Demo 16", "LD-2010", "Contestação", "Em disputa", 4200],
        ["2026-04-15", "Cliente Demo 17", "LD-2011", "Fraude", "Em disputa", 3850],
        ["2026-04-08", "Cliente Demo 18", "LD-2012", "Desacordo comercial", "Perdido", 5400],
        ["2026-03-28", "Cliente Demo 19", "LD-2013", "Contestação", "Perdido", 2980],
        ["2026-03-15", "Cliente Demo 20", "LD-2014", "Fraude", "Perdido", 4120],
      ],
      indicadores: [
        ["02/2026", 3, 8200, 1.20, 0.33],
        ["03/2026", 4, 11200, 1.84, 0.25],
        ["04/2026", 5, 16370, 2.47, 0.20],
      ],
    },
    aportes: { total: 200000, realizado: 50000, pendente: 150000, abrDez: 150000 },
  },
};

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

function contasLines(linhas = []) {
  return linhas.map(([data, fornecedor, descricao, categoria, valor]) =>
    [data, fornecedor, descricao, categoria, valor, 0, valor]);
}

function despesasLines(linhas = []) {
  return linhas.map(([data, fornecedor, descricao, categoria, valor]) =>
    [data, fornecedor, descricao, categoria, valor, 0, valor]);
}

function demoSaldos(profile) {
  const total = profile.saldos.principal + profile.saldos.reserva;
  return csv([
    ["label", "value"],
    ["Conta Principal", profile.saldos.principal],
    ["Reserva", profile.saldos.reserva],
    ["TOTAL", total],
  ]);
}

function demoRunway(profile) {
  return csv([
    ["label", "value"],
    ["RUNWAY DIAS", profile.runway.dias],
    ["RUNWAY DATA", profile.runway.data],
  ]);
}

function demoTabelaAuxiliar(profile) {
  return csv([
    ["janela", "saldo"],
    ["30d", profile.auxiliar.d30],
    ["60d", profile.auxiliar.d60],
  ]);
}

function demoEntradas10d(profile) {
  return csv([
    ["DATA", "VALOR"],
    ...profile.entradas10d,
  ]);
}

function demoHistorico(profile) {
  return csv([
    ["DATA", "SALDO_INICIAL", "ENTRADAS", "SAIDAS", "SALDO_FINAL", "APORTES SOCIOS", "DESPESAS SOCIOS"],
    ...profile.historico.meses,
  ]);
}

function demoTabelaResumo(profile) {
  const rows = [["DATA", "TOTAL DE ENTRADAS", "PAGAMENTOS", "PROVISOES ENDIVIDAMENTO", "SALDO FINAL"]];
  let saldo = profile.fluxoFuturo.saldoInicial;
  for (let i = 0; i < 60; i += 1) {
    const date = new Date(2026, 3, 27 + i);
    const iso = date.toISOString().slice(0, 10);
    const entradas = profile.fluxoFuturo.entradasPorDia(i);
    const pagamentos = profile.fluxoFuturo.pagamentosPorDia(i);
    const provisoes = profile.fluxoFuturo.provisoesPorDia(i);
    saldo += entradas - pagamentos - provisoes;
    rows.push([iso, entradas, pagamentos, provisoes, saldo]);
  }
  return csv(rows);
}

function demoContasPagar(profile) {
  const meta = [
    ["TOTAL_7D", profile.contasPagar.meta.total7d],
    ["TOTAL_30D", profile.contasPagar.meta.total30d],
    ["TOTAL_60D", profile.contasPagar.meta.total60d],
  ];
  return `${contasHeader(meta)}\n${csv(contasLines(profile.contasPagar.linhas))}`;
}

function demoContasVencidas(profile) {
  const meta = [["TOTAL_VENCIDO", profile.contasVencidas.meta.total]];
  return `${contasHeader(meta)}\n${csv(contasLines(profile.contasVencidas.linhas))}`;
}

function demoDespesasHistorico(profile) {
  return `${csv([["DATA_PAGAMENTO", "FORNECEDOR", "DESCRICAO", "CATEGORIA", "VALOR_BRUTO", "VALOR_DEDUCOES", "VALOR_LIQUIDO"]])}\n${csv(despesasLines(profile.despesasHistorico))}`;
}

function demoDre2026(profile) {
  const rows = [
    ["STATUS", ...MESES],
    ["CONTA", ...MESES],
  ];
  const fatores = profile.dre.crescimento;
  const valoresMensais = fatores.map(f => Math.round(profile.dre.receitaBase * f));
  const deducoes = valoresMensais.map(v => -Math.round(v * profile.dre.deducoesPct));
  const receitaLiquida = valoresMensais.map((v, i) => v + deducoes[i]);
  const custos = receitaLiquida.map(v => -Math.round(v * profile.dre.custosPct));
  const lucroBruto = receitaLiquida.map((v, i) => v + custos[i]);
  const despesasOp = receitaLiquida.map(v => -Math.round(v * profile.dre.despesasPct));
  const ebitda = lucroBruto.map((v, i) => v + despesasOp[i]);
  const financ = receitaLiquida.map(v => Math.round(v * profile.dre.financPct));
  const liquido = ebitda.map((v, i) => v + financ[i]);

  const linhas = [
    ["RECEITA OPERACIONAL BRUTA", valoresMensais],
    ["(-) DEDUCOES DA RECEITA", deducoes],
    ["(=) RECEITA LIQUIDA", receitaLiquida],
    ["(-) CUSTOS DOS SERVICOS", custos],
    ["(=) LUCRO BRUTO / MARGEM DE CONTRIBUICAO", lucroBruto],
    ["(-) DESPESAS OPERACIONAIS", despesasOp],
    ["(=) EBITDA", ebitda],
    ["(-) RESULTADO FINANCEIRO", financ],
    ["(=) RESULTADO LIQUIDO", liquido],
  ];

  linhas.forEach(([conta, nums]) => rows.push([conta, ...nums, ...Array(8).fill(0)]));
  return csv(rows);
}

function demoOrcBase(profile) {
  const rows = [["ID", "MES", "TRIMESTRE", "CONTA", "PACOTE", "AREA", "LINHA_DE_RECEITA/CUSTO", "CENARIO", "VALOR"]];
  const receitaBase = profile.dre.receitaBase;
  const fatorRealizado = profile.dre.crescimento;
  const areas = [
    { area: "FATURAMENTO", linha: "Receita recorrente", peso: 0.92 },
    { area: "PESSOAS", linha: "Time e encargos", peso: 0.36 },
    { area: "TECNOLOGIA", linha: "Cloud, dados e ferramentas", peso: 0.18 },
    { area: "MARKETING", linha: "Aquisição e marca", peso: 0.14 },
    { area: "OPERACAO", linha: "Entrega e suporte", peso: 0.12 },
    { area: "ADMINISTRATIVO", linha: "Estrutura e backoffice", peso: 0.07 },
  ];
  MESES.slice(0, 4).forEach((mes, idx) => {
    const fator = fatorRealizado[idx] ?? 1;
    areas.forEach(({ area, linha, peso }) => {
      const orcado = Math.round(receitaBase * peso);
      const real = Math.round(orcado * fator);
      rows.push([`${mes}-${area}-O`, mes, idx < 3 ? "T1" : "T2", linha, "Demo", area, linha, "ORCADO", orcado]);
      rows.push([`${mes}-${area}-R`, mes, idx < 3 ? "T1" : "T2", linha, "Demo", area, linha, "REALIZADO", real]);
    });
  });
  return csv(rows);
}

function demoCancelamentosSolicitacoes(profile) {
  return csv([
    ["Carimbo de data/hora", "Nome Completo do Aluno", "E-mail", "Nº do Pedido", "Data da Compra", "Nome do Curso ou Pacote", "Tipo de Reembolso", "Status", "Dias", "Dias em atraso", "Valor do Reembolso"],
    ...profile.cancelamentos.solicitacoes,
  ]);
}

function demoCancelamentosVendas(profile) {
  return csv([
    ["Período", "Faturamento", "Cancelamentos", "% Vendas Canceladas"],
    ...profile.cancelamentos.vendas,
  ]);
}

function demoCancelamentosCompetencia(profile) {
  return csv([
    ["Período", "Cancelamentos"],
    ...profile.cancelamentos.competencia,
  ]);
}

function demoChargebacks(profile) {
  return csv([
    ["Data do Chargeback", "Cliente", "Pedido", "Tipo", "Status", "Valor"],
    ...profile.chargebacks.casos,
  ]);
}

function demoChargebackIndicadores(profile) {
  return csv([
    ["Periodo", "Qtde de chargebacks", "Valor", "Taxa de chargeback", "Taxa de Sucesso"],
    ...profile.chargebacks.indicadores,
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

function demoAportes(profile) {
  return csv([
    ["APORTE TOTAL", "APORTE REALIZADO", "APORTE A REALIZAR", "ABR-DEZ"],
    [profile.aportes.total, profile.aportes.realizado, profile.aportes.pendente, profile.aportes.abrDez],
  ]);
}

const DEMO_SHEETS = {
  saldos: demoSaldos,
  runway: demoRunway,
  tabela_auxiliar: demoTabelaAuxiliar,
  entradas10d: demoEntradas10d,
  tabela_resumo: demoTabelaResumo,
  historico: demoHistorico,
  fechamento_semanal: demoHistorico,
  contas_pagar: demoContasPagar,
  contas_pagar_composicao: demoContasPagar,
  contas_vencidas: demoContasVencidas,
  despesas_historico: demoDespesasHistorico,
  faturas_historico: demoDespesasHistorico,
  orc_base: demoOrcBase,
  base_dre: demoDre2026,
  dre_2026: demoDre2026,
  dre_2024_2025: demoDre2026,
  cancelamentos_solicitacoes: demoCancelamentosSolicitacoes,
  cancelamentos_vendas: demoCancelamentosVendas,
  cancelamentos_competencia: demoCancelamentosCompetencia,
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
  aportes_mario: demoAportes,
};

export function getDemoProfileName(companyId = "") {
  return COMPANY_PROFILE_MAP[String(companyId || "").trim()] || null;
}

export function getDemoProfile(companyId = "") {
  const name = getDemoProfileName(companyId);
  return name ? PROFILES[name] : null;
}

export function isDemoCompany(companyId = "") {
  return Boolean(getDemoProfileName(companyId));
}

export function getDemoSheetCsv(key, companyId = "") {
  const profile = getDemoProfile(companyId);
  if (!profile) return null;
  const generator = DEMO_SHEETS[key];
  if (!generator) return emptyCsv(key);
  return generator(profile);
}
