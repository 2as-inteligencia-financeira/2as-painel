import { describe, expect, it } from "vitest";
import { parseHoras, buildChargebacks } from "../operationalData.js";

describe("operationalData smoke tests", () => {
  it("parses durations in hour formats", () => {
    expect(parseHoras("1:30")).toBeCloseTo(1.5, 4);
    expect(parseHoras("2h")).toBeCloseTo(2, 4);
    expect(parseHoras("90min")).toBeCloseTo(1.5, 4);
  });

  it("builds chargeback aggregations", () => {
    const result = buildChargebacks(
      [
        {
          "Data do Chargeback": "05/01/2026",
          "Mês/Ano": "janeiro/2026",
          Valor: "250,00",
          Status: "DISPUTA GANHA",
          Motivo: "Desacordo comercial",
        },
        {
          "Data do Chargeback": "10/01/2026",
          "Mês/Ano": "janeiro/2026",
          Valor: "100,00",
          Status: "DISPUTA PERDIDA",
          Motivo: "Fraude",
        },
      ],
      []
    );

    expect(result.total).toBe(2);
    expect(result.valorTotal).toBeGreaterThan(300);
    expect(result.statusResume.some(item => item.label === "Ganho")).toBe(true);
  });
});
