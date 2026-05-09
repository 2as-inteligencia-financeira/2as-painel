export const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export const accountTypes = {
  revenue: "Receita",
  deduction: "Dedução",
  cost: "Custo",
  expense: "Despesa",
  investment: "Investimento",
  financial: "Financeiro",
  tax: "Tributo",
  result: "Resultado",
};

export const financialAreas = [
  { id:"receita", name:"Receita", owner:"Comercial", description:"Linhas de faturamento e retenção." },
  { id:"deducoes", name:"Deduções", owner:"Financeiro", description:"Cancelamentos, taxas e impostos vinculados à venda." },
  { id:"produto", name:"Produto e Ensino", owner:"Operação", description:"Custos diretos da entrega educacional." },
  { id:"go-to-market", name:"Go-to-market", owner:"Growth", description:"Marketing, vendas e receita recorrente." },
  { id:"gente-ops", name:"Gente e Operações", owner:"Administração", description:"Equipe, tecnologia e estrutura operacional." },
  { id:"investimentos", name:"Investimentos", owner:"Diretoria", description:"Projetos, marca, automações e expansão." },
  { id:"financeiro", name:"Financeiro e Tributos", owner:"Financeiro", description:"Tarifas, juros, tributos e encargos." },
];

export const taxRegimes = {
  simples: { label:"Simples Nacional", rate:0.092, base:"Receita bruta", note:"Alíquota efetiva demo de 9,2% sobre receita bruta." },
  presumido: { label:"Lucro Presumido", rate:0.118, base:"Receita bruta", note:"Modelo demo com PIS/COFINS/ISS/IRPJ/CSLL combinados." },
  real: { label:"Lucro Real", rate:0.18, base:"Resultado antes dos tributos", note:"Modelo demo com IRPJ/CSLL sobre lucro tributável positivo." },
};

export const accountPlan = [
  { id:"rob", code:"1", name:"Receita Operacional Bruta", type:"revenue", areaId:"receita", parentId:null, sign:1, budgetOrder:10, dreOrder:10, isSummary:true },
  { id:"assinaturas", code:"1.01", name:"Assinaturas", type:"revenue", areaId:"go-to-market", parentId:"rob", sign:1, budgetOrder:11, dreOrder:11 },
  { id:"cursos", code:"1.02", name:"Cursos", type:"revenue", areaId:"go-to-market", parentId:"rob", sign:1, budgetOrder:12, dreOrder:12 },
  { id:"mentorias", code:"1.03", name:"Mentorias e projetos", type:"revenue", areaId:"receita", parentId:"rob", sign:1, budgetOrder:13, dreOrder:13 },

  { id:"deducoes", code:"2", name:"(-) Deduções da Receita", type:"deduction", areaId:"deducoes", parentId:null, sign:-1, budgetOrder:20, dreOrder:20, isSummary:true },
  { id:"cancelamentos", code:"2.01", name:"Cancelamentos", type:"deduction", areaId:"deducoes", parentId:"deducoes", sign:-1, budgetOrder:21, dreOrder:21 },
  { id:"taxas-venda", code:"2.02", name:"Taxas de venda", type:"deduction", areaId:"financeiro", parentId:"deducoes", sign:-1, budgetOrder:22, dreOrder:22 },
  { id:"impostos-receita", code:"2.03", name:"Impostos sobre receita", type:"deduction", areaId:"financeiro", parentId:"deducoes", sign:-1, budgetOrder:23, dreOrder:23 },

  { id:"custos", code:"3", name:"(-) Custos de Produção", type:"cost", areaId:"produto", parentId:null, sign:-1, budgetOrder:30, dreOrder:40, isSummary:true },
  { id:"professores", code:"3.01", name:"Professores", type:"cost", areaId:"produto", parentId:"custos", sign:-1, budgetOrder:31, dreOrder:41 },
  { id:"conteudo", code:"3.02", name:"Produção de conteúdo", type:"cost", areaId:"produto", parentId:"custos", sign:-1, budgetOrder:32, dreOrder:42 },
  { id:"plataforma-ensino", code:"3.03", name:"Plataforma de ensino", type:"cost", areaId:"produto", parentId:"custos", sign:-1, budgetOrder:33, dreOrder:43 },
  { id:"suporte-alunos", code:"3.04", name:"Suporte acadêmico", type:"cost", areaId:"produto", parentId:"custos", sign:-1, budgetOrder:34, dreOrder:44 },

  { id:"despesas", code:"4", name:"(-) Despesas Operacionais", type:"expense", areaId:"gente-ops", parentId:null, sign:-1, budgetOrder:40, dreOrder:60, isSummary:true },
  { id:"marketing", code:"4.01", name:"Marketing", type:"expense", areaId:"go-to-market", parentId:"despesas", sign:-1, budgetOrder:41, dreOrder:61 },
  { id:"vendas", code:"4.02", name:"Vendas", type:"expense", areaId:"go-to-market", parentId:"despesas", sign:-1, budgetOrder:42, dreOrder:62 },
  { id:"pessoas", code:"4.03", name:"Pessoas e benefícios", type:"expense", areaId:"gente-ops", parentId:"despesas", sign:-1, budgetOrder:43, dreOrder:63 },
  { id:"tecnologia", code:"4.04", name:"Tecnologia", type:"expense", areaId:"gente-ops", parentId:"despesas", sign:-1, budgetOrder:44, dreOrder:64 },
  { id:"administrativo", code:"4.05", name:"Administrativo", type:"expense", areaId:"gente-ops", parentId:"despesas", sign:-1, budgetOrder:45, dreOrder:65 },

  { id:"investimentos", code:"5", name:"(-) Investimentos", type:"investment", areaId:"investimentos", parentId:null, sign:-1, budgetOrder:50, dreOrder:80, isSummary:true },
  { id:"produto", code:"5.01", name:"Produto e automações", type:"investment", areaId:"investimentos", parentId:"investimentos", sign:-1, budgetOrder:51, dreOrder:81 },
  { id:"marca", code:"5.02", name:"Marca e comercial", type:"investment", areaId:"investimentos", parentId:"investimentos", sign:-1, budgetOrder:52, dreOrder:82 },

  { id:"finex", code:"6", name:"(-) Resultado Financeiro", type:"financial", areaId:"financeiro", parentId:null, sign:-1, budgetOrder:60, dreOrder:90, isSummary:true },
  { id:"tarifas", code:"6.01", name:"Tarifas e antecipação", type:"financial", areaId:"financeiro", parentId:"finex", sign:-1, budgetOrder:61, dreOrder:91 },
  { id:"juros", code:"6.02", name:"Juros e encargos", type:"financial", areaId:"financeiro", parentId:"finex", sign:-1, budgetOrder:62, dreOrder:92 },

  { id:"tributos", code:"7", name:"(-) Tributos", type:"tax", areaId:"financeiro", parentId:null, sign:-1, budgetOrder:70, dreOrder:100, isSummary:true },
  { id:"irpj-csll", code:"7.01", name:"IRPJ e CSLL", type:"tax", areaId:"financeiro", parentId:"tributos", sign:-1, budgetOrder:71, dreOrder:101, calculated:true },
];

export const budgetPlans = [
  { id:"budget-2026", name:"Orçamento Base 2026", year:2026, status:"Aprovado", kind:"budget", source:"Demo 2AS" },
  { id:"forecast-maio", name:"Forecast Maio 2026", year:2026, status:"Em revisão", kind:"forecast", source:"Demo 2AS" },
];

export const scenarios = [
  {
    id:"base",
    name:"Base aprovado",
    label:"Base",
    description:"Orçamento aprovado como ponto de partida do ciclo.",
    adjustments:[],
  },
  {
    id:"forecast",
    name:"Forecast realista",
    label:"Forecast",
    description:"Atualiza receita e despesas com leitura de meio de ciclo.",
    adjustments:[
      { accountId:"assinaturas", fromMonth:"MAI", toMonth:"DEZ", pct:-0.04, note:"Retenção abaixo do plano" },
      { accountId:"cursos", fromMonth:"JUN", toMonth:"DEZ", pct:0.06, note:"Campanhas com melhor conversão" },
      { accountId:"marketing", fromMonth:"MAI", toMonth:"DEZ", pct:0.08, note:"Reforço comercial" },
      { accountId:"tarifas", fromMonth:"MAI", toMonth:"DEZ", pct:0.12, note:"Maior uso de antecipação" },
    ],
  },
  {
    id:"turnaround-conservador",
    name:"Turnaround conservador",
    label:"Turnaround C",
    description:"Cortes moderados, foco em preservar crescimento e recuperar margem.",
    adjustments:[
      { accountId:"marketing", fromMonth:"JUN", toMonth:"DEZ", pct:-0.14, note:"Corte em mídia de baixa conversão" },
      { accountId:"administrativo", fromMonth:"JUN", toMonth:"DEZ", pct:-0.08, note:"Renegociação de contratos" },
      { accountId:"produto", fromMonth:"JUL", toMonth:"DEZ", pct:-0.22, note:"Postergação de automações não críticas" },
      { accountId:"assinaturas", fromMonth:"JUL", toMonth:"DEZ", pct:0.03, note:"Ação de retenção" },
    ],
  },
  {
    id:"turnaround-agressivo",
    name:"Turnaround agressivo",
    label:"Turnaround A",
    description:"Reestruturação forte para proteger caixa e acelerar EBITDA.",
    adjustments:[
      { accountId:"marketing", fromMonth:"JUN", toMonth:"DEZ", pct:-0.28, note:"Pausa em canais sem payback" },
      { accountId:"vendas", fromMonth:"JUN", toMonth:"DEZ", pct:-0.12, note:"Revisão de comissões e ferramentas" },
      { accountId:"administrativo", fromMonth:"JUN", toMonth:"DEZ", pct:-0.16, note:"Corte de despesas gerais" },
      { accountId:"produto", fromMonth:"JUN", toMonth:"DEZ", pct:-0.42, note:"Congelamento de projetos" },
      { accountId:"juros", fromMonth:"JUL", toMonth:"DEZ", pct:-0.18, note:"Renegociação de dívida" },
      { accountId:"mentorias", fromMonth:"AGO", toMonth:"DEZ", pct:0.12, note:"Oferta consultiva de maior margem" },
    ],
  },
];

const baseMonthly = {
  assinaturas: [540000, 555000, 582000, 610000, 628000, 642000, 654000, 666000, 681000, 697000, 718000, 748000],
  cursos: [220000, 238000, 262000, 276000, 292000, 306000, 318000, 331000, 344000, 361000, 382000, 410000],
  mentorias: [46000, 52000, 56000, 62000, 68000, 76000, 82000, 88000, 96000, 104000, 116000, 128000],
  cancelamentos: [28000, 30000, 31500, 32800, 34000, 35100, 36000, 36800, 37700, 38600, 39800, 41000],
  "taxas-venda": [18500, 19300, 20700, 21800, 23000, 24100, 25000, 26000, 27100, 28300, 29700, 31500],
  "impostos-receita": [42000, 44000, 47200, 49700, 51500, 53200, 54800, 56500, 58500, 60700, 63200, 67000],
  professores: [165000, 171000, 178000, 186000, 193000, 202000, 208000, 215000, 224000, 233000, 244000, 258000],
  conteudo: [62000, 65500, 70000, 73500, 76000, 79000, 80500, 82800, 85000, 88000, 91500, 96000],
  "plataforma-ensino": [36000, 36500, 37200, 38100, 39200, 40500, 41200, 42100, 43000, 44100, 45500, 47200],
  "suporte-alunos": [42000, 43800, 45200, 46800, 48200, 49800, 51000, 52300, 53800, 55500, 57200, 59600],
  marketing: [118000, 124000, 132000, 141000, 150000, 158000, 165000, 172000, 178000, 184000, 192000, 206000],
  vendas: [72000, 74200, 76800, 79000, 81500, 84200, 86800, 89400, 92200, 95200, 98600, 103000],
  pessoas: [138000, 141000, 145000, 149000, 153000, 157000, 161000, 166000, 171000, 176000, 182000, 190000],
  tecnologia: [54000, 56000, 58500, 60200, 61800, 63600, 65400, 67200, 69200, 71200, 73500, 76000],
  administrativo: [82000, 83800, 85600, 87800, 89800, 92000, 94300, 96600, 99000, 101600, 104200, 108000],
  produto: [48000, 54000, 58000, 62000, 68000, 74000, 82000, 88000, 92000, 98000, 104000, 112000],
  marca: [18000, 22000, 24000, 26000, 28000, 32000, 34000, 36000, 38000, 42000, 46000, 52000],
  tarifas: [22000, 23400, 24600, 25800, 27000, 28600, 29800, 31000, 32200, 33700, 35200, 37400],
  juros: [16500, 16200, 15800, 15400, 15000, 14600, 14200, 13800, 13400, 13000, 12600, 12200],
  "irpj-csll": [38000, 40500, 43200, 45800, 48000, 50300, 52600, 54800, 57200, 59600, 62500, 66200],
};

export const budgetLines = Object.entries(baseMonthly).flatMap(([accountId, values]) =>
  values.map((amount, index) => ({
    planId:"budget-2026",
    accountId,
    month:MONTHS[index],
    amount,
    origin:"demo-base",
  }))
);

export const actualLines = budgetLines
  .filter(line => MONTHS.indexOf(line.month) <= 4)
  .map(line => {
    const account = accountPlan.find(item => item.id === line.accountId);
    const idx = MONTHS.indexOf(line.month);
    const revenuePulse = [0.98, 1.04, 0.93, 1.08, 1.02][idx] || 1;
    const expensePulse = [1.03, 1.06, 0.98, 1.1, 1.04][idx] || 1;
    const neutralPulse = [1.01, 0.99, 1.04, 1.06, 1.03][idx] || 1;
    const multiplier = account?.type === "revenue"
      ? revenuePulse
      : ["expense", "cost", "financial"].includes(account?.type)
        ? expensePulse
        : neutralPulse;
    return {
      planId:"budget-2026",
      accountId:line.accountId,
      month:line.month,
      amount:Math.round(line.amount * multiplier),
      origin:"demo-realizado",
    };
  });

const monthIndex = month => MONTHS.indexOf(month);
const signed = (account, amount) => Math.round((account?.sign || 1) * amount);
const leafAccounts = (accounts = accountPlan) => accounts.filter(account => !account.isSummary);
const accountsFrom = options => options?.accounts?.length ? options.accounts : accountPlan;
const budgetEditsFrom = options => options?.budgetEdits || {};
const actualEditsFrom = options => options?.actualEdits || {};
const taxRegimeFrom = options => taxRegimes[options?.taxRegime || "simples"] || taxRegimes.simples;

function applyEdits(lines, edits = {}) {
  return lines.map(line => {
    const key = `${line.accountId}:${line.month}`;
    if (edits[key] === undefined || edits[key] === "") return line;
    const amount = Number(edits[key]);
    return { ...line, amount:Number.isFinite(amount) ? amount : line.amount, origin:"demo-editado" };
  });
}

export function applyScenarioToLine(line, scenarioId) {
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const adjustment = scenario.adjustments
    .filter(item => item.accountId === line.accountId)
    .filter(item => monthIndex(line.month) >= monthIndex(item.fromMonth) && monthIndex(line.month) <= monthIndex(item.toMonth))
    .reduce((acc, item) => acc + item.pct, 0);
  return {
    ...line,
    amount: Math.round(line.amount * (1 + adjustment)),
    adjustmentPct: adjustment,
  };
}

function sumLines(lines, accountIds, month) {
  return lines
    .filter(line => accountIds.includes(line.accountId) && (!month || line.month === month))
    .reduce((acc, line) => acc + line.amount, 0);
}

function childrenOf(accountId, accounts = accountPlan) {
  return accounts.filter(account => account.parentId === accountId).map(account => account.id);
}

function getActualLines(options = {}) {
  return applyEdits(actualLines, actualEditsFrom(options));
}

export function getScenarioLines(scenarioId = "base", options = {}) {
  return applyEdits(budgetLines.map(line => applyScenarioToLine(line, scenarioId)), budgetEditsFrom(options));
}

function calculateTaxAmount({ regime, receitaBruta, resultadoAntesTributos, explicitTax }) {
  if (!regime) return explicitTax;
  if (regime.base === "Resultado antes dos tributos") {
    return Math.max(0, Math.round(resultadoAntesTributos * regime.rate));
  }
  return Math.max(0, Math.round(receitaBruta * regime.rate));
}

export function getMonthlyTotals(scenarioId = "base", options = {}) {
  const accounts = accountsFrom(options);
  const scenarioLines = getScenarioLines(scenarioId, options);
  const regime = taxRegimeFrom(options);
  return MONTHS.map(month => {
    const receitaBruta = sumLines(scenarioLines, childrenOf("rob", accounts), month);
    const deducoes = sumLines(scenarioLines, childrenOf("deducoes", accounts), month);
    const receitaLiquida = receitaBruta - deducoes;
    const custos = sumLines(scenarioLines, childrenOf("custos", accounts), month);
    const margem = receitaLiquida - custos;
    const despesas = sumLines(scenarioLines, childrenOf("despesas", accounts), month);
    const ebitda = margem - despesas;
    const investimentos = sumLines(scenarioLines, childrenOf("investimentos", accounts), month);
    const financeiro = sumLines(scenarioLines, childrenOf("finex", accounts), month);
    const explicitTax = sumLines(scenarioLines, childrenOf("tributos", accounts), month);
    const resultadoAntesTributos = ebitda - investimentos - financeiro;
    const tributos = calculateTaxAmount({ regime, receitaBruta, resultadoAntesTributos, explicitTax });
    const resultado = ebitda - investimentos - financeiro - tributos;
    const realizado = actualLines.some(line => line.month === month);
    return { month, receitaBruta, deducoes, receitaLiquida, custos, margem, despesas, ebitda, investimentos, financeiro, tributos, resultado, realizado };
  });
}

export function getAccountRows(scenarioId = "base", source = "budget", options = {}) {
  const accounts = accountsFrom(options);
  const lines = source === "actual" ? getActualLines(options) : getScenarioLines(scenarioId, options);
  const monthlyTotals = source === "actual" ? null : getMonthlyTotals(scenarioId, options);
  return accounts
    .map(account => {
      const accountIds = account.isSummary ? childrenOf(account.id, accounts) : [account.id];
      const months = MONTHS.reduce((acc, month) => {
        const value = account.calculated && monthlyTotals
          ? monthlyTotals.find(row => row.month === month)?.tributos || 0
          : sumLines(lines, accountIds, month);
        acc[month] = signed(account, value);
        return acc;
      }, {});
      const total = MONTHS.reduce((acc, month) => acc + months[month], 0);
      return { ...account, months, total };
    })
    .sort((a, b) => a.budgetOrder - b.budgetOrder);
}

function getActualMonthlyTotals(options = {}) {
  const accounts = accountsFrom(options);
  const lines = getActualLines(options);
  const regime = taxRegimeFrom(options);
  return MONTHS.map(month => {
    const receitaBruta = sumLines(lines, childrenOf("rob", accounts), month);
    const deducoes = sumLines(lines, childrenOf("deducoes", accounts), month);
    const receitaLiquida = receitaBruta - deducoes;
    const custos = sumLines(lines, childrenOf("custos", accounts), month);
    const margem = receitaLiquida - custos;
    const despesas = sumLines(lines, childrenOf("despesas", accounts), month);
    const ebitda = margem - despesas;
    const investimentos = sumLines(lines, childrenOf("investimentos", accounts), month);
    const financeiro = sumLines(lines, childrenOf("finex", accounts), month);
    const explicitTax = sumLines(lines, childrenOf("tributos", accounts), month);
    const resultadoAntesTributos = ebitda - investimentos - financeiro;
    const tributos = calculateTaxAmount({ regime, receitaBruta, resultadoAntesTributos, explicitTax });
    const resultado = resultadoAntesTributos - tributos;
    return { month, receitaBruta, deducoes, receitaLiquida, custos, margem, despesas, ebitda, investimentos, financeiro, tributos, resultado };
  });
}

export function getDreRows(scenarioId = "base", options = {}) {
  const planned = getMonthlyTotals(scenarioId, options);
  const actualByMonth = getActualMonthlyTotals(options);
  const accounts = accountsFrom(options);
  const scenarioLines = getScenarioLines(scenarioId, options);
  const actualLinesBase = getActualLines(options);

  const detailRows = leafAccounts(accounts)
    .filter(account => account.parentId && !account.calculated)
    .map(account => {
      const plannedValue = MONTHS.reduce((acc, month) => acc + sumLines(scenarioLines, [account.id], month), 0);
      const actualValue = MONTHS.reduce((acc, month) => acc + sumLines(actualLinesBase, [account.id], month), 0);
      return {
        key:account.id,
        label:account.name,
        parentId:account.parentId,
        accountType:account.type,
        type:"detail",
        planned:signed(account, plannedValue),
        actual:signed(account, actualValue),
        variance:signed(account, actualValue - plannedValue),
      };
    });

  const dreStructure = [
    { key:"receitaBruta", accountId:"rob", label:"Receita Operacional Bruta", type:"total" },
    { key:"deducoes", label:"(-) Deduções da Receita", type:"deduction", negative:true },
    { key:"receitaLiquida", label:"(=) Receita Operacional Líquida", type:"subtotal" },
    { key:"custos", accountId:"custos", label:"(-) Custos de Produção", type:"deduction", negative:true },
    { key:"margem", label:"(=) Lucro Bruto / Margem", type:"subtotal" },
    { key:"despesas", accountId:"despesas", label:"(-) Despesas Operacionais", type:"deduction", negative:true },
    { key:"ebitda", label:"(=) EBITDA", type:"subtotal" },
    { key:"investimentos", accountId:"investimentos", label:"(-) Investimentos", type:"deduction", negative:true },
    { key:"financeiro", accountId:"finex", label:"(-) Resultado Financeiro", type:"deduction", negative:true },
    { key:"tributos", accountId:"tributos", label:"(-) Tributos", type:"deduction", negative:true },
    { key:"resultado", label:"(=) Resultado Líquido", type:"result" },
  ];

  return dreStructure.flatMap(row => {
    const plannedValue = planned.reduce((acc, month) => acc + month[row.key], 0);
    const actualValue = actualByMonth.reduce((acc, month) => acc + month[row.key], 0);
    const summary = {
      ...row,
      planned: row.negative ? -plannedValue : plannedValue,
      actual: row.negative ? -actualValue : actualValue,
      variance: actualValue - plannedValue,
    };
    if (!row.accountId) return [summary];
    const children = detailRows.filter(detail => detail.parentId === row.accountId);
    return [summary, ...children];
  });
}

export function getBudgetComparisonRows(scenarioId = "base", options = {}) {
  const planned = getAccountRows(scenarioId, "budget", options);
  const actual = getAccountRows(scenarioId, "actual", options);
  const actualMonths = MONTHS.filter(month => actualLines.some(line => line.month === month));
  return planned.map(row => {
    const actualRow = actual.find(item => item.id === row.id);
    const plannedTotal = actualMonths.reduce((acc, month) => acc + (row.months[month] || 0), 0);
    const actualTotal = actualMonths.reduce((acc, month) => acc + (actualRow?.months[month] || 0), 0);
    return {
      ...row,
      plannedTotal,
      actualTotal,
      variance:actualTotal - plannedTotal,
      progress:plannedTotal ? (actualTotal / plannedTotal) * 100 : 0,
    };
  });
}

export function getAreaBudgetRows(scenarioId = "base", options = {}) {
  const rows = getBudgetComparisonRows(scenarioId, options).filter(row => !row.isSummary);
  return financialAreas.map(area => {
    const areaRows = rows.filter(row => row.areaId === area.id);
    const planned = areaRows.reduce((acc, row) => acc + row.plannedTotal, 0);
    const actual = areaRows.reduce((acc, row) => acc + row.actualTotal, 0);
    return { ...area, planned, actual, variance:actual - planned, progress:planned ? (actual / planned) * 100 : 0 };
  }).filter(row => row.planned || row.actual);
}

export function getDreMargins(scenarioId = "base", options = {}) {
  const planned = getMonthlyTotals(scenarioId, options);
  const actual = getActualMonthlyTotals(options);
  const sum = (rows, key) => rows.reduce((acc, row) => acc + row[key], 0);
  const plannedRevenue = sum(planned, "receitaLiquida");
  const actualRevenue = sum(actual, "receitaLiquida");
  return {
    planned:{
      gross: plannedRevenue ? (sum(planned, "margem") / plannedRevenue) * 100 : 0,
      ebitda: plannedRevenue ? (sum(planned, "ebitda") / plannedRevenue) * 100 : 0,
      net: plannedRevenue ? (sum(planned, "resultado") / plannedRevenue) * 100 : 0,
    },
    actual:{
      gross: actualRevenue ? (sum(actual, "margem") / actualRevenue) * 100 : 0,
      ebitda: actualRevenue ? (sum(actual, "ebitda") / actualRevenue) * 100 : 0,
      net: actualRevenue ? (sum(actual, "resultado") / actualRevenue) * 100 : 0,
    },
  };
}

export function getScenarioComparison(options = {}) {
  return scenarios.map(scenario => {
    const totals = getMonthlyTotals(scenario.id, options);
    const result = totals.reduce((acc, row) => acc + row.resultado, 0);
    const ebitda = totals.reduce((acc, row) => acc + row.ebitda, 0);
    const revenue = totals.reduce((acc, row) => acc + row.receitaLiquida, 0);
    return {
      ...scenario,
      revenue,
      ebitda,
      result,
      ebitdaMargin: revenue ? (ebitda / revenue) * 100 : 0,
    };
  });
}

export function getPlanningSummary(scenarioId = "base", options = {}) {
  const accounts = accountsFrom(options);
  const totals = getMonthlyTotals(scenarioId, options);
  const revenue = totals.reduce((acc, row) => acc + row.receitaLiquida, 0);
  const ebitda = totals.reduce((acc, row) => acc + row.ebitda, 0);
  const result = totals.reduce((acc, row) => acc + row.resultado, 0);
  const expenses = totals.reduce((acc, row) => acc + row.despesas + row.custos, 0);
  const actualMonths = MONTHS.filter(month => actualLines.some(line => line.month === month));
  return {
    revenue,
    ebitda,
    result,
    expenses,
    ebitdaMargin: revenue ? (ebitda / revenue) * 100 : 0,
    accounts: accounts.length,
    leafAccounts: leafAccounts(accounts).length,
    actualMonths,
    taxRegime: taxRegimeFrom(options),
  };
}
