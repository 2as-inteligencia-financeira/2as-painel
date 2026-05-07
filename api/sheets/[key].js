import { fetchSheetCsv } from "../../src/server/sheetsProxy.js";
import { isAuthorized } from "../../src/server/supabaseAuth.js";

function send(res, status, body, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(body);
}

function unauthorized(res) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="Luniq Painel"');
  send(res, 401, "Authentication required", {
    "Cache-Control": "no-store",
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  if (!isAuthorized(req.headers)) return unauthorized(res);

  const key = String(req.query.key || "").trim();
  const empresa = String(req.query.empresa || "").trim();
  const result = await fetchSheetCsv(key, empresa);
  return send(res, result.status, result.body, result.headers);
}
