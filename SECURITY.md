# Security Notes

## Current Data Boundary

The browser must not know the Google Sheets CSV URLs. Frontend code calls same-origin endpoints such as:

```txt
/api/sheets/saldos
/api/sheets/contas_pagar
```

The serverless function resolves the real Google URL from environment variables and returns CSV text to the app.

## Required Deployment Variables

Set these in the hosting provider before publishing:

```txt
PANEL_BASIC_AUTH_USER
PANEL_BASIC_AUTH_PASSWORD
```

For the migration period, the server can still read public CSV URLs. Set the URLs either as one JSON object:

```txt
SHEETS_URLS_JSON
```

or as per-sheet variables:

```txt
SHEET_URL_SALDOS
SHEET_URL_CONTAS_PAGAR
SHEET_URL_CONTAS_VENCIDAS
...
```

Per-sheet variables override `SHEETS_URLS_JSON`.

## Private Google Sheets Mode

For production, remove public Google Sheets publishing and use Google Sheets API from the server:

1. Create a Google Cloud service account.
2. Enable the Google Sheets API in the same Google Cloud project.
3. Share each spreadsheet with the service account email as `Viewer`.
4. Set these deployment secrets:

```txt
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

5. Map each panel key to a private sheet source:

```txt
SHEETS_PRIVATE_SOURCES_JSON
```

Example:

```json
{
  "saldos": {
    "spreadsheetId": "1abc...",
    "gid": "306496671"
  },
  "contas_pagar": {
    "spreadsheetId": "1abc...",
    "gid": "230336063"
  }
}
```

You can also use per-sheet variables:

```txt
SHEET_ID_SALDOS
SHEET_GID_SALDOS
SHEET_RANGE_SALDOS
```

If `SHEET_RANGE_*` is omitted, the server resolves the tab name from the `gid` and reads the whole tab.

## Publishing Checklist

- Do not keep Google CSV URLs in frontend code.
- Do not commit `.env` files.
- Protect the deployment with Vercel/hosting authentication or SSO when available.
- Keep the API Basic Auth variables set in production.
- After private mode is working for every key, turn off public Google Sheets publishing.
- Use `Cache-Control: private`/server cache only for financial data.
- Keep Granatum and Google credentials server-side only.

## Important Limitation

Basic Auth is a first gate, not the final executive-access model. For production executive use, prefer corporate SSO/Google Workspace login plus per-user authorization and audit logs.
