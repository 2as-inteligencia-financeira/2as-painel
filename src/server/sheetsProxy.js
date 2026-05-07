/* global process, Buffer */

import { createSign, createHash, timingSafeEqual } from "node:crypto";
import { getDemoSheetCsv } from "./demoSheets.js";
import { SHEET_KEYS, OPTIONAL_SHEET_KEYS } from "../config/sheets.js";

export const ALLOWED_SHEET_KEYS = new Set(SHEET_KEYS);

const CACHE_SECONDS = Number(process.env.SHEETS_CACHE_SECONDS || 60);
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
let googleAccessToken = null;
// BAIXO-03: IDs de planilha devem ser configurados via variáveis de ambiente.
// Use SHEET_ID_<KEY> / SHEET_GID_<KEY> ou SHEETS_PRIVATE_SOURCES_JSON na Vercel.
const DEFAULT_PRIVATE_SOURCES = {};

export function envNameForSheetKey(key) {
  return `SHEET_URL_${key.toUpperCase()}`;
}

export function privateSheetIdEnvName(key) {
  return `SHEET_ID_${key.toUpperCase()}`;
}

export function privateSheetGidEnvName(key) {
  return `SHEET_GID_${key.toUpperCase()}`;
}

export function privateSheetRangeEnvName(key) {
  return `SHEET_RANGE_${key.toUpperCase()}`;
}

function companyEnvPrefix(companyId) {
  return String(companyId || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function companyEnvName(companyId, envName) {
  const prefix = companyEnvPrefix(companyId);
  return prefix ? `${prefix}_${envName}` : envName;
}

function parseJsonEnv(envName) {
  const raw = process.env[envName];
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getSheetUrl(key, companyId = "") {
  const directEnv = envNameForSheetKey(key);
  const urlsJsonEnv = "SHEETS_URLS_JSON";
  return process.env[companyEnvName(companyId, directEnv)]
    || parseJsonEnv(companyEnvName(companyId, urlsJsonEnv))[key]
    || process.env[directEnv]
    || parseJsonEnv(urlsJsonEnv)[key]
    || "";
}

function getPrivateSheetSource(key, companyId = "") {
  const source = parseJsonEnv(companyEnvName(companyId, "SHEETS_PRIVATE_SOURCES_JSON"))[key]
    || parseJsonEnv("SHEETS_PRIVATE_SOURCES_JSON")[key]
    || DEFAULT_PRIVATE_SOURCES[key]
    || {};
  const spreadsheetId = process.env[companyEnvName(companyId, privateSheetIdEnvName(key))]
    || process.env[privateSheetIdEnvName(key)]
    || source.spreadsheetId
    || "";
  const gid = process.env[companyEnvName(companyId, privateSheetGidEnvName(key))]
    || process.env[privateSheetGidEnvName(key)]
    || source.gid
    || source.sheetId
    || "";
  const range = process.env[companyEnvName(companyId, privateSheetRangeEnvName(key))]
    || process.env[privateSheetRangeEnvName(key)]
    || source.range
    || "";
  const allTabs = source.allTabs === true;

  if (!spreadsheetId) return null;
  return { spreadsheetId, gid: String(gid || ""), range, allTabs };
}

export function isAuthorized(headers = {}) {
  const user = process.env.PANEL_BASIC_AUTH_USER;
  const password = process.env.PANEL_BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return process.env.VERCEL_ENV !== "production";
  }

  const header = headers.authorization || headers.Authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  const suppliedUser = decoded.slice(0, separator);
  const suppliedPassword = decoded.slice(separator + 1);

  // ALTO-04: comparação resistente a timing attacks via hash SHA-256
  // Hashes sempre têm 32 bytes, eliminando o vazamento de tamanho
  const hashSupUser  = createHash("sha256").update(suppliedUser).digest();
  const hashUser     = createHash("sha256").update(user).digest();
  const hashSupPass  = createHash("sha256").update(suppliedPassword).digest();
  const hashPass     = createHash("sha256").update(password).digest();
  return timingSafeEqual(hashSupUser, hashUser) && timingSafeEqual(hashSupPass, hashPass);
}

export function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(raw) {
  return String(raw || "").replace(/\\n/g, "\n");
}

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!email || !privateKey) {
    throw new Error("Missing Google service account credentials");
  }

  const now = Math.floor(Date.now() / 1000);
  if (googleAccessToken && googleAccessToken.expiresAt - 60 > now) {
    return googleAccessToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error("Could not authorize Google service account");
  }

  googleAccessToken = {
    token: json.access_token,
    expiresAt: now + Number(json.expires_in || 3600),
  };
  return googleAccessToken.token;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function valuesToCsv(values = []) {
  return values.map(row => row.map(csvEscape).join(",")).join("\n");
}

async function googleSheetsFetch(path, accessToken) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Google Sheets API error");
  }
  return json;
}

function quoteSheetName(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function getSheetTitleByGid(spreadsheetId, gid, accessToken) {
  const metadata = await googleSheetsFetch(
    `${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,
    accessToken
  );
  const sheet = metadata.sheets?.find(s => String(s.properties?.sheetId) === String(gid));
  return sheet?.properties?.title || metadata.sheets?.[0]?.properties?.title || "";
}

async function fetchPrivateSheetCsv(source) {
  const accessToken = await getGoogleAccessToken();

  // Modo "todas as abas": lê cada aba cujo nome seja um ano (2023, 2024, 2025…)
  // e injeta o ano na coluna MES, convertendo "JAN" → "JAN/2024"
  if (source.allTabs) {
    return fetchAllYearTabsCsv(source.spreadsheetId, accessToken);
  }

  // Auto-cita o nome da aba caso não comece com aspas simples
  const rangeStr = source.range
    ? (source.range.startsWith("'") ? source.range : quoteSheetName(source.range))
    : `${quoteSheetName(await getSheetTitleByGid(source.spreadsheetId, source.gid, accessToken))}`;

  const values = await googleSheetsFetch(
    `${encodeURIComponent(source.spreadsheetId)}/values/${encodeURIComponent(rangeStr)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
    accessToken
  );
  const rows = values.values || [];

  // Detecção de formato horizontal: cabeçalho tem colunas com anos (20xx)
  // Exemplo: CONTA | 2024 | 2025 — transpõe para CONTA/MES/VALOR vertical
  if (rows.length >= 2) {
    const header = rows[0];
    const yearCols = header.slice(1).map((h, i) => ({
      idx: i + 1,
      ano: extrairAnoAba(String(h ?? "")),
    })).filter(c => c.ano !== null);

    if (yearCols.length >= 1) {
      // Formato horizontal: cada conta + cada ano → uma linha CONTA, "TOTAL/YYYY", VALOR
      const linhas = [["CONTA", "MES", "VALOR"]];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const conta = String(row[0] ?? "").trim();
        if (!conta) continue;
        for (const { idx, ano } of yearCols) {
          const valor = String(row[idx] ?? "").trim();
          if (!valor) continue;
          linhas.push([conta, `TOTAL/${ano}`, valor]);
        }
      }
      return linhas.map(row => row.map(csvEscape).join(",")).join("\n");
    }
  }

  return valuesToCsv(rows);
}

// Extrai o ano (20xx) do nome de uma aba — aceita "2024", "DRE 2024", "2024 - Realizado", etc.
function extrairAnoAba(titulo) {
  const m = String(titulo || "").match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

// Lê TODAS as abas que contenham um ano (20xx) no nome e combina em um CSV único
// com coluna MES no formato "JAN/2024", pronto para extrairDREMultiAno
// Se nenhuma aba tiver ano no nome, tenta ler TODAS as abas e detectar o ano pelo conteúdo
async function fetchAllYearTabsCsv(spreadsheetId, accessToken) {
  const metadata = await googleSheetsFetch(
    `${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,
    accessToken
  );

  const todasAbas = (metadata.sheets || []).map(s => ({
    title: s.properties?.title || "",
    gid:   String(s.properties?.sheetId ?? ""),
    ano:   extrairAnoAba(s.properties?.title || ""),
  }));

  // Abas com ano no nome
  const abaAnos = todasAbas.filter(s => s.ano !== null);

  // Se nenhuma aba tem ano no nome, usa TODAS as abas (o parser vai tentar detectar o ano pelo conteúdo)
  const abasParaLer = abaAnos.length > 0 ? abaAnos : todasAbas;

  const todasLinhas = [];
  let headerPrinted = false;

  for (const aba of abasParaLer) {
    const yearDaNome = aba.ano; // pode ser null se não havia ano no nome
    let values;
    try {
      values = await googleSheetsFetch(
        `${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(quoteSheetName(aba.title))}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
        accessToken
      );
    } catch {
      continue; // aba protegida ou inacessível — pula
    }
    const rows = values.values || [];
    if (rows.length < 2) continue;

    // Detecta índices das colunas CONTA, MES, VALOR (case-insensitive, aceitando variações)
    const header = rows[0].map(h => String(h ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim());
    const iConta = header.findIndex(h => h === "CONTA" || h.startsWith("CONTA") || h === "ACCOUNT" || h === "DESCRICAO" || h === "DESCRICAO DA CONTA");
    const iMes   = header.findIndex(h => h === "MES" || h === "MES DE REFERENCIA" || h === "COMPETENCIA" || h === "MONTH" || h === "PERIODO");
    const iValor = header.findIndex(h => h === "VALOR" || h === "VALUE" || h === "VALOR REALIZADO" || h === "REALIZADO");

    // Se não encontrou colunas pelo nome, usa posições padrão (0, 1, 2)
    const ci = iConta >= 0 ? iConta : 0;
    const mi = iMes   >= 0 ? iMes   : 1;
    const vi = iValor >= 0 ? iValor : 2;

    if (!headerPrinted) {
      todasLinhas.push(["CONTA", "MES", "VALOR"]);
      headerPrinted = true;
    }

    for (let r = 1; r < rows.length; r++) {
      const row    = rows[r];
      const conta  = String(row[ci] ?? "").trim();
      const mesRaw = String(row[mi] ?? "").trim().toUpperCase();
      const valor  = String(row[vi] ?? "").trim();

      if (!conta || !mesRaw) continue;

      // Injeta o ano no MES se ainda não estiver lá:
      // 1. usa ano do nome da aba se disponível
      // 2. caso o valor de MES já contenha 4 dígitos, mantém como está
      let mesComAno = mesRaw;
      if (!/\d{4}/.test(mesRaw)) {
        if (yearDaNome) {
          mesComAno = `${mesRaw}/${yearDaNome}`;
        }
        // sem ano conhecido: deixa como está (extrairDREMultiAno vai tentar detectar)
      }
      todasLinhas.push([conta, mesComAno, valor]);
    }
  }

  return todasLinhas.map(row => row.map(csvEscape).join(",")).join("\n");
}

async function fetchPublicCsv(sheetUrl) {
  const url = new URL(sheetUrl);
  url.searchParams.set("cb", Date.now().toString());

  const response = await fetch(url, {
    headers: { "User-Agent": "Luniq-Painel/1.0" },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error("Could not fetch sheet data");
  }

  if (/<!doctype html|<html/i.test(text)) {
    throw new Error("Sheet did not return CSV data");
  }

  return text;
}

export async function fetchSheetCsv(key, companyId = "") {
  if (!ALLOWED_SHEET_KEYS.has(key)) {
    return {
      status: 404,
      body: "Sheet not found",
      headers: securityHeaders({ "Cache-Control": "no-store" }),
    };
  }

  const demoCsv = getDemoSheetCsv(key, companyId);
  if (demoCsv !== null) {
    return {
      status: 200,
      body: demoCsv,
      headers: securityHeaders({
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, max-age=0, s-maxage=60",
      }),
    };
  }

  const privateSource = getPrivateSheetSource(key, companyId);
  const sheetUrl = getSheetUrl(key, companyId);
  if (!privateSource && !sheetUrl) {
    if (OPTIONAL_SHEET_KEYS.has(key)) {
      return {
        status: 200,
        body: "DATA_VENCIMENTO\n",
        headers: securityHeaders({
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "private, max-age=0, s-maxage=60",
        }),
      };
    }
    return {
      status: 500,
      body: `Missing server env ${envNameForSheetKey(key)} or ${privateSheetIdEnvName(key)}`,
      headers: securityHeaders({ "Cache-Control": "no-store" }),
    };
  }

  try {
    const text = privateSource
      ? await fetchPrivateSheetCsv(privateSource)
      : await fetchPublicCsv(sheetUrl);

    return {
      status: 200,
      body: text,
      headers: securityHeaders({
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": `private, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      }),
    };
  } catch (error) {
    // Optional sheets: return empty CSV on error to avoid noisy client-side errors
    if (OPTIONAL_SHEET_KEYS.has(key)) {
      return {
        status: 200,
        body: "",
        headers: securityHeaders({
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "private, max-age=0, s-maxage=60",
        }),
      };
    }
    return {
      status: 502,
      body: error.message || "Could not fetch sheet data",
      headers: securityHeaders({ "Cache-Control": "no-store" }),
    };
  }
}
