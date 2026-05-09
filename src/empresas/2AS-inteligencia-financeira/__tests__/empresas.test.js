import { describe, expect, it } from "vitest";
import {
  EMPRESAS,
  DEFAULT_EMPRESA_ID,
  getEmpresaById,
  getPerfilDemo,
  isEmpresaDemo,
  resolveEmpresaId,
} from "../empresas.js";

describe("registro de empresas demo", () => {
  it("expõe três perfis demo distintos (saudavel, atencao, crise)", () => {
    const ids = EMPRESAS.map(e => e.id);
    expect(ids).toEqual(["demo-saudavel", "demo-atencao", "demo-crise"]);
    EMPRESAS.forEach(empresa => {
      expect(empresa.demo).toBe(true);
      expect(empresa.perfilDemo).toMatch(/^(saudavel|atencao|crise)$/);
    });
  });

  it("define o cenário saudável como padrão", () => {
    expect(DEFAULT_EMPRESA_ID).toBe("demo-saudavel");
  });

  it("resolve IDs legados para os novos perfis", () => {
    expect(resolveEmpresaId("2AS-demo")).toBe("demo-saudavel");
    expect(resolveEmpresaId("2AS-inteligencia-financeira")).toBe("demo-saudavel");
    expect(resolveEmpresaId("2as-demo")).toBe("demo-saudavel");
    expect(resolveEmpresaId("2as-inteligencia-financeira")).toBe("demo-saudavel");
    expect(resolveEmpresaId("cliente-growth")).toBe("demo-atencao");
    expect(resolveEmpresaId("desconhecido")).toBe(DEFAULT_EMPRESA_ID);
    expect(resolveEmpresaId("")).toBe(DEFAULT_EMPRESA_ID);
  });

  it("getEmpresaById retorna o objeto resolvido", () => {
    expect(getEmpresaById("2AS-demo").id).toBe("demo-saudavel");
    expect(getEmpresaById("demo-crise").nome).toContain("Crise");
  });

  it("isEmpresaDemo e getPerfilDemo refletem o registro", () => {
    expect(isEmpresaDemo("demo-saudavel")).toBe(true);
    expect(isEmpresaDemo("demo-crise")).toBe(true);
    expect(getPerfilDemo("demo-atencao")).toBe("atencao");
    expect(getPerfilDemo("2AS-demo")).toBe("saudavel");
  });
});
