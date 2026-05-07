// ════════════════════════════════════════════════════════════════
//  PATCH GRANATUM — FLUXO HISTÓRICO INTRADAY (HOJE)
//
//  OBJETIVO
//  - Refletir pagamentos e entradas do dia no histórico sem esperar D+1
//  - Atualizar as abas base usadas por fórmulas / Looker
//  - Manter a carga histórica "cheia" até ontem e só injetar o HOJE
//
//  COMO USAR
//  1. Cole este arquivo NO FINAL do Apps Script atual.
//  2. Salve.
//  3. Rode sincronizarIntraday() manualmente.
//  4. Confira:
//     - granatum_despesas_historico
//     - granatum_entradas_historico
//     - granatum_fluxo_historico
//     - granatum_fluxo_mensal
//
//  O patch sobrescreve sincronizarIntraday() para incluir o histórico
//  intraday do HOJE, preservando o restante do fluxo atual.
// ════════════════════════════════════════════════════════════════

const GRANATUM_INTRADAY_CONTAS_SAIDA = [
  'BANCO BTG -  DIRECAO EDITORA',
  'BANCO BTG - VEMAR EDITORA',
  'BANCO ITAU',
  'BANCO BRADESCO'
];

function granatumIntradayNorm_(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function granatumIntradayNormSemAcento_(v) {
  return granatumIntradayNorm_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function granatumIntradayUrl_(rota, params) {
  const token = getToken_();
  const qs = Object.keys(params || {})
    .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  return 'https://api.granatum.com.br/v1/' + rota + '?access_token=' + encodeURIComponent(token) + (qs ? '&' + qs : '');
}

function granatumIntradayBuscarLancamentosConta_(conta, inicio, fim) {
  let out = [];
  let start = 0;

  while (true) {
    const url = granatumIntradayUrl_('lancamentos', {
      conta_id: conta.id,
      data_inicio: inicio,
      data_fim: fim,
      regime: 'caixa',
      tipo_view: 'detail',
      limit: 500,
      start: start
    });

    const dados = chamarAPI_(url);
    if (dados === null) {
      throw new Error('[Intraday Histórico] Falha ao buscar lançamentos da conta: ' + conta.descricao);
    }

    const chunk = dados || [];
    chunk.forEach(l => {
      l._conta_nome = conta.descricao;
      l._conta_id = conta.id;
    });
    out = out.concat(chunk);

    if (chunk.length < 500) break;
    start += 500;
    Utilities.sleep(250);
  }

  return out;
}

function granatumIntradayGetMapaFornecedores_() {
  const fornecedores = chamarAPI_(granatumIntradayUrl_('fornecedores', {
    considerar_inativos: 'true'
  })) || [];

  const mapa = {};
  fornecedores.forEach(f => {
    mapa[f.id] = {
      nome: f.nome || '',
      nomeFantasia: f.nome_fantasia || ''
    };
  });
  return mapa;
}

function granatumIntradayNomeFornecedor_(lancamento, mapaFornecedores) {
  if (!lancamento) return '';

  const direto = lancamento.fornecedor || lancamento.pessoa || lancamento.cliente_fornecedor;
  if (direto && typeof direto === 'object') {
    return direto.nome_fantasia || direto.nome || direto.razao_social || direto.descricao || '';
  }
  if (typeof direto === 'string') return direto;

  const camposTexto = [
    lancamento.fornecedor_nome,
    lancamento.nome_fornecedor,
    lancamento.pessoa_nome,
    lancamento.nome_pessoa
  ];
  const porCampo = camposTexto.find(v => v && String(v).trim());
  if (porCampo) return String(porCampo).trim();

  const pessoaId = lancamento.pessoa_id || lancamento.fornecedor_id;
  const fornecedor = pessoaId ? mapaFornecedores[pessoaId] : null;
  return fornecedor ? (fornecedor.nomeFantasia || fornecedor.nome || '') : '';
}

function granatumIntradayResolverContasBanco_() {
  const todas = chamarAPI_(granatumIntradayUrl_('contas', {})) || [];
  const contas = todas.filter(c =>
    GRANATUM_INTRADAY_CONTAS_SAIDA.some(n => granatumIntradayNorm_(n) === granatumIntradayNorm_(c.descricao))
  );
  if (contas.length === 0) {
    throw new Error('[Intraday Histórico] Nenhuma conta bancária encontrada para o conjunto intraday.');
  }
  return contas;
}

function granatumIntradayLinhasDespesasHoje_(hojeStr) {
  const mapaCategorias = getMapaCategorias_();
  const mapaFornecedores = granatumIntradayGetMapaFornecedores_();
  const contasBanco = granatumIntradayResolverContasBanco_();

  let raw = [];
  contasBanco.forEach(conta => {
    raw = raw.concat(granatumIntradayBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  const vistos = new Set();
  const semDup = raw.filter(l => {
    if (vistos.has(l.id)) return false;
    vistos.add(l.id);
    return true;
  });

  const pagos = semDup.filter(l =>
    l.data_pagamento &&
    GRANATUM_INTRADAY_CONTAS_SAIDA.some(n => granatumIntradayNorm_(n) === granatumIntradayNorm_(l._conta_nome || ''))
  );

  const grupos = agruparPorComposto_(pagos, mapaCategorias);

  const linhas = grupos.map(g => {
    const descDeducoes = g.deducoes
      .map(d => d.descricao + ' (' + d.valor.toFixed(2) + ')')
      .join(' | ');

    return [
      g.pai.data_pagamento || '',
      g.contaNome,
      g.pai.descricao || '',
      g.pai.categoria_id || '',
      mapaCategorias[g.pai.categoria_id] || '',
      g.bruto,
      g.totalDeducoes,
      g.liquido,
      descDeducoes,
      g.pai.conta_id || '',
      g.pai.id || '',
      granatumIntradayNomeFornecedor_(g.pai, mapaFornecedores)
    ];
  });

  linhas.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  Logger.log('[Intraday Histórico] Despesas hoje: ' + linhas.length + ' linhas.');
  return linhas;
}

function granatumIntradayLinhasEntradasHoje_(hojeStr) {
  const mapaCategorias = getMapaCategorias_();
  const contasBanco = granatumIntradayResolverContasBanco_();
  const { contas: contasOp } = resolverContas_();

  // ── 1. Busca bruto nas contas bancárias ─────────────────────
  let rawBanco = [];
  contasBanco.forEach(conta => {
    rawBanco = rawBanco.concat(granatumIntradayBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  const todosIdsBanco = new Set(rawBanco.map(l => l.id));
  const vistosTransfer = new Set();

  const transferencias = rawBanco.filter(l => {
    if (vistosTransfer.has(l.id)) return false;
    vistosTransfer.add(l.id);
    if ((parseFloat(l.valor) || 0) <= 0) return false;
    if (!l.data_pagamento) return false;
    if (!l.lancamento_transferencia_id) return false;
    if (todosIdsBanco.has(l.lancamento_transferencia_id)) return false;
    return true;
  }).map(l => [
    l.data_pagamento || '',
    l._conta_nome || '',
    l.descricao || '',
    parseFloat(l.valor) || 0,
    l.conta_id || '',
    l.id || ''
  ]);

  // ── 2. Busca receitas diretas nas contas operacionais ───────
  const catsBusca = HIST_CATEGORIAS_RECEITA.map(granatumIntradayNormSemAcento_);
  let rawReceitas = [];
  contasOp.forEach(conta => {
    rawReceitas = rawReceitas.concat(granatumIntradayBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  const idsTransfer = new Set(transferencias.map(r => String(r[5] || '')));
  const vistosReceita = new Set();

  const receitas = rawReceitas.filter(l => {
    if (vistosReceita.has(l.id)) return false;
    vistosReceita.add(l.id);
    if (idsTransfer.has(String(l.id || ''))) return false;
    if ((parseFloat(l.valor) || 0) <= 0) return false;
    if (!l.data_pagamento) return false;
    const categoriaObj = typeof l.categoria === 'object' ? l.categoria : null;
    const categoriaNome = categoriaObj?.descricao || l.categoria || mapaCategorias[l.categoria_id] || '';
    const categoriaNorm = granatumIntradayNormSemAcento_(categoriaNome);
    return catsBusca.some(cat => categoriaNorm.includes(cat));
  }).map(l => [
    l.data_pagamento || '',
    l._conta_nome || '',
    l.descricao || '',
    parseFloat(l.valor) || 0,
    l.conta_id || '',
    l.id || ''
  ]);

  const linhas = [...transferencias, ...receitas];

  const usados = new Set();
  const semDup = linhas.filter(r => {
    const id = String(r[5] || '');
    if (!id) return false;
    if (usados.has(id)) return false;
    usados.add(id);
    return true;
  });

  semDup.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  Logger.log('[Intraday Histórico] Entradas hoje: ' + semDup.length + ' linhas.');
  return semDup;
}

function granatumIntradayEncontrarLinhaCabecalho_(aba, marcador, maxRows) {
  const limite = Math.min(maxRows || 30, aba.getLastRow());
  for (let i = 1; i <= limite; i++) {
    const val = String(aba.getRange(i, 1).getValue() || '').trim().toUpperCase();
    if (val === String(marcador || '').trim().toUpperCase()) return i;
  }
  return -1;
}

function granatumIntradayLerTabela_(aba, linhaCabecalho) {
  const primeira = linhaCabecalho + 1;
  const ultLinha = aba.getLastRow();
  const ultCol = aba.getLastColumn();
  if (ultLinha < primeira || ultCol < 1) return [];
  return aba.getRange(primeira, 1, ultLinha - primeira + 1, ultCol).getValues();
}

function granatumIntradayAtualizarMetadadosDespesasHistorico_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('granatum_despesas_historico');
  if (!aba) return;

  const linhaCab = granatumIntradayEncontrarLinhaCabecalho_(aba, 'DATA_PAGAMENTO', 20);
  if (linhaCab < 0) return;

  const rows = granatumIntradayLerTabela_(aba, linhaCab);
  const totalLiquido = rows.reduce((s, r) => s + (parseFloat(r[7]) || 0), 0);
  const totalBruto = rows.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0);
  const totalDeducoes = rows.reduce((s, r) => s + (parseFloat(r[6]) || 0), 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_LIQUIDO', totalLiquido]]);
  aba.getRange('A3:B3').setValues([['TOTAL_BRUTO', totalBruto]]);
  aba.getRange('A4:B4').setValues([['TOTAL_DEDUCOES', totalDeducoes]]);
  aba.getRange('A5:B5').setValues([['QTD_LANCAMENTOS', rows.length]]);
  aba.getRange('A8:B8').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
  aba.getRange('B2:B4').setNumberFormat('#,##0.00');
  aba.getRange('B5').setNumberFormat('0');
}

function granatumIntradayAtualizarMetadadosEntradasHistorico_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('granatum_entradas_historico');
  if (!aba) return;

  const linhaCab = granatumIntradayEncontrarLinhaCabecalho_(aba, 'DATA_PAGAMENTO', 20);
  if (linhaCab < 0) return;

  const rows = granatumIntradayLerTabela_(aba, linhaCab);
  const totalEntradas = rows.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_ENTRADAS', totalEntradas]]);
  aba.getRange('A3:B3').setValues([['QTD_ENTRADAS', rows.length]]);
  aba.getRange('A5:B5').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
  aba.getRange('B2').setNumberFormat('#,##0.00');
}

function granatumIntradayRecalcularFluxoHistorico_(hojeStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('granatum_fluxo_historico');
  if (!aba) {
    Logger.log('[Intraday Histórico] Aba granatum_fluxo_historico não encontrada. Rode criarFluxoHistorico() primeiro.');
    return;
  }

  const linhaCab = granatumIntradayEncontrarLinhaCabecalho_(aba, 'DATA', 30);
  if (linhaCab < 0) {
    Logger.log('[Intraday Histórico] Cabeçalho DATA não encontrado em granatum_fluxo_historico.');
    return;
  }

  const primeira = linhaCab + 1;
  const ultLinha = aba.getLastRow();
  const ultCol = Math.max(5, aba.getLastColumn());
  const rows = ultLinha >= primeira
    ? aba.getRange(primeira, 1, ultLinha - primeira + 1, 5).getValues()
    : [];

  const normalizarData_ = v => {
    if (v instanceof Date) return Utilities.formatDate(v, FUSO, 'yyyy-MM-dd');
    const s = String(v || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const p = s.substring(0, 10).split('/');
      return p[2] + '-' + p[1] + '-' + p[0];
    }
    return '';
  };

  const idxHoje = rows.findIndex(r => normalizarData_(r[0]) === hojeStr);
  const idxAnterior = idxHoje >= 0 ? idxHoje - 1 : rows.length - 1;
  const linhaAnterior = idxAnterior >= 0 ? rows[idxAnterior] : null;
  const saldoInicial = linhaAnterior ? (parseFloat(linhaAnterior[4]) || 0) : HIST_SALDO_INI;

  const abaEnt = ss.getSheetByName('granatum_entradas_historico');
  const abaSai = ss.getSheetByName('granatum_despesas_historico');

  const totalEntradasHoje = (() => {
    if (!abaEnt) return 0;
    const cab = granatumIntradayEncontrarLinhaCabecalho_(abaEnt, 'DATA_PAGAMENTO', 20);
    if (cab < 0) return 0;
    const dados = granatumIntradayLerTabela_(abaEnt, cab);
    return dados
      .filter(r => normalizarData_(r[0]) === hojeStr)
      .reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);
  })();

  const totalSaidasHoje = (() => {
    if (!abaSai) return 0;
    const cab = granatumIntradayEncontrarLinhaCabecalho_(abaSai, 'DATA_PAGAMENTO', 20);
    if (cab < 0) return 0;
    const dados = granatumIntradayLerTabela_(abaSai, cab);
    return dados
      .filter(r => normalizarData_(r[0]) === hojeStr)
      .reduce((s, r) => s + (parseFloat(r[7]) || 0), 0);
  })();

  const saldoFinal = saldoInicial + totalEntradasHoje - totalSaidasHoje;
  const novaLinha = [hojeStr, saldoInicial, totalEntradasHoje, totalSaidasHoje, saldoFinal];

  if (idxHoje >= 0) {
    aba.getRange(primeira + idxHoje, 1, 1, 5).setValues([novaLinha]);
  } else {
    aba.getRange(ultLinha + 1, 1, 1, 5).setValues([novaLinha]);
  }

  granatumIntradayRecalcularMetadadosFluxoHistorico_(aba, linhaCab);
}

function granatumIntradayRecalcularMetadadosFluxoHistorico_(aba, linhaCabecalho) {
  const primeira = linhaCabecalho + 1;
  const ultLinha = aba.getLastRow();
  if (ultLinha < primeira) return;

  const rows = aba.getRange(primeira, 1, ultLinha - primeira + 1, 5).getValues();
  const totalEntradas = rows.reduce((s, r) => s + (parseFloat(r[2]) || 0), 0);
  const totalSaidas = rows.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);
  const variacaoLiq = totalEntradas - totalSaidas;
  const saldoFinal = parseFloat(rows[rows.length - 1][4]) || 0;
  const diasComSaida = rows.filter(r => (parseFloat(r[3]) || 0) > 0).length;
  const totalDias = rows.length;
  const burnRateDiario = diasComSaida > 0 ? totalSaidas / diasComSaida : 0;
  const burnRateMensal = burnRateDiario * 30;
  const burnRateMedio = totalDias > 0 ? totalSaidas / totalDias : 0;
  const runway = burnRateDiario > 0 && saldoFinal > 0 ? Math.floor(saldoFinal / burnRateDiario) : 0;
  const diasNegativo = rows.filter(r => (parseFloat(r[4]) || 0) < 0).length;
  const diasComEntrada = rows.filter(r => (parseFloat(r[2]) || 0) > 0).length;
  const mediaVendasDia = diasComEntrada > 0 ? totalEntradas / diasComEntrada : 0;
  const mediaEntradasDia = totalDias > 0 ? totalEntradas / totalDias : 0;

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['VARIACAO_LIQUIDA', variacaoLiq]]);
  aba.getRange('A3:B3').setValues([['BURN_RATE_DIARIO', burnRateDiario]]);
  aba.getRange('A4:B4').setValues([['BURN_RATE_MENSAL', burnRateMensal]]);
  aba.getRange('A5:B5').setValues([['BURN_RATE_MEDIO', burnRateMedio]]);
  aba.getRange('A6:B6').setValues([['CASH_RUNWAY_DIAS', runway]]);
  aba.getRange('A7:B7').setValues([['DIAS_SALDO_NEGATIVO', diasNegativo]]);
  aba.getRange('A8:B8').setValues([['MEDIA_VENDAS_DIA', mediaVendasDia]]);
  aba.getRange('A9:B9').setValues([['MEDIA_ENTRADAS_DIA', mediaEntradasDia]]);
  aba.getRange('A10:B10').setValues([['TOTAL_ENTRADAS', totalEntradas]]);
  aba.getRange('A11:B11').setValues([['TOTAL_SAIDAS', totalSaidas]]);
  aba.getRange('A13:B13').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
  aba.getRange('B2:B5').setNumberFormat('#,##0.00');
  aba.getRange('B6:B7').setNumberFormat('0');
  aba.getRange('B8:B11').setNumberFormat('#,##0.00');
}

function sincronizarHistoricoIntradayHoje_() {
  const hojeStr = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');

  toast_('Histórico intraday — despesas do dia...', '⚡ Intraday Histórico', 5);
  const despesasHoje = granatumIntradayLinhasDespesasHoje_(hojeStr);
  upsertHistorico_('granatum_despesas_historico', despesasHoje, 1, 9, hojeStr, hojeStr);
  granatumIntradayAtualizarMetadadosDespesasHistorico_();

  toast_('Histórico intraday — entradas do dia...', '⚡ Intraday Histórico', 5);
  const entradasHoje = granatumIntradayLinhasEntradasHoje_(hojeStr);
  upsertHistorico_('granatum_entradas_historico', entradasHoje, 1, 7, hojeStr, hojeStr);
  granatumIntradayAtualizarMetadadosEntradasHistorico_();

  toast_('Histórico intraday — recalculando fluxo...', '⚡ Intraday Histórico', 5);
  granatumIntradayRecalcularFluxoHistorico_(hojeStr);

  try {
    gerarFluxoMensal();
  } catch (e) {
    Logger.log('[Intraday Histórico] Aviso ao gerar fluxo mensal: ' + e.message);
  }

  Logger.log('[Intraday Histórico] ✅ Hoje sincronizado no histórico: ' + hojeStr +
    ' | entradas: ' + entradasHoje.length + ' | saídas: ' + despesasHoje.length);
}

// ════════════════════════════════════════════════════════════════
//  OVERRIDE — SINCRONIZAR INTRADAY
//  Acrescenta o HOJE nas bases históricas usadas pelo Looker
// ════════════════════════════════════════════════════════════════

function sincronizarIntraday() {
  const inicio = new Date();

  toast_('1/5 — Despesas do dia...', '⚡ Sincronizar Intraday', 5);
  buscarDespesasDoDia();

  toast_('2/5 — Contas a pagar...', '⚡ Sincronizar Intraday', 5);
  buscarContasAPagar();

  toast_('3/5 — Contas vencidas...', '⚡ Sincronizar Intraday', 5);
  buscarContasVencidas();

  toast_('4/5 — Receitas...', '⚡ Sincronizar Intraday', 5);
  buscarReceitas();

  toast_('5/5 — Fluxo histórico intraday...', '⚡ Sincronizar Intraday', 5);
  sincronizarHistoricoIntradayHoje_();

  const seg = Math.round((new Date() - inicio) / 1000);
  toast_(
    '✅ Intraday sincronizado em ' + seg + 's — bases diárias e históricas atualizadas.',
    '⚡ Sincronizar Intraday',
    10
  );
  Logger.log('[Intraday] ✅ Concluído em ' + seg + 's com histórico intraday.');
}
