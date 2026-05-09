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

export const accountPlan = [
  { id:"rob", code:"1", name:"Receita Operacional Bruta", type:"revenue", parentId:null, sign:1, budgetOrder:10, dreOrder:10, isSummary:true },
  { id:"assinaturas", code:"1.01", name:"Assinaturas", type:"revenue", parentId:"rob", sign:1, budgetOrder:11, dreOrder:11 },
  { id:"cursos", code:"1.02", name:"Cursos", type:"revenue", parentId:"rob", sign:1, budgetOrder:12, dreOrder:12 },
  { id:"mentorias", code:"1.03", name:"Mentorias e projetos", type:"revenue", parentId:"rob", sign:1, budgetOrder:13, dreOrder:13 },

  { id:"deducoes", code:"2", name:"(-) Deduções da Receita", type:"deduction", parentId:null, sign:-1, budgetOrder:20, dreOrder:20, isSummary:true },
  { id:"cancelamentos", code:"2.01", name:"Cancelamentos", type:"deduction", parentId:"deducoes", sign:-1, budgetOrder:21, dreOrder:21 },
  { id:"taxas-venda", code:"2.02", name:"Taxas de venda", type:"deduction", parentId:"deducoes", sign:-1, budgetOrder:22, dreOrder:22 },
  { id:"impostos-receita", code:"2.03", name:"Impostos sobre receita", type:"deduction", parentId:"deducoes", sign:-1, budgetOrder:23, dreOrder:23 },

  { id:"custos", code:"3", name:"(-) Custos de Produção", type:"cost", parentId:null, sign:-1, budgetOrder:30, dreOrder:40, isSummary:true },
  { id:"professores", code:"3.01", name:"Professores", type:"cost", parentId:"custos", sign:-1, budgetOrder:31, dreOrder:41 },
  { id:"conteudo", code:"3.02", name:"Produção de conteúdo", type:"cost", parentId:"custos", sign:-1, budgetOrder:32, dreOrder:42 },
  { id:"plataforma-ensino", code:"3.03", name:"Plataforma de ensino", type:"cost", parentId:"custos", sign:-1, budgetOrder:33, dreOrder:43 },
  { id:"suporte-alunos", code:"3.04", name:"Suporte acadêmico", type:"cost", parentId:"custos", sign:-1, budgetOrder:34, dreOrder:44 },

  { id:"despesas", code:"4", name:"(-) Despesas Operacionais", type:"expense", parentId:null, sign:-1, budgetOrder:40, dreOrder:60, isSummary:true },
  { id:"marketing", code:"4.01", name:"Marketing", type:"expense", parentId:"despesas", sign:-1, budgetOrder:41, dreOrder:61 },
  { id:"vendas", code:"4.02", name:"Vendas", type:"expense", parentId:"despesas", sign:-1, budgetOrder:42, dreOrder:62 },
  { id:"pessoas", code:"4.03", name:"Pessoas e benefícios", type:"expense", parentId:"despesas", sign:-1, budgetOrder:43, dreOrder:63 },
  { id:"tecnologia", code:"4.04", name:"Tecnologia", type:"expense", parentId:"despesas", sign:-1, budgetOrder:44, dreOrder:64 },
  { id:"administrativo", code:"4.05", name:"Administrativo", type:"expense", parentId:"despesas", sign:-1, budgetOrder:45, dreOrder:65 },

  { id:"investimentos", code:"5", name:"(-) Investimentos", type:"investment", parentId:null, sign:-1, budgetOrder:50, dreOrder:80, isSummary:true },
  { id:"produto", code:"5.01", name:"Produto e automações", type:"investment", parentId:"investimentos", sign:-1, budgetOrder:51, dreOrder:81 },
  { id:"marca", code:"5.02", name:"Marca e comercial", type:"investment", parentId:"investimentos", sign:-1, budgetOrder:52, dreOrder:82 },

  { id:"finex", code:"6", name:"(-) Resultado Financeiro", type:"financial", parentId:null, sign:-1, budgetOrder:60, dreOrder:90, isSummary:true },
  { id:"tarifas", code:"6.01", name:"Tarifas e antecipação", type:"financial", parentId:"finex", sign:-1, budgetOrder:61, dreOrder:91 },
  { id:"juros", code:"6.02", name:"Juros e encargos", type:"financial", parentId:"finex", sign:-1, budgetOrder:62, dreOrder:92 },

  { id:"tributos", code:"7", name:"(-) Tributos", type:"tax", parentId:null, sign:-1, budgetOrder:70, dreOrder:100, isSummary:true },
  { id:"irpj-csll", code:"7.01", name:"IRPJ e CSLL", type:"tax", parentId:"tributos", sign:-1, budgetOrder:71, dreOrder:101 },
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
const leafAccounts = () => accountPlan.filter(account => !account.isSummary);

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

function childrenOf(accountId) {
  return accountPlan.filter(account => account.parentId === accountId).map(account => account.id);
}

export function getScenarioLines(scenarioId = "base") {
  return budgetLines.map(line => applyScenarioToLine(line, scenarioId));
}

export function getMonthlyTotals(scenarioId = "base") {
  const scenarioLines = getScenarioLines(scenarioId);
  return MONTHS.map(month => {
    const receitaBruta = sumLines(scenarioLines, childrenOf("rob"), month);
    const deducoes = sumLines(scenarioLines, childrenOf("deducoes"), month);
    const receitaLiquida = receitaBruta - deducoes;
    const custos = sumLines(scenarioLines, childrenOf("custos"), month);
    const margem = receitaLiquida - custos;
    const despesas = sumLines(scenarioLines, childrenOf("despesas"), month);
    const ebitda = margem - despesas;
    const investimentos = sumLines(scenarioLines, childrenOf("investimentos"), month);
    const financeiro = sumLines(scenarioLines, childrenOf("finex"), month);
    const tributos = sumLines(scenarioLines, childrenOf("tributos"), month);
    const resultado = ebitda - investimentos - financeiro - tributos;
    const realizado = actualLines.some(line => line.month === month);
    return { month, receitaBruta, deducoes, receitaLiquida, custos, margem, despesas, ebitda, investimentos, financeiro, tributos, resultado, realizado };
  });
}

export function getAccountRows(scenarioId = "base", source = "budget") {
  const lines = source === "actual" ? actualLines : getScenarioLines(scenarioId);
  return accountPlan
    .map(account => {
      const accountIds = account.isSummary ? childrenOf(account.id) : [account.id];
      const months = MONTHS.reduce((acc, month) => {
        acc[month] = signed(account, sumLines(lines, accountIds, month));
        return acc;
      }, {});
      const total = MONTHS.reduce((acc, month) => acc + months[month], 0);
      return { ...account, months, total };
    })
    .sort((a, b) => a.budgetOrder - b.budgetOrder);
}

export function getDreRows(scenarioId = "base") {
  const planned = getMonthlyTotals(scenarioId);
  const actualByMonth = MONTHS.map(month => {
    const receitaBruta = sumLines(actualLines, childrenOf("rob"), month);
    const deducoes = sumLines(actualLines, childrenOf("deducoes"), month);
    const receitaLiquida = receitaBruta - deducoes;
    const custos = sumLines(actualLines, childrenOf("custos"), month);
    const margem = receitaLiquida - custos;
    const despesas = sumLines(actualLines, childrenOf("despesas"), month);
    const ebitda = margem - despesas;
    const investimentos = sumLines(actualLines, childrenOf("investimentos"), month);
    const financeiro = sumLines(actualLines, childrenOf("finex"), month);
    const tributos = sumLines(actualLines, childrenOf("tributos"), month);
    const resultado = ebitda - investimentos - financeiro - tributos;
    return { month, receitaBruta, deducoes, receitaLiquida, custos, margem, despesas, ebitda, investimentos, financeiro, tributos, resultado };
  });

  const dreStructure = [
    { key:"receitaBruta", label:"Receita Operacional Bruta", type:"total" },
    { key:"deducoes", label:"(-) Deduções da Receita", type:"deduction", negative:true },
    { key:"receitaLiquida", label:"(=) Receita Operacional Líquida", type:"subtotal" },
    { key:"custos", label:"(-) Custos de Produção", type:"deduction", negative:true },
    { key:"margem", label:"(=) Lucro Bruto / Margem", type:"subtotal" },
    { key:"despesas", label:"(-) Despesas Operacionais", type:"deduction", negative:true },
    { key:"ebitda", label:"(=) EBITDA", type:"subtotal" },
    { key:"investimentos", label:"(-) Investimentos", type:"deduction", negative:true },
    { key:"financeiro", label:"(-) Resultado Financeiro", type:"deduction", negative:true },
    { key:"tributos", label:"(-) Tributos", type:"deduction", negative:true },
    { key:"resultado", label:"(=) Resultado Líquido", type:"result" },
  ];

  return dreStructure.map(row => {
    const plannedValue = planned.reduce((acc, month) => acc + month[row.key], 0);
    const actualValue = actualByMonth.reduce((acc, month) => acc + month[row.key], 0);
    return {
      ...row,
      planned: row.negative ? -plannedValue : plannedValue,
      actual: row.negative ? -actualValue : actualValue,
      variance: actualValue - plannedValue,
    };
  });
}

export function getScenarioComparison() {
  return scenarios.map(scenario => {
    const totals = getMonthlyTotals(scenario.id);
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

export function getPlanningSummary(scenarioId = "base") {
  const totals = getMonthlyTotals(scenarioId);
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
    accounts: accountPlan.length,
    leafAccounts: leafAccounts().length,
    actualMonths,
  };
}
