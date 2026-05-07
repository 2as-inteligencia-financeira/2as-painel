// ════════════════════════════════════════════════════════════════
//  PATCH OPCIONAL — CONTAS VENCIDAS COM COLETA ROBUSTA
//
//  Objetivo:
//  - Sobrescrever apenas buscarContasVencidas()
//  - Evitar sobrescrever a aba com coleta parcial/silenciosa
//  - Logar volume por conta consultada
//  - Expor CONTAS_CONSULTADAS e CONTAS_COM_ERRO para auditoria
//
//  Como aplicar:
//  1. Cole este bloco no FINAL do Apps Script atual.
//  2. Salve.
//  3. Rode buscarContasVencidas() manualmente uma vez.
//
//  Observação:
//  - Se uma conta falhar e GRANATUM_PATCH_ABORTAR_CONTAS_VENCIDAS = true,
//    a função lança erro e NÃO sobrescreve a aba atual.
// ════════════════════════════════════════════════════════════════

const GRANATUM_PATCH_ABORTAR_CONTAS_VENCIDAS = true;

function granatumPatchBuscarContasVencidasConta_(conta) {
  const token = getToken_();
  let todos = [];
  let start = 0;

  while (true) {
    const url = 'https://api.granatum.com.br/v1/lancamentos'
      + '?access_token=' + token
      + '&conta_id='     + conta.id
      + '&tipo=PA'
      + '&tipo_view=detail'
      + '&limit=500'
      + '&start='        + start;

    const dados = chamarAPI_(url);
    if (dados === null) {
      throw new Error('Falha ao buscar vencidos da conta "' + conta.descricao + '" (start=' + start + ').');
    }

    dados.forEach(l => { l._conta_nome = conta.descricao; });
    todos = todos.concat(dados);

    Logger.log('[Patch Contas Vencidas] ' + conta.descricao + ' | lote start=' + start + ' | ' + dados.length + ' registros');

    if (dados.length < 500) break;
    start += 500;
    Utilities.sleep(200);
  }

  Logger.log('[Patch Contas Vencidas] ' + conta.descricao + ' | total=' + todos.length);
  return todos;
}

function buscarContasVencidas() {
  const { contas, label } = resolverContas_();
  const mapa = getMapaCategorias_();
  const mapaPessoas = getMapaPessoas_();

  const contasConsultadas = [];
  const contasComErro = [];
  let todos = [];

  contas.forEach(conta => {
    try {
      const dadosConta = granatumPatchBuscarContasVencidasConta_(conta);
      contasConsultadas.push(conta.descricao + ' (' + dadosConta.length + ')');
      todos = todos.concat(dadosConta);
    } catch (e) {
      const msg = conta.descricao + ': ' + e.message;
      contasComErro.push(msg);
      Logger.log('[Patch Contas Vencidas] ERRO ' + msg);
    }
  });

  if (contasComErro.length > 0 && GRANATUM_PATCH_ABORTAR_CONTAS_VENCIDAS) {
    throw new Error(
      'Contas vencidas abortado para evitar sobrescrita parcial.\n\n'
      + 'Contas com erro:\n• ' + contasComErro.join('\n• ')
    );
  }

  const vistos = new Set();
  const semDup = todos.filter(l => {
    if (vistos.has(l.id)) return false;
    vistos.add(l.id);
    return true;
  });

  const grupos = agruparPorComposto_(semDup, mapa);
  grupos.sort((a, b) =>
    new Date(a.pai.data_vencimento || '9999-12-31') -
    new Date(b.pai.data_vencimento || '9999-12-31')
  );

  const agora = new Date();
  const totalGeral = grupos.reduce((s, g) => s + g.liquido, 0);
  const total7d = grupos
    .filter(g => {
      const dias = Math.round((agora - new Date((g.pai.data_vencimento || '1900-01-01') + 'T00:00:00')) / 86400000);
      return dias > 0 && dias <= 7;
    })
    .reduce((s, g) => s + g.liquido, 0);
  const total30d = grupos
    .filter(g => {
      const dias = Math.round((agora - new Date((g.pai.data_vencimento || '1900-01-01') + 'T00:00:00')) / 86400000);
      return dias > 0 && dias <= 30;
    })
    .reduce((s, g) => s + g.liquido, 0);
  const totalAcima30d = grupos
    .filter(g => {
      const dias = Math.round((agora - new Date((g.pai.data_vencimento || '1900-01-01') + 'T00:00:00')) / 86400000);
      return dias > 30;
    })
    .reduce((s, g) => s + g.liquido, 0);

  const aba = garantirAba_(ABA_CONTAS_VENCIDAS);
  aba.clearContents();

  aba.getRange('A1:B1').setValues([['LABEL', 'VALOR']]);
  aba.getRange('A2:B2').setValues([['JANELA', 'Todos os vencidos em aberto (tipo=PA)']]);
  aba.getRange('A3:B3').setValues([['TOTAL_VENCIDO', totalGeral]]);
  aba.getRange('A4:B4').setValues([['QTD_LANCAMENTOS', grupos.length]]);
  aba.getRange('A5:B5').setValues([['TOTAL_ATE_7_DIAS', total7d]]);
  aba.getRange('A6:B6').setValues([['TOTAL_ATE_30_DIAS', total30d]]);
  aba.getRange('A7:B7').setValues([['TOTAL_ACIMA_30_DIAS', totalAcima30d]]);
  aba.getRange('A8:B8').setValues([['MODO', label]]);
  aba.getRange('A9:B9').setValues([['CONTAS_CONSULTADAS', contasConsultadas.join(', ')]]);
  aba.getRange('A10:B10').setValues([['CONTAS_COM_ERRO', contasComErro.length ? contasComErro.join(' | ') : '']]);
  aba.getRange('A11:B11').setValues([['ATUALIZADO_EM', new Date().toLocaleString('pt-BR', { timeZone: FUSO })]]);

  aba.getRange('B3:B7').setNumberFormat('#,##0.00');

  aba.getRange('A13:L13').setValues([[
    'DATA_VENCIMENTO','CONTA','DESCRICAO','CATEGORIA_ID','CATEGORIA',
    'VALOR_BRUTO','VALOR_DEDUCOES','VALOR_LIQUIDO',
    'DIAS_EM_ATRASO','STATUS','ID','FORNECEDOR'
  ]]);
  limparLinhasAbaixo_(aba, 14);

  if (grupos.length > 0) {
    const linhas = grupos.map(g => {
      const venc = new Date((g.pai.data_vencimento || '1900-01-01') + 'T00:00:00');
      const diasAtraso = Math.round((agora - venc) / 86400000);
      const status = diasAtraso === 0 ? 'VENCEU_HOJE'
        : diasAtraso <= 7 ? 'ATÉ_7_DIAS'
        : diasAtraso <= 30 ? 'ATÉ_30_DIAS'
        : diasAtraso <= 90 ? 'ATÉ_90_DIAS'
        : 'ACIMA_90_DIAS';

      return [
        g.pai.data_vencimento || '',
        g.contaNome,
        g.pai.descricao || '',
        g.pai.categoria_id || '',
        mapa[g.pai.categoria_id] || '',
        g.bruto,
        g.totalDeducoes,
        g.liquido,
        diasAtraso,
        status,
        g.pai.id || '',
        resolverPessoa_(g.pai, mapaPessoas)
      ];
    });
    aba.getRange(14, 1, linhas.length, 12).setValues(linhas);
  }

  const nL = Math.max(grupos.length, 1);
  aba.getRange(14, 6, nL, 3).setNumberFormat('#,##0.00');
  aba.getRange(13, 1, 1, 12)
    .setBackground('#c5221f').setFontColor('#ffffff').setFontWeight('bold');
  aba.setFrozenRows(13);
  aba.autoResizeColumns(1, 12);

  Logger.log(
    '[Patch Contas Vencidas] ✅ Total: R$' + totalGeral.toFixed(2)
    + ' | Qtd: ' + grupos.length
    + ' | Contas OK: ' + contasConsultadas.length
    + ' | Contas com erro: ' + contasComErro.length
  );
}
