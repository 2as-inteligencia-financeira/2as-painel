import { fetchSheetCsv } from "../sheetsProxy.js";

async function fetchSheetJson(key, companyId = "") {
  const result = await fetchSheetCsv(key, companyId);
  return {
    status: result.status,
    key,
    rows: typeof result.body === "string" ? result.body : "",
    headers: result.headers || {},
  };
}

export const sheetsAdapter = {
  provider: "google_sheets",
  async getSheet({ key, companyId = "" } = {}) {
    if (!key) throw new Error("Missing key for Google Sheets adapter");
    return fetchSheetJson(key, companyId);
  },
};
