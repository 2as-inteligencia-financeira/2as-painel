import { listConnectors } from "../../src/server/connectors/index.js";
import { connectorHealth } from "../../src/server/connectors/telemetry.js";
import { isAuthorized } from "../../src/server/supabaseAuth.js";

function send(res, status, body, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(body);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
  }
  if (!isAuthorized(req.headers)) {
    return send(res, 401, "Authentication required", { "Cache-Control": "no-store" });
  }

  const providers = listConnectors();
  const status = providers.map((provider) => connectorHealth(provider));
  return send(res, 200, req.method === "HEAD" ? "" : JSON.stringify({ providers, status }), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
}
