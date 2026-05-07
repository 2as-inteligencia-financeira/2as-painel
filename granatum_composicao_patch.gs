// ════════════════════════════════════════════════════════════════
//  PATCH OPCIONAL — COMPOSIÇÃO DE CONTAS A PAGAR
//
//  Objetivo:
//  - NÃO altera a aba granatum_contas_pagar usada no Looker Studio.
//  - Cria uma aba complementar para o painel financeiro:
//      granatum_contas_pagar_composicao
//  - A nova aba detalha lançamentos compostos como "holerite":
//      PROVENTO positivo e DEDUCAO negativa.
//
//  Como aplicar:
//  1. Cole este bloco no final do Apps Script atual.
//  2. Rode buscarContasAPagarComposicao() uma vez.
//  3. Opcional: rode instalarTriggerContasPagarComposicao() para atualizar a cada 30 min.
// ════════════════════════════════════════════════════════════════

const ABA_CONTAS_PAGAR_COMPOSICAO = 'granatum_contas_pagar_composicao';

function statusComposicaoContasPagar_(venc, ref) {
  const dias = Math.round((venc - ref) / 86400000);
  const status = dias < 0  ? 'VENCIDO'
               : dias === 0 ? 'VENCE_HOJE'
               : dias <= 7  ? 'ESTA_SEMANA'
               : dias <= 30 ? 'PROXIMO_MES'
               : 'FUTURO';
  return { dias, status };
}

function itemComposicao_(l, tipoItem, valorAssinado, mapaCategorias) {
  const categoria = mapaCategorias[l.categoria_id] || '';
  const descricaoLancamento = l.descricao || '';
  return {
    id: l.id || '',
    paiId: tipoItem === 'PROVENTO' ? (l.id || '') : '',
    tipo: tipoItem,
    descricaoLancamento,
    descricao: descricaoLancamento || categoria || tipoItem,
    categoriaId: l.categoria_id || '',
    categoria,
    valorOriginal: Math.abs(parseFloat(l.valor) || 0),
    valorAssinado
  };
}

function descricaoItemComposicao_(item, descricaoGrupo) {
  if (item.descricao && item.descricao !== descricaoGrupo) return item.descricao;
  if (item.categoria) return item.categoria;
  return item.tipo;
}

function montarComposicaoContasPagar_(lancamentos, mapaCategorias, mapaPessoas, ref) {
  const compostos = {};
  const simples = [];

  lancamentos.forEach(l => {
    const cid = l.lancamento_composto_id;
    const tipo = l.tipo_lancamento_id;
    if (cid) {
      if (!compostos[cid]) compostos[cid] = [];
      compostos[cid].push(l);
    } else if (tipo === 1 && !l.lancamento_transferencia_id && parseFloat(l.valor) < 0) {
      simples.push(l);
    }
  });

  const grupos = [];

  Object.keys(compostos).forEach(cid => {
    const grupo = compostos[cid];
    const pais = grupo.filter(l =>
      l.tipo_lancamento_id === 1 &&
      parseFloat(l.valor) < 0 &&
      !l.lancamento_transferencia_id
    );
    if (pais.length === 0) return;

    const deducoes = grupo.filter(l => {
      if (l.tipo_lancamento_id !== 2) return false;
      const val = parseFloat(l.valor) || 0;
      if (val <= 0) return false;
      return categoriaContem_(mapaCategorias[l.categoria_id] || '', TERMOS_DEDUCAO);
    });

    const bruto = pais.reduce((s, p) => s + Math.abs(parseFloat(p.valor) || 0), 0);
    const totalDeducoes = deducoes.reduce((s, d) => s + Math.abs(parseFloat(d.valor) || 0), 0);
    const liquido = bruto - totalDeducoes;
    const paiPrincipal = pais[0];
    const venc = new Date((paiPrincipal.data_vencimento || '9999-12-31') + 'T00:00:00');
    const { dias, status } = statusComposicaoContasPagar_(venc, ref);
    const fornecedor = resolverPessoa_(paiPrincipal, mapaPessoas);
    const descricaoLancamento = paiPrincipal.descricao || '';

    const itens = [
      ...pais.map(p => itemComposicao_(p, 'PROVENTO', Math.abs(parseFloat(p.valor) || 0), mapaCategorias)),
      ...deducoes.map(d => itemComposicao_(d, 'DEDUCAO', -Math.abs(parseFloat(d.valor) || 0), mapaCategorias))
    ];

    grupos.push({
      dataVencimento: paiPrincipal.data_vencimento || '',
      idComposto: cid,
      fornecedor,
      descricaoLancamento,
      bruto,
      totalDeducoes,
      liquido,
      dias,
      status,
      itens
    });
  });

  simples.forEach(pai => {
    const bruto = Math.abs(parseFloat(pai.valor) || 0);
    const venc = new Date((pai.data_vencimento || '9999-12-31') + 'T00:00:00');
    const { dias, status } = statusComposicaoContasPagar_(venc, ref);
    grupos.push({
      dataVencimento: pai.data_vencimento || '',
      idComposto: 'S_' + (pai.id || ''),
      fornecedor: resolverPessoa_(pai, mapaPessoas),
      descricaoLancamento: pai.descricao || '',
      bruto,
      totalDeducoes: 0,
      liquido: bruto,
      dias,
      status,
      itens: [itemComposicao_(pai, 'PROVENTO', bruto, mapaCategorias)]
    });
  });

  return grupos.sort((a, b) =>
    new Date(a.dataVencimento || '9999-12-31') - new Date(b.dataVencimento || '9999-12-31')
  );
}

function gravarComposicaoContasPagar_(grupos, inicio, fim, label) {
  const aba = garantirAba_(ABA_CONTAS_PAGAR_COMPOSICAO);
  aba.clearContents();

  const totalLiquido = grupos.reduce((s, g) => s + g.liquido, 0);
  const totalBruto = grupos.reduce((s, g) => s + g.bruto, 0);
  const totalDeducoes = grupos.reduce((s, g) => s + g.totalDeducoes, 0);
  const qtdItens = grupos.reduce((s, g) => s + g.itens.length, 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['JANELA', 'Hoje + 60 dias']]);
  aba.getRange('A3:B3').setValues([['DATA_INICIO', inicio]]);
  aba.getRange('A4:B4').setValues([['DATA_FIM', fim]]);
  aba.getRange('A5:B5').setValues([['TOTAL_BRUTO', totalBruto]]);
  aba.getRange('A6:B6').setValues([['TOTAL_DEDUCOES', totalDeducoes]]);
  aba.getRange('A7:B7').setValues([['TOTAL_LIQUIDO', totalLiquido]]);
  aba.getRange('A8:B8').setValues([['QTD_GRUPOS', grupos.length]]);
  aba.getRange('A9:B9').setValues([['QTD_ITENS', qtdItens]]);
  aba.getRange('A10:B10').setValues([['MODO', label]]);
  aba.getRange('A11:B11').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);

  const cabecalho = [
    'DATA_VENCIMENTO', 'ID_COMPOSTO', 'ID_LANCAMENTO', 'ID_LANCAMENTO_PAI',
    'FORNECEDOR', 'DESCRICAO_GRUPO', 'DESCRICAO_LANCAMENTO', 'TIPO_ITEM', 'DESCRICAO_ITEM',
    'CATEGORIA_ID', 'CATEGORIA', 'VALOR_ORIGINAL', 'VALOR_ASSINADO',
    'VALOR_BRUTO_GRUPO', 'VALOR_DEDUCOES_GRUPO', 'VALOR_LIQUIDO_GRUPO',
    'STATUS', 'DIAS_ATE_VENC'
  ];
  aba.getRange(13, 1, 1, cabecalho.length).setValues([cabecalho]);

  const linhas = [];
  grupos.forEach(g => {
    g.itens.forEach(item => {
      linhas.push([
        g.dataVencimento,
        g.idComposto,
        item.id,
        item.paiId,
        g.fornecedor,
        g.descricaoLancamento,
        item.descricaoLancamento || item.descricao || item.categoria || '',
        item.tipo,
        descricaoItemComposicao_(item, g.descricaoLancamento),
        item.categoriaId,
        item.categoria,
        item.valorOriginal,
        item.valorAssinado,
        g.bruto,
        g.totalDeducoes,
        g.liquido,
        g.status,
        g.dias
      ]);
    });
  });

  if (linhas.length > 0) {
    aba.getRange(14, 1, linhas.length, cabecalho.length).setValues(linhas);
  }

  const nL = Math.max(linhas.length, 1);
  aba.getRange(14, 12, nL, 5).setNumberFormat('#,##0.00');
  aba.setFrozenRows(13);
  aba.autoResizeColumns(1, cabecalho.length);
}

function buscarContasAPagarComposicao() {
  const token = getToken_();
  const { contas, label } = resolverContas_();
  const mapaCategorias = getMapaCategorias_();
  const mapaPessoas = getMapaPessoas_();

  const agora = new Date();
  const dataFim = new Date(agora);
  dataFim.setDate(dataFim.getDate() + 60);
  const inicio = Utilities.formatDate(agora, FUSO, 'yyyy-MM-dd');
  const fim = Utilities.formatDate(dataFim, FUSO, 'yyyy-MM-dd');

  let todos = [];
  contas.forEach(conta => {
    let start = 0;
    while (true) {
      const url = 'https://api.granatum.com.br/v1/lancamentos'
        + '?access_token=' + token
        + '&conta_id=' + conta.id
        + '&data_inicio=' + inicio
        + '&data_fim=' + fim
        + '&regime=caixa'
        + '&tipo_view=detail'
        + '&limit=500'
        + '&start=' + start;
      const dados = chamarAPI_(url) || [];
      dados.forEach(l => { l._conta_nome = conta.descricao; });
      todos = todos.concat(dados);
      if (dados.length < 500) break;
      start += 500;
      Utilities.sleep(250);
    }
  });

  const vistos = new Set();
  const semDup = todos.filter(l => {
    if (vistos.has(l.id)) return false;
    vistos.add(l.id);
    return true;
  });

  const grupos = montarComposicaoContasPagar_(semDup, mapaCategorias, mapaPessoas, agora);
  gravarComposicaoContasPagar_(grupos, inicio, fim, label);

  Logger.log('[Contas a pagar composição] ' + grupos.length + ' grupos gravados em ' + ABA_CONTAS_PAGAR_COMPOSICAO + '.');
}

function instalarTriggerContasPagarComposicao() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'buscarContasAPagarComposicao') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('buscarContasAPagarComposicao')
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log('[Contas a pagar composição] Trigger instalado a cada 30 minutos.');
}
