import { describe, expect, it } from "vitest";
import { normalizeIntegrationPayload } from "../canonical.js";

describe("normalizeIntegrationPayload", () => {
  it("keeps legacy rows and exposes canonical rows", () => {
    const payload = normalizeIntegrationPayload("granatum", {
      updatedAt: "2026-01-02T00:00:00.000Z",
      rows: [
        {
          ID: "123",
          DATA_VENCIMENTO: "2026-01-31",
          CONTA: "Conta Principal",
          CATEGORIA: "Serviços",
          FORNECEDOR: "Fornecedor Teste",
          DESCRICAO: "Parcela 01",
          VALOR_BRUTO: 100,
          VALOR_LIQUIDO: 95,
          VALOR_DEDUCOES: 5,
          STATUS: "ESTA_SEMANA",
        },
      ],
    });

    expect(payload.provider).toBe("granatum");
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].ID).toBe("123");
    expect(payload.canonicalRows[0]).toMatchObject({
      sourceId: "123",
      dueDate: "2026-01-31",
      netValue: 95,
      deductions: 5,
    });
  });
});
