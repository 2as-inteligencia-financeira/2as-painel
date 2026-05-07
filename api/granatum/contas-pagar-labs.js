import { isAuthorized } from "../../src/server/supabaseAuth.js";
import { getConnector } from "../../src/server/connectors/index.js";
import { registerConnectorSync, connectorHealth } from "../../src/server/connectors/telemetry.js";

function send(res, status, body, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(body);
}

function unauthorized(res) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="Luniq Painel"');
  send(res, 401, "Authentication required", { "Cache-Control": "no-store" });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  if (!isAuthorized(req.headers)) return unauthorized(res);

  try {
    const connector = getConnector("granatum");
    const payload = await connector.getPayables({ companyId: req.query?.empresa || "" });
    registerConnectorSync("granatum", "success", { entity: "payables", source: payload?.raw?.source || payload?.source || "" });
    return send(res, 200, req.method === "HEAD" ? "" : JSON.stringify(payload), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
  } catch (error) {
    registerConnectorSync("granatum", "error", { entity: "payables", message: error?.message || "Unknown error" });
    return send(res, 500, req.method === "HEAD" ? "" : JSON.stringify({
      error: error?.message || "Could not fetch Granatum data",
      health: connectorHealth("granatum"),
    }), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
  }
}
