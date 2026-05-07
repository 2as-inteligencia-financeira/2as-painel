import { toNum, parseDate } from "../hooks/useSheets";

export const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

// Ano mínimo de dados exibidos em todo o painel (inclusive)
export const ANO_MINIMO = 2024;

// Retorna true se a string "MM/YYYY" ou "YYYY" representa um ano >= ANO_MINIMO.
// Alguns dados vazios/defeituosos chegam como data Excel antiga (1899); esses
// anos são descartados para não virarem filtro nem contaminarem KPIs.
const anoValido = (anoOuPeriodo) => {
  const s = String(anoOuPeriodo || "");
  const m = s.match(/(\d{4})(?!.*\d)/);
  if (!m) return true; // sem ano → não filtra
  const ano = parseInt(m[1], 10);
  return ano >= ANO_MINIMO;
};

export const norm = value => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toUpperCase();

const first = (row, labels) => {
  const entries = Object.entries(row || {});
  const found = entries.find(([key]) => labels.some(label => norm(key) === norm(label)));
  return found?.[1] ?? "";
};

const monthFromPeriod = value => {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) return { mes: MESES[Number(match[1]) - 1] || "", ano: match[2], periodo: text };
  const date = parseDate(text);
  if (date) return { mes: MESES[date.getMonth()], ano: String(date.getFullYear()), periodo: `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}` };
  return { mes: text.toUpperCase().slice(0, 3), ano: "", periodo: text };
};

const bucketAging = days => {
  if (days <= 7) return "0-7";
  if (days <= 15) return "8-15";
  if (days <= 30) return "16-30";
  if (days <= 45) return "31-45";
  return "45+";
};

const isOpenCancellation = row => {
  const status = norm(first(row, ["Status"]));
  const fase = norm(first(row, ["Fase Atual"]));
  const text = `${status} ${fase}`;
  return !/(CONCLUID|ARQUIVAD|CHARGEBACK|CHARGEDBACK|FINALIZAD)/.test(text);
};

const addBy = (map, key, amount) => {
  const cleanKey = key || "Sem categoria";
  map.set(cleanKey, (map.get(cleanKey) || 0) + amount);
};

const mapToRank = (map, limit = 8) =>
  [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const normalizarPeriodo = value => {
  const s = String(value ?? "").trim();
  const match = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) {
    const periodo = `${String(Number(match[1])).padStart(2, "0")}/${match[2]}`;
    return anoValido(periodo) ? periodo : "";
  }
  return s;
};

// Extrai "DD/MM/YYYY ..." → "MM/YYYY" para uso como período de filtro
const periodoFromTimestamp = ts => {
  const s = String(ts ?? "").trim();
  // formato DD/MM/YYYY (ou com hora depois)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return normalizarPeriodo(s.slice(3, 10)); // "MM/YYYY"
  if (/^\d{1,2}\/\d{4}$/.test(s)) return normalizarPeriodo(s);
  return "";
};

const periodoFromDateLike = value => {
  const direto = periodoFromTimestamp(value);
  if (direto && anoValido(direto)) return direto;
  const info = monthFromPeriod(value);
  const periodo = normalizarPeriodo(info?.periodo);
  return periodo && anoValido(periodo) ? periodo : "";
};

export function buildCancelamentos(solicitacoes = [], vendas = [], competencia = []) {
  // Filtra registros a partir de ANO_MINIMO (2024+)
  const solicitacoesFiltradas = solicitacoes.filter(row => {
    const ts = first(row, ["Carimbo de data/hora"]);
    const period = periodoFromTimestamp(ts);
    return anoValido(period);
  });

  const total = solicitacoesFiltradas.length;
  // Total apenas a partir de 2025 (para o KPI principal)
  const total2025 = solicitacoesFiltradas.filter(row => {
    const ts = first(row, ["Carimbo de data/hora"]);
    const period = periodoFromTimestamp(ts);
    const year = parseInt(period.slice(-4), 10);
    return year >= 2025;
  }).length;

  // Substituir todas as referências de solicitacoes por solicitacoesFiltradas
  const solicitacoes_ = solicitacoesFiltradas;

  // Enriquecer TODAS as solicitações (para agrupamentos alternativos)
  const todasRaw = solicitacoes_.map(row => {
    const ts = first(row, ["Carimbo de data/hora"]);
    const dataSolicitacao = String(ts ?? "").trim().slice(0, 10);
    const dataCompraRaw   = String(first(row, ["Data da Compra"]) ?? "").trim().slice(0, 10);
    const dataEstornoRaw  = String(first(row, [
      "Data do Estorno", "Data de Estorno", "Data Estorno",
      "Data do Reembolso", "Data de Reembolso", "Data Reembolso",
      "Data Pagamento Reembolso", "Data do Pagamento do Reembolso",
      "Data Conclusão", "Data de Conclusão", "Data Conclusao",
    ]) ?? "").trim().slice(0, 10);
    const valor = toNum(first(row, ["Valor do Reembolso"]));
    const periodo = periodoFromTimestamp(ts) || normalizarPeriodo(first(row, ["MÊS & ANO", "MES & ANO"]));
    const periodoCompra = periodoFromTimestamp(dataCompraRaw);
    const periodoEstorno = periodoFromDateLike(dataEstornoRaw);
    return { valor, periodo, periodoCompra, periodoEstorno, dataSolicitacao, dataEstorno: dataEstornoRaw };
  }).filter(r => r.periodo && anoValido(r.periodo));

  // Calcula dias a partir de uma string de data "DD/MM/YYYY" ou "YYYY-MM-DD"
  const diasDesdeData = (dateStr) => {
    if (!dateStr) return 0;
    const s = String(dateStr).trim();
    let d;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const [dd, mm, yyyy] = s.slice(0, 10).split("/");
      d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      d = new Date(s.slice(0, 10));
    } else {
      return 0;
    }
    if (isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  };

  // Helper de enriquecimento de uma row de solicitação (todos os campos do view)
  const enriquecerRow = row => {
    const ts = first(row, ["Carimbo de data/hora"]);
    const dataSolicitacao = String(ts ?? "").trim().slice(0, 10);
    const valor = toNum(first(row, ["Valor do Reembolso"]));
    // Tenta coluna direta; fallback: calcula a partir da data de solicitação
    const diasColuna = toNum(first(row, ["Dias desde a data de solicitação", "Dias", "DIAS"]));
    const dias = diasColuna > 0 ? Math.max(0, diasColuna) : diasDesdeData(dataSolicitacao);
    const diasEmAtraso = Math.max(0, toNum(first(row, ["Dias em atraso"])));
    const reembolso = norm(first(row, ["Tipo de Reembolso", "Forma de Reembolso."]));
    const isPix = reembolso.includes("PIX");
    const email = String(first(row, ["E-mail", "Email", "EMAIL", "e-mail", "Email do Aluno"]) ?? "").trim();
    const dataEstorno = String(first(row, [
      "Data do Estorno", "Data de Estorno", "Data Estorno",
      "Data do Reembolso", "Data de Reembolso", "Data Reembolso",
      "Data Pagamento Reembolso", "Data do Pagamento do Reembolso",
      "Data Conclusão", "Data de Conclusão", "Data Conclusao",
    ]) ?? "").trim().slice(0, 10);
    return {
      aluno: String(first(row, ["Nome Completo do Aluno", "Nome do Aluno", "Aluno"]) ?? "").trim(),
      email,
      pedido: String(first(row, ["Nº do Pedido", "Nº Pedido", "Numero do Pedido"]) || "").trim() || "-",
      dataSolicitacao,
      dataCompra: String(first(row, ["Data da Compra"]) ?? "").trim().slice(0, 10),
      dataEstorno,
      periodoEstorno: periodoFromDateLike(dataEstorno),
      curso: String(first(row, ["Nome do Curso ou Pacote", "Curso", "Produto"]) || "").trim() || "Sem curso",
      tipo: isPix ? "PIX" : "Estorno",
      status: first(row, ["Status"]) || first(row, ["Fase Atual"]) || "-",
      dias,
      diasEmAtraso,
      valor,
      isPix,
      periodo: periodoFromTimestamp(ts) || normalizarPeriodo(first(row, ["MÊS & ANO", "MES & ANO"])),
    };
  };

  // Todas as solicitações enriquecidas (sem filtro de status aberto)
  const todasEnriched = solicitacoes_.map(enriquecerRow).filter(r => r.periodo && anoValido(r.periodo));

  // Solicitações em aberto (filtro isOpenCancellation aplicado, mesmos campos)
  const abertasRaw = solicitacoes_
    .filter(isOpenCancellation)
    .map(enriquecerRow)
    .filter(r => r.periodo && anoValido(r.periodo));

  // Computa métricas agregadas a partir de um subconjunto de abertasRaw
  const computeAgg = rows => {
    const aging = { "0-7": 0, "8-15": 0, "16-30": 0, "31-45": 0, "45+": 0 };
    const agingValor = { "0-7": 0, "8-15": 0, "16-30": 0, "31-45": 0, "45+": 0 };
    let valorAberto = 0, pix7 = 0, estorno3145 = 0, estorno45 = 0, emAtraso = 0;
    const cursosMap = {}, cursosValorMap = {};

    rows.forEach(r => {
      const bucket = bucketAging(r.dias);
      aging[bucket] += 1;
      agingValor[bucket] += r.valor;
      valorAberto += r.valor;
      if (r.isPix && r.dias > 7) pix7 += 1;
      if (!r.isPix && r.dias > 30 && r.dias <= 45) estorno3145 += 1;
      if (!r.isPix && r.dias > 45) estorno45 += 1;
      if (r.diasEmAtraso > 0) emAtraso += 1;
      cursosMap[r.curso] = (cursosMap[r.curso] || 0) + 1;
      cursosValorMap[r.curso] = (cursosValorMap[r.curso] || 0) + r.valor;
    });

    const cursosChart = Object.entries(cursosMap)
      .map(([label, qtd]) => ({ label, qtd, valor: cursosValorMap[label] || 0 }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 20);

    return {
      abertas: rows.length,
      emAtraso,
      valorAberto,
      pix7,
      estorno3145,
      estorno45,
      aging: Object.entries(aging).map(([label, qtd]) => ({ label, qtd, valor: agingValor[label] })),
      cursosChart,
    };
  };

  // Ordena por data real (MM/YYYY) — helper reutilizado
  const sortPeriodo = (a, b) => {
    const [ma, ya] = a.split('/').map(Number);
    const [mb, yb] = b.split('/').map(Number);
    return (ya - yb) || (ma - mb);
  };

  const periodos = [...new Set(abertasRaw.map(r => r.periodo).filter(p => p && anoValido(p)))].sort(sortPeriodo);

  // Períodos de TODAS as solicitações (para filtros de ano/mês no modo "Todos")
  const todosPeriodos = [...new Set(todasEnriched.map(r => r.periodo).filter(p => p && anoValido(p)))].sort(sortPeriodo);

  // Anos disponíveis (a partir do primeiro ano completo nas solicitações)
  const anosSet = new Set(todasEnriched.map(r => r.periodo?.slice(-4)).filter(anoValido));
  const anos = [...anosSet].sort();

  const vendasValidas = vendas
    .map(row => {
      const rawPct = toNum(first(row, [
        "% Vendas Canceladas", "% VENDAS CANCELADAS",
        "% Canceladas", "% CANCELADAS",
        "% Churn", "% CHURN",
        "PERCENTUAL", "PCT",
      ]));
      // Normaliza para decimal: se vier como 5.2 (%) divide por 100 → 0.052
      const pct = rawPct > 1 ? rawPct / 100 : rawPct;
      return {
        periodo: normalizarPeriodo(first(row, ["Período", "PERIODO"])),
        faturamento: toNum(first(row, ["Faturamento", "FATURAMENTO"])),
        cancelamentos: toNum(first(row, ["Cancelamentos", "CANCELAMENTOS"])),
        duplicada: toNum(first(row, ["Compra Duplicada"])),
        pct,
      };
    })
    .filter(row => row.periodo && (row.faturamento || row.cancelamentos) && anoValido(row.periodo));

  const vendasSerie = vendasValidas.sort((a, b) => sortPeriodo(a.periodo, b.periodo));
  const vendaAtual = vendasSerie[vendasSerie.length - 1] || {};

  // Série de vendas agrupada por data de compra (alternativa)
  const vendasPorCompra = (() => {
    const map = new Map();
    todasRaw.forEach(r => {
      if (!r.periodoCompra || !anoValido(r.periodoCompra)) return;
      const cur = map.get(r.periodoCompra) || { periodo: r.periodoCompra, cancelamentos: 0 };
      cur.cancelamentos += r.valor;
      map.set(r.periodoCompra, cur);
    });
    return [...map.values()].sort((a,b) => sortPeriodo(a.periodo, b.periodo));
  })();

  const vendasPorEstorno = (() => {
    const map = new Map();
    todasRaw.forEach(r => {
      if (!r.periodoEstorno || !anoValido(r.periodoEstorno)) return;
      const cur = map.get(r.periodoEstorno) || { periodo: r.periodoEstorno, cancelamentos: 0 };
      cur.cancelamentos += r.valor;
      map.set(r.periodoEstorno, cur);
    });
    return [...map.values()].sort((a,b) => sortPeriodo(a.periodo, b.periodo));
  })();

  const vendasPorCompetencia = competencia
    .map(row => ({
      periodo: normalizarPeriodo(first(row, ["Período", "PERIODO"])),
      cancelamentos: toNum(first(row, ["Cancelamentos", "CANCELAMENTOS"])),
    }))
    .filter(row => row.periodo && row.cancelamentos && anoValido(row.periodo))
    .sort((a, b) => sortPeriodo(a.periodo, b.periodo));

  return {
    total,
    total2025,
    totalSolicitacoes: total,
    valorSolicitacoes: todasEnriched.reduce((s, r) => s + (r.valor || 0), 0),
    ...computeAgg(abertasRaw),
    abertasRaw,
    todasEnriched,
    todasRaw,
    periodos,
    computeAgg,  // exportado para o view usar ao filtrar
    vendaAtual,
    vendasSerie,
    vendasPorCompra,
    vendasPorEstorno,
    vendasPorCompetencia,
    todosPeriodos,
    anos,
  };
}

// Professores/categorias de controle gerencial — excluir dos totais operacionais
const CONTROLE_GERENCIAL = new Set(["AUTORIA PROPRIA", "DIRECAO CONCURSOS", "DIREÇÃO CONCURSOS"]);
const isControleGerencial = (professor) => {
  const p = String(professor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  return CONTROLE_GERENCIAL.has(p);
};

// Colunas de professor — usada em dois lugares
const COLS_PROFESSOR = [
  "PROFESSOR", "PROFESSOR(A)", "NOME", "NOME DO PROFESSOR", "NOME PROFESSOR",
  "NOME PROFESSOR(A)", "DOCENTE", "FORNECEDOR", "CONTRATADO",
];
const COLS_PERIODO   = ["PERIODO", "PERÍODO", "COMPETENCIA", "COMPETÊNCIA", "MES", "MÊS",
  "MES LANCAMENTO", "MÊS LANÇAMENTO", "PERIODO DO PAGAMENTO", "PERÍODO DO PAGAMENTO",
  "MES DE PAGAMENTO", "MÊS DE PAGAMENTO", "MES COMPETENCIA", "MÊS COMPETÊNCIA",
  "COMPETENCIA PAGAMENTO", "COMPETÊNCIA PAGAMENTO", "DATA COMPETENCIA",
  "REFERENCIA", "REFERÊNCIA", "MES REFERENCIA", "MÊS REFERÊNCIA"];
const COLS_VALOR     = ["VALOR TOTAL", "VALOR DE HORA AULA", "VALOR DE HORA-AULA", "VALOR HORA AULA", "VALOR HORA-AULA",
  "VALOR", "VALOR (R$)", "VALOR LIQUIDO", "VALOR LÍQUIDO",
  "VALOR DE LANCAMENTO", "VALOR LANÇAMENTO", "VALOR BRUTO", "VALOR PAGAMENTO",
  "VALOR A PAGAR", "TOTAL A PAGAR", "VALOR FINAL",
  "REMUNERACAO", "REMUNERAÇÃO", "HONORARIOS", "HONORÁRIOS"];

const COMPONENTES_PROFESSOR = [
  {
    tipo: "HORA AULA",
    aliases: [
      "VALOR DE HORA AULA", "VALOR DA HORA AULA", "VALOR HORA AULA", "HORA AULA",
      "VALOR HORA-AULA", "HORA-AULA",
    ],
  },
  {
    tipo: "GRAVACAO AULA",
    aliases: [
      "GRAVACAO AULA", "GRAVAÇÃO AULA", "GRAVACAO DE AULA", "GRAVAÇÃO DE AULA",
      "VALOR GRAVACAO AULA", "VALOR GRAVAÇÃO AULA",
      "VALOR GRAVACAO DE AULA", "VALOR GRAVAÇÃO DE AULA",
      "AULA GRAVADA", "VALOR AULA GRAVADA",
      "GRAVACOES", "GRAVAÇÕES", "VALOR GRAVACOES", "VALOR GRAVAÇÕES",
      "GRAVACAO", "GRAVAÇÃO",
    ],
  },
  {
    tipo: "FORUM DE DUVIDAS",
    aliases: [
      "VALOR FORUM DE DUVIDAS", "VALOR FÓRUM DE DÚVIDAS",
      "FORUM DE DUVIDAS", "FÓRUM DE DÚVIDAS",
      "FORUM DE DUVIDA", "FÓRUM DE DÚVIDA",
      "VALOR FORUM", "VALOR FÓRUM", "FORUM", "FÓRUM",
    ],
  },
  {
    tipo: "PDF TEORIA",
    aliases: ["PDF (TEORIA)", "PDF TEORIA", "VALOR PDF TEORIA"],
  },
  {
    tipo: "PDF QUESTOES",
    aliases: [
      "PDF (QUESTOES)", "PDF (QUESTÕES)", "PDF QUESTOES", "PDF QUESTÕES",
      "VALOR PDF QUESTOES", "VALOR PDF QUESTÕES",
    ],
  },
  {
    tipo: "ELABORACAO DE RECURSOS",
    aliases: [
      "ELABORACAO DE RECURSOS", "ELABORAÇÃO DE RECURSOS",
      "VALOR ELABORACAO DE RECURSOS", "VALOR ELABORAÇÃO DE RECURSOS",
      "RECURSOS", "VALOR RECURSOS",
    ],
  },
  {
    tipo: "CORRECAO DE DISCURSIVAS",
    aliases: [
      "CORRECAO DE DISCURSIVAS", "CORREÇÃO DE DISCURSIVAS",
      "VALOR CORRECAO DE DISCURSIVAS", "VALOR CORREÇÃO DE DISCURSIVAS",
      "DISCURSIVAS", "VALOR DISCURSIVAS",
    ],
  },
  {
    tipo: "FIXO",
    aliases: ["FIXO", "VALOR FIXO", "MENSALIDADE", "VALOR MENSAL"],
  },
];

const firstNumByPriority = (row, labels) => {
  for (const label of labels) {
    const value = toNum(first(row, [label]));
    if (value) return value;
  }
  return 0;
};

const componentesProfessor = row =>
  COMPONENTES_PROFESSOR
    .map(({ tipo, aliases }) => ({ tipo, valor: firstNumByPriority(row, aliases) }))
    .filter(item => item.valor);

const tipoProfessorCanonico = (...values) => {
  const text = norm(values.filter(Boolean).join(" "));
  const compact = text.replace(/[^A-Z0-9]/g, "");
  if (!text) return "";
  if (compact.includes("GRAVAC") || compact.includes("AULAGRAVADA") || compact.includes("VIDEOAULA")) return "GRAVACAO AULA";
  if (compact.includes("HORAAULA")) return "HORA AULA";
  if (compact.includes("PRODUCAODEMATERIALESCRITO") || compact.includes("MATERIALESCRITO")) return "MATERIAL ESCRITO";
  if (text.includes("FORUM") || text.includes("DUVIDA")) return "FORUM DE DUVIDAS";
  if (text.includes("PDF") && text.includes("TEORIA")) return "PDF TEORIA";
  if (text.includes("PDF") && (text.includes("QUEST") || text.includes("EXERC"))) return "PDF QUESTOES";
  if (text.includes("RECURSO")) return "ELABORACAO DE RECURSOS";
  if (text.includes("DISCURSIVA")) return "CORRECAO DE DISCURSIVAS";
  if (text.includes("FIXO") || text.includes("MENSAL")) return "FIXO";
  return "";
};

// buildProfessores agora aceita dados de múltiplos anos
// rows2026: aba atual (ano corrente); rows2025/rows2024: abas históricas opcionais
export function buildProfessores(rows2026 = [], rows2025 = [], rows2024 = []) {
  // Extrai nomes de professores de todas as linhas brutas (sem filtros de valor)
  // — para popular o combobox mesmo quando a estrutura de valor não é reconhecida
  const extrairNomes = (rows) => [...new Set(
    rows.map(r => String(first(r, COLS_PROFESSOR) ?? "").trim())
      .filter(p => p && !isControleGerencial(p))
  )];

  const nomesProfessores2026 = extrairNomes(rows2026);
  const nomesProfessores2025 = extrairNomes(rows2025);
  const nomesProfessores2024 = extrairNomes(rows2024);
  const nomesProfessoresAll  = [...new Set([...nomesProfessores2026, ...nomesProfessores2025, ...nomesProfessores2024])];

  const mapRows = (rows, anoFallback) =>
    rows.flatMap(row => {
      const periodoInfo = monthFromPeriod(first(row, COLS_PERIODO));
      const valorAgregado = firstNumByPriority(row, COLS_VALOR);
      const professor = String(first(row, COLS_PROFESSOR) ?? "").trim() || "Sem professor";
      const tipoRaw = String(first(row, ["TIPO DE LANCAMENTO", "TIPO DE LANÇAMENTO", "TIPO", "TIPO LANCAMENTO", "TIPO DE CONTRATO"]) ?? "").trim();
      const componentes = tipoRaw ? [] : componentesProfessor(row);
      const categoriaBase = String(first(row, ["CATEGORIA", "CATEGORIA DO LANCAMENTO"]) ?? "").trim() || "Sem categoria";
      const descricao = first(row, ["DESCRICAO", "DESCRIÇÃO", "DESCRICAO DO LANCAMENTO", "DESCRIÇÃO DO LANÇAMENTO"]);
      const tipoBase = tipoProfessorCanonico(tipoRaw, categoriaBase, descricao) || tipoRaw || "Sem tipo";
      const base = {
        data:      first(row, ["DATA", "DATA LANCAMENTO", "DATA LANÇAMENTO", "DATA PAGAMENTO"]),
        professor,
        descricao,
        forma:     String(first(row, ["FORMA DE PAGAMENTO", "FORMA PAGAMENTO"]) ?? "").trim(),
        anoStr:    periodoInfo.ano || anoFallback,
        ...periodoInfo,
      };

      if (componentes.length > 0) {
        return componentes.map(item => ({
          ...base,
          tipo: item.tipo,
          categoria: categoriaBase !== "Sem categoria" ? categoriaBase : item.tipo,
          valor: item.valor,
          valorTotalLinha: valorAgregado || componentes.reduce((sum, comp) => sum + comp.valor, 0),
          tipoOriginal: tipoBase,
        }));
      }

      return {
        ...base,
        tipo: tipoBase,
        categoria: categoriaBase,
        valor: valorAgregado,
        valorTotalLinha: valorAgregado,
        tipoOriginal: tipoBase,
      };
    })
    // Inclui linha se tem professor reconhecido (mesmo sem valor) OU tem valor positivo
    // → garante que professor aparece no combobox mesmo quando coluna de valor não é reconhecida
    .filter(row => (row.professor !== "Sem professor" || row.valor > 0) && row.periodo);

  const todos2026 = mapRows(rows2026, "2026");
  const todos2025 = mapRows(rows2025, "2025");
  const todos2024 = mapRows(rows2024, "2024");

  const lancamentosTodos = [...todos2026, ...todos2025, ...todos2024]
    .filter(row => !isControleGerencial(row.professor) && anoValido(row.anoStr));
  const lancamentosGerencial = [...todos2026, ...todos2025, ...todos2024]
    .filter(row => isControleGerencial(row.professor) && anoValido(row.anoStr));

  // Lançamentos 2026 (compat. com visão padrão)
  const lancamentosAno = todos2026.filter(row => !isControleGerencial(row.professor));

  const anos = [...new Set(lancamentosTodos.map(r => r.anoStr).filter(Boolean))].sort();

  // Agrega 2026 para KPIs padrão
  const competencias = new Map();
  const categorias   = new Map();
  const professores  = new Map();
  const tipos        = new Map();
  lancamentosAno.forEach(row => {
    addBy(competencias, row.periodo, row.valor);
    addBy(categorias,   row.categoria, row.valor);
    addBy(professores,  row.professor, row.valor);
    addBy(tipos,        row.tipo, row.valor);
  });

  const competenciaLista = [...competencias.entries()]
    .map(([periodo, valor]) => ({ periodo, valor, ...monthFromPeriod(periodo) }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  return {
    total:          lancamentosAno.reduce((sum, row) => sum + row.valor, 0),
    totalGerencial: lancamentosGerencial.filter(r => r.anoStr === "2026").reduce((sum, row) => sum + row.valor, 0),
    qtdProfessores: new Set(lancamentosAno.map(row => row.professor)).size,
    competencias:   competenciaLista,
    categorias:     mapToRank(categorias),
    tipos:          mapToRank(tipos, 500),
    professores:    mapToRank(professores, 10),
    todos:          mapToRank(professores, 500),
    lancamentosAno,       // 2026 apenas (compat.)
    lancamentosTodos,     // todos os anos combinados
    lancamentosGerencial,
    anos,
    // Nomes extraídos diretamente das planilhas brutas (sem filtro de valor)
    // — fallback robusto para o combobox de filtro
    nomesProfessores2026,
    nomesProfessores2025,
    nomesProfessores2024,
    nomesProfessoresAll,
  };
}

// Parseia duração de string para horas decimais (ex: "1:30" → 1.5, "2h" → 2, "90" → 90)
export function parseHoras(str) {
  if (!str) return 0;
  const s = String(str).trim();
  // HH:MM(:SS) com suporte a sinal negativo e horas acima de 24
  const hhmmss = s.match(/^(-?\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmmss) {
    const sign = hhmmss[1].startsWith("-") ? -1 : 1;
    const h = Math.abs(parseInt(hhmmss[1], 10));
    const m = parseInt(hhmmss[2], 10) || 0;
    const sec = parseInt(hhmmss[3] || "0", 10) || 0;
    return sign * (h + (m / 60) + (sec / 3600));
  }
  const hMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*h/i);
  if (hMatch) return parseFloat(hMatch[1].replace(",", "."));
  const minMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*(m|min|mins|minuto|minutos)$/i);
  if (minMatch) return parseFloat(minMatch[1].replace(",", ".")) / 60;
  const num = parseFloat(s.replace(",", "."));
  return isNaN(num) ? 0 : num;
}

// ─── MAPEADORES DE VÍDEO E ESCRITO (exportados para uso em ProfessorPerfil) ────
//
// Colunas esperadas nas abas de vídeo:
//   professor, descrição, data, duração prevista, tempo efetivo, remuneração,
//   orçamento, classificação, mês
//
// Colunas esperadas nas abas de material escrito:
//   professor, disciplina, assunto, prazo para envio, data entrega,
//   status, valor previsto, total a pagar

export function extrairAnoVideo(row, fallback) {
  const dataRaw = String(first(row, ["DATA", "DATA GRAVAÇÃO", "DATA GRAVACAO", "DATA DO VIDEO"]) ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(dataRaw)) return dataRaw.slice(0, 4);
  if (/^\d{2}\/\d{2}\/(\d{4})/.test(dataRaw)) return dataRaw.slice(6, 10);
  const mesRaw = String(first(row, ["MES"]) ?? "").trim();
  const m4 = mesRaw.match(/(\d{4})/);
  if (m4) return m4[1];
  return fallback;
}

export function extrairAnoEscrito(row, fallback) {
  const candidatos = [
    first(row, ["PRAZO PARA ENVIO", "PRAZO"]),
    first(row, ["DATA ENTREGA", "DATA DE ENTREGA"]),
    first(row, ["MES", "MÊS", "MES LANCAMENTO", "MÊS LANÇAMENTO"]),
    first(row, ["DATA", "DATA LANCAMENTO"]),
  ];
  for (const c of candidatos) {
    const s = String(c ?? "").trim();
    if (/^\d{2}\/\d{2}\/(\d{4})/.test(s)) return s.slice(6, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(s))     return s.slice(0, 4);
    const m4 = s.match(/(\d{4})/);
    if (m4) return m4[1];
  }
  return fallback;
}

// Converte campo MES bruto para "MM/YYYY" normalizado
const _MES_NOME = { JAN:"01",FEV:"02",MAR:"03",ABR:"04",MAI:"05",JUN:"06",
                    JUL:"07",AGO:"08",SET:"09",OUT:"10",NOV:"11",DEZ:"12" };
function normalizarPeriodoVideo(dataStr, mesRaw, anoFallback) {
  // 1ª opção: derivar da data da gravação (mais confiável)
  const d = String(dataStr ?? "").trim().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return `${d.slice(3,5)}/${d.slice(6,10)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d))   return `${d.slice(5,7)}/${d.slice(0,4)}`;
  // 2ª opção: normalizar o campo MES (JAN/2026, JAN 2026, 01/2026, 1/2026…)
  const m = String(mesRaw ?? "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const byNome = m.match(/^([A-Z]{3})[/\s-](\d{4})$/);
  if (byNome && _MES_NOME[byNome[1]]) return `${_MES_NOME[byNome[1]]}/${byNome[2]}`;
  const byNum  = m.match(/^(\d{1,2})\/(\d{4})$/);
  if (byNum)  return `${String(Number(byNum[1])).padStart(2,"0")}/${byNum[2]}`;
  // 3ª opção: só o nome do mês sem ano — anexar anoFallback
  if (_MES_NOME[m.slice(0,3)]) return `${_MES_NOME[m.slice(0,3)]}/${anoFallback}`;
  return "";
}

function periodoFromDateString(value) {
  const s = String(value ?? "").trim().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(3,5)}/${s.slice(6,10)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s.slice(5,7)}/${s.slice(0,4)}`;
  return "";
}

export function mapVideoRow(row, anoFallback) {
  const ano  = extrairAnoVideo(row, anoFallback);
  const data = String(first(row, ["DATA", "DATA GRAVAÇÃO", "DATA GRAVACAO", "DATA DO VIDEO"]) ?? "").slice(0, 10);
  const mes  = String(first(row, ["MES"]) ?? "");
  return {
    ano,
    periodo:         normalizarPeriodoVideo(data, mes, ano),   // "MM/YYYY" normalizado — usado nos filtros
    classificacao:   String(first(row, ["CLASSIFICAÇÃO", "CLASSIFICACAO", "CLASSIFICACAO ORCAMENTARIA", "CLASSIFICAÇÃO ORÇAMENTÁRIA", "TIPO"]) ?? "").trim().toUpperCase() || "-",
    professor:       String(first(row, ["PROFESSOR", "PROFESSOR(A)", "NOME PROFESSOR", "NOME DO PROFESSOR", "DOCENTE"]) ?? "").trim(),
    descricao:       String(first(row, ["DESCRICAO", "DESCRIÇÃO", "DESCRICAO DO VIDEO", "DESCRIÇÃO DO VÍDEO", "AULA", "ASSUNTO"]) ?? "").trim(),
    data,
    duracaoPrevista: String(first(row, ["DURACAO PREVISTA", "DURAÇÃO PREVISTA", "DURACAO", "DURAÇÃO"]) ?? ""),
    valorPrevisto:   toNum(first(row, ["VALOR PREVISTO"])),
    tempoEfetivo:    String(first(row, ["TEMPO EFETIVO", "DURACAO EFETIVA", "DURAÇÃO EFETIVA", "DURACAO GRAVADA", "DURAÇÃO GRAVADA", "TEMPO GRAVADO", "HORAS GRAVADAS"]) ?? ""),
    remuneracao:     toNum(first(row, ["REMUNERACAO", "REMUNERAÇÃO"])),
    mes,
    orcamento:       String(first(row, ["ORÇAMENTO", "ORCAMENTO"]) ?? "").trim().toUpperCase(),
  };
}

export function mapEscritoRow(row, anoFallback) {
  const prazoRaw = String(first(row, ["PRAZO PARA ENVIO", "PRAZO"]) ?? "").trim();
  const dataEntregaRaw = String(first(row, ["DATA ENTREGA", "DATA DE ENTREGA"]) ?? "").trim();
  const mesRaw = String(first(row, ["MES", "MÊS", "MES LANCAMENTO", "MÊS LANÇAMENTO", "DATA", "DATA LANCAMENTO"]) ?? "").trim();
  const ano = extrairAnoEscrito(row, anoFallback);
  return {
    ano,
    periodo:       periodoFromDateString(prazoRaw) || periodoFromDateString(dataEntregaRaw) || normalizarPeriodoVideo("", mesRaw, ano),
    professor:     String(first(row, ["PROFESSOR"]) ?? "").trim(),
    disciplina:    String(first(row, ["DISCIPLINA"]) ?? "").trim(),
    assunto:       String(first(row, ["ASSUNTO"]) ?? "").trim(),
    prazo:         prazoRaw.slice(0, 10),
    valorPrevisto: toNum(first(row, ["VALOR PREVISTO"])),
    status:        String(first(row, ["STATUS"]) ?? "").trim(),
    dataEntrega:   dataEntregaRaw.slice(0, 10),
    totalPagar:    toNum(first(row, ["TOTAL A PAGAR", "TOTAL PAGAR", "VALOR PAGAR", "VALOR A PAGAR"])),
  };
}

export function buildAcademico({
  material = [], gestao = [], exclusivos = [],
  video = [], escrito = [],
  video2025 = [], escrito2025 = [],
  video2024 = [], escrito2024 = [],
  franquia2024 = [],
}) {
  const normalizeResultado = (rows, tipo) => rows
    .map(row => {
      const periodoInfo = monthFromPeriod(first(row, ["MÊS LANÇAMENTO"]));
      return {
        tipo,
        previsto: toNum(first(row, ["DESPESA PREVISTA"])),
        realizado: toNum(first(row, ["DESPESA REALIZADA"])),
        diferenca: toNum(first(row, ["DIFERENÇA"])),
        meta: toNum(first(row, ["META DESPESA"])),
        diferencaMeta: toNum(first(row, ["DIFERENÇA DA META"])),
        ...periodoInfo,
      };
    })
    .filter(row => row.periodo);

  const resultadosRaw = [
    ...normalizeResultado(material, "Material escrito"),
    ...normalizeResultado(gestao, "Vídeos Gestão de Conteúdo"),
    ...normalizeResultado(exclusivos, "Vídeos Exclusivos"),
  ];

  const porTipo = new Map();
  const porPeriodo = new Map();
  resultadosRaw.forEach(row => {
    const cur = porTipo.get(row.tipo) || { label: row.tipo, previsto: 0, realizado: 0, meta: 0 };
    cur.previsto += row.previsto;
    cur.realizado += row.realizado;
    cur.meta += row.meta;
    porTipo.set(row.tipo, cur);

    const curP = porPeriodo.get(row.periodo) || { periodo: row.periodo, previsto: 0, realizado: 0, meta: 0 };
    curP.previsto += row.previsto;
    curP.realizado += row.realizado;
    curP.meta += row.meta;
    porPeriodo.set(row.periodo, curP);
  });

  // mapVideoRow e extrairAnoVideo são agora funções exportadas do módulo (ver acima)
  // — usadas diretamente aqui sem redeclaração

  // Mapeador para planilha de franquia (estrutura diferente — força classificação FRANQUIA)
  const mapFranquiaRow = (row, anoFallback) => ({
    ...mapVideoRow(row, anoFallback),
    classificacao: "FRANQUIA",
  });

  // Raw video completo (todos os anos >= ANO_MINIMO) — usado para Marketing, Franquia e Acadêmico
  const rawVideoAll = [
    ...video.map(r => mapVideoRow(r, "2026")),
    ...video2025.map(r => mapVideoRow(r, "2025")),
    ...video2024.map(r => mapVideoRow(r, "2024")),  // pode ter 2023 — ano extraído da data
    ...franquia2024.map(r => mapFranquiaRow(r, "2024")),
  ].filter(r => (r.professor || r.descricao) && anoValido(r.ano));

  // Para a aba Acadêmico: apenas Gestão de Conteúdo e Exclusivos
  // Exclui qualquer linha com classificacao ou orcamento = FRANQUIA, NÃO REMUNERADO, MARKETING
  // Também exclui classificacao = "-" (coluna ausente na planilha) para evitar vídeos sem categoria
  const EXCLUIR_VIDEO_CLS = new Set(["FRANQUIA", "NÃO REMUNERADO", "NAO REMUNERADO", "MARKETING", "-"]);
  const EXCLUIR_VIDEO_ORC = new Set(["MARKETING", "FRANQUIA"]);
  const rawVideo = rawVideoAll.filter(r =>
    !EXCLUIR_VIDEO_CLS.has(r.classificacao) &&
    !EXCLUIR_VIDEO_ORC.has(r.orcamento)
  );

  // Para a aba Marketing: separar vídeos com orçamento ou classificação de Marketing
  const rawVideoMarketing = rawVideoAll.filter(r =>
    r.orcamento === "MARKETING" || r.classificacao === "MARKETING"
  );

  // Agrupar vídeos por classificação (apenas os que ficam na aba Acadêmico)
  const videoClassMap = {};
  rawVideo.forEach(r => {
    const cls = r.classificacao || "Outro";
    if (!videoClassMap[cls]) videoClassMap[cls] = { label: `Vídeos ${cls}`, previsto: 0, realizado: 0, qtd: 0 };
    videoClassMap[cls].previsto += r.valorPrevisto;
    videoClassMap[cls].realizado += r.remuneracao;
    videoClassMap[cls].qtd += 1;
  });
  // Tipos REMUNERADO já cobertos por gestao+exclusivos — skip para evitar dupla contagem
  const tiposResultado = new Set(["REMUNERADO"]);
  Object.values(videoClassMap)
    .filter(v => !tiposResultado.has(v.label.replace("Vídeos ", "").toUpperCase()))
    .forEach(v => {
      const cur = porTipo.get(v.label) || { label: v.label, previsto: 0, realizado: 0, meta: 0 };
      cur.previsto += v.previsto;
      cur.realizado += v.realizado;
      porTipo.set(v.label, cur);
    });

  // mapEscritoRow e extrairAnoEscrito são agora funções exportadas do módulo (ver acima)

  // Material escrito de todos os anos >= ANO_MINIMO
  const rawEscritoTodos = [
    ...escrito.map(r => mapEscritoRow(r, "2026")),
    ...escrito2025.map(r => mapEscritoRow(r, "2025")),
    ...escrito2024.map(r => mapEscritoRow(r, "2024")),
  ].filter(r => (r.professor || r.disciplina) && anoValido(r.ano));

  // Compat: rawEscrito = apenas 2026 para agregações padrão
  const rawEscrito = rawEscritoTodos.filter(r => r.ano === "2026");

  // Controle por professor — escrito
  const escProfMap = {};
  rawEscrito.forEach(r => {
    const k = r.professor || "Sem professor";
    if (!escProfMap[k]) escProfMap[k] = { professor: k, qtd: 0, previsto: 0, totalPagar: 0 };
    escProfMap[k].qtd += 1;
    escProfMap[k].previsto += r.valorPrevisto;
    escProfMap[k].totalPagar += r.totalPagar;
  });
  const escPorProfessor = Object.values(escProfMap).sort((a, b) => b.totalPagar - a.totalPagar);

  // Controle por disciplina — escrito
  const escDiscMap = {};
  rawEscrito.forEach(r => {
    const k = r.disciplina || "Sem disciplina";
    if (!escDiscMap[k]) escDiscMap[k] = { disciplina: k, qtd: 0, previsto: 0, totalPagar: 0 };
    escDiscMap[k].qtd += 1;
    escDiscMap[k].previsto += r.valorPrevisto;
    escDiscMap[k].totalPagar += r.totalPagar;
  });
  const escPorDisciplina = Object.values(escDiscMap).sort((a, b) => b.totalPagar - a.totalPagar);

  // Controle por professor — vídeo (apenas remunerados da aba Acadêmico)
  const vidProfMap = {};
  rawVideo.forEach(r => {
    const k = r.professor || "Sem professor";
    if (!vidProfMap[k]) vidProfMap[k] = { professor: k, qtd: 0, previsto: 0, remuneracao: 0 };
    vidProfMap[k].qtd += 1;
    vidProfMap[k].previsto += r.valorPrevisto;
    vidProfMap[k].remuneracao += r.remuneracao;
  });
  const vidPorProfessor = Object.values(vidProfMap).sort((a, b) => b.remuneracao - a.remuneracao);

  // Controle por professor — Marketing
  const mktProfMap = {};
  rawVideoMarketing.forEach(r => {
    const k = r.professor || "Sem professor";
    if (!mktProfMap[k]) mktProfMap[k] = { professor: k, qtd: 0, previsto: 0, remuneracao: 0 };
    mktProfMap[k].qtd += 1;
    mktProfMap[k].previsto += r.valorPrevisto;
    mktProfMap[k].remuneracao += r.remuneracao;
  });
  const mktPorProfessor = Object.values(mktProfMap).sort((a, b) => b.remuneracao - a.remuneracao);

  const rawEscritoAberto = rawEscrito.filter(r => {
    const s = norm(r.status);
    return !s.includes("ENTREG") && !s.includes("CONCLU") && !s.includes("FINALIZ");
  });
  const abertasEscrito = rawEscritoAberto.length;
  // videos: apenas o ano mais recente presente nos dados (evita inflar com histórico)
  const anoMaisRecente = rawVideo.reduce((max, r) => (r.ano > max ? r.ano : max), "2024");
  const videos = rawVideo.filter(r =>
    r.ano === anoMaisRecente && (r.remuneracao > 0 || r.valorPrevisto > 0)
  ).length;
  const periodos = [...porPeriodo.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));

  // KPIs de top professor e disciplina (Acadêmico)
  const topProfEscrito    = escPorProfessor[0] || null;
  const topProfVideo      = vidPorProfessor[0] || null;
  const topDisciplina     = escPorDisciplina[0] || null;
  const topProfMarketing  = mktPorProfessor[0] || null;

  return {
    previsto: resultadosRaw.reduce((sum, row) => sum + row.previsto, 0),
    realizado: resultadosRaw.reduce((sum, row) => sum + row.realizado, 0),
    meta: resultadosRaw.reduce((sum, row) => sum + row.meta, 0),
    porTipo: [...porTipo.values()].sort((a, b) => b.realizado - a.realizado),
    periodos,
    abertasEscrito,
    videos,
    resultadosRaw,
    rawVideo,
    rawVideoMarketing,
    rawEscrito,
    escPorProfessor,
    escPorDisciplina,
    vidPorProfessor,
    mktPorProfessor,
    topProfEscrito,
    topProfVideo,
    topDisciplina,
    topProfMarketing,
    rawVideoAll,        // todos os anos (para Franquia + Marketing + Acadêmico c/ filtro de ano)
    rawEscritoTodos,    // todos os anos (para Acadêmico c/ filtro de ano)
    rawEscritoAberto,   // 2026 em aberto (tabela padrão)
    meses: periodos.map(p => p.periodo),
    anosVideo:   [...new Set(rawVideoAll.map(r => r.ano).filter(Boolean))].sort(),
    anosEscrito: [...new Set(rawEscritoTodos.map(r => r.ano).filter(Boolean))].sort(),
  };
}

// ─── CHARGEBACKS ──────────────────────────────────────────────────────────────
// Converte nome de mês em português para número (ex: "janeiro" → "01")
const MES_PT_MAP = { janeiro:"01", fevereiro:"02", marco:"03", abril:"04", maio:"05", junho:"06",
  julho:"07", agosto:"08", setembro:"09", outubro:"10", novembro:"11", dezembro:"12" };

function periodoFromMesPt(raw) {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // "janeiro/2025" ou "janeiro de 2025"
  const m = s.match(/^([a-z]+)[/\s-](?:de\s+)?(\d{4})$/);
  if (m) {
    const num = MES_PT_MAP[m[1].trim()];
    return num ? `${num}/${m[2]}` : "";
  }
  return "";
}

// Parseia status de chargeback para semáforo
function statusChargeback(raw = "") {
  const s = norm(raw);
  if (/ESTORNO EFETUADO|ESTORNADO/.test(s)) return "Estornado";
  // Ganho / recuperado
  if (/DISPUTA GANHA|GANHO|REVERTIDO|FAVOR|DEFERIDO|WON|RECUP/.test(s)) return "Ganho";
  // Perdido — inclui "Prazo excedido" (deadline para contestar passou)
  if (/DISPUTA PERDIDA|PERDIDO|DEBITADO|COBRADO|INDEFERIDO|PRAZO EXCEDIDO|LOST|NAO CONTESTADO/.test(s)) return "Perdido";
  // Em disputa / análise
  if (/DOCUMENTACAO EM ANALISE|DISPUTA|ANALISE|CONTESTANDO|REVISAO|EM ANALISE|SOB ANALISE/.test(s)) return "Em disputa";
  // Pendente / aguardando
  if (/PENDENTE|ABERTO|AGUARDANDO|RECEBIDO|NOTIFICADO/.test(s)) return "Pendente";
  return raw.trim() || "Sem status";
}

const pctChargeback_ = raw => {
  const n = toNum(raw);
  if (!n) return 0;
  return String(raw ?? "").includes("%") ? n / 100 : (n > 1 ? n / 100 : n);
};

export function buildChargebacks(analitico = [], indicadores = []) {
  // ── Analítico ─────────────────────────────────────────────────────────────
  const rows = analitico.map(row => {
    const ts = first(row, ["Data do Chargeback", "Data Chargeback", "DATA DO CHARGEBACK", "DATA", "Data", "Carimbo de data/hora"]);
    // Período: prioridade 1 — data da ocorrência (DD/MM/YYYY); prioridade 2 — coluna Mês/Ano
    const mesPt = String(first(row, ["Mês/Ano", "MES/ANO", "Mes/Ano", "Mês Ano", "PERIODO", "MÊS"]) ?? "").trim();
    const periodo = periodoFromTimestamp(ts) || periodoFromMesPt(mesPt) || monthFromPeriod(ts).periodo || "";
    const valor = toNum(first(row, ["Valor", "VALOR", "Valor do Chargeback", "VALOR DO CHARGEBACK"]));
    const statusRaw = String(first(row, ["Status", "STATUS", "Situação", "SITUACAO", "SITUAÇÃO"]) ?? "").trim();
    const motivoRaw = String(first(row, ["Motivo", "MOTIVO", "Razão", "RAZAO"]) ?? "").trim();
    const motivoNorm = norm(motivoRaw);
    return {
      data: String(ts ?? "").slice(0, 10),
      periodo,
      // Email como aluno (formato real da planilha)
      aluno:   String(first(row, ["Email", "EMAIL", "Aluno", "ALUNO", "Nome do Aluno", "Cliente"]) ?? "").trim() || "-",
      // Identificador é o número do pedido/transação
      pedido:  String(first(row, ["Identificador", "IDENTIFICADOR", "Nº Pedido", "N Pedido", "Pedido", "PEDIDO", "ID Pedido"]) ?? "").trim() || "-",
      curso:   String(first(row, ["Curso", "CURSO", "Produto", "PRODUTO"]) ?? "").trim() || "-",
      // Conta/banco/operadora
      banco:   String(first(row, ["Conta", "CONTA", "Banco", "BANCO", "Operadora", "Bandeira"]) ?? "").trim() || "-",
      motivo:  motivoNorm === "DESACORDO COMERCIAL" ? "Desacordo Comercial" : (motivoRaw && motivoRaw !== "-" ? motivoRaw : "Sem motivo"),
      tipo:    String(first(row, ["Tipo", "TIPO", "Tipo de Chargeback"]) ?? "").trim() || "-",
      dataCompra: String(first(row, ["Data da Compra", "DATA DA COMPRA"]) ?? "").trim().slice(0, 10),
      periodoCompra: String(first(row, ["Mês/Ano - Compra", "MES/ANO - COMPRA"]) ?? "").trim(),
      solicitouCancelamento: String(first(row, ["Solicitou Cancelamento?", "SOLICITOU CANCELAMENTO?"]) ?? "").trim() || "-",
      dataCancelamento: String(first(row, ["Data Solicitação Cancelamento", "DATA SOLICITAÇÃO CANCELAMENTO"]) ?? "").trim().slice(0, 10),
      periodoCancelamento: String(first(row, ["Mês/Ano - Cancelamento", "MES/ANO - CANCELAMENTO"]) ?? "").trim(),
      statusRaw,
      status: statusChargeback(statusRaw),
      valor,
    };
  }).filter(r => (r.periodo || r.data) && anoValido(r.periodo || r.data));

  // Agregações por status
  const porStatus = {};
  let valorTotal = 0, valorPerdido = 0, valorDisputa = 0, valorGanho = 0;
  const cursosMap = {}, mesesMap = {}, motivosMap = {};

  rows.forEach(r => {
    porStatus[r.status] = (porStatus[r.status] || 0) + 1;
    valorTotal += r.valor;
    if (r.status === "Perdido")    valorPerdido  += r.valor;
    if (r.status === "Em disputa") valorDisputa  += r.valor;
    if (r.status === "Ganho")      valorGanho    += r.valor;
    cursosMap[r.curso] = (cursosMap[r.curso] || 0) + 1;
    mesesMap[r.periodo] = (mesesMap[r.periodo] || { periodo:r.periodo, qtd:0, valor:0 });
    mesesMap[r.periodo].qtd   += 1;
    mesesMap[r.periodo].valor += r.valor;
    motivosMap[r.motivo] = (motivosMap[r.motivo] || 0) + 1;
  });

  const statusResume = Object.entries(porStatus)
    .map(([label, qtd]) => ({ label, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  const mesesSerie = Object.values(mesesMap)
    .sort((a, b) => {
      const [ma, ya] = a.periodo.split("/").map(Number);
      const [mb, yb] = b.periodo.split("/").map(Number);
      return (ya - yb) || (ma - mb);
    });

  const motivosTop = Object.entries(motivosMap)
    .map(([label, qtd]) => ({ label, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  // Anos e períodos disponíveis
  const sortPeriodo = (a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return (ya - yb) || (ma - mb);
  };
  const todosPerios = [...new Set(rows.map(r => r.periodo).filter(Boolean))].sort(sortPeriodo);
  const anosDisp    = [...new Set(todosPerios.map(p => p.slice(-4)).filter(Boolean))].sort();

  // ── Indicadores (aba resumo/KPIs) ─────────────────────────────────────────
  const kpisIndicadores = indicadores.map(row => {
    const volumeTotal = toNum(first(row, ["Volume Total", "VOLUME TOTAL", "Valor", "VALOR", "Valor Total"]));
    const total = toNum(first(row, ["Qtde de chargebacks", "QTDE DE CHARGEBACKS", "Total", "TOTAL", "Qtd", "QTD", "Total Chargebacks"]));
    return {
      periodo:      first(row, ["Período", "PERIODO", "Mês", "MES"]) || "",
      faturamento:  toNum(first(row, ["Faturamento", "FATURAMENTO"])),
      volumeTotal,
      valor:        volumeTotal,
      pedidos:      toNum(first(row, ["Qtde de Pedidos", "QTDE DE PEDIDOS", "Pedidos", "PEDIDOS"])),
      total,
      taxa:         pctChargeback_(first(row, ["Taxa de chargeback", "TAXA DE CHARGEBACK", "Taxa", "TAXA", "% Chargebacks", "% CB", "Taxa CB", "CB %", "Rate", "% Total", "Percentual", "Chargeback %", "Taxa (%)", "% de Chargeback"])),
      comCancelamento: toNum(first(row, ["Qtde com Pedido de Cancelamento", "QTDE COM PEDIDO DE CANCELAMENTO"])),
      pctCancelamento: pctChargeback_(first(row, ["% Pedido Cancelamento", "% PEDIDO CANCELAMENTO"])),
      volumeCancelamento: toNum(first(row, ["Volume com Cancelamento", "VOLUME COM CANCELAMENTO"])),
      ganhos:       toNum(first(row, ["Qtde de Disputas Ganhas", "QTDE DE DISPUTAS GANHAS", "Ganhos", "GANHOS", "Ganho", "GANHO"])),
      valorReavido: toNum(first(row, ["Valor Reavido", "VALOR REAVIDO"])),
      taxaSucesso:  pctChargeback_(first(row, ["Taxa de Sucesso", "TAXA DE SUCESSO"])),
      valorPerdido: toNum(first(row, ["Valor Perdido", "VALOR PERDIDO"])),
    };
  }).filter(r => r.periodo || r.total || r.volumeTotal);

  const ultimoIndicador = kpisIndicadores[kpisIndicadores.length - 1] || {};

  return {
    // Totais analiticos
    total:        rows.length,
    valorTotal,
    valorPerdido,
    valorDisputa,
    valorGanho,
    emDisputa:    porStatus["Em disputa"] || 0,
    pendentes:    porStatus["Pendente"] || 0,
    // Séries
    statusResume,
    mesesSerie,
    motivosTop,
    // Dados brutos
    rows,
    todosPerios,
    anosDisp,
    // Indicadores da aba KPI
    kpisIndicadores,
    ultimoIndicador,
  };
}
