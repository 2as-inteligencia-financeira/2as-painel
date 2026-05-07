// PATCH MINIMO - FLUXO HISTORICO INTRADAY
// Cole em um ARQUIVO NOVO do Apps Script, por exemplo:
// patch_fluxo_intraday_min.gs

const INTRADAY_CONTAS_SAIDA_PATCH = [
  'BANCO BTG -  DIRECAO EDITORA',
  'BANCO BTG - VEMAR EDITORA',
  'BANCO ITAU',
  'BANCO BRADESCO'
];

function intradayPatchNorm_(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function intradayPatchNormSemAcento_(v) {
  return intradayPatchNorm_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function intradayPatchUrl_(rota, params) {
  const token = getToken_();
  const qs = Object.keys(params || {})
    .filter(function(k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');
  return 'https://api.granatum.com.br/v1/' + rota + '?access_token=' + encodeURIComponent(token) + (qs ? '&' + qs : '');
}

function intradayPatchBuscarLancamentosConta_(conta, inicio, fim) {
  var out = [];
  var start = 0;

  while (true) {
    var url = intradayPatchUrl_('lancamentos', {
      conta_id: conta.id,
      data_inicio: inicio,
      data_fim: fim,
      regime: 'caixa',
      tipo_view: 'detail',
      limit: 500,
      start: start
    });

    var dados = chamarAPI_(url);
    if (dados === null) {
      throw new Error('Falha ao buscar lancamentos da conta: ' + conta.descricao);
    }

    var chunk = dados || [];
    chunk.forEach(function(l) {
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

function intradayPatchResolverContasBanco_() {
  var todas = chamarAPI_(intradayPatchUrl_('contas', {})) || [];
  var contas = todas.filter(function(c) {
    return INTRADAY_CONTAS_SAIDA_PATCH.some(function(n) {
      return intradayPatchNorm_(n) === intradayPatchNorm_(c.descricao);
    });
  });
  if (contas.length === 0) {
    throw new Error('Nenhuma conta bancaria encontrada para o intraday.');
  }
  return contas;
}

function intradayPatchGetMapaFornecedores_() {
  var fornecedores = chamarAPI_(intradayPatchUrl_('fornecedores', {
    considerar_inativos: 'true'
  })) || [];
  var mapa = {};
  fornecedores.forEach(function(f) {
    mapa[f.id] = {
      nome: f.nome || '',
      nomeFantasia: f.nome_fantasia || ''
    };
  });
  return mapa;
}

function intradayPatchNomeFornecedor_(lancamento, mapaFornecedores) {
  if (!lancamento) return '';

  var direto = lancamento.fornecedor || lancamento.pessoa || lancamento.cliente_fornecedor;
  if (direto && typeof direto === 'object') {
    return direto.nome_fantasia || direto.nome || direto.razao_social || direto.descricao || '';
  }
  if (typeof direto === 'string') return direto;

  var camposTexto = [
    lancamento.fornecedor_nome,
    lancamento.nome_fornecedor,
    lancamento.pessoa_nome,
    lancamento.nome_pessoa
  ];
  var porCampo = camposTexto.find(function(v) { return v && String(v).trim(); });
  if (porCampo) return String(porCampo).trim();

  var pessoaId = lancamento.pessoa_id || lancamento.fornecedor_id;
  var fornecedor = pessoaId ? mapaFornecedores[pessoaId] : null;
  return fornecedor ? (fornecedor.nomeFantasia || fornecedor.nome || '') : '';
}

function intradayPatchEncontrarLinhaCabecalho_(aba, marcador, maxRows) {
  var limite = Math.min(maxRows || 30, aba.getLastRow());
  for (var i = 1; i <= limite; i++) {
    var val = String(aba.getRange(i, 1).getValue() || '').trim().toUpperCase();
    if (val === String(marcador || '').trim().toUpperCase()) return i;
  }
  return -1;
}

function intradayPatchLerTabela_(aba, linhaCabecalho, maxCols) {
  var primeira = linhaCabecalho + 1;
  var ultLinha = aba.getLastRow();
  var ultCol = maxCols || aba.getLastColumn();
  if (ultLinha < primeira || ultCol < 1) return [];
  return aba.getRange(primeira, 1, ultLinha - primeira + 1, ultCol).getValues();
}

function intradayPatchNormalizarData_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, FUSO, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    var p = s.substring(0, 10).split('/');
    return p[2] + '-' + p[1] + '-' + p[0];
  }
  return '';
}

function intradayPatchLinhasDespesasHoje_(hojeStr) {
  var mapaCategorias = getMapaCategorias_();
  var mapaFornecedores = intradayPatchGetMapaFornecedores_();
  var contasBanco = intradayPatchResolverContasBanco_();
  var raw = [];

  contasBanco.forEach(function(conta) {
    raw = raw.concat(intradayPatchBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  var vistos = {};
  var semDup = raw.filter(function(l) {
    if (vistos[l.id]) return false;
    vistos[l.id] = true;
    return true;
  });

  var pagos = semDup.filter(function(l) {
    return l.data_pagamento && INTRADAY_CONTAS_SAIDA_PATCH.some(function(n) {
      return intradayPatchNorm_(n) === intradayPatchNorm_(l._conta_nome || '');
    });
  });

  var grupos = agruparPorComposto_(pagos, mapaCategorias);
  var linhas = grupos.map(function(g) {
    var descDeducoes = g.deducoes
      .map(function(d) { return d.descricao + ' (' + d.valor.toFixed(2) + ')'; })
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
      intradayPatchNomeFornecedor_(g.pai, mapaFornecedores)
    ];
  });

  linhas.sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });
  return linhas;
}

function intradayPatchLinhasEntradasHoje_(hojeStr) {
  var mapaCategorias = getMapaCategorias_();
  var contasBanco = intradayPatchResolverContasBanco_();
  var contasOp = resolverContas_().contas;
  var rawBanco = [];

  contasBanco.forEach(function(conta) {
    rawBanco = rawBanco.concat(intradayPatchBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  var todosIdsBanco = {};
  rawBanco.forEach(function(l) { todosIdsBanco[l.id] = true; });

  var vistosTransfer = {};
  var transferencias = rawBanco.filter(function(l) {
    if (vistosTransfer[l.id]) return false;
    vistosTransfer[l.id] = true;
    if ((parseFloat(l.valor) || 0) <= 0) return false;
    if (!l.data_pagamento) return false;
    if (!l.lancamento_transferencia_id) return false;
    if (todosIdsBanco[l.lancamento_transferencia_id]) return false;
    return true;
  }).map(function(l) {
    return [
      l.data_pagamento || '',
      l._conta_nome || '',
      l.descricao || '',
      parseFloat(l.valor) || 0,
      l.conta_id || '',
      l.id || ''
    ];
  });

  var catsBusca = HIST_CATEGORIAS_RECEITA.map(intradayPatchNormSemAcento_);
  var rawReceitas = [];

  contasOp.forEach(function(conta) {
    rawReceitas = rawReceitas.concat(intradayPatchBuscarLancamentosConta_(conta, hojeStr, hojeStr));
  });

  var idsTransfer = {};
  transferencias.forEach(function(r) { idsTransfer[String(r[5] || '')] = true; });

  var vistosReceita = {};
  var receitas = rawReceitas.filter(function(l) {
    if (vistosReceita[l.id]) return false;
    vistosReceita[l.id] = true;
    if (idsTransfer[String(l.id || '')]) return false;
    if ((parseFloat(l.valor) || 0) <= 0) return false;
    if (!l.data_pagamento) return false;
    var categoriaObj = typeof l.categoria === 'object' ? l.categoria : null;
    var categoriaNome = categoriaObj && categoriaObj.descricao ? categoriaObj.descricao : (l.categoria || mapaCategorias[l.categoria_id] || '');
    var categoriaNorm = intradayPatchNormSemAcento_(categoriaNome);
    return catsBusca.some(function(cat) { return categoriaNorm.indexOf(cat) >= 0; });
  }).map(function(l) {
    return [
      l.data_pagamento || '',
      l._conta_nome || '',
      l.descricao || '',
      parseFloat(l.valor) || 0,
      l.conta_id || '',
      l.id || ''
    ];
  });

  var linhas = transferencias.concat(receitas);
  var usados = {};
  var semDup = linhas.filter(function(r) {
    var id = String(r[5] || '');
    if (!id || usados[id]) return false;
    usados[id] = true;
    return true;
  });

  semDup.sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });
  return semDup;
}

function intradayPatchAtualizarMetadadosDespesas_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('granatum_despesas_historico');
  if (!aba) return;
  var linhaCab = intradayPatchEncontrarLinhaCabecalho_(aba, 'DATA_PAGAMENTO', 20);
  if (linhaCab < 0) return;

  var rows = intradayPatchLerTabela_(aba, linhaCab, 12);
  var totalLiquido = rows.reduce(function(s, r) { return s + (parseFloat(r[7]) || 0); }, 0);
  var totalBruto = rows.reduce(function(s, r) { return s + (parseFloat(r[5]) || 0); }, 0);
  var totalDeducoes = rows.reduce(function(s, r) { return s + (parseFloat(r[6]) || 0); }, 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_LIQUIDO', totalLiquido]]);
  aba.getRange('A3:B3').setValues([['TOTAL_BRUTO', totalBruto]]);
  aba.getRange('A4:B4').setValues([['TOTAL_DEDUCOES', totalDeducoes]]);
  aba.getRange('A5:B5').setValues([['QTD_LANCAMENTOS', rows.length]]);
  aba.getRange('A8:B8').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
}

function intradayPatchAtualizarMetadadosEntradas_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('granatum_entradas_historico');
  if (!aba) return;
  var linhaCab = intradayPatchEncontrarLinhaCabecalho_(aba, 'DATA_PAGAMENTO', 20);
  if (linhaCab < 0) return;

  var rows = intradayPatchLerTabela_(aba, linhaCab, 6);
  var total = rows.reduce(function(s, r) { return s + (parseFloat(r[3]) || 0); }, 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_ENTRADAS', total]]);
  aba.getRange('A3:B3').setValues([['QTD_ENTRADAS', rows.length]]);
  aba.getRange('A5:B5').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
}

function intradayPatchRecalcularFluxoHoje_(hojeStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('granatum_fluxo_historico');
  if (!aba) {
    Logger.log('Aba granatum_fluxo_historico nao encontrada.');
    return;
  }

  var linhaCab = intradayPatchEncontrarLinhaCabecalho_(aba, 'DATA', 30);
  if (linhaCab < 0) {
    Logger.log('Cabecalho DATA nao encontrado em granatum_fluxo_historico.');
    return;
  }

  var primeira = linhaCab + 1;
  var ultLinha = aba.getLastRow();
  var rows = ultLinha >= primeira ? aba.getRange(primeira, 1, ultLinha - primeira + 1, 5).getValues() : [];

  var idxHoje = rows.findIndex(function(r) { return intradayPatchNormalizarData_(r[0]) === hojeStr; });
  var idxAnterior = idxHoje >= 0 ? idxHoje - 1 : rows.length - 1;
  var linhaAnterior = idxAnterior >= 0 ? rows[idxAnterior] : null;
  var saldoInicial = linhaAnterior ? (parseFloat(linhaAnterior[4]) || 0) : HIST_SALDO_INI;

  var abaEnt = ss.getSheetByName('granatum_entradas_historico');
  var abaSai = ss.getSheetByName('granatum_despesas_historico');

  var totalEntradasHoje = 0;
  if (abaEnt) {
    var cabEnt = intradayPatchEncontrarLinhaCabecalho_(abaEnt, 'DATA_PAGAMENTO', 20);
    if (cabEnt >= 0) {
      var dadosEnt = intradayPatchLerTabela_(abaEnt, cabEnt, 6);
      totalEntradasHoje = dadosEnt
        .filter(function(r) { return intradayPatchNormalizarData_(r[0]) === hojeStr; })
        .reduce(function(s, r) { return s + (parseFloat(r[3]) || 0); }, 0);
    }
  }

  var totalSaidasHoje = 0;
  if (abaSai) {
    var cabSai = intradayPatchEncontrarLinhaCabecalho_(abaSai, 'DATA_PAGAMENTO', 20);
    if (cabSai >= 0) {
      var dadosSai = intradayPatchLerTabela_(abaSai, cabSai, 12);
      totalSaidasHoje = dadosSai
        .filter(function(r) { return intradayPatchNormalizarData_(r[0]) === hojeStr; })
        .reduce(function(s, r) { return s + (parseFloat(r[7]) || 0); }, 0);
    }
  }

  var saldoFinal = saldoInicial + totalEntradasHoje - totalSaidasHoje;
  var novaLinha = [hojeStr, saldoInicial, totalEntradasHoje, totalSaidasHoje, saldoFinal];

  if (idxHoje >= 0) {
    aba.getRange(primeira + idxHoje, 1, 1, 5).setValues([novaLinha]);
  } else {
    aba.getRange(ultLinha + 1, 1, 1, 5).setValues([novaLinha]);
  }
}

function sincronizarHistoricoIntradayHoje_() {
  var hojeStr = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');

  var despesasHoje = intradayPatchLinhasDespesasHoje_(hojeStr);
  upsertHistorico_('granatum_despesas_historico', despesasHoje, 1, 9, hojeStr, hojeStr);
  intradayPatchAtualizarMetadadosDespesas_();

  var entradasHoje = intradayPatchLinhasEntradasHoje_(hojeStr);
  upsertHistorico_('granatum_entradas_historico', entradasHoje, 1, 7, hojeStr, hojeStr);
  intradayPatchAtualizarMetadadosEntradas_();

  intradayPatchRecalcularFluxoHoje_(hojeStr);

  try {
    gerarFluxoMensal();
  } catch (e) {
    Logger.log('Aviso ao gerar fluxo mensal: ' + e.message);
  }

  Logger.log('Historico intraday sincronizado para ' + hojeStr +
    ' | entradas: ' + entradasHoje.length + ' | saidas: ' + despesasHoje.length);
}

function sincronizarIntraday() {
  var inicio = new Date();

  buscarDespesasDoDia();
  buscarContasAPagar();
  buscarContasVencidas();
  buscarReceitas();
  sincronizarHistoricoIntradayHoje_();

  var seg = Math.round((new Date() - inicio) / 1000);
  Logger.log('Intraday concluido em ' + seg + 's com historico intraday.');
}
