// ════════════════════════════════════════════════════════════════
//  PATCH GRANATUM — CONTAS A PAGAR COM FORNECEDOR
//  + ENTRADAS HISTÓRICAS EM LOTES RETOMÁVEIS
//
//  COMO USAR:
//  1. Cole este bloco inteiro NO FINAL do Apps Script atual.
//  2. Salve.
//  3. Rode buscarContasAPagar() para recriar granatum_contas_pagar.
//  4. Rode buscarEntradasHistoricas() para iniciar a carga completa.
//
//  Por ser colado no final, estas funções sobrescrevem as versões
//  anteriores com o mesmo nome, sem precisar editar o restante.
// ════════════════════════════════════════════════════════════════

const GRANATUM_PATCH_ABA_ENTRADAS_TMP = 'granatum_entradas_historico_tmp';
const GRANATUM_PATCH_PROP_ENTRADAS    = 'GRANATUM_PATCH_ENTRADAS_STATE_V1';
const GRANATUM_PATCH_BUDGET_MS        = 4.5 * 60 * 1000;
const GRANATUM_PATCH_BATCH_ROWS       = 1000;

let GRANATUM_PATCH_FORNECEDORES = null;

function granatumPatchUrl_(rota, params) {
  const token = getToken_();
  const qs = Object.keys(params || {})
    .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  return 'https://api.granatum.com.br/v1/' + rota + '?access_token=' + encodeURIComponent(token) + (qs ? '&' + qs : '');
}

function granatumPatchNorm_(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function granatumPatchNormSemAcento_(v) {
  return granatumPatchNorm_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function granatumPatchRemoverTriggers_(nomeFuncao) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === nomeFuncao) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function granatumPatchAgendarEntradas_() {
  granatumPatchRemoverTriggers_('continuarEntradasHistoricas_');
  ScriptApp.newTrigger('continuarEntradasHistoricas_')
    .timeBased()
    .after(60 * 1000)
    .create();
}

function getMapaFornecedores_() {
  if (GRANATUM_PATCH_FORNECEDORES) return GRANATUM_PATCH_FORNECEDORES;

  const fornecedores = chamarAPI_(granatumPatchUrl_('fornecedores', {
    considerar_inativos: 'true'
  })) || [];

  GRANATUM_PATCH_FORNECEDORES = {};
  fornecedores.forEach(f => {
    GRANATUM_PATCH_FORNECEDORES[f.id] = {
      nome: f.nome || '',
      nomeFantasia: f.nome_fantasia || '',
      documento: f.documento || ''
    };
  });

  Logger.log('[Patch Fornecedores] ' + fornecedores.length + ' carregados.');
  return GRANATUM_PATCH_FORNECEDORES;
}

function nomeFornecedorLancamento_(lancamento, mapaFornecedores) {
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
  if (!pessoaId) return '';

  const fornecedor = mapaFornecedores[pessoaId];
  if (!fornecedor) return '';
  return fornecedor.nomeFantasia || fornecedor.nome || '';
}

function granatumPatchBuscarLancamentosConta_(conta, inicio, fim) {
  let out = [];
  let start = 0;

  while (true) {
    const url = granatumPatchUrl_('lancamentos', {
      conta_id: conta.id,
      data_inicio: inicio,
      data_fim: fim,
      regime: 'caixa',
      tipo_view: 'detail',
      limit: 500,
      start
    });

    const d = chamarAPI_(url) || [];
    d.forEach(l => {
      l._conta_nome = conta.descricao;
      l._conta_id = conta.id;
    });
    out = out.concat(d);

    if (d.length < 500) break;
    start += 500;
    Utilities.sleep(250);
  }

  return out;
}

// ════════════════════════════════════════════════════════════════
//  OVERRIDE — CONTAS A PAGAR COM FORNECEDOR
// ════════════════════════════════════════════════════════════════

function buscarContasAPagar() {
  const { contas, label } = resolverContas_();
  const mapa = getMapaCategorias_();
  const mapaFornecedores = getMapaFornecedores_();

  const agora = new Date();
  const dataFim = new Date(agora);
  dataFim.setDate(dataFim.getDate() + 60);
  const inicio = Utilities.formatDate(agora, FUSO, 'yyyy-MM-dd');
  const fim = Utilities.formatDate(dataFim, FUSO, 'yyyy-MM-dd');

  let todos = [];
  contas.forEach(conta => {
    const dados = granatumPatchBuscarLancamentosConta_(conta, inicio, fim);
    todos = todos.concat(dados);
  });

  const vistos = new Set();
  const semDup = todos.filter(l => {
    if (vistos.has(l.id)) return false;
    vistos.add(l.id);
    return true;
  });

  const grupos = agruparPorComposto_(semDup, mapa);
  grupos.sort((a, b) =>
    new Date(a.pai.data_vencimento || '9999-12-31') - new Date(b.pai.data_vencimento || '9999-12-31')
  );

  const totalGeral = grupos.reduce((s, g) => s + g.liquido, 0);
  const total7d = somarPeriodoGrupos_(grupos, agora, 7);
  const total30d = somarPeriodoGrupos_(grupos, agora, 30);

  const aba = garantirAba_(ABA_CONTAS_PAGAR);
  aba.clearContents();

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['JANELA', 'Hoje + 60 dias']]);
  aba.getRange('A3:B3').setValues([['DATA_INICIO', inicio]]);
  aba.getRange('A4:B4').setValues([['DATA_FIM', fim]]);
  aba.getRange('A5:B5').setValues([['TOTAL_7D', total7d]]);
  aba.getRange('A6:B6').setValues([['TOTAL_30D', total30d]]);
  aba.getRange('A7:B7').setValues([['TOTAL_60D', totalGeral]]);
  aba.getRange('A8:B8').setValues([['QTD_LANCAMENTOS', grupos.length]]);
  aba.getRange('A9:B9').setValues([['MODO', label]]);
  aba.getRange('A10:B10').setValues([['CONTAS_CONSULTADAS', contas.map(c => c.descricao).join(', ')]]);
  aba.getRange('A11:B11').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);

  aba.getRange('A13:K13').setValues([[
    'DATA_VENCIMENTO', 'CONTA', 'DESCRICAO', 'CATEGORIA_ID',
    'VALOR_BRUTO', 'VALOR_DEDUCOES', 'VALOR_LIQUIDO',
    'DIAS_ATE_VENC', 'STATUS', 'FORNECEDOR', 'ID'
  ]]);

  if (grupos.length > 0) {
    const linhas = grupos.map(g => {
      const venc = new Date((g.pai.data_vencimento || '9999-12-31') + 'T00:00:00');
      const dias = Math.round((venc - agora) / 86400000);
      const status = dias < 0 ? 'VENCIDO'
        : dias === 0 ? 'VENCE_HOJE'
        : dias <= 7 ? 'ESTA_SEMANA'
        : dias <= 30 ? 'PROXIMO_MES'
        : 'FUTURO';
      const fornecedor = nomeFornecedorLancamento_(g.pai, mapaFornecedores);

      return [
        g.pai.data_vencimento || '',
        g.contaNome,
        g.pai.descricao || '',
        g.pai.categoria_id || '',
        g.bruto,
        g.totalDeducoes,
        g.liquido,
        dias,
        status,
        fornecedor,
        g.pai.id || ''
      ];
    });
    aba.getRange(14, 1, linhas.length, 11).setValues(linhas);
  }

  aba.getRange('B5:B7').setNumberFormat('#,##0.00');
  aba.getRange('E14:G').setNumberFormat('#,##0.00');
  aba.setFrozenRows(13);
  Logger.log('[Patch Contas a pagar] Líquido 60d: R$' + totalGeral.toFixed(2) +
    ' | ' + grupos.length + ' lançamentos | fornecedor incluído.');
}

// ════════════════════════════════════════════════════════════════
//  OVERRIDE — ENTRADAS HISTÓRICAS EM LOTES
// ════════════════════════════════════════════════════════════════

function granatumPatchResolverContasBanco_() {
  const todas = chamarAPI_(granatumPatchUrl_('contas', {})) || [];
  return todas.filter(c => HIST_CONTAS_BANCO.some(n => granatumPatchNorm_(n) === granatumPatchNorm_(c.descricao)));
}

function granatumPatchMontarTarefasEntradas_(inicio, fim) {
  const contasBanco = granatumPatchResolverContasBanco_();
  const { contas: contasOp } = resolverContas_();
  const blocos = gerarBlocosMensais_(inicio, fim);
  const tarefas = [];

  blocos.forEach(bloco => {
    contasBanco.forEach(conta => {
      tarefas.push({
        tipo: 'BANCO_RAW',
        inicio: bloco.inicio,
        fim: bloco.fim,
        conta: { id: conta.id, descricao: conta.descricao }
      });
    });
    contasOp.forEach(conta => {
      tarefas.push({
        tipo: 'RECEITA_DIRETA',
        inicio: bloco.inicio,
        fim: bloco.fim,
        conta: { id: conta.id, descricao: conta.descricao }
      });
    });
  });

  return tarefas;
}

function granatumPatchIniciarEntradas_(inicio, fim, modo) {
  granatumPatchRemoverTriggers_('continuarEntradasHistoricas_');

  const abaTmp = garantirAba_(GRANATUM_PATCH_ABA_ENTRADAS_TMP);
  abaTmp.clearContents();
  abaTmp.getRange('A1:I1').setValues([[
    'TIPO', 'DATA_PAGAMENTO', 'CONTA', 'DESCRICAO', 'CATEGORIA',
    'VALOR', 'CONTA_ID', 'ID', 'TRANSFER_ID'
  ]]);

  const tarefas = granatumPatchMontarTarefasEntradas_(inicio, fim);
  PropertiesService.getScriptProperties().setProperty(GRANATUM_PATCH_PROP_ENTRADAS, JSON.stringify({
    inicio,
    fim,
    modo,
    cursor: 0,
    total: tarefas.length,
    iniciadoEm: new Date().toISOString()
  }));

  toast_('Entradas históricas iniciadas: ' + tarefas.length + ' tarefas em lotes.', '📂 Entradas Históricas', 8);
  continuarEntradasHistoricas_();
}

function buscarEntradasHistoricas() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const fim = Utilities.formatDate(ontem, FUSO, 'yyyy-MM-dd');
  granatumPatchIniciarEntradas_(HIST_INICIO, fim, 'CARGA_COMPLETA');
}

function atualizarEntradasHistoricas() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const fim = Utilities.formatDate(ontem, FUSO, 'yyyy-MM-dd');

  const inicio15 = new Date();
  inicio15.setDate(inicio15.getDate() - 15);
  const inicio = Utilities.formatDate(inicio15, FUSO, 'yyyy-MM-dd');

  granatumPatchIniciarEntradas_(inicio, fim, 'INCREMENTAL');
}

function continuarEntradasHistoricas_() {
  const props = PropertiesService.getScriptProperties();
  const rawState = props.getProperty(GRANATUM_PATCH_PROP_ENTRADAS);

  if (!rawState) {
    Logger.log('[Patch Entradas] Nenhum estado pendente.');
    granatumPatchRemoverTriggers_('continuarEntradasHistoricas_');
    return;
  }

  const state = JSON.parse(rawState);
  const inicioExec = Date.now();
  const mapaCategorias = getMapaCategorias_();
  const tarefas = granatumPatchMontarTarefasEntradas_(state.inicio, state.fim);
  const abaTmp = garantirAba_(GRANATUM_PATCH_ABA_ENTRADAS_TMP);

  let novasLinhas = [];
  let processadas = 0;

  while (state.cursor < tarefas.length && (Date.now() - inicioExec) < GRANATUM_PATCH_BUDGET_MS) {
    const tarefa = tarefas[state.cursor];
    const lancamentos = granatumPatchBuscarLancamentosConta_(tarefa.conta, tarefa.inicio, tarefa.fim);

    if (tarefa.tipo === 'BANCO_RAW') {
      lancamentos.forEach(l => {
        if (!l.data_pagamento) return;
        if (!l.lancamento_transferencia_id) return;
        novasLinhas.push([
          'BANCO_RAW',
          l.data_pagamento || '',
          l._conta_nome || tarefa.conta.descricao || '',
          l.descricao || '',
          '',
          parseFloat(l.valor) || 0,
          l.conta_id || tarefa.conta.id || '',
          l.id || '',
          l.lancamento_transferencia_id || ''
        ]);
      });
    }

    if (tarefa.tipo === 'RECEITA_DIRETA') {
      const catsBusca = HIST_CATEGORIAS_RECEITA.map(granatumPatchNormSemAcento_);
      lancamentos.forEach(l => {
        if (!l.data_pagamento) return;
        if ((parseFloat(l.valor) || 0) <= 0) return;

        const categoriaObj = typeof l.categoria === 'object' ? l.categoria : null;
        const categoriaNome = categoriaObj?.descricao || l.categoria || mapaCategorias[l.categoria_id] || '';
        const categoriaNorm = granatumPatchNormSemAcento_(categoriaNome);
        if (!catsBusca.some(cat => categoriaNorm.includes(cat))) return;

        novasLinhas.push([
          'RECEITA_DIRETA',
          l.data_pagamento || '',
          l._conta_nome || tarefa.conta.descricao || '',
          l.descricao || '',
          categoriaNome,
          parseFloat(l.valor) || 0,
          l.conta_id || tarefa.conta.id || '',
          l.id || '',
          l.lancamento_transferencia_id || ''
        ]);
      });
    }

    state.cursor++;
    processadas++;

    if (novasLinhas.length >= GRANATUM_PATCH_BATCH_ROWS) {
      abaTmp.getRange(abaTmp.getLastRow() + 1, 1, novasLinhas.length, 9).setValues(novasLinhas);
      novasLinhas = [];
    }

    Utilities.sleep(100);
  }

  if (novasLinhas.length > 0) {
    abaTmp.getRange(abaTmp.getLastRow() + 1, 1, novasLinhas.length, 9).setValues(novasLinhas);
  }

  props.setProperty(GRANATUM_PATCH_PROP_ENTRADAS, JSON.stringify(state));

  Logger.log('[Patch Entradas] Execução: ' + processadas +
    ' tarefas | Progresso ' + state.cursor + '/' + tarefas.length);
  toast_('Entradas: ' + state.cursor + '/' + tarefas.length + ' tarefas.', '📂 Entradas Históricas', 8);

  if (state.cursor < tarefas.length) {
    granatumPatchAgendarEntradas_();
    return;
  }

  granatumPatchFinalizarEntradas_(state);
  props.deleteProperty(GRANATUM_PATCH_PROP_ENTRADAS);
  granatumPatchRemoverTriggers_('continuarEntradasHistoricas_');
}

function granatumPatchFinalizarEntradas_(state) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaTmp = ss.getSheetByName(GRANATUM_PATCH_ABA_ENTRADAS_TMP);

  if (!abaTmp || abaTmp.getLastRow() < 2) {
    Logger.log('[Patch Entradas] Staging vazio.');
    return;
  }

  const rows = abaTmp.getRange(2, 1, abaTmp.getLastRow() - 1, 9).getValues();
  const todosIdsBanco = new Set();
  rows.forEach(r => {
    if (r[0] === 'BANCO_RAW' && r[7]) todosIdsBanco.add(String(r[7]));
  });

  const usados = new Set();
  const linhas = [];

  rows.forEach(r => {
    const tipo = r[0];
    const data = r[1];
    const conta = r[2];
    const descricao = r[3];
    const valor = parseFloat(r[5]) || 0;
    const contaId = r[6];
    const id = String(r[7] || '');
    const transferId = String(r[8] || '');

    if (!id || usados.has(id)) return;

    if (tipo === 'BANCO_RAW') {
      if (valor <= 0) return;
      if (!transferId) return;
      if (todosIdsBanco.has(transferId)) return;
      usados.add(id);
      linhas.push([data, conta, descricao, valor, contaId, id]);
      return;
    }

    if (tipo === 'RECEITA_DIRETA') {
      if (valor <= 0) return;
      usados.add(id);
      linhas.push([data, conta, descricao, valor, contaId, id]);
    }
  });

  linhas.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  if (state.modo === 'INCREMENTAL') {
    upsertHistorico_('granatum_entradas_historico', linhas, 1, 7, state.inicio, state.fim);
    granatumPatchAtualizarMetadadosEntradas_();
    toast_('✅ Entradas incrementais atualizadas: ' + linhas.length + ' linhas.', '📂 Entradas Históricas', 8);
    Logger.log('[Patch Entradas] Incremental finalizado: ' + linhas.length + ' linhas.');
    return;
  }

  let aba = ss.getSheetByName('granatum_entradas_historico');
  if (aba) ss.deleteSheet(aba);
  aba = ss.insertSheet('granatum_entradas_historico');

  const totalEntradas = linhas.reduce((s, l) => s + (parseFloat(l[3]) || 0), 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_ENTRADAS', totalEntradas]]);
  aba.getRange('A3:B3').setValues([['QTD_ENTRADAS', linhas.length]]);
  aba.getRange('A4:B4').setValues([['PERIODO', state.inicio + ' → ' + state.fim]]);
  aba.getRange('A5:B5').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
  aba.getRange('B2').setNumberFormat('#,##0.00');
  aba.getRange('A7:F7').setValues([[
    'DATA_PAGAMENTO', 'CONTA', 'DESCRICAO', 'VALOR', 'CONTA_ID', 'ID'
  ]]);

  if (linhas.length > 0) {
    aba.getRange(8, 1, linhas.length, 6).setValues(linhas);
  }

  const nL = Math.max(linhas.length, 1);
  aba.getRange(8, 1, nL, 1).setNumberFormat('yyyy-mm-dd');
  aba.getRange(8, 4, nL, 1).setNumberFormat('#,##0.00');
  aba.setFrozenRows(7);

  toast_('✅ Entradas históricas concluídas: ' + linhas.length + ' linhas.', '📂 Entradas Históricas', 8);
  Logger.log('[Patch Entradas] Carga completa finalizada: R$' + totalEntradas.toFixed(2) +
    ' | ' + linhas.length + ' entradas.');
}

function granatumPatchAtualizarMetadadosEntradas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('granatum_entradas_historico');
  if (!aba || aba.getLastRow() < 8) return;

  const rows = aba.getRange(8, 1, aba.getLastRow() - 7, 6).getValues();
  const total = rows.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['TOTAL_ENTRADAS', total]]);
  aba.getRange('A3:B3').setValues([['QTD_ENTRADAS', rows.length]]);
  aba.getRange('A5:B5').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);
  aba.getRange('B2').setNumberFormat('#,##0.00');
}

function cancelarEntradasHistoricasEmLote() {
  PropertiesService.getScriptProperties().deleteProperty(GRANATUM_PATCH_PROP_ENTRADAS);
  granatumPatchRemoverTriggers_('continuarEntradasHistoricas_');
  toast_('Carga de entradas históricas cancelada.', '📂 Entradas Históricas', 5);
}

function statusEntradasHistoricasEmLote() {
  const raw = PropertiesService.getScriptProperties().getProperty(GRANATUM_PATCH_PROP_ENTRADAS);
  if (!raw) {
    SpreadsheetApp.getUi().alert('Não há carga de entradas históricas em andamento.');
    return;
  }
  const s = JSON.parse(raw);
  SpreadsheetApp.getUi().alert(
    'Entradas históricas em andamento:\n\n' +
    'Modo: ' + s.modo + '\n' +
    'Período: ' + s.inicio + ' → ' + s.fim + '\n' +
    'Progresso: ' + s.cursor + '/' + s.total + ' tarefas'
  );
}
