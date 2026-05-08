import { describe, expect, it } from "vitest";
import {
  getDemoProfile,
  getDemoProfileName,
  getDemoSheetCsv,
  isDemoCompany,
} from "../demoSheets.js";

const PROFILE_IDS = [
  { id: "demo-saudavel", profile: "saudavel" },
  { id: "demo-atencao", profile: "atencao" },
  { id: "demo-crise", profile: "crise" },
];

const LEGACY_IDS = [
  { id: "luniq-demo", profile: "saudavel" },
  { id: "luniq-inteligencia-financeira", profile: "saudavel" },
  { id: "2as-demo", profile: "saudavel" },
  { id: "2as-inteligencia-financeira", profile: "saudavel" },
  { id: "cliente-growth", profile: "atencao" },
];

function parseCsvRows(text = "") {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split(","));
}

describe("demoSheets · perfis demo", () => {
  it("identifica todos os IDs (atuais e legados) como demo", () => {
    [...PROFILE_IDS, ...LEGACY_IDS].forEach(({ id, profile }) => {
      expect(isDemoCompany(id)).toBe(true);
      expect(getDemoProfileName(id)).toBe(profile);
      expect(getDemoProfile(id)).toBeTruthy();
    });
  });

  it("retorna null para IDs não-demo", () => {
    expect(isDemoCompany("cliente-real-123")).toBe(false);
    expect(getDemoProfileName("cliente-real-123")).toBeNull();
    expect(getDemoProfile("cliente-real-123")).toBeNull();
  });

  it("expõe saldos, runway e contas distintos por cenário", () => {
    const saudavel = getDemoProfile("demo-saudavel");
    const atencao = getDemoProfile("demo-atencao");
    const crise = getDemoProfile("demo-crise");

    // saldos descrescem do saudável para a crise
    expect(saudavel.saldos.principal).toBeGreaterThan(atencao.saldos.principal);
    expect(atencao.saldos.principal).toBeGreaterThan(crise.saldos.principal);

    // runway acompanha a deterioração
    expect(saudavel.runway.dias).toBeGreaterThan(atencao.runway.dias);
    expect(atencao.runway.dias).toBeGreaterThan(crise.runway.dias);

    // janela 30d/60d na auxiliar diferencia geração de caixa
    expect(saudavel.auxiliar.d30).toBeGreaterThan(0);
    expect(crise.auxiliar.d30).toBeLessThan(0);

    // estoque de vencidos aumenta com a deterioração
    expect(saudavel.contasVencidas.meta.total).toBeLessThan(atencao.contasVencidas.meta.total);
    expect(atencao.contasVencidas.meta.total).toBeLessThan(crise.contasVencidas.meta.total);
  });

  it("gera CSV de saldos consistente com o perfil", () => {
    PROFILE_IDS.forEach(({ id }) => {
      const csv = getDemoSheetCsv("saldos", id);
      const rows = parseCsvRows(csv);
      const headers = rows[0];
      expect(headers).toEqual(["label", "value"]);
      const total = rows.find(row => row[0] === "TOTAL");
      expect(total).toBeTruthy();
      const profile = getDemoProfile(id);
      expect(Number(total[1])).toBe(profile.saldos.principal + profile.saldos.reserva);
    });
  });

  it("gera CSV de contas a pagar com header de metadados e linhas de detalhe", () => {
    PROFILE_IDS.forEach(({ id }) => {
      const csv = getDemoSheetCsv("contas_pagar", id);
      expect(csv).toContain("TOTAL_7D");
      expect(csv).toContain("TOTAL_30D");
      expect(csv).toContain("TOTAL_60D");
      expect(csv).toContain("DATA_VENCIMENTO");
      const profile = getDemoProfile(id);
      expect(csv).toContain(String(profile.contasPagar.meta.total7d));
      expect(csv).toContain(String(profile.contasPagar.meta.total60d));
    });
  });

  it("gera DRE 2026 com receita e EBITDA refletindo o cenário", () => {
    const dre = id => parseCsvRows(getDemoSheetCsv("dre_2026", id));
    const receita = rows => rows.find(r => r[0] === "RECEITA OPERACIONAL BRUTA");
    const ebitda = rows => rows.find(r => r[0] === "(=) EBITDA");

    const sumValues = row => row.slice(1, 5).reduce((sum, value) => sum + Number(value), 0);

    const saudavel = dre("demo-saudavel");
    const atencao = dre("demo-atencao");
    const crise = dre("demo-crise");

    // receita do cenário saudável > atenção > crise no acumulado de 4 meses
    expect(sumValues(receita(saudavel))).toBeGreaterThan(sumValues(receita(atencao)));
    expect(sumValues(receita(atencao))).toBeGreaterThan(sumValues(receita(crise)));

    // EBITDA acumulado: saudável claramente positivo, crise negativo,
    // atenção fica abaixo do saudável e acima da crise
    const ebitdaSaudavel = sumValues(ebitda(saudavel));
    const ebitdaAtencao = sumValues(ebitda(atencao));
    const ebitdaCrise = sumValues(ebitda(crise));
    expect(ebitdaSaudavel).toBeGreaterThan(0);
    expect(ebitdaCrise).toBeLessThan(0);
    expect(ebitdaSaudavel).toBeGreaterThan(ebitdaAtencao);
    expect(ebitdaAtencao).toBeGreaterThan(ebitdaCrise);
  });

  it("usa fallback de planilha vazia quando a chave é desconhecida", () => {
    expect(getDemoSheetCsv("chave_nao_existente", "demo-saudavel")).toBe("label,value\n");
    expect(getDemoSheetCsv("contas_xpto", "demo-saudavel")).toBe("DATA_VENCIMENTO\n");
  });
});
