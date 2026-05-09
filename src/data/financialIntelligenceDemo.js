const monthly = [
  { mes:"Jan", receita:1280000, deducoes:78000, custos:482000, despesas:438000, investimentos:86000, financeiro:34000, tributos:41000, orcReceita:1220000, orcDespesas:430000, caixa:520000, entradas:1180000, saidas:1094000, pmr:33, pmp:28, cancelamentos:42000, chargebacks:19000 },
  { mes:"Fev", receita:1195000, deducoes:73000, custos:451000, despesas:462000, investimentos:94000, financeiro:39000, tributos:36000, orcReceita:1250000, orcDespesas:440000, caixa:477000, entradas:1080000, saidas:1123000, pmr:37, pmp:27, cancelamentos:51000, chargebacks:22000 },
  { mes:"Mar", receita:1375000, deducoes:82000, custos:506000, despesas:455000, investimentos:72000, financeiro:32000, tributos:49000, orcReceita:1320000, orcDespesas:452000, caixa:563000, entradas:1310000, saidas:1224000, pmr:31, pmp:29, cancelamentos:39000, chargebacks:17000 },
  { mes:"Abr", receita:1468000, deducoes:88000, custos:532000, despesas:471000, investimentos:69000, financeiro:29000, tributos:53000, orcReceita:1390000, orcDespesas:465000, caixa:642000, entradas:1415000, saidas:1336000, pmr:29, pmp:31, cancelamentos:36000, chargebacks:15000 },
  { mes:"Mai", receita:1530000, deducoes:92000, custos:548000, despesas:486000, investimentos:68000, financeiro:28000, tributos:56000, orcReceita:1460000, orcDespesas:478000, caixa:724000, entradas:1502000, saidas:1420000, pmr:28, pmp:32, cancelamentos:34000, chargebacks:14000 },
  { mes:"Jun", receita:1612000, deducoes:97000, custos:573000, despesas:503000, investimentos:76000, financeiro:31000, tributos:61000, orcReceita:1520000, orcDespesas:492000, caixa:808000, entradas:1588000, saidas:1504000, pmr:27, pmp:33, cancelamentos:32000, chargebacks:13000 },
];

const cashFlow = [
  { periodo:"Semana 1", entradas:384000, saidas:331000 },
  { periodo:"Semana 2", entradas:352000, saidas:388000 },
  { periodo:"Semana 3", entradas:421000, saidas:358000 },
  { periodo:"Semana 4", entradas:395000, saidas:452000 },
  { periodo:"Semana 5", entradas:438000, saidas:372000 },
  { periodo:"Semana 6", entradas:462000, saidas:398000 },
  { periodo:"Semana 7", entradas:446000, saidas:417000 },
  { periodo:"Semana 8", entradas:488000, saidas:431000 },
];

export const demoMeta = {
  company:"Empresa Demo",
  period:"YTD Jan-Jun 2026",
  lastUpdate:"27/04/2026 18:52",
  source:"Base demo 2AS",
};

const DEMO_PROFILE_ALIASES = Object.freeze({
  "demo-saudavel": "saudavel",
  "demo-atencao": "atencao",
  "demo-crise": "crise",
  "2AS-demo": "saudavel",
  "2AS-inteligencia-financeira": "saudavel",
  "2as-demo": "saudavel",
  "2as-inteligencia-financeira": "saudavel",
  "cliente-growth": "atencao",
  saudavel: "saudavel",
  atencao: "atencao",
  crise: "crise",
});

const PROFILE_TUNING = Object.freeze({
  saudavel: {
    label: "Saudável",
    healthText: "operação estável",
    source: "Base demo 2AS · Saudável",
    receita: 1,
    deducoes: 1,
    custos: 1,
    despesas: 1,
    investimentos: 1,
    financeiro: 1,
    tributos: 1,
    caixa: 1,
    entradas: 1,
    saidas: 1,
    pmrDelta: 0,
    pmpDelta: 0,
    cancelamentos: 1,
    chargebacks: 1,
  },
  atencao: {
    label: "Atenção",
    healthText: "ponto de atenção",
    source: "Base demo 2AS · Atenção",
    receita: 0.78,
    deducoes: 0.86,
    custos: 0.92,
    despesas: 0.96,
    investimentos: 0.82,
    financeiro: 1.28,
    tributos: 0.84,
    caixa: 0.45,
    entradas: 0.85,
    saidas: 1.05,
    pmrDelta: 9,
    pmpDelta: -3,
    cancelamentos: 2.1,
    chargebacks: 2.4,
  },
  crise: {
    label: "Crise",
    healthText: "risco crítico",
    source: "Base demo 2AS · Crise",
    receita: 0.56,
    deducoes: 0.66,
    custos: 0.78,
    despesas: 0.92,
    investimentos: 0.58,
    financeiro: 2.2,
    tributos: 0.68,
    caixa: 0.15,
    entradas: 0.45,
    saidas: 1.1,
    pmrDelta: 18,
    pmpDelta: -8,
    cancelamentos: 4.6,
    chargebacks: 5.3,
  },
});

function resolveDemoProfile(profileOrCompanyId = "saudavel") {
  return DEMO_PROFILE_ALIASES[String(profileOrCompanyId || "").trim()] || "saudavel";
}

const money = value => Math.round(value);

export function getMonthly(profileOrCompanyId = "saudavel") {
  const profileName = resolveDemoProfile(profileOrCompanyId);
  const tuning = PROFILE_TUNING[profileName] || PROFILE_TUNING.saudavel;
  return monthly.map(row => {
    const receita = money(row.receita * tuning.receita);
    const deducoes = money(row.deducoes * tuning.deducoes);
    const custos = money(row.custos * tuning.custos);
    const despesas = money(row.despesas * tuning.despesas);
    const investimentos = money(row.investimentos * tuning.investimentos);
    const financeiro = money(row.financeiro * tuning.financeiro);
    const tributos = money(row.tributos * tuning.tributos);
    const caixa = money(row.caixa * tuning.caixa);
    const entradas = money(row.entradas * tuning.entradas);
    const saidas = money(row.saidas * tuning.saidas);
    const cancelamentos = money(row.cancelamentos * tuning.cancelamentos);
    const chargebacks = money(row.chargebacks * tuning.chargebacks);
    const pmr = row.pmr + tuning.pmrDelta;
    const pmp = Math.max(1, row.pmp + tuning.pmpDelta);
    const receitaLiquida = receita - deducoes;
    const margemContribuicao = receitaLiquida - custos;
    const ebitda = margemContribuicao - despesas;
    const resultado = ebitda - investimentos - financeiro - tributos;
    return {
      ...row,
      receita,
      deducoes,
      custos,
      despesas,
      investimentos,
      financeiro,
      tributos,
      caixa,
      entradas,
      saidas,
      pmr,
      pmp,
      cancelamentos,
      chargebacks,
      receitaLiquida,
      margemContribuicao,
      ebitda,
      resultado,
      margemContribuicaoPct: receitaLiquida ? (margemContribuicao / receitaLiquida) * 100 : 0,
      margemEbitdaPct: receitaLiquida ? (ebitda / receitaLiquida) * 100 : 0,
      margemLiquidaPct: receitaLiquida ? (resultado / receitaLiquida) * 100 : 0,
      cicloCaixa: row.pmr - row.pmp,
      variacaoReceita: row.orcReceita ? ((row.receita - row.orcReceita) / row.orcReceita) * 100 : 0,
      variacaoDespesa: row.orcDespesas ? ((row.despesas - row.orcDespesas) / row.orcDespesas) * 100 : 0,
    };
  });
}

const sum = (rows, key) => rows.reduce((acc, row) => acc + (row[key] || 0), 0);
const avg = (rows, key) => rows.length ? rows.reduce((acc, row) => acc + (row[key] || 0), 0) / rows.length : 0;

export function calcHealthScore(kpis) {
  const dims = [];

  // Liquidez — 30 pts
  let liq = 0;
  if (kpis.saldoAtual > 0)   liq += 10;
  if (kpis.menorSaldo >= 0)  liq += 10;
  if      (kpis.runwayDias >= 56) liq += 10;
  else if (kpis.runwayDias >= 30) liq += 5;
  dims.push({ label:"Liquidez", peso:30, pontos:liq, max:30,
    desc:"Saldo atual, saldo mínimo projetado nas próximas 8 semanas e runway de caixa.",
    criterios:["Saldo > 0 (10pts)", "Mín. projetado ≥ 0 (10pts)", "Runway ≥ 56d (10pts)"] });

  // Performance — 25 pts
  let perf = 0;
  if      (kpis.margemEbitdaPct >= 15) perf += 15;
  else if (kpis.margemEbitdaPct >= 8)  perf += 8;
  else if (kpis.margemEbitdaPct >= 0)  perf += 4;
  if      (kpis.margemLiquidaPct >= 8) perf += 10;
  else if (kpis.margemLiquidaPct >= 3) perf += 5;
  else if (kpis.margemLiquidaPct >= 0) perf += 2;
  dims.push({ label:"Performance", peso:25, pontos:perf, max:25,
    desc:"Margem EBITDA e margem líquida calculadas sobre receita líquida acumulada.",
    criterios:["EBITDA ≥ 15% (15pts)", "EBITDA ≥ 8% (8pts)", "Margem liq. ≥ 8% (10pts)", "Margem liq. ≥ 3% (5pts)"] });

  // Orçamento — 20 pts
  let orc = 0;
  if      (kpis.variacaoReceita >= 5)  orc += 12;
  else if (kpis.variacaoReceita >= 0)  orc += 8;
  else if (kpis.variacaoReceita >= -5) orc += 4;
  if      (kpis.variacaoDespesa <= 0)  orc += 8;
  else if (kpis.variacaoDespesa <= 3)  orc += 4;
  dims.push({ label:"Orçamento", peso:20, pontos:orc, max:20,
    desc:"Aderência da receita ao plano aprovado e controle de despesas dentro do orçado.",
    criterios:["Receita ≥ +5% orçado (12pts)", "Receita ≥ orçado (8pts)", "Desp. ≤ orçado (8pts)", "Desp. ≤ +3% orçado (4pts)"] });

  // Ciclo Financeiro — 15 pts
  let ciclo = 0;
  if      (kpis.cicloCaixa <= 0)  ciclo = 15;
  else if (kpis.cicloCaixa <= 5)  ciclo = 10;
  else if (kpis.cicloCaixa <= 10) ciclo = 6;
  else if (kpis.cicloCaixa <= 20) ciclo = 3;
  dims.push({ label:"Ciclo Financeiro", peso:15, pontos:ciclo, max:15,
    desc:"Diferença entre prazo médio de recebimento (PMR) e de pagamento (PMP). Ciclo zero ou negativo libera capital.",
    criterios:["Ciclo ≤ 0d (15pts)", "Ciclo ≤ 5d (10pts)", "Ciclo ≤ 10d (6pts)", "Ciclo ≤ 20d (3pts)"] });

  // Risco Operacional — 10 pts
  const riscoPct = kpis.receita ? (kpis.riscoOperacional / kpis.receita) * 100 : 100;
  let risco = 0;
  if      (riscoPct <= 3) risco = 10;
  else if (riscoPct <= 5) risco = 6;
  else if (riscoPct <= 8) risco = 3;
  dims.push({ label:"Risco Operacional", peso:10, pontos:risco, max:10,
    desc:"Cancelamentos e chargebacks acumulados como percentual da receita bruta.",
    criterios:["Risco ≤ 3% da receita (10pts)", "Risco ≤ 5% (6pts)", "Risco ≤ 8% (3pts)"] });

  const score = dims.reduce((acc, d) => acc + d.pontos, 0);
  return { score, dims };
}

export function buildFinancialIntelligence(profileOrCompanyId = "saudavel") {
  const profileName = resolveDemoProfile(profileOrCompanyId);
  const tuning = PROFILE_TUNING[profileName] || PROFILE_TUNING.saudavel;
  const meses = getMonthly(profileName);
  const receita = sum(meses, "receita");
  const receitaLiquida = sum(meses, "receitaLiquida");
  const custos = sum(meses, "custos");
  const despesas = sum(meses, "despesas");
  const margemContribuicao = sum(meses, "margemContribuicao");
  const ebitda = sum(meses, "ebitda");
  const resultado = sum(meses, "resultado");
  const saldoAtual = meses.at(-1).caixa;
  let saldo = saldoAtual;
  const fluxo = cashFlow.map(row => {
    const entradas = money(row.entradas * tuning.entradas);
    const saidas = money(row.saidas * tuning.saidas);
    saldo += entradas - saidas;
    return { ...row, entradas, saidas, saldo };
  });
  const menorSaldo = Math.min(...fluxo.map(row => row.saldo));
  const runway = fluxo.findIndex(row => row.saldo < 0);
  const pmr = Math.round(avg(meses, "pmr"));
  const pmp = Math.round(avg(meses, "pmp"));
  const cicloCaixa = pmr - pmp;
  const capitalGiro = Math.round((receitaLiquida / 180) * Math.max(cicloCaixa, 0));
  const orcadoReceita = sum(meses, "orcReceita");
  const orcadoDespesas = sum(meses, "orcDespesas");
  const cancelamentos = sum(meses, "cancelamentos");
  const chargebacks = sum(meses, "chargebacks");

  return {
    meta: {
      ...demoMeta,
      company: `Empresa Demo · ${tuning.label}`,
      source: tuning.source,
      profile: profileName,
      healthText: tuning.healthText,
    },
    meses,
    kpis: {
      receita,
      receitaLiquida,
      margemContribuicao,
      margemContribuicaoPct: receitaLiquida ? (margemContribuicao / receitaLiquida) * 100 : 0,
      ebitda,
      margemEbitdaPct: receitaLiquida ? (ebitda / receitaLiquida) * 100 : 0,
      resultado,
      margemLiquidaPct: receitaLiquida ? (resultado / receitaLiquida) * 100 : 0,
      saldoAtual,
      menorSaldo,
      runwayDias: runway >= 0 ? (runway + 1) * 7 : 56,
      pmr,
      pmp,
      cicloCaixa,
      capitalGiro,
      cancelamentos,
      chargebacks,
      riscoOperacional: cancelamentos + chargebacks,
      variacaoReceita: orcadoReceita ? ((receita - orcadoReceita) / orcadoReceita) * 100 : 0,
      variacaoDespesa: orcadoDespesas ? ((despesas - orcadoDespesas) / orcadoDespesas) * 100 : 0,
    },
    dreRows: [
      { label:"Receita operacional bruta", value:receita, type:"total" },
      { label:"Deduções da receita", value:-sum(meses, "deducoes"), type:"deduction" },
      { label:"Receita operacional líquida", value:receitaLiquida, type:"subtotal" },
      { label:"Custos variáveis", value:-custos, type:"deduction" },
      { label:"Margem de contribuição", value:margemContribuicao, type:"subtotal" },
      { label:"Despesas operacionais", value:-despesas, type:"deduction" },
      { label:"EBITDA", value:ebitda, type:"subtotal" },
      { label:"Investimentos", value:-sum(meses, "investimentos"), type:"deduction" },
      { label:"Resultado financeiro", value:-sum(meses, "financeiro"), type:"deduction" },
      { label:"Tributos", value:-sum(meses, "tributos"), type:"deduction" },
      { label:"Resultado líquido", value:resultado, type:"result" },
    ],
    fluxo,
    cenarios: [
      scenario("Base", "Projeção atual", fluxo, saldoAtual, 1, 1),
      scenario("Defensivo", "Receita -12%, saídas +6%", fluxo, saldoAtual, 0.88, 1.06),
      scenario("Crescimento", "Receita +14%, saídas +5%", fluxo, saldoAtual, 1.14, 1.05),
    ],
    behaviorInsights: [
      {
        area: "Fornecedores",
        nivel: "Atenção",
        titulo: "Pressão de fornecedores recorrentes",
        causa: "Pagamentos de fornecedores críticos cresceram acima do ritmo da receita nos últimos meses.",
        impacto: "Pode reduzir margem e comprimir caixa nas semanas com maior concentração de vencimentos.",
        acao: "Revisar contratos, recorrência e calendário de pagamento dos maiores fornecedores.",
        rota: "contas-pagar",
      },
      {
        area: "Categorias",
        nivel: "Investigação",
        titulo: "Despesa cresce antes da receita",
        causa: "Despesas operacionais avançaram mais rápido que a receita orçada no acumulado.",
        impacto: "A margem EBITDA permanece positiva, mas fica mais sensível a atrasos de recebimento.",
        acao: "Cruzar orçamento por área com categorias que explicam o desvio.",
        rota: "orcamento",
      },
      {
        area: "Caixa",
        nivel: "Monitorar",
        titulo: "Concentração semanal de saídas",
        causa: "O fluxo projetado mostra semanas em que saídas superam entradas mesmo com saldo atual positivo.",
        impacto: "A empresa pode precisar antecipar cobrança ou renegociar vencimentos sem alterar o resultado do mês.",
        acao: "Abrir fluxo projetado e classificar vencimentos entre pagar, acompanhar e renegociar.",
        rota: "fluxo-projetado",
      },
    ],
    financialExplainer: {
      title: "Leitura automática do período",
      confidence: "Alta",
      summary: "A operação segue rentável, mas a geração de caixa exige disciplina semanal. O DRE mostra EBITDA positivo porque a receita líquida sustenta os custos e despesas, enquanto o fluxo precisa de atenção por semanas com pagamentos concentrados.",
      drivers: [
        "Margem EBITDA positiva, mas ainda sensível ao crescimento das despesas operacionais.",
        "Runway preservado no cenário base, com risco concentrado em semanas de maior saída.",
        "Ciclo de caixa ainda positivo: reduzir PMR ou alongar PMP libera capital de giro.",
      ],
      dataRisks: [
        "Benchmark e comportamento usam base demo nesta etapa.",
        "Conciliação e centros de custo dependem do ERP conectado no futuro.",
      ],
    },
    benchmarkInsights: [
      {
        metric: "PMR",
        company: `${pmr}d`,
        benchmark: "30d",
        status: pmr <= 30 ? "Dentro" : "Acima",
        reading: pmr <= 30 ? "Recebimento competitivo para o perfil simulado." : "Recebimento acima da referência; há capital preso em clientes.",
      },
      {
        metric: "PMP",
        company: `${pmp}d`,
        benchmark: "34d",
        status: pmp >= 34 ? "Favorável" : "Curto",
        reading: pmp >= 34 ? "Prazo de pagamento ajuda a sustentar o caixa." : "Prazo de pagamento curto pressiona a liquidez semanal.",
      },
      {
        metric: "Margem EBITDA",
        company: `${(receitaLiquida ? (ebitda / receitaLiquida) * 100 : 0).toFixed(1)}%`,
        benchmark: "15,0%",
        status: (receitaLiquida ? (ebitda / receitaLiquida) * 100 : 0) >= 15 ? "Acima" : "Ajustar",
        reading: "Referencia simulada para comparar qualidade de margem com empresas semelhantes.",
      },
      {
        metric: "Qualidade da base",
        company: "82/100",
        benchmark: "85/100",
        status: "Parcial",
        reading: "Pontuação considera categorização, atualização e completude dos dados no demo.",
      },
    ],
    prioridades: [
      { area:"Liquidez", nivel:"Atenção", titulo:"Proteger caixa das próximas 4 semanas", texto:"Há semanas com saída acima da entrada. Antecipar cobrança e renegociar picos de pagamento.", rota:"fluxo-projetado" },
      { area:"Performance", nivel:"Decisão", titulo:"EBITDA positivo, mas margem ainda apertada", texto:"A margem operacional precisa subir 2,4 p.p. para sustentar crescimento sem consumir caixa.", rota:"dre" },
      { area:"Ciclo Financeiro", nivel:"Oportunidade", titulo:"Reduzir ciclo de caixa para zero", texto:"PMR médio está acima do PMP. Reduzir 4 dias libera capital de giro.", rota:"ciclo-financeiro" },
      { area:"Risco Operacional", nivel:"Monitorar", titulo:"Cancelamentos e chargebacks afetam receita líquida", texto:"O risco acumulado representa exposição relevante e deve entrar na rotina de governança.", rota:"op-cancelamentos" },
    ],
    planoAcao: [
      { dono:"CFO 2AS", decisao:"Revisar calendário de pagamentos críticos", impacto:"Evita compressão de caixa", prazo:"Esta semana" },
      { dono:"Comercial", decisao:"Antecipar recebíveis com melhor margem", impacto:"Melhora runway sem dívida nova", prazo:"7 dias" },
      { dono:"Operação", decisao:"Reduzir causas de cancelamento e disputa", impacto:"Protege receita líquida", prazo:"15 dias" },
      { dono:"Diretoria", decisao:"Validar orçamento revisado do trimestre", impacto:"Alinha crescimento e margem", prazo:"Próxima reunião" },
    ],
    scoreData: calcHealthScore({
      saldoAtual, menorSaldo, runwayDias: runway >= 0 ? (runway + 1) * 7 : 56,
      margemEbitdaPct: receitaLiquida ? (ebitda / receitaLiquida) * 100 : 0,
      margemLiquidaPct: receitaLiquida ? (resultado / receitaLiquida) * 100 : 0,
      variacaoReceita: orcadoReceita ? ((receita - orcadoReceita) / orcadoReceita) * 100 : 0,
      variacaoDespesa: orcadoDespesas ? ((despesas - orcadoDespesas) / orcadoDespesas) * 100 : 0,
      cicloCaixa, receita,
      riscoOperacional: cancelamentos + chargebacks,
    }),
  };
}

function scenario(label, desc, fluxo, saldoInicial, entradaFactor, saidaFactor) {
  let saldo = saldoInicial;
  let ruptura = null;
  fluxo.forEach((row, index) => {
    saldo += row.entradas * entradaFactor - row.saidas * saidaFactor;
    if (ruptura === null && saldo < 0) ruptura = (index + 1) * 7;
  });
  return { label, desc, saldoFinal:saldo, runwayDias:ruptura || fluxo.length * 7 };
}
