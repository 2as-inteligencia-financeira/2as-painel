import {
  fetchGranatumContasPagarLabs,
  fetchGranatumContasPagasLabs,
  fetchGranatumContasVencidasLabs,
  fetchGranatumFluxoProjetadoLabs,
} from "../granatumLabs.js";
import { normalizeIntegrationPayload } from "./canonical.js";

export const granatumAdapter = {
  provider: "granatum",
  async getPayables({ companyId = "" } = {}) {
    const payload = await fetchGranatumContasPagarLabs(companyId);
    return normalizeIntegrationPayload("granatum", payload, "payables");
  },
  async getOverduePayables({ companyId = "" } = {}) {
    const payload = await fetchGranatumContasVencidasLabs(companyId);
    return normalizeIntegrationPayload("granatum", payload, "payables");
  },
  async getPaidPayables({ companyId = "", dataInicio = "", dataFim = "" } = {}) {
    const payload = await fetchGranatumContasPagasLabs({ companyId, dataInicio, dataFim });
    return normalizeIntegrationPayload("granatum", payload, "payables");
  },
  async getProjectedCashflow({ companyId = "" } = {}) {
    const payload = await fetchGranatumFluxoProjetadoLabs(companyId);
    return normalizeIntegrationPayload("granatum", payload, "cashflow");
  },
};
